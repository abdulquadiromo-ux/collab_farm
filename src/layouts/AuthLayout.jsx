import { Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Logo } from '../components/common/Brand.jsx';
import { PhotoFill } from '../components/common/Photo.jsx';
import { PageSkeleton } from '../components/ui/Card.jsx';

// Split layout from the Figma authentication frames: rounded image panel on the left, form on the right.
export default function AuthLayout() {
  return (
    <div className="auth">
      <aside className="auth__panel" aria-label="CollabFarm">
        <PhotoFill name="hero-farm.jpg" theme="farmers" loading="eager" />
        <p style={{ fontSize: 18, lineHeight: 1.5, maxWidth: 700 }}>
          A transparent platform where investors, cooperatives and farmers work together. Every naira is approved, released in stages and traced from commitment to repayment.
        </p>
        <a
          className="auth__photo-credit"
          href="https://commons.wikimedia.org/wiki/File:Farmer_at_harvest.jpg"
          target="_blank"
          rel="noreferrer"
        >
          Photo: Photobyamin / Wikimedia Commons (CC BY-SA 4.0)
        </a>
        <div className="auth__logo-bar"><Logo to="/" /></div>
      </aside>
      <main className="auth__form" id="main">
        <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
        <p className="caption muted center"><Link to="/">Back to the public site</Link></p>
      </main>
    </div>
  );
}
