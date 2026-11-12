import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ROLE_META } from '../data/people.js';

/**
 * Client-side application store. FRONTEND ONLY.
 *
 * Empty client state while API integrations are being connected.
 */

const AppContext = createContext(null);
const STORAGE_KEY = 'collabfarm-app-state-v2';
const SESSION_KEY = 'collabfarm-app-session-v2';
const TOKEN_KEY = 'collabfarm-access-token';

const emptyData = () => ({
  users: [], cooperatives: [], investors: [], farmers: [], farms: [], suppliers: [], packages: [],
  tranches: [], investments: [], transactions: [], wallets: {}, disbursements: [], milestones: [],
  inputRecords: [], expenses: [], harvests: [], sales: [], distributions: [], obligations: [],
  contracts: [], complaints: [], notifications: [], audit: [], reconciliation: [], riskCases: [],
  applications: [], userVerification: [], platformSettings: {}, userSettings: {},
});

function safeGet(key) {
  try { return JSON.parse(window.localStorage.getItem(key)); } catch { return null; }
}
function safeSet(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable, keep working in memory */ }
}
function safeRemove(key) {
  try { window.localStorage.removeItem(key); } catch { /* ignore */ }
}

let counter = 1000;
export const newId = (prefix) => `${prefix}-${(counter += 1).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const NOW = () => new Date().toISOString();

export function AppProvider({ children }) {
  // Drop the previous prototype's fabricated records and demo session on upgrade.
  useEffect(() => { safeRemove('collabfarm-demo-state-v1'); safeRemove('collabfarm-demo-session-v1'); }, []);
  const [data, setData] = useState(() => {
    const saved = safeGet(STORAGE_KEY);
    return saved && saved.packages ? { ...emptyData(), ...saved } : emptyData();
  });
  const [sessionUserId, setSessionUserId] = useState(() => safeGet(SESSION_KEY));
  const [accessToken, setAccessToken] = useState(() => { try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; } });
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [toasts, setToasts] = useState([]);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => { safeSet(STORAGE_KEY, data); }, [data]);
  useEffect(() => { if (sessionUserId) safeSet(SESSION_KEY, sessionUserId); else safeRemove(SESSION_KEY); }, [sessionUserId]);
  useEffect(() => { try { if (accessToken) window.localStorage.setItem(TOKEN_KEY, accessToken); else window.localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } }, [accessToken]);

  const user = useMemo(() => data.users.find((u) => u.id === sessionUserId) || null, [data.users, sessionUserId]);

  // ----- toasts -----
  const toast = useCallback((message, tone = 'success') => {
    const id = newId('t');
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  // ----- generic collection helpers (every material change can write an audit entry) -----
  const audit = useCallback((entry) => {
    setData((d) => ({
      ...d,
      audit: [{ id: newId('au'), at: NOW(), actor: user?.name || 'System', role: user?.role || 'system', ref: `REQ-${Math.floor(90000 + Math.random() * 9999)}`, ...entry }, ...d.audit],
    }));
  }, [user]);

  const add = useCallback((collection, item, auditEntry) => {
    const record = { id: item.id || newId(collection.slice(0, 3)), ...item };
    setData((d) => ({
      ...d,
      [collection]: [record, ...d[collection]],
      audit: auditEntry ? [{ id: newId('au'), at: NOW(), actor: user?.name || 'System', role: user?.role || 'system', ref: `REQ-${Math.floor(90000 + Math.random() * 9999)}`, entityId: record.id, ...auditEntry }, ...d.audit] : d.audit,
    }));
    return record;
  }, [user]);

  const update = useCallback((collection, id, patch, auditEntry) => {
    setData((d) => ({
      ...d,
      [collection]: d[collection].map((r) => (r.id === id ? { ...r, ...(typeof patch === 'function' ? patch(r) : patch) } : r)),
      audit: auditEntry ? [{ id: newId('au'), at: NOW(), actor: user?.name || 'System', role: user?.role || 'system', ref: `REQ-${Math.floor(90000 + Math.random() * 9999)}`, entityId: id, ...auditEntry }, ...d.audit] : d.audit,
    }));
  }, [user]);

  // Deleting financial records is not allowed (PRD 7.7, 13.20). Only soft removal through status changes.
  const notify = useCallback((role, title, message, link = '', type = 'info') => {
    setData((d) => ({ ...d, notifications: [{ id: newId('n'), role, type, title, message, link, createdAt: NOW(), read: false }, ...d.notifications] }));
  }, []);

  const patchData = useCallback((patch) => setData((d) => ({ ...d, ...(typeof patch === 'function' ? patch(d) : patch) })), []);

  // ----- session (simulated, client side only) -----
  // Returns false (and explains why) when the account is suspended, so every entry point is covered.
  const signIn = useCallback((userId) => {
    const target = dataRef.current.users.find((u) => u.id === userId);
    if (target && target.status === 'Suspended') {
      toast(`${target.name}'s account is suspended and cannot sign in. An administrator can reactivate it under User Management.`, 'error');
      return false;
    }
    setSessionUserId(userId);
    return true;
  }, [toast]);
  const signOut = useCallback(() => { setSessionUserId(null); setAccessToken(null); }, []);
  const beginRegistration = useCallback((registration) => setPendingRegistration(registration), []);
  const clearPendingRegistration = useCallback(() => setPendingRegistration(null), []);
  const authenticate = useCallback((account, token) => {
    const hasOrg = account.role === 'cooperative' || account.role === 'investor';
    const collection = account.role === 'cooperative' ? 'cooperatives' : 'investors';
    const orgId = hasOrg ? (account.orgId || `${account.role === 'cooperative' ? 'coop' : 'inv'}-${account.id}`) : account.orgId;
    const authenticatedAccount = { ...account, orgId };
    setData((d) => {
      const next = { ...d, users: [authenticatedAccount, ...d.users.filter((u) => u.id !== account.id)] };
      if (!hasOrg || d[collection].some((org) => org.id === orgId)) return next;
      const org = account.role === 'cooperative'
        ? { id: orgId, name: '', regNumber: '', yearEstablished: null, email: account.email || '', phone: account.phone || '', address: '', state: '', lga: '', status: 'Draft', documents: [], bank: { name: '', accountName: '', last4: '' }, onboarding: { step: 0 }, statusHistory: [] }
        : { id: orgId, name: account.name || '', email: account.email || '', phone: account.phone || '', status: 'Draft', onboarding: { step: 0 }, statusHistory: [] };
      return { ...next, [collection]: [org, ...d[collection]] };
    });
    setAccessToken(token);
    setSessionUserId(account.id);
  }, []);
  const value = useMemo(() => ({
    data, user, role: user?.role || null, roleMeta: user ? ROLE_META[user.role] : null,
    accessToken, pendingRegistration, beginRegistration, clearPendingRegistration,
    toast, toasts, dismissToast, add, update, audit, notify, patchData, signIn, signOut, authenticate,
  }), [data, user, accessToken, pendingRegistration, beginRegistration, clearPendingRegistration, toast, toasts, dismissToast, add, update, audit, notify, patchData, signIn, signOut, authenticate]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

const TOAST_ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
export function ToastHost() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => {
        const Icon = TOAST_ICONS[t.tone] || Info;
        return (
          <div key={t.id} className={`toast toast--${t.tone}`} role="status">
            <Icon size={18} style={{ flex: 'none', marginTop: 2 }} />
            <span>{t.message}</span>
            <button className="toast__close" onClick={() => dismissToast(t.id)} aria-label="Dismiss"><X size={16} /></button>
          </div>
        );
      })}
    </div>
  );
}

// Simulated network latency so loading skeletons can be demonstrated. Resolves locally, no request is made.
export function useSimulatedLoad(ms = 500) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return loading;
}

// Simulated async action (for example "send to the payment partner"). Never leaves the browser.
export function simulate(ms = 700) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
