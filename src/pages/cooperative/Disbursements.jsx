import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Banknote, Clock3, CalendarDays, Files, Eye, Copy, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { PageHeader, KpiStrip, DataTable, Avatar, Button, EmptyState, Modal, InfoList, StatusPill, Banner, Pagination, SearchInput, FilterSelect, SelectField } from '../../components/ui/index.js';
import RowMenu from '../../components/coopc/RowMenu.jsx';
import { formatNaira, formatDate } from '../../utils/format.js';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';
import '../../styles/pages/coopc.css';
import '../../styles/pages/coopb.css';

const PAGE_SIZE = 10;
const STATUSES = ['PENDING', 'REVIEWING', 'DISBURSED', 'REJECTED', 'COMPLETED', 'FAILED'];
const PACKAGE_TYPES = ['CROP_FARMING', 'FISHERY', 'MIXED_FARMING', 'LIVESTOCK', 'POULTRY', 'CUSTOM'];
const label = (value) => String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const amount = (value) => Number(value) || 0;

function mapDisbursement(item = {}) {
  const farmer = item.farmer || {};
  const pkg = item.package || {};
  return {
    ...item,
    id: item.id,
    farmer,
    pkg,
    recipientName: farmer.full_name || item.farmer_name || item.recipient_name || 'Farmer',
    farmerCode: farmer.farmer_code || item.farmer_code || '',
    farmerId: farmer.id || item.farmer_id || '',
    avatar: farmer.avatar_url || item.farmer_avatar || '',
    packageId: pkg.id || item.package_id || '',
    pkgName: pkg.title || item.package_title || 'Package',
    pkgCategory: pkg.category || item.package_category || item.package_type || '—',
    tranche: pkg.current_tranche || item.current_tranche || '—',
    amount: amount(item.amount),
    date: item.disbursement_date || item.date || '',
    ref: item.transaction_reference || item.reference || '—',
    status: String(item.status || 'PENDING').toUpperCase(),
    recordedBy: item.recorded_by_name || '',
  };
}

