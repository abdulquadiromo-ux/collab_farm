import { Chip } from '../ui/index.js';
import { PROFIT_ILLUSTRATION } from '../../data/operations.js';
import { profitShare } from '../../utils/rules.js';
import { formatNaira } from '../../utils/format.js';

// Worked example from the PRD (section 9.4). It is an illustration only: not a default, not a promise of returns.
export default function ProfitIllustration() {
  const p = PROFIT_ILLUSTRATION;
  const calc = profitShare({ verifiedSales: p.verifiedSales, eligibleCosts: p.eligibleCosts, otherDeductions: p.otherDeductions, investorSharePct: p.investorSharePct });
  const rows = [
    ['Verified sales (confirmed and reconciled)', formatNaira(p.verifiedSales)],
    ['Less: eligible costs', formatNaira(p.eligibleCosts)],
    ['Less: other deductions and reserves', formatNaira(p.otherDeductions)],
    ['Distributable profit', formatNaira(calc.distributable)],
    ["Investors' agreed share (example)", `${p.investorSharePct}%`],
    ["Investors' collective share", formatNaira(calc.investorShare)],
  ];
  return (
    <section className="coopc-illus" aria-label="Profit share illustration">
      <div className="row-wrap between">
        <h2 style={{ fontSize: 18 }}>How a profit share could be worked out</h2>
        <Chip bg="var(--white)" fg="var(--grey-900)" border="var(--gold-500)">Illustration only</Chip>
      </div>
      <p className="small" style={{ marginTop: 6 }}>
        Profit sharing means investors receive an agreed share of what is left after costs, not a fixed amount. If sales are low or costs are high, there may be little or no profit to share. These numbers are an example to explain the method. They are not a default, a forecast or a promise of returns. The real terms are set in the signed agreement and are configurable.
      </p>
      <div className="coopc-illus__rows">
        {rows.map(([k, v]) => (<div className="coopc-illus__row" key={k}><span>{k}</span><strong>{v}</strong></div>))}
      </div>
      <p className="caption muted" style={{ marginTop: 12 }}>
        Repaying an investor's original money (principal) is a separate item from profit. It is never counted as profit.
      </p>
    </section>
  );
}
