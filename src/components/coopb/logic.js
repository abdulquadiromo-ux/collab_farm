// Pure helpers for the cooperative funding pages (group coopb). No state, no network.
import { newId } from '../../context/AppContext.jsx';
import { TRANCHE_PLAN } from '../../data/funding.js';
import { budgetReconciles, sum } from '../../utils/rules.js';
import { formatNaira } from '../../utils/format.js';
import { TEMPLATES, TEMPLATE_CATEGORIES, TIERS, ALL_CATEGORIES, AGREEMENT_REQUIRED_STATUSES } from './constants.jsx';

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const newBudgetItem = (patch = {}) => ({ id: newId('b'), category: '', description: '', amount: '', responsible: '', files: [], ...patch });

export const emptyForm = () => ({
  name: '', category: '', tier: 'Custom', description: '', crop: '', farmIds: [], season: '',
  startDate: '', endDate: '', closingDate: '', tenureMonths: '',
  minInvestment: '', maxInvestment: '', minTarget: '', expectedOutput: '',
  returnLow: '', returnHigh: '',
  amount: '', expectedRoiPct: '', coopSharePct: 10, risks: '',
  budget: [newBudgetItem()],
});

// Map a template inclusion label to a PRD budget category.
export function guessBudgetCategory(text = '') {
  const t = text.toLowerCase();
  if (/(seed|fingerling|chick|stem|stock|breed|setts)/.test(t) || /(fertili[sz]er)/.test(t)) return 'Seeds and fertiliser';
  if (/(land|pond|housing|fencing)/.test(t)) return 'Land preparation';
  if (/(irrigation|water|aeration|pump)/.test(t)) return 'Irrigation';
  if (/(labour|labor)/.test(t)) return 'Farmer labour';
  if (/(pesticide|herbicide|vaccine|veterinary|medication|treatment|protection)/.test(t)) return 'Crop protection';
  if (/(harvest|processing)/.test(t)) return 'Harvesting';
  if (/(transport|marketing)/.test(t)) return 'Transport';
  if (/(machinery|equipment|tools|heating|net)/.test(t)) return 'Machinery and equipment';
  if (/(feed)/.test(t)) return 'Seeds and fertiliser';
  return 'Other';
}

export function templateFor(category, tier) {
  return (TEMPLATES[category] || []).find((t) => t.tier === tier) || null;
}

// Pre-filled form from a package template. Amounts are placeholders the cooperative must replace with quotation figures.
export function templateForm(category, tier) {
  const tpl = templateFor(category, tier);
  const form = emptyForm();
  form.category = TEMPLATE_CATEGORIES.includes(category) ? category : '';
  form.tier = TIERS.includes(tier) ? tier : 'Custom';
  if (!tpl) return form;
  form.name = `${category} ${tier} Package`;
  form.description = `${tpl.tagline}. This package covers: ${tpl.inclusions.join(', ').toLowerCase()}.`;
  form.amount = tpl.amount;
  form.minTarget = Math.round((tpl.amount * 0.6) / 1000) * 1000;
  form.minInvestment = 50000;
  form.maxInvestment = Math.round((tpl.amount * 0.5) / 10000) * 10000;
  const n = tpl.inclusions.length;
  const each = Math.floor(tpl.amount / n / 1000) * 1000;
  form.budget = tpl.inclusions.map((label, i) => newBudgetItem({
    category: guessBudgetCategory(label),
    description: label,
    amount: i === 0 ? tpl.amount - each * (n - 1) : each,
    responsible: 'Cooperative procurement lead',
  }));
  return form;
}

export function packageToForm(pkg) {
  const budget = (pkg.budget || []).map((b) => newBudgetItem({
    id: b.id, category: b.category || '', description: b.description || '', amount: b.amount ?? '', responsible: b.responsible || '',
    files: b.docs ? [{ name: b.docs, size: 0 }] : [],
  }));
  const roi = pkg.expectedRoiPct;
  return {
    name: pkg.name || '', category: pkg.category || '', tier: pkg.tier || 'Custom', description: pkg.description || '', crop: pkg.crop || '',
    farmIds: pkg.farmIds || [], season: pkg.season || '', startDate: pkg.startDate || '', endDate: pkg.endDate || '', closingDate: pkg.closingDate || '',
    tenureMonths: pkg.tenureMonths ?? '', minInvestment: pkg.minInvestment ?? '', maxInvestment: pkg.maxInvestment ?? '',
    minTarget: pkg.minTarget ?? '', expectedOutput: pkg.expectedOutput || '',
    returnLow: pkg.returnLow ?? (roi != null ? Math.max(0, roi - 2) : ''), returnHigh: pkg.returnHigh ?? (roi != null ? roi + 2 : ''),
    amount: pkg.amount ?? '', expectedRoiPct: roi ?? '', coopSharePct: pkg.coopSharePct ?? 10,
    risks: (pkg.risks || []).join('\n'), budget: budget.length ? budget : [newBudgetItem()],
  };
}

