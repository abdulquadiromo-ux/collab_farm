import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, AlertTriangle, ShieldAlert, Info, ChevronDown } from 'lucide-react';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { PageHeader, KpiStrip, DataTable, StatusPill, Banner, SearchInput, FilterSelect, PageSkeleton, Progress } from '../../components/ui/index.js';
import { formatNaira, formatDateShort } from '../../utils/format.js';
import { useQueryState, packageHealth, MONITORED, dayDiff, HEALTH_RULES } from '../../components/admb/lib.js';
import { HealthPill, TrancheChain } from '../../components/admb/ui.jsx';
import '../../styles/pages/admb.css';

const HEALTH = ['On track', 'Watch', 'At risk'];
const agoText = (iso) => { const n = -dayDiff(iso); return n <= 0 ? 'today' : n === 1 ? '1 day ago' : `${n} days ago`; };

export default function Monitoring() {
  const loading = useSimulatedLoad(350);
  const { data } = useApp();
  const navigate = useNavigate();
  const [f, setF] = useQueryState(['q', 'health', 'status', 'coop']);

  const rows = useMemo(() => data.packages.filter((p) => MONITORED.includes(p.status)).map((p) => {
    const h = packageHealth(data, p);
    const coop = data.cooperatives.find((c) => c.id === p.coopId);
    return { ...p, health: h, m: h.metrics, coopName: coop?.name || '-' };
  }), [data]);

  const filtered = rows.filter((p) => {
    const q = f.q.trim().toLowerCase();
    if (q && ![p.name, p.coopName, p.category].join(' ').toLowerCase().includes(q)) return false;
    if (f.health && p.health.tag !== f.health) return false;
    if (f.status && p.status !== f.status) return false;
    if (f.coop && p.coopId !== f.coop) return false;
    return true;
  });

  if (loading) return <PageSkeleton />;

  const tagCount = (t) => rows.filter((p) => p.health.tag === t).length;
  const openCases = data.riskCases.filter((c) => c.status !== 'Resolved').length;
  const coopOptions = data.cooperatives.filter((c) => rows.some((p) => p.coopId === c.id)).map((c) => ({ value: c.id, label: c.name }));

  const columns = [
    { key: 'name', header: 'Project', sortable: true, render: (p) => (<div><Link to={`/admin/monitoring/${p.id}`} className="strong" onClick={(e) => e.stopPropagation()}>{p.name}</Link><div className="cell-sub">{p.coopName}</div><div style={{ marginTop: 4 }}><StatusPill>{p.status}</StatusPill></div></div>) },
    {
      key: 'fundingPct', header: 'Funding', sortable: true, sortValue: (p) => p.m.fundingPct, render: (p) => (
        <div className="admb-fundbar">
          <span className="small admb-nowrap">{p.m.fundingPct}% confirmed</span>
          <Progress value={p.m.fundingPct} tone={p.m.fundingPct >= 100 ? 'green' : p.m.fundingPct < 50 ? 'amber' : 'green'} label={`${p.name} funding confirmed`} />
          <span className="cell-sub admb-nowrap">{formatNaira(p.raised, { compact: true })} of {formatNaira(p.amount, { compact: true })}</span>
        </div>
      ),
    },
    { key: 'tranches', header: 'Tranches', render: (p) => <TrancheChain tranches={p.m.tranches} /> },
    {
      key: 'ms', header: 'Milestones', sortable: true, sortValue: (p) => p.m.overdueMs.length, render: (p) => {
        const done = p.m.milestones.filter((x) => x.status === 'Approved').length;
        return (
          <div>
            <div className="small admb-nowrap">{p.m.milestones.length ? `${done} of ${p.m.milestones.length} approved` : 'None set'}</div>
            {p.m.overdueMs.length > 0 && <div className="admb-flags"><span className="admb-flag admb-flag--red">{p.m.overdueMs.length} overdue</span></div>}
            {p.m.delayed.length > 0 && <div className="admb-flags"><span className="admb-flag admb-flag--amber">{p.m.delayed.length} delayed</span></div>}
          </div>
        );
      },
    },
    { key: 'unspent', header: 'Unspent', sortable: true, align: 'right', sortValue: (p) => p.m.unspent, render: (p) => (<div><span className="admb-mono admb-nowrap">{formatNaira(p.m.unspent)}</span><div className="cell-sub">confirmed, not paid out</div></div>) },
    { key: 'lastReport', header: 'Last report', sortable: true, sortValue: (p) => p.m.lastReport || '', render: (p) => (p.m.lastReport ? (<div><div className="small admb-nowrap">{formatDateShort(p.m.lastReport)}</div><div className="cell-sub">{agoText(p.m.lastReport)}</div></div>) : <span className="muted">None yet</span>) },
    { key: 'risks', header: 'Open cases', sortable: true, align: 'center', sortValue: (p) => p.m.openRisks.length, render: (p) => (p.m.openRisks.length ? <Link to={`/admin/risk-alerts?pkg=${p.id}`} onClick={(e) => e.stopPropagation()}>{p.m.openRisks.length} open</Link> : <span className="muted">0</span>) },
    {
      key: 'health', header: 'Health', sortable: true, sortValue: (p) => p.health.rank, render: (p) => (
        <div>
          <HealthPill health={p.health} />
          <div className="admb-health-reason">{p.health.reasons[0]}{p.health.reasons.length > 1 ? ` (+${p.health.reasons.length - 1} more)` : ''}</div>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Project monitoring" subtitle="See which projects are on track, which need a closer look, and why." />

      <Banner tone="info" title="A health tag is a prompt to look, not a verdict">
        On track, Watch and At risk are worked out from data on this page. They never mean a cooperative or farmer did something wrong. Crop failure is not fraud, and a missed deadline is not a finding of fault.
      </Banner>

      <KpiStrip cells={[
        { icon: <CheckCircle2 size={18} />, label: 'On track', value: tagCount('On track'), sub: 'Nothing needs attention' },
        { icon: <Eye size={18} />, label: 'Watch', value: tagCount('Watch'), sub: 'Worth a closer look' },
        { icon: <AlertTriangle size={18} />, label: 'At risk', value: tagCount('At risk'), sub: 'Needs action soon' },
        { icon: <ShieldAlert size={18} />, label: 'Open risk cases', value: openCases, sub: 'Across all projects' },
      ]}
      />

      <details className="admb-glossary">
        <summary><Info size={18} aria-hidden="true" /><span>How the health tag is worked out</span><ChevronDown size={16} className="admb-glossary__chev" aria-hidden="true" /></summary>
        <div className="admb-glossary__list">
          <div><strong>At risk, when any of these is true</strong><ul className="admb-effects" style={{ marginTop: 6 }}>{HEALTH_RULES.atRisk.map((r) => <li key={r}>{r}</li>)}</ul></div>
          <div><strong>Watch, when any of these is true</strong><ul className="admb-effects" style={{ marginTop: 6 }}>{HEALTH_RULES.watch.map((r) => <li key={r}>{r}</li>)}</ul></div>
          <div style={{ gridColumn: '1 / -1' }}><span className="small muted">Everything else is On track. The first reason for each project is shown in the table. Open a project to see every reason and the data behind it.</span></div>
        </div>
      </details>

      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={8}
        totalLabel="projects"
        emptyTitle="No projects to monitor yet"
        emptyText="Projects appear here once they are open for funding."
        onRowClick={(p) => navigate(`/admin/monitoring/${p.id}`)}
        defaultSort={{ key: 'health', dir: 'desc' }}
        toolbarLeft={<SearchInput value={f.q} onChange={(v) => setF('q', v)} placeholder="Search project or cooperative" />}
        toolbarExtra={(
          <div className="admb-toolbar-filters">
            <FilterSelect value={f.health} onChange={(v) => setF('health', v)} allLabel="All health tags" options={HEALTH} />
            <FilterSelect value={f.status} onChange={(v) => setF('status', v)} allLabel="All statuses" options={MONITORED.filter((s) => rows.some((p) => p.status === s))} />
            <FilterSelect value={f.coop} onChange={(v) => setF('coop', v)} allLabel="All cooperatives" options={coopOptions} />
          </div>
        )}
      />
    </div>
  );
}
