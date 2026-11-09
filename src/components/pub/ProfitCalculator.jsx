import { useId, useMemo, useState } from 'react';
import { Calculator, RotateCcw } from 'lucide-react';
import { Banner, Button, MoneyField } from '../ui/index.js';
import { formatNaira } from '../../utils/format.js';
import { profitShare } from '../../utils/rules.js';
import { PROFIT_ILLUSTRATION } from '../../data/operations.js';

const MAX = 1000000000;
const PRESETS = [
  { id: 'prd', label: 'Illustration from the guide', values: { verifiedSales: PROFIT_ILLUSTRATION.verifiedSales, eligibleCosts: PROFIT_ILLUSTRATION.eligibleCosts, otherDeductions: PROFIT_ILLUSTRATION.otherDeductions, pct: PROFIT_ILLUSTRATION.investorSharePct } },
  { id: 'weak', label: 'Weak harvest', values: { verifiedSales: 9000000, eligibleCosts: 8500000, otherDeductions: 300000, pct: PROFIT_ILLUSTRATION.investorSharePct } },
  { id: 'fail', label: 'Crop failure', values: { verifiedSales: 3000000, eligibleCosts: 10000000, otherDeductions: 0, pct: PROFIT_ILLUSTRATION.investorSharePct } },
];

const clampMoney = (v) => (v === '' ? '' : Math.min(MAX, Math.max(0, Number(v) || 0)));

/**
 * Illustration only. Uses profitShare() from utils/rules.js, the same function the platform uses for distributions.
 * It shows profit sharing only. Repayment of capital is separate and is set in the signed agreement.
 */
