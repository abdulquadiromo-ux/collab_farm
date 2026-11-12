import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, MapPin, Sprout, Tractor, Users, Wheat, ClipboardCheck } from 'lucide-react';
import '../../styles/pages/pub.css';
import { useApp } from '../../context/AppContext.jsx';
import { Banner } from '../../components/ui/index.js';
import { PhotoFill, Photo } from '../../components/common/Photo.jsx';
import { formatNumber } from '../../utils/format.js';
import { INVESTOR_VISIBLE, sum } from '../../utils/rules.js';
import { useDocTitle, useJoinLinks } from '../../components/pub/hooks.js';
import { CtaBand, PubSection } from '../../components/pub/PubChrome.jsx';
import { HERO_FEATURES, VERIFY_CARDS, WHY_CARDS } from '../../components/pub/content.jsx';

const NODE_ICONS = [Sprout, Wheat, Tractor, Users];

export default function Home() {
  useDocTitle('');
  const { data } = useApp();
  const { signedIn, dashboardTo } = useJoinLinks();

  const stats = useMemo(() => {
    const approved = data.packages.filter((p) => INVESTOR_VISIBLE.includes(p.status));
    return {
      farmers: data.farmers.filter((f) => f.status === 'Verified').length,
      coops: data.cooperatives.filter((c) => c.status === 'Verified').length,
      packages: approved.length,
      value: sum(approved, (p) => p.amount),
    };
  }, [data]);

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="hero pub-home-hero" aria-labelledby="home-title">
        <div className="hero__bg pub-quiet" aria-hidden="true"><PhotoFill name="hero-farm.jpg" theme="field" loading="eager" /></div>
        <div className="container hero__content">
          <span className="pub-chip-hero"><BadgeCheck size={18} aria-hidden="true" />VERIFIED FARMERS</span>
          <h1 id="home-title">Connecting Farmers, Cooperatives and Investors Through Verified Agricultural Data</h1>
          <p>CollabFarm helps cooperatives and investors work together through verified farmer records, approved budgets and transparent tracking of every naira, from commitment to harvest.</p>
          <div className="pub-hero__actions">
            {signedIn ? (
              <>
                <Link to={dashboardTo} className="btn btn--primary btn--lg">Open my dashboard<ArrowRight size={18} /></Link>
                <Link to="/how-it-works" className="btn btn--lg pub-btn-glass">How it works</Link>
              </>
            ) : (
              <>
                <Link to="/register/investor" className="btn btn--primary btn--lg">Investor Portal<ArrowRight size={18} /></Link>
                <Link to="/register" className="btn btn--lg pub-btn-glass">Get Started</Link>
              </>
            )}
          </div>
          <ul className="pub-hero-row" aria-label="Platform highlights">
            {HERO_FEATURES.map((f, i) => {
              const Icon = f.icon;
              return <li key={f.label} className={i === 0 ? 'pub-hero-row__on' : undefined}><Icon size={18} aria-hidden="true" />{f.label}</li>;
            })}
          </ul>
        </div>
        <a
          className="pub-home-hero__photo-credit"
          href="https://commons.wikimedia.org/wiki/File:A_Nigerian_farmer_farming_in_drying_season.jpg"
          target="_blank"
          rel="noreferrer"
        >
          Photo: Photobyamin / Wikimedia Commons (CC BY-SA 4.0)
        </a>
      </section>

      {/* ---------------- Stats band ---------------- */}

      {/* ---------------- Explore ---------------- */}
      <PubSection id="explore" title="Explore Our Platform" sub="Navigate through our agricultural finance ecosystem">
        <div className="pub-bento">
          <Link to="/how-it-works?role=farmer" className="bento__card pub-bento__farmers" aria-labelledby="bento-f-h" aria-describedby="bento-f-p">
            <h3 id="bento-f-h">Farmers</h3>
            <p id="bento-f-p">Farmers are invited by their cooperative, verified, and then supported with approved inputs and payments. Investors see a privacy-preserving profile only.</p>
            <div className="pub-bento__tags" aria-hidden="true">
              <span className="pub-tag pub-tag--green"><BadgeCheck size={16} />{formatNumber(stats.farmers)} verified profiles</span>
              <span className="pub-tag pub-tag--blue"><MapPin size={16} />GPS-tagged plots</span>
              <span className="pub-tag pub-tag--amber"><ClipboardCheck size={16} />Risk reviewed</span>
            </div>
          </Link>

          <Link to="/cooperative-funding" className="bento__card pub-bento__coops" aria-labelledby="bento-c-h" aria-describedby="bento-c-p">
            <h3 id="bento-c-h">Cooperatives</h3>
            <p id="bento-c-p">Verified cooperatives register, build budgets, allocate farmers and report evidence at every stage of funding.</p>
            <div className="pub-net" aria-hidden="true">
              <svg viewBox="0 0 300 110" preserveAspectRatio="none" className="pub-net__lines">
                <path d="M150 20 C 110 40, 70 55, 40 70" /><path d="M150 20 C 135 45, 120 65, 105 85" /><path d="M150 20 C 165 45, 180 65, 195 85" /><path d="M150 20 C 190 40, 230 55, 260 70" />
              </svg>
              <span className="pub-net__hub"><Users size={22} /></span>
              {NODE_ICONS.map((Icon, i) => <span key={i} className={`pub-net__node pub-net__node--${i + 1}`}><Icon size={18} /></span>)}
            </div>
          </Link>

          <Link to="/investor-information" className="bento__card bento__card--photo pub-bento__investors" aria-labelledby="bento-i-h" aria-describedby="bento-i-p">
            <PhotoFill name="explore-investors.jpg" theme="field" />
            <h3 id="bento-i-h">Investors</h3>
            <p id="bento-i-p">Browse approved projects, read the budget and the risks in plain language, commit through a signed agreement and follow every stage.</p>
            <ul className="pub-bento__list" aria-hidden="true">
              <li>Risk disclosures</li><li>Budget review</li><li>Progress tracking</li><li>Repayment tracking</li>
            </ul>
          </Link>

          <Link to="/register/cooperative" className="bento__card bento__card--photo pub-bento__assoc" aria-labelledby="bento-a-h" aria-describedby="bento-a-p">
            <PhotoFill name="explore-associations.jpg" theme="harvest" />
            <h3 id="bento-a-h">Associations</h3>
            <p id="bento-a-p">Associations that coordinate several cooperatives can bring each member cooperative through the same verification. Each member registers and is verified on its own.</p>
            <div className="pub-bento__tags pub-bento__tags--row" aria-hidden="true">
              <span className="pub-tag pub-tag--glass"><MapPin size={16} />Regional coverage</span>
              <span className="pub-tag pub-tag--glass"><ClipboardCheck size={16} />Shared standards</span>
              <span className="pub-tag pub-tag--glass"><Users size={16} />Group reporting</span>
            </div>
          </Link>
        </div>
      </PubSection>

      {/* ---------------- Verification ---------------- */}
      <PubSection id="verification" title="Secure Identity Verification" sub="Layered checks and real-time monitoring for transparency and safety.">
        <div className="pub-verify">
          <div className="pub-verify__photo"><Photo name="verification-farmers.jpg" theme="seedling" alt="Farmers tending young plants" /></div>
          <div className="pub-verify__cards">
            {VERIFY_CARDS.map((c) => (
              <article key={c.title} className="pub-verify__card">
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </article>
            ))}
          </div>
        </div>
        <p className="center small" style={{ marginTop: 20 }}>
          <Link to="/how-it-works?role=cooperative&step=5" className="pub-link">See how evidence is reviewed<ArrowRight size={14} /></Link>
        </p>
      </PubSection>

      {/* ---------------- Why choose ---------------- */}
      <PubSection id="why" title="Why Choose CollabFarm Finance?" sub="Built with verification, transparency and trust at its core.">
        <div className="feature-cards">
          {WHY_CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <article key={c.title} className={`feature-card pub-why${c.tone === 'gold' ? ' feature-card--gold' : ''}`}>
                <h3><span className="pub-why__icon" aria-hidden="true"><Icon size={18} /></span>{c.title}</h3>
                <p>{c.body}</p>
              </article>
            );
          })}
        </div>
        <div className="pub-why__photo"><Photo name="why-choose-us.jpg" theme="harvest" alt="A smiling grower carrying a crate of fresh produce" /></div>
      </PubSection>

      {/* ---------------- Honest note + final call ---------------- */}
      <div className="container pub-home-note">
        <Banner tone="green" title="Funding with open eyes">
          CollabFarm does not hold your money and cannot guarantee returns. Funds move through a regulated financial partner, a commitment is not received money, and you can lose some or all of what you invest.
          {' '}<Link to="/investor-information" className="pub-link">Read the risks<ArrowRight size={14} /></Link>
        </Banner>
      </div>

      <CtaBand
        title="Ready to Fund or Farm With Full Visibility?"
        text="Join verified cooperatives and investors who want every naira approved, released in stages and traced from commitment to harvest."
        note="Investing carries risk. Returns are never guaranteed."
      >
        {signedIn ? (
          <>
            <Link to={dashboardTo} className="btn btn--lg pub-btn-light">My dashboard<ArrowRight size={18} /></Link>
            <Link to="/how-it-works" className="btn btn--lg pub-btn-glass">How it works</Link>
          </>
        ) : (
          <>
            <Link to="/register/investor" className="btn btn--lg pub-btn-light">Investor Portal<ArrowRight size={18} /></Link>
            <Link to="/register" className="btn btn--lg pub-btn-glass">Get Started<ArrowRight size={18} /></Link>
          </>
        )}
      </CtaBand>
    </>
  );
}
