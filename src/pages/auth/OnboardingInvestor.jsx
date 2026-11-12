import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { Banner } from '../../components/ui/index.js';
import WizardFrame from '../../components/auth/WizardFrame.jsx';
import { gateFor } from '../../components/auth/OrgGate.jsx';
import { useOrgContext, useOrgWorkflow } from '../../components/auth/useOrgWorkflow.js';
import {
  INVESTOR_STEPS, INVESTOR_STEP_META, IdentityStep, InvestorReviewStep, ProfileStep,
  initialInvestorForm, investorAllPatch, investorPatch, validateInvestorStep,
} from '../../components/auth/InvestorWizardSteps.jsx';
import { EDITABLE_STATUSES, focusFirstInvalid } from '../../components/auth/authUtils.js';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';
import '../../styles/pages/auth.css';

const LAST = INVESTOR_STEPS.length - 1;

export default function OnboardingInvestor() {
  const ctx = useOrgContext();
  const gate = gateFor(ctx, 'investor', '/onboarding/investor');
  if (gate) return gate;
  return <InvestorWizard org={ctx.org} />;
}

function InvestorWizard({ org }) {
  const { update, toast, roleMeta, accessToken } = useApp();
  const { submitOrg } = useOrgWorkflow();
  const navigate = useNavigate();
  const reopened = org.status === 'Additional Information Required';
  const [step, setStep] = useState(() => (reopened ? 0 : Math.min(Math.max(org.onboarding?.step ?? 0, 0), LAST)));
  const [form, setForm] = useState(() => initialInvestorForm(org));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!EDITABLE_STATUSES.includes(org.status)) return <Navigate to={roleMeta.base} replace />;

  const clear = (...names) => setErrors((e) => {
    if (!names.some((n) => e[n])) return e;
    const next = { ...e };
    names.forEach((n) => delete next[n]);
    return next;
  });
  const set = (name, value) => { setForm((f) => ({ ...f, [name]: value })); clear(name); setSubmitError(''); };

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
    setSubmitError('');
    try {
      if (!accessToken) {
        setSubmitError('Your session has expired. Sign in again before submitting your profile.');
        return;
      }

      const body = new FormData();
      const isGroup = form.type === 'Group';
      if (isGroup) {
        body.append('company_name', form.companyName.trim());
        body.append('company_address', form.companyAddress.trim());
        body.append('email', form.companyEmail.trim());
        body.append('phone_number', form.companyPhone.trim());
        body.append('year_established', String(Number(form.yearEstablished)));
        body.append('company_registration_number', form.registrationNumber.trim());
        body.append('company_registration_file', form.registrationDoc.fileObject);
        body.append('proof_of_address_file', form.proofDoc.fileObject);
      } else {
        body.append('id_number', form.idNumber.trim());
        body.append('nationality', form.country);
        body.append('id_file', form.idDoc.fileObject);
        body.append('address', [form.address.trim(), form.city.trim()].filter(Boolean).join(', '));
      }

      const endpoint = isGroup ? 'investment-group' : 'individual-investor';
      const response = await fetch(`${API_BASE_URL}/onboard/profile/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        body,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setSubmitError(apiErrorMessage(payload, `Profile submission failed (${response.status}). Please try again.`));
        return;
      }

      submitOrg({ kind: 'investor', org, patch: investorAllPatch(form), lastStep: LAST });
      toast('Submitted for review. We will tell you the result on the status page.', 'success');
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
  const meta = INVESTOR_STEP_META[step];
  return (
    <WizardFrame
      title="Set up your investor profile"
      subtitle="Three short steps. Your progress is saved after every step, so you can leave and come back."
      steps={INVESTOR_STEPS}
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
      {step === 0 && <ProfileStep {...shared} />}
      {step === 1 && <IdentityStep {...shared} />}
      {step === 2 && <InvestorReviewStep {...shared} goTo={goTo} />}
    </WizardFrame>
  );
}
