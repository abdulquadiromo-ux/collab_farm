import { Link } from 'react-router-dom';
import { Check, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Banner, Chip, Progress } from '../ui/index.js';
import { formatNaira, formatNumber, cx } from '../../utils/format.js';
import { CATEGORY_TONES, PACKAGE_TIER_DOT } from '../../utils/status.js';
import { budgetReconciles } from '../../utils/rules.js';
import { STAGES, stageIndex, GLOSSARY } from './constants.jsx';
import { trancheAmounts } from './logic.js';

export function UnverifiedBanner({ what = 'create or submit funding requests' }) {
  return (
    <Banner tone="warn" title="Your cooperative is not verified yet">
      You cannot {what} until CollabFarm has verified your cooperative. <Link to="/onboarding/status">Check your verification status</Link>.
    </Banner>
  );
}

// Short plain-language glossary. `terms` are keys of GLOSSARY.
export function PlainTerms({ terms, title = 'In plain words' }) {
  return (
    <Banner tone="green" title={title}>
      <ul className="coopb-terms">
        {terms.map((t) => (
          <li key={t}><strong>{GLOSSARY[t].term}:</strong> {GLOSSARY[t].text}</li>
        ))}
      </ul>
    </Banner>
  );
}

// The three PRD rules, kept visible where money is shown.
export function ThreeRules() {
  return (
    <Banner tone="info" title="Three things to keep in mind">
      <ul className="coopb-terms">
        <li>A commitment is not received money. Only amounts confirmed by the financial partner count.</li>
        <li>Approval is not a guarantee of success or returns. Expected returns are estimates.</li>
        <li>A failed crop is not fraud. Genuine losses are assessed on evidence and the signed agreement.</li>
      </ul>
    </Banner>
  );
}

export function TierDot({ tier }) {
  return <span className="dot" style={{ background: PACKAGE_TIER_DOT[tier] || 'var(--grey-600)' }} aria-hidden="true" />;
}

export function CategoryChip({ category }) {
  const t = CATEGORY_TONES[category] || CATEGORY_TONES.Custom;
  return <Chip bg={t.bg} fg={t.fg} border={t.border}>{category}</Chip>;
}

// Eight-stage package timeline (Draft to Completed). `status` is the package status.
const ATTENTION_HINT = { 'Changes Requested': 'Reviewer asked for changes', Paused: 'Temporarily paused' };

export function StatusFlow({ status }) {
  const idx = stageIndex(status);
  const attention = ['Changes Requested', 'Paused'].includes(status);
  const bad = status === 'Failed or Terminated';
  return (
    <ol className="coopb-flow" aria-label={`Package progress, current status ${status}`}>
      {STAGES.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? (bad ? 'bad' : attention ? 'attn' : status === 'Completed' ? 'done' : 'current') : 'todo';
        return (
          <li key={s.id} className={cx('coopb-flow__step', `coopb-flow__step--${state}`)} aria-current={i === idx ? 'step' : undefined}>
            <span className="coopb-flow__dot">{state === 'done' ? <Check size={14} strokeWidth={3} /> : state === 'bad' ? '!' : i + 1}</span>
            <span className="coopb-flow__text">
              <span className="coopb-flow__label">{i === idx && attention ? status : s.id}</span>
              <span className="coopb-flow__hint">{i === idx && attention ? ATTENTION_HINT[status] || s.hint : s.hint}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// Live reconciliation of the budget against the package amount (PRD 7.1).
export function ReconPanel({ budget, amount }) {
  const target = Number(amount) || 0;
  const r = budgetReconciles({ budget, amount: target });
  const ok = r.ok && target > 0;
  const over = r.difference < 0;
  const pct = target ? Math.min(100, Math.round((r.total / target) * 100)) : 0;
  return (
    <div className={cx('coopb-recon', ok ? 'coopb-recon--ok' : over ? 'coopb-recon--bad' : 'coopb-recon--warn')} role="status" aria-live="polite">
      <div className="coopb-recon__grid">
        <div><div className="caption muted">Package amount</div><div className="coopb-recon__num">{formatNaira(target)}</div></div>
        <div><div className="caption muted">Budget total</div><div className="coopb-recon__num">{formatNaira(r.total)}</div></div>
        <div>
          <div className="caption muted">{over ? 'Over budget by' : 'Remaining to plan'}</div>
          <div className="coopb-recon__num">{formatNaira(Math.abs(r.difference))}</div>
        </div>
      </div>
      <Progress value={pct} tone={ok ? 'green' : over ? 'red' : 'amber'} label="Budget planned against package amount" />
      <div className="coopb-recon__msg">
        {ok && <><CheckCircle2 size={18} /> The budget matches the package amount. It reconciles.</>}
        {!ok && target === 0 && <><Info size={18} /> Enter the total package amount to check the budget.</>}
        {!ok && target > 0 && !over && <><AlertCircle size={18} /> {formatNaira(r.difference)} of the package amount is not planned yet. Add or increase items until the remaining amount is zero. You cannot submit until it reconciles.</>}
        {!ok && target > 0 && over && <><AlertCircle size={18} /> The items add up to more than the package amount. Reduce an item or raise the package amount. You cannot submit until it reconciles.</>}
      </div>
    </div>
  );
}

// Read-only funding plan: how the target is split into the four tranches (shared platform rule).
export function FundingPlanTable({ amount, category }) {
  const rows = trancheAmounts(amount, category);
  return (
    <div className="table-wrap">
      <table className="data-table coopb-plan">
        <thead>
          <tr><th>Tranche</th><th className="right">Share</th><th className="right">Amount</th><th>Released after</th></tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.number}>
              <td><div className="strong">T{t.number} {t.name}</div><div className="cell-sub">{t.purpose}</div></td>
              <td className="right nowrap">{Math.round(t.share * 100)}%</td>
              <td className="right nowrap strong">{formatNaira(t.amount)}</td>
              <td><ul className="coopb-conds">{t.conditions.map((c) => <li key={c}>{c}</li>)}</ul></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td className="strong">Total</td><td className="right strong">100%</td><td className="right strong nowrap">{formatNaira(rows.reduce((s, t) => s + t.amount, 0))}</td><td /></tr>
        </tfoot>
      </table>
    </div>
  );
}

export function MoneyStat({ label, value, sub, tone }) {
  return (
    <div className={cx('coopb-stat', tone && `coopb-stat--${tone}`)}>
      <div className="caption muted">{label}</div>
      <div className="coopb-stat__value">{value}</div>
      {sub && <div className="caption muted">{sub}</div>}
    </div>
  );
}

export const countLabel = (n, one, many) => `${formatNumber(n)} ${n === 1 ? one : many || `${one}s`}`;
