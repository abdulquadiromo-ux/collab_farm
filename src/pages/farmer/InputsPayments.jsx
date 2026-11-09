import { useState } from 'react';
import { Package, Banknote, Hourglass, Boxes, PackageCheck, Flag, Hand, Landmark, BadgeCheck } from 'lucide-react';
import { Card, PageHeader, Banner, EmptyState, ConfirmDialog, Button, LinkButton } from '../../components/ui/index.js';
import { useApp, simulate, useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatNaira, formatDate, formatDateTime, formatNumber } from '../../utils/format.js';
import { sum } from '../../utils/rules.js';
import { useFarmerCtx, lastDigits, isoNow } from '../../components/farm/farmerData.js';
import { farmerGate, BigStat, StatusChip, ItemCard, Explain } from '../../components/farm/FarmUi.jsx';
import '../../styles/pages/farm.css';

export default function InputsPayments() {
  const loading = useSimulatedLoad(350);
  const ctx = useFarmerCtx();
  const gate = farmerGate(ctx, loading);
  if (gate) return gate;
  return <InputsPaymentsContent ctx={ctx} />;
}

const PAY_LABEL = { Disbursed: 'Paid', Pending: 'Waiting for approval', Reviewing: 'Waiting for approval', Rejected: 'Not approved' };
const PAY_TONE = { Disbursed: 'green', Pending: 'amber', Reviewing: 'amber', Rejected: 'red' };

function inputChip(i) {
  if (i.problemReported) return <StatusChip tone="red">Problem reported</StatusChip>;
  if (i.farmerConfirmed) return <StatusChip tone="green">You confirmed</StatusChip>;
  if (i.delivered) return <StatusChip tone="amber">Please confirm</StatusChip>;
  return <StatusChip tone="gray">On the way</StatusChip>;
}

