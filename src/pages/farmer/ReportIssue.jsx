import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquareWarning, Send, CheckCircle2, Copy, ListChecks, ArrowRight, AlertCircle } from 'lucide-react';
import { Card, CardHeader, PageHeader, Banner, Button, LinkButton, SelectField, TextAreaField, FileDrop, EmptyState } from '../../components/ui/index.js';
import { useApp, simulate, newId, useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatDate } from '../../utils/format.js';
import { useFarmerCtx, isoNow } from '../../components/farm/farmerData.js';
import { farmerGate, StatusChip, ItemCard, Explain } from '../../components/farm/FarmUi.jsx';
import '../../styles/pages/farm.css';

// Category values match the labels used by the seed complaints (for example "Delayed support").
const CATEGORIES = [
  { value: 'Payment', label: 'Payment', hint: 'Money you were told about did not arrive, or the amount looks wrong.' },
  { value: 'Input delivery', label: 'Input delivery', hint: 'Seeds, fertiliser or tools did not arrive, or were wrong or damaged.' },
  { value: 'Delayed support', label: 'Delay (something is late)', hint: 'Help, money or a visit is later than you were told.' },
  { value: 'Dispute', label: 'Dispute (I disagree)', hint: 'You disagree with a decision, a record or a number.' },
  { value: 'Suspected misuse', label: 'Suspected misuse', hint: 'You think project money or inputs are being misused. This goes to CollabFarm support first, not to your cooperative.' },
  { value: 'Other', label: 'Other', hint: 'Anything else you want us to know.' },
];

export default function ReportIssue() {
  const loading = useSimulatedLoad(350);
  const ctx = useFarmerCtx();
  const gate = farmerGate(ctx, loading);
  if (gate) return gate;
  return <ReportIssueContent ctx={ctx} />;
}

