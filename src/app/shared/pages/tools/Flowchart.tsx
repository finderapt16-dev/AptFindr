import { Button } from "@/app/shared/components/ui/button";
import { ArrowLeft, GitBranch, Palette } from "lucide-react";
import { Link } from "react-router-dom";

type Tone = "blue" | "green" | "orange" | "purple" | "red" | "gray";

const tones: Record<Tone, { fill: string; stroke: string; title: string; text: string }> = {
  blue: { fill: "#eff6ff", stroke: "#2563eb", title: "#1e3a8a", text: "#1d4ed8" },
  green: { fill: "#ecfdf5", stroke: "#10b981", title: "#065f46", text: "#047857" },
  orange: { fill: "#fff7ed", stroke: "#f97316", title: "#9a3412", text: "#c2410c" },
  purple: { fill: "#f5f3ff", stroke: "#8b5cf6", title: "#5b21b6", text: "#6d28d9" },
  red: { fill: "#fff1f2", stroke: "#f43f5e", title: "#9f1239", text: "#be123c" },
  gray: { fill: "#f8fafc", stroke: "#64748b", title: "#0f172a", text: "#475569" },
};

function Box({
  x,
  y,
  w,
  h,
  title,
  desc,
  tone,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  desc: string;
  tone: Tone;
}) {
  const color = tones[tone];

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="10" fill={color.fill} stroke={color.stroke} strokeWidth="2.2" />
      <text x={x + w / 2} y={y + 25} textAnchor="middle" fill={color.title} fontSize="13" fontWeight="900">
        {title}
      </text>
      <text x={x + w / 2} y={y + 48} textAnchor="middle" fill={color.text} fontSize="11" fontWeight="700">
        {desc}
      </text>
    </g>
  );
}

function Diamond({
  cx,
  cy,
  w,
  h,
  title,
  desc,
  tone,
}: {
  cx: number;
  cy: number;
  w: number;
  h: number;
  title: string;
  desc: string;
  tone: Tone;
}) {
  const color = tones[tone];
  const points = `${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}`;

  return (
    <g>
      <polygon points={points} fill={color.fill} stroke={color.stroke} strokeWidth="2.2" />
      <text x={cx} y={cy - 7} textAnchor="middle" fill={color.title} fontSize="13" fontWeight="900">
        {title}
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" fill={color.text} fontSize="10.5" fontWeight="800">
        {desc}
      </text>
    </g>
  );
}

function Arrow({
  d,
  label,
  x,
  y,
  dashed = false,
  color = "#334155",
}: {
  d: string;
  label?: string;
  x?: number;
  y?: number;
  dashed?: boolean;
  color?: string;
}) {
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeDasharray={dashed ? "8 7" : undefined}
        markerEnd="url(#arrow)"
      />
      {label && x !== undefined && y !== undefined && (
        <text x={x} y={y} textAnchor="middle" fill={color} fontSize="11" fontWeight="900">
          {label}
        </text>
      )}
    </g>
  );
}

function Section({
  x,
  y,
  w,
  h,
  title,
  tone,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  tone: Tone;
}) {
  const color = tones[tone];

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="16" fill={color.fill} stroke={color.stroke} strokeWidth="2" opacity="0.9" />
      <text x={x + 24} y={y + 34} fill={color.title} fontSize="17" fontWeight="950">
        {title}
      </text>
    </g>
  );
}

