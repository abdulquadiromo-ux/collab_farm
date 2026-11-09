import { PhotoFill } from '../common/Photo.jsx';
import { cx } from '../../utils/format.js';
import { NEVER_CONFUSE } from './content.jsx';

// Compact hero used at the top of every public information page.
export function PubHero({ eyebrow, title, lead, actions, photo = 'hero-farm.jpg', theme = 'field', children }) {
  return (
    <section className="pub-hero" aria-labelledby="pub-hero-title">
      <div className="pub-hero__bg pub-quiet" aria-hidden="true"><PhotoFill name={photo} theme={theme} /></div>
      <div className="container pub-hero__inner">
        {eyebrow && <span className="pub-eyebrow">{eyebrow}</span>}
        <h1 id="pub-hero-title">{title}</h1>
        {lead && <p className="pub-hero__lead">{lead}</p>}
        {actions && <div className="pub-hero__actions">{actions}</div>}
        {children}
      </div>
    </section>
  );
}

// A page band with an optional centred heading. tone: '' | 'white' | 'tint'
export function PubSection({ id, title, sub, tone, tight, left, children, className, labelledBy }) {
  const headId = id ? `${id}-title` : undefined;
  return (
    <section id={id} className={cx('pub-section', tone && `pub-section--${tone}`, tight && 'pub-section--tight', className)} aria-labelledby={title ? (labelledBy || headId) : undefined}>
      <div className="container">
        {title && (
          <div className={cx('pub-sec-head', left && 'pub-sec-head--left')}>
            <h2 id={headId}>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export function IconTile({ icon, tone, size = 44 }) {
  return <span className={cx('pub-icon', tone && `pub-icon--${tone}`)} style={{ width: size, height: size }} aria-hidden="true">{icon}</span>;
}

// The three PRD rules, always shown together in one highlighted box.
export function RulesBox({ title = 'Three things never to confuse', intro }) {
  return (
    <div className="pub-rules" role="note" aria-label={title}>
      <h2 className="pub-rules__title">{title}</h2>
      {intro && <p className="pub-rules__intro">{intro}</p>}
      <ol className="pub-rules__list">
        {NEVER_CONFUSE.map((r, i) => (
          <li key={r.title}>
            <span className="pub-rules__num" aria-hidden="true">{i + 1}</span>
            <div>
              <h3>{r.title}</h3>
              <p>{r.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Closing call to action over a photo.
export function CtaBand({ title, text, children, photo = 'cta-field.jpg', theme = 'seedling', note }) {
  return (
    <section className="pub-cta container" aria-labelledby="pub-cta-title">
      <div className="pub-cta__panel">
        <div className="pub-cta__bg pub-quiet" aria-hidden="true"><PhotoFill name={photo} theme={theme} /></div>
        <div className="pub-cta__content">
          <h2 id="pub-cta-title">{title}</h2>
          {text && <p>{text}</p>}
          <div className="pub-cta__actions">{children}</div>
          {note && <p className="pub-cta__note">{note}</p>}
        </div>
      </div>
    </section>
  );
}
