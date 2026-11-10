import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, ChevronRight, Landmark, PackageCheck, Printer, ShieldCheck, Users, Banknote, Circle,
} from 'lucide-react';
import {
  Avatar, Button, Card, CardHeader, DataTable, EmptyState, KpiCard, LinkButton, PageHeader, PageSkeleton, StatusPill,
} from '../../components/ui/index.js';
import { BarChart, DonutChart } from '../../components/charts/Charts.jsx';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { ROI_SERIES } from '../../data/governance.js';
import { formatDate, formatNaira, formatTime, cx } from '../../utils/format.js';
import { UnverifiedBanner } from '../../components/coopa/Bits.jsx';
import { daysAgo, downloadCsv, timeOfDay, toCsv, useCoop } from '../../components/coopa/helpers.js';
import '../../styles/pages/coopa.css';

export default function Dashboard() {
  const { data, user } = useApp();
  const { coop, farmers, farms, packages, verified } = useCoop();
  const loading = useSimulatedLoad(350);
  const [range, setRange] = useState('6m');

  const stats = useMemo(() => {
    const active = farmers.filter((f) => f.status !== 'Removed');
    const verifiedCount = active.filter((f) => f.status === 'Verified').length;
    const pending = active.filter((f) => f.status === 'Pending');
    const addedRecently = active.filter((f) => daysAgo(f.dateAdded) >= 0 && daysAgo(f.dateAdded) <= 30).length;
    // "Received" means confirmed by the financial partner (package.raised). Commitments are not received money.
    const received = packages.reduce((s, p) => s + (Number(p.raised) || 0), 0);
    const committed = packages.reduce((s, p) => s + (Number(p.committed) || 0), 0);
    const crops = {};
    active.forEach((f) => {
      const category = f.farmingCategory || f.cropType || 'Other';
      crops[category] = (crops[category] || 0) + 1;
    });
    const sorted = Object.entries(crops).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 4);
    const rest = sorted.slice(4).reduce((s, [, n]) => s + n, 0);
    if (rest) top.push(['Others', rest]);
    return { active, verifiedCount, pending, addedRecently, received, committed, awaiting: Math.max(0, committed - received), crops: top };
  }, [farmers, packages]);

  const pkgIds = useMemo(() => packages.map((p) => p.id), [packages]);

  const investmentCounts = useMemo(() => {
    const mine = data.investments.filter((i) => pkgIds.includes(i.packageId));
    const count = (s) => mine.filter((i) => i.status === s).length;
    return { total: mine.length, rows: [['Active', count('Active'), '#17b26a'], ['Pending', count('Pending'), '#f79009'], ['Completed', count('Completed'), '#2970ff'], ['Repaid', count('Repaid'), '#2970ff'], ['Overdue', count('Overdue'), '#d92d20']] };
  }, [data.investments, pkgIds]);

  const recentFarmers = useMemo(() => [...farmers].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)).slice(0, 5), [farmers]);

  if (loading) return <PageSkeleton />;
  if (!coop) {
    return (
      <div className="page">
        <EmptyState title="We could not find your cooperative record" action={<LinkButton to="/login" variant="outline">Back to sign in</LinkButton>}>
          Sign in again with a cooperative account to see this dashboard.
        </EmptyState>
      </div>
    );
  }

  const first = user?.firstName || user?.name?.split(' ')[0] || 'there';
  const activeCount = stats.active.length;
  const newCoop = farmers.length === 0 && farms.length === 0 && packages.length === 0;
  const steps = [
    { done: verified, label: 'Get your cooperative verified', text: 'A reviewer checks your registration documents.', to: '/onboarding/status', cta: 'View status' },
    { done: farmers.length > 0, label: 'Add your first farmer', text: 'Add farmers one by one or upload a CSV file.', to: '/coop/farmers/new', cta: 'Add Farmer' },
    { done: farms.length > 0, label: 'Register a farm', text: 'Record where your farmers grow their crops.', to: '/coop/farms', cta: 'Add farm' },
    { done: packages.length > 0, label: 'Create a funding request', text: 'Available once your cooperative is verified.', to: '/coop/funding/new', cta: 'Start request', locked: !verified },
  ];
  const showSteps = steps.some((s) => !s.done);

  const exportReport = () => {
    downloadCsv('cooperative-summary.csv', toCsv([
      ['Cooperative', coop.name], ['Report date', formatDate(new Date())], [],
      ['Measure', 'Value'],
      ['Total farmers (not removed)', activeCount], ['Verified farmers', stats.verifiedCount], ['Pending farmers', stats.pending.length],
      ['Total packages created', packages.length], ['Funding confirmed received (NGN)', stats.received], ['Committed, awaiting confirmation (NGN)', stats.awaiting],
    ]));
  };

  const donut = stats.crops.map(([label, value]) => ({ label, value, display: `${value} (${Math.round((value / activeCount) * 1000) / 10}%)` }));

  return (
    <div className="page coopa">
      <PageHeader
        greeting
        title={<>Good {timeOfDay()}, <em>{first}</em></>}
        subtitle="Monitor your farmers, farms and funding in one place."
        actions={<Button variant="outline" onClick={exportReport}><Printer size={18} />Export Report</Button>}
      />

      <UnverifiedBanner coop={coop} />

      {showSteps && (
        <Card className="coopa-steps">
          <CardHeader title={newCoop ? 'Welcome. Here is how to get started' : 'Finish setting up your cooperative'} subtitle="Complete these steps in any order. Funding steps unlock after verification." />
          <ol className="coopa-steps__list">
            {steps.map((s, i) => (
              <li key={s.label} className={cx('coopa-step', s.done && 'coopa-step--done')}>
                <span className="coopa-step__num">{s.done ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
                <div className="grow">
                  <div className="strong small">{s.label}</div>
                  <div className="caption muted">{s.text}</div>
                </div>
                {!s.done && (s.locked ? <span className="caption muted">Locked until verified</span> : <LinkButton to={s.to} variant="outline-green" size="sm">{s.cta}</LinkButton>)}
                {s.done && <span className="caption green strong">Done</span>}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="kpi-grid">
        <KpiCard
          icon={<Users size={18} />}
          label="Total Farmers"
          value={activeCount}
          pill={stats.addedRecently > 0 ? `+${stats.addedRecently}` : undefined}
          action={activeCount === 0 ? <Link className="kpi-card__link" to="/coop/farmers/new">Add your first farmer <ChevronRight size={14} /></Link> : undefined}
        >
          <div className="kpi-card__delta">{activeCount === 0 ? 'No farmers on your list yet.' : stats.addedRecently > 0 ? `${stats.addedRecently} added in the last 30 days` : 'None added in the last 30 days'}</div>
        </KpiCard>
        <KpiCard icon={<ShieldCheck size={18} />} label="Verified Farmers" value={stats.verifiedCount}>
          <div className="kpi-card__delta">{activeCount === 0 ? 'Verified by CollabFarm reviewers.' : `${Math.round((stats.verifiedCount / activeCount) * 100)}% of your farmers. ${stats.pending.length} pending.`}</div>
        </KpiCard>
        <KpiCard
          icon={<PackageCheck size={18} />}
          label="Total Packages Created"
          value={packages.length}
          action={packages.length === 0 ? <Link className="kpi-card__link" to="/coop/funding">Create a package <ChevronRight size={14} /></Link> : undefined}
        >
          <div className="kpi-card__delta">Funding packages created by your cooperative</div>
        </KpiCard>
        <KpiCard
          icon={<Banknote size={18} />}
          label="Total Funding Received"
          value={formatNaira(stats.received)}
          tone="gold"
          action={packages.length === 0 ? <Link className="kpi-card__link" to="/coop/funding">See funding <ChevronRight size={14} /></Link> : undefined}
        >
          <div className="kpi-card__delta">{packages.length === 0 ? 'No funding requests yet.' : stats.awaiting > 0 ? `${formatNaira(stats.awaiting)} committed, awaiting confirmation` : 'Confirmed by the financial partner'}</div>
        </KpiCard>
      </div>
      <p className="caption muted coopa-note">Funding received is money confirmed by the financial partner. A commitment from an investor is a promise, not received money, so it is not counted here.</p>

      <div className="grid-2 coopa-charts">
        <Card>
          <CardHeader
            title="Accumulative ROI"
            subtitle="Track a sample return trend over time."
            action={(
              <select className="select select--filter" value={range} onChange={(e) => setRange(e.target.value)} aria-label="ROI range">
                <option value="6m">In 6 months</option>
                <option value="12m">In 12 months</option>
              </select>
            )}
          />
          <BarChart data={ROI_SERIES[range]} height={280} />
          <p className="caption muted coopa-illustrative"><strong>Illustrative example only.</strong> These bars are sample figures, not your cooperative's results. Expected returns are estimates and are never guaranteed.</p>
        </Card>
        <Card>
          <CardHeader title="Farmers by Farming Category" action={<LinkButton to="/coop/farmers" variant="outline" size="sm">View All Farmers</LinkButton>} />
          {donut.length ? (
            <DonutChart data={donut} total={activeCount} />
          ) : (
            <EmptyState icon={<Users size={28} />} title="No farmers yet" action={<LinkButton to="/coop/farmers/new" size="sm">Add Farmer</LinkButton>}>
              Once you add farmers, you will see how your crops are split here.
            </EmptyState>
          )}
        </Card>
      </div>

      <div className="grid-main coopa-top">
        <Card className="coopa-compact">
          <CardHeader title="Recent Farmers" action={<LinkButton to="/coop/farmers" variant="outline" size="sm">View All Farmers</LinkButton>} />
          <DataTable
            bare
            hideFooter
            pageSize={5}
            rows={recentFarmers}
            emptyTitle="No farmers added yet"
            emptyText="Farmers you add will appear here with their verification status."
            emptyAction={<LinkButton to="/coop/farmers/new" size="sm">Add Farmer</LinkButton>}
            columns={[
              { key: 'name', header: 'Names', render: (f) => <div className="cell-person"><Avatar name={f.name} /><Link to={`/coop/farmers/${f.id}`} className="coopa-name">{f.name}</Link></div> },
              { key: 'cropType', header: 'Crop type' },
              { key: 'dateAdded', header: 'Date & time added', render: (f) => <div>{formatDate(f.dateAdded)}<div className="cell-sub">{formatTime(f.dateAdded)}</div></div> },
              { key: 'status', header: 'Status', render: (f) => <StatusPill>{f.status}</StatusPill> },
            ]}
          />
        </Card>

        <Card>
          <CardHeader title="Recent investments" subtitle="Investor commitments to your funding packages." />
          {investmentCounts.total === 0 ? (
            <EmptyState icon={<Landmark size={28} />} title="No investments yet" action={<LinkButton to="/coop/funding" variant="outline" size="sm">View funding</LinkButton>}>
              Investors can commit once a funding request is approved and open for funding.
            </EmptyState>
          ) : (
            <>
              <ul className="coopa-inv">
                {investmentCounts.rows.map(([label, n, color]) => (
                  <li key={label}>
                    <Link to="/coop/investments" className="coopa-inv__row">
                      <Circle size={10} fill={color} stroke={color} />
                      <span className="grow">{label}</span>
                      <strong>{n}</strong>
                      <ChevronRight size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="caption muted" style={{ marginTop: 12 }}>Pending means an investor has committed but the financial partner has not confirmed the money yet.</p>
              <LinkButton to="/coop/investments" variant="outline" block className="mt-4">View all investments</LinkButton>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
