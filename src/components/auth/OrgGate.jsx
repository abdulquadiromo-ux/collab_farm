import { Link, Navigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { EmptyState, LinkButton } from '../ui/index.js';
import { ROLE_META } from '../../data/people.js';

// Friendly message shown when someone opens an onboarding page that is not meant for their account.
export default function OrgGate({ title, children, to, toLabel = 'Go to my dashboard', secondaryTo, secondaryLabel }) {
  return (
    <div className="card card--pad auth-gate">
      <EmptyState
        icon={<Building2 size={28} />}
        title={title}
        action={(
          <div className="row-wrap" style={{ justifyContent: 'center' }}>
            <LinkButton to={to}>{toLabel}</LinkButton>
            {secondaryTo && <LinkButton to={secondaryTo} variant="outline">{secondaryLabel}</LinkButton>}
          </div>
        )}
      >
        {children}
      </EmptyState>
      <p className="caption muted center">Need help? <Link to="/contact">Contact support</Link></p>
    </div>
  );
}

// Decides what an onboarding page should show when it cannot show the wizard or status for this visitor.
// Returns an element to render, or null when the visitor has an organisation of the right kind.
// `kind` is the organisation kind the page is for, or null when either kind is fine (the status page).
export function gateFor(ctx, kind, here) {
  if (ctx.state === 'signed-out') return <Navigate to="/login" replace state={{ from: here }} />;
  if (ctx.state === 'wrong-role') {
    const role = ctx.user.role;
    const base = ROLE_META[role].base;
    return role === 'farmer' ? (
      <OrgGate title="Farmer accounts do not need onboarding" to={base}>
        Your cooperative registers you and keeps your details up to date. You can see your allocation, activities and agreement from your own dashboard.
      </OrgGate>
    ) : (
      <OrgGate title="Administrators do not register an organisation" to={base}>
        This page is for cooperatives and investors who are setting up their account. Verification decisions are made from the administration pages.
      </OrgGate>
    );
  }
  if (ctx.state === 'no-org') {
    return (
      <OrgGate title="We could not find your organisation" to={ROLE_META[ctx.kind].base}>
        Your account is not linked to an organisation record yet. Go back to your dashboard, or contact support if you think this is a mistake.
      </OrgGate>
    );
  }
  if (kind && ctx.kind !== kind) {
    return (
      <OrgGate
        title={`This is the ${kind} onboarding`}
        to={`/onboarding/${ctx.kind}`}
        toLabel={`Open the ${ctx.kind} onboarding`}
        secondaryTo={ROLE_META[ctx.kind].base}
        secondaryLabel="Go to my dashboard"
      >
        Your account is registered as {ctx.kind === 'investor' ? 'an investor' : 'a cooperative'}, so the {kind} steps do not apply to you.
      </OrgGate>
    );
  }
  return null;
}
