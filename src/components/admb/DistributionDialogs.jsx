import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, CheckCircle2, Banknote, Scale } from 'lucide-react';
import { useApp, simulate, newId } from '../../context/AppContext.jsx';
import { Modal, ConfirmDialog, Button, Banner, InfoList, Timeline, TextField, TextAreaField, MoneyField, SelectField, StatusPill } from '../ui/index.js';
import { formatNaira, formatDateShort } from '../../utils/format.js';
import { nowIso, todayIso, adminRoleLabel, findPkg, investorName, coopNameOfPkg } from './lib.js';
import { calcDefaults, runCalc, evaluateDistribution, nextStep, isProfit, isPaid, outstanding, typeLabel, investmentFor, complaintFor } from './distLib.js';
import { CheckRows, atText } from './ui.jsx';

const REF_PATTERN = /^[A-Z0-9-]{6,32}$/;

function Header({ d, ev }) {
  return (
    <div className="admb-pillrow">
      <StatusPill tone={isProfit(d) ? 'blue' : 'gray'}>{typeLabel(d)}</StatusPill>
      <StatusPill>{d.status}</StatusPill>
      {ev.disputed && <StatusPill tone="red">Disputed {formatNaira(d.disputed)}</StatusPill>}
    </div>
  );
}

function RuleBanner({ d }) {
  return isProfit(d)
    ? <Banner tone="info">A profit share depends on sales that the financial partner has confirmed. It follows the signed agreement and is never guaranteed. A recorded sale is not money received.</Banner>
    : <Banner tone="info">This is the investor&apos;s own capital coming back. Repayment of capital is not profit and is not a return on the investment.</Banner>;
}

