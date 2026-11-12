import { AlertCircle, Check, Pencil } from 'lucide-react';
import { TextField, SelectField, Checkbox, Button, Banner, InfoList, StatusPill } from '../ui/index.js';
import DocumentSlot from './DocumentSlot.jsx';
import { isEmail } from './authUtils.js';

export const INVESTOR_STEPS = ['Profile', 'Identity', 'Review'];
export const INVESTOR_STEP_META = [
  { title: 'Investor profile', help: 'Enter the details required for your investor type.' },
  { title: 'Identity verification', help: 'Upload the documents needed to verify your investor profile.' },
  { title: 'Review and submit', help: 'Check everything. You can go back and change any section before you submit.' },
];

export const INVESTOR_TYPES = [
  { value: 'Individual', label: 'Individual', text: 'Investing on your own behalf.' },
  { value: 'Group', label: 'Group', text: 'Representing an organisation, fund, or investment group.' },
];
const COUNTRIES = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'United Kingdom', 'United States', 'Canada', 'United Arab Emirates', 'Germany', 'France', 'Other'];

export function initialInvestorForm(org) {
  const type = org.type === 'Private Investor' ? 'Individual'
    : ['Impact Investor', 'Institutional'].includes(org.type) ? 'Group'
      : INVESTOR_TYPES.some((option) => option.value === org.type) ? org.type : 'Individual';
  return {
    type,
    companyName: org.companyName || (org.org && org.org !== 'Individual' ? org.org : ''),
    companyAddress: org.companyAddress || org.address || '',
    companyEmail: org.companyEmail || org.email || '',
    companyPhone: org.companyPhone || org.phone || '',
    yearEstablished: org.yearEstablished ? String(org.yearEstablished) : '',
    registrationNumber: org.companyRegistrationNumber || org.regNumber || '',
    country: org.nationality || org.country || 'Nigeria',
    city: org.city || (org.location ? String(org.location).split(',')[0].trim() : ''),
    address: org.address || '',
    idType: org.idType || '',
    idNumber: org.idNumber || '',
    idDoc: org.idDocument?.file ? { ...org.idDocument } : null,
    registrationDoc: org.registrationDocument?.file ? { ...org.registrationDocument } : null,
    proofDoc: org.proofOfAddress?.file ? { ...org.proofOfAddress } : null,
    confirm: false,
  };
}
const needsOrgName = (type) => type === 'Group';

export function validateInvestorStep(step, f) {
  const e = {};
  if (step === 0) {
    if (!f.type) e.type = 'Choose the type of investor you are.';
    if (needsOrgName(f.type)) {
      if (f.companyName.trim().length < 2) e.companyName = 'Enter the company name.';
      if (f.companyAddress.trim().length < 5) e.companyAddress = 'Enter the company address.';
      if (!f.companyEmail.trim()) e.companyEmail = 'Enter the company email address.';
      else if (!isEmail(f.companyEmail)) e.companyEmail = 'Enter a valid email address.';
      if (!f.companyPhone.trim()) e.companyPhone = 'Enter the company phone number.';
      else if (!/^\+?[\d\s().-]{7,20}$/.test(f.companyPhone.trim())) e.companyPhone = 'Enter a valid phone number.';
      const currentYear = new Date().getFullYear();
      if (!f.yearEstablished) e.yearEstablished = 'Enter the year the company was established.';
      else if (!/^\d{4}$/.test(f.yearEstablished) || Number(f.yearEstablished) < 1900 || Number(f.yearEstablished) > currentYear) {
        e.yearEstablished = `Enter a four digit year between 1900 and ${currentYear}.`;
      }
      if (!f.registrationNumber.trim()) e.registrationNumber = 'Enter the company registration number.';
    } else {
      if (!f.country) e.country = 'Choose your country.';
      if (f.city.trim().length < 2) e.city = 'Enter your city or town.';
      if (f.address.trim().length < 5) e.address = 'Enter your street address.';
    }
  }
  if (step === 1) {
    if (needsOrgName(f.type)) {
      if (!f.registrationDoc?.fileObject) e.registrationDoc = 'Select the company registration file to upload.';
      if (!f.proofDoc?.fileObject) e.proofDoc = 'Select the proof of address file to upload.';
    } else {
      if (!f.idNumber.trim()) e.idNumber = 'Enter your ID number.';
      if (!f.idDoc?.fileObject) e.idDoc = 'Select your identification file to upload.';
    }
  }
  if (step === 2 && !f.confirm) e.confirm = 'Tick the box to confirm before you submit.';
  return e;
}

export function investorPatch(step, f) {
  if (step === 0) {
    const org = needsOrgName(f.type) ? f.companyName.trim() : 'Individual';
    if (needsOrgName(f.type)) {
      return {
        type: f.type,
        org,
        companyName: org,
        companyAddress: f.companyAddress.trim(),
        companyEmail: f.companyEmail.trim(),
        companyPhone: f.companyPhone.trim(),
        yearEstablished: Number(f.yearEstablished),
        companyRegistrationNumber: f.registrationNumber.trim(),
        address: f.companyAddress.trim(),
        email: f.companyEmail.trim(),
        phone: f.companyPhone.trim(),
        regNumber: f.registrationNumber.trim(),
      };
    }
    return {
      type: f.type,
      org,
      companyName: null,
      companyAddress: null,
      companyEmail: null,
      companyPhone: null,
      yearEstablished: null,
      companyRegistrationNumber: null,
      country: f.country,
      nationality: f.country,
      city: f.city.trim(),
      location: [f.city.trim(), f.country].filter(Boolean).join(', '),
      address: f.address.trim(),
    };
  }
  if (step === 1) {
    if (needsOrgName(f.type)) {
      return {
        idType: null,
        idNumber: null,
        idDocument: null,
        registrationDocument: f.registrationDoc?.file ? { file: f.registrationDoc.file, size: f.registrationDoc.size || null, status: 'Uploaded' } : null,
        proofOfAddress: f.proofDoc?.file ? { file: f.proofDoc.file, size: f.proofDoc.size || null, status: 'Uploaded' } : null,
      };
    }
    return {
      idNumber: f.idNumber.trim(),
      idDocument: f.idDoc?.file ? { file: f.idDoc.file, size: f.idDoc.size || null, status: 'Uploaded' } : null,
      registrationDocument: null,
      proofOfAddress: null,
    };
  }
  return {};
}
export const investorAllPatch = (f) => [0, 1].reduce((acc, s) => ({ ...acc, ...investorPatch(s, f) }), {});

