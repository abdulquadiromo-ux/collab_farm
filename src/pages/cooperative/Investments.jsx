import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Handshake, PackageCheck, Hourglass } from 'lucide-react';
import { PageHeader, KpiCard, DataTable, StatusPill, Button, EmptyState, LinkButton, FilterSelect, PageSkeleton } from '../../components/ui/index.js';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatNaira, formatDate } from '../../utils/format.js';
import { sum } from '../../utils/rules.js';
import { useCoop } from '../../components/coopb/hooks.js';
import { InvestmentModal } from '../../components/coopb/Modals.jsx';
import { PlainTerms } from '../../components/coopb/Common.jsx';
import '../../styles/pages/coopb.css';

const SORTS = [
  { value: 'newest', label: 'Sort by: Newest' },
  { value: 'oldest', label: 'Sort by: Oldest' },
  { value: 'largest', label: 'Sort by: Largest commitment' },
  { value: 'smallest', label: 'Sort by: Smallest commitment' },
];

export default function Investments() {
  const loading = useSimulatedLoad(350);
  const { data } = useApp();
  const { coop, packages } = useCoop();
  const [sort, setSort] = useState('newest');
  const [selected, setSelected] = useState(null);

  const rows = useMemo(() => {
    const mine = new Map(packages.map((p) => [p.id, p]));
    const list = data.investments.filter((i) => mine.has(i.packageId)).map((i) => ({
      ...i,
      pkg: mine.get(i.packageId),
      packageName: mine.get(i.packageId).name,
      investorName: data.investors.find((v) => v.id === i.investorId)?.name || 'Investor',
      expectedSettlementAmount: Math.round((Number(i.committed || i.intended) || 0) * (1 + (Number(mine.get(i.packageId).expectedRoiPct) || 0) / 100)),
      agreement: data.contracts.find((c) => c.id === i.agreementId) || null,
      tranches: data.tranches.filter((t) => t.packageId === i.packageId).sort((a, b) => a.number - b.number),
    }));
    const by = { newest: (a, b) => String(b.dateInvested).localeCompare(String(a.dateInvested)), oldest: (a, b) => String(a.dateInvested).localeCompare(String(b.dateInvested)), largest: (a, b) => b.committed - a.committed, smallest: (a, b) => a.committed - b.committed };
    return [...list].sort(by[sort]);
  }, [data.investments, data.investors, data.contracts, data.tranches, packages, sort]);

  if (loading) return <PageSkeleton />;
  if (!coop) return <div className="page"><EmptyState title="Cooperative not found">Sign in with a cooperative account to see investments.</EmptyState></div>;

  const totalInvested = sum(rows, (r) => r.confirmed);
  const activeInvestments = rows.filter((r) => r.status === 'Active').length;
  const unsettledInvestments = rows.filter((r) => ['Active', 'Overdue'].includes(r.status));
  const expectedSettlement = sum(unsettledInvestments, (r) => r.expectedSettlementAmount);
  const overdueSettlement = sum(rows.filter((r) => r.status === 'Overdue'), (r) => r.expectedSettlementAmount);
  const pkgOptions = packages.filter((p) => rows.some((r) => r.packageId === p.id)).map((p) => ({ value: p.id, label: p.name }));

  const columns = [
    { key: 'investorName', header: 'Investor name', render: (r) => <span className="strong">{r.investorName}</span> },
    {
      key: 'packageName', header: 'Package',
      render: (r) => (
        <Link to={`/coop/funding/${r.packageId}`} className="coopb-cell-link">
          <span className="strong coopb-trunc">{r.packageName}</span>
        </Link>
      ),
    },
    { key: 'committed', header: 'Amount', render: (r) => <span className="nowrap">{formatNaira(r.committed || r.intended)}</span> },
    { key: 'expectedSettlementAmount', header: 'Expected settlement amount', render: (r) => <span className="nowrap">{formatNaira(r.expectedSettlementAmount)}</span> },
    { key: 'expectedSettlementDate', header: 'Expected settlement date', render: (r) => <span className="nowrap">{r.expectedSettlementDate ? formatDate(r.expectedSettlementDate) : '-'}</span> },
    { key: 'dateInvested', header: 'Date invested', render: (r) => <span className="nowrap">{formatDate(r.dateInvested)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusPill>{r.status}</StatusPill> },
    { key: 'actions', header: 'Actions', render: (r) => <Button variant="outline" size="sm" onClick={() => setSelected(r)} aria-label={`View investment ${r.ref}`}>View</Button> },
  ];

  const filters = [
    { key: 'status', allLabel: 'All Status', options: [...new Set(rows.map((r) => r.status))] },
    { key: 'packageId', allLabel: 'All Packages', options: pkgOptions },
  ];

  return (
    <div className="page">
      <PageHeader title="Investments" subtitle="Track investor funding into your packages. Only money confirmed by the financial partner counts as received." />

      <div className="kpi-grid coopb-kpis">
        <KpiCard icon={<Banknote size={20} />} label="Total Invested" value={formatNaira(totalInvested)}><div className="kpi-card__delta">Confirmed investment across your packages</div></KpiCard>
        <KpiCard icon={<PackageCheck size={20} />} label="Active Investments" value={activeInvestments}><div className="kpi-card__delta">Investments currently in progress</div></KpiCard>
        <KpiCard icon={<Handshake size={20} />} label="Expected Settlement Amount" value={formatNaira(expectedSettlement)}><div className="kpi-card__delta">Expected amounts for active and overdue investments</div></KpiCard>
        <KpiCard icon={<Hourglass size={20} />} tone="gold" label="Overdue Investment" value={formatNaira(overdueSettlement)}><div className="kpi-card__delta">Expected settlement amount on overdue investments</div></KpiCard>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No investments yet" action={<LinkButton to="/coop/funding">Go to Funding Packages</LinkButton>}>
          Once investors commit to one of your packages, their commitments appear here.
        </EmptyState>
      ) : (
        <div className="coopb-inv-table">
          <DataTable
            columns={columns}
            rows={rows}
            searchKeys={(r) => `${r.packageName} ${r.investorName} ${r.ref} ${r.status}`}
            searchPlaceholder="Search investments"
            filters={filters}
            toolbarExtra={<FilterSelect value={sort} onChange={setSort} options={SORTS} label="Sort investments" />}
            totalLabel="Investments"
            pageSize={10}
          />
        </div>
      )}

      <PlainTerms terms={['commitment', 'tranche']} />
      <InvestmentModal open={!!selected} onClose={() => setSelected(null)} row={selected} />
    </div>
  );
}
