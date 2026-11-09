import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSearch, Flag, CheckCircle2 } from 'lucide-react';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { Modal, Button, ConfirmDialog, StatusPill, Banner, TextAreaField } from '../ui/index.js';
import { formatNaira } from '../../utils/format.js';
import { confirmReconciliation, reconEffects, findInvestmentFor, findSaleFor, pkgName, coopNameOfPkg, appendNote, nowIso } from './lib.js';
import { ReasonModal, SummaryList, At } from './ui.jsx';

// Detail dialog for one reconciliation record: both sides, the difference, and the three actions.
export default function ReconDetail({ id, onClose }) {
  const ctx = useApp();
  const { data, user, update, toast, notify } = ctx;
  const rec = data.reconciliation.find((r) => r.id === id);
  const [note, setNote] = useState('');
  const [noteErr, setNoteErr] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [busy, setBusy] = useState('');
  useEffect(() => { setNote(''); setNoteErr(''); }, [id]);
  if (!rec) return null;

  const diff = rec.internal - rec.provider;
  const hasPartner = rec.provider > 0 && !!rec.providerRef;
  const done = rec.status === 'Confirmed';
  const failed = rec.status === 'Failed';
  const needsNote = diff !== 0 || !!rec.exception;
  const canConfirm = !done && !failed && hasPartner;
  const pkg = pkgName(data, rec.packageId);

  const linked = [];
  if (rec.type === 'Investor receipt') {
    const { tx, inv } = findInvestmentFor(data, rec);
    if (tx) linked.push(['Transaction', `${tx.ref} (${tx.status})`]);
    if (inv) linked.push(['Investment', `${inv.ref} (${inv.status}), committed ${formatNaira(inv.committed)}`]);
  } else if (rec.type === 'Sale receipt') {
    const sale = findSaleFor(data, rec);
    if (sale) linked.push(['Sale', `${sale.ref}, ${sale.buyer} (${sale.paymentStatus})`]);
  } else {
    const dis = data.disbursements.find((x) => x.ref === rec.ref);
    const ex = data.expenses.find((x) => x.ref === rec.ref);
    if (dis) linked.push(['Payment', <Link key="d" to={`/admin/disbursements/${dis.id}`}>{dis.recipientName}, {formatNaira(dis.amount)}</Link>]);
    if (ex) linked.push(['Expense', `${ex.description} (${ex.status})`]);
  }

  const tryConfirm = () => {
    if (needsNote && note.trim().length < 10) {
      setNoteErr(diff !== 0 ? 'The amounts differ. Write at least 10 characters explaining why you accept the difference.' : 'This item has an exception on it. Write at least 10 characters explaining why you are confirming it.');
      return;
    }
    setNoteErr('');
    setConfirmOpen(true);
  };

  const doConfirm = async () => {
    setBusy('confirm');
    await simulate(700);
    confirmReconciliation(ctx, rec, { note: note.trim(), actor: user.name });
    setBusy('');
    setConfirmOpen(false);
    toast(diff !== 0 ? 'Confirmed with the difference recorded as a correcting entry.' : 'Reconciliation confirmed. Linked records were updated.');
  };

  const doStatement = async () => {
    setBusy('statement');
    await simulate(900);
    update('reconciliation', rec.id, { statementRequestedAt: nowIso(), note: appendNote(rec.note, 'Partner statement requested (simulated).', user.name) }, {
      action: 'Partner statement requested (simulated)', entityType: 'Reconciliation', summary: `${rec.ref} ${rec.type}, ${formatNaira(rec.internal)}`, reason: 'Needed to settle the difference',
    });
    setBusy('');
    toast('Statement request recorded. This is a simulation, so no message was sent.', 'info');
  };

  const doException = async (reason) => {
    await simulate(500);
    update('reconciliation', rec.id, { exception: { reason, by: user.name, at: nowIso() }, note: appendNote(rec.note, `Marked as exception: ${reason}`, user.name) }, {
      action: 'Reconciliation marked as exception', entityType: 'Reconciliation', summary: `${rec.ref} ${rec.type}, ${formatNaira(rec.internal)} against ${formatNaira(rec.provider)}`, reason,
    });
    notify('admin', 'Reconciliation exception recorded', `${rec.ref} for ${pkg} was marked as an exception by ${user.name}.`, '/admin/reconciliation', 'risk');
    setExceptionOpen(false);
    toast('Exception recorded. The item stays open until it is resolved.');
  };

  const summary = [
    ['Reference', rec.ref], ['Type', rec.type], ['Project', pkg],
    ['Our records', formatNaira(rec.internal)], ['Partner reports', formatNaira(rec.provider)],
    ['Difference', diff === 0 ? 'None' : formatNaira(Math.abs(diff))],
  ];

  return (
    <>
      <Modal open onClose={onClose} title={`Reconcile ${rec.ref}`} wide white>
        <div className="stack">
          <div className="admb-pillrow">
            <StatusPill>{rec.status}</StatusPill>
            {rec.exception && <span className="admb-flag admb-flag--red"><Flag size={12} /> Exception</span>}
            <span className="small muted">{rec.type} for {pkg}, {coopNameOfPkg(data, rec.packageId)}</span>
          </div>

          {done && <Banner tone="success" title="Confirmed">Confirmed by {rec.reconciledBy} on <At value={rec.reconciledAt} />. {rec.correction ? `A difference of ${formatNaira(Math.abs(rec.correction.amount))} was kept as a correcting entry. The original record is retained.` : 'Both sides agree.'}</Banner>}
          {failed && <Banner tone="danger" title="The payment failed at the financial partner">A failed payment cannot be confirmed. Ask the partner for a statement. Retrying uses the same idempotency key, so no duplicate payment is created.</Banner>}
          {!done && !failed && !hasPartner && <Banner tone="warn" title="Nothing confirmed by the financial partner yet">A payment initiation is not proof of receipt, and a commitment is not received money. This item cannot be confirmed until the partner reports the amount with a reference.</Banner>}
          {!done && !failed && hasPartner && diff !== 0 && <Banner tone="warn" title="The two sides do not match">You can still confirm, but you must write why you accept the difference. It is kept as a correcting entry. Nothing is overwritten.</Banner>}

          <div className="admb-sides">
            <div className="admb-side">
              <span className="admb-side__label">Our records say</span>
              <span className="admb-big admb-mono">{formatNaira(rec.internal)}</span>
              <span className="small muted">What the platform expected for {rec.type.toLowerCase()}.</span>
            </div>
            <div className="admb-side admb-side--partner">
              <span className="admb-side__label">The financial partner reports</span>
              <span className="admb-big admb-mono">{hasPartner || rec.provider > 0 ? formatNaira(rec.provider) : 'Nothing yet'}</span>
              <span className="small muted">{rec.providerRef ? `Partner reference ${rec.providerRef}` : 'No partner reference'}</span>
            </div>
          </div>

          <div className={`admb-diffbar ${diff === 0 && hasPartner ? 'admb-diffbar--ok' : !hasPartner ? 'admb-diffbar--wait' : 'admb-diffbar--bad'}`} role="status">
            <strong>{diff === 0 && hasPartner ? 'No difference' : !hasPartner ? 'Waiting for the partner report' : `Difference ${formatNaira(Math.abs(diff))}`}</strong>
            <span>{diff === 0 && hasPartner ? 'Our records and the partner agree.' : diff > 0 ? 'The partner reports less than our records.' : diff < 0 ? 'The partner reports more than our records.' : ''}</span>
          </div>

          {linked.length > 0 && (
            <div>
              <h3 className="admb-card-title">Linked records</h3>
              <SummaryList summary={linked} />
            </div>
          )}

          {rec.note && <div className="admb-hint"><strong>Notes on record:</strong> {rec.note}</div>}
          {rec.exception && <div className="admb-hint admb-hint--bad"><strong>Exception:</strong> {rec.exception.reason} ({rec.exception.by}, <At value={rec.exception.at} />)</div>}
          {rec.statementRequestedAt && <div className="admb-hint">Partner statement requested on <At value={rec.statementRequestedAt} /> (simulated).</div>}

          {!done && (
            <>
              {canConfirm && (
                <div>
                  <h3 className="admb-card-title">If you confirm</h3>
                  <ul className="admb-effects">{reconEffects(data, rec).map((e) => <li key={e}>{e}</li>)}</ul>
                </div>
              )}
              <TextAreaField
                label="Reviewer note"
                required={needsNote}
                optional={!needsNote}
                hint={needsNote ? 'Required because the amounts differ or an exception is on record.' : 'Optional when both sides match.'}
                value={note}
                error={noteErr}
                onChange={(e) => { setNote(e.target.value); if (noteErr) setNoteErr(''); }}
              />
              <div className="row-wrap">
                <Button onClick={tryConfirm} disabled={!canConfirm}><CheckCircle2 size={18} />{diff !== 0 ? 'Confirm with recorded difference' : 'Confirm match'}</Button>
                <Button variant="outline" onClick={() => setExceptionOpen(true)}><Flag size={18} />Mark exception</Button>
                <Button variant="outline" onClick={doStatement} loading={busy === 'statement'}><FileSearch size={18} />Request partner statement</Button>
              </div>
              {!canConfirm && !failed && <p className="small muted">Confirm match unlocks when the partner reports an amount with a reference. Use Import partner statement on the list page to simulate that.</p>}
            </>
          )}
          {done && (
            <div className="row-wrap">
              <Button variant="outline" onClick={doStatement} loading={busy === 'statement'}><FileSearch size={18} />Request partner statement</Button>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doConfirm}
        loading={busy === 'confirm'}
        tone="green"
        title={diff !== 0 ? 'Confirm with a recorded difference?' : 'Confirm this match?'}
        message="This marks the item as reconciled and updates the linked records. It cannot be undone, but a later correction can be added as a new entry."
        summary={[...summary, ['Approval status', `Confirmed by ${user.name}`], ...(note.trim() ? [['Note', note.trim()]] : [])]}
        confirmLabel="Confirm"
      />
      <ReasonModal
        open={exceptionOpen}
        onClose={() => setExceptionOpen(false)}
        title="Mark as exception"
        intro="An exception keeps the item open and flags it for follow up. It does not change any amount or status of the linked records."
        summary={summary}
        label="Reason for the exception"
        placeholder="For example: partner statement shows a fee we have not agreed."
        confirmLabel="Record exception"
        onSubmit={doException}
      />
    </>
  );
}
