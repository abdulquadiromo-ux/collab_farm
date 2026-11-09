// Shared helpers for the administrator money, milestone, monitoring and risk pages (group admb).
// Pure functions plus a few "apply" functions that write through the store actions passed in `ctx`.
// Nothing here talks to a server.
import { useSearchParams } from 'react-router-dom';
import { newId } from '../../context/AppContext.jsx';
import { formatNaira } from '../../utils/format.js';
import { canReleaseTranche, needsSecondApprover, canSecondApprove, sum } from '../../utils/rules.js';

/* ---------------- dates ---------------- */
const pad = (n) => String(n).padStart(2, '0');
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const nowIso = () => new Date().toISOString();
// Positive when `iso` is in the future, negative when it is in the past.
export const dayDiff = (iso, base = todayIso()) => {
  if (!iso) return 0;
  const a = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  const b = new Date(`${base}T00:00:00`);
  return Math.round((a - b) / 86400000);
};
export const isOverdue = (iso) => !!iso && dayDiff(iso) < 0;
export const addDaysIso = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/* ---------------- url state ---------------- */
// Keeps simple filters in the query string so refresh and deep links work.
export function useQueryState(keys) {
  const [params, setParams] = useSearchParams();
  const values = {};
  keys.forEach((k) => { values[k] = params.get(k) || ''; });
  const set = (key, value) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    if (value) next.set(key, value); else next.delete(key);
    return next;
  }, { replace: true });
  return [values, set];
}

/* ---------------- lookups ---------------- */
export const findPkg = (data, id) => data.packages.find((p) => p.id === id);
export const pkgName = (data, id) => findPkg(data, id)?.name || id || '-';
export const coopOfPkg = (data, id) => data.cooperatives.find((c) => c.id === findPkg(data, id)?.coopId);
export const coopNameOfPkg = (data, id) => coopOfPkg(data, id)?.name || '-';
export const investorName = (data, id) => data.investors.find((i) => i.id === id)?.name || id || '-';
export const otherAdmin = (data, user) => data.users.find((u) => u.role === 'admin' && u.id !== user.id);
export const adminRoleLabel = (u) => (/payment approver/i.test(u?.title || '') ? 'Payment approver' : 'Project reviewer');
export const trancheLabel = (t) => (t ? `T${t.number} ${t.name}` : '-');

/* ---------------- tranche and disbursement rules ---------------- */
// Seed disbursements sometimes point at a tranche of another package. Resolve by package and tranche number.
export function resolveTranche(d, tranches) {
  const exact = tranches.find((t) => t.id === d.trancheId && t.packageId === d.packageId);
  if (exact) return exact;
  const num = Number(String(d.trancheId || '').match(/-t(\d+)$/)?.[1]);
  return tranches.find((t) => t.packageId === d.packageId && t.number === num) || null;
}

export function approvalPlan(d, limits) {
  const required = needsSecondApprover(d.amount, limits) ? 2 : 1;
  const have = d.approvals?.length || 0;
  return { required, have, complete: have >= required, secondRequired: required === 2 };
}

// What the signed in administrator may do with a payment (maker-checker).
export function disbursementAccess(d, user, plan, data) {
  const name = user.name;
  const raisedByMe = d.recordedBy === name;
  const approvedByMe = (d.approvals || []).some((a) => a.by === name);
  const open = ['Pending', 'Reviewing'].includes(d.status);
  const sent = !!d.instructionSentAt;
  const other = otherAdmin(data, user);
  const switchHint = other ? ` Use the Account menu to switch to ${other.name} (${adminRoleLabel(other)}).` : '';
  const out = { canFirst: false, canSecond: false, canRelease: false, canReject: open && !sent, messages: [] };
  if (!open) return out;
  if (!sent) {
    if (plan.have === 0) {
      if (raisedByMe) out.messages.push(`You raised this payment, so you cannot approve it.${switchHint}`);
      else out.canFirst = true;
    } else if (!plan.complete) {
      if (raisedByMe) out.messages.push(`You raised this payment, so you cannot give the second approval.${switchHint}`);
      else if (!canSecondApprove(d, name)) out.messages.push(`You already approved this payment. A different administrator must give the second approval.${switchHint}`);
      else out.canSecond = true;
    }
  }
  if (plan.complete && !sent) {
    const soleApprover = plan.have === 1 && d.approvals[0].by === name;
    if (raisedByMe) out.messages.push(`You raised this payment, so you cannot send it to the financial partner.${switchHint}`);
    else if (soleApprover) out.messages.push(`You are the only approver, so someone else must send the payment instruction. Nobody raises, approves and pays alone.${switchHint}`);
    else out.canRelease = true;
  }
  out.raisedByMe = raisedByMe;
  out.approvedByMe = approvedByMe;
  return out;
}

