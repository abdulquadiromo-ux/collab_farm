import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, ChevronDown, Clock, FileText, Flag, LineChart, Mail, Phone, ShieldCheck, Sprout, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { Banner, Button, Card, CardHeader, EmptyState, SelectField, TextAreaField, TextField } from '../ui/index.js';
import { HOURS, REMEMBER, SUPPORT } from './helpContent.js';
import { validEmail } from './shrUtils.js';
import { cx } from '../../utils/format.js';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';

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
const SUPPORT_TOPICS = ['ACCOUNT', 'INVESTMENTS', 'PACKAGES', 'PAYMENTS', 'FARMERS', 'TECHNICAL', 'OTHER'];
const displayTopic = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function topicOption(item) {
  if (typeof item === 'string') return { value: item.toUpperCase(), label: displayTopic(item) };
  const value = item?.value || item?.key || item?.name || item?.topic || item?.code || item?.property1;
  return value ? { value: String(value).toUpperCase(), label: item.label || item.title || item.property2 || displayTopic(value) } : null;
}

export function ContactForm() {
  const { user, role, accessToken, toast } = useApp();
  const [topics, setTopics] = useState(SUPPORT_TOPICS.map((value) => ({ value, label: displayTopic(value) })));
  const [f, setF] = useState({ ...EMPTY, replyTo: user.email || '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  useEffect(() => {
    if (!accessToken) return undefined;
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/support/topics`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal })
      .then(async (response) => { const payload = await response.json().catch(() => null); if (!response.ok) throw new Error('Support topics unavailable'); return payload; })
      .then((payload) => { const options = Array.isArray(payload) ? payload.map(topicOption).filter(Boolean) : []; if (options.length) setTopics(options); })
      .catch(() => {});
    return () => controller.abort();
  }, [accessToken]);

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.topic) er.topic = 'Choose what your question is about.';
    if (f.subject.trim().length < 2 || f.subject.trim().length > 160) er.subject = 'Subject must be between 2 and 160 characters.';
    if (f.message.trim().length < 1 || f.message.trim().length > 1000) er.message = 'Message must be between 1 and 1,000 characters.';
    if (!validEmail(f.replyTo)) er.replyTo = 'Enter a valid email address, for example name@example.com.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    setRequestError(''); setSuccessMessage('');
    try {
      if (!accessToken) throw new Error('Your session has expired. Sign in again to contact support.');
      const response = await fetch(`${API_BASE_URL}/support/contact`, {
        method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: f.topic, subject: f.subject.trim(), message: f.message.trim(), reply_to: f.replyTo.trim() }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not send your support request (${response.status}).`));
      const message = payload?.message || 'Your message was sent to the support team.';
      setSuccessMessage(message); toast(message, 'success'); setF({ ...EMPTY, replyTo: user.email || '' });
    } catch (error) { setRequestError(error.message || 'Could not send your support request.'); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader title="Contact support" subtitle={role === 'farmer' ? 'Write to us and we will reply by email or call you.' : 'Send a question to the support team. Please do not include passwords or ID numbers.'} />
      {requestError && <Banner tone="danger" title="Support request not sent" className="shr-mb">{requestError}</Banner>}
      {successMessage && <Banner tone="success" title="Message sent" className="shr-mb">{successMessage}</Banner>}
      <form className="stack" onSubmit={submit} noValidate>
        <SelectField label="What is it about?" required value={f.topic} onChange={set('topic')} options={topics} placeholder="Choose a topic" error={errors.topic} />
        <TextField label="Subject" required value={f.subject} onChange={set('subject')} error={errors.subject} placeholder="A few words" maxLength={160} />
        <TextAreaField label="Your message" required value={f.message} onChange={set('message')} error={errors.message} placeholder="Tell us what happened and what you need" rows={5} maxLength={1000} hint={`${f.message.length} of 1000 characters`} />
        <TextField label="Reply to" required value={f.replyTo} onChange={set('replyTo')} error={errors.replyTo} type="email" autoComplete="off" />
        <Button type="submit" loading={busy} block>Send request</Button>
      </form>

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
