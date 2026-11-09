// Pure business-rule helpers that keep the simulated workflows consistent with the PRD.
// They never mutate state and never talk to a server.

export const sum = (arr, pick = (x) => x) => arr.reduce((s, x) => s + (Number(pick(x)) || 0), 0);

// PRD 7.1: budget items must reconcile with the approved funding plan.
export function budgetReconciles(pkg) {
  const total = sum(pkg.budget || [], (b) => b.amount);
  return { total, target: pkg.amount, difference: pkg.amount - total, ok: total === pkg.amount };
}

// PRD 7.2: total allocations may not exceed the approved budget, and no duplicate allocations.
export function allocationCheck(pkg, allocations) {
  const total = sum(allocations, (a) => a.amount);
  const ids = allocations.map((a) => a.farmerId);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  return { total, remaining: pkg.amount - total, overBudget: total > pkg.amount, duplicates: [...new Set(duplicates)] };
}

// The six amounts that must always be tracked separately (PRD 7 and 9).
export function sixAmounts(inv) {
  return [
    { key: 'intended', label: 'Intended to invest', value: inv.intended },
    { key: 'committed', label: 'Formally committed', value: inv.committed },
    { key: 'confirmed', label: 'Confirmed received by partner', value: inv.confirmed },
    { key: 'available', label: 'Available for disbursement', value: inv.available },
    { key: 'disbursed', label: 'Actually disbursed', value: inv.disbursed },
    { key: 'repaid', label: 'Repaid or distributed', value: inv.repaid },
  ];
}

// PRD 7.3: a tranche may be released only when the previous one is released and its evidence is approved,
// or an authorised exception is formally recorded.
export function canReleaseTranche(tranche, tranches, milestones, exception = false) {
  const prev = tranches.find((t) => t.packageId === tranche.packageId && t.number === tranche.number - 1);
  const prevOk = !prev || prev.status === 'Released';
  const ms = milestones.filter((m) => m.trancheId === tranche.id);
  const evidenceOk = ms.length > 0 && ms.every((m) => m.status === 'Approved');
  return { allowed: exception || (prevOk && evidenceOk), prevOk, evidenceOk, exception };
}

// Maker-checker: the person who proposes or first approves may not also give the final payment approval.
export function needsSecondApprover(amount, limits) {
  return amount > (limits?.singleApproverMax ?? 500000);
}
export function canSecondApprove(disbursement, userName) {
  const first = disbursement.approvals?.[0]?.by;
  return !!first && first !== userName && (disbursement.approvals?.length || 0) < 2;
}

// PRD 9.3 and 9.4: distribution calculations must be traceable to inputs.
export function profitShare({ verifiedSales, eligibleCosts, otherDeductions, investorSharePct }) {
  const distributable = verifiedSales - eligibleCosts - otherDeductions;
  return { distributable, investorShare: Math.round((distributable * investorSharePct) / 100) };
}

export function packageFunding(pkg) {
  const pct = pkg.amount ? Math.round((pkg.raised / pkg.amount) * 100) : 0;
  const committedPct = pkg.amount ? Math.round((pkg.committed / pkg.amount) * 100) : 0;
  return { pct, committedPct, awaitingConfirmation: Math.max(0, pkg.committed - pkg.raised) };
}

// Statuses an investor may browse (approved projects only).
export const INVESTOR_VISIBLE = ['Open for Funding', 'Funding Target Reached', 'Active', 'Completed', 'Ready for Disbursement'];
