import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BadgeCheck, MailQuestion, XCircle, PauseCircle, PlayCircle, Play, Landmark, MapPin, Users } from 'lucide-react';
import { useApp, useSimulatedLoad, simulate, newId } from '../../context/AppContext.jsx';
import { Card, CardHeader, PageHeader, PageSkeleton, Breadcrumb, Banner, Button, ConfirmDialog, InfoList, StatusPill, Timeline } from '../../components/ui/index.js';
import { formatDate, formatDateTime } from '../../utils/format.js';
import { coopReadiness, adminFunctionOf, todayIso, nowIso } from '../../components/adma/helpers.js';
import { MissingRecord, NotesThread, DocStatusPill, ReadyList, Stat } from '../../components/adma/Parts.jsx';
import { ReasonDialog } from '../../components/adma/Dialogs.jsx';
import DocumentsTable from '../../components/adma/DocumentsTable.jsx';
import '../../styles/pages/adma.css';

const OUTCOME = {
  start: { status: 'Under Review', action: 'Cooperative review started', kind: 'decision' },
  approve: { status: 'Verified', action: 'Cooperative verified', kind: 'decision' },
  request: { status: 'Additional Information Required', action: 'More information requested from cooperative', kind: 'request' },
  reject: { status: 'Rejected', action: 'Cooperative verification rejected', kind: 'decision' },
  suspend: { status: 'Suspended', action: 'Cooperative suspended', kind: 'decision' },
  reactivate: { status: 'Verified', action: 'Cooperative reactivated', kind: 'decision' },
};

