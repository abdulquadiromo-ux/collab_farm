import { Fragment, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronsDownUp, ChevronsUpDown, SearchX } from 'lucide-react';
import '../../styles/pages/pub.css';
import { useApp } from '../../context/AppContext.jsx';
import { Button, EmptyState, SearchInput } from '../../components/ui/index.js';
import { useDocTitle } from '../../components/pub/hooks.js';
import { PubHero, PubSection } from '../../components/pub/PubChrome.jsx';
import { Accordion } from '../../components/pub/Accordion.jsx';
import { buildFaq, FAQ_CATEGORIES } from '../../components/pub/faq.js';
import { cx } from '../../utils/format.js';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Wraps matches of the search text in <mark>. Plain React nodes only, no HTML strings.
function Highlight({ text, q }) {
  const term = q.trim();
  if (!term) return text;
  const parts = text.split(new RegExp(`(${escapeRe(term)})`, 'ig'));
  return parts.map((part, i) => (part.toLowerCase() === term.toLowerCase() ? <mark key={i}>{part}</mark> : <Fragment key={i}>{part}</Fragment>));
}

function filterFaq(items, cat, q) {
  const term = q.trim().toLowerCase();
  return items.filter((f) => (!cat || f.category === cat) && (!term || f.q.toLowerCase().includes(term) || f.a.toLowerCase().includes(term)));
}

export default function Faq() {
  useDocTitle('FAQ');
  const { data } = useApp();
  const [params, setParams] = useSearchParams();
  const items = useMemo(() => buildFaq(data.platformSettings), [data.platformSettings]);
  const rawCat = params.get('category') || '';
  const cat = FAQ_CATEGORIES.includes(rawCat) ? rawCat : '';
  const q = params.get('q') || '';
  // A shared link with a search term opens the matching answers so the highlighted words are visible.
  const [open, setOpen] = useState(() => (q.trim() ? new Set(filterFaq(items, cat, q).map((f) => f.id)) : new Set()));

  const shown = useMemo(() => filterFaq(items, cat, q), [items, cat, q]);
  const counts = useMemo(() => Object.fromEntries(FAQ_CATEGORIES.map((c) => [c, filterFaq(items, c, q).length])), [items, q]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  // When someone searches, open the matching answers so the highlighted words are visible.
  const onSearch = (value) => {
    setParam('q', value);
    setOpen(value.trim() ? new Set(filterFaq(items, cat, value).map((f) => f.id)) : new Set());
  };
  const onCategory = (c) => { setParam('category', c); setOpen(q.trim() ? new Set(filterFaq(items, c, q).map((f) => f.id)) : new Set()); };
  const toggle = (id) => setOpen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const clearAll = () => { setParams(new URLSearchParams(), { replace: true }); setOpen(new Set()); };

  const accItems = shown.map((f) => ({
    id: f.id,
    title: <Highlight text={f.q} q={q} />,
    body: (
      <>
        <p><Highlight text={f.a} q={q} /></p>
        {f.link && <p><Link to={f.link.to} className="pub-link">{f.link.label}<ArrowRight size={14} /></Link></p>}
      </>
    ),
  }));
  const allOpen = shown.length > 0 && shown.every((f) => open.has(f.id));

  return (
    <>
      <PubHero
        eyebrow="Help"
        title="Frequently asked questions"
        lead="Short, plain answers about money, risk, privacy, complaints and who can take part."
        photo="package-crop.jpg"
        theme="seedling"
      />

      <PubSection id="faq" tone="white" tight>
        <div className="pub-faq">
          <div className="pub-faq__tools">
            <SearchInput value={q} onChange={onSearch} placeholder="Search the questions" className="pub-faq__search" />
            <div className="pub-faq__chips" role="group" aria-label="Filter by topic">
              <button type="button" className="pub-chipbtn" aria-pressed={!cat} onClick={() => onCategory('')}>All ({filterFaq(items, '', q).length})</button>
              {FAQ_CATEGORIES.map((c) => (
                <button key={c} type="button" className={cx('pub-chipbtn', counts[c] === 0 && 'pub-chipbtn--dim')} aria-pressed={cat === c} onClick={() => onCategory(c)}>{c} ({counts[c]})</button>
              ))}
            </div>
            <div className="pub-faq__bar">
              <p className="small muted" aria-live="polite">{shown.length === 1 ? '1 question' : `${shown.length} questions`}{q.trim() ? ` matching "${q.trim()}"` : ''}{cat ? ` in ${cat}` : ''}</p>
              {shown.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setOpen(allOpen ? new Set() : new Set(shown.map((f) => f.id)))}>
                  {allOpen ? <ChevronsDownUp size={16} /> : <ChevronsUpDown size={16} />}{allOpen ? 'Collapse all' : 'Expand all'}
                </Button>
              )}
            </div>
          </div>

          {shown.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<SearchX size={28} />}
                title="No questions match your search"
                action={(
                  <div className="row-wrap" style={{ justifyContent: 'center' }}>
                    <Button variant="outline-green" onClick={clearAll}>Clear search and filters</Button>
                    <Link to="/contact" className="btn btn--primary">Ask us directly</Link>
                  </div>
                )}
              >
                Try a shorter word, such as "return", "risk" or "complaint", or choose another topic.
              </EmptyState>
            </div>
          ) : (
            <Accordion items={accItems} open={open} onToggle={toggle} />
          )}
        </div>
      </PubSection>

      <PubSection id="more" tone="tint" tight>
        <div className="pub-help">
          <div>
            <h2>Still need help?</h2>
            <p>Our support team can answer questions about your account, a project or a payment. If something went wrong, raise a complaint so it gets a reference and a reviewer.</p>
          </div>
          <div className="pub-help__actions">
            <Link to="/contact" className="btn btn--primary">Contact support<ArrowRight size={16} /></Link>
            <Link to="/complaints-information" className="btn btn--outline-green">Complaints information</Link>
          </div>
        </div>
      </PubSection>
    </>
  );
}