export function regionsFor(farmIds, farms) {
  const locs = [...new Set(farms.filter((f) => farmIds.includes(f.id)).map((f) => f.location))];
  return locs.join(' & ');
}

// Convert the form to a package record. Existing fields (raised, committed, counts) are preserved.
export function formToPackage(form, { coopId, existing, farms, status }) {
  const budget = form.budget.map((b) => ({
    id: b.id, category: b.category, description: String(b.description).trim(), amount: Number(b.amount) || 0,
    responsible: String(b.responsible).trim(), docs: b.files?.[0]?.name || '', approval: 'Pending',
  }));
  const amount = Number(form.amount) || 0;
  return {
    returnStructure: 'Profit sharing (illustrative, set in agreement)',
    ...(existing || {}),
    id: existing?.id || newId('pkg'),
    coopId,
    name: form.name.trim(),
    category: form.category || 'Custom',
    tier: form.tier || 'Custom',
    description: form.description.trim(),
    crop: form.crop.trim(),
    farmIds: form.farmIds,
    season: form.season,
    regions: regionsFor(form.farmIds, farms) || existing?.regions || '',
    amount,
    raised: existing?.raised ?? 0,
    committed: existing?.committed ?? 0,
    minInvestment: Number(form.minInvestment) || 0,
    maxInvestment: Number(form.maxInvestment) || 0,
    minTarget: Number(form.minTarget) || 0,
    tenureMonths: Number(form.tenureMonths) || 0,
    expectedRoiPct: form.expectedRoiPct === '' ? 0 : Number(form.expectedRoiPct),
    returnLow: form.returnLow === '' ? 0 : Number(form.returnLow),
    returnHigh: form.returnHigh === '' ? 0 : Number(form.returnHigh),
    coopSharePct: form.coopSharePct === '' ? 0 : Number(form.coopSharePct),
    expectedOutput: form.expectedOutput.trim(),
    status: status || existing?.status || 'Draft',
    farmersCount: existing?.farmersCount ?? 0,
    investorsCount: existing?.investorsCount ?? 0,
    closingDate: form.closingDate,
    startDate: form.startDate,
    endDate: form.endDate,
    createdAt: existing?.createdAt || todayIso(),
    risks: form.risks.split('\n').map((s) => s.trim()).filter(Boolean),
    inclusions: budget.filter((b) => b.description).map((b) => ({ item: b.description, amount: b.amount })),
    budget,
  };
}

// Four tranches by the shared platform rule. The last tranche takes the rounding remainder so the total is exact.
export function trancheAmounts(amount) {
  const a = Number(amount) || 0;
  let used = 0;
  return TRANCHE_PLAN.map((t, i) => {
    const value = i === TRANCHE_PLAN.length - 1 ? a - used : Math.round(a * t.share);
    used += value;
    return { ...t, amount: value };
  });
}

export function monthsBetween(start, end) {
  if (!start || !end) return null;
  const s = new Date(start); const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) return null;
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24 * 30.4)));
}

const isNum = (v) => v !== '' && v != null && !Number.isNaN(Number(v));

