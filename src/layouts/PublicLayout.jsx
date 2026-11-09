import { Suspense, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '../components/common/Brand.jsx';
import { LinkButton } from '../components/ui/Button.jsx';
import { ChatWidget } from '../components/common/ChatWidget.jsx';
import { PageSkeleton } from '../components/ui/Card.jsx';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { ROLE_META } from '../data/people.js';
import { cx } from '../utils/format.js';

const LINKS = [
  { to: '/how-it-works', label: 'How it Works' },
  { to: '/cooperative-funding', label: 'Solutions' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
];

export default function PublicLayout() {
  const { pathname } = useLocation();
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); window.scrollTo?.(0, 0); }, [pathname]);
  return (
    <>
      <header className="public-nav">
        <div className="public-nav__inner">
          <Logo to="/" />
          <nav className="public-nav__links" aria-label="Primary">
            {LINKS.map((l) => <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>{l.label}</NavLink>)}
          </nav>
          <div className="row" style={{ marginLeft: 'auto' }}>
            {user ? (
              <LinkButton to={ROLE_META[user.role].base} variant="primary">Dashboard</LinkButton>
            ) : (
              <>
                <LinkButton to="/login" variant="outline" className="hide-sm">Login</LinkButton>
                <LinkButton to="/register" variant="primary">Get Started</LinkButton>
              </>
            )}
            <button className="icon-btn menu-toggle-public" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open} style={{ display: 'none' }}>{open ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {open && (
          <nav className="container stack-sm" style={{ paddingBottom: 16 }} aria-label="Mobile">
            {LINKS.map((l) => <Link key={l.to} to={l.to} className="nav-item">{l.label}</Link>)}
            <Link to="/login" className="nav-item">Login</Link>
          </nav>
        )}
      </header>
      <main id="main">
        <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
      </main>
      <footer className="public-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="stack-sm">
              <Logo to="/" />
              <p className="small muted" style={{ maxWidth: 320 }}>Connecting investors with verified cooperatives through transparent, traceable agricultural funding. CollabFarm does not guarantee returns. Funds move through a regulated financial partner.</p>
            </div>
            <div><h4>Platform</h4><Link to="/how-it-works">How it works</Link><Link to="/cooperative-funding">Cooperative funding</Link><Link to="/investor-information">Investor information</Link><Link to="/register/cooperative">Cooperative registration</Link><Link to="/register/investor">Investor registration</Link></div>
            <div><h4>Support</h4><Link to="/faq">FAQ</Link><Link to="/contact">Contact and support</Link><Link to="/complaints-information">Complaints and disputes</Link><Link to="/login">Login</Link></div>
            <div><h4>Legal</h4><Link to="/terms">Terms of service</Link><Link to="/privacy">Privacy policy</Link><Link to="/about">About CollabFarm</Link></div>
          </div>
          <p className="caption muted center" style={{ marginTop: 40 }}>Copyright 2026 CollabFarm Finance. All rights reserved. This site runs on sample data for demonstration.</p>
        </div>
      </footer>
      <ChatWidget />
      <style>{`@media (max-width:1024px){.menu-toggle-public{display:grid!important}} @media (max-width:560px){.hide-sm{display:none}}`}</style>
    </>
  );
}
