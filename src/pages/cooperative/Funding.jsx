import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, CircleCheck, FilePen, Hourglass } from 'lucide-react';
import { PageHeader, PillTabs, KpiStrip, LinkButton, PageSkeleton, EmptyState, Banner } from '../../components/ui/index.js';
import { useApp } from '../../context/AppContext.jsx';
import { useCoop, useMyProfile } from '../../components/coopb/hooks.js';
import { apiPackageToModel } from '../../components/coopb/logic.js';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';
import { FUNDING_TABS, CATEGORY_ICON_LARGE, PANEL_SUBTITLE, LIVE_STATUSES, PENDING_REVIEW_STATUSES } from '../../components/coopb/constants.jsx';
import PackagesTable, { CreatePackageButton } from '../../components/coopb/PackagesTable.jsx';
import '../../styles/pages/coopb.css';

function CategoryView({ tab, packages, verified }) {
  const rows = packages.filter((pkg) => pkg.category === tab.category);
  return (
    <section className="coopb-panel" aria-label={`${tab.label} packages`}>
      <div className="coopb-panel__head">
        <span className="coopb-panel__icon">{CATEGORY_ICON_LARGE[tab.category]}</span>
        <div>
          <h2 className="coopb-panel__title">{tab.label} Packages</h2>
          <p className="muted small">{PANEL_SUBTITLE[tab.category]}</p>
        </div>
        {verified && <LinkButton to={`/coop/funding/new?category=${encodeURIComponent(tab.category)}&tier=Starter`} className="ml-auto">Create Package</LinkButton>}
      </div>
      <PackagesTable rows={rows} verified={verified} emptyTitle={`No ${tab.label.toLowerCase()} packages`} emptyText="Packages created for this farming category will appear here." />
    </section>
  );
}

function AllView({ packages, verified }) {
  const cells = [
    { icon: <Package size={20} />, label: 'Total Packages', value: packages.length, sub: 'Created by your cooperative' },
    { icon: <CircleCheck size={20} />, label: 'Active Packages', value: packages.filter((p) => LIVE_STATUSES.includes(p.status)).length, sub: 'Open for funding or running' },
    { icon: <FilePen size={20} />, label: 'Draft Packages', value: packages.filter((p) => p.status === 'Draft').length, sub: 'Not yet submitted' },
    { icon: <Hourglass size={20} />, label: 'Pending Review', value: packages.filter((p) => PENDING_REVIEW_STATUSES.includes(p.status)).length, sub: `Changes requested: ${packages.filter((p) => p.status === 'Changes Requested').length}` },
  ];
  return (
    <>
      <KpiStrip cells={cells} />
      <PackagesTable
        rows={packages}
        verified={verified}
        emptyTitle="No packages yet"
        emptyText="Create a package from a farming category or design a custom package for your cooperative."
        emptyAction={<CreatePackageButton verified={verified} size="md" />}
      />
    </>
  );
}

export default function Funding() {
  const { accessToken, patchData } = useApp();
  const { coop, packages, orgId } = useCoop();
  const { verified, loading: profileLoading, error: profileError } = useMyProfile();
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const tab = FUNDING_TABS.find((t) => t.id === params.get('tab')) || FUNDING_TABS[0];

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError('');
      if (!accessToken) { setError('Your session has expired. Sign in again to view packages.'); setLoading(false); return; }
      try {
        const response = await fetch(`${API_BASE_URL}/packages/`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not load packages (${response.status}).`));
        const list = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
        const apiPackages = list.map((item) => ({ ...apiPackageToModel(item), coopId: orgId })).filter((item) => item.id);
        patchData((current) => ({ packages: [...current.packages.filter((item) => item.coopId !== orgId), ...apiPackages] }));
      } catch (cause) { if (cause.name !== 'AbortError') setError(cause.message || 'Could not load packages.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [accessToken, orgId, patchData, reloadKey]);

  if (loading || profileLoading) return <PageSkeleton />;
  if (error) return <div className="page"><EmptyState title="Funding packages unavailable" action={<button className="btn btn--primary" type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>}>{error}</EmptyState></div>;
  if (!coop) return <div className="page"><EmptyState title="Cooperative not found">Sign in with a cooperative account to see funding packages.</EmptyState></div>;

  return (
    <div className="page">
      <PageHeader
        title="Funding Packages"
        subtitle="Choose a funding package based on farming type and production needs."
        actions={<CreatePackageButton verified={verified} />}
      />
      {profileError && <Banner tone="warn" title="Verification status unavailable">{profileError} Package creation is disabled until your status can be confirmed.</Banner>}
      <div className="coopb-pilltabs">
        <PillTabs
          items={FUNDING_TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon }))}
          value={tab.id}
          onChange={(id) => setParams((prev) => { const n = new URLSearchParams(prev); n.set('tab', id); return n; }, { replace: true })}
          label="Package categories"
        />
      </div>
      {tab.id === 'all' ? <AllView packages={packages} verified={verified} /> : <CategoryView tab={tab} packages={packages} verified={verified} />}
    </div>
  );
}
