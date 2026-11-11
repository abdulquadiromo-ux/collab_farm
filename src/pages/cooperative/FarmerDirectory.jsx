import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, Download, Eye, Pencil, Plus, ShieldCheck, Trash2, Upload, UserX, Users } from 'lucide-react';
import {
  Avatar, Button, Card, DataTable, EmptyState, FilterSelect, KebabMenu, KpiStrip, LinkButton, PageHeader, PageSkeleton, Pagination, SearchInput, StatusPill,
} from '../../components/ui/index.js';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatDate, formatTime } from '../../utils/format.js';
import { UnverifiedBanner } from '../../components/coopa/Bits.jsx';
import { BulkUploadModal } from '../../components/coopa/BulkUploadModal.jsx';
import { RemoveFarmerModal } from '../../components/coopa/RemoveFarmerModal.jsx';
import { downloadCsv, maskNin, toCsv, useCoop } from '../../components/coopa/helpers.js';
import '../../styles/pages/coopa.css';

const PAGE_SIZE = 10;

export default function FarmerDirectory() {
  const { toast } = useApp();
  const { coop, farmers, verified } = useCoop();
  const loading = useSimulatedLoad(350);
  const [sp, setSp] = useSearchParams();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [removing, setRemoving] = useState(null);

  const q = sp.get('q') || '';
  const crop = sp.get('crop') || '';
  const status = sp.get('status') || '';
  const sort = sp.get('sort') || '';
  const page = Math.max(1, Number(sp.get('page')) || 1);

  const setParam = (key, value) => setSp((prev) => {
    const next = new URLSearchParams(prev);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    return next;
  }, { replace: true });

  const counts = useMemo(() => {
    const verifiedN = farmers.filter((f) => f.status === 'Verified').length;
    const pendingN = farmers.filter((f) => f.status === 'Pending').length;
    const removedN = farmers.filter((f) => f.status === 'Removed').length;
    return { total: farmers.length - removedN, verified: verifiedN, pending: pendingN, removed: removedN };
  }, [farmers]);

  const crops = useMemo(() => [...new Set(farmers.map((f) => f.cropType).filter(Boolean))].sort(), [farmers]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digitsOnly = /^[\d\s+()-]+$/.test(needle);
    const digits = needle.replace(/\D/g, '');
    const out = farmers.filter((f) => {
      if (crop && f.cropType !== crop) return false;
      if (status && f.status !== status) return false;
      if (!needle) return true;
      if (digitsOnly && digits) return f.nin.includes(digits) || String(f.phone).replace(/\D/g, '').includes(digits);
      return f.name.toLowerCase().includes(needle) || String(f.cropType || '').toLowerCase().includes(needle);
    });
    const by = {
      oldest: (a, b) => new Date(a.dateAdded) - new Date(b.dateAdded),
      name: (a, b) => a.name.localeCompare(b.name),
    }[sort] || ((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    return [...out].sort(by);
  }, [farmers, q, crop, status, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const from = filtered.length ? (current - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(current * PAGE_SIZE, filtered.length);
  const filtersOn = Boolean(q || crop || status || sort);

  const exportCsv = () => {
    const header = ['Name', 'Crop type', 'Number of farms', 'Phone', 'NIN (last 4 digits)', 'Status', 'Date added'];
    const body = filtered.map((f) => [f.name, f.cropType, Array.isArray(f.farmIds) ? f.farmIds.length : f.farmId ? 1 : 0, f.phone, maskNin(f.nin).slice(-4), f.status, String(f.dateAdded).slice(0, 10)]);
    downloadCsv('farmers.csv', toCsv([header, ...body]));
    toast(`Exported ${filtered.length} ${filtered.length === 1 ? 'farmer' : 'farmers'} to farmers.csv.`, 'success');
  };

  if (loading) return <PageSkeleton />;
  if (!coop) {
    return <div className="page"><EmptyState title="We could not find your cooperative record" action={<LinkButton to="/coop" variant="outline">Back to dashboard</LinkButton>}>Sign in again with a cooperative account.</EmptyState></div>;
  }

  const columns = [
    { key: 'name', header: 'Farmer', render: (f) => <div className="cell-person"><Avatar name={f.name} /><Link to={`/coop/farmers/${f.id}`} className="coopa-name">{f.name}</Link></div> },
    { key: 'cropType', header: 'Crop type' },
    { key: 'farmCount', header: 'Number of farms', render: (f) => <span className="nowrap">{Array.isArray(f.farmIds) ? f.farmIds.length : f.farmId ? 1 : 0}</span> },
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
            <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}><Download size={18} />Export</Button>
            <Button variant="outline" onClick={() => setBulkOpen(true)}><Upload size={18} />Bulk upload</Button>
            <LinkButton to="/coop/farmers/new"><Plus size={18} />Add Farmer</LinkButton>
          </>
        )}
      />

      <UnverifiedBanner coop={coop}>Farmers you add are saved as Pending. Bulk import, funding requests and disbursement requests unlock once your cooperative is verified.</UnverifiedBanner>

      <KpiStrip
        cells={[
          { icon: <Users size={18} />, label: 'Total Farmers', value: counts.total, sub: 'Not including removed farmers' },
          { icon: <ShieldCheck size={18} />, label: 'Verified Farmers', value: counts.verified, sub: 'Identity checked by CollabFarm' },
          { icon: <Clock size={18} />, label: 'Pending Verification', value: counts.pending, sub: 'Waiting for an identity check' },
          { icon: <UserX size={18} />, label: 'Removed Farmers', value: counts.removed, sub: 'Records are kept, not deleted' },
        ]}
      />

      {farmers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users size={28} />}
            title="No farmers yet"
            action={(
              <div className="row-wrap" style={{ justifyContent: 'center' }}>
                <LinkButton to="/coop/farmers/new"><Plus size={18} />Add your first farmer</LinkButton>
                <Button variant="outline" onClick={() => setBulkOpen(true)}><Upload size={18} />Bulk upload</Button>
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
                <FilterSelect value={status} onChange={(v) => setParam('status', v)} allLabel="All Status" options={['Verified', 'Pending', 'Removed']} />
                <FilterSelect value={sort} onChange={(v) => setParam('sort', v)} allLabel="Date Added (newest)" label="Sort farmers" options={[{ value: 'oldest', label: 'Date Added (oldest)' }, { value: 'name', label: 'Name (A to Z)' }]} />
              </div>
            </div>
            {filtered.length === 0 ? (
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
          {filtered.length > 0 && (
            <div className="pagination-bar">
              <span className="muted">Showing {from} - {to} of {filtered.length} {filtered.length === 1 ? 'farmer' : 'farmers'}{filtersOn ? ' (filtered)' : ''}</span>
              <Pagination page={current} pages={pages} onPage={(n) => setParam('page', n > 1 ? String(n) : '')} />
            </div>
          )}
        </>
      )}

      <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)} coop={coop} farmers={farmers} verified={verified} />
      <RemoveFarmerModal open={Boolean(removing)} farmer={removing} onClose={() => setRemoving(null)} />
    </div>
  );
}
