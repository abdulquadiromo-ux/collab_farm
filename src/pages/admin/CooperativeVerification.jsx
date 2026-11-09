import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Clock, MailQuestion, BadgeCheck, ArrowRight } from 'lucide-react';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { PageHeader, PageSkeleton, DataTable, StatusPill, Banner, KpiStrip, Progress, LinkButton } from '../../components/ui/index.js';
import { formatDate, percent } from '../../utils/format.js';
import { coopReadiness, COOP_STATUSES } from '../../components/adma/helpers.js';
import '../../styles/pages/adma.css';

export default function CooperativeVerification() {
  const { data } = useApp();
  const navigate = useNavigate();
  const loading = useSimulatedLoad(350);

  const rows = useMemo(() => data.cooperatives.map((c) => {
    const r = coopReadiness(c);
    const last = data.audit.find((a) => a.entityId === c.id);
    const rep = c.representatives?.[0];
    return {
      ...c, readiness: r, verified: r.verifiedCount, total: r.mandatoryCount,
      last: last?.at || c.verifiedAt || null, rep,
      text: `${c.name} ${c.regNumber} ${c.state} ${c.lga} ${rep?.name || ''}`,
    };
  }), [data.cooperatives, data.audit]);

  if (loading) return <PageSkeleton />;

  const count = (st) => rows.filter((r) => r.status === st).length;
  const states = [...new Set(rows.map((r) => r.state))].sort();

  const columns = [
    {
      key: 'name', header: 'Cooperative', sortable: true,
      render: (r) => (
        <div>
          <div className="strong">{r.name}</div>
          <div className="cell-sub">{r.regNumber}</div>
        </div>
      ),
    },
    { key: 'state', header: 'Location', sortable: true, render: (r) => <div><div>{r.state}</div><div className="cell-sub">{r.lga}</div></div> },
    { key: 'rep', header: 'Lead representative', render: (r) => (r.rep ? <div><div>{r.rep.name}</div><div className="cell-sub">{r.rep.role}</div></div> : '-') },
    {
      key: 'verified', header: 'Required documents', sortable: true, sortValue: (r) => r.verified,
      render: (r) => (
        <div className="adma-checks">
          <span><strong>{r.verified}</strong> of {r.total} verified</span>
          <Progress value={percent(r.verified, r.total)} label={`${r.verified} of ${r.total} required documents verified`} />
        </div>
      ),
    },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <StatusPill>{r.status}</StatusPill> },
    { key: 'last', header: 'Last activity', sortable: true, sortValue: (r) => r.last || '', render: (r) => (r.last ? formatDate(r.last) : <span className="muted">None yet</span>) },
    { key: 'go', header: '', align: 'right', render: (r) => <LinkButton to={`/admin/verification/cooperatives/${r.id}`} variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>Review <ArrowRight size={14} /></LinkButton> },
  ];

  return (
    <div className="page adma-page">
      <PageHeader
        title="Cooperative verification"
        subtitle="A cooperative can only submit funding requests after its identity, leadership, land access and payout account are verified."
      />

      <KpiStrip
        cells={[
          { icon: <Building2 size={18} />, label: 'Submitted', value: count('Submitted'), sub: 'Not yet opened' },
          { icon: <Clock size={18} />, label: 'Under review', value: count('Under Review'), sub: 'Documents being checked' },
          { icon: <MailQuestion size={18} />, label: 'More information needed', value: count('Additional Information Required'), sub: 'Waiting for the cooperative' },
          { icon: <BadgeCheck size={18} />, label: 'Verified', value: `${count('Verified')} of ${rows.length}`, sub: 'Can submit funding requests' },
        ]}
      />

      <Banner tone="info" title="Uploaded is not the same as verified">
        A document counts only once a reviewer has checked it and marked it Verified. A cooperative cannot be verified while any required document is still only uploaded, flagged or missing.
      </Banner>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey="id"
        pageSize={10}
        searchKeys={['text']}
        searchPlaceholder="Search by name, registration number or state"
        totalLabel="cooperatives"
        onRowClick={(r) => navigate(`/admin/verification/cooperatives/${r.id}`)}
        defaultSort={{ key: 'last', dir: 'desc' }}
        emptyTitle="No cooperatives registered yet"
        emptyText="Cooperatives appear here when they register."
        filters={[
          { key: 'status', allLabel: 'All statuses', options: COOP_STATUSES },
          { key: 'state', allLabel: 'All states', options: states },
        ]}
      />
    </div>
  );
}
