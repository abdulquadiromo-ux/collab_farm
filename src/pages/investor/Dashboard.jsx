import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Banknote, ChevronRight, Lock, Plus, Printer, Search, ShieldCheck, Wallet as WalletIcon, Wheat } from 'lucide-react';
import { Banner, Button, Card, CardHeader, EmptyState, PageHeader, PageSkeleton, StatusPill } from '../../components/ui/index.js';
import { LinkButton } from '../../components/ui/Button.jsx';
import { BarChart, DonutChart } from '../../components/charts/Charts.jsx';
import { useSimulatedLoad } from '../../context/AppContext.jsx';
import { ROI_SERIES } from '../../data/governance.js';
import { formatNaira, formatDate, relativeTime, cx } from '../../utils/format.js';
import { useInvestor } from '../../components/inv/useInvestor.js';
import { FundWalletModal } from '../../components/inv/WalletModals.jsx';
import { InvSelect } from '../../components/inv/InvSelect.jsx';
import { KpiLink, UnverifiedBanner } from '../../components/inv/Common.jsx';
import { appNow, cropOf, downloadCsv, sumBy } from '../../components/inv/invData.js';
import '../../styles/pages/inv.css';

const ROI_WINDOWS = [{ value: '6m', label: 'In 6 months' }, { value: '12m', label: 'In 12 months' }];

function greeting() {
  const h = appNow().getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
}

