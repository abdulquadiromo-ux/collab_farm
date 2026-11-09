import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CircleDollarSign, Download, Gavel, Hourglass, Landmark } from 'lucide-react';
import { Banner, Button, Card, CardHeader, DataTable, InfoList, KpiStrip, MoneyField, Modal, PageHeader, PageSkeleton, SearchInput, SelectField, StatusPill, TextAreaField } from '../../components/ui/index.js';
import { newId, simulate, useSimulatedLoad } from '../../context/AppContext.jsx';
import { PROFIT_ILLUSTRATION } from '../../data/operations.js';
import { formatNaira, formatDateShort } from '../../utils/format.js';
import { profitShare } from '../../utils/rules.js';
import { useInvestor } from '../../components/inv/useInvestor.js';
import { InvSelect } from '../../components/inv/InvSelect.jsx';
import { UnverifiedBanner } from '../../components/inv/Common.jsx';
import { downloadCsv, nowIso, sumBy } from '../../components/inv/invData.js';
import '../../styles/pages/inv.css';

const REASONS = ['The calculation looks wrong', 'I have not received a payment that is marked paid', 'The amount paid is different from the amount due', 'The due date or schedule looks wrong', 'Something else'];

function DisputeForm({ dist, pkgName, onClose }) {
  const { data, investor, add, update, notify, toast } = useInvestor();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const clear = (k) => setErrors((s) => ({ ...s, [k]: undefined }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!amount) next.amount = 'Enter the amount you are disputing.';
    else if (amount > dist.amountDue) next.amount = `You cannot dispute more than the amount due, ${formatNaira(dist.amountDue)}.`;
    if (!reason) next.reason = 'Choose the main reason.';
    if (details.trim().length < 10) next.details = 'Add a short explanation (at least 10 characters) so a reviewer can follow up.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await simulate(800);
      const now = nowIso();
      const cid = newId('cmp');
      const ref = `CMP-2026-${String(41 + data.complaints.length).padStart(4, '0')}`;
      update('distributions', dist.id, { disputed: amount }, { action: 'Distribution disputed', entityType: 'Distribution', summary: `${formatNaira(amount)} of ${dist.ref} disputed. Complaint ${ref}`, reason });
      add('complaints', {
        id: cid, ref, subject: `Dispute on ${dist.ref} (${pkgName})`, description: `${reason}. ${details.trim()}`, submittedBy: investor.name, role: 'investor', packageId: dist.packageId,
        category: 'Payment', status: 'Open', assignee: 'Unassigned', createdAt: now, updatedAt: now,
        actions: [{ at: now.slice(0, 10), by: investor.name, text: `Dispute raised on ${dist.ref} for ${formatNaira(amount)}.` }], outcome: '', distributionId: dist.id, disputedAmount: amount,
      }, { action: 'Submitted complaint', entityType: 'Complaint', summary: `New complaint ${ref} from a distribution dispute`, reason });
      notify('admin', 'Distribution dispute raised', `${investor.name} disputed ${formatNaira(amount)} on ${dist.ref} (${pkgName}). Complaint ${ref} is open.`, `/admin/complaints/${cid}`, 'complaint');
      toast(`Dispute recorded as complaint ${ref}. A reviewer will respond. This is not an accusation.`, 'success');
      onClose();
    } catch {
      setSaving(false);
      toast('We could not record the dispute. Nothing was changed. Please try again.', 'error');
    }
  };

  return (
    <form onSubmit={submit} className="stack" noValidate>
      <InfoList compact items={[
        ['Package', pkgName],
        ['Reference', dist.ref],
        ['Type', dist.type],
        ['Amount due', formatNaira(dist.amountDue)],
        ['Paid so far', formatNaira(dist.amountPaid)],
      ]} />
      <MoneyField label="Amount in dispute" required value={amount} onChange={(v) => { setAmount(v); clear('amount'); }} error={errors.amount} hint={`Up to ${formatNaira(dist.amountDue)}.`} />
      <SelectField label="Reason" required placeholder="Choose a reason" options={REASONS} value={reason} onChange={(e) => { setReason(e.target.value); clear('reason'); }} error={errors.reason} />
      <TextAreaField label="What happened?" required value={details} onChange={(e) => { setDetails(e.target.value); clear('details'); }} error={errors.details} placeholder="Describe what looks wrong and what you expected." />
      <Banner tone="info">A dispute opens a complaint with a reference and a reviewer. It never triggers a public accusation, and the payment record is not changed until the review ends.</Banner>
      <div className="modal__foot">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" loading={saving}>Raise dispute</Button>
      </div>
    </form>
  );
}

