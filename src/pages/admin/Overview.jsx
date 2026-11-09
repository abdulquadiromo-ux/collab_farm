import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Building2, Wallet, Banknote, Scale, ClipboardList, UserCog, TrendingUp, AlertTriangle, MessageSquareWarning, ArrowRight, Repeat, Landmark, ShieldCheck, FileBarChart, ScrollText, Info } from 'lucide-react';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { Card, CardHeader, KpiCard, KpiStrip, PageHeader, PageSkeleton, Banner, Progress, Avatar, Button, LinkButton, EmptyState } from '../../components/ui/index.js';
import { DonutChart, BarChart } from '../../components/charts/Charts.jsx';
import { formatNaira, formatNumber, percent, relativeTime } from '../../utils/format.js';
import { platformStats, packageStatusGroups, adminFunctionOf } from '../../components/adma/helpers.js';
import '../../styles/pages/adma.css';

function QueueCard({ icon, label, count, hint, to }) {
  return (
    <Link to={to} className={`adma-queue${count > 0 ? ' adma-queue--active' : ''}`} aria-label={`${label}: ${count}. Open queue`}>
      <span className="adma-queue__top">
        <span className="adma-queue__icon">{icon}</span>
        <span className="adma-queue__count">{formatNumber(count)}</span>
      </span>
      <span className="adma-queue__label">{label}</span>
      <span className="adma-queue__hint">{count === 0 ? 'Nothing waiting' : hint}</span>
      <span className="adma-queue__go">Open queue <ArrowRight size={14} /></span>
    </Link>
  );
}

