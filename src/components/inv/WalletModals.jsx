import { useState } from 'react';
import { CheckCircle2, Landmark } from 'lucide-react';
import { Modal, ConfirmDialog, Button, MoneyField, TextField, SelectField, Checkbox, InfoList, Banner } from '../ui/index.js';
import { formatNaira } from '../../utils/format.js';
import { BANKS, txRef } from './invData.js';
import { useInvestor, useWalletActions } from './useInvestor.js';

const MIN_FUND = 10000;
const MAX_FUND = 500000000;

function FundForm({ onClose }) {
  const { wallet, toast } = useInvestor();
  const { fundWallet } = useWalletActions();
  const [amount, setAmount] = useState('');
  const [ticked, setTicked] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [ref] = useState(() => txRef());

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!amount) next.amount = 'Enter the amount you are transferring.';
    else if (amount < MIN_FUND) next.amount = `The smallest transfer is ${formatNaira(MIN_FUND)}.`;
    else if (amount > MAX_FUND) next.amount = `The largest single transfer is ${formatNaira(MAX_FUND)}.`;
    if (!ticked) next.ticked = 'Tick the box once you have made the transfer.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      await fundWallet({ amount, ref });
      toast('Transfer recorded as Pending. It is not available to invest until the partner confirms receipt.', 'info');
      onClose();
    } catch {
      setLoading(false);
      toast('We could not record the transfer. Please try again.', 'error');
    }
  };

  return (
    <form onSubmit={submit} className="stack" noValidate>
      <p className="small muted">
        Your money is held by {wallet.partner}, a regulated financial partner. CollabFarm does not hold or pool money. Make the transfer with your bank, then tell us below.
      </p>
      <MoneyField label="Amount you are transferring" required value={amount} onChange={(v) => { setAmount(v); setErrors((s) => ({ ...s, amount: undefined })); }} error={errors.amount} hint={`Between ${formatNaira(MIN_FUND)} and ${formatNaira(MAX_FUND)}.`} />
      <div className="inv-instructions">
        <div className="strong small">Partner payment instructions</div>
        <InfoList compact items={[
          ['Pay to', wallet.partner],
          ['Account reference', wallet.accountRef],
          ['Payment reference', <strong key="r">{ref}</strong>],
          ['Purpose', 'Fund my CollabFarm investor wallet'],
          ['Status after you tell us', 'Initiated, then Pending. It becomes Confirmed only when the partner confirms receipt.'],
        ]} />
        <p className="caption muted">Use the payment reference exactly as shown so the partner can match your transfer.</p>
      </div>
      <Checkbox checked={ticked} onChange={(v) => { setTicked(v); setErrors((s) => ({ ...s, ticked: undefined })); }} error={errors.ticked}>
        I have made this transfer. I understand a payment initiation is not proof of receipt.
      </Checkbox>
      <div className="modal__foot">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>Record my transfer</Button>
      </div>
    </form>
  );
}

export function FundWalletModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Fund wallet">
      {open && <FundForm onClose={onClose} />}
    </Modal>
  );
}

function WithdrawFlow({ onClose }) {
  const { wallet, investor, toast } = useInvestor();
  const { requestWithdrawal } = useWalletActions();
  const defaultAccountName = investor?.payout?.accountName || investor?.name || '';
  const [form, setForm] = useState({ accountNumber: '', bank: investor?.payout?.bank || '', amount: '' });
  const [errors, setErrors] = useState({});
  const [stage, setStage] = useState('form');
  const [loading, setLoading] = useState(false);
  const set = (k, v) => { setForm((s) => ({ ...s, [k]: v })); setErrors((s) => ({ ...s, [k]: undefined })); };
  const numberValid = /^\d{10}$/.test(form.accountNumber);
  const last4 = form.accountNumber.slice(-4);

  const review = (e) => {
    e.preventDefault();
    const next = {};
    if (!numberValid) next.accountNumber = 'Enter the 10 digit account number.';
    if (!form.bank) next.bank = 'Choose the bank.';
    if (!form.amount) next.amount = 'Enter the amount to withdraw.';
    else if (form.amount > wallet.available) next.amount = `You can withdraw up to ${formatNaira(wallet.available)} of available funds. Committed and pending funds cannot be withdrawn.`;
    setErrors(next);
    if (Object.keys(next).length === 0) setStage('confirm');
  };

  const confirm = async () => {
    setLoading(true);
    try {
      await requestWithdrawal({ amount: form.amount, bank: form.bank, accountName: defaultAccountName, last4 });
      toast('Withdrawal requested. It is Pending until the partner processes it (simulated).', 'info');
      onClose();
    } catch {
      setLoading(false);
      toast('We could not record the withdrawal. Please try again.', 'error');
    }
  };

  return (
    <>
      <Modal open={stage === 'form'} onClose={onClose} title="How much would you like to withdraw?">
        <form onSubmit={review} className="stack" noValidate>
          <p className="small muted">Input your details and the amount in Naira below. Only available funds can be withdrawn. Enter the full 10-digit account number; this demo retains only the last 4 digits. Bank account-name lookup is not connected.</p>
          <div className="form-grid">
            <TextField label="Account name" value={defaultAccountName} readOnly hint="Filled from your investor profile. This is not verified against the bank." />
            <TextField label="Account number" required value={form.accountNumber} inputMode="numeric" maxLength={10} onChange={(e) => set('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 10))} error={errors.accountNumber} autoComplete="off" />
            <SelectField label="Bank" required placeholder="Choose bank" options={BANKS} value={form.bank} onChange={(e) => set('bank', e.target.value)} error={errors.bank} />
            <MoneyField label="Amount" required value={form.amount} onChange={(v) => set('amount', v)} error={errors.amount} hint={`Available: ${formatNaira(wallet.available)}`} className="full" />
          </div>
          {numberValid && <Banner tone="success"><span className="row" style={{ gap: 8 }}><CheckCircle2 size={16} />Account number is valid</span></Banner>}
          <div className="modal__foot">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Withdraw</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={stage === 'confirm'}
        onClose={() => setStage('form')}
        onConfirm={confirm}
        loading={loading}
        tone="green"
        icon={Landmark}
        title="Confirm this withdrawal request"
        message="Check the details. Nothing is paid until the financial partner processes the request."
        summary={[
          ['Recipient', `${defaultAccountName || 'Account holder'}, ${form.bank}, account ending ${last4}`],
          ['Amount', formatNaira(form.amount)],
          ['Purpose', 'Withdrawal of available funds'],
          ['Approval status', 'Pending partner processing (simulated)'],
        ]}
        confirmLabel="Request withdrawal"
        cancelLabel="Back"
      />
    </>
  );
}

export function WithdrawModal({ open, onClose }) {
  return open ? <WithdrawFlow onClose={onClose} /> : null;
}
