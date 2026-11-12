import { Link } from 'react-router-dom';
import { Clock, ShieldCheck, XCircle } from 'lucide-react';
import { Banner, StatusPill } from '../ui/index.js';
import { cx } from '../../utils/format.js';

// Shown on every cooperative page that is limited for a cooperative that has not been verified yet.
export function UnverifiedBanner({ coop, children }) {
  if (!coop || coop.status === 'Verified') return null;
  return (
    <Banner tone="warn" title={`Your cooperative is not verified yet (status: ${coop.status})`}>
      {children || 'You can add farmers and farms, which are saved as Pending. Funding requests, bulk imports and disbursement requests unlock once a CollabFarm reviewer verifies your cooperative.'}
      {' '}<Link to="/onboarding/cooperative" className="strong">Review cooperative profile</Link>
    </Banner>
  );
}

// Uploaded and Verified must look clearly different (PRD: a document that was uploaded is not a document that was checked).
export function DocStatusPill({ status }) {
  const verified = status === 'Verified';
  const rejected = status === 'Rejected';
  if (verified) return <StatusPill tone="green" className="coopa-doc coopa-doc--verified"><ShieldCheck size={14} />Verified</StatusPill>;
  if (rejected) return <StatusPill tone="red" className="coopa-doc"><XCircle size={14} />Rejected</StatusPill>;
  return <StatusPill tone="amber" className="coopa-doc coopa-doc--uploaded"><Clock size={14} />Uploaded, awaiting review</StatusPill>;
}

export function DocLegend() {
  return (
    <p className="caption muted coopa-legend">
      <span className="coopa-legend__item"><DocStatusPill status="Uploaded" /></span> means we received the file.
      {' '}<span className="coopa-legend__item"><DocStatusPill status="Verified" /></span> means a CollabFarm reviewer checked it.
    </p>
  );
}

export function PersonCell({ name, sub, to, Avatar }) {
  return (
    <div className="cell-person">
      <Avatar name={name} />
      <div>
        {to ? <Link to={to} className={cx('coopa-name')}>{name}</Link> : <span>{name}</span>}
        {sub && <div className="cell-sub" style={{ fontWeight: 400 }}>{sub}</div>}
      </div>
    </div>
  );
}