export function nextStepText(d, plan) {
  if (d.status === 'Disbursed') return 'Paid and confirmed by the partner';
  if (d.status === 'Rejected') return 'Closed, rejected';
  if (d.instructionSentAt) return 'Waiting for partner confirmation';
  if (!plan.complete) return plan.have === 0 ? 'Needs first approval' : 'Needs second approval';
  return 'Approved, ready to send to the partner';
}

// A payout destination counts as verified when it says so, or (for a cooperative) when it matches the verified account on its profile.
export function destinationVerified(data, d) {
  if (/verified/i.test(d.destination || '')) return true;
  if (d.recipientType === 'Cooperative') {
    const c = data.cooperatives.find((x) => x.id === d.recipientId);
    return !!c && c.status === 'Verified' && !!c.bank?.last4 && String(d.destination || '').includes(c.bank.last4);
  }
  return false;
}

export function committedToday(data, exceptId) {
  const today = todayIso();
  return sum(
    data.disbursements.filter((d) => d.id !== exceptId && ((d.status === 'Disbursed' && String(d.date).slice(0, 10) === today) || (d.instructionSentAt && String(d.instructionSentAt).slice(0, 10) === today && !['Disbursed', 'Rejected'].includes(d.status)))),
    (d) => d.amount,
  );
}

export function disbursedAgainstTranche(data, tranche, exceptId) {
  if (!tranche) return 0;
  return sum(
    data.disbursements.filter((x) => x.id !== exceptId && x.status === 'Disbursed' && resolveTranche(x, data.tranches)?.id === tranche.id),
    (x) => x.amount,
  );
}

export const availableFunds = (data, packageId) => sum(data.investments.filter((i) => i.packageId === packageId), (i) => i.available);

