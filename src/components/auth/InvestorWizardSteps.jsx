import { AlertCircle, Check, Pencil } from 'lucide-react';
import { TextField, SelectField, TextAreaField, Checkbox, Button, Banner, InfoList, StatusPill } from '../ui/index.js';
import DocumentSlot from './DocumentSlot.jsx';

export const INVESTOR_STEPS = ['Profile', 'Identity', 'Eligibility', 'Risks', 'Review'];
export const INVESTOR_STEP_META = [
  { title: 'Investor profile', help: 'Tell us what kind of investor you are and where you are based.' },
  { title: 'Identity verification', help: 'We must know who you are before you can commit money. In this demo the file stays in your browser and only its name is saved.' },
  { title: 'Eligibility and source of funds', help: 'A short declaration so a reviewer can check that you are allowed to invest and that the money is lawful.' },
  { title: 'Risk acknowledgement', help: 'Investing in farming can lose money. Please read each statement and tick it to show you understand.' },
  { title: 'Review and submit', help: 'Check everything. You can go back and change any section before you submit.' },
];

// Stored `type` values match the seed investors. Labels follow the Figma and brief wording.
export const INVESTOR_TYPES = [
  { value: 'Private Investor', label: 'Private', text: 'A person investing their own money.' },
  { value: 'Impact Investor', label: 'Impact', text: 'A person or fund that wants social or environmental results as well as a return.' },
  { value: 'Institutional', label: 'Institutional', text: 'A company, trust, bank or fund investing for an organisation.' },
];
const COUNTRIES = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'United Kingdom', 'United States', 'Canada', 'United Arab Emirates', 'Germany', 'France', 'Other'];
const ID_TYPES = ['National identification number (NIN) slip or card', 'International passport', "Driver's licence", "Voter's card", 'Certificate of incorporation or registration (organisations)'];
const SOURCES = ['Salary or business income', 'Savings', 'Sale of property or other assets', 'Inheritance or gift', 'Investment returns', 'Institutional or fund capital', 'Grant or donor funds', 'Other'];

export const DECLARATIONS = [
  { id: 'authorised', text: 'I am 18 or older, or I am allowed to act for the organisation I named in my profile.' },
  { id: 'ownFunds', text: 'The money I will commit is my own, or my organisation\'s, and I may lawfully invest it.' },
  { id: 'lawful', text: 'The money does not come from any illegal activity.' },
  { id: 'pep', text: 'I will tell CollabFarm if I, or someone close to me, holds a senior public position.' },
  { id: 'rules', text: 'I understand that eligibility rules can differ by legal structure and can change. A reviewer decides whether I am eligible.' },
];

export const RISKS = [
  { id: 'loss', text: 'I could lose some or all of the money I commit. This is an investment, not a savings account.' },
  { id: 'estimates', text: 'Expected returns are estimates. They are not guaranteed, and neither is getting my original money back.' },
  { id: 'approval', text: 'A project approved by CollabFarm can still fail. Approval is not a guarantee of success.' },
  { id: 'crops', text: 'Weather, pests, prices and delays can reduce or delay what I receive. A crop failure is not treated as fraud.' },
  { id: 'commitment', text: 'A commitment is not received money. My money counts only after the financial partner confirms it.' },
  { id: 'staged', text: 'Money is released to the cooperative in stages, only when conditions are met. Some of it may stay unspent for a while.' },
  { id: 'lockin', text: 'I cannot take back committed money outside the agreed terms, and there is no market where I can sell my place early.' },
  { id: 'custody', text: 'CollabFarm does not hold or pool my money. A regulated financial partner does.' },
  { id: 'terms', text: 'How I am paid back (a loan, a profit share or a harvest share) is set in the agreement for each package and can differ between packages.' },
];

export function initialInvestorForm(org) {
  const ticked = org.risksAcknowledged || (org.riskAcknowledged ? RISKS.map((r) => r.id) : []);
  return {
    type: org.type || 'Private Investor',
    orgName: org.org && org.org !== 'Individual' ? org.org : '',
    country: org.country || 'Nigeria',
    city: org.city || (org.location ? String(org.location).split(',')[0].trim() : ''),
    address: org.address || '',
    idType: org.idType || '',
    idDoc: org.idDocument?.file ? { ...org.idDocument } : null,
    proofDoc: org.proofOfAddress?.file ? { ...org.proofOfAddress } : null,
    decl: org.eligibilityDeclarations || {},
    sourceOfFunds: org.sourceOfFunds || '',
    statement: org.fundsStatement || '',
    risks: Object.fromEntries(ticked.map((id) => [id, true])),
    confirm: false,
  };
}
const needsOrgName = (type) => type !== 'Private Investor';