// ---------- step bodies ----------
export function ProfileStep({ form, errors, set }) {
  const bind = (name) => ({ name, value: form[name], error: errors[name], onChange: (e) => set(name, e.target.value) });
  const countries = COUNTRIES.includes(form.country) || !form.country ? COUNTRIES : [...COUNTRIES, form.country];
  return (
    <div className="stack">
      <fieldset className="auth-fieldset">
        <legend className="field__label">Investor type<span className="req" aria-hidden="true">*</span></legend>
        <div className="auth-choice-grid">
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
        {needsOrgName(form.type) ? (
          <>
            <TextField className="full" label="Company name" required autoComplete="organization" placeholder="Enter company name" {...bind('companyName')} />
            <TextField className="full" label="Company address" required autoComplete="street-address" placeholder="Enter company address" {...bind('companyAddress')} />
            <TextField label="Email" required type="email" autoComplete="email" placeholder="office@company.com" {...bind('companyEmail')} />
            <TextField label="Phone number" required type="tel" autoComplete="tel" placeholder="Enter phone number" {...bind('companyPhone')} />
            <TextField label="Year established" required inputMode="numeric" maxLength={4} placeholder="E.g. 2016" {...bind('yearEstablished')} onChange={(e) => set('yearEstablished', e.target.value.replace(/\D/g, '').slice(0, 4))} />
            <TextField label="Company registration number" required placeholder="Enter registration number" {...bind('registrationNumber')} />
          </>
        ) : (
          <>
            <SelectField label="Nationality" required options={countries} {...bind('country')} />
            <TextField label="City or town" required autoComplete="address-level2" placeholder="E.g. Abuja" {...bind('city')} />
            <TextField className="full" label="Address" required autoComplete="street-address" placeholder="Street and area" {...bind('address')} />
          </>
        )}
      </div>
    </div>
  );
}

export function IdentityStep({ form, errors, set, clear }) {
  if (needsOrgName(form.type)) {
    return (
      <div className="stack">
        <Banner tone="info">Upload clear copies of the company registration document and proof of the company address.</Banner>
        <DocumentSlot
          label="Company registration file"
          hint="Official company registration certificate or document. PDF, JPG or PNG, up to 5MB."
          required
          doc={form.registrationDoc}
          error={errors.registrationDoc}
          onChange={(doc) => { set('registrationDoc', doc); clear('registrationDoc'); }}
        />
        <DocumentSlot
          label="Proof of address file"
          hint="A recent utility bill or other official proof of the company address. PDF, JPG or PNG, up to 5MB."
          required
          doc={form.proofDoc}
          error={errors.proofDoc}
          onChange={(doc) => { set('proofDoc', doc); clear('proofDoc'); }}
        />
      </div>
    );
  }
  return (
    <div className="stack">
      <Banner tone="info">Upload a clear photo or scan of your identity document. It will be sent with your profile for verification.</Banner>
      <TextField label="ID Number" required autoComplete="off" placeholder="Enter your ID number" name="idNumber" value={form.idNumber} error={errors.idNumber} onChange={(e) => set('idNumber', e.target.value)} />
      <DocumentSlot
        label="Identification document"
        hint="A clear photo or scan of the whole document. PDF, JPG or PNG, up to 5MB."
        required
        doc={form.idDoc}
        error={errors.idDoc}
        onChange={(doc) => { set('idDoc', doc); clear('idDoc'); }}
      />
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
  const profileItems = needsOrgName(form.type)
    ? [
      ['Investor type', typeLabel],
      ['Company name', form.companyName || '-'],
      ['Company address', form.companyAddress || '-'],
      ['Email', form.companyEmail || '-'],
      ['Phone number', form.companyPhone || '-'],
      ['Year established', form.yearEstablished || '-'],
      ['Company registration number', form.registrationNumber || '-'],
    ]
    : [
      ['Investor type', typeLabel],
      ['Organisation', 'Individual'],
      ['Nationality', form.country],
      ['City or town', form.city || '-'],
      ['Address', form.address || '-'],
    ];
  const identityItems = needsOrgName(form.type)
    ? [
      ['Company registration file', form.registrationDoc?.file ? <span className="auth-review__doc">{form.registrationDoc.file} <StatusPill>Uploaded</StatusPill></span> : 'Missing'],
      ['Proof of address file', form.proofDoc?.file ? <span className="auth-review__doc">{form.proofDoc.file} <StatusPill>Uploaded</StatusPill></span> : 'Missing'],
    ]
    : [
      ['ID Number', form.idNumber || '-'],
      ['File', form.idDoc?.file ? <span className="auth-review__doc">{form.idDoc.file} <StatusPill>Uploaded</StatusPill></span> : 'Missing'],
    ];
  return (
    <div className="stack-lg">
      <ReviewSection title="Profile" onEdit={() => goTo(0)}>
        <InfoList compact items={profileItems} />
      </ReviewSection>
      <ReviewSection title="Identity" onEdit={() => goTo(1)}>
        <InfoList compact items={identityItems} />
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
