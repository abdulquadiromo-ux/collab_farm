import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PauseCircle, PlayCircle, MailQuestion, ShieldPlus, Scale } from 'lucide-react';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { PageHeader, Card, Breadcrumb, StatusPill, Banner, Button, ConfirmDialog, KpiStrip, Timeline, Progress, Modal, SelectField, TextAreaField } from '../../components/ui/index.js';
import { formatNaira, formatDateShort, percent } from '../../utils/format.js';
import { sum } from '../../utils/rules.js';
import { packageHealth, milestoneFlags, nowIso, todayIso, addDaysIso, coopNameOfPkg } from '../../components/admb/lib.js';
import { PageMissing, ReasonModal, HealthPill, TrancheChain, At, atText } from '../../components/admb/ui.jsx';
import RiskCaseForm from '../../components/admb/RiskCaseForm.jsx';
import '../../styles/pages/admb.css';

const CAN_PAUSE = ['Active', 'Ready for Disbursement', 'Funding Target Reached'];

export default function ProjectMonitor() {
  const { id } = useParams();
  const { data, user, update, notify, toast } = useApp();
  const [pauseOpen, setPauseOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [caseOpen, setCaseOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reportMsg, setReportMsg] = useState('');
  const [reportDays, setReportDays] = useState('7');
  const [reportErr, setReportErr] = useState('');

  const pkg = data.packages.find((p) => p.id === id);
  if (!pkg) return <PageMissing crumbs={[{ label: 'Project monitoring', to: '/admin/monitoring' }, { label: 'Not found' }]} title="Project not found" text="This project does not exist or the link is out of date." backTo="/admin/monitoring" backLabel="Back to project monitoring" />;

  const health = packageHealth(data, pkg);
  const m = health.metrics;
  const coopName = coopNameOfPkg(data, pkg.id);
  const paused = pkg.status === 'Paused';
  const inputs = data.inputRecords.filter((x) => x.packageId === pkg.id);
  const expenses = data.expenses.filter((x) => x.packageId === pkg.id);
  const harvests = data.harvests.filter((x) => x.packageId === pkg.id);
  const sales = data.sales.filter((x) => x.packageId === pkg.id);
  const complaints = data.complaints.filter((x) => x.packageId === pkg.id);
  const relatedIds = new Set([pkg.id, ...m.tranches.map((t) => t.id), ...m.milestones.map((x) => x.id), ...data.disbursements.filter((x) => x.packageId === pkg.id).map((x) => x.id), ...m.risks.map((x) => x.id), ...m.recon.map((x) => x.id)]);
  const auditRows = data.audit.filter((a) => relatedIds.has(a.entityId)).slice(0, 6);
  const today = todayIso();

  const events = [
    { at: pkg.createdAt, title: 'Project created' },
    { at: pkg.closingDate, title: 'Funding closes' },
    { at: pkg.startDate, title: 'Project starts' },
    ...m.milestones.map((x) => ({ at: x.dueDate, title: `Milestone due: ${x.title}`, ms: x })),
    { at: pkg.endDate, title: 'Project ends' },
  ].filter((e) => e.at).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const nextIdx = events.findIndex((e) => e.at > today && !(e.ms && e.ms.status === 'Approved'));
  const timeline = events.map((e, i) => {
    const flags = e.ms ? milestoneFlags(e.ms) : null;
    const state = flags ? (flags.done ? 'done' : flags.overdue ? 'bad' : i === nextIdx ? 'active' : undefined) : e.at <= today ? 'done' : i === nextIdx ? 'active' : undefined;
    return { title: e.title, meta: `${formatDateShort(e.at)}${e.ms ? ` · ${e.ms.status}${flags.overdue ? `, overdue ${flags.overdueDays} days` : ''}` : ''}`, state };
  });

  const six = [
    ['Intended to invest', m.intended], ['Formally committed', m.committed], ['Confirmed received', m.confirmed],
    ['Available to pay out', m.unspent], ['Actually disbursed', m.disbursed], ['Repaid or distributed', m.repaid],
  ];
  const expTotal = (s) => sum(expenses.filter((e) => e.status === s), (e) => e.amount);

  const doPause = async (reason) => {
    await simulate(600);
    update('packages', pkg.id, { status: 'Paused', pausedFrom: pkg.status, pauseReason: reason, pausedBy: user.name, pausedAt: nowIso() }, {
      action: 'Suspended new disbursements', entityType: 'Package', summary: `${pkg.name}: status ${pkg.status} to Paused. New payments are blocked. This is not a finding of fault.`, reason,
    });
    notify('cooperative', 'New disbursements are paused', `New payments for ${pkg.name} are paused while a reviewer looks at the project. This is a precaution and not a finding of fault. Payments already made are not affected. Reason: ${reason}`, `/coop/funding/${pkg.id}`, 'risk');
    notify('investor', 'Disbursements paused on a project', `New payments for ${pkg.name} are paused as a precaution. Your records and agreements are unchanged. This is not a finding of fault.`, `/investor/packages/${pkg.id}`, 'risk');
    setPauseOpen(false);
    toast('New disbursements are suspended. Release is now blocked. The cooperative and investors were told.', 'info');
  };

  const doResume = async () => {
    setBusy(true);
    await simulate(600);
    const back = pkg.pausedFrom || 'Active';
    update('packages', pkg.id, { status: back, resumedBy: user.name, resumedAt: nowIso() }, {
      action: 'Resumed disbursements', entityType: 'Package', summary: `${pkg.name}: status Paused to ${back}. New payments can be released again.`, reason: 'Review completed, no reason to keep payments paused',
    });
    notify('cooperative', 'Disbursements resumed', `New payments for ${pkg.name} can go ahead again.`, `/coop/funding/${pkg.id}`, 'project');
    notify('investor', 'Disbursements resumed', `New payments for ${pkg.name} are resumed.`, `/investor/packages/${pkg.id}`, 'project');
    setBusy(false); setResumeOpen(false);
    toast(`Disbursements resumed. Status is ${back}.`);
  };

  const doReport = async () => {
    if (reportMsg.trim().length < 10) { setReportErr('Say what you need in at least 10 characters.'); return; }
    setBusy(true);
    await simulate(500);
    const due = addDaysIso(Number(reportDays));
    notify('cooperative', 'Progress report requested', `A reviewer asked for a report on ${pkg.name} by ${formatDateShort(due)}: ${reportMsg.trim()}`, '/coop/farming-progress', 'milestone');
    update('packages', pkg.id, { reportRequestedAt: nowIso(), reportDueBy: due }, {
      action: 'Report requested from cooperative', entityType: 'Package', summary: `${pkg.name}: report due ${formatDateShort(due)}`, reason: reportMsg.trim(),
    });
    setBusy(false); setReportOpen(false); setReportMsg(''); setReportErr('');
    toast('Report request sent to the cooperative.');
  };

  return (
    <div className="page">
      <Breadcrumb items={[{ label: 'Project monitoring', to: '/admin/monitoring' }, { label: pkg.name }]} />
      <PageHeader
        title={pkg.name}
        subtitle={`${coopName} · ${pkg.category} · ${pkg.tenureMonths} months`}
        actions={(
          <>
            <Button variant="outline" onClick={() => setReportOpen(true)}><MailQuestion size={18} />Request report</Button>
            <Button variant="outline" onClick={() => setCaseOpen(true)}><ShieldPlus size={18} />Open a risk case</Button>
            {paused && <Button onClick={() => setResumeOpen(true)}><PlayCircle size={18} />Resume disbursements</Button>}
            {!paused && CAN_PAUSE.includes(pkg.status) && <Button variant="danger-outline" onClick={() => setPauseOpen(true)}><PauseCircle size={18} />Suspend new disbursements</Button>}
          </>
        )}
      />
      <div className="admb-pillrow"><StatusPill>{pkg.status}</StatusPill><HealthPill health={health} /><span className="small muted">Closing {formatDateShort(pkg.closingDate)} · Ends {formatDateShort(pkg.endDate)}</span></div>

      {paused && (
        <Banner tone="warn" title="New disbursements are suspended">
          Payments cannot be released for this project until it is resumed. Payments already made are not affected. Pausing a project is not a finding of fault. Paused by {pkg.pausedBy || 'an administrator'}{pkg.pausedAt ? <> on <At value={pkg.pausedAt} /></> : ''}. Reason: {pkg.pauseReason || 'see the audit log'}
        </Banner>
      )}

      <div className={`admb-health-banner admb-health-banner--${health.tone}`}>
        <div className="grow">
          <h2 className="admb-card-title">Why the health tag is {health.tag}</h2>
          <ul>{health.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          <p className="cell-sub" style={{ marginTop: 8 }}>Worked out from milestones, risk cases, reconciliation and reporting. It is a prompt to look, not a verdict.</p>
        </div>
      </div>

      <KpiStrip columns={6} cells={six.map(([label, value]) => ({ icon: <Scale size={16} />, label, value: formatNaira(value, { compact: true }) }))} />

      <div className="admb-main">
        <div className="admb-col">
          <Card>
            <div className="admb-head"><div><h2 className="admb-card-title">Tranches and milestones</h2><p className="admb-card-sub">Money is released in stages, and only after the evidence for each stage is approved.</p></div><TrancheChain tranches={m.tranches} /></div>
            <div className="admb-scroll">
              <table className="admb-mini-table">
                <thead><tr><th>Tranche</th><th>Amount</th><th>Status</th><th>Milestones</th></tr></thead>
                <tbody>
                  {m.tranches.length === 0 && <tr><td colSpan={4} className="muted">No tranche plan yet. It is set when the project is approved.</td></tr>}
                  {m.tranches.map((t) => (
                    <tr key={t.id}>
                      <td><strong>T{t.number} {t.name}</strong></td>
                      <td className="admb-mono">{formatNaira(t.amount)}</td>
                      <td><StatusPill>{t.status}</StatusPill></td>
                      <td>{m.milestones.filter((x) => x.trancheId === t.id).map((x) => <div key={x.id}><Link to={`/admin/milestones/${x.id}`}>{x.title}</Link> <span className="cell-sub">({x.status}, due {formatDateShort(x.dueDate)})</span></div>)}{m.milestones.every((x) => x.trancheId !== t.id) && <span className="muted">None set</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h2 className="admb-card-title">Input delivery and expenses</h2>
            <p className="admb-card-sub">What was delivered to farmers and what has been spent.</p>
            <div className="admb-metric-grid" style={{ margin: '14px 0' }}>
              <div className="admb-metric"><span className="admb-metric__label">Inputs delivered</span><span className="admb-metric__value">{inputs.filter((x) => x.delivered).length} of {inputs.length}</span><span className="cell-sub">{formatNaira(sum(inputs, (x) => x.cost))} recorded cost</span></div>
              <div className="admb-metric"><span className="admb-metric__label">Spent and confirmed</span><span className="admb-metric__value admb-mono">{formatNaira(expTotal('Confirmed'))}</span><span className="cell-sub">Matched with the partner</span></div>
              <div className="admb-metric"><span className="admb-metric__label">Not yet confirmed</span><span className="admb-metric__value admb-mono">{formatNaira(expTotal('Under Reconciliation') + expTotal('Pending'))}</span><span className="cell-sub">Under reconciliation or pending</span></div>
            </div>
            <div className="admb-scroll">
              <table className="admb-mini-table">
                <thead><tr><th>Expense</th><th>Category</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {expenses.length === 0 && <tr><td colSpan={4} className="muted">No expenses recorded yet.</td></tr>}
                  {expenses.map((e) => (<tr key={e.id}><td>{e.description}<div className="cell-sub">{e.supplier} · {formatDateShort(e.date)}</div></td><td>{e.category}</td><td className="admb-mono">{formatNaira(e.amount)}</td><td><StatusPill>{e.status}</StatusPill></td></tr>))}
                </tbody>
              </table>
            </div>
            {inputs.length > 0 && (
              <div className="admb-scroll" style={{ marginTop: 12 }}>
                <table className="admb-mini-table">
                  <thead><tr><th>Input</th><th>Farmer</th><th>Quantity</th><th>Delivery</th></tr></thead>
                  <tbody>{inputs.map((x) => (<tr key={x.id}><td>{x.item}<div className="cell-sub">{x.supplier}</div></td><td>{x.farmerName}</td><td>{x.qty} {x.unit}</td><td><StatusPill tone={x.delivered ? 'green' : 'amber'}>{x.delivered ? 'Delivered' : 'Not yet delivered'}</StatusPill></td></tr>))}</tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="admb-card-title">Harvest and sales</h2>
            <p className="admb-card-sub">A sale is not money received until the financial partner confirms it.</p>
            {harvests.length === 0 && sales.length === 0 ? <p className="small muted" style={{ marginTop: 12 }}>No harvest or sale has been recorded yet.</p> : (
              <div className="admb-scroll" style={{ marginTop: 12 }}>
                <table className="admb-mini-table">
                  <thead><tr><th>Record</th><th>Quantity or value</th><th>Status</th></tr></thead>
                  <tbody>
                    {harvests.map((h) => (<tr key={h.id}><td>Harvest: {h.crop}<div className="cell-sub">{h.date ? formatDateShort(h.date) : 'Not harvested yet'}</div></td><td>{h.actualQty ? `${h.actualQty.toLocaleString('en-NG')} of ${h.expectedQty.toLocaleString('en-NG')} ${h.unit} expected` : `${h.expectedQty.toLocaleString('en-NG')} ${h.unit} expected`}</td><td><StatusPill>{h.status}</StatusPill></td></tr>))}
                    {sales.map((s) => (<tr key={s.id}><td>Sale to {s.buyer}<div className="cell-sub">{s.ref} · {formatDateShort(s.date)}</div></td><td className="admb-mono">{formatNaira(s.gross)}{s.outstanding > 0 && <div className="cell-sub">{formatNaira(s.outstanding)} still owed by the buyer</div>}</td><td><StatusPill>{s.paymentStatus}</StatusPill></td></tr>))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <div className="admb-head"><div><h2 className="admb-card-title">Risk cases</h2><p className="admb-card-sub">A case asks for a closer look. It is not a finding of fault.</p></div><Button size="sm" variant="outline" onClick={() => setCaseOpen(true)}>Open a case</Button></div>
            {m.risks.length === 0 ? <p className="small muted">No risk cases for this project.</p> : (
              <ul className="admb-notelist">
                {m.risks.map((r) => (
                  <li key={r.id} className="admb-note">
                    <div className="row between" style={{ flexWrap: 'wrap' }}><Link to={`/admin/risk-alerts/${r.id}`} className="strong">{r.title}</Link><div className="admb-pillrow"><StatusPill tone={r.severity === 'High' ? 'red' : r.severity === 'Medium' ? 'amber' : 'green'}>{r.severity}</StatusPill><StatusPill>{r.status}</StatusPill></div></div>
                    <div className="admb-note__meta" style={{ marginTop: 4 }}>{r.category} · opened {formatDateShort(r.raisedAt)} · owner {r.owner}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="admb-col">
          <Card>
            <h2 className="admb-card-title">Timeline</h2>
            <div style={{ marginTop: 14 }}><Timeline items={timeline} /></div>
          </Card>
          <Card>
            <h2 className="admb-card-title">Funding</h2>
            <div className="stack-sm" style={{ marginTop: 10 }}>
              <div className="row between small"><span>Confirmed</span><strong>{formatNaira(pkg.raised)} of {formatNaira(pkg.amount)}</strong></div>
              <Progress value={percent(pkg.raised, pkg.amount)} label="Confirmed funding" />
              <p className="cell-sub">{formatNaira(Math.max(0, pkg.committed - pkg.raised))} committed but not yet confirmed. Commitments are not received money.</p>
            </div>
          </Card>
          <Card>
            <h2 className="admb-card-title">Complaints</h2>
            {complaints.length === 0 ? <p className="small muted" style={{ marginTop: 8 }}>No complaints for this project.</p> : (
              <ul className="admb-notelist" style={{ marginTop: 10 }}>
                {complaints.map((c) => (<li key={c.id} className="admb-note"><Link to={`/admin/complaints/${c.id}`} className="strong">{c.subject}</Link><div className="admb-note__meta">{c.ref} · {c.role} · <StatusPill>{c.status}</StatusPill></div></li>))}
              </ul>
            )}
          </Card>
          <Card>
            <div className="admb-head" style={{ marginBottom: 8 }}><h2 className="admb-card-title">Audit trail</h2><Link to="/admin/audit-logs" className="small">Open audit logs</Link></div>
            {auditRows.length === 0 ? <p className="small muted">No audit entries yet for this project.</p> : (
              <ul className="admb-notelist">
                {auditRows.map((a) => (<li key={a.id} className="admb-note"><div className="strong small">{a.action}</div><div className="admb-note__meta">{a.actor} · {atText(a.at)}</div><div className="small">{a.summary}</div></li>))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <ReasonModal
        open={pauseOpen}
        onClose={() => setPauseOpen(false)}
        title="Suspend new disbursements"
        intro="New payments for this project are blocked until you resume them. Payments already made are not affected. This is a precaution while something is looked at. It is not a finding of fault. The cooperative and investors are told."
        summary={[['Project', pkg.name], ['Status now', pkg.status], ['Status after', 'Paused'], ['Effect', 'Payment instructions cannot be sent'], ['Done by', user.name]]}
        label="Reason for the pause"
        hint="Stick to facts. Say what is being looked at."
        minLength={15}
        confirmLabel="Suspend disbursements"
        tone="danger"
        onSubmit={doPause}
      />
      <ConfirmDialog
        open={resumeOpen}
        onClose={() => setResumeOpen(false)}
        onConfirm={doResume}
        loading={busy}
        tone="green"
        title="Resume disbursements?"
        message="New payments for this project can be released again, subject to the normal approvals and checks."
        summary={[['Project', pkg.name], ['Status now', 'Paused'], ['Status after', pkg.pausedFrom || 'Active']]}
        confirmLabel="Resume"
      />
      <Modal open={reportOpen} onClose={() => !busy && setReportOpen(false)} title="Request a report" white footer={(<><Button variant="outline" onClick={() => setReportOpen(false)} disabled={busy} block>Cancel</Button><Button onClick={doReport} loading={busy} block>Send request</Button></>)}>
        <div className="stack">
          <p className="small muted">The cooperative gets a notification. A late report is never treated as fraud. They can explain any delay.</p>
          <SelectField label="Report needed within" required options={[{ value: '3', label: '3 days' }, { value: '7', label: '7 days' }, { value: '14', label: '14 days' }]} value={reportDays} onChange={(e) => setReportDays(e.target.value)} />
          <TextAreaField label="What do you need?" required hint="For example: a progress update with photos of the planted plots." value={reportMsg} error={reportErr} onChange={(e) => { setReportMsg(e.target.value); setReportErr(''); }} />
        </div>
      </Modal>
      <RiskCaseForm open={caseOpen} onClose={() => setCaseOpen(false)} defaultPackageId={pkg.id} lockPackage />
    </div>
  );
}
