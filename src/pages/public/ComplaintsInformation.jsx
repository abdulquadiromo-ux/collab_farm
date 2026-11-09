import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, Scale, ShieldCheck } from 'lucide-react';
import '../../styles/pages/pub.css';
import { Banner, Checklist, InfoList, StatusPill, Timeline } from '../../components/ui/index.js';
import { useDocTitle, useJoinLinks } from '../../components/pub/hooks.js';
import { CtaBand, PubHero, PubSection } from '../../components/pub/PubChrome.jsx';
import { COMPLAINT_STATUSES, COMPLAINT_STEPS, COMPLAINT_TIMELINES, COMPLAINT_TOPICS } from '../../components/pub/content.jsx';

const INCLUDE = [
  'The project or package it is about',
  'Who is involved, such as a cooperative, supplier or investor',
  'What happened and when',
  'Evidence, such as receipts, messages or photos',
  'What outcome you are hoping for',
];

// A made-up example so that visitors can picture a case. It is not a real record.
const EXAMPLE = [
  { title: 'Complaint raised', meta: 'Status: Open', state: 'done', body: 'A farmer reports that approved herbicide has not arrived. The complaint gets a reference and the status Open.' },
  { title: 'Reviewer assigned', meta: 'Status: Under Review', state: 'done', body: 'A reviewer preserves the evidence and asks the cooperative to explain the delay.' },
  { title: 'Cooperative replies', meta: 'Status: Awaiting Response', state: 'done', body: 'The cooperative says the supplier will deliver on a set date. The reviewer asks for the supplier\'s confirmation.' },
  { title: 'Decision recorded', meta: 'Status: Resolved', state: 'active', body: 'Delivery is confirmed. The outcome and reasons are recorded and the farmer can say whether it fixed the problem.' },
];

