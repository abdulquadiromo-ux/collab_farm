// Report catalogue and builders (PRD "Reports"). Everything is computed from the live store. Nothing is sent anywhere.
// Each figure carries a basis: "Confirmed" (approved by a reviewer or confirmed by the financial partner),
// "Estimate" (a projection or illustration) or "User-submitted" (reported by a user, not yet verified).
import {
  Wallet, Users, Flag, Sprout, Wheat, PiggyBank, Scale, CircleDollarSign, Banknote, TrendingUp, AlertTriangle, Landmark,
  UserCheck, FolderKanban, GitCompareArrows, Timer, MessageSquareWarning, Activity, SearchX,
} from 'lucide-react';
import { formatNaira, formatNumber, percent, formatDateShort } from '../../utils/format.js';
import { sum } from '../../utils/rules.js';
import { DEMO_NOW, ageInDays, byId, visiblePackages } from './shrUtils.js';

const APPROVED = ['Approved', 'Open for Funding', 'Funding Target Reached', 'Ready for Disbursement', 'Active', 'Completed'];
const isApproved = (p) => APPROVED.includes(p.status);
const MISUSE = ['Suspected misuse of funds', 'Confirmed fraud or breach'];

// ---------- context ----------
export function makeCtx({ data, user, params }) {
  const allPkgs = visiblePackages(data, user);
  const pkgs = params.pkg ? allPkgs.filter((p) => p.id === params.pkg) : allPkgs;
  const ids = new Set(pkgs.map((p) => p.id));
  return {
    data, user, role: user.role, params, allPkgs, pkgs, ids,
    // Records with no date are always kept so a date filter never hides an open item by accident.
    inRange: (d) => {
      if (!d) return true;
      const s = String(d).slice(0, 10);
      if (params.from && s < params.from) return false;
      if (params.to && s > params.to) return false;
      return true;
    },
    statusOk: (s) => !params.status || s === params.status,
    name: (id) => byId(data.packages, id)?.name || id || '-',
  };
}

// ---------- small constructors ----------
const kpi = (label, value, basis, sub) => ({ label, value, basis, sub });
const col = (key, header, type = 'text', extra = {}) => ({ key, header, type, ...extra });
const money = (n) => formatNaira(n);
const short = (s, n = 12) => (String(s).length > n ? `${String(s).slice(0, n - 1)}.` : String(s));

function donut(items, title, formatter = formatNumber, totalText) {
  const list = items.filter((i) => i.value > 0).map((i) => ({ label: i.label, value: i.value, display: formatter(i.value) }));
  if (!list.length) return null;
  return { kind: 'donut', title, data: list, total: totalText ?? formatter(sum(list, (i) => i.value)), format: formatter };
}
function bars(items, title, unit = '%') {
  const list = items.slice(0, 6).map((i) => ({ label: short(i.label), value: Math.max(0, Math.min(100, Math.round(i.value))), tone: i.tone || 'green' }));
  return list.length ? { kind: 'bar', title, unit, data: list } : null;
}

// ============ builders ============

function budgets(ctx) {
  const { data } = ctx;
  const rows = ctx.pkgs.filter((p) => ctx.statusOk(p.status) && ctx.inRange(p.createdAt)).map((p) => {
    const released = sum(data.tranches.filter((t) => t.packageId === p.id && t.status === 'Released'), (t) => t.amount);
    const spent = sum(data.expenses.filter((e) => e.packageId === p.id && e.status === 'Confirmed'), (e) => e.amount);
    const awaiting = sum(data.expenses.filter((e) => e.packageId === p.id && e.status !== 'Confirmed'), (e) => e.amount);
    return { id: p.id, name: p.name, status: p.status, budget: p.amount, released, spent, awaiting, used: percent(spent, p.amount), relPct: percent(released, p.amount), basis: isApproved(p) ? 'Confirmed' : 'User-submitted' };
  });
  const over = rows.filter((r) => r.spent > r.released);
  return {
    kpis: [
      kpi('Approved budgets', money(sum(rows.filter((r) => r.basis === 'Confirmed'), (r) => r.budget)), 'Confirmed', 'Approved by a reviewer'),
      kpi('Budgets awaiting approval', money(sum(rows.filter((r) => r.basis !== 'Confirmed'), (r) => r.budget)), 'User-submitted', 'Requested, not yet approved'),
      kpi('Released to projects', money(sum(rows, (r) => r.released)), 'Confirmed', 'Tranches released after approval'),
      kpi('Spent and confirmed', money(sum(rows, (r) => r.spent)), 'Confirmed', 'Payments confirmed by the partner'),
      kpi('Spend awaiting confirmation', money(sum(rows, (r) => r.awaiting)), 'User-submitted', 'Recorded, not yet confirmed'),
    ],
    chart: bars(rows.filter((r) => r.released > 0).map((r) => ({ label: r.name, value: r.relPct })), 'Share of each approved budget released in tranches'),
    columns: [
      col('name', 'Package'), col('status', 'Status', 'status'), col('budget', 'Budget', 'money'), col('released', 'Released', 'money'),
      col('spent', 'Confirmed spend', 'money'), col('awaiting', 'Unconfirmed spend', 'money'), col('used', 'Used', 'pct'), col('basis', 'Basis', 'basis'),
    ],
    rows,
    notes: [
      'A tranche is one stage of the money. It is released only after the evidence for that stage is approved.',
      'Spending counts as confirmed only when the financial partner has confirmed the payment. Used is confirmed spend divided by the budget.',
      ...(over.length ? [`Check: ${over.map((r) => r.name).join(', ')} shows more confirmed spend than released tranches. A reviewer should explain the difference before the next release.`] : []),
    ],
  };
}