export function validateInvestorStep(step, f) {
  const e = {};
  if (step === 0) {
    if (!f.type) e.type = 'Choose the type of investor you are.';
    if (needsOrgName(f.type) && f.orgName.trim().length < 2) e.orgName = 'Enter the name of your organisation or fund.';
    if (!f.country) e.country = 'Choose your country.';
    if (f.city.trim().length < 2) e.city = 'Enter your city or town.';
    if (f.address.trim().length < 5) e.address = 'Enter your street address.';
  }
  if (step === 1) {
    if (!f.idType) e.idType = 'Choose the type of identification you will upload.';
    if (!f.idDoc?.file) e.idDoc = 'Upload your identification to continue.';
  }
  if (step === 2) {
    if (!f.sourceOfFunds) e.sourceOfFunds = 'Choose where the money comes from.';
    if (f.statement.trim().length < 20) e.statement = 'Write at least a short sentence (20 characters or more) about where the money comes from.';
    if (DECLARATIONS.some((d) => !f.decl[d.id])) e.decl = 'Tick every declaration to continue.';
  }
  if (step === 3 && RISKS.some((r) => !f.risks[r.id])) e.risks = 'Tick every statement to show you understand the risks.';
  if (step === 4 && !f.confirm) e.confirm = 'Tick the box to confirm before you submit.';
  return e;
}

export function investorPatch(step, f) {
  if (step === 0) {
    const org = needsOrgName(f.type) ? f.orgName.trim() : 'Individual';
    return { type: f.type, org, country: f.country, city: f.city.trim(), location: [f.city.trim(), f.country].filter(Boolean).join(', '), address: f.address.trim() };
  }
  if (step === 1) {
    return {
      idType: f.idType,
      idDocument: f.idDoc?.file ? { file: f.idDoc.file, size: f.idDoc.size || null, status: 'Uploaded' } : null,
      proofOfAddress: f.proofDoc?.file ? { file: f.proofDoc.file, size: f.proofDoc.size || null, status: 'Uploaded' } : null,
    };
  }
  if (step === 2) return { eligibilityDeclarations: { ...f.decl }, sourceOfFunds: f.sourceOfFunds, fundsStatement: f.statement.trim(), eligibility: 'Pending checks' };
  if (step === 3) {
    const ids = RISKS.filter((r) => f.risks[r.id]).map((r) => r.id);
    const all = ids.length === RISKS.length;
    return { risksAcknowledged: ids, riskAcknowledged: all, riskAcknowledgedAt: all ? new Date().toISOString() : null };
  }
  return {};
}
export const investorAllPatch = (f) => [0, 1, 2, 3].reduce((acc, s) => ({ ...acc, ...investorPatch(s, f) }), {});

