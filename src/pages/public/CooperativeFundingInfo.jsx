import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Beef, Bird, Camera, Fish, Layers, Sprout, SlidersHorizontal, Wheat } from 'lucide-react';
import '../../styles/pages/pub.css';
import { useApp } from '../../context/AppContext.jsx';
import { Banner, Button, Checklist, EmptyState, PillTabs, SelectField, StatusPill } from '../../components/ui/index.js';
import { CATEGORIES, PACKAGE_TEMPLATES, TRANCHE_PLAN } from '../../data/funding.js';
import { CATEGORY_TONES, PACKAGE_TIER_DOT } from '../../utils/status.js';
import { formatNaira, percent } from '../../utils/format.js';
import { INVESTOR_VISIBLE } from '../../utils/rules.js';
import { useDocTitle, useJoinLinks } from '../../components/pub/hooks.js';
import { CtaBand, PubHero, PubSection } from '../../components/pub/PubChrome.jsx';
import { COOP_REGISTRATION, COOP_RULES, COOP_STEPS } from '../../components/pub/content.jsx';

const CATEGORY_ICONS = { 'Crop Farming': Wheat, Fishery: Fish, 'Mixed Farming': Layers, Livestock: Beef, Poultry: Bird, Custom: SlidersHorizontal };
const TABS = [...CATEGORIES, 'Custom'].map((c) => {
  const Icon = CATEGORY_ICONS[c] || Sprout;
  return { id: c, label: c, icon: <Icon size={18} aria-hidden="true" /> };
});
const EVIDENCE = ['Input delivery receipts', 'Supplier invoices', 'Field inspection reports', 'Planting and maintenance reports', 'Harvest quantities', 'Storage records', 'Sales receipts', 'Buyer confirmations', 'Loss records'];

