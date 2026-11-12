export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://test-collab-farm.onrender.com').replace(/\/$/, '');

export function apiErrorMessage(payload, fallback) {
  if (typeof payload?.detail === 'string') return payload.detail;
  if (Array.isArray(payload?.detail)) return payload.detail.map((item) => item.msg).filter(Boolean).join(' ');
  if (typeof payload?.message === 'string') return payload.message;
  return fallback;
}

export function accountFromAuthResponse(response, token, username, fallback = {}) {
  const claims = decodeJwt(token) || {};
  const profile = response?.user || response?.account || response?.data?.user || response?.data ||
    (response?.role || response?.user_role || response?.account_type ? response : response?.profile) || response || {};
  const role = normaliseRole(profile.role || profile.user_role || profile.account_type || response?.role || response?.user_role || response?.account_type || claims.role || claims.user_role || claims.account_type || fallback.role);
  if (!role) return null;
  const id = String(profile.id || profile.user_id || claims.user_id || claims.sub || fallback.id || username);
  const name = profile.name || profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || response?.name || claims.name || claims.full_name || fallback.name || username;
  return {
    id,
    role,
    name,
    firstName: profile.first_name || claims.first_name || fallback.firstName || String(name).split(' ')[0],
    email: profile.email || response?.email || claims.email || username,
    phone: profile.phone_number || response?.phone_number || claims.phone_number || fallback.phone || '',
    orgId: profile.org_id || profile.organization_id || profile.cooperative_id || response?.org_id || claims.org_id || claims.organization_id || claims.cooperative_id || fallback.orgId || null,
    title: profile.title || role,
  };
}

function normaliseRole(value) {
  const role = String(value || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (['cooperative', 'co_op', 'coop', 'cooperative_admin'].includes(role)) return 'cooperative';
  if (['investor', 'admin', 'farmer'].includes(role)) return role;
  return null;
}

function decodeJwt(token) {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const binary = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }
}
