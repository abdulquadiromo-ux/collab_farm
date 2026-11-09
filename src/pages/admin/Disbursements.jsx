import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hourglass, Loader, Banknote, XCircle } from 'lucide-react';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { PageHeader, KpiStrip, DataTable, StatusPill, Banner, SearchInput, FilterSelect, Button, PageSkeleton, Progress } from '../../components/ui/index.js';
import { formatNaira, formatDateShort } from '../../utils/format.js';
import { disbursementLabel } from '../../utils/status.js';
import { sum } from '../../utils/rules.js';
import { useQueryState, nextStepText, approvalPlan, disbursementAccess, committedToday, pkgName, resolveTranche, trancheLabel } from '../../components/admb/lib.js';
import { Glossary, ActingAs, PkgLink } from '../../components/admb/ui.jsx';
import '../../styles/pages/admb.css';

const STATUSES = ['Pending', 'Reviewing', 'Disbursed', 'Rejected'];
const TYPES = ['Farmer', 'Supplier', 'Cooperative'];

export default function Disbursements() {
  const loading = useSimulatedLoad(350);
  const { data, user } = useApp();
  const navigate = useNavigate();
  const [f, setF] = useQueryState(['q', 'status', 'type', 'pkg']);
  const limits = data.platformSettings.approvalLimits;

  const rows = useMemo(() => data.disbursements.map((d) => {
    const plan = approvalPlan(d, limits);
    const access = disbursementAccess(d, user, plan, data);
    const tranche = resolveTranche(d, data.tranches);
    return { ...d, plan, access, tranche, pkgLabel: pkgName(data, d.packageId), yourTurn: access.canFirst || access.canSecond || access.canRelease || (!!d.instructionSentAt && d.status === 'Reviewing') };
  }), [data, user, limits]);

  const filtered = rows.filter((d) => {
    const q = f.q.trim().toLowerCase();
    if (q && ![d.recipientName, d.purpose, d.ref, d.pkgLabel].join(' ').toLowerCase().includes(q)) return false;
    if (f.status && d.status !== f.status) return false;
    if (f.type && d.recipientType !== f.type) return false;
    if (f.pkg && d.packageId !== f.pkg) return false;
    return true;
  });

  if (loading) return <PageSkeleton />;

  const by = (s) => rows.filter((d) => d.status === s);
  const today = committedToday(data);
  const cap = limits.dailyDisbursementCap;
  const capPct = Math.min(100, Math.round((today / cap) * 100));

  const columns = [
    { key: 'ref', header: 'Reference', sortable: true, render: (d) => (<div><div className="strong admb-nowrap">{d.ref}</div><div className="cell-sub">{formatDateShort(d.date)}</div></div>) },
    { key: 'recipientName', header: 'Recipient', sortable: true, render: (d) => (<div><div className="strong">{d.recipientName}</div><div className="cell-sub">{d.recipientType}</div></div>) },
    { key: 'purpose', header: 'Purpose and project', render: (d) => (<div><div className="admb-clamp small">{d.purpose}</div><div className="cell-sub"><PkgLink id={d.packageId} name={d.pkgLabel} />{d.tranche ? ` · ${trancheLabel(d.tranche)}` : ''}</div></div>) },
    { key: 'amount', header: 'Amount', sortable: true, align: 'right', render: (d) => <span className="admb-mono admb-nowrap strong">{formatNaira(d.amount)}</span> },
    {
      key: 'approvals', header: 'Approvals', sortable: true, sortValue: (d) => d.plan.have, render: (d) => (
        <div>
          <div className="admb-nowrap">{d.plan.have} of {d.plan.required} given</div>
          <div className="cell-sub">{d.approvals?.length ? d.approvals.map((a) => a.by).join(', ') : 'None yet'}</div>
        </div>
      ),
    },
    {
      key: 'next', header: 'Next step', render: (d) => (
        <div>
          <div className="small">{nextStepText(d, d.plan)}</div>
          {d.yourTurn && <div className="admb-flags"><span className="admb-flag admb-flag--blue">Your turn</span></div>}
          {d.exception && <div className="admb-flags"><span className="admb-flag admb-flag--red">Exception recorded</span></div>}
        </div>
      ),
    },
    { key: 'status', header: 'Status', sortable: true, render: (d) => <StatusPill>{disbursementLabel(d)}</StatusPill> },
    { key: 'go', header: '', render: (d) => <Button size="sm" variant={d.yourTurn ? 'primary' : 'outline'} onClick={(e) => { e.stopPropagation(); navigate(`/admin/disbursements/${d.id}`); }}>Review</Button> },
  ];

  return (
    <div className="page">
      <PageHeader title="Disbursements" subtitle="Payments to farmers, suppliers and cooperatives. Each one is checked by more than one person." />

      <Banner tone="info" title="How payments are approved (maker-checker)">
        Nobody raises, approves and pays alone. A payment is raised by one person, approved by a different person, and above {formatNaira(limits.secondApproverAbove)} a second, different approver is needed as well. Money is sent only after the financial partner confirms it.
      </Banner>
      <ActingAs user={user} />

      <KpiStrip cells={[
        { icon: <Hourglass size={18} />, label: 'Awaiting approval', value: by('Pending').length, sub: `${formatNaira(sum(by('Pending'), (d) => d.amount), { compact: true })} not yet approved` },
        { icon: <Loader size={18} />, label: 'In review', value: by('Reviewing').length, sub: `${formatNaira(sum(by('Reviewing'), (d) => d.amount), { compact: true })} being checked or sent` },
        { icon: <Banknote size={18} />, label: 'Disbursed', value: by('Disbursed').length, sub: `${formatNaira(sum(by('Disbursed'), (d) => d.amount), { compact: true })} confirmed by the partner` },
        { icon: <XCircle size={18} />, label: 'Rejected', value: by('Rejected').length, sub: `${formatNaira(sum(by('Rejected'), (d) => d.amount), { compact: true })} stopped` },
      ]}
      />

      <div className="admb-cap">
        <div className="admb-cap__nums">
          <span className="small muted">Daily disbursement cap</span>
          <span className="admb-big admb-mono">{formatNaira(today)} <span className="small muted" style={{ fontWeight: 400 }}>of {formatNaira(cap)}</span></span>
          <span className="small muted">Committed today (sent or paid). {formatNaira(Math.max(0, cap - today))} left before the cap blocks new payments.</span>
        </div>
        <div className="stack-sm">
          <Progress value={capPct} tone={capPct >= 90 ? 'red' : capPct >= 70 ? 'amber' : 'dark'} label="Share of the daily cap used" />
          <span className="caption muted">{capPct}% of the cap used. The cap is set in System Settings and applies to the whole platform each day.</span>
        </div>
      </div>

      <Glossary terms={[
        ['Maker-checker', 'The person who raises a payment (maker) is never the person who approves it (checker).'],
        ['First approval', 'A project reviewer checks the purpose, the amount, the destination and the evidence.'],
        ['Second approval', `Needed above ${formatNaira(limits.secondApproverAbove)}. It must be a different person from the first approver.`],
        ['Payment instruction', 'The order sent to the financial partner. It is not proof that money moved.'],
        ['Partner confirmation', 'The partner reports the payment was made. Only then is the payment marked Disbursed.'],
        ['Idempotency key', 'A unique code so the same payment cannot be sent twice if someone retries.'],
      ]}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={8}
        totalLabel="payments"
        emptyTitle="No payments yet"
        emptyText="Payments appear here when a cooperative asks for a disbursement or a tranche is raised for release."
        onRowClick={(d) => navigate(`/admin/disbursements/${d.id}`)}
        toolbarLeft={<SearchInput value={f.q} onChange={(v) => setF('q', v)} placeholder="Search recipient, purpose or reference" />}
        toolbarExtra={(
          <div className="admb-toolbar-filters">
            <FilterSelect value={f.status} onChange={(v) => setF('status', v)} allLabel="All statuses" options={STATUSES} />
            <FilterSelect value={f.type} onChange={(v) => setF('type', v)} allLabel="All recipients" options={TYPES} />
            <FilterSelect value={f.pkg} onChange={(v) => setF('pkg', v)} allLabel="All projects" options={data.packages.filter((p) => rows.some((d) => d.packageId === p.id)).map((p) => ({ value: p.id, label: p.name }))} />
          </div>
        )}
      />
    </div>
  );
}
