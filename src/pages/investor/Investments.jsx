import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart3, CircleDollarSign, Download, HandCoins, Hourglass, Package } from 'lucide-react';
import { Banner, Button, DataTable, KpiCard, PageHeader, PageSkeleton, Progress, SearchInput, StatusPill } from '../../components/ui/index.js';
import { LinkButton } from '../../components/ui/Button.jsx';
import { useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatNaira, formatDate, pluralise } from '../../utils/format.js';
import { packageFunding } from '../../utils/rules.js';
import { useInvestor } from '../../components/inv/useInvestor.js';
import { InvSelect } from '../../components/inv/InvSelect.jsx';
import { UnverifiedBanner } from '../../components/inv/Common.jsx';
import { downloadCsv, sumBy } from '../../components/inv/invData.js';
import '../../styles/pages/inv.css';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'amount_desc', label: 'Amount, high to low' },
  { value: 'amount_asc', label: 'Amount, low to high' },
  { value: 'settlement', label: 'Settlement, soonest' },
];
const TRANCHE_OPTIONS = [
  { value: 'none', label: 'None released yet' },
  { value: 'some', label: 'Some released' },
  { value: 'all', label: 'All released' },
];

export default function Investments() {
  const loading = useSimulatedLoad(350);
  const navigate = useNavigate();
  const { data, investor, investments, pkgById } = useInvestor();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const status = params.get('status') || '';
  const pkgFilter = params.get('package') || '';
  const tranche = params.get('tranches') || '';
  const sort = params.get('sort') || 'newest';
  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (!v || (k === 'sort' && v === 'newest')) next.delete(k); else next.set(k, v);
    setParams(next, { replace: true });
  };

  const releasedBy = useMemo(() => {
    const m = {};
    data.tranches.forEach((t) => { m[t.packageId] = (m[t.packageId] || 0) + (t.status === 'Released' ? 1 : 0); });
    return m;
  }, [data.tranches]);
  const trancheState = (pkgId) => {
    const n = releasedBy[pkgId] || 0;
    return n === 0 ? 'none' : n >= 4 ? 'all' : 'some';
  };

  const statuses = useMemo(() => [...new Set(investments.map((i) => i.status))].map((v) => ({ value: v, label: v })), [investments]);
  const packageOptions = useMemo(() => [...new Set(investments.map((i) => i.packageId))].map((id) => ({ value: id, label: pkgById[id]?.name || id })), [investments, pkgById]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    let out = investments.filter((i) => {
      const p = pkgById[i.packageId];
      if (status && i.status !== status) return false;
      if (pkgFilter && i.packageId !== pkgFilter) return false;
      if (tranche && trancheState(i.packageId) !== tranche) return false;
      if (term && ![p?.name, p?.category, p?.tier, i.ref, i.status].join(' ').toLowerCase().includes(term)) return false;
      return true;
    });
    const by = {
      newest: (a, b) => String(b.dateInvested).localeCompare(String(a.dateInvested)),
      oldest: (a, b) => String(a.dateInvested).localeCompare(String(b.dateInvested)),
      amount_desc: (a, b) => b.committed - a.committed,
      amount_asc: (a, b) => a.committed - b.committed,
      settlement: (a, b) => String(a.expectedSettlementDate).localeCompare(String(b.expectedSettlementDate)),
    };
    out = [...out].sort(by[sort] || by.newest);
    return out;
  }, [investments, pkgById, q, status, pkgFilter, tranche, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <PageSkeleton />;

  const active = investments.filter((i) => i.status === 'Active');
  const funded = new Set(investments.filter((i) => i.confirmed > 0).map((i) => i.packageId));
  const pendingSettlement = sumBy(data.distributions.filter((d) => d.investorId === investor?.id && (d.status === 'Pending' || d.status === 'Overdue')), (d) => d.amountDue - d.amountPaid);

  const exportCsv = () => downloadCsv('investments.csv', [
    { header: 'Reference', value: (i) => i.ref },
    { header: 'Package', value: (i) => pkgById[i.packageId]?.name },
    { header: 'Package type', value: (i) => pkgById[i.packageId]?.tier },
    { header: 'Category', value: (i) => pkgById[i.packageId]?.category },
    { header: 'Amount committed', value: (i) => i.committed },
    { header: 'Confirmed received', value: (i) => i.confirmed },
    { header: 'Package funding progress %', value: (i) => packageFunding(pkgById[i.packageId] || { amount: 0, raised: 0, committed: 0 }).pct },
    { header: 'Expected settlement (estimate)', value: (i) => i.expectedSettlementDate },
    { header: 'Date invested', value: (i) => i.dateInvested },
    { header: 'Status', value: (i) => i.status },
  ], rows);

  const columns = [
    { key: 'package', header: 'Package', render: (i) => { const p = pkgById[i.packageId]; return (<><div className="strong">{p?.name}</div><div className="cell-sub">{p?.category} &middot; {i.ref}</div></>); } },
    { key: 'type', header: 'Package Type', render: (i) => pkgById[i.packageId]?.tier },
    { key: 'amount', header: 'Amount Invested', render: (i) => (<><div className="strong">{formatNaira(i.committed)}</div>{i.confirmed < i.committed && <div className="cell-sub" style={{ color: 'var(--yellow-600)' }}>{formatNaira(i.committed - i.confirmed)} not yet confirmed</div>}</>) },
    {
      key: 'progress',
      header: 'Funding Progress',
      render: (i) => { const f = packageFunding(pkgById[i.packageId] || { amount: 0, raised: 0, committed: 0 }); return (<div style={{ minWidth: 110 }}><div className="caption strong">{f.pct}%</div><Progress value={f.pct} label={`Package funding ${f.pct} percent`} /></div>); },
    },
    { key: 'settle', header: 'Expected Settlement', render: (i) => (<><div>{formatDate(i.expectedSettlementDate)}</div><div className="cell-sub">Estimate</div></>) },
    { key: 'date', header: 'Date Invested', render: (i) => formatDate(i.dateInvested) },
    { key: 'status', header: 'Status', render: (i) => <StatusPill>{i.status}</StatusPill> },
    { key: 'actions', header: 'Actions', render: (i) => <LinkButton to={`/investor/investments/${i.id}`} variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>View</LinkButton> },
  ];

  const hasFilter = q || status || pkgFilter || tranche;

  return (
    <div className="page">
      <PageHeader title="Investments" subtitle="Track and manage your active and completed investments" actions={<LinkButton to="/investor/packages" variant="outline-green"><Package size={18} />Browse packages</LinkButton>} />
      <UnverifiedBanner investor={investor} />

      <div className="kpi-grid">
        <KpiCard icon={<CircleDollarSign size={20} />} tone="dark" label="Total Invested" value={formatNaira(sumBy(investments, (i) => i.committed))}>
          <span className="inv-kpi-sub">Committed. {formatNaira(sumBy(investments, (i) => i.confirmed))} confirmed received</span>
        </KpiCard>
        <KpiCard icon={<BarChart3 size={20} />} label="Active Investments" value={formatNaira(sumBy(active, (i) => i.committed))}>
          <span className="inv-kpi-sub">{pluralise(active.length, 'active investment')}</span>
        </KpiCard>
        <KpiCard icon={<HandCoins size={20} />} label="Packages Funded" value={funded.size}>
          <span className="inv-kpi-sub">With money confirmed by the partner</span>
        </KpiCard>
        <KpiCard icon={<Hourglass size={20} />} tone="gold" label="Pending Settlement" value={formatNaira(pendingSettlement)}>
          <span className="inv-kpi-sub">Still due back to you (estimate)</span>
        </KpiCard>
      </div>

      <Banner tone="info">Total Invested counts commitments. Only the Confirmed received figure is money the financial partner has actually received. Settlement dates and amounts are estimates.</Banner>

      <DataTable
        rows={rows}
        columns={columns}
        pageSize={8}
        totalLabel="Investments"
        onRowClick={(i) => navigate(`/investor/investments/${i.id}`)}
        emptyTitle={investments.length ? 'No investments match your filters' : 'You have no investments yet'}
        emptyText="When you commit to a funding package it will appear here with its status and settlement details."
        emptyAction={hasFilter ? <Button variant="outline-green" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Clear filters</Button> : <LinkButton to="/investor/packages">Browse packages</LinkButton>}
        toolbarLeft={<SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search investments" />}
        toolbarExtra={(
          <>
            <InvSelect label="Status" value={status} onChange={(v) => setParam('status', v)} allLabel="All Status" options={statuses} />
            <InvSelect label="Package" value={pkgFilter} onChange={(v) => setParam('package', v)} allLabel="All Packages" options={packageOptions} />
            <InvSelect label="Tranches" value={tranche} onChange={(v) => setParam('tranches', v)} allLabel="All Tranches" options={TRANCHE_OPTIONS} />
            <InvSelect label="Sort by" prefix="Sort by: " value={sort} onChange={(v) => setParam('sort', v)} options={SORTS} />
            <Button variant="outline-green" onClick={exportCsv} disabled={rows.length === 0} aria-label={`Export ${rows.length} rows to CSV`}><Download size={16} />Export CSV</Button>
          </>
        )}
      />
    </div>
  );
}
