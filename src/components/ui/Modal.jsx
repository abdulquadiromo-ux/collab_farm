import { useEffect, useRef } from 'react';
import { X, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from './Button.jsx';
import { cx } from '../../utils/format.js';

export function Modal({ open, onClose, title, children, footer, wide, white, labelledBy }) {
  const ref = useRef(null);
  // Keep the latest onClose in a ref so an inline callback never re-runs the focus effect (which would steal focus while typing).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={labelledBy || 'modal-title'} className={cx('modal', wide && 'modal--wide', white && 'modal--white')}>
        {title && (
          <div className="modal__head">
            <h2 className="modal__title" id="modal-title">{title}</h2>
            <button type="button" className="modal__close" onClick={onClose} aria-label="Close"><X size={16} /></button>
          </div>
        )}
        {children}
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

// Confirmation before sensitive actions. tone: danger | green | amber
// `summary` is an optional [label, value][] list. The PRD requires recipient, amount, purpose and approval status
// to be shown before any financial action is confirmed.
export function ConfirmDialog({ open, onClose, onConfirm, title, message, warning, summary, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger', loading, icon }) {
  const Icon = icon || (tone === 'danger' ? Trash2 : tone === 'amber' ? AlertTriangle : ShieldCheck);
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="confirm-title"
      footer={(
        <>
          <Button variant="outline" onClick={onClose} block>{cancelLabel}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} block>{confirmLabel}</Button>
        </>
      )}
    >
      <div className={cx('modal__icon', `modal__icon--${tone === 'danger' ? 'red' : tone}`)}><Icon size={26} /></div>
      <div className="modal__body">
        <h2 id="confirm-title">{title}</h2>
        {message && <p>{message}</p>}
        {summary && (
          <dl className="info-list info-list--compact" style={{ textAlign: 'left', background: 'var(--white)', border: '1px solid var(--grey-200)', borderRadius: 12, padding: '0 14px' }}>
            {summary.map(([k, v]) => (
              <div className="info-row" key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        )}
        {warning && (
          <div className="banner banner--warn" style={{ textAlign: 'left' }}>
            <AlertTriangle size={18} /><div>{warning}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}
