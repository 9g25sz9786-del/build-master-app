import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftCircle } from "lucide-react";
import { computeAll, buildRecommendation, fmtINR, fmtNum, fmtYears, ProjectState } from "@/lib/engine";
import { CompanyProfile, ProjectMedia, ProjectIntroSection } from "@/lib/types";
import PrintButton from "@/components/PrintButton";
import ReportCharts from "@/components/ReportCharts";

export const dynamic = "force-dynamic";

const PROJECT_TYPE_LABEL: Record<string, string> = { hostel: "Hostel", apartment: "Apartment Building", commercial: "Commercial Building" };

const METRIC_DESC: Record<string, string> = {
  "Total Investment": "Full cost to complete the project — land, construction, professional fees and finance costs combined.",
  "Annual Revenue": "Total income the project is expected to generate in a typical year.",
  NOI: "Net Operating Income — annual revenue minus operating expenses, before financing costs.",
  "Net Profit": "Annual revenue minus operating expenses and debt service — the actual annual return to the owner.",
  ROI: "Annual net profit as a percentage of total investment.",
  DSCR: "Debt Service Coverage Ratio — net operating income divided by annual loan repayment. Above 1.2x is generally considered bankable.",
  Payback: "Time required to recover the total investment from net cash flow.",
  IRR: "Internal Rate of Return — the annualised return accounting for the timing of every cash flow, including the exit.",
  NPV: "Net Present Value — today's value of all future cash flows minus the initial investment, at the chosen discount rate.",
  "Cap Rate": "Capitalisation Rate — net operating income as a percentage of total investment, a standard real estate yield measure.",
  "Loan / Cost": "Bank loan as a percentage of total project cost. Lower means less leverage and less repayment risk.",
  "Profit Margin": "Net profit as a percentage of annual revenue.",
};
function MetricStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className="stat-value mono">{value}</div>
      {METRIC_DESC[label] && <div className="stat-desc">{METRIC_DESC[label]}</div>}
    </div>
  );
}

