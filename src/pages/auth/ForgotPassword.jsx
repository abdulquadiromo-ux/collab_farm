import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { simulate } from '../../context/AppContext.jsx';
import { Banner, Button, LinkButton, TextField } from '../../components/ui/index.js';
import AuthHeading from '../../components/auth/AuthHeading.jsx';
import { isEmail } from '../../components/auth/authUtils.js';
import '../../styles/pages/auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!email.trim()) { setError('Enter the email address you registered with.'); return; }
    if (!isEmail(email)) { setError('Enter a valid email address, for example name@example.com.'); return; }
    setLoading(true);
    await simulate(900);
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="auth-pane">
        <div className="auth-success" role="status">
          <span className="auth-success__icon"><MailCheck size={34} /></span>
          <AuthHeading title="Check your email" subtitle={`If an account exists for ${email.trim()}, we have sent a link to reset the password. The link works once and expires after a short time.`} />
        </div>
        <Banner tone="warn" title="Demo only">
          No email is sent. Use the link below to open the reset page, as if you had clicked the link in the email.
        </Banner>
        <div className="auth-form">
          <LinkButton to="/reset-password" size="lg" block>Open reset page</LinkButton>
          <Button variant="outline" size="lg" block onClick={() => { setSent(false); setEmail(''); }}>Use a different email</Button>
        </div>
        <p className="center small"><Link to="/login">Back to sign in</Link></p>
      </div>
    );
  }

  return (
    <div className="auth-pane">
      <AuthHeading title="Forgot password?" subtitle="Enter your email and we will send you a link to choose a new password." />
      <form className="auth-form" onSubmit={onSubmit} noValidate aria-label="Request a password reset">
        <TextField
          label="Email" required type="email" name="email" autoComplete="email" placeholder="youremail@email.com"
          value={email} error={error} onChange={(e) => { setEmail(e.target.value); setError(''); }}
        />
        <Button type="submit" size="lg" block loading={loading}>{loading ? 'Sending' : 'Send reset link'}</Button>
      </form>
      <p className="center small">Remembered it? <Link to="/login" className="strong">Back to sign in</Link></p>
    </div>
  );
}
