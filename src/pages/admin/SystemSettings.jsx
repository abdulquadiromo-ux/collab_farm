import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, Landmark, Bell, LockKeyhole, Gavel, RotateCcw, Save, Undo2, Info } from 'lucide-react';
import { useApp, useSimulatedLoad, simulate } from '../../context/AppContext.jsx';
import { PageHeader, PageSkeleton, Card, CardHeader, SectionHead, Banner, Button, MoneyField, TextField, TextAreaField, SettingRow, StatusPill, Progress } from '../../components/ui/index.js';
import { formatNaira, formatDateTime, percent } from '../../utils/format.js';
import { nowIso, DECISION_STATUSES, DECISION_OWNERS } from '../../components/adma/helpers.js';
import { ReasonDialog, TypedConfirmDialog } from '../../components/adma/Dialogs.jsx';
import '../../styles/pages/adma.css';

const ARROW = ' → ';
const num = (v) => (v === '' || v == null ? NaN : Number(v));
const yn = (b) => (b ? 'On' : 'Off');
const STATUS_TONE = { Open: 'amber', 'In discussion': 'blue', Decided: 'green' };

const SECTIONS = {
  approvalLimits: {
    title: 'Approval limits',
    fields: [['singleApproverMax', 'Single approver maximum', formatNaira], ['secondApproverAbove', 'Second approver needed above', formatNaira], ['dailyDisbursementCap', 'Daily disbursement cap', formatNaira]],
  },
  investor: {
    title: 'Investor rules',
    fields: [['minimumInvestment', 'Minimum investment', formatNaira], ['requireRiskAcknowledgement', 'Require risk acknowledgement', yn], ['eligibilityCheck', 'Eligibility check note', (v) => `"${v}"`]],
  },
  notifications: {
    title: 'Notification rules',
    fields: [['emailEnabled', 'Email notifications', yn], ['lateReportReminderDays', 'Late report reminder (days)', String], ['milestoneReminderDays', 'Milestone reminder (days before)', String]],
  },
  security: {
    title: 'Security',
    fields: [['adminMfa', 'Administrator two-step sign in', yn], ['loginAttemptLimit', 'Failed sign-in attempts allowed', String], ['sessionMinutes', 'Session length (minutes)', String]],
  },
};

function validate(section, v) {
  const e = {};
  if (section === 'approvalLimits') {
    const a = num(v.singleApproverMax); const b = num(v.secondApproverAbove); const c = num(v.dailyDisbursementCap);
    if (!(a >= 1)) e.singleApproverMax = 'Enter an amount of at least ₦1.';
    if (!(b >= 1)) e.secondApproverAbove = 'Enter an amount of at least ₦1.';
    if (!(c >= 1)) e.dailyDisbursementCap = 'Enter an amount of at least ₦1.';
    if (b >= 1 && c >= 1 && b > c) e.secondApproverAbove = 'The second approver amount cannot be above the daily cap. Lower it or raise the cap.';
    if (a >= 1 && c >= 1 && a > c) e.singleApproverMax = 'The single approver maximum cannot be above the daily cap.';
    if (!e.secondApproverAbove && !e.singleApproverMax && b > a) e.secondApproverAbove = 'This must not be higher than the single approver maximum, or some payments would have no valid approval path.';
  }
  if (section === 'investor') {
    const m = num(v.minimumInvestment);
    if (!(m >= 1000)) e.minimumInvestment = 'Enter at least ₦1,000.';
    else if (m > 10000000) e.minimumInvestment = 'A minimum above ₦10,000,000 would shut most investors out. Enter a lower amount.';
    const t = String(v.eligibilityCheck || '').trim();
    if (t.length < 5) e.eligibilityCheck = 'Write a short note, at least 5 characters.';
    else if (t.length > 200) e.eligibilityCheck = 'Keep the note to 200 characters or fewer.';
  }
  if (section === 'notifications') {
    [['lateReportReminderDays', 30], ['milestoneReminderDays', 30]].forEach(([k, max]) => {
      const n = num(v[k]);
      if (!Number.isInteger(n) || n < 1 || n > max) e[k] = `Enter a whole number from 1 to ${max}.`;
    });
  }
  if (section === 'security') {
    const a = num(v.loginAttemptLimit); const s = num(v.sessionMinutes);
    if (!Number.isInteger(a) || a < 3 || a > 10) e.loginAttemptLimit = 'Enter a whole number from 3 to 10.';
    if (!Number.isInteger(s) || s < 5 || s > 120) e.sessionMinutes = 'Enter a whole number of minutes from 5 to 120.';
  }
  return e;
}