// Every check that stands between an approved payment and a payment instruction.
export function releaseChecks(data, d, plan) {
  const pkg = findPkg(data, d.packageId);
  const tranche = resolveTranche(d, data.tranches);
  const raw = tranche ? canReleaseTranche(tranche, data.tranches, data.milestones, false) : { prevOk: false, evidenceOk: false };
  const waived = !!d.exception;
  const limits = data.platformSettings.approvalLimits;
  const cap = limits.dailyDisbursementCap;
  const todaySoFar = committedToday(data, d.id);
  const trancheLeft = tranche ? tranche.amount - disbursedAgainstTranche(data, tranche, d.id) : 0;
  // For a payment that is already paid, show the funds as they stood before it left, not after.
  const funds = availableFunds(data, d.packageId) + (d.status === 'Disbursed' ? d.amount : 0);
  const supplier = d.recipientType === 'Supplier' ? data.suppliers.find((s) => s.id === d.recipientId) : null;
  const unapproved = tranche ? data.milestones.filter((m) => m.trancheId === tranche.id && m.status !== 'Approved') : [];
  const prev = tranche ? data.tranches.find((t) => t.packageId === tranche.packageId && t.number === tranche.number - 1) : null;
  const dupe = data.disbursements.some((x) => x.id !== d.id && x.idempotencyKey === d.idempotencyKey && x.status === 'Disbursed');
  const pkgOk = !!pkg && ['Funding Target Reached', 'Ready for Disbursement', 'Active'].includes(pkg.status);
  const checks = [
    { id: 'approvals', ok: plan.complete, label: 'Required approvals recorded', detail: plan.complete ? `${plan.have} of ${plan.required} required approval${plan.required === 1 ? '' : 's'} in place.` : `${plan.have} of ${plan.required} required approval${plan.required === 1 ? '' : 's'} so far.` },
    { id: 'prev', ok: raw.prevOk, waivable: true, label: 'Previous tranche released', detail: !tranche ? 'No tranche is linked to this payment.' : !prev ? 'This is the first tranche, so there is no earlier one to wait for.' : `Tranche ${prev.number} is ${prev.status}.` },
    { id: 'evidence', ok: raw.evidenceOk, waivable: true, label: 'Milestone evidence approved for this tranche', detail: !tranche ? 'No tranche is linked to this payment.' : raw.evidenceOk ? 'Every milestone for this tranche is approved.' : unapproved.length ? `Not yet approved: ${unapproved.map((m) => m.title).join(', ')}.` : 'No milestone has been set up for this tranche yet.', links: unapproved.map((m) => ({ to: `/admin/milestones/${m.id}`, label: m.title })) },
    { id: 'package', ok: pkgOk, label: 'Project is open for payments', detail: pkgOk ? `Project status is ${pkg.status}.` : pkg?.status === 'Paused' ? 'New disbursements are suspended on this project.' : `Project status is ${pkg?.status || 'unknown'}. Payments can only be released once the funding target is reached, and while the project is Ready for Disbursement or Active.` },
    { id: 'funds', ok: funds >= d.amount, advisory: true, label: 'Confirmed funds cover this payment', detail: funds >= d.amount ? `${formatNaira(funds)} confirmed by the financial partner and not yet paid out.` : `Only ${formatNaira(funds)} is confirmed and not yet paid out, which is ${formatNaira(d.amount - funds)} short. Commitments that are not confirmed do not count. The partner pays only what it holds, so this instruction may be refused.`, links: [{ to: `/admin/reconciliation?pkg=${d.packageId}&type=Investor%20receipt`, label: 'Investor receipts' }] },
    { id: 'tranche', ok: !!tranche && d.amount <= trancheLeft, label: 'Amount within the tranche allowance', detail: tranche ? `Tranche allowance ${formatNaira(tranche.amount)}, already paid ${formatNaira(tranche.amount - trancheLeft)}, left ${formatNaira(trancheLeft)}.` : 'No tranche is linked.' },
    { id: 'destination', ok: destinationVerified(data, d), label: 'Payout destination verified', detail: destinationVerified(data, d) ? `${d.destination}. ${d.recipientType === 'Cooperative' ? 'Matches the verified payout account on the cooperative profile.' : 'Verified before payment.'}` : `${d.destination || 'No destination recorded.'} It has not been verified, so no payment can be sent.` },
  ];
  if (supplier) checks.push({ id: 'supplier', ok: supplier.verification === 'Verified', label: 'Supplier verified', detail: `${supplier.name} is ${supplier.verification}.` });
  checks.push({ id: 'cap', ok: todaySoFar + d.amount <= cap, label: 'Within the daily disbursement cap', detail: `${formatNaira(todaySoFar)} already committed today. Cap ${formatNaira(cap)}.` });
  checks.push({ id: 'dupe', ok: !dupe, label: 'No duplicate payment', detail: dupe ? 'Another payment with the same idempotency key has already been made.' : `Idempotency key ${d.idempotencyKey || 'not set'} has not been used for a completed payment.` });
  const resolved = checks.map((c) => ({ ...c, waived: !c.ok && c.waivable && waived }));
  const blocking = resolved.filter((c) => !c.ok && !c.waived && !c.advisory && c.id !== 'approvals');
  const warnings = resolved.filter((c) => !c.ok && c.advisory);
  return { checks: resolved, tranche, pkg, supplier, gateRaw: raw, gateOk: raw.prevOk && raw.evidenceOk, blocking, warnings, ready: blocking.length === 0, cap, todaySoFar, trancheLeft, funds };
}

