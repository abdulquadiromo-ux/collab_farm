// Farmer portal data layer (group `farm`). Everything is derived from the store through useApp().
// A farmer only ever sees their own record: data.farmers.find(f => f.id === user.farmerId).
//
// Known seed quirks handled here (reported to the integrator):
// - The seed farmer record for f-003 is not named like the demo user (Aisha Bello) and has no allocation,
//   while the contract, inputs, obligations and disbursements for f-003 all belong to Aisha on pkg-1.
//   So the display name comes from the signed in user and the package is resolved from the farmer's own
//   allocation, then their agreement, then their obligations, then their input records.
// - No per-farmer allocation record exists in the store, so the approved amount is the farmer's
//   `allocatedAmount` when set, otherwise the value of their inputs plus a small illustrative cash support.

import { useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { sum } from '../../utils/rules.js';

// The demo clock is fixed (same base as relativeTime in utils/format.js) so due dates stay stable.
export const TODAY = new Date('2026-10-30T12:30:00');
export const TODAY_ISO = '2026-10-30';
const DAY_MS = 86400000;

// Illustrative cash support for labour when the store holds no per-farmer cash amount.
export const SAMPLE_LABOUR_SUPPORT = 90000;

export const isoNow = () => new Date().toISOString();

export function daysFromToday(isoDate) {
  if (!isoDate) return null;
  const d = new Date(`${String(isoDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d - TODAY) / DAY_MS);
}

export function dueText(isoDate) {
  const n = daysFromToday(isoDate);
  if (n === null) return 'No date set';
  if (n === 0) return 'Due today';
  if (n === 1) return 'Due tomorrow';
  if (n > 1) return `Due in ${n} days`;
  if (n === -1) return 'Was due yesterday';
  return `Was due ${Math.abs(n)} days ago`;
}

export function maskNin(nin = '') {
  const s = String(nin);
  if (!s) return 'Not provided';
  return `${'*'.repeat(Math.max(0, s.length - 3))}${s.slice(-3)}`;
}

export function lastDigits(text = '') {
  const m = /(\d{3,4})\s*$/.exec(String(text));
  return m ? m[1] : null;
}

export function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

// ---------- activities ----------

// Per-farmer tasks are generated locally. Each one is paired, in order, with a milestone of the allocated package.
export const TASK_TEMPLATES = [
  { key: 'land', title: 'Prepare your land', detail: 'Clear, plough and ridge your plot so it is ready for planting.' },
  { key: 'plant', title: 'Plant your crop', detail: 'Plant with the seeds you received and add fertiliser as advised.' },
  // The 5 November date comes from the seeded notification "Submit a crop maintenance progress report by 5 November".
  { key: 'maintain', title: 'Look after your crop', detail: 'Weed, add fertiliser and protect the crop from pests. Send a progress report.', farmerDue: '2026-11-05' },
  { key: 'harvest', title: 'Harvest and store your crop', detail: 'Harvest, weigh and store your crop. Then tell us how much you harvested.' },
];

// Sample history for the demo farmer so feedback can be seen. They are shown only when the milestone exists.
const SAMPLE_REPORTS = [
  { id: 'fr-sample-1', farmerId: 'f-003', milestoneId: 'ms-1', activity: 'Prepare your land', note: 'I ploughed and ridged my plot. It is about 4 acres.', photos: ['ridged-plot.jpg'], gps: '', submittedAt: '2026-06-02T10:00:00', reportStatus: 'Accepted', feedback: 'Thank you. Your photo matches the inspection report.', feedbackBy: 'Green Fields Cooperative', sample: true },
  { id: 'fr-sample-2', farmerId: 'f-003', milestoneId: 'ms-2', activity: 'Plant your crop', note: 'I planted 500 yam setts and applied 4 bags of NPK fertiliser.', photos: ['planting-day.jpg'], gps: '8.9420, 7.0830', submittedAt: '2026-06-23T09:15:00', reportStatus: 'Accepted', feedback: 'Well done. The numbers match your input record.', feedbackBy: 'Green Fields Cooperative', sample: true },
];

const toReport = (e, m) => ({
  id: e.id,
  milestoneId: m.id,
  milestoneTitle: m.title,
  activity: e.activity || m.title,
  activityKey: e.activityKey || '',
  note: e.note || '',
  gps: e.gps || '',
  photos: e.photos || (e.name ? [e.name] : []),
  submittedAt: e.submittedAt || '',
  status: e.reportStatus || (e.verified ? 'Accepted' : 'Submitted'),
  feedback: e.feedback || '',
  feedbackBy: e.feedbackBy || '',
  sample: !!e.sample,
});

function collectReports(milestones, farmerId) {
  const out = [];
  milestones.forEach((m) => (m.evidence || []).forEach((e) => {
    if (e.type === 'Farmer progress report' && e.farmerId === farmerId) out.push(toReport(e, m));
  }));
  SAMPLE_REPORTS.forEach((s) => {
    const m = milestones.find((x) => x.id === s.milestoneId);
    if (m && s.farmerId === farmerId && !out.some((r) => r.id === s.id)) out.push(toReport(s, m));
  });
  return out.sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
}

function buildTasks(milestones, reports, harvestReports) {
  const count = milestones.length || TASK_TEMPLATES.length;
  const rows = Array.from({ length: count }, (_, i) => {
    const tpl = TASK_TEMPLATES[i];
    const m = milestones[i] || null;
    const rs = m ? reports.filter((r) => r.milestoneId === m.id) : [];
    const latest = rs[0] || null;
    const key = tpl ? tpl.key : `step-${i + 1}`;
    const dueDate = tpl?.farmerDue && m?.status !== 'Approved' ? tpl.farmerDue : (m?.dueDate || null);
    let status;
    if (m?.status === 'Approved' || latest?.status === 'Accepted') status = 'Completed';
    else if (latest?.status === 'More information needed') status = 'More information needed';
    else if (latest) status = 'Under Review';
    else if (key === 'harvest' && harvestReports.length) status = 'Under Review';
    else status = null;
    return {
      key,
      title: tpl ? tpl.title : (m?.title || `Step ${i + 1}`),
      detail: tpl ? tpl.detail : (m?.description || ''),
      dueDate,
      milestone: m,
      reports: rs,
      latest,
      status,
    };
  });
  let currentSet = false;
  rows.forEach((t) => {
    if (t.status) { if (t.status !== 'Completed' && !currentSet) currentSet = true; return; }
    const late = t.milestone?.status === 'Delayed' || (daysFromToday(t.dueDate) ?? 1) < 0;
    if (late) { t.status = 'Delayed'; currentSet = true; } else if (!currentSet) { t.status = 'In Progress'; currentSet = true; } else t.status = 'Not Started';
  });
  return rows;
}

// ---------- harvest planning ----------

const CROP_WORDS = ['Yam', 'Maize', 'Rice', 'Cassava', 'Groundnut', 'Tomato', 'Wheat', 'Spinach', 'Potatoes'];
// Planning figures in kg per acre. They are illustrative estimates, never promises.
const KG_PER_ACRE = { Yam: 500, Maize: 400, Rice: 450, Cassava: 800, Groundnut: 300, Tomato: 700, Wheat: 350, Spinach: 250, Potatoes: 600 };

function cropOf(pkg, farmer) {
  const text = `${pkg?.name || ''} ${pkg?.description || ''}`.toLowerCase();
  return CROP_WORDS.find((c) => text.includes(c.toLowerCase())) || farmer.cropType || 'Crop';
}

const parseKg = (text = '') => {
  const m = /(\d[\d,.]*)\s*kg/i.exec(text);
  return m ? Number(m[1].replace(/,/g, '')) : 0;
};
const DONE = ['paid', 'completed', 'confirmed', 'repaid', 'delivered', 'settled'];
export const obligationDone = (o) => DONE.includes(String(o.status).toLowerCase());

function summariseObligations(obligations) {
  const repayments = obligations.filter((o) => o.type === 'Repayment');
  const produce = obligations.filter((o) => o.type === 'Produce delivery');
  const repayDue = sum(repayments, (o) => o.amount);
  const repaid = sum(repayments.filter(obligationDone), (o) => o.amount);
  const produceDueKg = sum(produce, (o) => parseKg(o.description));
  const produceDoneKg = sum(produce.filter(obligationDone), (o) => parseKg(o.description));
  return { repayDue, repaid, repayOutstanding: Math.max(0, repayDue - repaid), produceDueKg, produceDoneKg, produceOutstandingKg: Math.max(0, produceDueKg - produceDoneKg) };
}

// ---------- allocation ----------

function buildAllocation({ farmer, pkg, inputs, payments, milestones }) {
  if (!pkg) return null;
  const items = inputs.filter((i) => i.packageId === pkg.id);
  const inKindValue = sum(items, (i) => i.cost);
  const inKindReceived = sum(items.filter((i) => i.delivered || i.farmerConfirmed), (i) => i.cost);
  const base = Number(farmer.allocatedAmount) || 0;
  const cashPlanned = base > 0 ? Math.max(0, base - inKindValue) : SAMPLE_LABOUR_SUPPORT;
  const approved = base > 0 ? Math.max(base, inKindValue) : inKindValue + cashPlanned;
  const cashPayments = payments.filter((p) => p.packageId === pkg.id);
  const cashPaid = sum(cashPayments.filter((p) => p.status === 'Disbursed'), (p) => p.amount);
  const delivered = inKindReceived + cashPaid;
  const funded = ['Active', 'Completed', 'Ready for Disbursement', 'Funding Target Reached'].includes(pkg.status);
  const next = milestones.find((m) => m.status !== 'Approved' && (daysFromToday(m.dueDate) ?? -1) >= 0);
  return {
    pkgId: pkg.id,
    approved,
    inKindValue,
    inKindReceived,
    cashPlanned,
    cashPaid,
    delivered,
    outstanding: Math.max(0, approved - delivered),
    pct: approved ? Math.min(100, Math.round((delivered / approved) * 100)) : 0,
    approval: funded ? 'Approved' : 'Pending',
    expectedDate: next?.dueDate || pkg.endDate || null,
    expectedStage: next?.title || '',
    purpose: `${pkg.name}: ${(pkg.inclusions || []).map((x) => x.item.toLowerCase()).join(', ') || 'farming inputs and labour support'}`,
    items,
  };
}

// ---------- next step ----------

export function getNextStep(ctx) {
  const { pkg, tasks, reports, inputs, payments, identityVerified, agreementSigned } = ctx;
  if (!agreementSigned) {
    return { key: 'sign', title: 'Sign your agreement', text: 'Read it in plain words, then sign with your name. You cannot get support until it is signed.', cta: 'Read and sign', to: '/farmer/agreement' };
  }
  if (!identityVerified) {
    return { key: 'identity', title: 'Finish your ID check', text: 'Upload a clear photo of your ID so CollabFarm can finish checking who you are.', cta: 'Upload my ID', to: '/farmer/profile?section=identity' };
  }
  if (!pkg) {
    return { key: 'wait', title: 'Wait for your cooperative', text: 'Your cooperative will give you support once the project is funded. We will tell you here.', cta: 'See my allocation', to: '/farmer/allocation' };
  }
  const moreInfo = reports.find((r) => r.status === 'More information needed');
  if (moreInfo) {
    return { key: 'moreinfo', title: 'Add what your cooperative asked for', text: `Your report "${moreInfo.activity}" needs a little more information.`, cta: 'Add information', to: `/farmer/activities?report=${moreInfo.id}` };
  }
  const current = tasks.find((t) => t.status !== 'Completed' && t.status !== 'Under Review');
  if (current && current.key !== 'harvest') {
    return { key: 'evidence', title: `Send your report: ${current.title}`, text: `${dueText(current.dueDate)}. A short note and one photo is enough.`, cta: 'Send progress report', to: `/farmer/activities?task=${current.key}` };
  }
  const unconfirmed = inputs.filter((i) => i.delivered && !i.farmerConfirmed);
  if (unconfirmed.length) {
    return { key: 'inputs', title: 'Confirm what you received', text: `${unconfirmed.length} ${unconfirmed.length === 1 ? 'item was' : 'items were'} recorded as delivered to you. Tap to say if you really got ${unconfirmed.length === 1 ? 'it' : 'them'}.`, cta: 'Check my items', to: '/farmer/inputs-payments' };
  }
  const unpaid = payments.filter((p) => p.status === 'Disbursed' && !p.farmerConfirmed);
  if (unpaid.length) {
    return { key: 'payment', title: 'Confirm your payment', text: 'A payment was sent to you. Please tell us if you received it.', cta: 'Check my payments', to: '/farmer/inputs-payments' };
  }
  if (current && current.key === 'harvest') {
    return { key: 'harvest', title: 'Report your harvest', text: 'Tell us how much you harvested and where it is stored.', cta: 'Report harvest', to: '/farmer/harvest' };
  }
  return { key: 'done', title: 'You are up to date', text: 'Nothing needs your attention right now. We will tell you when there is a next step.', cta: 'See my allocation', to: '/farmer/allocation' };
}

// ---------- main hook ----------

function build(data, user) {
  const farmer = data.farmers.find((f) => f.id === user?.farmerId) || null;
  if (!farmer) return { farmer: null };
  const name = user.name || farmer.name;
  const firstName = user.firstName || name.split(' ')[0];
  const coop = data.cooperatives.find((c) => c.id === farmer.coopId) || null;
  const farm = data.farms.find((f) => f.id === farmer.farmId) || null;
  const contract = data.contracts.find((c) => c.type === 'C' && c.partyId === farmer.id) || null;
  const byDateDesc = (a, b) => String(b.date).localeCompare(String(a.date));
  const inputs = data.inputRecords.filter((i) => i.farmerId === farmer.id).sort(byDateDesc);
  const payments = data.disbursements.filter((d) => d.recipientType === 'Farmer' && d.recipientId === farmer.id).sort(byDateDesc);
  const obligations = data.obligations.filter((o) => o.farmerId === farmer.id);
  const pkgId = farmer.allocationPackageId || contract?.packageId || obligations[0]?.packageId || inputs[0]?.packageId || null;
  const pkg = data.packages.find((p) => p.id === pkgId) || null;
  const milestones = pkg ? data.milestones.filter((m) => m.packageId === pkg.id).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate))) : [];
  const harvestReports = [...(farmer.harvestReports || [])].sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
  const reports = collectReports(milestones, farmer.id);
  const tasks = buildTasks(milestones, reports, harvestReports);
  const allocation = buildAllocation({ farmer, pkg, inputs, payments, milestones });
  const agreementStatus = contract ? contract.status : (farmer.agreementStatus || 'Not Signed');
  const crop = cropOf(pkg, farmer);
  const acres = (Number(farmer.farmSize) || 0) * (String(farmer.farmSizeUnit).toLowerCase().startsWith('hect') ? 2.47 : 1);
  const expectedHarvestKg = Math.round(acres * (KG_PER_ACRE[crop] || 300));
  const notifications = data.notifications.filter((n) => n.role === 'farmer').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const ctx = {
    user, farmer, name, firstName, phone: user.phone || farmer.phone || '', email: user.email || farmer.email || '', coop, farm, pkg, crop, contract, inputs, payments, obligations,
    milestones, reports, tasks, harvestReports, allocation, notifications, expectedHarvestKg,
    season: farm?.season || 'This season',
    agreementStatus,
    agreementSigned: agreementStatus === 'Signed',
    identityStatus: farmer.identityStatus || 'Pending',
    identityVerified: farmer.identityStatus === 'Verified',
    ob: summariseObligations(obligations),
  };
  ctx.next = getNextStep(ctx);
  return ctx;
}

export function useFarmerCtx() {
  const { data, user } = useApp();
  return useMemo(() => build(data, user), [data, user]);
}
