import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCheck, MailOpen, ArrowRight, BellOff } from 'lucide-react';
import '../../styles/pages/shr.css';
import { useApp } from '../../context/AppContext.jsx';
import { Banner, Button, Card, EmptyState, PageHeader, PageSkeleton, SearchInput, Pagination } from '../../components/ui/index.js';
import { FilterChips } from '../../components/shr/ShrBits.jsx';
import { notifMeta } from '../../components/shr/notifMeta.jsx';
import { relativeTime, cx } from '../../utils/format.js';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';

const PAGE_SIZE = 20;
const readParam = (value) => value === 'unread' ? 'false' : value === 'read' ? 'true' : '';
const typeValue = (item) => String(item.notification_type || item.type || 'general').toLowerCase().replaceAll('_', '-');
const mapNotification = (item = {}) => ({
  ...item,
  id: item.id,
  title: item.title || 'Notification',
  message: item.message || '',
  type: typeValue(item),
  read: Boolean(item.is_read ?? item.read),
  link: item.link || '',
  createdAt: item.created_at || item.createdAt || '',
});

export default function Notifications() {
  const { accessToken, toast } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const queryText = params.get('q') || '';
  const type = params.get('type') || '';
  const read = params.get('read') || '';
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => { setPage(1); }, [type, read]);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError('');
      if (!accessToken) { setError('Your session has expired. Sign in again to view notifications.'); setLoading(false); return; }
      const query = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      const isRead = readParam(read);
      if (isRead !== '') query.set('is_read', isRead);
      try {
        const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };
        const [listResponse, countResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/notifications?${query}`, { headers, signal: controller.signal }),
          fetch(`${API_BASE_URL}/notifications/unread-count`, { headers, signal: controller.signal }),
        ]);
        const [payload, countPayload] = await Promise.all([listResponse.json().catch(() => null), countResponse.json().catch(() => null)]);
        if (!listResponse.ok) throw new Error(apiErrorMessage(payload, `Could not load notifications (${listResponse.status}).`));
        const nextItems = Array.isArray(payload?.items) ? payload.items.map(mapNotification) : [];
        setItems(nextItems); setTotal(Number(payload?.total) || 0);
        const count = Number(countPayload?.unread_count ?? countPayload?.count ?? countPayload?.total_unread ?? Object.values(countPayload || {}).find((value) => Number.isFinite(Number(value))));
        setUnread(Number.isFinite(count) ? count : Number(payload?.unread_count) || nextItems.filter((item) => !item.read).length);
      } catch (loadError) { if (loadError.name !== 'AbortError') { setItems([]); setTotal(0); setError(loadError.message || 'Could not load notifications.'); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    load(); return () => controller.abort();
  }, [accessToken, page, read, reloadKey]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };
  const typeOptions = useMemo(() => {
    const types = [...new Set(items.map((item) => item.type))];
    return [{ value: '', label: 'All types' }, ...types.map((value) => ({ value, label: notifMeta(value).label }))];
  }, [items]);
  const filtered = useMemo(() => {
    const needle = queryText.trim().toLowerCase();
    return items.filter((item) => (!type || item.type === type) && (!needle || `${item.title} ${item.message}`.toLowerCase().includes(needle)));
  }, [items, queryText, type]);
  const grouped = useMemo(() => {
    const now = new Date();
    const bucket = (dateString) => {
      const date = new Date(dateString); if (!Number.isFinite(date.getTime())) return 'Earlier';
      const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      if (dateDay >= today) return 'Today'; if (dateDay >= today - 86400000) return 'Yesterday'; return 'Earlier';
    };
    return ['Today', 'Yesterday', 'Earlier'].map((group) => ({ group, items: filtered.filter((item) => bucket(item.createdAt) === group) })).filter((entry) => entry.items.length);
  }, [filtered]);

  const markOne = async (item) => {
    if (item.read || !item.id) return true;
    setBusyId(item.id);
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${encodeURIComponent(item.id)}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not mark notification as read (${response.status}).`));
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
      setUnread((count) => Math.max(0, count - 1));
      window.dispatchEvent(new Event('notifications:changed'));
      return true;
    } catch (actionError) { toast(actionError.message || 'Could not mark notification as read.', 'error'); return false; }
    finally { setBusyId(''); }
  };
  const open = async (item) => { const success = await markOne(item); if (success && item.link) navigate(item.link); };
  const markAll = async () => {
    if (!unread || markingAll) return;
    setMarkingAll(true);
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not mark notifications as read (${response.status}).`));
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      setUnread(0); toast(payload?.message || 'All notifications marked as read');
      window.dispatchEvent(new Event('notifications:changed'));
    } catch (actionError) { toast(actionError.message || 'Could not mark notifications as read.', 'error'); }
    finally { setMarkingAll(false); }
  };
  const clear = () => { setParams(new URLSearchParams(), { replace: true }); setPage(1); };

  if (loading && !items.length) return <PageSkeleton />;
  return <div className="page shr-page">
    <PageHeader title="Notifications" subtitle={unread ? `You have ${unread} unread notification${unread === 1 ? '' : 's'}.` : 'You are all caught up.'} actions={<Button variant="outline" onClick={markAll} loading={markingAll} disabled={unread === 0}><CheckCheck size={18} />Mark all as read</Button>} />
    {error ? <Banner tone="warn" title="Notifications unavailable">{error} <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>Try again</Button></Banner> : <>
      <Card className="shr-toolbar-card"><div className="shr-toolbar"><SearchInput value={queryText} onChange={(value) => setParam('q', value)} placeholder="Search notifications on this page" /><FilterChips label="Filter by read state" value={read} onChange={(value) => setParam('read', value)} options={[{ value: '', label: 'All' }, { value: 'unread', label: 'Unread', count: unread }, { value: 'read', label: 'Read' }]} /></div>
        {typeOptions.length > 2 && <FilterChips label="Filter by type" value={type} onChange={(value) => setParam('type', value)} options={typeOptions} />}
      </Card>
      {!total ? <Card><EmptyState icon={<BellOff size={28} />} title="No notifications yet">When something needs your attention, it will appear here and in the bell at the top of the page.</EmptyState></Card>
        : !filtered.length ? <Card><EmptyState icon={<BellOff size={28} />} title="No notifications match your filters" action={<Button variant="outline" onClick={clear}>Clear filters</Button>}>Try a different search word or filter.</EmptyState></Card>
          : <>{grouped.map(({ group, items: groupItems }) => <section key={group} aria-labelledby={`notif-${group}`}><h2 id={`notif-${group}`} className="shr-group-title">{group}</h2><Card pad={false}><ul className="shr-notif-list">{groupItems.map((item) => {
            const meta = notifMeta(item.type);
            return <li key={item.id} className={cx('shr-notif', !item.read && 'shr-notif--unread')}><span className={`shr-ico shr-ico--${meta.tone}`} aria-hidden="true">{meta.icon}</span><div className="shr-notif__body">
              <button type="button" className="shr-notif__title" onClick={() => open(item)} disabled={busyId === item.id}><>{!item.read && <span className="shr-unread-dot" aria-hidden="true" />}{!item.read && <span className="sr-only">Unread: </span>}{item.title}</></button>
              <p className="small">{item.message}</p><p className="caption muted">{meta.label} · {relativeTime(item.createdAt)}</p>
            </div><div className="shr-notif__actions">{item.link && <Button size="sm" variant="outline-green" onClick={() => open(item)}>Open<ArrowRight size={14} /></Button>}
              {!item.read && <Button size="sm" variant="ghost" onClick={() => markOne(item)} disabled={busyId === item.id} aria-label={`Mark "${item.title}" as read`}><MailOpen size={16} /><span className="shr-hide-sm">Mark read</span></Button>}
            </div></li>;
          })}</ul></Card></section>)}
          <div className="pagination-bar" style={{ marginTop: 0 }}><span className="muted">Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)} of {total} notifications</span><Pagination page={page} pages={pages} onPage={setPage} /></div>
          </>}
    </>}
  </div>;
}
