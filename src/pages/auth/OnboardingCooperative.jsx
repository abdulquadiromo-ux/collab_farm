import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { Banner } from '../../components/ui/index.js';
import WizardFrame from '../../components/auth/WizardFrame.jsx';
import { gateFor } from '../../components/auth/OrgGate.jsx';
import { useOrgContext } from '../../components/auth/useOrgWorkflow.js';
import {
  COOP_STEPS, COOP_STEP_META, CoopReviewStep, DocumentsStep, OrganisationStep, PayoutStep,
  coopAllPatch, coopPatch, initialCoopForm, validateCoopStep,
} from '../../components/auth/CoopWizardSteps.jsx';
import { COOP_DOCUMENTS, EDITABLE_STATUSES, focusFirstInvalid, normalisePhone, nowISO } from '../../components/auth/authUtils.js';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';
import '../../styles/pages/auth.css';

const LAST = COOP_STEPS.length - 1;

export default function OnboardingCooperative() {
  const ctx = useOrgContext();
  const gate = gateFor(ctx, 'cooperative', '/onboarding/cooperative');
  if (gate) return gate;
  return <CoopWizard org={ctx.org} user={ctx.user} />;
}

function CoopWizard({ org, user }) {
  const { update, toast, roleMeta, accessToken } = useApp();
  const navigate = useNavigate();
  const reopened = org.status === 'Additional Information Required';
  const [step, setStep] = useState(() => {
    const saved = org.onboarding?.step ?? 0;
    const migrated = saved >= 2 ? saved - 1 : saved;
    return reopened ? 0 : Math.min(Math.max(migrated, 0), LAST);
  });
  const [form, setForm] = useState(() => initialCoopForm(org, user));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Once submitted (or verified) the wizard is read only. The status page shows what happens next.
  if (!EDITABLE_STATUSES.includes(org.status)) return <Navigate to={roleMeta.base} replace />;

  const clear = (...names) => setErrors((e) => {
    if (!names.some((n) => e[n])) return e;
    const next = { ...e };
    names.forEach((n) => delete next[n]);
    return next;
  });
  const set = (name, value) => { setForm((f) => ({ ...f, [name]: value })); clear(name); setSubmitError(''); };

  // Progress is written to the store on every step, so a refresh or a later visit picks up where the person stopped.
  const persist = (fromStep, toStep) => {
    update('cooperatives', org.id, (r) => ({ ...coopPatch(fromStep, form), onboarding: { ...(r.onboarding || {}), step: toStep } }));
  };
  const goTo = (n) => { persist(step, n); setStep(n); setErrors({}); };

  const onNext = async () => {
    const e = validateCoopStep(step, form);
    setErrors(e);
    if (Object.keys(e).length) { toast('Please fix the highlighted fields.', 'error'); focusFirstInvalid(document); return; }
    if (step < LAST) { goTo(step + 1); return; }
    // Final check of every step before anything is sent for review.
    for (let s = 0; s < LAST; s += 1) {
      const er = validateCoopStep(s, form);
      if (Object.keys(er).length) { setStep(s); setErrors(er); toast('Some details are missing. Please complete this step.', 'error'); return; }
    }
    setBusy(true);
    setSubmitError('');
    try {
      if (!accessToken) {
        setSubmitError('Your session has expired. Sign in again before submitting your profile.');
        return;
      }
      const body = new FormData();
      body.append('cooperative_name', form.name.trim());
      body.append('year_established', String(Number(form.yearEstablished)));
      body.append('registration_number', form.regNumber.trim());
      body.append('phone_number', normalisePhone(form.phone));
      body.append('address', form.address.trim());
      body.append('lga', form.lga);
      body.append('state', form.state);
      body.append('account_number', form.accountNumber);
      body.append('bank_name', form.bankName.trim());
      body.append('account_name', form.accountName.trim());
      body.append('registration_certificate_file', form.docs[COOP_DOCUMENTS[0].type].fileObject);
      body.append('proof_of_address_file', form.docs[COOP_DOCUMENTS[1].type].fileObject);

      const response = await fetch(`${API_BASE_URL}/onboard/profile/cooperative`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        body,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setSubmitError(apiErrorMessage(payload, `Profile submission failed (${response.status}). Please try again.`));
        return;
      }
      const submittedAt = nowISO();
      update('cooperatives', org.id, { ...coopAllPatch(form), status: 'Submitted', submittedAt, onboarding: { step: LAST, submittedAt } });
      update('users', user.id, { status: 'Submitted' });
      toast('Cooperative profile submitted for review.', 'success');
      navigate(roleMeta.base);
    } catch {
      setSubmitError('Could not connect to the profile service. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };
  const onBack = () => goTo(step - 1);
  const onSave = () => {
    persist(step, step);
    toast('Progress saved. You can continue any time from your dashboard or the status page.', 'success');
    navigate(roleMeta.base);
  };

  const shared = { form, errors, set, clear };
  const meta = COOP_STEP_META[step];
  return (
    <WizardFrame
      title="Set up your cooperative"
      subtitle="Four short steps. Your progress is saved after every step, so you can leave and come back."
      steps={COOP_STEPS}
      step={step}
      stepTitle={meta.title}
      stepHelp={meta.help}
      busy={busy}
      isLast={step === LAST}
      onBack={onBack}
      onNext={onNext}
      onSave={onSave}
      banner={submitError
        ? <Banner tone="danger" title="Unable to submit profile">{submitError}</Banner>
        : reopened && (org.adminNote || org.reviewNote) ? <Banner tone="warn" title="A reviewer asked for more information">{org.adminNote || org.reviewNote}</Banner> : null}
    >
      {step === 0 && <OrganisationStep {...shared} />}
      {step === 1 && <DocumentsStep {...shared} />}
      {step === 2 && <PayoutStep {...shared} />}
      {step === 3 && <CoopReviewStep {...shared} goTo={goTo} />}
    </WizardFrame>
  );
}
