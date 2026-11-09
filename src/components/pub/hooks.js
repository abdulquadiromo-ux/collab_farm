import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';

// Sets the browser tab title for a public page and restores the previous one when the page closes.
export function useDocTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | CollabFarm Finance` : 'CollabFarm Finance';
    return () => { document.title = prev; };
  }, [title]);
}

// Where the main calls to action should go for a signed out visitor and for a signed in user.
export function useJoinLinks() {
  const { user, roleMeta } = useApp();
  const signedIn = !!user;
  const base = roleMeta?.base || '';
  // The farmer experience has its own "Report an issue" page instead of a generic complaint form.
  const complaintNew = !signedIn ? '/login' : user.role === 'farmer' ? `${base}/report-issue` : `${base}/complaints/new`;
  return {
    user,
    signedIn,
    dashboardTo: base || '/login',
    complaintNew,
    investorTo: signedIn ? base : '/register/investor',
    coopTo: signedIn ? base : '/register/cooperative',
  };
}

// Scrolls to the element named in the URL hash (for example /investor-information#risks) after the page has drawn.
export function useHashScroll() {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (!hash) return undefined;
    const id = decodeURIComponent(hash.slice(1));
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    return () => clearTimeout(t);
  }, [hash, pathname]);
}
