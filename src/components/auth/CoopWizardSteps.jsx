import { Plus, Trash2, Pencil } from 'lucide-react';
import { TextField, SelectField, Checkbox, Button, Banner, InfoList, StatusPill } from '../ui/index.js';
import { BANKS } from '../inv/invData.js';
import { NIGERIAN_LGAS } from '../../data/nigeriaLgas.js';
import DocumentSlot from './DocumentSlot.jsx';
import {
  COOP_DOCUMENTS, DRAFT_COOP_NAME, NIGERIAN_STATES, PHONE_ERROR, PHONE_HINT, isEmail, isNigerianPhone, normalisePhone, slug,
} from './authUtils.js';

export const COOP_STEPS = ['Organisation', 'Representatives', 'Documents', 'Payout account', 'Review'];
export const COOP_STEP_META = [
  { title: 'Organisation details', help: 'Tell us who you are. Use the details exactly as they appear on your registration certificate.' },
  { title: 'Authorised representatives', help: 'List the people who are allowed to act for the cooperative, for example the chairperson and the secretary.' },
  { title: 'Documents', help: 'Upload clear copies. Reviewers check each one. In this demo files stay in your browser and only the file name is saved.' },
  { title: 'Payout account details', help: 'Enter the cooperative bank and full 10-digit account number. Only the last 4 digits are retained in this demo.' },
  { title: 'Review and submit', help: 'Check everything. You can go back and change any section before you submit.' },
];
const REP_ROLES = ['Chairman', 'Chairperson', 'President', 'Secretary', 'Treasurer', 'Administrator', 'Other'];

export function initialCoopForm(org, user) {
  const docs = {};
  (org.documents || []).forEach((d) => { docs[d.type] = { ...d }; });
  return {
    name: org.name === DRAFT_COOP_NAME ? '' : org.name || '',
    regNumber: org.regNumber || '',
    yearEstablished: org.yearEstablished ? String(org.yearEstablished) : '',
    email: org.email || user.email || '',
    phone: org.phone || user.phone || '',
    address: org.address || '',
    state: org.state || '',
    lga: org.lga || '',
    reps: org.representatives?.length ? org.representatives.map((r) => ({ ...r })) : [{ name: user.name || '', role: '' }],
    docs,
    bankName: org.bank?.name || '',
    accountNumber: '',
    confirm: false,
  };
}

export function validateCoopStep(step, f) {
  const e = {};
  const year = new Date().getFullYear();
  if (step === 0) {
    const stateLgas = NIGERIAN_LGAS[f.state] || [];
    if (f.name.trim().length < 3) e.name = 'Enter the cooperative name as it appears on the registration certificate.';
    if (!f.regNumber.trim()) e.regNumber = 'Enter the registration number from your certificate.';
    else if (!/^[A-Za-z0-9/ .-]{4,40}$/.test(f.regNumber.trim())) e.regNumber = 'Use letters, numbers, slashes or hyphens only, at least 4 characters.';
    if (!f.yearEstablished) e.yearEstablished = 'Enter the year the cooperative was established, for example 2016.';
    else if (!/^\d{4}$/.test(f.yearEstablished) || Number(f.yearEstablished) < 1900 || Number(f.yearEstablished) > year) e.yearEstablished = `Enter a four digit year between 1900 and ${year}.`;
    if (!f.email.trim()) e.email = 'Enter the official email address of the cooperative.';
    else if (!isEmail(f.email)) e.email = 'Enter a valid email address, for example office@yourcooperative.org.';
    if (!f.phone.trim()) e.phone = 'Enter the official phone number.';
    else if (!isNigerianPhone(f.phone)) e.phone = PHONE_ERROR;
    if (f.address.trim().length < 5) e.address = 'Enter the street address of the cooperative office.';
    if (!f.state) e.state = 'Choose the state.';
    else if (!stateLgas.includes(f.lga)) e.lga = 'Choose an LGA in the selected state.';
  }
  if (step === 1) {
    f.reps.forEach((r, i) => {
      if (r.name.trim().length < 2) e[`rep-${i}-name`] = 'Enter the full name.';
      if (!r.role) e[`rep-${i}-role`] = 'Choose a role.';
    });
  }
  if (step === 2) {
    COOP_DOCUMENTS.filter((d) => d.required).forEach((d) => {
      if (!f.docs[d.type]?.file) e[`doc-${slug(d.type)}`] = 'Upload this document to continue.';
    });
  }
  if (step === 3) {
    if (!/^\d{10}$/.test(f.accountNumber)) e.accountNumber = 'Enter the full 10-digit account number.';
    if (f.bankName.trim().length < 2) e.bankName = 'Choose the name of the bank.';
  }
  if (step === 4 && !f.confirm) e.confirm = 'Tick the box to confirm before you submit.';
  return e;
}

