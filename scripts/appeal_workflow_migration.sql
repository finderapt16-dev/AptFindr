-- Admin-first tenant report / landlord appeal workflow.
-- Run once in the Supabase SQL editor AFTER
-- report_appeal_status_enum_migration.sql has completed. Extends the existing
-- report system.

alter table public.reports
  add column if not exists appeal_deadline timestamptz,
  add column if not exists admin_decision text,
  add column if not exists admin_notes text,
  add column if not exists final_listing_decision text;

alter table public.reports alter column status set default 'pending_review';

do $$
declare app_user_id_type text; apartment_id_type text;
begin
  select pg_catalog.format_type(a.atttypid, a.atttypmod) into app_user_id_type from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='app_users' and a.attname='id' and not a.attisdropped;
  select pg_catalog.format_type(a.atttypid, a.atttypmod) into apartment_id_type from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='apartments' and a.attname='id' and not a.attisdropped;
  if app_user_id_type is null or apartment_id_type is null then raise exception 'Expected public.app_users(id) and public.apartments(id).'; end if;
  execute format('alter table public.appeals add column if not exists apartment_id %s references public.apartments(id) on delete cascade', apartment_id_type);
  execute format('alter table public.appeals add column if not exists reviewed_by %s references public.app_users(id)', app_user_id_type);
end $$;

alter table public.appeals
  add column if not exists appeal_type text,
  add column if not exists appeal_message text,
  add column if not exists contact_information text,
  add column if not exists evidence_deadline timestamptz,
  add column if not exists evidence_request_message text,
  add column if not exists updated_at timestamptz not null default now();

-- Compare legacy values as text. Some deployments have a report_status enum
-- that never contained values such as "open", so enum IN (...) would fail
-- before the migration had a chance to normalize any records.
update public.reports set status='pending_review' where status::text in ('pending','open','in_review','reviewing');
update public.appeals set status='pending_review' where status::text in ('pending','under_review');
update public.appeals set status='dismissed' where status::text in ('denied','rejected');

create or replace function public.fn_workflow_current_user_id()
returns public.app_users.id%type language sql stable security definer set search_path=public as $$
  select id from public.app_users where id::text=auth.uid()::text or auth_id::text=auth.uid()::text limit 1;
