// Shared helpers for the cooperative pages in group `coopa`. Pure functions only, no network calls.
import { useCallback, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext.jsx';

export const CROP_OPTIONS = ['Maize', 'Rice', 'Yam', 'Cassava', 'Groundnut', 'Tomato', 'Potatoes', 'Spinach', 'Sorghum', 'Millet', 'Soybean', 'Other'];
export const SKILL_OPTIONS = ['Land preparation', 'Planting', 'Irrigation', 'Crop protection', 'Harvesting', 'Storage and processing', 'Machinery operation', 'Livestock care'];
export const GENDER_OPTIONS = ['Female', 'Male', 'Prefer not to say'];
export const SIZE_UNITS = ['Acres', 'Hectares'];
export const MEMBERSHIP_OPTIONS = ['Active member', 'Applicant'];
export const LAND_ACCESS_TYPES = ['Lease agreement', 'Certificate of Occupancy', 'Community consent letter', 'Family or customary land', 'Rented land'];
export const SEASON_OPTIONS = ['Wet 2026', 'Dry 2026/27', 'Wet 2027'];
export const FARM_DOC_TYPES = ['Lease agreement', 'Survey plan', 'Community consent letter', 'Certificate of Occupancy', 'Inspection report', 'Other'];
export const COOP_DOC_TYPES = ['Registration certificate', 'Proof of address', 'Other'];

const ACRE_TO_HA = 0.404686;
export const toHa = (size, unit) => {
  const n = Number(size) || 0;
  return String(unit || '').toLowerCase().startsWith('h') ? n : n * ACRE_TO_HA;
};
export const fmtHa = (n) => `${(Math.round(n * 10) / 10).toLocaleString('en-NG')} ha`;

export const maskNin = (nin = '') => (nin ? `${'*'.repeat(Math.max(0, String(nin).length - 4))}${String(nin).slice(-4)}` : '-');
export const isValidNin = (v) => /^\d{11}$/.test(String(v || ''));

// Accepts 0803 123 4567, 08031234567, +234 803 123 4567, 2348031234567. Returns { ok, display }.
export function normalisePhone(v = '') {
  let d = String(v).replace(/[\s()-]/g, '');
  if (d.startsWith('+234')) d = `0${d.slice(4)}`;
  else if (d.startsWith('234') && d.length === 13) d = `0${d.slice(3)}`;
  const ok = /^0\d{10}$/.test(d);
  return { ok, display: ok ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : String(v).trim() };
}

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());

export function splitName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || '', last: parts.slice(1).join(' ') };
}

const numericTail = (id, prefix) => {
  const m = String(id).match(new RegExp(`^${prefix}-(\\d+)$`));
  return m ? Number(m[1]) : 0;
};
export const nextFarmerId = (farmers, offset = 0) => `f-${String(Math.max(0, ...farmers.map((f) => numericTail(f.id, 'f'))) + 1 + offset).padStart(3, '0')}`;
export const nextFarmId = (farms) => `farm-${Math.max(0, ...farms.map((f) => numericTail(f.id, 'farm'))) + 1}`;

export const farmSizeLabel = (f) => (f.farmSize ? `${f.farmSize} ${f.farmSizeUnit || 'Acres'}` : '-');

export const timeOfDay = (d = new Date()) => {
  const h = d.getHours();
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
};

export const daysAgo = (iso, now = new Date()) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return Infinity;
  return (now - d) / 86400000;
};

// ---------- CSV ----------
// Cells that start with = + - @ are prefixed so a spreadsheet never runs them as formulas.
export function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}
export const toCsv = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n');

