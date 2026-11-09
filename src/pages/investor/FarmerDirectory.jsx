import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, LayoutGrid, List, Sprout, Users } from 'lucide-react';
import { Banner, Button, Card, DataTable, EmptyState, PageHeader, PageSkeleton, Pagination, SearchInput, StatusPill } from '../../components/ui/index.js';
import { LinkButton } from '../../components/ui/Button.jsx';
import { useSimulatedLoad } from '../../context/AppContext.jsx';
import { useInvestor } from '../../components/inv/useInvestor.js';
import { InvSelect } from '../../components/inv/InvSelect.jsx';
import { UnverifiedBanner } from '../../components/inv/Common.jsx';
import { PARTICIPATION, SIZE_BANDS, farmerForInvestor, isVerifiedFarmer } from '../../components/inv/invData.js';
import '../../styles/pages/inv.css';

const PAGE_SIZE = 9;
const toOptions = (list) => [...new Set(list)].filter(Boolean).sort().map((v) => ({ value: v, label: v }));

export default function FarmerDirectory() {
  const loading = useSimulatedLoad(350);
  const navigate = useNavigate();
  const { data, investor } = useInvestor();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const crop = params.get('crop') || '';
  const region = params.get('region') || '';
  const size = params.get('size') || '';
  const coop = params.get('coop') || '';
  const part = params.get('participation') || '';
  const view = params.get('view') === 'table' ? 'table' : 'cards';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (!v || (k === 'view' && v === 'cards') || (k === 'page' && Number(v) === 1)) next.delete(k); else next.set(k, String(v));
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  // Only verified farmers, and only through the privacy preserving projection. Name, ID number, phone, email and exact address are never read.
  const farmers = useMemo(() => data.farmers.filter(isVerifiedFarmer).map((f) => farmerForInvestor(f, data)), [data]);
  const crops = useMemo(() => toOptions(farmers.map((f) => f.crop)), [farmers]);
  const regions = useMemo(() => toOptions(farmers.map((f) => f.region)), [farmers]);
  const coops = useMemo(() => toOptions(farmers.map((f) => f.cooperative)), [farmers]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return farmers.filter((f) => (!crop || f.crop === crop) && (!region || f.region === region) && (!size || f.sizeBand === size)
      && (!coop || f.cooperative === coop) && (!part || f.participation === part)
      && (!term || [f.reference, f.crop, f.region, f.cooperative, f.sizeBand].join(' ').toLowerCase().includes(term)));
  }, [farmers, q, crop, region, size, coop, part]);

  if (loading) return <PageSkeleton />;

  const hasFilter = q || crop || region || size || coop || part;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const clear = () => setParams(new URLSearchParams(view === 'table' ? { view: 'table' } : {}), { replace: true });

  const filters = (
    <>
      <InvSelect label="Crop" value={crop} onChange={(v) => setParam('crop', v)} allLabel="All Crops" options={crops} />
      <InvSelect label="Region" value={region} onChange={(v) => setParam('region', v)} allLabel="All Regions" options={regions} />
      <InvSelect label="Farm size" value={size} onChange={(v) => setParam('size', v)} allLabel="Any Size" options={SIZE_BANDS.map((v) => ({ value: v, label: v }))} />
      {coops.length > 1 && <InvSelect label="Cooperative" value={coop} onChange={(v) => setParam('coop', v)} allLabel="All Cooperatives" options={coops} />}
      <InvSelect label="Participation" value={part} onChange={(v) => setParam('participation', v)} allLabel="Any Participation" options={PARTICIPATION.map((v) => ({ value: v, label: v }))} />
    </>
  );
  const toggle = (
    <div className="inv-toggle" role="group" aria-label="Choose a layout">
      <button type="button" aria-pressed={view === 'cards'} onClick={() => setParam('view', 'cards')}><LayoutGrid size={16} />Cards</button>
      <button type="button" aria-pressed={view === 'table'} onClick={() => setParam('view', 'table')}><List size={16} />Table</button>
    </div>
  );

  const columns = [
    { key: 'ref', header: 'Farmer', render: (f) => (<><div className="strong">{f.reference}</div><div className="cell-sub">{f.cooperative}</div></>) },
    { key: 'crop', header: 'Crop', render: (f) => f.crop },
    { key: 'region', header: 'Region', render: (f) => f.region },
    { key: 'size', header: 'Farm size', render: (f) => f.sizeBand },
    { key: 'exp', header: 'Experience', render: (f) => f.experienceBand },
    { key: 'part', header: 'Participation', render: (f) => f.participation },
    { key: 'ver', header: 'Verification', render: (f) => <StatusPill>{f.verification}</StatusPill> },
    { key: 'act', header: 'Actions', render: (f) => <LinkButton to={`/investor/farmers/${f.id}`} variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>View</LinkButton> },
  ];

  return (
    <div className="page">
      <PageHeader title="Farmer Directory" subtitle="Verified farmers taking part in funding packages, shown in a privacy preserving way" />
      <UnverifiedBanner investor={investor} />

      <Card tone="tint">
        <div className="inv-privacy">
          <EyeOff size={22} aria-hidden="true" style={{ flex: 'none', color: 'var(--primary-500)', marginTop: 2 }} />
          <div>
            <div className="strong">Farmer privacy comes first</div>
            <p className="small muted" style={{ margin: '4px 0 0' }}>
              You see only verified farmers, and only broad details: crop, region, farm size band, experience band, cooperative and participation. Names, ID numbers, phone numbers, email addresses and exact farm addresses are never shown to investors. Each farmer appears under a reference number instead of a name.
            </p>
          </div>
        </div>
      </Card>

      {view === 'table' ? (
        <DataTable
          rows={rows}
          columns={columns}
          pageSize={10}
          totalLabel="farmers"
          onRowClick={(f) => navigate(`/investor/farmers/${f.id}`)}
          emptyTitle={farmers.length ? 'No farmers match your filters' : 'No verified farmers to show yet'}
          emptyText="Farmers appear here after the cooperative adds them and CollabFarm verifies them."
          emptyAction={hasFilter ? <Button variant="outline-green" onClick={clear}>Clear filters</Button> : null}
          toolbarLeft={<SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search by reference, crop or region" />}
          toolbarExtra={(<>{filters}{toggle}</>)}
        />
      ) : (
        <>
          <div className="inv-filter-bar">
            <div className="search"><SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search by reference, crop or region" /></div>
            {filters}
            <div style={{ marginLeft: 'auto' }}>{toggle}</div>
          </div>

          {rows.length === 0 ? (
            <div className="card card--pad">
              <EmptyState
                icon={<Users size={28} />}
                title={farmers.length ? 'No farmers match your filters' : 'No verified farmers to show yet'}
                action={hasFilter ? <Button variant="outline-green" onClick={clear}>Clear filters</Button> : null}
              >
                {farmers.length ? 'Try a different crop, region or search term.' : 'Farmers appear here after the cooperative adds them and CollabFarm verifies them.'}
              </EmptyState>
            </div>
          ) : (
            <>
              <div className="inv-farmer-grid">
                {shown.map((f) => (
                  <article key={f.id} className="inv-farmer-card" aria-label={f.reference}>
                    <div className="inv-farmer-card__head">
                      <span className="inv-head-card__icon" style={{ width: 44, height: 44 }}><Sprout size={22} /></span>
                      <div style={{ minWidth: 0 }}>
                        <div className="strong">{f.reference}</div>
                        <StatusPill>{f.verification}</StatusPill>
                      </div>
                    </div>
                    <dl>
                      <dt>Crop</dt><dd>{f.crop}</dd>
                      <dt>Region</dt><dd>{f.region}</dd>
                      <dt>Farm size</dt><dd>{f.sizeBand}</dd>
                      <dt>Experience</dt><dd>{f.experienceBand}</dd>
                      <dt>Cooperative</dt><dd>{f.cooperative}</dd>
                      <dt>Participation</dt><dd>{f.participation}</dd>
                    </dl>
                    <LinkButton to={`/investor/farmers/${f.id}`} variant="outline-green" block><Eye size={16} />View restricted profile</LinkButton>
                  </article>
                ))}
              </div>
              <div className="pagination-bar" style={{ marginTop: 0 }}>
                <span className="muted">Showing {(cur - 1) * PAGE_SIZE + 1} - {Math.min(cur * PAGE_SIZE, rows.length)} of {rows.length} farmers</span>
                <Pagination page={cur} pages={pages} onPage={(n) => setParam('page', n)} />
              </div>
            </>
          )}
        </>
      )}

      <Banner tone="info">Farmer details are limited on purpose. If you have a concern about a farmer or a package, use Raise a concern on the package or investment instead of looking for personal details.</Banner>
    </div>
  );
}
