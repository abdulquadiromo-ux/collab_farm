import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BadgeCheck, MailQuestion, XCircle, PauseCircle, PlayCircle, Play, ShieldCheck, CircleDot, CheckCircle2, Landmark } from 'lucide-react';
import { useApp, useSimulatedLoad, simulate, newId } from '../../context/AppContext.jsx';
import { Card, CardHeader, PageHeader, PageSkeleton, Breadcrumb, Banner, Button, ConfirmDialog, InfoList, StatusPill, Timeline } from '../../components/ui/index.js';
import { formatDate, formatDateTime } from '../../utils/format.js';
import {
  findVerificationSubject, verificationChecks, verificationReadiness, verificationDocs, adminFunctionOf, maskNin, todayIso, nowIso,
  PARTY_ROLE, ROLE_HOME, ROLE_LABEL,
} from '../../components/adma/helpers.js';
import { MissingRecord, NotesThread, ReadyList } from '../../components/adma/Parts.jsx';
import { ReasonDialog } from '../../components/adma/Dialogs.jsx';
import DocumentsTable from '../../components/adma/DocumentsTable.jsx';
import '../../styles/pages/adma.css';

const OUTCOME = {
  start: { status: 'Under Review', action: 'Verification review started', kind: 'decision' },
  approve: { status: 'Verified', action: 'Verification approved', kind: 'decision' },
  request: { status: 'Additional Information Required', action: 'More information requested', kind: 'request' },
  reject: { status: 'Rejected', action: 'Verification rejected', kind: 'decision' },
  suspend: { status: 'Suspended', action: 'Account suspended', kind: 'decision' },
  reactivate: { status: 'Verified', action: 'Account reactivated', kind: 'decision' },
};