function allocations(ctx) {
  const { data, user } = ctx;
  const rows = data.farmers
    .filter((f) => f.allocatedAmount > 0 && f.status !== 'Removed' && ctx.ids.has(f.allocationPackageId) && (user.role === 'admin' || f.coopId === user.orgId))
    .filter((f) => ctx.statusOk(f.agreementStatus) && ctx.inRange(f.dateAdded))
    .map((f) => ({ id: f.id, name: f.name, package: ctx.name(f.allocationPackageId), packageId: f.allocationPackageId, amount: f.allocatedAmount, identity: f.identityStatus, status: f.agreementStatus, basis: f.identityStatus === 'Verified' && f.agreementStatus === 'Signed' ? 'Confirmed' : 'User-submitted' }));
  const ready = rows.filter((r) => r.basis === 'Confirmed');
  const byPkg = {};
  rows.forEach((r) => { byPkg[r.package] = (byPkg[r.package] || 0) + r.amount; });
  return {
    kpis: [
      kpi('Farmers with an allocation', formatNumber(rows.length), 'User-submitted', 'Proposed by the cooperative'),
      kpi('Total allocated', money(sum(rows, (r) => r.amount)), 'User-submitted', 'Cannot exceed the approved budget'),
      kpi('Ready to receive support', money(sum(ready, (r) => r.amount)), 'Confirmed', 'Identity verified and agreement signed'),
      kpi('Not ready yet', money(sum(rows, (r) => r.amount) - sum(ready, (r) => r.amount)), 'User-submitted', 'Identity or agreement still open'),
    ],
    chart: donut(Object.entries(byPkg).map(([label, value]) => ({ label, value })), 'Allocated amount by package', money),
    columns: [col('name', 'Farmer'), col('package', 'Package'), col('amount', 'Allocation', 'money'), col('identity', 'Identity', 'status'), col('status', 'Agreement C', 'status'), col('basis', 'Basis', 'basis')],
    rows,
    notes: ['A farmer is not active in a project until identity, membership and consent checks are complete.', 'Cash and in-kind support are recorded separately on each allocation.'],
  };
}

function milestones(ctx) {
  const { data } = ctx;
  const rows = data.milestones.filter((m) => ctx.ids.has(m.packageId) && ctx.statusOk(m.status) && ctx.inRange(m.dueDate)).map((m) => ({
    id: m.id, name: m.title, package: ctx.name(m.packageId), due: m.dueDate, status: m.status, evidence: m.evidence.length, verified: m.evidence.filter((e) => e.verified).length,
    basis: m.status === 'Under Review' ? 'User-submitted' : 'Confirmed',
  }));
  const n = (s) => rows.filter((r) => r.status === s).length;
  return {
    kpis: [kpi('Approved', n('Approved'), 'Confirmed', 'Evidence checked by a reviewer'), kpi('Under review', n('Under Review'), 'User-submitted', 'Evidence submitted, not yet checked'), kpi('Delayed', n('Delayed'), 'Confirmed', 'Past the due date'), kpi('Not started', n('Not Started'), 'Confirmed', 'No evidence yet')],
    chart: donut(['Approved', 'Under Review', 'Delayed', 'Not Started'].map((s) => ({ label: s, value: n(s) })), 'Milestones by status'),
    columns: [col('name', 'Milestone'), col('package', 'Package'), col('due', 'Due', 'date'), col('status', 'Status', 'status'), col('evidence', 'Evidence files', 'number'), col('verified', 'Verified files', 'number'), col('basis', 'Basis', 'basis')],
    rows,
    notes: ['Photos and GPS support a report but are not conclusive. A reviewer decides whether a milestone is approved.'],
  };
}

function inputs(ctx) {
  const { data } = ctx;
  const rows = data.inputRecords.filter((r) => ctx.ids.has(r.packageId) && ctx.inRange(r.date)).map((r) => ({
    id: r.id, item: r.item, farmer: r.farmerName, package: ctx.name(r.packageId), qty: `${formatNumber(r.qty)} ${r.unit}`, cost: r.cost, date: r.date, supplier: r.supplier,
    status: r.delivered ? 'Delivered' : 'Not delivered', basis: 'User-submitted',
  })).filter((r) => ctx.statusOk(r.status));
  const confirmed = sum(data.expenses.filter((e) => ctx.ids.has(e.packageId) && e.status === 'Confirmed' && ['Seeds and fertiliser', 'Crop protection'].includes(e.category)), (e) => e.amount);
  const byItem = {};
  rows.forEach((r) => { byItem[r.item] = (byItem[r.item] || 0) + r.cost; });
  return {
    kpis: [
      kpi('Input cost recorded', money(sum(rows, (r) => r.cost)), 'User-submitted', 'Entered by the cooperative'),
      kpi('Items delivered', rows.filter((r) => r.status === 'Delivered').length, 'User-submitted', 'Marked delivered by the cooperative'),
      kpi('Items not delivered', rows.filter((r) => r.status !== 'Delivered').length, 'User-submitted', 'Still outstanding'),
      kpi('Input spend confirmed', money(confirmed), 'Confirmed', 'Seeds, fertiliser and crop protection paid and confirmed'),
    ],
    chart: donut(Object.entries(byItem).map(([label, value]) => ({ label, value })), 'Recorded input cost by item', money),
    columns: [col('item', 'Item'), col('farmer', 'Farmer'), col('package', 'Package'), col('qty', 'Quantity'), col('cost', 'Cost', 'money'), col('date', 'Date', 'date'), col('supplier', 'Supplier'), col('status', 'Delivery', 'status'), col('basis', 'Basis', 'basis')],
    rows,
    notes: ['A delivery is only proven by a signed receipt or delivery note. Until then it is the cooperative\'s own record.'],
  };
}