// Saves a CSV generated in the browser. Nothing is uploaded anywhere.
export function downloadCsv(filename, text) {
  const blob = new Blob([`﻿${text}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// Small RFC 4180 style parser: quoted cells, escaped quotes, CRLF or LF, optional BOM.
export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i += 1; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

export const BULK_HEADERS = ['full_name', 'nin', 'phone', 'gender', 'crop_type', 'farm_size', 'farm_size_unit', 'email'];
const ALIASES = {
  name: ['fullname', 'name', 'farmername', 'farmer'],
  nin: ['nin', 'nationalidnumber', 'nationalidentificationnumber'],
  phone: ['phone', 'phonenumber', 'mobile'],
  gender: ['gender', 'sex'],
  cropType: ['croptype', 'crop', 'farmingcategory'],
  farmSize: ['farmsize', 'size'],
  farmSizeUnit: ['farmsizeunit', 'unit'],
  email: ['email', 'emailaddress'],
};

export function templateCsv() {
  return toCsv([BULK_HEADERS, ['Amina Yusuf', '30011223344', '0803 555 0101', 'Female', 'Maize', '4', 'Acres', 'amina@example.com']]);
}

// Built-in sample used by the "Use sample file" button. It deliberately includes a few bad rows so the
// validation preview can be seen. The duplicate-of-existing row only appears when the cooperative already has a farmer.
export function sampleCsv(existing = []) {
  const rows = [
    BULK_HEADERS,
    ['Amina Yusuf', '30011223344', '0803 555 0101', 'Female', 'Maize', '4', 'Acres', 'amina.yusuf@example.com'],
    ['Chinedu Okeke', '30011223355', '0805 555 0102', 'Male', 'Cassava', '6', 'Acres', ''],
    ['', '30011223366', '0806 555 0103', 'Female', 'Rice', '3', 'Acres', ''],
    ['Ibrahim Sule', '1234567890', '0807 555 0104', 'Male', 'Sorghum', '5', 'Acres', ''],
    ['Funmilayo Adeyemi', '30011223344', '0808 555 0105', 'Female', 'Yam', '2', 'Acres', ''],
    ['Sade Bakare', '30011223377', '0809 555 0106', 'Female', 'Groundnut', '7', 'Acres', ''],
    ['Tunde Alabi', '30011223388', '0803', 'Male', 'Tomato', '2', 'Acres', ''],
  ];
  if (existing[0]) rows.splice(5, 0, ['Existing Member Copy', existing[0].nin, '0810 555 0107', 'Male', 'Maize', '3', 'Acres', '']);
  return toCsv(rows);
}

// Reads parsed rows into candidate farmers and checks every row. Never throws.
export function validateBulk(parsed, existingFarmers) {
  if (!parsed.length) return { fileError: 'The file is empty. Add a header row and at least one farmer.', rows: [] };
  const header = parsed[0].map((h) => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''));
  const col = {};
  Object.entries(ALIASES).forEach(([key, names]) => { col[key] = header.findIndex((h) => names.includes(h)); });
  if (col.name < 0 || col.nin < 0) {
    return { fileError: 'The header row must include a full_name column and a nin column. Download the template to see the layout.', rows: [] };
  }
  const get = (r, key) => (col[key] >= 0 ? String(r[col[key]] ?? '').trim() : '');
  const body = parsed.slice(1, 501);
  const seenInFile = new Map();
  const byNin = new Map(existingFarmers.map((f) => [f.nin, f]));
  const rows = body.map((r, i) => {
    const errors = [];
    const name = get(r, 'name');
    const nin = get(r, 'nin').replace(/\s/g, '');
    const phone = normalisePhone(get(r, 'phone'));
    const cropType = get(r, 'cropType');
    const gender = get(r, 'gender');
    const unitRaw = get(r, 'farmSizeUnit');
    if (!name) errors.push('Name is missing.');
    if (!isValidNin(nin)) errors.push('NIN must be exactly 11 digits.');
    else if (byNin.has(nin)) errors.push(`NIN is already registered to ${byNin.get(nin).name}.`);
    else if (seenInFile.has(nin)) errors.push(`NIN repeats row ${seenInFile.get(nin)} in this file.`);
    if (isValidNin(nin) && !seenInFile.has(nin)) seenInFile.set(nin, i + 2);
    if (!phone.ok) errors.push('Phone number must be 11 digits, for example 0803 123 4567.');
    if (!cropType) errors.push('Crop type is missing.');
    const size = get(r, 'farmSize');
    if (size && !(Number(size) > 0)) errors.push('Farm size must be a number above zero.');
    return {
      line: i + 2, name, nin, phone: phone.display, cropType, gender: GENDER_OPTIONS.includes(gender) ? gender : '',
      farmSize: size && Number(size) > 0 ? Number(size) : '', farmSizeUnit: /^h/i.test(unitRaw) ? 'Hectares' : 'Acres', email: get(r, 'email'),
      errors, valid: errors.length === 0,
    };
  });
  return { fileError: '', rows, truncated: parsed.length - 1 > 500 };
}

// ---------- cooperative scoping ----------
// Every collection is filtered to the signed in cooperative so one cooperative never sees another's records.
export function useCoop() {
  const { data, user } = useApp();
  const coopId = user?.orgId || null;
  const coop = useMemo(() => data.cooperatives.find((c) => c.id === coopId) || null, [data.cooperatives, coopId]);
  const farmers = useMemo(() => data.farmers.filter((f) => f.coopId === coopId), [data.farmers, coopId]);
  const farms = useMemo(() => data.farms.filter((f) => f.coopId === coopId), [data.farms, coopId]);
  const packages = useMemo(() => data.packages.filter((p) => p.coopId === coopId), [data.packages, coopId]);
  return { coop, coopId, farmers, farms, packages, verified: coop?.status === 'Verified' };
}

// Which of this cooperative's records does an audit entry belong to?
export function auditBelongsToCoop(entry, data, coop, userName) {
  if (!coop) return false;
  if (entry.actor === coop.name || entry.actor === userName) return true;
  const id = entry.entityId;
  const byCoop = (arr) => arr.some((r) => r.id === id && r.coopId === coop.id);
  const pkgIds = data.packages.filter((p) => p.coopId === coop.id).map((p) => p.id);
  switch (entry.entityType) {
    case 'Cooperative': return id === coop.id;
    case 'Farmer': return byCoop(data.farmers);
    case 'Farm': return byCoop(data.farms);
    case 'Package': return pkgIds.includes(id);
    case 'Application': return byCoop(data.applications);
    case 'Milestone': return data.milestones.some((m) => m.id === id && pkgIds.includes(m.packageId));
    case 'Disbursement': return data.disbursements.some((d) => d.id === id && pkgIds.includes(d.packageId));
    case 'Investment': return data.investments.some((i) => i.id === id && pkgIds.includes(i.packageId));
    case 'Reconciliation': return data.reconciliation.some((r) => r.id === id && pkgIds.includes(r.packageId));
    default: return false;
  }
}

export function auditLink(entry) {
  const id = entry.entityId;
  switch (entry.entityType) {
    case 'Farmer': return id && String(id).startsWith('f-') ? `/coop/farmers/${id}` : '/coop/farmers';
    case 'Farm': return `/coop/farms/${id}`;
    case 'Package': return `/coop/funding/${id}`;
    case 'Milestone': return `/coop/farming-progress/${id}`;
    case 'Disbursement': return '/coop/disbursements';
    case 'Complaint': return `/coop/complaints/${id}`;
    case 'Cooperative': return '/coop/profile';
    case 'Investment': return '/coop/investments';
    default: return '/coop/audit-log';
  }
}

// Keeps one stable function identity while always calling the latest closure. The shared Modal re-runs its
// focus effect when `onClose` changes, which would pull focus out of a field the person is typing in.
export function useStableCallback(fn) {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...args) => ref.current(...args), []);
}

// Checks a chosen upload against the same rules the dropzone text promises. File contents never leave the browser.
export function checkUpload(file, { max = 5 * 1024 * 1024, exts = ['jpg', 'jpeg', 'png', 'pdf'] } = {}) {
  if (!file) return 'Choose a file to upload.';
  const ext = String(file.name).split('.').pop().toLowerCase();
  if (!exts.includes(ext)) return `This file type is not accepted. Use ${exts.map((e) => e.toUpperCase()).join(', ')}.`;
  if (file.size > max) return `This file is larger than ${Math.round(max / 1048576)}MB. Choose a smaller file.`;
  return '';
}
