// ===================== Commercial Project Feasibility — Calculation Engine =====================
// Pure functions. Same engine runs client-side (live sliders) and server-side (Compare page, reports).

export type ProjectType = "hostel" | "apartment" | "commercial";

export interface ProjectState {
  project: {
    name: string; location: string; type: ProjectType; landArea: number; landUnit: string;
    durationMonths: number; completionDate: string; developerName: string; amenities: string[];
  };
  land: { costPerCent: number; registrationPct: number; stampDutyPct: number; legalCharges: number; brokeragePct: number; misc: number };
  construction: Record<string, number>;
  finance: {
    ownCapital: number; bankLoan: number; interestRate: number; tenureYears: number; moratoriumMonths: number;
    processingFeePct: number; workingCapital: number; discountRatePct: number; holdPeriodYears: number; annualEscalationPct: number;
  };
  revenue: {
    hostel: { rooms: number; bedsPerRoom: number; occupancyPct: number; monthlyRentPerBed: number; laundry: number; food: number; parking: number; other: number };
    apartment: { units: number; avgPrice: number };
    commercial: { model: "sale" | "rental"; sellableArea: number; pricePerSqft: number; rentPerSqft: number; occupancyPct: number; escalationPct: number };
  };
  opex: Record<string, number>;
}

export interface Adjustment { occDelta: number; costDelta: number }

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function fmtINR(n: number | null | undefined) {
  if (n === null || n === undefined || isNaN(n) || !isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
export function fmtNum(n: number | null | undefined, d = 1) {
  if (n === null || n === undefined || !isFinite(n)) return "—";
  return n.toFixed(d);
}
export function fmtYears(n: number | null | undefined) {
  if (n === null || n === undefined || !isFinite(n) || n < 0) return "—";
  return `${n.toFixed(1)} yrs`;
}

function mapRange(value: number, points: [number, number][]) {
  if (value <= points[0][0]) return points[0][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [t0, s0] = points[i];
    const [t1, s1] = points[i + 1];
    if (value <= t1) {
      const frac = (value - t0) / (t1 - t0 || 1);
      return s0 + frac * (s1 - s0);
    }
  }
  return points[points.length - 1][1];
}

function npvAt(rate: number, flows: { year: number; cf: number }[]) {
  return flows.reduce((s, f) => s + f.cf / Math.pow(1 + rate, f.year), 0);
}
function solveIRR(flows: { year: number; cf: number }[]) {
  let lo = -0.9, hi = 5;
  let nLo = npvAt(lo, flows), nHi = npvAt(hi, flows);
  if (isNaN(nLo) || isNaN(nHi)) return null;
  if (nLo * nHi > 0) {
    hi = 20;
    nHi = npvAt(hi, flows);
    if (nLo * nHi > 0) return null;
  }
  let mid = (lo + hi) / 2;
  for (let i = 0; i < 100; i++) {
    mid = (lo + hi) / 2;
    const nMid = npvAt(mid, flows);
    if (Math.abs(nMid) < 1) break;
    if (nLo * nMid < 0) { hi = mid; nHi = nMid; } else { lo = mid; nLo = nMid; }
  }
  return mid;
}

const UNIT_TO_SQFT: Record<string, number> = { sqft: 1, cent: 435.6, acre: 43560, sqm: 10.7639 };
export const FIXED_OPEX_KEYS = ["staffSalary","maintenance","electricity","water","security","housekeeping","internet","marketing","insurance","propertyTax","repairs","managementCost"];
const INFRA_KEYS = ["electrical","water","stp","fireFighting","lift","generator","solar","security","cctv","accessControl","compoundWall","paving","landscaping","externalDev"];

export function computeAll(s: ProjectState, adj: Adjustment = { occDelta: 0, costDelta: 0 }) {
  const { project, land, construction: c, finance: f, revenue, opex } = s;
  const type = project.type;

  const landAreaSqft = (parseFloat(String(project.landArea)) || 0) * (UNIT_TO_SQFT[project.landUnit] || 1);
  const cents = landAreaSqft / 435.6;

  const totalLandCost = cents * (land.costPerCent || 0);
  const registration = (totalLandCost * (land.registrationPct || 0)) / 100;
  const stampDuty = (totalLandCost * (land.stampDutyPct || 0)) / 100;
  const brokerage = (totalLandCost * (land.brokeragePct || 0)) / 100;
  let totalLandAcquisition = totalLandCost + registration + stampDuty + (land.legalCharges || 0) + brokerage + (land.misc || 0);

  const baseConstruction = (c.builtUpArea || 0) * (c.costPerSqft || 0);
  const professionalFeesPct = (c.architectPct || 0) + (c.structuralPct || 0) + (c.mepPct || 0) + (c.interiorPct || 0);
  const professionalFees = (baseConstruction * professionalFeesPct) / 100;
  const govApprovalCost = (c.permitFees || 0) + (c.govFees || 0) + (c.utilityCharges || 0);
  const infraCost = INFRA_KEYS.reduce((sum, k) => sum + (c[k] || 0), 0);
  const preContingency = baseConstruction + professionalFees + govApprovalCost + infraCost;
  const contingency = (preContingency * (c.contingencyPct || 0)) / 100;
  let totalConstructionCost = preContingency + contingency;

  totalLandAcquisition *= 1 + adj.costDelta / 100;
  totalConstructionCost *= 1 + adj.costDelta / 100;

  const durationYears = (project.durationMonths || 0) / 12;
  const interestDuringConstruction = (((f.bankLoan || 0) * (f.interestRate || 0)) / 100) * durationYears * 0.5;
  const processingFee = ((f.bankLoan || 0) * (f.processingFeePct || 0)) / 100;
  const financeCost = interestDuringConstruction + processingFee;
  const totalProjectCost = totalLandAcquisition + totalConstructionCost + financeCost + (f.workingCapital || 0);

  const P = f.bankLoan || 0;
  const rMonthly = (f.interestRate || 0) / 12 / 100;
  const n = (f.tenureYears || 0) * 12;
  let emi = 0;
  if (P > 0 && n > 0) {
    emi = rMonthly > 0 ? (P * rMonthly * Math.pow(1 + rMonthly, n)) / (Math.pow(1 + rMonthly, n) - 1) : P / n;
  }
  const totalInterestOverTenure = emi * n - P;
  const annualDebtService = emi * 12;

  function loanBalanceAfterYears(years: number) {
    const k = Math.min(Math.max(years, 0) * 12, n);
    if (P <= 0 || n <= 0) return 0;
    if (rMonthly > 0) return (P * (Math.pow(1 + rMonthly, n) - Math.pow(1 + rMonthly, k))) / (Math.pow(1 + rMonthly, n) - 1);
    return P * (1 - k / n);
  }

  let annualRevenue = 0, monthlyRevenue = 0, isSaleModel = false, totalBeds = 0, rooms = 0;
  let revenueBreakdown: { name: string; value: number }[] = [];

  if (type === "hostel") {
    const h = revenue.hostel;
    rooms = h.rooms || 0;
    totalBeds = rooms * (h.bedsPerRoom || 0);
    const occ = clamp((h.occupancyPct || 0) + adj.occDelta, 0, 100);
    const effectiveBeds = totalBeds * (occ / 100);
    const roomRevenueMonthly = effectiveBeds * (h.monthlyRentPerBed || 0);
    monthlyRevenue = roomRevenueMonthly + (h.laundry || 0) + (h.food || 0) + (h.parking || 0) + (h.other || 0);
    annualRevenue = monthlyRevenue * 12;
    revenueBreakdown = [
      { name: "Room Rent", value: roomRevenueMonthly * 12 },
      { name: "Laundry", value: (h.laundry || 0) * 12 },
      { name: "Food", value: (h.food || 0) * 12 },
      { name: "Parking", value: (h.parking || 0) * 12 },
      { name: "Other", value: (h.other || 0) * 12 },
    ].filter((x) => x.value > 0);
  } else if (type === "apartment") {
    isSaleModel = true;
    const a = revenue.apartment;
    const totalSalesValue = (a.units || 0) * (a.avgPrice || 0);
    annualRevenue = totalSalesValue;
    monthlyRevenue = totalSalesValue / (project.durationMonths || 1);
    revenueBreakdown = [{ name: "Unit Sales", value: totalSalesValue }];
  } else {
    const cm = revenue.commercial;
    if (cm.model === "sale") {
      isSaleModel = true;
      const totalSalesRevenue = (cm.sellableArea || 0) * (cm.pricePerSqft || 0);
      annualRevenue = totalSalesRevenue;
      monthlyRevenue = totalSalesRevenue / (project.durationMonths || 1);
      revenueBreakdown = [{ name: "Space Sales", value: totalSalesRevenue }];
    } else {
      const occ = clamp((cm.occupancyPct || 0) + adj.occDelta, 0, 100);
      annualRevenue = (cm.sellableArea || 0) * (cm.rentPerSqft || 0) * 12 * (occ / 100);
      monthlyRevenue = annualRevenue / 12;
      revenueBreakdown = [{ name: "Rental Income", value: annualRevenue }];
    }
  }

  const fixedOpex = FIXED_OPEX_KEYS.reduce((sum, k) => sum + (opex[k] || 0), 0);
  const variableOpexPct = (opex.annualMaintenancePct || 0) + (opex.vacancyLossPct || 0) + (opex.badDebtPct || 0);
  const variableOpex = isSaleModel ? 0 : (annualRevenue * variableOpexPct) / 100;
  const totalOperatingExpense = isSaleModel ? 0 : fixedOpex + variableOpex;

  const NOI = isSaleModel ? annualRevenue - totalProjectCost : annualRevenue - totalOperatingExpense;
  const EBITDA = NOI;
  const netProfit = isSaleModel ? NOI : NOI - annualDebtService;
  const grossProfit = isSaleModel ? NOI : annualRevenue - totalOperatingExpense;

  const totalInvestment = totalProjectCost;
  const roiPct = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  const returnOnEquity = (f.ownCapital || 0) > 0 ? (netProfit / f.ownCapital) * 100 : 0;
  const loanToEquity = (f.ownCapital || 0) > 0 ? ((f.bankLoan || 0) / f.ownCapital) * 100 : 0;
  const loanToProjectCost = totalInvestment > 0 ? ((f.bankLoan || 0) / totalInvestment) * 100 : 0;
  const hasLoan = (f.bankLoan || 0) > 0;
  const dscr = !hasLoan ? Infinity : annualDebtService > 0 ? NOI / annualDebtService : 0;
  const profitMargin = annualRevenue > 0 ? (netProfit / annualRevenue) * 100 : 0;
  const operatingMargin = annualRevenue > 0 ? (NOI / annualRevenue) * 100 : 0;
  const netMargin = profitMargin;
  const builtUpArea = c.builtUpArea || 0;

  const paybackYears = isSaleModel ? durationYears : netProfit > 0 ? totalInvestment / netProfit : Infinity;
  const breakEvenPeriod = isSaleModel ? durationYears : NOI > 0 ? totalInvestment / NOI : Infinity;
  const rentalYield = totalInvestment > 0 ? (annualRevenue / totalInvestment) * 100 : 0;
  const capRate = totalInvestment > 0 ? (NOI / totalInvestment) * 100 : 0;
  const profitPerSqft = builtUpArea > 0 ? netProfit / builtUpArea : 0;
  const constructionCostPerBed = totalBeds > 0 ? totalConstructionCost / totalBeds : null;
  const revenuePerBed = totalBeds > 0 ? annualRevenue / totalBeds : null;
  const revenuePerSqft = builtUpArea > 0 ? annualRevenue / builtUpArea : 0;
  const investmentPerRoom = rooms > 0 ? totalInvestment / rooms : null;
  const investmentPerBed = totalBeds > 0 ? totalInvestment / totalBeds : null;

  const holdYears = Math.max(1, Math.round(f.holdPeriodYears || 10));
  const escalation = (f.annualEscalationPct || 0) / 100;
  const discountRate = (f.discountRatePct || 12) / 100;
  const tenureYears = f.tenureYears || 0;

  let cashFlows: { year: number; cf: number }[] = [];
  let exitValue = 0;
  if (isSaleModel) {
    const saleYear = Math.max(1, Math.round(durationYears));
    cashFlows.push({ year: 0, cf: -(f.ownCapital || 0) });
    for (let y = 1; y < saleYear; y++) cashFlows.push({ year: y, cf: 0 });
    const netProceeds = annualRevenue - (f.bankLoan || 0);
    cashFlows.push({ year: saleYear, cf: netProceeds });
    exitValue = netProceeds;
  } else {
    cashFlows.push({ year: 0, cf: -(f.ownCapital || 0) });
    for (let y = 1; y <= holdYears; y++) {
      const escNOI = NOI * Math.pow(1 + escalation, y - 1);
      const ds = y <= tenureYears ? annualDebtService : 0;
      let cf = escNOI - ds;
      if (y === holdYears) {
        const exitCapRate = Math.max(capRate / 100, 0.04);
        const saleProceeds = escNOI / exitCapRate;
        const remainingLoan = loanBalanceAfterYears(holdYears);
        exitValue = saleProceeds - remainingLoan;
        cf += exitValue;
      }
      cashFlows.push({ year: y, cf });
    }
  }
  const irr = solveIRR(cashFlows);
  const npv = cashFlows.reduce((sum, f2) => sum + f2.cf / Math.pow(1 + discountRate, f2.year), 0);
  const cashOnCashReturn = returnOnEquity;

  let cum = 0;
  const cashFlowSeries = cashFlows.map((f2) => {
    cum += f2.cf;
    return { year: `Y${f2.year}`, cf: f2.cf, cumulative: cum };
  });

  const loanSeries: { year: string; balance: number }[] = [];
  for (let y = 0; y <= Math.max(1, Math.round(tenureYears)); y++) {
    loanSeries.push({ year: `Y${y}`, balance: Math.max(0, loanBalanceAfterYears(y)) });
  }

  const costBreakdown = [
    { name: "Land Acquisition", value: totalLandAcquisition },
    { name: "Construction", value: baseConstruction },
    { name: "Professional Fees", value: professionalFees },
    { name: "Infra & Approvals", value: govApprovalCost + infraCost },
    { name: "Contingency", value: contingency },
    { name: "Finance Cost", value: financeCost },
  ].filter((x) => x.value > 0);

  const occupancyInput =
    type === "hostel" ? revenue.hostel.occupancyPct :
    type === "commercial" && revenue.commercial.model === "rental" ? revenue.commercial.occupancyPct : null;

  const roiScore = mapRange(roiPct, [[0,1],[5,3],[10,5],[15,7],[20,9],[30,10]]);
  const paybackScore = !isFinite(paybackYears) ? 1 : mapRange(paybackYears, [[2,10],[4,8],[6,6],[8,4],[12,2],[20,1]]);
  const profitMarginScore = mapRange(profitMargin, [[0,1],[5,3],[15,5],[25,7],[35,9],[50,10]]);
  const loanRatioScore = mapRange(loanToProjectCost, [[30,10],[50,8],[65,6],[80,4],[95,2],[100,1]]);
  const occupancyScore = occupancyInput === null ? 7 : mapRange(occupancyInput, [[40,2],[60,5],[75,7],[85,9],[95,10]]);
  const dscrScore = isSaleModel ? 7 : !hasLoan ? 10 : dscr <= 0 ? 1 : mapRange(dscr, [[0.8,1],[1.0,3],[1.2,5],[1.35,7],[1.5,9],[2,10]]);
  const cfRatio = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  const cashFlowScore = cfRatio > 0 ? mapRange(cfRatio, [[0,5],[5,7],[10,8],[20,10]]) : mapRange(cfRatio, [[-20,1],[-5,3],[0,5]]);
  const rentalYieldScore = isSaleModel ? 7 : mapRange(rentalYield, [[2,2],[4,4],[6,6],[8,8],[10,10]]);

  const weights = { roi:.2, payback:.15, profitMargin:.15, loanRatio:.1, occupancy:.1, dscr:.15, cashFlow:.1, rentalYield:.05 };
  const rawScore = roiScore*weights.roi + paybackScore*weights.payback + profitMarginScore*weights.profitMargin +
    loanRatioScore*weights.loanRatio + occupancyScore*weights.occupancy + dscrScore*weights.dscr +
    cashFlowScore*weights.cashFlow + rentalYieldScore*weights.rentalYield;
  const overallScore = clamp(Math.round(rawScore * 10) / 10, 1, 10);
  const scoreLabel = overallScore < 3 ? "Very Poor Investment" : overallScore < 5 ? "Poor Investment" : overallScore < 7 ? "Average Investment" : overallScore < 9 ? "Good Investment" : "Excellent Investment";

  const riskLevel =
    (isSaleModel || dscr >= 1.25) && loanToProjectCost <= 70 && overallScore >= 7 ? "Low" :
    (isSaleModel || dscr >= 1.0) && loanToProjectCost <= 85 && overallScore >= 5 ? "Medium" : "High";

  const bankable = isSaleModel
    ? (loanToProjectCost <= 75 ? "Suitable — sale proceeds comfortably cover the loan principal." : "Marginal — loan exposure is high relative to project cost.")
    : !hasLoan ? "No bank loan involved — the project is fully self-funded, so debt-service coverage does not apply."
    : dscr >= 1.2 && loanToProjectCost <= 75 ? "Yes — meets standard 1.2x DSCR and loan-to-cost thresholds."
    : dscr >= 1.0 ? "Marginal — may need higher equity contribution or rate negotiation."
    : "Not recommended — insufficient debt service coverage at current terms.";

  const assetSecurity = !isSaleModel && loanToProjectCost < 40
    ? "Because leverage is low, the land (held in the developer's own name) and the completed structure together provide substantial collateral security for the capital invested, independent of ongoing cash flow performance."
    : null;

  const investorFit = overallScore >= 7 && roiPct > 12 ? "Strong fit for return-focused investors."
    : overallScore >= 5 ? "Conditional fit — recommend reviewing downside sensitivities before committing."
    : "High risk — restructuring cost, financing or revenue assumptions is advised.";

  let maxSafeLoan: number | null = null;
  if (!isSaleModel && NOI > 0 && rMonthly > 0 && n > 0) {
    const maxAnnualDS = NOI / 1.2;
    const maxMonthlyDS = maxAnnualDS / 12;
    maxSafeLoan = maxMonthlyDS * ((Math.pow(1 + rMonthly, n) - 1) / (rMonthly * Math.pow(1 + rMonthly, n)));
  }

  return {
    type, isSaleModel, durationYears,
    totalLandCost, registration, stampDuty, brokerage, totalLandAcquisition,
    baseConstruction, professionalFees, govApprovalCost, infraCost, contingency, totalConstructionCost,
    financeCost, interestDuringConstruction, processingFee, totalProjectCost,
    emi, totalInterestOverTenure, annualDebtService, loanBalanceAfterYears,
    annualRevenue, monthlyRevenue, revenueBreakdown, totalBeds, rooms,
    fixedOpex, variableOpex, totalOperatingExpense,
    NOI, EBITDA, netProfit, grossProfit,
    totalInvestment, roiPct, returnOnEquity, loanToEquity, loanToProjectCost, dscr,
    profitMargin, operatingMargin, netMargin, paybackYears, breakEvenPeriod,
    rentalYield, capRate, profitPerSqft, constructionCostPerBed, revenuePerBed, revenuePerSqft,
    investmentPerRoom, investmentPerBed, builtUpArea,
    irr, npv, cashOnCashReturn, exitValue, holdYears,
    cashFlowSeries, loanSeries, costBreakdown,
    overallScore, scoreLabel, riskLevel, bankable, investorFit, maxSafeLoan, hasLoan, assetSecurity,
    scoreFactors: [
      { key: "roi", label: "Return on Investment", score: roiScore, weight: weights.roi },
      { key: "payback", label: "Payback Period", score: paybackScore, weight: weights.payback },
      { key: "profitMargin", label: "Profit Margin", score: profitMarginScore, weight: weights.profitMargin },
      { key: "dscr", label: "Debt Service Coverage", score: dscrScore, weight: weights.dscr },
      { key: "loanRatio", label: "Loan-to-Cost Ratio", score: loanRatioScore, weight: weights.loanRatio },
      { key: "occupancy", label: "Occupancy", score: occupancyScore, weight: weights.occupancy },
      { key: "cashFlow", label: "Cash Flow", score: cashFlowScore, weight: weights.cashFlow },
      { key: "rentalYield", label: "Rental Yield", score: rentalYieldScore, weight: weights.rentalYield },
    ],
  };
}

export type Metrics = ReturnType<typeof computeAll>;

export function buildRecommendation(m: Metrics) {
  const strengths: string[] = [], weaknesses: string[] = [], risks: string[] = [], improvements: string[] = [];
  const type = m.type;

  if (m.roiPct > 15) strengths.push(`Annual ROI of ${fmtNum(m.roiPct)}% comfortably exceeds typical ${type} benchmarks of 10-12%.`);
  if (!m.isSaleModel && m.hasLoan && m.dscr >= 1.25) strengths.push(`Debt service coverage of ${fmtNum(m.dscr,2)}x gives lenders a comfortable repayment cushion.`);
  if (!m.isSaleModel && !m.hasLoan) strengths.push("The project carries no bank debt at all — it is fully self-funded, which removes debt-service risk entirely.");
  if (m.assetSecurity) strengths.push(m.assetSecurity);
  if (m.loanToProjectCost < 50) strengths.push(`Leverage is conservative at ${fmtNum(m.loanToProjectCost,0)}% of project cost, limiting downside exposure.`);
  if (!m.isSaleModel && m.rentalYield > 7) strengths.push(`Gross yield of ${fmtNum(m.rentalYield)}% is attractive relative to typical commercial benchmarks (6-8%).`);
  if (m.profitMargin > 25) strengths.push(`Profit margin of ${fmtNum(m.profitMargin)}% indicates strong pricing power relative to costs.`);
  if (strengths.length === 0) strengths.push("The project clears its direct costs, but margins are thin — treat this as a base case rather than a strength.");

  if (!m.isSaleModel && m.hasLoan && m.dscr < 1.2) weaknesses.push(`DSCR of ${fmtNum(m.dscr,2)}x sits below the 1.2x threshold most banks require for commercial lending.`);
  if (m.loanToProjectCost > 75) weaknesses.push(`Leverage of ${fmtNum(m.loanToProjectCost,0)}% of project cost is high and raises refinancing risk.`);
  if (isFinite(m.paybackYears) && m.paybackYears > 10) weaknesses.push(`Payback period of ${fmtYears(m.paybackYears)} is longer than the 7-10 year comfort zone for this asset type.`);
  if (!isFinite(m.paybackYears) || m.netProfit <= 0) weaknesses.push("Net cash flow is currently negative or break-even after debt service — revenue or cost assumptions need revisiting.");
  if (m.roiPct < 8) weaknesses.push(`Annual ROI of ${fmtNum(m.roiPct)}% is below what most institutional investors target for this asset class.`);
  if (weaknesses.length === 0) weaknesses.push("No material weaknesses stand out at current assumptions — stress-test occupancy and cost overruns regardless.");

  risks.push(`A 10% rise in construction cost would move project cost to ${fmtINR(m.totalProjectCost*1.1)}, compressing ROI accordingly — see the sensitivity panel.`);
  if (!m.isSaleModel && m.hasLoan) risks.push("Every 1 percentage point rise in interest rate increases annual debt service meaningfully; re-run Finance inputs to quantify at your loan size.");
  if (!m.isSaleModel && m.hasLoan) risks.push("Revenue is occupancy-dependent — a prolonged vacancy period directly erodes DSCR and equity cash flow.");
  if (!m.isSaleModel && !m.hasLoan) risks.push("Revenue is still occupancy-dependent — a prolonged vacancy period reduces net cash flow, even without debt-service pressure.");
  if (m.isSaleModel) risks.push("As a one-time sale model, the entire return depends on completing sales within the assumed project duration — delays compress annualised returns sharply.");

  if (!m.isSaleModel) {
    improvements.push(`Raising occupancy by 10 percentage points would lift annual revenue toward ${fmtINR(m.annualRevenue*1.1)} and improve both DSCR and ROI — see the What-If sliders.`);
    if (m.hasLoan) improvements.push("A 1% reduction in interest rate materially lowers annual debt service and improves cash-on-cash return without touching revenue assumptions.");
  }
  improvements.push(`Trimming construction cost by 5% would reduce total project cost to roughly ${fmtINR(m.totalProjectCost*0.95)}, directly improving ROI and payback.`);
  if (m.maxSafeLoan !== null) improvements.push(`Maximum safe loan amount at a 1.2x DSCR target is approximately ${fmtINR(m.maxSafeLoan)} — useful if you decide to bring in bank financing later.`);

  const verdict = `This ${type} project scores ${fmtNum(m.overallScore)}/10 (${m.scoreLabel}). Risk is assessed as ${m.riskLevel}. ${m.bankable} ${m.investorFit}`;
  return { strengths, weaknesses, risks, improvements, verdict };
}

export const DEFAULT_STATE: ProjectState = {
  project: { name: "Sunrise Business Hostel", location: "Kochi, Kerala", type: "hostel", landArea: 20, landUnit: "cent", durationMonths: 18, completionDate: "2027-12-31", developerName: "Maharaja Engineers & Contractors", amenities: ["Power Backup", "24/7 Security", "Lift", "Parking"] },
  land: { costPerCent: 800000, registrationPct: 8, stampDutyPct: 1, legalCharges: 50000, brokeragePct: 1, misc: 20000 },
  construction: {
    builtUpArea: 25000, costPerSqft: 2200, architectPct: 3, structuralPct: 1, mepPct: 1.5, interiorPct: 2,
    permitFees: 200000, govFees: 150000, utilityCharges: 300000,
    electrical: 400000, water: 150000, stp: 600000, fireFighting: 350000, lift: 1200000, generator: 500000,
    solar: 800000, security: 150000, cctv: 100000, accessControl: 80000, compoundWall: 600000, paving: 300000,
    landscaping: 200000, externalDev: 250000, contingencyPct: 5,
  },
  finance: { ownCapital: 30000000, bankLoan: 50000000, interestRate: 10.5, tenureYears: 12, moratoriumMonths: 18, processingFeePct: 1, workingCapital: 2000000, discountRatePct: 12, holdPeriodYears: 10, annualEscalationPct: 5 },
  revenue: {
    hostel: { rooms: 60, bedsPerRoom: 3, occupancyPct: 82, monthlyRentPerBed: 6500, laundry: 40000, food: 250000, parking: 15000, other: 10000 },
    apartment: { units: 40, avgPrice: 6500000 },
    commercial: { model: "rental", sellableArea: 30000, pricePerSqft: 8500, rentPerSqft: 65, occupancyPct: 88, escalationPct: 5 },
  },
  opex: { staffSalary: 1800000, maintenance: 600000, electricity: 900000, water: 200000, security: 400000, housekeeping: 500000, internet: 100000, marketing: 300000, insurance: 150000, propertyTax: 200000, repairs: 250000, managementCost: 600000, annualMaintenancePct: 2, vacancyLossPct: 3, badDebtPct: 1 },
};
