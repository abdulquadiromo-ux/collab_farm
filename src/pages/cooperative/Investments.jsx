import { useEffect, useMemo, useState } from 'react';
import { Banknote, Handshake, PackageCheck, Hourglass } from 'lucide-react';
import { Banner, Button, EmptyState, FilterSelect, KpiCard, DataTable, LinkButton, PageHeader, PageSkeleton, Pagination, SearchInput, StatusPill } from '../../components/ui/index.js';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate, formatNaira } from '../../utils/format.js';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';
import { InvestmentModal } from '../../components/coopb/Modals.jsx';
import '../../styles/pages/coopb.css';

const PAGE_SIZE = 20;
const STATUSES = [
  { value: 'pending', label: 'Pending' }, { value: 'active', label: 'Active' },
  { value: 'overdue', label: 'Overdue' }, { value: 'settled', label: 'Settled' },
  { value: 'completed', label: 'Completed' },
];
const CATEGORIES = [
  { value: 'CROP_FARMING', label: 'Crop Farming' }, { value: 'FISHERY', label: 'Fishery' },
  { value: 'MIXED_FARMING', label: 'Mixed Farming' }, { value: 'LIVESTOCK', label: 'Livestock' },
  { value: 'POULTRY', label: 'Poultry' }, { value: 'CUSTOM', label: 'Custom' },
];

