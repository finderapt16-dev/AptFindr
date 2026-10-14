-- Apply after appeal_workflow_migration.sql.
-- Delivers in-app notifications when a tenant submits a report:
--   * every admin receives a review-queue notification;
--   * the affected listing owner receives an under-review acknowledgement.
-- The notification helper is defined by appeal_workflow_migration.sql.

create or replace function public.fn_notify_report_recipients()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_apartment record;
  v_admin record;
begin
  select title, landlord_id
    into v_apartment
    from public.apartments
   where id = new.apartment_id;

  for v_admin in
    select id from public.app_users where lower(role::text) = 'admin'
  loop
    perform public.fn_workflow_notify(
      v_admin.id,
      'report_submitted',
      'New tenant report',
      format('A tenant reported "%s".', coalesce(v_apartment.title, 'an apartment')),
      jsonb_build_object('report_id', new.id, 'apartment_id', new.apartment_id, 'apartment_title', v_apartment.title),
      new.id::text,
      'report'
    );
  end loop;

  if v_apartment.landlord_id is not null then
    perform public.fn_workflow_notify(
      v_apartment.landlord_id,
      'property_reported',
      'New tenant report received',
      format('A tenant submitted a report for "%s". An administrator will review it before taking action.', coalesce(v_apartment.title, 'your listing')),
      jsonb_build_object('report_id', new.id, 'apartment_id', new.apartment_id, 'apartment_title', v_apartment.title, 'status', new.status),
      new.id::text,
      'report'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_report_recipients on public.reports;
create trigger trg_notify_report_recipients
after insert on public.reports
for each row execute function public.fn_notify_report_recipients();
