import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CircleCheck, Circle, Upload, Send, ClipboardList } from 'lucide-react';
import { useApp, newId, simulate } from '../../context/AppContext.jsx';
import { PageHeader, Breadcrumb, Card, CardHeader, Banner, StatusPill, Button, LinkButton, EmptyState, Timeline, SelectField, TextField, TextAreaField, FileDrop, ConfirmDialog } from '../../components/ui/index.js';
import EvidenceList from '../../components/coopc/EvidenceList.jsx';
import { VerifyGate, useVerified } from '../../components/coopc/Gate.jsx';
import { TODAY, useCoop, daysFromToday, trancheShort, EVIDENCE_TYPES, GPS_PATTERN } from '../../components/coopc/helpers.js';
import { canReleaseTranche } from '../../utils/rules.js';
import { formatNaira, formatDate, formatDateTime } from '../../utils/format.js';
import '../../styles/pages/coopc.css';

const blankEv = { type: '', files: [], gps: '', notes: '' };

export default function MilestoneDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data, user, update, notify, toast } = useApp();
  const { coop, packageIds, pkgById } = useCoop();
  const verified = useVerified();
  const uploadRef = useRef(null);
  const [form, setForm] = useState(blankEv);
  const [errors, setErrors] = useState({});
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const closeConfirm = useCallback(() => setConfirming(false), []);

  const ms = data.milestones.find((m) => m.id === id && packageIds.has(m.packageId));
  const wantsUpload = params.get('upload') === '1';

  useEffect(() => {
    if (wantsUpload && ms && uploadRef.current) {
      uploadRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [wantsUpload, ms]);

  if (!ms) {
    return (
      <div className="page coopc-page">
        <Breadcrumb items={[{ label: 'Farming Progress', to: '/coop/farming-progress' }, { label: 'Milestone not found' }]} />
        <EmptyState title="We could not find this milestone" action={<LinkButton to="/coop/farming-progress">Back to Farming Progress</LinkButton>}>
          It may belong to another cooperative, or the link may be out of date.
        </EmptyState>
      </div>
    );
  }

  const pkg = pkgById[ms.packageId];
  const tranche = data.tranches.find((t) => t.id === ms.trancheId) || null;
  const check = tranche ? canReleaseTranche(tranche, data.tranches, data.milestones) : null;
  const prev = tranche ? data.tranches.find((t) => t.packageId === tranche.packageId && t.number === tranche.number - 1) : null;
  const evidence = ms.evidence || [];
  const returned = !!ms.returned || (!!ms.reviewNotes && !!ms.reviewedBy && !['Approved', 'Under Review'].includes(ms.status)) || tranche?.status === 'Rejected';
  const locked = ms.status === 'Under Review' || ms.status === 'Approved';
  const daysLate = !locked && daysFromToday(ms.dueDate) < 0 ? -daysFromToday(ms.dueDate) : 0;
  const lateSubmission = ms.submittedAt && ms.dueDate && ms.submittedAt > ms.dueDate;
  const audits = data.audit.filter((a) => a.entityType === 'Milestone' && a.entityId === ms.id);

  const setField = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setSubmitError('');
    setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => { delete n[k]; }); return n; });
  };

  const addEvidence = async () => {
    const e = {};
    if (!form.type) e.type = 'Choose what kind of evidence this is.';
    if (form.files.length === 0) e.files = 'Choose a file to upload. It stays in your browser in this demo.';
    if (form.gps.trim() && !GPS_PATTERN.test(form.gps.trim())) e.gps = 'Write the GPS point as latitude, longitude, for example 8.9167, 7.0123.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setAdding(true);
    await simulate(500);
    const items = form.files.map((f) => ({
      id: newId('ev'), type: form.type, name: f.name, verified: false, uploadedBy: user.name, uploadedAt: TODAY,
      gps: form.gps.trim() || '', notes: form.notes.trim() || '',
    }));
    update('milestones', ms.id, (m) => ({ evidence: [...(m.evidence || []), ...items] }), {
      action: 'Evidence added', entityType: 'Milestone',
      summary: `${items.length} file${items.length > 1 ? 's' : ''} added (${form.type}) to "${ms.title}". Not yet verified.`,
      reason: `${pkg?.name || ''} ${tranche ? trancheShort(tranche) : ''}`.trim(),
    });
    setAdding(false);
    setForm(blankEv);
    setSubmitError('');
    toast('Evidence added. It is marked as uploaded, not yet verified.');
  };

  const askSubmit = () => {
    if (!verified) { setSubmitError('Your cooperative must be verified before it can submit milestone evidence.'); return; }
    if (evidence.length === 0) { setSubmitError('Add at least one piece of evidence before you submit for review.'); return; }
    setSubmitError('');
    setConfirming(true);
  };

  const submitForReview = async () => {
    setSubmitting(true);
    await simulate(700);
    update('milestones', ms.id, { status: 'Under Review', submittedBy: user.name, submittedAt: TODAY, returned: false }, {
      action: returned ? 'Milestone resubmitted for review' : 'Submitted milestone evidence', entityType: 'Milestone',
      summary: `${evidence.length} file${evidence.length > 1 ? 's' : ''}, status ${ms.status} to Under Review`,
      reason: ms.title,
    });
    if (tranche && !['Released', 'Approved', 'Under Review'].includes(tranche.status)) {
      update('tranches', tranche.id, { status: 'Under Review' }, {
        action: 'Tranche evidence submitted', entityType: 'Tranche',
        summary: `${trancheShort(tranche)} status ${tranche.status} to Under Review. Not released: release still needs admin approval.`,
        reason: ms.title,
      });
    }
    notify('admin', 'Milestone under review', `${coop?.name || 'A cooperative'} submitted "${ms.title}" for ${pkg?.name || 'a package'}. It is waiting for a milestone reviewer.`, `/admin/milestones/${ms.id}`, 'milestone');
    setSubmitting(false);
    setConfirming(false);
    toast('Submitted for review. Funds are not released until a reviewer approves and a payment approver signs off.');
  };

  const history = [{ title: 'Milestone set', meta: `Due ${formatDate(ms.dueDate)}`, state: 'done' }];
  if (ms.submittedAt) history.push({ title: 'Evidence submitted for review', meta: `${ms.submittedBy || 'Cooperative'}, ${formatDate(ms.submittedAt)}${lateSubmission ? ' (after the due date, recorded as a delay)' : ''}`, state: 'done' });
  if (ms.reviewedBy) {
    history.push({
      title: ms.status === 'Approved' ? 'Approved by a reviewer' : 'Reviewer feedback',
      meta: ms.reviewedBy, body: ms.reviewNotes || undefined, state: ms.status === 'Approved' ? 'done' : 'bad',
    });
  } else if (ms.status === 'Under Review') {
    history.push({ title: 'Waiting for a reviewer', meta: 'No decision yet', state: 'active' });
  }

  return (
    <div className="page coopc-page">
      <Breadcrumb items={[{ label: 'Farming Progress', to: '/coop/farming-progress' }, { label: ms.title }]} />
      <PageHeader
        title={ms.title}
        subtitle={ms.description}
        actions={<Link className="btn btn--outline" to={`/coop/farming-progress?package=${ms.packageId}`}><ClipboardList size={16} />All milestones for this package</Link>}
      />
      <div className="coopc-meta" style={{ marginTop: -8 }}>
        <StatusPill>{ms.status}</StatusPill>
        <span className="small">Due {formatDate(ms.dueDate)}</span>
        {daysLate > 0 && <StatusPill tone="amber">Late by {daysLate} {daysLate === 1 ? 'day' : 'days'}</StatusPill>}
        {pkg && <Link className="small" to={`/coop/funding/${pkg.id}`}>{pkg.name}</Link>}
        {tranche && <span className="small muted">{trancheShort(tranche)}</span>}
      </div>

      <VerifyGate what="submit milestone evidence" />
      {returned && (
        <Banner tone="warn" title="The reviewer asked for changes">
          {ms.reviewNotes || 'The reviewer returned this milestone. Read the note, fix the evidence and resubmit.'}
          {ms.reviewedBy && <> Reviewed by {ms.reviewedBy}.</>}
        </Banner>
      )}
      {!returned && ms.status === 'Delayed' && (
        <Banner tone="warn" title="This milestone is past its due date">
          A delay is recorded. It is not treated as misconduct. Explain what happened in the notes when you add evidence.
        </Banner>
      )}
      {ms.status === 'Under Review' && (
        <Banner tone="info" title="Waiting for a reviewer">
          Evidence is locked while a reviewer checks it. If you need to change something, the reviewer can return it to you.
        </Banner>
      )}
      {ms.status === 'Approved' && (
        <Banner tone="success" title="Approved by a reviewer">
          Approval of a milestone does not pay anything by itself. The tranche is released only after a separate payment approval.
        </Banner>
      )}
      {tranche?.status === 'Locked' && !locked && (
        <Banner tone="info" title={`${trancheShort(tranche)} is locked for now`}>
          {prev ? `Tranche ${prev.number} is ${prev.status}.` : ''} You can prepare and submit evidence now. The tranche still cannot be released until the earlier tranche is released and this milestone is approved.
        </Banner>
      )}

      <div className="grid-main">
        <div className="stack-lg">
          <Card>
            <CardHeader title={`Evidence (${evidence.length})`} subtitle="Files that show this milestone is done. A reviewer checks them before the next tranche can open." />
            {evidence.length > 0 ? (
              <EvidenceList items={evidence} fallbackBy={ms.submittedBy} fallbackDate={ms.submittedAt} />
            ) : (
              <EmptyState icon={<Upload size={26} />} title="No evidence yet">
                Add receipts, reports or records below. Photos and GPS points are welcome, but they support your evidence and do not replace it.
              </EmptyState>
            )}
          </Card>

          <div ref={uploadRef} id="evidence-form">
            <Card>
              <CardHeader title="Add evidence" subtitle="Files stay in your browser in this demo. Nothing is uploaded to a server." />
              {locked ? (
                <Banner tone="info">{ms.status === 'Approved' ? 'This milestone is approved, so its evidence is closed.' : 'Evidence is locked while the reviewer is checking it.'}</Banner>
              ) : (
                <div className="form-grid">
                  <SelectField
                    label="Evidence type" required placeholder="Select a type" value={form.type} error={errors.type}
                    options={EVIDENCE_TYPES} onChange={(e) => setField({ type: e.target.value })}
                  />
                  <TextField
                    label="GPS point" optional value={form.gps} error={errors.gps} placeholder="8.9167, 7.0123"
                    hint="Latitude, longitude of the field or store. It supports the evidence but does not prove it."
                    onChange={(e) => setField({ gps: e.target.value })}
                  />
                  <div className="full">
                    <FileDrop
                      label="File" accept="PDF, JPG, PNG or ZIP (Max 5MB)" files={form.files} error={errors.files} multiple
                      onFiles={(files) => setField({ files })}
                    />
                  </div>
                  <TextAreaField
                    className="full" label="Notes" optional value={form.notes} placeholder="What does this show? Add the reason if this is late."
                    onChange={(e) => setField({ notes: e.target.value })}
                  />
                  <div className="full row" style={{ justifyContent: 'flex-end' }}>
                    <Button variant="outline-green" onClick={addEvidence} loading={adding}><Upload size={16} />Add evidence</Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {!locked && (
            <Card tone="tint">
              <div className="coopc-submit-bar">
                <div>
                  <div className="strong">{returned ? 'Ready to resubmit?' : 'Ready for the reviewer?'}</div>
                  <p className="small muted">Submitting sets this milestone and its tranche to Under Review. It does not release money.</p>
                  {submitError && <p className="field__error" role="alert" style={{ marginTop: 6 }}>{submitError}</p>}
                </div>
                <Button onClick={askSubmit}><Send size={16} />{returned ? 'Resubmit for review' : 'Submit for review'}</Button>
              </div>
            </Card>
          )}
        </div>

        <div className="stack-lg">
          <Card>
            <CardHeader title="What this tranche needs" subtitle="A tranche is one stage of the funding. It opens only when these are met." />
            {tranche ? (
              <div className="stack">
                <div className="row between">
                  <div>
                    <div className="strong">{trancheShort(tranche)}</div>
                    <div className="cell-sub">{formatNaira(tranche.amount)}</div>
                  </div>
                  <StatusPill>{tranche.status}</StatusPill>
                </div>
                <p className="small muted">{tranche.purpose}</p>
                <ul className="coopc-cond">
                  {(tranche.conditions || []).map((c) => (<li key={c}><Circle size={16} /><span>{c}</span></li>))}
                </ul>
                <div className="coopc-gate">
                  <div className="coopc-gate__row">
                    <span>{prev ? `Tranche ${prev.number} released` : 'First tranche (nothing before it)'}</span>
                    <span className="row" style={{ gap: 6 }}>{check.prevOk ? <CircleCheck size={18} color="var(--green-600)" /> : <Circle size={18} color="var(--grey-600)" />}<span>{check.prevOk ? 'Yes' : 'Not yet'}</span></span>
                  </div>
                  <div className="coopc-gate__row">
                    <span>All milestone evidence approved</span>
                    <span className="row" style={{ gap: 6 }}>{check.evidenceOk ? <CircleCheck size={18} color="var(--green-600)" /> : <Circle size={18} color="var(--grey-600)" />}<span>{check.evidenceOk ? 'Yes' : 'Not yet'}</span></span>
                  </div>
                </div>
                <p className="caption muted">Release also needs a separate payment approval by CollabFarm. No tranche is released on request alone.</p>
              </div>
            ) : (
              <p className="small muted">This milestone is not linked to a tranche yet.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Review history" />
            <Timeline items={history} />
            {ms.reviewNotes && ms.reviewedBy && (
              <div className="coopc-note" style={{ marginTop: 4 }}>
                <div className="caption muted">Reviewer note from {ms.reviewedBy}</div>
                <div>{ms.reviewNotes}</div>
              </div>
            )}
            {audits.length > 0 && (
              <div className="stack-sm" style={{ marginTop: 16 }}>
                <div className="caption muted">Recorded changes</div>
                {audits.map((a) => (
                  <div key={a.id} className="small"><strong>{a.action}</strong><span className="cell-sub" style={{ display: 'block' }}>{a.actor}, {formatDateTime(a.at)}</span></div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={closeConfirm}
        onConfirm={submitForReview}
        loading={submitting}
        tone="green"
        title={returned ? 'Resubmit this milestone?' : 'Submit this milestone for review?'}
        message="A reviewer will check your evidence. Submitting does not release any money."
        summary={[
          ['Milestone', ms.title],
          ['Package and tranche', `${pkg?.name || '-'}${tranche ? `, ${trancheShort(tranche)}` : ''}`],
          ['Evidence', `${evidence.length} ${evidence.length === 1 ? 'file' : 'files'}`],
          ['Tranche amount', tranche ? formatNaira(tranche.amount) : '-'],
          ['Approval status', 'Not approved yet. Waiting for a milestone reviewer'],
        ]}
        confirmLabel={returned ? 'Resubmit' : 'Submit for review'}
      />
    </div>
  );
}
