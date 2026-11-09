import { Link } from 'react-router-dom';
import { ChevronRight, Check } from 'lucide-react';
import { cx } from '../../utils/format.js';

// items: [{ id, label, count? }]
export function Tabs({ items, value, onChange, auto = false, label = 'Sections' }) {
  return (
    <div className={cx('tabs', auto && 'tabs--auto')} role="tablist" aria-label={label}>
      {items.map((t) => (
        <button key={t.id} role="tab" type="button" className="tabs__tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}>
          {t.label}{t.count != null ? ` (${t.count})` : ''}
        </button>
      ))}
    </div>
  );
}

// items: [{ id, label, icon }]
export function PillTabs({ items, value, onChange, label = 'Categories' }) {
  return (
    <div className="pill-tabs" role="tablist" aria-label={label}>
      {items.map((t) => (
        <button key={t.id} role="tab" type="button" className="pill-tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}>
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// items: [{ label, to? }] last one is the current page
export function Breadcrumb({ items }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <span key={it.label} className="row" style={{ gap: 12 }}>
            {it.to && !last ? <Link to={it.to}>{it.label}</Link> : <span className={last ? 'current' : undefined} aria-current={last ? 'page' : undefined}>{it.label}</span>}
            {!last && <ChevronRight size={16} />}
          </span>
        );
      })}
    </nav>
  );
}

export function PageHeader({ title, subtitle, actions, greeting }) {
  return (
    <header className="page-header">
      <div>
        <h1 className={cx('page-header__title', greeting && 'greeting')}>{title}</h1>
        {subtitle && <p className="page-header__sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

// steps: ['Details', 'Documents', ...]
export function Stepper({ steps, current }) {
  return (
    <ol className="stepper" aria-label="Progress" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : '';
        return (
          <li key={s} className={cx('stepper__step', state && `stepper__step--${state}`)} aria-current={i === current ? 'step' : undefined}>
            <span className="stepper__num">{state === 'done' ? <Check size={14} /> : i + 1}</span>
            <span>{s}</span>
            {i < steps.length - 1 && <span className="stepper__bar" />}
          </li>
        );
      })}
    </ol>
  );
}