// ---------- step bodies ----------
export function ProfileStep({ form, errors, set }) {
  const bind = (name) => ({ name, value: form[name], error: errors[name], onChange: (e) => set(name, e.target.value) });
  const countries = COUNTRIES.includes(form.country) || !form.country ? COUNTRIES : [...COUNTRIES, form.country];
  return (
    <div className="stack">
      <fieldset className="auth-fieldset">
        <legend className="field__label">Investor type<span className="req" aria-hidden="true">*</span></legend>
        <div className="auth-choice-grid auth-choice-grid--3">
          {INVESTOR_TYPES.map((t) => (
            <label key={t.value} className="auth-choice">
              <input type="radio" name="investor-type" value={t.value} checked={form.type === t.value} onChange={() => set('type', t.value)} />
              <span className="auth-choice__body">
                <span className="auth-choice__top"><span className="strong">{t.label}</span><span className="auth-choice__tick" aria-hidden="true"><Check size={14} strokeWidth={3} /></span></span>
                <span className="caption muted">{t.text}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.type && <span className="field__error" role="alert"><AlertCircle size={14} />{errors.type}</span>}
      </fieldset>
      <div className="form-grid">
        {needsOrgName(form.type) && <TextField className="full" label="Organisation or fund name" required autoComplete="organization" placeholder="Enter organisation name" {...bind('orgName')} />}
        <SelectField label="Country" required options={countries} {...bind('country')} />
        <TextField label="City or town" required autoComplete="address-level2" placeholder="E.g. Abuja" {...bind('city')} />
        <TextField className="full" label="Address" required autoComplete="street-address" placeholder="Street and area" {...bind('address')} />
      </div>
    </div>
  );
}

export function IdentityStep({ form, errors, set, clear }) {
  return (
    <div className="stack">
      <Banner tone="info">Use a sample file in this demo. Never upload a real identity document: nothing is sent anywhere and only the file name is kept.</Banner>
      <SelectField label="Type of identification" required placeholder="Select identification type" options={ID_TYPES} name="idType" value={form.idType} error={errors.idType} onChange={(e) => set('idType', e.target.value)} />
      <DocumentSlot
        label="Identification document"
        hint="A clear photo or scan of the whole document. PDF, JPG or PNG, up to 5MB."
        required
        doc={form.idDoc}
        error={errors.idDoc}
        onChange={(doc) => { set('idDoc', doc); clear('idDoc'); }}
      />
      <DocumentSlot
        label="Proof of address (utility bill)"
        hint="Optional for now. A recent utility bill helps the reviewer finish faster."
        doc={form.proofDoc}
        onChange={(doc) => set('proofDoc', doc)}
      />
    </div>
  );
}

export function EligibilityStep({ form, errors, set }) {
  return (
    <div className="stack">
      <Banner tone="green" title="Eligibility rules can change">
        Who may invest depends on the legal structure of the platform, and those rules are still configurable. A reviewer checks your answers against the rules in force. Answering here is not an approval.
      </Banner>
      <div className="form-grid">
        <SelectField label="Where does the money come from?" required placeholder="Select source of funds" options={SOURCES} name="sourceOfFunds" value={form.sourceOfFunds} error={errors.sourceOfFunds} onChange={(e) => set('sourceOfFunds', e.target.value)} />
        <TextAreaField className="full" label="Short statement" required maxLength={400} placeholder="In a few sentences, explain where the money comes from." hint={`${form.statement.length} of 400 characters`} name="statement" value={form.statement} error={errors.statement} onChange={(e) => set('statement', e.target.value)} />
      </div>
      <fieldset className="auth-fieldset">
        <legend className="field__label">Declarations<span className="req" aria-hidden="true">*</span></legend>
        <div className="stack-sm">
          {DECLARATIONS.map((d) => (
            <Checkbox key={d.id} checked={!!form.decl[d.id]} onChange={(v) => set('decl', { ...form.decl, [d.id]: v })}>{d.text}</Checkbox>
          ))}
        </div>
        {errors.decl && <span className="field__error" role="alert"><AlertCircle size={14} />{errors.decl}</span>}
      </fieldset>
    </div>
  );
}

export function RisksStep({ form, errors, set }) {
  const count = RISKS.filter((r) => form.risks[r.id]).length;
  return (
    <div className="stack">
      <Banner tone="warn" title="Please read this carefully">
        Farming has real risks. Nothing on this platform is a promise of profit. You must tick every statement before you can submit.
      </Banner>
      <fieldset className="auth-fieldset">
        <legend className="field__label">I understand that<span className="req" aria-hidden="true">*</span></legend>
        <div className="auth-risks">
          {RISKS.map((r) => (
            <Checkbox key={r.id} checked={!!form.risks[r.id]} onChange={(v) => set('risks', { ...form.risks, [r.id]: v })}>{r.text}</Checkbox>
          ))}
        </div>
        <span className="caption muted" aria-live="polite">{count} of {RISKS.length} statements ticked.</span>
        {errors.risks && <span className="field__error" role="alert"><AlertCircle size={14} />{errors.risks}</span>}
      </fieldset>
    </div>
  );
}

function ReviewSection({ title, onEdit, children }) {
  return (
    <section className="auth-review">
      <div className="row between">
        <h3 className="auth-review__title">{title}</h3>
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${title}`}><Pencil size={14} />Edit</Button>
      </div>
      {children}
    </section>
  );
}

export function InvestorReviewStep({ form, errors, set, goTo }) {
  const typeLabel = INVESTOR_TYPES.find((t) => t.value === form.type)?.label || form.type;
  const ticked = RISKS.filter((r) => form.risks[r.id]).length;
  return (
    <div className="stack-lg">
      <ReviewSection title="Profile" onEdit={() => goTo(0)}>
        <InfoList compact items={[['Investor type', typeLabel], ['Organisation', needsOrgName(form.type) ? form.orgName || '-' : 'Individual'], ['Country', form.country], ['City or town', form.city || '-'], ['Address', form.address || '-']]} />
      </ReviewSection>
      <ReviewSection title="Identity" onEdit={() => goTo(1)}>
        <InfoList compact items={[['Identification type', form.idType || '-'], ['File', form.idDoc?.file ? <span className="auth-review__doc">{form.idDoc.file} <StatusPill>Uploaded</StatusPill></span> : 'Missing'], ['Proof of address', form.proofDoc?.file ? <span className="auth-review__doc">{form.proofDoc.file} <StatusPill>Uploaded</StatusPill></span> : 'Not provided']]} />
      </ReviewSection>
      <ReviewSection title="Eligibility and source of funds" onEdit={() => goTo(2)}>
        <InfoList compact items={[['Source of funds', form.sourceOfFunds || '-'], ['Statement', form.statement || '-'], ['Declarations', `${DECLARATIONS.filter((d) => form.decl[d.id]).length} of ${DECLARATIONS.length} ticked`]]} />
      </ReviewSection>
      <ReviewSection title="Risk acknowledgement" onEdit={() => goTo(3)}>
        <InfoList compact items={[['Statements understood', `${ticked} of ${RISKS.length}`]]} />
      </ReviewSection>
      <Banner tone="info" title="What happens after you submit">
        A CollabFarm reviewer checks your identity and eligibility. Until you are Verified you cannot commit money to a package. Verification does not guarantee any return.
      </Banner>
      <Checkbox checked={form.confirm} onChange={(v) => set('confirm', v)} error={errors.confirm}>
        I confirm that these details are accurate and that the money I invest is lawfully mine to invest.
      </Checkbox>
    </div>
  );
}