export default function CooperativeVerificationDetail() {
  const { id } = useParams();
  const { data, user, update, notify, toast } = useApp();
  const loading = useSimulatedLoad(350);
  const [dialog, setDialog] = useState(null);
  const [askText, setAskText] = useState('');
  const [busy, setBusy] = useState(false);
  const coop = useMemo(() => data.cooperatives.find((c) => c.id === id) || null, [data.cooperatives, id]);

  if (loading) return <PageSkeleton />;
  if (!coop) return <MissingRecord to="/admin/verification/cooperatives" backLabel="Back to cooperatives" title="Cooperative not found" />;

  const fn = adminFunctionOf(user);
  const status = coop.status;
  const r = coopReadiness(coop);
  const farmers = data.farmers.filter((f) => f.coopId === coop.id && f.status !== 'Removed');
  const farms = data.farms.filter((f) => f.coopId === coop.id);
  const reviewable = ['Submitted', 'Under Review', 'Additional Information Required'].includes(status);
  const docsActionable = ['Submitted', 'Under Review', 'Additional Information Required', 'Verified', 'Suspended'].includes(status);
  const notes = coop.reviewNotes || [];

  const history = data.audit.filter((a) => a.entityId === coop.id).slice(0, 8)
    .map((a) => ({ title: a.action, meta: `${a.actor} · ${formatDateTime(a.at)}`, body: a.summary, state: 'done' }));
  if (coop.verifiedAt && !history.some((h) => /verified/i.test(h.title))) history.push({ title: 'Verified', meta: formatDate(coop.verifiedAt), state: 'done' });

  const mkNote = (kind, text) => ({ id: newId('nt'), at: nowIso(), by: user.name, fn, kind, text });

  const run = async (action, text) => {
    const o = OUTCOME[action];
    await simulate(500);
    const today = todayIso();
    const noteText = text || (action === 'approve' ? 'All required documents verified. Cooperative verified.' : action === 'start' ? 'Review started.' : '');
    const patch = { status: o.status, reviewer: user.name, reviewedAt: today, reviewNotes: noteText ? [...notes, mkNote(o.kind, noteText)] : notes };
    if (action === 'approve') patch.verifiedAt = today;
    if (action === 'suspend') { patch.statusBeforeSuspension = status; patch.suspendedReason = text; }
    update('cooperatives', coop.id, patch, {
      action: o.action, entityType: 'Cooperative', entityId: coop.id, summary: `${coop.name}: ${status} to ${o.status}`,
      reason: text || (action === 'approve' ? 'All required documents verified' : 'Reviewer action'),
    });
    // Sign-in accounts belonging to the cooperative follow its status
    data.users.filter((u) => u.role === 'cooperative' && u.orgId === coop.id).forEach((u) => {
      if (action === 'suspend') update('users', u.id, { status: 'Suspended', suspendedReason: text });
      if (action === 'reactivate' || action === 'approve') update('users', u.id, { status: 'Active' });
    });
    const msg = {
      start: `${coop.name}: a CollabFarm reviewer has started checking your registration documents.`,
      approve: `${coop.name} is now verified. You can create funding requests, add farmers and request disbursements once your agreements are signed.`,
      request: `${coop.name}: ${text}`,
      reject: `${coop.name}: your verification was not approved. Reason: ${text}`,
      suspend: `${coop.name}: your cooperative account is suspended. Reason: ${text}`,
      reactivate: `${coop.name}: your cooperative account is active again.`,
    }[action];
    const title = { start: 'Verification under review', approve: 'Cooperative verified', request: 'More information needed', reject: 'Verification not approved', suspend: 'Cooperative suspended', reactivate: 'Cooperative reactivated' }[action];
    notify('cooperative', title, msg, action === 'approve' || action === 'reactivate' ? '/coop' : '/coop/profile', 'verification');
    toast(action === 'start' ? 'Review started. You are now the assigned reviewer.' : `${o.action}. The cooperative has been notified.`);
    setDialog(null);
  };

  const docChange = (d, next, auditEntry, notice) => {
    update('cooperatives', coop.id, (c) => ({ documents: (c.documents || []).map((x) => (x.id === d.id ? { ...x, ...next } : x)) }), auditEntry);
    if (notice) notify('cooperative', notice.title, notice.message, '/coop/profile', 'verification');
  };
  const verifyDoc = async (d) => {
    await simulate(350);
    docChange(d, { status: 'Verified', reviewer: user.name, reviewedAt: todayIso(), flagReason: undefined },
      { action: 'Cooperative document verified', entityType: 'Cooperative', entityId: coop.id, summary: `${d.type} marked Verified`, reason: 'Checked by reviewer' },
      { title: 'Document verified', message: `${d.type} was marked Verified by a CollabFarm reviewer.` });
    toast(`${d.type} marked as verified.`);
  };
  const flagDoc = async (d, reason) => {
    await simulate(350);
    docChange(d, { status: 'Rejected', reviewer: user.name, reviewedAt: todayIso(), flagReason: reason },
      { action: 'Cooperative document flagged', entityType: 'Cooperative', entityId: coop.id, summary: `${d.type} flagged`, reason },
      { title: 'Document needs attention', message: `${d.type} was flagged: ${reason}. Please upload a new copy.` });
    toast(`${d.type} flagged and the cooperative notified.`, 'info');
  };
  const addNote = async (text) => {
    await simulate(250);
    update('cooperatives', coop.id, { reviewNotes: [...notes, mkNote('note', text)] }, { action: 'Reviewer note added', entityType: 'Cooperative', entityId: coop.id, summary: `Note added on ${coop.name}`, reason: 'Internal note' });
    toast('Note added.');
  };
  const askFor = (d) => { setAskText(`Please upload: ${d.type}.`); setDialog('request'); };

  const readyItems = [
    ...r.rows.filter((x) => x.mandatory).map((x) => ({ label: x.type, ok: x.status === 'Verified', hint: x.missing ? 'Not uploaded' : x.status === 'Verified' ? undefined : x.status === 'Rejected' ? 'Flagged, needs a new upload' : 'Uploaded, not yet verified' })),
    { label: 'Payout account name matches the registered name', ok: r.payout.nameOk },
  ];

  const requestInitial = askText || (r.problems.length ? `Please sort out the following: ${r.problems.map((p) => p.replace(/:.*/, '')).slice(0, 4).join('; ')}.` : '');

  return (
    <div className="page adma-page">
      <Breadcrumb items={[{ label: 'Cooperative verification', to: '/admin/verification/cooperatives' }, { label: coop.name }]} />
      <PageHeader title={coop.name} subtitle={`${coop.regNumber} · ${coop.state}`} actions={<StatusPill>{status}</StatusPill>} />

      {status === 'Verified' && r.problems.length > 0 && (coop.documents || []).length > 0 && (
        <Banner tone="warn" title="Verified, but the document record is incomplete">
          {r.problems.join('. ')}. Verify the remaining documents below to complete the record.
        </Banner>
      )}
      {status === 'Verified' && (coop.documents || []).length === 0 && (
        <Banner tone="info" title="No document records in the demo data">
          This cooperative was verified earlier. Its document files are not held in this demo, so the required documents below show as not uploaded.
        </Banner>
      )}

      <div className="grid-main">
        <div className="stack">
          <Card>
            <CardHeader title="Organisation" />
            <InfoList compact items={[
              ['Cooperative name', coop.name],
              ['Registration number', coop.regNumber],
              ['Year established', coop.yearEstablished],
              ['Official email', coop.email],
              ['Phone', coop.phone],
              ['Address', coop.address],
              ['State and LGA', `${coop.state}, ${coop.lga}`],
              ['Verified on', coop.verifiedAt ? formatDate(coop.verifiedAt) : 'Not verified yet'],
              ['Assigned reviewer', coop.reviewer || 'Not assigned yet'],
            ]} />
          </Card>

          <Card>
            <CardHeader title="Authorised representatives" subtitle="People allowed to sign and act for the cooperative." />
            <ul className="adma-people">
              {(coop.representatives || []).map((p) => (
                <li key={p.name}><span className="strong">{p.name}</span><span className="muted small">{p.role}</span></li>
              ))}
              {!(coop.representatives || []).length && <li className="muted small">No representatives listed.</li>}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Documents" subtitle="Mark each document Verified once checked, or flag it if something is wrong. Your name and the date are recorded." />
            <DocumentsTable docs={r.rows} canAct={docsActionable} onVerify={verifyDoc} onFlag={flagDoc} onAsk={reviewable ? askFor : undefined} />
          </Card>

          <Card>
            <CardHeader title="Evidence and account checks" />
            <div className="adma-checkgrid">
              <div className="adma-checkbox">
                <div className="row" style={{ gap: 8 }}><MapPin size={18} /><strong>Land-access evidence</strong></div>
                <DocStatusPill status={r.land.state} />
                <p className="small muted">Proof that the cooperative has the right to farm the land, such as a lease, title or community consent letter. {farms.length} farm{farms.length === 1 ? '' : 's'} on record: {farms.filter((f) => f.landAccess === 'Verified').length} with land access verified.</p>
              </div>
              <div className="adma-checkbox">
                <div className="row" style={{ gap: 8 }}><Landmark size={18} /><strong>Payout account</strong></div>
                <DocStatusPill status={r.payout.state} />
                <p className="small muted">
                  {coop.bank ? <>Account ending <strong>{coop.bank.last4}</strong> at {coop.bank.name}. Account name {r.payout.nameOk ? 'matches' : 'does not match'} the registered name.</> : 'No payout account on record.'} Only the last 4 digits are shown.
                </p>
              </div>
              <div className="adma-checkbox">
                <div className="row" style={{ gap: 8 }}><Users size={18} /><strong>Farmers and farms</strong></div>
                <div className="adma-statrow">
                  <Stat label="Farmers" value={farmers.length} sub={`${farmers.filter((f) => f.status === 'Verified').length} verified`} />
                  <Stat label="Farms" value={farms.length} sub={`${farms.filter((f) => f.status === 'Active').length} active`} />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Reviewer notes" subtitle="A running thread for reviewers. Messages sent to the cooperative are marked." />
            <NotesThread notes={notes} onAdd={addNote} />
          </Card>
        </div>

        <div className="stack">
          <Card className="adma-decision">
            <CardHeader title="Decision" subtitle="Every decision is confirmed, recorded in the audit log and sent to the cooperative." />
            <div className="row-wrap" style={{ gap: 8 }}><span className="small muted">Current status</span><StatusPill>{status}</StatusPill></div>

            {status === 'Draft' && <Banner tone="info">The cooperative has not submitted its registration yet. There is nothing to review.</Banner>}

            {reviewable && (
              <>
                <h3 className="adma-minor">Required before verification</h3>
                <ReadyList items={readyItems} />
                {!r.ready && (
                  <Banner tone="warn" title="Cannot verify yet">
                    {r.problems.length} thing{r.problems.length === 1 ? ' is' : 's are'} missing: {r.problems.join('; ')}.
                  </Banner>
                )}
                <div className="stack-sm">
                  {status === 'Submitted' && <Button block variant="outline-green" onClick={() => run('start')}><Play size={16} />Start review</Button>}
                  <Button block disabled={!r.ready} onClick={() => setDialog('approve')}><BadgeCheck size={16} />Verify cooperative</Button>
                  <Button block variant="outline" onClick={() => { setAskText(''); setDialog('request'); }}><MailQuestion size={16} />Request more information</Button>
                  <Button block variant="danger-outline" onClick={() => setDialog('reject')}><XCircle size={16} />Reject</Button>
                </div>
              </>
            )}

            {status === 'Verified' && (
              <>
                <Banner tone="green">Verified cooperatives can submit funding requests. Suspending blocks new funding requests, farmer additions and disbursement requests. It is not a finding of wrongdoing.</Banner>
                <Button block variant="danger-outline" onClick={() => setDialog('suspend')}><PauseCircle size={16} />Suspend cooperative</Button>
              </>
            )}
            {status === 'Suspended' && (
              <>
                <Banner tone="warn">This cooperative is suspended{coop.suspendedReason ? `: ${coop.suspendedReason}` : '.'}</Banner>
                <Button block onClick={() => setDialog('reactivate')}><PlayCircle size={16} />Reactivate cooperative</Button>
              </>
            )}
            {status === 'Rejected' && <Banner tone="danger">This verification was rejected. The cooperative can correct its details and submit again.</Banner>}
            {coop.reviewer && <p className="caption muted">Last action by {coop.reviewer}{coop.reviewedAt ? ` on ${formatDate(coop.reviewedAt)}` : ''}. You are signed in as {user.name} ({fn.toLowerCase()}).</p>}
          </Card>

          <Card>
            <CardHeader title="History" />
            <Timeline items={history.length ? history : [{ title: 'No activity recorded yet' }]} />
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={dialog === 'approve'}
        onClose={() => setDialog(null)}
        onConfirm={async () => { setBusy(true); try { await run('approve'); } finally { setBusy(false); } }}
        loading={busy}
        tone="green"
        title={`Verify ${coop.name}?`}
        message="Verification confirms the organisation and its documents. It is not a guarantee that any project will succeed."
        summary={[['Cooperative', coop.name], ['Registration number', coop.regNumber], ['Required documents', `${r.verifiedCount} of ${r.mandatoryCount} verified`], ['Payout account', coop.bank ? `Ending ${coop.bank.last4}` : '-'], ['Result', 'Can submit funding requests and request disbursements']]}
        confirmLabel="Verify cooperative"
      />
      <ReasonDialog
        open={dialog === 'request'}
        onClose={() => setDialog(null)}
        onConfirm={(t) => run('request', t)}
        tone="amber"
        title="Request more information"
        message={`${coop.name} will receive this message and be asked to update its registration.`}
        label="Message to the cooperative"
        placeholder="Say exactly which document or detail is needed and how to send it."
        initialText={requestInitial}
        confirmLabel="Send request"
      />
      <ReasonDialog
        open={dialog === 'reject'}
        onClose={() => setDialog(null)}
        onConfirm={(t) => run('reject', t)}
        title={`Reject ${coop.name}?`}
        message="The cooperative is told the reason and can correct its details and submit again."
        label="Reason for rejection"
        placeholder="Explain in plain words why the registration cannot be verified."
        confirmLabel="Reject verification"
      />
      <ReasonDialog
        open={dialog === 'suspend'}
        onClose={() => setDialog(null)}
        onConfirm={(t) => run('suspend', t)}
        title={`Suspend ${coop.name}?`}
        message="New funding requests, farmer additions and disbursement requests are blocked. Existing agreements stay in force."
        warning="Suspension is a control, not a finding of wrongdoing. Record the facts that led to it."
        label="Reason for suspension"
        placeholder="For example: payout account letter found to be out of date."
        confirmLabel="Suspend cooperative"
      />
      <ReasonDialog
        open={dialog === 'reactivate'}
        onClose={() => setDialog(null)}
        onConfirm={(t) => run('reactivate', t)}
        tone="green"
        title={`Reactivate ${coop.name}?`}
        message="The cooperative becomes Verified again and is notified."
        label="Reason for reactivation"
        placeholder="For example: corrected payout letter received and verified."
        confirmLabel="Reactivate"
      />
    </div>
  );
}
