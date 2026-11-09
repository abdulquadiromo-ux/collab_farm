import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileText, Gavel, MessageCircle } from 'lucide-react';
import '../../styles/pages/shr.css';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { Banner, Breadcrumb, Button, Card, CardHeader, InfoList, PageHeader, StatusPill } from '../../components/ui/index.js';
import { NoAccess, NotFoundRecord, RolePill } from '../../components/shr/ShrBits.jsx';
import { ActionsThread, AdminControls, CommentBox, ReasonModal, STATUS_HELP, StatusTrack } from '../../components/shr/ComplaintPanels.jsx';
import { baseFor, byId, canSeeComplaint, complaintParties, isSubmitter, isoNow, whenLabel } from '../../components/shr/shrUtils.js';

export default function ComplaintDetail() {
  const { id } = useParams();
  const { data, user, role } = useApp();
  const base = baseFor(role);
  const listPath = role === 'farmer' ? '/farmer/report-issue' : `${base}/complaints`;
  const listLabel = role === 'farmer' ? 'Report an Issue' : 'Complaints';
  const c = byId(data.complaints, id);
  if (!c) {
    return <NotFoundRecord title="We could not find that complaint" backTo={listPath} backLabel={`Back to ${listLabel}`}>The reference may be wrong, or the complaint may not exist in this demo.</NotFoundRecord>;
  }
  if (!canSeeComplaint(data, user, c)) {
    return <NoAccess title="You do not have access to this complaint" backTo={listPath} backLabel={`Back to ${listLabel}`}>Complaints are visible only to the person who raised them, the people directly involved and CollabFarm reviewers.</NoAccess>;
  }
  return <ComplaintView c={c} base={base} listPath={listPath} listLabel={listLabel} />;
}

