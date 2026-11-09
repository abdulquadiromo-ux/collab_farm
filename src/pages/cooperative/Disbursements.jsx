import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Banknote, Clock3, SearchCheck, CircleX, Plus, Eye, Copy, ExternalLink } from 'lucide-react';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { PageHeader, KpiStrip, DataTable, StatusPill, Avatar, Button, Banner, EmptyState } from '../../components/ui/index.js';
import DetailModal from '../../components/coopc/DetailModal.jsx';
import DisbursementRequest from '../../components/coopc/DisbursementRequest.jsx';
import RowMenu from '../../components/coopc/RowMenu.jsx';
import { VerifyGate, useVerified } from '../../components/coopc/Gate.jsx';
import { useCoop, daysFromToday, sumBy, trancheShort } from '../../components/coopc/helpers.js';
import { formatNaira, formatDate } from '../../utils/format.js';
import { disbursementLabel } from '../../utils/status.js';
import { needsSecondApprover } from '../../utils/rules.js';
import '../../styles/pages/coopc.css';

const STATUS_OPTIONS = ['Disbursed', 'Reviewing', 'Pending', 'Rejected'];
const PERIODS = [
  { value: 'month', label: 'This month' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];
const inPeriod = (date, period) => {
  const d = daysFromToday(date);
  if (d == null) return false;
  if (period === 'month') return String(date).slice(0, 7) === '2026-10';
  return d <= 0 && d >= -Number(period);
};

export default function Disbursements() {
  const { data, toast } = useApp();
  const { packageIds, pkgById, packages } = useCoop();
  const navigate = useNavigate();
  const loading = useSimulatedLoad(350);
  const verified = useVerified();
  const [params, setParams] = useSearchParams();
  const [requestOpen, setRequestOpen] = useState(params.get('request') === '1');
  const viewId = params.get('view');

  const closeRequest = useCallback(() => setRequestOpen(false), []);
  const closeView = useCallback(() => setParams((p) => { const n = new URLSearchParams(p); n.delete('view'); return n; }, { replace: true }), [setParams]);
  const copyRef = (ref) => {
    const done = () => toast(`Reference ${ref} copied`, 'info');
    const failed = () => toast(`Could not copy it automatically. The reference is ${ref}`, 'info');
    try { navigator.clipboard.writeText(ref).then(done, failed); } catch { failed(); }
  };
  const openView = (id) => setParams((p) => { const n = new URLSearchParams(p); n.set('view', id); return n; });

  const rows = useMemo(
    () => data.disbursements
      .filter((d) => packageIds.has(d.packageId))
      .map((d) => ({ ...d, pkgName: pkgById[d.packageId]?.name || 'Unknown package' })),
    [data.disbursements, packageIds, pkgById],
  );

  const kpi = useMemo(() => {
    const by = (s) => rows.filter((r) => r.status === s);
    const cell = (list) => ({ value: sumBy(list, (r) => r.amount), count: list.length });
    return { disbursed: cell(by('Disbursed')), pending: cell(by('Pending')), review: cell(by('Reviewing')), rejected: cell(by('Rejected')) };
  }, [rows]);

  const selected = viewId ? rows.find((r) => r.id === viewId) : null;
  const categories = [...new Set(rows.map((r) => r.category))].filter(Boolean);
  const plural = (n) => `${n} ${n === 1 ? 'payment' : 'payments'}`;

  const columns = [
    {
      key: 'recipientName', header: 'Recipient', sortable: true,
      render: (r) => (
        <div className="cell-person">
          <Avatar name={r.recipientName} />
          <div>
            <div>{r.recipientName}</div>
            <div className="cell-sub">{r.recipientType}</div>
          </div>
        </div>
      ),
    },
    { key: 'purpose', header: 'Purpose', render: (r) => (<div><div className="strong">{r.purpose}</div><div className="cell-sub">{r.category}</div></div>) },
    { key: 'pkgName', header: 'Package', sortable: true },
    { key: 'amount', header: 'Amount', sortable: true, render: (r) => formatNaira(r.amount) },
    { key: 'date', header: 'Date', sortable: true, className: 'nowrap', render: (r) => formatDate(r.date) },
    { key: 'status', header: 'Status', render: (r) => <StatusPill>{disbursementLabel(r)}</StatusPill> },
    { key: 'ref', header: 'Reference', render: (r) => <span className="coopc-mono">{r.ref}</span> },
    {
      key: 'actions', header: 'Actions',
      render: (r) => (
        <div className="row" style={{ gap: 4 }}>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openView(r.id); }}>View</Button>
          <RowMenu
            label={`Actions for ${r.recipientName}`}
            items={[
              { label: 'View details', icon: <Eye size={16} />, onClick: () => openView(r.id) },
              { label: 'Open funding package', icon: <ExternalLink size={16} />, onClick: () => navigate(`/coop/funding/${r.packageId}`) },
              { label: 'Copy reference', icon: <Copy size={16} />, onClick: () => copyRef(r.ref) },
            ]}
          />
        </div>
      ),
    },
  ];

  const filters = [
    { key: 'category', allLabel: 'All Package Types', options: categories },
    { key: 'status', allLabel: 'All Status', options: STATUS_OPTIONS },
    { key: 'period', allLabel: 'All dates', options: PERIODS, match: (r, v) => inPeriod(r.date, v) },
  ];

  const detail = selected && (() => {
    const tr = data.tranches.find((t) => t.id === selected.trancheId && t.packageId === selected.packageId);
    const done = selected.status === 'Disbursed';
    const second = needsSecondApprover(selected.amount, data.platformSettings?.approvalLimits);
    const farmerId = selected.recipientType === 'Farmer' ? selected.recipientId : null;
    return (
      <DetailModal
        open
        onClose={closeView}
        title="Disbursement Details"
        name={selected.recipientName}
        sub={`${selected.recipientType} ID : ${selected.recipientId}`}
        status={selected.status}
        sectionTitle="Disbursement Information"
        rows={[
          [done ? 'Amount Disbursed' : 'Amount Requested', formatNaira(selected.amount)],
          [done ? 'Date Disbursed' : 'Date Requested', formatDate(selected.date)],
          ['Recorded by', selected.recordedBy || '-'],
          ['Transaction Reference', <span key="r" className="coopc-mono">{selected.ref}</span>],
          ['Purpose', selected.purpose],
          ['Package', <Link key="p" to={`/coop/funding/${selected.packageId}`}>{selected.pkgName}</Link>],
          ['Paid from tranche', tr ? `${trancheShort(tr)} (${tr.status})` : 'Not linked to a tranche'],
          ['Destination', selected.destination || 'To be confirmed by the financial partner'],
          ['Approvals', selected.approvals?.length
            ? (
              <ul className="coopc-plain-list">
                {selected.approvals.map((a, i) => <li key={i}><strong>{a.by}</strong>, {a.role}</li>)}
              </ul>
            )
            : 'No approvals recorded yet'],
        ]}
        footer={farmerId ? (<Button variant="outline" onClick={() => navigate(`/coop/farmers/${farmerId}`)}>Open farmer record</Button>) : undefined}
      >
        {selected.status === 'Pending' || selected.status === 'Reviewing' ? (
          <Banner tone="info">
            {second ? 'This amount needs two different approvers. ' : ''}Payment is made by the financial partner after admin approval. The cooperative never pays from this screen.
          </Banner>
        ) : selected.status === 'Rejected' ? (
          <Banner tone="warn">This request was not approved. You can raise a new request with corrected details, or open a complaint if you disagree.</Banner>
        ) : (
          <Banner tone="success">Paid by the financial partner and recorded after approval by the people listed above.</Banner>
        )}
      </DetailModal>
    );
  })();

  return (
    <div className="page coopc-page">
      <PageHeader
        title="Disbursements"
        subtitle="Track funds released from your funded packages to farmers, suppliers and the cooperative."
        actions={(
          <Button onClick={() => setRequestOpen(true)} disabled={!verified}><Plus size={18} />Request disbursement</Button>
        )}
      />

      <VerifyGate what="request disbursements" />
      <Banner tone="green" title="How disbursements work">
        A disbursement is a payment out of the project funds. You can request one, but you cannot make or approve it. A CollabFarm admin reviews the request, and the regulated financial partner makes the payment after approval. Money is released in stages called tranches, only when the evidence for the earlier stage is approved.
      </Banner>

      <KpiStrip
        cells={[
          { icon: <Banknote size={18} />, label: 'Total Disbursed', value: loading ? '...' : formatNaira(kpi.disbursed.value), sub: plural(kpi.disbursed.count) + ' confirmed paid' },
          { icon: <Clock3 size={18} />, label: 'Pending', value: loading ? '...' : formatNaira(kpi.pending.value), sub: plural(kpi.pending.count) + ' waiting for approval' },
          { icon: <SearchCheck size={18} />, label: 'Under Review', value: loading ? '...' : formatNaira(kpi.review.value), sub: plural(kpi.review.count) + ' being checked' },
          { icon: <CircleX size={18} />, label: 'Rejected', value: loading ? '...' : formatNaira(kpi.rejected.value), sub: plural(kpi.rejected.count) + ' not approved' },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        searchKeys={(r) => [r.recipientName, r.purpose, r.pkgName, r.ref, r.category, r.recipientType].join(' ')}
        searchPlaceholder="Search by recipient, purpose, package or reference"
        filters={filters}
        defaultSort={{ key: 'date', dir: 'desc' }}
        onRowClick={(r) => openView(r.id)}
        totalLabel="disbursements"
        emptyTitle="No disbursements yet"
        emptyText="Payments to farmers, suppliers and your cooperative will appear here once a request is made."
        emptyAction={<Button onClick={() => setRequestOpen(true)} disabled={!verified}><Plus size={18} />Request disbursement</Button>}
      />

      {!loading && packages.length === 0 && (
        <EmptyState title="No funding packages yet" action={<Link className="btn btn--primary" to="/coop/funding">Go to Funding</Link>}>
          Disbursements are made from a funded package. Create one first.
        </EmptyState>
      )}

      {detail}
      {requestOpen && <DisbursementRequest onClose={closeRequest} defaultPackageId={packages.find((p) => p.status === 'Active')?.id || ''} />}
    </div>
  );
}
