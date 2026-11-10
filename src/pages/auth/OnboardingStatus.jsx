import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { Banner, Button, Card, InfoList, LinkButton, StatusPill, Timeline } from '../../components/ui/index.js';
import { gateFor } from '../../components/auth/OrgGate.jsx';
import DecisionModal from '../../components/auth/DecisionModal.jsx';
import { useOrgContext, useOrgWorkflow } from '../../components/auth/useOrgWorkflow.js';
import { AIR, STATUS_HEADLINE, buildJourney, nextSteps } from '../../components/auth/StatusJourney.js';
import { INVESTOR_TYPES } from '../../components/auth/InvestorWizardSteps.jsx';
import { formatDateTime } from '../../utils/format.js';
import '../../styles/pages/auth.css';

export default function OnboardingStatus() {
  const ctx = useOrgContext();
  const gate = gateFor(ctx, null, '/onboarding/status');
  if (gate) return gate;
  return <StatusView kind={ctx.kind} org={ctx.org} />;
}

const DEMO_TOASTS = {
  review: 'Review started (simulated).',
  approve: 'Approved (simulated). The organisation is now Verified.',
  info: 'More information requested (simulated).',
  reject: 'Rejected (simulated).',
};

function StatusView({ kind, org }) {
  const { roleMeta, toast } = useApp();
  const { decide } = useOrgWorkflow();
  const demoId = useId();
  const [mode, setMode] = useState(null);
  const [busy, setBusy] = useState(false);

  const status = org.status;
  const history = org.statusHistory || [];
  const lastUpdate = history.length ? history[history.length - 1].at : null;
  const note = org.adminNote || org.reviewNote || null;
  const decidable = status === 'Submitted' || status === 'Under Review';
  const wizardPath = `/onboarding/${kind}`;
  const kindLabel = kind === 'cooperative' ? 'Cooperative' : 'Investor';

  const runDecision = async (text) => {
    setBusy(true);
    await simulate(700);
    decide({ kind, org, decision: mode, note: text });
    setBusy(false);
    toast(DEMO_TOASTS[mode], mode === 'reject' ? 'info' : 'success');
    setMode(null);
  };

  const demoNote = (() => {
    if (decidable) return null;
    if (status === 'Draft') return 'Nothing to decide yet. Submit the registration first.';
    if (status === AIR) return 'Waiting for the organisation to update its information and submit again.';
    return 'No decision is pending.';
  })();

  return (
    <div className="auth-status">
      <header className="auth-head">
        <h1 className="auth__title auth-wiz__title">Verification status</h1>
        <p className="auth-sub">{org.name}, {kindLabel.toLowerCase()} account</p>
      </header>

      <Card className="auth-status__now" aria-live="polite">
        <div className="row-wrap">
          <StatusPill>{status}</StatusPill>
          {lastUpdate && <span className="caption muted">Last update {formatDateTime(lastUpdate)}</span>}
        </div>
        <h2 className="auth-status__headline">{STATUS_HEADLINE[status] || status}</h2>

        {status === AIR && (
          <Banner tone="warn" title="Message from the CollabFarm reviewer">
            {note || 'A reviewer asked for more information. Please check your details and documents, then submit again.'}
          </Banner>
        )}
        {(status === 'Rejected' || status === 'Suspended') && note && (
          <Banner tone="danger" title={status === 'Rejected' ? 'Reason given' : 'Note from the reviewer'}>{note}</Banner>
        )}
        {status === 'Verified' && (
          <Banner tone="success">
            {kind === 'cooperative'
              ? 'Verified means your organisation and documents were checked. It is not a guarantee of funding, and each funding request is reviewed on its own.'
              : 'Verified means your identity and eligibility were checked. It is not a promise of any return, and you still sign an agreement before each commitment.'}
          </Banner>
        )}

        <div className="row-wrap">
          {status === 'Verified' && <LinkButton to={roleMeta.base} size="lg">Go to my dashboard<ArrowRight size={16} /></LinkButton>}
          {status === 'Draft' && <LinkButton to={wizardPath} size="lg">Continue onboarding<ArrowRight size={16} /></LinkButton>}
          {status === AIR && <LinkButton to={wizardPath} size="lg">Update my information<ArrowRight size={16} /></LinkButton>}
          {status !== 'Verified' && <LinkButton to={roleMeta.base} variant="outline" size="lg">View my dashboard for now</LinkButton>}
        </div>
        {status !== 'Verified' && <p className="caption muted">Until you are Verified, some actions on your dashboard are switched off and the page tells you why.</p>}
      </Card>

      <div className="auth-status__grid">
        <Card>
          <h2 className="card__title">Your verification journey</h2>
          <Timeline items={buildJourney(org)} />
        </Card>
        <Card>
          <h2 className="card__title">What happens next</h2>
          <ol className="auth-next">
            {nextSteps(status, kind).map((t) => <li key={t}>{t}</li>)}
          </ol>
        </Card>
      </div>

      <Card>
        <h2 className="card__title">What you submitted</h2>
        {kind === 'cooperative' ? <CoopSummary org={org} /> : <InvestorSummary org={org} />}
      </Card>

      <section className="auth-demo auth-demo--admin" aria-labelledby={demoId}>
        <div className="auth-demo__head">
          <h2 className="auth-demo__title" id={demoId}>Demo only: simulate admin decision</h2>
          <span className="auth-tag">Demo only</span>
        </div>
        <p className="caption muted">
          Simulate admin approval (demo only). In the real portal a CollabFarm reviewer decides from the administration pages. Here you can play the reviewer to see each state. Nothing is sent to anyone.
        </p>
        {decidable ? (
          <div className="row-wrap">
            {status === 'Submitted' && <Button variant="soft" onClick={() => setMode('review')}>Start review</Button>}
            <Button onClick={() => setMode('approve')}><Check size={16} />Approve</Button>
            <Button variant="outline" onClick={() => setMode('info')}>Request more information</Button>
            <Button variant="danger-outline" onClick={() => setMode('reject')}><X size={16} />Reject</Button>
          </div>
        ) : (
          <p className="small strong">{demoNote}</p>
        )}
      </section>

      <p className="caption muted center">Questions about your verification? <Link to="/contact">Contact support</Link>. Read how complaints are handled in <Link to="/complaints-information">Complaints information</Link>.</p>

      <DecisionModal open={!!mode} mode={mode} orgName={org.name} loading={busy} onClose={() => !busy && setMode(null)} onConfirm={runDecision} />
    </div>
  );
}

