import { useCallback, useMemo } from 'react';
import { useApp, newId, simulate } from '../../context/AppContext.jsx';
import { formatNaira } from '../../utils/format.js';
import { getWallet, nowIso, txRef } from './invData.js';

// Everything an investor page needs, scoped to the signed in investor (user.orgId).
export function useInvestor() {
  const app = useApp();
  const { data, user } = app;
  const investor = useMemo(() => data.investors.find((i) => i.id === user?.orgId) || null, [data.investors, user]);
  const wallet = useMemo(() => getWallet(data, investor?.id), [data.wallets, investor]); // eslint-disable-line react-hooks/exhaustive-deps
  const investments = useMemo(() => data.investments.filter((i) => i.investorId === investor?.id), [data.investments, investor]);
  const pkgById = useMemo(() => Object.fromEntries(data.packages.map((p) => [p.id, p])), [data.packages]);
  const coopById = useMemo(() => Object.fromEntries(data.cooperatives.map((c) => [c.id, c])), [data.cooperatives]);
  return { ...app, investor, wallet, investments, pkgById, coopById };
}

// Wallet actions. A transfer the investor reports is Initiated, then Pending. Only a partner confirmation
// (simulated here, clearly labelled demo only) turns it into Confirmed and moves it into the available balance.
export function useWalletActions() {
  const { data, add, update, patchData, notify, investor, wallet, pkgById } = useInvestor();

  const patchWallet = useCallback((fn) => {
    if (!investor) return;
    patchData((d) => ({ wallets: { ...d.wallets, [investor.id]: fn(getWallet(d, investor.id)) } }));
  }, [patchData, investor]);

  const fundWallet = useCallback(async ({ amount, ref }) => {
    const id = newId('tx');
    add('transactions', {
      id, ref, type: 'Deposit', partyId: investor.id, packageId: null, amount, status: 'Initiated', date: nowIso(), direction: 'in',
      note: 'You reported a transfer to the partner account. This is not proof of receipt.',
    }, { action: 'Wallet funding initiated', entityType: 'Transaction', summary: `Transfer of ${formatNaira(amount)} reported to ${wallet.partner}, ref ${ref}`, reason: 'Investor ticked that the transfer was made' });
    await simulate(900);
    update('transactions', id, { status: 'Pending', note: 'Waiting for the partner to confirm receipt. Not yet received money.' }, { action: 'Wallet funding pending', entityType: 'Transaction', summary: 'Status Initiated to Pending partner confirmation', reason: 'Awaiting partner statement' });
    patchWallet((w) => ({ ...w, pendingConfirmation: w.pendingConfirmation + amount }));
    notify('admin', 'Investor transfer awaiting confirmation', `${investor.name} reported a transfer of ${formatNaira(amount)} (ref ${ref}). No partner confirmation yet.`, '/admin/reconciliation', 'funding');
    return { id, ref };
  }, [add, update, patchWallet, notify, investor, wallet.partner]);

  const requestWithdrawal = useCallback(async ({ amount, bank, accountName, last4 }) => {
    const ref = txRef();
    await simulate(800);
    add('transactions', {
      id: newId('tx'), ref, type: 'Withdrawal', partyId: investor.id, packageId: null, amount, status: 'Pending', date: nowIso(), direction: 'out',
      note: `Withdrawal request to ${bank}, account ending ${last4}. Simulated, waiting for the partner to process.`,
    }, { action: 'Withdrawal requested', entityType: 'Transaction', summary: `${formatNaira(amount)} withdrawal from available balance to ${bank} ending ${last4} (${accountName})`, reason: 'Investor request, simulated' });
    patchWallet((w) => ({ ...w, available: Math.max(0, w.available - amount) }));
    notify('admin', 'Investor withdrawal requested', `${investor.name} asked to withdraw ${formatNaira(amount)} of available funds. Partner processing is simulated.`, '/admin/reconciliation', 'payment');
    return { ref };
  }, [add, patchWallet, notify, investor]);

  // DEMO ONLY. In a real system only the financial partner can confirm receipt.
  const simulateConfirm = useCallback(async (tx) => {
    const amount = tx.amount;
    const linked = tx.type === 'Commitment'
      ? data.investments.find((i) => i.investorId === investor.id && i.packageId === tx.packageId && i.confirmed < i.committed)
      : null;
    const pkg = tx.packageId ? pkgById[tx.packageId] : null;
    await simulate(600);
    let note = 'Partner confirmation simulated (demo only).';
    if (tx.type === 'Deposit') {
      patchWallet((w) => ({ ...w, pendingConfirmation: Math.max(0, w.pendingConfirmation - amount), available: w.available + amount }));
      note = `Partner confirmation simulated (demo only). ${formatNaira(amount)} moved to your available balance.`;
    } else if (tx.type === 'Commitment' && linked) {
      const received = Math.min(amount, linked.committed - linked.confirmed);
      const confirmed = linked.confirmed + received;
      update('investments', linked.id, (i) => ({ confirmed, available: i.available + received, status: confirmed >= i.committed && i.status === 'Pending' ? 'Active' : i.status }),
        { action: 'Funds confirmed (simulated)', entityType: 'Investment', summary: `${formatNaira(received)} confirmed received for ${linked.ref}`, reason: 'Demo only: simulated partner confirmation' });
      if (pkg) {
        const raised = Math.min(pkg.amount, pkg.raised + received);
        update('packages', pkg.id, { raised, ...(raised >= pkg.amount && pkg.status === 'Open for Funding' ? { status: 'Funding Target Reached' } : {}) });
      }
      patchWallet((w) => ({ ...w, pendingConfirmation: Math.max(0, w.pendingConfirmation - received), locked: w.locked + received }));
      note = `Partner confirmation simulated (demo only). ${formatNaira(received)} is now confirmed and locked against ${linked.ref}.`;
      notify('cooperative', 'Investor funds confirmed', `${formatNaira(received)} committed to ${pkg?.name || 'your package'} is now confirmed by the partner (demo simulation).`, '/coop/investments', 'funding');
    } else if (tx.type === 'Commitment') {
      note = 'Partner confirmation simulated (demo only). The linked investment already shows these funds as confirmed, so no balance changed.';
    } else if (tx.type === 'Withdrawal') {
      note = 'Partner processing simulated (demo only). The amount was already set aside from your available balance.';
    }
    update('transactions', tx.id, { status: 'Confirmed', note }, { action: 'Partner confirmation simulated (demo only)', entityType: 'Transaction', summary: `${tx.ref} ${tx.type} ${formatNaira(amount)} marked Confirmed`, reason: 'Demo only: there is no real partner in this prototype' });
    const rec = data.reconciliation.find((r) => r.ref === tx.ref);
    if (rec) update('reconciliation', rec.id, { status: 'Confirmed', provider: amount, providerRef: 'DEMO-SIM', reconciledBy: 'Demo simulation', reconciledAt: nowIso().slice(0, 10), note: 'Confirmed by demo simulation only.' });
    return note;
  }, [data.investments, data.reconciliation, investor, pkgById, patchWallet, update, notify]);

  return { fundWallet, requestWithdrawal, simulateConfirm, patchWallet };
}
