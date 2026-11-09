import { useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatNumber } from '../../utils/format.js';

// "Today" in the demo world. It matches the default clock in utils/format.js (relativeTime).
export const TODAY = '2026-10-30';

// Whole days from today to an ISO date (negative when the date is in the past).
export function daysFromToday(iso) {
  if (!iso) return null;
  const a = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  const b = new Date(`${TODAY}T00:00:00`);
  if (Number.isNaN(a.getTime())) return null;
  return Math.round((a - b) / 86400000);
}

// The signed in cooperative and its packages. Everything on these pages is scoped to this organisation.
export function useCoop() {
  const { data, user } = useApp();
  return useMemo(() => {
    const coop = data.cooperatives.find((c) => c.id === user?.orgId) || null;
    const packages = data.packages.filter((p) => p.coopId === user?.orgId);
    const packageIds = new Set(packages.map((p) => p.id));
    const pkgById = Object.fromEntries(packages.map((p) => [p.id, p]));
    return { coop, packages, packageIds, pkgById };
  }, [data.cooperatives, data.packages, user?.orgId]);
}

export const fmtQty = (n, unit) => `${formatNumber(n)}${unit ? ` ${unit}` : ''}`;

// The cooperative's own farmer directory is the source of names on these pages.
export function farmerName(data, id) {
  return data.farmers.find((f) => f.id === id)?.name
    || data.users.find((u) => u.farmerId === id)?.name
    || data.contracts.find((c) => c.partyType === 'Farmer' && c.partyId === id)?.partyName
    || id;
}

// Cooperatives see investors by display name only: the organisation, or first name plus last initial.
export function investorDisplayName(data, id) {
  const inv = data.investors.find((i) => i.id === id);
  if (!inv) return 'Investor';
  if (inv.org && inv.org !== 'Individual') return inv.org;
  const parts = String(inv.name || '').split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0] || 'Investor';
}

export const trancheShort = (t) => `T${t.number} ${t.name}`;

export const tranchesOf = (data, packageId) => data.tranches.filter((t) => t.packageId === packageId).sort((a, b) => a.number - b.number);

// Index of the first tranche that is not yet released (the "current" step of the chain).
export function chainIndex(tranches) {
  const i = tranches.findIndex((t) => t.status !== 'Released');
  return i === -1 ? tranches.length : i;
}

const IMAGE_EXT = /\.(jpe?g|png|gif|heic|webp)$/i;
// Photos and GPS locations support a claim. They never prove it on their own (PRD 8).
export function isSupportingOnly(ev) {
  return /photo|gps/i.test(ev.type || '') || IMAGE_EXT.test(ev.name || '') || !!ev.gps;
}

export const EVIDENCE_TYPES = [
  'Input delivery receipt', 'Supplier invoice', 'Field inspection report', 'Planting report', 'Maintenance report',
  'Harvest quantity', 'Storage record', 'Sales receipt', 'Buyer confirmation', 'Loss record',
];

export const GPS_PATTERN = /^-?\d{1,3}(\.\d+)?\s*,\s*-?\d{1,3}(\.\d+)?$/;

export const sumBy = (arr, pick) => arr.reduce((s, x) => s + (Number(pick(x)) || 0), 0);