function harvest(ctx) {
  const { data } = ctx;
  const rows = data.harvests.filter((h) => ctx.ids.has(h.packageId) && ctx.statusOk(h.status) && ctx.inRange(h.date)).map((h) => {
    const sales = data.sales.filter((s) => s.harvestId === h.id);
    const allConfirmed = sales.length > 0 && sales.every((s) => s.paymentStatus === 'Confirmed');
    return {
      id: h.id, crop: h.crop, package: ctx.name(h.packageId), date: h.date, expected: `${formatNumber(h.expectedQty)} ${h.unit}`, actual: h.actualQty ? `${formatNumber(h.actualQty)} ${h.unit}` : '-',
      status: h.status, gross: sum(sales, (s) => s.gross), payment: sales.length ? (allConfirmed ? 'Confirmed' : 'Under Reconciliation') : 'No sale yet', outstanding: sum(sales, (s) => s.outstanding),
      basis: h.status === 'Approved' && (sales.length === 0 || allConfirmed) ? 'Confirmed' : 'User-submitted', sales,
    };
  });
  const sales = rows.flatMap((r) => r.sales);
  const received = sum(sales.filter((s) => s.paymentStatus === 'Confirmed'), (s) => s.gross - (s.deductions || 0) - (s.outstanding || 0));
  const reconciling = sum(sales.filter((s) => s.paymentStatus !== 'Confirmed'), (s) => s.gross - (s.outstanding || 0));
  const outstanding = sum(sales, (s) => s.outstanding);
  return {
    kpis: [
      kpi('Harvests approved', rows.filter((r) => r.status === 'Approved').length, 'Confirmed', 'Checked by a reviewer'),
      kpi('Harvests awaiting review', rows.filter((r) => r.status !== 'Approved').length, 'User-submitted', 'Recorded, not yet approved'),
      kpi('Sale receipts confirmed', money(received), 'Confirmed', 'Net of deductions, confirmed and reconciled'),
      kpi('Sales under reconciliation', money(reconciling), 'User-submitted', 'Recorded sales, payment not yet confirmed'),
      kpi('Buyer balances outstanding', money(outstanding), 'User-submitted', 'Owed by buyers'),
    ],
    chart: donut([{ label: 'Confirmed receipts', value: received }, { label: 'Under reconciliation', value: reconciling }, { label: 'Buyer balance outstanding', value: outstanding }], 'Sales by payment state', money),
    columns: [
      col('crop', 'Crop'), col('package', 'Package'), col('date', 'Harvest date', 'date'), col('expected', 'Expected quantity', 'text', { basis: 'Estimate' }), col('actual', 'Actual quantity'), col('status', 'Harvest', 'status'),
      col('gross', 'Gross sales', 'money'), col('payment', 'Payment', 'status'), col('outstanding', 'Buyer balance', 'money'), col('basis', 'Basis', 'basis'),
    ],
    rows: rows.map(({ sales: _s, ...r }) => r),
    notes: ['A recorded sale is not money received until the payment is confirmed and reconciled.', 'A failed or reduced harvest is assessed on evidence. It is not treated as fraud.'],
  };
}

function unspent(ctx) {
  const { data } = ctx;
  const rows = ctx.pkgs.filter((p) => p.raised > 0 && ctx.statusOk(p.status) && ctx.inRange(p.createdAt)).map((p) => {
    const disbursed = sum(data.disbursements.filter((d) => d.packageId === p.id && d.status === 'Disbursed'), (d) => d.amount);
    return { id: p.id, name: p.name, status: p.status, raised: p.raised, awaiting: Math.max(0, p.committed - p.raised), disbursed, unspent: Math.max(0, p.raised - disbursed), used: percent(disbursed, p.raised), basis: 'Confirmed' };
  });
  return {
    kpis: [
      kpi('Confirmed received', money(sum(rows, (r) => r.raised)), 'Confirmed', 'Confirmed by the financial partner'),
      kpi('Disbursed', money(sum(rows, (r) => r.disbursed)), 'Confirmed', 'Payments marked Disbursed'),
      kpi('Unspent balance', money(sum(rows, (r) => r.unspent)), 'Confirmed', 'Received minus disbursed'),
      kpi('Committed, awaiting confirmation', money(sum(rows, (r) => r.awaiting)), 'User-submitted', 'Not received money yet'),
    ],
    chart: bars(rows.map((r) => ({ label: r.name, value: r.used })), 'Share of confirmed funds already disbursed'),
    columns: [col('name', 'Package'), col('status', 'Status', 'status'), col('raised', 'Confirmed received', 'money'), col('disbursed', 'Disbursed', 'money'), col('unspent', 'Unspent', 'money'), col('awaiting', 'Committed, not confirmed', 'money', { basis: 'User-submitted' }), col('used', 'Disbursed share', 'pct')],
    rows,
    notes: ['Unspent funds on a finished package must be reconciled and a final account submitted. Nothing is taken automatically.'],
  };
}

function obligations(ctx) {
  const { data, user } = ctx;
  const rows = [];
  data.obligations.filter((o) => ctx.ids.has(o.packageId)).forEach((o) => {
    const f = byId(data.farmers, o.farmerId);
    if (user.role === 'cooperative' && f && f.coopId !== user.orgId) return;
    rows.push({ id: o.id, kind: 'Farmer obligation', package: ctx.name(o.packageId), owedBy: f?.name || o.farmerId, owedTo: 'Cooperative and investors', detail: o.description, amount: o.amount ?? null, due: o.dueDate, status: o.status, basis: 'Estimate' });
  });
  data.distributions.filter((d) => ctx.ids.has(d.packageId) && d.status !== 'Confirmed').forEach((d) => {
    const pkg = byId(data.packages, d.packageId);
    rows.push({ id: d.id, kind: 'Investor distribution', package: ctx.name(d.packageId), owedBy: byId(data.cooperatives, pkg?.coopId)?.name || 'Cooperative', owedTo: byId(data.investors, d.investorId)?.name || d.investorId, detail: `${d.type}. ${d.basis}`, amount: d.amountDue - d.amountPaid, due: d.dueDate, status: d.status, basis: d.type === 'Profit distribution' ? 'Estimate' : 'Confirmed', principal: d.type !== 'Profit distribution' });
  });
  data.sales.filter((s) => ctx.ids.has(s.packageId) && s.outstanding > 0).forEach((s) => {
    const pkg = byId(data.packages, s.packageId);
    rows.push({ id: s.id, kind: 'Buyer balance', package: ctx.name(s.packageId), owedBy: s.buyer, owedTo: byId(data.cooperatives, pkg?.coopId)?.name || 'Cooperative', detail: `Sale ${s.ref}`, amount: s.outstanding, due: s.date, status: 'Outstanding', basis: 'User-submitted' });
  });
  const filtered = rows.filter((r) => ctx.statusOk(r.status) && ctx.inRange(r.due));
  const total = (pred) => sum(filtered.filter(pred), (r) => r.amount || 0);
  const byKind = {};
  filtered.forEach((r) => { byKind[r.kind] = (byKind[r.kind] || 0) + (r.amount || 0); });
  return {
    kpis: [
      kpi('Principal due to investors', money(total((r) => r.principal)), 'Confirmed', 'Fixed by the signed agreement'),
      kpi('Profit share expected', money(total((r) => r.kind === 'Investor distribution' && !r.principal)), 'Estimate', 'Depends on verified sales'),
      kpi('Buyer balances', money(total((r) => r.kind === 'Buyer balance')), 'User-submitted', 'Reported, awaiting confirmation'),
      kpi('Farmer obligations', filtered.filter((r) => r.kind === 'Farmer obligation').length, 'Estimate', 'Repayment or produce, not guaranteed'),
    ],
    chart: donut(Object.entries(byKind).map(([label, value]) => ({ label, value })), 'Outstanding money by type', money),
    columns: [col('kind', 'Type'), col('package', 'Package'), col('owedBy', 'Owed by'), col('owedTo', 'Owed to'), col('detail', 'Detail'), col('amount', 'Amount', 'money'), col('due', 'Due', 'date'), col('status', 'Status', 'status'), col('basis', 'Basis', 'basis')],
    rows: filtered,
    notes: ['An obligation in kind (for example produce delivery) has no naira amount. Repayment depends on the signed agreement and is never guaranteed regardless of the crop outcome.'],
  };
}

