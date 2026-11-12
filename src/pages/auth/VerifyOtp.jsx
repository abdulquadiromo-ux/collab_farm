import { useEffect, useId, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, MailCheck } from 'lucide-react';
import { Banner, Button, LinkButton } from '../../components/ui/index.js';
import AuthHeading from '../../components/auth/AuthHeading.jsx';
import OtpInput from '../../components/auth/OtpInput.jsx';
import { OTP_LENGTH, maskEmail } from '../../components/auth/authUtils.js';
import { API_BASE_URL, accountFromAuthResponse, apiErrorMessage } from '../../utils/api.js';
import { useApp } from '../../context/AppContext.jsx';
import { onboardingPathFor } from '../../components/auth/authUtils.js';
import '../../styles/pages/auth.css';

const EMPTY = Array(OTP_LENGTH).fill('');
const RESEND_SECONDS = 30;

export default function VerifyOtp() {
  const { pendingRegistration, authenticate, clearPendingRegistration, toast } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const email = new URLSearchParams(location.search).get('email') || '';
  const errorId = useId();
  const [digits, setDigits] = useState(EMPTY);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifiedNeedsLogin, setVerifiedNeedsLogin] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const timer = setTimeout(() => setSeconds((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  if (!email) {
    return (
      <div className="auth-pane">
        <AuthHeading title="Verify your account" subtitle="Create an account first, then follow the verification link sent to your email." />
        <div className="auth-form"><LinkButton to="/register" size="lg" block>Create an account</LinkButton></div>
      </div>
    );
  }

  const onVerify = async (event) => {
    event.preventDefault();
    const otp = digits.join('');
    if (otp.length < OTP_LENGTH) { setError(`Enter all ${OTP_LENGTH} digits of the code.`); return; }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(apiErrorMessage(payload, `Verification failed (${response.status}). Check the code and try again.`));
        return;
      }
      const registration = pendingRegistration && pendingRegistration.email.toLowerCase() === email.toLowerCase()
        ? pendingRegistration
        : null;
      if (!registration) {
        setVerifiedNeedsLogin(true);
        setVerified(true);
        return;
      }

      try {
        const loginBody = new URLSearchParams({ grant_type: 'password', username: registration.email, password: registration.password, scope: '' });
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
          body: loginBody,
        });
        const loginPayload = await loginResponse.json().catch(() => null);
        const token = loginPayload?.access_token || loginPayload?.data?.access_token;
        const account = token && accountFromAuthResponse(loginPayload, token, registration.email, {
          role: registration.role,
          name: `${registration.firstName} ${registration.lastName}`.trim(),
          firstName: registration.firstName,
          phone: registration.phone,
        });
        if (!loginResponse.ok || !token || !account) {
          clearPendingRegistration();
          setVerifiedNeedsLogin(true);
          setVerified(true);
          return;
        }
        authenticate(account, token);
        clearPendingRegistration();
        toast('Email verified. Set up your profile to continue.', 'success');
        navigate(onboardingPathFor(account.role), { replace: true });
      } catch {
        clearPendingRegistration();
        setVerifiedNeedsLogin(true);
        setVerified(true);
      }
    } catch {
      setError('Could not connect to the verification service. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-verification?email=${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(apiErrorMessage(payload, `Could not resend the code (${response.status}). Please try again.`));
        return;
      }
      setDigits(EMPTY);
      setSeconds(RESEND_SECONDS);
    } catch {
      setError('Could not connect to the verification service. Check your connection and try again.');
    } finally {
      setResending(false);
    }
  };

  if (verified) {
    return (
      <div className="auth-pane">
        <div className="auth-success" role="status">
          <span className="auth-success__icon"><CheckCircle2 size={34} /></span>
          <AuthHeading
            title="Your email is verified"
            subtitle={verifiedNeedsLogin ? 'Your account is verified. Sign in to continue.' : 'Your account is ready. Continue to your profile setup.'}
          />
          {verifiedNeedsLogin
            ? <LinkButton to="/login" size="lg" block>Continue to sign in</LinkButton>
            : <LinkButton to={onboardingPathFor(location.search.includes('role=investor') ? 'investor' : 'cooperative')} size="lg" block>Continue to profile setup</LinkButton>}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-pane">
      <AuthHeading title="Check your email" subtitle={`We sent a ${OTP_LENGTH} digit verification code to ${maskEmail(email)}. Enter it below to verify your account.`} />

      <form className="auth-form" onSubmit={onVerify} noValidate aria-label="Verify code">
        {error && <Banner tone="danger" title="Unable to verify">{error}</Banner>}
        <div className="field">
          <span className="field__label" id="otp-label">Verification code<span className="req" aria-hidden="true">*</span></span>
          <OtpInput value={digits} onChange={(value) => { setDigits(value); setError(''); }} invalid={!!error} disabled={loading || resending} describedBy={error ? errorId : undefined} />
          {error && <span className="field__error" id={errorId} role="alert">{error}</span>}
        </div>

        <Button type="submit" size="lg" block loading={loading}>{loading ? 'Checking code' : 'Verify email'}</Button>

        <div className="auth-resend">
          {seconds > 0
            ? <span className="small muted" aria-live="polite">You can request another code in {seconds} seconds.</span>
            : <span className="small">Did not get a code? <button type="button" className="link-btn" onClick={resend} disabled={resending}>{resending ? 'Sending…' : 'Send a new code'}</button></span>}
        </div>
      </form>

      <p className="caption muted center"><MailCheck size={14} style={{ verticalAlign: '-2px' }} /> Wrong email? <Link to="/register">Create the account again</Link></p>
    </div>
  );
}