const EXPENSE_RULES = [
  [/seed|fertili|npk|urea|input|setts|stem/i, 'Seeds and fertiliser'],
  [/tractor|hire|machin|equipment|pump/i, 'Machinery and equipment'],
  [/pesticide|herbicide|vaccin|medic|protect/i, 'Crop protection'],
  [/labour|weeding|planting|harvest/i, 'Farmer labour'],
];
export function expenseCategory(d) {
  const hit = EXPENSE_RULES.find(([re]) => re.test(d.purpose || ''));
  if (hit) return hit[1];
  return d.recipientType === 'Farmer' ? 'Farmer labour' : 'Other approved expenses';
}

// Pro rata split of a payment across the confirmed, not yet disbursed money of a package's investments.
function allocate(list, amount) {
  const total = sum(list, (i) => i.available);
  if (!total) return {};
  const take = Math.min(amount, total);
  let left = take;
  const out = {};
  list.forEach((i, idx) => {
    const portion = idx === list.length - 1 ? left : Math.min(i.available, Math.round((take * i.available) / total));
    const v = Math.max(0, Math.min(portion, i.available, left));
    out[i.id] = v; left -= v;
  });
  list.forEach((i) => {
    if (left > 0) { const v = Math.min(i.available - out[i.id], left); out[i.id] += v; left -= v; }
  });
  return out;
}

// Step 2 of releasing a payment. In the real product the financial partner reports this. Here it is simulated.
export function applyPartnerConfirmation(ctx, d) {
  const { data, update, add, patchData, notify } = ctx;
  const today = todayIso();
  const tranche = resolveTranche(d, data.tranches);
  const partnerRef = `PRV-${String(d.ref).replace(/\D/g, '').slice(-5).padStart(5, '0')}`;
  update('disbursements', d.id, { status: 'Disbursed', date: today, partnerConfirmedAt: nowIso(), partnerRef }, {
    action: 'Partner confirmation recorded (simulated)', entityType: 'Disbursement',
    summary: `${formatNaira(d.amount)} to ${d.recipientName}. Status Reviewing to Disbursed. Reconciliation record opened.`, reason: 'Demo only: simulated partner confirmation',
  });
  if (!data.expenses.some((e) => e.ref === d.ref)) {
    add('expenses', { packageId: d.packageId, category: expenseCategory(d), description: d.purpose, amount: d.amount, date: today, supplier: d.recipientType === 'Supplier' ? d.recipientName : d.recipientType === 'Farmer' ? 'Paid to farmers' : d.recipientName, status: 'Under Reconciliation', ref: d.ref }, {
      action: 'Expense recorded', entityType: 'Expense', summary: `${d.purpose}, ${formatNaira(d.amount)}, status Under Reconciliation`, reason: `Payment ${d.ref}`,
    });
  }
  if (!data.reconciliation.some((r) => r.ref === d.ref)) {
    add('reconciliation', {
      id: newId('rc'), ref: d.ref, packageId: d.packageId, type: d.recipientType === 'Supplier' ? 'Disbursement to supplier' : 'Disbursement to farmers',
      internal: d.amount, provider: d.amount, providerRef: partnerRef, status: 'Under Reconciliation', reconciledBy: null, reconciledAt: null,
      note: 'Opened from a simulated partner confirmation. Waiting to be matched against the partner statement.',
    }, { action: 'Reconciliation record opened', entityType: 'Reconciliation', summary: `${d.ref} ${formatNaira(d.amount)} Under Reconciliation`, reason: 'Payment confirmed by partner (simulated)' });
  }
  const alloc = allocate(data.investments.filter((i) => i.packageId === d.packageId && i.available > 0), d.amount);
  if (Object.keys(alloc).length) {
    patchData((dd) => ({ investments: dd.investments.map((i) => (alloc[i.id] ? { ...i, available: i.available - alloc[i.id], disbursed: i.disbursed + alloc[i.id] } : i)) }));
  }
  if (tranche) {
    const paid = disbursedAgainstTranche(data, tranche, d.id) + d.amount;
    if (paid >= tranche.amount && tranche.status !== 'Released') {
      update('tranches', tranche.id, { status: 'Released', releasedAt: nowIso(), approvedAt: tranche.approvedAt || nowIso(), reviewer: tranche.reviewer || ctx.user.name, releasedByException: !!d.exception }, {
        action: 'Tranche released', entityType: 'Tranche', summary: `${trancheLabel(tranche)} fully disbursed (${formatNaira(paid)}). Status ${tranche.status} to Released.`, reason: d.exception ? 'Released under a recorded exception' : 'Fully disbursed',
      });
    }
  }
  const pkg = findPkg(data, d.packageId);
  notify('cooperative', 'Payment confirmed by the financial partner', `${formatNaira(d.amount)} for ${d.purpose} (${pkg?.name || 'project'}) was confirmed by the partner. It is now being reconciled.`, '/coop/disbursements', 'disbursement');
  notify('investor', 'Disbursement confirmed', `${formatNaira(d.amount)} was disbursed to ${d.recipientName} for ${pkg?.name || 'a project'}.`, '/investor/investments', 'disbursement');
  if (d.recipientType === 'Farmer') notify('farmer', 'Payment recorded', `${formatNaira(d.amount)} for ${d.purpose} was recorded against your name.`, '/farmer/inputs-payments', 'payment');
}

