import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Bell, ChevronDown, UserCircle, Menu, LogOut, Settings as SettingsIcon, Search } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { NAV } from './navConfig.jsx';
import { ROLE_META } from '../data/people.js';
import { Logo } from '../components/common/Brand.jsx';
import { ChatWidget } from '../components/common/ChatWidget.jsx';
import { Dropdown } from '../components/ui/Dropdown.jsx';
import { PageSkeleton } from '../components/ui/Card.jsx';
import { relativeTime, cx } from '../utils/format.js';
import { API_BASE_URL, apiErrorMessage } from '../utils/api.js';

function Sidebar({ role, open, onClose }) {
  const nav = NAV[role];
  const link = (n) => (
    <NavLink key={n.to} to={n.to} end={n.end} onClick={onClose} className={({ isActive }) => cx('nav-item', isActive && 'nav-item--active')}>
      {n.icon}<span>{n.label}</span>
    </NavLink>
  );
  return (
    <>
      {open && <div className="sidebar-scrim" onClick={onClose} aria-hidden="true" />}
      <aside className={cx('app-sidebar', open && 'app-sidebar--open')} aria-label="Main navigation">
        <nav className="stack" style={{ gap: 18 }}>
          <div className="nav-group">{nav.main.map(link)}</div>
          {nav.more?.length > 0 && (
            <div className="nav-group">
              <div className="dropdown__label" style={{ paddingLeft: 16 }}>More</div>
              {nav.more.map(link)}
            </div>
          )}
        </nav>
        <div className="nav-group" style={{ marginTop: 24 }}>{nav.bottom.map(link)}</div>
      </aside>
    </>
  );
}

