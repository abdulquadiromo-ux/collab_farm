import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Save, Send } from 'lucide-react';
import { Card, Button, Stepper } from '../ui/index.js';

// Chrome shared by both onboarding wizards: serif title, progress, Stepper, step body and the button row.
// Every step is saved by the page before it moves on, so Back and "Save and finish later" never lose typing.
export default function WizardFrame({
  title, subtitle, steps, step, stepTitle, stepHelp, banner, children,
  onBack, onNext, onSave, busy, isLast, submitLabel = 'Submit for review',
}) {
  const headingRef = useRef(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  }, [step]);
  const pct = Math.round(((step + 1) / steps.length) * 100);

  return (
    <div className="auth-wiz">
      <header className="auth-head">
        <h1 className="auth__title auth-wiz__title">{title}</h1>
        {subtitle && <p className="auth-sub">{subtitle}</p>}
      </header>

      <Card className="auth-wiz__card">
        <div className="auth-wiz__progress">
          <div className="row between small">
            <span className="strong">Step {step + 1} of {steps.length}</span>
            <span className="muted">{pct}% complete</span>
          </div>
          <div className="auth-wiz__bar" aria-hidden="true">
            {steps.map((s, i) => <span key={s} className={i <= step ? 'is-on' : undefined} />)}
          </div>
        </div>
        <Stepper steps={steps} current={step} />

        {banner}

        <section className="auth-wiz__step" aria-labelledby="wiz-step-title">
          <div>
            <h2 id="wiz-step-title" ref={headingRef} tabIndex={-1} className="auth-wiz__h2">{stepTitle}</h2>
            {stepHelp && <p className="muted small">{stepHelp}</p>}
          </div>
          {children}
        </section>

        <div className="auth-wiz__foot">
          <Button variant="outline" onClick={onBack} disabled={step === 0 || busy}><ArrowLeft size={16} />Back</Button>
          <Button variant="ghost" onClick={onSave} disabled={busy}><Save size={16} />Save and finish later</Button>
          <Button onClick={onNext} loading={busy} className="auth-wiz__next">
            {isLast ? <>{submitLabel}<Send size={16} /></> : <>Next<ArrowRight size={16} /></>}
          </Button>
        </div>
      </Card>
    </div>
  );
}