export default function Overview() {
  const { data, user, signIn, toast } = useApp();
  const navigate = useNavigate();
  const loading = useSimulatedLoad(350);
  const s = useMemo(() => platformStats(data), [data]);
  const groups = useMemo(() => packageStatusGroups(data), [data]);

  if (loading) return <PageSkeleton />;

  const other = data.users.find((u) => u.role === 'admin' && u.id !== user.id && u.status !== 'Invited');
  const reviewer = data.users.find((u) => u.id === 'u-admin') || user;
  const approver = data.users.find((u) => u.id === 'u-admin2') || other || user;
  const myFn = adminFunctionOf(user);

  const confirmedPct = percent(s.confirmed, s.committed);
  const disbursedPct = percent(s.disbursed, s.confirmed);
  const reconciledPct = percent(s.reconciled, s.disbursed);
  const bars = [
    { label: 'Committed', value: 100, tone: 'gold' },
    { label: 'Confirmed', value: confirmedPct, tone: 'green' },
    { label: 'Disbursed', value: percent(s.disbursed, s.committed), tone: 'green' },
    { label: 'Reconciled', value: percent(s.reconciled, s.committed), tone: 'gold' },
  ];

  const q = s.queues;
  const queues = [
    { icon: <UserCog size={20} />, label: 'Users awaiting verification', count: q.users, hint: 'Registrations to check', to: '/admin/verification/users' },
    { icon: <Building2 size={20} />, label: 'Cooperatives under review', count: q.coops, hint: 'Documents to verify', to: '/admin/verification/cooperatives' },
    { icon: <ClipboardList size={20} />, label: 'Applications to review', count: q.applications, hint: 'Funding requests and budget changes', to: '/admin/applications' },
    { icon: <TrendingUp size={20} />, label: 'Milestones awaiting approval', count: q.milestones, hint: 'Evidence to check', to: '/admin/milestones' },
    { icon: <Banknote size={20} />, label: 'Disbursements awaiting approval', count: q.disbursements, hint: q.needSecond ? `${q.needSecond} need a second approver` : 'Payments to authorise', to: '/admin/disbursements' },
    { icon: <Scale size={20} />, label: 'Reconciliation exceptions', count: q.reconciliation, hint: 'Records that do not yet match the partner', to: '/admin/reconciliation' },
    { icon: <AlertTriangle size={20} />, label: 'Open risk cases', count: q.risk, hint: q.riskEscalated ? `${q.riskEscalated} escalated` : 'Cases being reviewed', to: '/admin/risk-alerts' },
    { icon: <MessageSquareWarning size={20} />, label: 'Open complaints', count: q.complaints, hint: 'Waiting for triage or a reply', to: '/admin/complaints' },
  ];

  const activity = data.audit.slice(0, 6);

  const switchTo = (u) => {
    if (!signIn(u.id)) return;
    toast(`Signed in as ${u.name} (${adminFunctionOf(u)})`, 'info');
    navigate('/admin');
  };

  return (
    <div className="page adma-page">
      <PageHeader
        title="Platform overview"
        subtitle={`Signed in as ${user.name}, ${myFn.toLowerCase()}. Numbers below are calculated from the records in this demo.`}
        actions={(
          <>
            <LinkButton to="/admin/reports" variant="outline"><FileBarChart size={16} />Reports</LinkButton>
            <LinkButton to="/admin/audit-logs" variant="outline-green"><ScrollText size={16} />Audit logs</LinkButton>
          </>
        )}
      />

      <Banner tone="green" title="Three rules to keep in mind on every screen">
        A commitment is a promise to invest, not money received. Approving a project is not a guarantee that it will succeed or pay a return. A failed harvest is not fraud.
      </Banner>

      <div className="kpi-grid">
        <KpiCard icon={<Users size={18} />} label="Registered users" value={formatNumber(s.totalUsers)}>
          <ul className="adma-split">
            {s.byRole.map((r) => <li key={r.label}><span>{r.label}</span><strong>{formatNumber(r.value)}</strong></li>)}
          </ul>
        </KpiCard>
        <KpiCard icon={<Building2 size={18} />} label="Verified cooperatives" value={`${s.verifiedCoops} of ${s.totalCoops}`}>
          <Progress value={percent(s.verifiedCoops, s.totalCoops)} label="Verified cooperatives" />
          <div className="cell-sub">{s.totalCoops - s.verifiedCoops} not yet verified. Investors verified: {s.verifiedInvestors} of {s.totalInvestors}.</div>
        </KpiCard>
        <KpiCard icon={<Wallet size={18} />} label="Commitments vs confirmed receipts" value={formatNaira(s.committed)} tone="gold">
          <Progress value={confirmedPct} tone="dark" label="Confirmed share of commitments" />
          <div className="cell-sub">Confirmed received by the partner: <strong>{formatNaira(s.confirmed)}</strong> ({confirmedPct}%). Still waiting: {formatNaira(Math.max(0, s.committed - s.confirmed))}.</div>
        </KpiCard>
        <KpiCard icon={<Banknote size={18} />} label="Amount disbursed and reconciled" value={formatNaira(s.disbursed)}>
          <Progress value={reconciledPct} tone="dark" label="Reconciled share of disbursements" />
          <div className="cell-sub">Reconciled with the partner: <strong>{formatNaira(s.reconciled)}</strong> ({reconciledPct}%). Reconciled means our record and the partner&apos;s record agree.</div>
        </KpiCard>
      </div>

      <KpiStrip
        columns={6}
        cells={[
          { icon: <ClipboardList size={18} />, label: 'Projects submitted', value: s.projects.submitted, sub: 'Waiting for a decision' },
          { icon: <ShieldCheck size={18} />, label: 'Approved', value: s.projects.approved, sub: 'Approved or open for funding' },
          { icon: <TrendingUp size={18} />, label: 'Active', value: s.projects.active, sub: 'Money released, farming under way' },
          { icon: <Landmark size={18} />, label: 'Completed', value: s.projects.completed, sub: 'Harvest and settlement done' },
          { icon: <AlertTriangle size={18} />, label: 'Paused or suspended', value: s.projects.suspended, sub: 'New payments on hold' },
          { icon: <Wallet size={18} />, label: 'Outstanding obligations', value: formatNaira(s.outstanding, { compact: true }), sub: `${formatNaira(s.outstanding)} due, of which ${formatNaira(s.outstandingOverdue)} overdue` },
        ]}
      />

      <section aria-labelledby="queue-title" className="stack">
        <div>
          <h2 id="queue-title">Work queue</h2>
          <p className="small muted">Items that need an administrator. Each card opens the queue.</p>
        </div>
        <div className="adma-queues">
          {queues.map((qc) => <QueueCard key={qc.label} {...qc} />)}
        </div>
      </section>

      <div className="grid-main">
        <Card>
          <CardHeader title="Funding pipeline" subtitle="Packages by stage, and how much of the committed money has moved on." />
          <div className="adma-pipeline">
            <div>
              <h3 className="adma-minor">Packages by status</h3>
              {groups.length ? <DonutChart data={groups.map((g) => ({ ...g, display: String(g.value) }))} total={String(data.packages.length)} size={200} /> : <EmptyState title="No packages yet" />}
            </div>
            <div>
              <h3 className="adma-minor">Committed, confirmed, disbursed</h3>
              <BarChart data={bars} height={240} unit="%" />
              <p className="caption muted">Each bar is a share of total commitments. Committed {formatNaira(s.committed)}, confirmed {formatNaira(s.confirmed)}, disbursed {formatNaira(s.disbursed)}, reconciled {formatNaira(s.reconciled)}.</p>
            </div>
          </div>
          <div className="adma-glossary">
            <Info size={16} />
            <span><strong>In plain words:</strong> committed is what investors promised. Confirmed is what the regulated financial partner says it received. Disbursed is what has been paid out. Reconciled means the partner&apos;s report matches ours line by line.</span>
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent activity" subtitle="Latest entries from the audit log." action={<Link className="small" to="/admin/audit-logs">View all</Link>} />
          {activity.length === 0 ? (
            <EmptyState title="No activity yet">Material actions appear here with who did them and when.</EmptyState>
          ) : (
            <ul className="adma-activity">
              {activity.map((a) => (
                <li key={a.id}>
                  <Avatar name={a.actor} size="sm" />
                  <div className="grow">
                    <div className="small"><strong>{a.actor}</strong> {a.action}</div>
                    {a.summary && <div className="caption muted">{a.summary}</div>}
                    <div className="caption muted">{relativeTime(a.at)}{a.entityType ? ` · ${a.entityType}` : ''}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card tone="green" className="adma-sod">
        <CardHeader title="Separation of duties (demo)" subtitle="Nobody should propose, approve and pay on their own. Two administrators play different functions so you can see the rule at work." />
        <ol className="adma-chain" aria-label="Approval chain">
          {['Cooperative submits', 'Project reviewer approves', 'Milestone reviewer checks evidence', 'Payment approver authorises', 'Financial partner pays and confirms', 'System reconciles'].map((step, i) => (
            <li key={step}><span className="adma-chain__n">{i + 1}</span>{step}</li>
          ))}
        </ol>
        <div className="grid-2">
          <div className={`adma-person${user.id === reviewer.id ? ' adma-person--me' : ''}`}>
            <Avatar name={reviewer.name} />
            <div>
              <div className="strong">{reviewer.name} <span className="pill pill--green" style={{ height: 22, fontSize: 12 }}>Project reviewer</span></div>
              <p className="small muted">Starts and decides applications and reviews budgets. Gives the first approval on a material budget change, but never the second approval on the same change.</p>
            </div>
          </div>
          <div className={`adma-person${user.id === approver.id ? ' adma-person--me' : ''}`}>
            <Avatar name={approver.name} tone={2} />
            <div>
              <div className="strong">{approver.name} <span className="pill pill--blue" style={{ height: 22, fontSize: 12 }}>Payment approver</span></div>
              <p className="small muted">Authorises disbursements and gives the second approval on a material budget change. Cannot approve a payment that they raised or first approved.</p>
            </div>
          </div>
        </div>
        <div className="adma-switch">
          <Repeat size={18} />
          <p className="small">
            You are signed in as <strong>{user.name}</strong> ({myFn.toLowerCase()}). To act as the other administrator, open the <strong>Account</strong> menu at the top right of the page and choose <strong>Switch demo account</strong>.
          </p>
          {other && <Button variant="outline-green" size="sm" onClick={() => switchTo(other)}>Switch to {other.name} (demo)</Button>}
        </div>
      </Card>
    </div>
  );
}
