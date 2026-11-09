import { needsSecondApprover, profitShare, sum } from '../../utils/rules.js';
import { formatNaira, formatDateShort } from '../../utils/format.js';
import { dayDiff, otherAdmin, adminRoleLabel } from './lib.js';

/* Pure helpers for the Distributions page. Repayment of capital is never confused with profit. */

export const isProfit = (d) => d.type === 'Profit distribution';
export const isPaid = (d) => d.status === 'Confirmed' || (d.amountPaid || 0) >= d.amountDue;
export const outstanding = (d) => Math.max(0, d.amountDue - (d.amountPaid || 0));
export const pastDue = (d) => !isPaid(d) && !!d.dueDate && dayDiff(d.dueDate) < 0;
export const isOverdueDist = (d) => !isPaid(d) && (d.status === 'Overdue' || pastDue(d));
export const typeLabel = (d) => (isProfit(d) ? 'Profit share' : 'Capital repayment');

export function distApprovalPlan(d, limits) {
  const required = needsSecondApprover(d.amountDue, limits) ? 2 : 1;
  const have = (d.approvals || []).length;
  return { required, have, complete: have >= required, secondRequired: required === 2 };
}

export const investmentFor = (data, d) => data.investments.find((i) => i.investorId === d.investorId && i.packageId === d.packageId);
export const complaintFor = (data, d) => data.complaints.find((c) => c.distributionId === d.id && c.status !== 'Resolved') || data.complaints.find((c) => c.distributionId === d.id);

/* Sales of the same project. A profit share is only payable once every recorded sale is confirmed by the partner. */
export function saleGate(data, d) {
  const sales = data.sales.filter((s) => s.packageId === d.packageId);
  const confirmed = sales.filter((s) => s.paymentStatus === 'Confirmed');
  const waiting = sales.filter((s) => s.paymentStatus !== 'Confirmed');
  return { sales, confirmed, waiting, ok: confirmed.length > 0 && waiting.length === 0 };
}

/* Inputs for the calculation, taken from confirmed records only. The reviewer may adjust them. */
export function calcDefaults(data, d) {
  const pkg = data.packages.find((p) => p.id === d.packageId);
  const { confirmed } = saleGate(data, d);
  const costs = data.expenses.filter((e) => e.packageId === d.packageId && e.status === 'Confirmed');
  const sharePct = Number(String(d.basis || '').match(/(\d+(?:\.\d+)?)\s*%/)?.[1]) || '';
  const base = pkg?.raised || d.contribution || 0;
  const ratio = base > 0 ? Math.min(1, d.contribution / base) : 1;
  return {
    verifiedSales: sum(confirmed, (s) => s.gross - (s.outstanding || 0)),
    eligibleCosts: sum(costs, (e) => e.amount),
    otherDeductions: sum(confirmed, (s) => s.deductions || 0),
    sharePct,
    ratio,
    base,
    confirmedSales: confirmed,
    costRows: costs,
  };
}

/* The expected amount from the inputs, and how far it is from the amount due. */
export function runCalc(d, inputs) {
  if (!isProfit(d)) {
    const expected = d.contribution || 0;
    return { kind: 'principal', expected, variance: d.amountDue - expected };
  }
  const pct = Number(inputs.sharePct);
  if (!Number.isFinite(pct) || inputs.sharePct === '' || pct < 0 || pct > 100) return { kind: 'profit', invalid: true, expected: 0, variance: 0 };
  const { distributable, investorShare } = profitShare({
    verifiedSales: Number(inputs.verifiedSales) || 0,
    eligibleCosts: Number(inputs.eligibleCosts) || 0,
    otherDeductions: Number(inputs.otherDeductions) || 0,
    investorSharePct: pct,
  });
  const expected = Math.max(0, Math.round(investorShare * inputs.ratio));
  return { kind: 'profit', distributable, investorShare, expected, variance: d.amountDue - expected };
}

