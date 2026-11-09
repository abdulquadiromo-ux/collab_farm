import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, Coins, HandCoins, Landmark } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { Banner, KpiCard, Progress, StatusPill, Tabs } from '../ui/index.js';
import { Logo } from '../common/Brand.jsx';
import { BarChart } from '../charts/Charts.jsx';
import { CATEGORY_TONES } from '../../utils/status.js';
import { formatDate, formatNaira, percent } from '../../utils/format.js';
import { packageFunding, sixAmounts, sum } from '../../utils/rules.js';

const SAMPLE_INVESTOR = 'inv-1';
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'mine', label: 'My investments' },
  { id: 'new', label: 'Opportunities' },
];

/**
 * A small, real-component preview of the investor dashboard, filled from the sample records.
 * It deliberately shows the amounts apart (committed, confirmed, disbursed, repaid) so a visitor sees
 * that a commitment is not received money.
 */
export function DashboardPreview() {
  const { data } = useApp();
  const [tab, setTab] = useState('overview');

  const view = useMemo(() => {
    const pkgName = (id) => data.packages.find((p) => p.id === id)?.name || 'Funding package';
    const mine = data.investments.filter((i) => i.investorId === SAMPLE_INVESTOR);
    const total = {
      intended: sum(mine, (i) => i.intended), committed: sum(mine, (i) => i.committed), confirmed: sum(mine, (i) => i.confirmed),
      available: sum(mine, (i) => i.available), disbursed: sum(mine, (i) => i.disbursed), repaid: sum(mine, (i) => i.repaid),
    };
    const six = Object.fromEntries(sixAmounts(total).map((a) => [a.key, a.value]));
    const share = (v) => Math.min(100, percent(v, total.committed));
    const bars = [
      { label: 'Committed', value: share(six.committed), tone: 'gold' },
      { label: 'Confirmed', value: share(six.confirmed), tone: 'green' },
      { label: 'Available', value: share(six.available), tone: 'gold' },
      { label: 'Disbursed', value: share(six.disbursed), tone: 'green' },
      { label: 'Repaid', value: share(six.repaid), tone: 'gold' },
    ];
    const activity = data.transactions
      .filter((t) => t.partyId === SAMPLE_INVESTOR)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 4)
      .map((t) => ({ ...t, name: pkgName(t.packageId) }));
    const investments = [...mine]
      .sort((a, b) => String(b.dateInvested).localeCompare(String(a.dateInvested)))
      .slice(0, 4)
      .map((i) => ({ ...i, name: pkgName(i.packageId) }));
    const open = data.packages.filter((p) => p.status === 'Open for Funding').slice(0, 3);
    return { six, bars, activity, investments, open, count: mine.length };
  }, [data]);

  return (
    <div className="pub-dash" aria-label="Sample investor dashboard preview">
      <div className="pub-dash__bar">
        <Logo to={null} size="sm" />
        <span className="pub-dash__sep" aria-hidden="true" />
        <span className="pub-dash__title">Investor Dashboard</span>
        <StatusPill tone="amber" className="pub-dash__badge">Sample data</StatusPill>
      </div>

      <div className="pub-dash__body">
        <div className="kpi-grid">
          <KpiCard icon={<HandCoins size={18} />} label="Committed" value={formatNaira(view.six.committed, { compact: true })}>
            <span className="cell-sub">A promise. Not received money.</span>
          </KpiCard>
          <KpiCard icon={<Landmark size={18} />} label="Confirmed received" value={formatNaira(view.six.confirmed, { compact: true })} tone="gold">
            <span className="cell-sub">Confirmed by the financial partner.</span>
          </KpiCard>
          <KpiCard icon={<Banknote size={18} />} label="Disbursed" value={formatNaira(view.six.disbursed, { compact: true })}>
            <span className="cell-sub">Paid out after approvals.</span>
          </KpiCard>
          <KpiCard icon={<Coins size={18} />} label="Repaid or distributed" value={formatNaira(view.six.repaid, { compact: true })} tone="gold">
            <span className="cell-sub">Across {view.count} sample investments.</span>
          </KpiCard>
        </div>

        <Tabs items={TABS} value={tab} onChange={setTab} label="Dashboard preview sections" />

        {tab === 'overview' && (
          <div className="pub-dash__cols">
            <div className="card card--pad">
              <h3 className="pub-dash__h">Share of committed funds at each stage</h3>
              <BarChart data={view.bars} height={250} />
              <p className="caption muted pub-dash__note">Each bar is a different amount, shown as a share of what was committed. Only the confirmed amount can be made available.</p>
            </div>
            <div className="card card--pad">
              <h3 className="pub-dash__h">Recent activity</h3>
              <ul className="pub-dash__list">
                {view.activity.map((t) => (
                  <li key={t.id}>
                    <div>
                      <strong>{t.type}</strong>
                      <span className="cell-sub">{t.name} · {formatDate(t.date)}</span>
                      {t.status === 'Initiated' && <span className="cell-sub">Not yet received.</span>}
                    </div>
                    <div className="pub-dash__right">
                      <span className="strong">{formatNaira(t.amount)}</span>
                      <StatusPill>{t.status}</StatusPill>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === 'mine' && (
          <div className="card card--pad">
            <h3 className="pub-dash__h">My investments</h3>
            <ul className="pub-dash__list">
              {view.investments.map((i) => (
                <li key={i.id}>
                  <div>
                    <strong>{i.name}</strong>
                    <span className="cell-sub">Invested {formatDate(i.dateInvested)} · {i.ref}</span>
                  </div>
                  <div className="pub-dash__right">
                    <span className="strong">{formatNaira(i.committed)}</span>
                    <StatusPill>{i.status}</StatusPill>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'new' && (
          <div className="pub-dash__opps">
            {view.open.length === 0 ? (
              <Banner tone="info">No packages are open for funding right now.</Banner>
            ) : view.open.map((p) => {
              const f = packageFunding(p);
              const tone = CATEGORY_TONES[p.category] || CATEGORY_TONES.Custom;
              return (
                <div key={p.id} className="card card--pad pub-dash__opp">
                  <span className="chip" style={{ background: tone.bg, color: tone.fg, borderColor: tone.border }}>{p.category}</span>
                  <strong>{p.name}</strong>
                  <span className="cell-sub">{formatNaira(p.raised)} confirmed of {formatNaira(p.amount)} target</span>
                  <Progress value={f.pct} label={`${p.name} funding progress`} />
                  <span className="caption muted">{f.pct}% funded. Minimum {formatNaira(p.minInvestment)}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="pub-dash__foot">
          <span className="small muted">This preview uses sample data. Your own dashboard shows your own records only.</span>
          <Link to="/login" className="btn btn--outline-green btn--sm">Sign in to explore<ArrowRight size={14} /></Link>
        </div>
      </div>
    </div>
  );
}
