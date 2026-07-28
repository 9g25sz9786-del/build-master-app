"use client";

import React, { useReducer, useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, BarChart,
} from "recharts";
import {
  Building2, MapPin, Calculator, TrendingUp, Wallet, PiggyBank,
  BarChart3, Layers, AlertTriangle, CheckCircle2, ShieldAlert,
  ArrowRight, ArrowLeft, GitCompare, LayoutDashboard, ChevronRight,
  Building, Hotel, Landmark, SlidersHorizontal, Gauge, ScrollText, Trash2, LogOut, ArrowLeftCircle,
} from "lucide-react";
import {
  computeAll, buildRecommendation, fmtINR, fmtNum, fmtYears, clamp, ProjectState, Metrics,
} from "@/lib/engine";
import { saveProject, deleteProject, signOut } from "@/app/actions";

/* =========================================================================================
   FIELD DEFINITIONS
   ========================================================================================= */

const LAND_FIELDS: [string, string, string][] = [
  ["costPerCent", "Land Cost per Cent", "₹"],
  ["registrationPct", "Registration Charges", "%"],
  ["stampDutyPct", "Stamp Duty", "%"],
  ["legalCharges", "Legal Charges", "₹"],
  ["brokeragePct", "Brokerage", "%"],
  ["misc", "Miscellaneous Purchase Cost", "₹"],
];
const CONSTRUCTION_MAIN: [string, string, string][] = [
  ["builtUpArea", "Built-up Area", "sqft"],
  ["costPerSqft", "Construction Cost per Sqft", "₹"],
];
const CONSTRUCTION_FEES: [string, string, string][] = [
  ["architectPct", "Architect Fee", "%"],
  ["structuralPct", "Structural Consultant", "%"],
  ["mepPct", "MEP Consultant", "%"],
  ["interiorPct", "Interior Design", "%"],
];
const CONSTRUCTION_APPROVAL: [string, string, string][] = [
  ["permitFees", "Permit Fees", "₹"],
  ["govFees", "Government Fees", "₹"],
  ["utilityCharges", "Utility Connection Charges", "₹"],
];
const CONSTRUCTION_INFRA: [string, string, string][] = [
  ["electrical", "Electrical Infrastructure", "₹"], ["water", "Water Supply", "₹"], ["stp", "STP", "₹"],
  ["fireFighting", "Fire Fighting", "₹"], ["lift", "Lift Cost", "₹"], ["generator", "Generator", "₹"],
  ["solar", "Solar System", "₹"], ["security", "Security Systems", "₹"], ["cctv", "CCTV", "₹"],
  ["accessControl", "Access Control", "₹"], ["compoundWall", "Compound Wall", "₹"], ["paving", "Paving", "₹"],
  ["landscaping", "Landscaping", "₹"], ["externalDev", "External Development", "₹"],
];
const FINANCE_FIELDS: [string, string, string][] = [
  ["ownCapital", "Own Capital", "₹"], ["bankLoan", "Bank Loan", "₹"], ["interestRate", "Interest Rate", "%"],
  ["tenureYears", "Loan Tenure", "yrs"], ["moratoriumMonths", "Moratorium", "mo"],
  ["processingFeePct", "Processing Fee", "%"], ["workingCapital", "Working Capital", "₹"],
];
const FINANCE_ASSUMPTIONS: [string, string, string][] = [
  ["discountRatePct", "Discount Rate (NPV)", "%"], ["holdPeriodYears", "Hold Period (Exit Analysis)", "yrs"],
  ["annualEscalationPct", "Annual Revenue Escalation", "%"],
];
const HOSTEL_FIELDS: [string, string, string][] = [
  ["rooms", "Number of Rooms", ""], ["bedsPerRoom", "Beds per Room", ""], ["occupancyPct", "Occupancy", "%"],
  ["monthlyRentPerBed", "Monthly Rent per Bed", "₹"], ["laundry", "Laundry Income (mo)", "₹"],
  ["food", "Food Income (mo)", "₹"], ["parking", "Parking Income (mo)", "₹"], ["other", "Other Income (mo)", "₹"],
];
const APARTMENT_FIELDS: [string, string, string][] = [
  ["units", "Number of Apartments", ""], ["avgPrice", "Average Selling Price", "₹"],
];
const COMMERCIAL_FIELDS_SALE: [string, string, string][] = [
  ["sellableArea", "Total Sellable Area", "sqft"], ["pricePerSqft", "Price per Sqft", "₹"],
];
const COMMERCIAL_FIELDS_RENTAL: [string, string, string][] = [
  ["sellableArea", "Total Sellable Area", "sqft"], ["rentPerSqft", "Rent per Sqft (mo)", "₹"],
  ["occupancyPct", "Occupancy", "%"], ["escalationPct", "Lease Escalation", "%"],
];
const OPEX_MAIN: [string, string, string][] = [
  ["staffSalary", "Staff Salary (yr)", "₹"], ["maintenance", "Maintenance (yr)", "₹"], ["electricity", "Electricity (yr)", "₹"],
  ["water", "Water (yr)", "₹"], ["security", "Security (yr)", "₹"], ["housekeeping", "Housekeeping (yr)", "₹"],
  ["internet", "Internet (yr)", "₹"], ["marketing", "Marketing (yr)", "₹"], ["insurance", "Insurance (yr)", "₹"],
  ["propertyTax", "Property Tax (yr)", "₹"], ["repairs", "Repairs (yr)", "₹"], ["managementCost", "Management Cost (yr)", "₹"],
];
const OPEX_PCT: [string, string, string][] = [
  ["annualMaintenancePct", "Annual Maintenance", "%"], ["vacancyLossPct", "Vacancy Loss", "%"], ["badDebtPct", "Bad Debt", "%"],
];
const PROJECT_TYPES = [
  { id: "hostel", label: "Hostel", icon: Hotel },
  { id: "apartment", label: "Apartment Building", icon: Building },
  { id: "commercial", label: "Commercial Building", icon: Landmark },
];