// ----- investor -----
function commitments(ctx) {
  const { data, user } = ctx;
  const rows = data.investments.filter((i) => i.investorId === user.orgId && ctx.ids.has(i.packageId) && ctx.statusOk(i.status) && ctx.inRange(i.dateInvested)).map((i) => ({
    id: i.id, ref: i.ref, package: ctx.name(i.packageId), intended: i.intended, committed: i.committed, confirmed: i.confirmed, available: i.available, disbursed: i.disbursed, repaid: i.repaid, status: i.status, pct: percent(i.confirmed, i.committed),
  }));
  const t = (k) => sum(rows, (r) => r[k]);
  return {
    kpis: [
      kpi('Intended to invest', money(t('intended')), 'User-submitted', 'Your own intention'),
      kpi('Formally committed', money(t('committed')), 'User-submitted', 'Not received money yet'),
      kpi('Confirmed received', money(t('confirmed')), 'Confirmed', 'Confirmed by the financial partner'),
      kpi('Disbursed to projects', money(t('disbursed')), 'Confirmed', 'Released after approval'),
      kpi('Repaid or distributed', money(t('repaid')), 'Confirmed', 'Paid back to you'),
    ],
    chart: bars(rows.map((r) => ({ label: r.package, value: r.pct })), 'Share of each commitment confirmed as received'),
    columns: [col('ref', 'Reference'), col('package', 'Package'), col('intended', 'Intended', 'money', { basis: 'User-submitted' }), col('committed', 'Committed', 'money', { basis: 'User-submitted' }), col('confirmed', 'Confirmed received', 'money', { basis: 'Confirmed' }), col('disbursed', 'Disbursed', 'money', { basis: 'Confirmed' }), col('repaid', 'Repaid', 'money', { basis: 'Confirmed' }), col('status', 'Status', 'status')],
    rows,
    notes: ['A commitment is not received money. A payment you start is never proof of receipt until the financial partner confirms it.'],
  };
}

function fundingStatus(ctx) {
  const rows = ctx.pkgs.filter((p) => ctx.statusOk(p.status) && ctx.inRange(p.createdAt)).map((p) => ({
    id: p.id, name: p.name, status: p.status, target: p.amount, raised: p.raised, committed: p.committed, pct: percent(p.raised, p.amount), closing: p.closingDate,
  }));
  return {
    kpis: [
      kpi('Funding targets', money(sum(rows, (r) => r.target)), 'User-submitted', 'Requested by cooperatives, approved by reviewers'),
      kpi('Confirmed received', money(sum(rows, (r) => r.raised)), 'Confirmed', 'Confirmed by the financial partner'),
      kpi('Committed, awaiting confirmation', money(sum(rows, (r) => Math.max(0, r.committed - r.raised))), 'User-submitted', 'Not received money yet'),
      kpi('Packages fully funded', rows.filter((r) => r.pct >= 100).length, 'Confirmed', 'Confirmed receipts reached the target'),
    ],
    chart: bars(rows.map((r) => ({ label: r.name, value: r.pct, tone: r.pct >= 100 ? 'green' : 'gold' })), 'Confirmed funding as a share of each target'),
    columns: [col('name', 'Package'), col('status', 'Status', 'status'), col('target', 'Target', 'money'), col('raised', 'Confirmed received', 'money', { basis: 'Confirmed' }), col('committed', 'Committed', 'money', { basis: 'User-submitted' }), col('pct', 'Funded', 'pct'), col('closing', 'Closing date', 'date')],
    rows,
    notes: ['If a package does not reach its minimum target, how the shortfall is handled follows the signed agreement.'],
  };
}

function disbursements(ctx) {
  const { data, user } = ctx;
  const maskFarmer = user.role === 'investor';
  const rows = data.disbursements.filter((d) => ctx.ids.has(d.packageId) && ctx.statusOk(d.status) && ctx.inRange(d.date)).map((d) => ({
    id: d.id, date: d.date, package: ctx.name(d.packageId), recipientType: d.recipientType,
    recipient: d.recipientType === 'Farmer' && maskFarmer ? `Farmer ${d.recipientId}` : d.recipientName, purpose: d.purpose, amount: d.amount, status: d.status, ref: d.ref,
    basis: d.status === 'Disbursed' ? 'Confirmed' : 'User-submitted',
  }));
  const paid = rows.filter((r) => r.status === 'Disbursed');
  const byType = {};
  paid.forEach((r) => { byType[r.recipientType] = (byType[r.recipientType] || 0) + r.amount; });
  return {
    kpis: [
      kpi('Disbursed', money(sum(paid, (r) => r.amount)), 'Confirmed', 'Approved and paid'),
      kpi('Awaiting approval', money(sum(rows.filter((r) => ['Pending', 'Reviewing'].includes(r.status)), (r) => r.amount)), 'User-submitted', 'Requested, not yet authorised'),
      kpi('Rejected requests', rows.filter((r) => r.status === 'Rejected').length, 'Confirmed', 'Not paid'),
      kpi('Payments in this report', rows.length, 'Confirmed', 'Each has a reference'),
    ],
    chart: donut(Object.entries(byType).map(([label, value]) => ({ label, value })), 'Disbursed amount by recipient type', money),
    columns: [col('date', 'Date', 'date'), col('package', 'Package'), col('recipientType', 'Recipient type'), col('recipient', 'Recipient'), col('purpose', 'Purpose'), col('amount', 'Amount', 'money'), col('status', 'Status', 'status'), col('ref', 'Reference'), col('basis', 'Basis', 'basis')],
    rows,
    notes: ['Payments are made by the financial partner after a reviewer and a payment approver agree. Farmer names are hidden from investors.'],
  };
}

