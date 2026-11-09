import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCheck, Mail, MailOpen, ArrowRight, BellOff } from 'lucide-react';
import '../../styles/pages/shr.css';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { Button, Card, EmptyState, PageHeader, PageSkeleton, SearchInput } from '../../components/ui/index.js';
import { FilterChips } from '../../components/shr/ShrBits.jsx';
import { notifMeta } from '../../components/shr/notifMeta.jsx';
import { dayBucket } from '../../components/shr/shrUtils.js';
import { relativeTime, cx } from '../../utils/format.js';

const PAGE = 8;
const GROUPS = ['Today', 'Yesterday', 'Earlier'];

export default function Notifications() {
  const { data, role, update, patchData, toast } = useApp();
  const navigate = useNavigate();
  const loading = useSimulatedLoad(350);
  const [params, setParams] = useSearchParams();
  const [shown, setShown] = useState(PAGE);

  const q = params.get('q') || '';
  const type = params.get('type') || '';
  const read = params.get('read') || '';
  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
    setShown(PAGE);
  };

  const mine = useMemo(
    () => data.notifications.filter((n) => n.role === role).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [data.notifications, role],
  );
  const unread = mine.filter((n) => !n.read).length;

  const typeOptions = useMemo(() => {
    const counts = {};
    mine.forEach((n) => { counts[n.type] = (counts[n.type] || 0) + 1; });
    return [{ value: '', label: 'All types', count: mine.length }, ...Object.keys(counts).map((t) => ({ value: t, label: notifMeta(t).label, count: counts[t] }))];
  }, [mine]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return mine.filter((n) => {
      if (type && n.type !== type) return false;
      if (read === 'unread' && n.read) return false;
      if (read === 'read' && !n.read) return false;
      if (needle && !`${n.title} ${n.message}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [mine, q, type, read]);

  const visible = filtered.slice(0, shown);
  const grouped = GROUPS.map((g) => ({ g, items: visible.filter((n) => dayBucket(n.createdAt) === g) })).filter((x) => x.items.length);

  const markAll = () => {
    patchData((d) => ({ notifications: d.notifications.map((n) => (n.role === role && !n.read ? { ...n, read: true } : n)) }));
    toast(`Marked ${unread} notification${unread === 1 ? '' : 's'} as read`);
  };
  const open = (n) => {
    if (!n.read) update('notifications', n.id, { read: true });
    if (n.link) navigate(n.link);
  };
  const toggle = (n) => {
    update('notifications', n.id, { read: !n.read });
    toast(n.read ? 'Marked as unread' : 'Marked as read', 'info');
  };
  const clear = () => { setParams(new URLSearchParams(), { replace: true }); setShown(PAGE); };

  if (loading) return <PageSkeleton />;

  return (
    <div className="page shr-page">
      <PageHeader
        title="Notifications"
        subtitle={unread ? `You have ${unread} unread notification${unread === 1 ? '' : 's'}.` : 'You are all caught up.'}
        actions={<Button variant="outline" onClick={markAll} disabled={unread === 0}><CheckCheck size={18} />Mark all as read</Button>}
      />

      <Card className="shr-toolbar-card">
        <div className="shr-toolbar">
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search notifications" />
          <FilterChips
            label="Filter by read state"
            value={read}
            onChange={(v) => setParam('read', v)}
            options={[{ value: '', label: 'All' }, { value: 'unread', label: 'Unread', count: unread }, { value: 'read', label: 'Read', count: mine.length - unread }]}
          />
        </div>
        {typeOptions.length > 2 && (
          <FilterChips label="Filter by type" value={type} onChange={(v) => setParam('type', v)} options={typeOptions} />
        )}
      </Card>

      {mine.length === 0 ? (
        <Card><EmptyState icon={<BellOff size={28} />} title="No notifications yet">When something needs your attention, such as a contract to sign or a milestone update, it will appear here and in the bell at the top of the page.</EmptyState></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<BellOff size={28} />} title="No notifications match your filters" action={<Button variant="outline" onClick={clear}>Clear filters</Button>}>Try a different search word, or show all types and read states.</EmptyState></Card>
      ) : (
        <>
          {grouped.map(({ g, items }) => (
            <section key={g} aria-labelledby={`notif-${g}`}>
              <h2 id={`notif-${g}`} className="shr-group-title">{g}</h2>
              <Card pad={false}>
                <ul className="shr-notif-list">
                  {items.map((n) => {
                    const meta = notifMeta(n.type);
                    return (
                      <li key={n.id} className={cx('shr-notif', !n.read && 'shr-notif--unread')}>
                        <span className={`shr-ico shr-ico--${meta.tone}`} aria-hidden="true">{meta.icon}</span>
                        <div className="shr-notif__body">
                          <button type="button" className="shr-notif__title" onClick={() => open(n)} disabled={!n.link && n.read}>
                            {!n.read && <span className="shr-unread-dot" aria-hidden="true" />}
                            {!n.read && <span className="sr-only">Unread: </span>}
                            {n.title}
                          </button>
                          <p className="small">{n.message}</p>
                          <p className="caption muted">{meta.label} &middot; {relativeTime(n.createdAt)}</p>
                        </div>
                        <div className="shr-notif__actions">
                          {n.link && <Button size="sm" variant="outline-green" onClick={() => open(n)}>Open<ArrowRight size={14} /></Button>}
                          <Button size="sm" variant="ghost" onClick={() => toggle(n)} aria-label={n.read ? `Mark "${n.title}" as unread` : `Mark "${n.title}" as read`}>
                            {n.read ? <Mail size={16} /> : <MailOpen size={16} />}
                            <span className="shr-hide-sm">{n.read ? 'Mark unread' : 'Mark read'}</span>
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          ))}
          <div className="pagination-bar" style={{ marginTop: 0 }}>
            <span className="muted">Showing {visible.length} of {filtered.length} notifications</span>
            {visible.length < filtered.length && <Button variant="outline" onClick={() => setShown((s) => s + PAGE)}>Load more</Button>}
          </div>
        </>
      )}
    </div>
  );
}
