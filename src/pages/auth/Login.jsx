import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { Banner, Button, PasswordField, TextField } from '../../components/ui/index.js';
import AuthHeading from '../../components/auth/AuthHeading.jsx';
import { focusFirstInvalid } from '../../components/auth/authUtils.js';
import { accountFromAuthResponse } from '../../utils/api.js';
import '../../styles/pages/auth.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://test-collab-farm.onrender.com').replace(/\/$/, '');

export default function Login() {
  const { data, user, authenticate, toast } = useApp();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [form, setForm] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={ROLE_DASHBOARD[user.role] || '/'} replace />;

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
    setRequestError('');
  };

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = 'Enter your username.';
    if (!form.password) e.password = 'Enter your password.';
    return e;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    setRequestError('');
    if (Object.keys(validationErrors).length) { focusFirstInvalid(formRef.current); return; }

    setLoading(true);
    try {
      const body = new URLSearchParams({
        grant_type: 'password',
        username: form.username.trim(),
        password: form.password,
        scope: '',
      });
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = typeof payload?.detail === 'string'
          ? payload.detail
          : Array.isArray(payload?.detail) ? payload.detail.map((item) => item.msg).join(' ') : '';
        const credentialsRejected = [400, 401, 403].includes(response.status);
        setRequestError(detail || (credentialsRejected ? 'Incorrect username or password. Check your details and try again.' : `Login failed (${response.status}). Please try again.`));
        return;
      }

      const token = payload?.access_token || payload?.data?.access_token;
      if (!token) { setRequestError('The login response did not include an access token.'); return; }
      const cachedAccount = data.users.find((item) => item.email?.trim().toLowerCase() === form.username.trim().toLowerCase());
      const account = accountFromAuthResponse(payload, token, form.username.trim(), cachedAccount || {});
      if (!account) {
        setRequestError('Login succeeded, but the response did not include an account role. Please contact support.');
        return;
      }
      authenticate(account, token);
      toast(`Signed in as ${account.name}`, 'success');
      navigate(ROLE_DASHBOARD[account.role] || '/', { replace: true });
    } catch {
      setRequestError('Could not connect to the login service. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-pane">
      <AuthHeading title="Welcome Back" subtitle="Sign in to follow your funding, farmers and approvals in one place." />

      <form className="auth-form" onSubmit={onSubmit} noValidate ref={formRef} aria-label="Sign in">
        {requestError && <Banner tone="danger" title="Unable to sign in">{requestError}</Banner>}
        <TextField
          label="Username" required type="text" name="username" autoComplete="username" placeholder="Enter your username"
          value={form.username} error={errors.username} onChange={(e) => set('username', e.target.value)}
        />
        <PasswordField
          label="Password" required name="password" autoComplete="current-password" placeholder="Input password"
          value={form.password} error={errors.password} onChange={(e) => set('password', e.target.value)}
        />
        <div className="auth-form__aside"><Link to="/forgot-password">Forgot Password?</Link></div>
        <Button type="submit" size="lg" block loading={loading}>{loading ? 'Signing in' : 'Login'}</Button>
      </form>

      <p className="center small">Don&apos;t have account? <Link to="/register" className="strong">Create Account</Link></p>
      <p className="center small muted">Invited by your cooperative? <Link to="/farmer-activation">Activate your farmer account</Link></p>
    </div>
  );
}

const ROLE_DASHBOARD = { cooperative: '/coop', investor: '/investor', admin: '/admin', farmer: '/farmer' };
