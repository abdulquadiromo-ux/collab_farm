import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Wheat, Landmark, Hourglass, ClipboardList, Plus, HandCoins } from 'lucide-react';
import { useApp, useSimulatedLoad, simulate } from '../../context/AppContext.jsx';
import { PageHeader, Tabs, KpiStrip, DataTable, StatusPill, Button, Banner, Avatar, ConfirmDialog, PageSkeleton } from '../../components/ui/index.js';
import DetailModal from '../../components/coopc/DetailModal.jsx';
import RecordSaleModal from '../../components/coopc/RecordSaleModal.jsx';
import ProfitIllustration from '../../components/coopc/ProfitIllustration.jsx';
import { VerifyGate, useVerified } from '../../components/coopc/Gate.jsx';
import { TODAY, useCoop, sumBy, fmtQty, farmerName, investorDisplayName } from '../../components/coopc/helpers.js';
import { formatNaira, formatDate, percent } from '../../utils/format.js';
import '../../styles/pages/coopc.css';

const TABS = ['harvests', 'sales', 'distributions', 'obligations'];

export default function Settlements() {
  const { data, user, update, notify, toast } = useApp();
  const { coop, packageIds, pkgById } = useCoop();
  const navigate = useNavigate();
  const loading = useSimulatedLoad(350);
  const verified = useVerified();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'harvests';
  const [view, setView] = useState(null); // { kind: 'harvest' | 'sale' | 'obligation', id }
  const [saleFor, setSaleFor] = useState(null); // { harvestId }
  const [receipt, setReceipt] = useState(null);
  const [saving, setSaving] = useState(false);

  const setTab = (t) => setParams((p) => { const n = new URLSearchParams(p); if (t === 'harvests') n.delete('tab'); else n.set('tab', t); return n; }, { replace: true });
  const closeView = useCallback(() => setView(null), []);
  const closeSale = useCallback(() => setSaleFor(null), []);
  const closeReceipt = useCallback(() => setReceipt(null), []);

  const harvests = useMemo(() => data.harvests.filter((h) => packageIds.has(h.packageId)).map((h) => ({ ...h, pkgName: pkgById[h.packageId]?.name || '-' })), [data.harvests, packageIds, pkgById]);
  const sales = useMemo(() => data.sales.filter((s) => packageIds.has(s.packageId)).map((s) => ({
    ...s, pkgName: pkgById[s.packageId]?.name || '-', crop: data.harvests.find((h) => h.id === s.harvestId)?.crop || '-', net: Math.max(0, s.gross - (s.deductions || 0)),
  })), [data.sales, data.harvests, packageIds, pkgById]);
  const dists = useMemo(() => data.distributions.filter((d) => packageIds.has(d.packageId)).map((d) => ({
    ...d, pkgName: pkgById[d.packageId]?.name || '-', investor: investorDisplayName(data, d.investorId), outstanding: Math.max(0, d.amountDue - d.amountPaid),
  })), [data, packageIds, pkgById]);
  const obligations = useMemo(() => data.obligations.filter((o) => packageIds.has(o.packageId)).map((o) => ({
    ...o, pkgName: pkgById[o.packageId]?.name || '-', farmer: farmerName(data, o.farmerId),
  })), [data, packageIds, pkgById]);

  const paid = sumBy(dists, (d) => d.amountPaid);
  const stillDue = sumBy(dists.filter((d) => d.status !== 'Confirmed'), (d) => d.outstanding);
  const unconfirmed = sales.filter((s) => s.paymentStatus !== 'Confirmed');
  const openObs = obligations.filter((o) => o.status !== 'Confirmed');

  const selected = view && (view.kind === 'harvest' ? harvests : view.kind === 'sale' ? sales : obligations).find((r) => r.id === view.id);

  const confirmReceipt = async () => {
    setSaving(true);
    await simulate(600);
    update('obligations', receipt.id, { status: 'Under Reconciliation', receiptRecordedBy: user.name, receiptRecordedAt: TODAY }, {
      action: 'Farmer obligation receipt recorded', entityType: 'Obligation',
      summary: `${receipt.type} from ${receipt.farmer} recorded as received. Status Pending to Under Reconciliation.`,
      reason: receipt.description,
    });
    notify('admin', 'Farmer obligation receipt to check', `${coop?.name || 'A cooperative'} recorded a ${receipt.type.toLowerCase()} from ${receipt.farmer} for ${receipt.pkgName}. It needs confirming.`, '/admin/reconciliation', 'payment');
    setSaving(false);
    setReceipt(null);
    toast('Receipt recorded as Under Reconciliation. An admin confirms it.');
  };

  if (loading) return <PageSkeleton />;

  const harvestColumns = [
    { key: 'crop', header: 'Crop', sortable: true, render: (h) => (<div><div className="strong">{h.crop}</div><div className="cell-sub">{h.pkgName}</div></div>) },
    {
      key: 'expectedQty', header: 'Expected vs actual', sortable: true,
      render: (h) => (<div><div>{fmtQty(h.actualQty, h.unit)} actual</div><div className="cell-sub">{fmtQty(h.expectedQty, h.unit)} expected{h.actualQty ? ` (${percent(h.actualQty, h.expectedQty)}%)` : ''}</div></div>),
    },
    { key: 'quality', header: 'Quality', render: (h) => h.quality || '-' },
    { key: 'location', header: 'Location', render: (h) => h.location || '-' },
    { key: 'soldQty', header: 'Sold', sortable: true, render: (h) => fmtQty(h.soldQty, h.unit) },
    { key: 'remainingQty', header: 'Remaining', sortable: true, render: (h) => fmtQty(h.remainingQty, h.unit) },
    { key: 'status', header: 'Status', render: (h) => <StatusPill>{h.status}</StatusPill> },
    { key: 'action', header: 'Action', render: (h) => <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setView({ kind: 'harvest', id: h.id }); }}>View</Button> },
  ];

  const saleColumns = [
    { key: 'buyer', header: 'Buyer', sortable: true, render: (s) => (<div><div className="strong">{s.buyer}</div><div className="cell-sub">{s.ref} | {formatDate(s.date)}</div></div>) },
    { key: 'crop', header: 'Crop', render: (s) => (<div><div>{s.crop}</div><div className="cell-sub">{s.pkgName}</div></div>) },
    { key: 'qty', header: 'Quantity', sortable: true, render: (s) => fmtQty(s.qty, s.unit) },
    { key: 'unitPrice', header: 'Unit price', sortable: true, render: (s) => formatNaira(s.unitPrice) },
    { key: 'gross', header: 'Gross value', sortable: true, render: (s) => formatNaira(s.gross) },
    { key: 'deductions', header: 'Deductions', render: (s) => formatNaira(s.deductions) },
    { key: 'outstanding', header: 'Outstanding', sortable: true, render: (s) => formatNaira(s.outstanding) },
    {
      key: 'paymentStatus', header: 'Payment status',
      render: (s) => (<div className="stack-sm" style={{ alignItems: 'flex-start', gap: 4 }}><StatusPill>{s.paymentStatus}</StatusPill><span className="cell-sub">{s.paymentStatus === 'Confirmed' ? 'Received and reconciled' : 'Not received money yet'}</span></div>),
    },
    { key: 'action', header: 'Action', render: (s) => <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setView({ kind: 'sale', id: s.id }); }}>View</Button> },
  ];

  const distColumns = [
    { key: 'investor', header: 'Investor', sortable: true, render: (d) => (<div className="cell-person"><Avatar name={d.investor} size="sm" /><div><div>{d.investor}</div><div className="cell-sub">{d.pkgName}</div></div></div>) },
    { key: 'type', header: 'Type', render: (d) => <StatusPill tone={d.type === 'Principal repayment' ? 'blue' : 'purple'}>{d.type}</StatusPill> },
    { key: 'basis', header: 'Basis', render: (d) => <span className="small">{d.basis}</span> },
    { key: 'amountDue', header: 'Amount due', sortable: true, render: (d) => formatNaira(d.amountDue) },
    { key: 'amountPaid', header: 'Amount paid', sortable: true, render: (d) => formatNaira(d.amountPaid) },
    { key: 'status', header: 'Status', render: (d) => (<div className="stack-sm" style={{ alignItems: 'flex-start', gap: 4 }}><StatusPill>{d.status}</StatusPill>{d.disputed > 0 && <span className="cell-sub danger-text">Disputed {formatNaira(d.disputed)}</span>}</div>) },
    { key: 'dueDate', header: 'Due date', sortable: true, className: 'nowrap', render: (d) => formatDate(d.dueDate) },
    { key: 'action', header: 'Action', render: (d) => <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/coop/settlements/distributions/${d.id}`); }}>View</Button> },
  ];

  const obColumns = [
    { key: 'farmer', header: 'Farmer', sortable: true, render: (o) => (<div className="cell-person"><Avatar name={o.farmer} /><div><div>{o.farmer}</div><div className="cell-sub">{o.farmerId}</div></div></div>) },
    { key: 'pkgName', header: 'Package' },
    { key: 'type', header: 'Obligation', render: (o) => (<div><div className="strong">{o.type}</div><div className="cell-sub">{o.description}</div></div>) },
    { key: 'amount', header: 'Amount', render: (o) => (o.amount ? formatNaira(o.amount) : <span className="muted">Produce, no cash amount</span>) },
    { key: 'dueDate', header: 'Due date', sortable: true, className: 'nowrap', render: (o) => formatDate(o.dueDate) },
    { key: 'status', header: 'Status', render: (o) => <StatusPill>{o.status}</StatusPill> },
    {
      key: 'action', header: 'Actions',
      render: (o) => (
        <div className="row" style={{ gap: 6 }}>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setView({ kind: 'obligation', id: o.id }); }}>View</Button>
          {o.status === 'Pending' && <Button variant="outline-green" size="sm" disabled={!verified} onClick={(e) => { e.stopPropagation(); setReceipt(o); }}>Record receipt</Button>}
        </div>
      ),
    },
  ];

  let modal = null;
  if (selected && view.kind === 'harvest') {
    modal = (
      <DetailModal
        open onClose={closeView} title="Harvest Details" name={selected.crop} sub={selected.pkgName} status={selected.status} sectionTitle="Harvest Information"
        rows={[
          ['Expected quantity', fmtQty(selected.expectedQty, selected.unit)],
          ['Actual quantity', selected.actualQty ? fmtQty(selected.actualQty, selected.unit) : 'Not recorded yet'],
          ['Harvest date', selected.date ? formatDate(selected.date) : '-'],
          ['Quality', selected.quality || '-'],
          ['Storage or delivery location', selected.location || '-'],
          ['Sold', fmtQty(selected.soldQty, selected.unit)],
          ['Remaining', fmtQty(selected.remainingQty, selected.unit)],
          ['Evidence', selected.evidence || 'None added'],
          ['Reviewer', selected.reviewer || 'Not reviewed yet'],
        ]}
        footer={selected.remainingQty > 0 && selected.actualQty > 0 ? (
          <>
            <Button variant="outline" onClick={closeView}>Close</Button>
            <Button disabled={!verified} onClick={() => { setView(null); setSaleFor({ harvestId: selected.id }); }}>Record a sale</Button>
          </>
        ) : undefined}
      >
        {selected.status !== 'Approved' && <Banner tone="info">A reviewer approves each harvest. Until then the quantity is a claim, not a verified figure.</Banner>}
      </DetailModal>
    );
  } else if (selected && view.kind === 'sale') {
    modal = (
      <DetailModal
        open onClose={closeView} title="Sale Details" name={selected.buyer} sub={`${selected.crop}, ${selected.pkgName}`} status={selected.paymentStatus} sectionTitle="Sale Information"
        rows={[
          ['Quantity sold', fmtQty(selected.qty, selected.unit)],
          ['Unit price', formatNaira(selected.unitPrice)],
          ['Gross value', formatNaira(selected.gross)],
          ['Deductions', formatNaira(selected.deductions)],
          ['Net value', formatNaira(selected.net)],
          ['Buyer balance outstanding', formatNaira(selected.outstanding)],
          ['Sale date', formatDate(selected.date)],
          ['Reference', <span key="r" className="coopc-mono">{selected.ref}</span>],
        ]}
      >
        <Banner tone={selected.paymentStatus === 'Confirmed' ? 'success' : 'warn'}>
          {selected.paymentStatus === 'Confirmed'
            ? 'This payment was confirmed by the financial partner and reconciled by an admin.'
            : 'A recorded sale is not money received. It counts as received only after the financial partner confirms it and an admin reconciles it.'}
        </Banner>
      </DetailModal>
    );
  } else if (selected && view.kind === 'obligation') {
    modal = (
      <DetailModal
        open onClose={closeView} title="Settlement Details" name={selected.farmer} sub={`Farmer ID : ${selected.farmerId}`} status={selected.status} sectionTitle="Settlement Information"
        rows={[
          [selected.amount ? 'Amount Due' : 'Produce Due', selected.amount ? formatNaira(selected.amount) : 'Delivery in kind, no cash amount'],
          ['Obligation', `${selected.type}: ${selected.description}`],
          ['Date Due', formatDate(selected.dueDate)],
          ['Package', <Link key="p" to={`/coop/funding/${selected.packageId}`}>{selected.pkgName}</Link>],
          ['Recorded receipt', selected.receiptRecordedAt ? `${selected.receiptRecordedBy}, ${formatDate(selected.receiptRecordedAt)}` : 'Nothing recorded yet'],
          ['Agreement', <Link key="a" to="/coop/contracts">Farmer Participation Agreement</Link>],
        ]}
      >
        <Banner tone="info">Repayment follows the farmer's signed agreement. A poor harvest is not treated as fraud. Talk to the reviewer if a farmer cannot meet an obligation.</Banner>
      </DetailModal>
    );
  }

  return (
    <div className="page coopc-page">
      <PageHeader
        title="Settlements"
        subtitle="Track harvests, sales, investor distributions and what farmers owe."
        actions={(
          <>
            <Button variant="outline" onClick={() => setSaleFor({ harvestId: '' })} disabled={!verified}><HandCoins size={18} />Record sale</Button>
            <Button onClick={() => navigate('/coop/settlements/harvest/new')} disabled={!verified}><Plus size={18} />Record harvest</Button>
          </>
        )}
      />

      <VerifyGate what="record harvests or sales" />
      <Banner tone="green" title="In plain words">
        A harvest is the crop you gather. A sale is the crop sold to a buyer. A distribution is money paid back to investors, either their original money (principal) or a share of profit. A recorded sale is not money received until the financial partner confirms it and an admin reconciles it.
      </Banner>

      <KpiStrip
        cells={[
          { icon: <Landmark size={18} />, label: 'Paid to investors', value: formatNaira(paid), sub: `${dists.filter((d) => d.status === 'Confirmed').length} confirmed distributions` },
          { icon: <Hourglass size={18} />, label: 'Still due to investors', value: formatNaira(stillDue), sub: `${dists.filter((d) => d.status !== 'Confirmed').length} not yet paid` },
          { icon: <Wheat size={18} />, label: 'Sales awaiting confirmation', value: formatNaira(sumBy(unconfirmed, (s) => s.net)), sub: `${unconfirmed.length} ${unconfirmed.length === 1 ? 'sale' : 'sales'}, not counted as received` },
          { icon: <ClipboardList size={18} />, label: 'Open farmer obligations', value: openObs.length, sub: 'Produce or repayments still to come' },
        ]}
      />

      <div className="stack">
        <Tabs
          auto label="Settlement sections" value={tab} onChange={setTab}
          items={[
            { id: 'harvests', label: 'Harvests', count: harvests.length },
            { id: 'sales', label: 'Sales', count: sales.length },
            { id: 'distributions', label: 'Distributions', count: dists.length },
            { id: 'obligations', label: 'Obligations', count: obligations.length },
          ]}
        />

        {tab === 'harvests' && (
          <DataTable
            columns={harvestColumns} rows={harvests} searchKeys={['crop', 'pkgName', 'location', 'quality']} searchPlaceholder="Search harvests"
            filters={[{ key: 'status', allLabel: 'All Status', options: ['Pending', 'Under Review', 'Approved'] }]}
            defaultSort={{ key: 'expectedQty', dir: 'desc' }} onRowClick={(h) => setView({ kind: 'harvest', id: h.id })} totalLabel="harvests"
            emptyTitle="No harvests recorded yet" emptyText="Record a harvest with the quantity, quality and storage place. A reviewer approves it."
            emptyAction={<Button onClick={() => navigate('/coop/settlements/harvest/new')} disabled={!verified}><Plus size={18} />Record harvest</Button>}
          />
        )}

        {tab === 'sales' && (
          <>
            <Banner tone="info" title="The rule for sales">
              A recorded sale is not money received until it is confirmed and reconciled. Confirmed means the financial partner has the money. Reconciled means a CollabFarm admin has matched it to the sale. Only then does it count toward investor distributions.
            </Banner>
            <DataTable
              columns={saleColumns} rows={sales} searchKeys={['buyer', 'ref', 'crop', 'pkgName']} searchPlaceholder="Search buyer, crop or reference"
              filters={[{ key: 'paymentStatus', allLabel: 'All payment status', options: ['Pending', 'Under Reconciliation', 'Confirmed'] }]}
              defaultSort={{ key: 'gross', dir: 'desc' }} onRowClick={(s) => setView({ kind: 'sale', id: s.id })} totalLabel="sales"
              emptyTitle="No sales recorded yet" emptyText="Sales come from a recorded harvest. Record a harvest first, then record what was sold."
              emptyAction={<Button variant="outline" onClick={() => setSaleFor({ harvestId: '' })} disabled={!verified}><HandCoins size={18} />Record sale</Button>}
            />
          </>
        )}

        {tab === 'distributions' && (
          <>
            <DataTable
              columns={distColumns} rows={dists} searchKeys={['investor', 'pkgName', 'basis', 'ref']} searchPlaceholder="Search investor, package or reference"
              filters={[
                { key: 'type', allLabel: 'All types', options: ['Principal repayment', 'Profit distribution'] },
                { key: 'status', allLabel: 'All Status', options: ['Pending', 'Confirmed', 'Overdue'] },
              ]}
              defaultSort={{ key: 'dueDate', dir: 'desc' }} onRowClick={(d) => navigate(`/coop/settlements/distributions/${d.id}`)} totalLabel="distributions"
              emptyTitle="No distributions yet" emptyText="Distributions appear once sales are confirmed and reviewed."
            />
            <ProfitIllustration />
          </>
        )}

        {tab === 'obligations' && (
          <>
            <Banner tone="info" title="Farmer obligations">
              These are produce deliveries or repayments that farmers agreed to in their participation agreement. Recording a receipt sends it to an admin to confirm. It is not marked complete by the cooperative.
            </Banner>
            <DataTable
              columns={obColumns} rows={obligations} searchKeys={['farmer', 'description', 'type', 'pkgName']} searchPlaceholder="Search farmers or obligations"
              filters={[
                { key: 'type', allLabel: 'All types', options: ['Produce delivery', 'Repayment'] },
                { key: 'status', allLabel: 'All Status', options: ['Pending', 'Under Reconciliation', 'Confirmed'] },
              ]}
              defaultSort={{ key: 'dueDate', dir: 'asc' }} onRowClick={(o) => setView({ kind: 'obligation', id: o.id })} totalLabel="obligations"
              emptyTitle="No farmer obligations" emptyText="Produce deliveries and repayments from signed farmer agreements will be listed here."
            />
          </>
        )}
      </div>

      {modal}
      {saleFor && <RecordSaleModal onClose={closeSale} harvestId={saleFor.harvestId} />}
      <ConfirmDialog
        open={!!receipt}
        onClose={closeReceipt}
        onConfirm={confirmReceipt}
        loading={saving}
        tone="green"
        title="Record that this was received?"
        message="This tells the admin team the farmer has met the obligation. They check and confirm it before it counts."
        summary={receipt ? [
          ['Farmer', receipt.farmer],
          ['Obligation', `${receipt.type}: ${receipt.description}`],
          ['Amount', receipt.amount ? formatNaira(receipt.amount) : 'Produce, no cash amount'],
          ['Package', receipt.pkgName],
          ['Approval status', 'Not confirmed yet. Moves to Under Reconciliation'],
        ] : undefined}
        confirmLabel="Record receipt"
      />
    </div>
  );
}
