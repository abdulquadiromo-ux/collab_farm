// Pure helpers for the cooperative funding pages (group coopb). No state, no network.
import { newId } from '../../context/AppContext.jsx';
import { tranchePlanFor } from '../../data/funding.js';
import { budgetReconciles, sum } from '../../utils/rules.js';
import { formatNaira } from '../../utils/format.js';
import { TEMPLATES, TEMPLATE_CATEGORIES, TIERS, ALL_CATEGORIES, AGREEMENT_REQUIRED_STATUSES } from './constants.jsx';

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const newBudgetItem = (patch = {}) => ({ id: newId('b'), category: '', description: '', amount: '', responsible: '', files: [], ...patch });

export const emptyForm = () => ({
  name: '', category: '', tier: 'Starter', description: '', crop: '', farmIds: [], season: '',
  startDate: '', endDate: '', closingDate: '', tenureMonths: '',
  minInvestment: '', maxInvestment: '', minTarget: '', expectedOutput: '',
  returnLow: '', returnHigh: '',
  amount: '', expectedRoiPct: '', coopSharePct: 10, risks: '',
  budget: [newBudgetItem()], farmers: [],
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
// Starts a category-specific package without seeding example amounts or budget rows.
export function templateForm(category, tier) {
  const form = emptyForm();
  form.category = TEMPLATE_CATEGORIES.includes(category) ? category : '';
  form.tier = TIERS.includes(tier) ? tier : 'Starter';
  return form;
}

export function packageToForm(pkg) {
  const budget = (pkg.budget || []).map((b) => newBudgetItem({
    id: b.id, category: b.category || '', description: b.description || '', amount: b.amount ?? '', responsible: b.responsible || '',
    files: b.docs ? [{ name: b.docs, size: 0 }] : [],
  }));
  const roi = pkg.expectedRoiPct;
  return {
    name: pkg.name || '', category: pkg.category || '', tier: pkg.tier || 'Starter', description: pkg.description || '', crop: pkg.crop || '',
    farmIds: pkg.farmIds || [], season: pkg.season || '', startDate: pkg.startDate || '', endDate: pkg.endDate || '', closingDate: pkg.closingDate || '',
    tenureMonths: pkg.tenureMonths ?? '', minInvestment: pkg.minInvestment ?? '', maxInvestment: pkg.maxInvestment ?? '',
    minTarget: pkg.minTarget ?? '', expectedOutput: pkg.expectedOutput || '',
    returnLow: pkg.returnLow ?? (roi != null ? Math.max(0, roi - 2) : ''), returnHigh: pkg.returnHigh ?? (roi != null ? roi + 2 : ''),
    amount: pkg.amount ?? '', expectedRoiPct: roi ?? '', coopSharePct: pkg.coopSharePct ?? 10,
    risks: (pkg.risks || []).join('\n'), budget: budget.length ? budget : [newBudgetItem()],
    farmers: (pkg.farmers || []).map((f) => ({ farmerId: f.farmerId || f.farmer_id || f.id, allocatedAmount: f.allocatedAmount ?? f.allocated_amount ?? '' })),
  };
}

export function apiPackageToModel(pkg) {
  const categoryLabels = { CROP_FARMING: 'Crop Farming', FISHERY: 'Fishery', MIXED_FARMING: 'Mixed Farming', LIVESTOCK: 'Livestock', POULTRY: 'Poultry', CUSTOM: 'Custom' };
  const tierLabels = { STARTER: 'Starter', GROWTH: 'Growth', COMMERCIAL: 'Commercial', CUSTOM: 'Custom' };
  const statusLabels = { DRAFT: 'Draft', PENDING: 'Submitted', PENDING_ADMIN: 'Under Review', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review', CHANGES_REQUESTED: 'Changes Requested', APPROVED: 'Approved', OPEN_FOR_FUNDING: 'Open for Funding', FUNDING_TARGET_REACHED: 'Funding Target Reached', READY_FOR_DISBURSEMENT: 'Ready for Disbursement', ACTIVE: 'Active', PAUSED: 'Paused', COMPLETED: 'Completed', FAILED: 'Failed or Terminated' };
  const inclusions = Array.isArray(pkg?.whats_included) ? pkg.whats_included : [];
  const farmers = Array.isArray(pkg?.farmers) ? pkg.farmers : Array.isArray(pkg?.assigned_farmers) ? pkg.assigned_farmers : [];
  const budget = inclusions.map((item, index) => ({ id: item.id || `api-budget-${index}`, category: item.category || 'Other', description: item.item || item.description || String(item), amount: Number(item.amount) || 0, responsible: item.responsible || '', docs: '', approval: 'Pending' }));
  const rawStatus = String(pkg?.current_status || pkg?.status || pkg?.review_status || 'PENDING').toUpperCase();
  const rawCategory = String(pkg?.category || 'CUSTOM').toUpperCase();
  const rawTier = String(pkg?.package_type || 'STARTER').toUpperCase();
  return {
    ...pkg,
    id: pkg?.id,
    coopId: pkg?.cooperative_id || pkg?.coopId,
    name: pkg?.title || pkg?.name || 'Untitled package',
    category: categoryLabels[rawCategory] || rawCategory,
    tier: tierLabels[rawTier] || rawTier,
    description: pkg?.short_description || pkg?.description || '',
    amount: Number(pkg?.fund_amount ?? pkg?.amount) || 0,
    minTarget: Number(pkg?.minimum_funding_target ?? pkg?.minTarget) || 0,
    minInvestment: Number(pkg?.minimum_investment ?? pkg?.minInvestment) || 0,
    maxInvestment: Number(pkg?.maximum_investment ?? pkg?.maxInvestment) || 0,
    startDate: pkg?.start_date || pkg?.startDate || '',
    endDate: pkg?.end_date || pkg?.endDate || '',
    closingDate: pkg?.funding_closes_on || pkg?.closingDate || '',
    season: pkg?.farming_cycle || pkg?.season || '',
    tenureMonths: Number(pkg?.tenure_months ?? pkg?.tenureMonths) || 0,
    expectedOutput: pkg?.expected_output || pkg?.expectedOutput || '',
    returnLow: Number(pkg?.expected_return_min ?? pkg?.returnLow) || 0,
    returnHigh: Number(pkg?.expected_return_max ?? pkg?.returnHigh) || 0,
    expectedRoiPct: Number(pkg?.expected_roi ?? pkg?.expectedRoiPct) || 0,
    coopSharePct: Number(pkg?.cooperative_share ?? pkg?.coopSharePct) || 0,
    farmersCount: Number(pkg?.farmers_count ?? farmers.length) || 0,
    investorsCount: Number(pkg?.investors_count) || 0,
    createdAt: pkg?.created_at || pkg?.createdAt || '',
    status: statusLabels[rawStatus] || rawStatus.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
    inclusions: inclusions.map((item) => ({ ...item, item: item.item || item.description || String(item) })),
    budget,
    farmers: farmers.map((farmer) => ({ ...farmer, farmerId: farmer.farmer_id || farmer.farmerId || farmer.id, allocatedAmount: farmer.allocated_amount ?? farmer.allocatedAmount ?? '' })),
    apiPayload: pkg,
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
  const apiPayload = {
    title: form.name.trim(),
    package_type: ({ Starter: 'STARTER', Growth: 'GROWTH', Commercial: 'COMMERCIAL', Custom: 'STARTER' })[form.tier] || 'STARTER',
    category: ({ 'Crop Farming': 'CROP_FARMING', Fishery: 'FISHERY', 'Mixed Farming': 'MIXED_FARMING', Livestock: 'LIVESTOCK', Poultry: 'POULTRY', Custom: 'CUSTOM' })[form.category] || String(form.category || 'CUSTOM').toUpperCase().replace(/\s+/g, '_'),
    fund_amount: amount,
    start_date: form.startDate,
    end_date: form.endDate,
    funding_closes_on: form.closingDate,
    minimum_funding_target: Number(form.minTarget) || 0,
    maximum_investment: Number(form.maxInvestment) || 0,
    minimum_investment: Number(form.minInvestment) || 0,
    expected_output: form.expectedOutput.trim(),
    expected_return_min: Number(form.returnLow) || 0,
    expected_return_max: Number(form.returnHigh) || 0,
    farming_cycle: form.season,
    short_description: form.description.trim(),
    tenure_months: Number(form.tenureMonths) || 0,
    expected_roi: Number(form.expectedRoiPct) || 0,
    cooperative_share: Number(form.coopSharePct) || 0,
    whats_included: budget.filter((b) => b.description).map((b) => ({ item: b.description, amount: b.amount })),
    farmers: (form.farmers || []).filter((f) => f.farmerId).map((f) => ({ farmer_id: f.farmerId, allocated_amount: Number(f.allocatedAmount) || 0 })),
  };
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
    farmersCount: apiPayload.farmers.length,
    investorsCount: existing?.investorsCount ?? 0,
    closingDate: form.closingDate,
    startDate: form.startDate,
    endDate: form.endDate,
    createdAt: existing?.createdAt || todayIso(),
    risks: form.risks.split('\n').map((s) => s.trim()).filter(Boolean),
    inclusions: budget.filter((b) => b.description).map((b) => ({ item: b.description, amount: b.amount })),
    budget,
    apiPayload,
    farmers: apiPayload.farmers.map((f) => ({ farmerId: f.farmer_id, allocatedAmount: f.allocated_amount })),
  };
}

// Four tranches by the shared platform rule. The last tranche takes the rounding remainder so the total is exact.
export function trancheAmounts(amount, category) {
  const a = Number(amount) || 0;
  let used = 0;
  const plan = tranchePlanFor(category);
  return plan.map((t, i) => {
    const value = i === plan.length - 1 ? a - used : Math.round(a * t.share);
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
    if (!String(b.description).trim()) e[`b:${b.id}:description`] = 'Enter what is included.';
    if (!isNum(b.amount) || Number(b.amount) <= 0) e[`b:${b.id}:amount`] = 'Enter an amount above zero.';
  });
  return e;
}

export function validateDetails(form) {
  const e = {};
  const amount = Number(form.amount);
  const allocations = (form.farmers || []).filter((f) => f.farmerId);
  if (!allocations.length) e.farmers = 'Select at least one farmer for this package.';
  allocations.forEach((f) => {
    if (!isNum(f.allocatedAmount) || Number(f.allocatedAmount) <= 0) e[`farmer:${f.farmerId}:amount`] = 'Enter an investment amount above zero.';
  });
  if (!isNum(form.amount) || amount <= 0) e.amount = 'Enter the total package amount.';
  else {
    if (isNum(form.minTarget) && Number(form.minTarget) > amount) e.amount = 'The package amount cannot be lower than the minimum funding target.';
    else if (isNum(form.maxInvestment) && Number(form.maxInvestment) > amount) e.amount = 'The package amount cannot be lower than the maximum investment per investor.';
  }
  if (!isNum(form.expectedRoiPct) || Number(form.expectedRoiPct) < 0 || Number(form.expectedRoiPct) > 100) e.expectedRoiPct = 'Enter an estimate from 0 to 100 percent.';
  else if (isNum(form.returnLow) && isNum(form.returnHigh) && (Number(form.expectedRoiPct) < Number(form.returnLow) || Number(form.expectedRoiPct) > Number(form.returnHigh))) {
    e.expectedRoiPct = `Keep the estimate inside the range you gave in Package Basics (${form.returnLow}% to ${form.returnHigh}%).`;
  }
  if (!isNum(form.coopSharePct) || Number(form.coopSharePct) < 0 || Number(form.coopSharePct) > 100) e.coopSharePct = 'Enter the cooperative share, from 0 to 100 percent.';
  return { ...e, ...validateBudgetItems(form.budget) };
}

export function farmerAllocationCheck(form) {
  const allocations = (form.farmers || []).filter((farmer) => farmer.farmerId);
  if (!allocations.length) return { ok: false, step: 0, detail: 'Select at least one farmer and allocate the package amount.' };
  const amount = Number(form.amount) || 0;
  if (amount <= 0) return { ok: false, step: 1, detail: 'Enter the total package amount before allocating it to farmers.' };
  const allocated = allocations.reduce((total, farmer) => total + (Number(farmer.allocatedAmount) || 0), 0);
  const difference = Math.round((amount - allocated) * 100) / 100;
  if (Math.abs(difference) <= 0.01) return { ok: true, step: 0, detail: '' };
  return difference > 0
    ? { ok: false, step: 0, detail: `Farmer allocations must add up to ${formatNaira(amount)}. Allocate the remaining ${formatNaira(difference)}.` }
    : { ok: false, step: 0, detail: `Farmer allocations must add up to ${formatNaira(amount)}. Reduce allocations by ${formatNaira(Math.abs(difference))}.` };
}

// What is still missing before a package may be submitted. `ok:false` rows block submission.
export function submissionChecklist(form, { verified = true, platformMin } = {}) {
  const basics = validateBasics(form, { platformMin });
  const details = validateDetails(form);
  const allocations = farmerAllocationCheck(form);
  const budgetCheck = budgetReconciles({ budget: form.budget, amount: Number(form.amount) || 0 });
  const reconciles = budgetCheck.ok && budgetCheck.target > 0;
  return [
    { id: 'verified', label: 'Your cooperative is verified', ok: verified, detail: verified ? '' : 'Only verified cooperatives can submit funding requests.', step: null },
    { id: 'basics', label: 'Package basics are complete', ok: !Object.keys(basics).length, detail: Object.keys(basics).length ? `${Object.keys(basics).length} field(s) need attention.` : '', step: 0 },
    { id: 'details', label: 'Funding details are complete', ok: !Object.keys(details).length, detail: Object.keys(details).length ? `${Object.keys(details).length} field(s) need attention.` : '', step: 1 },
    { id: 'farmerAllocations', label: 'Farmer allocations add up to the package amount', ok: allocations.ok, detail: allocations.detail, step: allocations.step },
    { id: 'reconcile', label: 'Budget reconciles with the package amount', ok: reconciles, detail: reconciles ? '' : budgetCheck.difference > 0 ? `${formatNaira(budgetCheck.difference)} of the package amount is not yet planned.` : `The budget is ${formatNaira(Math.abs(budgetCheck.difference))} over the package amount.`, step: 1 },
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