export function validateBasics(form, { platformMin = 50000 } = {}) {
  const e = {};
  const today = todayIso();
  const name = form.name.trim();
  if (!name) e.name = 'Enter a package name, for example "Maize Growth Package".';
  else if (name.length < 4) e.name = 'Use at least 4 characters for the package name.';
  else if (name.length > 80) e.name = 'Keep the package name under 80 characters.';
  if (!form.category) e.category = 'Choose a category.';
  if (!form.tier) e.tier = 'Choose a package type.';
  if (form.description.trim().length < 30) e.description = 'Describe the package in at least 30 characters so investors understand what it funds.';
  if (!form.crop.trim()) e.crop = 'Enter the crop or activity, for example Maize or Catfish.';
  if (!form.farmIds.length) e.farmIds = 'Select at least one farm location.';
  if (!form.season) e.season = 'Choose the season.';
  if (!isNum(form.tenureMonths) || !Number.isInteger(Number(form.tenureMonths)) || Number(form.tenureMonths) < 1 || Number(form.tenureMonths) > 36) e.tenureMonths = 'Enter the number of months, between 1 and 36.';
  if (!form.startDate) e.startDate = 'Choose the farming start date.';
  else if (form.startDate < today) e.startDate = 'The start date must be today or later.';
  if (!form.endDate) e.endDate = 'Choose the farming end date.';
  else if (form.startDate && form.endDate <= form.startDate) e.endDate = 'The end date must be after the start date.';
  if (!form.closingDate) e.closingDate = 'Choose the date funding closes.';
  else if (form.closingDate < today) e.closingDate = 'The closing date must be today or later.';
  else if (form.startDate && form.closingDate > form.startDate) e.closingDate = 'Funding must close on or before the farming start date.';
  if (!isNum(form.minInvestment) || Number(form.minInvestment) < platformMin) e.minInvestment = `Enter at least ${formatNaira(platformMin)}, the platform minimum.`;
  if (!isNum(form.maxInvestment) || Number(form.maxInvestment) <= 0) e.maxInvestment = 'Enter the largest amount one investor may commit.';
  else if (isNum(form.minInvestment) && Number(form.maxInvestment) < Number(form.minInvestment)) e.maxInvestment = 'The maximum cannot be lower than the minimum investment.';
  if (!isNum(form.minTarget) || Number(form.minTarget) <= 0) e.minTarget = 'Enter the minimum amount that must be raised for the project to go ahead.';
  if (!form.expectedOutput.trim()) e.expectedOutput = 'Describe the expected harvest or output, for example "About 40 tonnes of yam".';
  if (!isNum(form.returnLow) || Number(form.returnLow) < 0 || Number(form.returnLow) > 100) e.returnLow = 'Enter a percentage from 0 to 100.';
  if (!isNum(form.returnHigh) || Number(form.returnHigh) < 0 || Number(form.returnHigh) > 100) e.returnHigh = 'Enter a percentage from 0 to 100.';
  else if (isNum(form.returnLow) && Number(form.returnHigh) < Number(form.returnLow)) e.returnHigh = 'The upper estimate cannot be lower than the lower estimate.';
  return e;
}

export function validateBudgetItems(items) {
  const e = {};
  if (!items.length) e.budget = 'Add at least one item to the budget.';
  items.forEach((b) => {
    if (!b.category) e[`b:${b.id}:category`] = 'Choose a budget category.';
    if (!String(b.description).trim()) e[`b:${b.id}:description`] = 'Describe what this item pays for.';
    if (!isNum(b.amount) || Number(b.amount) <= 0) e[`b:${b.id}:amount`] = 'Enter an amount above zero.';
    if (!String(b.responsible).trim()) e[`b:${b.id}:responsible`] = 'Choose who is responsible.';
  });
  return e;
}

export function validateDetails(form) {
  const e = {};
  const amount = Number(form.amount);
  if (!isNum(form.amount) || amount <= 0) e.amount = 'Enter the total package amount.';
  else {
    if (isNum(form.minTarget) && Number(form.minTarget) > amount) e.amount = 'The package amount cannot be lower than the minimum funding target.';
    else if (isNum(form.maxInvestment) && Number(form.maxInvestment) > amount) e.amount = 'The package amount cannot be lower than the maximum investment per investor.';
  }
  if (!isNum(form.expectedRoiPct) || Number(form.expectedRoiPct) < 0 || Number(form.expectedRoiPct) > 100) e.expectedRoiPct = 'Enter an estimate from 0 to 100 percent.';
  else if (isNum(form.returnLow) && isNum(form.returnHigh) && (Number(form.expectedRoiPct) < Number(form.returnLow) || Number(form.expectedRoiPct) > Number(form.returnHigh))) {
    e.expectedRoiPct = `Keep the estimate inside the range you gave in Package Basics (${form.returnLow}% to ${form.returnHigh}%).`;
  }
  if (!isNum(form.coopSharePct) || Number(form.coopSharePct) < 0 || Number(form.coopSharePct) > 50) e.coopSharePct = 'Enter the cooperative share, from 0 to 50 percent.';
  return { ...e, ...validateBudgetItems(form.budget) };
}