// What each step writes to the cooperative record. Used on Next, Back, "Save and finish later" and Submit.
export function coopPatch(step, f) {
  if (step === 0) {
    return {
      name: f.name.trim() || DRAFT_COOP_NAME,
      regNumber: f.regNumber.trim(),
      yearEstablished: f.yearEstablished ? Number(f.yearEstablished) : null,
      email: f.email.trim(),
      phone: isNigerianPhone(f.phone) ? normalisePhone(f.phone) : f.phone.trim(),
      address: f.address.trim(),
      state: f.state,
      lga: f.lga.trim(),
    };
  }
  if (step === 1) return { representatives: f.reps.filter((r) => r.name.trim() || r.role).map((r) => ({ name: r.name.trim(), role: r.role })) };
  if (step === 2) {
    const order = COOP_DOCUMENTS.map((d) => d.type);
    const types = [...order, ...Object.keys(f.docs).filter((t) => !order.includes(t))];
    return {
      documents: types.filter((t) => f.docs[t]?.file).map((t) => {
        const d = f.docs[t];
        return { id: d.id || `d-${slug(t)}`, type: t, file: d.file, size: d.size || null, status: d.status || 'Uploaded', reviewer: d.reviewer ?? null, reviewedAt: d.reviewedAt ?? null };
      }),
    };
  }
  if (step === 3) return { bank: { name: f.bankName.trim(), accountName: f.name.trim(), last4: f.accountNumber.slice(-4) } };
  return {};
}
export const coopAllPatch = (f) => [0, 1, 2, 3].reduce((acc, s) => ({ ...acc, ...coopPatch(s, f) }), {});

// ---------- step bodies ----------
export function OrganisationStep({ form, errors, set }) {
  const bind = (name) => ({ name, value: form[name], error: errors[name], onChange: (e) => set(name, e.target.value) });
  const lgas = NIGERIAN_LGAS[form.state] || [];
  return (
    <div className="form-grid">
      <TextField className="full" label="Cooperative name" required autoComplete="organization" placeholder="Enter cooperative name" {...bind('name')} />
      <TextField label="Registration number" required placeholder="Enter registration number" hint="As shown on your certificate." {...bind('regNumber')} />
      <TextField label="Year established" required inputMode="numeric" maxLength={4} placeholder="E.g. 2016" {...bind('yearEstablished')} onChange={(e) => set('yearEstablished', e.target.value.replace(/\D/g, '').slice(0, 4))} />
      <TextField label="Official email" required type="email" autoComplete="email" placeholder="office@yourcooperative.org" {...bind('email')} />
      <TextField label="Official phone" required type="tel" autoComplete="tel" placeholder="0803 123 4567" hint={PHONE_HINT} {...bind('phone')} />
      <TextField className="full" label="Address" required autoComplete="street-address" placeholder="Street and area of the cooperative office" {...bind('address')} />
      <SelectField label="State" required placeholder="Select state" options={NIGERIAN_STATES} name="state" value={form.state} error={errors.state} onChange={(e) => { set('state', e.target.value); set('lga', ''); }} />
      <SelectField label="Local government area (LGA)" required placeholder={form.state ? 'Select LGA' : 'Select state first'} options={lgas} name="lga" value={form.lga} error={errors.lga} disabled={!form.state} onChange={(e) => set('lga', e.target.value)} />
    </div>
  );
}