/* ---------------- reconciliation cascade ---------------- */
export const appendNote = (old, add, by) => [old, add ? `${by ? `${by}: ` : ''}${add}` : ''].filter(Boolean).join(' ');

export function findSaleFor(data, rec) {
  const inPkg = data.sales.filter((s) => s.packageId === rec.packageId);
  return inPkg.find((s) => s.gross === rec.internal) || inPkg.find((s) => s.paymentStatus === 'Under Reconciliation') || null;
}

export function findInvestmentFor(data, rec) {
  const tx = data.transactions.find((t) => t.ref === rec.ref);
  const pool = data.investments.filter((i) => i.packageId === rec.packageId && (!tx || i.investorId === tx.partyId));
  return { tx, inv: pool.find((i) => i.committed === rec.internal && i.confirmed === 0) || pool.find((i) => i.confirmed === 0) || null };
}

export function confirmReconciliation(ctx, rec, { note = '', actor, patch = {}, auto = false } = {}) {
  const { data, update, patchData, notify } = ctx;
  const diff = rec.internal - rec.provider;
  const today = todayIso();
  const pkg = findPkg(data, rec.packageId);
  const pkgLabel = pkg?.name || rec.packageId;
  update('reconciliation', rec.id, {
    ...patch, status: 'Confirmed', reconciledBy: actor, reconciledAt: today, note: appendNote(rec.note, note, actor),
    ...(diff !== 0 ? { correction: { amount: diff, note, by: actor, at: nowIso() } } : {}),
  }, {
    action: diff !== 0 ? 'Reconciliation confirmed with a recorded difference' : 'Reconciliation confirmed',
    entityType: 'Reconciliation',
    summary: `${rec.ref} ${rec.type}: our records ${formatNaira(rec.internal)}, partner ${formatNaira(rec.provider)}${diff !== 0 ? `, difference ${formatNaira(Math.abs(diff))} kept as a correcting entry` : ''}${auto ? '. Auto-matched from a simulated statement' : ''}`,
    reason: note || 'Amounts agree with the partner report',
  });

  if (rec.type === 'Investor receipt') {
    const { tx, inv } = findInvestmentFor(data, rec);
    const received = rec.provider > 0 ? rec.provider : rec.internal;
    if (inv) {
      update('investments', inv.id, { confirmed: received, available: Math.max(0, received - (inv.disbursed || 0)), status: inv.status === 'Pending' ? 'Active' : inv.status }, {
        action: 'Investment funds confirmed', entityType: 'Investment', summary: `${inv.ref}: confirmed received ${formatNaira(received)}. Status ${inv.status} to ${inv.status === 'Pending' ? 'Active' : inv.status}.`, reason: `Reconciliation ${rec.ref} confirmed`,
      });
    }
    if (tx) update('transactions', tx.id, { status: 'Confirmed', note: 'Partner confirmed receipt' });
    const investorId = tx?.partyId || inv?.investorId;
    if (investorId && data.wallets?.[investorId]) {
      patchData((dd) => {
        const w = dd.wallets[investorId];
        if (!w) return {};
        const move = Math.min(received, w.pendingConfirmation || 0);
        return { wallets: { ...dd.wallets, [investorId]: { ...w, pendingConfirmation: (w.pendingConfirmation || 0) - move, available: (w.available || 0) + move } } };
      });
    }
    if (pkg) {
      const raisedNow = Math.max(pkg.raised, Math.min(pkg.committed, pkg.raised + received));
      const reached = raisedNow >= pkg.amount && pkg.status === 'Open for Funding';
      update('packages', pkg.id, (p) => ({ raised: Math.max(p.raised, Math.min(p.committed, p.raised + received)), ...(reached ? { status: 'Funding Target Reached' } : {}) }), reached ? { action: 'Funding target reached', entityType: 'Package', summary: `Confirmed receipts reached the target. Status Open for Funding to Funding Target Reached.`, reason: `Reconciliation ${rec.ref} confirmed` } : undefined);
      if (reached) notify('cooperative', 'Funding target reached', `${pkgLabel} reached its funding target on confirmed receipts.`, `/coop/funding/${pkg.id}`, 'project');
    }
    notify('investor', 'Funds confirmed by the financial partner', `${formatNaira(received)} for ${pkgLabel} was confirmed as received. Your investment is now Active. A commitment only counts once it is confirmed.`, '/investor/investments', 'funding');
    notify('cooperative', 'Investor funds confirmed', `${formatNaira(received)} for ${pkgLabel} was confirmed by the financial partner.`, '/coop/investments', 'funding');
  } else if (rec.type === 'Sale receipt') {
    const sale = findSaleFor(data, rec);
    if (sale) {
      update('sales', sale.id, { paymentStatus: 'Confirmed', outstanding: Math.max(0, diff) }, {
        action: 'Sale payment confirmed', entityType: 'Sale', summary: `${sale.ref}: payment status Under Reconciliation to Confirmed.${diff > 0 ? ` ${formatNaira(diff)} stays outstanding from the buyer.` : ''}`, reason: `Reconciliation ${rec.ref} confirmed`,
      });
    }
    notify('cooperative', 'Sale payment confirmed', `The receipt for ${pkgLabel} was confirmed at ${formatNaira(rec.provider)}.${diff > 0 ? ` ${formatNaira(diff)} is still outstanding from the buyer.` : ''}`, '/coop/settlements', 'payment');
  } else {
    data.expenses.filter((e) => e.ref === rec.ref).forEach((e) => update('expenses', e.id, { status: 'Confirmed' }, {
      action: 'Expense confirmed', entityType: 'Expense', summary: `${e.description}, ${formatNaira(e.amount)}: Under Reconciliation to Confirmed`, reason: `Reconciliation ${rec.ref} confirmed`,
    }));
    data.disbursements.filter((x) => x.ref === rec.ref && x.status !== 'Disbursed' && x.status !== 'Rejected').forEach((x) => update('disbursements', x.id, { status: 'Disbursed' }, {
      action: 'Disbursement confirmed by reconciliation', entityType: 'Disbursement', summary: `${x.recipientName} ${formatNaira(x.amount)}`, reason: `Reconciliation ${rec.ref} confirmed`,
    }));
    notify('cooperative', 'Payment reconciled', `${formatNaira(rec.provider)} for ${pkgLabel} matches the partner statement.`, '/coop/disbursements', 'disbursement');
    if (rec.type === 'Disbursement to farmers') notify('farmer', 'Payment confirmed', `A payment of ${formatNaira(rec.provider)} for ${pkgLabel} has been confirmed.`, '/farmer/inputs-payments', 'payment');
  }
}

