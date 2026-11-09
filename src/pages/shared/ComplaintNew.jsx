import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, ListChecks } from 'lucide-react';
import '../../styles/pages/shr.css';
import { useApp, simulate, newId } from '../../context/AppContext.jsx';
import { Banner, Breadcrumb, Button, Card, Checkbox, FileDrop, PageHeader, SelectField, TextAreaField, TextField, Timeline } from '../../components/ui/index.js';
import { COMPLAINT_CATEGORIES, baseFor, isoNow, nextComplaintRef, visiblePackages } from '../../components/shr/shrUtils.js';

const NEXT_STEPS = [
  { title: 'You get a reference', meta: 'Right after you send it', state: 'done' },
  { title: 'A reviewer is assigned', meta: 'Usually within 2 working days', state: 'active' },
  { title: 'You may be asked for more information', meta: 'You can reply on the complaint page' },
  { title: 'An outcome and explanation are recorded', meta: 'You can appeal if you disagree' },
];

export default function ComplaintNew() {
  const { data, user, role, add, notify, toast } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const base = baseFor(role);
  const packages = useMemo(() => visiblePackages(data, user), [data, user]);
  const formRef = useRef(null);

  const [form, setForm] = useState(() => {
    const pid = params.get('packageId') || '';
    const cat = params.get('category') || '';
    return {
      subject: params.get('subject') || '',
      category: COMPLAINT_CATEGORIES.includes(cat) ? cat : '',
      packageId: packages.some((p) => p.id === pid) ? pid : '',
      description: '',
      confirm: false,
    };
  });
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    const value = e && e.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (form.subject.trim().length < 5) e.subject = 'Enter a short subject of at least 5 characters.';
    if (!form.category) e.category = 'Choose the category that fits best.';
    if (form.description.trim().length < 20) e.description = 'Describe what happened in at least 20 characters. Include dates and names where you can.';
    if (!form.confirm) e.confirm = 'Please confirm that you understand how complaints are handled.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      formRef.current?.querySelector('[aria-invalid="true"], [role="alert"]')?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      return;
    }
    const id = newId('cmp');
    const ref = nextComplaintRef(data);
    const now = isoNow();
    setSaving(true);
    await simulate(600);
    add('complaints', {
      id, ref, subject: form.subject.trim(), description: form.description.trim(), category: form.category, packageId: form.packageId || '',
      submittedBy: user.name, submittedById: user.id, role: user.role, status: 'Open', assignee: 'Unassigned', createdAt: now, updatedAt: now,
      actions: [{ at: now, by: user.name, text: 'Complaint received' }], outcome: '', evidence: files.map((f) => ({ name: f.name, size: f.size })),
    }, { action: 'Submitted complaint', entityType: 'Complaint', reason: form.subject.trim(), summary: `New complaint ${ref}, category ${form.category}` });
    notify('admin', `New complaint ${ref}`, `${form.subject.trim()} (${form.category}) was raised by ${user.name}.`, `/admin/complaints/${id}`, 'complaint');
    setSaving(false);
    toast(`Complaint ${ref} received. A reviewer will be assigned.`);
    navigate(`${base}/complaints/${id}`);
  };

  return (
    <div className="page shr-page">
      <Breadcrumb items={[{ label: 'Complaints', to: `${base}/complaints` }, { label: 'Raise a complaint' }]} />
      <PageHeader title="Raise a complaint" subtitle="Tell us what went wrong. We will review it fairly and keep you updated." />

      <div className="grid-main">
        <form ref={formRef} onSubmit={submit} noValidate className="stack-lg">
          <Card>
            <div className="form-grid">
              <TextField className="full" label="Subject" required value={form.subject} onChange={set('subject')} error={errors.subject} placeholder="For example: Input delivery is late" maxLength={120} />
              <SelectField label="Category" required value={form.category} onChange={set('category')} error={errors.category} options={COMPLAINT_CATEGORIES} placeholder="Choose a category" />
              <SelectField
                label="Related package"
                optional
                value={form.packageId}
                onChange={set('packageId')}
                options={packages.map((p) => ({ value: p.id, label: `${p.name} (${p.status})` }))}
                placeholder="Not about a specific package"
                hint={packages.length ? 'Only packages you are connected to are listed.' : 'You are not connected to a package yet, so none are listed.'}
              />
              <TextAreaField className="full" label="What happened?" required value={form.description} onChange={set('description')} error={errors.description} rows={6} placeholder="Say what happened, when, and who was involved. Stick to facts you know." hint={`${form.description.trim().length} characters. Do not include passwords or ID numbers.`} />
              <div className="full">
                <FileDrop label="Evidence (optional)" multiple files={files} onFiles={setFiles} accept="Photos, receipts or PDFs (Max 5MB each). Files stay on your device in this demo." prompt="Add evidence if you have it" />
              </div>
            </div>
          </Card>

          <Card>
            <Checkbox checked={form.confirm} onChange={(v) => { setForm((f) => ({ ...f, confirm: v })); if (errors.confirm) setErrors((x) => ({ ...x, confirm: undefined })); }} error={errors.confirm}>
              I understand that a complaint is a request for review. It is not a public accusation, and nobody is penalised only because a complaint was raised. A genuine crop failure is not fraud.
            </Checkbox>
            <div className="row-wrap mt-4">
              <Button type="submit" loading={saving}><Send size={18} />Submit complaint</Button>
              <Button variant="outline" onClick={() => navigate(`${base}/complaints`)} disabled={saving}>Cancel</Button>
            </div>
          </Card>
        </form>

        <aside className="stack">
          <Card>
            <h2 className="card__title" style={{ marginBottom: 12 }}><ListChecks size={18} style={{ verticalAlign: '-3px', marginRight: 8 }} />What happens next</h2>
            <Timeline items={NEXT_STEPS} />
          </Card>
          <Banner tone="green" title="Handled privately">
            Only you, the people directly involved and CollabFarm reviewers can see your complaint. Reviewers record every action with their name and the time.
          </Banner>
        </aside>
      </div>
    </div>
  );
}
