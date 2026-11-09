import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, Check, EyeOff } from 'lucide-react';
import '../../styles/pages/pub.css';
import { useApp } from '../../context/AppContext.jsx';
import { Banner, StatusPill, Tabs } from '../../components/ui/index.js';
import { formatNaira } from '../../utils/format.js';
import { sixAmounts } from '../../utils/rules.js';
import { useDocTitle, useHashScroll, useJoinLinks } from '../../components/pub/hooks.js';
import { CtaBand, PubHero, PubSection, RulesBox } from '../../components/pub/PubChrome.jsx';
import { ProfitCalculator } from '../../components/pub/ProfitCalculator.jsx';
import { AGREEMENTS, INVESTOR_CANNOT_SEE, INVESTOR_CAN_SEE, INVESTOR_STEPS, RISKS, SIX_AMOUNTS_PLAIN } from '../../components/pub/content.jsx';

// Three sample investments that show the amounts at different points in a project's life.
const SAMPLES = [
  { id: 'inv-r2', tab: 'Just committed' },
  { id: 'inv-r1', tab: 'Funded and active' },
  { id: 'inv-r3', tab: 'Completed' },
];

export default function InvestorInformation() {
  useDocTitle('Investor information');
  useHashScroll();
  const { data, role } = useApp();
  const { signedIn, investorTo } = useJoinLinks();
  const [sampleId, setSampleId] = useState(SAMPLES[0].id);

  const tabs = useMemo(() => SAMPLES.filter((s) => data.investments.some((i) => i.id === s.id)).map((s) => ({ id: s.id, label: s.tab })), [data.investments]);
  const activeId = tabs.some((t) => t.id === sampleId) ? sampleId : tabs[0]?.id;
  const sample = data.investments.find((i) => i.id === activeId);
  const samplePkg = sample ? data.packages.find((p) => p.id === sample.packageId) : null;
  const amounts = sample ? sixAmounts(sample) : [];
  const pending = data.platformSettings?.pendingDecisions || [];

  const ctaTo = role === 'investor' ? '/investor/packages' : investorTo;
  const ctaLabel = role === 'investor' ? 'Browse funding packages' : signedIn ? 'Go to my dashboard' : 'Register as an investor';

  return (
    <>
      <PubHero
        eyebrow="For investors"
        title="Investor information and risk disclosures"
        lead="Read how investing works, what you can see, what each amount means and, above all, what can go wrong. Please read the risks before you decide."
        photo="explore-investors.jpg"
        theme="field"
        actions={(
          <>
            <Link to={ctaTo} className="btn btn--primary btn--lg">{ctaLabel}<ArrowRight size={18} /></Link>
            <button type="button" className="btn btn--lg pub-btn-glass" onClick={() => document.getElementById('risks')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Read the risks<ArrowDown size={18} /></button>
          </>
        )}
      />

      <div className="container pub-lead-banner">
        <Banner tone="danger" title="You can lose some or all of the money you invest">
          Returns are never guaranteed. Any figure you see on this site is an illustration or an estimate. Only invest an amount you can afford to lose.
        </Banner>
      </div>

      <PubSection id="how" title="How investing works" sub="Five steps, and nothing moves until you have signed an agreement." tone="white">
        <ol className="pub-timeline">
          {INVESTOR_STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.title} className="pub-timeline__item">
                <span className="pub-timeline__n" aria-hidden="true">{i + 1}</span>
                <span className="pub-icon" aria-hidden="true"><Icon size={22} /></span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            );
          })}
        </ol>
      </PubSection>

      <PubSection id="see" title="What you can see" sub="You can follow your money from commitment to repayment. Farmers' private details stay private." >
        <div className="pub-two">
          <div className="card card--pad">
            <h3 className="pub-card-h"><Check size={18} aria-hidden="true" />Visible to you</h3>
            <ul className="pub-ticks">{INVESTOR_CAN_SEE.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
          <div className="card card--pad pub-card--muted">
            <h3 className="pub-card-h"><EyeOff size={18} aria-hidden="true" />Never shown to you</h3>
            <ul className="pub-ticks pub-ticks--no">{INVESTOR_CANNOT_SEE.map((t) => <li key={t}>{t}</li>)}</ul>
            <p className="small muted">You see a privacy-preserving profile only: crop, approximate farm size, verification status and cooperative. <Link to="/privacy" className="pub-link">Read the privacy notice</Link>.</p>
          </div>
        </div>
      </PubSection>

      <PubSection id="amounts" title="The six amounts, explained simply" sub="We track six amounts separately because they are different things. Choose an example to see how they change." tone="tint">
        {sample ? (
          <>
            <Tabs items={tabs} value={activeId} onChange={setSampleId} auto label="Sample investments" />
            <div className="pub-sample">
              <span className="small muted">Example from sample data:</span>
              <strong>{samplePkg?.name || 'Funding package'}</strong>
              <StatusPill>{sample.status}</StatusPill>
              <span className="small muted">{sample.ref}</span>
            </div>
            <ol className="pub-six">
              {amounts.map((a, i) => (
                <li key={a.key} className="card card--pad pub-six__item">
                  <span className="pub-six__n" aria-hidden="true">{i + 1}</span>
                  <h3>{a.label}</h3>
                  <p className="pub-six__value">{formatNaira(a.value)}</p>
                  <p className="small muted">{SIX_AMOUNTS_PLAIN[a.key]}</p>
                </li>
              ))}
            </ol>
            <Banner tone="green" title="Why they can differ">
              A commitment can exist while nothing has been confirmed received. Only the confirmed amount can be made available, and only paid-out money counts as disbursed.
            </Banner>
          </>
        ) : (
          <Banner tone="info">Sample investments are not available right now.</Banner>
        )}
      </PubSection>

      <PubSection id="agreements" title="The three agreements" sub="Every agreement is versioned, signed with a typed name and kept. A signed version is never overwritten." tone="white">
        <div className="pub-grid pub-grid--3">
          {AGREEMENTS.map((a) => (
            <article key={a.code} className="card card--pad pub-agree">
              <span className="pub-agree__code" aria-hidden="true">{a.code}</span>
              <h3>{a.title}</h3>
              <StatusPill tone="gray">{a.who}</StatusPill>
              <p className="small">{a.body}</p>
            </article>
          ))}
        </div>
      </PubSection>

      <section id="risks" className="pub-section pub-risk" aria-labelledby="risks-title">
        <div className="container">
          <div className="pub-sec-head">
            <h2 id="risks-title">Risks you should understand</h2>
            <p>Please read every one. You will be asked to confirm that you have, before you can commit any money.</p>
          </div>
          <Banner tone="danger" title="Investing in farming can lead to the loss of your money">
            No one can promise a return. Approval of a project is not a guarantee of success, and expected returns are estimates only.
          </Banner>
          <div className="pub-risk__grid">
            {RISKS.map((r) => {
              const Icon = r.icon;
              return (
                <article key={r.title} className="pub-risk__card">
                  <span className="pub-icon pub-icon--red" aria-hidden="true"><Icon size={22} /></span>
                  <h3>{r.title}</h3>
                  <p>{r.body}</p>
                  <p className="pub-risk__help"><strong>What helps:</strong> {r.help}</p>
                </article>
              );
            })}
          </div>

          <div className="card card--pad pub-model">
            <h3>The funding model and return structure are set in each agreement</h3>
            <p>Whether a package is a loan, profit sharing or harvest participation, and how any amount due is worked out, is written in the signed Investor Funding Agreement. The terms shown on this site are examples and can be configured. Repayment of your capital is never confused with profit.</p>
            {pending.length > 0 && (
              <>
                <p className="small strong">Still being confirmed for the platform</p>
                <ul className="tag-list" aria-label="Decisions still being confirmed">{pending.map((d) => <li key={d} className="pub-tagitem">{d}</li>)}</ul>
              </>
            )}
            {role === 'investor' && <p className="small"><Link to="/investor/risk-disclosures" className="pub-link">Open my risk disclosures<ArrowRight size={14} /></Link></p>}
          </div>
        </div>
      </section>

      <PubSection id="calculator" title="A small illustration" sub="Try the arithmetic behind a profit share. It uses the same calculation as the platform." tone="white">
        <ProfitCalculator />
      </PubSection>

      <PubSection id="rules" tone="tint" tight>
        <RulesBox />
      </PubSection>

      <CtaBand
        title="Take your time, then decide"
        text="Registering does not commit any money. You can read every package, its budget and its risks before you sign anything."
        note="You can lose some or all of the money you invest. Returns are never guaranteed."
        photo="explore-investors.jpg"
        theme="field"
      >
        <Link to={ctaTo} className="btn btn--lg pub-btn-light">{ctaLabel}<ArrowRight size={18} /></Link>
        <Link to="/faq" className="btn btn--lg pub-btn-glass">Read the FAQ</Link>
      </CtaBand>
    </>
  );
}
