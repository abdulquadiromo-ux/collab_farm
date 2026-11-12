import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, ListChecks } from 'lucide-react';
import '../../styles/pages/shr.css';
import { useApp } from '../../context/AppContext.jsx';
import { Banner, Breadcrumb, Button, Card, Checkbox, FileDrop, PageHeader, SelectField, TextAreaField, TextField, Timeline } from '../../components/ui/index.js';
import { baseFor } from '../../components/shr/shrUtils.js';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';

const CATEGORY_VALUES = ['PACKAGE', 'INVESTMENT', 'PAYMENT', 'DELIVERY', 'FARMER', 'OTHER'];
const display = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const categoryOption = (item) => {
  if (typeof item === 'string') return { value: item.toUpperCase(), label: display(item) };
  const value = item?.value || item?.key || item?.name || item?.category || item?.code;
  return value ? { value: String(value).toUpperCase(), label: item.label || item.title || display(value) } : null;
};

const NEXT_STEPS = [
  { title: 'You get a reference', meta: 'Right after you send it', state: 'done' },
  { title: 'A reviewer is assigned', meta: 'A reviewer will look into your complaint', state: 'active' },
  { title: 'You may be asked for more information', meta: 'You can reply on the complaint page' },
  { title: 'An outcome and explanation are recorded', meta: 'You can review the outcome' },
];

