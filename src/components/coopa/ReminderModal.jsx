import { useEffect, useMemo, useState } from 'react';
import { Button, Modal, SelectField, TextAreaField } from '../ui/index.js';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { useStableCallback } from './helpers.js';

// Reminder topics. Each one sends the farmer a notification that links to the page where they can act.
const topics = (farmer) => [
  { id: 'identity', label: 'Complete identity verification', show: farmer.identityStatus !== 'Verified', title: 'Please complete your identity verification', body: 'Your cooperative asks you to finish identity verification so you can join funded projects.', link: '/farmer/profile', type: 'verification' },
  { id: 'agreement', label: 'Sign your participation agreement', show: farmer.agreementStatus !== 'Signed', title: 'Your participation agreement needs your signature', body: 'Please read and sign your Farmer Participation Agreement. You will get a copy in a language you choose.', link: '/farmer/agreement', type: 'contract' },
  { id: 'consent', label: 'Confirm consent to data use', show: !farmer.consent, title: 'Please confirm your consent', body: 'Your cooperative needs your consent to use your details for verification and funded projects.', link: '/farmer/profile', type: 'verification' },
  { id: 'general', label: 'General reminder from the cooperative', show: true, title: 'A reminder from your cooperative', body: 'Your cooperative has sent you a reminder. Please check your dashboard for open activities.', link: '/farmer', type: 'info' },
];

export function ReminderModal({ farmer, open, onClose, coop }) {
  const { notify, audit, toast } = useApp();
  const options = useMemo(() => (farmer ? topics(farmer).filter((t) => t.show) : []), [farmer]);
  const [topic, setTopic] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const close = useStableCallback(() => { if (!busy) onClose?.(); });

  useEffect(() => { if (open) { setTopic(options[0]?.id || 'general'); setNote(''); setBusy(false); } }, [open, options]);

  if (!farmer) return null;
  const chosen = options.find((t) => t.id === topic) || options[0];

  const send = async () => {
    setBusy(true);
    await simulate(500);
    const extra = note.trim() ? ` Note from ${coop.name}: ${note.trim()}` : '';
    notify('farmer', chosen.title, `${chosen.body}${extra}`, chosen.link, chosen.type);
    audit({ action: 'Reminder sent to farmer', entityType: 'Farmer', entityId: farmer.id, summary: `${chosen.label} (in-app notification)`, reason: 'Cooperative follow-up' });
    toast(`Reminder sent to ${farmer.name}.`, 'success');
    setBusy(false);
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Send reminder"
      white
      footer={(
        <>
          <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
          <Button onClick={send} loading={busy}>Send reminder</Button>
        </>
      )}
    >
      <div className="stack">
        <p className="small muted">The reminder appears in {farmer.name}'s notifications. It never includes identity numbers or payment details.</p>
        <SelectField label="What should the farmer do?" required options={options.map((o) => ({ value: o.id, label: o.label }))} value={topic} onChange={(e) => setTopic(e.target.value)} />
        <TextAreaField label="Add a short note" optional rows={3} maxLength={240} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: please do this before Friday" />
      </div>
    </Modal>
  );
}
