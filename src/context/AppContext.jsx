import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { createSeed } from '../data/seed.js';
import { ROLE_META } from '../data/people.js';

/**
 * Client-side application store. FRONTEND ONLY.
 *
 * - All records live in memory and are mirrored to localStorage so a refresh keeps the demo state.
 * - No network calls are made anywhere in this app. "Server" behaviour (approvals, reconciliation,
 *   notifications, audit entries) is simulated here and is clearly labelled as simulated in the UI.
 * - To connect a real backend later, replace the actions below with API calls. Page components only
 *   use the actions and selectors exposed by useApp(), so they would not need to change.
 */

const AppContext = createContext(null);
const STORAGE_KEY = 'collabfarm-demo-state-v1';
const SESSION_KEY = 'collabfarm-demo-session-v1';

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
  const [data, setData] = useState(() => {
    const saved = safeGet(STORAGE_KEY);
    return saved && saved.packages ? saved : createSeed();
  });
  const [sessionUserId, setSessionUserId] = useState(() => safeGet(SESSION_KEY));
  const [toasts, setToasts] = useState([]);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => { safeSet(STORAGE_KEY, data); }, [data]);
  useEffect(() => { if (sessionUserId) safeSet(SESSION_KEY, sessionUserId); else safeRemove(SESSION_KEY); }, [sessionUserId]);

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
  const signOut = useCallback(() => setSessionUserId(null), []);
  const resetDemo = useCallback(() => { safeRemove(STORAGE_KEY); setData(createSeed()); }, []);

  const value = useMemo(() => ({
    data, user, role: user?.role || null, roleMeta: user ? ROLE_META[user.role] : null,
    toast, toasts, dismissToast, add, update, audit, notify, patchData, signIn, signOut, resetDemo,
  }), [data, user, toast, toasts, dismissToast, add, update, audit, notify, patchData, signIn, signOut, resetDemo]);

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