$$;
create or replace function public.fn_workflow_is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.app_users where (id::text=auth.uid()::text or auth_id::text=auth.uid()::text) and lower(role::text)='admin');
$$;
create or replace function public.fn_workflow_audit(p_action text,p_target_type text,p_target_id text,p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.audit_logs(admin_id,action,target_type,target_id,details) values(public.fn_workflow_current_user_id(),p_action,p_target_type,p_target_id::uuid,coalesce(p_details,'{}'::jsonb));
exception when others then
  -- Audit history is additive. It must never roll back the report, appeal, or
  -- notification transaction if an older deployment has a different audit schema.
  null;
end;
$$;
create or replace function public.fn_workflow_notify(p_user_id public.app_users.id%type,p_type text,p_title text,p_message text,p_payload jsonb,p_target_id text,p_target_type text)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(user_id,type,title,message,payload,read,action_target_id,action_target_type) values(p_user_id,p_type,p_title,p_message,coalesce(p_payload,'{}'::jsonb),false,p_target_id::uuid,p_target_type);
end;
$$;

-- Tenant report insertion is an RPC because public.reports has RLS enabled.
-- The function derives both reporter and landlord from trusted backend rows;
-- neither ID is accepted from the browser.
create or replace function public.fn_submit_tenant_report(
  p_apartment_id text,
  p_issue_type text default null,
  p_category text default null,
  p_tags text[] default '{}'::text[],
  p_details text default null,
  p_contact text default null,
  p_has_evidence boolean default false,
  p_evidence_count integer default 0,
  p_severity text default 'med'
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user public.app_users%rowtype; a public.apartments%rowtype; r public.reports%rowtype;
begin
  select * into v_user from public.app_users where id=public.fn_workflow_current_user_id();
  if not found or lower(coalesce(v_user.role::text,'')) <> 'tenant' then
    raise exception 'Only tenant accounts can submit tenant reports';
  end if;
  select * into a from public.apartments where id::text=p_apartment_id;
  if not found then raise exception 'Apartment not found'; end if;
  if a.landlord_id is null then raise exception 'This apartment does not have a reportable owner'; end if;
  if nullif(trim(p_details),'') is null then raise exception 'Describe the problem before submitting a report'; end if;
  insert into public.reports(
    reporter_id,user_id,reporter_role,apartment_id,issue_type,category,tags,details,contact,
    landlord_id,has_evidence,evidence_count,severity,status,last_action_at
  ) values (
    v_user.id,v_user.id,'tenant',a.id,nullif(trim(p_issue_type),''),nullif(trim(p_category),''),
    coalesce(p_tags,'{}'::text[]),trim(p_details),nullif(trim(p_contact),''),a.landlord_id,
    coalesce(p_has_evidence,false),greatest(coalesce(p_evidence_count,0),0),coalesce(nullif(trim(p_severity),'')::public.report_severity,'med'::public.report_severity),
    'pending_review',now()
  ) returning * into r;
  perform public.fn_workflow_audit('REPORT_SUBMITTED','report',r.id::text,jsonb_build_object('apartment_id',r.apartment_id));
  return to_jsonb(r);
end;
$$;

-- Only this function moves a tenant report out of the admin queue.
create or replace function public.fn_review_tenant_report(p_report_id text,p_decision text,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.reports%rowtype; a record; v_deadline timestamptz; v_decision text:=lower(trim(p_decision));
begin
  perform set_config('app.workflow_transition','on',true);
  if not public.fn_workflow_is_admin() then raise exception 'Only administrators can review reports'; end if;
  if v_decision not in ('approved','dismissed') then raise exception 'Decision must be approved or dismissed'; end if;
  select * into r from public.reports where id::text=p_report_id for update;
  if not found then raise exception 'Report not found'; end if;
  if coalesce(r.status::text,'pending_review') not in ('pending_review','pending','open','under_review','in_review') then raise exception 'This report has already been reviewed'; end if;
  select id,landlord_id,title into a from public.apartments where id=r.apartment_id;
  if v_decision='dismissed' then
    update public.reports set status='dismissed',admin_decision='dismissed',admin_notes=nullif(trim(p_notes),''),reviewed_by=public.fn_workflow_current_user_id(),reviewed_at=now(),resolved_at=now(),appeal_deadline=null,last_action_at=now() where id=r.id returning * into r;
    perform public.fn_workflow_notify(coalesce(r.reporter_id,r.user_id),'report_dismissed','Your report was dismissed',format('Your report for "%s" was reviewed and dismissed.',coalesce(a.title,'the listing')),jsonb_build_object('report_id',r.id,'apartment_id',r.apartment_id,'status',r.status,'admin_notes',r.admin_notes),r.id::text,'report');
  else
    v_deadline:=now()+interval '7 days';
    update public.reports set status='awaiting_landlord_appeal',admin_decision='approved',admin_notes=nullif(trim(p_notes),''),reviewed_by=public.fn_workflow_current_user_id(),reviewed_at=now(),resolved_at=null,appeal_deadline=v_deadline,last_action_at=now() where id=r.id returning * into r;
    perform public.fn_workflow_notify(a.landlord_id,'report_approved_for_appeal','Report Approved by Admin',format('An administrator approved a report involving "%s". Submit an appeal by %s.',coalesce(a.title,'your listing'),to_char(v_deadline at time zone 'Asia/Singapore','FMMonth DD, YYYY')),jsonb_build_object('report_id',r.id,'apartment_id',r.apartment_id,'apartment_title',a.title,'report_reason',coalesce(r.issue_type,r.category),'report_details',r.details,'admin_decision','approved','approved_at',r.reviewed_at,'appeal_deadline',v_deadline),r.id::text,'report');
    perform public.fn_workflow_notify(coalesce(r.reporter_id,r.user_id),'report_approved','Your report was approved for review',format('Your report for "%s" was approved. The listing owner has a limited appeal period.',coalesce(a.title,'the listing')),jsonb_build_object('report_id',r.id,'status',r.status),r.id::text,'report');
  end if;
  perform public.fn_workflow_audit('REPORT_'||upper(v_decision),'report',r.id::text,jsonb_build_object('notes',p_notes,'appeal_deadline',r.appeal_deadline));
  return to_jsonb(r);
end;
$$;

create or replace function public.fn_submit_report_appeal(p_report_id text,p_description text,p_contact text default null,p_supporting_docs jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.reports%rowtype; a record; appeal public.appeals%rowtype; v_user public.app_users.id%type; v_admin record;
begin
  perform set_config('app.workflow_transition','on',true);
  v_user:=public.fn_workflow_current_user_id(); if v_user is null then raise exception 'You must be signed in to submit an appeal'; end if;
  if nullif(trim(p_description),'') is null then raise exception 'An appeal explanation is required'; end if;
  select * into r from public.reports where id::text=p_report_id for update; if not found then raise exception 'Report not found'; end if;
  select id,landlord_id,title into a from public.apartments where id=r.apartment_id;
  if a.landlord_id is distinct from v_user then raise exception 'You can only appeal reports for your own listing'; end if;
  if r.status<>'awaiting_landlord_appeal' or r.appeal_deadline is null or r.appeal_deadline<=now() then raise exception 'The appeal period has expired'; end if;
  if exists(select 1 from public.appeals where report_id=r.id and status not in ('approved','dismissed','resolved')) then raise exception 'An active appeal already exists for this report'; end if;
  insert into public.appeals(landlord_id,report_id,apartment_id,appeal_type,reason,description,appeal_message,contact_information,supporting_docs,status,submitted_at) values(v_user,r.id,r.apartment_id,'property_report','Tenant report appeal',trim(p_description),trim(p_description),nullif(trim(p_contact),''),coalesce(p_supporting_docs,'[]'::jsonb),'pending_review',now()) returning * into appeal;
  update public.reports set status='under_appeal',last_action_at=now() where id=r.id returning * into r;
  for v_admin in select id from public.app_users where lower(role::text)='admin' loop perform public.fn_workflow_notify(v_admin.id,'appeal_submitted','New appeal submitted',format('The owner of "%s" submitted an appeal.',coalesce(a.title,'a listing')),jsonb_build_object('appeal_id',appeal.id,'report_id',r.id,'apartment_id',r.apartment_id),appeal.id::text,'appeal'); end loop;
  perform public.fn_workflow_audit('APPEAL_SUBMITTED','appeal',appeal.id::text,jsonb_build_object('report_id',r.id)); return to_jsonb(appeal);
end;
$$;

create or replace function public.fn_request_appeal_evidence(p_appeal_id text,p_message text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare appeal public.appeals%rowtype; a record; v_deadline timestamptz;
begin
  perform set_config('app.workflow_transition','on',true);
  if not public.fn_workflow_is_admin() then raise exception 'Only administrators can request evidence'; end if;
  if nullif(trim(p_message),'') is null then raise exception 'Explain what evidence is required'; end if;
  select * into appeal from public.appeals where id::text=p_appeal_id for update; if not found then raise exception 'Appeal not found'; end if;
  if appeal.status not in ('pending_review','additional_evidence_submitted') then raise exception 'This appeal cannot receive another evidence request'; end if;
  v_deadline:=now()+interval '7 days'; update public.appeals set status='more_evidence_requested',evidence_request_message=trim(p_message),evidence_deadline=v_deadline,reviewed_by=public.fn_workflow_current_user_id(),reviewed_at=now() where id=appeal.id returning * into appeal;
  select title into a from public.apartments where id=appeal.apartment_id;
  perform public.fn_workflow_notify(appeal.landlord_id,'appeal_evidence_requested','Additional Evidence Required',format('Provide the requested evidence for "%s" by %s.',coalesce(a.title,'your listing'),to_char(v_deadline at time zone 'Asia/Singapore','FMMonth DD, YYYY')),jsonb_build_object('appeal_id',appeal.id,'report_id',appeal.report_id,'apartment_id',appeal.apartment_id,'admin_message',appeal.evidence_request_message,'evidence_deadline',v_deadline),appeal.id::text,'appeal');
  perform public.fn_workflow_audit('APPEAL_EVIDENCE_REQUESTED','appeal',appeal.id::text,jsonb_build_object('message',p_message,'evidence_deadline',v_deadline)); return to_jsonb(appeal);
end;
$$;

create or replace function public.fn_submit_appeal_evidence(p_appeal_id text,p_description text,p_supporting_docs jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare appeal public.appeals%rowtype; v_user public.app_users.id%type; v_admin record;
begin
  perform set_config('app.workflow_transition','on',true);
  v_user:=public.fn_workflow_current_user_id(); select * into appeal from public.appeals where id::text=p_appeal_id for update;
  if not found or appeal.landlord_id is distinct from v_user then raise exception 'Appeal not found'; end if;
  if appeal.status<>'more_evidence_requested' or appeal.evidence_deadline is null or appeal.evidence_deadline<=now() then raise exception 'The evidence submission period has expired'; end if;
  update public.appeals set status='additional_evidence_submitted',description=coalesce(nullif(trim(p_description),''),description),supporting_docs=coalesce(supporting_docs,'[]'::jsonb)||coalesce(p_supporting_docs,'[]'::jsonb),evidence_deadline=null,updated_at=now() where id=appeal.id returning * into appeal;
  for v_admin in select id from public.app_users where lower(role::text)='admin' loop perform public.fn_workflow_notify(v_admin.id,'appeal_evidence_submitted','Additional appeal evidence submitted','The landlord submitted the requested additional evidence.',jsonb_build_object('appeal_id',appeal.id,'report_id',appeal.report_id,'apartment_id',appeal.apartment_id),appeal.id::text,'appeal'); end loop;
  perform public.fn_workflow_audit('APPEAL_EVIDENCE_SUBMITTED','appeal',appeal.id::text,jsonb_build_object('report_id',appeal.report_id)); return to_jsonb(appeal);
end;
$$;

create or replace function public.fn_decide_appeal(p_appeal_id text,p_status text,p_admin_response text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare appeal public.appeals%rowtype; r public.reports%rowtype; a record; v_status text:=lower(trim(p_status));
begin
  perform set_config('app.workflow_transition','on',true);
  if not public.fn_workflow_is_admin() then raise exception 'Only administrators can decide appeals'; end if;
  if v_status not in ('approved','dismissed') or nullif(trim(p_admin_response),'') is null then raise exception 'A final decision and notes are required'; end if;
  select * into appeal from public.appeals where id::text=p_appeal_id for update; if not found then raise exception 'Appeal not found'; end if;
  if appeal.status not in ('pending_review','additional_evidence_submitted') then raise exception 'This appeal is not ready for a decision'; end if;
  -- v_status is normalized as text for validation above, while this deployment
  -- stores appeal status as the appeal_status enum. Cast explicitly so Postgres
  -- does not reject an otherwise valid approve/dismiss decision.
  update public.appeals set status=v_status::public.appeal_status,admin_id=public.fn_workflow_current_user_id(),reviewed_by=public.fn_workflow_current_user_id(),reviewed_at=now(),admin_response=trim(p_admin_response),evidence_deadline=null where id=appeal.id returning * into appeal;
  select * into r from public.reports where id=appeal.report_id for update; select title into a from public.apartments where id=appeal.apartment_id;
  if v_status='approved' then
    update public.reports set status='resolved_appeal_approved',resolved_at=now(),final_listing_decision='keep_published',last_action_at=now() where id=r.id returning * into r;
    perform public.fn_workflow_notify(appeal.landlord_id,'appeal_approved','Your appeal has been approved',format('Your appeal for "%s" was approved. The listing remains published unless another platform rule applies.',coalesce(a.title,'your listing')),jsonb_build_object('appeal_id',appeal.id,'report_id',r.id,'status',appeal.status),appeal.id::text,'appeal');
    perform public.fn_workflow_notify(coalesce(r.reporter_id,r.user_id),'report_resolved','Your report has been resolved',format('The appeal for "%s" was reviewed and the report is now resolved.',coalesce(a.title,'the listing')),jsonb_build_object('report_id',r.id,'status',r.status),r.id::text,'report');
  else
    update public.reports set status='appeal_dismissed_pending_final_decision',last_action_at=now() where id=r.id returning * into r;
    perform public.fn_workflow_notify(appeal.landlord_id,'appeal_dismissed','Your appeal was dismissed',format('Your appeal for "%s" was dismissed. An administrator will make the final listing decision.',coalesce(a.title,'your listing')),jsonb_build_object('appeal_id',appeal.id,'report_id',r.id,'status',appeal.status,'admin_response',appeal.admin_response),appeal.id::text,'appeal');
  end if;
  perform public.fn_workflow_audit('APPEAL_'||upper(v_status),'appeal',appeal.id::text,jsonb_build_object('report_id',r.id,'notes',p_admin_response)); return to_jsonb(appeal);
end;
$$;

create or replace function public.fn_finalize_report_listing(p_report_id text,p_listing_decision text,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.reports%rowtype; a record; v_decision text:=lower(trim(p_listing_decision));
begin
  perform set_config('app.workflow_transition','on',true);
  if not public.fn_workflow_is_admin() then raise exception 'Only administrators can make the final listing decision'; end if;
  if v_decision not in ('keep_published','unpublish_listing') then raise exception 'Choose keep_published or unpublish_listing'; end if;
  select * into r from public.reports where id::text=p_report_id for update; if not found then raise exception 'Report not found'; end if;
  if r.status not in ('appeal_period_expired','evidence_deadline_expired','appeal_dismissed_pending_final_decision') then raise exception 'This report is not ready for a final decision'; end if;
  select id,landlord_id,title into a from public.apartments where id=r.apartment_id;
  if v_decision='unpublish_listing' then
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='apartments' and column_name='is_published') then update public.apartments set is_published=false where id=a.id; end if;
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='apartments' and column_name='status') then update public.apartments set status='unpublished' where id=a.id; end if;
  end if;
  update public.reports set status='resolved',final_listing_decision=v_decision,admin_notes=coalesce(nullif(trim(p_notes),''),admin_notes),resolved_at=now(),last_action_at=now() where id=r.id returning * into r;
  perform public.fn_workflow_notify(a.landlord_id,case when v_decision='unpublish_listing' then 'listing_unpublished' else 'report_resolved' end,case when v_decision='unpublish_listing' then 'Listing unpublished' else 'Report resolved' end,case when v_decision='unpublish_listing' then format('Your listing "%s" was unpublished after final administrative review.',coalesce(a.title,'listing')) else format('The report for "%s" was resolved with no listing change.',coalesce(a.title,'your listing')) end,jsonb_build_object('report_id',r.id,'apartment_id',r.apartment_id,'listing_decision',v_decision,'admin_notes',p_notes),r.id::text,'report');
  perform public.fn_workflow_notify(coalesce(r.reporter_id,r.user_id),'report_resolved','Your report has been resolved',format('Your report for "%s" has reached a final resolution.',coalesce(a.title,'the listing')),jsonb_build_object('report_id',r.id,'status',r.status,'listing_decision',v_decision),r.id::text,'report');
  perform public.fn_workflow_audit('REPORT_FINALIZED','report',r.id::text,jsonb_build_object('listing_decision',v_decision,'notes',p_notes)); return to_jsonb(r);
end;
$$;

create or replace function public.fn_refresh_report_workflow_deadlines()
returns integer language plpgsql security definer set search_path=public as $$
declare r record; v_admin record; n integer:=0;
begin
  perform set_config('app.workflow_transition','on',true);
  for r in select * from public.reports where status='awaiting_landlord_appeal' and appeal_deadline<=now() for update skip locked loop
    update public.reports set status='appeal_period_expired',last_action_at=now() where id=r.id;
    for v_admin in select id from public.app_users where lower(role::text)='admin' loop perform public.fn_workflow_notify(v_admin.id,'appeal_deadline_expired','Appeal period expired','The landlord did not submit an appeal within the seven-day appeal period.',jsonb_build_object('report_id',r.id,'apartment_id',r.apartment_id,'appeal_deadline',r.appeal_deadline),r.id::text,'report'); end loop;
    perform public.fn_workflow_audit('APPEAL_DEADLINE_EXPIRED','report',r.id::text,jsonb_build_object('appeal_deadline',r.appeal_deadline)); n:=n+1;
  end loop;
  for r in select * from public.appeals where status='more_evidence_requested' and evidence_deadline<=now() for update skip locked loop
    update public.appeals set status='evidence_deadline_expired',updated_at=now() where id=r.id; update public.reports set status='evidence_deadline_expired',last_action_at=now() where id=r.report_id;
    for v_admin in select id from public.app_users where lower(role::text)='admin' loop perform public.fn_workflow_notify(v_admin.id,'evidence_deadline_expired','Evidence deadline expired','The landlord did not submit the requested evidence within seven days.',jsonb_build_object('appeal_id',r.id,'report_id',r.report_id,'evidence_deadline',r.evidence_deadline),r.id::text,'appeal'); end loop;
    perform public.fn_workflow_audit('EVIDENCE_DEADLINE_EXPIRED','appeal',r.id::text,jsonb_build_object('evidence_deadline',r.evidence_deadline)); n:=n+1;
  end loop; return n;
end;
$$;

-- Protect the state machine even if an older, broad table policy still exists.
-- Archiving and ordinary note updates remain possible; direct status changes and
-- landlord-created appeals are rejected unless one of the validated RPCs set
-- the transaction-local workflow flag above.
create or replace function public.fn_guard_report_workflow()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status is distinct from old.status and current_setting('app.workflow_transition', true) is distinct from 'on' and not public.fn_workflow_is_admin() then
    raise exception 'Report workflow status must be changed through an authorized workflow action';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_report_workflow on public.reports;
create trigger trg_guard_report_workflow before update on public.reports for each row execute function public.fn_guard_report_workflow();
create or replace function public.fn_guard_appeal_workflow()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' and current_setting('app.workflow_transition', true) is distinct from 'on' then
    raise exception 'Appeals must be submitted through the authorized workflow action';
  end if;
  if tg_op='UPDATE' and new.status is distinct from old.status and current_setting('app.workflow_transition', true) is distinct from 'on' then
    raise exception 'Appeal workflow status must be changed through an authorized workflow action';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_appeal_workflow on public.appeals;
create trigger trg_guard_appeal_workflow before insert or update on public.appeals for each row execute function public.fn_guard_appeal_workflow();

-- New reports are visible to administrators immediately. The listing owner
-- receives a neutral acknowledgement while the report is under review, then
-- receives the existing detailed appeal notice only if an admin approves it.
create or replace function public.fn_notify_report_recipients()
returns trigger language plpgsql security definer set search_path=public as $$
declare a record; v_admin record;
begin
  select title, landlord_id into a from public.apartments where id=new.apartment_id;
  for v_admin in select id from public.app_users where lower(role::text)='admin' loop perform public.fn_workflow_notify(v_admin.id,'report_submitted','New tenant report',format('A tenant reported "%s".',coalesce(a.title,'an apartment')),jsonb_build_object('report_id',new.id,'apartment_id',new.apartment_id,'apartment_title',a.title),new.id::text,'report'); end loop;
  if a.landlord_id is not null then
    perform public.fn_workflow_notify(a.landlord_id,'property_reported','New tenant report received',format('A tenant submitted a report for "%s". An administrator will review it before taking action.',coalesce(a.title,'your listing')),jsonb_build_object('report_id',new.id,'apartment_id',new.apartment_id,'apartment_title',a.title,'status',new.status),new.id::text,'report');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_notify_report_recipients on public.reports;
create trigger trg_notify_report_recipients after insert on public.reports for each row execute function public.fn_notify_report_recipients();

grant execute on function public.fn_submit_tenant_report(text,text,text,text[],text,text,boolean,integer,text),public.fn_review_tenant_report(text,text,text),public.fn_submit_report_appeal(text,text,text,jsonb),public.fn_request_appeal_evidence(text,text),public.fn_submit_appeal_evidence(text,text,jsonb),public.fn_decide_appeal(text,text,text),public.fn_finalize_report_listing(text,text,text),public.fn_refresh_report_workflow_deadlines() to authenticated;

-- RLS: keep existing dashboard SELECT policies. Do not grant ordinary client
-- INSERT/UPDATE access for appeal decisions or deadline transitions: the RPCs
-- above are SECURITY DEFINER and validate role plus apartment ownership.