export function RepresentativesStep({ form, errors, set, clear }) {
  const setRow = (i, key, value) => {
    set('reps', form.reps.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
    clear(`rep-${i}-${key}`);
  };
  const add = () => set('reps', [...form.reps, { name: '', role: '' }]);
  const remove = (i) => {
    set('reps', form.reps.filter((_, j) => j !== i));
    clear(...Object.keys(errors).filter((k) => k.startsWith('rep-')));
  };
  return (
    <div className="stack">
      {form.reps.map((r, i) => {
        const options = !r.role || REP_ROLES.includes(r.role) ? REP_ROLES : [...REP_ROLES, r.role];
        return (
          <fieldset className="auth-rep" key={i}>
            <legend className="auth-rep__legend">Representative {i + 1}</legend>
            <TextField label="Full name" required autoComplete="name" placeholder="Enter full name" value={r.name} error={errors[`rep-${i}-name`]} onChange={(e) => setRow(i, 'name', e.target.value)} />
            <SelectField label="Role" required placeholder="Select role" options={options} value={r.role} error={errors[`rep-${i}-role`]} onChange={(e) => setRow(i, 'role', e.target.value)} />
            <Button variant="danger-outline" size="sm" className="auth-rep__remove" onClick={() => remove(i)} disabled={form.reps.length === 1} aria-label={`Remove representative ${i + 1}`}>
              <Trash2 size={16} />Remove
            </Button>
          </fieldset>
        );
      })}
      <div><Button variant="outline-green" onClick={add}><Plus size={16} />Add another representative</Button></div>
    </div>
  );
}

export function DocumentsStep({ form, errors, set, clear }) {
  return (
    <div className="stack-lg">
      {COOP_DOCUMENTS.map((d) => (
        <DocumentSlot
          key={d.type}
          label={d.type}
          hint={d.hint}
          required={d.required}
          doc={form.docs[d.type]}
          error={errors[`doc-${slug(d.type)}`]}
          onChange={(doc) => {
            const docs = { ...form.docs };
            if (doc) docs[d.type] = doc; else delete docs[d.type];
            set('docs', docs);
            clear(`doc-${slug(d.type)}`);
          }}
        />
      ))}
    </div>
  );
}

export function PayoutStep({ form, errors, set }) {
  const bind = (name) => ({ name, value: form[name], error: errors[name], onChange: (e) => set(name, e.target.value) });
  return (
    <div className="stack">
      <Banner tone="green" title="CollabFarm never holds your money">
        Payments are made by a regulated financial partner, not by CollabFarm. Enter the full 10-digit number; this demo retains only the last 4 digits. The account name below comes from your cooperative profile and is not verified against the bank.
      </Banner>
      <div className="form-grid">
        <TextField label="Account name" value={form.name || ''} readOnly hint="Filled from your cooperative name; bank account-name lookup is not connected." />
        <SelectField label="Bank name" required placeholder="Choose bank" options={BANKS} {...bind('bankName')} />
        <TextField label="Account number" required inputMode="numeric" maxLength={10} autoComplete="off" placeholder="10-digit account number" {...bind('accountNumber')} onChange={(e) => set('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 10))} />
      </div>
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

export function CoopReviewStep({ form, errors, set, goTo }) {
  return (
    <div className="stack-lg">
      <ReviewSection title="Organisation details" onEdit={() => goTo(0)}>
        <InfoList compact items={[
          ['Name', form.name || '-'], ['Registration number', form.regNumber || '-'], ['Year established', form.yearEstablished || '-'],
          ['Official email', form.email || '-'], ['Official phone', form.phone || '-'], ['Address', form.address || '-'],
          ['State and LGA', [form.state, form.lga].filter(Boolean).join(', ') || '-'],
        ]} />
      </ReviewSection>
      <ReviewSection title="Authorised representatives" onEdit={() => goTo(1)}>
        <InfoList compact items={form.reps.map((r, i) => [`Representative ${i + 1}`, `${r.name || '-'}${r.role ? `, ${r.role}` : ''}`])} />
      </ReviewSection>
      <ReviewSection title="Documents" onEdit={() => goTo(2)}>
        <InfoList compact items={COOP_DOCUMENTS.map((d) => [d.type, form.docs[d.type]?.file
          ? <span className="auth-review__doc">{form.docs[d.type].file} <StatusPill>{form.docs[d.type].status || 'Uploaded'}</StatusPill></span>
          : (d.required ? 'Missing' : 'Not provided')])}
        />
      </ReviewSection>
      <ReviewSection title="Payout account" onEdit={() => goTo(3)}>
        <InfoList compact items={[['Account name', form.name || '-'], ['Bank', form.bankName || '-'], ['Account number', form.accountNumber ? `Ending ${form.accountNumber.slice(-4)}` : '-']]} />
      </ReviewSection>
      <Banner tone="info" title="What happens after you submit">
        A CollabFarm reviewer checks your details and documents. Uploaded is not the same as verified: a document counts only after a reviewer marks it Verified. Verification is not a guarantee of funding. You can follow progress on the status page.
      </Banner>
      <Checkbox checked={form.confirm} onChange={(v) => set('confirm', v)} error={errors.confirm}>
        I confirm that these details are accurate and that I am allowed to submit them for this cooperative.
      </Checkbox>
    </div>
  );
}
