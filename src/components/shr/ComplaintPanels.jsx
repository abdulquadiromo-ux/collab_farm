import { useState } from 'react';
import { Check, Paperclip, ArrowUpRight, UserCheck, ClipboardEdit, Flag } from 'lucide-react';
import { Banner, Button, Checkbox, FileDrop, Modal, SelectField, TextAreaField, Timeline } from '../ui/index.js';
import { COMPLAINT_STATUSES, whenLabel } from './shrUtils.js';
import { cx } from '../../utils/format.js';

export const STATUS_HELP = {
  Open: 'The complaint was received and is waiting for a reviewer.',
  'Under Review': 'A reviewer is looking at the facts and the evidence.',
  'Awaiting Response': 'The reviewer has asked someone to provide information or an explanation.',
  Resolved: 'An outcome and an explanation have been recorded. The submitter can appeal.',
  Escalated: 'Sent to a senior reviewer. Next steps follow the signed agreements and the complaints procedure.',
};

// Five steps. Escalated is shown as a branch: it does not imply the earlier steps all happened.
export function StatusTrack({ status }) {
  const idx = COMPLAINT_STATUSES.indexOf(status);
  return (
    <ol className="shr-track" aria-label="Complaint status">
      {COMPLAINT_STATUSES.map((s, i) => {
        let state = 'todo';
        if (s === status) state = s === 'Escalated' ? 'bad' : 'active';
        else if (status === 'Escalated') state = i < 2 ? 'done' : 'skip';
        else if (i < idx) state = 'done';
        return (
          <li key={s} className={cx('shr-track__step', `shr-track__step--${state}`)} aria-current={s === status ? 'step' : undefined}>
            <span className="shr-track__dot">{state === 'done' ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
            <span className="shr-track__label">{s}</span>
            {s === status && <span className="sr-only"> (current)</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function ActionsThread({ actions }) {
  if (!actions?.length) return <p className="small muted">No actions have been recorded yet.</p>;
  const items = actions.map((a) => ({
    title: a.text,
    meta: `${a.by || 'System'}${a.role ? ` (${a.role})` : ''} · ${whenLabel(a.at)}`,
    state: 'done',
  }));
  return <Timeline items={items} />;
}

// Comment or "add more information". `allowFiles` lets the submitter attach evidence.
export function CommentBox({ onSubmit, label = 'Add a comment', placeholder = 'Write your message', allowFiles = true }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async (e) => {
    e.preventDefault();
    if (text.trim().length < 3) { setError('Write a short message first.'); return; }
    setBusy(true);
    try {
      const submitted = await onSubmit({ text: text.trim(), files });
      if (submitted === false) { setError('Your message could not be sent. Please try again.'); return; }
      setText(''); setFiles([]); setError('');
    } catch (submitError) {
      setError(submitError?.message || 'Your message could not be sent. Please try again.');
    } finally { setBusy(false); }
  };
  return (
    <form onSubmit={send} className="stack" noValidate>
      <TextAreaField label={label} value={text} onChange={(e) => { setText(e.target.value); setError(''); }} error={error} placeholder={placeholder} rows={4} />
      {allowFiles && <FileDrop multiple includeFile files={files} onFiles={setFiles} accept="Optional photo, receipt or document attachments." prompt="Attach evidence" />}
      <div><Button type="submit" loading={busy}><Paperclip size={16} />Post to this complaint</Button></div>
    </form>
  );
}

// A modal asking for a required reason before an irreversible-looking step (appeal or escalation).
export function ReasonModal({ open, onClose, title, intro, label, confirmLabel, onConfirm, minLength = 15 }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (reason.trim().length < minLength) { setError(`Give a reason of at least ${minLength} characters so the reviewer understands.`); return; }
    setBusy(true);
    await onConfirm(reason.trim());
    setBusy(false); setReason(''); setError('');
  };
  const close = () => { setReason(''); setError(''); onClose(); };
  return (
    <Modal open={open} onClose={close} title={title} footer={(<><Button variant="outline" onClick={close} block>Cancel</Button><Button onClick={submit} loading={busy} block>{confirmLabel}</Button></>)}>
      <div className="stack">
        {intro && <p className="small muted">{intro}</p>}
        <TextAreaField label={label} required value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }} error={error} rows={5} />
      </div>
    </Modal>
  );
}

// Admin only. Every action appends to `actions`, notifies the submitter and writes an audit entry (handled by the page callbacks).
export function AdminControls({ complaint, reviewers, onAssign, onStatus, onOutcome, onEscalate }) {
  const [reviewer, setReviewer] = useState(complaint.assignee !== 'Unassigned' ? complaint.assignee : '');
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState(complaint.outcome || '');
  const [resolve, setResolve] = useState(true);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState('');
  const [escalating, setEscalating] = useState(false);

  const run = async (key, fn) => { setBusy(key); await fn(); setBusy(''); };

  const assign = () => {
    if (!reviewer) { setErrors({ reviewer: 'Choose a reviewer.' }); return; }
    if (reviewer === complaint.assignee) { setErrors({ reviewer: 'This reviewer is already assigned.' }); return; }
    setErrors({});
    run('assign', () => onAssign(reviewer));
  };
  const changeStatus = () => {
    const e = {};
    if (!status) e.status = 'Choose the new status.';
    if (note.trim().length < 5) e.note = 'A note is required so the change can be explained later.';
    if (status === 'Resolved' && !complaint.outcome) e.status = 'Record an outcome and explanation before resolving.';
    setErrors(e);
    if (Object.keys(e).length) return;
    run('status', async () => { await onStatus(status, note.trim()); setStatus(''); setNote(''); });
  };
  const saveOutcome = () => {
    if (outcome.trim().length < 20) { setErrors({ outcome: 'Explain the outcome in at least 20 characters. Say what was decided and why.' }); return; }
    setErrors({});
    run('outcome', () => onOutcome(outcome.trim(), resolve));
  };

  return (
    <div className="stack-lg">
      <Banner tone="warn" title="Recording a complaint is not a finding">
        Do not label any person or cooperative as fraudulent because of a complaint, a missed deadline or a failed harvest. Classify the case on evidence. Every step below is saved with your name and the time.
      </Banner>

      <section className="shr-admin-block">
        <h3><UserCheck size={18} /> Assign reviewer</h3>
        <div className="shr-inline">
          <SelectField className="grow" label="Reviewer" value={reviewer} onChange={(e) => { setReviewer(e.target.value); setErrors({}); }} options={reviewers} placeholder="Choose a reviewer" error={errors.reviewer} />
          <Button onClick={assign} loading={busy === 'assign'} variant="outline-green">Assign</Button>
        </div>
      </section>

      <section className="shr-admin-block">
        <h3><ClipboardEdit size={18} /> Change status</h3>
        <SelectField label="New status" value={status} onChange={(e) => { setStatus(e.target.value); setErrors({}); }} options={COMPLAINT_STATUSES.filter((s) => s !== complaint.status)} placeholder="Choose a status" error={errors.status} />
        <TextAreaField label="Note (required)" value={note} onChange={(e) => { setNote(e.target.value); setErrors({}); }} rows={3} error={errors.note} hint="The note is shown in the action history to the people involved." />
        <div><Button onClick={changeStatus} loading={busy === 'status'}>Update status</Button></div>
      </section>

      <section className="shr-admin-block">
        <h3><Flag size={18} /> Record outcome</h3>
        <TextAreaField label="Outcome and explanation" value={outcome} onChange={(e) => { setOutcome(e.target.value); setErrors({}); }} rows={4} error={errors.outcome} hint="Say what was decided and why, in plain language." />
        <Checkbox checked={resolve} onChange={setResolve}>Mark the complaint as Resolved</Checkbox>
        <div><Button onClick={saveOutcome} loading={busy === 'outcome'}>Save outcome</Button></div>
      </section>

      <section className="shr-admin-block">
        <h3><ArrowUpRight size={18} /> Escalate</h3>
        <p className="small muted">Send this complaint to a senior reviewer, for example when it involves a possible breach or a payment above the single approver limit.</p>
        <div><Button variant="danger-outline" onClick={() => setEscalating(true)} disabled={complaint.status === 'Escalated'}>Escalate complaint</Button></div>
      </section>

      <ReasonModal
        open={escalating}
        onClose={() => setEscalating(false)}
        title="Escalate this complaint"
        intro="Escalating changes the status to Escalated and tells the submitter. It is not a finding against anyone."
        label="Reason for escalation"
        confirmLabel="Escalate"
        onConfirm={async (reason) => { await onEscalate(reason); setEscalating(false); }}
      />
    </div>
  );
}
