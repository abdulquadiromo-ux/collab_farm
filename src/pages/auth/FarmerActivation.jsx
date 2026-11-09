import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp, newId, simulate } from '../../context/AppContext.jsx';
import { Banner, Button, Checkbox, PasswordField, TextField } from '../../components/ui/index.js';
import AuthHeading from '../../components/auth/AuthHeading.jsx';
import { PasswordStrength } from '../../components/auth/PasswordHelp.jsx';
import {
  DEMO_INVITES, PHONE_ERROR, PHONE_HINT, focusFirstInvalid, isNigerianPhone, normaliseCode, normalisePhone, nowISO,
} from '../../components/auth/authUtils.js';
import '../../styles/pages/auth.css';

export default function FarmerActivation() {
  const { data, user, add, update, notify, signIn, toast } = useApp();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [form, setForm] = useState({ code: '', phone: '', password: '', confirm: '', consent: false });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  };

  // For the demo hint: who each code belongs to. A farmer that already has a user account is named after that account.
  const inviteRows = DEMO_INVITES.map((inv) => {
    const farmer = data.farmers.find((f) => f.id === inv.farmerId);
    const account = data.users.find((u) => u.role === 'farmer' && u.farmerId === inv.farmerId);
    return { ...inv, label: account ? `${account.name} (existing demo farmer account)` : farmer ? farmer.name : 'Unknown farmer' };
  });

  const validate = () => {
    const e = {};
    const code = normaliseCode(form.code);
    if (!code) e.code = 'Enter the invite code your cooperative gave you.';
    else {
      const invite = DEMO_INVITES.find((i) => i.code === code);
      const farmer = invite && data.farmers.find((f) => f.id === invite.farmerId);
      if (!invite || !farmer) e.code = 'We do not recognise that invite code. Check it against the message from your cooperative, or ask them to send it again.';
      else if (farmer.status === 'Removed') e.code = 'This invite is no longer active. Please speak to your cooperative.';
    }
    if (!form.phone.trim()) e.phone = 'Enter your phone number.';
    else if (!isNigerianPhone(form.phone)) e.phone = PHONE_ERROR;
    if (!form.password) e.password = 'Create a password.';
    else if (form.password.length < 8) e.password = 'Your password must have at least 8 characters.';
    if (!form.confirm) e.confirm = 'Type your password again.';
    else if (form.confirm !== form.password) e.confirm = 'The two passwords do not match. Type the same password in both boxes.';
    if (!form.consent) e.consent = 'We need your consent to continue. Without it your cooperative cannot add you to a project.';
    return e;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { focusFirstInvalid(formRef.current); return; }
    setLoading(true);
    await simulate(900);

    const invite = DEMO_INVITES.find((i) => i.code === normaliseCode(form.code));
    const farmer = data.farmers.find((f) => f.id === invite.farmerId);
    // Reuse an existing account for this farmer (u-farmer for f-003) so activating twice never creates a duplicate.
    let account = data.users.find((u) => u.role === 'farmer' && u.farmerId === farmer.id);
    const at = nowISO();
    if (!account) {
      account = add(
        'users',
        {
          id: newId('u'), role: 'farmer', name: farmer.name, firstName: farmer.name.split(' ')[0], email: farmer.email, phone: normalisePhone(form.phone),
          orgId: farmer.coopId, farmerId: farmer.id, title: 'Farmer', status: 'Active', createdAt: at,
        },
        { action: 'Farmer account activated', entityType: 'Farmer', reason: 'Invite code accepted', summary: `Account created for ${farmer.id}`, actor: farmer.name, role: 'farmer' },
      );
    }
    update('farmers', farmer.id, { consent: true, accountActivatedAt: at }, { action: 'Farmer consent recorded', entityType: 'Farmer', reason: 'Privacy consent given at activation', summary: 'Consent set to given', actor: farmer.name, role: 'farmer' });
    notify('cooperative', 'Farmer activated their account', `${farmer.name} accepted the invite and gave consent.`, `/coop/farmers/${farmer.id}`, 'verification');
    signIn(account.id);
    setLoading(false);
    toast(`Welcome, ${account.name.split(' ')[0]}. Your account is active.`, 'success');
    navigate('/farmer');
  };

  return (
    <div className="auth-pane">
      <AuthHeading title="Activate your account" subtitle="Your cooperative has invited you. Enter the invite code they gave you and choose a password." />

      {user && <Banner tone="info">You are signed in as {user.name}. Activating a farmer account will replace this demo session.</Banner>}

      <form className="auth-form" onSubmit={onSubmit} noValidate ref={formRef} aria-label="Activate farmer account">
        <TextField label="Invite code" required name="code" autoComplete="off" autoCapitalize="characters" placeholder="For example GFC-F000-0A0A" value={form.code} error={errors.code} onChange={(e) => set('code', e.target.value)} />
        <TextField label="Phone number" required type="tel" name="phone" autoComplete="tel" placeholder="0803 123 4567" hint={PHONE_HINT} value={form.phone} error={errors.phone} onChange={(e) => set('phone', e.target.value)} />
        <div className="stack-sm">
          <PasswordField label="Create password" required name="password" autoComplete="new-password" placeholder="Create a password" value={form.password} error={errors.password} onChange={(e) => set('password', e.target.value)} />
          <PasswordStrength value={form.password} />
        </div>
        <PasswordField label="Confirm password" required name="confirm" autoComplete="new-password" placeholder="Type the password again" value={form.confirm} error={errors.confirm} onChange={(e) => set('confirm', e.target.value)} />
        <Checkbox checked={form.consent} onChange={(v) => set('consent', v)} error={errors.consent}>
          I agree that CollabFarm and my cooperative may keep and use my details to manage my part in funded projects, as explained in the <Link to="/privacy">Privacy notice</Link>. I can ask questions or complain at any time.
        </Checkbox>
        <Button type="submit" size="lg" block loading={loading}>{loading ? 'Activating' : 'Activate account'}</Button>
      </form>

      <section className="auth-demo" aria-label="Demo invite codes">
        <div className="auth-demo__head">
          <h2 className="auth-demo__title">Demo invite codes</h2>
          <span className="auth-tag">Demo only</span>
        </div>
        <p className="caption muted">Real invites come from a cooperative by message. In this demo the phone number is only checked for format. Choose a code to fill it in.</p>
        <ul className="auth-demo__list">
          {inviteRows.map((r) => (
            <li key={r.code}>
              <button type="button" className="auth-demo__item auth-demo__item--code" onClick={() => { set('code', r.code); }} aria-label={`Use invite code ${r.code} for ${r.label}`}>
                <span className="auth-demo__who">
                  <span className="strong small auth-code">{r.code}</span>
                  <span className="caption muted">{r.label}</span>
                </span>
                <span className="caption green strong">Use code</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p className="center small muted">Not invited yet? Ask your cooperative to add you. Cooperatives and investors can <Link to="/register">create an account</Link>.</p>
      <p className="center small">Already activated? <Link to="/login" className="strong">Sign in</Link></p>
    </div>
  );
}
