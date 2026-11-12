import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal, Button, MoneyField, TextAreaField, Banner, InfoList, StatusPill } from '../ui/index.js';
import { simulate } from '../../context/AppContext.jsx';
import { formatNaira, formatDate } from '../../utils/format.js';

/* Request a budget change on an approved package. Creates an application of type "Budget change". */
export function BudgetChangeModal({ open, onClose, pkg, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setAmount(pkg.amount); setReason(''); setErrors({}); } }, [open, pkg.amount]);

  const submit = async () => {
    const e = {};
    const n = Number(amount);
    if (!n || n <= 0) e.amount = 'Enter the new package amount.';
    else if (n === pkg.amount) e.amount = 'The new amount is the same as the current amount. Enter a different amount.';
    else if (n < (pkg.raised || 0)) e.amount = `The new amount cannot be lower than the money already confirmed (${formatNaira(pkg.raised)}).`;
    if (reason.trim().length < 15) e.reason = 'Explain the change in at least 15 characters so reviewers can decide.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    await simulate(600);
    onSubmit(n, reason.trim());
    setBusy(false);
    onClose();
  };

  const diff = (Number(amount) || 0) - pkg.amount;
  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title="Request budget change"
      white
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} loading={busy}>Send request</Button>
        </>
      )}
    >
      <div className="stack">
        <Banner tone="info" title="How this works">
          The approved budget does not change until two different CollabFarm reviewers approve your request. Until then, nothing in the package is altered.
        </Banner>
        <InfoList compact items={[['Package', pkg.name], ['Current approved amount', formatNaira(pkg.amount)], ['Confirmed received so far', formatNaira(pkg.raised)]]} />
        <MoneyField label="New package amount" required value={amount} onChange={(v) => { setAmount(v); setErrors((x) => ({ ...x, amount: undefined })); }} error={errors.amount}
          hint={diff ? `${diff > 0 ? 'Increase' : 'Decrease'} of ${formatNaira(Math.abs(diff))}` : undefined} />
        <TextAreaField label="Reason for the change" required value={reason} placeholder="For example, the supplier price for fertiliser went up and the quotation is attached."
          onChange={(e) => { setReason(e.target.value); setErrors((x) => ({ ...x, reason: undefined })); }} error={errors.reason} />
      </div>
    </Modal>
  );
}

/* Withdraw a submitted request before review starts. The package returns to Draft. */
export function WithdrawModal({ open, onClose, pkg, onConfirm }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setReason(''); setError(''); } }, [open]);
  const submit = async () => {
    if (reason.trim().length < 10) { setError('Tell us why you are withdrawing in at least 10 characters.'); return; }
    setBusy(true);
    await simulate(500);
    onConfirm(reason.trim());
    setBusy(false);
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title="Withdraw funding request"
      white
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Keep submitted</Button>
          <Button variant="danger" onClick={submit} loading={busy}>Withdraw request</Button>
        </>
      )}
    >
      <div className="stack">
        <p className="small">"{pkg.name}" will go back to Draft. You can edit it and submit it again later. Your reason is recorded in the audit history.</p>
        <TextAreaField label="Reason for withdrawing" required value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }} error={error} placeholder="For example, we need to replace a supplier quotation." />
      </div>
    </Modal>
  );
}

/* Investment detail: package tranches with the next unreleased tranche highlighted. */
export function InvestmentModal({ open, onClose, row, loading = false, error = '' }) {
  if (!row) return null;
  const tranches = Array.isArray(row.tranches) ? row.tranches : [];
  return (
    <Modal open={open} onClose={onClose} title="Investment details" wide white footer={(
      <>
        <Button variant="outline" onClick={onClose}>Close</Button>
        {row.packageId && <Link className="btn btn--primary" to={`/coop/funding/${row.packageId}`} onClick={onClose}>View package</Link>}
      </>
    )}>
      <div className="stack">
        {loading && <div className="muted">Loading investment details…</div>}
        {error && <Banner tone="danger" title="Investment details unavailable">{error}</Banner>}
        {!loading && !error && <>
          <InfoList compact items={[
            ['Reference', row.transaction_reference || row.reference || '—'],
            ['Investor', row.investor_name || row.investorName || 'Investor'],
            ['Investor ID', row.investor_id_code || row.investorIdCode || '—'],
            ['Package', row.package_title || row.packageName || 'Package'],
            ['Category', row.package_category || row.packageCategory || '—'],
            ['Amount invested', formatNaira(row.amount_invested ?? row.amount)],
            ['Payment method', row.payment_method || '—'],
            ['Date invested', row.date_invested || row.dateInvested ? formatDate(row.date_invested || row.dateInvested) : '—'],
            ['Investment status', <StatusPill key="status">{row.status || '—'}</StatusPill>],
            ['Settlement status', row.settlement_status || '—'],
            ['Expected settlement date', row.expected_settlement_date || row.expectedSettlementDate ? formatDate(row.expected_settlement_date || row.expectedSettlementDate) : '—'],
            ['Expected settlement amount', formatNaira(row.expected_settlement_amount ?? row.expectedSettlementAmount)],
            ['Farming cycle', row.farming_cycle || '—'],
            ['Farmers supported', row.farmers_supported ?? '—'],
            ['Farming progress', row.farming_progress != null ? `${row.farming_progress}%` : '—'],
            ['Package total amount', formatNaira(row.package_total_amount)],
            ['Total released', formatNaira(row.total_released)],
            ['Release progress', row.release_percentage != null ? `${row.release_percentage}%` : '—'],
            ['Current stage', row.current_stage || '—'],
          ]} />
          {tranches.length > 0 && <section className="stack-sm"><h3 className="strong">Tranches</h3><div className="coopb-six" aria-label="Investment tranches">
            {tranches.map((tranche, index) => <div key={tranche.id || tranche.number || index} className="coopb-six__row">
              <span className="coopb-six__no">{tranche.number ?? index + 1}</span>
              <div><div className="strong small">{tranche.name || tranche.title || `Tranche ${index + 1}`}</div><div className="caption muted">{tranche.purpose || tranche.description || ''}</div><div className="caption muted">{tranche.status || '—'}</div></div>
              <div className="coopb-six__val">{formatNaira(tranche.amount)}</div>
            </div>)}
          </div></section>}
          <p className="caption muted">Investor contact details are not shown to the cooperative.</p>
        </>}
      </div>
    </Modal>
  );
}
