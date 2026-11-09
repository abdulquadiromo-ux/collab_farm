import { useState } from 'react';
import { ChevronDown, FileSignature, Send, StickyNote, GitBranchPlus } from 'lucide-react';
import { Banner, Button, Card, CardHeader, Checkbox, ConfirmDialog, DataTable, Modal, StatusPill, TextAreaField, TextField } from '../ui/index.js';
import { SAMPLE_NOTE } from './agreementText.js';
import { whenLabel } from './shrUtils.js';
import { cx, formatDateShort } from '../../utils/format.js';

const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

// Full agreement as an accordion. Each section: plain language line first, then clearly labelled sample clauses.
export function AgreementSections({ sections }) {
  const [open, setOpen] = useState(() => new Set([sections[0]?.id]));
  const all = open.size === sections.length;
  const toggle = (id) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <div className="stack">
      <div className="row between">
        <span className="chip" style={{ background: 'var(--yellow-100)', color: '#7a3e03' }}>Sample wording</span>
        <button type="button" className="link-btn small" onClick={() => setOpen(all ? new Set() : new Set(sections.map((s) => s.id)))}>{all ? 'Collapse all' : 'Expand all'}</button>
      </div>
      <p className="small muted">{SAMPLE_NOTE}</p>
      <div className="shr-acc">
        {sections.map((s) => {
          const isOpen = open.has(s.id);
          return (
            <div key={s.id} className={cx('shr-acc__item', isOpen && 'shr-acc__item--open')}>
              <h3 className="shr-acc__head">
                <button type="button" aria-expanded={isOpen} aria-controls={`sec-${s.id}`} onClick={() => toggle(s.id)}>
                  <span>{s.title}</span>
                  <ChevronDown size={18} />
                </button>
              </h3>
              {isOpen && (
                <div id={`sec-${s.id}`} className="shr-acc__body">
                  <p className="small strong green">In plain language: <span style={{ fontWeight: 500 }}>{s.plain}</span></p>
                  {s.clauses.map((cl, i) => (
                    <p key={i} className="shr-clause"><span className="shr-clause__tag">Sample text</span>{cl}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Signing, or accepting an amendment. Typed full name, consent tick, then ConfirmDialog before anything is saved.
export function SigningPanel({ mode = 'sign', signerName, contract, versionLabel, summary, onConfirm }) {
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const verb = mode === 'sign' ? 'Sign' : 'Accept';

  const review = () => {
    const e = {};
    if (!name.trim()) e.name = 'Type your full name to sign.';
    else if (norm(name) !== norm(signerName)) e.name = `The name must match your account exactly: ${signerName}.`;
    if (!consent) e.consent = 'You must tick the box to confirm you have read and agree.';
    setErrors(e);
    if (!Object.keys(e).length) setConfirm(true);
  };
  const go = async () => {
    setBusy(true);
    await onConfirm(name.trim());
    setBusy(false);
    setConfirm(false);
  };

  return (
    <Card tone="green" className="shr-sign">
      <CardHeader title={mode === 'sign' ? 'Sign this agreement' : `Accept amendment ${versionLabel}`} subtitle={mode === 'sign' ? 'Your typed name and the time are saved with this version.' : 'The earlier version stays in the history. Nothing is overwritten.'} />
      <div className="stack">
        <TextField label="Type your full name" required value={name} onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: undefined })); }} error={errors.name} placeholder={signerName} autoComplete="off" />
        <Checkbox checked={consent} onChange={(v) => { setConsent(v); setErrors((x) => ({ ...x, consent: undefined })); }} error={errors.consent}>
          I have read the plain language summary and the full agreement. I understand the funding model, the risks and that no return is guaranteed, and I agree to {verb.toLowerCase()} version {versionLabel}.
        </Checkbox>
        <Button onClick={review}><FileSignature size={18} />{verb} version {versionLabel}</Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={go}
        loading={busy}
        tone="green"
        title={`${verb} ${contract.title}?`}
        message="Please check these details. Once signed, this version cannot be edited. A later change creates a new version."
        summary={summary}
        confirmLabel={`${verb} now`}
      />
    </Card>
  );
}

// History is append only. Each row is a version. Signature time is read from `signatures` or the current signature.
export function VersionTable({ contract }) {
  const sigs = contract.signatures || [];
  const rows = [...(contract.history || [])].map((h, i) => {
    const sig = [...sigs].reverse().find((s) => s.version === h.version) || (h.version === contract.version && contract.signedAt && !h.status ? { at: contract.signedAt, by: contract.signatory } : null);
    const isCurrent = h.version === contract.version && !h.status?.startsWith('Awaiting');
    return { ...h, key: `${h.version}-${i}`, sig, isCurrent };
  }).reverse();
  const columns = [
    { key: 'version', header: 'Version', render: (r) => <span className="strong">{r.version}</span> },
    { key: 'date', header: 'Date', className: 'nowrap', render: (r) => formatDateShort(r.date) },
    { key: 'change', header: 'Change', render: (r) => r.change },
    { key: 'state', header: 'State', render: (r) => (r.status ? <StatusPill tone={r.status.startsWith('Awaiting') ? 'amber' : 'green'}>{r.status}</StatusPill> : r.isCurrent ? <StatusPill tone="green">Current</StatusPill> : <StatusPill tone="gray">Earlier version</StatusPill>) },
    { key: 'sig', header: 'Signed or accepted', render: (r) => (r.sig ? (<div><div>{whenLabel(r.sig.at)}</div><div className="cell-sub">{r.sig.by}</div></div>) : <span className="muted">-</span>) },
  ];
  return <DataTable bare hideFooter columns={columns} rows={rows} rowKey="key" pageSize={50} />;
}

// Admin: read only agreement, note panel, reminder, amendment proposal.
export function AdminPanel({ contract, onNote, onRemind, onAmend, nextVersion }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [amend, setAmend] = useState(false);
  const [change, setChange] = useState('');
  const [cError, setCError] = useState('');
  const signed = contract.status === 'Signed';

  const saveNote = async () => {
    if (note.trim().length < 5) { setError('Write a short note first.'); return; }
    setBusy('note'); await onNote(note.trim()); setBusy(''); setNote(''); setError('');
  };
  const remind = async () => { setBusy('remind'); await onRemind(); setBusy(''); };
  const submitAmend = async () => {
    if (change.trim().length < 10) { setCError('Describe the change in at least 10 characters.'); return; }
    setBusy('amend'); await onAmend(change.trim()); setBusy(''); setAmend(false); setChange(''); setCError('');
  };

  return (
    <Card>
      <CardHeader title="Administrator panel" subtitle="This agreement is read only for administrators." />
      <div className="stack">
        <div className="shr-admin-block" style={{ borderTop: 0, paddingTop: 0 }}>
          <h3><Send size={18} /> Signing reminder</h3>
          <p className="small muted">{signed ? 'This version is already signed, so no reminder is needed.' : `Sends an in-app reminder to the ${contract.partyType.toLowerCase()} and the cooperative. The reminder is recorded in the audit log.`}</p>
          <div><Button variant="outline-green" onClick={remind} loading={busy === 'remind'} disabled={signed}>Send signing reminder</Button></div>
        </div>
        <div className="shr-admin-block">
          <h3><StickyNote size={18} /> Admin note</h3>
          <TextAreaField label="Internal note" value={note} onChange={(e) => { setNote(e.target.value); setError(''); }} error={error} rows={3} hint="Only administrators can read notes." />
          <div><Button onClick={saveNote} loading={busy === 'note'}>Save note</Button></div>
          {(contract.adminNotes || []).length > 0 && (
            <ul className="shr-notes">
              {[...contract.adminNotes].reverse().map((n, i) => <li key={i}><span>{n.text}</span><span className="caption muted">{n.by} &middot; {whenLabel(n.at)}</span></li>)}
            </ul>
          )}
        </div>
        <div className="shr-admin-block">
          <h3><GitBranchPlus size={18} /> Propose an amendment</h3>
          <p className="small muted">An amendment creates a new version ({nextVersion}). The party must read and accept it. The current version stays in the history.</p>
          <div><Button variant="outline" onClick={() => setAmend(true)} disabled={!!contract.pendingAmendment}>{contract.pendingAmendment ? 'Amendment already proposed' : 'Propose amendment'}</Button></div>
        </div>
      </div>
      <Modal open={amend} onClose={() => setAmend(false)} title={`Propose version ${nextVersion}`} footer={(<><Button variant="outline" block onClick={() => setAmend(false)}>Cancel</Button><Button block onClick={submitAmend} loading={busy === 'amend'}>Send for acceptance</Button></>)}>
        <TextAreaField label="What changes in the new version?" required value={change} onChange={(e) => { setChange(e.target.value); setCError(''); }} error={cError} rows={4} />
      </Modal>
    </Card>
  );
}

export function PendingAmendmentBanner({ amendment, canAccept }) {
  return (
    <Banner tone="warn" title={`Amendment ${amendment.version} is waiting for acceptance`}>
      {amendment.change} Proposed by {amendment.proposedBy} on {whenLabel(amendment.proposedAt)}. {canAccept ? 'Read it, then accept it below.' : 'The signing party has been asked to accept it.'}
    </Banner>
  );
}
