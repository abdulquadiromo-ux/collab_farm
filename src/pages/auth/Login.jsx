import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { Banner, Button, PasswordField, TextField } from '../../components/ui/index.js';
import AuthHeading from '../../components/auth/AuthHeading.jsx';
import DemoAccounts from '../../components/auth/DemoAccounts.jsx';
import GoogleButton from '../../components/auth/GoogleButton.jsx';
import { destinationFor, emailKey, focusFirstInvalid, isEmail } from '../../components/auth/authUtils.js';
import '../../styles/pages/auth.css';

export default function Login() {
  const { data, user, signIn, toast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const formRef = useRef(null);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [unknown, setUnknown] = useState(false);
  const [suspended, setSuspended] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // Already signed in: go straight to the right dashboard.
  if (user) return <Navigate to={destinationFor(user, from)} replace />;

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
    setUnknown(false);
    setSuspended(null);
  };

  const finish = (u) => {
    if (u.status === 'Suspended') { setSuspended(u); return; }
    if (!signIn(u.id)) return;
    toast(`Signed in as ${u.name}`, 'success');
    navigate(destinationFor(u, from), { replace: true });
  };

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = 'Enter your email address.';
    else if (!isEmail(form.email)) e.email = 'Enter a valid email address, for example name@example.com.';
    if (!form.password) e.password = 'Enter your password.';
    else if (form.password.length < 8) e.password = 'Your password must have at least 8 characters.';
    return e;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setUnknown(false);
    if (Object.keys(e).length) { focusFirstInvalid(formRef.current); return; }
    setLoading(true);
    await simulate(800);
    const match = data.users.find((u) => emailKey(u.email) === emailKey(form.email));
    setLoading(false);
    if (!match) { setUnknown(true); return; }
    finish(match);
  };

  const pickDemo = async (u) => {
    setBusyId(u.id);
    await simulate(350);
    setBusyId(null);
    finish(u);
  };

  return (
    <div className="auth-pane">
      <AuthHeading title="Welcome Back" subtitle="Sign in to follow your funding, farmers and approvals in one place." />

      <form className="auth-form" onSubmit={onSubmit} noValidate ref={formRef} aria-label="Sign in">
        {suspended && (
          <Banner tone="danger" title="This account is suspended">
            {suspended.name}&apos;s account cannot sign in right now.{suspended.suspendedReason ? ` Reason recorded: ${suspended.suspendedReason}.` : ''} Contact CollabFarm support from the <Link to="/contact">Contact page</Link>, or pick another demo account below.
          </Banner>
        )}
        {unknown && (
          <Banner tone="warn" title="No demo account uses that email">
            This demo only knows the sample accounts below and any account you create here. <Link to="/register">Create an account</Link> or pick a demo account.
          </Banner>
        )}
        <TextField
          label="Email" required type="email" name="email" autoComplete="email" placeholder="youremail@email.com"
          value={form.email} error={errors.email} onChange={(e) => set('email', e.target.value)}
        />
        <PasswordField
          label="Password" required name="password" autoComplete="current-password" placeholder="Input password"
          hint="Demo: any password with 8 or more characters works."
          value={form.password} error={errors.password} onChange={(e) => set('password', e.target.value)}
        />
        <div className="auth-form__aside"><Link to="/forgot-password">Forgot Password?</Link></div>
        <Button type="submit" size="lg" block loading={loading}>{loading ? 'Signing in' : 'Login'}</Button>
      </form>

      <div className="or-divider" role="separator"><span>or</span></div>
      <GoogleButton onPick={pickDemo} busyId={busyId} />

      <p className="center small">Don&apos;t have account? <Link to="/register" className="strong">Create Account</Link></p>
      <p className="center small muted">Invited by your cooperative? <Link to="/farmer-activation">Activate your farmer account</Link></p>

      <DemoAccounts onPick={pickDemo} busyId={busyId} />
    </div>
  );
}
