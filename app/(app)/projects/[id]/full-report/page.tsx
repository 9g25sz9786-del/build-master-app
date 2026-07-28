import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftCircle } from "lucide-react";
import { computeAll, buildRecommendation, fmtINR, fmtNum, fmtYears, ProjectState } from "@/lib/engine";
import { CompanyProfile, ProjectMedia, CompanyProfileSection } from "@/lib/types";
import PrintButton from "@/components/PrintButton";
import ReportCharts from "@/components/ReportCharts";

export const dynamic = "force-dynamic";

const PROJECT_TYPE_LABEL: Record<string, string> = { hostel: "Hostel", apartment: "Apartment Building", commercial: "Commercial Building" };

function ScoreGaugeStatic({ score }: { score: number }) {
  const pct = Math.min(10, Math.max(0, score)) / 10;
  const angle = -90 + pct * 180;
  const r = 70, cx = 90, cy = 90;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const arcColor = score >= 7 ? "#2E8B6F" : score >= 5 ? "#C1272D" : "#C1272D";
  return (
    <svg viewBox="0 0 180 110" style={{ width: 200 }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#ECECEC" strokeWidth="12" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(rad(angle))} ${cy + r * Math.sin(rad(angle))}`} fill="none" stroke={arcColor} strokeWidth="12" strokeLinecap="round" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="26" fontWeight="700" fontFamily="IBM Plex Mono, monospace" fill="#141414">{fmtNum(score)}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="#6E6E6E">out of 10</text>
    </svg>
  );
}

// Original line-art placeholder graphics — shown only until real photos are uploaded.
function CoverPlaceholder() {
  return (
    <svg className="report-cover-placeholder" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#1c1c1c" />
      <g stroke="#4a4a4a" strokeWidth="2" fill="none">
        <line x1="120" y1="560" x2="120" y2="120" />
        <line x1="120" y1="120" x2="60" y2="120" />
        <line x1="90" y1="120" x2="90" y2="60" />
        <line x1="60" y1="150" x2="180" y2="150" />
        <line x1="60" y1="220" x2="180" y2="220" />
        <line x1="60" y1="290" x2="180" y2="290" />
      </g>
      <g stroke="#3a3a3a" strokeWidth="1.5" fill="none">
        <rect x="300" y="260" width="420" height="300" />
        <line x1="300" y1="330" x2="720" y2="330" />
        <line x1="300" y1="400" x2="720" y2="400" />
        <line x1="300" y1="470" x2="720" y2="470" />
        <line x1="380" y1="260" x2="380" y2="560" />
        <line x1="460" y1="260" x2="460" y2="560" />
        <line x1="540" y1="260" x2="540" y2="560" />
        <line x1="620" y1="260" x2="620" y2="560" />
      </g>
    </svg>
  );
}
function TopicPlaceholder() {
  return (
    <svg viewBox="0 0 800 360" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: 360, display: "block" }}>
      <rect width="800" height="360" fill="#EDEDED" />
      <g stroke="#B9B9B9" strokeWidth="2" fill="none">
        <rect x="140" y="90" width="220" height="200" />
        <line x1="140" y1="150" x2="360" y2="150" />
        <line x1="140" y1="210" x2="360" y2="210" />
        <line x1="140" y1="250" x2="360" y2="250" />
        <line x1="200" y1="90" x2="200" y2="290" />
        <line x1="260" y1="90" x2="260" y2="290" />
        <line x1="320" y1="90" x2="320" y2="290" />
      </g>
      <g stroke="#C1272D" strokeWidth="2.5" fill="none">
        <line x1="450" y1="290" x2="450" y2="80" />
        <line x1="450" y1="80" x2="500" y2="60" />
        <line x1="450" y1="100" x2="600" y2="100" />
      </g>
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

  const { data: companySectionsRaw } = await supabase
    .from("company_profile_sections")
    .select("*")
    .eq("owner_id", project.user_id)
    .order("sort_order", { ascending: true });
  const companySections = (companySectionsRaw as CompanyProfileSection[]) || [];
  const companyPublicUrl = (path: string) =>
    supabase.storage.from("company-media").getPublicUrl(path).data.publicUrl;

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
  const companyName = c?.company_name || "Maharaja Engineers & Contractors";

  const TOC = [
    { n: "01", label: "Company Profile" },
    { n: "02", label: "Project Feasibility Analysis" },
    ...(media.length > 0 ? [{ n: "03", label: "Renderings, Plans & Site Photos" }] : []),
    { n: media.length > 0 ? "04" : "03", label: "Conclusion & Recommendation" },
  ];

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
            <img src={publicUrl(coverImage.storage_path)} alt="" className="report-cover-bg" />
          ) : (
            <CoverPlaceholder />
          )}
          <div className="report-cover-overlay" />
          <div className="report-cover-logo-row">
            {c?.logo_storage_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companyPublicUrl(c.logo_storage_path)} alt={companyName} />
            ) : null}
            <span className="report-cover-logo-text">{companyName}</span>
          </div>
          <div className="report-cover-content">
            <div className="report-cover-eyebrow"><span className="report-accent-dot" /> Commercial Project Feasibility Report</div>
            <h1 className="report-cover-title">{project.name}<span className="accent">.</span></h1>
            <p className="report-cover-sub">{PROJECT_TYPE_LABEL[project.project_type] || project.project_type} — {state.project.location || "—"}</p>
            <div className="report-cover-meta">
              <span>PREPARED {today.toUpperCase()}</span>
              <span>SCORE {fmtNum(m.overallScore)}/10</span>
            </div>
          </div>
        </div>

        {/* Contents */}
        <div className="report-toc">
          <div className="report-toc-title">Contents</div>
          <div className="report-toc-list">
            {TOC.map((t) => (
              <div className="report-toc-item" key={t.n}>
                <span className="report-toc-num">{t.n}</span>
                <span className="report-toc-label">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 1. Introduction / Company Profile */}
        <section className="report-section">
          <h2 className="report-section-title"><span className="report-section-num">01</span> Company Profile</h2>
          <div className="report-contact-grid" style={{ marginBottom: 26 }}>
            {c?.established_year && <div><b>Established:</b> {c.established_year}</div>}
            {c?.completed_projects_count && <div><b>Completed Projects:</b> {c.completed_projects_count}+</div>}
            {c?.phone && <div><b>Phone:</b> {c.phone}</div>}
            {c?.email && <div><b>Email:</b> {c.email}</div>}
            {c?.website && <div><b>Website:</b> {c.website}</div>}
            {c?.address && <div><b>Address:</b> {c.address}</div>}
          </div>

          {companySections.length === 0 ? (
            <p className="report-prose">
              No company profile content yet. Add sections (heading + text + photos) from the Company Profile page —
              they'll appear here automatically, in order, laid out exactly like this.
            </p>
          ) : (
            companySections.map((s) => (
              <div key={s.id} className="report-topic">
                <div className="report-topic-heading-row">
                  <span className="report-accent-dot" />
                  <h3 className="report-topic-title">{s.title}</h3>
                </div>
                <div className="report-topic-rule" />
                <div className="report-topic-hero">
                  {s.photos && s.photos.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={companyPublicUrl(s.photos[0].storage_path)} alt="" />
                  ) : (
                    <TopicPlaceholder />
                  )}
                </div>
                {s.photos && s.photos.length > 1 && (
                  <div className="report-topic-grid">
                    {s.photos.slice(1).map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p.storage_path} src={companyPublicUrl(p.storage_path)} alt="" />
                    ))}
                  </div>
                )}
                <p className="report-prose">{s.body}</p>
              </div>
            ))
          )}
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
          <h2 className="report-section-title"><span className="report-section-num">{media.length > 0 ? "04" : "03"}</span> Conclusion & Recommendation</h2>
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

        <div className="report-final-cta">
          <span className="report-accent-dot" style={{ display: "block", margin: "0 auto 16px" }} />
          <h3>{companyName}</h3>
          <p>{c?.tagline || "Building trust, one project at a time."} — Report prepared {today}</p>
        </div>
      </div>
    </div>
  );
}
