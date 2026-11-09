import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Inbox, Clock, MailQuestion, AlarmClock, ArrowRight, Timer } from 'lucide-react';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { PageHeader, PageSkeleton, DataTable, StatusPill, Banner, KpiStrip, Tabs, LinkButton, Chip } from '../../components/ui/index.js';
import { formatNaira, formatDate } from '../../utils/format.js';
import { slaInfo, isMaterialChange, APP_STAGES, SLA_TARGET_DAYS } from '../../components/adma/helpers.js';
import '../../styles/pages/adma.css';

export default function Applications() {
  const { data, user } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const loading = useSimulatedLoad(350);
  const stage = APP_STAGES.includes(params.get('stage')) ? params.get('stage') : 'All';

  const rows = useMemo(() => data.applications.map((a) => {
    const pkg = data.packages.find((p) => p.id === a.packageId);
    const coop = data.cooperatives.find((c) => c.id === a.coopId);
    return {
      ...a, pkg, coop, sla: slaInfo(a), material: isMaterialChange(a, pkg),
      pkgName: pkg?.name || a.packageId, coopName: coop?.name || a.coopId,
      text: `${pkg?.name || ''} ${coop?.name || ''} ${a.id} ${a.packageId} ${a.type}`,
    };
  }), [data.applications, data.packages, data.cooperatives]);

  if (loading) return <PageSkeleton />;

  const countOf = (st) => rows.filter((r) => r.stage === st).length;
  const tabs = [{ id: 'All', label: 'All', count: rows.length }, ...APP_STAGES.map((s) => ({ id: s, label: s, count: countOf(s) }))];
  const shown = stage === 'All' ? rows : rows.filter((r) => r.stage === stage);
  const overdue = rows.filter((r) => r.sla.state === 'overdue').length;
  const setStage = (id) => setParams(id === 'All' ? {} : { stage: id }, { replace: true });

  const columns = [
    {
      key: 'pkgName', header: 'Application', sortable: true,
      render: (r) => (
        <div>
          <div className="strong">{r.pkgName}</div>
          <div className="cell-sub">{r.coopName}</div>
          <div className="cell-sub adma-nowrap">{r.id} {r.material && <Chip bg="#fffaeb" fg="#dc6803" border="#f8cd42">Material change</Chip>}</div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', sortable: true, render: (r) => <span className="adma-role">{r.type}</span> },
    { key: 'amount', header: 'Amount', align: 'right', sortable: true, render: (r) => <strong>{formatNaira(r.amount)}</strong> },
    { key: 'submittedAt', header: 'Submitted', sortable: true, render: (r) => <span className="adma-nowrap">{formatDate(r.submittedAt)}</span> },
    {
      key: 'sla', header: 'Age and target', sortable: true, sortValue: (r) => (r.sla.state === 'closed' || r.sla.state === 'waiting' ? -1 : r.sla.days),
      render: (r) => <span className={`adma-sla adma-sla--${r.sla.state}`}><Timer size={14} aria-hidden="true" />{r.sla.label}</span>,
    },
    { key: 'stage', header: 'Stage', sortable: true, render: (r) => <StatusPill>{r.stage}</StatusPill> },
    {
      key: 'reviewer', header: 'Reviewer', sortable: true,
      render: (r) => (
        <div>
          <div>{r.reviewer || <span className="muted">Unassigned</span>}{r.reviewer === user.name && <span className="adma-you"> (you)</span>}</div>
          {r.secondApprover && <div className="cell-sub">Second: {r.secondApprover}</div>}
        </div>
      ),
    },
    { key: 'go', header: '', align: 'right', render: (r) => <LinkButton to={`/admin/applications/${r.id}`} variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>{['Approved', 'Rejected'].includes(r.stage) ? 'View' : 'Review'} <ArrowRight size={14} /></LinkButton> },
  ];

  return (
    <div className="page adma-page">
      <PageHeader
        title="Project applications"
        subtitle="Funding applications and budget changes from cooperatives. Nothing opens for funding until it is reviewed here."
      />

      <KpiStrip
        cells={[
          { icon: <Inbox size={18} />, label: 'Submitted', value: countOf('Submitted'), sub: 'Waiting for a reviewer' },
          { icon: <Clock size={18} />, label: 'Under review', value: countOf('Under Review'), sub: 'A reviewer is working on it' },
          { icon: <MailQuestion size={18} />, label: 'Changes requested', value: countOf('Changes Requested'), sub: 'Waiting for the cooperative' },
          { icon: <AlarmClock size={18} />, label: 'Past review target', value: overdue, sub: `Target is ${SLA_TARGET_DAYS} days (illustrative)` },
        ]}
      />

      <Banner tone="info" title="Two people for a material change">
        A budget change that moves money between lines or changes the total after approval is a material change. It needs a second reviewer who is not the first reviewer. Approval is a decision to proceed, not a guarantee of success or returns.
      </Banner>

      <Tabs items={tabs} value={stage} onChange={setStage} label="Application stage" auto />

      <DataTable
        key={stage}
        rows={shown}
        columns={columns}
        rowKey="id"
        pageSize={10}
        searchKeys={['text']}
        searchPlaceholder="Search by project, cooperative or reference"
        totalLabel="applications"
        onRowClick={(r) => navigate(`/admin/applications/${r.id}`)}
        defaultSort={{ key: 'sla', dir: 'desc' }}
        emptyTitle={stage === 'All' ? 'No applications yet' : `Nothing in ${stage}`}
        emptyText="Applications appear here when a cooperative submits a funding request or a budget change."
        filters={[
          { key: 'type', allLabel: 'All types', options: ['Funding application', 'Budget change'] },
          { key: 'coopName', allLabel: 'All cooperatives', options: [...new Set(rows.map((r) => r.coopName))].sort() },
          { key: 'sla', allLabel: 'Any age', options: [{ value: 'overdue', label: 'Past target' }, { value: 'due', label: 'Due soon' }, { value: 'ok', label: 'Within target' }, { value: 'waiting', label: 'Waiting on cooperative' }], match: (r, v) => r.sla.state === v },
          { key: 'reviewer', allLabel: 'Any reviewer', options: [{ value: 'me', label: 'Assigned to me' }, { value: 'none', label: 'Unassigned' }, { value: 'other', label: 'Assigned to someone else' }], match: (r, v) => (v === 'me' ? r.reviewer === user.name : v === 'none' ? !r.reviewer : !!r.reviewer && r.reviewer !== user.name) },
        ]}
      />
    </div>
  );
}
