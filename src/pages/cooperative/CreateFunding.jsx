import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Breadcrumb, PageHeader, Stepper, Tabs, Button, ConfirmDialog, EmptyState, Banner, LinkButton } from '../../components/ui/index.js';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { useCoop, usePackageActions } from '../../components/coopb/hooks.js';
import { WIZARD_STEPS, EDITABLE_STATUSES, TEMPLATE_CATEGORIES, TIERS } from '../../components/coopb/constants.jsx';
import {
  emptyForm, templateForm, packageToForm, formToPackage, submissionChecklist,
} from '../../components/coopb/logic.js';
import { BasicsStep, DetailsStep, ReviewStep } from '../../components/coopb/CreateSteps.jsx';
import { UnverifiedBanner } from '../../components/coopb/Common.jsx';
import '../../styles/pages/coopb.css';

const STEP_IDS = WIZARD_STEPS.map((s) => s.id);

export default function CreateFunding() {
  const { data, user, toast } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { coop, verified, farms, farmers } = useCoop();
  const { saveDraft, submitPackage } = usePackageActions();

  const editId = params.get('edit');
  const paramCategory = params.get('category') || '';
  const paramTier = params.get('tier') || '';
  const existing = useMemo(() => (editId ? data.packages.find((p) => p.id === editId && p.coopId === user.orgId) || null : null), [editId, data.packages, user.orgId]);
  const platformMin = data.platformSettings?.investor?.minimumInvestment;

  const buildInitial = () => {
    if (existing) {
      const form = packageToForm(existing);
      if (!form.farmers.length) form.farmers = data.farmers.filter((f) => f.allocationPackageId === existing.id).map((f) => ({ farmerId: f.id, allocatedAmount: f.allocatedAmount || '' }));
      return form;
    }
    if (TEMPLATE_CATEGORIES.includes(paramCategory) && TIERS.includes(paramTier)) return templateForm(paramCategory, paramTier);
    return emptyForm();
  };

  const initKey = editId ? `edit:${editId}` : `new:${paramCategory}|${paramTier}`;
  const lastKey = useRef(initKey);
  const [form, setForm] = useState(buildInitial);
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [saving, setSaving] = useState(null); // 'draft' | 'submit' | null
  const [discard, setDiscard] = useState(false);

  // Re-initialise when the URL points at a different package or template. A save that only adds ?edit=<new id> keeps the form.
  useEffect(() => {
    if (lastKey.current === initKey) return;
    lastKey.current = initKey;
    setForm(buildInitial());
    setErrors({});
    setDirty(false);
    setConfirmed(false);
    setConfirmError('');
  }, [initKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const stepParam = STEP_IDS.indexOf(params.get('step'));
  const step = stepParam >= 0 ? stepParam : 0;
  const setStep = useCallback((n) => {
    setParams((prev) => { const next = new URLSearchParams(prev); next.set('step', STEP_IDS[n]); return next; }, { replace: true });
    window.scrollTo?.({ top: 0 });
  }, [setParams]);

  const set = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { if (!e[key]) return e; const { [key]: _drop, ...rest } = e; return rest; });
    setDirty(true);
  }, []);
  const setBudget = useCallback((items) => { setForm((f) => ({ ...f, budget: items })); setDirty(true); }, []);
  const clearError = useCallback((key) => setErrors((e) => { if (!e[key]) return e; const { [key]: _drop, ...rest } = e; return rest; }), []);

  const checklist = useMemo(() => submissionChecklist(form, { verified, platformMin }), [form, verified, platformMin]);
  const blockers = checklist.filter((c) => !c.ok);

  // Let users move between tabs freely; the submission checklist validates required fields on review/submit.
  const goTo = (n) => setStep(n);

  const onContinue = () => goTo(Math.min(step + 1, WIZARD_STEPS.length - 1));

  if (!coop) return <div className="page"><EmptyState title="Cooperative not found">Sign in with a cooperative account to create funding packages.</EmptyState></div>;
  if (editId && !existing) {
    return (
      <div className="page">
        <EmptyState title="Package not found" action={<LinkButton to="/coop/funding">Back to Funding Packages</LinkButton>}>
          This package does not exist or belongs to another cooperative.
        </EmptyState>
      </div>
    );
  }
  if (existing && !EDITABLE_STATUSES.includes(existing.status)) {
    return (
      <div className="page">
        <EmptyState title="This package can no longer be edited" action={<LinkButton to={`/coop/funding/${existing.id}`}>View package</LinkButton>}>
          Only packages in Draft or Changes Requested can be edited. This one is {existing.status}. To change an approved budget, open the package and use Request budget change.
        </EmptyState>
      </div>
    );
  }

  const app = existing ? data.applications.find((a) => a.packageId === existing.id && a.type === 'Funding application') : null;
  const reviewerNotes = existing?.status === 'Changes Requested' && app?.notes ? app.notes : '';
  const isTemplate = TEMPLATE_CATEGORIES.includes(form.category) && form.tier !== 'Custom';
  const title = existing ? 'Edit Package' : isTemplate ? `Create ${form.category} ${form.tier} Package` : 'Create Custom Package';

  const afterSaveUrl = (id) => {
    lastKey.current = `edit:${id}`;
    navigate(`/coop/funding/new?edit=${id}&step=${STEP_IDS[step]}`, { replace: true });
  };

  const onSaveDraft = async () => {
    if (!form.name.trim() || form.name.trim().length < 3) {
      setErrors((e) => ({ ...e, name: 'Enter a package name (at least 3 characters) to save a draft.' }));
      setStep(0);
      toast('Give the package a name before saving a draft.', 'error');
      return;
    }
    setSaving('draft');
    await simulate(500);
    const rec = formToPackage(form, { coopId: user.orgId, existing, farms });
    saveDraft(rec, existing);
    setSaving(null);
    setDirty(false);
    toast(existing && existing.status !== 'Draft' ? 'Changes saved. Submit again when you are ready.' : 'Draft saved. You can keep editing or come back later.');
    if (!existing) afterSaveUrl(rec.id);
  };

  const onSubmit = async () => {
    if (!confirmed) {
      setConfirmError('Tick the box to confirm before you submit.');
      return;
    }
    if (blockers.length) {
      toast('Fix the items in the checklist before submitting.', 'error');
      return;
    }
    setSaving('submit');
    await simulate(700);
    const rec = formToPackage(form, { coopId: user.orgId, existing, farms });
    const saved = submitPackage(rec, existing);
    setSaving(null);
    setDirty(false);
    navigate(`/coop/funding/${saved.id}`);
  };

  const onCancel = () => (dirty ? setDiscard(true) : navigate(existing ? `/coop/funding/${existing.id}` : '/coop/funding'));
  const onLast = step === WIZARD_STEPS.length - 1;
  const disabled = !verified;
  const saveLabel = existing && existing.status !== 'Draft' ? 'Save Changes' : 'Save as Draft';

  return (
    <div className="page">
      <Breadcrumb items={[{ label: 'Funding Packages', to: '/coop/funding' }, { label: existing ? 'Edit Package' : title }]} />
      <PageHeader
        title={title}
        subtitle={existing ? `Editing "${existing.name}". Status: ${existing.status}.` : "Create a funding package based on your cooperative's farming needs."}
        actions={(
          <>
            <Button variant="soft" size="lg" onClick={onCancel}>Cancel</Button>
            <Button variant="outline-green" size="lg" onClick={onSaveDraft} loading={saving === 'draft'} disabled={disabled || saving === 'submit'}>{saveLabel}</Button>
            {onLast
              ? <Button size="lg" onClick={onSubmit} loading={saving === 'submit'} disabled={disabled || saving === 'draft'}>Submit for review</Button>
              : <Button size="lg" onClick={onContinue} disabled={disabled || !!saving}>Continue</Button>}
          </>
        )}
      />
      {!verified && <UnverifiedBanner />}
      {isTemplate && !existing && step === 0 && (
        <Banner tone="info" title={`Started from the ${form.category} ${form.tier} template`}>
          The name, amount and budget items were filled in from the template. The amounts are placeholders. Replace them with your own quotation figures before you submit.
        </Banner>
      )}

      <div className="coopb-wizard-head">
        <Stepper steps={WIZARD_STEPS.map((s) => s.label)} current={step} />
        <Tabs items={WIZARD_STEPS} value={STEP_IDS[step]} onChange={(id) => goTo(STEP_IDS.indexOf(id))} label="Package sections" />
      </div>

      <fieldset className="coopb-fieldset" disabled={disabled}>
        <legend className="sr-only">{WIZARD_STEPS[step].label}</legend>
        {step === 0 && <BasicsStep form={form} set={set} errors={errors} farmers={farmers} packageId={existing?.id} />}
        {step === 1 && <DetailsStep form={form} set={set} errors={errors} setBudget={setBudget} clearError={clearError} />}
        {step === 2 && (
          <ReviewStep
            form={form} checklist={checklist} goTo={goTo}
            confirmed={confirmed} setConfirmed={(v) => { setConfirmed(v); setConfirmError(''); }} confirmError={confirmError}
            existingStatus={existing?.status} reviewerNotes={reviewerNotes}
          />
        )}
      </fieldset>

      <div className="coopb-wizard-foot">
        <Button variant="outline" onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}>{step === 0 ? 'Cancel' : 'Back'}</Button>
        {onLast
          ? <Button onClick={onSubmit} loading={saving === 'submit'} disabled={disabled || saving === 'draft'}>Submit for review</Button>
          : <Button onClick={onContinue} disabled={disabled || !!saving}>Continue</Button>}
      </div>

      <ConfirmDialog
        open={discard}
        onClose={() => setDiscard(false)}
        onConfirm={() => navigate(existing ? `/coop/funding/${existing.id}` : '/coop/funding')}
        tone="amber"
        title="Leave without saving?"
        message="You have changes that are not saved. If you leave now they will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
      />
      <p className="caption muted">Need help? <Link to="/coop/help">Open Help and Support</Link>.</p>
    </div>
  );
}