function normalise(section, v) {
  const out = { ...v };
  if (section === 'approvalLimits') ['singleApproverMax', 'secondApproverAbove', 'dailyDisbursementCap'].forEach((k) => { out[k] = Number(v[k]); });
  if (section === 'investor') { out.minimumInvestment = Number(v.minimumInvestment); out.eligibilityCheck = String(v.eligibilityCheck).trim(); }
  if (section === 'notifications') ['lateReportReminderDays', 'milestoneReminderDays'].forEach((k) => { out[k] = Number(v[k]); });
  if (section === 'security') ['loginAttemptLimit', 'sessionMinutes'].forEach((k) => { out[k] = Number(v[k]); });
  return out;
}

function SectionCard({ icon, title, intro, last, dirty, onSave, onDiscard, children }) {
  return (
    <Card>
      <SectionHead icon={icon} title={title} right={last && <span className="caption muted">{last}</span>} />
      {intro && <p className="small muted adma-intro">{intro}</p>}
      <div className="stack">{children}</div>
      <div className="adma-savebar">
        {dirty && <span className="caption muted">You have unsaved changes.</span>}
        <Button variant="outline" size="sm" onClick={onDiscard} disabled={!dirty}><Undo2 size={14} />Discard</Button>
        <Button size="sm" onClick={onSave} disabled={!dirty}><Save size={14} />Save changes</Button>
      </div>
    </Card>
  );
}

