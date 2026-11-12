import { useEffect, useState } from 'react';
import { UserRound, ShieldCheck } from 'lucide-react';
import { Avatar, Banner, Button, Card, EmptyState, InfoList, PageHeader, PageSkeleton, StatusPill } from '../../components/ui/index.js';
import { useApp } from '../../context/AppContext.jsx';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';
import '../../styles/pages/coopa.css';

export default function Profile() {
  const { accessToken } = useApp();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError('');
      if (!accessToken) { setError('Your session has expired. Sign in again to view your profile.'); setLoading(false); return; }
      try {
        const response = await fetch(`${API_BASE_URL}/onboard/profile/me`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not load your profile (${response.status}).`));
        setProfile(payload || null);
      } catch (cause) {
        if (cause.name !== 'AbortError') setError(cause.message || 'Could not load your profile.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [accessToken, reloadKey]);

  if (loading) return <PageSkeleton />;
  if (error) return <div className="page"><EmptyState title="Profile unavailable" action={<Button onClick={() => setReloadKey((key) => key + 1)}>Try again</Button>}>{error}</EmptyState></div>;
  if (!profile) return <div className="page"><EmptyState title="Profile not found">The profile endpoint returned no account information.</EmptyState></div>;

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || 'Account profile';
  const verification = String(profile.verification_status || 'not_submitted').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const identity = profile.profile || {};
  const idFile = identity.id_file ? String(identity.id_file) : '';

  return (
    <div className="page coopa">
      <PageHeader title="Profile" subtitle="Your account details and verification information." />
      <Card className="coopa-profile-head">
        <Avatar name={fullName} size="lg" />
        <div className="grow">
          <h2 className="coopa-head__name">{fullName}</h2>
          <div className="small muted">{profile.email || 'Email not provided'}</div>
        </div>
        <div className="coopa-profile-head__status">
          <StatusPill tone={verification.toLowerCase() === 'approved' ? 'green' : 'amber'}>{verification}</StatusPill>
          <span className="caption muted">{profile.role || 'Account'}</span>
        </div>
      </Card>

      {profile.verification_note && <Banner tone="info" title="Verification note">{profile.verification_note}</Banner>}

      <Card>
        <div className="row" style={{ gap: 10, marginBottom: 14 }}><UserRound size={19} /><h2 className="card__title strong">Account details</h2></div>
        <InfoList items={[
          ['First name', profile.first_name || 'Not provided'],
          ['Last name', profile.last_name || 'Not provided'],
          ['Email address', profile.email || 'Not provided'],
          ['Phone number', profile.phone_number || 'Not provided'],
          ['Role', profile.role || 'Not provided'],
          ['Investor type', profile.investor_type || 'Not applicable'],
        ]} />
      </Card>

      <Card>
        <div className="row" style={{ gap: 10, marginBottom: 14 }}><ShieldCheck size={19} /><h2 className="card__title strong">Identity and address</h2></div>
        <InfoList items={[
          ['ID number', identity.id_number || 'Not provided'],
          ['Nationality', identity.nationality || 'Not provided'],
          ['Address', identity.address || 'Not provided'],
          ['ID document', idFile || 'Not uploaded'],
        ]} />
      </Card>
    </div>
  );
}
