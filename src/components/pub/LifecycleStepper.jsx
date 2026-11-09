import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { Banner, Button, PillTabs, Progress } from '../ui/index.js';
import { cx } from '../../utils/format.js';
import { LIFECYCLE, ROLE_END_LINK, ROLE_TABS } from './content.jsx';

const ROLE_LABEL = { investor: 'an investor', cooperative: 'a cooperative', farmer: 'a farmer' };

/**
 * Interactive lifecycle. The role and step live in the URL (?role=farmer&step=4) so a refresh or a shared link
 * lands on the same view.
 */
export function LifecycleStepper() {
  const [params, setParams] = useSearchParams();
  const tabRefs = useRef([]);
  const railRef = useRef(null);

  const rawRole = params.get('role');
  const role = ROLE_TABS.some((r) => r.id === rawRole) ? rawRole : 'investor';
  const parsed = parseInt(params.get('step') || '1', 10);
  const idx = Number.isNaN(parsed) ? 0 : Math.min(Math.max(parsed - 1, 0), LIFECYCLE.length - 1);
  const step = LIFECYCLE[idx];
  const detail = step.roles[role];
  const Icon = step.icon;
  const last = idx === LIFECYCLE.length - 1;
  const endLink = ROLE_END_LINK[role];

  // On narrow screens the steps scroll sideways. Keep the active one in view without moving the page.
  useEffect(() => {
    const rail = railRef.current;
    const tab = tabRefs.current[idx];
    if (!rail || !tab || rail.scrollWidth <= rail.clientWidth) return;
    const left = tab.offsetLeft - (rail.clientWidth - tab.offsetWidth) / 2;
    if (typeof rail.scrollTo === 'function') rail.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [idx]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => next.set(k, String(v)));
    setParams(next, { replace: true });
  };
  const goTo = (i, focus) => {
    const n = (i + LIFECYCLE.length) % LIFECYCLE.length;
    update({ step: n + 1 });
    if (focus) tabRefs.current[n]?.focus();
  };

  const onKeyDown = (e, i) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); goTo(i + 1, true); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); goTo(i - 1, true); }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0, true); }
    else if (e.key === 'End') { e.preventDefault(); goTo(LIFECYCLE.length - 1, true); }
  };

  return (
    <div className="pub-life">
      <div className="pub-life__roles">
        <p className="pub-life__roles-label" id="pub-role-label">See the journey as</p>
        <PillTabs items={ROLE_TABS} value={role} onChange={(r) => update({ role: r })} label="Choose a role" />
      </div>

      <div className="pub-life__grid">
        <div ref={railRef} className="pub-life__rail" role="tablist" aria-orientation="vertical" aria-label="Lifecycle steps">
          {LIFECYCLE.map((s, i) => {
            const state = i < idx ? 'done' : i === idx ? 'active' : '';
            return (
              <button
                key={s.id}
                ref={(el) => { tabRefs.current[i] = el; }}
                type="button"
                role="tab"
                id={`life-tab-${s.id}`}
                aria-selected={i === idx}
                aria-controls="life-panel"
                tabIndex={i === idx ? 0 : -1}
                className={cx('pub-life__tab', state && `pub-life__tab--${state}`)}
                onClick={() => goTo(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                <span className="pub-life__num" aria-hidden="true">{state === 'done' ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
                <span className="pub-life__tab-label">{s.title}</span>
              </button>
            );
          })}
        </div>

        <div className="pub-life__panel" role="tabpanel" id="life-panel" aria-labelledby={`life-tab-${step.id}`} tabIndex={0}>
          <div className="pub-life__progress">
            <span className="caption strong">Step {idx + 1} of {LIFECYCLE.length}</span>
            <Progress value={((idx + 1) / LIFECYCLE.length) * 100} tone="dark" label={`Step ${idx + 1} of ${LIFECYCLE.length}`} />
          </div>

          <div className="pub-life__head">
            <span className="pub-icon pub-icon--lg" aria-hidden="true"><Icon size={26} /></span>
            <div>
              <h2>{step.title}</h2>
              <p className="pub-life__plain">{step.plain}</p>
            </div>
          </div>

          <div className="pub-life__role-line">
            <span className="chip" style={{ background: 'var(--primary-500)', color: '#fff' }}>For {ROLE_LABEL[role]}</span>
            <strong>{detail.headline}</strong>
          </div>

          <div className="pub-life__cols">
            <div>
              <h3>What you do</h3>
              <ul className="pub-ticks">{detail.does.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
            <div>
              <h3>What you can see</h3>
              <ul className="pub-ticks pub-ticks--eye">{detail.sees.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          </div>

          <div className="pub-life__guard">
            <ShieldCheck size={20} aria-hidden="true" />
            <div>
              <strong>What the platform checks</strong>
              <p>{detail.guard}</p>
            </div>
          </div>

          <Banner tone="green" className="pub-life__term">
            <strong>In plain words, {step.term[0].toLowerCase()}:</strong> {step.term[1]}
          </Banner>

          <div className="pub-life__nav">
            <Button variant="outline" onClick={() => goTo(idx - 1)} disabled={idx === 0}><ArrowLeft size={16} />Previous</Button>
            {last ? (
              <Link to={endLink.to} className="btn btn--primary">{endLink.label}<ArrowRight size={16} /></Link>
            ) : (
              <Button onClick={() => goTo(idx + 1)}>Next step<ArrowRight size={16} /></Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
