import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bird, Beef, Fish, Layers, PackageSearch, SlidersHorizontal, Sprout } from 'lucide-react';
import { Button, EmptyState, PageHeader, PageSkeleton, PillTabs, Pagination, SearchInput, Banner } from '../../components/ui/index.js';
import { useSimulatedLoad } from '../../context/AppContext.jsx';
import { INVESTOR_VISIBLE, packageFunding } from '../../utils/rules.js';
import { useInvestor } from '../../components/inv/useInvestor.js';
import { InvSelect } from '../../components/inv/InvSelect.jsx';
import { PackageCard } from '../../components/inv/PackageCard.jsx';
import { UnverifiedBanner } from '../../components/inv/Common.jsx';
import { categoryList, isClosed } from '../../components/inv/invData.js';
import '../../styles/pages/inv.css';

const PAGE_SIZE = 6;
const ICONS = { 'Crop Farming': <Sprout size={20} />, Fishery: <Fish size={20} />, 'Mixed Farming': <Layers size={20} />, Livestock: <Beef size={20} />, Poultry: <Bird size={20} />, Custom: <SlidersHorizontal size={20} /> };
const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'closing', label: 'Closing soon' },
  { value: 'funded', label: 'Most funded' },
  { value: 'minimum', label: 'Lowest minimum' },
];

export default function Packages() {
  const loading = useSimulatedLoad(350);
  const { data, investor, coopById } = useInvestor();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || 'all';
  const q = params.get('q') || '';
  const sort = params.get('sort') || 'newest';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const setParam = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => { if (v === '' || v == null || v === 'all' || (k === 'sort' && v === 'newest') || (k === 'page' && v === 1)) next.delete(k); else next.set(k, String(v)); });
    setParams(next, { replace: true });
  };

  // Only approved packages are ever shown to an investor. Draft, Submitted, Under Review and Changes Requested never appear.
  const visible = useMemo(() => data.packages.filter((p) => INVESTOR_VISIBLE.includes(p.status)), [data.packages]);
  const pills = useMemo(() => {
    const cats = [...categoryList];
    if (visible.some((p) => p.category === 'Custom')) cats.push('Custom');
    return [{ id: 'all', label: 'All' }, ...cats.map((c) => ({ id: c, label: c, icon: ICONS[c] }))];
  }, [visible]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let out = visible.filter((p) => (category === 'all' ? true : p.category === category));
    if (term) out = out.filter((p) => [p.name, p.description, p.category, p.regions, coopById[p.coopId]?.name].join(' ').toLowerCase().includes(term));
    const byDate = (a, b) => String(b.createdAt).localeCompare(String(a.createdAt));
    const sorters = {
      newest: byDate,
      closing: (a, b) => {
        const open = (p) => (p.status === 'Open for Funding' && !isClosed(p) ? 0 : 1);
        return open(a) - open(b) || String(a.closingDate).localeCompare(String(b.closingDate));
      },
      funded: (a, b) => packageFunding(b).pct - packageFunding(a).pct,
      minimum: (a, b) => a.minInvestment - b.minInvestment,
    };
    return [...out].sort(sorters[sort] || byDate);
  }, [visible, category, q, sort, coopById]);

  if (loading) return <PageSkeleton />;

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const from = filtered.length ? (cur - 1) * PAGE_SIZE + 1 : 0;
  const clear = () => setParams(new URLSearchParams(), { replace: true });

  return (
    <div className="page">
      <PageHeader
        title="Funding Packages"
        subtitle="Browse approved funding opportunities from verified cooperatives. Expected returns are estimates, never guarantees."
      />
      <UnverifiedBanner investor={investor} />
      <Banner tone="green">
        Every package here has passed CollabFarm review. Approval is not a guarantee of success or returns. Money counts as raised only after the financial partner confirms it.
      </Banner>
      <div className="inv-pill-tabs"><PillTabs items={pills} value={category} onChange={(v) => setParam({ category: v, page: 1 })} label="Package categories" /></div>
      <div className="inv-toolbar">
        <SearchInput value={q} onChange={(v) => setParam({ q: v, page: 1 })} placeholder="Search packages" />
        <div className="inv-toolbar__right">
          <InvSelect label="Sort by" prefix="Sort by: " value={sort} onChange={(v) => setParam({ sort: v, page: 1 })} options={SORTS} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card card--pad">
          <EmptyState
            icon={<PackageSearch size={28} />}
            title={visible.length ? 'No packages match your filters' : 'No packages are open right now'}
            action={visible.length ? <Button variant="outline-green" onClick={clear}>Clear filters</Button> : null}
          >
            {visible.length ? 'Try a different category or search term.' : 'New packages appear here after CollabFarm approves them. Check back soon.'}
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="inv-pkg-grid">
            {shown.map((p) => <PackageCard key={p.id} pkg={p} coop={coopById[p.coopId]} />)}
          </div>
          <div className="pagination-bar" style={{ marginTop: 0 }}>
            <span className="muted">Showing {from} - {Math.min(cur * PAGE_SIZE, filtered.length)} of {filtered.length} Funding Packages</span>
            <Pagination page={cur} pages={pages} onPage={(n) => setParam({ page: n })} />
          </div>
        </>
      )}
    </div>
  );
}
