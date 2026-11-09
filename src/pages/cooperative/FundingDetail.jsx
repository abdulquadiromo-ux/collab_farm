import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Banknote, Sprout, RefreshCw, CircleDot, Users, HandCoins, Pencil, Send, Undo2, FilePlus2, UserPlus } from 'lucide-react';
import { Breadcrumb, PageHeader, Card, CardHeader, KpiStrip, Tabs, StatusPill, Banner, EmptyState, LinkButton, Button } from '../../components/ui/index.js';
import { Photo } from '../../components/common/Photo.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { formatNaira, formatDate } from '../../utils/format.js';
import { useCoop, usePackageActions } from '../../components/coopb/hooks.js';
import { useSubmitFlow } from '../../components/coopb/SubmitFlow.jsx';
import { EDITABLE_STATUSES, ALLOCATABLE_STATUSES, BUDGET_CHANGE_STATUSES, PHOTO_THEME } from '../../components/coopb/constants.jsx';
import { agreementSummary } from '../../components/coopb/logic.js';
import { StatusFlow, TierDot, UnverifiedBanner } from '../../components/coopb/Common.jsx';
import { OverviewTab, BudgetTab, FundingTab, TranchesTab, AgreementsTab, AllocationTab } from '../../components/coopb/DetailTabs.jsx';
import { BudgetChangeModal, WithdrawModal } from '../../components/coopb/Modals.jsx';
import '../../styles/pages/coopb.css';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'budget', label: 'Budget' },
  { id: 'funding', label: 'Funding and investors' },
  { id: 'tranches', label: 'Tranches' },
  { id: 'agreements', label: 'Agreements' },
  { id: 'allocation', label: 'Allocation summary' },
];

export default function FundingDetail() {
  const { id } = useParams();
  const { data, user } = useApp();
  const { verified, farms } = useCoop();
  const [params, setParams] = useSearchParams();
  const { withdrawPackage, requestBudgetChange, openBudgetChange } = usePackageActions();
  const { ask, dialog } = useSubmitFlow({ verified });
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);

  const pkg = data.packages.find((p) => p.id === id && p.coopId === user.orgId);
  if (!pkg) {
    return (
      <div className="page">
        <EmptyState title="Package not found" action={<LinkButton to="/coop/funding">Back to Funding Packages</LinkButton>}>
          This package does not exist or belongs to another cooperative.
        </EmptyState>
      </div>
    );
  }

  const tab = TABS.find((t) => t.id === params.get('tab'))?.id || 'overview';
  const editable = EDITABLE_STATUSES.includes(pkg.status);
  const canAllocate = ALLOCATABLE_STATUSES.includes(pkg.status) && verified;
  const canChange = BUDGET_CHANGE_STATUSES.includes(pkg.status);
  const openChange = openBudgetChange(pkg);
  const agreements = agreementSummary(pkg, data);
  const fundingApp = data.applications.filter((a) => a.packageId === pkg.id && a.type === 'Funding application')[0] || null;
  const tierName = pkg.tier || 'Custom';
  const allocatedCount = data.farmers.filter((f) => f.allocationPackageId === pkg.id).length;

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
            {editable && <Button onClick={() => ask(pkg)} disabled={!verified}><Send size={16} />Submit for review</Button>}
            {pkg.status === 'Submitted' && <Button variant="danger-outline" onClick={() => setWithdrawOpen(true)}><Undo2 size={16} />Withdraw</Button>}
            {canChange && <Button variant="outline-green" onClick={() => setChangeOpen(true)} disabled={!!openChange || !verified}><FilePlus2 size={16} />Request budget change</Button>}
          </>
        )}
      />

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
      {['Approved', 'Open for Funding', 'Funding Target Reached', 'Active'].includes(pkg.status) && (
        <Banner tone="success" title="Approved by CollabFarm">
          {fundingApp?.notes && fundingApp.stage === 'Approved' ? fundingApp.notes : 'The budget has been approved. Approval is not a guarantee of success or returns.'}
        </Banner>
      )}
      {openChange && (
        <Banner tone="info" title="Budget change request in progress">
          You asked to change the package amount from {formatNaira(openChange.previousAmount ?? pkg.amount)} to {formatNaira(openChange.amount)} on {formatDate(openChange.submittedAt)}. It needs two different reviewers. Stage: {openChange.stage}.
        </Banner>
      )}
      {agreements.missing.length > 0 && tab !== 'agreements' && (
        <Banner tone="warn" title="Funding steps are blocked until mandatory agreements are signed">
          <ul className="coopb-terms">{agreements.missing.map((m) => <li key={m.key}><strong>{m.label}.</strong> {m.detail}.</li>)}</ul>
          <div style={{ marginTop: 6 }}><Link to="/coop/contracts" className="strong">Open Contracts</Link></div>
        </Banner>
      )}

      <Photo name={pkg.category === 'Crop Farming' ? 'package-crop.jpg' : undefined} theme={PHOTO_THEME[pkg.category] || 'field'} className="coopb-banner-photo" alt={`${pkg.category} package`} />
      <div className="coopb-price-row">
        <div className="stack-sm" style={{ maxWidth: 780 }}>
          <div className="coopb-price">{formatNaira(pkg.amount)}</div>
          <p className="muted">{pkg.description}</p>
        </div>
        {canAllocate && <LinkButton to={`/coop/funding/${pkg.id}/allocate`} size="lg"><UserPlus size={18} />{allocatedCount ? 'Edit Allocation' : 'Assign to Farmer'}</LinkButton>}
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
      {tab === 'budget' && <BudgetTab pkg={pkg} />}
      {tab === 'funding' && <FundingTab pkg={pkg} />}
      {tab === 'tranches' && <TranchesTab pkg={pkg} agreements={agreements} />}
      {tab === 'agreements' && <AgreementsTab pkg={pkg} agreements={agreements} />}
      {tab === 'allocation' && <AllocationTab pkg={pkg} canAllocate={canAllocate} />}

      {dialog}
      <WithdrawModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} pkg={pkg} onConfirm={(reason) => withdrawPackage(pkg, reason)} />
      <BudgetChangeModal open={changeOpen} onClose={() => setChangeOpen(false)} pkg={pkg} onSubmit={(amount, reason) => requestBudgetChange(pkg, amount, reason)} />
    </div>
  );
}
