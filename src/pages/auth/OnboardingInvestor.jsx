import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { Banner } from '../../components/ui/index.js';
import WizardFrame from '../../components/auth/WizardFrame.jsx';
import { gateFor } from '../../components/auth/OrgGate.jsx';
import { useOrgContext, useOrgWorkflow } from '../../components/auth/useOrgWorkflow.js';
import {
  EligibilityStep, INVESTOR_STEPS, INVESTOR_STEP_META, IdentityStep, InvestorReviewStep, ProfileStep, RisksStep,
  initialInvestorForm, investorAllPatch, investorPatch, validateInvestorStep,
} from '../../components/auth/InvestorWizardSteps.jsx';
import { EDITABLE_STATUSES, focusFirstInvalid } from '../../components/auth/authUtils.js';
import '../../styles/pages/auth.css';

const LAST = INVESTOR_STEPS.length - 1;

export default function OnboardingInvestor() {
  const ctx = useOrgContext();
  const gate = gateFor(ctx, 'investor', '/onboarding/investor');
  if (gate) return gate;
  return <InvestorWizard org={ctx.org} />;
}

function InvestorWizard({ org }) {
  const { update, toast, roleMeta } = useApp();
  const { submitOrg } = useOrgWorkflow();
  const navigate = useNavigate();
  const reopened = org.status === 'Additional Information Required';
  const [step, setStep] = useState(() => (reopened ? 0 : Math.min(Math.max(org.onboarding?.step ?? 0, 0), LAST)));
  const [form, setForm] = useState(() => initialInvestorForm(org));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (!EDITABLE_STATUSES.includes(org.status)) return <Navigate to="/onboarding/status" replace />;

  const clear = (...names) => setErrors((e) => {
    if (!names.some((n) => e[n])) return e;
    const next = { ...e };
    names.forEach((n) => delete next[n]);
    return next;
  });
  const set = (name, value) => { setForm((f) => ({ ...f, [name]: value })); clear(name); };

  const persist = (fromStep, toStep) => {
    update('investors', org.id, (r) => ({ ...investorPatch(fromStep, form), onboarding: { ...(r.onboarding || {}), step: toStep } }));
  };
  const goTo = (n) => { persist(step, n); setStep(n); setErrors({}); };

  const onNext = async () => {
    const e = validateInvestorStep(step, form);
    setErrors(e);
    if (Object.keys(e).length) { toast('Please fix the highlighted fields.', 'error'); focusFirstInvalid(document); return; }
    if (step < LAST) { goTo(step + 1); return; }
    for (let s = 0; s < LAST; s += 1) {
      const er = validateInvestorStep(s, form);
      if (Object.keys(er).length) { setStep(s); setErrors(er); toast('Some details are missing. Please complete this step.', 'error'); return; }
    }
    setBusy(true);
    await simulate(900);
    submitOrg({ kind: 'investor', org, patch: investorAllPatch(form), lastStep: LAST });
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
  const meta = INVESTOR_STEP_META[step];
  return (
    <WizardFrame
      title="Set up your investor profile"
      subtitle="Five short steps. Your progress is saved after every step, so you can leave and come back."
      steps={INVESTOR_STEPS}
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
      {step === 0 && <ProfileStep {...shared} />}
      {step === 1 && <IdentityStep {...shared} />}
      {step === 2 && <EligibilityStep {...shared} />}
      {step === 3 && <RisksStep {...shared} />}
      {step === 4 && <InvestorReviewStep {...shared} goTo={goTo} />}
    </WizardFrame>
  );
}
