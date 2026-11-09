import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { Banner } from '../../components/ui/index.js';
import WizardFrame from '../../components/auth/WizardFrame.jsx';
import { gateFor } from '../../components/auth/OrgGate.jsx';
import { useOrgContext, useOrgWorkflow } from '../../components/auth/useOrgWorkflow.js';
import {
  COOP_STEPS, COOP_STEP_META, CoopReviewStep, DocumentsStep, OrganisationStep, PayoutStep, RepresentativesStep,
  coopAllPatch, coopPatch, initialCoopForm, validateCoopStep,
} from '../../components/auth/CoopWizardSteps.jsx';
import { EDITABLE_STATUSES, focusFirstInvalid } from '../../components/auth/authUtils.js';
import '../../styles/pages/auth.css';

const LAST = COOP_STEPS.length - 1;

export default function OnboardingCooperative() {
  const ctx = useOrgContext();
  const gate = gateFor(ctx, 'cooperative', '/onboarding/cooperative');
  if (gate) return gate;
  return <CoopWizard org={ctx.org} user={ctx.user} />;
}

function CoopWizard({ org, user }) {
  const { update, toast, roleMeta } = useApp();
  const { submitOrg } = useOrgWorkflow();
  const navigate = useNavigate();
  const reopened = org.status === 'Additional Information Required';
  const [step, setStep] = useState(() => (reopened ? 0 : Math.min(Math.max(org.onboarding?.step ?? 0, 0), LAST)));
  const [form, setForm] = useState(() => initialCoopForm(org, user));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // Once submitted (or verified) the wizard is read only. The status page shows what happens next.
  if (!EDITABLE_STATUSES.includes(org.status)) return <Navigate to="/onboarding/status" replace />;

  const clear = (...names) => setErrors((e) => {
    if (!names.some((n) => e[n])) return e;
    const next = { ...e };
    names.forEach((n) => delete next[n]);
    return next;
  });
  const set = (name, value) => { setForm((f) => ({ ...f, [name]: value })); clear(name); };

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
    await simulate(900);
    submitOrg({ kind: 'cooperative', org, patch: coopAllPatch(form), lastStep: LAST });
    setBusy(false);
    toast('Submitted for review. We will tell you the result on the status page.', 'success');
    navigate('/onboarding/status');
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
      subtitle="Five short steps. Your progress is saved after every step, so you can leave and come back."
      steps={COOP_STEPS}
      step={step}
      stepTitle={meta.title}
      stepHelp={meta.help}
      busy={busy}
      isLast={step === LAST}
      onBack={onBack}
      onNext={onNext}
      onSave={onSave}
      banner={reopened && (org.adminNote || org.reviewNote) ? <Banner tone="warn" title="A reviewer asked for more information">{org.adminNote || org.reviewNote}</Banner> : null}
    >
      {step === 0 && <OrganisationStep {...shared} />}
      {step === 1 && <RepresentativesStep {...shared} />}
      {step === 2 && <DocumentsStep {...shared} />}
      {step === 3 && <PayoutStep {...shared} />}
      {step === 4 && <CoopReviewStep {...shared} goTo={goTo} />}
    </WizardFrame>
  );
}
