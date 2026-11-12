import { useId, useRef, useState } from 'react';
import { Eye, EyeOff, Search, UploadCloud, AlertCircle, X } from 'lucide-react';
import { cx } from '../../utils/format.js';

// Wraps a control with a label, hint and error. `children` receives { id, describedBy, invalid }.
export function Field({ label, required, optional, hint, error, className, children }) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cx('field', className)}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
          {required && <span className="req" aria-hidden="true">*</span>}
          {optional && <span className="opt">(Optional)</span>}
        </label>
      )}
      {children({ id, describedBy, invalid: !!error })}
      {error ? (
        <span className="field__error" id={`${id}-err`} role="alert"><AlertCircle size={14} />{error}</span>
      ) : hint ? (
        <span className="field__hint" id={`${id}-hint`}>{hint}</span>
      ) : null}
    </div>
  );
}

export function TextField({ label, required, optional, hint, error, className, inputClassName, icon, ...rest }) {
  return (
    <Field label={label} required={required} optional={optional} hint={hint} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className={cx('input-wrap', icon && 'input-wrap--left')}>
          <input id={id} className={cx('input', invalid && 'input--error', inputClassName)} aria-invalid={invalid || undefined} aria-describedby={describedBy} aria-required={required || undefined} {...rest} />
          {icon && <span className="input-wrap__icon">{icon}</span>}
        </div>
      )}
    </Field>
  );
}

export function PasswordField({ label = 'Password', required, hint, error, className, ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} required={required} hint={hint} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className="input-wrap">
          <input id={id} type={show ? 'text' : 'password'} className={cx('input', invalid && 'input--error')} aria-invalid={invalid || undefined} aria-describedby={describedBy} {...rest} />
          <button type="button" className="input-wrap__icon" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        </div>
      )}
    </Field>
  );
}

// options: ['A', 'B'] or [{value, label}]
export function SelectField({ label, required, optional, hint, error, options = [], placeholder, className, ...rest }) {
  return (
    <Field label={label} required={required} optional={optional} hint={hint} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <select id={id} className={cx('select', invalid && 'input--error')} aria-invalid={invalid || undefined} aria-describedby={describedBy} {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
          })}
        </select>
      )}
    </Field>
  );
}

export function TextAreaField({ label, required, optional, hint, error, className, ...rest }) {
  return (
    <Field label={label} required={required} optional={optional} hint={hint} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea id={id} className={cx('textarea', invalid && 'input--error')} aria-invalid={invalid || undefined} aria-describedby={describedBy} {...rest} />
      )}
    </Field>
  );
}

// Naira amount input. `value` and `onChange(number)` use plain numbers.
export function MoneyField({ label, required, optional, hint, error, value, onChange, className, placeholder = '0', ...rest }) {
  return (
    <Field label={label} required={required} optional={optional} hint={hint} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className="money">
          <span className="input money__cur" style={{ display: 'grid', placeItems: 'center' }} aria-hidden="true">{'₦'}</span>
          <input
            id={id}
            inputMode="numeric"
            className={cx('input', invalid && 'input--error')}
            placeholder={placeholder}
            value={value === '' || value == null ? '' : Number(value).toLocaleString('en-NG')}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, '');
              onChange?.(digits === '' ? '' : Number(digits));
            }}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            {...rest}
          />
        </div>
      )}
    </Field>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search', className, ...rest }) {
  return (
    <div className={cx('search', className)}>
      <input type="search" className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} {...rest} />
      <Search size={20} />
    </div>
  );
}

// Compact select used in table toolbars. options: [{value,label}] | string[]
export function FilterSelect({ value, onChange, allLabel, options = [], label }) {
  return (
    <select className="select select--filter" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label || allLabel}>
      {allLabel && <option value="">{allLabel}</option>}
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        return <option key={opt.value} value={opt.value}>{opt.label}</option>;
      })}
    </select>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <span className="toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="toggle__track" />
      <span className="toggle__thumb" />
    </span>
  );
}

export function SettingRow({ title, description, checked, onChange }) {
  return (
    <div className="setting-row">
      <div>
        <div className="strong small">{title}</div>
        {description && <div className="caption muted">{description}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

export function Checkbox({ checked, onChange, children, error }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}{error && <span className="field__error" role="alert"><AlertCircle size={14} />{error}</span>}</span>
    </label>
  );
}

// File selection. Keep the original File available to API-backed forms.
export function FileDrop({ label, required, accept = 'JPG, PNG or PDF (Max 5MB)', files = [], onFiles, multiple, error, prompt = 'Click to upload or drag and drop', includeFile = false }) {
  const ref = useRef(null);
  const [over, setOver] = useState(false);
  const handle = (list) => {
    const arr = Array.from(list || []).map((f) => ({ name: f.name, size: f.size, ...(includeFile ? { file: f } : {}) }));
    if (arr.length) onFiles?.(multiple ? [...files, ...arr] : arr.slice(0, 1));
  };
  return (
    <div className="field">
      {label && <span className="field__label">{label}{required && <span className="req" aria-hidden="true">*</span>}</span>}
      <div
        className={cx('dropzone', over && 'dropzone--over')}
        role="button"
        tabIndex={0}
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
      >
        <UploadCloud size={28} />
        <div className="small strong">{prompt}</div>
        <div className="caption muted">{accept}</div>
        <span className="btn btn--outline btn--sm" style={{ pointerEvents: 'none' }}>Choose File</span>
        <input ref={ref} type="file" hidden multiple={multiple} onChange={(e) => handle(e.target.files)} />
      </div>
      {files.length > 0 && (
        <ul className="stack-sm" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {files.map((f, i) => (
            <li key={f.name + i} className="row between small" style={{ background: 'var(--primary-50)', borderRadius: 8, padding: '8px 12px' }}>
              <span className="dropzone__file">{f.name}</span>
              <button type="button" className="kebab" aria-label={`Remove ${f.name}`} onClick={() => onFiles?.(files.filter((_, j) => j !== i))}><X size={16} /></button>
            </li>
          ))}
        </ul>
      )}
      {error && <span className="field__error" role="alert"><AlertCircle size={14} />{error}</span>}
    </div>
  );
}
