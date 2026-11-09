import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Bell, CheckCircle2, ShieldCheck, ShieldAlert, SquarePen, UserRound } from 'lucide-react';
import { Avatar, Banner, Button, Card, CardHeader, InfoList, PageHeader, PageSkeleton, SelectField, StatusPill, TextAreaField, TextField } from '../../components/ui/index.js';
import { LinkButton } from '../../components/ui/Button.jsx';
import { simulate, useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatDate } from '../../utils/format.js';
import { useInvestor } from '../../components/inv/useInvestor.js';
import { MissingRecord } from '../../components/inv/Common.jsx';
import { BANKS } from '../../components/inv/invData.js';
import '../../styles/pages/inv.css';

const COUNTRIES = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'United Kingdom', 'United States', 'Other'];
const BIO_MAX = 300;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^(\+234|0)[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}$/;

const Row = ({ label, children }) => (
  <div className="info-row"><dt>{label}</dt><dd>{children || '-'}</dd></div>
);

function ProfileForm({ investor, user, onCancel, onSaved }) {
  const { update, toast } = useInvestor();
  const [f, setF] = useState({
    name: investor.name || '', email: investor.email || '', phone: investor.phone || '', country: investor.country || 'Nigeria',
    location: investor.location || '', bio: investor.bio || '', payoutBank: investor.payout?.bank || '', payoutNumber: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setErrors((s) => ({ ...s, [k]: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (f.name.trim().length < 3) next.name = 'Enter your full name (at least 3 characters).';
    if (!f.email.trim()) next.email = 'Enter your email address.';
    else if (!EMAIL.test(f.email.trim())) next.email = 'Enter a valid email address, for example name@example.com.';
    if (!f.phone.trim()) next.phone = 'Enter your phone number.';
    else if (!PHONE.test(f.phone.trim())) next.phone = 'Use a Nigerian number such as +234 802 555 0147 or 0802 555 0147.';
    if (!f.country) next.country = 'Choose your country.';
    if (f.location.trim().length < 2) next.location = 'Enter your city and country.';
    if (f.bio.length > BIO_MAX) next.bio = `Keep your bio under ${BIO_MAX} characters. It is ${f.bio.length} now.`;
    const wantsPayout = f.payoutBank || f.payoutNumber;
    if (wantsPayout) {
      if (!f.payoutBank) next.payoutBank = 'Choose the bank for your payout account.';
      if (f.payoutNumber && !/^\d{10}$/.test(f.payoutNumber)) next.payoutNumber = 'Enter the 10 digit account number, or leave it blank to keep the saved account.';
      if (!f.payoutNumber && (!investor.payout?.last4 || f.payoutBank !== investor.payout?.bank)) next.payoutNumber = 'Enter the 10 digit account number for this bank.';
    }
    setErrors(next);
    if (Object.keys(next).length) {
      toast('Some details need attention. Nothing has been saved yet.', 'error');
      return;
    }
    setSaving(true);
    try {
      await simulate(700);
      const patch = { name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), country: f.country, location: f.location.trim(), bio: f.bio.trim() };
      if (wantsPayout) patch.payout = { bank: f.payoutBank, accountName: investor.name, last4: f.payoutNumber ? f.payoutNumber.slice(-4) : investor.payout.last4 };
      const changed = ['name', 'email', 'phone', 'country', 'location', 'bio'].filter((k) => patch[k] !== (investor[k] || '')).concat(wantsPayout ? ['payout account'] : []);
      update('investors', investor.id, patch, {
        action: 'Investor profile updated', entityType: 'Investor',
        summary: `${investor.name} updated: ${changed.length ? changed.join(', ') : 'no field changes'}${wantsPayout ? ' (payout account stored as last 4 digits only)' : ''}`, reason: 'Investor edit',
      });
      update('users', user.id, { name: patch.name, email: patch.email, phone: patch.phone });
      toast('Profile saved.', 'success');
      onSaved();
    } catch {
      setSaving(false);
      toast('We could not save your profile. Nothing was changed. Please try again.', 'error');
    }
  };

  return (
    <form onSubmit={submit} noValidate className="stack">
      <Card>
        <CardHeader title="Edit personal information" subtitle="Fields marked with a star are required." />
        <div className="grid-2">
          <TextField label="Full name" required value={f.name} onChange={(e) => set('name', e.target.value)} error={errors.name} autoComplete="name" />
          <TextField label="Email address" required type="email" value={f.email} onChange={(e) => set('email', e.target.value)} error={errors.email} autoComplete="email" hint="Used for sign in notices and statements." />
          <TextField label="Phone number" required type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} autoComplete="tel" />
          <SelectField label="Country" required options={COUNTRIES} value={f.country} onChange={(e) => set('country', e.target.value)} error={errors.country} />
          <TextField label="Location" required value={f.location} onChange={(e) => set('location', e.target.value)} error={errors.location} placeholder="City, Country" className="grid-span" />
        </div>
        <TextAreaField label="Bio" optional value={f.bio} onChange={(e) => set('bio', e.target.value)} error={errors.bio} rows={4} hint={`${f.bio.length} of ${BIO_MAX} characters. Cooperatives may see your short bio.`} />
      </Card>

      <Card>
        <CardHeader title="Payout account" subtitle="Where withdrawals and distributions are sent. Only the last 4 digits are stored." />
        <div className="grid-2">
          <TextField label="Account name" value={investor.name} readOnly hint="Filled from your profile. Bank account-name lookup is not connected." />
          <SelectField label="Bank" optional placeholder="Choose bank" options={BANKS} value={f.payoutBank} onChange={(e) => set('payoutBank', e.target.value)} error={errors.payoutBank} />
          <TextField label="Account number" optional inputMode="numeric" maxLength={10} value={f.payoutNumber} onChange={(e) => set('payoutNumber', e.target.value.replace(/\D/g, '').slice(0, 10))} error={errors.payoutNumber}
            hint={investor.payout?.last4 && f.payoutBank === investor.payout?.bank ? `Saved account ends ${investor.payout.last4}. Leave blank to keep it.` : 'Enter all 10 digits. Only the last 4 are retained in this demo.'} />
        </div>
      </Card>

      <div className="inv-step-actions">
        <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" loading={saving}>Save changes</Button>
      </div>
    </form>
  );
}

export default function Profile() {
  const loading = useSimulatedLoad(350);
  const { user, investor } = useInvestor();
  const [editing, setEditing] = useState(false);
  if (loading) return <PageSkeleton />;
  if (!investor) return <MissingRecord title="Investor profile not found" text="We could not find your investor record. Please sign in again." to="/login" label="Go to sign in" />;

  const verified = investor.status === 'Verified';
  const acked = investor.riskAcknowledged === true;

  return (
    <div className="page">
      <PageHeader title="Profile" subtitle="Manage your personal and business information" />

      <Card>
        <div className="inv-profile-head">
          <div className="inv-profile-head__id">
            <Avatar name={investor.name} size="lg" />
            <div style={{ minWidth: 0 }}>
              <h2 className="card__title" style={{ margin: 0 }}>{investor.name}</h2>
              <div className="muted">{investor.type}{investor.org && investor.org !== 'Individual' ? ` at ${investor.org}` : ''}</div>
              {investor.bio && <p className="small muted" style={{ margin: '4px 0 0' }}>{investor.bio}</p>}
            </div>
          </div>
          {!editing && <Button onClick={() => setEditing(true)}><SquarePen size={18} />Edit Profile</Button>}
        </div>
      </Card>

      {!verified && (
        <Banner tone="warn" title="Your investor account is not verified yet">
          Status: {investor.status}. You can browse, but you cannot commit funds until verification is complete.{' '}
          <Link to="/onboarding/status" className="strong">View verification status</Link>.
        </Banner>
      )}

      {editing ? (
        <ProfileForm investor={investor} user={user} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
      ) : (
        <>
          <Card>
            <CardHeader title="Personal Information" />
            <dl className="info-list">
              <Row label="Full Name">{investor.name}</Row>
              <Row label="Email Address">{investor.email}</Row>
              <Row label="Phone Number">{investor.phone}</Row>
              <Row label="Country">{investor.country}</Row>
              <Row label="Location">{investor.location}</Row>
              <Row label="Bio">{investor.bio}</Row>
            </dl>
          </Card>

          <div className="grid-2" style={{ alignItems: 'start' }}>
            <Card>
              <CardHeader title="Verification and risk status" subtitle="What you need before you can invest" />
              <InfoList items={[
                ['Verification', <StatusPill key="v">{investor.status}</StatusPill>],
                ['Eligibility', investor.eligibility],
                ['Verified on', investor.verifiedAt ? formatDate(investor.verifiedAt) : 'Not yet verified'],
                ['Risk acknowledgement', <StatusPill key="r" tone={acked ? 'green' : 'amber'}>{acked ? 'Acknowledged' : 'Not yet acknowledged'}</StatusPill>],
                ['Investor agreement on file', investor.agreementSigned ? 'Yes' : 'Not yet'],
              ]} />
              <div className="row" style={{ marginTop: 'var(--s-4)', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
                <LinkButton to="/investor/risk-disclosures" variant="outline-green" size="sm">{acked ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}{acked ? 'Review risk disclosure' : 'Acknowledge risks'}</LinkButton>
                {!verified && <LinkButton to="/onboarding/status" variant="outline" size="sm"><CheckCircle2 size={16} />Verification status</LinkButton>}
              </div>
            </Card>

            <div className="stack">
              <Card>
                <CardHeader title="Payout account" subtitle="Only the last 4 digits are ever shown." />
                {investor.payout?.last4 ? (
                  <InfoList items={[
                    ['Bank', investor.payout.bank],
                    ['Account name', investor.payout.accountName || investor.name],
                    ['Account number', `Ending ${investor.payout.last4}`],
                  ]} />
                ) : (
                  <p className="small muted" style={{ margin: 0 }}>No payout account saved yet. Add one with Edit Profile, or enter one when you request a withdrawal.</p>
                )}
                <p className="caption muted" style={{ margin: 'var(--s-3) 0 0' }}><Banknote size={12} style={{ verticalAlign: '-2px' }} /> Changing a payout account is recorded in the audit trail.</p>
              </Card>
              <Card>
                <CardHeader title="Notification preferences" subtitle="Choose what we tell you about and how." />
                <LinkButton to="/investor/settings" variant="outline-green" size="sm"><Bell size={16} />Open notification settings</LinkButton>
              </Card>
              <Card>
                <CardHeader title="Your data" />
                <p className="small muted" style={{ margin: 0 }}><UserRound size={14} style={{ verticalAlign: '-2px' }} /> Cooperatives and farmers never see your phone number, email or address. Only an administrator can see your full record.</p>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
