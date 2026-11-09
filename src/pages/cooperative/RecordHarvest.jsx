import { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Send, Save } from 'lucide-react';
import { useApp, newId, simulate } from '../../context/AppContext.jsx';
import { PageHeader, Breadcrumb, Card, SectionHead, Stepper, Banner, Button, SelectField, TextField, TextAreaField, FileDrop, Checkbox, ConfirmDialog, EmptyState, LinkButton } from '../../components/ui/index.js';
import SaleFields, { emptySale, validateSale, buildSale, grossOf } from '../../components/coopc/SaleFields.jsx';
import { VerifyGate, useVerified } from '../../components/coopc/Gate.jsx';
import { TODAY, useCoop, fmtQty } from '../../components/coopc/helpers.js';
import { formatNaira } from '../../utils/format.js';
import '../../styles/pages/coopc.css';

const UNITS = ['kg', 'tonnes', 'bags', 'birds', 'pcs'];
const GRADES = ['Grade A', 'Grade B', 'Grade C'];
const CROP_HINTS = ['Yam', 'Maize', 'Rice', 'Groundnut', 'Cassava', 'Tomato', 'Catfish', 'Broiler chickens'];
const STEPS = ['Harvest details', 'Sale (optional)'];

const blank = (packageId) => ({ packageId, crop: '', expectedQty: '', actualQty: '', unit: 'kg', date: '', quality: '', location: '', files: [], notes: '' });

