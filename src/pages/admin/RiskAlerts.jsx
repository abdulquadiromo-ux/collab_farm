import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, Info, ShieldPlus, ShieldCheck } from 'lucide-react';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { PageHeader, KpiStrip, DataTable, StatusPill, Banner, SearchInput, FilterSelect, Button, PageSkeleton } from '../../components/ui/index.js';
import { formatDateShort } from '../../utils/format.js';
import { RISK_CATEGORIES } from '../../data/governance.js';
import { CASE_STATUSES, SEVERITIES, GUARDRAILS } from '../../components/admb/riskPaths.js';
import { useQueryState, pkgName, isOpenCase } from '../../components/admb/lib.js';
import { Glossary, PkgLink } from '../../components/admb/ui.jsx';
import RiskCaseForm from '../../components/admb/RiskCaseForm.jsx';
import '../../styles/pages/admb.css';

const SEV_ORDER = { High: 0, Medium: 1, Low: 2 };
const sevTone = (s) => (s === 'High' ? 'red' : s === 'Medium' ? 'amber' : 'green');

export default function RiskAlerts() {
  const loading = useSimulatedLoad(350);
  const { data } = useApp();
  const navigate = useNavigate();
  const [f, setF] = useQueryState(['q', 'category', 'severity', 'status', 'owner', 'pkg']);
  const [formOpen, setFormOpen] = useState(false);

  const rows = useMemo(() => data.riskCases.map((c) => ({ ...c, pkgLabel: pkgName(data, c.packageId), open: isOpenCase(c) }))
    .sort((a, b) => (Number(b.open) - Number(a.open)) || (SEV_ORDER[a.severity] - SEV_ORDER[b.severity]) || String(b.raisedAt).localeCompare(String(a.raisedAt))), [data]);

  const filtered = rows.filter((c) => {
    const q = f.q.trim().toLowerCase();
    if (q && ![c.title, c.detail, c.pkgLabel, c.category, c.owner].join(' ').toLowerCase().includes(q)) return false;
    if (f.category && c.category !== f.category) return false;
    if (f.severity && c.severity !== f.severity) return false;
    if (f.status && c.status !== f.status) return false;
    if (f.owner && c.owner !== f.owner) return false;
    if (f.pkg && c.packageId !== f.pkg) return false;
    return true;
  });

  if (loading) return <PageSkeleton />;

  const openBy = (sev) => rows.filter((c) => c.open && c.severity === sev).length;
  const owners = [...new Set(rows.map((c) => c.owner))];

  const columns = [
    { key: 'title', header: 'Case', sortable: true, render: (c) => (<div><Link to={`/admin/risk-alerts/${c.id}`} className="strong" onClick={(e) => e.stopPropagation()}>{c.title}</Link><div className="cell-sub admb-clamp">{c.detail}</div></div>) },
    { key: 'category', header: 'Category', sortable: true, render: (c) => <span className="small">{c.category}</span> },
    { key: 'pkgLabel', header: 'Project', sortable: true, render: (c) => <PkgLink id={c.packageId} name={c.pkgLabel} /> },
    { key: 'severity', header: 'Severity', sortable: true, sortValue: (c) => SEV_ORDER[c.severity], render: (c) => <StatusPill tone={sevTone(c.severity)}>{c.severity}</StatusPill> },
    { key: 'status', header: 'Status', sortable: true, render: (c) => <StatusPill>{c.status}</StatusPill> },
    { key: 'owner', header: 'Owner', sortable: true, render: (c) => (c.owner === 'Unassigned' ? <span className="admb-flag admb-flag--amber">Unassigned</span> : c.owner) },
    { key: 'raisedAt', header: 'Opened', sortable: true, render: (c) => <span className="admb-nowrap">{formatDateShort(c.raisedAt)}</span> },
    { key: 'go', header: '', render: (c) => <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/admin/risk-alerts/${c.id}`); }}>Open</Button> },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Risk alerts and suspicious activity"
        subtitle="Cases that need a closer look. Each follows a fair, documented review path."
        actions={<Button onClick={() => setFormOpen(true)}><ShieldPlus size={18} />Open a case</Button>}
      />

      <Banner tone="warn" title="Read this before you act on any case">
        <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>{GUARDRAILS.map((g) => <li key={g}>{g}</li>)}</ul>
      </Banner>

      <KpiStrip cells={[
        { icon: <AlertOctagon size={18} />, label: 'High severity', value: openBy('High'), sub: 'Open cases that need attention first' },
        { icon: <AlertTriangle size={18} />, label: 'Medium severity', value: openBy('Medium'), sub: 'Open cases' },
        { icon: <Info size={18} />, label: 'Low severity', value: openBy('Low'), sub: 'Open cases' },
        { icon: <ShieldCheck size={18} />, label: 'Resolved', value: rows.filter((c) => !c.open).length, sub: 'Closed with a recorded outcome' },
      ]}
      />

      <Glossary terms={[
        ['Risk case', 'A record that something needs a closer look, such as a late report or a disputed expense.'],
        ['Severity', 'How soon it needs attention. It is not a judgement of the people involved.'],
        ['Review path', 'The steps for each category: record, tell the cooperative, collect evidence, classify, decide, document.'],
        ['Second reviewer', 'For confirmed fraud or breach a different administrator must also agree before the case can close.'],
        ['Genuine crop failure', 'Loss from weather, pests or disease. It is a shared farming risk and is not fraud.'],
      ]}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={8}
        totalLabel="cases"
        emptyTitle="No risk cases"
        emptyText="Nothing needs a closer look right now. Use Open a case to record a concern."
        emptyAction={<Button onClick={() => setFormOpen(true)}>Open a case</Button>}
        onRowClick={(c) => navigate(`/admin/risk-alerts/${c.id}`)}
        toolbarLeft={<SearchInput value={f.q} onChange={(v) => setF('q', v)} placeholder="Search case, project or owner" />}
        toolbarExtra={(
          <div className="admb-toolbar-filters">
            <FilterSelect value={f.category} onChange={(v) => setF('category', v)} allLabel="All categories" options={RISK_CATEGORIES} />
            <FilterSelect value={f.severity} onChange={(v) => setF('severity', v)} allLabel="All severities" options={SEVERITIES} />
            <FilterSelect value={f.status} onChange={(v) => setF('status', v)} allLabel="All statuses" options={CASE_STATUSES} />
            <FilterSelect value={f.owner} onChange={(v) => setF('owner', v)} allLabel="All owners" options={owners} />
            {f.pkg && <Button size="sm" variant="outline" onClick={() => setF('pkg', '')}>Project: {pkgName(data, f.pkg)} (clear)</Button>}
          </div>
        )}
      />
      <RiskCaseForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