export function Flowchart() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <GitBranch className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Platform Flowchart</h1>
              <p className="text-xs text-slate-500">Readable system workflow diagram</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/design-guide">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Design Guide</span>
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to App</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1540px] px-4 py-6">
        <section className="overflow-x-auto rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <svg
            viewBox="0 0 1500 1760"
            role="img"
            aria-label="Apartment Finder system flowchart showing user authentication, roles, workflows, approvals, reports, notifications, and database"
            className="min-w-[1320px] rounded-xl bg-white"
          >
            <defs>
              <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,8 L11,4 z" fill="#334155" />
              </marker>
              <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#e2e8f0" strokeWidth="1" />
              </pattern>
            </defs>

            <rect x="0" y="0" width="1500" height="1760" fill="url(#grid)" />
            <rect x="24" y="24" width="1452" height="1712" rx="20" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />

            <text x="750" y="70" textAnchor="middle" fill="#0f172a" fontSize="32" fontWeight="950">
              Apartment Finder System Flowchart
            </text>
            <text x="750" y="100" textAnchor="middle" fill="#475569" fontSize="14" fontWeight="800">
              User-friendly workflow view for tenants, landlords, admins, reports, notifications, and stored system records
            </text>

            <Section x={70} y={135} w={1360} h={255} title="1. User Authentication and Role Identification" tone="blue" />
            <Box x={130} y={190} w={165} h={68} title="Open Platform" desc="Start from app" tone="blue" />
            <Box x={355} y={190} w={165} h={68} title="User Login" desc="Enter account" tone="blue" />
            <Box x={580} y={190} w={165} h={68} title="Authentication" desc="Check identity" tone="blue" />
            <Box x={805} y={190} w={165} h={68} title="User Verification" desc="Confirm status" tone="blue" />
            <Diamond cx={1125} cy={224} w={160} h={110} title="Role?" desc="Tenant / Landlord / Admin" tone="blue" />
            <Box x={1265} y={190} w={105} h={68} title="Dashboard" desc="Open area" tone="blue" />
            <Arrow d="M295 224 H355" />
            <Arrow d="M520 224 H580" />
            <Arrow d="M745 224 H805" />
            <Arrow d="M970 224 H1045" />
            <Arrow d="M1205 224 H1265" />

            <Section x={90} y={435} w={360} h={395} title="3. Tenant Workflow" tone="green" />
            <Box x={130} y={495} w={280} h={62} title="Browse Apartments" desc="View public listings" tone="green" />
            <Box x={130} y={595} w={280} h={62} title="Filter and Sort" desc="Find best matches" tone="green" />
            <Box x={130} y={695} w={280} h={62} title="Apartment Details" desc="Review rooms" tone="green" />
            <Box x={130} y={775} w={130} h={42} title="Favorite" desc="Save" tone="green" />
            <Box x={280} y={775} w={130} h={42} title="Report" desc="Flag issue" tone="red" />
            <Arrow d="M270 557 V595" />
            <Arrow d="M270 657 V695" />
            <Arrow d="M270 757 V775" />
            <Arrow d="M270 757 H345 V775" />

            <Section x={570} y={435} w={360} h={395} title="4. Landlord Workflow" tone="orange" />
            <Box x={610} y={495} w={280} h={62} title="Landlord Dashboard" desc="View owned data" tone="orange" />
            <Box x={610} y={595} w={280} h={62} title="Add Apartment" desc="Submit property" tone="orange" />
            <Box x={610} y={695} w={280} h={62} title="Manage Rooms" desc="Update availability" tone="orange" />
            <Box x={610} y={775} w={280} h={42} title="Market Overview" desc="Browse public listings" tone="orange" />
            <Arrow d="M750 557 V595" />
            <Arrow d="M750 657 V695" />
            <Arrow d="M750 757 V775" />

            <Section x={1050} y={435} w={360} h={395} title="5. Admin Workflow" tone="purple" />
            <Box x={1090} y={495} w={280} h={62} title="Admin Dashboard" desc="Review platform" tone="purple" />
            <Box x={1090} y={595} w={280} h={62} title="Verify Landlord" desc="Check documents" tone="purple" />
            <Box x={1090} y={695} w={280} h={62} title="Review Apartment" desc="Inspect listing" tone="purple" />
            <Box x={1090} y={775} w={280} h={42} title="Manage Cases" desc="Reports and appeals" tone="purple" />
            <Arrow d="M1230 557 V595" />
            <Arrow d="M1230 657 V695" />
            <Arrow d="M1230 757 V775" />

            <Arrow d="M1125 279 V400 H270 V495" label="Tenant" x={420} y={397} color="#047857" />
            <Arrow d="M1125 279 V410 H750 V495" label="Landlord" x={755} y={407} color="#c2410c" />
            <Arrow d="M1125 279 V400 H1230 V495" label="Admin" x={1230} y={397} color="#6d28d9" />

            <Section x={150} y={900} w={540} h={370} title="6. Apartment Approval Workflow" tone="orange" />
            <Box x={190} y={960} w={190} h={62} title="Apartment Submitted" desc="Landlord request" tone="orange" />
            <Box x={460} y={960} w={190} h={62} title="Document Review" desc="Admin checks" tone="purple" />
            <Diamond cx={555} cy={1110} w={165} h={112} title="Approved?" desc="Yes / No" tone="purple" />
            <Box x={190} y={1080} w={190} h={62} title="Needs Update" desc="Landlord revises" tone="red" />
            <Box x={460} y={1190} w={190} h={62} title="Published Listing" desc="Visible publicly" tone="green" />
            <Arrow d="M380 991 H460" />
            <Arrow d="M555 1022 V1054" />
            <Arrow d="M472 1110 H380" label="No" x={424} y={1098} color="#be123c" />
            <Arrow d="M555 1166 V1190" label="Yes" x={585} y={1182} color="#047857" />
            <Arrow d="M285 1080 V1045 H555" dashed />

            <Section x={810} y={900} w={540} h={370} title="7. Reports and Appeals Workflow" tone="red" />
            <Box x={850} y={960} w={190} h={62} title="Report Submitted" desc="Tenant or user" tone="red" />
            <Box x={1120} y={960} w={190} h={62} title="Admin Review" desc="Check evidence" tone="purple" />
            <Diamond cx={1215} cy={1110} w={165} h={112} title="Valid Case?" desc="Yes / No" tone="red" />
            <Box x={850} y={1080} w={190} h={62} title="Appeal Submitted" desc="Landlord response" tone="orange" />
            <Box x={1120} y={1190} w={190} h={62} title="Final Status" desc="Resolved case" tone="red" />
            <Arrow d="M1040 991 H1120" />
            <Arrow d="M1215 1022 V1054" />
            <Arrow d="M1132 1110 H1040" label="Appeal" x={1085} y={1098} color="#c2410c" />
            <Arrow d="M1215 1166 V1190" label="Decision" x={1255} y={1182} color="#be123c" />
            <Arrow d="M945 1080 V1045 H1215" dashed />

            <Section x={150} y={1335} w={540} h={170} title="9. Notifications" tone="blue" />
            <Box x={195} y={1395} w={175} h={62} title="Send Notification" desc="Status update" tone="blue" />
            <Box x={465} y={1395} w={175} h={62} title="User Receives" desc="Dashboard alert" tone="blue" />
            <Arrow d="M370 1426 H465" />

            <Section x={810} y={1335} w={540} h={170} title="8. System Database" tone="gray" />
            <Box x={855} y={1395} w={450} h={62} title="System Database" desc="Stores users, apartments, rooms, reports, appeals, notifications, and logs" tone="gray" />

            <Arrow d="M270 817 V1320 H1035 V1395" dashed color="#64748b" />
            <Arrow d="M750 817 V1320 H1035 V1395" dashed color="#64748b" />
            <Arrow d="M1230 817 V1320 H1035 V1395" dashed color="#64748b" />
            <Arrow d="M555 1252 V1320 H1035 V1395" dashed color="#64748b" />
            <Arrow d="M1215 1252 V1320 H1035 V1395" dashed color="#64748b" />
            <Arrow d="M555 1252 V1310 H282 V1395" dashed color="#2563eb" />
            <Arrow d="M1215 1252 V1310 H282 V1395" dashed color="#2563eb" />
            <Arrow d="M640 1426 H855" dashed color="#64748b" />

            <rect x="350" y="1590" width="800" height="54" rx="18" fill="#0f172a" />
            <text x="750" y="1614" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900">
              Public apartment browsing only shows verified, approved, published, active, and available listings.
            </text>
            <text x="750" y="1634" textAnchor="middle" fill="#cbd5e1" fontSize="12" fontWeight="800">
              Other users can view public listings, while management actions remain limited to the property owner or administrators.
            </text>
          </svg>
        </section>
      </main>
    </div>
  );
}
