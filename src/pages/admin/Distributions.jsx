import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, AlertTriangle, Scale } from 'lucide-react';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { PageHeader, KpiStrip, DataTable, StatusPill, Banner, SearchInput, FilterSelect, Button, PageSkeleton } from '../../components/ui/index.js';
import { formatNaira, formatDateShort } from '../../utils/format.js';
import { sum } from '../../utils/rules.js';
import { useQueryState, pkgName, investorName, dayDiff } from '../../components/admb/lib.js';
import { isProfit, isPaid, isOverdueDist, outstanding, typeLabel, evaluateDistribution, nextStep } from '../../components/admb/distLib.js';
import { Glossary, ActingAs, PkgLink } from '../../components/admb/ui.jsx';
import DistributionFlow from '../../components/admb/DistributionDialogs.jsx';
import '../../styles/pages/admb.css';

const STAGES = ['Needs calculation review', 'Needs first approval', 'Needs second approval', 'Approved, ready to mark paid', 'Waiting for sale confirmation', 'Dispute open, resolve first', 'Paid and recorded'];

function dueText(d) {
  if (isPaid(d)) return d.paidDate ? `Paid ${formatDateShort(d.paidDate)}` : 'Paid';
  const n = dayDiff(d.dueDate);
  if (n < 0) return `${-n} day${n === -1 ? '' : 's'} late`;
  if (n === 0) return 'Due today';
  return `In ${n} day${n === 1 ? '' : 's'}`;
}

