import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, ListOrdered } from 'lucide-react';
import { Banner } from '../ui/index.js';
import { formatDateShort, cx } from '../../utils/format.js';
import { PubHero } from './PubChrome.jsx';
import { LEGAL_UPDATED, LEGAL_VERSION } from './legal.js';

function Block({ b }) {
  if (b.p) return <p>{b.p}</p>;
  if (b.ul) return <ul>{b.ul.map((t) => <li key={t}>{t}</li>)}</ul>;
  if (b.ol) return <ol>{b.ol.map((t) => <li key={t}>{t}</li>)}</ol>;
  if (b.note) return <p className="pub-legal__note">{b.note}</p>;
  if (b.table) {
    return (
      <div className="table-wrap pub-legal__table">
        <table className="pub-table">
          <thead><tr>{b.table.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>{b.table.rows.map((r) => <tr key={r[0]}>{r.map((c, i) => (i === 0 ? <th key={c} scope="row" data-label={b.table.head[0]}>{c}</th> : <td key={c} data-label={b.table.head[i]}>{c}</td>))}</tr>)}</tbody>
        </table>
      </div>
    );
  }
  return null;
}

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Structured legal-style page with a table of contents that scrolls to each section.
 * The text is draft demo copy and the page says so near the top.
 */
export function LegalDoc({ doc, eyebrow, related = [] }) {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [active, setActive] = useState(doc.sections[0].id);
  const [tocOpen, setTocOpen] = useState(false);

  const lockUntil = useRef(0);

  const go = (id) => {
    navigate({ hash: `#${id}` }, { replace: true });
    setActive(id);
    setTocOpen(false);
    lockUntil.current = Date.now() + 1100;
    // Wait one tick so that a closing mobile contents list has already moved the page before we measure.
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    }, 40);
  };

  // Deep link: land on the section named in the URL hash.
  useEffect(() => {
    const id = hash ? hash.slice(1) : '';
    if (!id) return undefined;
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) { el.scrollIntoView(); setActive(id); }
    }, 120);
    return () => clearTimeout(t);
    // Only on first load of the page. Later hash changes come from our own clicks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Highlight the section being read: the last section whose top has passed the header, or the last one at the page end.
  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      if (Date.now() < lockUntil.current) return;
      const ids = doc.sections.map((sec) => sec.id);
      let current = ids[0];
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = ids[ids.length - 1];
      } else {
        ids.forEach((id) => {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= 160) current = id;
        });
      }
      setActive(current);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(compute); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    compute();
    // The page can still be changing height (fonts, photos) just after it opens, so measure again shortly after.
    const timers = [setTimeout(compute, 250), setTimeout(compute, 900)];
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [doc]);

  return (
    <>
      <PubHero eyebrow={eyebrow} title={doc.title} lead={doc.lead}>
        <p className="pub-hero__meta"><FileText size={16} aria-hidden="true" />{LEGAL_VERSION} · Last updated {formatDateShort(LEGAL_UPDATED)}</p>
      </PubHero>

      <div className="container pub-legal">
        <Banner tone="warn" title="Draft demo text">
          This page is draft text for a demonstration. It has not been reviewed by legal counsel and is not a binding legal document. It must be reviewed and approved before any real use.
        </Banner>

        <div className="pub-legal__grid">
          <aside className="pub-toc" aria-label="Table of contents">
            <button type="button" className="pub-toc__toggle" aria-expanded={tocOpen} aria-controls="pub-toc-list" onClick={() => setTocOpen((o) => !o)}>
              <ListOrdered size={18} aria-hidden="true" />On this page
            </button>
            <p className="pub-toc__title">On this page</p>
            <ol id="pub-toc-list" className={cx('pub-toc__list', tocOpen && 'pub-toc__list--open')}>
              {doc.sections.map((s, i) => (
                <li key={s.id}>
                  <button type="button" className="pub-toc__link" aria-current={active === s.id ? 'true' : undefined} onClick={() => go(s.id)}>
                    <span className="pub-toc__n">{i + 1}</span>{s.title}
                  </button>
                </li>
              ))}
            </ol>
          </aside>

          <article className="pub-legal__body">
            {doc.sections.map((s, i) => (
              <section key={s.id} id={s.id} className="pub-legal__sec" aria-labelledby={`${s.id}-h`}>
                <h2 id={`${s.id}-h`}><span>{i + 1}.</span> {s.title}</h2>
                {s.body.map((b, j) => <Block key={j} b={b} />)}
              </section>
            ))}

            {related.length > 0 && (
              <nav className="pub-legal__related" aria-label="Related pages">
                {related.map((r) => <Link key={r.to} to={r.to} className="btn btn--outline-green btn--sm">{r.label}<ArrowRight size={14} /></Link>)}
              </nav>
            )}
          </article>
        </div>
      </div>
    </>
  );
}