function amountValue(metric) { return Number(metric?.value ?? metric) || 0; }
function trendText(metric) {
  const trend = Number(metric?.trend_percentage);
  if (!Number.isFinite(trend)) return 'Compared with the previous period';
  return `${trend > 0 ? '+' : ''}${trend}% compared with the previous period`;
}
function displayStatus(status) {
  return String(status || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function displayCategory(category) {
  return String(category || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function mapInvestment(item) {
  return {
    ...item,
    id: item?.id,
    investorName: item?.investor_name || 'Investor',
    investorIdCode: item?.investor_id_code || '',
    investorAvatar: item?.investor_avatar || '',
    packageName: item?.package_title || 'Package',
    packageId: item?.package_id || item?.packageId || '',
    packageCategory: displayCategory(item?.package_category),
    amount: Number(item?.amount_invested) || 0,
    dateInvested: item?.date_invested || '',
    expectedSettlementDate: item?.expected_settlement_date || '',
    expectedSettlementAmount: Number(item?.expected_settlement_amount) || 0,
    status: displayStatus(item?.status || item?.settlement_status),
    settlementStatus: displayStatus(item?.settlement_status),
    reference: item?.transaction_reference || item?.investor_id_code || item?.id || '—',
  };
}

export default function Investments() {
  const { accessToken } = useApp();
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [selected, setSelected] = useState(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); setSearchQuery(search.trim()); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setSummaryLoading(true); setSummaryError('');
      if (!accessToken) { setSummaryError('Your session has expired. Sign in again to view investments.'); setSummaryLoading(false); return; }
      try {
        const response = await fetch(`${API_BASE_URL}/cooperative/investments/summary`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not load investment summary (${response.status}).`));
        setSummary(payload || {});
      } catch (error) { if (error.name !== 'AbortError') setSummaryError(error.message || 'Could not load investment summary.'); }
      finally { if (!controller.signal.aborted) setSummaryLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [accessToken, reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setListLoading(true); setListError('');
      if (!accessToken) { setListError('Your session has expired. Sign in again to view investments.'); setListLoading(false); return; }
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      if (searchQuery) params.set('search', searchQuery);
      if (category) params.set('category', category);
      if (status) params.set('status', status);
      try {
        const response = await fetch(`${API_BASE_URL}/cooperative/investments?${params}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not load investments (${response.status}).`));
        setItems((Array.isArray(payload?.items) ? payload.items : []).map(mapInvestment));
        setTotal(Number(payload?.total) || 0);
      } catch (error) { if (error.name !== 'AbortError') { setItems([]); setTotal(0); setListError(error.message || 'Could not load investments.'); } }
      finally { if (!controller.signal.aborted) setListLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [accessToken, page, searchQuery, category, status, reloadKey]);

  const openDetail = async (row) => {
    setSelected(row); setSelectedLoading(true); setSelectedError('');
    try {
      if (!accessToken) throw new Error('Your session has expired. Sign in again to view this investment.');
      const response = await fetch(`${API_BASE_URL}/cooperative/investments/${encodeURIComponent(row.id)}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not load investment details (${response.status}).`));
      setSelected({ ...row, ...payload, ...mapInvestment(payload), packageId: payload?.package_id || row.packageId });
    } catch (error) { setSelectedError(error.message || 'Could not load investment details.'); }
    finally { setSelectedLoading(false); }
  };

  const summaryCells = useMemo(() => [
    { icon: <Banknote size={20} />, label: 'Total Invested', metric: summary?.total_invested, money: true },
    { icon: <PackageCheck size={20} />, label: 'Active Investments', metric: summary?.active_investments },
    { icon: <Handshake size={20} />, label: 'Expected Settlement', metric: summary?.expected_settlement, money: true },
    { icon: <Hourglass size={20} />, label: 'Overdue Investments', metric: summary?.overdue_investments, money: true, tone: 'gold' },
  ], [summary]);

  const columns = [
    { key: 'investorName', header: 'Investor name', render: (row) => <span className="strong">{row.investorName}</span> },
    { key: 'packageName', header: 'Package', render: (row) => <span className="coopb-cell-link"><span className="strong coopb-trunc">{row.packageName}</span><span className="cell-sub">{row.packageCategory}</span></span> },
    { key: 'amount', header: 'Amount invested', render: (row) => <span className="nowrap">{formatNaira(row.amount)}</span> },
    { key: 'expectedSettlementAmount', header: 'Expected settlement', render: (row) => <span className="nowrap">{formatNaira(row.expectedSettlementAmount)}</span> },
    { key: 'expectedSettlementDate', header: 'Expected settlement date', render: (row) => <span className="nowrap">{row.expectedSettlementDate ? formatDate(row.expectedSettlementDate) : '—'}</span> },
    { key: 'dateInvested', header: 'Date invested', render: (row) => <span className="nowrap">{row.dateInvested ? formatDate(row.dateInvested) : '—'}</span> },
    { key: 'status', header: 'Status', render: (row) => <StatusPill>{row.status}</StatusPill> },
    { key: 'actions', header: 'Actions', render: (row) => <Button variant="outline" size="sm" onClick={() => openDetail(row)} aria-label={`View investment ${row.reference}`}>View</Button> },
  ];

  if (summaryLoading) return <PageSkeleton />;

  return (
    <div className="page">
      <PageHeader title="Investments" subtitle="Track investor funding into your packages. Only money confirmed by the financial partner counts as received." />
      {summaryError && <Banner tone="warn" title="Investment summary unavailable">{summaryError}</Banner>}
      <div className="kpi-grid coopb-kpis">
        {summaryCells.map((cell) => <KpiCard key={cell.label} icon={cell.icon} label={cell.label} value={cell.money ? formatNaira(amountValue(cell.metric)) : amountValue(cell.metric)} tone={cell.tone}>
          <div className="kpi-card__delta">{trendText(cell.metric)}</div>
        </KpiCard>)}
      </div>

      {listError ? (
        <EmptyState title="Investments unavailable" action={<Button onClick={() => setReloadKey((key) => key + 1)}>Try again</Button>}>{listError}</EmptyState>
      ) : (
        <div className="coopb-inv-table">
          <div className="table-toolbar">
            <div className="row-wrap grow"><SearchInput value={search} onChange={setSearch} placeholder="Search investor, package or reference" /></div>
            <div className="table-toolbar__filters">
              <FilterSelect value={category} onChange={(value) => { setCategory(value); setPage(1); }} allLabel="All Categories" options={CATEGORIES} />
              <FilterSelect value={status} onChange={(value) => { setStatus(value); setPage(1); }} allLabel="All Status" options={STATUSES} />
            </div>
          </div>
          <DataTable columns={columns} rows={items} loading={listLoading} hideFooter bare pageSize={PAGE_SIZE} emptyTitle="No investments yet" emptyText="Investments in your packages will appear here." />
          {!listLoading && total > 0 && <div className="pagination-bar"><span className="muted">Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)} of {total} investments</span><Pagination page={page} pages={pages} onPage={setPage} /></div>}
        </div>
      )}

      <InvestmentModal open={!!selected} onClose={() => { setSelected(null); setSelectedError(''); }} row={selected} loading={selectedLoading} error={selectedError} />
    </div>
  );
}
