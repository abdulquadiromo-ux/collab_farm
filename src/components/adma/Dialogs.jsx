import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Modal, Button, TextAreaField, TextField } from '../ui/index.js';
import { cx } from '../../utils/format.js';

// Keeps the Modal's close handler stable so typing in the dialog never re-runs the Modal focus effect.
function useStable(fn) {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...args) => ref.current?.(...args), []);
}

function Summary({ summary }) {
  if (!summary?.length) return null;
  return (
    <dl className="info-list info-list--compact adma-dialog-summary">
      {summary.map(([k, v]) => (
        <div className="info-row" key={k}><dt>{k}</dt><dd>{v}</dd></div>
      ))}
    </dl>
  );
}

/**
 * ConfirmDialog look-alike that also collects a written reason or message.
 * onConfirm(text) may be async. The text is required unless `required` is false.
 */
export function ReasonDialog({
  open, onClose, onConfirm, title, message, summary, warning, label = 'Reason', placeholder, hint, required = true,
  minLength = 10, confirmLabel = 'Confirm', tone = 'danger', icon, initialText = '',
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const close = useStable(() => { if (!busy) onClose?.(); });
  useEffect(() => { if (open) { setText(initialText); setError(''); setBusy(false); } }, [open, initialText]);
  const Icon = icon || (tone === 'danger' ? ShieldAlert : tone === 'amber' ? AlertTriangle : ShieldCheck);

  const submit = async () => {
    const v = text.trim();
    if (required && !v) { setError(`${label} is required. Write a short note so the person knows what happens next.`); return; }
    if (required && v.length < minLength) { setError(`Please write at least ${minLength} characters so the note is useful.`); return; }
    setBusy(true);
    try { await onConfirm?.(v); } finally { setBusy(false); }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      labelledBy="reason-title"
      footer={(
        <>
          <Button variant="outline" onClick={close} block disabled={busy}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={submit} loading={busy} block>{confirmLabel}</Button>
        </>
      )}
    >
      <div className={cx('modal__icon', `modal__icon--${tone === 'danger' ? 'red' : tone}`)}><Icon size={26} /></div>
      <div className="modal__body">
        <h2 id="reason-title">{title}</h2>
        {message && <p>{message}</p>}
        <Summary summary={summary} />
        <div style={{ textAlign: 'left' }}>
          <TextAreaField
            label={label}
            required={required}
            optional={!required}
            hint={hint}
            placeholder={placeholder}
            value={text}
            onChange={(e) => { setText(e.target.value); if (error) setError(''); }}
            error={error}
            rows={4}
          />
        </div>
        {warning && (
          <div className="banner banner--warn" style={{ textAlign: 'left' }}>
            <AlertTriangle size={18} /><div>{warning}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Strong confirmation: the confirm button stays disabled until the person types the phrase. */
export function TypedConfirmDialog({ open, onClose, onConfirm, title, message, phrase = 'RESET', confirmLabel = 'Confirm', summary, warning }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const close = useStable(() => { if (!busy) onClose?.(); });
  useEffect(() => { if (open) { setText(''); setBusy(false); } }, [open]);
  const ok = text.trim() === phrase;
  const submit = async () => {
    if (!ok) return;
    setBusy(true);
    try { await onConfirm?.(); } finally { setBusy(false); }
  };
  return (
    <Modal
      open={open}
      onClose={close}
      labelledBy="typed-title"
      footer={(
        <>
          <Button variant="outline" onClick={close} block disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={submit} loading={busy} disabled={!ok} block>{confirmLabel}</Button>
        </>
      )}
    >
      <div className="modal__icon modal__icon--red"><AlertTriangle size={26} /></div>
      <div className="modal__body">
        <h2 id="typed-title">{title}</h2>
        {message && <p>{message}</p>}
        <Summary summary={summary} />
        {warning && (
          <div className="banner banner--warn" style={{ textAlign: 'left' }}>
            <AlertTriangle size={18} /><div>{warning}</div>
          </div>
        )}
        <div style={{ textAlign: 'left' }}>
          <TextField
            label={`Type ${phrase} to continue`}
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
            hint="The confirm button stays off until the word matches exactly."
          />
        </div>
      </div>
    </Modal>
  );
}