function risks(ctx) {
  const { data } = ctx;
  const closed = (s) => ['Resolved', 'Closed'].includes(s);
  const rows = data.riskCases.filter((r) => ctx.ids.has(r.packageId) && ctx.statusOk(r.status) && ctx.inRange(r.raisedAt)).map((r) => {
    const hidden = MISUSE.includes(r.category) && ctx.role === 'investor';
    return { id: r.id, raised: r.raisedAt, package: ctx.name(r.packageId), category: r.category, severity: r.severity, status: r.status, summary: hidden ? 'Details withheld while the case is under review' : r.title, basis: closed(r.status) ? 'Confirmed' : 'User-submitted' };
  });
  const byCat = {};
  rows.forEach((r) => { byCat[r.category] = (byCat[r.category] || 0) + 1; });
  return {
    kpis: [
      kpi('Open cases', rows.filter((r) => !closed(r.status)).length, 'User-submitted', 'Reported, being reviewed'),
      kpi('High severity', rows.filter((r) => r.severity === 'High').length, 'User-submitted', 'Needs prompt review'),
      kpi('Genuine crop failure', rows.filter((r) => r.category === 'Genuine crop failure').length, 'Confirmed', 'Assessed on evidence. Not fraud'),
      kpi('Packages affected', new Set(rows.map((r) => r.package)).size, 'Confirmed', 'With at least one case'),
    ],
    chart: donut(Object.entries(byCat).map(([label, value]) => ({ label, value })), 'Cases by category'),
    columns: [col('raised', 'Raised', 'date'), col('package', 'Package'), col('category', 'Category'), col('severity', 'Severity', 'status'), col('status', 'Status', 'status'), col('summary', 'Summary'), col('basis', 'Basis', 'basis')],
    rows,
    notes: ['A case is a review, not a finding. A missed deadline or a failed harvest never labels a person as fraudulent.'],
  };
}

function distributions(ctx) {
  const { data, user } = ctx;
  const rows = data.distributions.filter((d) => d.investorId === user.orgId && ctx.ids.has(d.packageId) && ctx.statusOk(d.status) && ctx.inRange(d.dueDate)).map((d) => ({
    id: d.id, ref: d.ref, package: ctx.name(d.packageId), type: d.type, due: d.dueDate, amountDue: d.amountDue, paid: d.amountPaid, outstanding: d.amountDue - d.amountPaid, status: d.status,
    basis: d.status === 'Confirmed' || d.type !== 'Profit distribution' ? 'Confirmed' : 'Estimate',
  }));
  return {
    kpis: [
      kpi('Paid and confirmed', money(sum(rows, (r) => r.paid)), 'Confirmed', 'Confirmed by the financial partner'),
      kpi('Principal still due', money(sum(rows.filter((r) => r.type !== 'Profit distribution'), (r) => r.outstanding)), 'Confirmed', 'Fixed by the signed agreement'),
      kpi('Profit share expected', money(sum(rows.filter((r) => r.type === 'Profit distribution'), (r) => r.outstanding)), 'Estimate', 'Depends on verified sales. Not guaranteed'),
      kpi('Overdue items', rows.filter((r) => r.status === 'Overdue').length, 'Confirmed', 'Past the due date'),
    ],
    chart: bars(rows.filter((r) => r.amountDue > 0).map((r) => ({ label: `${short(r.package, 8)} ${r.type === 'Profit distribution' ? 'P' : 'R'}`, value: percent(r.paid, r.amountDue) })), 'Share of each amount due that has been paid (R repayment, P profit)'),
    columns: [col('ref', 'Reference'), col('package', 'Package'), col('type', 'Type'), col('due', 'Due', 'date'), col('amountDue', 'Amount due', 'money'), col('paid', 'Paid', 'money', { basis: 'Confirmed' }), col('outstanding', 'Outstanding', 'money'), col('status', 'Status', 'status'), col('basis', 'Basis of amount due', 'basis')],
    rows,
    notes: ['Repayment of capital is never the same thing as profit. Profit figures are estimates until the sale is confirmed and the calculation is reviewed.'],
  };
}

