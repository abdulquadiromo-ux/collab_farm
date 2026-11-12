import { Link } from 'react-router-dom';
import { Banner } from '../ui/index.js';
import { useCoop } from './helpers.js';

// Gating rule from the build brief: an unverified cooperative cannot request disbursements or submit records.
export function useVerified() {
  const { coop } = useCoop();
  return !!coop && coop.status === 'Verified';
}

export function VerifyGate({ what = 'request disbursements or submit records' }) {
  const { coop } = useCoop();
  if (!coop || coop.status === 'Verified') return null;
  return (
    <Banner tone="warn" title="Your cooperative is not verified yet">
      Until a CollabFarm reviewer verifies your cooperative, you cannot {what}.{' '}
      <Link to="/onboarding/cooperative">Review your cooperative profile</Link>.
    </Banner>
  );
}
