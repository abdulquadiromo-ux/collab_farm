// Helpers shared by the cross-role pages (notifications, complaints, contracts, audit, reports, settings, help).
// Pure functions only. Nothing here talks to a server. Files are generated locally with Blob.
import { ROLE_META } from '../../data/people.js';
import { formatDateShort, formatDateTime, toDate } from '../../utils/format.js';

// The demo data is dated around this moment (see relativeTime in utils/format.js).
export const DEMO_NOW = new Date('2026-10-30T12:30:00');
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const DAY = 86400000;

export const baseFor = (role) => ROLE_META[role]?.base || '/';
export const roleLabel = (role) => ROLE_META[role]?.label || (role === 'system' ? 'System' : role || '-');

// "30 Oct 2026" for plain dates, "30 Oct 2026, 09:30 AM" for date-times.
export function whenLabel(at) {
  if (!at) return '-';
  if (typeof at === 'string' && at.length <= 10) return formatDateShort(at);
  return formatDateTime(at);
}

export function ageInDays(from, to = DEMO_NOW) {
  const d = toDate(from);
  if (!d) return 0;
  return Math.max(0, Math.floor((startOfDay(to) - startOfDay(d)) / DAY));
}

// Day bucket used by the notification list.
export function dayBucket(at) {
  const d = toDate(at);
  if (!d) return 'Earlier';
  const today = startOfDay(DEMO_NOW).getTime();
  const t = startOfDay(d).getTime();
  if (t >= today) return 'Today';
  if (t >= today - DAY) return 'Yesterday';
  return 'Earlier';
}

export const isoNow = () => new Date().toISOString();

