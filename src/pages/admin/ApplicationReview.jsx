import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, CircleHelp, X, Play, Send, Rocket, BadgeCheck, MailQuestion, XCircle, Repeat, FileSignature, CheckCheck } from 'lucide-react';
import { useApp, useSimulatedLoad, simulate, newId } from '../../context/AppContext.jsx';
import { Card, CardHeader, PageHeader, PageSkeleton, Breadcrumb, Banner, Button, ConfirmDialog, InfoList, StatusPill, Timeline, DataTable } from '../../components/ui/index.js';
import { formatNaira, formatDate, formatDateTime } from '../../utils/format.js';
import { budgetReconciles, allocationCheck } from '../../utils/rules.js';
import {
  isMaterialChange, slaInfo, farmerAllocations, farmerAgreement, agreementB, adminFunctionOf, coopReadiness, nowIso, todayIso, AGREEMENT_NAMES,
} from '../../components/adma/helpers.js';
import { MissingRecord, NotesThread, DocStatusPill, Stat } from '../../components/adma/Parts.jsx';
import { ReasonDialog } from '../../components/adma/Dialogs.jsx';
import '../../styles/pages/adma.css';

const MANUAL_CHECKS = [
  { key: 'quotes', label: 'Supplier quotations checked against the budget lines' },
  { key: 'land', label: 'Land-access evidence reviewed' },
  { key: 'farmers', label: 'Farmer allocations and identities reviewed' },
  { key: 'risks', label: 'Risks and mitigation read and considered' },
  { key: 'terms', label: 'Return or repayment structure matches the agreement template (illustrative and configurable)' },
];

const PRE_APPROVAL = ['Draft', 'Submitted', 'Under Review', 'Changes Requested'];