function InputsPaymentsContent({ ctx }) {
  const { update, notify, toast, data } = useApp();
  const { inputs, payments, allocation, name, coop } = ctx;
  const [confirm, setConfirm] = useState(null); // { kind: 'input' | 'payment', rec }
  const [saving, setSaving] = useState(false);

  const inputsValue = sum(inputs, (i) => i.cost);
  const paid = sum(payments.filter((p) => p.status === 'Disbursed'), (p) => p.amount);
  const outstanding = allocation ? allocation.outstanding : 0;

  const issueLink = (params) => `/farmer/report-issue?${new URLSearchParams(params).toString()}`;

  const doConfirm = async () => {
    if (!confirm) return;
    setSaving(true);
    await simulate(500);
    const { kind, rec } = confirm;
    if (kind === 'input') {
      update(
        'inputRecords',
        rec.id,
        { delivered: true, farmerConfirmed: true, farmerConfirmedAt: isoNow(), confirmedBy: 'Farmer' },
        { action: 'Farmer confirmed input received', entityType: 'Input record', summary: `${name} confirmed receiving ${rec.item} (${rec.qty} ${rec.unit}).`, reason: 'Farmer confirmation of delivery' },
      );
      notify('cooperative', 'Farmer confirmed an input delivery', `${name} confirmed receiving ${rec.item}.`, '/coop/farming-progress', 'milestone');
      toast('Thank you. We recorded that you received it.');
    } else {
      // The farmer's confirmation is only recorded. Funds are confirmed later by reconciliation, never here.
      update(
        'disbursements',
        rec.id,
        { farmerConfirmed: true, farmerConfirmedAt: isoNow() },
        { action: 'Farmer confirmed payment received', entityType: 'Disbursement', summary: `${name} says they received ${formatNaira(rec.amount)} (${rec.ref}). Reconciliation is still required.`, reason: 'Farmer confirmation, not reconciliation' },
      );
      notify('cooperative', 'Farmer confirmed a payment', `${name} says they received ${formatNaira(rec.amount)} (${rec.ref}).`, '/coop/disbursements', 'payment');
      notify('admin', 'Farmer confirmed a payment', `${name} says they received ${formatNaira(rec.amount)} (${rec.ref}). Reconciliation still needed.`, `/admin/disbursements/${rec.id}`, 'payment');
      toast('Thank you. Your confirmation is recorded. The payment is still being checked.');
    }
    setSaving(false);
    setConfirm(null);
  };

  const approvalText = (p) => {
    const n = p.approvals?.length || 0;
    if (p.status === 'Disbursed') return n ? `Approved by ${n} ${n === 1 ? 'reviewer' : 'reviewers'}` : 'Approved';
    if (p.status === 'Rejected') return 'Not approved';
    return n ? `${n} approval recorded, more needed` : 'Waiting for approval';
  };

  return (
    <div className="page farm-page">
      <PageHeader title="Inputs and Payments" subtitle="What was delivered to you and what was paid to you." />

      <section className="farm-stat-grid" aria-label="Totals">
        <BigStat icon={<Boxes size={20} />} label="Value of my inputs" value={formatNaira(inputsValue)} explain="Seeds, fertiliser and tools recorded in your name." />
        <BigStat icon={<Banknote size={20} />} label="Payments received" value={formatNaira(paid)} explain="Money the financial partner says it paid to you." />
        <BigStat icon={<Hourglass size={20} />} label="Still to come" value={formatNaira(outstanding)} tone="gold" explain="Part of your approved support not yet given. It is not a debt." />
      </section>

      <Banner tone="warn" title="Only confirm what you really got">
        Your answer is saved in your name. If something is missing or wrong, use the problem button instead. Never pay anyone to receive your items or money.
      </Banner>

      <section className="stack" aria-labelledby="inputs-title">
        <h2 id="inputs-title" className="farm-section-title"><Package size={22} aria-hidden="true" />Inputs I received</h2>
        {inputs.length === 0 ? (
          <Card><EmptyState icon={<Package size={28} />} title="No inputs recorded yet">When seeds, fertiliser or tools are delivered to you, they show here.</EmptyState></Card>
        ) : (
          <ul className="farm-list">
            {inputs.map((i) => (
              <ItemCard
                key={i.id}
                icon={<Package size={22} />}
                title={i.item}
                meta={`${formatNumber(i.qty)} ${i.unit}. ${formatDate(i.date)}`}
                chip={inputChip(i)}
                tone={i.delivered && !i.farmerConfirmed ? 'attention' : undefined}
                actions={(
                  <>
                    {!i.farmerConfirmed && <Button className="farm-btn" onClick={() => setConfirm({ kind: 'input', rec: i })}><PackageCheck size={18} />I received this</Button>}
                    {!i.problemReported && <LinkButton to={issueLink({ category: 'Input delivery', input: i.id, about: `${i.item}, ${i.qty} ${i.unit}, recorded on ${formatDate(i.date)} from ${i.supplier}.` })} variant="outline" className="farm-btn"><Flag size={18} />Report a problem with this delivery</LinkButton>}
                  </>
                )}
              >
                <dl className="farm-facts">
                  <div><dt>From</dt><dd>{i.supplier}</dd></div>
                  <div><dt>Value</dt><dd>{formatNaira(i.cost)}</dd></div>
                  {i.farmerConfirmedAt && <div><dt>You confirmed</dt><dd>{formatDateTime(i.farmerConfirmedAt)}</dd></div>}
                </dl>
              </ItemCard>
            ))}
          </ul>
        )}
      </section>

      <section className="stack" aria-labelledby="pay-title">
        <h2 id="pay-title" className="farm-section-title"><Banknote size={22} aria-hidden="true" />Payments to me</h2>
        <Explain>These are labour or farm cost payments. Your cooperative and the financial partner pay you directly, never through other people.</Explain>
        {payments.length === 0 ? (
          <Card><EmptyState icon={<Banknote size={28} />} title="No payments yet">When a payment is approved and sent to you, it shows here.</EmptyState></Card>
        ) : (
          <ul className="farm-list">
            {payments.map((p) => {
              const digits = lastDigits(p.destination);
              return (
                <ItemCard
                  key={p.id}
                  icon={<Landmark size={22} />}
                  title={p.purpose}
                  meta={`${formatDate(p.date)}. Reference ${p.ref}`}
                  chip={<StatusChip tone={PAY_TONE[p.status] || 'gray'}>{PAY_LABEL[p.status] || p.status}</StatusChip>}
                  tone={p.status === 'Disbursed' && !p.farmerConfirmed ? 'attention' : undefined}
                  actions={(
                    <>
                      {p.status === 'Disbursed' && !p.farmerConfirmed && <Button className="farm-btn" onClick={() => setConfirm({ kind: 'payment', rec: p })}><BadgeCheck size={18} />I received this payment</Button>}
                      {p.status === 'Disbursed' && !p.problemReported && <LinkButton to={issueLink({ category: 'Payment', payment: p.id, about: `${formatNaira(p.amount)} for "${p.purpose}", reference ${p.ref}, dated ${formatDate(p.date)}.` })} variant="outline" className="farm-btn"><Flag size={18} />I did not get this money</LinkButton>}
                      {p.status === 'Rejected' && <LinkButton to={issueLink({ category: 'Payment', payment: p.id, about: `Payment of ${formatNaira(p.amount)} for "${p.purpose}", reference ${p.ref}, shown as not approved.` })} variant="outline" className="farm-btn"><Hand size={18} />Ask why</LinkButton>}
                    </>
                  )}
                >
                  <p className="farm-amount">{formatNaira(p.amount)}</p>
                  <dl className="farm-facts">
                    {digits && <div><dt>Paid to</dt><dd>Your account ending {digits}</dd></div>}
                    <div><dt>Approval</dt><dd>{approvalText(p)}</dd></div>
                    {p.packageId && <div><dt>Project</dt><dd>{data.packages.find((x) => x.id === p.packageId)?.name || 'Not listed'}</dd></div>}
                    {p.farmerConfirmedAt && <div><dt>You confirmed</dt><dd>{formatDateTime(p.farmerConfirmedAt)}</dd></div>}
                  </dl>
                  {p.problemReported ? <p className="small"><strong>You reported a problem with this payment.</strong> You can follow it under Report an Issue.</p> : null}
                  {p.status === 'Pending' || p.status === 'Reviewing' ? <p className="small muted">No money has been sent yet. We will tell you when it is.</p> : null}
                  {p.status === 'Rejected' ? <p className="small muted">This payment was not approved, so no money was sent. Your cooperative can tell you why.</p> : null}
                  {p.status === 'Disbursed' ? <p className="small muted">Paid by the financial partner. It is marked final only after the bank records are checked (reconciliation).</p> : null}
                </ItemCard>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => !saving && setConfirm(null)}
        onConfirm={doConfirm}
        loading={saving}
        tone="green"
        title={confirm?.kind === 'payment' ? 'Did this money reach you?' : 'Did you get this item?'}
        message={confirm?.kind === 'payment' ? 'Say yes only if the money is in your account.' : 'Say yes only if the item is with you.'}
        confirmLabel="Yes, I received it"
        cancelLabel="Not yet"
        summary={confirm?.kind === 'payment'
          ? [['Paid to', name], ['Amount', formatNaira(confirm.rec.amount)], ['Purpose', confirm.rec.purpose], ['Approval status', approvalText(confirm.rec)]]
          : confirm?.kind === 'input'
            ? [['Item', confirm.rec.item], ['Quantity', `${formatNumber(confirm.rec.qty)} ${confirm.rec.unit}`], ['From', confirm.rec.supplier], ['Value', formatNaira(confirm.rec.cost)]]
            : undefined}
        warning={confirm?.kind === 'payment'
          ? `Your answer is not the final check. CollabFarm still matches the payment against bank records (reconciliation). Your cooperative at ${coop?.name || 'your group'} is told.`
          : 'This is recorded in your name and your cooperative is told.'}
      />
    </div>
  );
}
