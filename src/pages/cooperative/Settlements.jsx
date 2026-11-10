import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, Hourglass, CalendarDays, Files } from 'lucide-react';
import { useApp, useSimulatedLoad, simulate } from '../../context/AppContext.jsx';
import { PageHeader, KpiStrip, DataTable, StatusPill, Button, PageSkeleton, Modal, InfoList } from '../../components/ui/index.js';
import { useCoop, sumBy, TODAY, investorDisplayName } from '../../components/coopc/helpers.js';
import { formatNaira } from '../../utils/format.js';
import '../../styles/pages/coopc.css';

export default function Settlements() {
  const { data, user, update, notify, toast } = useApp();
  const { coop, packages, packageIds } = useCoop();
  const navigate = useNavigate();
  const loading = useSimulatedLoad(350);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [settling, setSettling] = useState(false);
  const dists = useMemo(() => data.distributions.filter((d) => packageIds.has(d.packageId)), [data.distributions, packageIds]);
  const settlementRows = useMemo(() => packages.map((pkg) => {
    const investments = data.investments.filter((investment) => investment.packageId === pkg.id);
    const unsettledInvestments = investments.filter((investment) => !['Repaid', 'Completed'].includes(investment.status));
    const expectedReturn = unsettledInvestments.reduce((total, investment) => (
      total + Math.round((Number(investment.committed || investment.intended) || 0) * (1 + (Number(pkg.expectedRoiPct) || 0) / 100))
    ), 0);
    const packageDistributions = dists.filter((distribution) => distribution.packageId === pkg.id);
    const investorsToSettle = new Set(unsettledInvestments.map((investment) => investment.investorId)).size;
    const status = packageDistributions.some((distribution) => distribution.status === 'Overdue')
      ? 'Overdue'
      : packageDistributions.length && packageDistributions.every((distribution) => distribution.status === 'Confirmed')
        ? 'Settled'
        : 'Pending';
    return { ...pkg, expectedReturn, investorsToSettle, settlementStatus: status };
  }).filter((pkg) => data.investments.some((investment) => investment.packageId === pkg.id)), [packages, data.investments, dists]);
  const totalSettled = sumBy(dists, (d) => d.amountPaid || 0);
  const pendingDistributions = dists.filter((d) => d.status !== 'Confirmed');
  const pendingSettlement = sumBy(pendingDistributions, (d) => Math.max(0, (Number(d.amountDue) || 0) - (Number(d.amountPaid) || 0)));
  const currentMonth = TODAY.slice(0, 7);
  const thisMonthSettled = sumBy(dists.filter((d) => d.status === 'Confirmed' && String(d.paidDate || '').slice(0, 7) === currentMonth), (d) => d.amountPaid || 0);

  if (loading) return <PageSkeleton />;

  const columns = [
    { key: 'name', header: 'Package', sortable: true },
    { key: 'amount', header: 'Package amount', sortable: true, render: (pkg) => formatNaira(pkg.amount) },
    { key: 'expectedRoiPct', header: 'Expected ROI', sortable: true, render: (pkg) => `${Number(pkg.expectedRoiPct) || 0}%` },
    { key: 'expectedReturn', header: 'Expected return amount', sortable: true, render: (pkg) => formatNaira(pkg.expectedReturn) },
    { key: 'investorsToSettle', header: 'Investors to be settled', sortable: true },
    { key: 'settlementStatus', header: 'Status', render: (pkg) => <StatusPill>{pkg.settlementStatus}</StatusPill> },
    { key: 'action', header: 'Action', render: (pkg) => <Button variant="outline" size="sm" onClick={() => setSelectedPackage(pkg)}>View</Button> },
  ];

  const selectedInvestors = selectedPackage ? data.investments
    .filter((investment) => investment.packageId === selectedPackage.id && !['Repaid', 'Completed'].includes(investment.status))
    .map((investment) => ({
      ...investment,
      investorName: investorDisplayName(data, investment.investorId),
      expectedAmount: Math.max(0, Math.round((Number(investment.committed || investment.intended) || 0) * (1 + (Number(selectedPackage.expectedRoiPct) || 0) / 100)) - (Number(investment.repaid) || 0)),
    })) : [];
  const packageDistributionsToSubmit = selectedPackage ? data.distributions.filter((distribution) => (
    distribution.packageId === selectedPackage.id && distribution.status !== 'Confirmed' && !distribution.readyForReview
  )) : [];

  const settleAll = async () => {
    if (!selectedPackage || !packageDistributionsToSubmit.length || settling) return;
    setSettling(true);
    await simulate(700);
    packageDistributionsToSubmit.forEach((distribution) => update('distributions', distribution.id, {
      readyForReview: true,
      readyForReviewAt: TODAY,
      readyForReviewBy: user.name,
    }, {
      action: 'Distribution marked ready for review',
      entityType: 'Distribution',
      summary: `${distribution.type} of ${formatNaira(distribution.amountDue)} submitted for admin review. No payment was made.`,
      reason: selectedPackage.name,
    }));
    notify('admin', 'Distributions ready for review', `${coop?.name || 'A cooperative'} submitted ${packageDistributionsToSubmit.length} investor settlement${packageDistributionsToSubmit.length === 1 ? '' : 's'} for ${selectedPackage.name}.`, '/admin/distributions', 'distribution');
    setSettling(false);
    setSelectedPackage(null);
    toast('Investor settlements sent to the admin reviewer. No payments were made.');
  };

  return (
    <div className="page coopc-page">
      <PageHeader
        title="Settlements"
        subtitle="Track harvests, sales, investor distributions and what farmers owe."
      />

      <KpiStrip
        cells={[
          { icon: <Landmark size={18} />, label: 'Total Settled', value: formatNaira(totalSettled), sub: `${dists.filter((d) => d.status === 'Confirmed').length} confirmed settlements` },
          { icon: <Hourglass size={18} />, label: 'Pending Settlement', value: formatNaira(pendingSettlement), sub: `${pendingDistributions.length} waiting to be settled` },
          { icon: <CalendarDays size={18} />, label: 'This Month', value: formatNaira(thisMonthSettled), sub: `Settled in ${currentMonth}` },
          { icon: <Files size={18} />, label: 'Total Number of Settlements', value: dists.length, sub: 'All recorded settlements' },
        ]}
      />

      <div className="stack">
        <section className="stack-sm">
          <h2>Settlements</h2>
          <DataTable
            columns={columns}
            rows={settlementRows}
            searchKeys={['name', 'category', 'settlementStatus']}
            searchPlaceholder="Search packages"
            defaultSort={{ key: 'name', dir: 'asc' }}
            totalLabel="packages"
            emptyTitle="No investments to settle"
            emptyText="Packages with investor commitments will appear here."
          />
        </section>
      </div>

      {selectedPackage && (
        <Modal
          open
          onClose={() => setSelectedPackage(null)}
          title="Settlement details"
          wide
          white
          footer={(
            <>
              <Button variant="outline" onClick={() => setSelectedPackage(null)}>Close</Button>
              <Button variant="outline" onClick={() => navigate(`/coop/funding/${selectedPackage.id}`)}>View package</Button>
              <Button onClick={settleAll} loading={settling} disabled={!packageDistributionsToSubmit.length}>Settle all</Button>
            </>
          )}
        >
          <div className="stack">
            <InfoList compact items={[
              ['Package', selectedPackage.name],
              ['Package amount', formatNaira(selectedPackage.amount)],
              ['Expected ROI', `${Number(selectedPackage.expectedRoiPct) || 0}%`],
              ['Expected return amount', formatNaira(selectedPackage.expectedReturn)],
              ['Investors to be settled', selectedPackage.investorsToSettle],
              ['Status', <StatusPill key="settlement-status">{selectedPackage.settlementStatus}</StatusPill>],
            ]} />
            <div className="stack-sm">
              <h3 className="card__title">Investors to be settled</h3>
              {selectedInvestors.length ? selectedInvestors.map((investment) => (
                <div className="row" key={investment.id} style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--grey-200)', padding: '10px 0' }}>
                  <div>
                    <div className="strong small">{investment.investorName}</div>
                    <div className="caption muted">{investment.status}</div>
                  </div>
                  <div className="strong">{formatNaira(investment.expectedAmount)}</div>
                </div>
              )) : <p className="muted small">No unsettled investors for this package.</p>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