/* Checks, gates and what the signed in administrator may do. */
export function evaluateDistribution(data, d, user) {
  const limits = data.platformSettings.approvalLimits;
  const plan = distApprovalPlan(d, limits);
  const profit = isProfit(d);
  const paid = isPaid(d);
  const disputed = (d.disputed || 0) > 0;
  const gate = saleGate(data, d);
  const saleOk = !profit || gate.ok;
  const calcDone = paid || !!d.calcReview;
  const approvedByMe = (d.approvals || []).some((a) => a.by === user.name);
  const complaint = complaintFor(data, d);
  const other = otherAdmin(data, user);
  const switchHint = other ? ` Use the Account menu to switch to ${other.name} (${adminRoleLabel(other)}).` : '';

  const checks = [
    { id: 'calc', label: 'Calculation reviewed by an administrator', ok: calcDone, detail: calcDone ? (d.calcReview ? `Reviewed by ${d.calcReview.by}.` : `Reviewed by ${d.reviewedBy || 'an administrator'}.`) : 'Not reviewed yet. Open Review calculation first.' },
  ];
  if (profit) {
    checks.push({
      id: 'sale', label: 'Related sales confirmed by the financial partner', ok: saleOk,
      detail: saleOk ? `${gate.confirmed.length} sale${gate.confirmed.length === 1 ? '' : 's'} confirmed.` : gate.sales.length === 0 ? 'No sale is recorded for this project yet. A recorded sale is not money received.' : `${gate.waiting.map((s) => `${s.ref} (${s.paymentStatus})`).join(', ')}. A recorded sale is not money received until the partner confirms it.`,
      links: saleOk ? [] : [{ to: `/admin/reconciliation?pkg=${d.packageId}&type=Sale%20receipt`, label: 'Sale receipt reconciliation' }],
    });
  }
  checks.push({
    id: 'dispute', label: 'No open dispute', ok: !disputed,
    detail: disputed ? `${formatNaira(d.disputed)} is disputed by the investor. Payment is held until the dispute is resolved.` : 'The investor has not disputed this amount.',
    links: disputed && complaint ? [{ to: `/admin/complaints/${complaint.id}`, label: `Complaint ${complaint.ref}` }] : [],
  });
  checks.push({
    id: 'approvals', label: plan.secondRequired ? 'Two different administrators approved the payment' : 'Payment approved by an administrator', ok: plan.complete || (paid && plan.have === 0),
    detail: paid && plan.have === 0
      ? 'Historical record. It was paid before approvals were tracked on this screen.'
      : `${plan.have} of ${plan.required} approval${plan.required === 1 ? '' : 's'} recorded.${plan.secondRequired ? ` The amount is above ${formatNaira(limits.secondApproverAbove)}, so a second, different approver is required.` : ''}`,
  });
  if (paid) {
    checks.push({
      id: 'double', label: 'Paid once only', ok: true,
      detail: `Paid${d.paidDate ? ` on ${formatDateShort(d.paidDate)}` : ''}${d.paymentRef ? `, reference ${d.paymentRef}` : ''}. A paid distribution cannot be paid again.`,
    });
  }

  const messages = [];
  const access = { canReview: false, canApprove: false, canPay: false, canResolve: false, messages };
  if (paid) return { plan, checks, access, profit, paid, disputed, gate, saleOk, calcDone, complaint, limits };

  if (disputed) {
    access.canResolve = true;
    messages.push('A dispute is open. Approval and payment are held until it is resolved.');
  }
  access.canReview = plan.have === 0 && saleOk;
  if (profit && !saleOk) messages.push('Payment is blocked until every sale for this project is confirmed in Reconciliation.');
  if (!disputed && saleOk) {
    if (!calcDone) messages.push('Review the calculation before anyone approves payment.');
    else if (!plan.complete) {
      if (approvedByMe) messages.push(`You already approved this payment. A different administrator must give the ${plan.have === 1 ? 'second ' : ''}approval.${switchHint}`);
      else access.canApprove = true;
    } else {
      access.canPay = true;
    }
  }
  return { plan, checks, access, profit, paid, disputed, gate, saleOk, calcDone, complaint, limits };
}

/* One short line for the table: what happens next. */
export function nextStep(ev, d) {
  if (ev.paid) return 'Paid and recorded';
  if (ev.disputed) return 'Dispute open, resolve first';
  if (ev.profit && !ev.saleOk) return 'Waiting for sale confirmation';
  if (!ev.calcDone) return 'Needs calculation review';
  if (!ev.plan.complete) return ev.plan.have === 0 ? 'Needs first approval' : 'Needs second approval';
  return 'Approved, ready to mark paid';
}
