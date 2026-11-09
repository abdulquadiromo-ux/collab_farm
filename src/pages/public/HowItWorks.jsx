import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../../styles/pages/pub.css';
import { useDocTitle, useJoinLinks } from '../../components/pub/hooks.js';
import { CtaBand, PubHero, PubSection, RulesBox } from '../../components/pub/PubChrome.jsx';
import { LifecycleStepper } from '../../components/pub/LifecycleStepper.jsx';
import { SEPARATION_CHAIN } from '../../components/pub/content.jsx';
import { Banner } from '../../components/ui/index.js';

export default function HowItWorks() {
  useDocTitle('How it works');
  const { signedIn, dashboardTo } = useJoinLinks();

  return (
    <>
      <PubHero
        eyebrow="How it works"
        title="From commitment to harvest, every step is visible"
        lead="Seven steps take a project from a signed promise to money paid back. Choose who you are and click through each step to see what you do, what you can see and what the platform checks."
        theme="seedling"
        photo="package-crop.jpg"
      />

      <PubSection id="journey" tone="white" tight>
        <LifecycleStepper />
      </PubSection>

      <PubSection
        id="duties"
        title="Nobody proposes, approves and pays alone"
        sub="Each payment passes through different people. This is called separation of duties, and it is how mistakes and misuse are caught."
      >
        <ol className="pub-chain" aria-label="Approval chain for a payment">
          {SEPARATION_CHAIN.map((c, i) => (
            <li key={c.who} className="pub-chain__item">
              <span className="pub-chain__n" aria-hidden="true">{i + 1}</span>
              <strong>{c.who}</strong>
              <span>{c.what}</span>
            </li>
          ))}
        </ol>
        <div className="pub-chain__note">
          <Banner tone="info" title="A note on money">
            Investor money is received and paid out by a regulated financial partner. CollabFarm records the approvals and checks the partner's confirmations against its own records. This is called reconciliation.
          </Banner>
        </div>
      </PubSection>

      <PubSection id="rules" tone="tint" tight>
        <RulesBox intro="Keep these three rules in mind at every step. They are repeated throughout the platform because they are easy to mix up." />
      </PubSection>

      <PubSection id="next" title="Where would you like to go next?" sub="Each guide explains one side of the platform in more detail.">
        <div className="pub-grid pub-grid--3">
          <Link to="/investor-information" className="pub-linkcard">
            <h3>Investor information</h3>
            <p>How investing works, the six amounts explained simply, the risks and a profit share calculator.</p>
            <span className="pub-link">Read the guide<ArrowRight size={14} /></span>
          </Link>
          <Link to="/cooperative-funding" className="pub-linkcard">
            <h3>Cooperative funding</h3>
            <p>How to register, get verified, build a budget and receive funds in four stages.</p>
            <span className="pub-link">Read the guide<ArrowRight size={14} /></span>
          </Link>
          <Link to="/faq" className="pub-linkcard">
            <h3>Frequently asked questions</h3>
            <p>Short answers about money, risk, privacy, complaints and who can take part.</p>
            <span className="pub-link">Browse the answers<ArrowRight size={14} /></span>
          </Link>
        </div>
      </PubSection>

      <CtaBand
        title="Ready to take part?"
        text="Create an account for your role. Nothing is committed until you have been verified and have signed an agreement."
        theme="field"
        photo="cta-field.jpg"
      >
        {signedIn ? (
          <Link to={dashboardTo} className="btn btn--lg pub-btn-light">My dashboard<ArrowRight size={18} /></Link>
        ) : (
          <>
            <Link to="/register/investor" className="btn btn--lg pub-btn-light">Register as an investor<ArrowRight size={18} /></Link>
            <Link to="/register/cooperative" className="btn btn--lg pub-btn-glass">Register a cooperative<ArrowRight size={18} /></Link>
          </>
        )}
      </CtaBand>
    </>
  );
}
