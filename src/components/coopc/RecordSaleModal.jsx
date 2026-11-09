import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, newId, simulate } from '../../context/AppContext.jsx';
import { Modal, Button, ConfirmDialog, SelectField, EmptyState } from '../ui/index.js';
import SaleFields, { emptySale, validateSale, buildSale, grossOf } from './SaleFields.jsx';
import { useCoop, fmtQty } from './helpers.js';
import { formatNaira } from '../../utils/format.js';

// Record a sale from an existing harvest. Mount it only while open so its form state resets each time.
export default function RecordSaleModal({ onClose, harvestId = '' }) {
  const { data, user, add, update, notify, toast } = useApp();
  const { coop, packageIds, pkgById } = useCoop();
  const [hid, setHid] = useState(harvestId);
  const [values, setValues] = useState(emptySale);
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const options = data.harvests.filter((h) => packageIds.has(h.packageId) && h.actualQty > 0 && h.remainingQty > 0 && h.status !== 'Rejected');
  const harvest = options.find((h) => h.id === hid) || null;
  const pkg = harvest ? pkgById[harvest.packageId] : null;

  const change = (patch) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => { delete n[k]; }); return n; });
  };

  const review = () => {
    const e = harvest ? validateSale(values, { maxQty: harvest.remainingQty, unit: harvest.unit, harvestDate: harvest.date }) : { harvest: 'Choose the harvest this sale comes from.' };
    setErrors(e);
    if (Object.keys(e).length === 0) setConfirming(true);
  };

  const submit = async () => {
    setSaving(true);
    await simulate(700);
    const saleId = newId('sl');
    const sale = buildSale(values, { id: saleId, packageId: harvest.packageId, harvestId: harvest.id, unit: harvest.unit, recordedBy: user.name });
    add('sales', sale, {
      action: 'Sale recorded', entityType: 'Sale',
      summary: `${fmtQty(sale.qty, sale.unit)} of ${harvest.crop} to ${sale.buyer}, gross ${formatNaira(sale.gross)}. Payment status ${sale.paymentStatus}, not confirmed.`,
      reason: `${pkg?.name || ''} harvest ${harvest.id}`.trim(),
    });
    const sold = harvest.soldQty + sale.qty;
    update('harvests', harvest.id, { soldQty: sold, remainingQty: Math.max(0, harvest.actualQty - sold) }, {
      action: 'Harvest sold quantity updated', entityType: 'Harvest', summary: `Sold ${fmtQty(sold, harvest.unit)} of ${fmtQty(harvest.actualQty, harvest.unit)}`, reason: `Sale ${sale.ref}`,
    });
    notify('admin', 'Sale recorded, receipt to reconcile', `${coop?.name || 'A cooperative'} recorded a ${formatNaira(sale.gross)} sale of ${harvest.crop} to ${sale.buyer}. It is not received money until reconciled.`, '/admin/reconciliation', 'payment');
    setSaving(false);
    setConfirming(false);
    toast(`Sale recorded as ${sale.paymentStatus}. It is not counted as received money yet.`);
    onClose();
  };

  return (
    <>
      <Modal
        open={!confirming}
        onClose={onClose}
        title="Record a sale"
        wide
        white
        footer={options.length > 0 ? (
          <>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={review}>Review sale</Button>
          </>
        ) : (<Button variant="outline" onClick={onClose}>Close</Button>)}
      >
        {options.length === 0 ? (
          <EmptyState title="No harvest has produce left to sell">
            A sale must come from a recorded harvest. <Link to="/coop/settlements/harvest/new" onClick={onClose}>Record a harvest first</Link>.
          </EmptyState>
        ) : (
          <div className="coopc-stack">
            <SelectField
              label="Harvest" required placeholder="Select a harvest" value={hid} error={errors.harvest}
              options={options.map((h) => ({ value: h.id, label: `${h.crop}, ${pkgById[h.packageId]?.name || ''} (${fmtQty(h.remainingQty, h.unit)} left)` }))}
              onChange={(e) => { setHid(e.target.value); setErrors({}); }}
            />
            {harvest && (
              <SaleFields values={values} errors={errors} onChange={change} maxQty={harvest.remainingQty} unit={harvest.unit} />
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={submit}
        loading={saving}
        tone="green"
        title="Record this sale?"
        message="This records a sale. It does not confirm that any money has been received."
        summary={harvest ? [
          ['Buyer', values.buyer.trim()],
          ['Sold', `${fmtQty(Number(values.qty), harvest.unit)} of ${harvest.crop}`],
          ['Gross value', formatNaira(grossOf(values))],
          ['Payment status', values.received ? 'Under Reconciliation (not confirmed)' : 'Pending (no payment reported)'],
          ['Approval status', 'Awaiting admin reconciliation'],
        ] : undefined}
        confirmLabel="Record sale"
      />
    </>
  );
}
