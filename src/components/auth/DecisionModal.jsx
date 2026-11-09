import { useState } from 'react';
import { Modal, Button, TextAreaField, Banner } from '../ui/index.js';

const COPY = {
  review: { title: 'Start the review', tone: 'primary', confirm: 'Start review', needsNote: false, label: 'Reviewer note', optionalNote: true, intro: 'This moves the registration to Under Review.' },
  approve: { title: 'Approve this registration', tone: 'primary', confirm: 'Approve', needsNote: false, label: 'Reviewer note', optionalNote: true, intro: 'This marks the organisation as Verified and, for a cooperative, marks its documents as Verified.' },
  info: { title: 'Request more information', tone: 'primary', confirm: 'Send request', needsNote: true, label: 'What is needed?', placeholder: 'For example: please upload a clearer copy of the proof of address.', intro: 'The person sees your note and can update and resubmit.' },
  reject: { title: 'Reject this registration', tone: 'danger', confirm: 'Reject', needsNote: true, label: 'Reason for rejection', placeholder: 'Explain what was wrong with the information received.', intro: 'The person sees this reason. A rejection is about the information received, not a judgement of the person.' },
};

// Used only by the clearly labelled demo box on the status page.
export default function DecisionModal({ open, mode, onClose, onConfirm, loading, orgName }) {
  if (!open || !mode) return null;
  return <DecisionBody mode={mode} onClose={onClose} onConfirm={onConfirm} loading={loading} orgName={orgName} />;
}

function DecisionBody({ mode, onClose, onConfirm, loading, orgName }) {
  const c = COPY[mode];
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (c.needsNote && note.trim().length < 10) { setError('Write at least a short sentence (10 characters or more) so the person knows what to do.'); return; }
    onConfirm(note.trim());
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={c.title}
      white
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={c.tone === 'danger' ? 'danger' : 'primary'} onClick={submit} loading={loading}>{c.confirm}</Button>
        </>
      )}
    >
      <div className="stack">
        <Banner tone="warn" title="Demo only">This simulates an administrator decision for {orgName}. Nothing is sent to a real reviewer.</Banner>
        <p className="small muted">{c.intro}</p>
        {(c.needsNote || c.optionalNote) && (
          <TextAreaField
            label={c.label}
            required={c.needsNote}
            optional={!c.needsNote}
            placeholder={c.placeholder}
            value={note}
            error={error}
            onChange={(e) => { setNote(e.target.value); setError(''); }}
          />
        )}
      </div>
    </Modal>
  );
}
