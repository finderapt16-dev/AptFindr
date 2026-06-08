import { Link } from "react-router-dom";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { ArrowLeft, Palette } from "lucide-react";

export function Flowchart() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Standalone Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3h6v6H3zM15 3h6v6h-6zM9 6h6M12 9v6M3 15h6v6H3zM15 15h6v6h-6z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Platform Flowchart</h1>
                <p className="text-xs text-slate-500">La Paz AptFinder · PWA</p>
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
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="bg-gradient-to-r from-cyan-600 to-teal-700 rounded-2xl p-8 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-2">AptFinder Platform Flowchart</h2>
          <p className="text-cyan-100 max-w-xl">
            Complete user journey and system architecture — from landing page through
            role-based dashboards, landlord verification, and shared platform features.
          </p>
        </div>

        {/* SVG Flowchart Card */}
        <Card className="shadow-lg overflow-hidden">
          <CardContent className="p-6 overflow-x-auto">
            <svg
              viewBox="0 0 1400 2400"
              className="w-full h-auto min-w-[600px]"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Define styles */}
              <defs>
                <style>{`
                  .box-start { fill: #0ea5e9; stroke: #0284c7; }
                  .box-process { fill: #64748b; stroke: #475569; }
                  .box-decision { fill: #f59e0b; stroke: #d97706; }
                  .box-student { fill: #10b981; stroke: #059669; }
                  .box-landlord { fill: #8b5cf6; stroke: #7c3aed; }
                  .box-admin { fill: #9333ea; stroke: #7e22ce; }
                  .box-feature { fill: #ec4899; stroke: #db2777; }
                  .box-data { fill: #06b6d4; stroke: #0891b2; }
                  .text-white { fill: white; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-anchor: middle; }
                  .text-label { fill: #334155; font-family: Arial, sans-serif; font-size: 12px; text-anchor: middle; }
                  .arrow { stroke: #475569; stroke-width: 2; fill: none; marker-end: url(#arrowhead); }
                  .arrow-yes { stroke: #10b981; stroke-width: 2; fill: none; marker-end: url(#arrowhead-green); }
                  .arrow-no { stroke: #ef4444; stroke-width: 2; fill: none; marker-end: url(#arrowhead-red); }
                `}</style>

                {/* Arrow markers */}
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#475569" />
                </marker>
                <marker id="arrowhead-green" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#10b981" />
                </marker>
                <marker id="arrowhead-red" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
                </marker>
              </defs>

              {/* START */}
              <rect x="450" y="20" width="300" height="60" rx="30" className="box-start" strokeWidth="3" />
              <text x="600" y="55" className="text-white">Landing Page (/)</text>

              <line x1="600" y1="80" x2="600" y2="120" className="arrow" />

              {/* First Decision: Authenticated? */}
              <polygon points="600,120 750,180 600,240 450,180" className="box-decision" strokeWidth="3" />
              <text x="600" y="185" className="text-white">Authenticated?</text>

              {/* NO */}
              <line x1="450" y1="180" x2="350" y2="180" className="arrow-no" />
              <text x="390" y="170" className="text-label">No</text>
              <rect x="200" y="150" width="140" height="60" rx="10" className="box-process" strokeWidth="3" />
              <text x="270" y="175" className="text-white">Login or</text>
              <text x="270" y="195" className="text-white">Signup</text>

              {/* Arrow back */}
              <line x1="270" y1="210" x2="270" y2="300" className="arrow" />
              <line x1="270" y1="300" x2="600" y2="300" className="arrow" />
              <line x1="600" y1="300" x2="600" y2="240" className="arrow" />

              {/* YES */}
              <line x1="600" y1="240" x2="600" y2="280" className="arrow-yes" />
              <text x="620" y="265" className="text-label">Yes</text>

              {/* Role Decision */}
              <polygon points="600,280 750,340 600,400 450,340" className="box-decision" strokeWidth="3" />
              <text x="600" y="330" className="text-white">User Role?</text>
              <text x="600" y="350" className="text-white" style={{ fontSize: '11px' }}>Student/Employee/</text>
              <text x="600" y="365" className="text-white" style={{ fontSize: '11px' }}>Landlord/Admin</text>

              {/* STUDENT/EMPLOYEE PATH */}
              <line x1="450" y1="340" x2="250" y2="340" className="arrow" />
              <text x="340" y="330" className="text-label">Student/Employee</text>
              <rect x="80" y="310" width="180" height="60" rx="10" className="box-student" strokeWidth="3" />
              <text x="170" y="335" className="text-white">Student/Employee</text>
              <text x="170" y="355" className="text-white">Dashboard</text>

              <line x1="170" y1="370" x2="170" y2="420" className="arrow" />

              <rect x="30" y="420" width="280" height="350" rx="10" fill="#f0fdf4" stroke="#10b981" strokeWidth="2" />
              <text x="170" y="445" className="text-label" style={{ fontWeight: 'bold', fontSize: '14px' }}>Student/Employee Features</text>

              <rect x="50" y="460" width="240" height="45" rx="8" className="box-feature" strokeWidth="2" />
              <text x="170" y="480" className="text-white" style={{ fontSize: '12px' }}>Browse All Apartments</text>
              <text x="170" y="495" className="text-white" style={{ fontSize: '10px' }}>(from all landlords)</text>

              <rect x="50" y="520" width="240" height="40" rx="8" className="box-feature" strokeWidth="2" />
              <text x="170" y="545" className="text-white" style={{ fontSize: '12px' }}>Search & Filter</text>

              <rect x="50" y="575" width="240" height="40" rx="8" className="box-feature" strokeWidth="2" />
              <text x="170" y="600" className="text-white" style={{ fontSize: '12px' }}>View on Map</text>

              <rect x="50" y="630" width="240" height="40" rx="8" className="box-feature" strokeWidth="2" />
              <text x="170" y="655" className="text-white" style={{ fontSize: '12px' }}>Save Favorites</text>

              <rect x="50" y="685" width="240" height="40" rx="8" className="box-feature" strokeWidth="2" />
              <text x="170" y="710" className="text-white" style={{ fontSize: '12px' }}>View Details & Contact</text>

              <rect x="50" y="740" width="240" height="20" rx="5" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
              <text x="170" y="755" style={{ fontSize: '10px', fill: '#1e293b', textAnchor: 'middle' }}>NO EDIT PERMISSION</text>

              {/* ADMIN PATH */}
              <line x1="600" y1="400" x2="600" y2="440" className="arrow" />
              <text x="620" y="425" className="text-label">Admin</text>

              <rect x="500" y="440" width="200" height="60" rx="10" className="box-admin" strokeWidth="3" />
              <text x="600" y="465" className="text-white">Admin</text>
              <text x="600" y="485" className="text-white">Dashboard</text>

              <line x1="600" y1="500" x2="600" y2="540" className="arrow" />

              <rect x="450" y="540" width="300" height="220" rx="10" fill="#faf5ff" stroke="#9333ea" strokeWidth="2" />
              <text x="600" y="565" className="text-label" style={{ fontWeight: 'bold', fontSize: '14px' }}>Admin Features</text>

              <rect x="470" y="580" width="260" height="40" rx="8" className="box-feature" strokeWidth="2" />
              <text x="600" y="605" className="text-white" style={{ fontSize: '12px' }}>View All Landlords</text>

              <rect x="470" y="635" width="260" height="40" rx="8" className="box-feature" strokeWidth="2" />
              <text x="600" y="660" className="text-white" style={{ fontSize: '12px' }}>Verify Landlord Permits</text>

              <rect x="470" y="690" width="260" height="40" rx="8" className="box-feature" strokeWidth="2" />
              <text x="600" y="715" className="text-white" style={{ fontSize: '12px' }}>Revoke Verifications</text>

              <rect x="470" y="745" width="260" height="10" rx="2" fill="#7c3aed" />

              {/* LANDLORD PATH */}
              <line x1="750" y1="340" x2="950" y2="340" className="arrow" />
              <text x="860" y="330" className="text-label">Landlord</text>

              {/* Landlord can login, but verification determines apartment permissions */}
              <rect x="880" y="290" width="200" height="60" rx="10" className="box-landlord" strokeWidth="3" />
              <text x="980" y="315" className="text-white">Landlord</text>
              <text x="980" y="335" className="text-white">Dashboard</text>

              <line x1="980" y1="350" x2="980" y2="390" className="arrow" />

              <polygon points="980,390 1130,450 980,510 830,450" className="box-decision" strokeWidth="3" />
              <text x="980" y="440" className="text-white">Admin</text>
              <text x="980" y="458" className="text-white">Verified?</text>

              {/* Not Verified - Can login but cannot add apartments */}
              <line x1="980" y1="510" x2="980" y2="570" className="arrow-no" />
              <text x="1000" y="545" className="text-label">No</text>
              <rect x="880" y="570" width="200" height="100" rx="10" fill="#fef2f2" stroke="#ef4444" strokeWidth="3" />
              <text x="980" y="595" style={{ fill: '#991b1b', fontSize: '12px', fontWeight: 'bold', textAnchor: 'middle' }}>⚠️ Limited Access</text>
              <text x="980" y="615" style={{ fill: '#991b1b', fontSize: '10px', textAnchor: 'middle' }}>Can view dashboard</text>
              <text x="980" y="632" style={{ fill: '#991b1b', fontSize: '10px', textAnchor: 'middle' }}>Cannot add/edit</text>
              <text x="980" y="649" style={{ fill: '#991b1b', fontSize: '10px', textAnchor: 'middle' }}>apartments</text>

              {/* Admin verification arrow */}
              <line x1="750" y1="655" x2="880" y2="620" className="arrow" strokeDasharray="5,5" />
              <text x="800" y="625" style={{ fill: '#9333ea', fontSize: '10px', textAnchor: 'middle', fontWeight: 'bold' }}>Admin</text>
              <text x="800" y="640" style={{ fill: '#9333ea', fontSize: '10px', textAnchor: 'middle', fontWeight: 'bold' }}>Verifies</text>

              {/* Verified */}
              <line x1="1130" y1="450" x2="1170" y2="450" className="arrow-yes" />
              <text x="1150" y="440" className="text-label">Yes ✓</text>
              <line x1="1170" y1="450" x2="1170" y2="720" className="arrow" />
              <line x1="1170" y1="720" x2="1130" y2="720" className="arrow" />

              <rect x="880" y="690" width="250" height="500" rx="10" fill="#ecfdf5" stroke="#10b981" strokeWidth="2" />
              <text x="1005" y="715" className="text-label" style={{ fontWeight: 'bold', fontSize: '14px' }}>✓ Verified Landlord Features</text>

              <rect x="900" y="735" width="210" height="45" rx="8" className="box-feature" strokeWidth="2" />
              <text x="1005" y="755" className="text-white" style={{ fontSize: '12px' }}>Add New Apartments</text>
              <text x="1005" y="770" className="text-white" style={{ fontSize: '10px' }}>✓ Verified Badge</text>

              <rect x="900" y="795" width="210" height="40" rx="8" className="box-feature" strokeWidth="2" />
              <text x="1005" y="820" className="text-white" style={{ fontSize: '12px' }}>Edit Own Apartments</text>

              <rect x="900" y="850" width="210" height="40" rx="8" className="box-feature" strokeWidth="2" />
              <text x="1005" y="875" className="text-white" style={{ fontSize: '12px' }}>View Analytics</text>

              <rect x="900" y="905" width="210" height="40" rx="8" className="box-feature" strokeWidth="2" />
              <text x="1005" y="930" className="text-white" style={{ fontSize: '12px' }}>Track Performance</text>

              <rect x="900" y="960" width="210" height="40" rx="8" className="box-feature" strokeWidth="2" />
              <text x="1005" y="985" className="text-white" style={{ fontSize: '12px' }}>Manage Properties</text>

              <rect x="900" y="1015" width="210" height="40" rx="8" className="box-feature" strokeWidth="2" />
              <text x="1005" y="1040" className="text-white" style={{ fontSize: '12px' }}>Browse All Apartments</text>

              <rect x="900" y="1070" width="210" height="40" rx="8" className="box-feature" strokeWidth="2" />
              <text x="1005" y="1095" className="text-white" style={{ fontSize: '12px' }}>Revenue Tracking</text>

              <rect x="900" y="1130" width="210" height="50" rx="5" fill="#a5b4fc" stroke="#6366f1" strokeWidth="1" />
              <text x="1005" y="1150" style={{ fontSize: '10px', fill: '#1e1b4b', textAnchor: 'middle', fontWeight: 'bold' }}>EDIT OWN PROPERTIES ONLY</text>
              <text x="1005" y="1167" style={{ fontSize: '9px', fill: '#4338ca', textAnchor: 'middle' }}>Apartments show "Verified" badge</text>

              {/* DATA STORAGE */}
              <rect x="400" y="880" width="280" height="140" rx="10" className="box-data" strokeWidth="3" />
              <text x="540" y="905" className="text-white" style={{ fontSize: '14px' }}>Data Storage</text>
              <text x="540" y="925" className="text-white" style={{ fontSize: '10px' }}>(Currently localStorage)</text>
              <text x="540" y="950" style={{ fill: 'white', fontSize: '11px', textAnchor: 'middle' }}>• Users & Passwords</text>
              <text x="540" y="968" style={{ fill: 'white', fontSize: '11px', textAnchor: 'middle' }}>• User Verification Status</text>
              <text x="540" y="986" style={{ fill: 'white', fontSize: '11px', textAnchor: 'middle' }}>• Custom Apartments (landlordId)</text>
              <text x="540" y="1004" style={{ fill: 'white', fontSize: '11px', textAnchor: 'middle' }}>• Favorites</text>

              <line x1="310" y1="680" x2="450" y2="900" className="arrow" strokeDasharray="5,5" />
              <line x1="750" y1="700" x2="680" y2="930" className="arrow" strokeDasharray="5,5" />
              <line x1="880" y1="950" x2="680" y2="950" className="arrow" strokeDasharray="5,5" />

              {/* SHARED FEATURES */}
              <rect x="350" y="1100" width="500" height="140" rx="10" fill="#fffbeb" stroke="#f59e0b" strokeWidth="3" />
              <text x="600" y="1125" className="text-label" style={{ fontWeight: 'bold', fontSize: '15px' }}>Shared Platform Features</text>
              <text x="600" y="1150" style={{ fill: '#78350f', fontSize: '12px', textAnchor: 'middle' }}>✓ All users see ALL apartments from ALL landlords</text>
              <text x="600" y="1170" style={{ fill: '#78350f', fontSize: '12px', textAnchor: 'middle' }}>✓ Verified landlord apartments show blue badge</text>
              <text x="600" y="1190" style={{ fill: '#78350f', fontSize: '12px', textAnchor: 'middle' }}>✓ Search, Filter, Map View available to everyone</text>
              <text x="600" y="1210" style={{ fill: '#78350f', fontSize: '12px', textAnchor: 'middle' }}>✓ Responsive, Mobile-First Design</text>
              <text x="600" y="1230" style={{ fill: '#78350f', fontSize: '12px', textAnchor: 'middle' }}>✓ PWA Capabilities (Offline Support)</text>

              {/* PWA FEATURES */}
              <rect x="350" y="1280" width="500" height="100" rx="10" fill="#f0fdfa" stroke="#14b8a6" strokeWidth="3" />
              <text x="600" y="1305" className="text-label" style={{ fontWeight: 'bold', fontSize: '15px' }}>PWA Features</text>
              <text x="600" y="1330" style={{ fill: '#134e4a', fontSize: '12px', textAnchor: 'middle' }}>• Service Worker Registration</text>
              <text x="600" y="1350" style={{ fill: '#134e4a', fontSize: '12px', textAnchor: 'middle' }}>• Web App Manifest</text>
              <text x="600" y="1370" style={{ fill: '#134e4a', fontSize: '12px', textAnchor: 'middle' }}>• Installable on Mobile/Desktop</text>

              {/* NAVIGATION FLOW */}
              <rect x="250" y="1420" width="700" height="150" rx="10" fill="#fef2f2" stroke="#dc2626" strokeWidth="3" />
              <text x="600" y="1445" className="text-label" style={{ fontWeight: 'bold', fontSize: '15px' }}>Navigation System</text>
              <text x="600" y="1470" style={{ fill: '#991b1b', fontSize: '12px', textAnchor: 'middle', fontWeight: 'bold' }}>Smart Logo Navigation:</text>
              <text x="600" y="1490" style={{ fill: '#7f1d1d', fontSize: '11px', textAnchor: 'middle' }}>• Not logged in → Public Landing Page (/)</text>
              <text x="600" y="1510" style={{ fill: '#7f1d1d', fontSize: '11px', textAnchor: 'middle' }}>• Logged in → Personalized Dashboard (/dashboard)</text>
              <text x="600" y="1535" style={{ fill: '#991b1b', fontSize: '12px', textAnchor: 'middle', fontWeight: 'bold' }}>Back Button:</text>
              <text x="600" y="1555" style={{ fill: '#7f1d1d', fontSize: '11px', textAnchor: 'middle' }}>Available on all pages for easy navigation</text>

              {/* KEY CONCEPTS */}
              <rect x="250" y="1610" width="700" height="230" rx="10" fill="#f5f3ff" stroke="#7c3aed" strokeWidth="3" />
              <text x="600" y="1635" className="text-label" style={{ fontWeight: 'bold', fontSize: '16px' }}>Key Platform Concepts</text>
              <text x="600" y="1665" style={{ fill: '#5b21b6', fontSize: '13px', textAnchor: 'middle', fontWeight: 'bold' }}>🏢 Multi-Landlord Platform</text>
              <text x="600" y="1685" style={{ fill: '#6d28d9', fontSize: '11px', textAnchor: 'middle' }}>Multiple verified landlords can each add their own apartments</text>
              <text x="600" y="1710" style={{ fill: '#5b21b6', fontSize: '13px', textAnchor: 'middle', fontWeight: 'bold' }}>🔐 Role-Based Access Control</text>
              <text x="600" y="1730" style={{ fill: '#6d28d9', fontSize: '11px', textAnchor: 'middle' }}>Admin: Verify landlords • Students/Employees: Browse only</text>
              <text x="600" y="1747" style={{ fill: '#6d28d9', fontSize: '11px', textAnchor: 'middle' }}>Landlords: Add & Edit own properties (when verified)</text>
              <text x="600" y="1772" style={{ fill: '#5b21b6', fontSize: '13px', textAnchor: 'middle', fontWeight: 'bold' }}>✅ Admin Verification System</text>
              <text x="600" y="1792" style={{ fill: '#6d28d9', fontSize: '11px', textAnchor: 'middle' }}>Landlords provide Permit + Mobile Number, Admin manually verifies</text>
              <text x="600" y="1809" style={{ fill: '#6d28d9', fontSize: '11px', textAnchor: 'middle' }}>Unverified landlords CANNOT login until admin approval</text>
              <text x="600" y="1826" style={{ fill: '#6d28d9', fontSize: '11px', textAnchor: 'middle' }}>Verified landlord apartments display verification badge to users</text>

              {/* LOCATION */}
              <rect x="400" y="1880" width="400" height="60" rx="10" fill="#dbeafe" stroke="#2563eb" strokeWidth="3" />
              <text x="600" y="1905" style={{ fill: '#1e3a8a', fontSize: '14px', textAnchor: 'middle', fontWeight: 'bold' }}>📍 Location: La Paz, Iloilo City, Philippines</text>
              <text x="600" y="1925" style={{ fill: '#1e40af', fontSize: '11px', textAnchor: 'middle' }}>All apartments mapped to La Paz area coordinates</text>

              {/* FUTURE */}
              <rect x="350" y="1980" width="500" height="80" rx="10" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,5" />
              <text x="600" y="2005" style={{ fill: '#92400e', fontSize: '13px', textAnchor: 'middle', fontWeight: 'bold' }}>🚀 Future Enhancement</text>
              <text x="600" y="2025" style={{ fill: '#a16207', fontSize: '11px', textAnchor: 'middle' }}>Data structure ready for migration to Supabase backend</text>
              <text x="600" y="2045" style={{ fill: '#a16207', fontSize: '11px', textAnchor: 'middle' }}>with minimal code changes</text>

              {/* LEGEND */}
              <g transform="translate(50, 2100)">
                <text x="0" y="0" style={{ fill: '#0f172a', fontSize: '14px', fontWeight: 'bold' }}>Legend:</text>
                <rect x="0" y="10" width="60" height="25" rx="5" className="box-start" strokeWidth="2" />
                <text x="70" y="27" style={{ fill: '#475569', fontSize: '11px' }}>Start/Page</text>
                <rect x="160" y="10" width="60" height="25" rx="5" className="box-decision" strokeWidth="2" />
                <text x="230" y="27" style={{ fill: '#475569', fontSize: '11px' }}>Decision</text>
                <rect x="320" y="10" width="60" height="25" rx="5" className="box-student" strokeWidth="2" />
                <text x="390" y="27" style={{ fill: '#475569', fontSize: '11px' }}>Student/Employee</text>
                <rect x="530" y="10" width="60" height="25" rx="5" className="box-landlord" strokeWidth="2" />
                <text x="600" y="27" style={{ fill: '#475569', fontSize: '11px' }}>Landlord</text>
                <rect x="690" y="10" width="60" height="25" rx="5" className="box-admin" strokeWidth="2" />
                <text x="760" y="27" style={{ fill: '#475569', fontSize: '11px' }}>Admin</text>
                <rect x="850" y="10" width="60" height="25" rx="5" className="box-feature" strokeWidth="2" />
                <text x="920" y="27" style={{ fill: '#475569', fontSize: '11px' }}>Feature</text>
                <rect x="1010" y="10" width="60" height="25" rx="5" className="box-data" strokeWidth="2" />
                <text x="1080" y="27" style={{ fill: '#475569', fontSize: '11px' }}>Data Storage</text>
              </g>

              {/* Version */}
              <text x="1350" y="2280" style={{ fill: '#94a3b8', fontSize: '10px', textAnchor: 'end' }}>AptFinder v2.0</text>
            </svg>
          </CardContent>
        </Card>

        {/* Text Summary */}
        <Card className="mt-8 shadow-lg">
          <CardContent className="p-8 space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Platform Summary</h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-lg text-slate-900 mb-3">User Types</h3>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="w-3 h-3 mt-0.5 rounded-full bg-green-500 flex-shrink-0" />
                    <span><strong>Student/Employee:</strong> Can browse all apartments, search, filter, save favorites, but cannot add or edit listings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-3 h-3 mt-0.5 rounded-full bg-purple-500 flex-shrink-0" />
                    <span><strong>Landlord (Verified):</strong> Can add new apartments with verified badge, edit own properties, view analytics, and browse like students</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-3 h-3 mt-0.5 rounded-full bg-orange-500 flex-shrink-0" />
                    <span><strong>Landlord (Unverified):</strong> Can login but cannot add or edit apartments until admin verifies their permit and mobile number</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-3 h-3 mt-0.5 rounded-full bg-purple-700 flex-shrink-0" />
                    <span><strong>Admin:</strong> Can verify or revoke landlord accounts, review permit information, and manage platform verification</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg text-slate-900 mb-3">Core Features</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  {[
                    "Multi-landlord platform where verified landlords can add apartments",
                    "Admin verification system with manual permit review",
                    "Verified landlord badge displayed on apartment listings",
                    "Role-based dashboards (Admin, Landlord, Student/Employee)",
                    "Advanced search, filters, and interactive map view",
                    "PWA capabilities for offline use and installation",
                    "Smart navigation based on authentication state"
                  ].map((feat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg text-slate-900 mb-2">Data Flow & Verification</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                <strong>Verification Process:</strong> When landlords sign up with permit and mobile number, their account is created with{" "}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">isVerified: false</code>.
                They can login and view their dashboard, but cannot add or edit apartments until an admin manually verifies them. Once verified by admin, they can add apartments with a verified badge.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                <strong>Apartment Management:</strong> All apartments added by verified landlords are stored with a{" "}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">landlordId</code> field and display a verification badge.
                When viewing apartments, students/employees see ALL apartments from ALL verified landlords in one unified view.
                Landlords can only edit apartments where{" "}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">apartment.landlordId === user.id</code>.
                Data is currently stored in localStorage but structured for easy migration to Supabase.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 py-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-slate-500">La Paz AptFinder · Flowchart v2.0 (Admin Verification)</p>
          <div className="flex items-center gap-3">
            <Link to="/design-guide">
              <Button variant="outline" size="sm">View Design Guide</Button>
            </Link>
            <Link to="/">
              <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to App
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

