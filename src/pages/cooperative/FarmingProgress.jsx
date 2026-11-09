import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageCheck, Truck, Receipt } from 'lucide-react';
import { useApp, useSimulatedLoad, simulate } from '../../context/AppContext.jsx';
import { PageHeader, Card, CardHeader, Tabs, DataTable, StatusPill, Button, LinkButton, Banner, ConfirmDialog, FilterSelect, EmptyState, KpiStrip, PageSkeleton } from '../../components/ui/index.js';
import PackageProgressList from '../../components/coopc/PackageProgressList.jsx';
import { TODAY, useCoop, tranchesOf, trancheShort, daysFromToday, sumBy, fmtQty, farmerName } from '../../components/coopc/helpers.js';
import { formatNaira, formatDate } from '../../utils/format.js';
import '../../styles/pages/coopc.css';

const STATUS_ORDER = { Active: 0, 'Ready for Disbursement': 1, 'Funding Target Reached': 2, 'Open for Funding': 3, Completed: 4 };
const MS_STATUSES = ['Not Started', 'Under Review', 'Approved', 'Delayed'];
const EXPENSE_STATUSES = ['Confirmed', 'Under Reconciliation', 'Pending'];

const isReturned = (m) => !!m.returned || (!!m.reviewNotes && !!m.reviewedBy && !['Approved', 'Under Review'].includes(m.status));

