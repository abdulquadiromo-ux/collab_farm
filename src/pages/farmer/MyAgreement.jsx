import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Download, Languages, PenLine, ChevronDown, ShieldCheck, History, CheckCircle2, Sprout } from 'lucide-react';
import { Card, CardHeader, PageHeader, Banner, Button, LinkButton, SelectField, TextField, Timeline, EmptyState } from '../../components/ui/index.js';
import { useApp, simulate, useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatDate, formatDateTime, cx } from '../../utils/format.js';
import { useFarmerCtx, isoNow, downloadText } from '../../components/farm/farmerData.js';
import { LANGUAGES, HEADING_LABELS, summarySections, fullClauses, agreementDownload } from '../../components/farm/agreementText.js';
import { farmerGate, StatusChip, Explain } from '../../components/farm/FarmUi.jsx';
import '../../styles/pages/farm.css';

export default function MyAgreement() {
  const loading = useSimulatedLoad(350);
  const ctx = useFarmerCtx();
  const gate = farmerGate(ctx, loading);
  if (gate) return gate;
  return <AgreementContent ctx={ctx} />;
}

const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const jump = (id) => window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);

function AgreementContent({ ctx }) {
  const { add, update, notify, toast } = useApp();
  const { farmer, name, coop, pkg, contract, obligations, ob } = ctx;
  const [params, setParams] = useSearchParams();
  const lang = LANGUAGES.includes(params.get('lang')) ? params.get('lang') : 'English';
  const [openClauses, setOpenClauses] = useState([]);
  const [typed, setTyped] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // The farmer's own Agreement C, or a generated summary if no record exists yet.
  const view = useMemo(() => contract || {
    id: `ag-c-${farmer.id}`,
    type: 'C',
    title: 'Individual Farmer Participation Agreement',
    packageId: pkg?.id || null,
    partyType: 'Farmer',
    partyId: farmer.id,
    partyName: name,
    version: 'v1.1',
    status: farmer.agreementStatus === 'Signed' ? 'Signed' : 'Awaiting Signature',
    signedAt: null,
    signatory: null,
    language: 'English',
    repayment: [ob.repayDue > 0 && `Repayment of ${ob.repayDue}`, ob.produceDueKg > 0 && `delivery of ${ob.produceDueKg} kg`].filter(Boolean).join(' plus ') || 'As per agreement',
    history: [{ version: 'v1.1', date: '2026-05-01', change: 'Current template' }],
    generated: true,
  }, [contract, farmer, pkg, name, ob]);

  const signed = view.status === 'Signed';
  const labels = HEADING_LABELS[lang];
  const sections = useMemo(() => summarySections(ctx), [ctx]);
  const clauses = useMemo(() => fullClauses(ctx), [ctx]);
  const allOpen = openClauses.length === clauses.length;

  const toggleClause = (n) => setOpenClauses((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));

  const download = () => {
    downloadText(`farmer-agreement-${view.version}.txt`, agreementDownload(ctx, view));
    toast('A text copy of your agreement was saved to your device.');
  };

  const sign = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!typed.trim()) e.typed = 'Type your full name to sign.';
    else if (norm(typed) !== norm(name)) e.typed = `Please type your name exactly as shown: ${name}.`;
    if (!consent) e.consent = 'Please tick the box to show that you understand and agree.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    await simulate(700);
    const now = isoNow();
    const patch = {
      status: 'Signed',
      signedAt: now,
      signatory: `${typed.trim()} (typed signature)`,
      signedVersion: view.version,
      consentRecorded: true,
      history: [...(view.history || []), { version: view.version, date: now.slice(0, 10), change: `Signed by ${typed.trim()}` }],
    };
    const auditEntry = { action: 'Farmer signed agreement', entityType: 'Contract', summary: `${name} signed Agreement C ${view.version} with typed name and consent.`, reason: 'Individual Farmer Participation Agreement' };
    if (contract) update('contracts', contract.id, patch, auditEntry);
    else { const { generated, ...rest } = view; add('contracts', { ...rest, ...patch }, auditEntry); }
    update('farmers', farmer.id, { agreementStatus: 'Signed', agreementSignedAt: now });
    notify('cooperative', 'A farmer signed their agreement', `${name} signed the Farmer Participation Agreement (${view.version}).`, '/coop/contracts', 'contract');
    setSaving(false);
    setTyped('');
    setConsent(false);
    toast('Your agreement is signed. Thank you.');
  };

  return (
    <div className="page farm-page">
      <PageHeader
        title="My Agreement"
        subtitle="Your copy of the Farmer Participation Agreement."
        actions={<Button variant="outline-green" className="farm-btn" onClick={download}><Download size={18} />Download a copy</Button>}
      />

      {!signed && (
        <Banner tone="warn" title="Your agreement is not signed yet">
          <p>Read the simple words below, then sign at the bottom of this page.</p>
          <div className="farm-banner-action"><Button variant="outline" className="farm-btn" onClick={() => jump('sign-agreement')}><PenLine size={18} />Go to signing</Button></div>
        </Banner>
      )}

      <Card>
        <div className="farm-hero-card__top">
          <span className="farm-item__icon" aria-hidden="true"><FileText size={24} /></span>
          <div className="grow">
            <h2 className="farm-hero-card__title">{view.title}</h2>
            <p className="muted small">Version {view.version}{pkg ? `. ${pkg.name}` : ''}{coop ? `. ${coop.name}` : ''}</p>
            {signed && (
              <p className="small">{view.signedAt ? `Signed by ${view.signatory || name} on ${formatDateTime(view.signedAt)}.` : 'Signed. Your cooperative holds the signed record.'}</p>
            )}
          </div>
          <StatusChip tone={signed ? 'green' : 'amber'}>{view.status}</StatusChip>
        </div>
        <Explain>These terms are an example and can be configured. The final numbers come from your signed agreement.</Explain>
      </Card>

      <Card>
        <div className="farm-lang">
          <span className="farm-item__icon" aria-hidden="true"><Languages size={22} /></span>
          <SelectField
            className="grow"
            label="Language of the headings"
            value={lang}
            onChange={(e) => setParams(e.target.value === 'English' ? {} : { lang: e.target.value }, { replace: true })}
            options={LANGUAGES}
          />
        </div>
        {lang !== 'English' && (
          <Banner tone="info" title={`Only the four headings are shown in ${lang}`}>
            The sentences under each heading and the full terms stay in English. Full translations are provided by your cooperative{coop ? ` (${coop.name})` : ''}. Please ask for one before you sign.
          </Banner>
        )}
        {view.language && <p className="small muted mt-4">Languages your cooperative reports providing: {view.language}.</p>}
      </Card>

      <section aria-labelledby="simple-title" className="stack">
        <h2 id="simple-title" className="farm-section-title"><CheckCircle2 size={22} aria-hidden="true" />{labels.summary}</h2>
        <div className="grid-2">
          {sections.map((s) => (
            <Card key={s.key} className="farm-summary-card">
              <h3 lang={lang === 'English' ? 'en' : undefined}>{labels[s.key]}</h3>
              <ul className="farm-bullets farm-bullets--plain">
                {s.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader
          title="Full terms"
          subtitle="Tap a clause to read it."
          action={<Button variant="outline" size="sm" className="farm-btn" onClick={() => setOpenClauses(allOpen ? [] : clauses.map((c) => c.n))}>{allOpen ? 'Close all' : 'Open all'}</Button>}
        />
        <ul className="farm-accordion">
          {clauses.map((c) => {
            const open = openClauses.includes(c.n);
            return (
              <li key={c.n}>
                <button type="button" className="farm-accordion__btn" aria-expanded={open} aria-controls={`clause-${c.n}`} onClick={() => toggleClause(c.n)}>
                  <span><span className="farm-accordion__num">{c.n}</span>{c.title}</span>
                  <ChevronDown size={20} className={cx(open && 'farm-flip')} aria-hidden="true" />
                </button>
                <div id={`clause-${c.n}`} className="farm-accordion__panel" hidden={!open}>
                  {c.body.map((b) => <p key={b}>{b}</p>)}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Version and history" subtitle="Every version is kept. Nothing is overwritten." />
        <Timeline items={[...(view.history || [])].reverse().map((h, i) => ({
          title: `${h.version}${i === 0 ? ' (latest)' : ''}`,
          meta: formatDate(h.date),
          body: h.change,
          state: 'done',
        }))} />
        {(view.history || []).length === 0 && <EmptyState icon={<History size={28} />} title="No history yet" />}
      </Card>

      {signed ? (
        <Card tone="tint">
          <CardHeader title="Your signature" />
          <p className="small"><ShieldCheck size={16} aria-hidden="true" className="farm-inline-icon" /> Signed as <strong>{view.signatory || name}</strong>{view.signedAt ? ` on ${formatDateTime(view.signedAt)}` : ''}. Version {view.signedVersion || view.version}. Your consent was recorded.</p>
          <div className="farm-actions">
            <LinkButton to="/farmer/allocation" className="farm-btn"><Sprout size={18} />See my allocation</LinkButton>
            <Button variant="outline-green" className="farm-btn" onClick={download}><Download size={18} />Download a copy</Button>
          </div>
        </Card>
      ) : (
        <Card id="sign-agreement" className="farm-scroll-target">
          <CardHeader title="Sign my agreement" subtitle="Your typed name is your signature. We record your name, the version and the time." />
          <form onSubmit={sign} noValidate className="stack-lg">
            <TextField
              label="Type your full name"
              required
              value={typed}
              onChange={(e) => { setTyped(e.target.value); setErrors((s) => ({ ...s, typed: undefined })); }}
              placeholder={name}
              hint={`Your name on file is: ${name}`}
              error={errors.typed}
              autoComplete="off"
            />
            <div className="stack-sm">
              <label className="check farm-check">
                <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErrors((s) => ({ ...s, consent: undefined })); }} />
                <span>I have read the simple words and understand them. I agree to the terms and to how my data is used.</span>
              </label>
              {errors.consent && <span className="field__error" role="alert">{errors.consent}</span>}
            </div>
            <Explain>Signing does not promise a good harvest or any income. It records what you receive and what you agree to do.</Explain>
            <div className="farm-actions">
              <Button type="submit" size="lg" className="farm-btn" loading={saving}><PenLine size={18} />Sign agreement</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
