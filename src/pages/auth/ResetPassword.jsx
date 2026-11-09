import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { simulate } from '../../context/AppContext.jsx';
import { Banner, Button, LinkButton, PasswordField } from '../../components/ui/index.js';
import AuthHeading from '../../components/auth/AuthHeading.jsx';
import { PasswordRules, PasswordStrength } from '../../components/auth/PasswordHelp.jsx';
import { passwordChecks } from '../../components/auth/authUtils.js';
import '../../styles/pages/auth.css';

export default function ResetPassword() {
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const e = {};
    const missing = passwordChecks(form.password).filter((c) => c.required && !c.ok);
    if (!form.password) e.password = 'Choose a new password.';
    else if (missing.length) e.password = `Your new password still needs: ${missing.map((m) => m.label.toLowerCase()).join(', ')}.`;
    if (!form.confirm) e.confirm = 'Type the new password again.';
    else if (form.confirm !== form.password) e.confirm = 'The two passwords do not match. Type the same password in both boxes.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    await simulate(900);
    setLoading(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="auth-pane">
        <div className="auth-success" role="status">
          <span className="auth-success__icon"><CheckCircle2 size={34} /></span>
          <AuthHeading title="Password updated" subtitle="You can now sign in with your new password." />
        </div>
        <Banner tone="info">Demo only: nothing was saved. This demo accepts any password of 8 or more characters at sign in.</Banner>
        <LinkButton to="/login" size="lg" block>Go to sign in</LinkButton>
      </div>
    );
  }

  return (
    <div className="auth-pane">
      <AuthHeading title="Update Password" subtitle="Create a unique password to secure your account." />
      <form className="auth-form" onSubmit={onSubmit} noValidate aria-label="Reset password">
        <div className="stack-sm">
          <PasswordField label="New Password" required name="password" autoComplete="new-password" placeholder="Create a new password" value={form.password} error={errors.password} onChange={(e) => set('password', e.target.value)} />
          <PasswordStrength value={form.password} />
          <PasswordRules value={form.password} />
        </div>
        <PasswordField label="Confirm Password" required name="confirm" autoComplete="new-password" placeholder="Type the new password again" value={form.confirm} error={errors.confirm} onChange={(e) => set('confirm', e.target.value)} />
        <Button type="submit" size="lg" block loading={loading}>{loading ? 'Saving' : 'Change Password'}</Button>
      </form>
      <Banner tone="warn" title="Demo only">Nothing is stored. The password you type here is thrown away as soon as you leave this page.</Banner>
      <p className="center small"><Link to="/login">Back to sign in</Link></p>
    </div>
  );
}