// What is still missing before a package may be submitted. `ok:false` rows block submission.
export function submissionChecklist(form, { verified = true, platformMin } = {}) {
  const basics = validateBasics(form, { platformMin });
  const details = validateDetails(form);
  const budgetCheck = budgetReconciles({ budget: form.budget, amount: Number(form.amount) || 0 });
  const reconciles = budgetCheck.ok && budgetCheck.target > 0;
  const docsMissing = form.budget.filter((b) => !b.files?.length).length;
  return [
    { id: 'verified', label: 'Your cooperative is verified', ok: verified, detail: verified ? '' : 'Only verified cooperatives can submit funding requests.', step: null },
    { id: 'basics', label: 'Package basics are complete', ok: !Object.keys(basics).length, detail: Object.keys(basics).length ? `${Object.keys(basics).length} field(s) need attention.` : '', step: 0 },
    { id: 'details', label: 'Funding details are complete', ok: !Object.keys(details).length, detail: Object.keys(details).length ? `${Object.keys(details).length} field(s) need attention.` : '', step: 1 },
    { id: 'reconcile', label: 'Budget reconciles with the package amount', ok: reconciles, detail: reconciles ? '' : budgetCheck.difference > 0 ? `${formatNaira(budgetCheck.difference)} of the package amount is not yet planned.` : `The budget is ${formatNaira(Math.abs(budgetCheck.difference))} over the package amount.`, step: 1 },
    { id: 'farm', label: 'At least one farm location is selected', ok: form.farmIds.length > 0, detail: form.farmIds.length ? '' : 'Choose the farms this package will fund.', step: 0 },
    { id: 'docs', label: 'A supporting document is attached to every budget item', ok: form.budget.length > 0 && docsMissing === 0, detail: docsMissing ? `${docsMissing} item(s) have no document yet.` : '', step: 1 },
  ];
}

// Used by the Funding list and detail page "Submit for review" actions on a saved package.
export function packageProblems(pkg, opts) {
  return submissionChecklist(packageToForm(pkg), opts).filter((c) => !c.ok);
}

export function reconcile(pkg) {
  const r = budgetReconciles(pkg);
  return { ...r, ok: r.ok && r.target > 0 };
}

// Agreement status for a package (PRD agreements A, B and C).
export function agreementSummary(pkg, data) {
  const contracts = data.contracts.filter((c) => c.packageId === pkg.id);
  const b = contracts.find((c) => c.type === 'B' && c.partyId === pkg.coopId) || null;
  const a = contracts.filter((c) => c.type === 'A');
  const farmers = data.farmers.filter((f) => f.allocationPackageId === pkg.id);
  const c = farmers.map((f) => {
    const contract = contracts.find((x) => x.type === 'C' && x.partyId === f.id) || null;
    return { farmer: f, contract, status: contract ? contract.status : (f.agreementStatus || 'Not Signed') };
  });
  const required = AGREEMENT_REQUIRED_STATUSES.includes(pkg.status);
  const unsignedC = c.filter((r) => r.status !== 'Signed');
  const missing = [];
  if (required && (!b || b.status !== 'Signed')) {
    missing.push({ key: 'B', label: 'Agreement B (Cooperative Funding and Accountability Agreement)', detail: b ? `Status: ${b.status}` : 'Not issued yet' });
  }
  if (required && unsignedC.length) {
    missing.push({ key: 'C', label: `Agreement C (Farmer Participation Agreement) for ${unsignedC.length} allocated farmer${unsignedC.length === 1 ? '' : 's'}`, detail: unsignedC.slice(0, 3).map((r) => r.farmer.name).join(', ') + (unsignedC.length > 3 ? ` and ${unsignedC.length - 3} more` : '') });
  }
  return { b, a, c, required, unsignedC, missing };
}

export function aggregateInvestments(list) {
  const keys = ['intended', 'committed', 'confirmed', 'available', 'disbursed', 'repaid'];
  return keys.reduce((o, k) => ({ ...o, [k]: sum(list, (i) => i[k]) }), {});
}

export const SIX_AMOUNT_HELP = {
  intended: 'What the investor said they planned to invest. It is not binding.',
  committed: 'What the investor formally signed up to. A commitment is a promise, not money received.',
  confirmed: 'Money the regulated financial partner has confirmed it received. Only this counts as received.',
  available: 'Confirmed money that can be paid out once the approvals for a tranche are in place.',
  disbursed: 'Money already paid out to suppliers, farmers or the cooperative after approval.',
  repaid: 'Money paid back to the investor, as principal or profit share, according to the agreement.',
};

export function tierLabel(pkg) {
  return pkg.tier && pkg.tier !== 'Custom' ? pkg.tier : 'Custom';
}

export const isCustomPackage = (p) => p.category === 'Custom' || p.tier === 'Custom';

export { ALL_CATEGORIES };
