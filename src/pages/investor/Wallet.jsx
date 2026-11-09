import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, FlaskConical, Hourglass, Lock, Plus, ShieldCheck, Wallet as WalletIcon } from 'lucide-react';
import { Button, Card, CardHeader, DataTable, PageHeader, PageSkeleton, StatusPill, Banner } from '../../components/ui/index.js';
import { LinkButton } from '../../components/ui/Button.jsx';
import { useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatNaira, formatDateShort, formatTime } from '../../utils/format.js';
import { useInvestor, useWalletActions } from '../../components/inv/useInvestor.js';
import { FundWalletModal, WithdrawModal } from '../../components/inv/WalletModals.jsx';
import { InvSelect } from '../../components/inv/InvSelect.jsx';
import { InvDatePicker } from '../../components/inv/InvDatePicker.jsx';
import { KpiLink, SixAmountsDiagram, UnverifiedBanner } from '../../components/inv/Common.jsx';
import { isoDay, sumBy, txSign } from '../../components/inv/invData.js';
import '../../styles/pages/inv.css';

const OPEN = ['Initiated', 'Pending'];

export default function Wallet() {
  const loading = useSimulatedLoad(350);
  const { data, investor, wallet, investments, pkgById, toast } = useInvestor();
  const { simulateConfirm } = useWalletActions();
  const [fundOpen, setFundOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [range, setRange] = useState({ from: '', to: '' });
  const [type, setType] = useState('');
  const [busy, setBusy] = useState('');
  const closeFund = useCallback(() => setFundOpen(false), []);
  const closeWithdraw = useCallback(() => setWithdrawOpen(false), []);

  const ledger = useMemo(() => data.transactions.filter((t) => t.partyId === investor?.id).sort((a, b) => String(b.date).localeCompare(String(a.date))), [data.transactions, investor]);
  const marks = useMemo(() => {
    const m = {};
    ledger.forEach((t) => { const k = isoDay(t.date); m[k] = OPEN.includes(t.status) ? 'pending' : m[k] === 'pending' ? 'pending' : 'ok'; });
    return m;
  }, [ledger]);
  const types = useMemo(() => [...new Set(ledger.map((t) => t.type))].sort().map((v) => ({ value: v, label: v })), [ledger]);
  const rows = useMemo(() => ledger.filter((t) => (!type || t.type === type) && (!range.from || isoDay(t.date) >= range.from) && (!range.to || isoDay(t.date) <= range.to)), [ledger, type, range]);

  const totals = useMemo(() => ({
    intended: sumBy(investments, (i) => i.intended), committed: sumBy(investments, (i) => i.committed), confirmed: sumBy(investments, (i) => i.confirmed),
    available: sumBy(investments, (i) => i.available), disbursed: sumBy(investments, (i) => i.disbursed), repaid: sumBy(investments, (i) => i.repaid),
  }), [investments]);

  const byPackage = useMemo(() => {
    const map = new Map();
    investments.forEach((i) => {
      const cur = map.get(i.packageId) || { id: i.packageId, committed: 0, confirmed: 0, disbursed: 0 };
      cur.committed += i.committed; cur.confirmed += i.confirmed; cur.disbursed += i.disbursed;
      map.set(i.packageId, cur);
    });
    return [...map.values()].filter((r) => r.confirmed > 0 || r.committed > 0).sort((a, b) => b.confirmed - a.confirmed).slice(0, 5);
  }, [investments]);

  if (loading) return <PageSkeleton />;

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

  const columns = [
    { key: 'date', header: 'Date', render: (t) => (<><div className="strong nowrap">{formatDateShort(t.date)}</div><div className="cell-sub">{formatTime(t.date)}</div></>) },
    { key: 'desc', header: 'Description', render: (t) => (<><div className="strong">{t.type}{t.packageId && pkgById[t.packageId] ? `: ${pkgById[t.packageId].name}` : ''}</div><div className="cell-sub">{t.ref}</div></>) },
    { key: 'amount', header: 'Amount', render: (t) => <span className={txSign(t) > 0 ? 'inv-amt-in' : 'inv-amt-out'}>{txSign(t) > 0 ? '+' : '-'}{formatNaira(t.amount)}</span> },
    { key: 'status', header: 'Status', render: (t) => <StatusPill>{t.status}</StatusPill> },
    {
      key: 'actions',
      header: 'Actions',
      render: (t) => (OPEN.includes(t.status) ? (
        <Button size="sm" variant="outline" className="inv-sim" loading={busy === t.id} onClick={() => simulate(t)} aria-label={`Demo only: simulate partner confirmation for ${t.ref}`}>
          <FlaskConical size={14} />Demo only: simulate partner confirmation
        </Button>
      ) : <span className="cell-sub">{t.note ? 'Recorded' : ''}</span>),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Wallet"
        subtitle="Manage your funds. This is your funding account at the financial partner, not a CollabFarm wallet."
        actions={(
          <>
            <Button onClick={() => setFundOpen(true)} disabled={investor?.status !== 'Verified'} title={investor?.status !== 'Verified' ? 'Verification is required before you can fund the wallet' : undefined}><Plus size={18} />Fund wallet</Button>
            <Button variant="outline" onClick={() => setWithdrawOpen(true)} disabled={wallet.available <= 0}>Request withdrawal</Button>
          </>
        )}
      />

      <div className="inv-partner-banner" role="note">
        <span className="inv-partner-banner__icon"><ShieldCheck size={26} /></span>
        <div>
          <h2>Your funds are held by a regulated financial partner</h2>
          <p className="small">{wallet.partner}. Account reference <strong>{wallet.accountRef}</strong>.</p>
          <ul>
            <li>CollabFarm does not hold or pool money. It records commitments, approvals and confirmations.</li>
            <li>A payment initiation is not proof of receipt. Money counts as received only when the partner confirms it.</li>
            <li>Your available balance can be committed to a package or requested back. Locked funds are tied to commitments.</li>
          </ul>
        </div>
      </div>

      <UnverifiedBanner investor={investor} />

      <div className="kpi-grid">
        <KpiLink icon={<WalletIcon size={20} />} tone="dark" label="Available Balance" value={formatNaira(wallet.available)} to="/investor/transactions" linkLabel="View Details">
          <span className="inv-kpi-sub">Confirmed by the partner and free to commit</span>
        </KpiLink>
        <KpiLink icon={<Lock size={20} />} label="Locked Funds" value={formatNaira(wallet.locked)} to="/investor/investments?status=Active">
          <span className="inv-kpi-sub">Committed to packages and released in tranches</span>
        </KpiLink>
        <KpiLink icon={<Banknote size={20} />} label="Disbursed Funds" value={formatNaira(totals.disbursed)} to="/investor/investments">
          <span className="inv-kpi-sub">Paid out after milestone approval</span>
        </KpiLink>
        <KpiLink icon={<Hourglass size={20} />} tone="gold" label="Pending Confirmation" value={formatNaira(wallet.pendingConfirmation)} to="/investor/transactions?status=Pending">
          <span className="inv-kpi-sub">Reported by you. Not received money yet</span>
        </KpiLink>
      </div>

      <Card>
        <CardHeader title="Your portfolio in six amounts" subtitle="Totals across all your investments. Only the last four are money the partner has confirmed or paid out." />
        <SixAmountsDiagram inv={totals} compact />
      </Card>

      <div className="grid-main inv-grid">
        <Card>
          <CardHeader title="Wallet Activity" subtitle="Export and download your investment data on the Transactions page." action={<LinkButton to="/investor/transactions" variant="outline-green" size="sm">View All</LinkButton>} />
          <p className="caption muted" style={{ marginBottom: 12 }}>
            Rows marked Initiated or Pending are waiting for the partner. The <span className="inv-demo-tag"><FlaskConical size={12} />Demo only</span> button stands in for the partner so you can see what happens after confirmation.
          </p>
          <DataTable
            bare
            pageSize={6}
            rows={rows}
            totalLabel="transactions"
            emptyTitle="No transactions yet"
            emptyText="Fund your wallet to see activity here."
            emptyAction={<Button onClick={() => setFundOpen(true)}>Fund wallet</Button>}
            toolbarLeft={<InvDatePicker value={range} onChange={setRange} marks={marks} alignLeft label="Date range" />}
            toolbarExtra={<InvSelect label="Type" value={type} onChange={setType} allLabel="All types" options={types} />}
            columns={columns}
          />
        </Card>
        <Card>
          <CardHeader title="Funds by Packages" subtitle="From your investment records." />
          <div className="stack-sm">
            {byPackage.length === 0 && <p className="small muted">You have no funds in packages yet.</p>}
            {byPackage.map((r) => (
              <div key={r.id} className="inv-funds-item">
                <div className="inv-funds-item__row"><span>{pkgById[r.id]?.name || r.id}</span><span>{formatNaira(r.committed)}</span></div>
                <div className="inv-funds-item__row"><span>Confirmed received</span><span>{formatNaira(r.confirmed)}</span></div>
                <div className="inv-funds-item__row"><span>Disbursed</span><span>{formatNaira(r.disbursed)}</span></div>
              </div>
            ))}
          </div>
          <div className="mt-4"><LinkButton to="/investor/investments" variant="outline-green" block>View all Packages</LinkButton></div>
        </Card>
      </div>

      <Banner tone="info">
        Wallet balances come from the partner's account record. Per-package figures come from each investment record. Neither is a promise of return. See <Link to="/investor/transactions" className="strong">Transactions</Link> for every entry and what each status means.
      </Banner>

      <FundWalletModal open={fundOpen} onClose={closeFund} />
      <WithdrawModal open={withdrawOpen} onClose={closeWithdraw} />
    </div>
  );
}
