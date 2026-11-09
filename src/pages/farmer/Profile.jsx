import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IdCard, Save, ShieldCheck, Upload, Lock, Users, Sprout } from 'lucide-react';
import { Card, CardHeader, PageHeader, Banner, Button, LinkButton, TextField, InfoList, Avatar, FileDrop, Toggle, ConfirmDialog } from '../../components/ui/index.js';
import { useApp, simulate, useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatDate, formatDateTime, cx } from '../../utils/format.js';
import { useFarmerCtx, maskNin, isoNow } from '../../components/farm/farmerData.js';
import { farmerGate, StatusChip, Explain } from '../../components/farm/FarmUi.jsx';
import '../../styles/pages/farm.css';

export default function Profile() {
  const loading = useSimulatedLoad(350);
  const ctx = useFarmerCtx();
  const gate = farmerGate(ctx, loading);
  if (gate) return gate;
  return <ProfileContent ctx={ctx} />;
}

const CROPS = ['Maize', 'Yam', 'Rice', 'Cassava', 'Groundnut', 'Tomato', 'Potatoes', 'Wheat', 'Spinach'];

const CONSENTS = [
  {
    key: 'consent',
    title: 'Share my details to take part in the project',
    description: 'Your cooperative, CollabFarm and the financial partner use your details to run the project and pay you.',
    effects: 'You may not be able to receive support or payments. Your cooperative is told. You can turn this back on at any time.',
  },
  {
    key: 'consentInvestorSummary',
    title: 'Let investors see a summary of my farm',
    description: 'Investors see crop, farm size and region. They never see your name, phone, ID number or exact address.',
    effects: 'Your farm is left out of the summaries that investors see. Your own support does not change.',
  },
  {
    key: 'consentEvidence',
    title: 'Use my photos and location as supporting evidence',
    description: 'Photos and location you send help your cooperative check your reports.',
    effects: 'Your cooperative may need to visit your farm to check your work instead, which can make steps slower to approve.',
  },
];

const consentValue = (farmer, key) => (key === 'consent' ? !!farmer.consent : farmer[key] !== false);