export default function SystemSettings() {
  const { data, user, patchData, audit, toast, resetDemo } = useApp();
  const navigate = useNavigate();
  const loading = useSimulatedLoad(350);
  const saved = data.platformSettings;
  const tracker = saved.decisionTracker || {};
  const savedTracker = Object.fromEntries((saved.pendingDecisions || []).map((l) => [l, { owner: tracker[l]?.owner || 'Unassigned', status: tracker[l]?.status || 'Open' }]));

  const [draft, setDraft] = useState(() => ({
    approvalLimits: { ...saved.approvalLimits }, investor: { ...saved.investor }, notifications: { ...saved.notifications }, security: { ...saved.security }, tracker: JSON.parse(JSON.stringify(savedTracker)),
  }));
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null); // { section, values, lines }
  const [resetOpen, setResetOpen] = useState(false);

  if (loading) return <PageSkeleton />;

  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const differs = (section) => !same(normalise(section, draft[section]), saved[section]);
  const dirty = {
    approvalLimits: differs('approvalLimits'),
    investor: differs('investor'),
    notifications: differs('notifications'),
    security: differs('security'),
    tracker: !same(draft.tracker, savedTracker),
  };
  const setField = (section, key, value) => {
    setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: value } }));
    setErrors((e) => ({ ...e, [section]: { ...(e[section] || {}), [key]: '' } }));
  };
  const discard = (section) => {
    setDraft((d) => ({ ...d, [section]: section === 'tracker' ? JSON.parse(JSON.stringify(savedTracker)) : { ...saved[section] } }));
    setErrors((e) => ({ ...e, [section]: {} }));
  };
  const lastChange = (section) => {
    const a = data.audit.find((x) => x.entityType === 'Platform settings' && x.entityId === section);
    return a ? `Last changed by ${a.actor}, ${formatDateTime(a.at)}` : 'No changes recorded yet';
  };

  const askSave = (section) => {
    if (section === 'tracker') {
      const lines = Object.keys(draft.tracker).filter((k) => !same(draft.tracker[k], savedTracker[k])).map((k) => [k, `${savedTracker[k].owner}, ${savedTracker[k].status}${ARROW}${draft.tracker[k].owner}, ${draft.tracker[k].status}`]);
      setConfirm({ section, values: draft.tracker, lines });
      return;
    }
    const e = validate(section, draft[section]);
    setErrors((x) => ({ ...x, [section]: e }));
    if (Object.keys(e).length) { toast('Some values need fixing before you can save. See the messages under each field.', 'error'); return; }
    const values = normalise(section, draft[section]);
    const lines = SECTIONS[section].fields.filter(([k]) => !same(values[k], saved[section][k])).map(([k, label, fmt]) => [label, `${fmt(saved[section][k])}${ARROW}${fmt(values[k])}`]);
    setConfirm({ section, values, lines });
  };

  const doSave = async (reason) => {
    const { section, values, lines } = confirm;
    await simulate(600);
    const before = lines.map(([k, v]) => `${k}: ${v.split(ARROW)[0]}`).join('; ');
    const after = lines.map(([k, v]) => `${k}: ${v.split(ARROW)[1]}`).join('; ');
    if (section === 'tracker') {
      const at = nowIso();
      const next = { ...(saved.decisionTracker || {}) };
      Object.keys(values).forEach((k) => { if (!same(values[k], savedTracker[k])) next[k] = { ...values[k], updatedBy: user.name, updatedAt: at }; });
      patchData((d) => ({ platformSettings: { ...d.platformSettings, decisionTracker: next } }));
    } else {
      patchData((d) => ({ platformSettings: { ...d.platformSettings, [section]: values } }));
    }
    audit({
      action: section === 'tracker' ? 'Pending decision tracker updated' : 'System settings changed', entityType: 'Platform settings', entityId: section,
      summary: `${section === 'tracker' ? 'Pending decisions' : SECTIONS[section].title}: ${lines.map(([k, v]) => `${k} ${v}`).join('; ')}`, reason, before, after,
    });
    toast(`${section === 'tracker' ? 'Pending decisions' : SECTIONS[section].title} saved.`);
    setConfirm(null);
  };

  const doReset = async () => {
    await simulate(700);
    resetDemo();
    toast('Demo data was reset to the original sample records.', 'info');
    setResetOpen(false);
    navigate('/admin');
  };

  const lim = draft.approvalLimits;
  const effective = Math.min(num(lim.singleApproverMax) || 0, num(lim.secondApproverAbove) || 0);
  const decided = Object.values(savedTracker).filter((t) => t.status === 'Decided').length;
  const total = Object.keys(savedTracker).length;
  const err = (s) => errors[s] || {};

  return (
    <div className="page adma-page">
      <PageHeader title="System settings" subtitle="Rules the platform applies for everyone. Each save is confirmed, explained with a reason and written to the audit log with before and after values." />

      <Banner tone="info" title="Changes apply to new activity">
        Records already approved or paid are never changed by a setting. Money rules here are demo values and stay configurable until the organisation decides them.
      </Banner>

      <div className="grid-2 adma-settings">
        <SectionCard
          icon={<Scale size={18} />} title="Approval limits" last={lastChange('approvalLimits')} dirty={dirty.approvalLimits}
          onSave={() => askSave('approvalLimits')} onDiscard={() => discard('approvalLimits')}
          intro="Maker-checker means no payment is approved by the person who raised it, and larger payments need two different approvers."
        >
          <MoneyField label="Single approver maximum" required value={lim.singleApproverMax} onChange={(v) => setField('approvalLimits', 'singleApproverMax', v)} error={err('approvalLimits').singleApproverMax} hint="One approver can authorise a payment up to this amount." />
          <MoneyField label="Second approver needed above" required value={lim.secondApproverAbove} onChange={(v) => setField('approvalLimits', 'secondApproverAbove', v)} error={err('approvalLimits').secondApproverAbove} hint="Above this amount a second, different approver must also approve." />
          <MoneyField label="Daily disbursement cap" required value={lim.dailyDisbursementCap} onChange={(v) => setField('approvalLimits', 'dailyDisbursementCap', v)} error={err('approvalLimits').dailyDisbursementCap} hint="The most that can be paid out in one day, in total." />
          {effective > 0 && <div className="adma-effective"><Info size={16} aria-hidden="true" /><span>In effect: payments up to <strong>{formatNaira(effective)}</strong> need one approver. Anything above needs two different people. The daily total never goes above <strong>{formatNaira(num(lim.dailyDisbursementCap) || 0)}</strong>.</span></div>}
        </SectionCard>

        <SectionCard
          icon={<Landmark size={18} />} title="Investor rules" last={lastChange('investor')} dirty={dirty.investor}
          onSave={() => askSave('investor')} onDiscard={() => discard('investor')}
          intro="What an investor must satisfy before committing. A commitment is a promise, not money received."
        >
          <MoneyField label="Minimum investment" required value={draft.investor.minimumInvestment} onChange={(v) => setField('investor', 'minimumInvestment', v)} error={err('investor').minimumInvestment} hint="The smallest amount one investor can commit to a package." />
          <SettingRow title="Require risk acknowledgement" description="The investor must read and tick the risk disclosure before committing." checked={!!draft.investor.requireRiskAcknowledgement} onChange={(v) => setField('investor', 'requireRiskAcknowledgement', v)} />
          {!draft.investor.requireRiskAcknowledgement && <Banner tone="warn" title="Think twice">Without the acknowledgement an investor could commit without confirming they understand that returns are not guaranteed. Only switch this off after a documented legal decision.</Banner>}
          <TextAreaField label="Eligibility check note" required value={draft.investor.eligibilityCheck} onChange={(e) => setField('investor', 'eligibilityCheck', e.target.value)} error={err('investor').eligibilityCheck} rows={3} hint="Shown to reviewers. The real rule depends on the legal structure, which is still to be decided." />
        </SectionCard>

        <SectionCard
          icon={<Bell size={18} />} title="Notification rules" last={lastChange('notifications')} dirty={dirty.notifications}
          onSave={() => askSave('notifications')} onDiscard={() => discard('notifications')}
          intro="When the platform nudges people. In-app notifications are always on."
        >
          <SettingRow title="Send email as well as in-app notifications" description="Sensitive details are never put in an email." checked={!!draft.notifications.emailEnabled} onChange={(v) => setField('notifications', 'emailEnabled', v)} />
          <TextField label="Late report reminder (days)" required type="number" min="1" max="30" inputMode="numeric" value={draft.notifications.lateReportReminderDays} onChange={(e) => setField('notifications', 'lateReportReminderDays', e.target.value)} error={err('notifications').lateReportReminderDays} hint="Days after a missed deadline before a reminder is sent. A late report is never treated as fraud." />
          <TextField label="Milestone reminder (days before)" required type="number" min="1" max="30" inputMode="numeric" value={draft.notifications.milestoneReminderDays} onChange={(e) => setField('notifications', 'milestoneReminderDays', e.target.value)} error={err('notifications').milestoneReminderDays} hint="Days before a milestone is due when the cooperative is reminded." />
        </SectionCard>

        <SectionCard
          icon={<LockKeyhole size={18} />} title="Security" last={lastChange('security')} dirty={dirty.security}
          onSave={() => askSave('security')} onDiscard={() => discard('security')}
          intro="How administrators sign in. These apply to all administrator accounts."
        >
          <SettingRow title="Two-step sign in for administrators" description="Administrators confirm a code as well as their password." checked={!!draft.security.adminMfa} onChange={(v) => setField('security', 'adminMfa', v)} />
          {!draft.security.adminMfa && <Banner tone="warn" title="Administrator accounts approve money">Turning off two-step sign in makes these accounts easier to take over. Record why in the next step.</Banner>}
          <TextField label="Failed sign-in attempts allowed" required type="number" min="3" max="10" inputMode="numeric" value={draft.security.loginAttemptLimit} onChange={(e) => setField('security', 'loginAttemptLimit', e.target.value)} error={err('security').loginAttemptLimit} hint="After this many wrong passwords the account is locked until reset." />
          <TextField label="Session length (minutes)" required type="number" min="5" max="120" inputMode="numeric" value={draft.security.sessionMinutes} onChange={(e) => setField('security', 'sessionMinutes', e.target.value)} error={err('security').sessionMinutes} hint="Minutes of inactivity before a person is signed out." />
        </SectionCard>
      </div>

      <Card>
        <SectionHead icon={<Gavel size={18} />} title="Pending decisions" right={<span className="caption muted">{lastChange('tracker')}</span>} />
        <Banner tone="green" title="The portal never decides these">
          These are open questions for the organisation (funding model, who bears a crop loss, and so on). Examples shown in the app are labelled illustrative and configurable. Mark an item Decided only after the decision has been made outside the portal. That records who updated it and when, and changes no rule, amount or screen.
        </Banner>
        <div className="adma-decided">
          <span className="small"><strong>{decided}</strong> of {total} decided</span>
          <Progress value={percent(decided, total)} label="Decisions made" />
        </div>
        <ul className="adma-decisions">
          {Object.keys(draft.tracker).map((label) => {
            const t = draft.tracker[label];
            const meta = tracker[label];
            return (
              <li key={label}>
                <div className="grow">
                  <div className="strong">{label}</div>
                  <div className="caption muted">{meta ? `Updated by ${meta.updatedBy}, ${formatDateTime(meta.updatedAt)}` : 'No update yet'}</div>
                </div>
                <label className="adma-sel"><span className="sr-only">Owner for {label}</span>
                  <select className="select select--filter" value={t.owner} onChange={(e) => setDraft((d) => ({ ...d, tracker: { ...d.tracker, [label]: { ...d.tracker[label], owner: e.target.value } } }))}>
                    {DECISION_OWNERS.map((o) => <option key={o} value={o}>{o === 'Unassigned' ? 'Owner: unassigned' : o}</option>)}
                  </select>
                </label>
                <label className="adma-sel"><span className="sr-only">Status for {label}</span>
                  <select className="select select--filter" value={t.status} onChange={(e) => setDraft((d) => ({ ...d, tracker: { ...d.tracker, [label]: { ...d.tracker[label], status: e.target.value } } }))}>
                    {DECISION_STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
                <StatusPill tone={STATUS_TONE[t.status]}>{t.status}</StatusPill>
              </li>
            );
          })}
        </ul>
        <div className="adma-savebar">
          {dirty.tracker && <span className="caption muted">You have unsaved changes.</span>}
          <Button variant="outline" size="sm" onClick={() => discard('tracker')} disabled={!dirty.tracker}><Undo2 size={14} />Discard</Button>
          <Button size="sm" onClick={() => askSave('tracker')} disabled={!dirty.tracker}><Save size={14} />Save changes</Button>
        </div>
      </Card>

      <Card className="adma-demo">
        <CardHeader title="Demo tools" subtitle="For this demonstration only. A live platform never offers this." />
        <Banner tone="danger" title="Demo only: this deletes everything you did in this browser">
          Resetting puts every record, notification and audit entry back to the original sample data. It cannot be undone. No real data is affected because there is none.
        </Banner>
        <div><Button variant="danger-outline" onClick={() => setResetOpen(true)}><RotateCcw size={16} />Reset demo data</Button></div>
      </Card>

      <ReasonDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doSave}
        tone="amber"
        title={confirm ? `Save ${confirm.section === 'tracker' ? 'pending decisions' : SECTIONS[confirm.section].title.toLowerCase()}?` : ''}
        message="Review the change. It is recorded in the audit log with the values before and after."
        summary={confirm?.lines}
        label="Reason for the change"
        placeholder="Why is this changing? For example: approved by the board on 28 October."
        confirmLabel="Save changes"
        warning={confirm && confirm.section === 'approvalLimits' ? 'Changing approval limits affects every payment from now on. Pending payments are checked against the new limits.' : null}
      />
      <TypedConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={doReset}
        title="Reset all demo data?"
        message="Every record returns to the original sample data. This is a demo-only tool."
        warning="Your changes, notifications and audit entries from this session will be lost."
        phrase="RESET"
        confirmLabel="Reset demo data"
      />
    </div>
  );
}
