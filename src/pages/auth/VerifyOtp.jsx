import { useEffect, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, MailCheck } from 'lucide-react';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { Banner, Button, LinkButton } from '../../components/ui/index.js';
import AuthHeading from '../../components/auth/AuthHeading.jsx';
import OtpInput from '../../components/auth/OtpInput.jsx';
import { OTP_DEMO_CODE, OTP_LENGTH, OTP_RESEND_SECONDS, maskEmail, maskPhone, nowISO, onboardingPathFor } from '../../components/auth/authUtils.js';
import '../../styles/pages/auth.css';

const EMPTY = Array(OTP_LENGTH).fill('');

export default function VerifyOtp() {
  const { user, update, toast } = useApp();
  const navigate = useNavigate();
  const errorId = useId();
  const [digits, setDigits] = useState(EMPTY);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [seconds, setSeconds] = useState(OTP_RESEND_SECONDS);

  // Resend countdown. Cleans up on every tick and on leaving the page.
  useEffect(() => {
    if (seconds <= 0) return undefined;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const next = user ? onboardingPathFor(user.role) : '/';
  // After success, continue on to the onboarding wizard for the role.
  useEffect(() => {
    if (!verified) return undefined;
    const t = setTimeout(() => navigate(next), 1600);
    return () => clearTimeout(t);
  }, [verified, navigate, next]);

  if (!user) {
    return (
      <div className="auth-pane">
        <AuthHeading title="Verify your account" subtitle="You need to start from an account before you can verify it." />
        <div className="auth-form">
          <LinkButton to="/register" size="lg" block>Create an account</LinkButton>
          <LinkButton to="/login" variant="outline" size="lg" block>Sign in</LinkButton>
        </div>
      </div>
    );
  }

  const code = digits.join('');
  const onVerify = async (ev) => {
    ev.preventDefault();
    if (code.length < OTP_LENGTH) { setError(`Enter all ${OTP_LENGTH} digits of the code.`); return; }
    setLoading(true);
    await simulate(700);
    setLoading(false);
    if (code !== OTP_DEMO_CODE) {
      setError('That code is not correct. Check the code in your message and try again, or ask for a new one.');
      return;
    }
    update('users', user.id, { contactVerifiedAt: nowISO() }, { action: 'Email and phone verified', entityType: 'User', reason: 'Registration', summary: 'One time code accepted (demo)' });
    toast('Email and phone verified.', 'success');
    setVerified(true);
  };

  const resend = () => {
    setSeconds(OTP_RESEND_SECONDS);
    setDigits(EMPTY);
    setError('');
    toast('A new code was sent. This is simulated: no real message leaves this demo.', 'info');
  };

  if (verified) {
    return (
      <div className="auth-pane">
        <div className="auth-success" role="status">
          <span className="auth-success__icon"><CheckCircle2 size={34} /></span>
          <AuthHeading title="You are verified" subtitle="Thank you. Taking you to the next step now." />
          <LinkButton to={next} size="lg" block>Continue</LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-pane">
      <AuthHeading title="Check your messages" subtitle={`We sent a ${OTP_LENGTH} digit code to ${maskEmail(user.email)} and to your phone (${maskPhone(user.phone)}). Enter it below to confirm it is really you.`} />

      <form className="auth-form" onSubmit={onVerify} noValidate aria-label="Verify code">
        <div className="field">
          <span className="field__label" id="otp-label">Verification code<span className="req" aria-hidden="true">*</span></span>
          <OtpInput value={digits} onChange={(d) => { setDigits(d); setError(''); }} invalid={!!error} disabled={loading} describedBy={error ? errorId : undefined} />
          {error && <span className="field__error" id={errorId} role="alert">{error}</span>}
        </div>

        <Button type="submit" size="lg" block loading={loading}>{loading ? 'Checking code' : 'Verify and continue'}</Button>

        <div className="auth-resend">
          {seconds > 0
            ? <span className="small muted" aria-live="polite">Did not get a code? You can ask for a new one in {seconds} seconds.</span>
            : <span className="small">Did not get a code? <button type="button" className="link-btn" onClick={resend}>Send a new code</button></span>}
        </div>
      </form>

      <Banner tone="warn" title="Demo only">
        <span>No email or text message is sent. Use the code <strong className="auth-code">{OTP_DEMO_CODE}</strong>. </span>
        <button type="button" className="link-btn" onClick={() => { setDigits(OTP_DEMO_CODE.split('')); setError(''); }}>Fill it in for me</button>
      </Banner>

      <p className="caption muted center"><MailCheck size={14} style={{ verticalAlign: '-2px' }} /> Wrong account? <Link to="/login">Sign in with another account</Link></p>
    </div>
  );
}