export default function ComplaintNew() {
  const { accessToken, role, toast } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const base = baseFor(role);
  const formRef = useRef(null);
  const [categories, setCategories] = useState(CATEGORY_VALUES.map((value) => ({ value, label: display(value) })));
  const [packages, setPackages] = useState([]);
  const [optionsError, setOptionsError] = useState('');
  const [form, setForm] = useState(() => ({ subject: params.get('subject') || '', category: CATEGORY_VALUES.includes((params.get('category') || '').toUpperCase()) ? params.get('category').toUpperCase() : '', packageId: params.get('packageId') || '', description: '', confirm: false }));
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const categoryValues = useMemo(() => categories.map((item) => item.value), [categories]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      if (!accessToken) { setOptionsError('Your session has expired. Sign in again to submit a complaint.'); return; }
      try {
        const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };
        const [categoryResponse, packageResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/complaints/categories`, { headers, signal: controller.signal }),
          fetch(`${API_BASE_URL}/complaints/packages`, { headers, signal: controller.signal }),
        ]);
        const [categoryPayload, packagePayload] = await Promise.all([categoryResponse.json().catch(() => null), packageResponse.json().catch(() => null)]);
        if (!categoryResponse.ok) throw new Error(apiErrorMessage(categoryPayload, `Could not load complaint categories (${categoryResponse.status}).`));
        if (!packageResponse.ok) throw new Error(apiErrorMessage(packagePayload, `Could not load related packages (${packageResponse.status}).`));
        const categoryOptions = Array.isArray(categoryPayload) ? categoryPayload.map(categoryOption).filter(Boolean) : [];
        if (categoryOptions.length) setCategories(categoryOptions);
        setPackages(Array.isArray(packagePayload) ? packagePayload : []);
      } catch (error) { if (error.name !== 'AbortError') setOptionsError(error.message || 'Could not load complaint form options.'); }
    };
    load(); return () => controller.abort();
  }, [accessToken]);

  const set = (key) => (event) => {
    const value = event?.target ? event.target.value : event;
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.subject.trim().length < 3 || form.subject.trim().length > 200) next.subject = 'Subject must be between 3 and 200 characters.';
    if (!categoryValues.includes(form.category)) next.category = 'Choose a complaint category.';
    if (form.description.trim().length < 10 || form.description.trim().length > 10000) next.description = 'Description must be between 10 and 10,000 characters.';
    if (!form.confirm) next.confirm = 'Please acknowledge the complaint process.';
    if (form.packageId && !packages.some((item) => item.id === form.packageId)) next.packageId = 'Choose a package from the available options.';
    return next;
  };

  const submit = async (event) => {
    event.preventDefault();
    const validation = validate(); setErrors(validation);
    if (Object.keys(validation).length) { formRef.current?.querySelector('[aria-invalid="true"], [role="alert"]')?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); return; }
    setSaving(true); setOptionsError('');
    try {
      if (!accessToken) throw new Error('Your session has expired. Sign in again to submit a complaint.');
      const body = new FormData();
      body.append('subject', form.subject.trim());
      body.append('category', form.category);
      body.append('description', form.description.trim());
      if (form.packageId) body.append('package_id', form.packageId);
      body.append('acknowledgment_accepted', String(form.confirm));
      files.forEach((entry) => { if (entry.file) body.append('evidence', entry.file, entry.file.name); });
      const response = await fetch(`${API_BASE_URL}/complaints`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, body });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not submit complaint (${response.status}).`));
      toast(`Complaint ${payload?.reference || ''} submitted successfully.`);
      navigate(payload?.id ? `${base}/complaints/${payload.id}` : `${base}/complaints`);
    } catch (error) { setOptionsError(error.message || 'Could not submit complaint.'); }
    finally { setSaving(false); }
  };

  return <div className="page shr-page">
    <Breadcrumb items={[{ label: 'Complaints', to: `${base}/complaints` }, { label: 'Raise a complaint' }]} />
    <PageHeader title="Raise a complaint" subtitle="Tell us what went wrong. We will review it fairly and keep you updated." />
    {optionsError && <Banner tone="warn" title="Complaint request needs attention">{optionsError}</Banner>}
    <div className="grid-main">
      <form ref={formRef} onSubmit={submit} noValidate className="stack-lg">
        <Card><div className="form-grid">
          <TextField className="full" label="Subject" required value={form.subject} onChange={set('subject')} error={errors.subject} placeholder="For example: Input delivery is late" maxLength={200} />
          <SelectField label="Category" required value={form.category} onChange={set('category')} error={errors.category} options={categories} placeholder="Choose a category" />
          <SelectField label="Related package" optional value={form.packageId} onChange={set('packageId')} error={errors.packageId} options={packages.map((item) => ({ value: item.id, label: item.title }))} placeholder="Not about a specific package" hint={packages.length ? 'Select a related package if applicable.' : 'No related package options are available.'} />
          <TextAreaField className="full" label="What happened?" required value={form.description} onChange={set('description')} error={errors.description} rows={6} placeholder="Say what happened, when, and who was involved. Stick to facts you know." hint={`${form.description.trim().length} characters.`} />
          <div className="full"><FileDrop label="Evidence (optional)" multiple includeFile files={files} onFiles={setFiles} accept="Photos, receipts or PDFs" prompt="Add evidence if you have it" /></div>
        </div></Card>
        <Card><Checkbox checked={form.confirm} onChange={(value) => { setForm((current) => ({ ...current, confirm: value })); if (errors.confirm) setErrors((current) => ({ ...current, confirm: undefined })); }} error={errors.confirm}>I understand that a complaint is a request for review. It is not a public accusation, and nobody is penalised only because a complaint was raised.</Checkbox>
          <div className="row-wrap mt-4"><Button type="submit" loading={saving}><Send size={18} />Submit complaint</Button><Button variant="outline" onClick={() => navigate(`${base}/complaints`)} disabled={saving}>Cancel</Button></div>
        </Card>
      </form>
      <aside className="stack"><Card><h2 className="card__title" style={{ marginBottom: 12 }}><ListChecks size={18} style={{ verticalAlign: '-3px', marginRight: 8 }} />What happens next</h2><Timeline items={NEXT_STEPS} /></Card><Banner tone="green" title="Handled privately">Only you, the people directly involved and CollabFarm reviewers can see your complaint. Reviewers record every action with their name and the time.</Banner></aside>
    </div>
  </div>;
}