export default function ApplicationReview() {
  const { id } = useParams();
  const { data, user, update, add, notify, toast, signIn } = useApp();
  const loading = useSimulatedLoad(350);
  const [dialog, setDialog] = useState(null); // { type, line? }
  const [busy, setBusy] = useState(false);

  const app = data.applications.find((a) => a.id === id);
  if (loading) return <PageSkeleton />;
  if (!app) return <MissingRecord to="/admin/applications" backLabel="Back to applications" title="Application not found" />;
  const pkg = data.packages.find((p) => p.id === app.packageId);
  if (!pkg) return <MissingRecord to="/admin/applications" backLabel="Back to applications" title="The project for this application is missing" />;

  const coop = data.cooperatives.find((c) => c.id === app.coopId);
  const me = user.name;
  const fn = adminFunctionOf(user);
  const isFunding = app.type === 'Funding application';
  const material = isMaterialChange(app, pkg);
  const lineReviews = app.lineReviews || {};
  const checklist = app.checklist || {};
  const firstDone = !!app.firstApproval;
  const stageOpen = app.stage === 'Under Review';
  const isReviewer = app.reviewer === me;
  const otherAdmin = data.users.find((u) => u.role === 'admin' && u.id !== user.id && u.status !== 'Invited' && u.name !== app.reviewer) || data.users.find((u) => u.role === 'admin' && u.id !== user.id && u.status !== 'Invited');
  const sla = slaInfo(app);

  // Reconciliation checks
  const rec = budgetReconciles(pkg);
  const allocs = farmerAllocations(data, pkg.id);
  const alloc = allocationCheck(pkg, allocs);
  const bContract = agreementB(data, pkg.id);
  const coopCheck = coop ? coopReadiness(coop) : null;
  const lines = pkg.budget || [];
  const linesApproved = lines.length > 0 && lines.every((b) => lineReviews[b.id]?.decision === 'Approved');
  const canReview = stageOpen && isReviewer;

  const gates = [
    { label: 'Cooperative is verified', ok: coop?.status === 'Verified', hint: coop ? `Status: ${coop.status}` : 'Cooperative record missing', auto: true },
    { label: 'Budget adds up to the funding plan', ok: rec.ok, hint: rec.ok ? `${formatNaira(rec.total)} matches ${formatNaira(rec.target)}` : `Budget is ${formatNaira(rec.total)}, plan is ${formatNaira(rec.target)} (difference ${formatNaira(Math.abs(rec.difference))})`, auto: true },
    { label: 'Farmer allocations within budget, no duplicates', ok: !alloc.overBudget && alloc.duplicates.length === 0, hint: alloc.overBudget ? `Allocations exceed the budget by ${formatNaira(-alloc.remaining)}` : alloc.duplicates.length ? `Duplicate allocation for ${alloc.duplicates.join(', ')}` : allocs.length ? `${formatNaira(alloc.total)} allocated, ${formatNaira(alloc.remaining)} left` : 'No allocations proposed yet', auto: true },
    { label: 'Every budget line reviewed and approved', ok: linesApproved, hint: lines.length ? `${lines.filter((b) => lineReviews[b.id]?.decision === 'Approved').length} of ${lines.length} lines approved` : 'The budget has no lines', auto: true },
    ...MANUAL_CHECKS.map((c) => ({ label: c.label, ok: !!checklist[c.key], key: c.key })),
  ];
  const outstanding = gates.filter((g) => !g.ok);
  const autoOutstanding = gates.filter((g) => g.auto && !g.ok);
  const changeSuggestion = autoOutstanding.length ? `Please address: ${autoOutstanding.map((g) => `${g.label} (${g.hint})`).join('; ')}.` : '';
  const ready = outstanding.length === 0;

  // ---------- writers ----------
  const hist = (a, text) => [...(a.history || []), { at: nowIso(), by: me, text }];
  const note = (a, kind, text) => [...(a.reviewNotes || []), { id: newId('nt'), at: nowIso(), by: me, fn, kind, text }];
  const audit = (action, summary, reason) => ({ action, entityType: 'Application', entityId: app.id, summary, reason });
  const toCoop = (title, message) => notify('cooperative', title, message, `/coop/funding/${pkg.id}`, 'funding');
  const approvePackageLines = (p) => ({ budget: (p.budget || []).map((b) => ({ ...b, approval: 'Approved' })) });

  const setCheck = (key, val) => update('applications', app.id, (a) => ({ checklist: { ...(a.checklist || {}), [key]: val } }));
  const setLine = (line, decision, text) => {
    update('applications', app.id, (a) => ({
      lineReviews: { ...(a.lineReviews || {}), [line.id]: { decision, note: text || '', by: me, at: nowIso() } },
      reviewNotes: text ? note(a, decision === 'Rejected' ? 'decision' : 'request', `${decision === 'Rejected' ? 'Rejected' : 'Queried'} budget line "${line.description}": ${text}`) : a.reviewNotes || [],
    }));
  };
  const approveAllLines = () => {
    update('applications', app.id, (a) => ({ lineReviews: Object.fromEntries(lines.map((b) => [b.id, { decision: 'Approved', note: '', by: me, at: nowIso() }])) }));
    toast('All budget lines marked approved.');
  };

  const startReview = async () => {
    await simulate(400);
    update('applications', app.id, (a) => ({ stage: 'Under Review', reviewer: me, reviewerFunction: fn, history: hist(a, `Review started by ${me}`) }), audit('Application review started', `${pkg.name}: ${app.stage} to Under Review. Reviewer ${me}`, 'Reviewer assigned'));
    if (isFunding && PRE_APPROVAL.includes(pkg.status)) update('packages', pkg.id, { status: 'Under Review' });
    toCoop('Application under review', `${pkg.name} is now being reviewed by ${me}.`);
    toast('Review started. You are the assigned reviewer.');
  };

  const requestChanges = async (text) => {
    await simulate(500);
    update('applications', app.id, (a) => ({ stage: 'Changes Requested', firstApproval: null, history: hist(a, `Changes requested: ${text}`), reviewNotes: note(a, 'request', `Changes requested: ${text}`) }), audit('Changes requested', `${pkg.name}: ${app.stage} to Changes Requested`, text));
    if (isFunding) update('packages', pkg.id, { status: 'Changes Requested' });
    toCoop('Changes requested', `${pkg.name}: ${text}`);
    toast('Changes requested. The cooperative has been notified.');
    setDialog(null);
  };

  const reject = async (text) => {
    await simulate(500);
    update('applications', app.id, (a) => ({ stage: 'Rejected', decisionBy: me, decidedAt: nowIso(), decisionReason: text, history: hist(a, `Rejected: ${text}`), reviewNotes: note(a, 'decision', `Rejected: ${text}`) }), audit('Application rejected', `${pkg.name}: ${app.stage} to Rejected`, text));
    if (isFunding) update('packages', pkg.id, { status: 'Draft', rejectionReason: text });
    toCoop('Application not approved', `${pkg.name} was not approved. Reason: ${text}`);
    toast('Application rejected. The cooperative has been notified.');
    setDialog(null);
  };

  const issueB = (reason) => {
    const rec2 = add('contracts', {
      id: newId('ag-b'), type: 'B', title: AGREEMENT_NAMES.B, packageId: pkg.id, partyType: 'Cooperative', partyId: pkg.coopId, partyName: coop?.name || pkg.coopId, version: 'v1.3', status: 'Awaiting Signature', signedAt: null, signatory: null,
      liability: 'Coordination and reporting only (configurable).', history: [{ version: 'v1.3', date: todayIso(), change: 'Issued on project approval' }],
    }, { action: 'Agreement B issued', entityType: 'Contract', summary: `Cooperative Funding and Accountability Agreement issued for ${pkg.name}`, reason: reason || 'Project approved' });
    notify('cooperative', 'Contract signing required', `${pkg.name} needs the Cooperative Funding and Accountability Agreement to be signed before it can open for funding.`, '/coop/contracts', 'contract');
    return rec2;
  };

  const approveFinal = async (secondary) => {
    await simulate(600);
    const decidedAt = nowIso();
    update('applications', app.id, (a) => ({
      stage: 'Approved', decisionBy: me, decidedAt,
      ...(secondary ? { secondApprover: me } : {}),
      history: hist(a, secondary ? `Second approval given by ${me}. Application approved.` : 'Application approved'),
      reviewNotes: note(a, 'decision', secondary ? 'Second approval given. Application approved.' : 'Application approved.'),
    }), audit(secondary ? 'Second approval given' : 'Application approved', `${pkg.name} (${app.type}, ${formatNaira(app.amount)}): Under Review to Approved${secondary ? `. Reviewer ${app.reviewer}, second approver ${me}` : ''}`, 'Review checklist complete'));
    if (isFunding) {
      update('packages', pkg.id, (p) => ({ status: PRE_APPROVAL.includes(p.status) ? 'Approved' : p.status, ...approvePackageLines(p) }));
      if (!bContract) issueB('Project approved');
    } else {
      update('packages', pkg.id, (p) => approvePackageLines(p));
    }
    toCoop('Application approved', `${pkg.name} was approved. Approval is a decision to proceed. It is not a guarantee of success or returns.${isFunding && !bContract ? ' Please sign the Cooperative Funding and Accountability Agreement.' : ''}`);
    toast(secondary ? 'Second approval recorded. Application approved.' : 'Application approved. The cooperative has been notified.');
    setDialog(null);
  };

  const firstApproval = async () => {
    await simulate(500);
    update('applications', app.id, (a) => ({ firstApproval: { by: me, at: nowIso() }, history: hist(a, `First approval given by ${me}. Waiting for a second reviewer.`), reviewNotes: note(a, 'decision', 'First approval given. A second reviewer must give the final approval.') }),
      audit('First approval given', `${pkg.name} (${app.type}, ${formatNaira(app.amount)}): first approval by ${me}. Second reviewer needed`, 'Material change needs two reviewers'));
    notify('admin', 'Second approval needed', `${pkg.name} (${app.type}) has a first approval from ${me} and needs a different reviewer for the final approval.`, `/admin/applications/${app.id}`, 'funding');
    toast('First approval recorded. A second reviewer is now needed.', 'info');
    setDialog(null);
  };

  const openForFunding = async () => {
    await simulate(600);
    update('packages', pkg.id, { status: 'Open for Funding' }, { action: 'Package opened for funding', entityType: 'Package', entityId: pkg.id, summary: `${pkg.name}: Approved to Open for Funding. Agreement B signed, budget reconciles`, reason: 'Release conditions met' });
    update('applications', app.id, (a) => ({ history: hist(a, 'Package opened for funding') }));
    toCoop('Package open for funding', `${pkg.name} is now open for funding. Investors can see it and commit.`);
    toast('Package is now open for funding.');
    setDialog(null);
  };

  const remind = async () => {
    await simulate(300);
    toCoop('Reminder: changes requested', `${pkg.name} is waiting for your updated submission.`);
    update('applications', app.id, (a) => ({ history: hist(a, 'Reminder sent to the cooperative') }), audit('Reminder sent', `${pkg.name}: reminder about requested changes`, 'Waiting on cooperative'));
    toast('Reminder sent to the cooperative.');
  };

  const issueBClick = async () => {
    await simulate(400);
    issueB('Issued on request of reviewer');
    toast('Agreement B issued to the cooperative for signature.');
  };

  const switchTo = (u) => { if (!signIn(u.id)) return; toast(`Signed in as ${u.name} (${adminFunctionOf(u)})`, 'info'); };
  const run = async (fnc, ...args) => { setBusy(true); try { await fnc(...args); } finally { setBusy(false); } };

  // ---------- derived UI ----------
  const farmerRows = allocs.map((a) => ({ ...a, agreement: farmerAgreement(data, a.farmer, pkg.id).status }));
  const csigned = farmerRows.filter((r) => r.agreement === 'Signed').length;
  const risks = data.riskCases.filter((r) => r.packageId === pkg.id);
  const docRows = [
    ...lines.map((b) => ({ id: `q-${b.id}`, type: 'Supplier quotation', for: `${b.category}: ${b.description}`, status: b.docs ? 'Uploaded' : 'Not uploaded' })),
    ...(coopCheck ? [
      { id: 'land', type: 'Land-access evidence', for: coop.name, status: coopCheck.land.state },
      { id: 'payout', type: 'Payout account letter', for: coop.name, status: coopCheck.payout.state },
    ] : []),
  ];
  const openFor = {
    status: isFunding && app.stage === 'Approved',
    alreadyOpen: !PRE_APPROVAL.includes(pkg.status) && pkg.status !== 'Approved',
    packageApproved: pkg.status === 'Approved',
    bSigned: bContract?.status === 'Signed',
    reconciles: rec.ok,
  };
  const canOpen = openFor.status && openFor.packageApproved && openFor.bSigned && openFor.reconciles;

  const approvalStatus = material
    ? `First: ${app.firstApproval ? `${app.firstApproval.by} (${formatDate(app.firstApproval.at)})` : 'pending'}. Second: ${app.secondApprover || 'pending'}`
    : `Reviewer: ${app.reviewer || 'not assigned'}`;
  const summary = [
    ['Project', pkg.name], ['Cooperative', coop?.name || app.coopId], ['Amount', formatNaira(app.amount)],
    ['Purpose', isFunding ? 'Farming costs set out in the approved budget' : 'Change to the approved budget'], ['Approval status', approvalStatus],
  ];

  const lineControl = (b) => {
    const d = lineReviews[b.id]?.decision;
    return (
      <div className="stack-sm" style={{ gap: 6, alignItems: 'flex-end' }}>
        <StatusPill tone={d === 'Approved' ? 'green' : d === 'Rejected' ? 'red' : d ? 'amber' : 'gray'}>{d || 'Not reviewed'}</StatusPill>
        {lineReviews[b.id]?.note && <span className="cell-sub">{lineReviews[b.id].note}</span>}
        {canReview && (
          <div className="adma-linectl" role="group" aria-label={`Review ${b.description}`}>
            <button type="button" aria-pressed={d === 'Approved'} aria-label={`Approve ${b.description}`} title="Approve" onClick={() => setLine(b, 'Approved')}><Check size={16} /></button>
            <button type="button" aria-pressed={d === 'Changes Requested'} aria-label={`Query ${b.description}`} title="Query this line" onClick={() => setDialog({ type: 'line', line: b, decision: 'Changes Requested' })}><CircleHelp size={16} /></button>
            <button type="button" aria-pressed={d === 'Rejected'} aria-label={`Reject ${b.description}`} title="Reject this line" onClick={() => setDialog({ type: 'line', line: b, decision: 'Rejected' })}><X size={16} /></button>
          </div>
        )}
      </div>
    );
  };

  const budgetCols = [
    { key: 'category', header: 'Category' },
    { key: 'description', header: 'What it pays for', render: (b) => <div><div className="strong">{b.description}</div><div className="cell-sub">{b.responsible}</div></div> },
    { key: 'docs', header: 'Supporting document', render: (b) => b.docs || <span className="muted">None</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (b) => <strong>{formatNaira(b.amount)}</strong> },
    { key: 'review', header: 'Line review', align: 'right', render: lineControl },
  ];

  const detailTitle = `${pkg.name}`;

  return (
    <div className="page adma-page">
      <Breadcrumb items={[{ label: 'Applications', to: '/admin/applications' }, { label: detailTitle }]} />
      <PageHeader
        title={detailTitle}
        subtitle={`${app.type} · ${coop?.name || app.coopId} · ${app.id}`}
        actions={(
          <>
            {material && <StatusPill tone="amber">Material change</StatusPill>}
            <StatusPill>{app.stage}</StatusPill>
          </>
        )}
      />

      {material && (
        <Banner tone="warn" title="Material change: two different reviewers must approve">
          {app.type === 'Budget change' ? 'This is a request to change an approved budget.' : 'The budget total changed after approval.'} Maker-checker means the person who prepares or first approves a decision is never the one who finalises it. {app.notes}
        </Banner>
      )}
      {!material && app.notes && <Banner tone="info" title="Note from the submission">{app.notes}</Banner>}

      <div className="grid-main">
        <div className="stack">
          <Card>
            <CardHeader title="Package summary" subtitle="Figures are the cooperative's request. Expected returns are estimates, never promises." />
            <div className="adma-statrow adma-statrow--4">
              <Stat label="Funding requested" value={formatNaira(pkg.amount)} />
              <Stat label="Package type" value={pkg.category} sub={pkg.tier} />
              <Stat label="Duration" value={`${pkg.tenureMonths} months`} sub={pkg.startDate ? `${formatDate(pkg.startDate)} to ${formatDate(pkg.endDate)}` : 'Dates not set'} />
              <Stat label="Farmers" value={pkg.farmersCount} sub={`${allocs.length} with allocations`} />
            </div>
            <InfoList compact items={[
              ['Package status', <StatusPill key="s">{pkg.status}</StatusPill>],
              ['Investment range', `${formatNaira(pkg.minInvestment)} to ${formatNaira(pkg.maxInvestment)} per investor`],
              ['Return structure', `${pkg.returnStructure}. Estimated return ${pkg.expectedRoiPct}% (an estimate, not a promise).`],
              ['Funding closes', pkg.closingDate ? formatDate(pkg.closingDate) : 'Not set'],
              ['Description', pkg.description],
            ]} />
          </Card>

          <Card>
            <CardHeader
              title="Budget"
              subtitle="Every line must be reviewed. Approve a line, query it, or reject it."
              action={canReview && lines.length > 0 && <Button size="sm" variant="outline-green" onClick={approveAllLines}><CheckCheck size={14} />Approve all lines</Button>}
            />
            {lines.length === 0 ? (
              <Banner tone="danger" title="This package has no budget lines">The cooperative needs to build a budget before it can be approved. Use Request changes.</Banner>
            ) : (
              <DataTable bare hideFooter pageSize={50} rows={lines} columns={budgetCols} rowKey="id" />
            )}
            <div className="adma-total">
              <span>Budget total</span><strong>{formatNaira(rec.total)}</strong>
              <span>Funding plan</span><strong>{formatNaira(rec.target)}</strong>
              <span>Difference</span><strong className={rec.ok ? '' : 'danger-text'}>{rec.ok ? 'None, it adds up' : formatNaira(rec.difference)}</strong>
            </div>
          </Card>

          <Card>
            <CardHeader title="Reconciliation checks" subtitle="Reconciliation here means checking that the numbers agree with each other." />
            <ul className="adma-recon">
              {gates.filter((g) => g.auto).map((g) => (
                <li key={g.label} className={g.ok ? 'adma-recon--ok' : 'adma-recon--no'}>
                  <StatusPill tone={g.ok ? 'green' : 'red'}>{g.ok ? 'Pass' : 'Needs attention'}</StatusPill>
                  <div><div className="strong small">{g.label}</div><div className="caption muted">{g.hint}</div></div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Farmer allocations and agreements" subtitle="The cooperative proposes allocations. A reviewer approves them. Investors never see NIN or phone numbers." action={<Link className="small" to="/admin/farmers-farms">Open farmer records</Link>} />
            {farmerRows.length === 0 ? (
              <Banner tone="info">No farmer allocations have been proposed for this package yet. They are needed before the package opens for funding.</Banner>
            ) : (
              <DataTable
                bare hideFooter pageSize={50} rows={farmerRows} rowKey="farmerId"
                columns={[
                  { key: 'name', header: 'Farmer', render: (r) => <div><div className="strong">{r.name}</div><div className="cell-sub">{r.farmerId}</div></div> },
                  { key: 'identity', header: 'Identity', render: (r) => <StatusPill>{r.farmer.identityStatus}</StatusPill> },
                  { key: 'agreement', header: 'Agreement C', render: (r) => <StatusPill>{r.agreement}</StatusPill> },
                  { key: 'amount', header: 'Allocation', align: 'right', render: (r) => <strong>{formatNaira(r.amount)}</strong> },
                ]}
              />
            )}
            <div className="adma-total">
              <span>Allocated</span><strong>{formatNaira(alloc.total)}</strong>
              <span>Agreement C signed</span><strong>{csigned} of {farmerRows.length}</strong>
              <span>Agreement B (cooperative)</span><strong>{bContract ? bContract.status : 'Not on file'}</strong>
            </div>
          </Card>

          <Card>
            <CardHeader title="Documents and supplier quotations" subtitle="Uploaded means received. Verified means a reviewer checked it. Verify cooperative documents on the cooperative page." action={coop && <Link className="small" to={`/admin/verification/cooperatives/${coop.id}`}>Cooperative documents</Link>} />
            <DataTable
              bare hideFooter pageSize={50} rows={docRows} rowKey="id" emptyTitle="No documents"
              columns={[
                { key: 'type', header: 'Document', render: (d) => <span className="strong">{d.type}</span> },
                { key: 'for', header: 'For' },
                { key: 'status', header: 'Status', render: (d) => <DocStatusPill status={d.status} /> },
              ]}
            />
          </Card>

          <Card>
            <CardHeader title="Risk notes" subtitle="Approval is not a guarantee of success. A late report or a failed harvest is never treated as fraud on its own." />
            <ul className="adma-risks">
              {(pkg.risks || []).map((r) => <li key={r}>{r}</li>)}
            </ul>
            {risks.length > 0 && (
              <div className="stack-sm" style={{ marginTop: 12 }}>
                <h3 className="adma-minor">Open cases on this project</h3>
                {risks.map((r) => (
                  <Link key={r.id} to={`/admin/risk-alerts/${r.id}`} className="adma-riskrow">
                    <span>{r.title}</span><span className="row" style={{ gap: 8 }}><StatusPill>{r.severity}</StatusPill><StatusPill>{r.status}</StatusPill></span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Review thread" subtitle="Reviewer notes and messages sent to the cooperative." />
            <NotesThread
              notes={app.reviewNotes || []}
              canAdd
              onAdd={async (t) => { await simulate(250); update('applications', app.id, (a) => ({ reviewNotes: note(a, 'note', t) }), audit('Reviewer note added', `${pkg.name}: note added`, 'Internal note')); toast('Note added.'); }}
            />
          </Card>
        </div>

        <div className="stack">
          <Card>
            <CardHeader title="Review checklist" subtitle="Tick each item once you have checked it yourself." />
            <ul className="adma-gates">
              {gates.map((g) => (
                <li key={g.label}>
                  {g.auto ? (
                    <span className={`adma-gate__mark ${g.ok ? 'adma-gate__mark--ok' : ''}`} aria-hidden="true">{g.ok ? '✓' : '•'}</span>
                  ) : (
                    <input type="checkbox" id={`chk-${g.key}`} checked={!!g.ok} disabled={!canReview} onChange={(e) => setCheck(g.key, e.target.checked)} />
                  )}
                  <label htmlFor={g.auto ? undefined : `chk-${g.key}`}>{g.label}{g.auto && <span className="caption muted" style={{ display: 'block' }}>Checked automatically{g.ok ? '' : `: ${g.hint}`}</span>}</label>
                </li>
              ))}
            </ul>
            {!canReview && stageOpen && <p className="caption muted">Only the assigned reviewer ({app.reviewer || 'nobody yet'}) can tick items.</p>}
          </Card>

          <Card className="adma-decision">
            <CardHeader title="Decision" subtitle="Every decision is confirmed, written to the audit log and sent to the cooperative." />
            <div className="row-wrap" style={{ gap: 8 }}>
              <StatusPill>{app.stage}</StatusPill>
              {sla.state !== 'closed' && <span className={`adma-sla adma-sla--${sla.state}`}>{sla.label}</span>}
            </div>
            <InfoList compact items={[
              ['Reviewer', app.reviewer ? `${app.reviewer}${app.reviewer === me ? ' (you)' : ''}` : 'Not assigned'],
              ...(material ? [['First approval', app.firstApproval ? `${app.firstApproval.by}, ${formatDateTime(app.firstApproval.at)}` : 'Pending'], ['Second approver', app.secondApprover || 'Pending']] : []),
            ]} />

            {app.stage === 'Submitted' && (
              <>
                <p className="small muted">Starting the review makes you the assigned reviewer. The cooperative is told that review has started.</p>
                <Button block onClick={() => run(startReview)} loading={busy}><Play size={16} />Start review</Button>
              </>
            )}

            {stageOpen && !app.reviewer && (
              <Button block onClick={() => run(startReview)} loading={busy}><Play size={16} />Take this review</Button>
            )}

            {stageOpen && app.reviewer && (
              <>
                {/* Not the reviewer */}
                {!isReviewer && !(material && firstDone && me !== app.reviewer && me !== app.firstApproval?.by) && (
                  <Banner tone="info" title={material && !firstDone ? 'Waiting for the first approval' : 'Assigned to another reviewer'}>
                    {material && !firstDone
                      ? `${app.reviewer} must give the first approval. A different reviewer then gives the final approval.`
                      : `${app.reviewer} is the assigned reviewer. Only the assigned reviewer decides this application.`}
                    {otherAdmin && app.reviewer !== me && (
                      <span className="adma-inline"><Button size="sm" variant="outline-green" onClick={() => switchTo(data.users.find((u) => u.name === app.reviewer) || otherAdmin)}><Repeat size={14} />Switch to {app.reviewer} (demo)</Button></span>
                    )}
                  </Banner>
                )}

                {/* Reviewer, material, first approval already given: cannot give the second */}
                {isReviewer && material && firstDone && (
                  <Banner tone="warn" title="You cannot give the second approval">
                    You are the reviewer who gave the first approval on {formatDate(app.firstApproval.at)}. A material change needs a different person for the final approval, so that nobody both prepares and finalises a change to the money plan. To continue in this demo, open the <strong>Account</strong> menu (top right), choose <strong>Switch demo account</strong> and pick another administrator.
                    {otherAdmin && <span className="adma-inline"><Button size="sm" variant="outline-green" onClick={() => switchTo(otherAdmin)}><Repeat size={14} />Switch to {otherAdmin.name} (demo)</Button></span>}
                  </Banner>
                )}

                {/* Controls */}
                {((isReviewer && !(material && firstDone)) || (material && firstDone && !isReviewer && me !== app.firstApproval?.by)) && (
                  <>
                    {!ready && (
                      <Banner tone="warn" title={`${outstanding.length} item${outstanding.length === 1 ? '' : 's'} left before approval`}>
                        {outstanding.map((o) => o.label).slice(0, 3).join('; ')}{outstanding.length > 3 ? ` and ${outstanding.length - 3} more` : ''}. You can still request changes or reject.
                      </Banner>
                    )}
                    <div className="stack-sm">
                      {material && !firstDone ? (
                        <Button block disabled={!ready} onClick={() => setDialog({ type: 'first' })}><BadgeCheck size={16} />Give first approval</Button>
                      ) : material && firstDone ? (
                        <Button block disabled={!ready} onClick={() => setDialog({ type: 'second' })}><BadgeCheck size={16} />Give second approval</Button>
                      ) : (
                        <Button block disabled={!ready} onClick={() => setDialog({ type: 'approve' })}><BadgeCheck size={16} />Approve</Button>
                      )}
                      <Button block variant="outline" onClick={() => setDialog({ type: 'changes' })}><MailQuestion size={16} />Request changes</Button>
                      <Button block variant="danger-outline" onClick={() => setDialog({ type: 'reject' })}><XCircle size={16} />Reject</Button>
                    </div>
                  </>
                )}
              </>
            )}

            {app.stage === 'Changes Requested' && (
              <>
                <Banner tone="info">Waiting for the cooperative to send an updated submission. The review clock is paused.</Banner>
                <Button block variant="outline-green" onClick={() => run(remind)} loading={busy}><Send size={16} />Remind cooperative</Button>
                {(isReviewer || !app.reviewer) && <Button block variant="danger-outline" onClick={() => setDialog({ type: 'reject' })}><XCircle size={16} />Reject</Button>}
              </>
            )}

            {app.stage === 'Rejected' && <Banner tone="danger" title="Rejected">{app.decisionReason ? `Reason: ${app.decisionReason}` : 'This application was rejected.'}</Banner>}

            {app.stage === 'Approved' && (
              <Banner tone="success" title="Approved">
                {app.decisionBy ? `Decided by ${app.decisionBy}${app.secondApprover ? ` with second approval from ${app.secondApprover}` : ''}. ` : ''}Approval is a decision to proceed. It is not a guarantee of success or returns.
              </Banner>
            )}
          </Card>

          {isFunding && app.stage === 'Approved' && (
            <Card>
              <CardHeader title="Open for funding" subtitle="Investors can only commit once the package is open." />
              {openFor.alreadyOpen ? (
                <Banner tone={bContract?.status === 'Signed' ? 'success' : 'warn'} title={`Package status: ${pkg.status}`}>
                  {bContract?.status === 'Signed' ? 'The package has already moved past this step.' : `The package is already ${pkg.status.toLowerCase()} but Agreement B is ${bContract ? bContract.status.toLowerCase() : 'not on file'}. Funding steps stay blocked until it is signed.`}
                </Banner>
              ) : (
                <>
                  <ul className="adma-gates">
                    <li><span className={`adma-gate__mark ${openFor.packageApproved ? 'adma-gate__mark--ok' : ''}`} aria-hidden="true">{openFor.packageApproved ? '✓' : '•'}</span><span>Package is approved</span></li>
                    <li><span className={`adma-gate__mark ${openFor.bSigned ? 'adma-gate__mark--ok' : ''}`} aria-hidden="true">{openFor.bSigned ? '✓' : '•'}</span><span>Agreement B signed by the cooperative<span className="caption muted" style={{ display: 'block' }}>{bContract ? `${bContract.version}, ${bContract.status}` : 'Not on file'}</span></span></li>
                    <li><span className={`adma-gate__mark ${openFor.reconciles ? 'adma-gate__mark--ok' : ''}`} aria-hidden="true">{openFor.reconciles ? '✓' : '•'}</span><span>Budget adds up to the funding plan</span></li>
                  </ul>
                  {!bContract && <Button block variant="outline-green" onClick={() => run(issueBClick)} loading={busy}><FileSignature size={16} />Issue Agreement B to cooperative</Button>}
                  {bContract && bContract.status !== 'Signed' && <Banner tone="warn">The cooperative has to sign Agreement B first. You can remind them from <Link to="/admin/contracts">Contract status</Link>.</Banner>}
                  <Button block disabled={!canOpen} onClick={() => setDialog({ type: 'open' })}><Rocket size={16} />Open for funding</Button>
                </>
              )}
            </Card>
          )}

          <Card>
            <CardHeader title="Review history" />
            <Timeline items={[
              ...(app.history || []).slice().reverse().map((h) => ({ title: h.text, meta: `${h.by} · ${formatDateTime(h.at)}`, state: 'done' })),
              { title: `${app.type} submitted`, meta: `${coop?.name || ''} · ${formatDate(app.submittedAt)}`, state: 'done' },
            ]} />
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={dialog?.type === 'approve'}
        onClose={() => setDialog(null)}
        onConfirm={() => run(approveFinal, false)}
        loading={busy}
        tone="green"
        title="Approve this application?"
        message={isFunding ? 'The package becomes Approved and the cooperative is asked to sign Agreement B. Approval is not a guarantee of success or returns.' : 'The budget change is approved and the cooperative is told.'}
        summary={summary}
        confirmLabel="Approve"
      />
      <ConfirmDialog
        open={dialog?.type === 'first'}
        onClose={() => setDialog(null)}
        onConfirm={() => run(firstApproval)}
        loading={busy}
        tone="green"
        title="Give your first approval?"
        message="This is not the final decision. A different reviewer must give the second approval before the change takes effect."
        summary={summary}
        confirmLabel="Give first approval"
      />
      <ConfirmDialog
        open={dialog?.type === 'second'}
        onClose={() => setDialog(null)}
        onConfirm={() => run(approveFinal, true)}
        loading={busy}
        tone="green"
        title="Give the second approval?"
        message={`${app.reviewer} gave the first approval. Your approval completes the decision.`}
        summary={summary}
        confirmLabel="Approve as second reviewer"
      />
      <ConfirmDialog
        open={dialog?.type === 'open'}
        onClose={() => setDialog(null)}
        onConfirm={() => run(openForFunding)}
        loading={busy}
        tone="green"
        title="Open this package for funding?"
        message="Investors will be able to see the package and commit. A commitment is a promise, not money received."
        summary={[['Project', pkg.name], ['Amount sought', formatNaira(pkg.amount)], ['Agreement B', `${bContract?.version || ''} ${bContract?.status || ''}`], ['Budget', 'Adds up to the funding plan'], ['Approval status', approvalStatus]]}
        confirmLabel="Open for funding"
      />
      <ReasonDialog
        open={dialog?.type === 'changes'}
        onClose={() => setDialog(null)}
        onConfirm={requestChanges}
        tone="amber"
        title="Request changes"
        message="The cooperative receives your message and can update and resubmit. Any first approval is cleared."
        summary={[['Project', pkg.name], ['Amount', formatNaira(app.amount)]]}
        label="What needs to change?"
        placeholder="Say which lines or documents need work and what a good fix looks like."
        initialText={changeSuggestion}
        confirmLabel="Send to cooperative"
      />
      <ReasonDialog
        open={dialog?.type === 'reject'}
        onClose={() => setDialog(null)}
        onConfirm={reject}
        title="Reject this application?"
        message={isFunding ? 'The project returns to Draft so the cooperative can rework it. They are told the reason.' : 'The budget change is not accepted. The approved budget stays as it is.'}
        summary={[['Project', pkg.name], ['Amount', formatNaira(app.amount)]]}
        label="Reason for rejection"
        placeholder="Explain in plain words why this cannot be approved."
        confirmLabel="Reject application"
      />
      <ReasonDialog
        open={dialog?.type === 'line'}
        onClose={() => setDialog(null)}
        onConfirm={async (t) => { setLine(dialog.line, dialog.decision, t); setDialog(null); toast(dialog.decision === 'Rejected' ? 'Budget line rejected.' : 'Query added to the budget line.', 'info'); }}
        tone="amber"
        title={dialog?.decision === 'Rejected' ? 'Reject this budget line' : 'Query this budget line'}
        message={dialog?.line ? `${dialog.line.category}: ${dialog.line.description} (${formatNaira(dialog.line.amount)})` : ''}
        label="Note on the line"
        placeholder="For example: quotation is older than 30 days, please send a current one."
        minLength={6}
        confirmLabel={dialog?.decision === 'Rejected' ? 'Reject line' : 'Add query'}
      />
    </div>
  );
}
