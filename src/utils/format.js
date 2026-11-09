// Formatting helpers. All amounts are plain numbers in naira.

const nairaFmt = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 });

export const NAIRA = '₦';

export function formatNaira(value, { compact = false } = {}) {
  const n = Number(value) || 0;
  if (compact) return NAIRA + shortNumber(n);
  return NAIRA + nairaFmt.format(n);
}

export function shortNumber(n) {
  const abs = Math.abs(n);
  if (abs >= 1e9) return trim(n / 1e9) + 'B';
  if (abs >= 1e6) return trim(n / 1e6) + 'M';
  if (abs >= 1e3) return trim(n / 1e3) + 'K';
  return String(n);
}
const trim = (x) => (Math.round(x * 10) / 10).toString();

export function formatNumber(n) {
  return nairaFmt.format(Number(n) || 0);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function ordinal(d) {
  const j = d % 10, k = d % 100;
  if (j === 1 && k !== 11) return d + 'st';
  if (j === 2 && k !== 12) return d + 'nd';
  if (j === 3 && k !== 13) return d + 'rd';
  return d + 'th';
}

// "27th Aug, 2025"
export function formatDate(input) {
  const d = toDate(input);
  if (!d) return '-';
  return `${ordinal(d.getDate())} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}
// "27 Aug 2025"
export function formatDateShort(input) {
  const d = toDate(input);
  if (!d) return '-';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
// "09:30 AM"
export function formatTime(input) {
  const d = toDate(input);
  if (!d) return '';
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ap}`;
}
export function formatDateTime(input) {
  const d = toDate(input);
  if (!d) return '-';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${formatTime(d)}`;
}
export function toDate(input) {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}
export function relativeTime(input, now = new Date('2026-10-30T12:30:00')) {
  const d = toDate(input);
  if (!d) return '';
  const mins = Math.round((now - d) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return formatDateShort(d);
}

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

export function percent(part, whole) {
  if (!whole) return 0;
  return Math.max(0, Math.min(100, Math.round((part / whole) * 100)));
}

export function cx(...parts) {
  return parts.flat().filter(Boolean).join(' ');
}

export function pluralise(n, one, many = one + 's') {
  return `${formatNumber(n)} ${n === 1 ? one : many}`;
}

// Stable pseudo-random reference such as "TX-84120937"
export function makeRef(prefix = 'TX', seed = Date.now()) {
  const n = Math.abs(Math.floor(Math.sin(seed) * 1e8)).toString().padStart(8, '0').slice(0, 8);
  return `${prefix}-${n}`;
}
