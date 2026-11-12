import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Banner, Button, Checkbox, PasswordField, TextField } from '../../components/ui/index.js';
import AuthHeading from '../../components/auth/AuthHeading.jsx';
import RoleCards from '../../components/auth/RoleCards.jsx';
import { PasswordStrength } from '../../components/auth/PasswordHelp.jsx';
import { useApp } from '../../context/AppContext.jsx';
import {
  PHONE_ERROR, PHONE_HINT, focusFirstInvalid, isEmail, isNigerianPhone, isPersonName, normalisePhone,
} from '../../components/auth/authUtils.js';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';
import '../../styles/pages/auth.css';

export default function Register() {
  const { beginRegistration } = useApp();
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
    setErrors((e) => {
      if (!e[name] && !e.submit) return e;
      const next = { ...e, submit: undefined };
      delete next[name];
      return next;
    });
  };

  const validate = () => {
    const e = {};
    if (!isPersonName(form.firstName)) e.firstName = 'Enter your first name.';
    if (!isPersonName(form.lastName)) e.lastName = 'Enter your last name.';
    if (!form.email.trim()) e.email = 'Enter your email address.';
    else if (!isEmail(form.email)) e.email = 'Enter a valid email address, for example name@example.com.';
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
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          is_active: true,
          is_superuser: false,
          is_verified: false,
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          phone_number: normalisePhone(form.phone),
          role: form.role.toUpperCase(),
          verification_status: 'not_submitted',
          confirm_password: form.confirm,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setErrors((prev) => ({ ...prev, submit: apiErrorMessage(payload, `Account creation failed (${response.status}). Please try again.`) }));
        return;
      }
      const email = form.email.trim();
      beginRegistration({ email, password: form.password, role: form.role, firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: normalisePhone(form.phone) });
      navigate(`/verify-otp?email=${encodeURIComponent(email)}&role=${encodeURIComponent(form.role)}`);
    } catch {
      setErrors((prev) => ({ ...prev, submit: 'Could not connect to the account service. Check your connection and try again.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-pane">
      <AuthHeading title="Create an account" subtitle="Register your cooperative or your investor profile. It takes a few minutes and you can finish later." />

      {farmerParam && (
        <Banner tone="green" title="Farmers are invited by their cooperative">
          You do not register yourself. Your cooperative sends you an invite code. <Link to="/farmer-activation">Activate your farmer account</Link>.
        </Banner>
      )}

      <form className="auth-form" onSubmit={onSubmit} noValidate ref={formRef} aria-label="Create an account">
        {errors.submit && <Banner tone="danger" title="Unable to create account">{errors.submit}</Banner>}
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
      </form>

      <p className="center small">Already have an account? <Link to="/login" className="strong">Sign in</Link></p>
    </div>
  );
}
