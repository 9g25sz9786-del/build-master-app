import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftCircle } from "lucide-react";
import { computeAll, buildRecommendation, fmtINR, fmtNum, fmtYears, ProjectState } from "@/lib/engine";
import { CompanyProfile, ProjectMedia, MEDIA_CATEGORY_LABEL, MediaCategory } from "@/lib/types";
import PrintButton from "@/components/PrintButton";
import ReportCharts from "@/components/ReportCharts";

export const dynamic = "force-dynamic";

const PROJECT_TYPE_LABEL: Record<string, string> = { hostel: "Hostel", apartment: "Apartment Building", commercial: "Commercial Building" };

function ScoreGaugeStatic({ score }: { score: number }) {
  const pct = Math.min(10, Math.max(0, score)) / 10;
  const angle = -90 + pct * 180;
  const r = 70, cx = 90, cy = 90;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const arcColor = score >= 7 ? "#2E8B6F" : score >= 5 ? "#B8863B" : "#B5482F";
  return (
    <svg viewBox="0 0 180 110" style={{ width: 200 }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#ECE8DD" strokeWidth="12" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(rad(angle))} ${cy + r * Math.sin(rad(angle))}`} fill="none" stroke={arcColor} strokeWidth="12" strokeLinecap="round" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="26" fontWeight="700" fontFamily="IBM Plex Mono, monospace" fill="#1A1712">{fmtNum(score)}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="#6B6355">out of 10</text>
    </svg>
  );
}

export default async function FullReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, project_type, data, user_id, updated_at")
    .eq("id", id)
    .single();
  if (error || !project) notFound();

  const { data: company } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("id", project.user_id)
    .single();

  const { data: mediaRows } = await supabase
    .from("project_media")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });

  const media = (mediaRows as ProjectMedia[]) || [];
  const publicUrl = (path: string) =>
    supabase.storage.from("project-media").getPublicUrl(path).data.publicUrl;

  const state = project.data as ProjectState;
  const m = computeAll(state);
  const rec = buildRecommendation(m);
  const c = company as CompanyProfile | null;

  const coverImage = media.find((x) => x.category === "render") || media[0];
  const renders = media.filter((x) => x.category === "render");
  const plans = media.filter((x) => x.category === "plan");
  const sitePhotos = media.filter((x) => x.category === "site_photo" || x.category === "other");

  const today = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="report-page">
      <div className="report-topbar no-print">
        <Link href={`/projects/${id}`} className="btn-ghost"><ArrowLeftCircle size={16} /> Back to Project</Link>
        <PrintButton />
      </div>

      <div className="report-doc">
        {/* Cover */}
        <div className="report-cover">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={publicUrl(coverImage.storage_path)} alt="" style={{ width: "100%", maxHeight: 340, objectFit: "cover" }} />
          ) : null}
          <div className="report-cover-company">{c?.company_name || "Maharaja Engineers & Contractors"}</div>
          <h1 className="report-cover-title">{project.name}</h1>
          <p className="report-cover-sub">Commercial Project Feasibility Report — {PROJECT_TYPE_LABEL[project.project_type] || project.project_type}</p>
          <div className="report-cover-meta">
            <span>Location: {state.project.location || "—"}</span>
            <span>Prepared: {today}</span>
            <span>Investment Score: {fmtNum(m.overallScore)}/10</span>
          </div>
        </div>

        {/* 1. Introduction / Company Profile */}
        <section className="report-section">
          <h2 className="report-section-title"><span className="report-section-num">01</span> Introduction — Company Profile</h2>
          <p className="report-prose">
            {c?.about ||
              "Company profile has not been filled in yet. Add one from the Company Profile page so every report opens with a proper introduction."}
          </p>
          {(c?.portfolio_highlights?.length || 0) > 0 && (
            <ul className="report-highlights">
              {c!.portfolio_highlights.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
          )}
          <div className="report-contact-grid">
            {c?.established_year && <div><b>Established:</b> {c.established_year}</div>}
            {c?.completed_projects_count && <div><b>Completed Projects:</b> {c.completed_projects_count}+</div>}
            {c?.phone && <div><b>Phone:</b> {c.phone}</div>}
            {c?.email && <div><b>Email:</b> {c.email}</div>}
            {c?.website && <div><b>Website:</b> {c.website}</div>}
            {c?.address && <div><b>Address:</b> {c.address}</div>}
          </div>
        </section>

        {/* 2. Project Feasibility */}
        <section className="report-section">
          <h2 className="report-section-title"><span className="report-section-num">02</span> Project Feasibility Analysis</h2>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">Project Details</div>
            <div className="metric-grid">
              <div className="stat-tile"><div className="stat-label">Developer</div><div className="stat-value">{state.project.developerName}</div></div>
              <div className="stat-tile"><div className="stat-label">Location</div><div className="stat-value">{state.project.location}</div></div>
              <div className="stat-tile"><div className="stat-label">Land Area</div><div className="stat-value mono">{state.project.landArea} {state.project.landUnit}</div></div>
              <div className="stat-tile"><div className="stat-label">Duration</div><div className="stat-value mono">{state.project.durationMonths} mo</div></div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">Cost, Revenue & Profitability</div>
            <div className="metric-grid">
              <div className="stat-tile"><div className="stat-label">Total Investment</div><div className="stat-value mono">{fmtINR(m.totalInvestment)}</div></div>
              <div className="stat-tile"><div className="stat-label">Annual Revenue</div><div className="stat-value mono">{fmtINR(m.annualRevenue)}</div></div>
              <div className="stat-tile"><div className="stat-label">NOI</div><div className="stat-value mono">{fmtINR(m.NOI)}</div></div>
              <div className="stat-tile"><div className="stat-label">Net Profit</div><div className="stat-value mono">{fmtINR(m.netProfit)}</div></div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">Investment Metrics</div>
            <div className="metric-grid">
              <div className="stat-tile"><div className="stat-label">ROI</div><div className="stat-value mono">{fmtNum(m.roiPct)}%</div></div>
              <div className="stat-tile"><div className="stat-label">DSCR</div><div className="stat-value mono">{fmtNum(m.dscr, 2)}x</div></div>
              <div className="stat-tile"><div className="stat-label">Payback</div><div className="stat-value mono">{fmtYears(m.paybackYears)}</div></div>
              <div className="stat-tile"><div className="stat-label">IRR</div><div className="stat-value mono">{m.irr !== null ? fmtNum(m.irr * 100) + "%" : "n/a"}</div></div>
              <div className="stat-tile"><div className="stat-label">NPV</div><div className="stat-value mono">{fmtINR(m.npv)}</div></div>
              <div className="stat-tile"><div className="stat-label">Cap Rate</div><div className="stat-value mono">{fmtNum(m.capRate)}%</div></div>
              <div className="stat-tile"><div className="stat-label">Loan / Cost</div><div className="stat-value mono">{fmtNum(m.loanToProjectCost, 0)}%</div></div>
              <div className="stat-tile"><div className="stat-label">Profit Margin</div><div className="stat-value mono">{fmtNum(m.profitMargin)}%</div></div>
            </div>
          </div>

          <ReportCharts costBreakdown={m.costBreakdown} revenueBreakdown={m.revenueBreakdown} />

          <div className="card" style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 24 }}>
            <ScoreGaugeStatic score={m.overallScore} />
            <div>
              <div className="card-head" style={{ marginBottom: 4 }}>{m.scoreLabel}</div>
              <p className="report-prose" style={{ fontSize: 13 }}>Risk Level: <b>{m.riskLevel}</b> · {m.bankable}</p>
            </div>
          </div>
        </section>

        {/* 3. Renderings & Plans */}
        {media.length > 0 && (
          <section className="report-section">
            <h2 className="report-section-title"><span className="report-section-num">03</span> Renderings, Plans & Site Photos</h2>
            {renders.length > 0 && (
              <>
                <h3 style={{ fontFamily: "Poppins,sans-serif", fontSize: 15, marginBottom: 4 }}>3D Renders</h3>
                <div className="report-media-grid">
                  {renders.map((r) => (
                    <div className="report-media-card" key={r.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={publicUrl(r.storage_path)} alt={r.title} />
                      <div className="report-media-title">{r.title}</div>
                      {r.caption && <div className="report-media-caption">{r.caption}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}
            {plans.length > 0 && (
              <>
                <h3 style={{ fontFamily: "Poppins,sans-serif", fontSize: 15, margin: "24px 0 4px" }}>Plans & Drawings</h3>
                <div className="report-media-grid">
                  {plans.map((r) => (
                    <div className="report-media-card" key={r.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={publicUrl(r.storage_path)} alt={r.title} />
                      <div className="report-media-title">{r.title}</div>
                      {r.caption && <div className="report-media-caption">{r.caption}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}
            {sitePhotos.length > 0 && (
              <>
                <h3 style={{ fontFamily: "Poppins,sans-serif", fontSize: 15, margin: "24px 0 4px" }}>Site Photos & Other</h3>
                <div className="report-media-grid">
                  {sitePhotos.map((r) => (
                    <div className="report-media-card" key={r.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={publicUrl(r.storage_path)} alt={r.title} />
                      <div className="report-media-title">{r.title}</div>
                      {r.caption && <div className="report-media-caption">{r.caption}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* 4. Conclusion */}
        <section className="report-section">
          <h2 className="report-section-title"><span className="report-section-num">04</span> Conclusion & Recommendation</h2>
          <p className="report-prose" style={{ marginBottom: 18 }}>{rec.verdict}</p>

          <div className="report-cols" style={{ marginBottom: 16 }}>
            <div className="card">
              <div className="card-head">Strengths</div>
              <ul className="list-good">{rec.strengths.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
            <div className="card">
              <div className="card-head">Weaknesses</div>
              <ul className="list-bad">{rec.weaknesses.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          </div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">Financial Risks</div>
            <ul className="list-plain">{rec.risks.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
          <div className="card">
            <div className="card-head">Suggested Improvements</div>
            <ul className="list-plain">{rec.improvements.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
        </section>

        <p style={{ textAlign: "center", fontSize: 11, color: "var(--slate)" }}>
          Prepared by {c?.company_name || "Maharaja Engineers & Contractors"} using the Build Master Project Feasibility App — {today}
        </p>
      </div>
    </div>
  );
}
