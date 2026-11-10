import { ROLE_META } from '../../data/people.js';

// Shared helpers for the auth and onboarding pages. Pure functions only, nothing here talks to a server.

export const OTP_DEMO_CODE = '123456';
export const OTP_LENGTH = 6;
export const OTP_RESEND_SECONDS = 30;
// Name given to a draft cooperative before the person types the real one in the wizard.
export const DRAFT_COOP_NAME = 'New cooperative';
export const DEMO_USER_IDS = ['u-coop', 'u-inv', 'u-admin', 'u-admin2', 'u-farmer'];
// An organisation can only be edited in the wizard while it is a draft or a reviewer asked for more information.
export const EDITABLE_STATUSES = ['Draft', 'Additional Information Required'];

// Demo invite codes that a cooperative would normally send to a farmer. Local only, mapped to existing farmer records.
export const DEMO_INVITES = [
  { code: 'GFC-F003-7K2Q', farmerId: 'f-003' },
  { code: 'GFC-F001-9M4X', farmerId: 'f-001' },
  { code: 'GFC-F006-3T8R', farmerId: 'f-006' },
];
export const normaliseCode = (v) => String(v || '').toUpperCase().replace(/\s+/g, '');

// ---------- validation ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (v) => EMAIL_RE.test(String(v || '').trim());
export const emailKey = (v) => String(v || '').trim().toLowerCase();

export const phoneDigits = (v) => String(v || '').replace(/[\s\-().]/g, '');
// Nigerian mobile numbers: 0 or +234 or 234, then 7, 8 or 9, then 0 or 1, then eight more digits.
export const isNigerianPhone = (v) => /^(?:\+?234|0)[789][01]\d{8}$/.test(phoneDigits(v));
export function normalisePhone(v) {
  const local = phoneDigits(v).replace(/^\+?234/, '0');
  if (!/^0\d{10}$/.test(local)) return String(v || '').trim();
  return `+234 ${local.slice(1, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}
export const PHONE_HINT = 'Nigerian mobile number, for example 0803 123 4567 or +234 803 123 4567.';
export const PHONE_ERROR = 'Enter a Nigerian mobile number, for example 0803 123 4567 or +234 803 123 4567.';

export const isPersonName = (v) => /^[\p{L}][\p{L} '.-]*$/u.test(String(v || '').trim()) && String(v).trim().length >= 2;

export function passwordChecks(pw = '') {
  return [
    { id: 'len', label: 'At least 8 characters', ok: pw.length >= 8, required: true },
    { id: 'case', label: 'An upper case and a lower case letter', ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw), required: true },
    { id: 'num', label: 'A number', ok: /\d/.test(pw), required: true },
    { id: 'sym', label: 'A symbol such as ! or #', ok: /[^A-Za-z0-9]/.test(pw), required: true },
  ];
}
export function passwordStrength(pw = '') {
  if (!pw) return { score: 0, label: '' };
  const met = passwordChecks(pw).filter((c) => c.ok).length;
  const score = pw.length < 8 ? Math.min(1, met) : Math.max(1, met);
  const label = pw.length < 8 ? 'Too short' : ['', 'Weak', 'Fair', 'Good', 'Strong'][score];
  return { score, label };
}

export function maskEmail(e = '') {
  const [local, domain] = String(e).split('@');
  if (!domain) return 'your email';
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(2, Math.min(local.length - 1, 5)))}@${domain}`;
}
export function maskPhone(p = '') {
  const d = phoneDigits(p).replace(/\D/g, '');
  return d.length >= 4 ? `ending ${d.slice(-4)}` : 'your phone';
}

// ---------- routing ----------
// A saved "from" path is only used when it belongs to the role that just signed in.
export function pathBelongsToRole(role, path) {
  const base = ROLE_META[role]?.base;
  if (!base || typeof path !== 'string') return false;
  if (path === base || path.startsWith(`${base}/`)) return true;
  if (role === 'cooperative' || role === 'investor') return path === '/onboarding/status' || path === `/onboarding/${role}`;
  return false;
}
export function destinationFor(user, from) {
  const fromPath = typeof from === 'string' ? from : from?.pathname;
  if (fromPath && pathBelongsToRole(user.role, fromPath)) return fromPath;
  return ROLE_META[user.role].base;
}
export const onboardingPathFor = (role) => (role === 'cooperative' || role === 'investor' ? `/onboarding/${role}` : ROLE_META[role]?.base || '/');

// Focus the first invalid control after a failed submit so keyboard and screen reader users land on the problem.
export function focusFirstInvalid(root) {
  if (typeof window === 'undefined') return;
  window.requestAnimationFrame(() => {
    const el = root?.querySelector?.('[aria-invalid="true"]');
    el?.focus?.();
  });
}

export const nowISO = () => new Date().toISOString();
export const todayISO = () => new Date().toISOString().slice(0, 10);

export const NIGERIAN_STATES = [
  'FCT, Abuja', 'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa',
  'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

// Documents the wizard asks a cooperative for. `required` ones block the Documents step until a file name is recorded.
export const COOP_DOCUMENTS = [
  { type: 'Registration certificate', hint: 'Official government issued certificate of registration.', required: true },
  { type: 'Proof of address', hint: 'A recent utility bill or tenancy document for the cooperative office.', required: true },
];
export const ACCEPTED_EXT = ['pdf', 'jpg', 'jpeg', 'png'];
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export function checkFile(file) {
  const ext = String(file?.name || '').split('.').pop().toLowerCase();
  if (!ACCEPTED_EXT.includes(ext)) return 'Use a PDF, JPG or PNG file.';
  if (file.size > MAX_FILE_BYTES) return 'That file is larger than 5MB. Choose a smaller file or compress it.';
  return '';
}
export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