export default function ComplaintsInformation() {
  useDocTitle('Complaints and disputes');
  const { signedIn, complaintNew } = useJoinLinks();
  const [sel, setSel] = useState(COMPLAINT_STATUSES[0].status);
  const selected = COMPLAINT_STATUSES.find((s) => s.status === sel) || COMPLAINT_STATUSES[0];

  const raise = (
    <Link to={complaintNew} className="btn btn--primary btn--lg">Raise a complaint<ArrowRight size={18} /></Link>
  );

  return (
    <>
      <PubHero
        eyebrow="Complaints and dispute resolution"
        title="If something is wrong, tell us"
        lead="Farmers, cooperatives, investors and administrators can all raise a complaint. Every complaint gets a reference, a reviewer and a status you can follow."
        photo="why-choose-us.jpg"
        theme="farmers"
        actions={(
          <>
            {raise}
            <Link to="/contact" className="btn btn--lg pub-btn-glass">Contact support instead</Link>
          </>
        )}
      >
        {!signedIn && <p className="pub-hero__meta">You will be asked to sign in first, so that we know who you are and what you may see.</p>}
      </PubHero>

      <div className="container pub-lead-banner">
        <Banner tone="green" title="A complaint never causes a public accusation">
          Raising a complaint does not label anyone as dishonest and does not trigger an irreversible penalty. A missed deadline or a failed crop is not treated as fraud. Each case is reviewed on evidence.
        </Banner>
      </div>

      <PubSection id="topics" title="What you can complain about" sub="If you are not sure which fits, choose the closest one. A reviewer can re-categorise it." tone="white">
        <div className="pub-grid pub-grid--3">
          {COMPLAINT_TOPICS.map((t) => {
            const Icon = t.icon;
            return (
              <article key={t.title} className="card card--pad pub-feature">
                <span className="pub-icon" aria-hidden="true"><Icon size={22} /></span>
                <h3>{t.title}</h3>
                <p className="small muted">{t.body}</p>
              </article>
            );
          })}
        </div>
      </PubSection>

      <PubSection id="how" title="How to raise a complaint" sub="It takes a few minutes. You can add detail as the case moves along.">
        <div className="pub-two pub-two--wide">
          <ol className="pub-steps pub-steps--list">
            {COMPLAINT_STEPS.map((s, i) => (
              <li key={s.title} className="pub-steps__row">
                <span className="pub-steps__n pub-steps__n--solid" aria-hidden="true">{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p className="small muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="card card--pad">
            <h3 className="pub-card-h">Helpful to include</h3>
            <Checklist items={INCLUDE} />
            <div className="pub-howcta">{raise}</div>
          </div>
        </div>
      </PubSection>

      <PubSection id="status" title="What happens next" sub="Select a status to see what it means. These are the only five statuses a complaint can have." tone="tint">
        <div className="pub-status">
          <div className="pub-status__pills" role="group" aria-label="Complaint statuses">
            {COMPLAINT_STATUSES.map((s, i) => (
              <button key={s.status} type="button" className="pub-status__btn" aria-pressed={sel === s.status} onClick={() => setSel(s.status)}>
                <span className="pub-status__i" aria-hidden="true">{i + 1}</span>
                <StatusPill>{s.status}</StatusPill>
              </button>
            ))}
          </div>
          <div className="card card--pad pub-status__detail" aria-live="polite">
            <StatusPill>{selected.status}</StatusPill>
            <p className="pub-status__lead">{selected.body}</p>
            <div className="pub-status__cols">
              <div>
                <h3 className="pub-status__h">What you can do</h3>
                <ul className="pub-ticks">{selected.youCan.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
              <div>
                <h3 className="pub-status__h">What happens next</h3>
                <p className="small">{selected.next}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pub-two pub-two--wide" style={{ marginTop: 28 }}>
          <div className="card card--pad">
            <h3 className="pub-card-h">An example of how a case can move</h3>
            <p className="small muted" style={{ marginBottom: 16 }}>This is a made-up example, not a real complaint.</p>
            <Timeline items={EXAMPLE} />
          </div>
          <div className="card card--pad">
            <h3 className="pub-card-h">Timelines</h3>
            <p className="small muted" style={{ marginBottom: 8 }}>We have not set final response times yet. They will be shown here once they are confirmed.</p>
            <InfoList items={COMPLAINT_TIMELINES} />
          </div>
        </div>
      </PubSection>

      <PubSection id="appeal" title="Appeal and escalation" sub="You are not stuck with the first answer." tone="white">
        <div className="pub-grid pub-grid--3">
          <article className="card card--pad pub-feature">
            <span className="pub-icon" aria-hidden="true"><Scale size={22} /></span>
            <h3>If you disagree with the outcome</h3>
            <p className="small muted">You can appeal. Say what you think was missed and add any new evidence. A different reviewer looks at it. The time allowed to appeal is to be confirmed.</p>
          </article>
          <article className="card card--pad pub-feature">
            <span className="pub-icon" aria-hidden="true"><ShieldCheck size={22} /></span>
            <h3>When a case is escalated</h3>
            <p className="small muted">Serious or unclear cases go to a second reviewer, an independent assessor or a formal process. Further payments can be paused where the agreement allows. You are told when this happens.</p>
          </article>
          <article className="card card--pad pub-feature">
            <span className="pub-icon" aria-hidden="true"><Lock size={22} /></span>
            <h3>Who can see a complaint</h3>
            <p className="small muted">Only the person who raised it, the people who are allowed to see it for the case, and administrators. Complaints are never published.</p>
          </article>
        </div>
        <Banner tone="warn" title="In an emergency" className="pub-after-grid">
          If someone is in danger or a crime is happening, contact the police or emergency services first. This process is for problems with the platform and its participants.
        </Banner>
      </PubSection>

      <CtaBand
        title="Not sure where to start?"
        text="Read the answers to common questions, or write to support and we will point you in the right direction."
        photo="cta-field.jpg"
        theme="seedling"
      >
        {signedIn ? (
          <Link to={complaintNew} className="btn btn--lg pub-btn-light">Raise a complaint<ArrowRight size={18} /></Link>
        ) : (
          <Link to="/login" className="btn btn--lg pub-btn-light">Sign in<ArrowRight size={18} /></Link>
        )}
        <Link to="/faq" className="btn btn--lg pub-btn-glass">Read the FAQ</Link>
        <Link to="/contact" className="btn btn--lg pub-btn-glass">Contact support</Link>
      </CtaBand>
    </>
  );
}
