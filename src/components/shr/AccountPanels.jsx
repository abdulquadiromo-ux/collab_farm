import { useState } from 'react';
import { Check, KeyRound, LogOut, Lightbulb, ShieldCheck, X } from 'lucide-react';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { Avatar, Banner, Button, Card, CardHeader, ConfirmDialog, InfoList, StatusPill, TextField } from '../ui/index.js';
import { PasswordModal, SAMPLE_DEVICES } from './SettingsPanels.jsx';
import { RolePill } from './ShrBits.jsx';
import { isoNow, mergeUserPrefs, userPrefs, validEmail, validPhone } from './shrUtils.js';

// What each demo administrator can and cannot do. Maker-checker means the person who raised or first approved a payment cannot approve it again.
const FUNCTIONS = {
  reviewer: {
    label: 'Project reviewer',
    summary: 'Reviews cooperatives, investors, farmers, funding requests and milestone evidence.',
    can: ['Verify or return cooperative, investor and farmer records', 'Approve or return funding requests and milestones', 'Triage complaints and open risk cases'],
    cannot: ['Give the final approval on a payment you prepared', 'Edit or delete audit entries'],
  },
  approver: {
    label: 'Payment approver',
    summary: 'Gives the independent approval on disbursements and checks reconciliation.',
    can: ['Approve or reject disbursements, including as the second approver above the limit', 'Review reconciliation differences', 'Triage complaints and open risk cases'],
    cannot: ['Approve a payment that you raised or already approved', 'Edit or delete audit entries'],
  },
  other: {
    label: 'Platform administrator',
    summary: 'Works on platform operations under the maker-checker rule.',
    can: ['Review records and complaints'],
    cannot: ['Approve your own payments', 'Edit or delete audit entries'],
  },
};

export const functionOf = (user) => (/payment approver/i.test(user.title || '') ? 'approver' : /project reviewer/i.test(user.title || '') ? 'reviewer' : 'other');

export function ProfileCard() {
  const { user, role } = useApp();
  const fn = FUNCTIONS[functionOf(user)];
  return (
    <Card>
      <div className="shr-profile-head">
        <Avatar name={user.name} size="lg" />
        <div>
          <h2 style={{ fontSize: 22 }}>{user.name}</h2>
          <p className="muted">{user.title}</p>
        </div>
      </div>
      <InfoList items={[
        ['Name', user.name],
        ['Role', <RolePill key="r" role={role} />],
        ['Function', role === 'admin' ? fn.label : user.title],
        ['Email', user.email],
        ['Phone', user.phone],
        ['Account status', <StatusPill key="s" tone="green">Active</StatusPill>],
      ]}
      />
    </Card>
  );
}

export function FunctionCard() {
  const { user } = useApp();
  const fn = FUNCTIONS[functionOf(user)];
  return (
    <Card>
      <CardHeader title="Your administrator function" subtitle={fn.summary} />
      <div className="shr-fn">
        <div>
          <h3 className="shr-fn__h">You can</h3>
          <ul>{fn.can.map((c) => <li key={c}><Check size={16} />{c}</li>)}</ul>
        </div>
        <div>
          <h3 className="shr-fn__h">You cannot</h3>
          <ul className="shr-fn__no">{fn.cannot.map((c) => <li key={c}><X size={16} />{c}</li>)}</ul>
        </div>
      </div>
      <Banner tone="info" className="shr-mt">Payments use maker-checker control, so no one approves their own payment. This is how CollabFarm shows that money was released on independent review.</Banner>
    </Card>
  );
}