function CoopSummary({ org }) {
  const docs = org.documents || [];
  return (
    <div className="stack">
      <InfoList compact items={[
        ['Registration number', org.regNumber || '-'],
        ['Year established', org.yearEstablished || '-'],
        ['Official email', org.email || '-'],
        ['Official phone', org.phone || '-'],
        ['Address', [org.address, org.lga, org.state].filter(Boolean).join(', ') || '-'],
        ['Representatives', (org.representatives || []).map((r) => `${r.name} (${r.role})`).join(', ') || '-'],
        ['Payout account', org.bank?.last4 ? `${org.bank.name || 'Bank'}, ending ${org.bank.last4}` : '-'],
      ]} />
      <div>
        <h3 className="auth-review__title">Documents</h3>
        <p className="caption muted">Uploaded means we have the file. Verified means a reviewer has checked it.</p>
        {docs.length === 0 ? <p className="small muted">No documents uploaded yet.</p> : (
          <ul className="auth-doclist">
            {docs.map((d) => (
              <li key={d.id || d.type}>
                <span><span className="strong small">{d.type}</span><span className="caption muted" style={{ display: 'block' }}>{d.file}</span></span>
                <StatusPill>{d.status === 'Pending' ? 'Uploaded' : d.status || 'Uploaded'}</StatusPill>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function InvestorSummary({ org }) {
  const typeLabel = INVESTOR_TYPES.find((t) => t.value === org.type)?.label || org.type || '-';
  return (
    <InfoList compact items={[
      ['Investor type', typeLabel],
      ['Organisation', org.org || '-'],
      ['Location', org.location || org.country || '-'],
      ['Identification', org.idDocument?.file ? `${org.idType || 'Document'}, ${org.idDocument.file}` : org.status === 'Verified' ? 'Checked by a reviewer' : '-'],
      ['Eligibility', org.eligibility || '-'],
      ['Risk acknowledgement', org.riskAcknowledged ? 'Acknowledged' : 'Not done yet'],
    ]} />
  );
}
