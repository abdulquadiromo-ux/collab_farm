import { AlertCircle, Check, Sprout, TrendingUp } from 'lucide-react';

const OPTIONS = [
  { id: 'cooperative', title: 'Cooperative', icon: Sprout, text: 'Register your farmers and apply for funding for approved projects.' },
  { id: 'investor', title: 'Investor', icon: TrendingUp, text: 'Review verified projects and commit funds through a regulated partner.' },
];

// Two selectable cards built on real radio inputs, so keyboard and screen reader use works without extra code.
export default function RoleCards({ value, onChange, error }) {
  return (
    <fieldset className="auth-fieldset">
      <legend className="field__label">I am registering as<span className="req" aria-hidden="true">*</span></legend>
      <div className="auth-choice-grid">
        {OPTIONS.map((o) => {
          const Icon = o.icon;
          return (
            <label key={o.id} className="auth-choice">
              <input type="radio" name="role" value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} aria-invalid={error ? true : undefined} />
              <span className="auth-choice__body">
                <span className="auth-choice__top">
                  <span className="auth-choice__icon"><Icon size={20} aria-hidden="true" /></span>
                  <span className="auth-choice__tick" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
                </span>
                <span className="strong">{o.title}</span>
                <span className="caption muted">{o.text}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error && <span className="field__error" role="alert"><AlertCircle size={14} />{error}</span>}
    </fieldset>
  );
}
