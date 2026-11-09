import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, ShieldCheck, Scale, Users, EyeOff, Ban, MessageSquareReply, Paperclip, StickyNote, UserCheck } from 'lucide-react';
import { useApp, simulate, newId } from '../../context/AppContext.jsx';
import {
  PageHeader, Card, Breadcrumb, StatusPill, Button, ConfirmDialog, Timeline, Modal, SelectField, TextAreaField, TextField, Checkbox, FileDrop,
} from '../../components/ui/index.js';
import { formatNaira, formatDateShort } from '../../utils/format.js';
import { RISK_PATHS, PATH_STEPS, GUARDRAILS, CASE_STATUSES, defaultPathDone } from '../../components/admb/riskPaths.js';
import { nowIso, addDaysIso, dayDiff, findPkg, pkgName, coopNameOfPkg, otherAdmin, adminRoleLabel, milestoneFlags } from '../../components/admb/lib.js';
import { PageMissing, At, atText, ActingAs } from '../../components/admb/ui.jsx';
import '../../styles/pages/admb.css';

const EVIDENCE_TYPES = ['Written statement', 'Input delivery receipts', 'Supplier invoice', 'Field inspection report', 'Harvest quantities', 'Storage record', 'Sales receipt', 'Buyer confirmation', 'Loss record', 'Photograph'];
const sevTone = (s) => (s === 'High' ? 'red' : s === 'Medium' ? 'amber' : 'green');
const GUARD_ICONS = [Scale, EyeOff, Ban, MessageSquareReply, Users];

