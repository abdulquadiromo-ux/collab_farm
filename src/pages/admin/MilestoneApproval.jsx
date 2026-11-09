import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, AlarmClock, Hourglass, BadgeCheck, FileText } from 'lucide-react';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { PageHeader, KpiStrip, DataTable, StatusPill, Banner, SearchInput, FilterSelect, Button, PageSkeleton } from '../../components/ui/index.js';
import { formatDateShort } from '../../utils/format.js';
import { useQueryState, milestoneFlags, dueBucket, MS_ORDER, pkgName, coopNameOfPkg, findPkg, trancheLabel } from '../../components/admb/lib.js';
import { Glossary, PkgLink } from '../../components/admb/ui.jsx';
import '../../styles/pages/admb.css';

const STATUSES = ['Under Review', 'Delayed', 'Not Started', 'Approved'];
const DUE = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'soon', label: 'Due within 7 days' },
  { value: 'later', label: 'Due later' },
  { value: 'done', label: 'Already approved' },
];

export default function MilestoneApproval() {
  const loading = useSimulatedLoad(350);
  const { data } = useApp();
  const navigate = useNavigate();
  const [f, setF] = useQueryState(['q', 'pkg', 'coop', 'status', 'due']);

  const rows = useMemo(() => data.milestones.map((m) => {
    const tranche = data.tranches.find((t) => t.id === m.trancheId);
    return { ...m, flags: milestoneFlags(m), bucket: dueBucket(m), pkgLabel: pkgName(data, m.packageId), coopId: findPkg(data, m.packageId)?.coopId, coopLabel: coopNameOfPkg(data, m.packageId), tranche };
  }).sort((a, b) => (MS_ORDER[a.status] - MS_ORDER[b.status]) || String(a.dueDate).localeCompare(String(b.dueDate))), [data]);

  const filtered = rows.filter((m) => {
    const q = f.q.trim().toLowerCase();
    if (q && ![m.title, m.pkgLabel, m.coopLabel, m.description].join(' ').toLowerCase().includes(q)) return false;
    if (f.pkg && m.packageId !== f.pkg) return false;
    if (f.coop && m.coopId !== f.coop) return false;
    if (f.status && m.status !== f.status) return false;
    if (f.due && m.bucket !== f.due) return false;
    return true;
  });

  if (loading) return <PageSkeleton />;

  const count = (fn) => rows.filter(fn).length;
  const pkgOptions = data.packages.filter((p) => rows.some((m) => m.packageId === p.id)).map((p) => ({ value: p.id, label: p.name }));
  const coopOptions = data.cooperatives.filter((c) => rows.some((m) => m.coopId === c.id)).map((c) => ({ value: c.id, label: c.name }));

  const columns = [
    { key: 'title', header: 'Milestone', sortable: true, render: (m) => (<div><div className="strong">{m.title}</div><div className="cell-sub admb-clamp">{m.description}</div></div>) },
    { key: 'pkgLabel', header: 'Project', sortable: true, render: (m) => (<div><PkgLink id={m.packageId} name={m.pkgLabel} /><div className="cell-sub">{m.coopLabel}</div></div>) },
    { key: 'tranche', header: 'Tranche', render: (m) => <span className="small">{trancheLabel(m.tranche)}</span> },
    {
      key: 'dueDate', header: 'Due', sortable: true, render: (m) => (
        <div>
          <div className="admb-nowrap">{formatDateShort(m.dueDate)}</div>
          <div className="admb-flags">
            {m.flags.overdue && <span className="admb-flag admb-flag--red">Overdue {m.flags.overdueDays} day{m.flags.overdueDays === 1 ? '' : 's'}</span>}
            {m.flags.dueSoon && <span className="admb-flag admb-flag--amber">Due in {m.flags.daysToDue} day{m.flags.daysToDue === 1 ? '' : 's'}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', sortable: true, sortValue: (m) => MS_ORDER[m.status], render: (m) => (
        <div>
          <StatusPill>{m.status}</StatusPill>
          <div className="admb-flags">
            {m.flags.late && m.status !== 'Not Started' && <span className="admb-flag admb-flag--amber">Submitted late</span>}
            {m.referral && <span className="admb-flag admb-flag--blue">Referred</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'evidence', header: 'Evidence', sortable: true, sortValue: (m) => m.evidence.length, render: (m) => (
        <div className="admb-nowrap"><FileText size={14} style={{ verticalAlign: '-2px' }} aria-hidden="true" /> {m.evidence.length} file{m.evidence.length === 1 ? '' : 's'}
          <div className="cell-sub">{m.evidence.filter((e) => e.verified).length} verified</div>
        </div>
      ),
    },
    { key: 'submittedAt', header: 'Submitted', sortable: true, sortValue: (m) => m.submittedAt || '', render: (m) => (m.submittedAt ? (<div><div className="small admb-nowrap">{formatDateShort(m.submittedAt)}</div><div className="cell-sub">{m.submittedBy}</div></div>) : <span className="muted">Not yet</span>) },
    { key: 'go', header: '', render: (m) => <Button size="sm" variant={m.status === 'Under Review' ? 'primary' : 'outline'} onClick={(e) => { e.stopPropagation(); navigate(`/admin/milestones/${m.id}`); }}>{m.status === 'Under Review' ? 'Review' : 'Open'}</Button> },
  ];

  return (
    <div className="page">
      <PageHeader title="Milestone approval" subtitle="Check the evidence that cooperatives submit. Milestones waiting for review come first." />

      <Banner tone="info" title="Approving a milestone is not a payment">
        Approving a milestone says the evidence is acceptable. It never releases funds. A tranche is paid only after the separate payment approval steps on the Disbursements page. Approval is also not a guarantee that the project will succeed.
      </Banner>

      <KpiStrip cells={[
        { icon: <ClipboardCheck size={18} />, label: 'Awaiting review', value: count((m) => m.status === 'Under Review'), sub: 'Evidence submitted, no decision yet' },
        { icon: <AlarmClock size={18} />, label: 'Overdue', value: count((m) => m.flags.overdue), sub: 'Past the due date and not approved' },
        { icon: <Hourglass size={18} />, label: 'Delayed', value: count((m) => m.status === 'Delayed'), sub: 'Marked delayed, not a finding of fault' },
        { icon: <BadgeCheck size={18} />, label: 'Approved', value: count((m) => m.status === 'Approved'), sub: 'Evidence accepted' },
      ]}
      />

      <Glossary terms={[
        ['Milestone', 'A step in the farming plan with evidence, for example land preparation or input delivery.'],
        ['Tranche', 'One slice of the project money. Each tranche is released only after its milestones are approved.'],
        ['Overdue', 'The due date has passed and the milestone is not approved. This is a prompt to look, never a penalty.'],
        ['Independent review', 'Asking a person outside the normal review chain to look at the evidence.'],
      ]}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={8}
        totalLabel="milestones"
        emptyTitle="No milestones yet"
        emptyText="Milestones appear here when a project is approved and its tranche plan is set."
        onRowClick={(m) => navigate(`/admin/milestones/${m.id}`)}
        toolbarLeft={<SearchInput value={f.q} onChange={(v) => setF('q', v)} placeholder="Search milestone or project" />}
        toolbarExtra={(
          <div className="admb-toolbar-filters">
            <FilterSelect value={f.pkg} onChange={(v) => setF('pkg', v)} allLabel="All projects" options={pkgOptions} />
            <FilterSelect value={f.coop} onChange={(v) => setF('coop', v)} allLabel="All cooperatives" options={coopOptions} />
            <FilterSelect value={f.status} onChange={(v) => setF('status', v)} allLabel="All statuses" options={STATUSES} />
            <FilterSelect value={f.due} onChange={(v) => setF('due', v)} allLabel="Any due date" options={DUE} />
          </div>
        )}
      />
    </div>
  );
}
