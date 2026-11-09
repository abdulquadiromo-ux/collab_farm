import { Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Logo } from '../components/common/Brand.jsx';
import { PageSkeleton } from '../components/ui/Card.jsx';

// Simple centred layout for multi step registration and verification wizards.
export default function OnboardingLayout() {
  return (
    <div className="onboarding">
      <header className="onboarding__bar">
        <Logo to="/" />
        <span className="small muted"><span className="help-prefix">Need help? </span><Link to="/contact">Contact support</Link></span>
      </header>
      <main className="onboarding__body" id="main">
        <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
      </main>
    </div>
  );
}
