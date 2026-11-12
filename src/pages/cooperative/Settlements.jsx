import { useEffect, useMemo, useState } from 'react';
import { Landmark, Hourglass, CalendarDays, Files } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { PageHeader, KpiStrip, DataTable, StatusPill, Button, EmptyState, Modal, InfoList, Banner, Pagination, SearchInput, FilterSelect, SelectField, TextAreaField } from '../../components/ui/index.js';
import { formatNaira, formatDate } from '../../utils/format.js';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';
import '../../styles/pages/coopc.css';

const PAGE_SIZE = 10;
const SETTLEMENT_STATUSES = ['PENDING', 'REVIEWING', 'REJECTED', 'DISBURSED', 'SETTLED'];
const PACKAGE_CATEGORIES = ['CROP_FARMING', 'FISHERY', 'MIXED_FARMING', 'LIVESTOCK', 'POULTRY', 'CUSTOM'];
const label = (value) => String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const number = (value) => Number(String(value ?? 0).replace(/[^\d.-]/g, '')) || 0;

function mapSettlement(item = {}) {
  const farmer = item.farmer || {};
  const pkg = item.package || {};
  return {
    ...item,
    id: item.id,
    farmer,
    pkg,
    farmerName: farmer.full_name || item.farmer_name || item.recipient_name || 'Farmer',
    farmerCode: farmer.farmer_code || item.farmer_code || '',
    packageId: pkg.id || item.package_id || '',
    packageTitle: pkg.title || item.package_title || 'Package',
    category: pkg.category || item.package_category || item.package_type || '',
    amount: number(item.amount_settled ?? item.amount ?? item.settled_amount),
    date: item.date_settled || item.settlement_date || '',
    status: String(item.status || 'PENDING').toUpperCase(),
    reference: item.transaction_reference || item.reference || '—',
    recordedBy: item.recorded_by_name || '',
  };
}

