import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, FileUp, FileX2, FileQuestion, SearchX, Send } from 'lucide-react';
import { Avatar, Button, EmptyState, StatusPill, TextAreaField, LinkButton } from '../ui/index.js';
import { formatDateTime, formatDateShort } from '../../utils/format.js';

/** Missing record for an :id in the URL. */
export function MissingRecord({ title = 'We could not find that record', to, backLabel = 'Go back', children }) {
  return (
    <div className="page adma-page">
      <EmptyState icon={<SearchX size={28} />} title={title} action={<LinkButton to={to} variant="outline-green">{backLabel}</LinkButton>}>
        {children || 'It may have been removed or the link is out of date. Go back to the list and open it again.'}
      </EmptyState>
    </div>
  );
}

/** Uploaded and Verified must look clearly different, and never rely on colour alone. */
export function DocStatusPill({ status }) {
  if (status === 'Verified') return <StatusPill tone="green"><BadgeCheck size={14} />Verified</StatusPill>;
  if (status === 'Rejected') return <StatusPill tone="red"><FileX2 size={14} />Flagged</StatusPill>;
  if (status === 'Not uploaded') return <StatusPill tone="gray"><FileQuestion size={14} />Not uploaded</StatusPill>;
  return <StatusPill tone="gray"><FileUp size={14} />Uploaded</StatusPill>;
}

export function docStatusNote(d) {
  if (d.status === 'Verified') return d.reviewer ? `Checked by ${d.reviewer}${d.reviewedAt ? ` on ${formatDateShort(d.reviewedAt)}` : ''}` : 'Checked by a reviewer';
  if (d.status === 'Rejected') return d.flagReason ? `Flagged: ${d.flagReason}` : 'Flagged by a reviewer';
  if (d.status === 'Not uploaded') return 'Required before approval';
  return 'Received, not yet checked';
}

/** Small reviewer thread. Internal notes are not shown to the person being reviewed. */
export function NotesThread({ notes = [], onAdd, canAdd = true, placeholder = 'Write an internal note for other reviewers', emptyText = 'No notes yet.' }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const v = text.trim();
    if (v.length < 3) { setError('Write a short note before adding it.'); return; }
    setBusy(true);
    await onAdd?.(v);
    setBusy(false);
    setText('');
  };
  const kindLabel = { request: 'Sent to the person', decision: 'Decision', note: 'Internal note' };
  return (
    <div className="stack">
      {notes.length === 0 && <p className="small muted">{emptyText}</p>}
      {notes.length > 0 && (
        <ul className="adma-thread">
          {notes.map((n) => (
            <li key={n.id} className="adma-thread__item">
              <Avatar name={n.by} size="sm" />
              <div className="grow">
                <div className="row-wrap" style={{ gap: 8 }}>
                  <span className="strong small">{n.by}</span>
                  {n.fn && <span className="caption muted">{n.fn}</span>}
                  <span className="caption muted">{formatDateTime(n.at)}</span>
                  <span className={`adma-kind adma-kind--${n.kind || 'note'}`}>{kindLabel[n.kind || 'note']}</span>
                </div>
                <p className="small adma-thread__text">{n.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {canAdd && (
        <form onSubmit={submit} className="stack-sm" noValidate>
          <TextAreaField label="Add a note" value={text} onChange={(e) => { setText(e.target.value); if (error) setError(''); }} placeholder={placeholder} error={error} rows={3} hint="Internal notes are visible to administrators only." />
          <div><Button type="submit" variant="outline-green" size="sm" loading={busy}><Send size={14} />Add note</Button></div>
        </form>
      )}
    </div>
  );
}

/** Label and value stacked, used inside cards. */
export function Stat({ label, value, sub, tone }) {
  return (
    <div className={`adma-stat${tone ? ` adma-stat--${tone}` : ''}`}>
      <span className="adma-stat__label">{label}</span>
      <span className="adma-stat__value">{value}</span>
      {sub && <span className="adma-stat__sub">{sub}</span>}
    </div>
  );
}

/** A row for requirement lists such as "Cannot approve yet". */
export function ReadyList({ items }) {
  return (
    <ul className="adma-ready">
      {items.map((i) => (
        <li key={i.label} className={i.ok ? 'adma-ready--ok' : 'adma-ready--no'}>
          <span className="adma-ready__mark" aria-hidden="true">{i.ok ? '✓' : '•'}</span>
          <span>{i.label}{i.hint && <span className="caption muted" style={{ display: 'block' }}>{i.hint}</span>}</span>
          <span className="sr-only">{i.ok ? 'Done' : 'Not done'}</span>
        </li>
      ))}
    </ul>
  );
}

export function PersonLink({ to, children }) {
  return to ? <Link to={to} className="strong">{children}</Link> : <span className="strong">{children}</span>;
}