export default function Disbursements() {
  const { accessToken, toast } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState('');
  const [items, setItems] = useState([]);
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
  const [reloadKey, setReloadKey] = useState(0);
  const detailId = searchParams.get('view');
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); setSearchQuery(search.trim()); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setMetricsError('');
      if (!accessToken) { setMetricsError('Your session has expired. Sign in again to view disbursements.'); return; }
      try {
        const response = await fetch(`${API_BASE_URL}/disbursements/metrics`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not load disbursement metrics (${response.status}).`));
        setMetrics(payload || {});
      } catch (error) { if (error.name !== 'AbortError') setMetricsError(error.message || 'Could not load disbursement metrics.'); }
    };
    load();
    return () => controller.abort();
  }, [accessToken, reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setListLoading(true); setListError('');
      if (!accessToken) { setListError('Your session has expired. Sign in again to view disbursements.'); setListLoading(false); return; }
      const query = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (searchQuery) query.set('search', searchQuery);
      if (packageType) query.set('package_type', packageType);
      if (status) query.set('status', status);
      try {
        const response = await fetch(`${API_BASE_URL}/disbursements?${query}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not load disbursements (${response.status}).`));
        setItems((Array.isArray(payload?.items) ? payload.items : []).map(mapDisbursement));
        setTotal(Number(payload?.total) || 0);
      } catch (error) { if (error.name !== 'AbortError') { setItems([]); setTotal(0); setListError(error.message || 'Could not load disbursements.'); } }
      finally { if (!controller.signal.aborted) setListLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [accessToken, page, searchQuery, packageType, status, reloadKey]);

  useEffect(() => {
    if (!detailId) { setSelected(null); setDetailError(''); return undefined; }
    const controller = new AbortController();
    const load = async () => {
      setDetailLoading(true); setDetailError('');
      if (!accessToken) { setDetailError('Your session has expired. Sign in again to view this disbursement.'); setDetailLoading(false); return; }
      try {
        const response = await fetch(`${API_BASE_URL}/disbursements/${encodeURIComponent(detailId)}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not load disbursement details (${response.status}).`));
        setSelected(mapDisbursement(payload));
        setNextStatus(String(payload?.status || 'PENDING').toUpperCase());
      } catch (error) { if (error.name !== 'AbortError') setDetailError(error.message || 'Could not load disbursement details.'); }
      finally { if (!controller.signal.aborted) setDetailLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [accessToken, detailId]);

  const openDetail = (row) => setSearchParams((current) => { const next = new URLSearchParams(current); next.set('view', row.id); return next; });
  const closeDetail = () => setSearchParams((current) => { const next = new URLSearchParams(current); next.delete('view'); return next; });
  const copyRef = async (ref) => {
    try { await navigator.clipboard.writeText(ref); toast(`Reference ${ref} copied`, 'info'); }
    catch { toast(`Could not copy it automatically. The reference is ${ref}`, 'info'); }
  };
  const updateStatus = async () => {
    if (!selected || savingStatus) return;
    setSavingStatus(true); setDetailError('');
    try {
      if (!accessToken) throw new Error('Your session has expired. Sign in again to update this disbursement.');
      const response = await fetch(`${API_BASE_URL}/disbursements/${encodeURIComponent(selected.id)}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not update disbursement status (${response.status}).`));
      setSelected((current) => current ? { ...current, status: nextStatus } : current);
      setItems((current) => current.map((row) => row.id === selected.id ? { ...row, status: nextStatus } : row));
      setReloadKey((key) => key + 1);
      toast('Disbursement status updated', 'success');
    } catch (error) { setDetailError(error.message || 'Could not update disbursement status.'); }
    finally { setSavingStatus(false); }
  };
  const resetFilters = () => { setSearch(''); setSearchQuery(''); setPackageType(''); setStatus(''); setPage(1); };

  const columns = useMemo(() => [
    { key: 'recipientName', header: 'Farmers', render: (row) => <div className="cell-person"><Avatar name={row.recipientName} src={row.avatar} /><div><div className="strong">{row.recipientName}</div><div className="cell-sub">{row.farmerCode || 'Farmer'}</div></div></div> },
    { key: 'pkgName', header: 'Package', render: (row) => <span className="strong">{row.pkgName}</span> },
    { key: 'amount', header: 'Amount disbursed', render: (row) => formatNaira(row.amount) },
    { key: 'date', header: 'Disbursement date', className: 'nowrap', render: (row) => row.date ? formatDate(row.date) : '—' },
    { key: 'pkgCategory', header: 'Package category', render: (row) => label(row.pkgCategory) },
    { key: 'tranche', header: 'Current tranche', render: (row) => label(row.tranche) },
    { key: 'status', header: 'Status', render: (row) => <StatusPill>{label(row.status)}</StatusPill> },
    { key: 'actions', header: 'Action', render: (row) => <div className="row" style={{ gap: 4 }}><Button variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); openDetail(row); }}>View</Button><RowMenu label={`Actions for ${row.recipientName}`} items={[{ label: 'View details', icon: <Eye size={16} />, onClick: () => openDetail(row) }, ...(row.packageId ? [{ label: 'Open funding package', icon: <ExternalLink size={16} />, onClick: () => navigate(`/coop/funding/${row.packageId}`) }] : []), ...(row.ref !== '—' ? [{ label: 'Copy reference', icon: <Copy size={16} />, onClick: () => copyRef(row.ref) }] : [])]} /></div> },
  ], [navigate]);

  const trancheItems = Array.isArray(selected?.pkg?.tranches) ? selected.pkg.tranches : Array.isArray(selected?.tranches) ? selected.tranches : [];
  const currentTranche = selected?.pkg?.current_tranche ?? selected?.current_tranche;
  const isCurrentTranche = (tranche, index) => {
    if (tranche?.is_current === true || tranche?.current === true) return true;
    const statusValue = String(tranche?.status || '').toUpperCase();
    if (['CURRENT', 'IN_PROGRESS', 'ACTIVE'].includes(statusValue)) return true;
    if (currentTranche == null || currentTranche === '') return false;
    const token = typeof currentTranche === 'object'
      ? currentTranche.id ?? currentTranche.name ?? currentTranche.number ?? currentTranche.tranche_number
      : currentTranche;
    return [tranche?.id, tranche?.name, tranche?.number, tranche?.tranche_number, index + 1]
      .some((value) => value != null && String(value).toLowerCase() === String(token).toLowerCase());
  };

  const detail = selected && <Modal open onClose={closeDetail} title="Disbursement details" wide white footer={<Button variant="outline" onClick={closeDetail}>Close</Button>}>
    {detailLoading ? <p className="muted">Loading disbursement details…</p> : <div className="stack">
      {detailError && <Banner tone="warn" title="Disbursement request failed">{detailError}</Banner>}
      <InfoList compact items={[
        ['Reference', selected.ref], ['Farmer', selected.recipientName], ['Farmer code', selected.farmerCode || '—'],
        ['Package', selected.pkgName], ['Status', <StatusPill key="status">{label(selected.status)}</StatusPill>],
        ['Disbursement amount', formatNaira(selected.amount)], ['Disbursement date', selected.date ? formatDate(selected.date) : '—'],
        ['Package category', label(selected.pkgCategory)], ['Recorded by', selected.recordedBy || '—'],
      ]} />
      <div className="row-wrap">
        <SelectField label="Disbursement status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} options={STATUSES.map((value) => ({ value, label: label(value) }))} />
        <Button onClick={updateStatus} disabled={savingStatus || nextStatus === selected.status}>{savingStatus ? 'Saving…' : 'Save status'}</Button>
      </div>
      <section className="stack-sm" aria-label="Package tranches">
        <h3 className="card__title">Package tranches</h3>
        {trancheItems.length ? <div className="coopb-six">
          {trancheItems.map((tranche, index) => {
            const current = isCurrentTranche(tranche, index);
            const trancheNumber = tranche.number ?? tranche.tranche_number ?? index + 1;
            const trancheName = tranche.name || tranche.title || `Tranche ${trancheNumber}`;
            const trancheAmount = amount(tranche.amount ?? tranche.amount_to_release ?? tranche.release_amount);
            return <div key={tranche.id || trancheNumber} className={`coopb-six__row${current ? ' coopb-six__row--key' : ''}`}>
              <span className="coopb-six__no">{trancheNumber}</span>
              <div><div className="strong small">T{trancheNumber} {trancheName}</div><div className="caption muted">{current ? 'Current tranche' : label(tranche.status || 'Not current')}</div></div>
              <div className="coopb-six__val">{formatNaira(trancheAmount)}</div>
            </div>;
          })}
        </div> : <p className="muted small">No tranche details are available for this package.</p>}
      </section>
      <div className="stack">
        <div className="row">{selected.farmerId && <Button variant="outline" onClick={() => navigate(`/coop/farmers/${selected.farmerId}`)}>Open farmer</Button>}
          {selected.packageId && <Button variant="outline" onClick={() => navigate(`/coop/funding/${selected.packageId}`)}>View package</Button>}
        </div>
      </div>
    </div>}
  </Modal>;

  return <div className="page coopc-page">
    <PageHeader title="Disbursements" subtitle="Track funds released from your funded packages to farmers, suppliers and the cooperative." />
    {metricsError && <Banner tone="warn" title="Disbursement metrics unavailable">{metricsError}</Banner>}
    <KpiStrip cells={[
      { icon: <Banknote size={18} />, label: 'Total Disbursed', value: metrics ? formatNaira(amount(metrics.total_disbursed)) : '—', sub: `${Number(metrics?.total_disbursed_growth_pct) || 0}% growth` },
      { icon: <Clock3 size={18} />, label: 'Pending Disbursement', value: metrics ? formatNaira(amount(metrics.pending_disbursement_amount)) : '—', sub: `${Number(metrics?.pending_disbursement_count) || 0} awaiting processing` },
      { icon: <CalendarDays size={18} />, label: 'This Month Disbursement', value: metrics ? formatNaira(amount(metrics.this_month_amount)) : '—', sub: `${Number(metrics?.this_month_growth_pct) || 0}% growth this month` },
      { icon: <Files size={18} />, label: 'Total Number of Disbursements', value: metrics ? amount(metrics.total_disbursements_count) : '—', sub: 'All recorded disbursements' },
    ]} />
    {listError ? <EmptyState title="Disbursements unavailable" action={<Button onClick={() => setReloadKey((key) => key + 1)}>Try again</Button>}>{listError}</EmptyState> : <div className="coopb-inv-table">
      <div className="table-toolbar"><div className="row-wrap grow"><SearchInput value={search} onChange={setSearch} placeholder="Search farmer, package or transaction reference" /></div>
        <div className="table-toolbar__filters"><FilterSelect value={packageType} onChange={(value) => { setPackageType(value); setPage(1); }} allLabel="All Package Types" options={PACKAGE_TYPES.map((value) => ({ value, label: label(value) }))} />
          <FilterSelect value={status} onChange={(value) => { setStatus(value); setPage(1); }} allLabel="All Status" options={STATUSES.map((value) => ({ value, label: label(value) }))} />
          {(search || packageType || status) && <Button variant="outline" size="sm" onClick={resetFilters}>Clear</Button>}
        </div>
      </div>
      <DataTable columns={columns} rows={items} loading={listLoading} hideFooter bare pageSize={PAGE_SIZE} emptyTitle="No disbursements yet" emptyText="Recorded disbursements will appear here." onRowClick={openDetail} />
      {!listLoading && total > 0 && <div className="pagination-bar"><span className="muted">Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)} of {total} disbursements</span><Pagination page={page} pages={pages} onPage={setPage} /></div>}
    </div>}
    {detail}
  </div>;
}
