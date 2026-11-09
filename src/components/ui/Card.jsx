import { ArrowUp, ArrowDown, AlertCircle, Info, CheckCircle2, AlertTriangle, Check, Inbox } from 'lucide-react';
import { cx, initials } from '../../utils/format.js';
import { statusTone } from '../../utils/status.js';

export function Card({ pad = true, tone, className, children, ...rest }) {
  return (
    <section className={cx('card', pad && 'card--pad', tone && `card--${tone}`, className)} {...rest}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="card__head">
      <div>
        <h2 className="card__title">{title}</h2>
        {subtitle && <p className="muted small">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionHead({ icon, title, right }) {
  return (
    <div className="section-head">
      <span className="section-head__icon">{icon}</span>
      <h2 className="section-head__title">{title}</h2>
      {right && <div style={{ marginLeft: 'auto' }}>{right}</div>}
    </div>
  );
}

// delta: { value: '12', label: 'in the last 30 days', dir: 'up' | 'down' }
export function KpiCard({ icon, label, value, pill, delta, tone, action, children }) {
  return (
    <div className="kpi-card">
      <div className="kpi-card__top">
        <span className={cx('kpi-card__icon', tone && `kpi-card__icon--${tone}`)}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="kpi-card__value">
        <span>{value}</span>
        {pill && <span className="kpi-pill">{pill}</span>}
      </div>
      {delta && (
        <div className="kpi-card__delta">
          <span className={delta.dir === 'down' ? 'down' : 'up'} style={{ display: 'inline-flex', alignItems: 'center' }}>
            {delta.dir === 'down' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
            {delta.value}
          </span>
          <span>{delta.label}</span>
        </div>
      )}
      {children}
      {action}
    </div>
  );
}

// One bordered container with vertical dividers. cells: [{icon,label,value,sub,delta}]
export function KpiStrip({ cells, columns }) {
  const cls = cx('kpi-strip', columns === 6 && 'kpi-strip--6', columns === 3 && 'kpi-strip--3');
  return (
    <div className={cls}>
      {cells.map((c) => (
        <div className="kpi-strip__cell" key={c.label}>
          <div className="kpi-card__top">
            <span className="kpi-card__icon">{c.icon}</span>
            <span>{c.label}</span>
          </div>
          <div className="kpi-card__value">{c.value}</div>
          {c.delta && (
            <div className="kpi-card__delta">
              <span className={c.delta.dir === 'down' ? 'down' : 'up'} style={{ display: 'inline-flex', alignItems: 'center' }}>
                {c.delta.dir === 'down' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                {c.delta.value}
              </span>
              <span>{c.delta.label}</span>
            </div>
          )}
          {c.sub && <div className="cell-sub">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}

export function StatusPill({ children, tone, className }) {
  const t = tone || statusTone(children);
  return <span className={cx('pill', `pill--${t}`, className)}>{children}</span>;
}

export function Chip({ children, bg, fg, border }) {
  return <span className="chip" style={{ background: bg, color: fg, borderColor: border }}>{children}</span>;
}

const BANNER_ICONS = { info: Info, warn: AlertTriangle, danger: AlertCircle, success: CheckCircle2, green: Info };
export function Banner({ tone = 'info', title, children, className }) {
  const Icon = BANNER_ICONS[tone] || Info;
  return (
    <div className={cx('banner', `banner--${tone}`, className)} role={tone === 'danger' ? 'alert' : 'note'}>
      <Icon size={18} />
      <div>
        {title && <strong style={{ display: 'block' }}>{title}</strong>}
        {children}
      </div>
    </div>
  );
}

export function Progress({ value, tone, label }) {
  const v = Math.max(0, Math.min(100, value));
  const t = tone || (v >= 100 ? 'green' : v < 50 ? 'amber' : 'green');
  return (
    <div className="progress" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cx('progress__bar', t === 'amber' && 'progress__bar--amber', t === 'red' && 'progress__bar--red', t === 'dark' && 'progress__bar--dark')} style={{ width: `${v}%` }} />
    </div>
  );
}

const TONES = ['', 'avatar--tone-1', 'avatar--tone-2', 'avatar--tone-3', 'avatar--tone-4'];
// No remote photos: avatars are initials on a tinted circle. If `src` is given it is shown instead.
export function Avatar({ name = '', src, size, tone }) {
  const idx = tone ?? (name.length ? name.charCodeAt(0) % TONES.length : 0);
  return (
    <span className={cx('avatar', size && `avatar--${size}`, TONES[idx])} aria-hidden="true">
      {src ? <img src={src} alt="" /> : initials(name)}
    </span>
  );
}

// items: [[label, value], ...]
export function InfoList({ items, compact }) {
  return (
    <dl className={cx('info-list', compact && 'info-list--compact')}>
      {items.map(([k, v]) => (
        <div className="info-row" key={k}>
          <dt>{k}</dt>
          <dd>{v ?? '-'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Checklist({ items }) {
  return (
    <ul className="checklist">
      {items.map((t) => (
        <li key={t}><Check size={20} strokeWidth={3} style={{ background: 'var(--green-500)', color: '#fff', borderRadius: '50%', padding: 3, width: 22, height: 22 }} />{t}</li>
      ))}
    </ul>
  );
}

// items: [{title, meta, state: 'done' | 'active' | 'bad' | undefined, body}]
export function Timeline({ items }) {
  return (
    <ol className="timeline">
      {items.map((it, i) => (
        <li className="timeline__item" key={i}>
          <span className={cx('timeline__dot', it.state && `timeline__dot--${it.state}`)}>
            {it.state === 'done' ? <Check size={14} strokeWidth={3} /> : <span className="dot" style={{ background: 'currentColor', width: 6, height: 6 }} />}
          </span>
          <div>
            <div className="strong">{it.title}</div>
            {it.meta && <div className="cell-sub">{it.meta}</div>}
            {it.body && <div className="small" style={{ marginTop: 4 }}>{it.body}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="empty">
      <span className="empty__icon">{icon || <Inbox size={28} />}</span>
      <h3 style={{ color: 'var(--grey-1000)' }}>{title}</h3>
      {children && <p style={{ maxWidth: 420 }}>{children}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ h = 16, w = '100%', className }) {
  return <div className={cx('skeleton', className)} style={{ height: h, width: w }} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading">
      <Skeleton h={32} w={260} />
      <div className="kpi-grid">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} h={150} className="" />)}
      </div>
      <Skeleton h={320} />
    </div>
  );
}