/* ---------------- detail ---------------- */
function DetailDialog({ d, ev, onClose, setMode }) {
  const { data } = useApp();
  const pkg = findPkg(data, d.packageId);
  const plan = ev.plan;
  const items = [{ title: 'Scheduled', meta: `${typeLabel(d)}, due ${formatDateShort(d.dueDate)}`, state: 'done' }];
  if (d.calcReview) items.push({ title: 'Calculation reviewed', meta: `${d.calcReview.by}, ${atText(d.calcReview.at)}`, body: d.calcReview.variance === 0 ? 'Matches the amount due.' : `Difference of ${formatNaira(Math.abs(d.calcReview.variance))}. ${d.calcReview.note}`, state: 'done' });
  else if (d.reviewedBy) items.push({ title: 'Reviewed', meta: d.reviewedBy, state: 'done' });
  (d.approvals || []).forEach((a, i) => items.push({ title: `Approval ${i + 1} of ${plan.required}`, meta: `${a.by}${a.role ? ` (${a.role})` : ''}, ${atText(a.at)}`, state: 'done' }));
  if (ev.disputed) items.push({ title: 'Investor raised a dispute', meta: `${formatNaira(d.disputed)} disputed`, state: 'done' });
  if (d.disputeResolution) items.push({ title: 'Dispute resolved', meta: `${d.disputeResolution.by}, ${atText(d.disputeResolution.at)}`, body: `${d.disputeResolution.outcome}. ${d.disputeResolution.note}`, state: 'done' });
  if (ev.paid) items.push({ title: 'Paid and recorded', meta: `${formatDateShort(d.paidDate)}${d.paymentRef ? `, reference ${d.paymentRef}` : ''}`, state: 'done' });
  else items.push({ title: 'Next step', meta: nextStep(ev, d) });
  const { access } = ev;

  return (
    <Modal open onClose={onClose} title={`Distribution ${d.ref}`} wide white footer={<Button variant="outline" onClick={onClose} block>Close</Button>}>
      <div className="stack">
        <Header d={d} ev={ev} />
        <RuleBanner d={d} />
        <InfoList compact items={[
          ['Project', <Link key="p" to={`/admin/monitoring/${d.packageId}`}>{pkg?.name}</Link>],
          ['Cooperative', coopNameOfPkg(data, d.packageId)],
          ['Investor', investorName(data, d.investorId)],
          ['Basis', d.basis],
          ['Confirmed contribution', formatNaira(d.contribution)],
          ['Amount due', formatNaira(d.amountDue)],
          ['Amount paid', formatNaira(d.amountPaid || 0)],
          ['Outstanding', formatNaira(outstanding(d))],
          ['Due date', formatDateShort(d.dueDate)],
          ['Payment reference', d.paymentRef || '-'],
        ]}
        />
        <div>
          <h3 className="admb-card-title">Checks before payment</h3>
          <div style={{ marginTop: 8 }}><CheckRows items={ev.checks} /></div>
        </div>
        {access.messages.length > 0 && <Banner tone="warn"><ul style={{ margin: 0, paddingLeft: 18 }}>{access.messages.map((m) => <li key={m}>{m}</li>)}</ul></Banner>}
        {(access.canReview || access.canApprove || access.canPay || access.canResolve) && (
          <div className="admb-actions">
            {access.canResolve && <Button onClick={() => setMode('resolve')}><Scale size={18} />Resolve dispute</Button>}
            {access.canReview && <Button variant={ev.calcDone ? 'outline' : 'primary'} onClick={() => setMode('calc')}><Calculator size={18} />{d.calcReview ? 'Review the calculation again' : 'Review calculation'}</Button>}
            {access.canApprove && <Button onClick={() => setMode('approve')}><CheckCircle2 size={18} />Approve payment ({plan.have + 1} of {plan.required})</Button>}
            {access.canPay && <Button onClick={() => setMode('pay')}><Banknote size={18} />Mark as paid</Button>}
          </div>
        )}
        <div>
          <h3 className="admb-card-title">History</h3>
          <div style={{ marginTop: 10 }}><Timeline items={items} /></div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- calculation ---------------- */
function CalcDialog({ d, ev, onClose, setMode }) {
  const { data, user, update, notify, toast } = useApp();
  const pkg = findPkg(data, d.packageId);
  const defaults = useMemo(() => calcDefaults(data, d), [data, d]);
  const prev = d.calcReview;
  const [inp, setInp] = useState(() => (prev ? { ...defaults, verifiedSales: prev.verifiedSales, eligibleCosts: prev.eligibleCosts, otherDeductions: prev.otherDeductions, sharePct: prev.sharePct } : defaults));
  const [note, setNote] = useState('');
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const profit = isProfit(d);
  const res = runCalc(d, inp);
  const diff = res.variance;
  const set = (k) => (v) => { setInp((s) => ({ ...s, [k]: v })); setErr({}); };

  const save = async () => {
    const e = {};
    if (profit && res.invalid) e.sharePct = 'Enter the investors\' agreed share, between 0 and 100. It is in the Investor Funding Agreement.';
    if (!res.invalid && diff !== 0 && note.trim().length < 20) e.note = 'The calculation differs from the amount due. Explain the difference in at least 20 characters.';
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    await simulate(600);
    const review = {
      by: user.name, at: nowIso(), kind: res.kind, expected: res.expected, amountDue: d.amountDue, variance: diff, note: note.trim(),
      ...(profit ? { verifiedSales: Number(inp.verifiedSales) || 0, eligibleCosts: Number(inp.eligibleCosts) || 0, otherDeductions: Number(inp.otherDeductions) || 0, sharePct: Number(inp.sharePct), distributable: res.distributable, investorShare: res.investorShare, ratio: inp.ratio } : { contribution: d.contribution }),
    };
    update('distributions', d.id, { calcReview: review, calcReviewedBy: user.name, reviewedBy: user.name }, {
      action: 'Distribution calculation reviewed', entityType: 'Distribution',
      summary: `${d.ref}: calculated ${formatNaira(res.expected)}, amount due ${formatNaira(d.amountDue)}, difference ${formatNaira(diff)}`,
      reason: note.trim() || 'Calculation matches the amount due', ...(diff !== 0 ? { flagged: true } : {}),
    });
    notify('admin', 'Distribution ready for approval', `${d.ref} (${pkg?.name}) has a reviewed calculation and needs payment approval.`, `/admin/distributions?open=${d.id}`, 'distribution');
    setBusy(false);
    toast(diff === 0 ? 'Calculation reviewed. It matches the amount due.' : 'Calculation reviewed with a recorded difference. It can now go to approval.');
    setMode('detail');
  };

  return (
    <Modal open onClose={busy ? undefined : () => setMode('detail')} title={`Review calculation, ${d.ref}`} wide white footer={(<><Button variant="outline" onClick={() => setMode('detail')} disabled={busy} block>Back</Button><Button onClick={save} loading={busy} block>Save calculation review</Button></>)}>
      <div className="stack">
        <RuleBanner d={d} />
        {profit ? (
          <>
            <p className="small muted">Inputs come from sales and expenses the partner has confirmed. You may adjust them, and every change is kept in the audit trail. This is an illustration of how the amount is worked out, not a promise of any return.</p>
            <div className="form-grid">
              <MoneyField label="Verified sales" hint={inp.confirmedSales.length ? `${inp.confirmedSales.map((s) => s.ref).join(', ')}` : 'No confirmed sale yet'} value={inp.verifiedSales} onChange={set('verifiedSales')} />
              <MoneyField label="Eligible costs" hint={inp.costRows.length ? `${inp.costRows.length} confirmed expense${inp.costRows.length === 1 ? '' : 's'}` : 'No confirmed expense recorded'} value={inp.eligibleCosts} onChange={set('eligibleCosts')} />
              <MoneyField label="Other deductions" hint="Buyer deductions, fees and reserves" value={inp.otherDeductions} onChange={set('otherDeductions')} />
              <TextField label="Investors' agreed share (%)" required type="number" min="0" max="100" step="0.5" hint="From the Investor Funding Agreement" value={inp.sharePct} error={err.sharePct} onChange={(e) => set('sharePct')(e.target.value)} />
            </div>
            <table className="admb-calc">
              <tbody>
                <tr><td>Verified sales<span className="admb-calc__sub">Confirmed by the partner</span></td><td>{formatNaira(Number(inp.verifiedSales) || 0)}</td></tr>
                <tr><td>Less eligible costs and other deductions</td><td>{formatNaira((Number(inp.eligibleCosts) || 0) + (Number(inp.otherDeductions) || 0))}</td></tr>
                <tr><td>Distributable profit</td><td>{res.invalid ? '-' : formatNaira(res.distributable)}</td></tr>
                <tr><td>Investors&apos; collective share<span className="admb-calc__sub">{inp.sharePct === '' ? 'Enter the agreed share' : `${inp.sharePct}% of distributable profit`}</span></td><td>{res.invalid ? '-' : formatNaira(res.investorShare)}</td></tr>
                <tr><td>This investor&apos;s portion<span className="admb-calc__sub">{formatNaira(d.contribution)} of {formatNaira(inp.base)} confirmed funds</span></td><td>{Math.round(inp.ratio * 1000) / 10}%</td></tr>
                <tr className="admb-calc__total"><td>Calculated amount</td><td>{res.invalid ? '-' : formatNaira(res.expected)}</td></tr>
                <tr><td>Amount due on record</td><td>{formatNaira(d.amountDue)}</td></tr>
                <tr><td>Difference</td><td>{res.invalid ? '-' : diff === 0 ? 'None' : `${diff > 0 ? '+' : '-'}${formatNaira(Math.abs(diff))}`}</td></tr>
              </tbody>
            </table>
          </>
        ) : (
          <table className="admb-calc">
            <tbody>
              <tr><td>Confirmed contribution<span className="admb-calc__sub">The investor&apos;s own capital</span></td><td>{formatNaira(d.contribution)}</td></tr>
              <tr><td>Scheduled capital repayment<span className="admb-calc__sub">{d.basis}</span></td><td>{formatNaira(res.expected)}</td></tr>
              <tr><td>Profit included</td><td>None</td></tr>
              <tr className="admb-calc__total"><td>Amount due on record</td><td>{formatNaira(d.amountDue)}</td></tr>
              <tr><td>Difference</td><td>{diff === 0 ? 'None' : `${diff > 0 ? '+' : '-'}${formatNaira(Math.abs(diff))}`}</td></tr>
            </tbody>
          </table>
        )}
        {!res.invalid && diff !== 0 && <Banner tone="warn" title="The calculation does not match the amount due">Record why before this goes to approval. The difference is flagged in the audit log. If the investor disagrees, they can dispute the amount.</Banner>}
        <TextAreaField label={diff !== 0 && !res.invalid ? 'Explain the difference' : 'Reviewer note'} required={diff !== 0 && !res.invalid} optional={diff === 0 || res.invalid} value={note} error={err.note} onChange={(e) => { setNote(e.target.value); setErr((s) => ({ ...s, note: '' })); }} />
      </div>
    </Modal>
  );
}

/* ---------------- approve ---------------- */
function ApproveDialog({ d, ev, setMode, onClose }) {
  const { data, user, update, notify, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const pkg = findPkg(data, d.packageId);
  const n = ev.plan.have + 1;
  const run = async () => {
    setBusy(true);
    await simulate(600);
    const done = n >= ev.plan.required;
    update('distributions', d.id, (r) => ((r.approvals || []).some((a) => a.by === user.name) ? {} : { approvals: [...(r.approvals || []), { by: user.name, role: adminRoleLabel(user), at: nowIso() }], reviewedBy: r.reviewedBy || user.name }), {
      action: `Approved distribution payment (${n} of ${ev.plan.required})`, entityType: 'Distribution',
      summary: `${d.ref}: ${formatNaira(d.amountDue)} to ${investorName(data, d.investorId)}`, reason: ev.plan.secondRequired ? `Above ${formatNaira(ev.limits.secondApproverAbove)}, so two different approvers are required` : 'Single approval within the limit',
    });
    notify('admin', done ? 'Distribution ready to mark paid' : 'Distribution needs a second approver', `${d.ref} (${pkg?.name}), ${formatNaira(d.amountDue)}. ${done ? 'All approvals are in.' : `${user.name} gave approval 1 of 2.`}`, `/admin/distributions?open=${d.id}`, 'distribution');
    setBusy(false);
    toast(done ? 'Approved. A payment reference can now be recorded.' : 'First approval recorded. A different administrator must give the second approval.');
    setMode('detail');
  };
  return (
    <ConfirmDialog
      open
      onClose={busy ? undefined : () => setMode('detail')}
      onConfirm={run}
      loading={busy}
      tone="green"
      title="Approve this payment?"
      message="Approving does not move money. It lets an administrator record the payment once the financial partner has made it."
      summary={[
        ['Recipient', `${investorName(data, d.investorId)}`],
        ['Amount', formatNaira(d.amountDue)],
        ['Purpose', `${typeLabel(d)} for ${pkg?.name}`],
        ['Approval status', `${ev.plan.have} of ${ev.plan.required} so far. You would give approval ${n}.`],
      ]}
      confirmLabel={`Give approval ${n} of ${ev.plan.required}`}
    />
  );
}

/* ---------------- pay ---------------- */
function PayDialog({ d, ev, payRef, setPayRef, setMode }) {
  const { data } = useApp();
  const pkg = findPkg(data, d.packageId);
  const [err, setErr] = useState('');
  const next = () => {
    const ref = payRef.trim().toUpperCase();
    if (!ref) { setErr('Enter the payment reference the financial partner gave you.'); return; }
    if (!REF_PATTERN.test(ref)) { setErr('Use 6 to 32 letters, numbers or dashes, for example TX-33810123.'); return; }
    const clash = data.transactions.find((t) => String(t.ref).toUpperCase() === ref) || data.distributions.find((x) => x.id !== d.id && String(x.paymentRef || '').toUpperCase() === ref);
    if (clash) { setErr('This reference is already recorded against another payment. A reference can only be used once.'); return; }
    setPayRef(ref);
    setMode('payConfirm');
  };
  return (
    <Modal open onClose={() => setMode('detail')} title={`Mark ${d.ref} as paid`} wide white footer={(<><Button variant="outline" onClick={() => setMode('detail')} block>Back</Button><Button onClick={next} block>Continue</Button></>)}>
      <div className="stack">
        <Banner tone="warn" title="Record a payment only after the partner has made it">
          CollabFarm does not hold or move money. Enter the reference from the financial partner&apos;s confirmation. In this demo the payment is simulated.
        </Banner>
        <InfoList compact items={[
          ['Recipient', investorName(data, d.investorId)],
          ['Amount', formatNaira(outstanding(d))],
          ['Purpose', `${typeLabel(d)} for ${pkg?.name}`],
          ['Approval status', `${ev.plan.have} of ${ev.plan.required} approvals complete`],
        ]}
        />
        <TextField label="Partner payment reference" required placeholder="TX-33810123" value={payRef} error={err} onChange={(e) => { setPayRef(e.target.value); setErr(''); }} hint="Each payment reference can be used once. This stops double payment." />
      </div>
    </Modal>
  );
}

function PayConfirm({ d, ev, payRef, setMode, onClose }) {
  const { data, user, update, add, notify, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const pkg = findPkg(data, d.packageId);
  const run = async () => {
    if (isPaid(d) || d.paymentRef) { toast('This distribution is already paid. Nothing was changed.', 'info'); onClose(); return; }
    setBusy(true);
    await simulate(900);
    const amount = outstanding(d);
    const date = todayIso();
    update('distributions', d.id, (r) => (isPaid(r) || r.paymentRef ? {} : { status: 'Confirmed', amountPaid: r.amountDue, paidDate: date, paymentRef: payRef, paidBy: user.name }), {
      action: 'Marked distribution as paid', entityType: 'Distribution',
      summary: `${d.ref}: ${formatNaira(amount)} to ${investorName(data, d.investorId)}. Status ${d.status} to Confirmed`, reason: `Partner payment reference ${payRef}`,
    });
    add('transactions', { id: newId('tx'), ref: payRef, type: 'Distribution', partyId: d.investorId, packageId: d.packageId, amount, status: 'Confirmed', date: nowIso(), direction: 'out', note: `${typeLabel(d)}, ${d.ref}. Recorded by ${user.name} from the partner reference. Simulated.` });
    const inv = investmentFor(data, d);
    if (inv) {
      const others = data.distributions.filter((x) => x.id !== d.id && x.investorId === d.investorId && x.packageId === d.packageId);
      const allPaid = others.every((x) => isPaid(x));
      const otherOverdue = others.some((x) => !isPaid(x) && x.status === 'Overdue');
      update('investments', inv.id, (r) => ({ repaid: (r.repaid || 0) + amount, status: allPaid ? 'Repaid' : r.status === 'Overdue' && !otherOverdue ? 'Active' : r.status }));
    }
    notify('investor', 'Distribution paid', `${formatNaira(amount)} (${d.ref}, ${pkg?.name}) was paid. Partner reference ${payRef}.`, '/investor/distributions', 'distribution');
    notify('cooperative', 'Investor distribution paid', `${d.ref} for ${pkg?.name} was marked paid. ${typeLabel(d)}, ${formatNaira(amount)}.`, `/coop/settlements/distributions/${d.id}`, 'distribution');
    setBusy(false);
    toast(`${d.ref} is marked paid. It cannot be paid again.`);
    onClose();
  };
  return (
    <ConfirmDialog
      open
      onClose={busy ? undefined : () => setMode('pay')}
      onConfirm={run}
      loading={busy}
      tone="amber"
      title="Record this payment as made?"
      message="This closes the distribution. A paid distribution cannot be paid again."
      summary={[
        ['Recipient', investorName(data, d.investorId)],
        ['Amount', formatNaira(outstanding(d))],
        ['Purpose', `${typeLabel(d)} for ${pkg?.name}`],
        ['Approval status', `${ev.plan.have} of ${ev.plan.required} approvals complete`],
        ['Partner reference', payRef],
      ]}
      confirmLabel="Mark as paid"
    />
  );
}

/* ---------------- resolve dispute ---------------- */
const OUTCOMES = [
  { value: 'upheld', label: 'Upheld, correct the amount due' },
  { value: 'rejected', label: 'Not upheld, the original amount stands' },
  { value: 'settled', label: 'Settled by agreement with the investor' },
];
const OUTCOME_TEXT = { upheld: 'Dispute upheld, amount corrected', rejected: 'Dispute not upheld, original amount stands', settled: 'Settled by agreement' };

function ResolveDialog({ d, ev, setMode }) {
  const { data, user, update, notify, toast } = useApp();
  const pkg = findPkg(data, d.packageId);
  const complaint = complaintFor(data, d);
  const [outcome, setOutcome] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const e = {};
    if (!outcome) e.outcome = 'Choose how the dispute was resolved.';
    if (outcome === 'upheld') {
      if (!amount || Number(amount) <= 0) e.amount = 'Enter the corrected amount due.';
      else if (Number(amount) === d.amountDue) e.amount = 'This is the same as the current amount. Choose Not upheld instead.';
    }
    if (note.trim().length < 20) e.note = 'Explain the decision in at least 20 characters. The investor can read this.';
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    await simulate(700);
    const upheld = outcome === 'upheld';
    const resolution = { outcome: OUTCOME_TEXT[outcome], note: note.trim(), by: user.name, at: nowIso(), disputedAmount: d.disputed, ...(upheld ? { previousAmountDue: d.amountDue, newAmountDue: Number(amount) } : {}) };
    update('distributions', d.id, upheld
      ? { disputed: 0, disputeResolution: resolution, amountDue: Number(amount), approvals: [], calcReview: null, calcReviewedBy: null, reviewedBy: null }
      : { disputed: 0, disputeResolution: resolution }, {
      action: 'Distribution dispute resolved', entityType: 'Distribution',
      summary: `${d.ref}: ${OUTCOME_TEXT[outcome]}${upheld ? `. Amount due ${formatNaira(d.amountDue)} to ${formatNaira(Number(amount))}` : ''}`, reason: note.trim(), ...(upheld ? { flagged: true } : {}),
    });
    if (complaint && complaint.status !== 'Resolved') {
      update('complaints', complaint.id, (r) => ({ status: 'Resolved', updatedAt: nowIso(), outcome: `${OUTCOME_TEXT[outcome]}. ${note.trim()}`, actions: [...(r.actions || []), { at: todayIso(), by: user.name, text: `Distribution dispute resolved: ${OUTCOME_TEXT[outcome]}. ${note.trim()}` }] }), {
        action: 'Complaint resolved from distribution dispute', entityType: 'Complaint', entityId: complaint.id, summary: `${complaint.ref}: Resolved`, reason: note.trim(),
      });
    }
    notify('investor', 'Your distribution dispute was resolved', `${d.ref} (${pkg?.name}): ${OUTCOME_TEXT[outcome]}. ${note.trim()}`, '/investor/distributions', 'distribution');
    notify('cooperative', 'Distribution dispute resolved', `${d.ref} for ${pkg?.name}: ${OUTCOME_TEXT[outcome]}.`, `/coop/settlements/distributions/${d.id}`, 'distribution');
    setBusy(false);
    toast(upheld ? 'Dispute resolved. The corrected amount needs a fresh calculation review and approval.' : 'Dispute resolved. The distribution can go back to approval.');
    setMode('detail');
  };

  return (
    <Modal open onClose={busy ? undefined : () => setMode('detail')} title={`Resolve dispute, ${d.ref}`} white footer={(<><Button variant="outline" onClick={() => setMode('detail')} disabled={busy} block>Back</Button><Button onClick={save} loading={busy} block>Resolve dispute</Button></>)}>
      <div className="stack">
        <Banner tone="info">A dispute is a request for a second look, not an accusation. Give a clear reason so the investor and the cooperative can follow the decision.</Banner>
        <InfoList compact items={[
          ['Investor', investorName(data, d.investorId)],
          ['Amount due', formatNaira(d.amountDue)],
          ['Amount disputed', formatNaira(d.disputed)],
          ['Purpose', `${typeLabel(d)} for ${pkg?.name}`],
          ['Approval status', `${ev.plan.have} of ${ev.plan.required} approvals`],
          ['Complaint', complaint ? <Link key="c" to={`/admin/complaints/${complaint.id}`}>{complaint.ref}</Link> : 'None linked'],
        ]}
        />
        <SelectField label="Outcome" required options={OUTCOMES} placeholder="Choose an outcome" value={outcome} error={err.outcome} onChange={(e) => { setOutcome(e.target.value); setErr({}); }} />
        {outcome === 'upheld' && <MoneyField label="Corrected amount due" required hint="Approvals are cleared and the calculation must be reviewed again." value={amount} error={err.amount} onChange={(v) => { setAmount(v); setErr((s) => ({ ...s, amount: '' })); }} />}
        <TextAreaField label="Decision and reasons" required value={note} error={err.note} onChange={(e) => { setNote(e.target.value); setErr((s) => ({ ...s, note: '' })); }} />
      </div>
    </Modal>
  );
}

/* ---------------- entry point ---------------- */
export default function DistributionFlow({ dist, mode, setMode, onClose }) {
  const { data, user } = useApp();
  const [payRef, setPayRef] = useState('');
  const ev = useMemo(() => evaluateDistribution(data, dist, user), [data, dist, user]);

  if (mode === 'calc' && ev.access.canReview) return <CalcDialog d={dist} ev={ev} onClose={onClose} setMode={setMode} />;
  if (mode === 'approve' && ev.access.canApprove) return <ApproveDialog d={dist} ev={ev} onClose={onClose} setMode={setMode} />;
  if (mode === 'pay' && ev.access.canPay) return <PayDialog d={dist} ev={ev} payRef={payRef} setPayRef={setPayRef} setMode={setMode} />;
  if (mode === 'payConfirm' && ev.access.canPay && payRef) return <PayConfirm d={dist} ev={ev} payRef={payRef} setMode={setMode} onClose={onClose} />;
  if (mode === 'resolve' && ev.access.canResolve) return <ResolveDialog d={dist} ev={ev} setMode={setMode} />;
  // Anything else, including an action that is not available to this person right now, shows the details and the reason.
  return <DetailDialog d={dist} ev={ev} onClose={onClose} setMode={setMode} />;
}
