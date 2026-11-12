import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, Download, Eye, Pencil, Plus, ShieldCheck, Trash2, UserX, Users } from 'lucide-react';
import {
  Avatar, Button, Card, DataTable, EmptyState, FilterSelect, KebabMenu, KpiStrip, LinkButton, PageHeader, PageSkeleton, Pagination, SearchInput, StatusPill,
} from '../../components/ui/index.js';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate, formatTime } from '../../utils/format.js';
import { RemoveFarmerModal } from '../../components/coopa/RemoveFarmerModal.jsx';
import { downloadCsv, maskNin, toCsv } from '../../components/coopa/helpers.js';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';
import '../../styles/pages/coopa.css';

const PAGE_SIZE = 10;

export default function FarmerDirectory() {
  const { toast, accessToken, data, add } = useApp();
  const [farmers, setFarmers] = useState([]);
  const [metrics, setMetrics] = useState({ total_farmers: 0, verified_farmers: 0, pending_verification: 0, removed_farmers: 0 });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState('');
  const [sp, setSp] = useSearchParams();
  const [removing, setRemoving] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const q = sp.get('q') || '';
  const crop = sp.get('crop') || '';
  const status = sp.get('status') || '';
  const page = Math.max(1, Number(sp.get('page')) || 1);

  const setParam = (key, value) => setSp((prev) => {
    const next = new URLSearchParams(prev);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    return next;
  }, { replace: true });

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setRequestError('');
      if (!accessToken) { setRequestError('Your session has expired. Sign in again to view farmers.'); setLoading(false); return; }
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (q.trim()) params.set('search', q.trim());
      if (crop) params.set('crop_type', crop);
      if (status) params.set('status', status);
      try {
        const response = await fetch(`${API_BASE_URL}/farmers/directory?${params}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not load farmers (${response.status}).`));
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const mapped = items.map((f) => ({ ...f, name: f.full_name || [f.first_name, f.last_name].filter(Boolean).join(' ') || f.name || 'Unnamed farmer', firstName: f.first_name, lastName: f.last_name, dob: f.date_of_birth, experienceYears: f.years_of_experience, consent: f.terms_accepted ?? f.consent, gender: f.gender === 'FEMALE' ? 'Female' : f.gender === 'MALE' ? 'Male' : f.gender || '', bankName: f.bank_name || '', accountNumber: f.account_number || '', cropType: f.farming_category || f.crop_type || f.cropType || '-', farmingCategory: f.farming_category || f.crop_type || '', phone: f.phone_number || f.phone || '-', status: normaliseStatus(f.verification_status || f.status), dateAdded: f.date_added || f.created_at || f.dateAdded || '', farmIds: f.farms?.map((farm) => farm.id) || f.farmIds || [], farmCount: Array.isArray(f.farms) ? f.farms.length : Number.isFinite(Number(f.farm_count ?? f.farmCount)) ? Number(f.farm_count ?? f.farmCount) : null, nin: f.nin || '', id: f.id, coopId: f.cooperative_id || f.coopId }));
        const farmersWithCounts = await Promise.all(mapped.map(async (farmer) => {
          if (farmer.farmCount != null || !farmer.id) return farmer;
          try {
            const farmsResponse = await fetch(`${API_BASE_URL}/farmers/${encodeURIComponent(farmer.id)}/farms`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal });
            if (!farmsResponse.ok) return { ...farmer, farmCount: 0 };
            const farmList = await farmsResponse.json().catch(() => []);
            const farmIds = Array.isArray(farmList) ? farmList.map((farm) => farm.id).filter(Boolean) : [];
            return { ...farmer, farmCount: Array.isArray(farmList) ? farmList.length : 0, farmIds };
          } catch (error) { if (error.name === 'AbortError') throw error; return { ...farmer, farmCount: 0 }; }
        }));
        if (controller.signal.aborted) return;
        const mappedWithCounts = farmersWithCounts;
        mappedWithCounts.forEach((f) => { if (f.id && !data.farmers.some((existing) => existing.id === f.id)) add('farmers', f); });
        setFarmers(mappedWithCounts);
        setMetrics(payload?.metrics || { total_farmers: 0, verified_farmers: 0, pending_verification: 0, removed_farmers: 0 });
        setTotal(Number(payload?.total) || 0); setTotalPages(Math.max(1, Number(payload?.total_pages) || 1));
      } catch (error) {
        if (error.name !== 'AbortError') { setFarmers([]); setTotal(0); setTotalPages(1); setRequestError(error.message || 'Could not load farmers.'); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [accessToken, q, crop, status, page, reloadKey, data.farmers, add]);

  const counts = { total: metrics.total_farmers || 0, verified: metrics.verified_farmers || 0, pending: metrics.pending_verification || 0, removed: metrics.removed_farmers || 0 };
  const crops = ['crop_farming', 'fishery', 'mixed_farming', 'poultry', 'livestock', 'others'];
  const rows = farmers;
  const current = Math.min(page, totalPages);
  const from = total ? (current - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(current * PAGE_SIZE, total);
  const filtersOn = Boolean(q || crop || status);

  const exportCsv = () => {
    const header = ['Name', 'Crop type', 'Number of farms', 'Phone', 'NIN (last 4 digits)', 'Status', 'Date added'];
    const body = farmers.map((f) => [f.name, f.cropType, f.farmCount ?? (Array.isArray(f.farmIds) ? f.farmIds.length : f.farmId ? 1 : 0), f.phone, maskNin(f.nin).slice(-4), f.status, String(f.dateAdded).slice(0, 10)]);
    downloadCsv('farmers.csv', toCsv([header, ...body]));
    toast(`Exported ${farmers.length} farmers on this page to farmers.csv.`, 'success');
  };

  if (loading) return <PageSkeleton />;

  const columns = [
    { key: 'name', header: 'Farmer', render: (f) => <div className="cell-person"><Avatar name={f.name} /><Link to={`/coop/farmers/${f.id}`} className="coopa-name">{f.name}</Link></div> },
    { key: 'cropType', header: 'Crop type' },
    { key: 'farmCount', header: 'Number of farms', render: (f) => <span className="nowrap">{f.farmCount ?? (Array.isArray(f.farmIds) ? f.farmIds.length : f.farmId ? 1 : 0)}</span> },
    { key: 'phone', header: 'Phone number', render: (f) => <span className="nowrap">{f.phone}</span> },
    { key: 'status', header: 'Status', render: (f) => <StatusPill>{f.status}</StatusPill> },
    { key: 'dateAdded', header: 'Date added', render: (f) => <div className="nowrap">{formatDate(f.dateAdded)}<div className="cell-sub">{formatTime(f.dateAdded)}</div></div> },
    {
      key: 'actions',
      header: 'Actions',
      render: (f) => (
        <div className="row" style={{ gap: 4 }}>
          <LinkButton to={`/coop/farmers/${f.id}`} variant="outline-green" size="sm">View</LinkButton>
          <KebabMenu
            label={`Actions for ${f.name}`}
            items={f.status === 'Removed'
              ? [{ label: 'View', icon: <Eye size={16} />, to: `/coop/farmers/${f.id}` }]
              : [
                { label: 'View', icon: <Eye size={16} />, to: `/coop/farmers/${f.id}` },
                { label: 'Edit', icon: <Pencil size={16} />, to: `/coop/farmers/${f.id}/edit` },
                { label: 'Remove', icon: <Trash2 size={16} />, danger: true, onClick: () => setRemoving(f) },
              ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="page coopa coopa-dir">
      <PageHeader
        title="Farmers"
        subtitle="Manage all farmers in your cooperative."
        actions={(
          <>
            <Button variant="outline" onClick={exportCsv} disabled={farmers.length === 0}><Download size={18} />Export</Button>
            <LinkButton to="/coop/farmers/new"><Plus size={18} />Add Farmer</LinkButton>
          </>
        )}
      />

      <KpiStrip
        cells={[
          { icon: <Users size={18} />, label: 'Total Farmers', value: counts.total, sub: 'Not including removed farmers' },
          { icon: <ShieldCheck size={18} />, label: 'Verified Farmers', value: counts.verified, sub: 'Identity checked by CollabFarm' },
          { icon: <Clock size={18} />, label: 'Pending Verification', value: counts.pending, sub: 'Waiting for an identity check' },
          { icon: <UserX size={18} />, label: 'Removed Farmers', value: counts.removed, sub: 'Records are kept, not deleted' },
        ]}
      />

      {requestError ? <Card><EmptyState title="Could not load farmers" action={<Button variant="outline" onClick={() => setReloadKey((n) => n + 1)}>Retry</Button>}>{requestError}</EmptyState></Card> : total === 0 ? (
        <Card>
          <EmptyState
            icon={<Users size={28} />}
            title="No farmers yet"
            action={(
              <div className="row-wrap" style={{ justifyContent: 'center' }}>
                <LinkButton to="/coop/farmers/new"><Plus size={18} />Add your first farmer</LinkButton>
              </div>
            )}
          >
            Add farmers one at a time, or upload a CSV file to add many at once. Each farmer is checked before they can join a funded project.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="table-card">
            <div className="table-toolbar">
              <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search by name, NIN, phone or crop type..." />
              <div className="table-toolbar__filters">
                <FilterSelect value={crop} onChange={(v) => setParam('crop', v)} allLabel="All Crop Types" options={crops} />
              <FilterSelect value={status} onChange={(v) => setParam('status', v)} allLabel="All Status" options={['Verified', 'Pending', 'Not_Verified']} />
              </div>
            </div>
            {total === 0 ? (
              <EmptyState
                title="No farmers match your search"
                action={<Button variant="outline" onClick={() => setSp({}, { replace: true })}>Clear search and filters</Button>}
              >
                Check the spelling, or search by a different name, NIN, phone number or crop.
              </EmptyState>
            ) : (
              <DataTable bare hideFooter pageSize={100} rows={rows} columns={columns} />
            )}
          </div>
          {total > 0 && (
            <div className="pagination-bar">
              <span className="muted">Showing {from} - {to} of {total} farmers{filtersOn ? ' (filtered)' : ''}</span>
              <Pagination page={current} pages={totalPages} onPage={(n) => setParam('page', n > 1 ? String(n) : '')} />
            </div>
          )}
        </>
      )}

      <RemoveFarmerModal open={Boolean(removing)} farmer={removing} onClose={() => setRemoving(null)} onRemoved={() => setReloadKey((n) => n + 1)} />
    </div>
  );
}

function normaliseStatus(value) {
  const status = String(value || '').toLowerCase();
  if (status === 'verified' || status === 'approved') return 'Verified';
  if (status === 'removed' || status === 'inactive') return 'Removed';
  return 'Pending';
}
