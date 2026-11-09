import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Map, Plus, Sprout, Tractor } from 'lucide-react';
import {
  Button, Card, DataTable, EmptyState, KpiStrip, LinkButton, PageHeader, PageSkeleton, StatusPill,
} from '../../components/ui/index.js';
import { useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatDateShort } from '../../utils/format.js';
import { AddFarmModal } from '../../components/coopa/AddFarmModal.jsx';
import { UnverifiedBanner } from '../../components/coopa/Bits.jsx';
import { fmtHa, useCoop } from '../../components/coopa/helpers.js';
import '../../styles/pages/coopa.css';

export default function Farms() {
  const { coop, farmers, farms } = useCoop();
  const loading = useSimulatedLoad(350);
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const stats = useMemo(() => ({
    total: farms.length,
    active: farms.filter((f) => f.status === 'Active').length,
    area: farms.reduce((s, f) => s + (Number(f.areaHa) || 0), 0),
    verified: farms.filter((f) => f.landAccess === 'Verified').length,
  }), [farms]);

  const farmerCount = useMemo(() => {
    const map = {};
    farmers.filter((f) => f.status !== 'Removed' && f.farmId).forEach((f) => { map[f.farmId] = (map[f.farmId] || 0) + 1; });
    return map;
  }, [farmers]);

  const rows = useMemo(() => farms.map((f) => ({ ...f, farmerTotal: farmerCount[f.id] || 0 })), [farms, farmerCount]);
  const crops = useMemo(() => [...new Set(farms.map((f) => f.crop).filter(Boolean))].sort(), [farms]);

  if (loading) return <PageSkeleton />;
  if (!coop) return <div className="page"><EmptyState title="We could not find your cooperative record" action={<LinkButton to="/coop" variant="outline">Back to dashboard</LinkButton>}>Sign in again with a cooperative account.</EmptyState></div>;

  return (
    <div className="page coopa">
      <PageHeader
        title="Farms and Plots"
        subtitle="Manage the land your cooperative farms on, with its documents and inspections."
        actions={<Button onClick={() => setAdding(true)}><Plus size={18} />Add farm</Button>}
      />
      <UnverifiedBanner coop={coop}>You can register farms now. Funding requests unlock once your cooperative is verified.</UnverifiedBanner>

      <KpiStrip
        cells={[
          { icon: <Sprout size={18} />, label: 'Total Farms', value: stats.total, sub: 'Registered by your cooperative' },
          { icon: <Tractor size={18} />, label: 'Active Farms', value: stats.active, sub: 'Can be used in new funding requests' },
          { icon: <Map size={18} />, label: 'Total Area', value: fmtHa(stats.area), sub: 'Approximate, from your records' },
          { icon: <CheckCircle2 size={18} />, label: 'Land Access Verified', value: `${stats.verified} of ${stats.total}`, sub: 'Checked by a CollabFarm reviewer' },
        ]}
      />

      {farms.length === 0 ? (
        <Card>
          <EmptyState icon={<Sprout size={28} />} title="No farms registered yet" action={<Button onClick={() => setAdding(true)}><Plus size={18} />Add your first farm</Button>}>
            Registering a farm is optional when you sign up, but funding requests need at least one farm. Add where your farmers grow, then upload land-access documents so a reviewer can verify them.
          </EmptyState>
        </Card>
      ) : (
        <DataTable
          rows={rows}
          pageSize={10}
          totalLabel="farms"
          searchKeys={['name', 'location', 'crop']}
          searchPlaceholder="Search by farm name, location or crop..."
          filters={[
            { key: 'status', allLabel: 'All Status', options: ['Active', 'Inactive'] },
            { key: 'crop', allLabel: 'All Crops', options: crops },
            { key: 'landAccess', allLabel: 'All Land Access', options: [{ value: 'Verified', label: 'Land access verified' }, { value: 'Uploaded', label: 'Uploaded, awaiting review' }, { value: 'Pending', label: 'No evidence yet' }] },
          ]}
          columns={[
            { key: 'name', header: 'Farm', render: (f) => <div><Link to={`/coop/farms/${f.id}`} className="coopa-name">{f.name}</Link><div className="cell-sub">{f.location}</div></div> },
            { key: 'areaHa', header: 'Area', sortable: true, render: (f) => <span className="nowrap">{f.areaHa} ha</span> },
            { key: 'crop', header: 'Crop', sortable: true },
            { key: 'season', header: 'Season', render: (f) => <span className="nowrap">{f.season}</span> },
            { key: 'landAccess', header: 'Land access', render: (f) => <div><div className="cell-sub" style={{ marginBottom: 4 }}>{f.landAccessType || f.documents?.[0] || 'Not stated'}</div><StatusPill tone={f.landAccess === 'Verified' ? 'green' : f.landAccess === 'Uploaded' ? 'amber' : 'gray'}>{f.landAccess === 'Verified' ? 'Verified' : f.landAccess === 'Uploaded' ? 'Uploaded' : 'No evidence yet'}</StatusPill></div> },
            { key: 'farmerTotal', header: 'Farmers', sortable: true, render: (f) => f.farmerTotal },
            { key: 'status', header: 'Status', render: (f) => <StatusPill>{f.status}</StatusPill> },
            { key: 'lastInspection', header: 'Last inspection', sortable: true, sortValue: (f) => f.lastInspection || '', render: (f) => (f.lastInspection ? <span className="nowrap">{formatDateShort(f.lastInspection)}</span> : <span className="muted">None yet</span>) },
            { key: 'actions', header: 'Actions', render: (f) => <LinkButton to={`/coop/farms/${f.id}`} variant="outline-green" size="sm">View</LinkButton> },
          ]}
          emptyTitle="No farms yet"
        />
      )}

      <AddFarmModal open={adding} onClose={() => setAdding(false)} coop={coop} farms={farms} onAdded={(farm) => navigate(`/coop/farms/${farm.id}`)} />
    </div>
  );
}
