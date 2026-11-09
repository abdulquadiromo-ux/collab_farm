import { Check, Circle } from 'lucide-react';
import { passwordChecks, passwordStrength } from './authUtils.js';
import { cx } from '../../utils/format.js';

// Strength meter. The label is text as well as colour, so colour is never the only signal.
export function PasswordStrength({ value }) {
  const { score, label } = passwordStrength(value);
  return (
    <div className="auth-strength" aria-live="polite">
      <div className="auth-strength__bars" data-score={score} aria-hidden="true">
        {[1, 2, 3, 4].map((n) => <span key={n} className={cx(n <= score && 'is-on')} />)}
      </div>
      <span className="caption muted">
        {value ? `Password strength: ${label}.` : 'Use at least 8 characters. A mix of letters, numbers and symbols is stronger.'}
      </span>
    </div>
  );
}

// Rules checklist. Each rule shows met or not met as text for screen readers.
export function PasswordRules({ value }) {
  const checks = passwordChecks(value);
  return (
    <ul className="auth-rules" aria-label="Password rules">
      {checks.map((c) => (
        <li key={c.id} className={cx(c.ok && 'is-ok')}>
          {c.ok ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
          <span>{c.label}{!c.required && ' (recommended)'}</span>
          <span className="sr-only">{c.ok ? ', done' : ', not done yet'}</span>
        </li>
      ))}
    </ul>
  );
}
