import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquarePlus, ShieldCheck } from 'lucide-react';
import '../../styles/pages/shr.css';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { Banner, Card, DataTable, FilterSelect, LinkButton, PageHeader, PageSkeleton, StatusPill } from '../../components/ui/index.js';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, ageInDays, baseFor, canSeeComplaint, pkgName, roleLabel } from '../../components/shr/shrUtils.js';
import { formatDateShort, cx } from '../../utils/format.js';

const SUB = {
  cooperative: 'Complaints raised by your organisation and members, and complaints about your packages.',
  investor: 'Questions, disputes and complaints you have raised. Only you and the reviewers can see them.',
  admin: 'Triage, assign and resolve complaints from every role.',
};

export default function Complaints() {
  const { data, user, role } = useApp();
  const navigate = useNavigate();
  const loading = useSimulatedLoad(350);
  const [params, setParams] = useSearchParams();
  const base = baseFor(role);
  const isAdmin = role === 'admin';
  const status = params.get('status') || '';

  const rows = useMemo(
    () => data.complaints.filter((c) => canSeeComplaint(data, user, c)).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    [data, user],
  );
  const counts = useMemo(() => Object.fromEntries(COMPLAINT_STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length])), [rows]);
  const shown = status ? rows.filter((r) => r.status === status) : rows;

  const setStatus = (v) => {
    const next = new URLSearchParams(params);
    if (v && v !== status) next.set('status', v); else next.delete('status');
    setParams(next, { replace: true });
  };

  const assignees = useMemo(() => ['Unassigned', ...new Set(rows.map((r) => r.assignee).filter((a) => a && a !== 'Unassigned'))], [rows]);

  const columns = [
    {
      key: 'ref', header: 'Reference', sortable: true, sortValue: (r) => r.ref,
      render: (r) => (
        <div>
          <Link to={`${base}/complaints/${r.id}`} className="strong" onClick={(e) => e.stopPropagation()}>{r.ref}</Link>
          <div className="cell-sub shr-clamp">{r.subject}</div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', className: 'nowrap', render: (r) => r.category },
    { key: 'packageId', header: 'Package', render: (r) => <span className="shr-clamp">{r.packageId ? pkgName(data, r.packageId) : 'Not package specific'}</span> },
    { key: 'submittedBy', header: 'Raised by', render: (r) => (<div><div>{r.submittedBy}</div><div className="cell-sub">{roleLabel(r.role)}</div></div>) },
    { key: 'status', header: 'Status', sortable: true, sortValue: (r) => COMPLAINT_STATUSES.indexOf(r.status), render: (r) => <StatusPill>{r.status}</StatusPill> },
    ...(isAdmin ? [
      { key: 'assignee', header: 'Assignee', className: 'nowrap', sortable: true, render: (r) => (r.assignee === 'Unassigned' ? <span className="danger-text strong">Unassigned</span> : r.assignee) },
      {
        key: 'age', header: 'Age', className: 'nowrap', sortable: true, sortValue: (r) => ageInDays(r.createdAt),
        render: (r) => { const d = ageInDays(r.createdAt); const open = r.status !== 'Resolved'; return <span className={cx(open && d > 7 && 'danger-text strong')}>{d} day{d === 1 ? '' : 's'}</span>; },
      },
    ] : []),
    { key: 'createdAt', header: 'Raised', className: 'nowrap', sortable: true, render: (r) => formatDateShort(r.createdAt) },
    { key: 'view', header: '', align: 'right', render: (r) => <LinkButton to={`${base}/complaints/${r.id}`} variant="outline" size="sm" aria-label={`View ${r.ref}`} onClick={(e) => e.stopPropagation()}>View</LinkButton> },
  ];

  if (loading) return <PageSkeleton />;

  return (
    <div className="page shr-page">
      <PageHeader
        title="Complaints"
        subtitle={SUB[role]}
        actions={<LinkButton to={`${base}/complaints/new`}><MessageSquarePlus size={18} />Raise a complaint</LinkButton>}
      />

      <Banner tone="green" title="A complaint is a request for review, not an accusation">
        Every complaint gets a reference, a reviewer and a visible status. It is seen only by the people involved and CollabFarm reviewers. A complaint never causes a public accusation or an automatic penalty.
      </Banner>

      <div className="shr-status-strip" role="group" aria-label="Complaints by status">
        {COMPLAINT_STATUSES.map((s) => (
          <button key={s} type="button" className="shr-stat" aria-pressed={status === s} onClick={() => setStatus(s)}>
            <span className="shr-stat__label">{s}</span>
            <span className="shr-stat__value">{counts[s]}</span>
            <span className="caption muted">{status === s ? 'Showing. Click to clear' : 'Click to filter'}</span>
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={shown}
        searchKeys={(r) => `${r.ref} ${r.subject} ${r.description} ${r.submittedBy} ${pkgName(data, r.packageId)}`}
        searchPlaceholder="Search by reference, subject or name"
        filters={[
          { key: 'category', allLabel: 'All categories', options: COMPLAINT_CATEGORIES },
          ...(isAdmin ? [{ key: 'assignee', allLabel: 'All assignees', options: assignees }] : []),
        ]}
        toolbarExtra={<FilterSelect value={status} onChange={(v) => setStatus(v)} allLabel="All statuses" options={COMPLAINT_STATUSES} label="Filter by status" />}
        onRowClick={(r) => navigate(`${base}/complaints/${r.id}`)}
        defaultSort={{ key: 'createdAt', dir: 'desc' }}
        totalLabel="complaints"
        emptyTitle="No complaints yet"
        emptyText="When you raise a complaint, or one is raised about your packages, it will be listed here."
        emptyAction={<LinkButton to={`${base}/complaints/new`} variant="outline-green"><ShieldCheck size={16} />Raise a complaint</LinkButton>}
      />
    </div>
  );
}