function reducer(state: ProjectState, action: any): ProjectState {
  if (action.type === "SET") return { ...state, [action.section]: { ...(state as any)[action.section], [action.key]: action.value } };
  if (action.type === "SET_NESTED") return { ...state, revenue: { ...state.revenue, [action.sub]: { ...(state.revenue as any)[action.sub], [action.key]: action.value } } };
  return state;
}

/* =========================================================================================
   ATOMS
   ========================================================================================= */

function NumField({ label, suffix, value, onChange }: { label: string; suffix?: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="field-input-wrap">
        {suffix === "₹" && <span className="field-prefix">₹</span>}
        <input type="number" className="field-input" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))} style={{ paddingLeft: suffix === "₹" ? 28 : 12 }} />
        {suffix && suffix !== "₹" && <span className="field-suffix">{suffix}</span>}
      </div>
    </label>
  );
}
function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input type={type} className="field-input" style={{ paddingLeft: 12 }} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select className="field-input" style={{ paddingLeft: 12 }} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  );
}
function FieldGrid({ defs, section, sub, state, dispatch }: { defs: [string, string, string][]; section?: string; sub?: string; state: ProjectState; dispatch: any }) {
  return (
    <div className="field-grid">
      {defs.map(([key, label, suffix]) => (
        <NumField
          key={key} label={label} suffix={suffix}
          value={sub ? (state.revenue as any)[sub][key] : (state as any)[section!][key]}
          onChange={(v) => dispatch(sub ? { type: "SET_NESTED", sub, key, value: v } : { type: "SET", section, key, value: v })}
        />
      ))}
    </div>
  );
}
function StepHeader({ n, title, subtitle }: { n: number; title: string; subtitle?: string }) {
  return (
    <div className="step-header">
      <div className="step-stamp">{String(n).padStart(2, "0")}</div>
      <div>
        <h2 className="step-title">{title}</h2>
        {subtitle && <p className="step-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}
function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={"summary-row" + (strong ? " summary-row-strong" : "")}>
      <span>{label}</span><span className="mono">{value}</span>
    </div>
  );
}
function StatTile({ label, value, tone, icon: Icon }: { label: string; value: string; tone?: string; icon?: any }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-top">{Icon && <Icon size={15} strokeWidth={2} className="stat-icon" />}<span className="stat-label">{label}</span></div>
      <div className={"stat-value mono" + (tone ? " tone-" + tone : "")}>{value}</div>
    </div>
  );
}
const COLORS = ["#B8863B", "#3D6B8C", "#2E8B6F", "#B5482F", "#8A6DAA", "#5C7A99"];

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const pct = clamp(score, 0, 10) / 10;
  const angle = -90 + pct * 180;
  const r = 80, cx = 100, cy = 100;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const needleX = cx + r * 0.72 * Math.cos(rad(angle));
  const needleY = cy + r * 0.72 * Math.sin(rad(angle));
  const arcColor = score >= 7 ? "#2E8B6F" : score >= 5 ? "#B8863B" : "#B5482F";
  return (
    <div className="gauge-wrap">
      <svg viewBox="0 0 200 130" className="gauge-svg">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#E4DECC" strokeWidth="14" strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(rad(angle))} ${cy + r * Math.sin(rad(angle))}`} fill="none" stroke={arcColor} strokeWidth="14" strokeLinecap="round" />
        {[0, 2, 4, 6, 8, 10].map((t) => {
          const a = -90 + (t / 10) * 180;
          const x1 = cx + (r + 12) * Math.cos(rad(a)), y1 = cy + (r + 12) * Math.sin(rad(a));
          return <text key={t} x={x1} y={y1} textAnchor="middle" fontSize="9" fill="#7C7460" fontFamily="IBM Plex Mono, monospace">{t}</text>;
        })}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#0E1B2E" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill="#0E1B2E" />
      </svg>
      <div className="gauge-readout">
        <div className="gauge-score mono">{fmtNum(score)}<span className="gauge-max">/10</span></div>
        <div className="gauge-label">{label}</div>
      </div>
    </div>
  );
}

