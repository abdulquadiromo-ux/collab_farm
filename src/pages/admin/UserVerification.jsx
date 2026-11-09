import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCog, Clock, MailQuestion, BadgeCheck, ArrowRight } from 'lucide-react';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { PageHeader, PageSkeleton, DataTable, StatusPill, Avatar, Banner, KpiStrip, Progress, LinkButton } from '../../components/ui/index.js';
import { formatDate, percent } from '../../utils/format.js';
import { verificationSubjects, checkSummary, VERIFICATION_STATUSES, ROLE_LABEL } from '../../components/adma/helpers.js';
import '../../styles/pages/adma.css';

export default function UserVerification() {
  const { data } = useApp();
  const navigate = useNavigate();
  const loading = useSimulatedLoad(350);

  const rows = useMemo(() => verificationSubjects(data).map((s) => {
    const cs = checkSummary(s);
    return { ...s, passed: cs.passed, total: cs.total, text: `${s.name} ${s.email} ${ROLE_LABEL[s.role] || s.role}` };
  }), [data]);

  if (loading) return <PageSkeleton />;

  const count = (st) => rows.filter((r) => r.status === st).length;
  const open = (r) => navigate(`/admin/verification/users/${r.id}`);

  const columns = [
    {
      key: 'name', header: 'Person', sortable: true,
      render: (r) => (
        <div className="cell-person">
          <Avatar name={r.name} />
          <div><div>{r.name}</div><div className="cell-sub" style={{ fontWeight: 400 }}>{r.email}</div></div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', sortable: true, render: (r) => <span className="adma-role">{ROLE_LABEL[r.role] || r.role}</span> },
    { key: 'submittedAt', header: 'Submitted', sortable: true, sortValue: (r) => r.submittedAt || '', render: (r) => (r.submittedAt ? formatDate(r.submittedAt) : <span className="muted">Not recorded</span>) },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <StatusPill>{r.status}</StatusPill> },
    {
      key: 'passed', header: 'Checks passed', sortable: true, sortValue: (r) => r.passed / (r.total || 1),
      render: (r) => (
        <div className="adma-checks">
          <span><strong>{r.passed}</strong> of {r.total}</span>
          <Progress value={percent(r.passed, r.total)} label={`${r.passed} of ${r.total} checks passed`} />
        </div>
      ),
    },
    { key: 'go', header: '', align: 'right', render: (r) => <LinkButton to={`/admin/verification/users/${r.id}`} variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>Review <ArrowRight size={14} /></LinkButton> },
  ];

  return (
    <div className="page adma-page">
      <PageHeader
        title="User verification"
        subtitle="Check who people are before they can use the platform. This does not approve any funding."
      />

      <KpiStrip
        cells={[
          { icon: <UserCog size={18} />, label: 'Submitted', value: count('Submitted'), sub: 'Not yet opened' },
          { icon: <Clock size={18} />, label: 'Under review', value: count('Under Review'), sub: 'A reviewer is checking' },
          { icon: <MailQuestion size={18} />, label: 'More information needed', value: count('Additional Information Required'), sub: 'Waiting for the person' },
          { icon: <BadgeCheck size={18} />, label: 'Verified', value: count('Verified'), sub: 'Approved in this list' },
        ]}
      />

      <Banner tone="info" title="What a check means">
        Identity and contact checks are done by CollabFarm reviewers. Sanctions and screening are done by the regulated financial partner and appear on the person&apos;s page once reported. Investors must also pass eligibility and tick the risk acknowledgement themselves.
      </Banner>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey="id"
        pageSize={10}
        searchKeys={["text"]}
        searchPlaceholder="Search by name or email"
        totalLabel="people"
        onRowClick={open}
        defaultSort={{ key: 'submittedAt', dir: 'desc' }}
        emptyTitle="No registrations to verify"
        emptyText="New investor and farmer registrations will appear here."
        filters={[
          { key: 'role', allLabel: 'All roles', options: [{ value: 'investor', label: 'Investor' }, { value: 'farmer', label: 'Farmer' }, { value: 'cooperative', label: 'Cooperative' }] },
          { key: 'status', allLabel: 'All statuses', options: VERIFICATION_STATUSES },
        ]}
      />
    </div>
  );
}