// Plain-language effect of confirming a record, shown before the administrator confirms.
export function reconEffects(data, rec) {
  const pkg = pkgName(data, rec.packageId);
  if (rec.type === 'Investor receipt') {
    const { inv } = findInvestmentFor(data, rec);
    return [
      inv ? `Investment ${inv.ref} becomes Active and its confirmed amount is set to ${formatNaira(rec.provider || rec.internal)}.` : 'No matching investment was found, so only this record changes.',
      'The investor wallet moves the amount from Pending confirmation to Available.',
      `The ${pkg} funding total (confirmed) goes up, capped at the committed amount.`,
      'The investor and the cooperative are notified.',
    ];
  }
  if (rec.type === 'Sale receipt') {
    const sale = findSaleFor(data, rec);
    return [
      sale ? `Sale ${sale.ref} payment status becomes Confirmed.` : 'No matching sale was found, so only this record changes.',
      rec.internal - rec.provider > 0 ? `${formatNaira(rec.internal - rec.provider)} stays recorded as outstanding from the buyer.` : 'No buyer balance remains.',
      'Profit distributions for this project can then be calculated from verified sales.',
    ];
  }
  const ex = data.expenses.filter((e) => e.ref === rec.ref).length;
  return [ex ? `The linked expense (${ex}) becomes Confirmed.` : 'No linked expense record was found.', 'The cooperative is notified that the payment is reconciled.'];
}

