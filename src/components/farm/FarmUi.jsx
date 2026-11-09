import { Link } from 'react-router-dom';
import { Info, ArrowRight, UserX, CheckCircle2, Clock, AlertCircle, CircleDot, Circle } from 'lucide-react';
import { EmptyState, PageSkeleton } from '../ui/index.js';
import { statusTone } from '../../utils/status.js';
import { cx } from '../../utils/format.js';

// Shown while a page "loads", or when the signed in user has no farmer record.
export function farmerGate(ctx, loading) {
  if (loading) return <PageSkeleton />;
  if (!ctx.farmer) {
    return (
      <div className="page farm-page">
        <EmptyState
          icon={<UserX size={28} />}
          title="We could not find your farmer record"
          action={<Link className="btn btn--primary farm-btn" to="/farmer/help">Get help</Link>}
        >
          Your cooperative may still be adding you. Please contact them or CollabFarm support.
        </EmptyState>
      </div>
    );
  }
  return null;
}

// A short plain-language line that explains a word or number.
export function Explain({ children, className }) {
  return (
    <p className={cx('farm-explain', className)}>
      <Info size={16} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

const TONE_BY_LABEL = {
  'More information needed': 'amber',
  Submitted: 'blue',
  'Under review': 'amber',
  'Under Review': 'amber',
  Accepted: 'green',
  Completed: 'green',
  'In Progress': 'amber',
  'Not Started': 'gray',
  Delayed: 'red',
  Received: 'green',
  'Waiting to be confirmed': 'amber',
  'Problem reported': 'red',
};
const TONE_ICON = { green: CheckCircle2, amber: Clock, red: AlertCircle, blue: CircleDot, gray: Circle, purple: Circle };

// Large status chip. The icon and the words both carry the meaning, so colour is never the only signal.
export function StatusChip({ children, tone }) {
  const t = tone || TONE_BY_LABEL[children] || statusTone(children);
  const Icon = TONE_ICON[t] || Circle;
  return (
    <span className={cx('pill', `pill--${t}`, 'farm-chip')}>
      <Icon size={16} aria-hidden="true" />
      {children}
    </span>
  );
}

// A big number with a one-line explanation. Becomes a tappable card when `to` is given.
export function BigStat({ icon, label, value, explain, chip, to, tone, small }) {
  const body = (
    <>
      <span className="farm-stat__top">
        <span className={cx('kpi-card__icon', tone && `kpi-card__icon--${tone}`)}>{icon}</span>
        <span className="farm-stat__label">{label}</span>
        {to && <ArrowRight size={18} className="farm-stat__arrow" aria-hidden="true" />}
      </span>
      <span className={cx('farm-stat__value', small && 'farm-stat__value--small')}>{value}</span>
      {chip}
      {explain && <span className="farm-stat__explain">{explain}</span>}
    </>
  );
  return to
    ? <Link to={to} className="farm-stat farm-stat--link">{body}</Link>
    : <div className="farm-stat">{body}</div>;
}

export function ProgressRing({ done, total, size = 132, label }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <svg className="farm-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label || `${done} of ${total} done`}>
      <circle className="farm-ring__track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
      <circle className="farm-ring__bar" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text className="farm-ring__text" x="50%" y="50%" textAnchor="middle" dominantBaseline="central">{done} of {total}</text>
    </svg>
  );
}

// A card row used for inputs, payments, obligations and reports. Content on the left, actions below on phones.
export function ItemCard({ icon, title, meta, chip, children, actions, tone }) {
  return (
    <li className={cx('farm-item', tone && `farm-item--${tone}`, !icon && 'farm-item--noicon')}>
      <div className="farm-item__head">
        {icon && <span className="farm-item__icon" aria-hidden="true">{icon}</span>}
        <div className="farm-item__title">
          <h3>{title}</h3>
          {meta && <p className="muted small">{meta}</p>}
        </div>
        {chip}
      </div>
      {children && <div className="farm-item__body">{children}</div>}
      {actions && <div className="farm-actions">{actions}</div>}
    </li>
  );
}
