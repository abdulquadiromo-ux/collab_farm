import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Copy, Mail, MapPin, Phone } from 'lucide-react';
import '../../styles/pages/pub.css';
import { simulate, useApp } from '../../context/AppContext.jsx';
import { Banner, Button, InfoList, SelectField, TextAreaField, TextField } from '../../components/ui/index.js';
import { formatDateTime, makeRef } from '../../utils/format.js';
import { useDocTitle } from '../../components/pub/hooks.js';
import { PubHero, PubSection } from '../../components/pub/PubChrome.jsx';
import { CONTACT_TOPICS } from '../../components/pub/content.jsx';

const EMAIL = 'support@collabfarm.example';
const PHONE = '+234 809 000 5566';
const MIN_MESSAGE = 20;
const MAX_MESSAGE = 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(v) {
  const e = {};
  if (v.name.trim().length < 2) e.name = 'Enter your full name so that we know who to reply to.';
  if (!v.email.trim()) e.email = 'Enter your email address so that we can reply.';
  else if (!EMAIL_RE.test(v.email.trim())) e.email = 'This email address looks incomplete. Use a format like name@example.com.';
  if (!v.topic) e.topic = 'Choose the topic that fits best. It helps us send your message to the right person.';
  const len = v.message.trim().length;
  if (len === 0) e.message = 'Write a short message describing what you need.';
  else if (len < MIN_MESSAGE) e.message = `Please add a little more detail. At least ${MIN_MESSAGE} characters helps us understand (you have ${len}).`;
  else if (len > MAX_MESSAGE) e.message = `This message is too long. Please keep it under ${MAX_MESSAGE} characters (you have ${len}).`;
  return e;
}