/* ---------------- milestones ---------------- */
export function milestoneFlags(m) {
  const due = dayDiff(m.dueDate);
  const done = m.status === 'Approved';
  const overdue = !done && due < 0;
  return {
    overdue, overdueDays: overdue ? -due : 0, done, delayed: m.status === 'Delayed', daysToDue: due,
    late: !!m.submittedAt && String(m.submittedAt).slice(0, 10) > m.dueDate,
    dueSoon: !done && due >= 0 && due <= 7,
  };
}
export function dueBucket(m) {
  const f = milestoneFlags(m);
  if (f.done) return 'done';
  if (f.overdue) return 'overdue';
  if (f.dueSoon) return 'soon';
  return 'later';
}
export const MS_ORDER = { 'Under Review': 0, Delayed: 1, 'Not Started': 2, Approved: 3 };

/* ---------------- project health ---------------- */
export const isOpenCase = (c) => c.status !== 'Resolved';
export const MONITORED = ['Open for Funding', 'Funding Target Reached', 'Ready for Disbursement', 'Active', 'Paused', 'Completed', 'Failed or Terminated'];

/* The six amounts at project level. The investment records only hold the demo investor's slice, so the totals come from the project and its released tranches. */
export function projectAmounts(data, pkg, tranches, invs) {
  const confirmed = pkg.raised || 0;
  const committed = Math.max(pkg.committed || 0, confirmed);
  const intended = Math.max(sum(invs, (i) => i.intended), committed);
  const disbursed = Math.min(confirmed, sum(tranches.filter((t) => t.status === 'Released'), (t) => t.amount));
  const repaid = sum(data.distributions.filter((x) => x.packageId === pkg.id), (x) => x.amountPaid || 0);
  return { intended, committed, confirmed, unspent: Math.max(0, confirmed - disbursed), disbursed, repaid };
}