export default function Settlements() {
  const { accessToken, toast } = useApp();
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [packageType, setPackageType] = useState('');
  const [status, setStatus] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [nextStatus, setNextStatus] = useState('PENDING');
  const [savingStatus, setSavingStatus] = useState(false);
  const [returnNote, setReturnNote] = useState('');
  const [reportingReturn, setReportingReturn] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => { const timer = setTimeout(() => { setPage(1); setSearchQuery(search.trim()); }, 300); return () => clearTimeout(timer); }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setMetricsError('');
      if (!accessToken) { setMetricsError('Your session has expired. Sign in again to view settlements.'); return; }
      try {
        const response = await fetch(`${API_BASE_URL}/settlements/metrics`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not load settlement metrics (${response.status}).`));
        setMetrics(payload || {});
      } catch (error) { if (error.name !== 'AbortError') setMetricsError(error.message || 'Could not load settlement metrics.'); }
    };
    load(); return () => controller.abort();
  }, [accessToken, reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setListLoading(true); setListError('');
      if (!accessToken) { setListError('Your session has expired. Sign in again to view settlements.'); setListLoading(false); return; }
      const query = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (searchQuery) query.set('search', searchQuery);
      if (packageType) query.set('package_type', packageType);
      if (status) query.set('status', status);
      try {
        const response = await fetch(`${API_BASE_URL}/settlements?${query}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not load settlements (${response.status}).`));
        setRows((Array.isArray(payload?.items) ? payload.items : []).map(mapSettlement));
        setTotal(Number(payload?.total) || 0);
      } catch (error) { if (error.name !== 'AbortError') { setRows([]); setTotal(0); setListError(error.message || 'Could not load settlements.'); } }
      finally { if (!controller.signal.aborted) setListLoading(false); }
    };
    load(); return () => controller.abort();
  }, [accessToken, page, searchQuery, packageType, status, reloadKey]);

  const openDetail = async (row) => {
    setSelected(row); setDetailLoading(true); setDetailError('');
    try {
      if (!accessToken) throw new Error('Your session has expired. Sign in again to view settlement details.');
      const response = await fetch(`${API_BASE_URL}/settlements/${encodeURIComponent(row.id)}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not load settlement details (${response.status}).`));
      const detail = mapSettlement(payload);
      setSelected(detail); setNextStatus(detail.status);
      setReturnNote('');
    } catch (error) { setDetailError(error.message || 'Could not load settlement details.'); }
    finally { setDetailLoading(false); }
  };

  const updateStatus = async () => {
    setSavingStatus(true); setDetailError('');
    try {
      if (!accessToken) throw new Error('Your session has expired. Sign in again to update this settlement.');
      const response = await fetch(`${API_BASE_URL}/settlements/${encodeURIComponent(selected.id)}/status`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not update settlement status (${response.status}).`));
      setSelected((current) => ({ ...current, status: nextStatus }));
      setRows((current) => current.map((row) => row.id === selected.id ? { ...row, status: nextStatus } : row));
      setReloadKey((key) => key + 1); toast('Settlement status updated', 'success');
    } catch (error) { setDetailError(error.message || 'Could not update settlement status.'); }
    finally { setSavingStatus(false); }
  };

  const reportReturn = async () => {
    if (!selected || reportingReturn) return;
    setReportingReturn(true); setDetailError('');
    try {
      if (!accessToken) throw new Error('Your session has expired. Sign in again to report this settlement return.');
      const response = await fetch(`${API_BASE_URL}/settlements/${encodeURIComponent(selected.id)}/return`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: returnNote.trim() || null }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not report settlement return (${response.status}).`));
      setSelected((current) => current ? { ...current, status: 'SETTLED' } : current);
      setNextStatus('SETTLED');
      setRows((current) => current.map((row) => row.id === selected.id ? { ...row, status: 'SETTLED' } : row));
      setReloadKey((key) => key + 1);
      toast('Settlement return reported', 'success');
    } catch (error) { setDetailError(error.message || 'Could not report settlement return.'); }
    finally { setReportingReturn(false); }
  };

  const settlementColumns = useMemo(() => [
    { key: 'farmerName', header: 'Farmer', sortable: true, render: (row) => <div><div className="strong">{row.farmerName}</div><div className="cell-sub">{row.farmerCode || 'Farmer'}</div></div> },
    { key: 'packageTitle', header: 'Package', sortable: true },
    { key: 'amount', header: 'Amount settled', sortable: true, render: (row) => formatNaira(row.amount) },
    { key: 'date', header: 'Date settled', sortable: true, className: 'nowrap', render: (row) => row.date ? formatDate(row.date) : '—' },
    { key: 'category', header: 'Category', render: (row) => label(row.category) },
    { key: 'reference', header: 'Reference' },
    { key: 'status', header: 'Status', render: (row) => <StatusPill>{label(row.status)}</StatusPill> },
    { key: 'action', header: 'Action', render: (row) => <Button variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); openDetail(row); }}>View</Button> },
  ], []);
  const resetFilters = () => { setSearch(''); setSearchQuery(''); setPackageType(''); setStatus(''); setPage(1); };
  const selectedDetail = selected && <Modal open onClose={() => { setSelected(null); setDetailError(''); }} title="Settlement details" wide white footer={<Button variant="outline" onClick={() => { setSelected(null); setDetailError(''); }}>Close</Button>}>
    {detailLoading ? <p className="muted">Loading settlement details…</p> : <div className="stack">
      {detailError && <Banner tone="warn" title="Settlement request failed">{detailError}</Banner>}
      <InfoList compact items={[
        ['Farmer', selected.farmerName], ['Farmer code', selected.farmerCode || '—'], ['Package', selected.packageTitle],
        ['Amount settled', formatNaira(selected.amount)], ['Date settled', selected.date ? formatDate(selected.date) : '—'],
        ['Status', <StatusPill key="status">{label(selected.status)}</StatusPill>], ['Recorded by', selected.recordedBy || '—'], ['Transaction reference', selected.reference],
        ...(selected.pkg?.expected_return_percentage != null ? [['Expected return', `${selected.pkg.expected_return_percentage}%`]] : []),
      ]} />
      <div className="row-wrap"><SelectField label="Update status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} options={SETTLEMENT_STATUSES.map((value) => ({ value, label: label(value) }))} /><Button onClick={updateStatus} disabled={savingStatus || nextStatus === selected.status}>{savingStatus ? 'Saving…' : 'Save status'}</Button></div>
      <section className="stack-sm">
        <h3 className="card__title">Report settlement return</h3>
        <TextAreaField label="Note" value={returnNote} onChange={(event) => setReturnNote(event.target.value)} rows={3} placeholder="Optional note about the settlement return" />
        <div><Button variant="outline" onClick={reportReturn} disabled={reportingReturn || selected.status === 'SETTLED'}>{reportingReturn ? 'Reporting…' : 'Report settlement return'}</Button></div>
      </section>
    </div>}
  </Modal>;

  return <div className="page coopc-page">
    <PageHeader title="Settlements" subtitle="Track settlement records and expected returns across your funded packages." />
    {metricsError && <Banner tone="warn" title="Settlement metrics unavailable">{metricsError}</Banner>}
    <KpiStrip cells={[
      { icon: <Landmark size={18} />, label: 'Total Settled', value: metrics ? formatNaira(number(metrics.total_settled)) : '—', sub: `${Number(metrics?.total_settled_growth_pct) || 0}% growth` },
      { icon: <Hourglass size={18} />, label: 'Pending Settlement', value: metrics ? formatNaira(number(metrics.pending_settlement_amount)) : '—', sub: `${Number(metrics?.pending_settlement_count) || 0} pending settlements` },
      { icon: <CalendarDays size={18} />, label: 'This Month', value: metrics ? formatNaira(number(metrics.this_month_amount)) : '—', sub: `${Number(metrics?.this_month_growth_pct) || 0}% growth this month` },
      { icon: <Files size={18} />, label: 'Total Number of Settlements', value: metrics ? number(metrics.total_settlements_count) : '—', sub: 'All recorded settlements' },
    ]} />
    <div className="stack">
      <section className="stack-sm"><h2>Settlement records</h2>
        {listError ? <EmptyState title="Settlements unavailable" action={<Button onClick={() => setReloadKey((key) => key + 1)}>Try again</Button>}>{listError}</EmptyState> : <div className="coopb-inv-table">
          <div className="table-toolbar"><div className="row-wrap grow"><SearchInput value={search} onChange={setSearch} placeholder="Search farmer, package or reference" /></div><div className="table-toolbar__filters">
            <FilterSelect value={packageType} onChange={(value) => { setPackageType(value); setPage(1); }} allLabel="All Categories" options={PACKAGE_CATEGORIES.map((value) => ({ value, label: label(value) }))} />
            <FilterSelect value={status} onChange={(value) => { setStatus(value); setPage(1); }} allLabel="All Status" options={SETTLEMENT_STATUSES.map((value) => ({ value, label: label(value) }))} />
            {(search || packageType || status) && <Button variant="outline" size="sm" onClick={resetFilters}>Clear</Button>}
          </div></div>
          <DataTable columns={settlementColumns} rows={rows} loading={listLoading} hideFooter bare pageSize={PAGE_SIZE} emptyTitle="No settlements yet" emptyText="Settlement records will appear here." onRowClick={openDetail} />
          {!listLoading && total > 0 && <div className="pagination-bar"><span className="muted">Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)} of {total} settlements</span><Pagination page={page} pages={pages} onPage={setPage} /></div>}
        </div>}
      </section>
    </div>
    {selectedDetail}
  </div>;
}