export default function RecordHarvest() {
  const { data, user, add, notify, toast } = useApp();
  const { coop, packages, pkgById } = useCoop();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const verified = useVerified();
  const activePackages = packages.filter((p) => p.status === 'Active');
  const pre = params.get('package');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => blank(activePackages.find((p) => p.id === pre)?.id || (activePackages.length === 1 ? activePackages[0].id : '')));
  const [withSale, setWithSale] = useState(false);
  const [sale, setSale] = useState(emptySale);
  const [errors, setErrors] = useState({});
  const [saleErrors, setSaleErrors] = useState({});
  const [mode, setMode] = useState('submit'); // 'submit' or 'draft'
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const closeConfirm = useCallback(() => setConfirming(false), []);

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => { delete n[k]; }); return n; });
  };
  const setS = (patch) => {
    setSale((s) => ({ ...s, ...patch }));
    setSaleErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => { delete n[k]; }); return n; });
  };

  const actual = Number(form.actualQty) || 0;
  const pkg = pkgById[form.packageId];

  const validateHarvest = (draft) => {
    const e = {};
    if (!form.packageId) e.packageId = 'Choose the package this harvest belongs to.';
    if (!form.crop.trim()) e.crop = 'Enter the crop, for example Yam or Paddy rice.';
    if (draft) return e;
    if (!Number(form.expectedQty)) e.expectedQty = 'Enter the quantity you expected to harvest.';
    if (!actual) e.actualQty = 'Enter the quantity actually harvested. Use the weighing sheet.';
    if (!form.date) e.date = 'Choose the harvest date.';
    else if (form.date > TODAY) e.date = 'The harvest date cannot be in the future.';
    if (!form.quality) e.quality = 'Choose a quality grade.';
    if (!form.location.trim()) e.location = 'Say where the harvest is stored or delivered.';
    if (form.files.length === 0) e.files = 'Add a weighing sheet, storage record or other evidence. You can also save a draft without it.';
    return e;
  };

  const next = () => {
    const e = validateHarvest(false);
    setErrors(e);
    if (Object.keys(e).length) { toast('Please fix the highlighted fields.', 'error'); return; }
    setStep(1);
    window.scrollTo?.(0, 0);
  };

  const askSubmit = (m) => {
    setMode(m);
    const e = validateHarvest(m === 'draft');
    setErrors(e);
    if (Object.keys(e).length) { setStep(0); toast('Please fix the highlighted fields.', 'error'); return; }
    if (m === 'submit' && withSale) {
      const se = validateSale(sale, { maxQty: actual, unit: form.unit, harvestDate: form.date });
      setSaleErrors(se);
      if (Object.keys(se).length) { toast('Please fix the sale details.', 'error'); return; }
    }
    setConfirming(true);
  };

  const submit = async () => {
    setSaving(true);
    await simulate(800);
    const draft = mode === 'draft';
    const makeSale = withSale && !draft;
    const hid = newId('hv');
    const sid = newId('sl');
    const soldQty = makeSale ? Number(sale.qty) : 0;
    const names = form.files.map((f) => f.name);
    add('harvests', {
      id: hid, packageId: form.packageId, crop: form.crop.trim(), expectedQty: Number(form.expectedQty) || 0, actualQty: actual, unit: form.unit,
      date: form.date, quality: form.quality, location: form.location.trim(), soldQty, remainingQty: Math.max(0, actual - soldQty),
      status: draft ? 'Pending' : 'Under Review', reviewer: null, evidence: names.join(', '), evidenceFiles: names, notes: form.notes.trim(), recordedBy: user.name,
    }, {
      action: draft ? 'Harvest saved as draft' : 'Harvest submitted for review', entityType: 'Harvest',
      summary: `${form.crop.trim()}, ${fmtQty(actual, form.unit)} (expected ${fmtQty(Number(form.expectedQty) || 0, form.unit)}). Status ${draft ? 'Pending' : 'Under Review'}.`,
      reason: pkg?.name || '',
    });
    if (makeSale) {
      const rec = buildSale(sale, { id: sid, packageId: form.packageId, harvestId: hid, unit: form.unit, recordedBy: user.name });
      add('sales', rec, {
        action: 'Sale recorded', entityType: 'Sale',
        summary: `${fmtQty(rec.qty, rec.unit)} to ${rec.buyer}, gross ${formatNaira(rec.gross)}. Payment status ${rec.paymentStatus}, not confirmed.`,
        reason: `Harvest ${hid}`,
      });
      notify('admin', 'Sale recorded, receipt to reconcile', `${coop?.name || 'A cooperative'} recorded a ${formatNaira(rec.gross)} sale of ${form.crop.trim()} to ${rec.buyer}. It is not received money until reconciled.`, '/admin/reconciliation', 'payment');
    }
    if (!draft) {
      notify('admin', 'Harvest submitted for review', `${coop?.name || 'A cooperative'} submitted a ${form.crop.trim()} harvest (${fmtQty(actual, form.unit)}) for ${pkg?.name || 'a package'}.`, `/admin/monitoring/${form.packageId}`, 'project');
    }
    setSaving(false);
    setConfirming(false);
    toast(draft ? 'Harvest saved as a draft with status Pending.' : 'Harvest submitted. A reviewer will check the evidence.');
    navigate('/coop/settlements?tab=harvests');
  };

  const crumbs = [{ label: 'Settlements', to: '/coop/settlements' }, { label: 'Record harvest' }];

  if (activePackages.length === 0) {
    return (
      <div className="page coopc-page">
        <Breadcrumb items={crumbs} />
        <PageHeader title="Record harvest" subtitle="Add the quantity, quality and evidence for a harvest." />
        <EmptyState title="No active package to record a harvest against" action={<LinkButton to="/coop/funding">Go to Funding</LinkButton>}>
          A harvest can be recorded only for a package that is Active.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="page coopc-page">
      <Breadcrumb items={crumbs} />
      <PageHeader title="Record harvest" subtitle="Add the quantity, quality and evidence for a harvest, then record a sale if you have one." />
      <VerifyGate what="submit harvests" />
      <Stepper steps={STEPS} current={step} />

      {step === 0 && (
        <Card>
          <SectionHead icon="1" title="Harvest details" />
          <div className="form-grid">
            <SelectField
              label="Package" required placeholder="Select a package" value={form.packageId} error={errors.packageId}
              options={activePackages.map((p) => ({ value: p.id, label: p.name }))} onChange={(e) => set({ packageId: e.target.value })}
              hint="Only Active packages can record a harvest."
            />
            <div className="field">
              <TextField label="Crop" required list="coopc-crops" value={form.crop} error={errors.crop} placeholder="For example: Yam" onChange={(e) => set({ crop: e.target.value })} />
              <datalist id="coopc-crops">{CROP_HINTS.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <TextField label="Expected quantity" required type="number" min="0" step="any" inputMode="decimal" value={form.expectedQty} error={errors.expectedQty} hint="What the farming plan said you would harvest." onChange={(e) => set({ expectedQty: e.target.value })} />
            <TextField label="Actual quantity" required type="number" min="0" step="any" inputMode="decimal" value={form.actualQty} error={errors.actualQty} hint="What was really harvested, from the weighing sheet." onChange={(e) => set({ actualQty: e.target.value })} />
            <SelectField label="Unit" required value={form.unit} options={UNITS} onChange={(e) => set({ unit: e.target.value })} />
            <TextField label="Harvest date" required type="date" max={TODAY} value={form.date} error={errors.date} onChange={(e) => set({ date: e.target.value })} />
            <SelectField label="Quality grade" required placeholder="Select a grade" value={form.quality} error={errors.quality} options={GRADES} onChange={(e) => set({ quality: e.target.value })} />
            <TextField label="Storage or delivery location" required value={form.location} error={errors.location} placeholder="For example: Kwali warehouse" onChange={(e) => set({ location: e.target.value })} />
            <div className="full">
              <FileDrop
                label="Evidence" accept="Weighing sheet, storage record or photos. PDF, JPG or PNG (Max 5MB)" files={form.files} error={errors.files} multiple
                onFiles={(files) => set({ files })}
              />
              <p className="field__hint" style={{ marginTop: 6 }}>Photos support a harvest record but do not prove it. A reviewer checks the weighing sheet or storage record. Files stay in your browser in this demo.</p>
            </div>
            <TextAreaField className="full" label="Notes" optional value={form.notes} placeholder="Anything the reviewer should know, such as losses or weather." onChange={(e) => set({ notes: e.target.value })} />
          </div>
          <Banner tone="info" className="mt-4">A lower harvest than expected is recorded as it is. A genuine crop failure is assessed on evidence and is not treated as fraud.</Banner>
          <div className="row-wrap mt-6" style={{ justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => navigate('/coop/settlements')}>Cancel</Button>
            <Button variant="outline-green" onClick={() => askSubmit('draft')} disabled={!verified}><Save size={16} />Save as draft</Button>
            <Button onClick={next}>Continue to sale<ArrowRight size={16} /></Button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <SectionHead icon="2" title="Sale (optional)" />
          <div className="coopc-gross" style={{ marginBottom: 16 }}>
            <span>{form.crop || 'Harvest'}: {fmtQty(actual, form.unit)} harvested</span>
            <strong>{pkg?.name}</strong>
          </div>
          <Checkbox checked={withSale} onChange={setWithSale}>Also record a sale from this harvest now</Checkbox>
          {withSale ? (
            <div className="mt-4">
              <SaleFields values={sale} errors={saleErrors} onChange={setS} maxQty={actual} unit={form.unit} />
              {sale.qty && grossOf(sale) > 0 && <p className="caption muted mt-2">Quantity left unsold after this sale: {fmtQty(Math.max(0, actual - (Number(sale.qty) || 0)), form.unit)}.</p>}
            </div>
          ) : (
            <p className="small muted mt-2">You can skip this and record sales later from the Settlements page.</p>
          )}
          <div className="row-wrap mt-6" style={{ justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft size={16} />Back</Button>
            <Button variant="outline-green" onClick={() => askSubmit('draft')} disabled={!verified}><Save size={16} />Save harvest as draft</Button>
            <Button onClick={() => askSubmit('submit')} disabled={!verified}><Send size={16} />Submit for review</Button>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={confirming}
        onClose={closeConfirm}
        onConfirm={submit}
        loading={saving}
        tone="green"
        title={mode === 'draft' ? 'Save this harvest as a draft?' : 'Submit this harvest for review?'}
        message={mode === 'draft' ? 'A draft is saved with status Pending. A reviewer will not check it until you submit it.' : 'A reviewer checks the evidence. Recording a harvest or sale does not confirm any money received.'}
        summary={[
          ['Package', pkg?.name || '-'],
          ['Harvest', `${form.crop.trim()}, ${fmtQty(actual, form.unit)}`],
          ['Evidence', `${form.files.length} ${form.files.length === 1 ? 'file' : 'files'}`],
          ['Sale', withSale && mode !== 'draft' ? `${sale.buyer.trim()}, ${formatNaira(grossOf(sale))} gross` : 'No sale recorded now'],
          ['Payment status', withSale && mode !== 'draft' ? (sale.received ? 'Under Reconciliation (not confirmed)' : 'Pending (no payment reported)') : 'Not applicable'],
          ['Approval status', mode === 'draft' ? 'Draft, not submitted' : 'Awaiting admin review'],
        ]}
        confirmLabel={mode === 'draft' ? 'Save draft' : 'Submit'}
      />
    </div>
  );
}
