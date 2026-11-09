import { useMemo, useState } from 'react';
import { Scale, CheckCircle2, Clock, RefreshCw, XCircle, Upload, Flag } from 'lucide-react';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { PageHeader, Card, KpiStrip, DataTable, StatusPill, Banner, SearchInput, FilterSelect, Button, PageSkeleton } from '../../components/ui/index.js';
import { formatNaira, formatDateShort } from '../../utils/format.js';
import { sum } from '../../utils/rules.js';
import { useQueryState, pkgName } from '../../components/admb/lib.js';
import { Glossary, InfoLine, DiffAmount, PkgLink } from '../../components/admb/ui.jsx';
import ReconDetail from '../../components/admb/ReconDetail.jsx';
import StatementImport from '../../components/admb/StatementImport.jsx';
import '../../styles/pages/admb.css';

const TYPES = ['Investor receipt', 'Disbursement to supplier', 'Disbursement to farmers', 'Sale receipt'];
const STATUSES = ['Confirmed', 'Pending', 'Under Reconciliation', 'Failed'];

export default function Reconciliation() {
  const loading = useSimulatedLoad(350);
  const { data } = useApp();
  const [f, setF] = useQueryState(['q', 'status', 'type', 'pkg', 'diff', 'open']);
  const [importOpen, setImportOpen] = useState(false);
  const [sixPkg, setSixPkg] = useState('');

  const rows = useMemo(() => data.reconciliation.map((r) => ({ ...r, diff: r.internal - r.provider, pkgLabel: pkgName(data, r.packageId) })), [data]);
  const filtered = rows.filter((r) => {
    const q = f.q.trim().toLowerCase();
    if (q && ![r.ref, r.providerRef, r.pkgLabel, r.type].join(' ').toLowerCase().includes(q)) return false;
    if (f.status && r.status !== f.status) return false;
    if (f.type && r.type !== f.type) return false;
    if (f.pkg && r.packageId !== f.pkg) return false;
    if (f.diff === 'yes' && !(r.diff !== 0 && r.status !== 'Confirmed')) return false;
    return true;
  });

  const count = (s) => rows.filter((r) => r.status === s);
  const pkgsWithRecords = data.packages.filter((p) => rows.some((r) => r.packageId === p.id));

  const invs = data.investments.filter((i) => !sixPkg || i.packageId === sixPkg);
  const six = [
    { label: 'Intended to invest', value: sum(invs, (i) => i.intended), sub: 'What investors said they plan to put in' },
    { label: 'Formally committed', value: sum(invs, (i) => i.committed), sub: 'Signed up under the agreement' },
    { label: 'Confirmed received', value: sum(invs, (i) => i.confirmed), sub: 'The financial partner confirmed it' },
    { label: 'Available to pay out', value: sum(invs, (i) => i.available), sub: 'Confirmed and not yet paid out' },
    { label: 'Actually disbursed', value: sum(invs, (i) => i.disbursed), sub: 'Paid out and confirmed' },
    { label: 'Repaid or distributed', value: sum(invs, (i) => i.repaid), sub: 'Returned to investors' },
  ];

  if (loading) return <PageSkeleton />;

  const columns = [
    { key: 'ref', header: 'Reference', sortable: true, render: (r) => (<div><div className="strong admb-nowrap">{r.ref}</div><div className="cell-sub"><PkgLink id={r.packageId} name={r.pkgLabel} /></div></div>) },
    { key: 'type', header: 'Type', sortable: true, render: (r) => <span className="admb-nowrap">{r.type}</span> },
    { key: 'internal', header: 'Our records', sortable: true, align: 'right', render: (r) => <span className="admb-mono admb-nowrap">{formatNaira(r.internal)}</span> },
    {
      key: 'provider', header: 'Partner reports', sortable: true, align: 'right', render: (r) => (
        <div className="admb-diffcell" style={{ alignItems: 'flex-end' }}>
          <span className="admb-mono admb-nowrap">{r.provider > 0 || r.providerRef ? formatNaira(r.provider) : 'Nothing yet'}</span>
          <span className="cell-sub admb-nowrap">{r.providerRef ? `Ref ${r.providerRef}` : 'No partner reference'}</span>
        </div>
      ),
    },
    {
      key: 'diff', header: 'Difference', sortable: true, sortValue: (r) => Math.abs(r.diff), render: (r) => (
        <div className="admb-diffcell">
          {r.diff !== 0 && <span className={`admb-mono admb-nowrap ${r.status !== 'Confirmed' ? 'admb-diff' : ''}`}>{formatNaira(Math.abs(r.diff))}</span>}
          <DiffAmount diff={r.diff} status={r.status} correction={r.correction} />
        </div>
      ),
    },
    {
      key: 'status', header: 'Status', sortable: true, render: (r) => (
        <div className="admb-pillrow"><StatusPill>{r.status}</StatusPill>{r.exception && <span className="admb-flag admb-flag--red"><Flag size={12} aria-hidden="true" /> Exception</span>}</div>
      ),
    },
    { key: 'reconciledAt', header: 'Reconciled', sortable: true, sortValue: (r) => r.reconciledAt || '', render: (r) => (r.reconciledBy ? (<div><div className="small">{r.reconciledBy}</div><div className="cell-sub">{formatDateShort(r.reconciledAt)}</div></div>) : <span className="muted">Not yet</span>) },
    { key: 'open', header: '', render: (r) => <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setF('open', r.id); }}>Review</Button> },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Funding and payment reconciliation"
        subtitle="Match what our records say with what the financial partner reports."
        actions={<Button variant="outline-green" onClick={() => setImportOpen(true)}><Upload size={18} />Import partner statement (simulation)</Button>}
      />

      <Banner tone="info" title="What reconciliation means">
        Reconciliation means matching what our records say with what the financial partner reports. A payment initiation is not proof of receipt, and a commitment is not received money. Only the partner report confirms that money has moved.
      </Banner>

      <KpiStrip cells={[
        { icon: <CheckCircle2 size={18} />, label: 'Confirmed', value: count('Confirmed').length, sub: `${formatNaira(sum(count('Confirmed'), (r) => r.provider), { compact: true })} matched with the partner` },
        { icon: <Clock size={18} />, label: 'Pending', value: count('Pending').length, sub: `${formatNaira(sum(count('Pending'), (r) => r.internal), { compact: true })} waiting for the partner` },
        { icon: <RefreshCw size={18} />, label: 'Under reconciliation', value: count('Under Reconciliation').length, sub: `${count('Under Reconciliation').filter((r) => r.diff !== 0).length} with a difference` },
        { icon: <XCircle size={18} />, label: 'Failed', value: count('Failed').length, sub: `${formatNaira(sum(count('Failed'), (r) => r.internal), { compact: true })} not paid, retry is safe` },
      ]}
      />

      <Card>
        <div className="admb-head">
          <div>
            <h2 className="admb-card-title">Six amounts, tracked separately</h2>
            <p className="admb-card-sub">Each figure answers a different question. They should never be added together or confused.</p>
          </div>
          <FilterSelect value={sixPkg} onChange={setSixPkg} allLabel="All projects" label="Project for the six amounts" options={pkgsWithInvestments(data)} />
        </div>
        <KpiStrip columns={6} cells={six.map((s, i) => ({ icon: <Scale size={16} />, label: s.label, value: formatNaira(s.value, { compact: true }), sub: s.sub, key: i }))} />
      </Card>

      <Glossary terms={[
        ['Our records', 'The amount the platform expected: an investor commitment, a payment instruction or a recorded sale.'],
        ['Partner reports', 'The amount the regulated financial partner says it received or paid. This is the proof.'],
        ['Difference', 'Our records minus the partner report. A fee, a part payment or a mistake can cause one.'],
        ['Correcting entry', 'A new line that explains a difference. The original record is never changed or deleted.'],
        ['Exception', 'A flag that keeps an item open for follow up. It does not change any amount.'],
        ['Idempotency', 'A safeguard so retrying a failed payment cannot send the money twice.'],
      ]}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={8}
        totalLabel="records"
        emptyTitle="No reconciliation records yet"
        emptyText="Records appear here when an investor commits funds, a payment is sent or a sale is recorded."
        onRowClick={(r) => setF('open', r.id)}
        toolbarLeft={<SearchInput value={f.q} onChange={(v) => setF('q', v)} placeholder="Search reference or project" />}
        toolbarExtra={(
          <div className="admb-toolbar-filters">
            <FilterSelect value={f.status} onChange={(v) => setF('status', v)} allLabel="All statuses" options={STATUSES} />
            <FilterSelect value={f.type} onChange={(v) => setF('type', v)} allLabel="All types" options={TYPES} />
            <FilterSelect value={f.pkg} onChange={(v) => setF('pkg', v)} allLabel="All projects" options={pkgsWithRecords.map((p) => ({ value: p.id, label: p.name }))} />
            <FilterSelect value={f.diff} onChange={(v) => setF('diff', v)} allLabel="With or without difference" options={[{ value: 'yes', label: 'Open differences only' }]} />
          </div>
        )}
      />
      <InfoLine>Open differences are shown in red with words as well as colour. Select a row to see both sides, then confirm, mark an exception or request a partner statement.</InfoLine>

      {f.open && <ReconDetail id={f.open} onClose={() => setF('open', '')} />}
      <StatementImport open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

function pkgsWithInvestments(data) {
  return data.packages.filter((p) => data.investments.some((i) => i.packageId === p.id)).map((p) => ({ value: p.id, label: p.name }));
}