// ----- admin -----
function usersCoops(ctx) {
  const { data } = ctx;
  const rows = [];
  data.cooperatives.forEach((c) => rows.push({ id: c.id, kind: 'Cooperative', name: c.name, place: `${c.lga}, ${c.state}`, status: c.status, date: c.verifiedAt || '' }));
  data.investors.forEach((i) => rows.push({ id: i.id, kind: 'Investor', name: i.name, place: i.location, status: i.status, date: i.verifiedAt || '' }));
  data.userVerification.filter((u) => u.role === 'farmer').forEach((u) => rows.push({ id: u.id, kind: 'Farmer (pending)', name: u.name, place: '-', status: u.status, date: u.submittedAt }));
  const out = rows.filter((r) => ctx.statusOk(r.status) && ctx.inRange(r.date)).map((r) => ({ ...r, basis: 'Confirmed' }));
  const verified = (k) => data[k].filter((x) => x.status === 'Verified').length;
  const farmersVerified = data.farmers.filter((f) => f.identityStatus === 'Verified' && f.status !== 'Removed').length;
  const byStatus = {};
  data.cooperatives.forEach((c) => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
  return {
    kpis: [
      kpi('Cooperatives verified', `${verified('cooperatives')} of ${data.cooperatives.length}`, 'Confirmed', 'Reviewed by an administrator'),
      kpi('Investors verified', `${verified('investors')} of ${data.investors.length}`, 'Confirmed', 'Identity and eligibility checked'),
      kpi('Farmers with verified identity', `${farmersVerified} of ${data.farmers.filter((f) => f.status !== 'Removed').length}`, 'Confirmed', 'Active farmer records'),
      kpi('Waiting in the verification queue', data.userVerification.length, 'User-submitted', 'Submitted, not yet decided'),
    ],
    chart: donut(Object.entries(byStatus).map(([label, value]) => ({ label, value })), 'Cooperatives by verification status'),
    columns: [col('kind', 'Type'), col('name', 'Name'), col('place', 'Location'), col('status', 'Status', 'status'), col('date', 'Verified or submitted', 'date'), col('basis', 'Basis', 'basis')],
    rows: out,
    notes: ['Only verified cooperatives and investors can take part in funding. Rejected or suspended accounts are listed with their status.'],
  };
}

function projectsStatus(ctx) {
  const rows = ctx.pkgs.filter((p) => ctx.statusOk(p.status) && ctx.inRange(p.createdAt)).map((p) => ({
    id: p.id, name: p.name, coop: ctx.data.cooperatives.find((c) => c.id === p.coopId)?.name || p.coopId, status: p.status, requested: p.amount, raised: p.raised, created: p.createdAt,
  }));
  const n = (...s) => rows.filter((r) => s.includes(r.status)).length;
  const byStatus = {};
  rows.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
  return {
    kpis: [
      kpi('Submitted or under review', n('Submitted', 'Under Review', 'Changes Requested'), 'Confirmed', 'Waiting for a reviewer'),
      kpi('Approved or open for funding', n('Approved', 'Open for Funding', 'Funding Target Reached', 'Ready for Disbursement'), 'Confirmed', 'Approval is not a guarantee of success'),
      kpi('Active', n('Active'), 'Confirmed', 'Money is being released in tranches'),
      kpi('Completed', n('Completed'), 'Confirmed', 'Final accounts are being closed'),
      kpi('Paused or suspended', n('Paused', 'Failed or Terminated'), 'Confirmed', 'New disbursements are stopped'),
    ],
    chart: donut(Object.entries(byStatus).map(([label, value]) => ({ label, value })), 'Projects by status'),
    columns: [col('name', 'Package'), col('coop', 'Cooperative'), col('status', 'Status', 'status'), col('requested', 'Funding requested', 'money', { basis: 'User-submitted' }), col('raised', 'Confirmed received', 'money', { basis: 'Confirmed' }), col('created', 'Created', 'date')],
    rows,
    notes: ['The count of projects by status is a platform record. The amount requested is the cooperative\'s own request.'],
  };
}

function commitmentsReceipts(ctx) {
  const { data } = ctx;
  const rows = ctx.pkgs.filter((p) => (p.committed > 0 || p.raised > 0) && ctx.statusOk(p.status) && ctx.inRange(p.createdAt)).map((p) => ({
    id: p.id, name: p.name, status: p.status, committed: p.committed, raised: p.raised, gap: Math.max(0, p.committed - p.raised), pct: percent(p.raised, p.committed), investors: p.investorsCount,
  }));
  const exceptions = data.reconciliation.filter((r) => ctx.ids.has(r.packageId) && r.type === 'Investor receipt' && r.status !== 'Confirmed').length;
  return {
    kpis: [
      kpi('Total committed', money(sum(rows, (r) => r.committed)), 'User-submitted', 'Formal commitments, not received money'),
      kpi('Confirmed receipts', money(sum(rows, (r) => r.raised)), 'Confirmed', 'Confirmed by the financial partner'),
      kpi('Awaiting confirmation', money(sum(rows, (r) => r.gap)), 'User-submitted', 'Committed minus confirmed'),
      kpi('Receipt exceptions', exceptions, 'Confirmed', 'Investor receipts not yet confirmed'),
    ],
    chart: bars(rows.map((r) => ({ label: r.name, value: r.pct })), 'Share of commitments confirmed as received'),
    columns: [col('name', 'Package'), col('status', 'Status', 'status'), col('committed', 'Committed', 'money', { basis: 'User-submitted' }), col('raised', 'Confirmed received', 'money', { basis: 'Confirmed' }), col('gap', 'Awaiting confirmation', 'money'), col('pct', 'Confirmed share', 'pct'), col('investors', 'Investors', 'number')],
    rows,
    notes: ['A commitment is not received money. Only a confirmation from the financial partner turns a commitment into funds that can be disbursed.'],
  };
}

function disbursedReconciled(ctx) {
  const { data } = ctx;
  const rows = data.reconciliation.filter((r) => ctx.ids.has(r.packageId) && ctx.statusOk(r.status) && ctx.inRange(r.reconciledAt)).map((r) => ({
    id: r.id, ref: r.ref, package: ctx.name(r.packageId), type: r.type, internal: r.internal, provider: r.provider, diff: r.internal - r.provider, status: r.status, basis: r.status === 'Confirmed' ? 'Confirmed' : 'User-submitted', note: r.note,
  }));
  const paid = sum(data.disbursements.filter((d) => ctx.ids.has(d.packageId) && d.status === 'Disbursed' && ctx.inRange(d.date)), (d) => d.amount);
  const reconciledOut = sum(rows.filter((r) => r.type.startsWith('Disbursement') && r.status === 'Confirmed'), (r) => r.internal);
  const open = rows.filter((r) => r.status !== 'Confirmed');
  const byStatus = {};
  rows.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + r.internal; });
  return {
    kpis: [
      kpi('Disbursed (approved)', money(paid), 'Confirmed', 'Approved by administrators. Partner matching is shown below'),
      kpi('Reconciled disbursements', money(reconciledOut), 'Confirmed', 'Matched to the partner report'),
      kpi('Open reconciliation items', open.length, 'Confirmed', 'Pending, failed or under reconciliation'),
      kpi('Amount in open items', money(sum(open, (r) => r.internal)), 'Confirmed', 'Recorded by the platform, not yet matched to the partner'),
    ],
    chart: donut(Object.entries(byStatus).map(([label, value]) => ({ label, value })), 'Reconciliation records by status (internal amount)', money),
    columns: [col('ref', 'Reference'), col('package', 'Package'), col('type', 'Type'), col('internal', 'Internal', 'money'), col('provider', 'Partner', 'money'), col('diff', 'Difference', 'money'), col('status', 'Status', 'status'), col('note', 'Note'), col('basis', 'Basis', 'basis')],
    rows,
    notes: ['A payment is never marked successful without reliable confirmation. A difference is corrected with a new entry. The original record stays.'],
  };
}

function delays(ctx) {
  const { data } = ctx;
  const rows = data.milestones.filter((m) => ctx.ids.has(m.packageId) && m.status !== 'Approved' && (m.status === 'Delayed' || (m.dueDate && new Date(m.dueDate) < DEMO_NOW)) && ctx.statusOk(m.status) && ctx.inRange(m.dueDate)).map((m) => ({
    id: m.id, name: m.title, package: ctx.name(m.packageId), due: m.dueDate, days: ageInDays(m.dueDate), status: m.status, submitted: m.submittedAt || '', basis: 'Confirmed',
  }));
  const byPkg = {};
  rows.forEach((r) => { byPkg[r.package] = (byPkg[r.package] || 0) + 1; });
  return {
    kpis: [
      kpi('Delayed milestones', rows.filter((r) => r.status === 'Delayed').length, 'Confirmed', 'No evidence by the due date'),
      kpi('Late but under review', rows.filter((r) => r.status === 'Under Review').length, 'User-submitted', 'Submitted after the due date'),
      kpi('Longest delay', `${Math.max(0, ...rows.map((r) => r.days))} days`, 'Confirmed', 'Days past the due date'),
      kpi('Packages affected', Object.keys(byPkg).length, 'Confirmed', 'With at least one late milestone'),
    ],
    chart: bars(rows.map((r) => ({ label: r.name, value: r.days, tone: r.days > 7 ? 'gold' : 'green' })), 'Days past the due date', ' d'),
    columns: [col('name', 'Milestone'), col('package', 'Package'), col('due', 'Due', 'date'), col('days', 'Days late', 'number'), col('status', 'Status', 'status'), col('submitted', 'Evidence submitted', 'date'), col('basis', 'Basis', 'basis')],
    rows,
    notes: ['A delay is a project management matter. It is not treated as misuse. The cooperative is told and can respond.'],
  };
}

