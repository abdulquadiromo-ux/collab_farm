import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, CheckCircle2, XCircle, ShieldAlert, BookOpen, UserCheck, ChevronDown, ArrowLeft } from 'lucide-react';
import { Breadcrumb, EmptyState, LinkButton, Modal, Button, TextAreaField, StatusPill } from '../ui/index.js';
import { formatDateShort, formatDateTime, cx } from '../../utils/format.js';
import { adminRoleLabel } from './lib.js';

/* A date or date time, depending on what the record stored. */
export function At({ value }) {
  if (!value) return <>-</>;
  return <>{String(value).length > 10 ? formatDateTime(value) : formatDateShort(value)}</>;
}
export const atText = (value) => (!value ? '-' : String(value).length > 10 ? formatDateTime(value) : formatDateShort(value));

/* Shown when the :id in the URL has no record. */
export function PageMissing({ crumbs, title, text, backTo, backLabel }) {
  return (
    <div className="page">
      {crumbs && <Breadcrumb items={crumbs} />}
      <EmptyState title={title} action={<LinkButton to={backTo} variant="outline-green"><ArrowLeft size={16} />{backLabel}</LinkButton>}>{text}</EmptyState>
    </div>
  );
}

/* One calm line of plain-language help under a heading. */
export function InfoLine({ children, className }) {
  return <p className={cx('admb-infoline', className)}><Info size={16} aria-hidden="true" /><span>{children}</span></p>;
}

/* Collapsible plain-language glossary. Native details element, so it works with the keyboard. */
export function Glossary({ title = 'Plain-language guide', terms }) {
  return (
    <details className="admb-glossary">
      <summary><BookOpen size={18} aria-hidden="true" /><span>{title}</span><ChevronDown size={16} className="admb-glossary__chev" aria-hidden="true" /></summary>
      <dl className="admb-glossary__list">
        {terms.map(([t, d]) => (<div key={t}><dt>{t}</dt><dd>{d}</dd></div>))}
      </dl>
    </details>
  );
}

/* [label, value][] rendered like the ConfirmDialog summary. */
export function SummaryList({ summary }) {
  return (
    <dl className="info-list info-list--compact admb-summary">
      {summary.map(([k, v]) => (<div className="info-row" key={k}><dt>{k}</dt><dd>{v}</dd></div>))}
    </dl>
  );
}

/* Dialog that collects a written reason and shows what is about to happen. */
export function ReasonModal({ open, onClose, title, intro, summary, label = 'Reason', hint, placeholder, minLength = 10, confirmLabel = 'Confirm', tone = 'primary', onSubmit, children }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setText(''); setError(''); setBusy(false); } }, [open]);
  const submit = async () => {
    if (text.trim().length < minLength) { setError(`Write at least ${minLength} characters so the reason is clear in the audit trail.`); return; }
    setBusy(true);
    try { await onSubmit(text.trim()); } finally { setBusy(false); }
  };
  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={title}
      white
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={busy} block>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={submit} loading={busy} block>{confirmLabel}</Button>
        </>
      )}
    >
      <div className="stack">
        {intro && <p className="small muted">{intro}</p>}
        {summary && <SummaryList summary={summary} />}
        {children}
        <TextAreaField label={label} required hint={hint} placeholder={placeholder} value={text} error={error} onChange={(e) => { setText(e.target.value); if (error) setError(''); }} />
      </div>
    </Modal>
  );
}

/* Pass, fail or waived rows. The icon and the word both carry the state, never colour alone. */
export function CheckRows({ items }) {
  return (
    <ul className="admb-checks">
      {items.map((c) => {
        const state = c.ok ? 'pass' : c.waived ? 'waived' : c.advisory ? 'warn' : 'fail';
        const Icon = state === 'pass' ? CheckCircle2 : state === 'waived' || state === 'warn' ? ShieldAlert : XCircle;
        return (
          <li key={c.id} className={`admb-checks__row admb-checks__row--${state}`}>
            <Icon size={20} aria-hidden="true" />
            <div>
              <div className="admb-checks__label">{c.label}<span className="admb-checks__state">{state === 'pass' ? 'Met' : state === 'waived' ? 'Waived by recorded exception' : state === 'warn' ? 'Warning' : 'Not met'}</span></div>
              {c.detail && <div className="cell-sub">{c.detail}</div>}
              {!c.ok && c.links?.length > 0 && (
                <div className="admb-checks__links">{c.links.map((l) => (<Link key={l.to} to={l.to}>Review: {l.label}</Link>))}</div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function HealthPill({ health }) {
  return <StatusPill tone={health.tone}>{health.tag}</StatusPill>;
}

/* Four small bars, one per tranche, coloured by status. */
export function TrancheChain({ tranches }) {
  return (
    <div className="admb-chain" role="img" aria-label={tranches.map((t) => `Tranche ${t.number} ${t.status}`).join(', ')}>
      {tranches.length === 0 && <span className="cell-sub">No tranches yet</span>}
      {tranches.map((t) => (
        <span key={t.id} className="admb-chain__item" title={`Tranche ${t.number} ${t.name}: ${t.status}`}>
          <span className={`admb-chain__seg admb-chain__seg--${t.status.toLowerCase().replace(/\s+/g, '-')}`} />
          <span className="admb-chain__n">T{t.number}</span>
        </span>
      ))}
    </div>
  );
}

/* Who the signed in administrator is acting as. Helps when switching demo accounts. */
export function ActingAs({ user }) {
  return (
    <div className="admb-actingas">
      <UserCheck size={18} aria-hidden="true" />
      <span>Acting as <strong>{user.name}</strong>, {adminRoleLabel(user)}. Use the Account menu (top right) to switch to the other administrator.</span>
    </div>
  );
}

export function PkgLink({ id, name }) {
  return <Link to={`/admin/monitoring/${id}`} onClick={(e) => e.stopPropagation()}>{name}</Link>;
}

/* Amount with the difference shown in words as well as colour. */
export function DiffAmount({ diff, status, correction }) {
  if (diff === 0) return <span className="admb-diff admb-diff--ok"><CheckCircle2 size={14} aria-hidden="true" /> Matches</span>;
  if (status === 'Confirmed' && correction) return <span className="admb-diff admb-diff--note">Corrected by entry</span>;
  return <span className="admb-diff">{diff > 0 ? 'Partner reports less' : 'Partner reports more'}</span>;
}

export function RuleList({ items, title }) {
  return (
    <div className="admb-rules">
      {title && <h3 className="admb-rules__title">{title}</h3>}
      <ul>{items.map((r) => (<li key={r}>{r}</li>))}</ul>
    </div>
  );
}