export default function UserVerificationDetail() {
  const { id } = useParams();
  const { data, user, update, add, notify, toast } = useApp();
  const loading = useSimulatedLoad(350);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const subject = useMemo(() => findVerificationSubject(data, id), [data, id]);

  if (loading) return <PageSkeleton />;
  if (!subject) return <MissingRecord to="/admin/verification/users" backLabel="Back to user verification" title="Registration not found" />;

  const { rec, entity: ent, linkedUser, persisted, role, name, status } = subject;
  const entity = ent?.record || null;
  const kind = ent?.kind || null;
  const fn = adminFunctionOf(user);
  const docs = verificationDocs(subject);
  const checks = verificationChecks(subject);
  const readiness = verificationReadiness(subject);
  const editable = ['Submitted', 'Under Review', 'Additional Information Required'].includes(status);
  const coop = kind === 'farmer' ? data.cooperatives.find((c) => c.id === entity.coopId) : null;
  const duplicateWarning = kind === 'farmer' && entity.duplicateFlag && !entity.duplicateResolved;

  const history = data.audit
    .filter((a) => a.entityId === rec.id || (entity && a.entityId === entity.id))
    .slice(0, 8)
    .map((a) => ({ title: a.action, meta: `${a.actor} · ${formatDateTime(a.at)}`, body: a.summary, state: 'done' }));
  if (rec.submittedAt) history.push({ title: 'Registration submitted', meta: formatDate(rec.submittedAt), state: 'done' });

  // Saves the verification record. A person who registered without a record gets one on the first action.
  const saveRec = (patch, auditEntry) => {
    if (persisted) update('userVerification', rec.id, patch, auditEntry);
    else add('userVerification', { ...rec, ...patch, entityId: entity?.id || rec.entityId || null }, auditEntry);
  };
  const mkNote = (kindOfNote, text) => ({ id: newId('nt'), at: nowIso(), by: user.name, fn, kind: kindOfNote, text });

  const run = async (action, text) => {
    const o = OUTCOME[action];
    await simulate(500);
    const today = todayIso();
    const noteText = text || (action === 'approve' ? 'Approved. All required checks are complete.' : action === 'start' ? 'Review started.' : '');
    const notes = noteText ? [...(rec.notes || []), mkNote(o.kind, noteText)] : (rec.notes || []);
    const patch = { status: o.status, reviewer: user.name, reviewedAt: today, notes };
    if (action === 'approve') patch.checks = { ...(rec.checks || {}), identity: 'Verified' };
    if (action === 'suspend') patch.suspendedReason = text;
    saveRec(patch, {
      action: o.action, entityType: 'User verification', entityId: rec.id,
      summary: `${name} (${ROLE_LABEL[role] || role}): ${status} to ${o.status}`, reason: text || (action === 'approve' ? 'All required checks complete' : 'Reviewer action'),
    });

    // Keep the related record in step
    if (kind === 'investor') {
      const ip = { status: o.status };
      if (action === 'approve') { ip.verifiedAt = today; ip.eligibility = 'Eligible'; }
      if (action === 'suspend') ip.statusBeforeSuspension = status;
      update('investors', entity.id, ip);
    } else if (kind === 'farmer') {
      const fp = {};
      if (action === 'approve') { fp.status = 'Verified'; fp.identityStatus = 'Verified'; }
      if (action === 'reactivate') fp.status = 'Verified';
      if (action === 'suspend') fp.status = 'Suspended';
      if (action === 'reject') fp.identityStatus = 'Rejected';
      if (Object.keys(fp).length) update('farmers', entity.id, fp);
    }
    if (linkedUser) {
      if (action === 'approve' || action === 'reactivate') update('users', linkedUser.id, { status: 'Active' });
      if (action === 'suspend') update('users', linkedUser.id, { status: 'Suspended', suspendedReason: text });
    }

    const msg = {
      start: `Verification update for ${name}: a reviewer has started checking your details.`,
      approve: `Verification result for ${name}: approved. ${role === 'investor' ? 'You can now review packages. To commit funds you must also sign the funding agreement.' : role === 'farmer' ? 'Your cooperative can now include you in projects.' : 'Your account is verified.'}`,
      request: `Verification update for ${name}: ${text}`,
      reject: `Verification result for ${name}: not approved. Reason: ${text}`,
      suspend: `Account update for ${name}: your account is suspended. Reason: ${text}`,
      reactivate: `Account update for ${name}: your account is active again.`,
    }[action];
    const title = { start: 'Verification under review', approve: 'Verification approved', request: 'More information needed', reject: 'Verification not approved', suspend: 'Account suspended', reactivate: 'Account reactivated' }[action];
    notify(PARTY_ROLE[role] || 'investor', title, msg, action === 'approve' || action === 'reactivate' ? (ROLE_HOME[role] || '/') : '/onboarding/status', 'verification');
    toast(action === 'start' ? 'Review started. You are now the assigned reviewer.' : `${o.action}. ${name} has been notified.`);
    setDialog(null);
  };

  const confirmEligibility = () => {
    const checksNext = { ...(rec.checks || {}), eligibility: 'Eligible' };
    saveRec({ checks: checksNext, notes: [...(rec.notes || []), mkNote('note', 'Eligibility confirmed against the rule in System settings.')] }, {
      action: 'Eligibility confirmed', entityType: 'User verification', entityId: rec.id, summary: `${name}: eligibility Pending to Eligible`, reason: 'Meets the configured eligibility rule',
    });
    if (kind === 'investor') update('investors', entity.id, { eligibility: 'Eligible' });
    toast('Eligibility confirmed.');
  };

  const writeDocs = (nextDocs, extra, auditEntry) => {
    const idDocs = nextDocs.filter((d) => d.isIdentity);
    const identity = idDocs.length && idDocs.every((d) => d.status === 'Verified') ? 'Verified' : 'Uploaded';
    saveRec({ documents: nextDocs, checks: { ...(rec.checks || {}), identity }, ...extra }, auditEntry);
  };
  const verifyDoc = async (d) => {
    await simulate(350);
    writeDocs(docs.map((x) => (x.id === d.id ? { ...x, status: 'Verified', reviewer: user.name, reviewedAt: todayIso(), flagReason: undefined } : x)), {}, {
      action: 'Document verified', entityType: 'User verification', entityId: rec.id, summary: `${d.type} marked Verified for ${name}`, reason: 'Checked by reviewer',
    });
    toast(`${d.type} marked as verified.`);
  };
  const flagDoc = async (d, reason) => {
    await simulate(350);
    writeDocs(docs.map((x) => (x.id === d.id ? { ...x, status: 'Rejected', reviewer: user.name, reviewedAt: todayIso(), flagReason: reason } : x)), {
      notes: [...(rec.notes || []), mkNote('note', `Flagged ${d.type}: ${reason}`)],
    }, { action: 'Document flagged', entityType: 'User verification', entityId: rec.id, summary: `${d.type} flagged for ${name}`, reason });
    toast(`${d.type} flagged. Use Request more information to tell ${name}.`, 'info');
  };
  const addNote = async (text) => {
    await simulate(250);
    saveRec({ notes: [...(rec.notes || []), mkNote('note', text)] }, { action: 'Reviewer note added', entityType: 'User verification', entityId: rec.id, summary: `Note added on ${name}`, reason: 'Internal note' });
    toast('Note added.');
  };

  // Suggested message for "Request more information"
  const suggestions = [];
  docs.filter((d) => d.status === 'Rejected').forEach((d) => suggestions.push(`Please upload a new copy of: ${d.type}${d.flagReason ? ` (${d.flagReason})` : ''}.`));
  if (!rec.checks?.emailVerified) suggestions.push('Please confirm your email address using the one-time code we sent.');
  if (role === 'investor' && rec.checks?.riskAck !== 'Done') suggestions.push('Please read and tick the risk acknowledgement.');

  const approveSummary = [
    ['Person', name], ['Role', ROLE_LABEL[role] || role], ['Checks', 'Identity, contact and documents verified'],
    ['Result', role === 'investor' ? 'Account becomes Verified. The investor can browse packages and commit once Agreement A is signed.' : 'Account becomes Verified.'],
  ];

  return (
    <div className="page adma-page">
      <Breadcrumb items={[{ label: 'User verification', to: '/admin/verification/users' }, { label: name }]} />
      <PageHeader
        title={name}
        subtitle={`${ROLE_LABEL[role] || role} registration${rec.submittedAt ? `, submitted ${formatDate(rec.submittedAt)}` : ''}`}
        actions={<StatusPill>{status}</StatusPill>}
      />

      <div className="grid-main">
        <div className="stack">
          <Card>
            <CardHeader title="Person details" subtitle="Only what a reviewer needs. National ID numbers are shown with the last 3 digits only." />
            <InfoList compact items={[
              ['Name', name],
              ['Role', ROLE_LABEL[role] || role],
              ['Email', subject.email],
              ['Phone', entity?.phone || '-'],
              ...(kind === 'investor' ? [['Organisation', entity.org], ['Investor type', entity.type], ['Location', entity.location], ['Registered address', entity.address]] : []),
              ...(kind === 'farmer' ? [['Cooperative', coop?.name || entity.coopId], ['National ID number', maskNin(entity.nin)], ['Main crop', entity.cropType], ['Farm size', `${entity.farmSize} ${entity.farmSizeUnit}`]] : []),
              ['Assigned reviewer', rec.reviewer || 'Not assigned yet'],
              ['Linked record', entity ? `${entity.id}${linkedUser ? ` · sign-in account ${linkedUser.id}` : ''}` : 'None yet'],
            ]} />
          </Card>

          <Card>
            <CardHeader title="Checks" subtitle="Each check must pass before a person is approved." />
            <ul className="adma-checklist">
              {checks.map((c) => (
                <li key={c.key} className={c.applies ? '' : 'adma-checklist--na'}>
                  <span className="adma-checklist__icon" aria-hidden="true">
                    {c.partner ? <Landmark size={18} /> : c.passed ? <CheckCircle2 size={18} /> : <CircleDot size={18} />}
                  </span>
                  <div className="grow">
                    <div className="row-wrap" style={{ gap: 8 }}>
                      <span className="strong">{c.label}</span>
                      <StatusPill tone={c.partner ? 'blue' : !c.applies ? 'gray' : c.passed ? 'green' : 'amber'}>{c.partner ? 'Done by financial partner' : c.state}</StatusPill>
                    </div>
                    <p className="small muted">{c.detail}</p>
                  </div>
                  {c.key === 'eligibility' && c.applies && !c.passed && editable && (
                    <Button size="sm" variant="outline-green" onClick={confirmEligibility}><ShieldCheck size={14} />Confirm eligibility</Button>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Documents" subtitle="Uploaded means received but not checked. Verified means a reviewer has checked it." />
            <DocumentsTable
              docs={docs}
              canAct={editable}
              onVerify={verifyDoc}
              onFlag={flagDoc}
            />
          </Card>

          <Card>
            <CardHeader title="Reviewer notes" subtitle="A running thread for reviewers. Messages sent to the person are marked." />
            <NotesThread notes={rec.notes || []} onAdd={addNote} />
          </Card>
        </div>

        <div className="stack">
          <Card className="adma-decision">
            <CardHeader title="Decision" subtitle="Every decision is confirmed, recorded in the audit log and sent to the person." />
            <div className="row-wrap" style={{ gap: 8 }}>
              <span className="small muted">Current status</span><StatusPill>{status}</StatusPill>
            </div>

            {editable && (
              <>
                <ReadyList items={readiness.items} />
                {!readiness.ready && (
                  <Banner tone="warn" title="Cannot approve yet">
                    Still needed: {readiness.missing.join(', ').toLowerCase()}. You can request more information instead.
                  </Banner>
                )}
                <div className="stack-sm">
                  {status === 'Submitted' && <Button block variant="outline-green" onClick={() => run('start')}><Play size={16} />Start review</Button>}
                  <Button block disabled={!readiness.ready} onClick={() => setDialog('approve')}><BadgeCheck size={16} />Approve</Button>
                  <Button block variant="outline" onClick={() => setDialog('request')}><MailQuestion size={16} />Request more information</Button>
                  <Button block variant="danger-outline" onClick={() => setDialog('reject')}><XCircle size={16} />Reject</Button>
                </div>
              </>
            )}
            {status === 'Verified' && (
              <>
                <Banner tone="green">This person is verified. Suspending blocks sign in and new activity until a reviewer reactivates the account.</Banner>
                <Button block variant="danger-outline" onClick={() => setDialog('suspend')}><PauseCircle size={16} />Suspend account</Button>
              </>
            )}
            {status === 'Suspended' && (
              <>
                <Banner tone="warn">This account is suspended{rec.suspendedReason ? `: ${rec.suspendedReason}` : '.'}</Banner>
                <Button block onClick={() => setDialog('reactivate')}><PlayCircle size={16} />Reactivate account</Button>
              </>
            )}
            {status === 'Rejected' && <Banner tone="danger">This registration was rejected. The person can register again with corrected details. No further decision is possible here.</Banner>}
            {rec.reviewer && <p className="caption muted">Last action by {rec.reviewer}{rec.reviewedAt ? ` on ${formatDate(rec.reviewedAt)}` : ''}. You are signed in as {user.name} ({fn.toLowerCase()}).</p>}
          </Card>

          <Card>
            <CardHeader title="History" />
            <Timeline items={history.length ? history : [{ title: 'No activity recorded yet', state: undefined }]} />
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={dialog === 'approve'}
        onClose={() => setDialog(null)}
        onConfirm={async () => { setBusy(true); try { await run('approve'); } finally { setBusy(false); } }}
        loading={busy}
        tone="green"
        title={`Approve ${name}?`}
        message="Approval confirms identity and contact details. It is not a guarantee about any investment or project."
        summary={approveSummary}
        warning={duplicateWarning ? 'This farmer record has a possible duplicate flag. Compare both records in Farmers and farms before approving.' : null}
        confirmLabel="Approve"
      />
      <ReasonDialog
        open={dialog === 'request'}
        onClose={() => setDialog(null)}
        onConfirm={(t) => run('request', t)}
        tone="amber"
        title="Request more information"
        message={`${name} will receive this message and be asked to update their registration.`}
        label="Message to the person"
        placeholder="Say exactly what is missing and how to send it."
        initialText={suggestions.join(' ')}
        confirmLabel="Send request"
      />
      <ReasonDialog
        open={dialog === 'reject'}
        onClose={() => setDialog(null)}
        onConfirm={(t) => run('reject', t)}
        title={`Reject ${name}?`}
        message="The person is told the reason and can register again. Rejection is recorded in the audit log."
        label="Reason for rejection"
        placeholder="Explain in plain words why the registration cannot be approved."
        confirmLabel="Reject registration"
      />
      <ReasonDialog
        open={dialog === 'suspend'}
        onClose={() => setDialog(null)}
        onConfirm={(t) => run('suspend', t)}
        title={`Suspend ${name}?`}
        message="Suspension blocks sign in and new activity. It is not a finding of wrongdoing."
        label="Reason for suspension"
        placeholder="For example: identity document found to be invalid, awaiting a corrected copy."
        confirmLabel="Suspend account"
      />
      <ReasonDialog
        open={dialog === 'reactivate'}
        onClose={() => setDialog(null)}
        onConfirm={(t) => run('reactivate', t)}
        tone="green"
        title={`Reactivate ${name}?`}
        message="The account becomes Verified again and the person is notified."
        label="Reason for reactivation"
        placeholder="For example: corrected document received and verified."
        confirmLabel="Reactivate"
      />
    </div>
  );
}
