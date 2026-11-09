import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Download, FlaskConical, Hourglass, Receipt } from 'lucide-react';
import { Banner, Button, Card, DataTable, KpiStrip, PageHeader, PageSkeleton, SearchInput, StatusPill } from '../../components/ui/index.js';
import { useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatNaira, formatDateShort, formatTime } from '../../utils/format.js';
import { useInvestor, useWalletActions } from '../../components/inv/useInvestor.js';
import { InvSelect } from '../../components/inv/InvSelect.jsx';
import { InvDatePicker } from '../../components/inv/InvDatePicker.jsx';
import { TxStatusLegend, UnverifiedBanner } from '../../components/inv/Common.jsx';
import { TX_STATUSES, downloadCsv, isoDay, sumBy, txSign } from '../../components/inv/invData.js';
import '../../styles/pages/inv.css';

const OPEN = ['Initiated', 'Pending'];

export default function Transactions() {
  const loading = useSimulatedLoad(350);
  const { data, investor, pkgById, toast } = useInvestor();
  const { simulateConfirm } = useWalletActions();
  const [params, setParams] = useSearchParams();
  const type = params.get('type') || '';
  const status = params.get('status') || '';
  const q = params.get('q') || '';
  const [range, setRange] = useState({ from: '', to: '' });
  const [busy, setBusy] = useState('');
  const setParam = (k, v) => { const next = new URLSearchParams(params); if (v) next.set(k, v); else next.delete(k); setParams(next, { replace: true }); };

  const ledger = useMemo(() => data.transactions.filter((t) => t.partyId === investor?.id).sort((a, b) => String(b.date).localeCompare(String(a.date))), [data.transactions, investor]);
  const types = useMemo(() => [...new Set(ledger.map((t) => t.type))].sort().map((v) => ({ value: v, label: v })), [ledger]);
  const marks = useMemo(() => {
    const m = {};
    ledger.forEach((t) => { const k = isoDay(t.date); m[k] = OPEN.includes(t.status) ? 'pending' : m[k] === 'pending' ? 'pending' : 'ok'; });
    return m;
  }, [ledger]);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return ledger.filter((t) => (!type || t.type === type) && (!status || t.status === status)
      && (!range.from || isoDay(t.date) >= range.from) && (!range.to || isoDay(t.date) <= range.to)
      && (!term || [t.ref, t.type, t.note, pkgById[t.packageId]?.name].join(' ').toLowerCase().includes(term)));
  }, [ledger, type, status, range, q, pkgById]);

  if (loading) return <PageSkeleton />;

  const paidIn = sumBy(ledger.filter((t) => t.status === 'Confirmed' && ['Deposit', 'Funding confirmation'].includes(t.type)), (t) => t.amount);
  const paidBack = sumBy(ledger.filter((t) => ['Confirmed', 'Refunded'].includes(t.status) && ['Distribution', 'Refund', 'Withdrawal'].includes(t.type)), (t) => t.amount);
  const waiting = sumBy(ledger.filter((t) => ['Initiated', 'Pending', 'Under Reconciliation'].includes(t.status)), (t) => t.amount);

  const simulate = async (tx) => {
    setBusy(tx.id);
    try {
      await simulateConfirm(tx);
      toast(`Demo only: ${tx.ref} marked Confirmed. In real use only the financial partner can do this.`, 'info');
    } catch {
      toast('The demo confirmation did not run. Please try again.', 'error');
    } finally {
      setBusy('');
    }
  };

  const exportCsv = () => downloadCsv('transactions.csv', [
    { header: 'Date', value: (t) => t.date },
    { header: 'Reference', value: (t) => t.ref },
    { header: 'Type', value: (t) => t.type },
    { header: 'Package', value: (t) => pkgById[t.packageId]?.name || '' },
    { header: 'Your side', value: (t) => (txSign(t) > 0 ? 'Money to you' : 'Money from you') },
    { header: 'Amount', value: (t) => t.amount },
    { header: 'Status', value: (t) => t.status },
    { header: 'Note', value: (t) => t.note },
  ], rows);

  const columns = [
    { key: 'date', header: 'Date', render: (t) => (<><div className="strong nowrap">{formatDateShort(t.date)}</div><div className="cell-sub">{formatTime(t.date)}</div></>) },
    { key: 'ref', header: 'Reference', render: (t) => <span className="nowrap">{t.ref}</span> },
    { key: 'type', header: 'Type', render: (t) => t.type },
    { key: 'pkg', header: 'Package', render: (t) => pkgById[t.packageId]?.name || <span className="cell-sub">Wallet</span> },
    { key: 'amount', header: 'Amount', render: (t) => <span className={txSign(t) > 0 ? 'inv-amt-in' : 'inv-amt-out'}>{txSign(t) > 0 ? '+' : '-'}{formatNaira(t.amount)}</span> },
    { key: 'status', header: 'Status', render: (t) => <StatusPill>{t.status}</StatusPill> },
    { key: 'note', header: 'Note', render: (t) => <span className="small muted" style={{ display: 'block', maxWidth: 280 }}>{t.note}</span> },
    {
      key: 'demo',
      header: 'Demo',
      render: (t) => (OPEN.includes(t.status) ? (
        <Button size="sm" variant="outline" className="inv-sim" loading={busy === t.id} onClick={() => simulate(t)} aria-label={`Demo only: simulate partner confirmation for ${t.ref}`}>
          <FlaskConical size={14} />Demo only: simulate partner confirmation
        </Button>
      ) : null),
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Transactions" subtitle="Every money movement on your account, with its status. A payment initiation is not proof of receipt." />
      <UnverifiedBanner investor={investor} />
      <KpiStrip cells={[
        { icon: <Receipt size={18} />, label: 'Entries', value: ledger.length, sub: 'On your ledger' },
        { icon: <ArrowUpRight size={18} />, label: 'Paid in by you', value: formatNaira(paidIn), sub: 'Deposits and funding the partner confirmed' },
        { icon: <ArrowDownLeft size={18} />, label: 'Paid back to you', value: formatNaira(paidBack), sub: 'Distributions, refunds and withdrawals' },
        { icon: <Hourglass size={18} />, label: 'Waiting for the partner', value: formatNaira(waiting), sub: 'Not yet received money' },
      ]}
      />

      <Card>
        <details open={typeof window !== 'undefined' && window.innerWidth > 720}>
          <summary className="card__title" style={{ cursor: 'pointer' }}>What each status means</summary>
          <p className="muted small" style={{ margin: '6px 0 var(--s-3)' }}>Plain language guide. Reconciliation means matching our record against the partner's statement, line by line.</p>
          <TxStatusLegend />
        </details>
      </Card>

      <Banner tone="info">Rows marked Initiated or Pending have a <span className="inv-demo-tag"><FlaskConical size={12} />Demo only</span> button. In a real system only the financial partner confirms receipt. Here it stands in for the partner so you can see the effect on your balance.</Banner>

      <DataTable
        rows={rows}
        columns={columns}
        pageSize={10}
        totalLabel="transactions"
        emptyTitle={ledger.length ? 'No transactions match your filters' : 'No transactions yet'}
        emptyText="Funding your wallet or committing to a package will create entries here."
        toolbarLeft={(
          <>
            <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search transactions" />
            <InvDatePicker value={range} onChange={setRange} marks={marks} alignLeft label="Date range" />
          </>
        )}
        toolbarExtra={(
          <>
            <InvSelect label="Type" value={type} onChange={(v) => setParam('type', v)} allLabel="All Types" options={types} />
            <InvSelect label="Status" value={status} onChange={(v) => setParam('status', v)} allLabel="All Status" options={TX_STATUSES.map((v) => ({ value: v, label: v }))} />
            <Button variant="outline-green" onClick={exportCsv} disabled={!rows.length}><Download size={16} />Export CSV</Button>
          </>
        )}
      />
    </div>
  );
}