export function packageMetrics(data, pkg) {
  const tranches = data.tranches.filter((t) => t.packageId === pkg.id).sort((a, b) => a.number - b.number);
  const milestones = data.milestones.filter((m) => m.packageId === pkg.id);
  const invs = data.investments.filter((i) => i.packageId === pkg.id);
  const risks = data.riskCases.filter((r) => r.packageId === pkg.id);
  const openRisks = risks.filter(isOpenCase);
  const overdueMs = milestones.filter((m) => milestoneFlags(m).overdue);
  const recon = data.reconciliation.filter((r) => r.packageId === pkg.id);
  const dates = [...milestones.map((m) => m.submittedAt), ...data.harvests.filter((h) => h.packageId === pkg.id && h.date).map((h) => h.date)].filter(Boolean).map((x) => String(x).slice(0, 10)).sort();
  const lastReport = dates[dates.length - 1] || null;
  const pct = pkg.amount ? Math.round((pkg.raised / pkg.amount) * 100) : 0;
  return {
    tranches, milestones, invs, risks, openRisks, overdueMs, recon, lastReport, fundingPct: Math.min(100, pct),
    highRisks: openRisks.filter((r) => r.severity === 'High'),
    failedRecon: recon.filter((r) => r.status === 'Failed'),
    openDiff: recon.filter((r) => r.status !== 'Confirmed' && r.internal !== r.provider && r.status !== 'Pending'),
    overdueDist: data.distributions.filter((x) => x.packageId === pkg.id && x.status === 'Overdue'),
    maxOverdueDays: overdueMs.reduce((m, x) => Math.max(m, milestoneFlags(x).overdueDays), 0),
    delayed: milestones.filter((m) => m.status === 'Delayed'),
    ...projectAmounts(data, pkg, tranches, invs),
  };
}

export function packageHealth(data, pkg) {
  const m = packageMetrics(data, pkg);
  const risk = []; const watch = [];
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  if (pkg.status === 'Paused') risk.push('New disbursements are suspended while the project is paused.');
  if (m.highRisks.length) risk.push(`${plural(m.highRisks.length, 'open high severity risk case')}.`);
  if (m.failedRecon.length) risk.push('A payment failed at the financial partner and is not resolved.');
  if (m.maxOverdueDays > 14) risk.push(`A milestone is ${m.maxOverdueDays} days overdue.`);
  else if (m.overdueMs.length >= 2) risk.push(`${plural(m.overdueMs.length, 'milestone')} overdue.`);
  else if (m.overdueMs.length === 1) watch.push(`A milestone is ${m.maxOverdueDays} days overdue.`);
  if (m.delayed.length && !m.overdueMs.length) watch.push(`${plural(m.delayed.length, 'milestone')} marked Delayed.`);
  const lowRisks = m.openRisks.filter((r) => r.severity !== 'High');
  if (lowRisks.length) watch.push(`${plural(lowRisks.length, 'open risk case')} (not a finding of fault).`);
  if (m.overdueDist.length) watch.push(`${plural(m.overdueDist.length, 'repayment or distribution')} overdue.`);
  if (m.openDiff.length) watch.push(`${plural(m.openDiff.length, 'payment')} with an unresolved difference at reconciliation.`);
  if (pkg.status === 'Active' && m.lastReport && -dayDiff(m.lastReport) > 30) watch.push(`No report for ${-dayDiff(m.lastReport)} days.`);
  if (pkg.status === 'Open for Funding' && m.fundingPct < 50 && pkg.closingDate && dayDiff(pkg.closingDate) <= 60) watch.push(`Only ${m.fundingPct}% confirmed with ${Math.max(0, dayDiff(pkg.closingDate))} days to the closing date.`);
  const tag = risk.length ? 'At risk' : watch.length ? 'Watch' : 'On track';
  return {
    tag, tone: tag === 'At risk' ? 'red' : tag === 'Watch' ? 'amber' : 'green', rank: tag === 'At risk' ? 2 : tag === 'Watch' ? 1 : 0,
    reasons: tag === 'On track' ? ['No overdue milestones, open cases or unresolved differences.'] : [...risk, ...watch], metrics: m,
  };
}

export const HEALTH_RULES = {
  atRisk: ['The project is paused', 'A high severity risk case is open', 'A payment failed at the financial partner', 'A milestone is more than 14 days overdue, or two or more are overdue'],
  watch: ['One milestone is overdue or marked Delayed', 'Any other risk case is open', 'A repayment or distribution is overdue', 'A reconciliation difference is unresolved', 'No report for 30 days on an active project', 'Funding is under 50% with the closing date close'],
};
