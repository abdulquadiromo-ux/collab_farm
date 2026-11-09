import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp, newId, simulate } from '../../context/AppContext.jsx';
import { Banner, Button, Checkbox, PasswordField, TextField } from '../../components/ui/index.js';
import AuthHeading from '../../components/auth/AuthHeading.jsx';
import GoogleButton from '../../components/auth/GoogleButton.jsx';
import RoleCards from '../../components/auth/RoleCards.jsx';
import { PasswordStrength } from '../../components/auth/PasswordHelp.jsx';
import {
  DRAFT_COOP_NAME, PHONE_ERROR, PHONE_HINT, destinationFor, emailKey, focusFirstInvalid, isEmail, isNigerianPhone, isPersonName, normalisePhone, nowISO,
} from '../../components/auth/authUtils.js';
import '../../styles/pages/auth.css';

export default function Register() {
  const { data, user, add, patchData, signIn, toast } = useApp();
  const navigate = useNavigate();
  const { role: roleParam } = useParams();
  const formRef = useRef(null);
  const farmerParam = roleParam === 'farmer';
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '', terms: false,
    role: roleParam === 'cooperative' || roleParam === 'investor' ? roleParam : '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  };

  const validate = () => {
    const e = {};
    if (!isPersonName(form.firstName)) e.firstName = 'Enter your first name.';
    if (!isPersonName(form.lastName)) e.lastName = 'Enter your last name.';
    if (!form.email.trim()) e.email = 'Enter your email address.';
    else if (!isEmail(form.email)) e.email = 'Enter a valid email address, for example name@example.com.';
    else if (data.users.some((u) => emailKey(u.email) === emailKey(form.email))) {
      e.email = <>An account with this email already exists. <Link to="/login">Sign in instead</Link>.</>;
    }
    if (!form.phone.trim()) e.phone = 'Enter your phone number.';
    else if (!isNigerianPhone(form.phone)) e.phone = PHONE_ERROR;
    if (!form.role) e.role = 'Choose Cooperative or Investor to continue.';
    if (!form.password) e.password = 'Create a password.';
    else if (form.password.length < 8) e.password = 'Your password must have at least 8 characters.';
    if (!form.confirm) e.confirm = 'Type your password again.';
    else if (form.confirm !== form.password) e.confirm = 'The two passwords do not match. Type the same password in both boxes.';
    if (!form.terms) e.terms = 'Accept the Terms and the Privacy notice to continue.';
    return e;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { focusFirstInvalid(formRef.current); return; }
    setLoading(true);
    await simulate(900);

    const first = form.firstName.trim();
    const last = form.lastName.trim();
    const fullName = `${first} ${last}`;
    const email = form.email.trim();
    const phone = normalisePhone(form.phone);
    const at = nowISO();
    const userId = newId('u');

    // A new organisation always starts as an unverified draft with nothing in it: no farmers, no packages, wallet at zero.
    let orgId;
    if (form.role === 'cooperative') {
      orgId = newId('coop');
      add('cooperatives', {
        id: orgId, name: DRAFT_COOP_NAME, regNumber: '', yearEstablished: null, email, phone, address: '', state: '', lga: '',
        status: 'Draft', verifiedAt: null, representatives: [], bank: { name: '', accountName: '', last4: '' }, documents: [],
        onboarding: { step: 0 }, statusHistory: [{ status: 'Draft', at, note: 'Account created' }], createdAt: at,
      });
    } else {
      orgId = newId('inv');
      add('investors', {
        id: orgId, name: fullName, org: 'Individual', type: 'Private Investor', email, phone, country: 'Nigeria', location: '', address: '',
        status: 'Draft', eligibility: 'Pending checks', riskAcknowledged: false, agreementSigned: false, verifiedAt: null,
        onboarding: { step: 0 }, statusHistory: [{ status: 'Draft', at, note: 'Account created' }], createdAt: at,
      });
      patchData((d) => ({ wallets: { ...d.wallets, [orgId]: { partner: 'Sample Regulated Partner Bank', accountRef: 'Issued after verification', available: 0, locked: 0, pendingConfirmation: 0 } } }));
    }
    add(
      'users',
      { id: userId, role: form.role, name: fullName, firstName: first, email, phone, orgId, title: form.role === 'cooperative' ? 'Cooperative Administrator' : 'Investor', status: 'Draft', createdAt: at },
      { action: 'Account registered', entityType: 'User', reason: 'Self registration', summary: `New ${form.role} account created with a draft organisation`, actor: fullName, role: form.role },
    );
    signIn(userId);
    setLoading(false);
    toast('Account created. Now verify your email and phone.', 'success');
    navigate('/verify-otp');
  };

  return (
    <div className="auth-pane">
      <AuthHeading title="Create an account" subtitle="Register your cooperative or your investor profile. It takes a few minutes and you can finish later." />

      {user && (
        <Banner tone="info">You are signed in as {user.name}. Creating a new account will replace this demo session.</Banner>
      )}
      {farmerParam && (
        <Banner tone="green" title="Farmers are invited by their cooperative">
          You do not register yourself. Your cooperative sends you an invite code. <Link to="/farmer-activation">Activate your farmer account</Link>.
        </Banner>
      )}

      <form className="auth-form" onSubmit={onSubmit} noValidate ref={formRef} aria-label="Create an account">
        <div className="auth-row2">
          <TextField label="First Name" required name="firstName" autoComplete="given-name" placeholder="Enter First Name" value={form.firstName} error={errors.firstName} onChange={(e) => set('firstName', e.target.value)} />
          <TextField label="Last Name" required name="lastName" autoComplete="family-name" placeholder="Enter Last Name" value={form.lastName} error={errors.lastName} onChange={(e) => set('lastName', e.target.value)} />
        </div>
        <div className="auth-row2">
          <TextField label="Email" required type="email" name="email" autoComplete="email" placeholder="youremail@email.com" value={form.email} error={errors.email} onChange={(e) => set('email', e.target.value)} />
          <TextField label="Phone" required type="tel" name="phone" autoComplete="tel" placeholder="Enter Phone Number" hint={PHONE_HINT} value={form.phone} error={errors.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>

        <RoleCards value={form.role} onChange={(r) => set('role', r)} error={errors.role} />
        <p className="caption muted auth-farmer-note">
          Are you a farmer? Farmers are invited by their cooperative and do not register here. <Link to="/farmer-activation">Activate your farmer account with your invite code</Link>.
        </p>

        <div className="stack-sm">
          <PasswordField label="Password" required name="password" autoComplete="new-password" placeholder="Create a password" value={form.password} error={errors.password} onChange={(e) => set('password', e.target.value)} />
          <PasswordStrength value={form.password} />
        </div>
        <PasswordField label="Confirm password" required name="confirm" autoComplete="new-password" placeholder="Type the password again" value={form.confirm} error={errors.confirm} onChange={(e) => set('confirm', e.target.value)} />

        <Checkbox checked={form.terms} onChange={(v) => set('terms', v)} error={errors.terms}>
          I agree to the <Link to="/terms">Terms</Link> and the <Link to="/privacy">Privacy notice</Link>.
        </Checkbox>

        <Button type="submit" size="lg" block loading={loading}>{loading ? 'Creating account' : 'Sign up'}</Button>
        <p className="caption muted center">Demo only: your password is never saved. You can sign in again later with this email and any password of 8 or more characters.</p>
      </form>

      <div className="or-divider" role="separator"><span>or</span></div>
      <GoogleButton onPick={(u) => { if (!signIn(u.id)) return; navigate(destinationFor(u)); toast(`Signed in as ${u.name}`, 'success'); }} />

      <p className="center small">Already have an account? <Link to="/login" className="strong">Sign in</Link></p>
    </div>
  );
}
