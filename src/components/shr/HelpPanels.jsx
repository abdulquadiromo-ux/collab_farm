import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, ChevronDown, Clock, FileText, Flag, LineChart, Mail, Phone, ShieldCheck, Sprout, Wallet } from 'lucide-react';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { Banner, Button, Card, CardHeader, EmptyState, SelectField, StatusPill, TextAreaField, TextField } from '../ui/index.js';
import { HOURS, REMEMBER, SUPPORT, TOPICS } from './helpContent.js';
import { isoNow, mergeUserPrefs, userPrefs, validEmail, whenLabel } from './shrUtils.js';
import { cx, makeRef } from '../../utils/format.js';

const ICONS = { wallet: Wallet, flag: Flag, file: FileText, sprout: Sprout, shield: ShieldCheck, chart: LineChart };

export function QuickLinks({ links, base }) {
  return (
    <div className="shr-helplinks">
      {links.map((l) => {
        const Icon = ICONS[l.icon] || BookOpen;
        return (
          <Link key={l.to} to={`${base}${l.to}`} className="shr-tile">
            <span className="shr-ico shr-ico--green"><Icon size={22} /></span>
            <span className="shr-tile__title">{l.label}</span>
            <span className="small muted">{l.hint}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function RememberStrip() {
  return (
    <Card tone="tint" aria-label="Three things to remember">
      <CardHeader title="Three things to remember" subtitle="These rules apply everywhere on the platform." />
      <ul className="shr-remember">
        {REMEMBER.map((r) => (
          <li key={r.title}><CheckCircle2 size={18} /><div><div className="strong small">{r.title}</div><div className="small muted">{r.text}</div></div></li>
        ))}
      </ul>
    </Card>
  );
}

// Accordion used for both the FAQ and the glossary. items: [{ id, title, tag?, body, example? }]
export function Accordion({ items, idPrefix, emptyText }) {
  const [open, setOpen] = useState(() => new Set());
  const toggle = (id) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  if (!items.length) return <EmptyState title="No matches">{emptyText}</EmptyState>;
  return (
    <div className="shr-acc">
      {items.map((it) => {
        const isOpen = open.has(it.id);
        return (
          <div key={it.id} className={cx('shr-acc__item', isOpen && 'shr-acc__item--open')}>
            <h3 className="shr-acc__head">
              <button type="button" aria-expanded={isOpen} aria-controls={`${idPrefix}-${it.id}`} onClick={() => toggle(it.id)}>
                <span>{it.title}</span>
                <ChevronDown size={18} />
              </button>
            </h3>
            {isOpen && (
              <div id={`${idPrefix}-${it.id}`} className="shr-acc__body">
                <p>{it.body}</p>
                {it.example && <p className="small muted"><span className="strong">Example: </span>{it.example}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const EMPTY = { topic: '', subject: '', message: '', replyTo: '' };

export function ContactForm() {
  const { data, user, role, patchData, audit, toast } = useApp();
  const prefs = userPrefs(data, user.id);
  const tickets = prefs.supportTickets || [];
  const [f, setF] = useState({ ...EMPTY, replyTo: user.email || '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.topic) er.topic = 'Choose what your question is about.';
    if (f.subject.trim().length < 5) er.subject = 'Write a short subject of at least 5 characters.';
    if (f.message.trim().length < 20) er.message = 'Tell us a little more. Write at least 20 characters.';
    if (!validEmail(f.replyTo)) er.replyTo = 'Enter a valid email address, for example name@example.com.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    await simulate(700);
    const ref = makeRef('SUP', Date.now());
    const ticket = { ref, topic: f.topic, subject: f.subject.trim(), createdAt: isoNow(), status: 'Received' };
    patchData(mergeUserPrefs(user.id, { supportTickets: [ticket, ...tickets].slice(0, 5) }));
    audit({ action: 'Sent support request (simulated)', entityType: 'Support request', entityId: ref, reason: 'Question from the help page', summary: `${f.topic}. No message content is stored in the audit log.` });
    toast(`Request ${ref} recorded. Nothing was sent in this demo.`);
    setLast(ticket);
    setF({ ...EMPTY, replyTo: user.email || '' });
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader title="Contact support" subtitle={role === 'farmer' ? 'Write to us and we will reply by email or call you.' : 'Send a question to the support team. Please do not include passwords or ID numbers.'} />
      {last && (
        <Banner tone="success" title={`Request ${last.ref} recorded`} className="shr-mb">
          This is a simulated request. No email was sent and no one will reply in this demo. Keep the reference if you want to quote it.
        </Banner>
      )}
      <form className="stack" onSubmit={submit} noValidate>
        <SelectField label="What is it about?" required value={f.topic} onChange={set('topic')} options={TOPICS} placeholder="Choose a topic" error={errors.topic} />
        <TextField label="Subject" required value={f.subject} onChange={set('subject')} error={errors.subject} placeholder="A few words" maxLength={80} />
        <TextAreaField label="Your message" required value={f.message} onChange={set('message')} error={errors.message} placeholder="Tell us what happened and what you need" rows={5} maxLength={1000} hint={`${f.message.length} of 1000 characters`} />
        <TextField label="Reply to" required value={f.replyTo} onChange={set('replyTo')} error={errors.replyTo} type="email" autoComplete="off" />
        <Button type="submit" loading={busy} block>Send request</Button>
      </form>

      {tickets.length > 0 && (
        <div className="shr-tickets">
          <h3 className="shr-tickets__title">Your recent requests</h3>
          <ul>
            {tickets.map((t) => (
              <li key={t.ref}>
                <div><span className="strong small">{t.subject}</span><div className="caption muted">{t.ref} &middot; {t.topic} &middot; {whenLabel(t.createdAt)}</div></div>
                <StatusPill tone="gray">{t.status}</StatusPill>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function SupportHours() {
  return (
    <Card>
      <CardHeader title="Opening hours" subtitle="Placeholder times for this demo." />
      <ul className="shr-hours">
        {HOURS.map((h) => <li key={h.day}><Clock size={16} /><span>{h.day}</span><span className="strong">{h.time}</span></li>)}
      </ul>
      <div className="shr-contactlines">
        <div><Mail size={16} /><span>{SUPPORT.email}</span></div>
        <div><Phone size={16} /><span>{SUPPORT.phone}</span></div>
      </div>
      <p className="caption muted">{SUPPORT.note}</p>
    </Card>
  );
}