function shorten(text, n = 60) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 20 ? cut.lastIndexOf(' ') : n)}...`;
}

function ReportIssueContent({ ctx }) {
  const { data, user, add, update, notify, toast } = useApp();
  const { farmer, name, pkg, inputs, payments } = ctx;
  const [params] = useSearchParams();

  const [category, setCategory] = useState('Payment');
  const [pkgId, setPkgId] = useState(pkg?.id || '');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [direct, setDirect] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(null);
  const [about, setAbout] = useState({ input: '', payment: '' });

  // Prefill from links such as "Report a problem with this delivery".
  const query = params.toString();
  useEffect(() => {
    const cat = params.get('category');
    const text = params.get('about');
    if (cat && CATEGORIES.some((c) => c.value === cat)) setCategory(cat);
    if (text) setDescription(`About: ${text}\n\nWhat went wrong: `);
    const inputId = params.get('input') || '';
    const paymentId = params.get('payment') || '';
    setAbout({ input: inputId, payment: paymentId });
    const pay = payments.find((p) => p.id === paymentId);
    const inp = inputs.find((i) => i.id === inputId);
    const linked = pay?.packageId || inp?.packageId;
    if (linked) setPkgId(linked);
    if (cat || text) { setSent(null); setErrors({}); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const pkgOptions = useMemo(() => {
    const ids = [...new Set([pkg?.id, ...payments.map((p) => p.packageId), ...inputs.map((i) => i.packageId)].filter(Boolean))];
    return [{ value: '', label: 'Not about one project' }, ...ids.map((id) => ({ value: id, label: data.packages.find((p) => p.id === id)?.name || id }))];
  }, [data.packages, pkg, payments, inputs]);

  const cat = CATEGORIES.find((c) => c.value === category);
  const misuse = category === 'Suspected misuse';
  const sendDirect = direct || misuse;

  const myReports = useMemo(() => data.complaints
    .filter((c) => c.submitterId === user.id || (c.role === 'farmer' && c.submittedBy === name))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), [data.complaints, user.id, name]);

  const submit = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (description.trim().length < 15) e.description = 'Please tell us a little more. Write at least 15 letters so we can understand.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    await simulate(700);
    const now = isoNow();
    const serial = Math.max(0, ...data.complaints.map((c) => Number((/(\d+)$/.exec(c.ref || '') || [])[1] || 0))) + 1;
    const ref = `CMP-2026-${String(serial).padStart(4, '0')}`;
    const written = description.includes('What went wrong:') ? description.split('What went wrong:').slice(1).join(' ').trim() : '';
    const core = written.length >= 5 ? written : description.replace(/^About:\s*/i, '');
    const subject = `${cat.label.replace(/ \(.*\)$/, '')}: ${shorten(core)}`;
    const cooperativeAllowed = !sendDirect;
    const rec = add('complaints', {
      id: newId('cmp'),
      ref,
      subject,
      description: description.trim(),
      submittedBy: name,
      submitterId: user.id,
      farmerId: farmer.id,
      coopId: farmer.coopId,
      role: 'farmer',
      packageId: pkgId || null,
      category,
      status: 'Open',
      assignee: 'Unassigned',
      createdAt: now,
      updatedAt: now,
      evidence: files.map((f) => f.name),
      directToSupport: sendDirect,
      visibleToCooperative: cooperativeAllowed,
      actions: [{ at: now.slice(0, 10), by: name, text: sendDirect ? 'Report submitted by the farmer and sent directly to CollabFarm support.' : 'Report submitted by the farmer.' }],
      outcome: '',
    }, { action: 'Submitted complaint', entityType: 'Complaint', summary: `New complaint ${ref}`, reason: subject });

    if (about.input) update('inputRecords', about.input, { problemReported: true, complaintRef: ref }, { action: 'Farmer reported a delivery problem', entityType: 'Input record', summary: `Linked to complaint ${ref}`, reason: 'Farmer report' });
    if (about.payment) update('disbursements', about.payment, { problemReported: true, complaintRef: ref }, { action: 'Farmer reported a payment problem', entityType: 'Disbursement', summary: `Linked to complaint ${ref}`, reason: 'Farmer report' });

    notify('admin', 'New report from a farmer', `${name} sent a report: ${subject} (${ref}).`, `/admin/complaints/${rec.id}`, 'complaint');
    if (cooperativeAllowed) notify('cooperative', 'A farmer raised an issue', `${name} sent a report: ${subject} (${ref}).`, `/coop/complaints/${rec.id}`, 'complaint');
    setSaving(false);
    setSent(rec);
    setDescription('');
    setFiles([]);
    setDirect(false);
    toast(`Report sent. Your reference is ${ref}.`);
  };

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(sent.ref);
      toast('Reference copied.');
    } catch {
      toast(`Your reference is ${sent.ref}. Please write it down.`, 'info');
    }
  };

  return (
    <div className="page farm-page">
      <PageHeader title="Report an Issue" subtitle="Tell us if something is wrong. We will look into it." />

      <Banner tone="green" title="You will not get in trouble for reporting">
        A report is not an accusation. Everyone involved gets a fair chance to respond, and nobody is named in public.
      </Banner>

      {sent ? (
        <Card className="farm-sent" aria-live="polite">
          <span className="farm-sent__icon" aria-hidden="true"><CheckCircle2 size={36} /></span>
          <h2>Your report was sent</h2>
          <p className="muted">Please keep this number. You can use it when you call or visit your cooperative.</p>
          <p className="farm-ref" aria-label={`Reference number ${sent.ref}`}>{sent.ref}</p>
          <div className="farm-actions farm-actions--center">
            <Button variant="outline-green" className="farm-btn" onClick={copyRef}><Copy size={18} />Copy number</Button>
            <LinkButton to={`/farmer/complaints/${sent.id}`} className="farm-btn">See my report<ArrowRight size={18} /></LinkButton>
          </div>
          <ol className="farm-steps">
            <li>CollabFarm support reads your report{sent.visibleToCooperative ? ' and your cooperative is told' : '. Your cooperative is not told'}.</li>
            <li>We may ask you for more information. Watch your messages.</li>
            <li>You can follow every step below, under My reports.</li>
          </ol>
          <Button variant="outline" className="farm-btn" onClick={() => setSent(null)}>Report another issue</Button>
        </Card>
      ) : (
        <Card>
          <CardHeader title="What happened?" subtitle="Fill in the form. It takes about two minutes." />
          <form onSubmit={submit} noValidate className="stack-lg">
            <div className="stack-sm">
              <SelectField label="What is it about?" required value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORIES} />
              <Explain>{cat.hint}</Explain>
            </div>
            <SelectField label="Which project?" value={pkgId} onChange={(e) => setPkgId(e.target.value)} options={pkgOptions} hint="Choose the project this is about, if there is one." />
            <TextAreaField
              label="Tell us what happened"
              required
              value={description}
              onChange={(e) => { setDescription(e.target.value); setErrors((s) => ({ ...s, description: undefined })); }}
              placeholder="What happened? When? Who was involved?"
              error={errors.description}
              rows={6}
            />
            <FileDrop label="Proof (optional)" multiple files={files} onFiles={setFiles} accept="Photo or PDF, up to 5MB. Files stay on this device in this demo." prompt="Tap to add a photo or paper" />
            <div className="stack-sm">
              <label className="check farm-check">
                <input type="checkbox" checked={sendDirect} disabled={misuse} onChange={(e) => setDirect(e.target.checked)} />
                <span>Send directly to CollabFarm support instead of my cooperative</span>
              </label>
              <p className="field__hint">
                {misuse ? 'Reports about suspected misuse always go to CollabFarm support first.' : 'Choose this if you do not want your cooperative to see your report.'} Your name is always shared with CollabFarm support so we can reply to you. Anonymous reports are not offered.
              </p>
            </div>
            <div className="farm-actions">
              <Button type="submit" size="lg" className="farm-btn" loading={saving}><Send size={18} />Send my report</Button>
            </div>
          </form>
        </Card>
      )}

      <section id="my-reports" className="stack farm-scroll-target" aria-labelledby="mine-title">
        <h2 id="mine-title" className="farm-section-title"><ListChecks size={22} aria-hidden="true" />My reports</h2>
        {myReports.length === 0 ? (
          <Card><EmptyState icon={<MessageSquareWarning size={28} />} title="You have not sent any reports">If you report something, you can follow it here.</EmptyState></Card>
        ) : (
          <ul className="farm-list">
            {myReports.map((c) => (
              <ItemCard
                key={c.id}
                icon={<AlertCircle size={22} />}
                title={c.subject}
                meta={`${c.ref}. ${c.category}. Sent ${formatDate(c.createdAt)}`}
                chip={<StatusChip>{c.status}</StatusChip>}
                actions={<LinkButton to={`/farmer/complaints/${c.id}`} variant="outline-green" className="farm-btn">Open report<ArrowRight size={18} /></LinkButton>}
              >
                {c.actions?.length > 0 && <p className="small muted">Latest update: {c.actions[c.actions.length - 1].text}</p>}
              </ItemCard>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
