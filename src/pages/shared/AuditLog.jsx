import { useMemo, useState } from 'react';
import { Download, Eye, RotateCcw } from 'lucide-react';
import '../../styles/pages/shr.css';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { Banner, Button, DataTable, FilterSelect, InfoList, Modal, PageHeader, PageSkeleton, SearchInput } from '../../components/ui/index.js';
import { RolePill } from '../../components/shr/ShrBits.jsx';
import { auditScope, downloadFile, isoNow, roleLabel, toCsv, whenLabel } from '../../components/shr/shrUtils.js';
import { formatDateShort, formatNumber, formatTime } from '../../utils/format.js';

const COLUMNS_CSV = [
  { header: 'Timestamp', value: (r) => r.at },
  { header: 'Actor', value: (r) => r.actor },
  { header: 'Role', value: (r) => r.role },
  { header: 'Action', value: (r) => r.action },
  { header: 'Entity type', value: (r) => r.entityType },
  { header: 'Entity id', value: (r) => r.entityId },
  { header: 'Request reference', value: (r) => r.ref },
  { header: 'Reason', value: (r) => r.reason },
  { header: 'Change summary', value: (r) => r.summary },
];

const uniq = (rows, key) => [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort();

export default function AuditLog() {
  const { data, user, role, audit } = useApp();
  const loading = useSimulatedLoad(350);
  const isAdmin = role === 'admin';
  const title = isAdmin ? 'Audit Logs' : 'Audit History';
  const [q, setQ] = useState('');
  const [entity, setEntity] = useState('');
  const [actor, setActor] = useState('');
  const [roleF, setRoleF] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [detail, setDetail] = useState(null);

  const scoped = useMemo(() => auditScope(data, user), [data, user]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const f = from ? new Date(`${from}T00:00:00`) : null;
    const t = to ? new Date(`${to}T23:59:59.999`) : null;
    return scoped.filter((r) => {
      if (entity && r.entityType !== entity) return false;
      if (actor && r.actor !== actor) return false;
      if (roleF && r.role !== roleF) return false;
      const d = new Date(r.at);
      if (f && d < f) return false;
      if (t && d > t) return false;
      if (needle && !`${r.actor} ${r.action} ${r.entityType} ${r.entityId} ${r.ref} ${r.reason} ${r.summary}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [scoped, q, entity, actor, roleF, from, to]);

  const hasFilter = !!(q || entity || actor || roleF || from || to);
  const reset = () => { setQ(''); setEntity(''); setActor(''); setRoleF(''); setFrom(''); setTo(''); };
  const dateBad = from && to && from > to;

  const exportCsv = () => {
    const csv = toCsv(COLUMNS_CSV, filtered);
    const ok = downloadFile(`${isAdmin ? 'audit-logs' : 'audit-history'}-${isoNow().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
    if (ok) audit({ action: 'Exported audit entries', entityType: 'Audit', entityId: 'audit-export', reason: 'CSV export requested', summary: `${filtered.length} entries exported${hasFilter ? ' with filters' : ''}` });
  };

  const columns = [
    { key: 'at', header: 'When', className: 'nowrap', sortable: true, render: (r) => (<div><div>{formatDateShort(r.at)}</div><div className="cell-sub">{formatTime(r.at)}</div></div>) },
    { key: 'actor', header: 'Actor and role', sortable: true, render: (r) => (<div><div className="strong">{r.actor}</div><div className="cell-sub">{roleLabel(r.role)}</div></div>) },
    { key: 'action', header: 'Action', render: (r) => r.action },
    { key: 'entityType', header: 'Entity', render: (r) => (<div><div>{r.entityType}</div><div className="cell-sub">{r.entityId}</div></div>) },
    { key: 'ref', header: 'Request ref', className: 'nowrap', render: (r) => r.ref },
    { key: 'reason', header: 'Reason', render: (r) => <span className="shr-clamp shr-clamp--sm" title={r.reason}>{r.reason || '-'}</span> },
    { key: 'summary', header: 'Change summary', render: (r) => <span className="shr-clamp shr-clamp--sm" title={r.summary}>{r.summary || '-'}</span> },
    { key: 'view', header: '', align: 'right', render: (r) => <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setDetail(r); }} aria-label={`View details of ${r.action} on ${r.entityId}`}><Eye size={14} />Details</Button> },
  ];

  if (loading) return <PageSkeleton />;

  return (
    <div className="page shr-page">
      <PageHeader
        title={title}
        subtitle={isAdmin ? 'An append only record of every material action on the platform, with the person, the time and the reason.' : 'Every material change to your cooperative, packages, farmers, farms and agreements, with the person and the time.'}
        actions={<Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}><Download size={18} />Export CSV</Button>}
      />

      <Banner tone="green" title="Entries cannot be edited or deleted">
        Each entry is added once and kept. Entries contain no passwords and no identity document contents. A correction is a new entry that points to the original.
      </Banner>

      <div className="card card--pad shr-auditbar">
        <div className="shr-auditbar__row">
          <SearchInput value={q} onChange={setQ} placeholder="Search actor, action, reference or reason" />
          <FilterSelect value={entity} onChange={setEntity} allLabel="All entity types" options={uniq(scoped, 'entityType')} label="Entity type" />
          <FilterSelect value={actor} onChange={setActor} allLabel="All actors" options={uniq(scoped, 'actor')} label="Actor" />
          <FilterSelect value={roleF} onChange={setRoleF} allLabel="All roles" options={uniq(scoped, 'role').map((r) => ({ value: r, label: r === 'cooperative' ? 'Cooperative' : r.charAt(0).toUpperCase() + r.slice(1) }))} label="Role" />
        </div>
        <div className="shr-auditbar__row">
          <label className="shr-date"><span className="small strong">From</span><input type="date" className="input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="shr-date"><span className="small strong">To</span><input type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
          <div className="row grow" style={{ justifyContent: 'flex-end', alignSelf: 'flex-end' }}>
            <span className="small muted">{formatNumber(filtered.length)} of {formatNumber(scoped.length)} entries</span>
            {hasFilter && <Button variant="ghost" size="sm" onClick={reset}><RotateCcw size={14} />Clear filters</Button>}
          </div>
        </div>
        {dateBad && <p className="field__error" role="alert">The start date is after the end date. Choose a start date on or before the end date.</p>}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        defaultSort={{ key: 'at', dir: 'desc' }}
        onRowClick={setDetail}
        totalLabel="entries"
        emptyTitle={scoped.length ? 'No entries match your filters' : 'No audit entries yet'}
        emptyText="Entries appear here as soon as someone makes a material change."
      />

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Audit entry" wide white>
        {detail && (
          <div className="stack">
            <InfoList items={[
              ['When', whenLabel(detail.at)], ['Actor', detail.actor], ['Role', <RolePill key="r" role={detail.role} />], ['Action', detail.action],
              ['Entity type', detail.entityType], ['Entity id', detail.entityId], ['Request reference', detail.ref], ['Reason', detail.reason || '-'], ['Change summary', detail.summary || '-'],
            ]} />
            <Banner tone="info">This entry is read only. It cannot be edited or deleted, and it holds no passwords or identity document contents.</Banner>
          </div>
        )}
      </Modal>
    </div>
  );
}
