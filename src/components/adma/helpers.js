// Pure helpers for the Administrator pages (group "adma"). Nothing here touches the store or the network.
import { toDate } from '../../utils/format.js';
import { budgetReconciles, allocationCheck, sum, needsSecondApprover } from '../../utils/rules.js';

// ---------- time ----------
// The demo clock matches relativeTime() in utils/format.js so ages stay stable between reloads.
export const DEMO_NOW = new Date('2026-10-30T12:30:00');
const DAY = 86400000;
export function daysSince(input, now = DEMO_NOW) {
  const d = toDate(input);
  if (!d) return null;
  return Math.max(0, Math.floor((now - d) / DAY));
}
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const nowIso = () => new Date().toISOString();
export const lc = (s) => String(s || '').trim().toLowerCase();
export const slug = (s) => lc(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------- administrators ----------
export const ADMIN_FUNCTIONS = [
  { id: 'Project reviewer', can: 'Reviews applications and budgets and approves or returns projects. Gives the first approval on a material budget change.' },
  { id: 'Milestone reviewer', can: 'Checks milestone evidence and approves completion or sends it back.' },
  { id: 'Payment approver', can: 'Authorises disbursements. Gives the second approval above the approval limit and on a material budget change.' },
  { id: 'Reconciliation officer', can: 'Compares our records with the financial partner and confirms receipts or posts correcting entries.' },
  { id: 'Support', can: 'Handles complaints, notifications and user questions. Cannot approve money or projects.' },
];

export function adminFunctionOf(u) {
  if (!u) return '';
  if (u.adminFunction) return u.adminFunction;
  const m = /\(([^)]+)\)/.exec(u.title || '');
  if (!m) return 'Administrator';
  const t = m[1].toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Notification role used by notify(role, ...) for each kind of party.
export const PARTY_ROLE = { Investor: 'investor', Cooperative: 'cooperative', Farmer: 'farmer', investor: 'investor', cooperative: 'cooperative', farmer: 'farmer', admin: 'admin' };
export const ROLE_HOME = { investor: '/investor', cooperative: '/coop', farmer: '/farmer', admin: '/admin' };
export const ROLE_LABEL = { investor: 'Investor', cooperative: 'Cooperative', farmer: 'Farmer', admin: 'Administrator' };

export const maskNin = (nin) => {
  const s = String(nin || '');
  if (s.length <= 3) return s || '-';
  return `${'•'.repeat(Math.min(8, s.length - 3))}${s.slice(-3)}`;
};

// Sample "last sign in" so the table looks alive. Deterministic, clearly labelled as a sample in the UI.
export function sampleLastSignIn(id) {
  let h = 0;
  for (let i = 0; i < String(id).length; i += 1) h = (h * 31 + String(id).charCodeAt(i)) % 9973;
  const mins = (h % 2880) + 20;
  return new Date(DEMO_NOW.getTime() - mins * 60000).toISOString();
}

// ---------- verification of people ----------
export const VERIFICATION_STATUSES = ['Submitted', 'Under Review', 'Additional Information Required', 'Verified', 'Rejected', 'Suspended'];

function entityFor(data, rec) {
  const email = lc(rec.email);
  if (rec.role === 'investor') {
    const r = data.investors.find((i) => i.id === rec.entityId || lc(i.email) === email);
    return r ? { kind: 'investor', record: r } : null;
  }
  if (rec.role === 'farmer') {
    const r = data.farmers.find((f) => f.id === rec.entityId || lc(f.email) === email);
    return r ? { kind: 'farmer', record: r } : null;
  }
  return null;
}

function makeSubject(data, rec, persisted) {
  const entity = entityFor(data, rec);
  const linkedUser = data.users.find((u) => lc(u.email) === lc(rec.email)) || null;
  return { id: rec.id, persisted, rec, entity, linkedUser, name: rec.name, role: rec.role, email: rec.email, submittedAt: rec.submittedAt, status: rec.status };
}

function syntheticFromInvestor(inv) {
  return {
    id: inv.id, name: inv.name, role: 'investor', email: inv.email, entityId: inv.id,
    submittedAt: inv.submittedAt || inv.registeredAt || inv.createdAt || null, status: inv.status,
    checks: { identity: inv.status === 'Verified' ? 'Verified' : 'Uploaded', eligibility: inv.eligibility === 'Eligible' ? 'Eligible' : 'Pending', riskAck: inv.riskAcknowledged ? 'Done' : 'Not done', emailVerified: true },
    notes: [],
  };
}

function syntheticFromUser(u) {
  return {
    id: u.id, name: u.name, role: u.role, email: u.email, entityId: u.farmerId || u.orgId || null,
    submittedAt: u.registeredAt || u.createdAt || null, status: u.status,
    checks: { identity: 'Uploaded', eligibility: u.role === 'investor' ? 'Pending' : 'n/a', riskAck: u.role === 'investor' ? 'Not done' : 'n/a', emailVerified: true },
    notes: [],
  };
}

// Records in `userVerification`, plus investors and users that registered but have no verification record yet.
export function verificationSubjects(data) {
  const out = [];
  const seen = new Set();
  data.userVerification.forEach((rec) => { out.push(makeSubject(data, rec, true)); seen.add(lc(rec.email)); });
  data.investors.forEach((inv) => {
    if (inv.status === 'Verified' || seen.has(lc(inv.email))) return;
    seen.add(lc(inv.email));
    out.push(makeSubject(data, syntheticFromInvestor(inv), false));
  });
  data.users.forEach((u) => {
    if (!['investor', 'farmer'].includes(u.role)) return;
    if (!['Submitted', 'Under Review', 'Additional Information Required'].includes(u.status)) return;
    if (seen.has(lc(u.email))) return;
    seen.add(lc(u.email));
    out.push(makeSubject(data, syntheticFromUser(u), false));
  });
  return out;
}

export function findVerificationSubject(data, id) {
  return verificationSubjects(data).find((s) => s.id === id) || null;
}

export function defaultVerificationDocs(rec) {
  const idVerified = rec.checks?.identity === 'Verified' || rec.status === 'Verified';
  const allVerified = rec.status === 'Verified';
  const mk = (id, type, file, isIdentity, verified) => ({ id, type, file, isIdentity, status: verified ? 'Verified' : 'Uploaded', reviewer: null, reviewedAt: null });
  if (rec.role === 'farmer') return [mk('vd-1', 'National identity (NIN slip)', 'nin-slip.pdf', true, idVerified)];
  return [
    mk('vd-1', 'Government-issued identification', 'government-id.pdf', true, idVerified),
    mk('vd-2', 'Proof of address', 'proof-of-address.pdf', false, allVerified),
  ];
}
export const verificationDocs = (subject) => subject.rec.documents || defaultVerificationDocs(subject.rec);

// The checks list on the detail page. `applies` false rows are shown as not applicable.
export function verificationChecks(subject) {
  const { rec, role } = subject;
  const c = rec.checks || {};
  const docs = verificationDocs(subject);
  const idDocs = docs.filter((d) => d.isIdentity);
  const identityOk = idDocs.length > 0 && idDocs.every((d) => d.status === 'Verified');
  const identityUploaded = idDocs.length > 0;
  const investor = role === 'investor';
  return [
    { key: 'identity', label: 'Identity', applies: true, passed: identityOk, state: identityOk ? 'Verified' : identityUploaded ? 'Uploaded' : 'Not uploaded', detail: identityOk ? 'The identity document has been checked by a reviewer.' : 'The identity document is uploaded but not yet checked. Verify it in the documents table below.' },
    { key: 'contact', label: 'Contact details', applies: true, passed: !!c.emailVerified, state: c.emailVerified ? 'Verified' : 'Pending', detail: c.emailVerified ? 'The email address was confirmed by the person with a one-time code.' : 'The person has not confirmed their email address yet. Only they can do this, so ask them in a message.' },
    { key: 'eligibility', label: 'Eligibility', applies: investor, passed: investor ? ['Eligible', 'Done', 'Verified'].includes(c.eligibility) : null, state: investor ? (['Eligible', 'Done', 'Verified'].includes(c.eligibility) ? 'Eligible' : 'Pending') : 'Not applicable', detail: investor ? 'Confirm that the investor meets the eligibility rule set in System settings. The rule depends on the legal structure and is still configurable.' : 'Eligibility checks apply to investors only.' },
    { key: 'riskAck', label: 'Risk acknowledgement', applies: investor, passed: investor ? c.riskAck === 'Done' : null, state: investor ? (c.riskAck === 'Done' ? 'Done' : 'Not done') : 'Not applicable', detail: investor ? 'The investor must read and tick the risk disclosure themselves. An administrator cannot tick it for them.' : 'Risk acknowledgement applies to investors only.' },
    { key: 'screening', label: 'Sanctions and screening', applies: true, partner: true, passed: null, state: 'Partner check', detail: 'Performed by the regulated financial partner, not by CollabFarm. This is a placeholder: the result will appear here once the partner reports it.' },
  ];
}

// What must be true before a person can be approved.
export function verificationReadiness(subject) {
  const checks = verificationChecks(subject).filter((c) => c.applies && !c.partner);
  const docs = verificationDocs(subject);
  const items = checks.map((c) => ({ key: c.key, label: c.label, ok: !!c.passed }));
  items.push({ key: 'docs', label: 'Every uploaded document verified', ok: docs.length > 0 && docs.every((d) => d.status === 'Verified') });
  const missing = items.filter((i) => !i.ok).map((i) => i.label);
  return { items, ready: missing.length === 0, missing };
}

export function checkSummary(subject) {
  const list = verificationChecks(subject).filter((c) => c.applies && !c.partner);
  return { passed: list.filter((c) => c.passed).length, total: list.length };
}

// ---------- cooperative verification ----------
export const COOP_STATUSES = ['Draft', 'Submitted', 'Under Review', 'Additional Information Required', 'Verified', 'Rejected', 'Suspended'];
export const COOP_MANDATORY_DOCS = ['Registration certificate', 'Proof of address', 'Leadership identification', 'Land-access evidence', 'Payout account letter'];

export function coopDocRows(coop) {
  const docs = coop.documents || [];
  const rows = COOP_MANDATORY_DOCS.map((type) => {
    const d = docs.find((x) => x.type === type);
    return d ? { ...d, mandatory: true } : { id: `missing-${slug(type)}`, type, file: null, status: 'Not uploaded', mandatory: true, missing: true };
  });
  docs.filter((d) => !COOP_MANDATORY_DOCS.includes(d.type)).forEach((d) => rows.push({ ...d, mandatory: false }));
  return rows;
}

export function coopReadiness(coop) {
  const rows = coopDocRows(coop);
  const problems = [];
  rows.filter((r) => r.mandatory).forEach((r) => {
    if (r.missing) problems.push(`${r.type}: not uploaded yet`);
    else if (r.status === 'Rejected') problems.push(`${r.type}: flagged by a reviewer, a new upload is needed`);
    else if (r.status !== 'Verified') problems.push(`${r.type}: uploaded but not yet verified`);
  });
  const payoutNameOk = !coop.bank || lc(coop.bank.accountName) === lc(coop.name);
  if (!payoutNameOk) problems.push('Payout account name does not match the registered cooperative name');
  const landDoc = rows.find((r) => r.type === 'Land-access evidence');
  const payoutDoc = rows.find((r) => r.type === 'Payout account letter');
  return {
    rows, problems, ready: problems.length === 0,
    land: { ok: landDoc?.status === 'Verified', state: landDoc?.missing ? 'Not uploaded' : landDoc?.status || 'Not uploaded' },
    payout: { ok: payoutNameOk && payoutDoc?.status === 'Verified', nameOk: payoutNameOk, state: payoutDoc?.missing ? 'Not uploaded' : payoutDoc?.status || 'Not uploaded' },
    verifiedCount: rows.filter((r) => r.mandatory && r.status === 'Verified').length,
    mandatoryCount: COOP_MANDATORY_DOCS.length,
  };
}

// ---------- applications ----------
export const APP_STAGES = ['Submitted', 'Under Review', 'Changes Requested', 'Approved', 'Rejected'];
export const SLA_TARGET_DAYS = 5; // illustrative review target, shown as such in the UI
const POST_APPROVAL = ['Approved', 'Open for Funding', 'Funding Target Reached', 'Ready for Disbursement', 'Active', 'Paused', 'Completed'];

export function slaInfo(app) {
  if (['Approved', 'Rejected'].includes(app.stage)) return { state: 'closed', days: null, label: 'Closed', tone: 'gray' };
  const days = daysSince(app.submittedAt) ?? 0;
  if (app.stage === 'Changes Requested') return { state: 'waiting', days, label: 'Waiting on cooperative', tone: 'gray' };
  if (days > SLA_TARGET_DAYS) return { state: 'overdue', days, label: `Overdue by ${days - SLA_TARGET_DAYS} day${days - SLA_TARGET_DAYS === 1 ? '' : 's'}`, tone: 'red' };
  if (days >= SLA_TARGET_DAYS - 1) return { state: 'due', days, label: `Due soon, ${days} day${days === 1 ? '' : 's'} old`, tone: 'amber' };
  return { state: 'ok', days, label: `${days} day${days === 1 ? '' : 's'} old`, tone: 'green' };
}

// A material change needs a second reviewer (PRD: separation of duties).
export function isMaterialChange(app, pkg) {
  if (!app) return false;
  if (app.type === 'Budget change' || app.material === true) return true;
  if (pkg && POST_APPROVAL.includes(pkg.status) && budgetReconciles(pkg).total !== app.amount) return true;
  return false;
}

export function farmerAllocations(data, pkgId) {
  return data.farmers
    .filter((f) => f.allocationPackageId === pkgId && f.status !== 'Removed')
    .map((f) => ({ farmerId: f.id, name: f.name, amount: f.allocatedAmount || 0, farmer: f }));
}

export function farmerAgreement(data, farmer, pkgId) {
  const c = data.contracts.find((x) => x.type === 'C' && x.partyId === farmer.id && (!pkgId || x.packageId === pkgId));
  if (c) return { status: c.status, contractId: c.id };
  return { status: farmer.agreementStatus || 'Not Signed', contractId: null };
}

export function agreementB(data, pkgId) {
  const list = data.contracts.filter((c) => c.type === 'B' && c.packageId === pkgId);
  return list.find((c) => c.status === 'Signed') || list[0] || null;
}

export const LINE_DECISIONS = ['Approved', 'Changes Requested', 'Rejected'];

// ---------- agreements ----------
const B_RELEVANT = ['Approved', 'Open for Funding', 'Funding Target Reached', 'Ready for Disbursement', 'Active', 'Paused'];
const A_RELEVANT = ['Open for Funding', 'Funding Target Reached', 'Ready for Disbursement', 'Active', 'Paused'];
const C_RELEVANT = ['Funding Target Reached', 'Ready for Disbursement', 'Active', 'Paused'];
const ISSUED = ['Approved', 'Open for Funding', 'Funding Target Reached', 'Ready for Disbursement', 'Active', 'Paused', 'Completed', 'Failed or Terminated'];

export const AGREEMENT_NAMES = { A: 'Investor Funding Agreement', B: 'Cooperative Funding and Accountability Agreement', C: 'Individual Farmer Participation Agreement' };
export const AGREEMENT_SHORT = { A: 'Agreement A', B: 'Agreement B', C: 'Agreement C' };
export const CONTRACT_STATE_TONE = { Signed: 'green', 'Awaiting Signature': 'amber', Expired: 'red', 'Not on file': 'red', 'Not due yet': 'gray' };

export function contractMatrix(data) {
  return data.packages.map((pkg) => {
    const issued = ISSUED.includes(pkg.status);
    // A: one per investor with a recorded investment in the package
    const invs = data.investments.filter((i) => i.packageId === pkg.id);
    const investorIds = [...new Set([...invs.map((i) => i.investorId), ...data.contracts.filter((c) => c.type === 'A' && c.packageId === pkg.id).map((c) => c.partyId)])];
    const aItems = investorIds.map((id) => {
      const inv = data.investors.find((x) => x.id === id);
      const rec = invs.find((i) => i.investorId === id);
      const contract = (rec && data.contracts.find((c) => c.id === rec.agreementId)) || data.contracts.find((c) => c.type === 'A' && c.packageId === pkg.id && c.partyId === id) || null;
      return { type: 'A', partyType: 'Investor', partyId: id, partyName: inv?.name || id, contract, state: contract ? contract.status : issued ? 'Not on file' : 'Not due yet', packageId: pkg.id };
    });
    // B: one per package
    const bContract = agreementB(data, pkg.id);
    const bItem = { type: 'B', partyType: 'Cooperative', partyId: pkg.coopId, partyName: data.cooperatives.find((c) => c.id === pkg.coopId)?.name || pkg.coopId, contract: bContract, state: bContract ? bContract.status : issued ? 'Not on file' : 'Not due yet', packageId: pkg.id };
    // C: allocated farmers plus anyone holding a C contract for the package
    const allocated = data.farmers.filter((f) => f.allocationPackageId === pkg.id && f.status !== 'Removed');
    const cIds = [...new Set([...allocated.map((f) => f.id), ...data.contracts.filter((c) => c.type === 'C' && c.packageId === pkg.id).map((c) => c.partyId)])];
    const cItems = cIds.map((id) => {
      const f = data.farmers.find((x) => x.id === id);
      const contract = data.contracts.find((c) => c.type === 'C' && c.packageId === pkg.id && c.partyId === id) || null;
      const fallback = f ? f.agreementStatus : null;
      const state = contract ? contract.status : fallback === 'Signed' ? 'Signed' : fallback === 'Awaiting Signature' ? 'Awaiting Signature' : issued ? 'Not on file' : 'Not due yet';
      return { type: 'C', partyType: 'Farmer', partyId: id, partyName: f?.name || contract?.partyName || id, contract, state, packageId: pkg.id, recordedOnFarmer: !contract && state === 'Signed' };
    });
    const signed = (list) => list.filter((x) => x.state === 'Signed').length;
    const all = [...aItems, bItem, ...cItems];
    const expired = all.some((x) => x.state === 'Expired');
    const incomplete = issued && all.some((x) => x.state !== 'Signed' && x.state !== 'Not due yet');
    const blockers = [];
    if (B_RELEVANT.includes(pkg.status) && bItem.state !== 'Signed') {
      const step = pkg.status === 'Approved' ? 'Opening for funding' : pkg.status === 'Open for Funding' ? 'Further funding steps' : 'Tranche release and supplier payments';
      blockers.push({ step, type: 'B', text: `${step} blocked: Agreement B is ${bItem.state.toLowerCase()}.` });
    }
    if (A_RELEVANT.includes(pkg.status)) {
      const missingA = aItems.filter((x) => x.state !== 'Signed');
      if (missingA.length) blockers.push({ step: 'Investor commitments', type: 'A', text: `Funds from ${missingA.map((x) => x.partyName).join(', ')} cannot be relied on until Agreement A is signed.` });
    }
    if (C_RELEVANT.includes(pkg.status)) {
      const missingC = cItems.filter((x) => x.state !== 'Signed');
      if (missingC.length) blockers.push({ step: 'Payments to farmers', type: 'C', text: `Payments to ${missingC.length} farmer${missingC.length === 1 ? '' : 's'} are blocked until Agreement C is signed (${missingC.slice(0, 3).map((x) => x.partyName).join(', ')}${missingC.length > 3 ? ' and others' : ''}).` });
    }
    const overall = !issued ? 'Not due yet' : expired ? 'Expired' : incomplete ? 'Incomplete' : 'Complete';
    return { pkg, issued, aItems, bItem, cItems, aSigned: signed(aItems), cSigned: signed(cItems), expired, incomplete, blockers, overall, all };
  });
}

// ---------- farmers ----------
export function farmerFlags(data, f) {
  const flags = [];
  if (!f.duplicateResolved) {
    if (f.duplicateFlag) flags.push({ kind: 'duplicate', text: f.duplicateFlag });
    const sameNin = data.farmers.filter((o) => o.id !== f.id && o.status !== 'Removed' && o.nin && o.nin === f.nin);
    if (sameNin.length && !f.duplicateFlag) flags.push({ kind: 'duplicate', text: `Same NIN appears on ${sameNin.map((o) => o.id).join(', ')}` });
    const sameName = data.farmers.filter((o) => o.id !== f.id && o.status !== 'Removed' && o.coopId === f.coopId && lc(o.name) === lc(f.name) && o.nin !== f.nin);
    if (sameName.length) flags.push({ kind: 'name', text: `Same name as ${sameName.map((o) => o.id).join(', ')}. Often a different person, compare NIN and phone.` });
  }
  if (f.reviewFlag) flags.push({ kind: 'review', text: f.reviewFlag.reason });
  return flags;
}

export function farmDocState(farm, docName) {
  if (farm.docStatus && farm.docStatus[docName]) return farm.docStatus[docName];
  return farm.landAccess === 'Verified' ? 'Verified' : 'Uploaded';
}

// ---------- platform statistics ----------
const OPEN_RISK = ['Open', 'Under Review', 'Awaiting Response', 'Escalated'];

export function platformStats(data) {
  const farmers = data.farmers.filter((f) => f.status !== 'Removed');
  const admins = data.users.filter((u) => u.role === 'admin' && u.status !== 'Invited');
  const byRole = [
    { label: 'Farmers', value: farmers.length },
    { label: 'Cooperatives', value: data.cooperatives.length },
    { label: 'Investors', value: data.investors.length },
    { label: 'Administrators', value: admins.length },
  ];
  const pk = data.packages;
  const count = (list) => pk.filter((p) => list.includes(p.status)).length;
  const projects = {
    submitted: count(['Submitted', 'Under Review', 'Changes Requested']),
    approved: count(['Approved', 'Open for Funding', 'Funding Target Reached', 'Ready for Disbursement']),
    active: count(['Active']),
    completed: count(['Completed']),
    suspended: count(['Paused', 'Suspended', 'Failed or Terminated']),
  };
  const committed = sum(pk, (p) => p.committed);
  const confirmed = sum(pk, (p) => p.raised);
  const disbursedRows = data.disbursements.filter((d) => d.status === 'Disbursed');
  const disbursed = sum(disbursedRows, (d) => d.amount);
  const confirmedRefs = new Set([
    ...data.reconciliation.filter((r) => r.status === 'Confirmed').map((r) => r.ref),
    ...data.expenses.filter((e) => e.status === 'Confirmed').map((e) => e.ref),
  ]);
  const reconciled = sum(disbursedRows.filter((d) => confirmedRefs.has(d.ref)), (d) => d.amount);
  const distOutstanding = sum(data.distributions.filter((d) => d.status !== 'Confirmed'), (d) => Math.max(0, d.amountDue - d.amountPaid));
  const distOverdue = sum(data.distributions.filter((d) => d.status === 'Overdue'), (d) => Math.max(0, d.amountDue - d.amountPaid));
  const farmerOwed = sum(data.obligations.filter((o) => o.type === 'Repayment' && o.status !== 'Confirmed'), (o) => o.amount);
  const verifiedCoops = data.cooperatives.filter((c) => c.status === 'Verified').length;
  const verifiedInvestors = data.investors.filter((i) => i.status === 'Verified').length;

  const queues = {
    users: verificationSubjects(data).filter((s) => ['Submitted', 'Under Review'].includes(s.status)).length,
    coops: data.cooperatives.filter((c) => ['Submitted', 'Under Review'].includes(c.status)).length,
    applications: data.applications.filter((a) => ['Submitted', 'Under Review'].includes(a.stage)).length,
    milestones: data.milestones.filter((m) => m.status === 'Under Review').length,
    disbursements: data.disbursements.filter((d) => ['Pending', 'Reviewing'].includes(d.status)).length,
    needSecond: data.disbursements.filter((d) => ['Pending', 'Reviewing'].includes(d.status) && needsSecondApprover(d.amount, data.platformSettings?.approvalLimits) && (d.approvals?.length || 0) === 1).length,
    reconciliation: data.reconciliation.filter((r) => ['Failed', 'Under Reconciliation', 'Pending'].includes(r.status)).length,
    risk: data.riskCases.filter((r) => OPEN_RISK.includes(r.status)).length,
    riskEscalated: data.riskCases.filter((r) => r.status === 'Escalated').length,
    complaints: data.complaints.filter((c) => c.status !== 'Resolved').length,
  };
  return { byRole, totalUsers: sum(byRole, (r) => r.value), verifiedCoops, totalCoops: data.cooperatives.length, verifiedInvestors, totalInvestors: data.investors.length, projects, committed, confirmed, disbursed, reconciled, outstanding: distOutstanding + farmerOwed, outstandingOverdue: distOverdue, queues };
}

// Funding pipeline grouping used by the donut.
export function packageStatusGroups(data) {
  const groups = [
    { label: 'Draft', list: ['Draft'] },
    { label: 'In review', list: ['Submitted', 'Under Review', 'Changes Requested'] },
    { label: 'Approved or open', list: ['Approved', 'Open for Funding'] },
    { label: 'Target reached', list: ['Funding Target Reached', 'Ready for Disbursement'] },
    { label: 'Active', list: ['Active', 'Paused'] },
    { label: 'Completed', list: ['Completed'] },
  ];
  return groups.map((g) => ({ label: g.label, value: data.packages.filter((p) => g.list.includes(p.status)).length })).filter((g) => g.value > 0);
}

// ---------- settings ----------
export const DECISION_STATUSES = ['Open', 'In discussion', 'Decided'];
export const DECISION_OWNERS = ['Unassigned', 'Board', 'Legal counsel', 'Finance lead', 'Compliance officer', 'Programme director', 'Financial partner (external)'];

export { budgetReconciles, allocationCheck, sum };