function ComplaintView({ c, base, listPath, listLabel }) {
  const { data, user, role, update, notify, toast } = useApp();
  const [appealing, setAppealing] = useState(false);
  const submitter = isSubmitter(user, c);
  const isAdmin = role === 'admin';
  const { pkg, coop } = complaintParties(data, c);
  const reviewers = useMemo(() => data.users.filter((u) => u.role === 'admin').map((u) => u.name), [data.users]);
  const submitterPath = `${baseFor(c.role)}/complaints/${c.id}`;

  const pkgLink = pkg && ({ cooperative: `${base}/funding/${pkg.id}`, investor: `${base}/packages/${pkg.id}`, admin: `/admin/monitoring/${pkg.id}` }[role]);

  // One place that appends to `actions`, saves an audit entry and tells the other side.
  const record = ({ patch = {}, text, auditAction, auditSummary, reason, tell }) => {
    const now = isoNow();
    update('complaints', c.id, (r) => ({ ...patch, updatedAt: now, actions: [...(r.actions || []), { at: now, by: user.name, role: user.role, text }] }), {
      action: auditAction, entityType: 'Complaint', reason: reason || c.subject, summary: auditSummary,
    });
    if (tell === 'submitter' && !submitter) notify(c.role, `Update on ${c.ref}`, text, submitterPath, 'complaint');
    if (tell === 'admin' && !isAdmin) notify('admin', `Update on ${c.ref}`, `${user.name}: ${text}`, `/admin/complaints/${c.id}`, 'complaint');
  };

  const addComment = async ({ text, files }) => {
    await simulate(300);
    const fileNote = files.length ? ` (attached: ${files.map((f) => f.name).join(', ')})` : '';
    record({
      patch: files.length ? { evidence: [...(c.evidence || []), ...files.map((f) => ({ name: f.name, size: f.size }))] } : {},
      text: `${text}${fileNote}`, auditAction: 'Added complaint comment', auditSummary: `Comment on ${c.ref}${files.length ? `, ${files.length} file(s) added` : ''}`, tell: isAdmin ? 'submitter' : 'admin',
    });
    toast('Your message was added to the complaint');
  };

  const assign = async (name) => {
    await simulate(300);
    record({ patch: { assignee: name, status: c.status === 'Open' ? 'Under Review' : c.status }, text: `Assigned to ${name}${c.status === 'Open' ? '. Status set to Under Review.' : '.'}`, auditAction: 'Assigned complaint reviewer', auditSummary: `Reviewer ${c.assignee} to ${name}`, tell: 'submitter' });
    toast(`${name} is now the reviewer`);
  };
  const changeStatus = async (status, note) => {
    await simulate(300);
    record({ patch: { status }, text: `Status changed from ${c.status} to ${status}. ${note}`, auditAction: 'Changed complaint status', auditSummary: `Status ${c.status} to ${status}`, reason: note, tell: 'submitter' });
    toast(`Status changed to ${status}`);
  };
  const saveOutcome = async (outcome, resolve) => {
    await simulate(300);
    record({ patch: { outcome, status: resolve ? 'Resolved' : c.status }, text: `Outcome recorded${resolve ? ' and complaint resolved' : ''}: ${outcome}`, auditAction: 'Recorded complaint outcome', auditSummary: resolve ? `Outcome saved, status ${c.status} to Resolved` : 'Outcome saved', tell: 'submitter' });
    toast(resolve ? 'Outcome saved and complaint resolved' : 'Outcome saved');
  };
  const escalate = async (reason) => {
    await simulate(300);
    record({ patch: { status: 'Escalated' }, text: `Escalated to a senior reviewer. Reason: ${reason}`, auditAction: 'Escalated complaint', auditSummary: `Status ${c.status} to Escalated`, reason, tell: 'submitter' });
    toast('Complaint escalated');
  };
  const appeal = async (reason) => {
    await simulate(400);
    record({ patch: { status: 'Escalated', appealReason: reason }, text: `Appeal submitted against the outcome. Reason: ${reason}`, auditAction: 'Appealed complaint outcome', auditSummary: 'Status Resolved to Escalated (appeal)', reason, tell: 'admin' });
    setAppealing(false);
    toast('Your appeal was sent. The complaint is now Escalated.');
  };

  const canComment = isAdmin || c.status !== 'Resolved';
  const evidence = c.evidence || [];

  return (
    <div className="page shr-page">
      <Breadcrumb items={[{ label: listLabel, to: listPath }, { label: c.ref }]} />
      <PageHeader
        title={c.subject}
        subtitle={`${c.ref} · ${c.category} · raised ${whenLabel(c.createdAt)}`}
        actions={<StatusPill>{c.status}</StatusPill>}
      />

      <Card>
        <CardHeader title="Where this complaint is" subtitle={STATUS_HELP[c.status]} />
        <StatusTrack status={c.status} />
      </Card>

      <div className="grid-main">
        <div className="stack-lg">
          <Card>
            <CardHeader title="What was reported" />
            <p className="shr-prewrap">{c.description}</p>
            <h3 className="shr-subhead"><FileText size={16} /> Evidence</h3>
            {evidence.length ? (
              <ul className="shr-files">
                {evidence.map((f, i) => <li key={f.name + i}><FileText size={16} />{f.name}{f.size ? <span className="caption muted">{Math.max(1, Math.round(f.size / 1024))} KB</span> : null}</li>)}
              </ul>
            ) : <p className="small muted">No evidence has been attached yet. The submitter can add files below.</p>}
          </Card>

          <Card>
            <CardHeader title="Actions taken" subtitle="Every step is recorded with the name of the person and the time. Nothing is deleted." />
            <ActionsThread actions={c.actions} />
          </Card>

          <Card>
            <CardHeader title="Conversation" subtitle="Add a message to this complaint. Authorised parties and reviewers can read it." />
            {canComment ? (
              <CommentBox
                label={submitter ? 'Add a comment or more information' : isAdmin ? 'Message to the people involved' : 'Add a response'}
                onSubmit={addComment}
              />
            ) : (
              <Banner tone="info" title="This complaint is resolved">
                {submitter ? 'If you disagree with the outcome you can appeal it. The complaint will be re-opened as Escalated.' : 'New messages are closed on a resolved complaint. Reviewers can still add notes.'}
              </Banner>
            )}
          </Card>

          <Card>
            <CardHeader title="Outcome and explanation" />
            {c.outcome ? <p className="shr-prewrap">{c.outcome}</p> : <p className="small muted">No outcome has been recorded yet. When a reviewer closes the complaint they will say what was decided and why.</p>}
          </Card>

          <Card>
            <CardHeader title="Appeal or escalation" subtitle="You can ask for a second look if you disagree with an outcome." />
            {c.status === 'Escalated' ? (
              <Banner tone="warn" title="This complaint has been escalated">
                {c.appealReason ? `Appeal reason: ${c.appealReason}` : 'A senior reviewer is looking at it. The people involved will be told of the next step.'}
              </Banner>
            ) : c.status === 'Resolved' && submitter ? (
              <div className="stack">
                <p className="small">If you think the outcome is wrong or incomplete, you can appeal. Give your reason and a senior reviewer will look again.</p>
                <div><Button variant="outline-green" onClick={() => setAppealing(true)}><Gavel size={16} />Appeal this outcome</Button></div>
              </div>
            ) : (
              <p className="small muted">{c.status === 'Resolved' ? 'Only the person who raised the complaint can appeal the outcome. Reviewers can escalate from the controls on this page.' : 'An appeal becomes available after the complaint is resolved.'}</p>
            )}
          </Card>
        </div>

        <div className="stack-lg">
          <Card>
            <CardHeader title="Parties" />
            <InfoList compact items={[
              ['Raised by', <span key="by" className="row-wrap" style={{ gap: 8 }}>{c.submittedBy}<RolePill role={c.role} /></span>],
              ['Related package', pkg ? (pkgLink ? <Link to={pkgLink}>{pkg.name}</Link> : pkg.name) : 'Not package specific'],
              ['Cooperative', coop?.name || '-'],
              ['Reviewer', c.assignee || 'Unassigned'],
              ['Category', c.category],
              ['Raised', whenLabel(c.createdAt)],
              ['Last updated', whenLabel(c.updatedAt)],
            ]} />
          </Card>

          {isAdmin ? (
            <Card>
              <CardHeader title="Reviewer controls" subtitle="Visible to administrators only." />
              <AdminControls complaint={c} reviewers={reviewers} onAssign={assign} onStatus={changeStatus} onOutcome={saveOutcome} onEscalate={escalate} />
            </Card>
          ) : (
            <Card tone="tint">
              <h2 className="card__title" style={{ marginBottom: 8 }}><MessageCircle size={18} style={{ verticalAlign: '-3px', marginRight: 8 }} />How reviews work</h2>
              <p className="small">A reviewer looks at the facts and the evidence, asks the other side to respond, then records an outcome and a plain explanation. A genuine crop failure is not treated as fraud, and no one is named publicly.</p>
            </Card>
          )}
        </div>
      </div>

      <ReasonModal
        open={appealing}
        onClose={() => setAppealing(false)}
        title="Appeal this outcome"
        intro="Your complaint will be re-opened as Escalated and a senior reviewer will look at it again."
        label="Why do you disagree with the outcome?"
        confirmLabel="Send appeal"
        onConfirm={appeal}
      />
    </div>
  );
}
