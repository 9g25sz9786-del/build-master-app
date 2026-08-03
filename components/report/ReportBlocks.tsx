import { fmtINR, fmtNum, fmtYears, ProjectState, Metrics } from "@/lib/engine";
import { CompanyProfile, ProjectMedia, ProjectIntroSection, ProjectLocation, ReportBlockType } from "@/lib/types";
import ReportCharts from "@/components/ReportCharts";

export const PROJECT_TYPE_LABEL: Record<string, string> = {
  hostel: "Hostel", apartment: "Apartment Building", commercial: "Commercial Building",
};

export const METRIC_DESC: Record<string, string> = {
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

export function MetricStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className="stat-value mono">{value}</div>
      {METRIC_DESC[label] && <div className="stat-desc">{METRIC_DESC[label]}</div>}
    </div>
  );
}

export function ScoreGaugeStatic({ score }: { score: number }) {
  const pct = Math.min(10, Math.max(0, score)) / 10;
  const angle = 180 + pct * 180;
  const r = 70, cx = 90, cy = 90;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const arcColor = score >= 7 ? "#2E8B6F" : "#C1272D";
  return (
    <svg viewBox="0 0 180 110" style={{ width: 200 }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#ECECEC" strokeWidth="12" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(rad(angle))} ${cy + r * Math.sin(rad(angle))}`} fill="none" stroke={arcColor} strokeWidth="12" strokeLinecap="round" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="26" fontWeight="700" fontFamily="IBM Plex Mono, monospace" fill="#141414">{fmtNum(score)}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="#6E6E6E">out of 10</text>
    </svg>
  );
}

export function CoverPlaceholder() {
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

export function TopicPlaceholder() {
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

/** Everything a block renderer might need. Built once per report, passed to every block. */
export interface ReportBlockData {
  project: { id: string; name: string; project_type: string };
  state: ProjectState;
  m: Omit<Metrics, "loanBalanceAfterYears">;
  rec: { verdict: string; strengths: string[]; weaknesses: string[]; risks: string[]; improvements: string[] };
  c: CompanyProfile | null;
  companyName: string;
  today: string;
  introSections: ProjectIntroSection[];
  projectLocation: ProjectLocation | null;
  locationPhotos: ProjectMedia[];
  mapPhotos: ProjectMedia[];
  renders: ProjectMedia[];
  plans: ProjectMedia[];
  sitePhotos: ProjectMedia[];
  coverImage: ProjectMedia | undefined;
  roomCountLabel: string | null;
  roomCountValue: number | null;
  publicUrl: (path: string) => string;
  companyPublicUrl: (path: string) => string;
}

export function CoverBlock({ data }: { data: ReportBlockData }) {
  const { project, state, m, c, companyName, today, coverImage, publicUrl, companyPublicUrl } = data;
  return (
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
  );
}

export function TocBlock({ data, toc }: { data: ReportBlockData; toc: { n: string; label: string }[] }) {
  return (
    <div className="report-toc">
      <div className="report-toc-title">Contents</div>
      <div className="report-toc-list">
        {toc.map((t) => (
          <div className="report-toc-item" key={t.n}>
            <span className="report-toc-num">{t.n}</span>
            <span className="report-toc-label">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IntroTopicBlock({ data, sectionId }: { data: ReportBlockData; sectionId: string }) {
  const s = data.introSections.find((x) => x.id === sectionId);
  if (!s) return <p className="report-prose">Intro section not found — it may have been deleted.</p>;
  return (
    <div className="report-topic">
      <div className="report-topic-heading-row">
        <span className="report-accent-dot" />
        <h3 className="report-topic-title">{s.title}</h3>
      </div>
      <div className="report-topic-rule" />
      <div className="report-topic-hero">
        {s.photos && s.photos.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.publicUrl(s.photos[0].storage_path)} alt="" />
        ) : (
          <TopicPlaceholder />
        )}
      </div>
      {s.photos && s.photos.length > 1 && (
        <div className="report-topic-grid">
          {s.photos.slice(1).map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.storage_path} src={data.publicUrl(p.storage_path)} alt="" />
          ))}
        </div>
      )}
      <p className="report-prose">{s.body}</p>
    </div>
  );
}

export function LocationBlock({ data }: { data: ReportBlockData }) {
  const { projectLocation, locationPhotos, mapPhotos, publicUrl } = data;
  return (
    <div>
      <h2 className="report-section-title">Location</h2>
      {projectLocation?.description && (
        <p className="report-prose" style={{ marginBottom: 20 }}>{projectLocation.description}</p>
      )}
      {locationPhotos.length > 0 && (
        <>
          <h3 style={{ fontFamily: "Poppins,sans-serif", fontSize: 15, marginBottom: 4 }}>Pictures of the Place</h3>
          <div className="report-media-grid">
            {locationPhotos.map((p) => (
              <div className="report-media-card" key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={publicUrl(p.storage_path)} alt={p.title} />
              </div>
            ))}
          </div>
        </>
      )}
      {(projectLocation?.latitude != null || mapPhotos.length > 0) && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-head">Google Map</div>
          {projectLocation?.latitude != null && projectLocation?.longitude != null && (
            <p className="report-prose" style={{ fontSize: 13, marginBottom: mapPhotos.length > 0 ? 14 : 0 }}>
              Coordinates: <span className="mono">{projectLocation.latitude}, {projectLocation.longitude}</span>
            </p>
          )}
          {mapPhotos.length > 0 && (
            <div className="report-media-grid">
              {mapPhotos.map((p) => (
                <div className="report-media-card" key={p.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={publicUrl(p.storage_path)} alt="Map" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {projectLocation?.distances && projectLocation.distances.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-head">Distance to Key Places</div>
          <div className="report-distance-list">
            {projectLocation.distances.map((d, i) => (
              <div className="report-distance-row" key={i}>
                <span>{d.place || "—"}</span>
                <span className="mono">{d.distance || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function FeasibilityBasicsBlock({ data }: { data: ReportBlockData }) {
  const { state, m, roomCountLabel, roomCountValue } = data;
  return (
    <div>
      <h2 className="report-section-title">Project Feasibility Analysis</h2>
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
        <div className="card-head">Land Acquisition</div>
        <div className="metric-grid">
          <div className="stat-tile"><div className="stat-label">Land Area</div><div className="stat-value mono">{state.project.landArea} {state.project.landUnit}</div></div>
          <div className="stat-tile"><div className="stat-label">Cost per Cent</div><div className="stat-value mono">{fmtINR(state.land.costPerCent)}</div></div>
        </div>
        <div className="report-charge-list" style={{ marginTop: 16 }}>
          <div className="report-charge-row"><span>Base Land Cost</span><span className="mono">{fmtINR(m.totalLandCost)}</span></div>
          <div className="report-charge-row"><span>Registration Charges ({fmtNum(state.land.registrationPct, 1)}%)</span><span className="mono">{fmtINR(m.registration)}</span></div>
          <div className="report-charge-row"><span>Stamp Duty ({fmtNum(state.land.stampDutyPct, 1)}%)</span><span className="mono">{fmtINR(m.stampDuty)}</span></div>
          <div className="report-charge-row"><span>Brokerage ({fmtNum(state.land.brokeragePct, 1)}%)</span><span className="mono">{fmtINR(m.brokerage)}</span></div>
          <div className="report-charge-row"><span>Legal Charges</span><span className="mono">{fmtINR(state.land.legalCharges)}</span></div>
          <div className="report-charge-row"><span>Miscellaneous</span><span className="mono">{fmtINR(state.land.misc)}</span></div>
          <div className="report-charge-row report-charge-total"><span>Total Land Acquisition Cost</span><span className="mono">{fmtINR(m.totalLandAcquisition)}</span></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">Building & Construction</div>
        <div className="metric-grid">
          <div className="stat-tile"><div className="stat-label">Built-up Area</div><div className="stat-value mono">{fmtNum(m.builtUpArea, 0)} sqft</div></div>
          <div className="stat-tile"><div className="stat-label">Construction Cost / Sqft</div><div className="stat-value mono">{fmtINR(state.construction.costPerSqft)}</div></div>
          {roomCountLabel && roomCountValue != null && (
            <div className="stat-tile"><div className="stat-label">{roomCountLabel}</div><div className="stat-value mono">{roomCountValue}</div></div>
          )}
        </div>
        <div className="report-charge-list" style={{ marginTop: 16 }}>
          <div className="report-charge-row"><span>Base Construction Cost</span><span className="mono">{fmtINR(m.baseConstruction)}</span></div>
          <div className="report-charge-row"><span>Professional Fees (Architect, Structural, MEP, Interior)</span><span className="mono">{fmtINR(m.professionalFees)}</span></div>
          <div className="report-charge-row"><span>Government & Approval Fees</span><span className="mono">{fmtINR(m.govApprovalCost)}</span></div>
          <div className="report-charge-row"><span>Infrastructure (Electrical, Water, Lift, Security, etc.)</span><span className="mono">{fmtINR(m.infraCost)}</span></div>
          <div className="report-charge-row"><span>Contingency</span><span className="mono">{fmtINR(m.contingency)}</span></div>
          <div className="report-charge-row report-charge-total"><span>Total Construction Cost</span><span className="mono">{fmtINR(m.totalConstructionCost)}</span></div>
        </div>
      </div>

      {state.project.amenities && state.project.amenities.length > 0 && (
        <div className="card">
          <div className="card-head">Amenities</div>
          <div className="report-amenity-list">
            {state.project.amenities.map((a, i) => (
              <span className="report-amenity-chip" key={i}>{a}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function FeasibilityFinancialsBlock({ data }: { data: ReportBlockData }) {
  const { m } = data;
  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">Cost, Revenue & Profitability</div>
        <div className="metric-grid">
          <MetricStat label="Total Investment" value={fmtINR(m.totalInvestment)} />
          <MetricStat label="Annual Revenue" value={fmtINR(m.annualRevenue)} />
          <MetricStat label="NOI" value={fmtINR(m.NOI)} />
          <MetricStat label="Net Profit" value={fmtINR(m.netProfit)} />
        </div>
      </div>
      <div className="card">
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
    </div>
  );
}

export function FeasibilityChartsScoreBlock({ data }: { data: ReportBlockData }) {
  const { m } = data;
  return (
    <div>
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
    </div>
  );
}

export function MediaItemBlock({ data, mediaId }: { data: ReportBlockData; mediaId: string }) {
  const all = [...data.renders, ...data.plans, ...data.sitePhotos];
  const r = all.find((x) => x.id === mediaId);
  if (!r) return <p className="report-prose">Photo not found — it may have been deleted.</p>;
  return (
    <div className="report-media-card" style={{ height: "100%" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={data.publicUrl(r.storage_path)} alt={r.title} style={{ height: "calc(100% - 40px)" }} />
      <div className="report-media-title">{r.title}</div>
      {r.caption && <div className="report-media-caption">{r.caption}</div>}
    </div>
  );
}

export function ConclusionBlock({ data }: { data: ReportBlockData }) {
  const { rec } = data;
  return (
    <div>
      <h2 className="report-section-title">Conclusion & Recommendation</h2>
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
    </div>
  );
}

export function AuthorBlock({ data }: { data: ReportBlockData }) {
  const { c, companyPublicUrl } = data;
  if (!(c?.author_name || c?.author_bio || c?.author_photo_storage_path)) return null;
  return (
    <div className="report-author" style={{ position: "relative", height: "100%" }}>
      {(c?.author_background_photo_storage_path || c?.author_photo_storage_path) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={companyPublicUrl(c.author_background_photo_storage_path || c.author_photo_storage_path!)}
          alt=""
          className="report-author-bg"
        />
      ) : null}
      <div className="report-author-overlay" />
      <div className="report-author-content">
        <div className="report-author-text">
          <div className="report-author-eyebrow"><span className="report-accent-dot" /> About the Author</div>
          {c?.author_name && <div className="report-author-name">{c.author_name}</div>}
          {c?.author_bio && <p className="report-author-bio">{c.author_bio}</p>}
        </div>
        {c?.author_photo_storage_path && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={companyPublicUrl(c.author_photo_storage_path)} alt={c?.author_name || ""} className="report-author-photo" />
        )}
      </div>
    </div>
  );
}

export function ClosingBlock({ data }: { data: ReportBlockData }) {
  const { c, companyName, today } = data;
  return (
    <div>
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
  );
}

/** Single dispatcher used by both the canvas editor's live preview and the final locked-layout render. */
export function renderBlockBody(
  blockType: ReportBlockType,
  contentRef: Record<string, any>,
  data: ReportBlockData,
  toc?: { n: string; label: string }[]
) {
  switch (blockType) {
    case "cover": return <CoverBlock data={data} />;
    case "toc": return <TocBlock data={data} toc={toc || []} />;
    case "intro_topic": return <IntroTopicBlock data={data} sectionId={contentRef.sectionId} />;
    case "location_description":
    case "location_photos":
    case "location_map":
    case "location_distances": return <LocationBlock data={data} />;
    case "feasibility_project_details":
    case "feasibility_land":
    case "feasibility_construction":
    case "feasibility_amenities": return <FeasibilityBasicsBlock data={data} />;
    case "feasibility_cost_revenue":
    case "feasibility_investment_metrics": return <FeasibilityFinancialsBlock data={data} />;
    case "feasibility_score": return <FeasibilityChartsScoreBlock data={data} />;
    case "media_item": return <MediaItemBlock data={data} mediaId={contentRef.mediaId} />;
    case "conclusion": return <ConclusionBlock data={data} />;
    case "author": return <AuthorBlock data={data} />;
    case "closing": return <ClosingBlock data={data} />;
    default: return <p className="report-prose">Unknown block type: {blockType}</p>;
  }
}