export default function Distributions() {
  const loading = useSimulatedLoad(350);
  const { data, user } = useApp();
  const [f, setF] = useQueryState(['q', 'status', 'type', 'pkg', 'stage', 'open']);
  const [flow, setFlow] = useState(null); // { id, mode }

  useEffect(() => {
    if (f.open && !flow && data.distributions.some((d) => d.id === f.open)) setFlow({ id: f.open, mode: 'detail' });
  }, [f.open]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => data.distributions.map((d) => {
    const ev = evaluateDistribution(data, d, user);
    return { ...d, ev, step: nextStep(ev, d), pkgLabel: pkgName(data, d.packageId), investorLabel: investorName(data, d.investorId), late: isOverdueDist(d) };
  }).sort((a, b) => (Number(a.ev.paid) - Number(b.ev.paid)) || (a.ev.paid ? String(b.dueDate).localeCompare(String(a.dueDate)) : String(a.dueDate).localeCompare(String(b.dueDate)))), [data, user]);

  const filtered = rows.filter((d) => {
    const q = f.q.trim().toLowerCase();
    if (q && ![d.ref, d.pkgLabel, d.investorLabel, d.basis].join(' ').toLowerCase().includes(q)) return false;
    if (f.status && d.status !== f.status) return false;
    if (f.type && d.type !== f.type) return false;
    if (f.pkg && d.packageId !== f.pkg) return false;
    if (f.stage && d.step !== f.stage) return false;
    return true;
  });

  if (loading) return <PageSkeleton />;

  const open = (id, mode = 'detail') => { setFlow({ id, mode }); setF('open', id); };
  const close = () => { setFlow(null); setF('open', ''); };
  const active = flow ? data.distributions.find((d) => d.id === flow.id) : null;

  const unpaid = rows.filter((d) => !d.ev.paid);
  const dueRows = unpaid.filter((d) => !d.late);
  const lateRows = unpaid.filter((d) => d.late);
  const paidRows = rows.filter((d) => d.ev.paid);
  const disputedRows = rows.filter((d) => (d.disputed || 0) > 0);
  const pkgOptions = [...new Set(rows.map((d) => d.packageId))].map((id) => ({ value: id, label: pkgName(data, id) }));

  const primary = (d) => {
    const a = d.ev.access;
    if (a.canResolve) return { label: 'Resolve dispute', mode: 'resolve' };
    if (a.canPay) return { label: 'Mark paid', mode: 'pay' };
    if (a.canApprove) return { label: 'Approve payment', mode: 'approve' };
    if (a.canReview) return { label: 'Review calculation', mode: 'calc' };
    return { label: 'View', mode: 'detail' };
  };

  const columns = [
    {
      key: 'ref', header: 'Distribution', sortable: true, render: (d) => (
        <div>
          <button type="button" className="strong admb-linkbtn" onClick={(e) => { e.stopPropagation(); open(d.id); }}>{d.ref}</button>
          <div className="cell-sub"><PkgLink id={d.packageId} name={d.pkgLabel} /></div>
          <div className="cell-sub">{d.investorLabel}</div>
        </div>
      ),
    },
    {
      key: 'type', header: 'Type', sortable: true, render: (d) => (
        <div>
          <StatusPill tone={isProfit(d) ? 'blue' : 'gray'}>{typeLabel(d)}</StatusPill>
          <div className="cell-sub admb-clamp">{d.basis}</div>
        </div>
      ),
    },
    {
      key: 'amountDue', header: 'Amount due', sortable: true, align: 'right', render: (d) => (
        <div>
          <span className="admb-mono admb-nowrap">{formatNaira(d.amountDue)}</span>
          <div className="cell-sub admb-nowrap">{d.ev.paid ? `Paid ${formatNaira(d.amountPaid || 0)}` : `Outstanding ${formatNaira(outstanding(d))}`}</div>
        </div>
      ),
    },
    {
      key: 'dueDate', header: 'Due', sortable: true, render: (d) => (
        <div>
          <div className="small admb-nowrap">{formatDateShort(d.dueDate)}</div>
          <div className="cell-sub admb-nowrap" style={d.late ? { color: 'var(--red-600)', fontWeight: 600 } : undefined}>{dueText(d)}</div>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', sortable: true, render: (d) => (
        <div className="stack-sm">
          <StatusPill>{d.status}</StatusPill>
          {d.disputed > 0 && <StatusPill tone="red">Disputed {formatNaira(d.disputed)}</StatusPill>}
        </div>
      ),
    },
    {
      key: 'step', header: 'Next step', sortable: true, render: (d) => {
        const names = (d.approvals || []).map((a) => a.by).join(', ');
        return (
          <div>
            <div className="small">{d.step}</div>
            <div className="cell-sub">{d.ev.paid ? (d.paymentRef ? `Reference ${d.paymentRef}` : 'Historical record') : `${d.ev.plan.have} of ${d.ev.plan.required} approval${d.ev.plan.required === 1 ? '' : 's'}${names ? `: ${names}` : ''}`}</div>
          </div>
        );
      },
    },
    {
      key: 'go', header: '', render: (d) => {
        const p = primary(d);
        return <Button size="sm" variant={p.mode === 'detail' ? 'outline' : 'primary'} onClick={(e) => { e.stopPropagation(); open(d.id, p.mode); }}>{p.label}</Button>;
      },
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Distributions" subtitle="Check, approve and record what investors are paid back. Each payment follows the signed agreement." />
      <ActingAs user={user} />

      <Banner tone="info" title="Three rules for every distribution">
        Repayment of capital is not profit. A recorded sale is not money received until the financial partner confirms it. Amounts follow the agreement and are never a guaranteed return.
      </Banner>

      <KpiStrip cells={[
        { icon: <CalendarClock size={18} />, label: 'Due', value: formatNaira(sum(dueRows, (d) => outstanding(d))), sub: `${dueRows.length} distribution${dueRows.length === 1 ? '' : 's'} not yet late` },
        { icon: <CheckCircle2 size={18} />, label: 'Paid', value: formatNaira(sum(paidRows, (d) => d.amountPaid || 0)), sub: `${paidRows.length} distribution${paidRows.length === 1 ? '' : 's'} confirmed` },
        { icon: <AlertTriangle size={18} />, label: 'Overdue', value: formatNaira(sum(lateRows, (d) => outstanding(d))), sub: `${lateRows.length} distribution${lateRows.length === 1 ? '' : 's'} late` },
        { icon: <Scale size={18} />, label: 'Disputed', value: formatNaira(sum(disputedRows, (d) => d.disputed || 0)), sub: `${disputedRows.length} open dispute${disputedRows.length === 1 ? '' : 's'}` },
      ]}
      />

      <Glossary terms={[
        ['Distribution', 'Money paid back to an investor under the signed agreement. It is either a capital repayment or a profit share.'],
        ['Capital repayment', 'The investor\'s own money coming back. It is not profit and not a return.'],
        ['Profit share', 'A share of distributable profit, worked out from sales and costs that have been confirmed. It can be lower than hoped, and is not guaranteed.'],
        ['Distributable profit', 'Confirmed sales, less eligible costs and other deductions such as buyer deductions and reserves.'],
        ['Second approver', 'Above the single approver limit a second, different administrator must also approve. Nobody approves their own work alone.'],
        ['Payment reference', 'The financial partner\'s reference for the payment. Each reference can be used once, which prevents paying twice.'],
        ['Dispute', 'An investor can question an amount. Payment is held until an administrator resolves it with a written reason.'],
      ]}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={8}
        totalLabel="distributions"
        emptyTitle="No distributions match"
        emptyText="Try clearing a filter. Distributions appear here when a project's repayment or profit share falls due."
        onRowClick={(d) => open(d.id)}
        toolbarLeft={<SearchInput value={f.q} onChange={(v) => setF('q', v)} placeholder="Search reference, project or investor" />}
        toolbarExtra={(
          <div className="admb-toolbar-filters">
            <FilterSelect value={f.status} onChange={(v) => setF('status', v)} allLabel="All statuses" options={['Pending', 'Overdue', 'Confirmed']} />
            <FilterSelect value={f.type} onChange={(v) => setF('type', v)} allLabel="All types" options={[{ value: 'Principal repayment', label: 'Capital repayment' }, { value: 'Profit distribution', label: 'Profit share' }]} />
            <FilterSelect value={f.pkg} onChange={(v) => setF('pkg', v)} allLabel="All projects" options={pkgOptions} />
            <FilterSelect value={f.stage} onChange={(v) => setF('stage', v)} allLabel="All next steps" options={STAGES} />
          </div>
        )}
      />

      <p className="small muted">
        Profit shares wait for confirmed sales. Check <Link to="/admin/reconciliation?type=Sale%20receipt">sale receipts in Reconciliation</Link>. Investor disputes arrive as complaints in <Link to="/admin/complaints">Complaints</Link>. Every step is written to the <Link to="/admin/audit-logs">audit log</Link>.
      </p>

      {active && <DistributionFlow dist={active} mode={flow.mode} setMode={(mode) => setFlow((s) => ({ ...s, mode }))} onClose={close} />}
    </div>
  );
}