const PHONE_RE = /^(\+?234|0)[789][01]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ProfileContent({ ctx }) {
  const { update, notify, toast, patchData, user } = useApp();
  const { farmer, name, coop, farm, crop } = ctx;
  const savedPhone = ctx.phone;
  const savedEmail = ctx.email;
  const [params] = useSearchParams();

  useEffect(() => {
    if (params.get('section') === 'identity') window.setTimeout(() => document.getElementById('identity')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, [params]);

  // personal details
  const [pName, setPName] = useState(name);
  const [phone, setPhone] = useState(savedPhone);
  const [email, setEmail] = useState(savedEmail);
  const [pErrors, setPErrors] = useState({});
  const [pSaving, setPSaving] = useState(false);

  // farming details
  const [interest, setInterest] = useState(farmer.cropInterest || [farmer.cropType].filter(Boolean));
  const [years, setYears] = useState(String(farmer.experienceYears ?? ''));
  const [fErrors, setFErrors] = useState({});
  const [fSaving, setFSaving] = useState(false);

  // identity
  const [idFiles, setIdFiles] = useState([]);
  const [idSaving, setIdSaving] = useState(false);

  // consent
  const [withdraw, setWithdraw] = useState(null);
  const [cSaving, setCSaving] = useState(false);

  const savePersonal = async (ev) => {
    ev.preventDefault();
    const e = {};
    const n = pName.trim().replace(/\s+/g, ' ');
    if (n.length < 3 || !n.includes(' ')) e.name = 'Please type your first name and your last name.';
    if (!phone.trim()) e.phone = 'Please type your phone number.';
    else if (!PHONE_RE.test(phone.replace(/[\s-]/g, ''))) e.phone = 'Use a Nigerian number such as 0812 345 6789.';
    if (email.trim() && !EMAIL_RE.test(email.trim())) e.email = 'This email does not look right. Leave it empty if you have none.';
    setPErrors(e);
    if (Object.keys(e).length) return;
    setPSaving(true);
    await simulate(600);
    const changed = [n !== name && 'name', phone.trim() !== savedPhone && 'phone', email.trim() !== savedEmail && 'email'].filter(Boolean);
    update('farmers', farmer.id, { name: n, phone: phone.trim(), email: email.trim() }, { action: 'Farmer updated personal details', entityType: 'Farmer', summary: changed.length ? `Changed: ${changed.join(', ')}.` : 'Saved with no changes.', reason: 'Farmer profile edit' });
    update('users', user.id, { name: n, firstName: n.split(' ')[0], phone: phone.trim(), email: email.trim() });
    if (n !== name) {
      // Keep earlier reports linked to this farmer after a name change.
      patchData((d) => ({ complaints: d.complaints.map((c) => (c.role === 'farmer' && c.submittedBy === name && !c.submitterId ? { ...c, submitterId: user.id, farmerId: farmer.id } : c)) }));
    }
    setPSaving(false);
    toast('Your personal details were saved.');
  };

  const toggleCrop = (c) => setInterest((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  const saveFarming = async (ev) => {
    ev.preventDefault();
    const e = {};
    const y = Number(years);
    if (years === '' || Number.isNaN(y) || y < 0 || y > 70 || !Number.isInteger(y)) e.years = 'Type your years of farming as a whole number from 0 to 70.';
    if (interest.length === 0) e.interest = 'Choose at least one crop you are interested in.';
    setFErrors(e);
    if (Object.keys(e).length) return;
    setFSaving(true);
    await simulate(500);
    update('farmers', farmer.id, { cropInterest: interest, experienceYears: y }, { action: 'Farmer updated farming details', entityType: 'Farmer', summary: `Crop interest: ${interest.join(', ')}. Years of experience: ${y}.`, reason: 'Farmer profile edit' });
    setFSaving(false);
    toast('Your farming details were saved.');
  };

  const uploadId = async () => {
    if (!idFiles.length) return;
    setIdSaving(true);
    await simulate(600);
    const at = isoNow();
    update('farmers', farmer.id, { idFileName: idFiles[0].name, idUploadedAt: at }, { action: 'Farmer uploaded ID document', entityType: 'Farmer', summary: 'An ID file was added for verification. The file contents are not logged.', reason: 'Identity verification' });
    notify('admin', 'Farmer uploaded an ID', `${name} uploaded an ID file for verification.`, '/admin/farmers-farms', 'verification');
    setIdSaving(false);
    setIdFiles([]);
    toast('Your ID was sent. We will check it and tell you.');
  };

  const saveConsent = async (item, value) => {
    setCSaving(true);
    await simulate(400);
    update('farmers', farmer.id, { [item.key]: value }, { action: value ? 'Farmer gave consent' : 'Farmer withdrew consent', entityType: 'Farmer', summary: `${item.title}: ${value ? 'on' : 'off'}.`, reason: 'Farmer consent preference' });
    if (item.key === 'consent') notify('cooperative', value ? 'A farmer renewed consent' : 'A farmer withdrew consent', `${name} turned ${value ? 'on' : 'off'} consent to share details for the project.`, '/coop/farmers', 'info');
    setCSaving(false);
    setWithdraw(null);
    toast(value ? 'Saved. Consent is on.' : 'Saved. Consent is off.');
  };

  const onToggle = (item, value) => {
    if (value) saveConsent(item, true);
    else setWithdraw(item);
  };

  return (
    <div className="page farm-page">
      <PageHeader title="Profile" subtitle="Your details, your farm and your choices." />

      <section className="farm-id-card" aria-label="Cooperative membership card">
        <div className="farm-id-card__top">
          <Avatar name={name} size="lg" tone={2} />
          <div className="grow">
            <p className="farm-id-card__label">Cooperative membership card</p>
            <h2 className="farm-id-card__name">{name}</h2>
            <p className="farm-id-card__coop"><Users size={16} aria-hidden="true" /> {coop?.name || 'No cooperative'}</p>
          </div>
        </div>
        <dl className="farm-id-card__facts">
          <div><dt>Farmer number</dt><dd>{farmer.id.toUpperCase()}</dd></div>
          <div><dt>Membership</dt><dd>{farmer.membership || 'Member'}</dd></div>
          <div><dt>Member since</dt><dd>{formatDate(farmer.dateAdded)}</dd></div>
          <div><dt>Farm</dt><dd>{farm ? farm.name : 'Not set'}</dd></div>
        </dl>
      </section>

      <Card>
        <CardHeader title="My personal details" subtitle="Keep these up to date so we can reach you." />
        <form onSubmit={savePersonal} noValidate className="stack-lg">
          <div className="form-grid">
            <TextField className="full" label="Full name" required value={pName} onChange={(e) => { setPName(e.target.value); setPErrors((s) => ({ ...s, name: undefined })); }} error={pErrors.name} autoComplete="name" />
            <TextField label="Phone number" required type="tel" inputMode="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setPErrors((s) => ({ ...s, phone: undefined })); }} error={pErrors.phone} autoComplete="tel" hint="We may call or send a text to this number." />
            <TextField label="Email" optional type="email" value={email} onChange={(e) => { setEmail(e.target.value); setPErrors((s) => ({ ...s, email: undefined })); }} error={pErrors.email} autoComplete="email" />
          </div>
          <div className="farm-actions"><Button type="submit" size="lg" className="farm-btn" loading={pSaving}><Save size={18} />Save my details</Button></div>
        </form>
      </Card>

      <Card>
        <CardHeader title="My farm" subtitle="The first part is set by your cooperative. You can change the last two." />
        <InfoList compact items={[
          ['Cooperative', coop?.name],
          ['Farm or plot', farm ? `${farm.name}, ${farm.location}` : 'Not set'],
          ['Farm size', `${farmer.farmSize} ${String(farmer.farmSizeUnit).toLowerCase()}`],
          ['Main crop on record', farmer.cropType],
          ['This season', crop],
          ['Skills', farmer.skills?.join(', ') || 'None listed'],
        ]} />
        <form onSubmit={saveFarming} noValidate className="stack-lg mt-6">
          <fieldset className="farm-fieldset">
            <legend className="field__label">Crops I am interested in <span className="req" aria-hidden="true">*</span></legend>
            <div className="farm-chipchecks">
              {CROPS.map((c) => (
                <label key={c} className={cx('farm-chipcheck', interest.includes(c) && 'farm-chipcheck--on')}>
                  <input type="checkbox" checked={interest.includes(c)} onChange={() => { toggleCrop(c); setFErrors((s) => ({ ...s, interest: undefined })); }} />
                  <span>{c}</span>
                </label>
              ))}
            </div>
            {fErrors.interest && <span className="field__error" role="alert">{fErrors.interest}</span>}
          </fieldset>
          <TextField label="Years of farming experience" required type="number" inputMode="numeric" min="0" max="70" value={years} onChange={(e) => { setYears(e.target.value); setFErrors((s) => ({ ...s, years: undefined })); }} error={fErrors.years} />
          <div className="farm-actions"><Button type="submit" size="lg" className="farm-btn" loading={fSaving}><Sprout size={18} />Save farming details</Button></div>
        </form>
      </Card>

      <Card id="identity" className="farm-scroll-target">
        <CardHeader title="Identity check" subtitle="This keeps your support and your money safe." action={<StatusChip>{farmer.identityStatus || 'Pending'}</StatusChip>} />
        <InfoList compact items={[
          ['National ID number (NIN)', <span key="n" className="farm-mono">{maskNin(farmer.nin)}</span>],
          ['ID file', farmer.idFileName ? `${farmer.idFileName} (sent ${formatDateTime(farmer.idUploadedAt)})` : 'No file sent'],
        ]} />
        <Explain>Only the last 3 digits of your ID number are shown here. The rest is hidden to keep you safe.</Explain>
        {ctx.identityVerified ? (
          <Banner tone="success" title="Your identity is checked">
            CollabFarm and your cooperative have confirmed who you are. You do not need to do anything. If a detail is wrong, ask your cooperative or contact support.
          </Banner>
        ) : (
          <div className="stack-lg">
            <Banner tone="warn" title="We have not finished checking your identity">
              Send a clear photo of your ID, such as your NIN slip, voter card or driver licence. Make sure the name and the number can be read.
            </Banner>
            <FileDrop label="My ID photo" files={idFiles} onFiles={setIdFiles} accept="JPG, PNG or PDF, up to 5MB. The file stays on this device in this demo." prompt="Tap to add a photo of your ID" />
            <div className="farm-actions"><Button size="lg" className="farm-btn" onClick={uploadId} disabled={!idFiles.length} loading={idSaving}><Upload size={18} />Send my ID</Button></div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="My choices about my data" subtitle="You decide how your details are used." />
        <ul className="farm-settings">
          {CONSENTS.map((c) => (
            <li key={c.key} className="farm-setting">
              <div>
                <p className="strong">{c.title}</p>
                <p className="muted small">{c.description}</p>
              </div>
              <Toggle checked={consentValue(farmer, c.key)} onChange={(v) => onToggle(c, v)} label={c.title} />
            </li>
          ))}
        </ul>
        <Explain><Lock size={14} aria-hidden="true" className="farm-inline-icon" /> Nothing you choose here is shown to the public. You can change these choices at any time.</Explain>
        <div className="farm-actions">
          <LinkButton to="/farmer/settings" variant="outline-green" className="farm-btn"><ShieldCheck size={18} />Message and language settings</LinkButton>
          <LinkButton to="/farmer/agreement" variant="outline-green" className="farm-btn"><IdCard size={18} />My agreement</LinkButton>
        </div>
      </Card>

      <ConfirmDialog
        open={!!withdraw}
        onClose={() => !cSaving && setWithdraw(null)}
        onConfirm={() => saveConsent(withdraw, false)}
        loading={cSaving}
        tone="amber"
        title="Turn this off?"
        message={withdraw?.title}
        warning={withdraw?.effects}
        confirmLabel="Yes, turn it off"
        cancelLabel="Keep it on"
      />
    </div>
  );
}
