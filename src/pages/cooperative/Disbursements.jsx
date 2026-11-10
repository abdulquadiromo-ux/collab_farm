import { useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Banknote, Clock3, CalendarDays, Files, Eye, Copy, ExternalLink } from 'lucide-react';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { PageHeader, KpiStrip, DataTable, Avatar, Button, EmptyState, Modal, InfoList, StatusPill } from '../../components/ui/index.js';
import RowMenu from '../../components/coopc/RowMenu.jsx';
import { useCoop, daysFromToday, sumBy, trancheShort } from '../../components/coopc/helpers.js';
import { formatNaira, formatDate } from '../../utils/format.js';
import { trancheAmounts } from '../../components/coopb/logic.js';
import '../../styles/pages/coopc.css';

const STATUS_OPTIONS = ['Disbursed', 'Reviewing', 'Pending', 'Rejected'];
const PERIODS = [
  { value: 'month', label: 'This month' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];
const currentMonth = new Date().toISOString().slice(0, 7);
const inPeriod = (date, period) => {
  const d = daysFromToday(date);
  if (d == null) return false;
  if (period === 'month') return String(date).slice(0, 7) === currentMonth;
  return d <= 0 && d >= -Number(period);
};

export default function Disbursements() {
  const { data, toast } = useApp();
  const { packageIds, pkgById, packages } = useCoop();
  const navigate = useNavigate();
  const loading = useSimulatedLoad(350);
  const [params, setParams] = useSearchParams();
  const viewId = params.get('view');

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
      .map((d) => {
        const pkg = pkgById[d.packageId];
        return {
          ...d,
          pkg,
          pkgName: pkg?.name || 'Unknown package',
          pkgCategory: pkg?.category || '-',
          tranche: data.tranches.find((t) => t.id === d.trancheId && t.packageId === d.packageId) || null,
        };
      }),
    [data.disbursements, data.tranches, packageIds, pkgById],
  );

  const kpi = useMemo(() => {
    const by = (s) => rows.filter((r) => r.status === s);
    const cell = (list) => ({ value: sumBy(list, (r) => r.amount), count: list.length });
    const disbursed = by('Disbursed');
    const pending = [...by('Pending'), ...by('Reviewing')];
    return {
      disbursed: cell(disbursed),
      pending: cell(pending),
      thisMonth: cell(disbursed.filter((r) => String(r.date).slice(0, 7) === currentMonth)),
      totalCount: rows.length,
    };
  }, [rows]);

  const selected = viewId ? rows.find((r) => r.id === viewId) : null;
  const categories = [...new Set(rows.map((r) => r.pkgCategory))].filter((c) => c && c !== '-');
  const plural = (n) => `${n} ${n === 1 ? 'payment' : 'payments'}`;

  const columns = [
    {
      key: 'recipientName', header: 'Farmers', sortable: true,
      render: (r) => (
        <div className="cell-person">
          <Avatar name={r.recipientName} />
          <div>
            <div className="strong">{r.recipientName}</div>
            <div className="cell-sub">{r.recipientType}</div>
          </div>
        </div>
      ),
    },
    { key: 'pkgName', header: 'Package', sortable: true },
    { key: 'amount', header: 'Amount disbursed', sortable: true, render: (r) => formatNaira(r.amount) },
    { key: 'date', header: 'Disbursement date', sortable: true, className: 'nowrap', render: (r) => formatDate(r.date) },
    { key: 'pkgCategory', header: 'Package category', sortable: true },
    { key: 'tranche', header: 'Current tranche', render: (r) => r.tranche ? `${trancheShort(r.tranche)} (${r.tranche.status})` : '—' },
    {
      key: 'actions', header: 'Action',
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
    { key: 'pkgCategory', allLabel: 'All Package Types', options: categories },
    { key: 'status', allLabel: 'All Status', options: STATUS_OPTIONS },
    { key: 'period', allLabel: 'All dates', options: PERIODS, match: (r, v) => inPeriod(r.date, v) },
  ];

  const detail = selected && (() => {
    const done = selected.status === 'Disbursed';
    const farmerId = selected.recipientType === 'Farmer' ? selected.recipientId : null;
    const recordedTranches = data.tranches.filter((t) => t.packageId === selected.packageId).sort((a, b) => a.number - b.number);
    const tranches = recordedTranches.length ? recordedTranches : trancheAmounts(selected.pkg?.amount || 0, selected.pkg?.category).map((t) => ({ ...t, status: 'Locked' }));
    const currentTranche = tranches.find((t) => t.id === selected.trancheId) || tranches.find((t) => t.status !== 'Released');
    return (
      <Modal
        open
        onClose={closeView}
        title="Disbursement details"
        wide
        white
        footer={(
          <>
            <Button variant="outline" onClick={closeView}>Close</Button>
            {farmerId && <Button variant="outline" onClick={() => navigate(`/coop/farmers/${farmerId}`)}>Open farmer</Button>}
            <Link className="btn btn--primary" to={`/coop/funding/${selected.packageId}`} onClick={closeView}>View package</Link>
          </>
        )}
      >
        <div className="stack">
          <InfoList compact items={[
            ['Reference', selected.ref],
            ['Package', selected.pkgName],
            ['Recipient', `${selected.recipientName} (${selected.recipientType})`],
            ['Status', <StatusPill key="status">{selected.status}</StatusPill>],
            [done ? 'Amount disbursed' : 'Amount requested', formatNaira(selected.amount)],
            [done ? 'Date disbursed' : 'Date requested', formatDate(selected.date)],
            ['Package category', selected.pkgCategory || '-'],
          ]} />
          <div className="coopb-six" aria-label="Package tranches">
            {tranches.map((tranche) => (
              <div key={tranche.id || tranche.number} className={`coopb-six__row${tranche.id === currentTranche?.id || (!tranche.id && tranche.number === currentTranche?.number) ? ' coopb-six__row--key' : ''}`}>
                <span className="coopb-six__no">{tranche.number}</span>
                <div>
                  <div className="strong small">T{tranche.number} {tranche.name}</div>
                  <div className="caption muted">{tranche.status || 'Locked'}{(tranche.id === currentTranche?.id || (!tranche.id && tranche.number === currentTranche?.number)) ? ' · Current tranche' : ''}</div>
                </div>
                <div className="coopb-six__val">{formatNaira(tranche.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    );
  })();

  return (
    <div className="page coopc-page">
      <PageHeader
        title="Disbursements"
        subtitle="Track funds released from your funded packages to farmers, suppliers and the cooperative."
      />

      <KpiStrip
        cells={[
          { icon: <Banknote size={18} />, label: 'Total Disbursed', value: loading ? '...' : formatNaira(kpi.disbursed.value), sub: plural(kpi.disbursed.count) + ' confirmed paid' },
          { icon: <Clock3 size={18} />, label: 'Pending Disbursement', value: loading ? '...' : formatNaira(kpi.pending.value), sub: plural(kpi.pending.count) + ' awaiting approval or review' },
          { icon: <CalendarDays size={18} />, label: 'This Month Disbursement', value: loading ? '...' : formatNaira(kpi.thisMonth.value), sub: plural(kpi.thisMonth.count) + ' paid this month' },
          { icon: <Files size={18} />, label: 'Total Number of Disbursements', value: loading ? '...' : kpi.totalCount, sub: 'All recorded disbursements' },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        searchKeys={(r) => [r.pkgName, r.pkgCategory, r.recipientName, r.purpose, r.ref].join(' ')}
        searchPlaceholder="Search by recipient, purpose, package or reference"
        filters={filters}
        defaultSort={{ key: 'date', dir: 'desc' }}
        onRowClick={(r) => openView(r.id)}
        totalLabel="disbursements"
        emptyTitle="No disbursements yet"
        emptyText="Payments to farmers, suppliers and your cooperative will appear here once a request is made."
      />

      {!loading && packages.length === 0 && (
        <EmptyState title="No funding packages yet" action={<Link className="btn btn--primary" to="/coop/funding">Go to Funding</Link>}>
          Disbursements are made from a funded package. Create one first.
        </EmptyState>
      )}

      {detail}
    </div>
  );
}
