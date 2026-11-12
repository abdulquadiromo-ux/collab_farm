import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Banknote, Sprout, RefreshCw, CircleDot, Users, HandCoins, Pencil } from 'lucide-react';
import { Breadcrumb, PageHeader, Card, CardHeader, KpiStrip, Tabs, StatusPill, Banner, EmptyState, LinkButton, PageSkeleton } from '../../components/ui/index.js';
import { Photo } from '../../components/common/Photo.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { formatNaira } from '../../utils/format.js';
import { useCoop } from '../../components/coopb/hooks.js';
import { EDITABLE_STATUSES, PHOTO_THEME } from '../../components/coopb/constants.jsx';
import { agreementSummary } from '../../components/coopb/logic.js';
import { apiPackageToModel } from '../../components/coopb/logic.js';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';
import { StatusFlow, TierDot, UnverifiedBanner } from '../../components/coopb/Common.jsx';
import { OverviewTab, FarmersTab, FundingTab, TranchesTab } from '../../components/coopb/DetailTabs.jsx';
import '../../styles/pages/coopb.css';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'farmers', label: 'Farmers' },
  { id: 'funding', label: 'Investors' },
  { id: 'tranches', label: 'Tranches' },
];

export default function FundingDetail() {
  const { id } = useParams();
  const { data, accessToken, patchData } = useApp();
  const { verified, farms } = useCoop();
  const [params, setParams] = useSearchParams();
  const [remotePackage, setRemotePackage] = useState(null);
  const [remoteInvestors, setRemoteInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setLoadError('');
      if (!accessToken) { setLoadError('Your session has expired. Sign in again to view this package.'); setLoading(false); return; }
      try {
        const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };
        const [packageResponse, investorsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/packages/${encodeURIComponent(id)}`, { headers, signal: controller.signal }),
          fetch(`${API_BASE_URL}/packages/${encodeURIComponent(id)}/investors`, { headers, signal: controller.signal }),
        ]);
        const packagePayload = await packageResponse.json().catch(() => null);
        if (!packageResponse.ok) throw new Error(apiErrorMessage(packagePayload, `Could not load package (${packageResponse.status}).`));
        const model = apiPackageToModel(packagePayload);
        setRemotePackage(model);
        patchData((current) => ({ packages: [...current.packages.filter((item) => item.id !== model.id), model] }));
        const investorsPayload = await investorsResponse.json().catch(() => []);
        if (!investorsResponse.ok) throw new Error(apiErrorMessage(investorsPayload, `Could not load package investors (${investorsResponse.status}).`));
        setRemoteInvestors(Array.isArray(investorsPayload) ? investorsPayload : []);
      } catch (error) { if (error.name !== 'AbortError') setLoadError(error.message || 'Could not load package details.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [accessToken, id, patchData]);

  const pkg = remotePackage?.id === id ? remotePackage : null;
  if (loading) return <PageSkeleton />;
  if (!pkg) {
    return (
      <div className="page">
        <EmptyState title="Package not found" action={<LinkButton to="/coop/funding">Back to Funding Packages</LinkButton>}>
          {loadError || 'This package does not exist or belongs to another cooperative.'}
        </EmptyState>
      </div>
    );
  }

  const tab = TABS.find((t) => t.id === params.get('tab'))?.id || 'overview';
  const editable = EDITABLE_STATUSES.includes(pkg.status);
  const agreements = agreementSummary(pkg, data);
  const fundingApp = data.applications.filter((a) => a.packageId === pkg.id && a.type === 'Funding application')[0] || null;
  const tierName = pkg.tier || 'Custom';

  const cells = [
    { icon: <Banknote size={20} />, label: 'Funding Amount', value: formatNaira(pkg.amount) },
    { icon: <Sprout size={20} />, label: 'Farming Type', value: pkg.category },
    { icon: <RefreshCw size={20} />, label: 'Farming Cycle', value: `${pkg.tenureMonths || '-'} Months` },
    { icon: <CircleDot size={20} />, label: 'Package Status', value: pkg.status },
    { icon: <Users size={20} />, label: 'Farmers', value: pkg.farmersCount || 0 },
    { icon: <HandCoins size={20} />, label: 'Investors', value: pkg.investorsCount || 0 },
  ];

  return (
    <div className="page">
      <Breadcrumb items={[{ label: 'Funding Packages', to: '/coop/funding' }, { label: pkg.name }]} />
      <PageHeader
        title={pkg.name}
        subtitle={<span className="row" style={{ gap: 10, flexWrap: 'wrap' }}>{pkg.category} package<StatusPill>{pkg.status}</StatusPill></span>}
        actions={(
          <>
            <span className="coopb-tier-chip"><TierDot tier={tierName} />{tierName}</span>
            {editable && <LinkButton to={`/coop/funding/new?edit=${pkg.id}`} variant="outline"><Pencil size={16} />Edit</LinkButton>}
          </>
        )}
      />
      {loadError && <Banner tone="danger" title="Could not load all package information">{loadError}</Banner>}

      {!verified && <UnverifiedBanner what="submit funding requests or change budgets" />}

      {pkg.status === 'Changes Requested' && (
        <Banner tone="warn" title="The reviewer asked for changes">
          {fundingApp?.notes || 'Open the package, make the changes the reviewer asked for and submit it again.'}
          {' '}<Link to={`/coop/funding/new?edit=${pkg.id}`} className="strong">Edit package</Link>
        </Banner>
      )}
      {pkg.status === 'Draft' && pkg.withdrawReason && (
        <Banner tone="info" title="You withdrew this request"><div>Reason recorded: {pkg.withdrawReason}</div><div>Edit the package and submit it again when ready.</div></Banner>
      )}
      {['Submitted', 'Under Review'].includes(pkg.status) && (
        <Banner tone="info" title={pkg.status === 'Submitted' ? 'Waiting for a reviewer' : `Under review${fundingApp?.reviewer ? ` by ${fundingApp.reviewer}` : ''}`}>
          {fundingApp?.notes || 'You cannot edit the package while it is being reviewed. You will be notified when there is a decision.'}
          {pkg.status === 'Submitted' && ' You can still withdraw the request before review starts.'}
        </Banner>
      )}

      <Photo name={pkg.category === 'Crop Farming' ? 'package-crop.jpg' : undefined} theme={PHOTO_THEME[pkg.category] || 'field'} className="coopb-banner-photo" alt={`${pkg.category} package`} />
      <div className="coopb-price-row">
        <div className="stack-sm" style={{ maxWidth: 780 }}>
          <div className="coopb-price">{formatNaira(pkg.amount)}</div>
          <p className="muted">{pkg.description}</p>
        </div>
      </div>

      <Card>
        <CardHeader title="Package status" subtitle="Where this package is in the review and funding journey." />
        <StatusFlow status={pkg.status} />
      </Card>

      <div className="coopb-stats"><KpiStrip cells={cells} columns={6} /></div>

      <Tabs
        auto
        label="Package sections"
        items={TABS}
        value={tab}
        onChange={(t) => setParams((prev) => { const n = new URLSearchParams(prev); n.set('tab', t); return n; }, { replace: true })}
      />
      {tab === 'overview' && <OverviewTab pkg={pkg} farms={farms} />}
      {tab === 'farmers' && <FarmersTab pkg={pkg} />}
      {tab === 'funding' && <FundingTab pkg={pkg} investors={remoteInvestors} />}
      {tab === 'tranches' && <TranchesTab pkg={pkg} agreements={agreements} />}

    </div>
  );
}
