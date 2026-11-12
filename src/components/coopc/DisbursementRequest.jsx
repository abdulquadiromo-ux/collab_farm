import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, TriangleAlert } from 'lucide-react';
import { useApp, newId, simulate } from '../../context/AppContext.jsx';
import { Modal, Button, ConfirmDialog, Banner, SelectField, TextField, MoneyField, FileDrop, InfoList } from '../ui/index.js';
import { formatNaira, makeRef } from '../../utils/format.js';
import { canReleaseTranche, needsSecondApprover } from '../../utils/rules.js';
import { TODAY, useCoop, tranchesOf, trancheShort, sumBy } from './helpers.js';

const TRANCHE_OK = ['Approved', 'Released'];
const DISBURSE_PACKAGE_OK = ['Active', 'Ready for Disbursement'];

// Seeded farmer payment rows (dis-1 to dis-11) copy placeholder tranche links from the design mock-up, so they are
// left out of the tranche budget sums. Rows raised through this form carry source: 'cooperative-request'.
const linkIsReliable = (d) => d.recipientType !== 'Farmer' || d.source === 'cooperative-request';

export function trancheUsage(data, tranche) {
  const used = sumBy(
    data.disbursements.filter((d) => d.trancheId === tranche.id && d.packageId === tranche.packageId && d.status !== 'Rejected' && linkIsReliable(d)),
    (d) => d.amount,
  );
  return { used, remaining: Math.max(0, tranche.amount - used) };
}

function trancheBlockText(tranche, check) {
  const n = tranche.number;
  if (tranche.status === 'Locked') {
    const parts = [];
    if (!check.prevOk) parts.push(`tranche ${n - 1} has not been released yet`);
    if (!check.evidenceOk) parts.push('the milestone evidence for this tranche is not approved yet');
    return `Tranche ${n} is Locked${parts.length ? `: ${parts.join(' and ')}` : ''}. A tranche opens only after the one before it is released and its milestone evidence is approved.`;
  }
  if (tranche.status === 'Pending Evidence') return `Tranche ${n} is waiting for milestone evidence. Upload it on the Farming Progress page, then a reviewer can approve it.`;
  if (tranche.status === 'Under Review') return `A reviewer is still checking the evidence for tranche ${n}. You can request a payment once it is Approved or Released.`;
  if (tranche.status === 'Rejected') return `The evidence for tranche ${n} was returned. Fix it on the Farming Progress page and resubmit.`;
  return `Tranche ${n} is ${tranche.status}. Only Approved or Released tranches can be paid from.`;
}

const emptyForm = { packageId: '', trancheId: '', recipientType: 'Farmer', recipientId: '', purpose: '', budgetItem: '', amount: '', files: [] };