function disputes(ctx) {
  const { data } = ctx;
  const rows = [];
  data.complaints.forEach((c) => rows.push({ id: c.id, kind: 'Complaint', ref: c.ref, package: ctx.name(c.packageId), category: c.category, status: c.status, date: c.createdAt, owner: c.assignee, basis: c.status === 'Resolved' ? 'Confirmed' : 'User-submitted' }));
  data.riskCases.filter((r) => MISUSE.includes(r.category) || r.category === 'Genuine crop failure' || r.category === 'Disputed expense').forEach((r) => rows.push({ id: r.id, kind: 'Risk case', ref: r.id, package: ctx.name(r.packageId), category: r.category, status: r.status, date: r.raisedAt, owner: r.owner, basis: 'User-submitted' }));
  const out = rows.filter((r) => ctx.statusOk(r.status) && ctx.inRange(r.date) && (!ctx.params.pkg || data.packages.find((p) => p.name === r.package)?.id === ctx.params.pkg));
  const byCat = {};
  out.forEach((r) => { byCat[r.category] = (byCat[r.category] || 0) + 1; });
  return {
    kpis: [
      kpi('Open complaints', data.complaints.filter((c) => c.status !== 'Resolved').length, 'User-submitted', 'Reported, not yet resolved'),
      kpi('Escalated', out.filter((r) => r.status === 'Escalated').length, 'User-submitted', 'With a senior reviewer'),
      kpi('Suspected misuse cases', out.filter((r) => r.kind === 'Risk case' && MISUSE.includes(r.category)).length, 'User-submitted', 'Allegations, not findings'),
      kpi('Genuine crop failure', out.filter((r) => r.category === 'Genuine crop failure').length, 'Confirmed', 'Assessed on evidence. Not fraud'),
    ],
    chart: donut(Object.entries(byCat).map(([label, value]) => ({ label, value })), 'Disputes and cases by category'),
    columns: [col('kind', 'Type'), col('ref', 'Reference'), col('package', 'Package'), col('category', 'Category'), col('status', 'Status', 'status'), col('date', 'Raised', 'date'), col('owner', 'Reviewer'), col('basis', 'Basis', 'basis')],
    rows: out,
    notes: ['Never label a person fraudulent from a complaint, a missed deadline or a failed harvest. Cases follow separate review paths and are classified on evidence.'],
  };
}

function activity(ctx) {
  const { data } = ctx;
  const entries = data.audit.filter((a) => ctx.inRange(a.at));
  const days = {};
  entries.forEach((a) => {
    const d = String(a.at).slice(0, 10);
    days[d] = days[d] || { date: d, total: 0, admin: 0, cooperative: 0, investor: 0, farmer: 0, system: 0 };
    days[d].total += 1;
    days[d][a.role] = (days[d][a.role] || 0) + 1;
  });
  const rows = Object.values(days).sort((a, b) => (a.date < b.date ? 1 : -1)).map((r) => ({ ...r, id: r.date, basis: 'Confirmed' }));
  const chartRows = [...rows].reverse().slice(-10);
  return {
    kpis: [
      kpi('Audit entries', entries.length, 'Confirmed', 'Append only record'),
      kpi('Different actors', new Set(entries.map((a) => a.actor)).size, 'Confirmed', 'People and systems'),
      kpi('Notifications sent', data.notifications.length, 'Confirmed', 'In-app messages'),
      kpi('Complaints raised', data.complaints.filter((c) => ctx.inRange(c.createdAt)).length, 'User-submitted', 'Reported by users'),
    ],
    chart: chartRows.length ? { kind: 'line', title: 'Audit entries per day', labels: chartRows.map((r) => formatDateShort(r.date).slice(0, -5)), series: [{ name: 'Entries', color: '#305d41', values: chartRows.map((r) => r.total) }] } : null,
    columns: [col('date', 'Day', 'date'), col('total', 'Entries', 'number'), col('admin', 'Administrators', 'number'), col('cooperative', 'Cooperatives', 'number'), col('investor', 'Investors', 'number'), col('farmer', 'Farmers', 'number'), col('system', 'System', 'number'), col('basis', 'Basis', 'basis')],
    rows,
    notes: ['These numbers come from the audit log. They count recorded actions, not logins or page views.'],
  };
}

