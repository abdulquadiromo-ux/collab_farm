import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Download, KeyRound, LogOut, Monitor, Smartphone, UserX, X } from 'lucide-react';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { Avatar, Banner, Button, Card, CardHeader, ConfirmDialog, InfoList, Modal, PasswordField, SelectField, SettingRow, StatusPill, Toggle } from '../ui/index.js';
import { RolePill } from './ShrBits.jsx';
import { baseFor, byId, canSeeComplaint, contractsForUser, downloadFile, isoNow, mergeUserPrefs, userPrefs, whenLabel } from './shrUtils.js';
import { NAIRA, formatDate, formatDateShort, formatNaira } from '../../utils/format.js';

// ---------- shared pieces ----------
function useSave() {
  const { patchData, audit, toast, user } = useApp();
  return async (patch, entry, message) => {
    await simulate(500);
    patchData(mergeUserPrefs(user.id, patch));
    if (entry) audit({ entityType: 'User settings', entityId: user.id, reason: 'Changed by the account holder', ...entry });
    toast(message);
  };
}

function SaveBar({ dirty, saving, onSave, onReset, label = 'Save changes' }) {
  return (
    <div className="shr-savebar">
      <Button onClick={onSave} loading={saving} disabled={!dirty}>{label}</Button>
      <Button variant="outline" onClick={onReset} disabled={!dirty || saving}>Reset</Button>
      <span className="small muted" aria-live="polite">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
    </div>
  );
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ============ Profile summary ============
export function ProfileSummary() {
  const { data, user, role } = useApp();
  const base = baseFor(role);
  const coop = role === 'cooperative' || role === 'farmer' ? byId(data.cooperatives, user.orgId) : null;
  const inv = role === 'investor' ? byId(data.investors, user.orgId) : null;
  const farmer = role === 'farmer' ? byId(data.farmers, user.farmerId) : null;
  const status = coop && role === 'cooperative' ? coop.status : inv ? inv.status : farmer ? farmer.identityStatus : null;
  const items = [
    ['Name', user.name], ['Role', <RolePill key="r" role={role} />], ['Job title', user.title],
    ['Email', user.email], ['Phone', user.phone],
    ...(role === 'cooperative' ? [['Cooperative', coop?.name], ['Registration number', coop?.regNumber]] : []),
    ...(role === 'investor' ? [['Organisation', inv?.org], ['Investor type', inv?.type]] : []),
    ...(role === 'farmer' ? [['My cooperative', coop?.name], ['Farm', byId(data.farms, farmer?.farmId)?.name || '-']] : []),
    ...(status ? [[role === 'farmer' ? 'Identity check' : 'Verification', <StatusPill key="s">{status}</StatusPill>]] : []),
  ];
  return (
    <Card>
      <div className="shr-profile-head">
        <Avatar name={user.name} size="lg" />
        <div>
          <h2 style={{ fontSize: 22 }}>{user.name}</h2>
          <p className="muted">{user.title}</p>
        </div>
        <Link className="btn btn--outline shr-profile-head__action" to={`${base}/profile`}>Edit profile details</Link>
      </div>
      <InfoList items={items} />
      <p className="small muted mt-4">Your name, role and verification status are managed through verification. To change contact details, open your profile.</p>
    </Card>
  );
}

// ============ Notifications ============
const GROUPS = {
  funding: { title: 'Funding and commitments', desc: 'New commitments, confirmations and funding targets reached.' },
  contracts: { title: 'Contracts and signing', desc: 'Agreements to sign, amendments and expiry.' },
  milestones: { title: 'Milestones and evidence', desc: 'Upcoming milestones, approvals and returned evidence.' },
  disbursements: { title: 'Disbursements and payments', desc: 'Payments initiated, approved or confirmed.' },
  settlements: { title: 'Harvest, sales and distributions', desc: 'Harvest and sales reports, repayments and distributions due.' },
  distributions: { title: 'Repayments and distributions', desc: 'Amounts due, paid or overdue.' },
  risk: { title: 'Late reports and risk alerts', desc: 'Late reports, delays and suspensions. A case is a review, not a finding.' },
  complaints: { title: 'Complaints and disputes', desc: 'Updates on complaints you raised or that involve you.' },
  verification: { title: 'Verification and account', desc: 'Verification results and information requests.', locked: true },
  payments: { title: 'Money and inputs recorded for me', desc: 'Payments, seeds and tools recorded against my name.' },
  activities: { title: 'My activities and deadlines', desc: 'Tasks I need to do and when.' },
  agreement: { title: 'My agreement', desc: 'When my agreement needs to be read or signed.' },
};
const ROLE_GROUPS = {
  cooperative: ['funding', 'contracts', 'milestones', 'disbursements', 'settlements', 'risk', 'complaints', 'verification'],
  investor: ['funding', 'contracts', 'disbursements', 'distributions', 'risk', 'complaints', 'verification'],
  farmer: ['payments', 'activities', 'agreement', 'complaints', 'verification'],
  admin: ['verification', 'risk', 'disbursements', 'complaints', 'contracts'],
};

export function NotificationSettings() {
  const { data, user, role } = useApp();
  const save = useSave();
  const stored = userPrefs(data, user.id).notifications;
  const seedFlat = data.userSettings?.notifications || {};
  const ids = ROLE_GROUPS[role] || [];
  const initial = useMemo(() => ({
    digest: { news: seedFlat.news ?? true, reminders: seedFlat.reminders ?? true, activity: seedFlat.activity ?? true, ...(stored?.digest || {}) },
    groups: Object.fromEntries(ids.map((g) => [g, { inApp: true, email: true, ...(stored?.groups?.[g] || {}) }])),
  }), [stored]); // eslint-disable-line react-hooks/exhaustive-deps
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = !same(draft, initial);
  const big = role === 'farmer';

  const setDigest = (k) => (v) => setDraft((d) => ({ ...d, digest: { ...d.digest, [k]: v } }));
  const setGroup = (g, k, v) => setDraft((d) => ({ ...d, groups: { ...d.groups, [g]: { ...d.groups[g], [k]: v } } }));
  const doSave = async () => {
    setSaving(true);
    const changes = ids.filter((g) => !same(draft.groups[g], initial.groups[g])).length + Object.keys(draft.digest).filter((k) => draft.digest[k] !== initial.digest[k]).length;
    await save({ notifications: draft }, { action: 'Updated notification preferences', summary: `${changes} setting${changes === 1 ? '' : 's'} changed` }, 'Notification settings saved');
    setSaving(false);
  };

  return (
    <div className="stack-lg">
      <Card>
        <CardHeader title="Email notifications" subtitle="Get emails to find out what is going on when you are not online. You can turn these off." />
        <SettingRow title="News and updates" description="News about CollabFarm Finance and feature updates." checked={draft.digest.news} onChange={setDigest('news')} />
        <SettingRow title="Reminders" description="Reminders about deadlines, signing and reports." checked={draft.digest.reminders} onChange={setDigest('reminders')} />
        <SettingRow title="More activity about you" description="Activity on your packages, payments and complaints." checked={draft.digest.activity} onChange={setDigest('activity')} />
      </Card>

      <Card pad={false}>
        <div style={{ padding: 'var(--s-6) var(--s-6) var(--s-2)' }}>
          <CardHeader title={big ? 'What do you want to hear about?' : 'Choose how you hear about each event'} subtitle="In-app messages appear in the bell and on the Notifications page. In-app messages about verification and your account are always on." />
        </div>
        <div className="shr-notif-grid" role="table" aria-label="Notification settings by event group">
          <div className="shr-notif-grid__head" role="row"><span role="columnheader">Event</span><span role="columnheader">In-app</span><span role="columnheader">Email</span></div>
          {ids.map((g) => (
            <div className="shr-notif-grid__row" role="row" key={g}>
              <div role="cell"><div className="strong small">{GROUPS[g].title}</div><div className="caption muted">{GROUPS[g].desc}</div></div>
              <div role="cell" className="shr-notif-grid__cell">
                {GROUPS[g].locked
                  ? <span className="chip" style={{ background: 'var(--primary-50)', color: 'var(--primary-700)' }}>Always on</span>
                  : <Toggle checked={draft.groups[g].inApp} onChange={(v) => setGroup(g, 'inApp', v)} label={`${GROUPS[g].title}, in-app`} />}
              </div>
              <div role="cell" className="shr-notif-grid__cell"><Toggle checked={draft.groups[g].email} onChange={(v) => setGroup(g, 'email', v)} label={`${GROUPS[g].title}, email`} /></div>
            </div>
          ))}
        </div>
      </Card>
      <p className="small muted">Emails never contain passwords, one-time codes or identity documents. In this demo no email is sent.</p>
      <SaveBar dirty={dirty} saving={saving} onSave={doSave} onReset={() => setDraft(initial)} />
    </div>
  );
}

// ============ Security ============
const RULES = [
  { id: 'len', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { id: 'upper', label: 'An uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'num', label: 'A number', test: (v) => /[0-9]/.test(v) },
  { id: 'sym', label: 'A symbol', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function PasswordModal({ open, onClose }) {
  const { user, audit, toast } = useApp();
  const [f, setF] = useState({ old: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };
  const close = () => { setF({ old: '', next: '', confirm: '' }); setErrors({}); onClose(); };
  const submit = async () => {
    const e = {};
    if (!f.old) e.old = 'Enter your current password.';
    if (!RULES.every((r) => r.test(f.next))) e.next = 'The new password does not meet all the rules below.';
    else if (f.next === f.old) e.next = 'Choose a password different from the current one.';
    if (f.confirm !== f.next) e.confirm = 'The two new passwords do not match.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    await simulate(700);
    audit({ action: 'Changed password', entityType: 'User settings', entityId: user.id, reason: 'Changed by the account holder', summary: 'Password changed. No password value is stored or logged.' });
    toast('Your password was changed (simulated). Other devices stay signed in until you sign them out.');
    setBusy(false);
    close();
  };
  return (
    <Modal open={open} onClose={close} title="Change Password" white>
      <div className="stack">
        <PasswordField label="Current password" value={f.old} onChange={set('old')} error={errors.old} autoComplete="off" placeholder="Type here" />
        <PasswordField label="New password" value={f.next} onChange={set('next')} error={errors.next} autoComplete="off" placeholder="Type here" />
        <div className="shr-pwhint" aria-live="polite">
          <strong>Use at least 8 characters, including an uppercase letter, a number and a symbol.</strong>
          <ul>
            {RULES.map((r) => { const ok = r.test(f.next); return <li key={r.id} className={ok ? 'ok' : ''}>{ok ? <Check size={14} /> : <X size={14} />}{r.label}</li>; })}
          </ul>
        </div>
        <PasswordField label="Confirm new password" value={f.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="off" placeholder="Type here" />
        <Button block onClick={submit} loading={busy}>Change Password</Button>
        <p className="caption muted">Demo only. The password is not stored or sent anywhere, and any current password is accepted.</p>
      </div>
    </Modal>
  );
}

export const SAMPLE_DEVICES = [
  { id: 's1', name: 'This device', place: 'Abuja, Nigeria', when: 'Active now', icon: Monitor, current: true },
  { id: 's2', name: 'Phone, Chrome', place: 'Abuja, Nigeria', when: 'Yesterday, 6:40 PM', icon: Smartphone },
  { id: 's3', name: 'Laptop, Firefox', place: 'Kaduna, Nigeria', when: '24 Oct 2026', icon: Monitor },
];

export function SecuritySettings() {
  const { data, user, role, audit, notify, toast, patchData } = useApp();
  const prefs = userPrefs(data, user.id);
  const [pw, setPw] = useState(false);
  const [signOutAsk, setSignOutAsk] = useState(false);
  const [deactAsk, setDeactAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const devices = SAMPLE_DEVICES.filter((d) => d.current || !prefs.otherSessionsEndedAt);
  const big = role === 'farmer';

  const signOutOthers = async () => {
    setBusy(true);
    await simulate(600);
    patchData(mergeUserPrefs(user.id, { otherSessionsEndedAt: isoNow() }));
    audit({ action: 'Signed out other devices', entityType: 'User settings', entityId: user.id, reason: 'Changed by the account holder', summary: 'All other sessions ended (simulated)' });
    toast('Other devices were signed out (simulated)');
    setBusy(false); setSignOutAsk(false);
  };
  const requestDeactivation = async () => {
    setBusy(true);
    await simulate(600);
    patchData(mergeUserPrefs(user.id, { deactivationRequestedAt: isoNow() }));
    audit({ action: 'Requested account deactivation', entityType: 'User settings', entityId: user.id, reason: 'Requested by the account holder', summary: 'Request sent for administrator review. Records are kept.' });
    notify('admin', 'Account deactivation requested', `${user.name} (${role}) asked to deactivate their account.`, '/admin/users', 'verification');
    toast('Your request was sent to an administrator', 'info');
    setBusy(false); setDeactAsk(false);
  };
  const cancelDeactivation = () => {
    patchData(mergeUserPrefs(user.id, { deactivationRequestedAt: null }));
    audit({ action: 'Cancelled deactivation request', entityType: 'User settings', entityId: user.id, reason: 'Changed by the account holder', summary: 'Request withdrawn' });
    toast('Deactivation request cancelled', 'info');
  };

  return (
    <div className="stack-lg">
      <Card pad={false}>
        <div className="shr-setrow">
          <div><div className="strong">Change your password</div><div className="small muted">{big ? 'Choose a password only you know.' : 'Set a unique password for better protection.'}</div></div>
          <Button variant="outline" onClick={() => setPw(true)}><KeyRound size={16} />Change Password</Button>
        </div>
        <div className="shr-setrow">
          <div><div className="strong">Sign out of other devices</div><div className="small muted">End every other session. This device stays signed in.</div></div>
          <Button variant="outline" onClick={() => setSignOutAsk(true)} disabled={devices.length < 2}><LogOut size={16} />Sign out other devices</Button>
        </div>
        <div className="shr-setrow">
          <div>
            <div className="strong">Deactivate account</div>
            <div className="small muted">An administrator reviews the request. Financial records, agreements and the audit history are kept as required.</div>
          </div>
          <Button variant="danger-outline" onClick={() => setDeactAsk(true)} disabled={!!prefs.deactivationRequestedAt}><UserX size={16} />Deactivate Account</Button>
        </div>
      </Card>

      {prefs.deactivationRequestedAt && (
        <Banner tone="warn" title="Deactivation requested">
          You asked to deactivate your account on {whenLabel(prefs.deactivationRequestedAt)}. An administrator will contact you. <button type="button" className="link-btn" onClick={cancelDeactivation}>Cancel the request</button>
        </Banner>
      )}

      <Card>
        <CardHeader title="Where you are signed in" subtitle="Sample sessions for this demo." />
        <ul className="shr-devices">
          {devices.map((d) => { const Icon = d.icon; return (
            <li key={d.id}><Icon size={22} /><div><div className="strong small">{d.name}{d.current && <span className="chip" style={{ marginLeft: 8, background: 'var(--primary-50)', color: 'var(--primary-700)' }}>Current</span>}</div><div className="caption muted">{d.place} &middot; {d.when}</div></div></li>
          ); })}
        </ul>
      </Card>

      <PasswordModal open={pw} onClose={() => setPw(false)} />
      <ConfirmDialog open={signOutAsk} onClose={() => setSignOutAsk(false)} onConfirm={signOutOthers} loading={busy} tone="amber" title="Sign out of other devices?" message="Every other session will end. You will need to sign in again on those devices." confirmLabel="Sign out others" />
      <ConfirmDialog open={deactAsk} onClose={() => setDeactAsk(false)} onConfirm={requestDeactivation} loading={busy} tone="danger" title="Request account deactivation?" message="An administrator will review your request. Your sign in is not removed straight away." warning="Records of money, agreements and complaints are never deleted. They stay for audit and legal reasons." summary={[['Account', user.name], ['Role', role], ['Effect', 'Request only. No data is deleted.']]} confirmLabel="Send request" />
    </div>
  );
}

// ============ Preferences ============
const LANGS = ['English', 'Hausa', 'Yoruba', 'Igbo', 'Nigerian Pidgin'];
const DATE_FORMATS = [
  { value: 'long', label: 'Long', fn: (d) => formatDate(d) },
  { value: 'short', label: 'Short', fn: (d) => formatDateShort(d) },
  { value: 'iso', label: 'Year first', fn: (d) => new Date(d).toISOString().slice(0, 10) },
];
const CURRENCY = [
  { value: 'full', label: 'Full amount', fn: (n) => formatNaira(n) },
  { value: 'compact', label: 'Short amount', fn: (n) => formatNaira(n, { compact: true }) },
  { value: 'code', label: 'With currency code', fn: (n) => formatNaira(n).replace(NAIRA, 'NGN ') },
];
const SAMPLE_DATE = '2026-10-27T09:30:00';
const SAMPLE_AMOUNT = 1250000;

export function PreferenceSettings() {
  const { data, user, role } = useApp();
  const save = useSave();
  const stored = userPrefs(data, user.id).preferences;
  const initial = useMemo(() => ({ language: stored?.language || data.userSettings?.language || 'English', dateFormat: stored?.dateFormat || 'long', currency: stored?.currency || 'full' }), [stored, data.userSettings?.language]);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = !same(draft, initial);
  const farmer = role === 'farmer';
  const df = DATE_FORMATS.find((x) => x.value === draft.dateFormat);
  const cf = CURRENCY.find((x) => x.value === draft.currency);
  const doSave = async () => {
    setSaving(true);
    await save({ preferences: draft }, { action: 'Updated display preferences', summary: `Language ${draft.language}, dates ${draft.dateFormat}, amounts ${draft.currency}` }, 'Preferences saved');
    setSaving(false);
  };
  return (
    <div className="stack-lg">
      <Card>
        <CardHeader title="Language and display" subtitle={farmer ? 'Choose the language you read best. Your agreement summary is also provided in plain language.' : 'How text, dates and amounts are shown to you.'} />
        <div className="form-grid">
          <SelectField label="Language" value={draft.language} onChange={(e) => setDraft((d) => ({ ...d, language: e.target.value }))} options={LANGS} hint="Translations are used where they exist. Agreements are always available in English." />
          {!farmer && <SelectField label="Date format" value={draft.dateFormat} onChange={(e) => setDraft((d) => ({ ...d, dateFormat: e.target.value }))} options={DATE_FORMATS.map((x) => ({ value: x.value, label: `${x.label}: ${x.fn(SAMPLE_DATE)}` }))} />}
          {!farmer && <SelectField label="Currency display" value={draft.currency} onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))} options={CURRENCY.map((x) => ({ value: x.value, label: `${x.label}: ${x.fn(SAMPLE_AMOUNT)}` }))} hint="The amount is always in naira." />}
        </div>
        {!farmer && <div className="shr-preview"><span className="small muted">Preview</span><span>{df.fn(SAMPLE_DATE)}</span><span>{cf.fn(SAMPLE_AMOUNT)}</span></div>}
      </Card>
      <SaveBar dirty={dirty} saving={saving} onSave={doSave} onReset={() => setDraft(initial)} />
    </div>
  );
}

// ============ Data and privacy ============
function consentsFor(data, user, role) {
  const inv = role === 'investor' ? byId(data.investors, user.orgId) : null;
  const coop = role === 'cooperative' ? byId(data.cooperatives, user.orgId) : null;
  const farmer = role === 'farmer' ? byId(data.farmers, user.farmerId) : null;
  const list = [
    { id: 'terms', title: 'Terms of use', detail: 'You agreed to the platform rules.', version: 'v1.2', at: inv?.verifiedAt || coop?.verifiedAt || farmer?.dateAdded?.slice(0, 10) || '2026-03-01', required: true, given: true },
    { id: 'privacy', title: 'Privacy notice', detail: 'How your information is collected, used and protected.', version: 'v1.3', at: inv?.verifiedAt || coop?.verifiedAt || farmer?.dateAdded?.slice(0, 10) || '2026-03-01', required: true, given: true },
    { id: 'partner', title: 'Sharing with the financial partner', detail: 'Needed so the regulated partner can receive and pay out funds for you.', version: 'v1.0', at: inv?.verifiedAt || coop?.verifiedAt || '2026-03-01', required: true, given: true },
  ];
  if (role === 'investor') list.push({ id: 'risk', title: 'Risk acknowledgement', detail: 'You understand returns are estimates and you can lose money.', version: 'v2.0', at: inv?.verifiedAt || '2026-03-20', required: true, given: !!inv?.riskAcknowledged });
  if (role === 'cooperative') list.push({ id: 'rep', title: 'Authorised representative declaration', detail: 'You act for the cooperative and can sign on its behalf.', version: 'v1.0', at: coop?.verifiedAt || '2026-06-12', required: true, given: true });
  if (role === 'farmer') {
    list.push({ id: 'participation', title: 'Participation consent', detail: 'You agreed to take part in funded projects through your cooperative.', version: 'v1.1', at: farmer?.dateAdded?.slice(0, 10) || '2026-07-01', required: true, given: !!farmer?.consent });
    list.push({ id: 'investor-view', title: 'Privacy preserving view for investors', detail: 'Investors see no ID number, phone number or exact address.', version: 'v1.0', at: farmer?.dateAdded?.slice(0, 10) || '2026-07-01', required: true, given: true });
  }
  return list;
}

export function PrivacySettings() {
  const { data, user, role, audit, toast } = useApp();
  const save = useSave();
  const prefs = userPrefs(data, user.id);
  const initial = useMemo(() => ({ productEmails: prefs.consent?.productEmails ?? false, statistics: prefs.consent?.statistics ?? true }), [prefs.consent]);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = !same(draft, initial);
  const consents = useMemo(() => consentsFor(data, user, role), [data, user, role]);

  const download = () => {
    const mine = {
      exportedAt: isoNow(),
      note: 'This file contains no passwords and no identity document contents.',
      account: { name: user.name, role, title: user.title, email: user.email, phone: user.phone },
      settings: prefs,
      consents: consents.map(({ title, version, at, given }) => ({ title, version, at, given })),
      notifications: data.notifications.filter((n) => n.role === role).map(({ title, message, createdAt, read }) => ({ title, message, createdAt, read })),
      complaints: data.complaints.filter((c) => canSeeComplaint(data, user, c)).map(({ ref, subject, category, status, createdAt }) => ({ ref, subject, category, status, createdAt })),
      agreements: contractsForUser(data, user).map(({ id, title, type, version, status, signedAt }) => ({ id, title, type, version, status, signedAt })),
    };
    if (role === 'investor') mine.investments = data.investments.filter((i) => i.investorId === user.orgId).map(({ ref, packageId, committed, confirmed, status, dateInvested }) => ({ ref, packageId, committed, confirmed, status, dateInvested }));
    if (role === 'farmer') {
      const f = byId(data.farmers, user.farmerId);
      if (f) mine.farmerRecord = { id: f.id, name: f.name, cropType: f.cropType, status: f.status, identityStatus: f.identityStatus, agreementStatus: f.agreementStatus, allocatedAmount: f.allocatedAmount };
    }
    if (role === 'cooperative') {
      const c = byId(data.cooperatives, user.orgId);
      if (c) mine.cooperative = { id: c.id, name: c.name, regNumber: c.regNumber, state: c.state, status: c.status };
    }
    const ok = downloadFile(`my-collabfarm-data-${isoNow().slice(0, 10)}.json`, JSON.stringify(mine, null, 2), 'application/json;charset=utf-8');
    if (ok) {
      audit({ action: 'Downloaded personal data', entityType: 'User settings', entityId: user.id, reason: 'Requested by the account holder', summary: 'Personal data file generated on the device' });
      toast('Your data file was created on your device');
    } else toast('Could not create the file in this browser', 'error');
  };

  const doSave = async () => {
    setSaving(true);
    await save({ consent: draft }, { action: 'Updated consent preferences', summary: 'Optional consents changed' }, 'Consent preferences saved');
    setSaving(false);
  };

  return (
    <div className="stack-lg">
      <Card>
        <CardHeader title="Download my data" subtitle="A copy of your account details, settings, notifications, complaints and agreements as a JSON file." />
        <p className="small muted" style={{ marginBottom: 16 }}>The file is created on your device. It never contains passwords or identity document contents.</p>
        <Button variant="outline-green" onClick={download}><Download size={18} />Download my data</Button>
      </Card>

      <Card>
        <CardHeader title="What you agreed to" subtitle="Required consents keep your account working. You can read them again at any time." />
        <ul className="shr-consents">
          {consents.map((c) => (
            <li key={c.id}>
              <div>
                <div className="strong small">{c.title} <span className="caption muted">{c.version}</span></div>
                <div className="caption muted">{c.detail}</div>
              </div>
              <div className="shr-consents__state">
                <StatusPill tone={c.given ? 'green' : 'amber'}>{c.given ? 'Agreed' : 'Not yet agreed'}</StatusPill>
                <span className="caption muted">{c.given ? formatDateShort(c.at) : 'Needed before you can continue'}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Optional choices" subtitle="These are optional. Turning them off does not affect your account." />
        <SettingRow title="Email me about new packages and platform news" description="Marketing style messages. Off unless you turn it on." checked={draft.productEmails} onChange={(v) => setDraft((d) => ({ ...d, productEmails: v }))} />
        <SettingRow title="Include my activity in anonymous statistics" description="Used to improve the platform. No names or amounts are shared." checked={draft.statistics} onChange={(v) => setDraft((d) => ({ ...d, statistics: v }))} />
      </Card>
      <SaveBar dirty={dirty} saving={saving} onSave={doSave} onReset={() => setDraft(initial)} />
    </div>
  );
}
