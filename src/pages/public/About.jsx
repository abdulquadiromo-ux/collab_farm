import { Link } from 'react-router-dom';
import { ArrowRight, Check, ClipboardCheck, Eye, FileSearch, X } from 'lucide-react';
import '../../styles/pages/pub.css';
import { Banner } from '../../components/ui/index.js';
import { useDocTitle } from '../../components/pub/hooks.js';
import { CtaBand, PubHero, PubSection } from '../../components/pub/PubChrome.jsx';
import { CF_IS, CF_IS_NOT, PARTNER_FLOW, PRINCIPLES, TEAM_ROLES } from '../../components/pub/content.jsx';

const AIMS = [
  { icon: FileSearch, title: 'Less fraud', body: 'Identity, documents and farms are checked by people before money moves.' },
  { icon: Eye, title: 'Less misuse of funds', body: 'Money is released in stages against an approved budget and approved evidence.' },
  { icon: ClipboardCheck, title: 'Better project management', body: 'Milestones, reports and reviews keep projects on a clear path from planting to harvest.' },
];

export default function About() {
  useDocTitle('About');

  return (
    <>
      <PubHero
        eyebrow="About CollabFarm Finance"
        title="Agricultural funding everyone can follow"
        lead="CollabFarm Finance connects investors with verified farming cooperatives. Our mission is to make sure every naira is approved, released in stages and traced from commitment to harvest."
        photo="why-choose-us.jpg"
        theme="harvest"
      />

      <PubSection id="mission" title="What we are here to change" sub="Funding farmers is hard to trust when money disappears into a black box. We are building the opposite." tone="white">
        <div className="pub-grid pub-grid--3">
          {AIMS.map((a) => {
            const Icon = a.icon;
            return (
              <article key={a.title} className="card card--pad pub-feature">
                <span className="pub-icon" aria-hidden="true"><Icon size={22} /></span>
                <h3>{a.title}</h3>
                <p className="small muted">{a.body}</p>
              </article>
            );
          })}
        </div>
      </PubSection>

      <PubSection id="principles" title="Our principles" sub="These guide every screen, every approval and every report.">
        <ul className="pub-principles">
          {PRINCIPLES.map((p, i) => {
            const Icon = p.icon;
            return (
              <li key={p.title} className="pub-principles__item">
                <span className="pub-principles__n" aria-hidden="true">{i + 1}</span>
                <span className="pub-icon pub-icon--gold" aria-hidden="true"><Icon size={22} /></span>
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="center small muted" style={{ marginTop: 20 }}>We also aim to meet our regulatory and data protection duties. <Link to="/privacy" className="pub-link">How we handle personal data<ArrowRight size={14} /></Link></p>
      </PubSection>

      <PubSection id="is" title="What CollabFarm is, and what it is not" sub="Being clear about limits is part of being trustworthy." tone="tint">
        <div className="pub-two">
          <div className="card card--pad pub-isbox">
            <h3 className="pub-card-h pub-card-h--good">CollabFarm is</h3>
            <ul className="pub-marks">{CF_IS.map((t) => <li key={t}><span className="pub-marks__ic pub-marks__ic--yes" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>{t}</li>)}</ul>
          </div>
          <div className="card card--pad pub-isbox">
            <h3 className="pub-card-h pub-card-h--bad">CollabFarm is not</h3>
            <ul className="pub-marks">{CF_IS_NOT.map((t) => <li key={t}><span className="pub-marks__ic pub-marks__ic--no" aria-hidden="true"><X size={14} strokeWidth={3} /></span>{t}</li>)}</ul>
          </div>
        </div>
      </PubSection>

      <PubSection id="partner" title="The regulated financial partner model" sub="Money never sits with CollabFarm. A regulated partner receives it, pays it out and confirms every payment." tone="white">
        <div className="pub-flow" role="group" aria-label="How money and records move">
          {PARTNER_FLOW.map((n, i) => {
            const Icon = n.icon;
            return (
              <div key={n.title} className="pub-flow__wrap">
                <div className={`pub-flow__node${i === 1 ? ' pub-flow__node--key' : ''}`}>
                  <span className="pub-icon" aria-hidden="true"><Icon size={24} /></span>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                </div>
                {i < PARTNER_FLOW.length - 1 && <ArrowRight className="pub-flow__arrow" size={28} aria-hidden="true" />}
              </div>
            );
          })}
        </div>
        <div className="pub-flow__rail">
          <strong>CollabFarm</strong>
          <span>records commitments and approvals, collects evidence, and checks the partner's confirmations against its own records (reconciliation).</span>
        </div>
        <Banner tone="warn" title="To be confirmed">
          The financial partner, the legal structure and the exact way funds are disbursed are still being decided. We will name them here once they are settled.
        </Banner>
      </PubSection>

      <PubSection id="team" title="The team" sub="These are the roles that keep the platform honest. Names will be added when the team is announced.">
        <ul className="pub-team">
          {TEAM_ROLES.map((t) => {
            const Icon = t.icon;
            return (
              <li key={t.role} className="card card--pad pub-team__card">
                <span className="pub-team__avatar" aria-hidden="true"><Icon size={26} /></span>
                <h3>{t.role}</h3>
                <p className="small muted">{t.focus}</p>
                <span className="pub-team__tbc">Name to be announced</span>
              </li>
            );
          })}
        </ul>
      </PubSection>

      <CtaBand
        title="Questions about how we work?"
        text="We are happy to explain any step, any agreement or any number."
        photo="explore-associations.jpg"
        theme="farmers"
      >
        <Link to="/contact" className="btn btn--lg pub-btn-light">Contact us<ArrowRight size={18} /></Link>
        <Link to="/how-it-works" className="btn btn--lg pub-btn-glass">See how it works</Link>
      </CtaBand>
    </>
  );
}
