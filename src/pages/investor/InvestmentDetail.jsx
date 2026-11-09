import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileText, MapPin, MessageSquareWarning, RefreshCw, Sprout, Users } from 'lucide-react';
import { Banner, Breadcrumb, Card, CardHeader, DataTable, EmptyState, InfoList, Progress, StatusPill } from '../../components/ui/index.js';
import { LinkButton } from '../../components/ui/Button.jsx';
import { TRANCHE_PLAN } from '../../data/funding.js';
import { formatNaira, formatDate } from '../../utils/format.js';
import { INVESTOR_VISIBLE, packageFunding } from '../../utils/rules.js';
import { useInvestor } from '../../components/inv/useInvestor.js';
import { CategoryChip, MissingRecord, SixAmountsDiagram } from '../../components/inv/Common.jsx';
import '../../styles/pages/inv.css';

export default function InvestmentDetail() {
  const { id } = useParams();
  const { data, investor, investments, pkgById, coopById } = useInvestor();
  const inv = investments.find((i) => i.id === id);
  const pkg = inv ? pkgById[inv.packageId] : null;
  const coop = pkg ? coopById[pkg.coopId] : null;

  const tranches = useMemo(() => {
    if (!pkg) return [];
    const real = data.tranches.filter((t) => t.packageId === pkg.id).sort((a, b) => a.number - b.number);
    if (real.length) return real;
    return TRANCHE_PLAN.map((t) => ({ id: `${pkg.id}-plan-${t.number}`, number: t.number, name: t.name, purpose: t.purpose, amount: Math.round(pkg.amount * t.share), status: 'Locked' }));
  }, [data.tranches, pkg]);

  if (!inv || !pkg) {
    return <MissingRecord title="Investment not found" text="This investment does not exist or does not belong to your account." to="/investor/investments" label="Back to Investments" />;
  }

  const f = packageFunding(pkg);
  const milestones = data.milestones.filter((m) => m.packageId === pkg.id).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  const disbursements = data.disbursements.filter((d) => d.packageId === pkg.id).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const dists = data.distributions.filter((d) => d.investorId === investor.id && d.packageId === pkg.id);
  const risks = data.riskCases.filter((r) => r.packageId === pkg.id);
  const contract = data.contracts.find((c) => c.id === inv.agreementId) || data.contracts.find((c) => c.type === 'A' && c.packageId === pkg.id && c.partyId === investor.id);
  const tx = data.transactions.find((t) => t.partyId === investor.id && t.packageId === pkg.id && ['Funding confirmation', 'Commitment', 'Allocation'].includes(t.type));
  const estimate = Math.round(inv.committed * (1 + pkg.expectedRoiPct / 100));
  const regionsCount = String(pkg.regions || '').split(/,|&/).filter((s) => s.trim()).length;
  const concernTo = `/investor/complaints/new?packageId=${pkg.id}`;
  const visible = INVESTOR_VISIBLE.includes(pkg.status);

  return (
    <div className="page">
      <Breadcrumb items={[{ label: 'Investments', to: '/investor/investments' }, { label: pkg.name }]} />
      <div className="inv-head-card">
        <div className="inv-head-card__id">
          <span className="inv-head-card__icon"><Sprout size={26} /></span>
          <div style={{ minWidth: 0 }}>
            <div className="row-wrap" style={{ gap: 10 }}><h1>{pkg.name}</h1><CategoryChip category={pkg.category} /><StatusPill>{inv.status}</StatusPill></div>
            <div className="muted small">{inv.ref} &middot; Invested on {formatDate(inv.dateInvested)} &middot; {coop?.name}</div>
          </div>
        </div>
        <div className="row-wrap">
          {visible && <LinkButton to={`/investor/packages/${pkg.id}`} variant="outline">View Package Details</LinkButton>}
          <LinkButton to={concernTo} variant="outline-green"><MessageSquareWarning size={16} />Raise a concern</LinkButton>
        </div>
      </div>

      {inv.status === 'Pending' && (
        <Banner tone="warn" title="Waiting for partner confirmation">This commitment is not received money yet. It becomes Active when the financial partner confirms your funds. See your <Link to="/investor/transactions" className="strong">transactions</Link>.</Banner>
      )}
      {inv.status === 'Overdue' && (
        <Banner tone="danger" title="A return on this investment is overdue">An overdue payment is reviewed under your agreement. It is not a finding of fraud. You can <Link to={concernTo} className="strong">raise a concern</Link> or check <Link to="/investor/distributions?status=Overdue" className="strong">overdue distributions</Link>.</Banner>
      )}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <Card>
          <CardHeader title="Your Investment Details" subtitle="Details of your contribution to this package" />
          <div className="inv-amount-hero">
            <span className="inv-amount-hero__icon"><Sprout size={22} /></span>
            <div><div className="caption muted">Amount Invested (committed)</div><div className="inv-amount-hero__value">{formatNaira(inv.committed)}</div></div>
          </div>
          <InfoList compact items={[
            ['Investment ID', inv.ref],
            ['Date Invested', formatDate(inv.dateInvested)],
            ['Transaction Reference', tx?.ref || 'Not yet issued'],
            ['Investment Status', <StatusPill key="s">{inv.status}</StatusPill>],
            ['Funding model', pkg.returnStructure],
          ]} />
        </Card>
        <div className="stack">
          <Card>
            <CardHeader title="Package Funding Progress" subtitle="Raised means confirmed received by the partner." action={<strong>{f.pct}%</strong>} />
            <Progress value={f.pct} label="Package funding progress" />
            <div className="caption muted mt-2"><span className="inv-green strong">{formatNaira(pkg.raised)}</span> raised of {formatNaira(pkg.amount)}</div>
            <div className="inv-tiles mt-4">
              <div className="inv-tile"><span className="inv-tile__icon"><Users size={18} /></span><div><div className="inv-tile__value">{pkg.farmersCount}</div><div className="caption muted">Farmers Supported</div></div></div>
              <div className="inv-tile"><span className="inv-tile__icon"><RefreshCw size={18} /></span><div><div className="inv-tile__value">{pkg.tenureMonths} mo</div><div className="caption muted">Farming Cycle</div></div></div>
              <div className="inv-tile"><span className="inv-tile__icon"><MapPin size={18} /></span><div><div className="inv-tile__value">{regionsCount}</div><div className="caption muted">Locations</div></div></div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Settlement Information" subtitle="Details about the expected settlement for your investment." />
            <InfoList compact items={[
              ['Expected Settlement Date', <span key="d">{formatDate(inv.expectedSettlementDate)} <span className="muted">(estimate)</span></span>],
              ['Estimated total back', <span key="e">{formatNaira(estimate)} <span className="muted">(about {pkg.expectedRoiPct}%, not a guarantee)</span></span>],
            ]} />
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Where your money is: the six amounts" subtitle="Read left to right. The first two are plans and promises. Only the last four involve money that the financial partner confirmed or paid out." />
        <SixAmountsDiagram inv={inv} />
      </Card>

      <Card>
        <CardHeader title="Tranche progress" subtitle="A tranche is one stage of the money. The next stage is released only after the one before it is released and its evidence is approved." />
        <ol className="inv-track">
          {tranches.map((t) => (
            <li key={t.id} className={`inv-track__node inv-track__node--${t.status === 'Released' ? 'released' : t.status === 'Under Review' || t.status === 'Pending Evidence' ? 'review' : 'locked'}`}>
              <div className="inv-track__head"><span className="inv-track__num">T{t.number}</span><StatusPill>{t.status}</StatusPill></div>
              <strong>{t.name}</strong>
              <span className="caption muted">{t.purpose}</span>
              <span className="small">Package stage: <strong>{formatNaira(t.amount)}</strong></span>
              <span className="caption muted">Your share (estimate): {formatNaira(Math.round((inv.committed * t.amount) / pkg.amount))}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <CardHeader title="Milestones and evidence" subtitle="A summary only. Photos and GPS support a report but are not conclusive. Personal details are not shown." />
        {milestones.length === 0 ? (
          <p className="small muted">Milestones will be listed here once farming starts.</p>
        ) : (
          <DataTable
            bare
            hideFooter
            pageSize={20}
            rows={milestones}
            columns={[
              { key: 'title', header: 'Milestone', render: (m) => (<><div className="strong">{m.title}</div><div className="cell-sub">{m.description}</div></>) },
              { key: 'due', header: 'Due', render: (m) => formatDate(m.dueDate) },
              { key: 'status', header: 'Status', render: (m) => <StatusPill>{m.status}</StatusPill> },
              {
                key: 'evidence',
                header: 'Evidence summary',
                render: (m) => (m.evidence.length === 0 ? <span className="cell-sub">None submitted yet</span> : (
                  <div className="stack-sm">
                    <span className="small">{m.evidence.length} file{m.evidence.length === 1 ? '' : 's'}: {m.evidence.filter((e) => e.verified).length} verified, {m.evidence.filter((e) => !e.verified).length} uploaded only</span>
                    <span className="cell-sub">{[...new Set(m.evidence.map((e) => e.type))].join(', ')}</span>
                  </div>
                )),
              },
            ]}
          />
        )}
      </Card>

      <Card>
        <CardHeader title="Disbursements for this package" subtitle="Payments recorded for the whole package, shown by recipient type and purpose only. Your own share is in the six amounts above." />
        {disbursements.length === 0 ? (
          <p className="small muted">No money has been paid out for this package yet.</p>
        ) : (
          <DataTable
            bare
            pageSize={5}
            totalLabel="payments"
            rows={disbursements}
            columns={[
              { key: 'date', header: 'Date', render: (d) => formatDate(d.date) },
              { key: 'type', header: 'Recipient type', render: (d) => d.recipientType },
              { key: 'purpose', header: 'Purpose', render: (d) => d.purpose },
              { key: 'amount', header: 'Amount', align: 'right', render: (d) => formatNaira(d.amount) },
              { key: 'status', header: 'Status', render: (d) => <StatusPill>{d.status}</StatusPill> },
            ]}
          />
        )}
      </Card>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <Card>
          <CardHeader title="Expected versus actual" subtitle="Expected figures are estimates, not guarantees." />
          <InfoList compact items={[
            ['Committed', formatNaira(inv.committed)],
            ['Estimated total back (estimate)', formatNaira(estimate)],
            ['Actually repaid or distributed', formatNaira(inv.repaid)],
            ['Still to come against the estimate', formatNaira(Math.max(0, estimate - inv.repaid))],
            ['Expected settlement date (estimate)', formatDate(inv.expectedSettlementDate)],
          ]} />
          <p className="caption muted mt-2">Repayment of your original money (capital) is not profit. Profit, if any, is a separate distribution.</p>
        </Card>
        <Card>
          <CardHeader title="Distributions for this investment" action={<Link to="/investor/distributions" className="small strong">All distributions</Link>} />
          {dists.length === 0 ? <p className="small muted">No distributions are scheduled for this investment yet.</p> : (
            <div className="stack-sm">
              {dists.map((d) => (
                <div key={d.id} className="inv-funds-item">
                  <div className="inv-funds-item__row"><span>{d.type}</span><StatusPill>{d.status}</StatusPill></div>
                  <div className="inv-funds-item__row"><span>Due {formatDate(d.dueDate)}</span><span>{formatNaira(d.amountDue)}</span></div>
                  <div className="inv-funds-item__row"><span>Paid</span><span>{formatNaira(d.amountPaid)}</span></div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <Card>
          <CardHeader title="Documents" />
          <div className="stack-sm">
            <div className="inv-doc">
              <div className="row" style={{ alignItems: 'flex-start' }}><span className="inv-doc__icon"><FileText size={20} /></span>
                <div><strong>Investor Funding Agreement (A)</strong><div className="caption muted">{contract ? `${contract.version}${contract.signedAt ? `, signed ${formatDate(contract.signedAt)}` : ''}` : 'Agreement record not found in this demo'}</div></div>
              </div>
              {contract ? <div className="row-wrap"><StatusPill>{contract.status}</StatusPill><LinkButton to={`/investor/contracts/${contract.id}`} variant="outline-green" size="sm">Open</LinkButton></div> : <LinkButton to="/investor/contracts" variant="outline-green" size="sm">Agreements</LinkButton>}
            </div>
            <div className="inv-doc">
              <div className="row" style={{ alignItems: 'flex-start' }}><span className="inv-doc__icon"><FileText size={20} /></span><div><strong>Risk disclosure</strong><div className="caption muted">The risks you acknowledged before investing.</div></div></div>
              <LinkButton to="/investor/risk-disclosures" variant="outline-green" size="sm">Read</LinkButton>
            </div>
            <div className="inv-doc">
              <div className="row" style={{ alignItems: 'flex-start' }}><span className="inv-doc__icon"><FileText size={20} /></span><div><strong>Investor reports</strong><div className="caption muted">Funding, progress, harvest and distribution reports.</div></div></div>
              <LinkButton to="/investor/reports" variant="outline-green" size="sm">Reports</LinkButton>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Risk and incident notes" subtitle="A review case is not a finding of wrongdoing. A missed deadline or crop failure is not fraud." />
          {risks.length === 0 ? (
            <EmptyState title="No incidents on record">No risk cases are open for this package.</EmptyState>
          ) : (
            <div className="stack-sm">
              {risks.map((r) => (
                <div key={r.id} className="inv-funds-item">
                  <div className="inv-funds-item__row"><span>{r.title}</span><StatusPill>{r.status}</StatusPill></div>
                  <div className="inv-funds-item__row"><span>{r.category}</span><StatusPill>{r.severity}</StatusPill></div>
                  <p className="caption muted">{r.detail} Raised {formatDate(r.raisedAt)}.</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card tone="tint">
        <div className="row between" style={{ flexWrap: 'wrap' }}>
          <div><strong>Something not right?</strong><p className="small muted">Raise a concern about this package. It gets a reference and a reviewer, and it never triggers a public accusation.</p></div>
          <LinkButton to={concernTo}><MessageSquareWarning size={16} />Raise a concern</LinkButton>
        </div>
      </Card>
    </div>
  );
}
