import { Link } from 'react-router-dom';
import { CheckCircle2, UserPen, TrendingUp, ShieldAlert, ArrowLeft } from 'lucide-react';
import { EmptyState, StatusPill } from '../ui/index.js';
import { cx } from '../../utils/format.js';
import { roleLabel } from './shrUtils.js';

// Shown when a record exists but the signed in user may not see it, or when the record is missing.
export function NoAccess({ title = 'You do not have access', children, backTo, backLabel = 'Go back' }) {
  return (
    <div className="page">
      <h1 className="sr-only">Access restricted</h1>
      <Card404 title={title} backTo={backTo} backLabel={backLabel} icon={<ShieldAlert size={28} />}>{children}</Card404>
    </div>
  );
}

export function NotFoundRecord({ title = 'We could not find that record', children, backTo, backLabel = 'Go back' }) {
  return (
    <div className="page">
      <h1 className="sr-only">Record not found</h1>
      <Card404 title={title} backTo={backTo} backLabel={backLabel}>{children}</Card404>
    </div>
  );
}

function Card404({ title, children, backTo, backLabel, icon }) {
  return (
    <div className="card card--pad">
      <EmptyState
        icon={icon}
        title={title}
        action={backTo ? <Link className="btn btn--outline" to={backTo}><ArrowLeft size={16} />{backLabel}</Link> : null}
      >
        {children}
      </EmptyState>
    </div>
  );
}

// Role chip: text plus a tone so colour is never the only signal.
const ROLE_TONE = { admin: 'purple', cooperative: 'green', investor: 'blue', farmer: 'amber', system: 'gray' };
export function RolePill({ role }) {
  return <StatusPill tone={ROLE_TONE[role] || 'gray'}>{roleLabel(role)}</StatusPill>;
}

// Row of toggle chips used for quick filters. options: [{ value, label, count? }]
export function FilterChips({ options, value, onChange, label }) {
  return (
    <div className="shr-chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="shr-chip" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}{o.count != null && <span className="shr-chip__count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------- confirmed / estimate / user-submitted labels used by Reports ----------
export const BASIS = {
  Confirmed: { icon: CheckCircle2, cls: 'shr-basis--confirmed', text: 'Confirmed by a reviewer or the financial partner' },
  Estimate: { icon: TrendingUp, cls: 'shr-basis--estimate', text: 'A projection or illustration. Not a promise' },
  'User-submitted': { icon: UserPen, cls: 'shr-basis--user', text: 'Reported by a user. Not yet verified' },
};

export function BasisBadge({ basis }) {
  const b = BASIS[basis] || BASIS['User-submitted'];
  const Icon = b.icon;
  return <span className={cx('shr-basis', b.cls)} title={b.text}><Icon size={13} aria-hidden="true" />{basis}</span>;
}

export function BasisLegend() {
  return (
    <div className="shr-legend" role="note" aria-label="How to read the labels on this report">
      {Object.keys(BASIS).map((k) => (
        <div key={k} className="shr-legend__item"><BasisBadge basis={k} /><span className="small muted">{BASIS[k].text}.</span></div>
      ))}
    </div>
  );
}