export default function CooperativeFundingInfo() {
  useDocTitle('Cooperative funding');
  const { data, role } = useApp();
  const { signedIn, dashboardTo } = useJoinLinks();
  const [params, setParams] = useSearchParams();

  const rawCat = params.get('category');
  const category = TABS.some((t) => t.id === rawCat) ? rawCat : 'Crop Farming';
  const setCategory = (c) => { const n = new URLSearchParams(params); n.set('category', c); setParams(n, { replace: true }); };

  // The shared data only has templates for Crop Farming. Other categories show approved packages from the sample data.
  const templates = PACKAGE_TEMPLATES[category];
  const approved = useMemo(
    () => data.packages.filter((p) => p.category === category && INVESTOR_VISIBLE.includes(p.status)),
    [data.packages, category],
  );

  const tierOptions = useMemo(() => Object.values(PACKAGE_TEMPLATES).flat().map((t) => ({ value: String(t.amount), label: `${t.tier}: ${formatNaira(t.amount)}${t.plus ? ' and above' : ''}` })), []);
  const [previewAmount, setPreviewAmount] = useState(String(PACKAGE_TEMPLATES['Crop Farming'][1].amount));
  const amount = Number(previewAmount) || 0;

  const coopCta = !signedIn
    ? { to: '/register/cooperative', label: 'Register your cooperative' }
    : role === 'cooperative'
      ? { to: '/coop/funding/new', label: 'Start a funding request' }
      : { to: dashboardTo, label: 'Go to my dashboard' };

  const showStages = (tierAmount) => {
    setPreviewAmount(String(tierAmount));
    document.getElementById('stages')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <PubHero
        eyebrow="For cooperatives"
        title="How cooperative funding works"
        lead="Verified cooperatives present an approved budget to investors, receive funds in four stages and report evidence as farming moves forward. Nothing is released on request alone."
        theme="farmers"
        photo="explore-associations.jpg"
        actions={(
          <>
            <Link to={coopCta.to} className="btn btn--primary btn--lg">{coopCta.label}<ArrowRight size={18} /></Link>
            <button type="button" className="btn btn--lg pub-btn-glass" onClick={() => document.getElementById('stages')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>See the four stages</button>
          </>
        )}
      />

      <PubSection id="steps" title="Eight steps from registration to harvest" sub="Each step has to be finished and checked before the next one opens." tone="white">
        <ol className="pub-steps">
          {COOP_STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.title} className="pub-steps__item">
                <span className="pub-steps__n" aria-hidden="true">{i + 1}</span>
                <span className="pub-icon" aria-hidden="true"><Icon size={22} /></span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            );
          })}
        </ol>
      </PubSection>

      <PubSection id="packages" title="Package sizes" sub="Choose a category to see the standard package sizes. Contents are examples. Each project is reviewed on its own budget.">
        <PillTabs items={TABS} value={category} onChange={setCategory} label="Package categories" />

        <div className="pub-panel" role="tabpanel" aria-label={`${category} packages`}>
          {templates ? (
            <div className="pub-tiers">
              {templates.map((t) => {
                const on = previewAmount === String(t.amount);
                return (
                <article key={t.tier} className={`card card--pad pub-tier${on ? ' pub-tier--on' : ''}`}>
                  <div className="pub-tier__top">
                    <span className="dot" style={{ background: PACKAGE_TIER_DOT[t.tier] }} aria-hidden="true" />
                    <h3>{t.tier}</h3>
                  </div>
                  <p className="pub-tier__amount">{formatNaira(t.amount)}{t.plus && <span> and above</span>}</p>
                  <p className="small muted">{t.tagline}</p>
                  <Checklist items={t.inclusions} />
                  <Button variant={on ? 'primary' : 'outline-green'} block onClick={() => showStages(t.amount)} aria-pressed={on}>{on ? 'Showing release plan' : 'See how it is released'}<ArrowRight size={16} /></Button>
                </article>
                );
              })}
            </div>
          ) : category === 'Custom' ? (
            <div className="card card--pad pub-custom">
              <h3>Custom packages</h3>
              <p>When the standard sizes do not fit, a cooperative builds a custom package line by line: each item, its amount and purpose, up to a total funding amount. Custom packages go through the same review, the same four stages and the same agreements.</p>
              <ul className="pub-ticks">
                <li>Set the total amount, duration, start date and end date</li>
                <li>List each budget item with a supporting quotation</li>
                <li>Save as a draft and submit when the numbers add up</li>
              </ul>
            </div>
          ) : (
            <div className="card card--pad pub-custom">
              <h3>{category} packages</h3>
              <p>There is no fixed size card for {category.toLowerCase()} yet. A cooperative proposes a package that fits its plan, and the same review and four stages apply. Approved examples from the sample data are shown below.</p>
            </div>
          )}

          {!templates && (
            approved.length === 0 ? (
              <EmptyState title={`No approved ${category.toLowerCase()} packages yet`} action={<Link to={coopCta.to} className="btn btn--outline-green">{coopCta.label}</Link>}>
                Once a cooperative's {category.toLowerCase()} project is approved, it appears here.
              </EmptyState>
            ) : (
              <div className="pub-approved">
                {approved.map((p) => {
                  const tone = CATEGORY_TONES[p.category] || CATEGORY_TONES.Custom;
                  return (
                    <article key={p.id} className="card card--pad pub-approved__card">
                      <div className="row between">
                        <span className="chip" style={{ background: tone.bg, color: tone.fg, borderColor: tone.border }}>{p.category}</span>
                        <StatusPill>{p.status}</StatusPill>
                      </div>
                      <h3>{p.name}</h3>
                      <p className="small muted">{p.description}</p>
                      <div className="row between small">
                        <span>Target {formatNaira(p.amount)}</span>
                        <span className="muted">{percent(p.raised, p.amount)}% confirmed</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          )}
        </div>
      </PubSection>

      <PubSection id="stages" title="Funds arrive in four stages" sub="A tranche is one instalment of the approved budget. Each stage opens only after the one before it is released and its evidence is approved." tone="tint">
        <div className="pub-stagebox">
          <SelectField
            className="pub-stagebox__select"
            label="Preview a package of"
            value={previewAmount}
            onChange={(e) => setPreviewAmount(e.target.value)}
            options={tierOptions}
            hint="Standard split shown. Amounts are examples."
          />
          <div className="pub-split" role="img" aria-label={TRANCHE_PLAN.map((t) => `Stage ${t.number} ${t.name}: ${Math.round(t.share * 100)} percent`).join(', ')}>
            {TRANCHE_PLAN.map((t) => <span key={t.number} className={`pub-split__seg pub-split__seg--${t.number}`} style={{ width: `${t.share * 100}%` }}>T{t.number}</span>)}
          </div>
          <div className="pub-stages">
            {TRANCHE_PLAN.map((t) => (
              <article key={t.number} className="card card--pad pub-stage">
                <div className="pub-stage__top"><span className="pub-stage__t">T{t.number}</span><span className="chip" style={{ background: 'var(--primary-50)', color: 'var(--primary-700)' }}>{Math.round(t.share * 100)}% of the budget</span></div>
                <h3>{t.name}</h3>
                <p className="pub-stage__amount">{formatNaira(Math.round(amount * t.share))}</p>
                <p className="small muted">{t.purpose}</p>
                <p className="caption strong" style={{ marginTop: 6 }}>Before release</p>
                <ul className="pub-ticks pub-ticks--sm">{t.conditions.map((c) => <li key={c}>{c}</li>)}</ul>
              </article>
            ))}
          </div>
          <Banner tone="info" title="No stage is released on request alone">
            A reviewer checks the evidence and a payment approver authorises the release. Where possible suppliers are paid directly. Payments above the approval limit need a second, different approver.
          </Banner>
        </div>
      </PubSection>

      <PubSection id="evidence" title="Evidence you will be asked for" sub="Evidence is how a reviewer confirms that approved work happened.">
        <div className="pub-evidence">
          <ul className="tag-list" aria-label="Kinds of evidence">
            {EVIDENCE.map((e) => <li key={e} className="pub-tagitem"><Camera size={14} aria-hidden="true" />{e}</li>)}
          </ul>
          <Banner tone="warn" title="Photos and GPS help, but they do not decide">
            A reviewer looks at all the evidence together. A late report or a failed crop is not treated as fraud. Report problems early so they can be assessed fairly.
          </Banner>
        </div>
      </PubSection>

      <PubSection id="rules" title="Rules cooperatives work within" tone="white">
        <div className="pub-grid pub-grid--3">
          {COOP_RULES.map((r) => {
            const Icon = r.icon;
            return (
              <article key={r.title} className="card card--pad pub-feature">
                <span className="pub-icon" aria-hidden="true"><Icon size={22} /></span>
                <h3>{r.title}</h3>
                <p className="small muted">{r.body}</p>
              </article>
            );
          })}
        </div>
      </PubSection>

      <PubSection id="register" title="What you need to register" sub="Have these ready before you start." left>
        <div className="pub-two">
          <div className="card card--pad"><Checklist items={COOP_REGISTRATION} /></div>
          <div className="stack">
            <Banner tone="green" title="Farms are optional at registration">
              You do not have to add a farm or plot while registering. Add them later, when you are ready to plan a project.
            </Banner>
            <Banner tone="info" title="Verification comes first">
              Until an administrator verifies your cooperative, you can prepare drafts but you cannot submit funding requests or ask for disbursements.
            </Banner>
          </div>
        </div>
      </PubSection>

      <CtaBand
        title="Ready to put your cooperative forward?"
        text="Register, get verified and build a budget investors can follow. Approval is never a guarantee of funding."
        photo="package-crop.jpg"
        theme="seedling"
      >
        <Link to={coopCta.to} className="btn btn--lg pub-btn-light">{coopCta.label}<ArrowRight size={18} /></Link>
        <Link to="/faq" className="btn btn--lg pub-btn-glass">Read the FAQ</Link>
      </CtaBand>
    </>
  );
}