export default function Distributions() {
  const loading = useSimulatedLoad(350);
  const { data, investor, pkgById } = useInvestor();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const type = params.get('type') || '';
  const q = params.get('q') || '';
  const [target, setTarget] = useState(null);
  const setParam = (k, v) => { const next = new URLSearchParams(params); if (v) next.set(k, v); else next.delete(k); setParams(next, { replace: true }); };

  const mine = useMemo(() => data.distributions.filter((d) => d.investorId === investor?.id), [data.distributions, investor]);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return mine
      .filter((d) => (!status || d.status === status) && (!type || d.type === type) && (!term || [pkgById[d.packageId]?.name, d.ref, d.type, d.basis].join(' ').toLowerCase().includes(term)))
      .sort((a, b) => String(b.dueDate).localeCompare(String(a.dueDate)));
  }, [mine, status, type, q, pkgById]);

  if (loading) return <PageSkeleton />;

  const outstanding = sumBy(mine, (d) => d.amountDue - d.amountPaid);
  const overdue = mine.filter((d) => d.status === 'Overdue');
  const illustration = profitShare(PROFIT_ILLUSTRATION);

  const exportCsv = () => downloadCsv('distributions.csv', [
    { header: 'Reference', value: (d) => d.ref },
    { header: 'Package', value: (d) => pkgById[d.packageId]?.name },
    { header: 'Type', value: (d) => d.type },
    { header: 'Basis', value: (d) => d.basis },
    { header: 'Contribution', value: (d) => d.contribution },
    { header: 'Amount due', value: (d) => d.amountDue },
    { header: 'Amount paid', value: (d) => d.amountPaid },
    { header: 'Outstanding', value: (d) => d.amountDue - d.amountPaid },
    { header: 'Disputed', value: (d) => d.disputed || 0 },
    { header: 'Due date', value: (d) => d.dueDate },
    { header: 'Status', value: (d) => d.status },
  ], rows);

  const columns = [
    { key: 'package', header: 'Package', render: (d) => (<div style={{ minWidth: 130 }}><div className="strong">{pkgById[d.packageId]?.name}</div><div className="cell-sub">{d.ref}</div></div>) },
    { key: 'type', header: 'Type and basis', render: (d) => (<><div className="strong">{d.type}</div><div className="cell-sub" style={{ maxWidth: 240 }}>{d.basis}</div></>) },
    { key: 'contribution', header: 'Your contribution', render: (d) => formatNaira(d.contribution) },
    { key: 'due', header: 'Amount due', render: (d) => <strong>{formatNaira(d.amountDue)}</strong> },
    { key: 'paid', header: 'Paid', render: (d) => formatNaira(d.amountPaid) },
    { key: 'out', header: 'Outstanding', render: (d) => formatNaira(d.amountDue - d.amountPaid) },
    { key: 'date', header: 'Due date', render: (d) => <span className="nowrap">{formatDateShort(d.dueDate)}</span> },
    { key: 'status', header: 'Status', render: (d) => (<div className="stack-sm"><StatusPill>{d.status}</StatusPill>{d.disputed > 0 && <StatusPill tone="red">Disputed {formatNaira(d.disputed)}</StatusPill>}</div>) },
    {
      key: 'actions',
      header: 'Actions',
      render: (d) => (d.disputed > 0
        ? <span className="cell-sub">Dispute raised</span>
        : <Button size="sm" variant="outline" onClick={() => setTarget(d)}><Gavel size={14} />Raise a dispute</Button>),
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Distributions" subtitle="Repayments and profit shares due to you, with what has been paid and what is outstanding." />
      <UnverifiedBanner investor={investor} />
      <KpiStrip cells={[
        { icon: <Landmark size={18} />, label: 'Total due', value: formatNaira(sumBy(mine, (d) => d.amountDue)), sub: `${mine.length} distributions` },
        { icon: <CircleDollarSign size={18} />, label: 'Paid so far', value: formatNaira(sumBy(mine, (d) => d.amountPaid)), sub: 'Confirmed payments' },
        { icon: <Hourglass size={18} />, label: 'Outstanding', value: formatNaira(outstanding), sub: 'Not yet paid' },
        { icon: <AlertTriangle size={18} />, label: 'Overdue', value: overdue.length, sub: overdue.length ? `${formatNaira(sumBy(overdue, (d) => d.amountDue - d.amountPaid))} past due` : 'Nothing overdue' },
      ]}
      />

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <Card tone="tint">
          <CardHeader title="Repayment of capital is not profit" />
          <ul className="stack-sm small" style={{ margin: 0, paddingLeft: 20 }}>
            <li><strong>Principal repayment</strong> is your original money coming back. Getting it back does not mean you made a profit.</li>
            <li><strong>Profit distribution</strong> is your agreed share of profit left after approved costs and reserves. There may be none.</li>
            <li>An overdue payment is reviewed under your agreement. It is not a finding of fraud.</li>
          </ul>
        </Card>
        <Card>
          <CardHeader title="How a profit share is worked out" subtitle="Illustration only. Not a default and not a promise." />
          <InfoList compact items={[
            ['Verified sales', formatNaira(PROFIT_ILLUSTRATION.verifiedSales)],
            ['Less eligible costs', formatNaira(PROFIT_ILLUSTRATION.eligibleCosts)],
            ['Less other deductions', formatNaira(PROFIT_ILLUSTRATION.otherDeductions)],
            ['Distributable profit', formatNaira(illustration.distributable)],
            [`Investors' agreed share (${PROFIT_ILLUSTRATION.investorSharePct}%)`, formatNaira(illustration.investorShare)],
          ]} />
        </Card>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        pageSize={8}
        totalLabel="distributions"
        emptyTitle={mine.length ? 'No distributions match your filters' : 'No distributions yet'}
        emptyText="When a package repays or shares profit, the calculation and payment status will appear here."
        toolbarLeft={<SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search distributions" />}
        toolbarExtra={(
          <>
            <InvSelect label="Status" value={status} onChange={(v) => setParam('status', v)} allLabel="All Status" options={['Confirmed', 'Pending', 'Overdue'].map((v) => ({ value: v, label: v }))} />
            <InvSelect label="Type" value={type} onChange={(v) => setParam('type', v)} allLabel="All Types" options={['Principal repayment', 'Profit distribution'].map((v) => ({ value: v, label: v }))} />
            <Button variant="outline-green" onClick={exportCsv} disabled={!rows.length}><Download size={16} />Export CSV</Button>
          </>
        )}
      />

      <Modal open={!!target} onClose={() => setTarget(null)} title="Raise a dispute">
        {target && <DisputeForm dist={target} pkgName={pkgById[target.packageId]?.name || ''} onClose={() => setTarget(null)} />}
      </Modal>
    </div>
  );
}