export function ProfitCalculator() {
  const uid = useId();
  const start = PRESETS[0].values;
  const [sales, setSales] = useState(start.verifiedSales);
  const [costs, setCosts] = useState(start.eligibleCosts);
  const [other, setOther] = useState(start.otherDeductions);
  const [pct, setPct] = useState(start.pct);
  const [mine, setMine] = useState(10);
  const [preset, setPreset] = useState('prd');

  const apply = (p) => {
    setSales(p.values.verifiedSales); setCosts(p.values.eligibleCosts); setOther(p.values.otherDeductions); setPct(p.values.pct);
    setPreset(p.id);
  };
  const touch = (setter) => (v) => { setter(clampMoney(v)); setPreset(''); };

  const calc = useMemo(() => {
    const s = Number(sales) || 0; const c = Number(costs) || 0; const o = Number(other) || 0;
    const r = profitShare({ verifiedSales: s, eligibleCosts: c, otherDeductions: o, investorSharePct: pct });
    const profit = Math.max(0, r.distributable);
    const share = Math.max(0, r.investorShare);
    const loss = r.distributable < 0 ? Math.abs(r.distributable) : 0;
    const yours = Math.round((share * mine) / 100);
    const base = Math.max(s, c + o, 1);
    return { s, c, o, profit, share, loss, yours, seg: { costs: (c / base) * 100, other: (o / base) * 100, profit: (profit / base) * 100 } };
  }, [sales, costs, other, pct, mine]);

  return (
    <div className="pub-calc card card--pad">
      <div className="pub-calc__head">
        <span className="pub-icon pub-icon--gold" aria-hidden="true"><Calculator size={22} /></span>
        <div>
          <h3>Profit share calculator</h3>
          <p className="small muted">See how a profit share is worked out, step by step. Change the numbers or try a preset.</p>
        </div>
      </div>

      <div className="pub-calc__flag" role="note">
        <strong>Illustration only, not a promise.</strong> These are example numbers. Real amounts depend on the harvest, the market and the terms of your signed agreement.
      </div>

      <div className="pub-calc__presets" role="group" aria-label="Example scenarios">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" className="pub-chipbtn" aria-pressed={preset === p.id} onClick={() => apply(p)}>{p.label}</button>
        ))}
        <button type="button" className="pub-chipbtn pub-chipbtn--ghost" onClick={() => apply(PRESETS[0])}><RotateCcw size={14} aria-hidden="true" />Reset</button>
      </div>

      <div className="pub-calc__grid">
        <div className="pub-calc__inputs">
          <MoneyField label="Verified sales" hint="Sales where the buyer's payment is confirmed" value={sales} onChange={touch(setSales)} />
          <MoneyField label="Eligible costs" hint="Approved costs of the project" value={costs} onChange={touch(setCosts)} />
          <MoneyField label="Other deductions" hint="Reserves or fees allowed by the agreement" value={other} onChange={touch(setOther)} />

          <div className="field">
            <label className="field__label" htmlFor={`${uid}-pct`}>Investors' agreed share of profit: <strong>{pct}%</strong></label>
            <input id={`${uid}-pct`} className="pub-range" type="range" min="0" max="100" step="1" value={pct} onChange={(e) => { setPct(Number(e.target.value)); setPreset(''); }} aria-valuetext={`${pct} percent`} />
            <span className="field__hint">Set in each agreement. All investors in a package share this together.</span>
          </div>

          <div className="field">
            <label className="field__label" htmlFor={`${uid}-mine`}>Your part of all investor funds: <strong>{mine}%</strong></label>
            <input id={`${uid}-mine`} className="pub-range" type="range" min="1" max="100" step="1" value={mine} onChange={(e) => setMine(Number(e.target.value))} aria-valuetext={`${mine} percent`} />
            <span className="field__hint">For example, if you fund one tenth of the package, this is 10%.</span>
          </div>
        </div>

        <div className="pub-calc__out" aria-live="polite">
          <div className="pub-calc__bar" role="img" aria-label={`Of ${formatNaira(calc.s)} in sales, ${formatNaira(calc.c)} goes to costs, ${formatNaira(calc.o)} to other deductions and ${formatNaira(calc.profit)} is profit`}>
            <span className="pub-calc__seg pub-calc__seg--costs" style={{ width: `${calc.seg.costs}%` }} />
            <span className="pub-calc__seg pub-calc__seg--other" style={{ width: `${calc.seg.other}%` }} />
            <span className="pub-calc__seg pub-calc__seg--profit" style={{ width: `${calc.seg.profit}%` }} />
          </div>
          <div className="pub-calc__legend">
            <span><i className="dot" style={{ background: 'var(--grey-700)' }} />Costs</span>
            <span><i className="dot" style={{ background: 'var(--gold-500)' }} />Other deductions</span>
            <span><i className="dot" style={{ background: 'var(--green-500)' }} />Profit</span>
          </div>

          <dl className="pub-calc__rows">
            <div><dt>Verified sales</dt><dd>{formatNaira(calc.s)}</dd></div>
            <div><dt>Less eligible costs</dt><dd>{formatNaira(calc.c)}</dd></div>
            <div><dt>Less other deductions</dt><dd>{formatNaira(calc.o)}</dd></div>
            <div className="pub-calc__sum"><dt>Profit available to share</dt><dd>{formatNaira(calc.profit)}</dd></div>
            <div><dt>Investors' share ({pct}%)</dt><dd>{formatNaira(calc.share)}</dd></div>
            <div className="pub-calc__sum pub-calc__sum--big"><dt>Your part ({mine}% of investor funds)</dt><dd>{formatNaira(calc.yours)}</dd></div>
          </dl>

          {calc.loss > 0 ? (
            <Banner tone="danger" title="No profit to share in this scenario">
              Costs and deductions are {formatNaira(calc.loss)} more than verified sales, so there is nothing to share. Capital can also be at risk. What you get back then depends on your agreement.
            </Banner>
          ) : calc.profit === 0 ? (
            <Banner tone="warn" title="No profit to share in this scenario">Sales only cover costs and deductions. Nothing is left to share as profit.</Banner>
          ) : (
            <Banner tone="info">This is profit only. Your original capital is repaid separately as your agreement says, and it can be reduced if the project loses money.</Banner>
          )}
        </div>
      </div>
    </div>
  );
}