export default function Dashboard() {
  const loading = useSimulatedLoad(350);
  const { data, investor, user, wallet, investments, pkgById, coopById, update } = useInvestor();
  const [fundOpen, setFundOpen] = useState(false);
  const [win, setWin] = useState('6m');
  const closeFund = useCallback(() => setFundOpen(false), []);

  const mine = useMemo(() => data.distributions.filter((d) => d.investorId === investor?.id), [data.distributions, investor]);
  const overdue = useMemo(() => mine.filter((d) => d.status === 'Overdue'), [mine]);
  const upcoming = useMemo(() => mine.filter((d) => d.status === 'Pending').sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate))), [mine]);
  const notifications = useMemo(() => data.notifications.filter((n) => n.role === 'investor').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), [data.notifications]);

  const allocation = useMemo(() => {
    const live = investments.filter((i) => ['Pending', 'Active', 'Overdue'].includes(i.status));
    const map = new Map();
    live.forEach((i) => { const crop = cropOf(pkgById[i.packageId]); map.set(crop, (map.get(crop) || 0) + i.committed); });
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 4);
    const rest = sorted.slice(4).reduce((s, [, v]) => s + v, 0);
    const rows = rest ? [...top, ['Others', rest]] : top;
    const total = rows.reduce((s, [, v]) => s + v, 0);
    return { total, rows: rows.map(([label, value]) => ({ label, value, display: `${formatNaira(value, { compact: true })} (${total ? Math.round((value / total) * 100) : 0}%)` })) };
  }, [investments, pkgById]);

  const recent = useMemo(() => [...investments].sort((a, b) => String(b.dateInvested).localeCompare(String(a.dateInvested))).slice(0, 5), [investments]);

  if (loading) return <PageSkeleton />;

  const disbursed = sumBy(investments, (i) => i.disbursed);
  const overdueAmount = sumBy(overdue, (d) => d.amountDue - d.amountPaid);
  const empty = investments.length === 0;
  const lowThreshold = (data.platformSettings?.investor?.minimumInvestment || 50000) * 4;
  const lowBalance = wallet.available < lowThreshold;
  const verified = investor?.status === 'Verified';

  const exportReport = () => downloadCsv('portfolio-summary.csv', [
    { header: 'Reference', value: (i) => i.ref },
    { header: 'Package', value: (i) => pkgById[i.packageId]?.name },
    { header: 'Status', value: (i) => i.status },
    { header: 'Intended', value: (i) => i.intended },
    { header: 'Committed', value: (i) => i.committed },
    { header: 'Confirmed received', value: (i) => i.confirmed },
    { header: 'Available for disbursement', value: (i) => i.available },
    { header: 'Disbursed', value: (i) => i.disbursed },
    { header: 'Repaid or distributed', value: (i) => i.repaid },
    { header: 'Expected settlement date (estimate)', value: (i) => i.expectedSettlementDate },
  ], investments);

  return (
    <div className="page">
      <PageHeader
        greeting
        title={<>{greeting()}, <em>{user.firstName}</em></>}
        subtitle="Here's how your investments are performing"
        actions={<Button variant="outline-green" onClick={exportReport} disabled={empty}><Printer size={18} />Export Report</Button>}
      />

      <UnverifiedBanner investor={investor} />
      {overdue.length > 0 && (
        <Banner tone="danger" title={`${overdue.length} return${overdue.length === 1 ? ' is' : 's are'} overdue (${formatNaira(overdueAmount)})`}>
          An overdue payment is reviewed under your agreement. It is not a finding of fraud, and a late harvest or crop failure is assessed on evidence.{' '}
          <Link to="/investor/distributions?status=Overdue" className="strong">Review overdue returns</Link> or <Link to="/investor/complaints/new" className="strong">raise a concern</Link>.
        </Banner>
      )}
      {verified && lowBalance && (
        <Banner tone="warn" title="Your available balance is low">
          You have {formatNaira(wallet.available)} available. Fund your wallet to commit to new packages. Transfers count only after the partner confirms them.{' '}
          <button type="button" className="link-btn" onClick={() => setFundOpen(true)}>Fund wallet</button>
        </Banner>
      )}

      <div className="kpi-grid">
        <KpiLink icon={<WalletIcon size={20} />} tone="dark" label="Available Balance" value={formatNaira(wallet.available)} to="/investor/wallet">
          {wallet.pendingConfirmation > 0 && <span className="inv-kpi-sub">{formatNaira(wallet.pendingConfirmation)} waiting for partner confirmation</span>}
          <div className="inv-kpi-actions"><Button size="sm" onClick={() => setFundOpen(true)} disabled={!verified}><Plus size={16} />Fund Wallet</Button></div>
        </KpiLink>
        <KpiLink icon={<Lock size={20} />} label="Locked Funds" value={formatNaira(wallet.locked)} to="/investor/investments?status=Active">
          <span className="inv-kpi-sub">Tied to commitments and released in tranches</span>
        </KpiLink>
        <KpiLink icon={<Banknote size={20} />} label="Disbursed Funds" value={formatNaira(disbursed)} to="/investor/investments">
          <span className="inv-kpi-sub">Paid out after milestones were approved</span>
        </KpiLink>
        <KpiLink icon={<AlertTriangle size={20} />} tone={overdue.length ? 'red' : undefined} dot={overdue.length > 0} label="Overdue Returns" value={overdue.length} to="/investor/distributions?status=Overdue">
          <span className="inv-kpi-sub">{overdue.length ? `${formatNaira(overdueAmount)} past due` : 'Nothing overdue right now'}</span>
        </KpiLink>
      </div>

      <Banner tone="info">
        Figures marked estimate or illustrative are not promises. Confirmed amounts are only those the financial partner has actually received. A commitment is not received money.
      </Banner>

      {empty ? (
        <Card>
          <EmptyState
            icon={<Wheat size={28} />}
            title="You have not invested yet"
            action={<div className="row-wrap" style={{ justifyContent: 'center' }}><LinkButton to="/investor/packages">Browse funding packages</LinkButton><LinkButton to="/investor/risk-disclosures" variant="outline-green"><ShieldCheck size={16} />Read the risks</LinkButton></div>}
          >
            Start by checking your verification, funding your wallet and choosing a package. Your portfolio, returns and allocation will appear here.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid-main inv-grid">
          <Card>
            <CardHeader
              title="Accumulative ROI"
              subtitle="Illustrative sample, based on estimates. Not a promise of return."
              action={<InvSelect label="Period" value={win} onChange={setWin} options={ROI_WINDOWS} />}
            />
            <div className="inv-chart-wrap"><BarChart data={ROI_SERIES[win]} height={290} /></div>
            <p className="caption muted mt-2">Gold and green bars are sample monthly estimates. Your real return depends on harvest, prices and the signed agreements.</p>
          </Card>
          <Card>
            <CardHeader title="Portfolio Allocation by Crop" action={<LinkButton to="/investor/investments" variant="outline-green" size="sm">View Details</LinkButton>} />
            {allocation.total > 0 ? (
              <DonutChart data={allocation.rows} total={formatNaira(allocation.total, { compact: true })} size={210} format={(v) => formatNaira(v, { compact: true })} />
            ) : <p className="small muted">No live commitments to show yet.</p>}
            <p className="caption muted mt-2">Based on committed amounts in pending, active and overdue investments.</p>
          </Card>
        </div>
      )}

      <div className="grid-2">
        <Card>
          <CardHeader title="Overdue Returns" action={overdue.length > 0 ? <span className="inv-count-badge" aria-label={`${overdue.length} overdue`}>{overdue.length}</span> : null} />
          {overdue.length === 0 ? (
            <p className="small muted">No returns are overdue. If a payment is late you will see it here with the amount and due date.</p>
          ) : (
            <div className="inv-dash-list">
              {overdue.map((d) => (
                <Link key={d.id} to="/investor/distributions?status=Overdue" className="inv-dash-row">
                  <div><div className="strong small">{pkgById[d.packageId]?.name}</div><span className="cap">{coopById[pkgById[d.packageId]?.coopId]?.name}</span></div>
                  <div><span className="cap">Amount</span><span className="val">{formatNaira(d.amountDue - d.amountPaid)}</span></div>
                  <div><span className="cap">Due date</span><span className="val due">{formatDate(d.dueDate)}</span></div>
                  <ChevronRight size={18} />
                </Link>
              ))}
              <LinkButton to="/investor/distributions?status=Overdue" variant="outline-green" block>View all</LinkButton>
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title="Upcoming distributions" subtitle="Estimated due dates. Not paid until confirmed." />
          {upcoming.length === 0 ? (
            <p className="small muted">No distributions are scheduled yet.</p>
          ) : (
            <div className="inv-dash-list">
              {upcoming.slice(0, 3).map((d) => (
                <Link key={d.id} to="/investor/distributions" className="inv-dash-row">
                  <div><div className="strong small">{pkgById[d.packageId]?.name}</div><span className="cap">{d.type}</span></div>
                  <div><span className="cap">Amount due</span><span className="val">{formatNaira(d.amountDue)}</span></div>
                  <div><span className="cap">Due date</span><span className="val">{formatDate(d.dueDate)}</span></div>
                  <ChevronRight size={18} />
                </Link>
              ))}
              <LinkButton to="/investor/distributions" variant="outline-green" block>All distributions</LinkButton>
            </div>
          )}
        </Card>
      </div>

      <div className="grid-main inv-grid">
        <Card>
          <CardHeader title="Recent Investments" action={<LinkButton to="/investor/investments" variant="outline-green" size="sm">View All Investments</LinkButton>} />
          {recent.length === 0 ? (
            <p className="small muted">Your investments will be listed here.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table" style={{ minWidth: 560 }}>
                <thead>
                  <tr><th>Package</th><th>Invested</th><th>Expected return (estimate)</th><th>Due date</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recent.map((i) => {
                    const p = pkgById[i.packageId];
                    return (
                      <tr key={i.id}>
                        <td><Link to={`/investor/investments/${i.id}`} className="strong">{p?.name}</Link><div className="cell-sub">{coopById[p?.coopId]?.name} &middot; {cropOf(p)}</div></td>
                        <td>{formatNaira(i.committed)}</td>
                        <td>{formatNaira(Math.round(i.committed * (1 + (p?.expectedRoiPct || 0) / 100)))}<div className="cell-sub inv-green">{p?.expectedRoiPct}% est. ROI</div></td>
                        <td>{formatDate(i.expectedSettlementDate)}</td>
                        <td><StatusPill>{i.status}</StatusPill></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title="Recent Activity" action={<Link to="/investor/notifications" className="small strong">View all <ArrowRight size={14} style={{ verticalAlign: 'middle' }} /></Link>} />
          <div className="stack-sm">
            {notifications.length === 0 && <p className="small muted">You are all caught up.</p>}
            {notifications.slice(0, 4).map((n) => (
              <Link key={n.id} to={n.link || '/investor/notifications'} className="inv-notif" onClick={() => !n.read && update('notifications', n.id, { read: true })}>
                <span className="dot" style={{ background: n.read ? 'var(--grey-400)' : 'var(--green-500)', marginTop: 8 }} />
                <span>
                  <span className={cx('small', !n.read && 'strong')} style={{ display: 'block' }}>{n.title}</span>
                  <span className="caption muted" style={{ display: 'block' }}>{n.message}</span>
                  <span className="caption muted">{relativeTime(n.createdAt)}</span>
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-4"><LinkButton to="/investor/farmers" variant="outline-green" block><Search size={16} />Browse verified farmers</LinkButton></div>
        </Card>
      </div>

      <CardlessNote />
      <FundWalletModal open={fundOpen} onClose={closeFund} />
    </div>
  );
}

function CardlessNote() {
  return (
    <p className="caption muted">
      Three rules apply everywhere: a commitment is not received money, approval is not a guarantee of success, and crop failure is not fraud.
    </p>
  );
}