export default function Contact() {
  useDocTitle('Contact');
  const { user, toast } = useApp();
  const formRef = useRef(null);
  const cardRef = useRef(null);
  const [values, setValues] = useState({ name: user?.name || '', email: user?.email || '', topic: '', message: '' });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);

  const set = (key) => (e) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((er) => { const n = { ...er }; delete n[key]; return n; });
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) {
      requestAnimationFrame(() => {
        const first = formRef.current?.querySelector('[aria-invalid="true"]');
        if (!first) return;
        first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        first.focus({ preventScroll: true });
      });
      return;
    }
    setSending(true);
    await simulate(700);
    setSending(false);
    setSent({ ref: makeRef('MSG', Date.now()), topic: values.topic, email: values.email.trim(), at: new Date() });
    requestAnimationFrame(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    toast('Your message was recorded in this demo. Nothing was actually sent.', 'info');
  };

  const reset = () => {
    setSent(null);
    setValues({ name: user?.name || '', email: user?.email || '', topic: '', message: '' });
    setErrors({});
  };

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what} copied.`, 'success');
    } catch {
      toast(`Could not copy automatically. ${what}: ${text}`, 'info');
    }
  };

  return (
    <>
      <PubHero
        eyebrow="Contact and support"
        title="We are here to help"
        lead="Ask a question about registering, a project, a payment or your data. If something went wrong, use the complaints process so that it gets a reference and a reviewer."
        photo="explore-associations.jpg"
        theme="farmers"
      />

      <PubSection id="contact" tone="white" tight>
        <div className="pub-contact">
          <div ref={cardRef} className="card card--pad pub-contact__form">
            {sent ? (
              <div className="pub-success" role="status">
                <span className="pub-success__icon" aria-hidden="true"><CheckCircle2 size={34} /></span>
                <h2>Message received</h2>
                <p>Thank you. A member of the support team will reply to <strong>{sent.email}</strong>. Our reply time is to be confirmed.</p>
                <div className="pub-success__ref">
                  <span className="caption muted">Your reference</span>
                  <strong>{sent.ref}</strong>
                </div>
                <InfoList compact items={[['Topic', sent.topic], ['Sent', formatDateTime(sent.at)]]} />
                <Banner tone="warn" title="Demo only">This is a demonstration. Nothing was actually sent, and the reference is made up.</Banner>
                <div className="row-wrap" style={{ justifyContent: 'center' }}>
                  <Button variant="outline-green" onClick={reset}>Send another message</Button>
                  <Link to="/faq" className="btn btn--primary">Browse the FAQ</Link>
                </div>
              </div>
            ) : (
              <form ref={formRef} onSubmit={submit} noValidate aria-label="Contact form">
                <h2 className="pub-contact__h">Send us a message</h2>
                <Banner tone="info" className="pub-contact__demo">This form is a demonstration. Nothing is sent anywhere.</Banner>
                <div className="form-grid">
                  <TextField label="Full name" required autoComplete="name" value={values.name} onChange={set('name')} error={errors.name} placeholder="Your full name" />
                  <TextField label="Email address" required type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} placeholder="name@example.com" />
                  <SelectField className="full" label="Topic" required value={values.topic} onChange={set('topic')} error={errors.topic} placeholder="Choose a topic" options={CONTACT_TOPICS} />
                  {values.topic === 'Complaint or dispute' && (
                    <div className="full">
                      <Banner tone="green" title="Complaints have their own process">
                        A complaint gets a reference, a reviewer and a visible status. <Link to="/complaints-information" className="pub-link">See how complaints work<ArrowRight size={14} /></Link>
                      </Banner>
                    </div>
                  )}
                  <TextAreaField className="full" label="Message" required rows={6} value={values.message} onChange={set('message')} error={errors.message} placeholder="Tell us what you need. Please do not include passwords or identity numbers." hint={`${values.message.trim().length} of ${MAX_MESSAGE} characters`} />
                </div>
                <div className="pub-contact__submit">
                  <Button type="submit" loading={sending} size="lg">{sending ? 'Sending' : 'Send message'}</Button>
                  <span className="caption muted">We use your details only to reply. <Link to="/privacy" className="pub-link">Privacy notice</Link></span>
                </div>
              </form>
            )}
          </div>

          <aside className="pub-contact__side" aria-label="Support information">
            <div className="card card--pad">
              <h2 className="pub-contact__h">Support details</h2>
              <ul className="pub-contact__list">
                <li>
                  <Mail size={18} aria-hidden="true" />
                  <div><span className="caption muted">Email</span><strong className="pub-contact__email">support@<wbr />collabfarm.example</strong></div>
                  <button type="button" className="pub-copy" onClick={() => copy(EMAIL, 'Email address')} aria-label="Copy email address"><Copy size={16} /></button>
                </li>
                <li>
                  <Phone size={18} aria-hidden="true" />
                  <div><span className="caption muted">Phone (sample number)</span><strong>{PHONE}</strong></div>
                  <button type="button" className="pub-copy" onClick={() => copy(PHONE, 'Phone number')} aria-label="Copy phone number"><Copy size={16} /></button>
                </li>
                <li>
                  <Clock size={18} aria-hidden="true" />
                  <div><span className="caption muted">Support hours</span><strong>Monday to Friday, 8:00 AM to 5:00 PM</strong><span className="caption muted">Reply times are to be confirmed.</span></div>
                </li>
                <li>
                  <MapPin size={18} aria-hidden="true" />
                  <div><span className="caption muted">Office</span><strong>Abuja, Nigeria</strong><span className="caption muted">Street address to be confirmed.</span></div>
                </li>
              </ul>
            </div>

            <Banner tone="warn" title="Stay safe">
              CollabFarm staff will never ask for your password, a one-time code or your full identity number.
            </Banner>

            <div className="card card--pad">
              <h2 className="pub-contact__h">Other ways to get help</h2>
              <div className="pub-contact__links">
                <Link to="/faq" className="pub-link">Frequently asked questions<ArrowRight size={14} /></Link>
                <Link to="/complaints-information" className="pub-link">Complaints and dispute resolution<ArrowRight size={14} /></Link>
                <Link to="/how-it-works" className="pub-link">How the platform works<ArrowRight size={14} /></Link>
              </div>
            </div>
          </aside>
        </div>
      </PubSection>
    </>
  );
}
