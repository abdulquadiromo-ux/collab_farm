import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Camera, FileText, Archive, BadgeCheck, Undo2, UserSearch, ShieldCheck } from 'lucide-react';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { PageHeader, Card, Breadcrumb, StatusPill, Banner, Button, ConfirmDialog, InfoList, Timeline, Modal, SelectField, TextAreaField, LinkButton } from '../../components/ui/index.js';
import { formatNaira, formatDateShort } from '../../utils/format.js';
import { canReleaseTranche } from '../../utils/rules.js';
import { milestoneFlags, nowIso, findPkg, coopNameOfPkg, trancheLabel } from '../../components/admb/lib.js';
import { PageMissing, ReasonModal, At, atText, ActingAs, RuleList } from '../../components/admb/ui.jsx';
import '../../styles/pages/admb.css';

const REFER_REASONS = ['The evidence needs technical expertise', 'Possible conflict of interest', 'Evidence quality is uncertain', 'The cooperative asked for another opinion'];
const evidenceIcon = (t = '', n = '') => (/photo/i.test(t) ? Camera : /zip|rar/i.test(n) ? Archive : FileText);

export default function MilestoneReview() {
  const { id } = useParams();
  const ctx = useApp();
  const { data, user, update, notify, toast } = ctx;
  const m = data.milestones.find((x) => x.id === id);
  const [notes, setNotes] = useState('');
  const [notesErr, setNotesErr] = useState('');
  const [checks, setChecks] = useState({});
  const [checkErr, setCheckErr] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [referOpen, setReferOpen] = useState(false);
  const [referReason, setReferReason] = useState(REFER_REASONS[0]);
  const [referNote, setReferNote] = useState('');
  const [referErr, setReferErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setNotes(''); setNotesErr(''); setChecks({}); setCheckErr(''); }, [id]);

  if (!m) return <PageMissing crumbs={[{ label: 'Milestone approval', to: '/admin/milestones' }, { label: 'Not found' }]} title="Milestone not found" text="This milestone does not exist or the link is out of date." backTo="/admin/milestones" backLabel="Back to milestone approval" />;

  const pkg = findPkg(data, m.packageId);
  const tranche = data.tranches.find((t) => t.id === m.trancheId);
  const flags = milestoneFlags(m);
  const reviewing = m.status === 'Under Review';
  const conditions = tranche?.conditions || [];
  const allTicked = conditions.every((_, i) => checks[i]);
  const paused = pkg?.status === 'Paused';
  const siblings = tranche ? data.milestones.filter((x) => x.trancheId === tranche.id) : [];

  const history = [
    ...(m.submittedAt ? [{ at: m.submittedAt, by: m.submittedBy, action: 'Evidence submitted', note: `${m.evidence.length} file${m.evidence.length === 1 ? '' : 's'} sent for review.` }] : []),
    ...(m.history || []),
    ...(!m.history?.some((h) => h.action === 'Approved') && m.status === 'Approved' && m.reviewedBy ? [{ at: m.submittedAt, by: m.reviewedBy, action: 'Approved', note: m.reviewNotes }] : []),
  ];

  const verify = (ev) => update('milestones', m.id, (r) => ({ evidence: r.evidence.map((e) => (e.id === ev.id ? { ...e, verified: true, verifiedBy: user.name } : e)) }), {
    action: 'Evidence marked verified', entityType: 'Milestone', summary: `${ev.name} on ${m.title}`, reason: 'Reviewer checked the file',
  });

  const tryApprove = () => {
    let ok = true;
    if (notes.trim().length < 10) { setNotesErr('Write reviewer notes of at least 10 characters. They are kept in the audit trail.'); ok = false; }
    if (!allTicked) { setCheckErr('Tick each release condition you have checked, or return the milestone for more evidence.'); ok = false; }
    if (ok) setApproveOpen(true);
  };

  const doApprove = async () => {
    setBusy(true);
    await simulate(700);
    const at = nowIso();
    const nextMs = data.milestones.map((x) => (x.id === m.id ? { ...x, status: 'Approved' } : x));
    update('milestones', m.id, { status: 'Approved', reviewedBy: user.name, reviewedAt: at, reviewNotes: notes.trim(), conditionChecks: conditions.map((_, i) => !!checks[i]), history: [...(m.history || []), { at, by: user.name, action: 'Approved', note: notes.trim() }] }, {
      action: 'Milestone approved', entityType: 'Milestone', summary: `${m.title} (${pkg?.name}). Status ${m.status} to Approved. No payment was made.`, reason: notes.trim(),
    });
    let msg = 'Milestone approved. No funds were released.';
    if (tranche) {
      const gate = canReleaseTranche(tranche, data.tranches, nextMs, false);
      if (gate.evidenceOk && gate.prevOk && ['Locked', 'Pending Evidence', 'Under Review'].includes(tranche.status)) {
        update('tranches', tranche.id, { status: 'Approved', approvedAt: at, reviewer: user.name }, {
          action: 'Tranche approved for release', entityType: 'Tranche', summary: `${trancheLabel(tranche)} (${formatNaira(tranche.amount)}). Status ${tranche.status} to Approved. Payment still needs maker-checker approval.`, reason: 'All milestone evidence approved and the previous tranche is released',
        });
        notify('admin', 'Tranche approved, payment approval next', `${trancheLabel(tranche)} for ${pkg?.name} can now go through payment approval.`, '/admin/disbursements', 'disbursement');
        msg = `Milestone approved. ${trancheLabel(tranche)} is now Approved for release. Funds are paid only after payment approval.`;
      } else if (gate.evidenceOk && !gate.prevOk) {
        msg = `Milestone approved. ${trancheLabel(tranche)} stays as it is until the previous tranche is released.`;
      } else if (!gate.evidenceOk) {
        msg = 'Milestone approved. The tranche still has other milestones waiting for approval.';
      }
    }
    notify('cooperative', 'Milestone approved', `${m.title} for ${pkg?.name} was approved by a reviewer. This is not a payment. Funds are released in a separate approval step.`, '/coop/farming-progress', 'milestone');
    setBusy(false);
    setApproveOpen(false);
    toast(msg);
  };

  const doReturn = async (message) => {
    await simulate(600);
    const at = nowIso();
    const next = flags.overdue ? 'Delayed' : 'Not Started';
    update('milestones', m.id, { status: next, returnedAt: at, returnMessage: message, reviewedBy: user.name, history: [...(m.history || []), { at, by: user.name, action: 'Returned for more evidence', note: message }] }, {
      action: 'Milestone returned for more evidence', entityType: 'Milestone', summary: `${m.title} (${pkg?.name}). Status ${m.status} to ${next}.`, reason: message,
    });
    if (tranche && tranche.status === 'Under Review') {
      update('tranches', tranche.id, { status: 'Pending Evidence' }, { action: 'Tranche waiting for evidence', entityType: 'Tranche', summary: `${trancheLabel(tranche)}: Under Review to Pending Evidence`, reason: 'Milestone returned for more evidence' });
    }
    notify('cooperative', 'More evidence needed', `${m.title} for ${pkg?.name} was returned: ${message}`, '/coop/farming-progress', 'milestone');
    setReturnOpen(false);
    toast(`Returned to the cooperative. Status is now ${next}.`, 'info');
  };

  const doRefer = async () => {
    if (referNote.trim().length < 10) { setReferErr('Write at least 10 characters so the independent reviewer knows what to look at.'); return; }
    setBusy(true);
    await simulate(600);
    const at = nowIso();
    update('milestones', m.id, { referral: { at, by: user.name, reason: referReason, note: referNote.trim() }, history: [...(m.history || []), { at, by: user.name, action: 'Referred for independent review', note: `${referReason}. ${referNote.trim()}` }] }, {
      action: 'Milestone referred for independent review', entityType: 'Milestone', summary: `${m.title} (${pkg?.name}). Reason: ${referReason}.`, reason: referNote.trim(),
    });
    notify('cooperative', 'Milestone referred for independent review', `${m.title} for ${pkg?.name} was referred for an independent look. No finding has been made.`, '/coop/farming-progress', 'milestone');
    notify('admin', 'Independent review requested', `${m.title} for ${pkg?.name} was referred by ${user.name}.`, `/admin/milestones/${m.id}`, 'milestone');
    setBusy(false); setReferOpen(false); setReferNote(''); setReferErr('');
    toast('Referral recorded and the cooperative was told. The milestone stays under review.', 'info');
  };

  const decisionSummary = [['Milestone', m.title], ['Project', pkg?.name], ['Tranche', trancheLabel(tranche)], ['Effect', 'Milestone becomes Approved. No money moves.'], ['Reviewer', user.name]];

  return (
    <div className="page">
      <Breadcrumb items={[{ label: 'Milestone approval', to: '/admin/milestones' }, { label: m.title }]} />
      <PageHeader
        title={m.title}
        subtitle={`${pkg?.name || ''} · ${coopNameOfPkg(data, m.packageId)}`}
        actions={<div className="admb-pillrow"><StatusPill>{m.status}</StatusPill>{flags.overdue && <span className="admb-flag admb-flag--red">Overdue {flags.overdueDays} days</span>}{flags.late && m.status !== 'Not Started' && <span className="admb-flag admb-flag--amber">Submitted late</span>}{m.referral && <span className="admb-flag admb-flag--blue">Referred for independent review</span>}</div>}
      />
      <ActingAs user={user} />
      {paused && <Banner tone="warn" title="New disbursements are suspended for this project">You can still review the evidence. Approving a milestone does not release funds, and payments stay blocked until the pause is lifted. A pause is not a finding of fault.</Banner>}

      <div className="admb-main">
        <div className="admb-col">
          <Card>
            <h2 className="admb-card-title">Milestone and tranche</h2>
            <InfoList compact items={[
              ['What it covers', m.description],
              ['Project', <Link key="p" to={`/admin/monitoring/${m.packageId}`}>{pkg?.name}</Link>],
              ['Cooperative', coopNameOfPkg(data, m.packageId)],
              ['Tranche', tranche ? <span key="t">{trancheLabel(tranche)} <StatusPill>{tranche.status}</StatusPill></span> : '-'],
              ['Tranche amount', tranche ? `${formatNaira(tranche.amount)} (released only after payment approval)` : '-'],
              ['Due date', formatDateShort(m.dueDate)],
              ['Submitted', m.submittedAt ? <span key="s">{m.submittedBy}, <At value={m.submittedAt} /></span> : 'Not submitted yet'],
              ['Other milestones in this tranche', siblings.length > 1 ? siblings.filter((x) => x.id !== m.id).map((x) => <div key={x.id}><Link to={`/admin/milestones/${x.id}`}>{x.title}</Link> ({x.status})</div>) : 'None'],
            ]}
            />
          </Card>

          <Card>
            <div className="admb-head">
              <div>
                <h2 className="admb-card-title">Release conditions</h2>
                <p className="admb-card-sub">What must be true before this tranche can be paid. {reviewing ? 'Tick each one you have checked against the evidence.' : ''}</p>
              </div>
              {conditions.length > 0 && <span className="small muted">{m.status === 'Approved' ? conditions.length : conditions.filter((_, i) => checks[i]).length} of {conditions.length} checked</span>}
            </div>
            {conditions.length === 0 ? <p className="small muted">No conditions are set for this tranche.</p> : (
              <ul className="admb-conds">
                {conditions.map((c, i) => {
                  const done = m.status === 'Approved' ? (m.conditionChecks ? m.conditionChecks[i] !== false : true) : !!checks[i];
                  return (
                    <li key={c} className={`admb-cond ${done ? 'admb-cond--done' : ''}`}>
                      <input id={`cond-${i}`} type="checkbox" checked={done} disabled={!reviewing} onChange={(e) => { setChecks((s) => ({ ...s, [i]: e.target.checked })); setCheckErr(''); }} />
                      <label htmlFor={`cond-${i}`}>{c}</label>
                    </li>
                  );
                })}
              </ul>
            )}
            {checkErr && <p className="field__error" role="alert" style={{ marginTop: 10 }}>{checkErr}</p>}
          </Card>

          <Card>
            <div className="admb-head">
              <div>
                <h2 className="admb-card-title">Evidence</h2>
                <p className="admb-card-sub">Uploaded and verified are different. Photos and GPS support a report but are not conclusive on their own.</p>
              </div>
            </div>
            {m.evidence.length === 0 ? <p className="small muted">No evidence has been uploaded for this milestone yet.</p> : (
              <ul className="admb-evidence">
                {m.evidence.map((e) => {
                  const Icon = evidenceIcon(e.type, e.name);
                  const supporting = /photo|gps/i.test(e.type) || /photo|gps/i.test(e.name);
                  return (
                    <li key={e.id} className="admb-evidence__item">
                      <div className="admb-evidence__top">
                        <span className="admb-evidence__icon"><Icon size={20} aria-hidden="true" /></span>
                        <div className="grow">
                          <div className="admb-evidence__name">{e.name}</div>
                          <div className="admb-evidence__meta">{e.type}<br />Uploaded by {m.submittedBy || 'the cooperative'} on {atText(m.submittedAt)}</div>
                        </div>
                        <StatusPill tone={e.verified ? 'green' : 'gray'}>{e.verified ? 'Verified' : 'Uploaded'}</StatusPill>
                      </div>
                      {supporting && <div className="admb-evidence__note">Supporting evidence only. Photos and GPS locations are not conclusive on their own.</div>}
                      {e.verified && e.verifiedBy && <div className="admb-evidence__meta">Verified by {e.verifiedBy}</div>}
                      {reviewing && !e.verified && <Button size="sm" variant="outline" onClick={() => verify(e)}><ShieldCheck size={16} />Mark as verified</Button>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="admb-card-title">What the cooperative said</h2>
            <p className="admb-card-sub">Submission notes from {m.submittedBy || 'the cooperative'}.</p>
            <div className="admb-note" style={{ marginTop: 12 }}>{m.submissionNote || (m.submittedAt ? `${m.description}. No extra notes were included with this submission.` : 'Nothing has been submitted yet.')}</div>
            {m.returnMessage && <div className="admb-hint admb-hint--warn" style={{ marginTop: 12 }}><strong>Last request for more evidence:</strong> {m.returnMessage}</div>}
          </Card>

          {history.length > 0 && (
            <Card>
              <h2 className="admb-card-title">Review history</h2>
              <div style={{ marginTop: 14 }}>
                <Timeline items={history.map((h) => ({ title: h.action, meta: `${h.by || 'System'} · ${atText(h.at)}`, body: h.note, state: h.action === 'Approved' ? 'done' : h.action.startsWith('Returned') ? 'bad' : 'active' }))} />
              </div>
            </Card>
          )}
        </div>

        <div className="admb-col admb-sticky">
          <Card>
            <h2 className="admb-card-title">Your decision</h2>
            {reviewing ? (
              <div className="stack" style={{ marginTop: 12 }}>
                <TextAreaField label="Reviewer notes" required hint="What you checked and why you decided this. Kept in the audit trail." value={notes} error={notesErr} onChange={(e) => { setNotes(e.target.value); setNotesErr(''); }} />
                <div className="admb-actions">
                  <Button onClick={tryApprove}><BadgeCheck size={18} />Approve milestone</Button>
                  <Button variant="outline" onClick={() => setReturnOpen(true)}><Undo2 size={18} />Return for more evidence</Button>
                  {!m.referral && <Button variant="outline" onClick={() => setReferOpen(true)}><UserSearch size={18} />Refer for independent review</Button>}
                </div>
                {m.referral && <div className="admb-hint">Referred on <At value={m.referral.at} /> by {m.referral.by}: {m.referral.reason}. Record the independent view in your notes before you decide.</div>}
              </div>
            ) : m.status === 'Approved' ? (
              <div className="stack" style={{ marginTop: 12 }}>
                <div className="admb-hint admb-hint--ok"><strong>Approved</strong> by {m.reviewedBy}{m.reviewedAt ? <> on <At value={m.reviewedAt} /></> : ''}.{m.reviewNotes ? ` ${m.reviewNotes}` : ''}</div>
                <p className="small muted">Approval is not a payment. {tranche ? `${trancheLabel(tranche)} is ${tranche.status}.` : ''}</p>
                <LinkButton to="/admin/disbursements" variant="outline-green">Go to disbursements</LinkButton>
              </div>
            ) : (
              <div className="stack" style={{ marginTop: 12 }}>
                <div className="admb-hint admb-hint--warn">This milestone is {m.status}. There is nothing to decide until the cooperative submits evidence.</div>
                <LinkButton to="/admin/milestones" variant="outline">Back to the queue</LinkButton>
              </div>
            )}
          </Card>
          <RuleList title="What approving does" items={[
            'It records that the evidence is acceptable. It is not a payment and never releases funds.',
            'The tranche becomes Approved only when every milestone in it is approved and the previous tranche is Released.',
            'Payment then needs its own maker-checker approval on the Disbursements page.',
            'Approval is not a guarantee that the project will succeed.',
          ]}
          />
        </div>
      </div>

      <ConfirmDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={doApprove}
        loading={busy}
        tone="green"
        title="Approve this milestone?"
        message="This records that the evidence is acceptable. It does not pay anyone."
        summary={decisionSummary}
        confirmLabel="Approve milestone"
      />
      <ReasonModal
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        title="Return for more evidence"
        intro={`The cooperative is told what to add. The milestone goes back to ${flags.overdue ? 'Delayed because it is past due' : 'Not Started'}. Nothing is deleted.`}
        summary={decisionSummary.slice(0, 3)}
        label="Message to the cooperative"
        hint="Say exactly what is missing so they can fix it quickly."
        minLength={15}
        confirmLabel="Return milestone"
        onSubmit={doReturn}
      />
      <Modal open={referOpen} onClose={() => !busy && setReferOpen(false)} title="Refer for independent review" white footer={(<><Button variant="outline" onClick={() => setReferOpen(false)} disabled={busy} block>Cancel</Button><Button onClick={doRefer} loading={busy} block>Record referral</Button></>)}>
        <div className="stack">
          <p className="small muted">An independent reviewer looks at the evidence without being part of the normal review chain. The cooperative is told. No finding is made.</p>
          <SelectField label="Why are you referring this?" required options={REFER_REASONS} value={referReason} onChange={(e) => setReferReason(e.target.value)} />
          <TextAreaField label="What should the independent reviewer look at?" required value={referNote} error={referErr} onChange={(e) => { setReferNote(e.target.value); setReferErr(''); }} />
        </div>
      </Modal>
    </div>
  );
}