export default function FarmingProgress() {
  const { data, user, update, toast } = useApp();
  const { packages, packageIds, pkgById } = useCoop();
  const loading = useSimulatedLoad(350);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'milestones';
  const pkgFilter = params.get('package') || '';
  const [deliver, setDeliver] = useState(null);
  const [saving, setSaving] = useState(false);

  const setParam = (key, value) => setParams((p) => {
    const n = new URLSearchParams(p);
    if (value) n.set(key, value); else n.delete(key);
    return n;
  }, { replace: true });
  const closeDeliver = useCallback(() => setDeliver(null), []);

  // Packages that have a funding schedule or milestones, active ones first.
  const tracked = useMemo(
    () => packages
      .filter((p) => data.tranches.some((t) => t.packageId === p.id) || data.milestones.some((m) => m.packageId === p.id))
      .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)),
    [packages, data.tranches, data.milestones],
  );
  const shownPackages = pkgFilter ? tracked.filter((p) => p.id === pkgFilter) : tracked;
  const shownIds = new Set(shownPackages.map((p) => p.id));

  const progressRows = shownPackages.map((pkg) => ({
    pkg, tranches: tranchesOf(data, pkg.id), milestones: data.milestones.filter((m) => m.packageId === pkg.id),
  }));

  const milestoneRows = useMemo(
    () => data.milestones
      .filter((m) => packageIds.has(m.packageId) && (!pkgFilter || m.packageId === pkgFilter))
      .map((m) => {
        const tr = data.tranches.find((t) => t.id === m.trancheId);
        const late = !['Approved', 'Under Review'].includes(m.status) && daysFromToday(m.dueDate) < 0;
        return { ...m, pkgName: pkgById[m.packageId]?.name || '-', tranche: tr, trancheNo: tr ? String(tr.number) : '', evidenceCount: (m.evidence || []).length, late, returned: isReturned(m) };
      }),
    [data.milestones, data.tranches, packageIds, pkgFilter, pkgById],
  );

  const inputRows = useMemo(
    () => data.inputRecords
      .filter((r) => packageIds.has(r.packageId) && (!pkgFilter || r.packageId === pkgFilter))
      .map((r) => ({ ...r, pkgName: pkgById[r.packageId]?.name || '-', farmer: r.farmerName || farmerName(data, r.farmerId), deliveredLabel: r.delivered ? 'Delivered' : 'Not delivered' })),
    [data, packageIds, pkgFilter, pkgById],
  );
  const expenseRows = useMemo(
    () => data.expenses
      .filter((r) => packageIds.has(r.packageId) && (!pkgFilter || r.packageId === pkgFilter))
      .map((r) => ({ ...r, pkgName: pkgById[r.packageId]?.name || '-' })),
    [data.expenses, packageIds, pkgFilter, pkgById],
  );

  const confirmDeliver = async () => {
    setSaving(true);
    await simulate(600);
    update('inputRecords', deliver.id, { delivered: true, deliveredAt: TODAY, deliveredRecordedBy: user.name }, {
      action: 'Input delivery recorded', entityType: 'Input record',
      summary: `${deliver.item} (${fmtQty(deliver.qty, deliver.unit)}) marked delivered to ${deliver.farmer}`,
      reason: `Cooperative confirmed delivery for ${deliver.pkgName}`,
    });
    setSaving(false);
    setDeliver(null);
    toast('Delivery recorded. Attach the signed receipt as evidence on the milestone page.');
  };

  if (loading) return <PageSkeleton />;

  const milestoneColumns = [
    {
      key: 'title', header: 'Milestone', sortable: true,
      render: (m) => (<div><div className="strong">{m.title}</div><div className="cell-sub">{m.description}</div></div>),
    },
    { key: 'pkgName', header: 'Package', sortable: true },
    { key: 'trancheNo', header: 'Tranche', sortable: true, render: (m) => (m.tranche ? <div><div>{trancheShort(m.tranche)}</div><div className="cell-sub">{m.tranche.status}</div></div> : '-') },
    {
      key: 'dueDate', header: 'Due date', sortable: true, className: 'nowrap',
      render: (m) => (<div><div>{formatDate(m.dueDate)}</div>{m.late && <div className="cell-sub danger-text">Past due</div>}</div>),
    },
    { key: 'status', header: 'Status', render: (m) => (<div className="stack-sm" style={{ alignItems: 'flex-start', gap: 4 }}><StatusPill>{m.status}</StatusPill>{m.returned && <span className="cell-sub">Returned for changes</span>}</div>) },
    { key: 'evidenceCount', header: 'Evidence', sortable: true, align: 'center', render: (m) => `${m.evidenceCount} ${m.evidenceCount === 1 ? 'file' : 'files'}` },
    { key: 'submittedBy', header: 'Submitted by', render: (m) => m.submittedBy || <span className="muted">Not submitted</span> },
    {
      key: 'action', header: 'Action',
      render: (m) => (['Approved', 'Under Review'].includes(m.status)
        ? <LinkButton variant="outline" size="sm" to={`/coop/farming-progress/${m.id}`}>View</LinkButton>
        : <LinkButton variant="outline-green" size="sm" to={`/coop/farming-progress/${m.id}?upload=1`}>{m.returned ? 'Resubmit evidence' : 'Submit evidence'}</LinkButton>),
    },
  ];

  const inputColumns = [
    { key: 'item', header: 'Item', sortable: true, render: (r) => (<div><div className="strong">{r.item}</div><div className="cell-sub">{formatDate(r.date)}</div></div>) },
    { key: 'farmer', header: 'Farmer', sortable: true },
    { key: 'qty', header: 'Quantity', sortable: true, render: (r) => fmtQty(r.qty, r.unit) },
    { key: 'cost', header: 'Cost', sortable: true, render: (r) => formatNaira(r.cost) },
    { key: 'supplier', header: 'Supplier' },
    { key: 'pkgName', header: 'Package' },
    { key: 'deliveredLabel', header: 'Delivered', render: (r) => <StatusPill tone={r.delivered ? 'green' : 'amber'}>{r.delivered ? 'Yes, delivered' : 'No, not yet'}</StatusPill> },
    {
      key: 'action', header: 'Action',
      render: (r) => (r.delivered
        ? <span className="cell-sub">{r.deliveredAt ? `Recorded ${formatDate(r.deliveredAt)}` : 'Recorded'}</span>
        : <Button variant="outline-green" size="sm" onClick={() => setDeliver(r)}>Mark delivered</Button>),
    },
  ];

  const expenseColumns = [
    { key: 'date', header: 'Date', sortable: true, className: 'nowrap', render: (r) => formatDate(r.date) },
    { key: 'description', header: 'Expense', sortable: true, render: (r) => (<div><div className="strong">{r.description}</div><div className="cell-sub">{r.category}</div></div>) },
    { key: 'supplier', header: 'Paid to' },
    { key: 'pkgName', header: 'Package' },
    { key: 'amount', header: 'Amount', sortable: true, render: (r) => formatNaira(r.amount) },
    { key: 'status', header: 'Status', render: (r) => <StatusPill>{r.status}</StatusPill> },
    { key: 'ref', header: 'Reference', render: (r) => <span className="coopc-mono">{r.ref}</span> },
  ];

  const confirmed = sumBy(expenseRows.filter((r) => r.status === 'Confirmed'), (r) => r.amount);
  const reconciling = sumBy(expenseRows.filter((r) => r.status === 'Under Reconciliation'), (r) => r.amount);
  const waiting = sumBy(expenseRows.filter((r) => r.status === 'Pending'), (r) => r.amount);
  const delivered = inputRows.filter((r) => r.delivered).length;

  return (
    <div className="page coopc-page">
      <PageHeader
        title="Farming Progress"
        subtitle="Follow milestones, evidence, inputs and spending for your active packages."
        actions={(
          <FilterSelect
            label="Choose a package" allLabel="All packages" value={pkgFilter}
            options={tracked.map((p) => ({ value: p.id, label: p.name }))} onChange={(v) => setParam('package', v)}
          />
        )}
      />

      <Banner tone="green" title="Why this page matters">
        Funding is released in stages (tranches). Each stage opens only when a reviewer approves the evidence for the stage before it. Photos and GPS points help, but a reviewer decides. A late report is recorded as a delay and is not treated as misconduct, and a genuine crop failure is assessed separately from fraud.
      </Banner>

      <Card>
        <CardHeader title="Package progress" subtitle="Milestones approved and where each package is on the T1 to T4 funding chain." />
        {progressRows.length > 0 ? <PackageProgressList rows={progressRows} /> : (
          <EmptyState title="No packages to track yet" action={<LinkButton to="/coop/funding">Go to Funding</LinkButton>}>
            Once a funding package is approved, its milestones and tranches appear here.
          </EmptyState>
        )}
      </Card>

      <div className="stack">
        <Tabs
          auto
          label="Farming progress sections"
          value={tab}
          onChange={(v) => setParam('tab', v === 'milestones' ? '' : v)}
          items={[
            { id: 'milestones', label: 'Milestones', count: milestoneRows.length },
            { id: 'inputs', label: 'Inputs and deliveries', count: inputRows.length },
            { id: 'expenses', label: 'Expenses', count: expenseRows.length },
          ]}
        />

        {tab === 'milestones' && (
          <DataTable
            columns={milestoneColumns}
            rows={milestoneRows}
            searchKeys={['title', 'description', 'pkgName', 'submittedBy']}
            searchPlaceholder="Search milestones"
            filters={[
              { key: 'status', allLabel: 'All Status', options: MS_STATUSES },
              { key: 'trancheNo', allLabel: 'All tranches', options: [1, 2, 3, 4].map((n) => ({ value: String(n), label: `Tranche ${n}` })) },
              { key: 'timing', allLabel: 'Any due date', options: [{ value: 'late', label: 'Past due' }, { value: 'soon', label: 'Due in 30 days' }], match: (r, v) => (v === 'late' ? r.late : (daysFromToday(r.dueDate) ?? -1) >= 0 && daysFromToday(r.dueDate) <= 30 && r.status !== 'Approved') },
            ]}
            defaultSort={{ key: 'dueDate', dir: 'asc' }}
            totalLabel="milestones"
            emptyTitle="No milestones yet"
            emptyText="Milestones are created when a package is approved. Evidence you submit here is checked by a reviewer."
          />
        )}

        {tab === 'inputs' && (
          <>
            <KpiStrip columns={3} cells={[
              { icon: <Truck size={18} />, label: 'Input records', value: inputRows.length, sub: 'Seeds, fertiliser and other items' },
              { icon: <PackageCheck size={18} />, label: 'Delivered', value: `${delivered} of ${inputRows.length}`, sub: 'Confirmed as received by farmers' },
              { icon: <Receipt size={18} />, label: 'Cost of undelivered items', value: formatNaira(sumBy(inputRows.filter((r) => !r.delivered), (r) => r.cost)), sub: 'Check these with the supplier' },
            ]}
            />
            <DataTable
              columns={inputColumns}
              rows={inputRows}
              searchKeys={['item', 'farmer', 'supplier', 'pkgName']}
              searchPlaceholder="Search items, farmers or suppliers"
              filters={[
                { key: 'deliveredLabel', allLabel: 'Delivered or not', options: ['Delivered', 'Not delivered'] },
              ]}
              defaultSort={{ key: 'item', dir: 'asc' }}
              totalLabel="input records"
              emptyTitle="No input records yet"
              emptyText="Seeds, fertiliser and other items recorded against farmers will appear here."
            />
          </>
        )}

        {tab === 'expenses' && (
          <>
            <Banner tone="info" title="Spent only when confirmed">
              An expense counts as spent once the financial partner confirms it and a CollabFarm admin reconciles it. Reconciling means matching our record of a payment with the partner's record, line by line.
            </Banner>
            <KpiStrip columns={3} cells={[
              { icon: <Receipt size={18} />, label: 'Confirmed spending', value: formatNaira(confirmed), sub: 'Confirmed and reconciled' },
              { icon: <Receipt size={18} />, label: 'Under reconciliation', value: formatNaira(reconciling), sub: 'Paid, waiting to be matched' },
              { icon: <Receipt size={18} />, label: 'Pending', value: formatNaira(waiting), sub: 'Recorded, not yet confirmed' },
            ]}
            />
            <DataTable
              columns={expenseColumns}
              rows={expenseRows}
              searchKeys={['description', 'category', 'supplier', 'ref']}
              searchPlaceholder="Search expenses"
              filters={[{ key: 'status', allLabel: 'All Status', options: EXPENSE_STATUSES }]}
              defaultSort={{ key: 'date', dir: 'desc' }}
              totalLabel="expenses"
              emptyTitle="No expenses yet"
              emptyText="Payments made from the package budget will appear here."
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deliver}
        onClose={closeDeliver}
        onConfirm={confirmDeliver}
        loading={saving}
        tone="green"
        title="Mark this input as delivered?"
        message="Only confirm once the farmer has really received the item. A signed receipt should be added as evidence on the milestone."
        summary={deliver ? [
          ['Farmer', deliver.farmer],
          ['Item', `${deliver.item}, ${fmtQty(deliver.qty, deliver.unit)}`],
          ['Cost', formatNaira(deliver.cost)],
          ['Supplier', deliver.supplier],
          ['Approval status', 'Recorded by the cooperative. A reviewer checks it against evidence'],
        ] : undefined}
        confirmLabel="Mark delivered"
      />
    </div>
  );
}