function NotificationBell({ role, base }) {
  const { accessToken } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!accessToken) { setItems([]); setUnread(0); return undefined; }
    const controller = new AbortController();
    const load = async () => {
      const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };
      try {
        const [listResponse, countResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/notifications?page=1&page_size=5`, { headers, signal: controller.signal }),
          fetch(`${API_BASE_URL}/notifications/unread-count`, { headers, signal: controller.signal }),
        ]);
        const [list, count] = await Promise.all([listResponse.json().catch(() => null), countResponse.json().catch(() => null)]);
        if (!listResponse.ok) throw new Error(apiErrorMessage(list, 'Could not load notifications.'));
        setItems((Array.isArray(list?.items) ? list.items : []).map((item) => ({ ...item, read: Boolean(item.is_read ?? item.read), type: String(item.notification_type || item.type || 'general').toLowerCase().replaceAll('_', '-'), createdAt: item.created_at || item.createdAt || '', link: item.link || '' })));
        const countValue = Number(count?.unread_count ?? count?.count ?? count?.total_unread ?? Object.values(count || {}).find((value) => Number.isFinite(Number(value))));
        setUnread(Number.isFinite(countValue) ? countValue : Number(list?.unread_count) || 0);
      } catch { if (!controller.signal.aborted) { setItems([]); setUnread(0); } }
    };
    const refresh = () => load();
    window.addEventListener('notifications:changed', refresh);
    load(); return () => { controller.abort(); window.removeEventListener('notifications:changed', refresh); };
  }, [accessToken, location.pathname]);

  const openNotification = async (item, close) => {
    if (!item.read) {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications/${encodeURIComponent(item.id)}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, 'Could not mark notification as read.'));
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
        setUnread((value) => Math.max(0, value - 1));
      } catch { return; }
    }
    close(); if (item.link) navigate(item.link);
  };
  return (
    <Dropdown
      trigger={({ toggle }) => (
        <button type="button" className="icon-btn" onClick={toggle} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-haspopup="menu">
          <Bell size={22} />
          {unread > 0 && <span className="icon-btn__dot" />}
        </button>
      )}
      panelClassName="notif-panel"
    >
      {({ close }) => (
        <div style={{ width: 340, maxWidth: '86vw' }}>
          <div className="row between" style={{ padding: '6px 12px' }}>
            <strong>Notifications</strong>
            <Link to={`${base}/notifications`} onClick={close} className="small">View all</Link>
          </div>
          {items.slice(0, 5).map((n) => (
            <button key={n.id} className={cx('notif-item', !n.read && 'notif-item--unread')} onClick={() => openNotification(n, close)}>
              <span className="dot" style={{ background: n.read ? 'var(--grey-400)' : 'var(--green-500)', marginTop: 8 }} />
              <span>
                <span className="notif-item__title small" style={{ display: 'block' }}>{n.title}</span>
                <span className="caption muted" style={{ display: 'block' }}>{n.message}</span>
                <span className="caption muted">{relativeTime(n.createdAt)}</span>
              </span>
            </button>
          ))}
          {items.length === 0 && <p className="small muted" style={{ padding: 12 }}>You are all caught up.</p>}
        </div>
      )}
    </Dropdown>
  );
}

function AccountMenu({ base }) {
  const { user, signOut } = useApp();
  const navigate = useNavigate();
  return (
    <Dropdown
      trigger={({ toggle }) => (
        <button type="button" className="account-btn" onClick={toggle} aria-haspopup="menu">
          <span className="account-btn__avatar"><UserCircle size={26} strokeWidth={1.5} /></span>
          <span>Account</span>
          <ChevronDown size={18} color="var(--grey-700)" />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div style={{ padding: '8px 12px' }}>
            <div className="strong small">{user.name}</div>
            <div className="caption muted">{user.title}</div>
          </div>
          <Link className="dropdown__item" to={`${base}/profile`} onClick={close}><UserCircle size={16} />Profile</Link>
          <Link className="dropdown__item" to={`${base}/settings`} onClick={close}><SettingsIcon size={16} />Settings</Link>
          <button className="dropdown__item dropdown__item--danger" onClick={() => { signOut(); close(); navigate('/login'); }}><LogOut size={16} />Sign out</button>
        </>
      )}
    </Dropdown>
  );
}

// Shown if a signed in user opens another role's area. Real enforcement would live on the server (PRD 6.1).
function Forbidden({ userRole }) {
  const base = ROLE_META[userRole].base;
  return (
    <div className="page" style={{ alignItems: 'center', paddingTop: 80 }}>
      <h1>You do not have access to this area</h1>
      <p className="muted">Your account is signed in as {ROLE_META[userRole].label}. This section belongs to another role.</p>
      <Link className="btn btn--primary" to={base}>Go to my dashboard</Link>
    </div>
  );
}

// Shown if an administrator suspends the account that is currently signed in.
function SuspendedNotice({ user }) {
  const { signOut } = useApp();
  const navigate = useNavigate();
  return (
    <div className="page" style={{ alignItems: 'center', paddingTop: 80 }}>
      <h1>This account is suspended</h1>
      <p className="muted">{user.suspendedReason ? `Reason recorded: ${user.suspendedReason}. ` : ''}An administrator can reactivate it under User Management.</p>
      <button className="btn btn--primary" onClick={() => { signOut(); navigate('/login'); }}>Sign out</button>
    </div>
  );
}

export default function DashboardLayout({ role }) {
  const { user, data } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');
  const base = ROLE_META[role].base;
  useEffect(() => { setMenu(false); window.scrollTo?.(0, 0); }, [location.pathname]);

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.status === 'Suspended') return <SuspendedNotice user={user} />;
  if (user.role !== role) return <Forbidden userRole={user.role} />;

  const coop = role === 'cooperative' ? data.cooperatives.find((c) => c.id === user.orgId) : null;
  const title = coop ? coop.name : ROLE_META[role].title;
  const showSearch = (role === 'cooperative' || role === 'investor') && location.pathname === base;

  return (
    <div className="app-shell">
      <div className="app-logo-cell"><Logo to={base} /></div>
      <header className="app-topbar">
        <button type="button" className="icon-btn menu-toggle" onClick={() => setMenu(true)} aria-label="Open menu"><Menu size={22} /></button>
        <div className="app-topbar__title">{title}</div>
        {showSearch && (
          <form className="app-topbar__search" onSubmit={(e) => { e.preventDefault(); navigate(`${base}/farmers?q=${encodeURIComponent(q)}`); }} role="search">
            <div className="search" style={{ maxWidth: 'none' }}>
              <input className="input" style={{ borderRadius: 12, height: 52 }} placeholder="Search Farmers" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search farmers" />
              <Search size={20} />
            </div>
          </form>
        )}
        <div className="app-topbar__right">
          <NotificationBell role={role} base={base} />
          <AccountMenu base={base} />
        </div>
      </header>
      <Sidebar role={role} open={menu} onClose={() => setMenu(false)} />
      <main className="app-main" id="main">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <ChatWidget />
    </div>
  );
}
