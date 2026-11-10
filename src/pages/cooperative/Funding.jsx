import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Package, CircleCheck, FilePen, Hourglass } from 'lucide-react';
import { PageHeader, PillTabs, KpiStrip, LinkButton, Checklist, PageSkeleton, EmptyState } from '../../components/ui/index.js';
import { useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatNaira } from '../../utils/format.js';
import { PACKAGE_TIER_DOT } from '../../utils/status.js';
import { useCoop } from '../../components/coopb/hooks.js';
import { FUNDING_TABS, TEMPLATES, CATEGORY_ICON_LARGE, PANEL_SUBTITLE, LIVE_STATUSES, PENDING_REVIEW_STATUSES } from '../../components/coopb/constants.jsx';
import { UnverifiedBanner } from '../../components/coopb/Common.jsx';
import PackagesTable, { CreatePackageButton } from '../../components/coopb/PackagesTable.jsx';
import '../../styles/pages/coopb.css';

const STATUS_RANK = { Active: 0, 'Open for Funding': 1, 'Funding Target Reached': 2, Approved: 3, Completed: 4, 'Under Review': 5, Submitted: 6, 'Changes Requested': 7, Draft: 8 };

function TierCard({ tpl, category, packages, verified }) {
  const mine = packages.filter((p) => p.category === category && p.tier === tpl.tier)
    .sort((a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) || String(b.createdAt).localeCompare(String(a.createdAt)));
  const match = mine[0];
  const buttonLabel = 'View Package';
  const to = match ? `/coop/funding/${match.id}` : `/coop/funding/new?category=${encodeURIComponent(category)}&tier=${tpl.tier}`;
  const disabled = !match && !verified;
  return (
    <article className="coopb-tier" aria-label={`${tpl.tier} package`}>
      <header>
        <div className="coopb-tier__name"><span className="dot" style={{ background: PACKAGE_TIER_DOT[tpl.tier] }} aria-hidden="true" />{tpl.tier}</div>
        <div className="muted small">{tpl.tagline}</div>
      </header>
      <div className="coopb-tier__price">{formatNaira(tpl.amount)}{tpl.plus ? ' +' : ''}</div>
      <Checklist items={tpl.inclusions} />
      <div className="coopb-tier__foot">
        <div className="caption muted center">
          {match
            ? `${mine.length} ${tpl.tier} package${mine.length === 1 ? '' : 's'} in ${category}. Latest: ${match.name}`
            : disabled ? 'Available once your cooperative is verified' : 'No package of this type yet. Start from this template.'}
        </div>
        {disabled ? (
          <button type="button" className="btn btn--primary coopb-view-package" disabled>{buttonLabel} <ArrowRight size={16} /></button>
        ) : (
          <LinkButton to={to} variant="primary" className="coopb-view-package">{buttonLabel} <ArrowRight size={16} /></LinkButton>
        )}
      </div>
    </article>
  );
}

function CategoryView({ tab, packages, verified }) {
  const tiers = TEMPLATES[tab.category] || [];
  return (
    <>
      <section className="coopb-panel" aria-label={`${tab.label} packages`}>
        <div className="coopb-panel__head">
          <span className="coopb-panel__icon">{CATEGORY_ICON_LARGE[tab.category]}</span>
          <div>
            <h2 className="coopb-panel__title">{tab.label} Packages</h2>
            <p className="muted small">{PANEL_SUBTITLE[tab.category]}</p>
          </div>
        </div>
        <div className="coopb-tiers">
          {tiers.map((tpl) => <TierCard key={tpl.tier} tpl={tpl} category={tab.category} packages={packages} verified={verified} />)}
        </div>
      </section>
    </>
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
  const loading = useSimulatedLoad(350);
  const { coop, verified, packages } = useCoop();
  const [params, setParams] = useSearchParams();
  const tab = FUNDING_TABS.find((t) => t.id === params.get('tab')) || FUNDING_TABS[0];

  if (loading) return <PageSkeleton />;
  if (!coop) return <div className="page"><EmptyState title="Cooperative not found">Sign in with a cooperative account to see funding packages.</EmptyState></div>;

  return (
    <div className="page">
      <PageHeader
        title="Funding Packages"
        subtitle="Choose a funding package based on farming type and production needs."
        actions={<CreatePackageButton verified={verified} />}
      />
      {!verified && <UnverifiedBanner />}
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
