import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { computeAll, fmtINR, fmtNum, fmtYears, ProjectState } from "@/lib/engine";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, project_type, data")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (projects || []).map((p) => ({ ...p, m: computeAll(p.data as ProjectState) }));

  return (
    <div className="app-root">
      <Sidebar active="compare" userEmail={user.email} />
      <main className="main-canvas">
        <div className="view">
          <div className="step-header">
            <div className="step-stamp">12</div>
            <div>
              <h2 className="step-title">Compare Projects</h2>
              <p className="step-subtitle">Every saved project, side by side.</p>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="card"><p className="note">No projects saved yet. Create one from the Projects page to start comparing.</p></div>
          ) : (
            <div className="card" style={{ overflowX: "auto" }}>
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    {rows.map((r) => (
                      <th key={r.id}><Link href={`/projects/${r.id}`} style={{ color: "inherit" }}>{r.name}</Link></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Type", (r: any) => r.project_type],
                    ["Total Investment", (r: any) => fmtINR(r.m.totalInvestment)],
                    ["Annual Revenue", (r: any) => fmtINR(r.m.annualRevenue)],
                    ["Net Profit", (r: any) => fmtINR(r.m.netProfit)],
                    ["ROI", (r: any) => fmtNum(r.m.roiPct) + "%"],
                    ["Payback", (r: any) => fmtYears(r.m.paybackYears)],
                    ["IRR", (r: any) => (r.m.irr !== null ? fmtNum(r.m.irr * 100) + "%" : "n/a")],
                    ["NPV", (r: any) => fmtINR(r.m.npv)],
                    ["DSCR", (r: any) => fmtNum(r.m.dscr, 2) + "x"],
                    ["Cash Flow (annual)", (r: any) => fmtINR(r.m.netProfit)],
                    ["Score", (r: any) => fmtNum(r.m.overallScore) + "/10"],
                    ["Risk", (r: any) => r.m.riskLevel],
                  ].map(([label, get]: any) => (
                    <tr key={label}>
                      <td>{label}</td>
                      {rows.map((r) => <td key={r.id} className="mono">{get(r)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
