import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Breadcrumb, PageHeader, Stepper, Tabs, Button, ConfirmDialog, EmptyState, Banner, LinkButton, PageSkeleton } from '../../components/ui/index.js';
import { useApp } from '../../context/AppContext.jsx';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';
import { useCoop, useMyProfile } from '../../components/coopb/hooks.js';
import { WIZARD_STEPS, EDITABLE_STATUSES, TEMPLATE_CATEGORIES, TIERS } from '../../components/coopb/constants.jsx';
import {
  emptyForm, templateForm, packageToForm, formToPackage, submissionChecklist, apiPackageToModel, farmerAllocationCheck,
} from '../../components/coopb/logic.js';
import { BasicsStep, DetailsStep, ReviewStep } from '../../components/coopb/CreateSteps.jsx';
import { UnverifiedBanner } from '../../components/coopb/Common.jsx';
import '../../styles/pages/coopb.css';

const STEP_IDS = WIZARD_STEPS.map((s) => s.id);

export default function CreateFunding() {
  const { data, user, toast, accessToken, patchData } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { coop, farms } = useCoop();
  const { verified, loading: verificationLoading, error: verificationError } = useMyProfile();

  const editId = params.get('edit');
  const paramCategory = params.get('category') || '';
  const paramTier = params.get('tier') || '';
  const [remoteExisting, setRemoteExisting] = useState(null);
  const [detailLoading, setDetailLoading] = useState(Boolean(editId));
  const [apiError, setApiError] = useState('');
  const [directoryFarmers, setDirectoryFarmers] = useState([]);
  const existing = remoteExisting?.id === editId ? remoteExisting : null;
  const platformMin = data.platformSettings?.investor?.minimumInvestment;

  const buildInitial = () => {
    if (existing) {
      return packageToForm(existing);
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

  useEffect(() => {
    if (!editId) { setRemoteExisting(null); setDetailLoading(false); return undefined; }
    const controller = new AbortController();
    const load = async () => {
      setDetailLoading(true); setApiError('');
      if (!accessToken) { setApiError('Your session has expired. Sign in again to edit this package.'); setDetailLoading(false); return; }
      try {
        const response = await fetch(`${API_BASE_URL}/packages/${encodeURIComponent(editId)}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not load package (${response.status}).`));
        const model = apiPackageToModel(payload);
        setRemoteExisting(model);
        setForm(packageToForm(model));
        setDirty(false); setErrors({});
      } catch (error) { if (error.name !== 'AbortError') setApiError(error.message || 'Could not load package details.'); }
      finally { if (!controller.signal.aborted) setDetailLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [accessToken, editId]);

  useEffect(() => {
    if (!accessToken) { setDirectoryFarmers([]); return undefined; }
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/farmers/directory?page=1&page_size=100`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, 'Could not load farmers for package allocation.'));
        const items = Array.isArray(payload?.items) ? payload.items : [];
        setDirectoryFarmers(items.map((farmer) => ({
          ...farmer, id: farmer.id, name: farmer.full_name || [farmer.first_name, farmer.last_name].filter(Boolean).join(' ') || 'Farmer',
          farmingCategory: farmer.farming_category || '', cropType: farmer.farming_category || '', phone: farmer.phone_number || '',
          status: String(farmer.verification_status || farmer.status || 'Pending'), allocationPackageId: farmer.package_id || farmer.allocation_package_id || null,
        })));
      })
      .catch((error) => { if (error.name !== 'AbortError') setApiError(error.message || 'Could not load cooperative farmers.'); });
    return () => controller.abort();
  }, [accessToken]);

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

  if (detailLoading || verificationLoading) return <PageSkeleton />;
  if (!coop) return <div className="page"><EmptyState title="Cooperative not found">Sign in with a cooperative account to create funding packages.</EmptyState></div>;
  if (editId && !existing) {
    return (
      <div className="page">
        <EmptyState title="Package not found" action={<LinkButton to="/coop/funding">Back to Funding Packages</LinkButton>}>
          {apiError || 'This package does not exist or belongs to another cooperative.'}
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
  const title = existing ? 'Edit Package' : form.category ? `Create ${form.category} Package` : 'Create Funding Package';

  const afterSaveUrl = (id) => {
    lastKey.current = `edit:${id}`;
    navigate(`/coop/funding/new?edit=${id}&step=${STEP_IDS[step]}`, { replace: true });
  };

  const persistPackage = async (record) => {
    if (!accessToken) throw new Error('Your session has expired. Sign in again before saving a package.');
    const editing = Boolean(existing?.id);
    const endpoint = editing ? `${API_BASE_URL}/packages/${encodeURIComponent(existing.id)}` : `${API_BASE_URL}/packages/`;
    const response = await fetch(endpoint, {
      method: editing ? 'PATCH' : 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(record.apiPayload),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not ${editing ? 'update' : 'create'} package (${response.status}).`));
    const saved = apiPackageToModel(payload || {});
    if (!saved.id) throw new Error('The package service did not return a package ID.');
    patchData((current) => ({ packages: [...current.packages.filter((item) => item.id !== saved.id), saved] }));
    setRemoteExisting(saved);
    return saved;
  };

  const onSaveDraft = async () => {
    if (!form.name.trim() || form.name.trim().length < 3) {
      setErrors((e) => ({ ...e, name: 'Enter a package name (at least 3 characters) to save a draft.' }));
      setStep(0);
      toast('Give the package a name before saving a draft.', 'error');
      return;
    }
    const allocationCheck = farmerAllocationCheck(form);
    if (!allocationCheck.ok) {
      setErrors((current) => ({ ...current, [allocationCheck.step === 1 ? 'amount' : 'farmers']: allocationCheck.detail }));
      setStep(allocationCheck.step);
      toast(allocationCheck.detail, 'error');
      return;
    }
    setSaving('draft');
    const rec = formToPackage(form, { coopId: user.orgId, existing, farms });
    setApiError('');
    try {
      const saved = await persistPackage(rec);
      setDirty(false);
      toast(existing ? 'Package changes saved.' : 'Package created.');
      if (!existing) afterSaveUrl(saved.id);
    } catch (error) { setApiError(error.message || 'Could not save package.'); }
    finally { setSaving(null); }
  };

  const onSubmit = async () => {
    if (!confirmed) {
      setConfirmError('Tick the box to confirm before you submit.');
      return;
    }
    if (blockers.length) {
      const allocationIssue = blockers.find((item) => item.id === 'farmerAllocations');
      if (allocationIssue) {
        setErrors((current) => ({ ...current, [allocationIssue.step === 1 ? 'amount' : 'farmers']: allocationIssue.detail }));
        setStep(allocationIssue.step);
      }
      toast('Fix the items in the checklist before submitting.', 'error');
      return;
    }
    setSaving('submit');
    const rec = formToPackage(form, { coopId: user.orgId, existing, farms });
    setApiError('');
    try {
      const saved = await persistPackage(rec);
      setDirty(false);
      toast(existing ? 'Package updated.' : 'Package created.');
      navigate(`/coop/funding/${saved.id}`);
    } catch (error) { setApiError(error.message || 'Could not submit package.'); }
    finally { setSaving(null); }
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
      {verificationError && <Banner tone="warn" title="Verification status unavailable">{verificationError} Package creation is disabled until your status can be confirmed.</Banner>}
      {apiError && <Banner tone="danger" title="Package request failed">{apiError}</Banner>}
      {!verified && <UnverifiedBanner />}
      <div className="coopb-wizard-head">
        <Stepper steps={WIZARD_STEPS.map((s) => s.label)} current={step} />
        <Tabs items={WIZARD_STEPS} value={STEP_IDS[step]} onChange={(id) => goTo(STEP_IDS.indexOf(id))} label="Package sections" />
      </div>

      <fieldset className="coopb-fieldset" disabled={disabled}>
        <legend className="sr-only">{WIZARD_STEPS[step].label}</legend>
        {step === 0 && <BasicsStep form={form} set={set} errors={errors} farmers={directoryFarmers} packageId={existing?.id} />}
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
