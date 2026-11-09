import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, FileQuestion } from 'lucide-react';
import { Banner, Chip, EmptyState, KpiCard, StatusPill } from '../ui/index.js';
import { LinkButton } from '../ui/Button.jsx';
import { CATEGORY_TONES } from '../../utils/status.js';
import { formatNaira, cx } from '../../utils/format.js';
import { sixAmounts } from '../../utils/rules.js';
import { PKG_STATUS_LABEL, PKG_STATUS_CLASS, TX_STATUS_HELP } from './invData.js';

export function CategoryChip({ category }) {
  const t = CATEGORY_TONES[category] || CATEGORY_TONES.Custom;
  return <Chip bg={t.bg} fg={t.fg} border={t.border}>{category}</Chip>;
}

export function PkgStatusChip({ status }) {
  const label = PKG_STATUS_LABEL[status] || status;
  return <span className={cx('inv-chip', `inv-chip--${PKG_STATUS_CLASS[label] || 'active'}`)}>{label}</span>;
}

// Visible on every page that shows estimated or illustrative figures.
export function EstimateNote({ children, className }) {
  return (
    <Banner tone="info" className={className}>
      {children || 'Figures marked estimate or illustrative are not promises. Confirmed amounts are only those the financial partner has actually received. A commitment is not received money.'}
    </Banner>
  );
}

export function UnverifiedBanner({ investor }) {
  if (!investor || investor.status === 'Verified') return null;
  return (
    <Banner tone="warn" title="Your investor account is not verified yet">
      Status: {investor.status}. You can browse, but you cannot commit funds until verification is complete.{' '}
      <Link to="/onboarding/status" className="strong">View verification status</Link>.
    </Banner>
  );
}

export function MissingRecord({ title, text, to, label = 'Go back' }) {
  return (
    <div className="page">
      <Card404 title={title} text={text} to={to} label={label} />
    </div>
  );
}
function Card404({ title, text, to, label }) {
  return (
    <div className="card card--pad">
      <EmptyState icon={<FileQuestion size={28} />} title={title} action={<LinkButton to={to} variant="outline-green"><ArrowLeft size={16} />{label}</LinkButton>}>
        {text}
      </EmptyState>
    </div>
  );
}

// KPI card with a "View Details" link, like the Figma investor dashboard and wallet cards.
export function KpiLink({ icon, label, value, tone, to, linkLabel = 'View Details', dot, pill, children }) {
  return (
    <div className="inv-kpi-wrap">
      {dot && <span className="inv-kpi-dot" aria-hidden="true" />}
      <KpiCard
        icon={icon}
        label={label}
        value={value}
        tone={tone}
        pill={pill}
        action={to ? <Link to={to} className="kpi-card__link">{linkLabel}<ArrowRight size={16} /></Link> : null}
      >
        {children}
      </KpiCard>
    </div>
  );
}

const SIX_TEXT = {
  intended: ['Intended', 'The amount you planned to invest. A plan only.'],
  committed: ['Committed', 'The amount you formally signed up for. Not yet received money.'],
  confirmed: ['Confirmed received', 'Money the financial partner confirmed it received.'],
  available: ['Available for disbursement', 'Confirmed money that can be released once milestones are approved.'],
  disbursed: ['Disbursed', 'Money actually paid out to suppliers, farmers or the cooperative.'],
  repaid: ['Repaid or distributed', 'Money paid back to you as repayment or profit share.'],
};

// The six amounts as a step diagram. `inv` is an investment-like object (a record, or portfolio totals).
export function SixAmountsDiagram({ inv, compact = false }) {
  const rows = sixAmounts(inv);
  return (
    <ol className={cx('inv-six', compact && 'inv-six--compact')}>
      {rows.map((r, i) => {
        const [title, help] = SIX_TEXT[r.key];
        const real = r.key === 'confirmed' || r.key === 'available' || r.key === 'disbursed' || r.key === 'repaid';
        return (
          <li key={r.key} className="inv-six__step">
            <span className="inv-six__num" aria-hidden="true">{i + 1}</span>
            <div className="inv-six__title">{title}</div>
            <div className="inv-six__value">{formatNaira(r.value)}</div>
            {!compact && <div className="caption muted">{help}</div>}
            {!compact && <span className={cx('inv-six__tag', real ? 'inv-six__tag--real' : 'inv-six__tag--plan')}>{real ? 'Partner confirmed money' : 'Not received money'}</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function TxStatusLegend() {
  return (
    <dl className="inv-legend">
      {Object.entries(TX_STATUS_HELP).map(([k, v]) => (
        <div key={k} className="inv-legend__row">
          <dt><StatusPill>{k}</StatusPill></dt>
          <dd className="small muted">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
