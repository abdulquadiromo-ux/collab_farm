import { TextField, MoneyField, Toggle, Banner } from '../ui/index.js';
import { formatNaira } from '../../utils/format.js';
import { TODAY, fmtQty } from './helpers.js';

export const emptySale = () => ({
  buyer: '', qty: '', unitPrice: '', date: TODAY, ref: `SALE-${Math.floor(70000 + Math.random() * 29999)}`,
  deductions: '', received: false, amountReceived: '',
});

export const grossOf = (v) => (Number(v.qty) || 0) * (Number(v.unitPrice) || 0);
export const netOf = (v) => Math.max(0, grossOf(v) - (Number(v.deductions) || 0));

// maxQty is what is left to sell from the harvest. Sold quantity can never exceed what was harvested.
export function validateSale(v, { maxQty, unit, harvestDate }) {
  const e = {};
  const qty = Number(v.qty) || 0;
  const gross = grossOf(v);
  const ded = Number(v.deductions) || 0;
  if (!v.buyer.trim()) e.buyer = 'Enter the name of the buyer.';
  if (!qty) e.qty = 'Enter how much was sold.';
  else if (qty < 0) e.qty = 'Quantity cannot be negative.';
  else if (qty > maxQty) e.qty = `Only ${fmtQty(maxQty, unit)} of this harvest is left to sell. Lower the quantity.`;
  if (!Number(v.unitPrice)) e.unitPrice = 'Enter the price for one unit.';
  if (!v.date) e.date = 'Choose the sale date.';
  else if (v.date > TODAY) e.date = 'The sale date cannot be in the future.';
  else if (harvestDate && v.date < harvestDate) e.date = 'The sale date cannot be before the harvest date.';
  if (!v.ref.trim()) e.ref = 'Enter the sale reference or receipt number.';
  if (ded > gross && gross > 0) e.deductions = 'Deductions cannot be more than the gross value.';
  if (v.received) {
    const got = Number(v.amountReceived) || 0;
    if (!got) e.amountReceived = 'Enter how much the buyer has paid so far.';
    else if (got > netOf(v)) e.amountReceived = `The buyer cannot have paid more than the net value (${formatNaira(netOf(v))}).`;
  }
  return e;
}

// A cooperative can never mark a sale Confirmed. Money counts as received only after the partner confirms it and an admin reconciles it.
export function buildSale(v, { id, packageId, harvestId, unit, recordedBy }) {
  const gross = grossOf(v);
  const ded = Number(v.deductions) || 0;
  const got = v.received ? Number(v.amountReceived) || 0 : 0;
  return {
    id, packageId, harvestId, buyer: v.buyer.trim(), qty: Number(v.qty), unit, unitPrice: Number(v.unitPrice), gross, date: v.date, ref: v.ref.trim(),
    paymentStatus: v.received ? 'Under Reconciliation' : 'Pending', deductions: ded, outstanding: Math.max(0, gross - ded - got),
    amountReportedReceived: got, recordedBy,
  };
}

export default function SaleFields({ values, errors, onChange, maxQty, unit }) {
  const gross = grossOf(values);
  const net = netOf(values);
  return (
    <div className="form-grid">
      <TextField label="Buyer" required className="full" value={values.buyer} error={errors.buyer} placeholder="Name of the buyer or company" onChange={(e) => onChange({ buyer: e.target.value })} />
      <TextField
        label={`Quantity sold${unit ? ` (${unit})` : ''}`} required type="number" min="0" step="any" inputMode="decimal" value={values.qty} error={errors.qty}
        hint={`Up to ${fmtQty(maxQty, unit)} is left to sell.`} onChange={(e) => onChange({ qty: e.target.value })}
      />
      <MoneyField label={`Unit price${unit ? ` (per ${unit})` : ''}`} required value={values.unitPrice} error={errors.unitPrice} onChange={(v) => onChange({ unitPrice: v })} />
      <div className="full coopc-gross" aria-live="polite">
        <span>Gross value (quantity x unit price)</span>
        <strong>{formatNaira(gross)}</strong>
      </div>
      <TextField label="Sale date" required type="date" max={TODAY} value={values.date} error={errors.date} onChange={(e) => onChange({ date: e.target.value })} />
      <TextField label="Sale reference" required value={values.ref} error={errors.ref} hint="Receipt or invoice number. Edit it if the buyer issued one." onChange={(e) => onChange({ ref: e.target.value })} />
      <MoneyField
        label="Deductions" optional value={values.deductions} error={errors.deductions}
        hint="Costs taken from the sale, such as transport or handling. Net value is gross less deductions." onChange={(v) => onChange({ deductions: v })}
      />
      <div className="coopc-gross">
        <span>Net value after deductions</span>
        <strong>{formatNaira(net)}</strong>
      </div>
      <div className="full coopc-toggle-row">
        <div>
          <div className="strong small">The buyer has paid</div>
          <div className="caption muted">Turn this on if you were told payment arrived. It will show as Under Reconciliation. It is never Confirmed here, because the financial partner must confirm the money and an admin must reconcile it.</div>
        </div>
        <Toggle checked={values.received} onChange={(c) => onChange({ received: c, amountReceived: c && !values.amountReceived ? net || '' : values.amountReceived })} label="The buyer has paid" />
      </div>
      {values.received && (
        <MoneyField
          className="full" label="Amount the buyer has paid so far" required value={values.amountReceived} error={errors.amountReceived}
          hint={`Net value is ${formatNaira(net)}. Anything not yet paid stays as the buyer's outstanding balance.`} onChange={(v) => onChange({ amountReceived: v })}
        />
      )}
      <div className="full">
        <Banner tone="info">A recorded sale is not money received. It becomes received money only after it is confirmed by the financial partner and reconciled by a CollabFarm admin.</Banner>
      </div>
    </div>
  );
}