export default function RiskCase() {
  const { id } = useParams();
  const { data, user, update, notify, toast } = useApp();
  const c = data.riskCases.find((x) => x.id === id);

  const [stepForm, setStepForm] = useState({ a: '', b: '', note: '', ok: false });
  const [stepErr, setStepErr] = useState({});
  const [confirm, setConfirm] = useState(null); // 'notify' | 'sign' | 'resolve' | 'status'
  const [noteText, setNoteText] = useState('');
  const [noteErr, setNoteErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [evOpen, setEvOpen] = useState(false);
  const [ev, setEv] = useState({ type: EVIDENCE_TYPES[0], note: '', files: [] });
  const [evErr, setEvErr] = useState('');
  const [respOpen, setRespOpen] = useState(false);
  const [resp, setResp] = useState({ from: '', text: '', disputed: false });
  const [respErr, setRespErr] = useState('');
  const [st, setSt] = useState({ status: '', note: '', outcome: '' });
  const [stErr, setStErr] = useState({});

  const done = c ? (c.pathDone ?? defaultPathDone(c)) : 0;
  useEffect(() => { setStepForm({ a: '', b: '', note: '', ok: false }); setStepErr({}); }, [id, done]);
  useEffect(() => { if (c) setSt({ status: c.status, note: '', outcome: '' }); setStErr({}); }, [id, c?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!c) return <PageMissing crumbs={[{ label: 'Risk alerts', to: '/admin/risk-alerts' }, { label: 'Not found' }]} title="Risk case not found" text="This case does not exist or the link is out of date." backTo="/admin/risk-alerts" backLabel="Back to risk alerts" />;

  const path = RISK_PATHS[c.category] || RISK_PATHS['Project delay'];
  const pkg = findPkg(data, c.packageId);
  const coopName = coopNameOfPkg(data, c.packageId);
  const closed = c.status === 'Resolved';
  const evidence = c.evidence || [];
  const responses = c.responses || [];
  const other = otherAdmin(data, user);
  const needsSecond = !!path.needsSecondReviewer;
  const dueIn = c.responseDueBy ? dayDiff(c.responseDueBy) : null;

  const log = (patch, text, audit) => update('riskCases', c.id, (r) => ({ ...patch, timeline: [...(r.timeline || []), { at: nowIso(), by: user.name, text }] }), { entityType: 'Risk case', ...audit });
  const sf = (k) => (e) => { setStepForm((s) => ({ ...s, [k]: e.target.value })); setStepErr({}); };
  const fail = (e) => { setStepErr(e); return Object.keys(e).length > 0; };

  /* ---------- path steps ---------- */
  const defaultMsg = `We are looking at "${c.title}" for ${pkg?.name}. This is a request for information, not an accusation. Please tell us what happened and share anything that helps. You may respond and dispute any part of this at any time.`;
  const msg = stepForm.note || defaultMsg;

  const trySendNotice = () => {
    if (fail({ ...(Number(stepForm.a || 7) < 1 ? { a: 'Choose a response window.' } : {}), ...(msg.trim().length < 20 ? { note: 'Write a message of at least 20 characters.' } : {}) })) return;
    setConfirm('notify');
  };
  const doNotify = async () => {
    setBusy(true); await simulate(600);
    const days = Number(stepForm.a || 7); const due = addDaysIso(days);
    log({ status: 'Awaiting Response', pathDone: 2, responseDueBy: due }, `Cooperative notified and given until ${formatDateShort(due)} to respond. They may dispute this case.`, { action: 'Cooperative notified and response window opened', summary: `${c.title}. Response due ${formatDateShort(due)}. Status ${c.status} to Awaiting Response.`, reason: msg.trim() });
    notify('cooperative', `Please respond: ${c.title}`, `${msg.trim()} Response requested by ${formatDateShort(due)}.`, '/coop/notifications', 'risk');
    setBusy(false); setConfirm(null); toast('The cooperative was notified. They have until the response date and can dispute the case.');
  };

  const doEvidenceStep = () => {
    if (fail(evidence.length === 0 && !stepForm.ok ? { ok: 'Add at least one piece of evidence, or tick the box to say none is needed.' } : {})) return;
    log({ status: 'Under Review', pathDone: 3 }, `Evidence collection marked complete (${evidence.length} item${evidence.length === 1 ? '' : 's'}).${stepForm.note ? ` Note: ${stepForm.note.trim()}` : ''}`, { action: 'Evidence collection completed', summary: `${c.title}: ${evidence.length} evidence item(s). Status ${c.status} to Under Review.`, reason: stepForm.note.trim() || 'Reviewer confirmed enough evidence has been gathered' });
    toast('Evidence step done. Next, classify the case.');
  };

  const doClassify = () => {
    if (fail({ ...(!stepForm.a ? { a: 'Choose a classification.' } : {}), ...(stepForm.note.trim().length < 15 ? { note: 'Explain your reasoning in at least 15 characters.' } : {}) })) return;
    log({ pathDone: 4, classification: { value: stepForm.a, note: stepForm.note.trim(), by: user.name, at: nowIso() } }, `Classified as "${stepForm.a}". ${stepForm.note.trim()}`, { action: 'Risk case classified', summary: `${c.title}: ${stepForm.a}`, reason: stepForm.note.trim() });
    toast('Classification recorded.');
  };

  const doDecide = () => {
    if (fail({ ...(!stepForm.a ? { a: 'Choose an action.' } : {}), ...(stepForm.note.trim().length < 15 ? { note: 'Explain why this action is proportionate in at least 15 characters.' } : {}) })) return;
    const decision = { action: stepForm.a, note: stepForm.note.trim(), by: user.name, at: nowIso() };
    if (needsSecond) {
      log({ decision }, `Decision proposed: "${stepForm.a}". A second reviewer must sign off before the case can move on.`, { action: 'Decision proposed, second reviewer needed', summary: `${c.title}: ${stepForm.a}`, reason: stepForm.note.trim() });
      notify('admin', 'Second reviewer needed', `${c.title} (${pkg?.name}) needs a second reviewer to sign off a decision proposed by ${user.name}.`, `/admin/risk-alerts/${c.id}`, 'risk');
      toast('Decision proposed. A different administrator must sign it off.', 'info');
    } else {
      log({ pathDone: 5, decision }, `Decision recorded: "${stepForm.a}". ${stepForm.note.trim()}`, { action: 'Proportionate action decided', summary: `${c.title}: ${stepForm.a}`, reason: stepForm.note.trim() });
      toast('Decision recorded.');
    }
  };

  const doSign = async () => {
    setBusy(true); await simulate(500);
    log({ pathDone: 5, decision: { ...c.decision, secondReviewer: { by: user.name, at: nowIso() } } }, `Second reviewer ${user.name} signed off the decision "${c.decision.action}".`, { action: 'Second reviewer signed off', summary: `${c.title}: ${c.decision.action}`, reason: `Proposed by ${c.decision.by}, signed off by ${user.name}` });
    notify('admin', 'Second review completed', `${user.name} signed off the decision on ${c.title}.`, `/admin/risk-alerts/${c.id}`, 'risk');
    setBusy(false); setConfirm(null); toast('Signed off. The case can now be documented and closed.');
  };

  const tryResolve = () => {
    if (fail(stepForm.note.trim().length < 20 ? { note: 'Write the outcome in at least 20 characters: what was decided, why, and who was told.' } : {})) return;
    setConfirm('resolve');
  };
  const doResolve = async () => {
    setBusy(true); await simulate(600);
    log({ status: 'Resolved', pathDone: 6, outcome: stepForm.note.trim(), resolvedAt: nowIso(), resolvedBy: user.name }, `Case closed. Outcome: ${stepForm.note.trim()}`, { action: 'Risk case resolved', summary: `${c.title}: status ${c.status} to Resolved`, reason: stepForm.note.trim() });
    notify('cooperative', `Case closed: ${c.title}`, `The review of "${c.title}" is complete. Outcome: ${stepForm.note.trim()} You can still raise a dispute through Complaints.`, '/coop/notifications', 'risk');
    setBusy(false); setConfirm(null); toast('Case closed with a recorded outcome.');
  };

  /* ---------- notes, evidence, responses, status ---------- */
  const addNote = () => {
    if (noteText.trim().length < 5) { setNoteErr('Write a note of at least 5 characters.'); return; }
    log({}, `Note: ${noteText.trim()}`, { action: 'Risk case note added', summary: c.title, reason: noteText.trim() });
    setNoteText(''); setNoteErr(''); toast('Note added to the timeline. Notes are visible to administrators only.');
  };
  const addEvidence = async () => {
    if (!ev.files.length) { setEvErr('Choose a file to attach. It stays in your browser in this demo.'); return; }
    setBusy(true); await simulate(500);
    const items = ev.files.map((f) => ({ id: newId('ev'), name: f.name, type: ev.type, addedBy: user.name, at: nowIso(), note: ev.note.trim() }));
    log({ evidence: [...evidence, ...items] }, `Evidence added: ${items.map((i) => i.name).join(', ')} (${ev.type}).`, { action: 'Evidence added to risk case', summary: `${c.title}: ${items.length} file(s), ${ev.type}`, reason: ev.note.trim() || 'Evidence collected' });
    setBusy(false); setEvOpen(false); setEv({ type: EVIDENCE_TYPES[0], note: '', files: [] }); setEvErr('');
    toast('Evidence added. Photos and GPS support a case but are not conclusive.');
  };
  const addResponse = async () => {
    if (resp.text.trim().length < 10) { setRespErr('Record what they said in at least 10 characters.'); return; }
    setBusy(true); await simulate(500);
    const from = resp.from.trim() || coopName;
    const r = { id: newId('rs'), at: nowIso(), by: from, text: resp.text.trim(), disputed: resp.disputed, loggedBy: user.name };
    log({ responses: [...responses, r], ...(resp.disputed ? { disputed: true } : {}) }, `Response received from ${from}${resp.disputed ? ' (they dispute this case)' : ''}: ${resp.text.trim()}`, { action: resp.disputed ? 'Cooperative disputed the case' : 'Cooperative response logged', summary: c.title, reason: resp.text.trim() });
    setBusy(false); setRespOpen(false); setResp({ from: '', text: '', disputed: false }); setRespErr('');
    toast(resp.disputed ? 'Response and dispute logged. Review it before drawing any conclusion.' : 'Response logged.');
  };
  const takeOwnership = () => {
    log({ owner: user.name }, `${user.name} took ownership of the case.`, { action: 'Risk case assigned', summary: `${c.title}: owner ${c.owner} to ${user.name}`, reason: 'Assigned to self' });
    toast('You now own this case.');
  };

  const tryStatus = () => {
    const e = {};
    if (st.status === c.status) e.status = 'Choose a different status.';
    if (st.note.trim().length < 10) e.note = 'Explain the change in at least 10 characters.';
    if (st.status === 'Resolved') {
      if (!c.classification) e.status = 'Classify the case before resolving it.';
      else if (needsSecond && !c.decision?.secondReviewer) e.status = 'Confirmed fraud or breach needs a second reviewer to sign off before it can be resolved.';
      if (st.outcome.trim().length < 20) e.outcome = 'Write the outcome in at least 20 characters.';
    }
    setStErr(e);
    if (Object.keys(e).length === 0) setConfirm('status');
  };
  const doStatus = async () => {
    setBusy(true); await simulate(500);
    const to = st.status;
    const patch = { status: to, ...(to === 'Resolved' ? { pathDone: 6, outcome: st.outcome.trim(), resolvedAt: nowIso(), resolvedBy: user.name } : closed ? { pathDone: Math.min(done, 5), outcome: '' } : {}) };
    log(patch, `Status changed from ${c.status} to ${to}. ${st.note.trim()}`, { action: 'Risk case status changed', summary: `${c.title}: ${c.status} to ${to}`, reason: st.note.trim() });
    if (to === 'Escalated') notify('admin', 'Risk case escalated', `${c.title} (${pkg?.name}) was escalated by ${user.name}.`, `/admin/risk-alerts/${c.id}`, 'risk');
    if (to === 'Resolved') notify('cooperative', `Case closed: ${c.title}`, `The review of "${c.title}" is complete. Outcome: ${st.outcome.trim()}`, '/coop/notifications', 'risk');
    setBusy(false); setConfirm(null); toast(`Status is now ${to}.`);
  };

  /* ---------- render helpers ---------- */
  const stepState = (i) => (i < done ? 'done' : i === done && !closed ? 'current' : 'todo');
  const related = {
    complaints: data.complaints.filter((x) => x.packageId === c.packageId),
    milestones: data.milestones.filter((x) => x.packageId === c.packageId && milestoneFlags(x).overdue),
    payments: data.disbursements.filter((x) => x.packageId === c.packageId && ['Pending', 'Reviewing'].includes(x.status)),
  };

  const stepPanel = () => {
    if (closed) return (
      <div className="admb-hint admb-hint--ok"><strong>Case closed.</strong> {c.outcome || 'Outcome recorded in the timeline.'}{c.resolvedAt ? <> Closed by {c.resolvedBy || 'an administrator'} on <At value={c.resolvedAt} />.</> : null}</div>
    );
    if (done <= 1) return (
      <div className="admb-stepbox">
        <div className="admb-stepbox__title">Step 2: Notify and allow response</div>
        <p className="small">{path.steps[1]}</p>
        <SelectField label="Response window" required options={[{ value: '3', label: '3 days' }, { value: '7', label: '7 days' }, { value: '14', label: '14 days' }]} value={stepForm.a || '7'} onChange={sf('a')} error={stepErr.a} />
        <TextAreaField label="Message to the cooperative" required hint="Plain, neutral wording. They can respond and dispute." value={msg} onChange={sf('note')} error={stepErr.note} />
        <Button onClick={trySendNotice}>Notify the cooperative</Button>
      </div>
    );
    if (done === 2) return (
      <div className="admb-stepbox">
        <div className="admb-stepbox__title">Step 3: Collect evidence</div>
        <p className="small">{path.steps[2]}</p>
        <p className="small muted">{evidence.length} item{evidence.length === 1 ? '' : 's'} collected so far. Photos and GPS support a case but are not conclusive on their own.</p>
        <div className="row-wrap"><Button variant="outline" onClick={() => setEvOpen(true)}><Paperclip size={18} />Add evidence</Button></div>
        {evidence.length === 0 && <Checkbox checked={stepForm.ok} onChange={(v) => { setStepForm((s) => ({ ...s, ok: v })); setStepErr({}); }} error={stepErr.ok}>No further evidence is needed for this case.</Checkbox>}
        <TextAreaField label="Note on the evidence" optional value={stepForm.note} onChange={sf('note')} />
        <Button onClick={doEvidenceStep}>Mark evidence collected</Button>
      </div>
    );
    if (done === 3) return (
      <div className="admb-stepbox">
        <div className="admb-stepbox__title">Step 4: Classify</div>
        <p className="small">{path.steps[3]}</p>
        <SelectField label="Classification" required options={path.classifications} placeholder="Choose one" value={stepForm.a} onChange={sf('a')} error={stepErr.a} />
        <TextAreaField label="Reasoning" required hint="Which evidence and which response led to this?" value={stepForm.note} onChange={sf('note')} error={stepErr.note} />
        <div className="admb-hint">{path.guard}</div>
        <Button onClick={doClassify}>Record classification</Button>
      </div>
    );
    if (done === 4) {
      const proposed = c.decision && needsSecond;
      return (
        <div className="admb-stepbox">
          <div className="admb-stepbox__title">Step 5: Decide a proportionate action</div>
          <p className="small">{path.steps[4]}</p>
          {c.classification && <p className="small muted">Classified as: <strong>{c.classification.value}</strong></p>}
          {proposed ? (
            <>
              <div className="admb-hint admb-hint--warn"><strong>Proposed by {c.decision.by}:</strong> {c.decision.action}. {c.decision.note}<br />A different administrator must sign this off as second reviewer.</div>
              {c.decision.by === user.name
                ? <div className="admb-hint">You proposed this decision, so you cannot sign it off.{other ? ` Use the Account menu to switch to ${other.name} (${adminRoleLabel(other)}).` : ''}</div>
                : <Button onClick={() => setConfirm('sign')}><UserCheck size={18} />Sign off as second reviewer</Button>}
            </>
          ) : (
            <>
              <SelectField label="Action" required options={path.actions} placeholder="Choose one" value={stepForm.a} onChange={sf('a')} error={stepErr.a} />
              <TextAreaField label="Why is this proportionate?" required value={stepForm.note} onChange={sf('note')} error={stepErr.note} />
              {/pause|paused/i.test(stepForm.a) && <div className="admb-hint">To pause new payments, use <Link to={`/admin/monitoring/${c.packageId}`}>Suspend new disbursements</Link> on the project page. A pause is a precaution, not a penalty.</div>}
              {needsSecond && <div className="admb-hint admb-hint--warn">This category needs a second reviewer. After you propose a decision, a different administrator must sign it off.</div>}
              <Button onClick={doDecide}>{needsSecond ? 'Propose decision' : 'Record decision'}</Button>
            </>
          )}
        </div>
      );
    }
    return (
      <div className="admb-stepbox">
        <div className="admb-stepbox__title">Step 6: Document the outcome</div>
        <p className="small">{path.steps[5]}</p>
        {c.decision && <p className="small muted">Decision: <strong>{c.decision.action}</strong>{c.decision.secondReviewer ? ` (second reviewer ${c.decision.secondReviewer.by})` : ''}</p>}
        <TextAreaField label="Outcome" required hint="What was decided, why, and who was told." value={stepForm.note} onChange={sf('note')} error={stepErr.note} />
        <Button onClick={tryResolve}>Close the case</Button>
      </div>
    );
  };

  return (
    <div className="page">
      <Breadcrumb items={[{ label: 'Risk alerts', to: '/admin/risk-alerts' }, { label: c.title }]} />
      <PageHeader
        title={c.title}
        subtitle={<>{c.category} · <Link to={`/admin/monitoring/${c.packageId}`}>{pkg?.name}</Link> · {coopName}</>}
        actions={<div className="admb-pillrow"><StatusPill tone={sevTone(c.severity)}>{c.severity} severity</StatusPill><StatusPill>{c.status}</StatusPill>{c.disputed && <span className="admb-flag admb-flag--blue">Disputed by cooperative</span>}</div>}
      />
      <ActingAs user={user} />
      <div className="admb-rules admb-rules--guard">
        <h3 className="admb-rules__title">{path.guard}</h3>
        <p className="small">{path.blurb}</p>
      </div>

      <div className="admb-main">
        <div className="admb-col">
          <Card>
            <div className="admb-head">
              <div><h2 className="admb-card-title">Review path: {c.category}</h2><p className="admb-card-sub">Opened {formatDateShort(c.raisedAt)} · Owner {c.owner}</p></div>
              {c.owner !== user.name && !closed && <Button size="sm" variant="outline" onClick={takeOwnership}>Take ownership</Button>}
            </div>
            <p className="small" style={{ marginBottom: 14 }}>{c.detail}</p>
            <ol className="admb-pathsteps" aria-label="Review path">
              {PATH_STEPS.map((s, i) => {
                const state = stepState(i);
                return (
                  <li key={s} className={`admb-pathstep admb-pathstep--${state === 'todo' ? 'todo' : state}`} aria-current={state === 'current' ? 'step' : undefined}>
                    <span className="admb-pathstep__num">{state === 'done' ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : i + 1}</span>
                    <span><strong>{s}</strong><span className="admb-pathstep__state" style={{ display: 'block' }}>{state === 'done' ? 'Done' : state === 'current' ? 'Next step' : 'Later'}</span></span>
                  </li>
                );
              })}
            </ol>
            <div style={{ marginTop: 16 }}>{stepPanel()}</div>
            {done >= 2 && !closed && <details style={{ marginTop: 12 }}><summary className="small strong" style={{ cursor: 'pointer' }}>What each step means for this category</summary><ol className="admb-effects" style={{ marginTop: 8 }}>{path.steps.map((t, i) => <li key={t}><strong>{PATH_STEPS[i]}.</strong> {t}</li>)}</ol></details>}
          </Card>

          <Card>
            <div className="admb-head">
              <div><h2 className="admb-card-title">Response from the cooperative</h2><p className="admb-card-sub">{c.responseDueBy ? `Response requested by ${formatDateShort(c.responseDueBy)}${dueIn !== null && dueIn < 0 && responses.length === 0 ? `, ${-dueIn} day${-dueIn === 1 ? '' : 's'} ago. No reply is not an admission. Follow up before drawing any conclusion.` : '.'}` : 'No response has been requested yet.'}</p></div>
              {!closed && <Button size="sm" variant="outline" onClick={() => setRespOpen(true)}><MessageSquareReply size={16} />Log a response</Button>}
            </div>
            {responses.length === 0 ? <p className="small muted">No response yet.</p> : (
              <ul className="admb-notelist">
                {responses.map((r) => (<li key={r.id} className="admb-note"><div className="admb-note__meta">{r.by} · <At value={r.at} />{r.disputed ? ' · disputes this case' : ''} · logged by {r.loggedBy}</div>{r.text}</li>))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="admb-head">
              <div><h2 className="admb-card-title">Evidence</h2><p className="admb-card-sub">Photos and GPS support a case but are not conclusive.</p></div>
              {!closed && <Button size="sm" variant="outline" onClick={() => setEvOpen(true)}><Paperclip size={16} />Add evidence</Button>}
            </div>
            {evidence.length === 0 ? <p className="small muted">No evidence has been added to this case yet.</p> : (
              <ul className="admb-notelist">
                {evidence.map((e) => (<li key={e.id} className="admb-note"><div className="strong small">{e.name}</div><div className="admb-note__meta">{e.type} · added by {e.addedBy} · <At value={e.at} /></div>{e.note && <div className="small">{e.note}</div>}</li>))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="admb-card-title">Timeline</h2>
            <div style={{ margin: '14px 0' }}>
              {(c.timeline || []).length === 0 ? <p className="small muted">Nothing has happened on this case yet.</p> : <Timeline items={c.timeline.map((t) => ({ title: t.text, meta: `${t.by ? `${t.by} · ` : ''}${atText(t.at)}`, state: 'done' }))} />}
            </div>
            <TextAreaField label="Add a note" hint="Notes are visible to administrators only. To tell the cooperative something, use the review path." value={noteText} error={noteErr} onChange={(e) => { setNoteText(e.target.value); setNoteErr(''); }} />
            <div style={{ marginTop: 10 }}><Button variant="outline" onClick={addNote}><StickyNote size={16} />Add note</Button></div>
          </Card>
        </div>

        <div className="admb-col">
          <Card>
            <h2 className="admb-card-title">Change status</h2>
            <p className="admb-card-sub">Use this for corrections. Normal progress moves with the review path.</p>
            <div className="stack" style={{ marginTop: 12 }}>
              <SelectField label="Status" required options={CASE_STATUSES} value={st.status} onChange={(e) => { setSt((s) => ({ ...s, status: e.target.value })); setStErr({}); }} error={stErr.status} />
              <TextAreaField label="Why?" required value={st.note} onChange={(e) => { setSt((s) => ({ ...s, note: e.target.value })); setStErr((s) => ({ ...s, note: '' })); }} error={stErr.note} />
              {st.status === 'Resolved' && c.status !== 'Resolved' && <TextAreaField label="Outcome" required hint="What was decided and who was told." value={st.outcome} onChange={(e) => { setSt((s) => ({ ...s, outcome: e.target.value })); setStErr((s) => ({ ...s, outcome: '' })); }} error={stErr.outcome} />}
              <Button variant="outline" onClick={tryStatus}>Update status</Button>
            </div>
          </Card>

          <Card>
            <h2 className="admb-card-title">Guardrails</h2>
            <ul className="admb-guardlist" style={{ marginTop: 12 }}>
              {GUARDRAILS.map((g, i) => { const Icon = GUARD_ICONS[i] || ShieldCheck; return <li key={g}><Icon size={18} aria-hidden="true" /><span>{g}</span></li>; })}
            </ul>
          </Card>

          {c.classification && (
            <Card>
              <h2 className="admb-card-title">Classification</h2>
              <p className="small" style={{ marginTop: 8 }}><strong>{c.classification.value}</strong></p>
              <p className="cell-sub">{c.classification.note}</p>
              <p className="cell-sub">{c.classification.by}, <At value={c.classification.at} /></p>
            </Card>
          )}
          {c.decision && (
            <Card>
              <h2 className="admb-card-title">Decision</h2>
              <p className="small" style={{ marginTop: 8 }}><strong>{c.decision.action}</strong></p>
              <p className="cell-sub">{c.decision.note}</p>
              <p className="cell-sub">Proposed by {c.decision.by}{c.decision.secondReviewer ? `. Second reviewer: ${c.decision.secondReviewer.by}.` : needsSecond ? '. Waiting for a second reviewer.' : '.'}</p>
            </Card>
          )}

          <Card>
            <h2 className="admb-card-title">Related records</h2>
            <ul className="admb-notelist" style={{ marginTop: 10 }}>
              <li className="small"><Link to={`/admin/monitoring/${c.packageId}`}>Project monitor: {pkgName(data, c.packageId)}</Link></li>
              {related.complaints.map((x) => <li key={x.id} className="small"><Link to={`/admin/complaints/${x.id}`}>Complaint {x.ref}: {x.subject}</Link></li>)}
              {related.milestones.map((x) => <li key={x.id} className="small"><Link to={`/admin/milestones/${x.id}`}>Overdue milestone: {x.title}</Link></li>)}
              {related.payments.map((x) => <li key={x.id} className="small"><Link to={`/admin/disbursements/${x.id}`}>Open payment: {formatNaira(x.amount)} to {x.recipientName}</Link></li>)}
            </ul>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'notify'}
        onClose={() => setConfirm(null)}
        onConfirm={doNotify}
        loading={busy}
        tone="green"
        title="Notify the cooperative?"
        message="They will see a neutral message, can respond, and can dispute the case."
        summary={[['Case', c.title], ['Project', pkg?.name], ['Sent to', coopName], ['Respond within', `${stepForm.a || 7} days`], ['Message', msg.trim().slice(0, 140) + (msg.trim().length > 140 ? '...' : '')]]}
        confirmLabel="Send notice"
      />
      <ConfirmDialog
        open={confirm === 'sign'}
        onClose={() => setConfirm(null)}
        onConfirm={doSign}
        loading={busy}
        tone="amber"
        title="Sign off as second reviewer?"
        message="You are agreeing that the evidence supports this decision. Confirmed fraud or breach is serious, so check the evidence file first."
        summary={[['Case', c.title], ['Category', c.category], ['Proposed decision', c.decision?.action], ['Proposed by', c.decision?.by], ['You', `${user.name}, second reviewer`]]}
        confirmLabel="Sign off"
      />
      <ConfirmDialog
        open={confirm === 'resolve'}
        onClose={() => setConfirm(null)}
        onConfirm={doResolve}
        loading={busy}
        tone="green"
        title="Close this case?"
        message="The outcome is recorded and the cooperative is told. They can still raise a dispute through Complaints. Nothing is deleted."
        summary={[['Case', c.title], ['Classification', c.classification?.value || 'None'], ['Decision', c.decision?.action || 'None'], ['Outcome', stepForm.note.trim()]]}
        confirmLabel="Close case"
      />
      <ConfirmDialog
        open={confirm === 'status'}
        onClose={() => setConfirm(null)}
        onConfirm={doStatus}
        loading={busy}
        tone={st.status === 'Escalated' ? 'amber' : 'green'}
        title={`Change status to ${st.status}?`}
        message="The change is written to the case timeline and the audit log."
        summary={[['Case', c.title], ['From', c.status], ['To', st.status], ['Reason', st.note.trim()]]}
        confirmLabel="Update status"
      />

      <Modal open={evOpen} onClose={() => !busy && setEvOpen(false)} title="Add evidence" white footer={(<><Button variant="outline" onClick={() => setEvOpen(false)} disabled={busy} block>Cancel</Button><Button onClick={addEvidence} loading={busy} block>Add evidence</Button></>)}>
        <div className="stack">
          <p className="small muted">Files stay in your browser in this demo. Only the file names are saved on the case.</p>
          <SelectField label="Type of evidence" required options={EVIDENCE_TYPES} value={ev.type} onChange={(e) => setEv((s) => ({ ...s, type: e.target.value }))} />
          <FileDrop label="File" multiple files={ev.files} onFiles={(files) => { setEv((s) => ({ ...s, files })); setEvErr(''); }} error={evErr} />
          <TextField label="What does it show?" optional value={ev.note} onChange={(e) => setEv((s) => ({ ...s, note: e.target.value }))} />
          {/photo/i.test(ev.type) && <div className="admb-hint admb-hint--warn">Photos and GPS locations support a case but are not conclusive on their own.</div>}
        </div>
      </Modal>
      <Modal open={respOpen} onClose={() => !busy && setRespOpen(false)} title="Log a response" white footer={(<><Button variant="outline" onClick={() => setRespOpen(false)} disabled={busy} block>Cancel</Button><Button onClick={addResponse} loading={busy} block>Save response</Button></>)}>
        <div className="stack">
          <p className="small muted">Record what the cooperative told you by phone, email or in person. They can also dispute the case.</p>
          <TextField label="Who responded?" optional placeholder={coopName} value={resp.from} onChange={(e) => setResp((s) => ({ ...s, from: e.target.value }))} />
          <TextAreaField label="What they said" required value={resp.text} error={respErr} onChange={(e) => { setResp((s) => ({ ...s, text: e.target.value })); setRespErr(''); }} />
          <Checkbox checked={resp.disputed} onChange={(v) => setResp((s) => ({ ...s, disputed: v }))}>The cooperative disputes this case.</Checkbox>
        </div>
      </Modal>
    </div>
  );
}