export default function DisbursementRequest({ onClose, defaultPackageId = '' }) {
  const { data, user, add, notify, toast } = useApp();
  const { coop, packages } = useCoop();
  const [form, setForm] = useState({ ...emptyForm, packageId: defaultPackageId });
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(patch).forEach((k) => { delete next[k]; });
      return next;
    });
  };

  const selectable = packages.filter((p) => data.tranches.some((t) => t.packageId === p.id));
  const pkg = selectable.find((p) => p.id === form.packageId) || null;
  const tranches = pkg ? tranchesOf(data, pkg.id) : [];
  const tranche = tranches.find((t) => t.id === form.trancheId) || null;
  const usage = tranche ? trancheUsage(data, tranche) : null;
  const check = tranche ? canReleaseTranche(tranche, data.tranches, data.milestones) : null;
  const limits = data.platformSettings?.approvalLimits;

  const farmers = data.farmers.filter((f) => f.coopId === coop?.id && f.status !== 'Removed');
  const recipientOptions = useMemo(() => {
    if (form.recipientType === 'Farmer') {
      return farmers.map((f) => ({ value: f.id, label: `${f.name} (${f.id})${f.identityStatus === 'Verified' ? '' : ', identity not verified'}` }));
    }
    if (form.recipientType === 'Supplier') {
      return data.suppliers.map((s) => ({ value: s.id, label: `${s.name} (${s.verification})` }));
    }
    return coop ? [{ value: coop.id, label: coop.name }] : [];
  }, [form.recipientType, data.farmers, data.suppliers, coop]);

  const recipient = useMemo(() => {
    if (!form.recipientId) return null;
    if (form.recipientType === 'Farmer') {
      const f = data.farmers.find((x) => x.id === form.recipientId);
      return f ? { id: f.id, name: f.name, record: f } : null;
    }
    if (form.recipientType === 'Supplier') {
      const s = data.suppliers.find((x) => x.id === form.recipientId);
      return s ? { id: s.id, name: s.name, record: s } : null;
    }
    return coop ? { id: coop.id, name: coop.name, record: coop } : null;
  }, [form.recipientId, form.recipientType, data.farmers, data.suppliers, coop]);

  // Checks that block a request. They are shown as soon as the cause is selected, with a plain explanation.
  const issues = [];
  if (coop && coop.status !== 'Verified') {
    issues.push({ key: 'coop', text: 'Your cooperative is not verified yet, so it cannot request disbursements.', to: '/onboarding/cooperative', linkLabel: 'Review profile' });
  }
  if (pkg && !DISBURSE_PACKAGE_OK.includes(pkg.status)) {
    issues.push({ key: 'pkg', text: `${pkg.name} is ${pkg.status}. Disbursements open only while a package is Active.` });
  }
  if (pkg) {
    const agreementB = data.contracts.find((c) => c.type === 'B' && c.packageId === pkg.id && c.partyId === coop?.id);
    if (!agreementB || agreementB.status !== 'Signed') {
      issues.push({ key: 'agB', text: `The Cooperative Funding and Accountability Agreement (Agreement B) for ${pkg.name} is ${agreementB ? agreementB.status.toLowerCase() : 'missing'}. Sign it before requesting a payment.`, to: '/coop/contracts', linkLabel: 'Open contracts' });
    }
  }
  if (tranche && !TRANCHE_OK.includes(tranche.status)) {
    issues.push({ key: 'tranche', text: trancheBlockText(tranche, check), to: `/coop/farming-progress?package=${pkg.id}`, linkLabel: 'Open Farming Progress' });
  }
  if (recipient && form.recipientType === 'Farmer') {
    const f = recipient.record;
    if (f.identityStatus !== 'Verified') {
      issues.push({ key: 'farmerId', text: `${f.name}'s identity is ${String(f.identityStatus || 'not checked').toLowerCase()}. A farmer can be paid only after identity is verified.`, to: `/coop/farmers/${f.id}`, linkLabel: 'Open farmer record' });
    }
    if (pkg) {
      const agreementC = data.contracts.find((c) => c.type === 'C' && c.partyId === f.id && c.packageId === pkg.id);
      const signed = agreementC ? agreementC.status === 'Signed' : f.agreementStatus === 'Signed';
      if (!signed) {
        issues.push({ key: 'agC', text: `${f.name} has not signed the Farmer Participation Agreement (Agreement C) for this package.`, to: '/coop/contracts', linkLabel: 'Open contracts' });
      }
    }
  }
  if (recipient && form.recipientType === 'Supplier' && recipient.record.verification !== 'Verified') {
    issues.push({ key: 'supplier', text: `${recipient.name} is ${recipient.record.verification.toLowerCase()}. A supplier must be verified before it can be paid.` });
  }

  const amount = Number(form.amount) || 0;
  const budgetItems = pkg?.budget || [];
  const selectedItem = budgetItems.find((b) => b.id === form.budgetItem);

  const validate = () => {
    const e = {};
    if (!form.packageId) e.packageId = 'Choose the funding package this payment belongs to.';
    if (!form.trancheId) e.trancheId = 'Choose the tranche (stage of funding) this payment is paid from.';
    if (!form.recipientId) e.recipientId = 'Choose who should receive the payment.';
    if (!form.purpose.trim()) e.purpose = 'Say what the money is for, for example "Herbicide for 2 hectares".';
    else if (form.purpose.trim().length < 8) e.purpose = 'Add a little more detail so the reviewer can understand the purpose.';
    if (!form.budgetItem) e.budgetItem = 'Choose the approved budget item this payment belongs to.';
    if (!amount) e.amount = 'Enter the amount you are asking for.';
    else if (usage && amount > usage.remaining) e.amount = `This is more than the remaining approved budget for this tranche (${formatNaira(usage.remaining)}). Lower the amount or choose another tranche.`;
    else if (selectedItem && amount > selectedItem.amount) e.amount = `This is more than the approved amount for this budget item (${formatNaira(selectedItem.amount)}).`;
    if (form.files.length === 0) e.files = 'Add the invoice, quotation or other document that supports this payment.';
    return e;
  };

  const review = () => {
    const e = validate();
    setErrors(e);
    if (issues.length > 0) {
      toast('This request is blocked. Read the checks at the top of the form.', 'error');
      return;
    }
    if (Object.keys(e).length > 0) {
      toast('Please fix the highlighted fields.', 'error');
      return;
    }
    setConfirming(true);
  };

  const destination = form.recipientType === 'Cooperative'
    ? `Cooperative payout account ending ${coop?.bank?.last4 || 'on file'}`
    : form.recipientType === 'Supplier' ? 'Verified supplier account on file' : 'Verified farmer payout account on file';

  const submit = async () => {
    setSaving(true);
    await simulate(700);
    const id = newId('dis');
    const record = {
      id, packageId: pkg.id, trancheId: tranche.id, recipientType: form.recipientType, recipientId: recipient.id, recipientName: recipient.name,
      purpose: form.purpose.trim(), category: pkg.category, budgetItem: selectedItem ? `${selectedItem.category}: ${selectedItem.description}` : '',
      amount, date: TODAY, status: 'Pending', ref: makeRef('DRQ', Date.now()), recordedBy: user.name, approvals: [],
      idempotencyKey: `idem-${id}`, destination, supportingDocs: form.files.map((f) => f.name), requestedBy: user.name, source: 'cooperative-request',
    };
    add('disbursements', record, {
      action: 'Disbursement requested', entityType: 'Disbursement',
      summary: `${formatNaira(amount)} to ${recipient.name} for ${record.purpose}. Status Pending, no approvals yet.`,
      reason: `${pkg.name}, ${trancheShort(tranche)}`,
    });
    notify('admin', 'New disbursement request', `${coop.name} asked for ${formatNaira(amount)} for ${record.purpose} (${pkg.name}). It needs review before any payment.`, `/admin/disbursements/${id}`, 'disbursement');
    setSaving(false);
    setConfirming(false);
    toast('Request sent to the admin reviewer. Nothing has been paid yet.');
    onClose();
  };

  const secondNeeded = amount > 0 && needsSecondApprover(amount, limits);

  return (
    <>
      <Modal
        open={!confirming}
        onClose={onClose}
        title="Request a disbursement"
        wide
        white
        footer={(
          <>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={review}><Send size={16} />Review request</Button>
          </>
        )}
      >
        <div className="coopc-stack">
          <Banner tone="green" title="You request. The financial partner pays.">
            This form asks for a payment to be approved. Nothing is paid from this screen. After a CollabFarm admin approves, the regulated financial partner makes the payment and confirms it.
          </Banner>

          {issues.length > 0 && (
            <Banner tone="danger" title="This request is blocked">
              <ul className="coopc-issues">
                {issues.map((i) => (
                  <li key={i.key}>{i.text}{i.to && <> <Link to={i.to}>{i.linkLabel}</Link></>}</li>
                ))}
              </ul>
            </Banner>
          )}

          <div className="form-grid">
            <SelectField
              label="Funding package" required placeholder="Select a package" value={form.packageId} error={errors.packageId}
              options={selectable.map((p) => ({ value: p.id, label: `${p.name} (${p.status})` }))}
              onChange={(e) => set({ packageId: e.target.value, trancheId: '', budgetItem: '' })}
            />
            <SelectField
              label="Tranche" required placeholder={pkg ? 'Select a tranche' : 'Choose a package first'} value={form.trancheId} error={errors.trancheId} disabled={!pkg}
              hint="A tranche is one stage of the funding (T1 to T4). It is released only after the stage before it is done and its evidence is approved."
              options={tranches.map((t) => ({ value: t.id, label: `${trancheShort(t)}: ${t.status}, ${formatNaira(t.amount)}` }))}
              onChange={(e) => set({ trancheId: e.target.value })}
            />
            {tranche && usage && (
              <div className="full coopc-card">
                <InfoList compact items={[
                  ['Tranche budget', formatNaira(tranche.amount)],
                  ['Already requested or paid', formatNaira(usage.used)],
                  ['Remaining you can ask for', <strong key="r">{formatNaira(usage.remaining)}</strong>],
                ]}
                />
              </div>
            )}
            <SelectField
              label="Recipient type" required value={form.recipientType}
              options={['Farmer', 'Supplier', 'Cooperative']}
              onChange={(e) => set({ recipientType: e.target.value, recipientId: e.target.value === 'Cooperative' && coop ? coop.id : '' })}
            />
            <SelectField
              label="Recipient" required placeholder={`Select a ${form.recipientType.toLowerCase()}`} value={form.recipientId} error={errors.recipientId}
              options={recipientOptions} onChange={(e) => set({ recipientId: e.target.value })}
              hint={form.recipientType === 'Supplier' ? 'Suppliers are paid directly where practical. They must be verified.' : form.recipientType === 'Farmer' ? 'The farmer must have a verified identity.' : 'Paid to the verified cooperative payout account.'}
            />
            <TextField label="Purpose" required className="full" value={form.purpose} error={errors.purpose} placeholder="For example: Herbicide for 2 hectares of yam" onChange={(e) => set({ purpose: e.target.value })} />
            <SelectField
              label="Budget item" required placeholder={pkg ? 'Select an approved budget item' : 'Choose a package first'} value={form.budgetItem} error={errors.budgetItem} disabled={!pkg}
              options={budgetItems.map((b) => ({ value: b.id, label: `${b.category}: ${b.description} (${formatNaira(b.amount)})` }))}
              onChange={(e) => set({ budgetItem: e.target.value })}
            />
            <MoneyField
              label="Amount requested" required value={form.amount} error={errors.amount} onChange={(v) => set({ amount: v })}
              hint={usage ? `You can ask for up to ${formatNaira(usage.remaining)} from this tranche.` : 'Choose a tranche to see what is left.'}
            />
            <div className="full">
              <FileDrop
                label="Supporting document" accept="Invoice, quotation or delivery note. PDF, JPG or PNG (Max 5MB)" files={form.files} error={errors.files}
                onFiles={(files) => set({ files })} multiple
              />
            </div>
          </div>

          {secondNeeded && (
            <Banner tone="info">
              Amounts above {formatNaira(limits.secondApproverAbove)} need two different approvers. The admin team arranges this after you send the request.
            </Banner>
          )}
          <p className="caption muted">
            <TriangleAlert size={12} style={{ verticalAlign: '-1px' }} /> Sending a request does not guarantee payment. A reviewer can approve, reject or ask for more information.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={submit}
        loading={saving}
        tone="green"
        title="Send this disbursement request?"
        message="You are asking for a payment to be approved. No money moves from this screen. The financial partner pays only after admin approval."
        summary={[
          ['Recipient', recipient ? `${recipient.name} (${form.recipientType})` : '-'],
          ['Amount', formatNaira(amount)],
          ['Purpose', form.purpose.trim()],
          ['Paid from', pkg && tranche ? `${pkg.name}, ${trancheShort(tranche)}` : '-'],
          ['Approval status', secondNeeded ? 'Not approved yet. Reviewer plus a second approver needed' : 'Not approved yet. Waiting for an admin reviewer'],
        ]}
        confirmLabel="Send request"
      />
    </>
  );
}