function variances(ctx) {
  const { data } = ctx;
  const rows = [];
  data.milestones.filter((m) => ctx.ids.has(m.packageId) && !m.submittedAt && m.dueDate && new Date(m.dueDate) < DEMO_NOW).forEach((m) => rows.push({ id: m.id, issue: 'Missing report', package: ctx.name(m.packageId), detail: `${m.title}: no evidence submitted`, amount: null, since: m.dueDate, status: 'Open', basis: 'Confirmed' }));
  data.harvests.filter((h) => ctx.ids.has(h.packageId) && h.status === 'Pending' && !h.evidence).forEach((h) => rows.push({ id: h.id, issue: 'Missing report', package: ctx.name(h.packageId), detail: `${h.crop}: harvest not recorded`, amount: null, since: '', status: 'Open', basis: 'Confirmed' }));
  data.reconciliation.filter((r) => ctx.ids.has(r.packageId) && r.internal !== r.provider).forEach((r) => rows.push({ id: r.id, issue: 'Unexplained variance', package: ctx.name(r.packageId), detail: `${r.type}. ${r.note || 'No note'}`, amount: Math.abs(r.internal - r.provider), since: r.reconciledAt || '', status: r.status, basis: r.status === 'Confirmed' ? 'Confirmed' : 'User-submitted' }));
  data.expenses.filter((e) => ctx.ids.has(e.packageId) && e.status === 'Pending').forEach((e) => rows.push({ id: e.id, issue: 'Unconfirmed expense', package: ctx.name(e.packageId), detail: e.description, amount: e.amount, since: e.date, status: e.status, basis: 'User-submitted' }));
  const out = rows.filter((r) => ctx.statusOk(r.status) && ctx.inRange(r.since));
  const byIssue = {};
  out.forEach((r) => { byIssue[r.issue] = (byIssue[r.issue] || 0) + 1; });
  return {
    kpis: [
      kpi('Missing reports', out.filter((r) => r.issue === 'Missing report').length, 'Confirmed', 'Past due with nothing submitted'),
      kpi('Unexplained variances', out.filter((r) => r.issue === 'Unexplained variance').length, 'Confirmed', 'Internal and partner amounts differ'),
      kpi('Variance amount', money(sum(out.filter((r) => r.issue === 'Unexplained variance'), (r) => r.amount || 0)), 'Confirmed', 'Absolute difference'),
      kpi('Unconfirmed expenses', out.filter((r) => r.issue === 'Unconfirmed expense').length, 'User-submitted', 'Recorded, not confirmed'),
    ],
    chart: donut(Object.entries(byIssue).map(([label, value]) => ({ label, value })), 'Items needing follow up'),
    columns: [col('issue', 'Issue'), col('package', 'Package'), col('detail', 'Detail'), col('amount', 'Amount', 'money'), col('since', 'Since', 'date'), col('status', 'Status', 'status'), col('basis', 'Basis', 'basis')],
    rows: out,
    notes: ['A variance is a question to be answered. A correction is a new entry, and the original record stays.'],
  };
}

// ============ catalogues ============
const D = (id, title, desc, icon, build, statuses, noPkg = false) => ({ id, title, desc, icon, build, statuses, noPkg });

const S_PKG = ['Draft', 'Submitted', 'Under Review', 'Changes Requested', 'Approved', 'Open for Funding', 'Funding Target Reached', 'Active', 'Completed'];
const S_MS = ['Not Started', 'Under Review', 'Approved', 'Delayed'];
const S_DIS = ['Pending', 'Reviewing', 'Disbursed', 'Rejected'];
const S_OBL = ['Pending', 'Overdue', 'Outstanding'];

export const CATALOGUE = {
  cooperative: [
    D('budgets', 'Budgets and spending', 'Approved budgets, tranches released and money spent, package by package.', Wallet, budgets, S_PKG),
    D('allocations', 'Farmer allocations', 'Who is allocated support, how much, and whether identity and agreement are ready.', Users, allocations, ['Signed', 'Awaiting Signature', 'Not Signed']),
    D('milestones', 'Milestone progress', 'Milestones by status with the evidence submitted and verified.', Flag, milestones, S_MS),
    D('inputs', 'Input delivery and usage', 'Inputs recorded against farmers, delivery status and confirmed input spend.', Sprout, inputs, ['Delivered', 'Not delivered']),
    D('harvest', 'Harvest and sales', 'Expected and actual harvest, sales recorded and payments confirmed.', Wheat, harvest, ['Pending', 'Under Review', 'Approved']),
    D('unspent', 'Unspent balances', 'Confirmed funds received against what has been disbursed.', PiggyBank, unspent, S_PKG),
    D('obligations', 'Outstanding obligations', 'Repayments, distributions and buyer balances still to be settled.', Scale, obligations, S_OBL),
  ],
  investor: [
    D('commitments', 'Committed and confirmed amounts', 'Your six amounts side by side: intended, committed, confirmed, available, disbursed and repaid.', CircleDollarSign, commitments, ['Pending', 'Active', 'Completed', 'Overdue', 'Repaid']),
    D('funding-status', 'Funding status', 'How far each package you fund has reached its target.', TrendingUp, fundingStatus, S_PKG),
    D('disbursements', 'Disbursements and approved expenses', 'Payments released for your packages and who approved them.', Banknote, disbursements, S_DIS),
    D('progress', 'Project progress', 'Milestones and evidence for the packages you fund.', Flag, milestones, S_MS),
    D('risks', 'Material risks and incidents', 'Cases raised on your packages. A case is a review, not a finding.', AlertTriangle, risks, ['Open', 'Under Review', 'Awaiting Response', 'Escalated']),
    D('harvest', 'Harvest and sales', 'Verified harvest and sales for your packages.', Wheat, harvest, ['Pending', 'Under Review', 'Approved']),
    D('distributions', 'Repayments and distributions', 'What is due, paid and outstanding to you under each agreement.', Landmark, distributions, ['Pending', 'Confirmed', 'Overdue']),
  ],
  admin: [
    D('users', 'Registered users and verified cooperatives', 'Verification progress for cooperatives, investors and farmers.', UserCheck, usersCoops, ['Verified', 'Under Review', 'Submitted', 'Additional Information Required'], true),
    D('projects', 'Projects by status', 'Submitted, approved, active, completed and suspended projects.', FolderKanban, projectsStatus, S_PKG),
    D('commitments', 'Commitments vs confirmed receipts', 'What investors committed against what the partner has confirmed.', GitCompareArrows, commitmentsReceipts, S_PKG),
    D('reconciled', 'Disbursed vs reconciled', 'Payments made against the partner reconciliation.', Scale, disbursedReconciled, ['Confirmed', 'Under Reconciliation', 'Pending', 'Failed']),
    D('obligations', 'Outstanding obligations', 'Repayments, distributions and buyer balances still to be settled.', Banknote, obligations, S_OBL),
    D('delays', 'Milestone delays', 'Milestones past their due date and how late they are.', Timer, delays, ['Delayed', 'Under Review', 'Not Started']),
    D('disputes', 'Disputes and suspected misuse', 'Complaints and cases. Allegations are never findings.', MessageSquareWarning, disputes, ['Open', 'Under Review', 'Awaiting Response', 'Resolved', 'Escalated']),
    D('activity', 'Platform activity', 'Recorded actions by day and by role.', Activity, activity, null, true),
    D('variances', 'Missing reports and unexplained variances', 'Projects with overdue reports, differing amounts or unconfirmed spending.', SearchX, variances, ['Open', 'Pending', 'Under Reconciliation', 'Failed', 'Confirmed']),
  ],
};

export function catalogueFor(role) {
  return CATALOGUE[role] || [];
}

export const REPORT_FALLBACK_ICON = Landmark;
