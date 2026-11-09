import { useMemo, useState } from 'react';
import '../../styles/pages/shr.css';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { Card, CardHeader, PageHeader, PageSkeleton, SearchInput } from '../../components/ui/index.js';
import { Accordion, ContactForm, QuickLinks, RememberStrip, SupportHours } from '../../components/shr/HelpPanels.jsx';
import { GLOSSARY, QUICK_LINKS, faqFor } from '../../components/shr/helpContent.js';
import { baseFor } from '../../components/shr/shrUtils.js';

const SUB = {
  farmer: 'Answers in plain words, and a way to ask us.',
  default: 'Find answers, learn the terms we use, or write to the support team.',
};

export default function Help() {
  const { role } = useApp();
  const loading = useSimulatedLoad(350);
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();

  const faq = useMemo(() => faqFor(role).map((f) => ({ id: f.id, title: f.q, body: f.a, text: `${f.q} ${f.a}` })), [role]);
  const gloss = useMemo(() => GLOSSARY.map((g) => ({ id: g.term, title: g.term, body: g.meaning, example: g.example, text: `${g.term} ${g.meaning}` })), []);
  const faqShown = useMemo(() => (term ? faq.filter((f) => f.text.toLowerCase().includes(term)) : faq), [faq, term]);
  const glossShown = useMemo(() => (term ? gloss.filter((g) => g.text.toLowerCase().includes(term)) : gloss), [gloss, term]);

  if (loading) return <PageSkeleton />;
  const base = baseFor(role);
  const links = QUICK_LINKS[role] || QUICK_LINKS.investor;

  return (
    <div className={`page shr-page shr-help${role === 'farmer' ? ' shr-help--large' : ''}`}>
      <PageHeader title="Help and Support" subtitle={role === 'farmer' ? SUB.farmer : SUB.default} />

      <SearchInput value={q} onChange={setQ} placeholder="Search questions and terms" className="shr-help-search" />

      <section aria-labelledby="help-quick">
        <h2 id="help-quick" className="shr-h2">Quick links</h2>
        <QuickLinks links={links} base={base} />
      </section>

      <div className="shr-help-grid">
        <div className="stack-lg">
          <Card>
            <CardHeader title="Common questions" subtitle={term ? `${faqShown.length} match${faqShown.length === 1 ? '' : 'es'} for "${q.trim()}"` : 'Select a question to read the answer.'} />
            <Accordion key={`faq-${term}`} items={faqShown} idPrefix="faq" emptyText="No question matches your search. Try a different word, or write to support." />
          </Card>
          <Card>
            <CardHeader title="Glossary" subtitle="Financial words used on the platform, explained in plain language." />
            <Accordion key={`gl-${term}`} items={glossShown} idPrefix="gl" emptyText="No term matches your search." />
          </Card>
        </div>
        <div className="stack-lg">
          <ContactForm />
          <SupportHours />
          <RememberStrip />
        </div>
      </div>
    </div>
  );
}
