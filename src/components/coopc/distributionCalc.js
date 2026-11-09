import { PROFIT_ILLUSTRATION } from '../../data/operations.js';
import { profitShare } from '../../utils/rules.js';
import { formatNaira } from '../../utils/format.js';
import { sumBy } from './helpers.js';

// Builds the step by step calculation for one distribution record. Every row says where its figure comes from.
// When the package has no confirmed sales and confirmed costs yet, the pool figures use the PRD illustration and are labelled so.
export function buildCalculation(dist, pkg, data) {
  const contribution = Number(dist.contribution) || 0;
  const paid = Number(dist.amountPaid) || 0;
  const due = Number(dist.amountDue) || 0;

  if (dist.type === 'Principal repayment') {
    return {
      kind: 'principal',
      illustrative: false,
      rows: [
        { step: 1, label: 'Confirmed contribution', why: 'Money the financial partner confirmed receiving from this investor for this package.', source: 'Investment record, confirmed by the partner', value: formatNaira(contribution) },
        { step: 2, label: 'Share of original money to repay', why: 'Principal is the investor\'s original money. It is repaid in full on schedule and is never counted as profit.', source: dist.basis || 'Agreement terms (illustrative, configurable)', value: '100%' },
        { step: 3, label: 'Principal due', why: 'Contribution x share to repay.', source: 'Calculated', value: formatNaira(contribution), total: true },
        { step: 4, label: 'Amount due on the distribution record', why: 'The figure the admin reviewer will approve for payment.', source: `Record ${dist.ref}`, value: formatNaira(due) },
      ],
      check: { ok: contribution === due, difference: contribution - due },
    };
  }

  const sales = data.sales.filter((s) => s.packageId === pkg.id && s.paymentStatus === 'Confirmed');
  const costs = data.expenses.filter((e) => e.packageId === pkg.id && e.status === 'Confirmed');
  const confirmedSales = sumBy(sales, (s) => s.gross);
  const confirmedCosts = sumBy(costs, (e) => e.amount);
  const real = confirmedSales > 0 && confirmedCosts > 0;
  const P = PROFIT_ILLUSTRATION;
  const inputs = real
    ? { verifiedSales: confirmedSales, eligibleCosts: confirmedCosts, otherDeductions: sumBy(sales, (s) => s.deductions) }
    : { verifiedSales: P.verifiedSales, eligibleCosts: P.eligibleCosts, otherDeductions: P.otherDeductions };
  const m = /(\d+(?:\.\d+)?)\s*%/.exec(dist.basis || '');
  const pct = m ? Number(m[1]) : P.investorSharePct;
  const calc = profitShare({ ...inputs, investorSharePct: pct });
  const totalConfirmed = Number(pkg.raised) || contribution;
  const share = totalConfirmed ? Math.min(1, contribution / totalConfirmed) : 0;
  const mine = Math.round(calc.investorShare * share);
  const tag = real ? '' : 'Illustrative: ';
  const rows = [
    { step: 1, label: 'Verified sales', why: 'Sales confirmed by the partner and reconciled by an admin. Recorded but unconfirmed sales are left out.', source: real ? `${sales.length} confirmed sale${sales.length === 1 ? '' : 's'} for this package` : `${tag}PRD example figure`, value: formatNaira(inputs.verifiedSales) },
    { step: 2, label: 'Less: eligible costs', why: 'Approved costs backed by evidence.', source: real ? `${costs.length} confirmed expense${costs.length === 1 ? '' : 's'}` : `${tag}PRD example figure`, value: `- ${formatNaira(inputs.eligibleCosts)}` },
    { step: 3, label: 'Less: other deductions and reserves', why: 'Sale deductions and any reserve held back under the agreement.', source: real ? 'Deductions on the confirmed sales' : `${tag}PRD example figure`, value: `- ${formatNaira(inputs.otherDeductions)}` },
    { step: 4, label: 'Distributable profit', why: 'Verified sales less costs, deductions and reserves. This can be zero.', source: 'Calculated with the profit share rule', value: formatNaira(calc.distributable), total: true },
    { step: 5, label: "Investors' agreed share", why: m ? 'Share taken from the basis written on this record.' : 'No share is written on this record, so the example share is used.', source: m ? `${dist.basis} (illustrative, configurable)` : 'Example share, set in the signed agreement', value: `${pct}%` },
    { step: 6, label: "Investors' collective share", why: 'Distributable profit x agreed share, for all investors in the package together.', source: 'Calculated', value: formatNaira(calc.investorShare) },
    { step: 7, label: "This investor's contribution share", why: 'This investor\'s confirmed contribution divided by all confirmed contributions to the package.', source: `${formatNaira(contribution)} of ${formatNaira(totalConfirmed)} confirmed`, value: `${(share * 100).toFixed(1)}%` },
    { step: 8, label: 'Share worked out here', why: 'Collective share x this investor\'s contribution share.', source: 'Calculated', value: formatNaira(mine), total: true },
    { step: 9, label: 'Amount due on the distribution record', why: 'The figure the admin reviewer will approve for payment.', source: `Record ${dist.ref}`, value: formatNaira(due) },
  ];
  return { kind: 'profit', illustrative: !real, rows, check: { ok: Math.abs(mine - due) <= 1, difference: mine - due } };
}
