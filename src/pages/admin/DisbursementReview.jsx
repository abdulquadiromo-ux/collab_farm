import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Ban, Send, FlaskConical, Lock, ShieldAlert, FileText } from 'lucide-react';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { PageHeader, Card, Breadcrumb, StatusPill, Banner, Button, ConfirmDialog, InfoList, Timeline, LinkButton } from '../../components/ui/index.js';
import { formatNaira } from '../../utils/format.js';
import { disbursementLabel } from '../../utils/status.js';
import {
  nowIso, approvalPlan, disbursementAccess, releaseChecks, applyPartnerConfirmation, trancheLabel, nextStepText, destinationVerified,
} from '../../components/admb/lib.js';
import { PageMissing, ReasonModal, CheckRows, ActingAs, RuleList, At, atText } from '../../components/admb/ui.jsx';
import '../../styles/pages/admb.css';

export default function DisbursementReview() {
  const { id } = useParams();
  const ctx = useApp();
  const { data, user, update, notify, toast } = ctx;
  const d = data.disbursements.find((x) => x.id === id);
  const [confirm, setConfirm] = useState(null); // 'first' | 'second' | 'release' | 'partner'
  const [rejectOpen, setRejectOpen] = useState(false);
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!d) return <PageMissing crumbs={[{ label: 'Disbursements', to: '/admin/disbursements' }, { label: 'Not found' }]} title="Payment not found" text="This payment does not exist or the link is out of date." backTo="/admin/disbursements" backLabel="Back to disbursements" />;

  const limits = data.platformSettings.approvalLimits;
  const plan = approvalPlan(d, limits);
  const access = disbursementAccess(d, user, plan, data);
  const rc = releaseChecks(data, d, plan);
  const { tranche, pkg } = rc;
  const open = ['Pending', 'Reviewing'].includes(d.status);
  const sent = !!d.instructionSentAt;
  const recon = data.reconciliation.find((r) => r.ref === d.ref);
  const approvalNames = d.approvals?.length ? d.approvals.map((a) => `${a.by} (${a.role})`).join(', ') : 'No approvals yet';
  const milestoneEvidence = tranche ? data.milestones.filter((m) => m.trancheId === tranche.id) : [];
  const gateFailing = !rc.gateOk && !d.exception;
  const destVerified = destinationVerified(data, d);

  const paySummary = (extra = []) => [
    ['Recipient', `${d.recipientName} (${d.recipientType})`],
    ['Amount', formatNaira(d.amount)],
    ['Purpose', d.purpose],
    ['Project', pkg?.name || '-'],
    ['Approval status', `${plan.have} of ${plan.required} given. ${approvalNames}`],
    ...extra,
  ];

  // budget lines against recorded spend
  const lines = pkg?.budget || [];
  const spendBy = {};
  data.expenses.filter((e) => e.packageId === d.packageId).forEach((e) => { spendBy[e.category] = (spendBy[e.category] || 0) + e.amount; });
  const cats = [...new Set([...lines.map((l) => l.category), ...Object.keys(spendBy)])];
  const budgetRows = cats.map((c) => ({ category: c, approved: lines.filter((l) => l.category === c).reduce((s, l) => s + l.amount, 0), spent: spendBy[c] || 0 }));
  const trancheDone = tranche ? tranche.amount - rc.trancheLeft : 0;

  const finish = (msg, tone) => { setBusy(false); setConfirm(null); toast(msg, tone); };

  const doApprove = async (step) => {
    setBusy(true);
    await simulate(500);
    const role = step === 'first' ? 'Project reviewer' : 'Payment approver';
    const n = plan.have + 1;
    update('disbursements', d.id, (r) => ({ approvals: [...(r.approvals || []), { by: user.name, role, at: nowIso() }], status: 'Reviewing' }), {
      action: `Approved disbursement as ${role.toLowerCase()}`, entityType: 'Disbursement', summary: `Approval ${n} of ${plan.required} recorded. ${d.recipientName}, ${formatNaira(d.amount)}.`, reason: 'Checked recipient, amount, destination, tranche and evidence',
    });
    if (n < plan.required) notify('admin', 'Second approval needed', `${formatNaira(d.amount)} to ${d.recipientName} for ${pkg?.name} needs a second, different approver.`, `/admin/disbursements/${d.id}`, 'disbursement');
    else notify('admin', 'Payment approved, ready to send', `${formatNaira(d.amount)} to ${d.recipientName} for ${pkg?.name} has all required approvals.`, `/admin/disbursements/${d.id}`, 'disbursement');
    finish(`Approval ${n} of ${plan.required} recorded.`);
  };

  const doRelease = async () => {
    setBusy(true);
    await simulate(900);
    const at = nowIso();
    update('disbursements', d.id, { status: 'Reviewing', instructionSentAt: at, instructionBy: user.name, instructionRef: `INS-${String(d.ref).replace(/\D/g, '').slice(-6)}` }, {
      action: d.exception ? 'Payment instruction sent under a recorded exception' : 'Payment instruction sent to the financial partner', entityType: 'Disbursement',
      summary: `${formatNaira(d.amount)} to ${d.recipientName}. Waiting for partner confirmation.${d.exception ? ' Milestone gate waived by exception.' : ''}`, reason: d.exception ? d.exception.reason : 'All approvals and release checks passed', ...(d.exception ? { flagged: true } : {}),
    });
    notify('cooperative', 'Payment instruction sent', `${formatNaira(d.amount)} for ${d.purpose} (${pkg?.name}) was sent to the financial partner. It is not paid until the partner confirms.`, '/coop/disbursements', 'disbursement');
    finish('Payment instruction sent to the financial partner (simulated). It is not paid until the partner confirms.', 'info');
  };

  const doPartner = async () => {
    setBusy(true);
    await simulate(700);
    applyPartnerConfirmation(ctx, d);
    finish('Partner confirmation simulated. The payment is Disbursed and a reconciliation record is open.');
  };

  const doReject = async (reason) => {
    await simulate(500);
    update('disbursements', d.id, { status: 'Rejected', rejectedBy: user.name, rejectedAt: nowIso(), rejectedReason: reason }, {
      action: 'Disbursement rejected', entityType: 'Disbursement', summary: `${d.recipientName}, ${formatNaira(d.amount)}. Status ${d.status} to Rejected.`, reason,
    });
    notify('cooperative', 'Payment request rejected', `${formatNaira(d.amount)} for ${d.purpose} was not approved: ${reason}`, '/coop/disbursements', 'disbursement');
    setRejectOpen(false);
    toast('Payment rejected. The record is kept for the audit trail.', 'info');
  };

  const doException = async (reason) => {
    await simulate(500);
    update('disbursements', d.id, { exception: { reason, by: user.name, at: nowIso(), trancheId: tranche?.id } }, {
      action: 'EXCEPTION recorded: tranche gate waived', entityType: 'Disbursement', summary: `${d.recipientName}, ${formatNaira(d.amount)}. Milestone and previous tranche checks waived. Flagged for review.`, reason, flagged: true,
    });
    notify('admin', 'Exception recorded on a payment', `${user.name} waived the tranche gate for ${formatNaira(d.amount)} to ${d.recipientName} (${pkg?.name}). Reason: ${reason}`, `/admin/disbursements/${d.id}`, 'risk');
    setExceptionOpen(false);
    toast('Exception recorded and flagged in the audit log. Approvals are still required.', 'info');
  };

  const timeline = [
    { title: `Raised by ${d.recordedBy}`, meta: atText(d.date), state: 'done', body: d.purpose },
    d.approvals?.[0]
      ? { title: `First approval: ${d.approvals[0].by}`, meta: `${d.approvals[0].role}${d.approvals[0].at ? ` · ${atText(d.approvals[0].at)}` : ''}`, state: 'done' }
      : { title: 'First approval (Project reviewer)', meta: 'Waiting', state: open && !sent ? 'active' : undefined },
    plan.secondRequired
      ? (d.approvals?.[1] ? { title: `Second approval: ${d.approvals[1].by}`, meta: `${d.approvals[1].role}${d.approvals[1].at ? ` · ${atText(d.approvals[1].at)}` : ''}`, state: 'done' } : { title: 'Second approval (Payment approver)', meta: `Required: above ${formatNaira(limits.secondApproverAbove)} a different second approver is needed`, state: open && plan.have === 1 && !sent ? 'active' : undefined })
      : { title: 'Second approval not required', meta: `Payments up to ${formatNaira(limits.secondApproverAbove)} need one approval` },
    sent ? { title: 'Payment instruction sent to the financial partner', meta: `${d.instructionBy} · ${atText(d.instructionSentAt)}`, state: 'done', body: d.instructionRef ? `Instruction ${d.instructionRef}` : undefined } : { title: 'Send payment instruction', meta: 'Only after all required approvals and release checks', state: open && plan.complete ? 'active' : undefined },
    d.status === 'Disbursed' ? { title: 'Partner confirmed the payment', meta: d.partnerConfirmedAt ? `${atText(d.partnerConfirmedAt)}${d.partnerRef ? ` · ${d.partnerRef}` : ''}` : atText(d.date), state: 'done' } : { title: 'Partner confirmation', meta: 'The partner reports that the money moved', state: sent && open ? 'active' : undefined },
    recon ? { title: `Reconciliation: ${recon.status}`, meta: recon.reconciledAt ? `${recon.reconciledBy}, ${atText(recon.reconciledAt)}` : 'Waiting to be matched with the partner statement', state: recon.status === 'Confirmed' ? 'done' : 'active' } : { title: 'Reconciliation', meta: 'Opens after partner confirmation' },
    ...(d.status === 'Rejected' ? [{ title: `Rejected by ${d.rejectedBy || 'a reviewer'}`, meta: d.rejectedAt ? atText(d.rejectedAt) : '', state: 'bad', body: d.rejectedReason }] : []),
  ];

  const blockers = rc.blocking.map((c) => c.label);
  const releaseHint = plan.complete && !rc.ready ? `Release is blocked until these are fixed: ${blockers.join('; ')}.` : plan.complete && !access.canRelease && access.messages.length === 0 ? 'Waiting for another administrator to send the instruction.' : '';

  return (
    <div className="page">
      <Breadcrumb items={[{ label: 'Disbursements', to: '/admin/disbursements' }, { label: d.ref }]} />
      <PageHeader
        title={`${formatNaira(d.amount)} to ${d.recipientName}`}
        subtitle={`${d.purpose} · ${pkg?.name || ''}`}
        actions={<div className="admb-pillrow"><StatusPill>{disbursementLabel(d)}</StatusPill><span className="admb-flag admb-flag--gray">{nextStepText(d, plan)}</span>{d.exception && <span className="admb-flag admb-flag--red">Exception recorded</span>}</div>}
      />
      <ActingAs user={user} />
      {pkg?.status === 'Paused' && open && <Banner tone="warn" title="New disbursements are suspended on this project">The payment can be approved but not sent until an administrator resumes disbursements. A pause is not a finding of fault.</Banner>}
      {d.status === 'Disbursed' && <Banner tone="success" title="Paid and confirmed by the financial partner">{recon ? <>Reconciliation is {recon.status}. <Link to={`/admin/reconciliation?q=${d.ref}&open=${recon.id}`}>Open the reconciliation record</Link>.</> : 'This payment was confirmed before reconciliation tracking began.'}</Banner>}
      {d.status === 'Rejected' && <Banner tone="danger" title="This payment was rejected">{d.rejectedReason || 'No reason was recorded.'} The record is kept. Nothing is deleted.</Banner>}
      {open && !sent && access.messages.length > 0 && <Banner tone="warn" title="Separation of duties">{access.messages.join(' ')}</Banner>}

      <div className="admb-main">
        <div className="admb-col">
          <Card>
            <h2 className="admb-card-title">Payment summary</h2>
            <InfoList compact items={[
              ['Recipient', <span key="r"><strong>{d.recipientName}</strong> ({d.recipientType})</span>],
              ['Payout destination', <span key="d"><StatusPill tone={destVerified ? 'green' : 'amber'}>{destVerified ? 'Verified' : 'Not verified'}</StatusPill> {d.destination}</span>],
              ['Amount', <span key="a"><span className="strong admb-mono">{formatNaira(d.amount)}</span> <span className="cell-sub"><Lock size={12} style={{ verticalAlign: '-1px' }} aria-hidden="true" /> Locked once approval starts</span></span>],
              ['Purpose', d.purpose],
              ['Project', pkg ? <Link key="p" to={`/admin/monitoring/${pkg.id}`}>{pkg.name}</Link> : '-'],
              ['Tranche', tranche ? <span key="t">{trancheLabel(tranche)} <StatusPill>{tranche.status}</StatusPill></span> : 'Not linked'],
              ['Raised by', `${d.recordedBy}, ${atText(d.date)}`],
              ['Reference', d.ref],
              ['Idempotency key', <span key="i"><code>{d.idempotencyKey}</code><span className="cell-sub"> A unique code so this payment can never be sent twice.</span></span>],
              ...(d.recipientType === 'Supplier' ? [
                ['Supplier verification', rc.supplier ? <span key="s"><StatusPill>{rc.supplier.verification}</StatusPill> {rc.supplier.name}</span> : 'Supplier record not found'],
                ['Invoice', d.invoice || 'None attached'],
                ['Delivery evidence', d.deliveryEvidence || 'None attached'],
              ] : []),
            ]}
            />
          </Card>

          <Card>
            <div className="admb-head">
              <div>
                <h2 className="admb-card-title">Release checks</h2>
                <p className="admb-card-sub">A payment instruction can be sent only when every check is met. Only the two tranche checks can be waived, and only by a recorded exception. A funds warning does not block, but the partner pays only what it holds.</p>
              </div>
            </div>
            <CheckRows items={rc.checks} />
          </Card>

          <Card>
            <h2 className="admb-card-title">Budget and remaining balance</h2>
            <p className="admb-card-sub">What this payment draws on, and what is left afterwards.</p>
            <div className="admb-metric-grid" style={{ marginTop: 14 }}>
              <div className="admb-metric"><span className="admb-metric__label">Tranche allowance</span><span className="admb-metric__value admb-mono">{tranche ? formatNaira(tranche.amount) : '-'}</span><span className="cell-sub">{tranche ? trancheLabel(tranche) : 'No tranche linked'}</span></div>
              <div className="admb-metric"><span className="admb-metric__label">Already paid from it</span><span className="admb-metric__value admb-mono">{formatNaira(trancheDone)}</span><span className="cell-sub">Confirmed by the partner</span></div>
              <div className="admb-metric"><span className="admb-metric__label">Left after this payment</span><span className="admb-metric__value admb-mono" style={{ color: tranche && rc.trancheLeft - d.amount < 0 ? 'var(--red-600)' : undefined }}>{tranche ? formatNaira(rc.trancheLeft - d.amount) : '-'}</span><span className="cell-sub">{tranche && rc.trancheLeft - d.amount < 0 ? 'This payment is above the allowance' : 'Within the allowance'}</span></div>
            </div>
            <div className="admb-scroll" style={{ marginTop: 16 }}>
              <table className="admb-mini-table">
                <thead><tr><th>Budget line</th><th>Approved</th><th>Recorded spend</th><th>Remaining</th></tr></thead>
                <tbody>
                  {budgetRows.length === 0 && <tr><td colSpan={4} className="muted">No budget lines are recorded for this project.</td></tr>}
                  {budgetRows.map((b) => (
                    <tr key={b.category}>
                      <td>{b.category}{b.approved === 0 && <div className="cell-sub">No approved line</div>}</td>
                      <td className="admb-mono">{formatNaira(b.approved)}</td>
                      <td className="admb-mono">{formatNaira(b.spent)}</td>
                      <td className="admb-mono">{b.approved - b.spent < 0 ? <span className="admb-diff">Over by {formatNaira(b.spent - b.approved)}</span> : formatNaira(b.approved - b.spent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="cell-sub" style={{ marginTop: 10 }}>Confirmed funds available for this project: {formatNaira(rc.funds)}. Money that investors have only committed does not count until the financial partner confirms it.</p>
          </Card>

          <Card>
            <h2 className="admb-card-title">Evidence</h2>
            <p className="admb-card-sub">Files behind this payment. Open the milestone to review them.</p>
            <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
              {milestoneEvidence.flatMap((m) => m.evidence.map((e) => ({ ...e, m }))).map((e) => (
                <li key={`${e.m.id}-${e.id}`} className="row between small" style={{ gap: 12 }}>
                  <span><FileText size={14} style={{ verticalAlign: '-2px' }} aria-hidden="true" /> {e.name} <span className="muted">({e.type}, <Link to={`/admin/milestones/${e.m.id}`}>{e.m.title}</Link>)</span></span>
                  <StatusPill tone={e.verified ? 'green' : 'gray'}>{e.verified ? 'Verified' : 'Uploaded'}</StatusPill>
                </li>
              ))}
              {d.invoice && <li className="row between small"><span><FileText size={14} style={{ verticalAlign: '-2px' }} aria-hidden="true" /> Supplier invoice {d.invoice}</span><StatusPill tone="green">On file</StatusPill></li>}
              {d.deliveryEvidence && <li className="row between small"><span><FileText size={14} style={{ verticalAlign: '-2px' }} aria-hidden="true" /> {d.deliveryEvidence}</span><StatusPill tone="green">On file</StatusPill></li>}
              {milestoneEvidence.every((m) => m.evidence.length === 0) && !d.invoice && !d.deliveryEvidence && <li className="small muted">No evidence is attached to this payment or its tranche yet.</li>}
            </ul>
          </Card>

          <Card>
            <h2 className="admb-card-title">Approvals and progress</h2>
            <div style={{ marginTop: 14 }}><Timeline items={timeline} /></div>
          </Card>

          <RuleList title="The rules, in plain language" items={[
            'Nobody raises, approves and pays alone. The person who raised a payment cannot approve it, and nobody approves it twice.',
            `Payments above ${formatNaira(limits.secondApproverAbove)} need a second approver who is a different person from the first.`,
            'Once approval starts the amount cannot be edited and a payment is never deleted. To fix a mistake, reject it and raise a new one, or post a correcting entry.',
            'A payment instruction is not proof of payment. It becomes Disbursed only after the financial partner confirms it.',
            'Money that is only committed cannot be paid out. Only confirmed funds count.',
            'A tranche is paid only after its milestones are approved and the earlier tranche is released, unless a recorded exception says otherwise.',
          ]}
          />
        </div>

        <div className="admb-col admb-sticky">
          <Card>
            <h2 className="admb-card-title">Actions</h2>
            <p className="admb-card-sub">{plan.have} of {plan.required} required approvals given.</p>
            <div className="stack" style={{ marginTop: 12 }}>
              {open && !sent && (
                <div className="admb-actions">
                  {plan.have === 0 && <Button onClick={() => setConfirm('first')} disabled={!access.canFirst}><CheckCircle2 size={18} />First approval (Project reviewer)</Button>}
                  {plan.secondRequired && plan.have === 1 && <Button onClick={() => setConfirm('second')} disabled={!access.canSecond}><CheckCircle2 size={18} />Second approval (Payment approver)</Button>}
                  {plan.complete && <Button onClick={() => setConfirm('release')} disabled={!(access.canRelease && rc.ready)}><Send size={18} />Release payment instruction</Button>}
                  <Button variant="danger-outline" onClick={() => setRejectOpen(true)}><Ban size={18} />Reject payment</Button>
                </div>
              )}
              {open && !sent && releaseHint && <div className="admb-hint admb-hint--warn">{releaseHint}</div>}
              {open && sent && (
                <div className="admb-actions">
                  <div className="admb-hint">Instruction sent by {d.instructionBy} on <At value={d.instructionSentAt} />. Waiting for the financial partner to confirm.</div>
                  <Button onClick={() => setConfirm('partner')}><FlaskConical size={18} />Simulate partner confirmation (demo only)</Button>
                  <p className="cell-sub">In the real product the financial partner reports this. Here you can simulate it. The payment becomes Disbursed and a reconciliation record opens.</p>
                </div>
              )}
              {d.status === 'Disbursed' && <div className="admb-hint admb-hint--ok">Paid. Nothing more to approve. {recon ? `Reconciliation: ${recon.status}.` : ''}</div>}
              {d.status === 'Rejected' && <div className="admb-hint admb-hint--bad">Rejected. No money moved.</div>}
              <LinkButton to="/admin/disbursements" variant="outline">Back to disbursements</LinkButton>
            </div>
          </Card>

          {open && !sent && (gateFailing || d.exception) && (
            <div className={`admb-exception ${d.exception ? 'admb-exception--active' : ''}`}>
              <div className="admb-exception__title"><ShieldAlert size={20} aria-hidden="true" />Exception: release without an approved milestone</div>
              {d.exception ? (
                <p className="small">Recorded by <strong>{d.exception.by}</strong> on <At value={d.exception.at} />. Reason: {d.exception.reason}. This is flagged in the audit log. Approvals and the other checks still apply.</p>
              ) : (
                <>
                  <p className="small">The normal rule is that milestone evidence is approved and the earlier tranche is released first. In a real emergency you can waive those two checks. A written reason is required and the action is flagged for review. Prefer approving the milestone instead.</p>
                  <Button variant="danger-outline" onClick={() => setExceptionOpen(true)}>Record an exception</Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'first' || confirm === 'second'}
        onClose={() => setConfirm(null)}
        onConfirm={() => doApprove(confirm)}
        loading={busy}
        tone="green"
        title={confirm === 'second' ? 'Give the second approval?' : 'Give the first approval?'}
        message="You are confirming the recipient, amount, purpose and destination. This is not yet a payment."
        summary={paySummary([['Destination', d.destination], ['You are approving as', `${user.name}, ${confirm === 'second' ? 'Payment approver' : 'Project reviewer'}`]])}
        confirmLabel="Approve"
      />
      <ConfirmDialog
        open={confirm === 'release'}
        onClose={() => setConfirm(null)}
        onConfirm={doRelease}
        loading={busy}
        tone="amber"
        title="Send the payment instruction?"
        message="This sends an instruction to the financial partner. It is simulated here. It is not proof of payment until the partner confirms."
        warning={[d.exception ? 'A recorded exception waives the milestone and previous tranche checks. This is flagged in the audit log.' : '', ...rc.warnings.map((w) => w.detail)].filter(Boolean).join(' ') || undefined}
        summary={paySummary([['Destination', d.destination], ['Idempotency key', d.idempotencyKey]])}
        confirmLabel="Send instruction"
      />
      <ConfirmDialog
        open={confirm === 'partner'}
        onClose={() => setConfirm(null)}
        onConfirm={doPartner}
        loading={busy}
        tone="amber"
        title="Simulate the partner confirmation?"
        message="Demo only. In real use the financial partner reports this. The payment becomes Disbursed, an expense and a reconciliation record are created, and the tranche is marked Released if it is now fully paid."
        summary={paySummary([['Destination', d.destination]])}
        confirmLabel="Simulate confirmation"
      />
      <ReasonModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject this payment"
        intro="Rejecting stops the payment. The record is kept and the cooperative is told why."
        summary={paySummary()}
        label="Reason for rejecting"
        minLength={15}
        confirmLabel="Reject payment"
        tone="danger"
        onSubmit={doReject}
      />
      <ReasonModal
        open={exceptionOpen}
        onClose={() => setExceptionOpen(false)}
        title="Record an exception"
        intro="This waives the milestone evidence and previous tranche checks for this one payment. It is flagged in the audit log and other administrators are told."
        summary={paySummary(tranche ? [['Tranche', `${trancheLabel(tranche)} (${tranche.status})`]] : [])}
        label="Why is an exception justified?"
        hint="Be specific. For example: a supplier will withdraw the order if the deposit is not paid today."
        minLength={25}
        confirmLabel="Record exception"
        tone="danger"
        onSubmit={doException}
      />
    </div>
  );
}