export function ContactDetails() {
  const { user, update, toast } = useApp();
  const [f, setF] = useState({ email: user.email || '', phone: user.phone || '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const dirty = f.email.trim() !== (user.email || '') || f.phone.trim() !== (user.phone || '');
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const save = async (e) => {
    e.preventDefault();
    const er = {};
    if (!validEmail(f.email)) er.email = 'Enter a valid email address, for example name@example.com.';
    if (!validPhone(f.phone)) er.phone = 'Enter a phone number with 10 to 14 digits. You may include +, spaces or dashes.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setSaving(true);
    await simulate(500);
    const changed = [f.email.trim() !== user.email && 'email', f.phone.trim() !== user.phone && 'phone'].filter(Boolean);
    update('users', user.id, { email: f.email.trim(), phone: f.phone.trim() }, {
      action: 'Updated contact details', entityType: 'User', reason: 'Changed by the account holder', summary: `Changed: ${changed.join(' and ') || 'nothing'}. Values are not shown in this log.`,
    });
    setSaving(false);
    toast('Contact details saved');
  };

  return (
    <Card>
      <CardHeader title="Contact details" subtitle="Used for sign in alerts and for messages about your work. Your name and role can only be changed by another administrator." />
      <form className="stack" onSubmit={save} noValidate>
        <div className="form-grid">
          <TextField label="Email address" required type="email" value={f.email} onChange={set('email')} error={errors.email} autoComplete="off" />
          <TextField label="Phone number" required type="tel" value={f.phone} onChange={set('phone')} error={errors.phone} autoComplete="off" hint="For example +234 803 000 0000" />
        </div>
        <div className="shr-savebar">
          <Button type="submit" loading={saving} disabled={!dirty}>Save changes</Button>
          <Button variant="outline" onClick={() => { setF({ email: user.email || '', phone: user.phone || '' }); setErrors({}); }} disabled={!dirty || saving}>Reset</Button>
          <span className="small muted" aria-live="polite">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
        </div>
      </form>
    </Card>
  );
}

export function SessionsCard() {
  const { data, user, patchData, audit, toast } = useApp();
  const prefs = userPrefs(data, user.id);
  const [ask, setAsk] = useState(false);
  const [pw, setPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const devices = SAMPLE_DEVICES.filter((d) => d.current || !prefs.otherSessionsEndedAt);

  const signOutOthers = async () => {
    setBusy(true);
    await simulate(600);
    patchData(mergeUserPrefs(user.id, { otherSessionsEndedAt: isoNow() }));
    audit({ action: 'Signed out other devices', entityType: 'User settings', entityId: user.id, reason: 'Changed by the account holder', summary: 'All other sessions ended (simulated)' });
    toast('Other devices were signed out (simulated)');
    setBusy(false); setAsk(false);
  };

  return (
    <Card>
      <CardHeader title="Where you are signed in" subtitle="Sample sessions for this demo." />
      <ul className="shr-devices">
        {devices.map((d) => { const Icon = d.icon; return (
          <li key={d.id}><Icon size={22} /><div><div className="strong small">{d.name}{d.current && <span className="chip" style={{ marginLeft: 8, background: 'var(--primary-50)', color: 'var(--primary-700)' }}>Current</span>}</div><div className="caption muted">{d.place} &middot; {d.when}</div></div></li>
        ); })}
      </ul>
      <div className="row-wrap shr-mt">
        <Button variant="outline" onClick={() => setAsk(true)} disabled={devices.length < 2}><LogOut size={16} />Sign out other devices</Button>
        <Button variant="outline" onClick={() => setPw(true)}><KeyRound size={16} />Change Password</Button>
      </div>
      <PasswordModal open={pw} onClose={() => setPw(false)} />
      <ConfirmDialog open={ask} onClose={() => setAsk(false)} onConfirm={signOutOthers} loading={busy} tone="amber" title="Sign out of other devices?" message="Every other session will end. You will need to sign in again on those devices." confirmLabel="Sign out others" />
    </Card>
  );
}

const TIPS = [
  'Use a password that you use nowhere else, and change it if you think someone else knows it.',
  'Never share a one-time code. CollabFarm staff will never ask you for one.',
  'Sign out on shared computers, and lock your screen when you step away.',
  'Check the details of every payment before you approve it. You are the independent check.',
  'Report anything that looks wrong using Complaints so it gets a reference and a reviewer.',
];

export function SecurityTips() {
  return (
    <Card tone="tint">
      <CardHeader title="Security tips" />
      <ul className="shr-tips">
        {TIPS.map((t) => <li key={t}><Lightbulb size={16} /><span>{t}</span></li>)}
      </ul>
      <p className="caption muted"><ShieldCheck size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />Nothing you type here is sent anywhere in this demo.</p>
    </Card>
  );
}
