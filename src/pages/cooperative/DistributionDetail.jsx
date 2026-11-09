import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Send, StickyNote, TriangleAlert } from 'lucide-react';
import { useApp, newId, simulate } from '../../context/AppContext.jsx';
import { PageHeader, Breadcrumb, Card, CardHeader, Banner, StatusPill, Button, LinkButton, EmptyState, Timeline, Modal, TextAreaField, ConfirmDialog, Chip, InfoList, Progress } from '../../components/ui/index.js';
import { VerifyGate, useVerified } from '../../components/coopc/Gate.jsx';
import { buildCalculation } from '../../components/coopc/distributionCalc.js';
import { TODAY, useCoop, investorDisplayName } from '../../components/coopc/helpers.js';
import { formatNaira, formatDate, formatDateTime, percent } from '../../utils/format.js';
import '../../styles/pages/coopc.css';

export default function DistributionDetail() {
  const { id } = useParams();
  const { data, user, update, notify, toast } = useApp();
  const { coop, packageIds, pkgById } = useCoop();
  const verified = useVerified();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteError, setNoteError] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const closeConfirm = useCallback(() => setConfirming(false), []);
  const closeNote = useCallback(() => { setNoteOpen(false); setNoteText(''); setNoteError(''); }, []);

  const dist = data.distributions.find((d) => d.id === id && packageIds.has(d.packageId));
  if (!dist) {
    return (
      <div className="page coopc-page">
        <Breadcrumb items={[{ label: 'Settlements', to: '/coop/settlements' }, { label: 'Distribution not found' }]} />
        <EmptyState title="We could not find this distribution" action={<LinkButton to="/coop/settlements?tab=distributions">Back to Settlements</LinkButton>}>
          It may belong to another cooperative, or the link may be out of date.
        </EmptyState>
      </div>
    );
  }

  const pkg = pkgById[dist.packageId];
  const investor = investorDisplayName(data, dist.investorId);
  const calc = buildCalculation(dist, pkg, data);
  const outstanding = Math.max(0, dist.amountDue - dist.amountPaid);
  const paidPct = percent(dist.amountPaid, dist.amountDue);
  const isPaid = dist.status === 'Confirmed';
  const submitted = !!dist.readyForReview;
  const notes = dist.notes || [];
  const audits = data.audit.filter((a) => a.entityType === 'Distribution' && a.entityId === dist.id);

  const review = [
    { title: 'Calculation prepared', meta: 'Built from sales, costs and the investor\'s confirmed contribution', state: 'done' },
  ];
  if (submitted) review.push({ title: 'Marked ready for review by the cooperative', meta: `${dist.readyForReviewBy || 'Cooperative'}, ${formatDate(dist.readyForReviewAt)}`, state: 'done' });
  if (dist.reviewedBy) review.push({ title: 'Reviewed by an admin', meta: dist.reviewedBy, state: 'done' });
  else review.push({ title: 'Waiting for an admin reviewer', meta: submitted ? 'Your submission is in the queue' : 'Not submitted for review yet', state: 'active' });
  if (isPaid) review.push({ title: 'Payment confirmed', meta: `Paid ${formatDate(dist.paidDate)}, reference ${dist.ref}`, state: 'done' });
  else if (dist.status === 'Overdue') review.push({ title: 'Payment overdue', meta: `Was due ${formatDate(dist.dueDate)}. An overdue date is recorded and is not treated as misconduct.`, state: 'bad' });
  else review.push({ title: 'Payment due', meta: formatDate(dist.dueDate) });

  const markReady = async () => {
    setSaving(true);
    await simulate(700);
    update('distributions', dist.id, { readyForReview: true, readyForReviewAt: TODAY, readyForReviewBy: user.name }, {
      action: 'Distribution marked ready for review', entityType: 'Distribution',
      summary: `${dist.type} of ${formatNaira(dist.amountDue)} for ${investor} submitted for admin review. No payment was made.`,
      reason: pkg?.name || '',
    });
    notify('admin', 'Distribution ready for review', `${coop?.name || 'A cooperative'} marked a ${formatNaira(dist.amountDue)} ${dist.type.toLowerCase()} for ${pkg?.name || 'a package'} ready for review.`, '/admin/distributions', 'distribution');
    setSaving(false);
    setConfirming(false);
    toast('Sent to the admin reviewer. Nothing has been paid.');
  };

  const saveNote = async () => {
    if (noteText.trim().length < 3) { setNoteError('Write a short note first.'); return; }
    setNoteSaving(true);
    await simulate(400);
    update('distributions', dist.id, (d) => ({ notes: [...(d.notes || []), { id: newId('nt'), at: TODAY, by: user.name, text: noteText.trim() }] }), {
      action: 'Distribution note added', entityType: 'Distribution', summary: noteText.trim().slice(0, 120), reason: `${investor}, ${dist.type}`,
    });
    setNoteSaving(false);
    closeNote();
    toast('Note added.');
  };

  return (
    <div className="page coopc-page">
      <Breadcrumb items={[{ label: 'Settlements', to: '/coop/settlements?tab=distributions' }, { label: `${investor}, ${dist.type}` }]} />
      <PageHeader
        title={dist.type}
        subtitle={`${investor} | ${pkg?.name || 'Package'} | Reference ${dist.ref}`}
        actions={(
          <>
            <Button variant="outline" onClick={() => setNoteOpen(true)}><StickyNote size={16} />Add a note</Button>
            {!isPaid && (
              <Button onClick={() => setConfirming(true)} disabled={!verified || submitted}><Send size={16} />{submitted ? 'Sent for review' : 'Mark ready for review'}</Button>
            )}
          </>
        )}
      />
      <div className="coopc-meta" style={{ marginTop: -8 }}>
        <StatusPill>{dist.status}</StatusPill>
        <StatusPill tone={dist.type === 'Principal repayment' ? 'blue' : 'purple'}>{dist.type}</StatusPill>
        <span className="small">Due {formatDate(dist.dueDate)}</span>
        {submitted && <Chip bg="var(--primary-50)" fg="var(--primary-700)" border="var(--primary-100)">Ready for review</Chip>}
      </div>

      <VerifyGate what="send distributions for review" />
      {dist.disputed > 0 && (
        <Banner tone="warn" title={`The investor has disputed ${formatNaira(dist.disputed)}`}>
          A dispute is handled by a CollabFarm admin and is recorded as a complaint. The disputed part is held until it is resolved. A dispute does not mean anyone acted wrongly. <Link to="/coop/complaints">Open complaints</Link>.
        </Banner>
      )}

      <div className="grid-main">
        <div className="stack-lg">
          <Card>
            <CardHeader
              title="How the amount due was worked out"
              subtitle="Each row shows what it means and where the figure comes from, so a reviewer can trace it."
              action={calc.illustrative ? <span className="chip nowrap" style={{ background: 'var(--gold-100)', color: 'var(--grey-900)', borderColor: 'var(--gold-500)' }}>Illustrative figures</span> : undefined}
            />
            {calc.illustrative && (
              <Banner tone="warn" className="mt-2">
                The pool figures in rows 1 to 3 use the PRD example because this package does not yet have confirmed sales and confirmed costs. They show the method, not a promise of returns. The real figures are attached before an admin approves payment.
              </Banner>
            )}
            <div className="coopc-calc-wrap mt-4">
              <table className="coopc-calc">
                <thead>
                  <tr><th>Step</th><th>What it means</th><th>Source</th><th style={{ textAlign: 'right' }}>Figure</th></tr>
                </thead>
                <tbody>
                  {calc.rows.map((r) => (
                    <tr key={r.step} className={r.total ? 'is-total' : undefined}>
                      <td className="step">{r.step}</td>
                      <td><strong>{r.label}</strong><span className="why">{r.why}</span></td>
                      <td className="small">{r.source}</td>
                      <td className="amt">{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {calc.check.ok ? (
              <Banner tone="success" className="mt-4">The worked figure matches the amount due on the record.</Banner>
            ) : (
              <Banner tone="info" className="mt-4">
                The worked figure differs from the record by {formatNaira(Math.abs(calc.check.difference))}.{' '}
                {calc.illustrative ? 'That is expected while pool figures are illustrative.' : 'The reviewer will ask for an explanation.'} An admin compares the final calculation sheet before any payment is approved.
              </Banner>
            )}
          </Card>

          <Card>
            <CardHeader title="Payments" subtitle="Money paid so far and what is still outstanding." />
            <Progress value={paidPct} label="Share of the amount due that has been paid" />
            <div className="mt-4">
              <div className="coopc-payline"><span>Amount due</span><strong>{formatNaira(dist.amountDue)}</strong></div>
              <div className="coopc-payline"><span>Amount paid</span><strong>{formatNaira(dist.amountPaid)}</strong></div>
              <div className="coopc-payline"><span>Outstanding</span><strong>{formatNaira(outstanding)}</strong></div>
              {dist.disputed > 0 && <div className="coopc-payline"><span>Disputed by the investor</span><strong className="danger-text">{formatNaira(dist.disputed)}</strong></div>}
              <div className="coopc-payline"><span>Payment reference</span><span className="coopc-mono">{dist.ref}</span></div>
              <div className="coopc-payline"><span>Date paid</span><span>{dist.paidDate ? formatDate(dist.paidDate) : 'Not paid yet'}</span></div>
              <div className="coopc-payline"><span>Due date</span><span>{formatDate(dist.dueDate)}</span></div>
            </div>
            <Banner tone="green" className="mt-4" title="Protection against paying twice">
              This distribution has one reference, {dist.ref}. The financial partner accepts one payment instruction per reference, and the amount paid can never be more than the amount due. {isPaid ? 'It is fully paid, so no further payment can be raised against it.' : `Only the outstanding ${formatNaira(outstanding)} can still be paid.`} Payments are made by the partner after admin approval, never by the cooperative.
            </Banner>
          </Card>
        </div>

        <div className="stack-lg">
          <Card>
            <CardHeader title="Summary" />
            <InfoList compact items={[
              ['Investor', investor],
              ['Package', <Link key="p" to={`/coop/funding/${dist.packageId}`}>{pkg?.name}</Link>],
              ['Confirmed contribution', formatNaira(dist.contribution)],
              ['Basis', dist.basis],
              ['Reviewed by', dist.reviewedBy || 'Not reviewed yet'],
            ]}
            />
          </Card>

          <Card>
            <CardHeader title="Review timeline" />
            <Timeline items={review} />
            {audits.length > 0 && (
              <div className="stack-sm" style={{ marginTop: 8 }}>
                <div className="caption muted">Recorded changes</div>
                {audits.map((a) => (<div key={a.id} className="small"><strong>{a.action}</strong><span className="cell-sub" style={{ display: 'block' }}>{a.actor}, {formatDateTime(a.at)}</span></div>))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title={`Notes (${notes.length})`} />
            {notes.length === 0 ? (
              <p className="small muted">No notes yet. Use "Add a note" to explain a figure to the reviewer.</p>
            ) : (
              <div className="stack-sm">
                {notes.map((n) => (<div key={n.id} className="coopc-note"><div className="caption muted">{n.by}, {formatDate(n.at)}</div><div>{n.text}</div></div>))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={closeConfirm}
        onConfirm={markReady}
        loading={saving}
        tone="green"
        title="Send this calculation for review?"
        message="This sends the calculation to an admin reviewer. It does not pay anyone. Payment is made by the financial partner after approval."
        summary={[
          ['Recipient', `${investor} (investor)`],
          ['Amount due', formatNaira(dist.amountDue)],
          ['Purpose', `${dist.type}, ${pkg?.name || ''}`],
          ['Calculation', calc.kind === 'principal' ? 'Scheduled principal, no profit involved' : calc.illustrative ? 'Uses illustrative pool figures' : 'Uses confirmed sales and costs'],
          ['Approval status', dist.reviewedBy ? `Previously reviewed by ${dist.reviewedBy}` : 'Not approved yet. Waiting for an admin reviewer'],
        ]}
        confirmLabel="Send for review"
      />

      <Modal
        open={noteOpen}
        onClose={closeNote}
        title="Add a note"
        white
        footer={(
          <>
            <Button variant="outline" onClick={closeNote}>Cancel</Button>
            <Button onClick={saveNote} loading={noteSaving}>Save note</Button>
          </>
        )}
      >
        <TextAreaField
          label="Note for the reviewer" required value={noteText} error={noteError} placeholder="For example: Costs include the replacement seed bought in July."
          hint="Notes are visible to CollabFarm reviewers and recorded in the audit history."
          onChange={(e) => { setNoteText(e.target.value); setNoteError(''); }}
        />
        <p className="caption muted mt-2"><TriangleAlert size={12} style={{ verticalAlign: '-1px' }} /> Do not write bank details or ID numbers in notes.</p>
      </Modal>
    </div>
  );
}