// ---------- local files (Blob) ----------
export function downloadFile(filename, text, mime = 'text/plain;charset=utf-8') {
  try {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
// columns: [{ header, value(row) }]
export function toCsv(columns, rows) {
  const head = columns.map((c) => csvCell(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => csvCell(c.value(r))).join(','));
  return [head, ...body].join('\r\n');
}

export const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------- scoping ----------
export const byId = (list, id) => (list || []).find((x) => x.id === id);
export const pkgName = (data, id) => byId(data.packages, id)?.name || (id ? id : 'No specific package');

export function investedPackageIds(data, user) {
  return new Set(data.investments.filter((i) => i.investorId === user.orgId).map((i) => i.packageId));
}

export function farmerPackageIds(data, user) {
  const ids = new Set();
  const f = byId(data.farmers, user.farmerId);
  if (f?.allocationPackageId) ids.add(f.allocationPackageId);
  data.obligations.filter((o) => o.farmerId === user.farmerId).forEach((o) => ids.add(o.packageId));
  data.contracts.filter((c) => c.type === 'C' && c.partyId === user.farmerId).forEach((c) => ids.add(c.packageId));
  return ids;
}

// Packages a user may see or relate to. Used for filters and the "related package" select.
export function visiblePackages(data, user) {
  if (!user) return [];
  if (user.role === 'admin') return data.packages;
  if (user.role === 'cooperative') return data.packages.filter((p) => p.coopId === user.orgId);
  if (user.role === 'investor') {
    const ids = investedPackageIds(data, user);
    return data.packages.filter((p) => ids.has(p.id));
  }
  const ids = farmerPackageIds(data, user);
  return data.packages.filter((p) => ids.has(p.id));
}

// The cooperative that owns the thing a record points to. Used to scope audit history and complaints.
const ENTITY_COLLECTION = {
  package: 'packages', farmer: 'farmers', farm: 'farms', contract: 'contracts', disbursement: 'disbursements', milestone: 'milestones',
  tranche: 'tranches', investment: 'investments', complaint: 'complaints', reconciliation: 'reconciliation', application: 'applications',
  'risk case': 'riskCases', riskcase: 'riskCases', distribution: 'distributions', harvest: 'harvests', sale: 'sales', expense: 'expenses',
  transaction: 'transactions', 'input record': 'inputRecords',
};

export function coopOfEntity(data, entityType, entityId) {
  const type = String(entityType || '').toLowerCase();
  if (type === 'cooperative') return entityId;
  const coll = ENTITY_COLLECTION[type];
  if (!coll) return null;
  const rec = byId(data[coll], entityId);
  if (!rec) return null;
  if (rec.coopId) return rec.coopId;
  if (coll === 'contracts' && rec.partyType === 'Cooperative') return rec.partyId;
  const pkg = byId(data.packages, rec.packageId);
  return pkg?.coopId || null;
}

// ---------- complaints ----------
export const COMPLAINT_CATEGORIES = ['Delayed support', 'Payment', 'Suspected misuse', 'Dispute', 'Other'];
export const COMPLAINT_STATUSES = ['Open', 'Under Review', 'Awaiting Response', 'Resolved', 'Escalated'];

const submitterUser = (data, c) => data.users.find((u) => u.id === c.submittedById || (u.name === c.submittedBy && u.role === c.role));

export function isSubmitter(user, c) {
  return !!user && (c.submittedById === user.id || (c.submittedBy === user.name && c.role === user.role));
}

// Visible only to the submitter, the cooperative the complaint is about (or whose member raised it) and admins.
export function canSeeComplaint(data, user, c) {
  if (!user || !c) return false;
  if (user.role === 'admin') return true;
  if (isSubmitter(user, c)) return true;
  if (user.role === 'cooperative') {
    const pkg = byId(data.packages, c.packageId);
    if (pkg && pkg.coopId === user.orgId) return true;
    const sub = submitterUser(data, c);
    return !!sub && sub.orgId === user.orgId && sub.role !== 'investor';
  }
  return false;
}

export function nextComplaintRef(data) {
  const nums = data.complaints.map((c) => Number(String(c.ref || '').split('-').pop())).filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 40) + 1;
  return `CMP-2026-${String(next).padStart(4, '0')}`;
}

export function complaintParties(data, c) {
  const pkg = byId(data.packages, c.packageId);
  const coop = pkg ? byId(data.cooperatives, pkg.coopId) : null;
  return { pkg, coop };
}

// ---------- contracts ----------
export const CONTRACT_TYPES = {
  A: { label: 'Agreement A', long: 'Investor Funding Agreement', party: 'Investor', signer: 'investor' },
  B: { label: 'Agreement B', long: 'Cooperative Funding and Accountability Agreement', party: 'Cooperative', signer: 'cooperative' },
  C: { label: 'Agreement C', long: 'Individual Farmer Participation Agreement', party: 'Farmer', signer: 'farmer' },
};

export function contractsForUser(data, user) {
  if (!user) return [];
  if (user.role === 'admin') return data.contracts;
  if (user.role === 'investor') return data.contracts.filter((c) => c.type === 'A' && c.partyId === user.orgId);
  if (user.role === 'cooperative') {
    return data.contracts.filter((c) => {
      if (c.type === 'B') return c.partyId === user.orgId || byId(data.packages, c.packageId)?.coopId === user.orgId;
      if (c.type === 'C') {
        const f = byId(data.farmers, c.partyId);
        return f?.coopId === user.orgId || byId(data.packages, c.packageId)?.coopId === user.orgId;
      }
      return false;
    });
  }
  if (user.role === 'farmer') return data.contracts.filter((c) => c.type === 'C' && c.partyId === user.farmerId);
  return [];
}

export function canSeeContract(data, user, c) {
  return !!c && contractsForUser(data, user).some((x) => x.id === c.id);
}

// Does the signed in user have to sign this agreement?
export function mustSign(user, c) {
  if (!user || !c) return false;
  if (c.type === 'A') return user.role === 'investor' && c.partyId === user.orgId;
  if (c.type === 'B') return user.role === 'cooperative' && c.partyId === user.orgId;
  if (c.type === 'C') return user.role === 'farmer' && c.partyId === user.farmerId;
  return false;
}

// Funding steps blocked by a missing or unsigned mandatory agreement. Returns [{ key, title, text, to }]
const FUNDING_STAGES = ['Approved', 'Open for Funding', 'Funding Target Reached', 'Ready for Disbursement', 'Active'];
export function agreementBlockers(data, user) {
  const out = [];
  if (!user) return out;
  const base = baseFor(user.role);
  if (user.role === 'cooperative') {
    data.packages.filter((p) => p.coopId === user.orgId && FUNDING_STAGES.includes(p.status)).forEach((p) => {
      const b = data.contracts.find((c) => c.type === 'B' && c.packageId === p.id);
      if (!b) out.push({ key: `b-miss-${p.id}`, title: p.name, text: 'Agreement B is missing. Funding steps for this package are blocked until it is created and signed.', to: `${base}/funding/${p.id}`, kind: 'Missing' });
      else if (b.status !== 'Signed') out.push({ key: `b-${b.id}`, title: p.name, text: `Agreement B is ${b.status.toLowerCase()}. Funding steps for this package are blocked until it is signed.`, to: `${base}/contracts/${b.id}`, kind: b.status });
    });
    data.contracts.filter((c) => c.type === 'C' && c.status !== 'Signed' && contractsForUser(data, user).some((x) => x.id === c.id)).forEach((c) => {
      out.push({ key: `c-${c.id}`, title: `${c.partyName}, ${pkgName(data, c.packageId)}`, text: `Agreement C is ${c.status.toLowerCase()}. This farmer cannot receive an allocation until it is signed.`, to: `${base}/contracts/${c.id}`, kind: c.status });
    });
  }
  if (user.role === 'investor') {
    data.investments.filter((i) => i.investorId === user.orgId).forEach((i) => {
      const pkg = byId(data.packages, i.packageId);
      const a = data.contracts.find((c) => c.type === 'A' && c.partyId === user.orgId && c.packageId === i.packageId);
      const early = i.status === 'Pending' || (pkg && ['Open for Funding', 'Funding Target Reached'].includes(pkg.status));
      if (!a && i.status === 'Pending') out.push({ key: `a-miss-${i.id}`, title: pkg?.name || i.packageId, text: 'Agreement A is not on file. Your commitment cannot be confirmed until it is signed.', to: `${base}/packages/${i.packageId}`, kind: 'Missing' });
      else if (a && a.status !== 'Signed' && early) out.push({ key: `a-${a.id}`, title: pkg?.name || i.packageId, text: `Agreement A is ${a.status.toLowerCase()}. Funding for this package is blocked until you sign it.`, to: `${base}/contracts/${a.id}`, kind: a.status });
    });
  }
  return out;
}

// ---------- audit ----------
export function auditScope(data, user) {
  if (!user) return [];
  if (user.role === 'admin') return data.audit;
  if (user.role !== 'cooperative') return [];
  const org = byId(data.cooperatives, user.orgId);
  const orgUsers = new Set(data.users.filter((u) => u.orgId === user.orgId).map((u) => u.name));
  if (org) orgUsers.add(org.name);
  return data.audit.filter((e) => orgUsers.has(e.actor) || coopOfEntity(data, e.entityType, e.entityId) === user.orgId);
}

// ---------- misc ----------
export const maskTail = (s, n = 4) => (s ? `ending ${String(s).slice(-n)}` : '-');

export function validEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
}
export function validPhone(v) {
  const digits = String(v || '').replace(/[^0-9]/g, '');
  return digits.length >= 10 && digits.length <= 14;
}

// ---------- per-user settings (stored in data.userSettings.byUser[userId]) ----------
export const userPrefs = (data, userId) => data.userSettings?.byUser?.[userId] || {};
// Returns a function for patchData. Only the given keys of the user's settings are replaced.
export const mergeUserPrefs = (userId, patch) => (d) => ({
  userSettings: {
    ...d.userSettings,
    byUser: { ...(d.userSettings?.byUser || {}), [userId]: { ...(d.userSettings?.byUser?.[userId] || {}), ...patch } },
  },
});