/* =========================================================================================
   DASHBOARD
   ========================================================================================= */

function Dashboard({ state, m, go }: { state: ProjectState; m: Metrics; go: (s: string, st?: number) => void }) {
  return (
    <div className="view">
      <div className="blueprint-hero">
        <div className="blueprint-grid" />
        <div className="hero-content">
          <div className="hero-eyebrow">BUILD MASTER · FEASIBILITY DASHBOARD</div>
          <h1 className="hero-title">{state.project.name || "Untitled Project"}</h1>
          <div className="hero-meta">
            <span><MapPin size={13} /> {state.project.location || "—"}</span>
            <span><Building2 size={13} /> {PROJECT_TYPES.find((t) => t.id === state.project.type)?.label}</span>
            <span><Layers size={13} /> {state.project.durationMonths || 0} month build</span>
          </div>
        </div>
      </div>
      <div className="stat-grid">
        <StatTile label="Total Investment" value={fmtINR(m.totalInvestment)} icon={Wallet} />
        <StatTile label="Annual Revenue" value={fmtINR(m.annualRevenue)} icon={TrendingUp} />
        <StatTile label="Annual ROI" value={fmtNum(m.roiPct) + "%"} tone={m.roiPct > 12 ? "good" : m.roiPct > 6 ? "mid" : "bad"} icon={Calculator} />
        <StatTile label="Break-even" value={fmtYears(m.breakEvenPeriod)} icon={Gauge} />
      </div>
      <div className="dash-cols">
        <div className="card">
          <div className="card-head">Investment Score</div>
          <ScoreGauge score={m.overallScore} label={m.scoreLabel} />
        </div>
        <div className="card">
          <div className="card-head">Risk & Loan Meters</div>
          <div className="meter-row">
            <span className="meter-label">Risk Level</span>
            <div className="meter-track"><div className={"meter-fill risk-" + m.riskLevel.toLowerCase()} style={{ width: m.riskLevel === "Low" ? "30%" : m.riskLevel === "Medium" ? "62%" : "92%" }} /></div>
            <span className={"meter-tag risk-" + m.riskLevel.toLowerCase()}>{m.riskLevel}</span>
          </div>
          <div className="meter-row">
            <span className="meter-label">Loan / Project Cost</span>
            <div className="meter-track"><div className="meter-fill loan-fill" style={{ width: clamp(m.loanToProjectCost, 0, 100) + "%" }} /></div>
            <span className="meter-tag mono">{fmtNum(m.loanToProjectCost, 0)}%</span>
          </div>
          <div className="meter-row">
            <span className="meter-label">Cash Flow (annual)</span>
            <div className="meter-track"><div className={"meter-fill " + (m.netProfit > 0 ? "cf-good" : "cf-bad")} style={{ width: clamp(Math.abs(m.roiPct) * 3, 4, 100) + "%" }} /></div>
            <span className="meter-tag mono">{fmtINR(m.netProfit)}</span>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-head">Quick Navigate</div>
        <div className="quicknav">
          <button className="quicknav-btn" onClick={() => go("build", 1)}><Calculator size={15} /> Edit Inputs</button>
          <button className="quicknav-btn" onClick={() => go("results")}><BarChart3 size={15} /> Results & Score</button>
          <button className="quicknav-btn" onClick={() => go("report")}><ScrollText size={15} /> AI Report</button>
          <button className="quicknav-btn" onClick={() => go("charts")}><BarChart3 size={15} /> Charts</button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
   WIZARD STEPS
   ========================================================================================= */

function StepProject({ state, dispatch }: { state: ProjectState; dispatch: any }) {
  return (
    <div className="view">
      <StepHeader n={1} title="Project Details" subtitle="Basic identity and scale of the development." />
      <div className="card">
        <div className="field-grid">
          <TextField label="Project Name" value={state.project.name} onChange={(v) => dispatch({ type: "SET", section: "project", key: "name", value: v })} />
          <TextField label="Location" value={state.project.location} onChange={(v) => dispatch({ type: "SET", section: "project", key: "location", value: v })} />
          <SelectField label="Project Type" value={state.project.type} options={PROJECT_TYPES} onChange={(v) => dispatch({ type: "SET", section: "project", key: "type", value: v })} />
          <TextField label="Developer Name" value={state.project.developerName} onChange={(v) => dispatch({ type: "SET", section: "project", key: "developerName", value: v })} />
          <NumField label="Land Area" value={state.project.landArea} onChange={(v) => dispatch({ type: "SET", section: "project", key: "landArea", value: v })} />
          <SelectField label="Land Unit" value={state.project.landUnit} options={[{ id: "cent", label: "Cent" }, { id: "sqft", label: "Square feet" }, { id: "sqm", label: "Square metre" }, { id: "acre", label: "Acre" }]} onChange={(v) => dispatch({ type: "SET", section: "project", key: "landUnit", value: v })} />
          <NumField label="Project Duration" suffix="mo" value={state.project.durationMonths} onChange={(v) => dispatch({ type: "SET", section: "project", key: "durationMonths", value: v })} />
          <TextField label="Expected Completion Date" type="date" value={state.project.completionDate} onChange={(v) => dispatch({ type: "SET", section: "project", key: "completionDate", value: v })} />
        </div>
      </div>
    </div>
  );
}
function StepLand({ state, dispatch, m }: { state: ProjectState; dispatch: any; m: Metrics }) {
  return (
    <div className="view">
      <StepHeader n={2} title="Land Cost" subtitle="Acquisition cost and statutory charges." />
      <div className="card"><FieldGrid defs={LAND_FIELDS} section="land" state={state} dispatch={dispatch} /></div>
      <div className="card">
        <div className="card-head">Auto-calculated</div>
        <SummaryRow label="Total Land Cost" value={fmtINR(m.totalLandCost)} />
        <SummaryRow label="Registration Charges" value={fmtINR(m.registration)} />
        <SummaryRow label="Stamp Duty" value={fmtINR(m.stampDuty)} />
        <SummaryRow label="Brokerage" value={fmtINR(m.brokerage)} />
        <SummaryRow label="Total Land Acquisition Cost" value={fmtINR(m.totalLandAcquisition)} strong />
      </div>
    </div>
  );
}
function StepConstruction({ state, dispatch, m }: { state: ProjectState; dispatch: any; m: Metrics }) {
  return (
    <div className="view">
      <StepHeader n={3} title="Construction Cost" subtitle="Build cost, professional fees, infrastructure & contingency." />
      <div className="card"><div className="card-head">Core Build</div><FieldGrid defs={CONSTRUCTION_MAIN} section="construction" state={state} dispatch={dispatch} /></div>
      <div className="card"><div className="card-head">Professional Fees (% of build cost)</div><FieldGrid defs={CONSTRUCTION_FEES} section="construction" state={state} dispatch={dispatch} /></div>
      <div className="card"><div className="card-head">Approvals & Government</div><FieldGrid defs={CONSTRUCTION_APPROVAL} section="construction" state={state} dispatch={dispatch} /></div>
      <div className="card"><div className="card-head">Infrastructure & Site Development</div><FieldGrid defs={CONSTRUCTION_INFRA} section="construction" state={state} dispatch={dispatch} /></div>
      <div className="card"><div className="field-grid"><NumField label="Contingency" suffix="%" value={state.construction.contingencyPct} onChange={(v) => dispatch({ type: "SET", section: "construction", key: "contingencyPct", value: v })} /></div></div>
      <div className="card">
        <div className="card-head">Auto-calculated</div>
        <SummaryRow label="Base Construction Cost" value={fmtINR(m.baseConstruction)} />
        <SummaryRow label="Professional Fees" value={fmtINR(m.professionalFees)} />
        <SummaryRow label="Government / Approval Cost" value={fmtINR(m.govApprovalCost)} />
        <SummaryRow label="Infrastructure Cost" value={fmtINR(m.infraCost)} />
        <SummaryRow label="Contingency" value={fmtINR(m.contingency)} />
        <SummaryRow label="Total Construction Cost" value={fmtINR(m.totalConstructionCost)} strong />
      </div>
    </div>
  );
}
function StepFinance({ state, dispatch, m }: { state: ProjectState; dispatch: any; m: Metrics }) {
  return (
    <div className="view">
      <StepHeader n={4} title="Finance" subtitle="Capital structure and lending terms." />
      <div className="card"><FieldGrid defs={FINANCE_FIELDS} section="finance" state={state} dispatch={dispatch} /></div>
      <div className="card"><div className="card-head">Modelling Assumptions</div><FieldGrid defs={FINANCE_ASSUMPTIONS} section="finance" state={state} dispatch={dispatch} /></div>
      <div className="card">
        <div className="card-head">Auto-calculated</div>
        <SummaryRow label="EMI (monthly)" value={fmtINR(m.emi)} />
        <SummaryRow label="Annual Debt Service" value={fmtINR(m.annualDebtService)} />
        <SummaryRow label="Total Interest over Tenure" value={fmtINR(m.totalInterestOverTenure)} />
        <SummaryRow label="Interest During Construction" value={fmtINR(m.interestDuringConstruction)} />
        <SummaryRow label="Total Project Cost" value={fmtINR(m.totalProjectCost)} strong />
      </div>
    </div>
  );
}
function StepRevenue({ state, dispatch, m }: { state: ProjectState; dispatch: any; m: Metrics }) {
  const type = state.project.type;
  return (
    <div className="view">
      <StepHeader n={5} title="Revenue Model" subtitle={`Logic adapts automatically for ${PROJECT_TYPES.find((t) => t.id === type)?.label}.`} />
      {type === "hostel" && <div className="card"><FieldGrid defs={HOSTEL_FIELDS} sub="hostel" state={state} dispatch={dispatch} /></div>}
      {type === "apartment" && <div className="card"><FieldGrid defs={APARTMENT_FIELDS} sub="apartment" state={state} dispatch={dispatch} /></div>}
      {type === "commercial" && (
        <div className="card">
          <div className="toggle-row">
            <span className="field-label">Revenue Model</span>
            <div className="toggle-group">
              <button className={"toggle-btn" + (state.revenue.commercial.model === "sale" ? " active" : "")} onClick={() => dispatch({ type: "SET_NESTED", sub: "commercial", key: "model", value: "sale" })}>Sale</button>
              <button className={"toggle-btn" + (state.revenue.commercial.model === "rental" ? " active" : "")} onClick={() => dispatch({ type: "SET_NESTED", sub: "commercial", key: "model", value: "rental" })}>Rental</button>
            </div>
          </div>
          <FieldGrid defs={state.revenue.commercial.model === "sale" ? COMMERCIAL_FIELDS_SALE : COMMERCIAL_FIELDS_RENTAL} sub="commercial" state={state} dispatch={dispatch} />
        </div>
      )}
      <div className="card">
        <div className="card-head">Auto-calculated</div>
        {m.revenueBreakdown.map((r) => (<SummaryRow key={r.name} label={r.name} value={fmtINR(r.value)} />))}
        {m.isSaleModel ? (
          <SummaryRow label="Total Sales Value" value={fmtINR(m.annualRevenue)} strong />
        ) : (
          <>
            <SummaryRow label="Monthly Revenue" value={fmtINR(m.monthlyRevenue)} />
            <SummaryRow label="Annual Revenue" value={fmtINR(m.annualRevenue)} strong />
          </>
        )}
      </div>
    </div>
  );
}
function StepOpex({ state, dispatch, m }: { state: ProjectState; dispatch: any; m: Metrics }) {
  return (
    <div className="view">
      <StepHeader n={6} title="Operating Expenses" subtitle="Recurring costs against rental / operating revenue." />
      <div className="card"><FieldGrid defs={OPEX_MAIN} section="opex" state={state} dispatch={dispatch} /></div>
      <div className="card"><div className="card-head">Revenue-linked Deductions</div><FieldGrid defs={OPEX_PCT} section="opex" state={state} dispatch={dispatch} /></div>
      <div className="card">
        <div className="card-head">Auto-calculated</div>
        <SummaryRow label="Fixed Operating Cost" value={fmtINR(m.fixedOpex)} />
        <SummaryRow label="Variable Deductions (maint./vacancy/bad debt)" value={fmtINR(m.variableOpex)} />
        <SummaryRow label="Total Operating Expense" value={fmtINR(m.totalOperatingExpense)} strong />
        {m.isSaleModel && <p className="note">Sale-model projects (one-time revenue) do not carry recurring operating expenses in this model.</p>}
      </div>
    </div>
  );
}

const STEPS = [
  { n: 1, title: "Project Details", Comp: StepProject },
  { n: 2, title: "Land Cost", Comp: StepLand },
  { n: 3, title: "Construction Cost", Comp: StepConstruction },
  { n: 4, title: "Finance", Comp: StepFinance },
  { n: 5, title: "Revenue Model", Comp: StepRevenue },
  { n: 6, title: "Operating Expenses", Comp: StepOpex },
];

function Wizard({ state, dispatch, m, step, setStep }: { state: ProjectState; dispatch: any; m: Metrics; step: number; setStep: (n: number) => void }) {
  const current = STEPS.find((s) => s.n === step) || STEPS[0];
  const Comp = current.Comp as any;
  return (
    <div className="view">
      <div className="wizard-tabs">
        {STEPS.map((s) => (
          <button key={s.n} className={"wizard-tab" + (s.n === step ? " active" : "")} onClick={() => setStep(s.n)}>
            <span className="wizard-tab-num">{s.n}</span>{s.title}
          </button>
        ))}
      </div>
      <Comp state={state} dispatch={dispatch} m={m} />
      <div className="wizard-nav">
        <button className="btn-ghost" disabled={step === 1} onClick={() => setStep(Math.max(1, step - 1))}><ArrowLeft size={15} /> Back</button>
        <button className="btn-primary" disabled={step === 6} onClick={() => setStep(Math.min(6, step + 1))}>Next <ArrowRight size={15} /></button>
      </div>
    </div>
  );
}

/* =========================================================================================
   RESULTS + SENSITIVITY
   ========================================================================================= */

function Results({ m, adj, setAdj, mAdj }: { m: Metrics; adj: { occDelta: number; costDelta: number }; setAdj: (a: any) => void; mAdj: Metrics }) {
  return (
    <div className="view">
      <StepHeader n={7} title="Results Dashboard" subtitle="Full investment metrics at current inputs." />
      <div className="card">
        <div className="card-head">Total Project Cost</div>
        <div className="metric-grid">
          <StatTile label="Land Cost" value={fmtINR(m.totalLandAcquisition)} />
          <StatTile label="Construction Cost" value={fmtINR(m.totalConstructionCost)} />
          <StatTile label="Finance Cost" value={fmtINR(m.financeCost)} />
          <StatTile label="Total Investment" value={fmtINR(m.totalInvestment)} tone="mid" />
        </div>
      </div>
      <div className="card">
        <div className="card-head">Revenue & Profitability</div>
        <div className="metric-grid">
          <StatTile label="Annual Revenue" value={fmtINR(m.annualRevenue)} />
          <StatTile label="NOI" value={fmtINR(m.NOI)} />
          <StatTile label="EBITDA" value={fmtINR(m.EBITDA)} />
          <StatTile label="Net Profit (annual)" value={fmtINR(m.netProfit)} tone={m.netProfit > 0 ? "good" : "bad"} />
        </div>
      </div>
      <div className="card">
        <div className="card-head">Investment Metrics</div>
        <div className="metric-grid">
          <StatTile label="ROI" value={fmtNum(m.roiPct) + "%"} tone={m.roiPct > 12 ? "good" : m.roiPct > 6 ? "mid" : "bad"} />
          <StatTile label="Return on Equity" value={fmtNum(m.returnOnEquity) + "%"} />
          <StatTile label="Loan / Equity" value={fmtNum(m.loanToEquity, 0) + "%"} />
          <StatTile label="Loan / Project Cost" value={fmtNum(m.loanToProjectCost, 0) + "%"} />
          <StatTile label="DSCR" value={fmtNum(m.dscr, 2) + "x"} tone={m.dscr >= 1.25 ? "good" : m.dscr >= 1 ? "mid" : "bad"} />
          <StatTile label="Profit Margin" value={fmtNum(m.profitMargin) + "%"} />
          <StatTile label="Operating Margin" value={fmtNum(m.operatingMargin) + "%"} />
          <StatTile label="Net Margin" value={fmtNum(m.netMargin) + "%"} />
        </div>
      </div>
      <div className="card">
        <div className="card-head">Investment Analysis</div>
        <div className="metric-grid">
          <StatTile label="Break-even Period" value={fmtYears(m.breakEvenPeriod)} />
          <StatTile label="Payback Period" value={fmtYears(m.paybackYears)} />
          <StatTile label="IRR" value={m.irr !== null ? fmtNum(m.irr * 100) + "%" : "n/a"} />
          <StatTile label="NPV" value={fmtINR(m.npv)} tone={m.npv > 0 ? "good" : "bad"} />
          <StatTile label="Cash-on-Cash Return" value={fmtNum(m.cashOnCashReturn) + "%"} />
          <StatTile label="Gross Yield" value={fmtNum(m.rentalYield) + "%"} />
          <StatTile label="Cap Rate" value={fmtNum(m.capRate) + "%"} />
          <StatTile label="Profit / Sqft" value={fmtINR(m.profitPerSqft)} />
        </div>
      </div>
      {(m.investmentPerBed || m.investmentPerRoom) && (
        <div className="card">
          <div className="card-head">Per-Unit Economics</div>
          <div className="metric-grid">
            {m.constructionCostPerBed && <StatTile label="Construction Cost / Bed" value={fmtINR(m.constructionCostPerBed)} />}
            {m.revenuePerBed && <StatTile label="Revenue / Bed" value={fmtINR(m.revenuePerBed)} />}
            <StatTile label="Revenue / Sqft" value={fmtINR(m.revenuePerSqft)} />
            {m.investmentPerRoom && <StatTile label="Investment / Room" value={fmtINR(m.investmentPerRoom)} />}
            {m.investmentPerBed && <StatTile label="Investment / Bed" value={fmtINR(m.investmentPerBed)} />}
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-head"><SlidersHorizontal size={14} /> Sensitivity — What-If Sliders</div>
        <p className="note" style={{ marginTop: 0 }}>Adjust occupancy and construction cost to see live recalculated metrics. Base inputs are untouched.</p>
        <div className="slider-row">
          <span className="field-label">Occupancy {adj.occDelta >= 0 ? "+" : ""}{adj.occDelta} pts</span>
          <input type="range" min="-20" max="20" value={adj.occDelta} onChange={(e) => setAdj({ ...adj, occDelta: parseInt(e.target.value) })} />
        </div>
        <div className="slider-row">
          <span className="field-label">Construction/Land Cost {adj.costDelta >= 0 ? "+" : ""}{adj.costDelta}%</span>
          <input type="range" min="-15" max="15" value={adj.costDelta} onChange={(e) => setAdj({ ...adj, costDelta: parseInt(e.target.value) })} />
        </div>
        <div className="scenario-btns">
          <button className="chip" onClick={() => setAdj({ occDelta: -15, costDelta: 10 })}>Worst Case</button>
          <button className="chip" onClick={() => setAdj({ occDelta: 0, costDelta: 0 })}>Expected Case</button>
          <button className="chip" onClick={() => setAdj({ occDelta: 10, costDelta: -5 })}>Best Case</button>
        </div>
        <div className="metric-grid" style={{ marginTop: 14 }}>
          <StatTile label="Adjusted ROI" value={fmtNum(mAdj.roiPct) + "%"} tone={mAdj.roiPct > 12 ? "good" : mAdj.roiPct > 6 ? "mid" : "bad"} />
          <StatTile label="Adjusted NOI" value={fmtINR(mAdj.NOI)} />
          <StatTile label="Adjusted DSCR" value={fmtNum(mAdj.dscr, 2) + "x"} tone={mAdj.dscr >= 1.25 ? "good" : mAdj.dscr >= 1 ? "mid" : "bad"} />
          <StatTile label="Adjusted Score" value={fmtNum(mAdj.overallScore) + "/10"} />
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
   REPORT
   ========================================================================================= */

function Report({ m, rec, state }: { m: Metrics; rec: ReturnType<typeof buildRecommendation>; state: ProjectState }) {
  return (
    <div className="view">
      <StepHeader n={8} title="Investment Score & AI Recommendation" subtitle="Deterministic, weighted evaluation across 8 factors." />
      <div className="card"><ScoreGauge score={m.overallScore} label={m.scoreLabel} /></div>
      <div className="card">
        <div className="card-head">Verdict</div>
        <p className="verdict-text">{rec.verdict}</p>
        <div className="verdict-grid">
          <div><span className="field-label">Suitable for Bank Loan?</span><p>{m.bankable}</p></div>
          <div><span className="field-label">Suitable for Investors?</span><p>{m.investorFit}</p></div>
          <div><span className="field-label">Risk Level</span><p className={"risk-pill risk-" + m.riskLevel.toLowerCase()}>{m.riskLevel}</p></div>
        </div>
      </div>
      <div className="report-cols">
        <div className="card"><div className="card-head"><CheckCircle2 size={14} /> Strengths</div><ul className="list-good">{rec.strengths.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
        <div className="card"><div className="card-head"><AlertTriangle size={14} /> Weaknesses</div><ul className="list-bad">{rec.weaknesses.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
      </div>
      <div className="card"><div className="card-head"><ShieldAlert size={14} /> Financial Risks</div><ul className="list-plain">{rec.risks.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
      <div className="card"><div className="card-head">Suggested Improvements</div><ul className="list-plain">{rec.improvements.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
      <div className="card">
        <div className="card-head">Prepared For</div>
        <SummaryRow label="Project" value={state.project.name} />
        <SummaryRow label="Developer" value={state.project.developerName} />
        <SummaryRow label="Location" value={state.project.location} />
        <SummaryRow label="Date" value={new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })} />
      </div>
    </div>
  );
}

/* =========================================================================================
   CHARTS
   ========================================================================================= */

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-head">{title}</div>
      <div style={{ width: "100%", height: 280 }}>{children}</div>
    </div>
  );
}

function Charts({ m, scenarios }: { m: Metrics; scenarios: { name: string; roi: number }[] }) {
  return (
    <div className="view">
      <StepHeader n={10} title="Charts" subtitle="Interactive visual breakdown of cost, revenue and cash flow." />
      <div className="chart-cols">
        <ChartCard title="Project Cost Breakdown">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={m.costBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                {m.costBreakdown.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => fmtINR(v)} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Inter" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Revenue Breakdown">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={m.revenueBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                {m.revenueBreakdown.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => fmtINR(v)} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Inter" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="chart-cols">
        <ChartCard title="Cash Flow, Profit Trend & Investment Recovery">
          <ResponsiveContainer>
            <ComposedChart data={m.cashFlowSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4DECC" />
              <XAxis dataKey="year" fontSize={11} />
              <YAxis fontSize={10} tickFormatter={(v: any) => fmtINR(v)} width={70} />
              <Tooltip formatter={(v: any) => fmtINR(v)} />
              <ReferenceLine y={0} stroke="#0E1B2E" />
              <Bar dataKey="cf" fill="#3D6B8C" name="Annual Cash Flow" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="cumulative" stroke="#B8863B" strokeWidth={2.5} dot={{ r: 3 }} name="Cumulative (Recovery)" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Loan Repayment (Outstanding Balance)">
          <ResponsiveContainer>
            <ComposedChart data={m.loanSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4DECC" />
              <XAxis dataKey="year" fontSize={11} />
              <YAxis fontSize={10} tickFormatter={(v: any) => fmtINR(v)} width={70} />
              <Tooltip formatter={(v: any) => fmtINR(v)} />
              <Line type="monotone" dataKey="balance" stroke="#B5482F" strokeWidth={2.5} dot={{ r: 2 }} name="Outstanding Balance" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <ChartCard title="ROI Comparison — Worst / Expected / Best">
        <ResponsiveContainer>
          <BarChart data={scenarios} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E4DECC" />
            <XAxis dataKey="name" fontSize={11} />
            <YAxis fontSize={10} tickFormatter={(v: any) => v + "%"} width={50} />
            <Tooltip formatter={(v: any) => fmtNum(v) + "%"} />
            <Bar dataKey="roi" radius={[4, 4, 0, 0]}>
              {scenarios.map((s, i) => <Cell key={i} fill={s.name === "Worst" ? "#B5482F" : s.name === "Best" ? "#2E8B6F" : "#B8863B"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

/* =========================================================================================
   MAIN WORKSPACE
   ========================================================================================= */

const NAV = [
  { key: "dashboard", label: "Overview", icon: LayoutDashboard },
  { key: "build", label: "Build Project", icon: Calculator },
  { key: "results", label: "Results", icon: BarChart3 },
  { key: "report", label: "AI Report", icon: ScrollText },
  { key: "charts", label: "Charts", icon: PiggyBank },
];

export default function Workspace({ project, userEmail }: { project: { id: string; name: string; project_type: string; data: ProjectState; updated_at: string }; userEmail: string }) {
  const [state, dispatch] = useReducer(reducer, project.data);
  const [section, setSection] = useState("dashboard");
  const [step, setStep] = useState(1);
  const [adj, setAdj] = useState({ occDelta: 0, costDelta: 0 });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const m = useMemo(() => computeAll(state), [state]);
  const mAdj = useMemo(() => computeAll(state, adj), [state, adj]);
  const rec = useMemo(() => buildRecommendation(m), [m]);
  const scenarios = useMemo(() => {
    const worst = computeAll(state, { occDelta: -15, costDelta: 10 });
    const best = computeAll(state, { occDelta: 10, costDelta: -5 });
    return [
      { name: "Worst", roi: Math.round(worst.roiPct * 10) / 10 },
      { name: "Expected", roi: Math.round(m.roiPct * 10) / 10 },
      { name: "Best", roi: Math.round(best.roiPct * 10) / 10 },
    ];
  }, [state, m]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await saveProject(project.id, state.project.name || "Untitled Project", state.project.type, state);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 900);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function go(sec: string, st?: number) {
    setSection(sec);
    if (st) setStep(st);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${state.project.name}"? This cannot be undone.`)) return;
    await deleteProject(project.id);
  }

  return (
    <div className="app-root">
      <aside className="sidebar">
        <Link href="/projects" className="nav-btn" style={{ marginBottom: 10 }}>
          <ArrowLeftCircle size={16} /> All Projects
        </Link>
        <div className="sidebar-brand">
          <Image src="/logo.png" alt="Build Master" width={30} height={30} className="brand-logo" />
          <div><div className="brand-name">Build Master</div><div className="brand-sub">Project Feasibility App</div></div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((n) => (
            <button key={n.key} className={"nav-btn" + (section === n.key ? " active" : "")} onClick={() => go(n.key)}>
              <n.icon size={16} strokeWidth={2} /> {n.label}
              {section === n.key && <ChevronRight size={14} className="nav-chevron" />}
            </button>
          ))}
          <Link href="/compare" className="nav-btn"><GitCompare size={16} strokeWidth={2} /> Compare</Link>
        </nav>
        <div className="sidebar-footer">
          <div className="footer-score"><span>Score</span><span className="mono footer-score-val">{fmtNum(m.overallScore)}</span></div>
          <div className="footer-user">{userEmail}</div>
          <form action={signOut}><button type="submit" className="footer-signout"><LogOut size={12} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />Sign out</button></form>
          <div className="footer-brand" style={{ marginTop: 10 }}>Maharaja Engineers & Contractors</div>
        </div>
      </aside>

      <main className="main-canvas">
        <div className="topbar">
          <div className="topbar-left">
            <input className="topbar-title-input" value={state.project.name} onChange={(e) => dispatch({ type: "SET", section: "project", key: "name", value: e.target.value })} />
            <span className={"save-badge " + saveStatus}>
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Save failed" : ""}
            </span>
          </div>
          <button className="btn-danger" onClick={handleDelete}><Trash2 size={14} /> Delete Project</button>
        </div>

        {section === "dashboard" && <Dashboard state={state} m={m} go={go} />}
        {section === "build" && <Wizard state={state} dispatch={dispatch} m={m} step={step} setStep={setStep} />}
        {section === "results" && <Results m={m} adj={adj} setAdj={setAdj} mAdj={mAdj} />}
        {section === "report" && <Report m={m} rec={rec} state={state} />}
        {section === "charts" && <Charts m={m} scenarios={scenarios} />}
      </main>
    </div>
  );
}