function ScoreGaugeStatic({ score }: { score: number }) {
  const pct = Math.min(10, Math.max(0, score)) / 10;
  const angle = 180 + pct * 180;
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

// Portrait-panel construction graphics for the multi-sheet author bio pages.
function BioGraphicCrane() {
  return (
    <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
      <rect width="300" height="400" fill="#141414" />
      <g stroke="#4a4a4a" strokeWidth="2" fill="none">
        <line x1="90" y1="360" x2="90" y2="60" />
        <line x1="90" y1="60" x2="220" y2="60" />
        <line x1="90" y1="60" x2="60" y2="140" />
        <line x1="220" y1="60" x2="220" y2="90" />
        <line x1="60" y1="360" x2="120" y2="360" />
      </g>
      <g stroke="#C1272D" strokeWidth="2.5" fill="none">
        <line x1="220" y1="90" x2="220" y2="220" />
        <circle cx="220" cy="228" r="6" />
      </g>
      <g stroke="#2a2a2a" strokeWidth="1.5" fill="none">
        <rect x="40" y="340" width="220" height="30" />
        <line x1="70" y1="340" x2="70" y2="370" />
        <line x1="110" y1="340" x2="110" y2="370" />
        <line x1="150" y1="340" x2="150" y2="370" />
        <line x1="190" y1="340" x2="190" y2="370" />
        <line x1="230" y1="340" x2="230" y2="370" />
      </g>
    </svg>
  );
}
function BioGraphicBlueprint() {
  return (
    <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
      <rect width="300" height="400" fill="#141414" />
      <g stroke="#3a3a3a" strokeWidth="1.5" fill="none">
        <rect x="50" y="80" width="200" height="240" />
        <line x1="50" y1="150" x2="250" y2="150" />
        <line x1="50" y1="220" x2="250" y2="220" />
        <line x1="50" y1="270" x2="250" y2="270" />
        <line x1="120" y1="80" x2="120" y2="320" />
        <line x1="180" y1="80" x2="180" y2="320" />
      </g>
      <g stroke="#C1272D" strokeWidth="2" fill="none">
        <circle cx="150" cy="200" r="30" />
        <line x1="150" y1="170" x2="150" y2="230" />
        <line x1="120" y1="200" x2="180" y2="200" />
      </g>
    </svg>
  );
}
function BioGraphicHardHat() {
  return (
    <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
      <rect width="300" height="400" fill="#141414" />
      <g stroke="#4a4a4a" strokeWidth="2" fill="none">
        <path d="M 90 220 A 60 60 0 0 1 210 220" />
        <line x1="80" y1="220" x2="220" y2="220" />
        <line x1="145" y1="160" x2="145" y2="140" />
      </g>
      <g stroke="#C1272D" strokeWidth="2.5" fill="none">
        <line x1="150" y1="260" x2="150" y2="330" />
        <line x1="120" y1="290" x2="180" y2="290" />
      </g>
    </svg>
  );
}
const BIO_GRAPHICS = [BioGraphicCrane, BioGraphicBlueprint, BioGraphicHardHat];

function splitBioIntoSheets(bio: string): string[] {
  const byBlankLine = bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (byBlankLine.length > 1) return byBlankLine;

  // No paragraph breaks — chunk long single-paragraph bios into readable sheets.
  const sentences = bio.match(/[^.!?]+[.!?]+/g) || [bio];
  const chunks: string[] = [];
  let current = "";
  sentences.forEach((s, i) => {
    current += s;
    if ((i + 1) % 3 === 0) {
      chunks.push(current.trim());
      current = "";
    }
  });
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [bio];
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

  const { data: introSectionsRaw } = await supabase
    .from("project_intro_sections")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });
  const introSections = (introSectionsRaw as ProjectIntroSection[]) || [];

  const { data: mediaRows } = await supabase
    .from("project_media")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });

  const media = (mediaRows as ProjectMedia[]) || [];
  const publicUrl = (path: string) =>
    supabase.storage.from("project-media").getPublicUrl(path).data.publicUrl;
  const companyPublicUrl = (path: string) =>
    supabase.storage.from("company-media").getPublicUrl(path).data.publicUrl;

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

  const hasAuthorContent = !!(c?.author_name || c?.author_bio || c?.author_photo_storage_path);
  const conclusionNum = media.length > 0 ? 4 : 3;
  const TOC = [
    { n: "01", label: "Project Introduction" },
    { n: "02", label: "Project Feasibility Analysis" },
    ...(media.length > 0 ? [{ n: "03", label: "Renderings, Plans & Site Photos" }] : []),
    { n: String(conclusionNum).padStart(2, "0"), label: "Conclusion & Recommendation" },
    ...(hasAuthorContent ? [{ n: String(conclusionNum + 1).padStart(2, "0"), label: "About the Author" }] : []),
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
              <div className="report-cover-logo-band">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={companyPublicUrl(c.logo_storage_path)} alt={companyName} />
              </div>
            ) : (
              <span className="report-cover-logo-text">{companyName}</span>
            )}
            {(c?.tagline || c?.established_year) && (
              <div className="report-cover-tagline-row">
                {c?.tagline && <div className="report-cover-tagline">{c.tagline}</div>}
                {c?.established_year && <div className="report-cover-since">SINCE {c.established_year}</div>}
              </div>
            )}
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

        {/* 1. Project Introduction */}
        <section className="report-section">
          <h2 className="report-section-title"><span className="report-section-num">01</span> Project Introduction</h2>

          {introSections.length === 0 ? (
            <p className="report-prose">
              No introduction content yet for this project. Add sections (heading + text + photos) from
              this project's <b>Project Intro</b> page — they'll appear here automatically, in order, laid out exactly like this.
            </p>
          ) : (
            introSections.map((s) => (
              <div key={s.id} className="report-topic">
                <div className="report-topic-heading-row">
                  <span className="report-accent-dot" />
                  <h3 className="report-topic-title">{s.title}</h3>
                </div>
                <div className="report-topic-rule" />
                <div className="report-topic-hero">
                  {s.photos && s.photos.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={publicUrl(s.photos[0].storage_path)} alt="" />
                  ) : (
                    <TopicPlaceholder />
                  )}
                </div>
                {s.photos && s.photos.length > 1 && (
                  <div className="report-topic-grid">
                    {s.photos.slice(1).map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p.storage_path} src={publicUrl(p.storage_path)} alt="" />
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
              <MetricStat label="Total Investment" value={fmtINR(m.totalInvestment)} />
              <MetricStat label="Annual Revenue" value={fmtINR(m.annualRevenue)} />
              <MetricStat label="NOI" value={fmtINR(m.NOI)} />
              <MetricStat label="Net Profit" value={fmtINR(m.netProfit)} />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">Investment Metrics</div>
            <div className="metric-grid">
              <MetricStat label="ROI" value={fmtNum(m.roiPct) + "%"} />
              <MetricStat label="DSCR" value={m.hasLoan ? fmtNum(m.dscr, 2) + "x" : "No Loan"} />
              <MetricStat label="Payback" value={fmtYears(m.paybackYears)} />
              <MetricStat label="IRR" value={m.irr !== null ? fmtNum(m.irr * 100) + "%" : "n/a"} />
              <MetricStat label="NPV" value={fmtINR(m.npv)} />
              <MetricStat label="Cap Rate" value={fmtNum(m.capRate) + "%"} />
              <MetricStat label="Loan / Cost" value={fmtNum(m.loanToProjectCost, 0) + "%"} />
              <MetricStat label="Profit Margin" value={fmtNum(m.profitMargin) + "%"} />
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

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-head">How This Score Was Calculated</div>
            <p className="report-prose" style={{ fontSize: 12.5, marginBottom: 14 }}>
              The Investment Score is a weighted average of eight factors, each scored out of 10 and combined by
              its share of the total (shown as %). This is a deterministic calculation from your project's inputs —
              not a subjective rating.
            </p>
            <div className="report-score-breakdown">
              {m.scoreFactors.map((f) => (
                <div className="report-score-row" key={f.key}>
                  <span className="report-score-row-label">{f.label} <span style={{ color: "#999" }}>({Math.round(f.weight * 100)}%)</span></span>
                  <div className="report-score-bar-track"><div className="report-score-bar-fill" style={{ width: (f.score / 10) * 100 + "%" }} /></div>
                  <span className="report-score-row-val">{fmtNum(f.score, 1)}/10</span>
                </div>
              ))}
            </div>
            <div className="report-score-legend">
              <span style={{ background: m.overallScore < 3 ? "#C1272D" : "#D9D9D9", color: m.overallScore < 3 ? "#fff" : "#999" }}>1–2 Very Poor</span>
              <span style={{ background: m.overallScore >= 3 && m.overallScore < 5 ? "#C1272D" : "#D9D9D9", color: m.overallScore >= 3 && m.overallScore < 5 ? "#fff" : "#999" }}>3–4 Poor</span>
              <span style={{ background: m.overallScore >= 5 && m.overallScore < 7 ? "#C1272D" : "#D9D9D9", color: m.overallScore >= 5 && m.overallScore < 7 ? "#fff" : "#999" }}>5–6 Average</span>
              <span style={{ background: m.overallScore >= 7 && m.overallScore < 9 ? "#2E8B6F" : "#D9D9D9", color: m.overallScore >= 7 && m.overallScore < 9 ? "#fff" : "#999" }}>7–8 Good</span>
              <span style={{ background: m.overallScore >= 9 ? "#2E8B6F" : "#D9D9D9", color: m.overallScore >= 9 ? "#fff" : "#999" }}>9–10 Excellent</span>
            </div>
            <p className="report-prose" style={{ fontSize: 11.5, marginTop: 12, color: "#999" }}>
              This project scores {fmtNum(m.overallScore)}/10, placing it in the <b>{m.scoreLabel}</b> band above.
            </p>
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

        {/* About the Author — split across multiple sheets if the bio is long */}
        {(() => {
          const bioSheets = c?.author_bio ? splitBioIntoSheets(c.author_bio) : [];
          const hasAuthor = c?.author_name || bioSheets.length > 0 || c?.author_photo_storage_path;
          if (!hasAuthor) return null;
          const firstBio = bioSheets[0] || "";
          const restBio = bioSheets.slice(1);
          return (
            <>
              <div className="report-author">
                {c?.author_photo_storage_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={companyPublicUrl(c.author_photo_storage_path)} alt="" className="report-author-bg" />
                ) : null}
                <div className="report-author-overlay" />
                <div className="report-author-content">
                  <div className="report-author-text">
                    <div className="report-author-eyebrow"><span className="report-accent-dot" /> About the Author</div>
                    {c?.author_name && <div className="report-author-name">{c.author_name}</div>}
                    {firstBio && <p className="report-author-bio">{firstBio}</p>}
                  </div>
                  {c?.author_photo_storage_path && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={companyPublicUrl(c.author_photo_storage_path)} alt={c?.author_name || ""} className="report-author-photo" />
                  )}
                </div>
              </div>

              {restBio.map((chunk, i) => {
                const Graphic = BIO_GRAPHICS[i % BIO_GRAPHICS.length];
                const imageOnRight = i % 2 === 0;
                return (
                  <div className="report-author-sheet" key={i}>
                    {!imageOnRight && <div className="report-author-sheet-graphic"><Graphic /></div>}
                    <div className="report-author-sheet-text">
                      <p className="report-author-bio">{chunk}</p>
                    </div>
                    {imageOnRight && <div className="report-author-sheet-graphic"><Graphic /></div>}
                  </div>
                );
              })}
            </>
          );
        })()}

        {/* Closing: company contact + colophon */}
        <div className="report-final-cta">
          <span className="report-accent-dot" style={{ display: "block", margin: "0 auto 16px" }} />
          <h3>{companyName}</h3>
          <p>{c?.tagline || "Building trust, one project at a time."}</p>
          <div className="report-contact-grid" style={{ justifyContent: "center", textAlign: "center", color: "#C9C4B5", marginTop: 18 }}>
            {c?.established_year && <div>Established {c.established_year}</div>}
            {c?.completed_projects_count && <div>{c.completed_projects_count}+ Projects Completed</div>}
            {c?.phone && <div>{c.phone}</div>}
            {c?.email && <div>{c.email}</div>}
            {c?.website && <div>{c.website}</div>}
            {c?.address && <div>{c.address}</div>}
          </div>
        </div>

        <div className="report-colophon">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Build Master" className="report-colophon-logo" />
          <div className="report-colophon-name">Build Master</div>
          <div className="report-colophon-sub">Project Feasibility Intelligence · Report generated {today}</div>
        </div>
      </div>
    </div>
  );
}
