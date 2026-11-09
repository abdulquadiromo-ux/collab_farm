import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Activity, Banknote, Check, ChevronRight, Download, FileText, RefreshCw, ShieldCheck, Sprout, UserRound, Users } from 'lucide-react';
import { Banner, Breadcrumb, Button, Card, CardHeader, DataTable, InfoList, Progress, StatusPill, Tabs, Timeline, KpiStrip } from '../../components/ui/index.js';
import { LinkButton } from '../../components/ui/Button.jsx';
import { Photo } from '../../components/common/Photo.jsx';
import { PACKAGE_TEMPLATES, TRANCHE_PLAN } from '../../data/funding.js';
import { formatNaira, formatDate } from '../../utils/format.js';
import { INVESTOR_VISIBLE, budgetReconciles, packageFunding } from '../../utils/rules.js';
import { useInvestor } from '../../components/inv/useInvestor.js';
import { CategoryChip, MissingRecord, UnverifiedBanner } from '../../components/inv/Common.jsx';
import { AGREEMENT_SECTIONS, APP_TODAY, PHOTO_THEME, RISK_ITEMS, agreementAVersion, downloadText, fundingModelWording, investGate, isClosed, packageSix } from '../../components/inv/invData.js';
import '../../styles/pages/inv.css';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'budget', label: 'Budget' },
  { id: 'cooperative', label: 'Cooperative' },
  { id: 'tranches', label: 'Tranches and timeline' },
  { id: 'risks', label: 'Risks' },
  { id: 'documents', label: 'Documents' },
];

const CheckRow = ({ children, right }) => (
  <li>
    <Check size={20} strokeWidth={3} style={{ background: 'var(--green-500)', color: '#fff', borderRadius: '50%', padding: 3, width: 22, height: 22 }} />
    <span className="inv-incl" style={{ flex: 1 }}><span>{children}</span>{right && <span className="inv-incl__amt">{right}</span>}</span>
  </li>
);

export default function PackageDetail() {
  const { id } = useParams();
  const { data, investor, investments, pkgById, coopById } = useInvestor();
  const [params, setParams] = useSearchParams();
  const pkg = pkgById[id];
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'overview';
  const coop = pkg ? coopById[pkg.coopId] : null;
  const gate = useMemo(() => (pkg ? investGate(investor, pkg) : []), [investor, pkg]);

  const tranches = useMemo(() => {
    if (!pkg) return [];
    const real = data.tranches.filter((t) => t.packageId === pkg.id).sort((a, b) => a.number - b.number);
    if (real.length) return real;
    return TRANCHE_PLAN.map((t) => ({ id: `${pkg.id}-plan-${t.number}`, number: t.number, name: t.name, purpose: t.purpose, conditions: t.conditions, amount: Math.round(pkg.amount * t.share), status: 'Locked' }));
  }, [data.tranches, pkg]);

  if (!pkg || !INVESTOR_VISIBLE.includes(pkg.status)) {
    return <MissingRecord title="Package not available" text="This package does not exist, or it has not been approved for investors yet." to="/investor/packages" label="Back to Funding Packages" />;
  }

  const f = packageFunding(pkg);
  const six = packageSix(pkg, data);
  const tagline = PACKAGE_TEMPLATES[pkg.category]?.find((t) => t.tier === pkg.tier)?.tagline || `${pkg.tier} package`;
  const canInvest = gate.length === 0;
  const mine = investments.filter((i) => i.packageId === pkg.id);
  const model = fundingModelWording(pkg.returnStructure);
  const recon = budgetReconciles(pkg);
  const version = agreementAVersion(data.contracts);
  const agreementB = data.contracts.find((c) => c.type === 'B' && c.packageId === pkg.id);
  const coopPackages = data.packages.filter((p) => p.coopId === pkg.coopId && INVESTOR_VISIBLE.includes(p.status));
  const coopFarmers = data.farmers.filter((x) => x.coopId === pkg.coopId && x.status === 'Verified' && x.identityStatus === 'Verified');
  const milestones = data.milestones.filter((m) => m.packageId === pkg.id).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  const setTab = (t) => { const next = new URLSearchParams(params); if (t === 'overview') next.delete('tab'); else next.set('tab', t); setParams(next, { replace: true }); };
  const exampleCommit = pkg.minInvestment * 2;

  const downloadAgreement = () => downloadText(
    `agreement-a-${pkg.id}-${version}-preview.txt`,
    [
      `INVESTOR FUNDING AGREEMENT (Agreement A) ${version}, PREVIEW ONLY`,
      `Package: ${pkg.name} (${pkg.category})`,
      `Cooperative: ${coop?.name || 'Not stated'}`,
      `Funding model: ${pkg.returnStructure}. ${model.text}`,
      'The funding model and terms are configurable and are set in the signed agreement. This preview is illustrative and is not a promise of return.',
      '',
      ...AGREEMENT_SECTIONS.map(([h, t]) => `${h}\n  ${t}`),
    ].join('\n'),
  );

  return (
    <div className="page">
      <Breadcrumb items={[{ label: 'Funding Packages', to: '/investor/packages' }, { label: pkg.name }]} />
      <div className="inv-detail-top">
        <div>
          <div className="row-wrap" style={{ gap: 10 }}>
            <h1>{pkg.name}</h1>
            <CategoryChip category={pkg.category} />
          </div>
          <p className="muted small">{tagline}{coop ? `. By ${coop.name}` : ''}</p>
        </div>
        {canInvest ? (
          <LinkButton to={`/investor/packages/${pkg.id}/invest`} size="lg">Invest <ChevronRight size={18} /></LinkButton>
        ) : (
          <Button size="lg" disabled aria-disabled="true" title="Investing is not available right now. See the reasons below.">Invest <ChevronRight size={18} /></Button>
        )}
      </div>

      <UnverifiedBanner investor={investor} />
      {!canInvest && (
        <Banner tone="warn" title="You cannot invest in this package right now">
          <ul className="inv-reasons">
            {gate.filter((r) => r.id !== 'unverified').map((r) => (
              <li key={r.id}><span>{r.text}</span>{r.to && <Link to={r.to} className="strong">{r.toLabel}</Link>}</li>
            ))}
          </ul>
        </Banner>
      )}
      {mine.length > 0 && (
        <Banner tone="green">You hold {mine.length} investment{mine.length === 1 ? '' : 's'} in this package, {formatNaira(mine.reduce((s, i) => s + i.committed, 0))} committed in total. <Link to={`/investor/investments/${mine[0].id}`} className="strong">View investment</Link></Banner>
      )}

      <Photo name="package-crop.jpg" theme={PHOTO_THEME[pkg.category] || 'field'} alt={`${pkg.name} banner`} className="inv-photo" />
      <div className="stack-sm">
        <div className="inv-price">{formatNaira(pkg.amount)}</div>
        <p className="muted">{pkg.description}</p>
      </div>

      <div className="inv-stat-strip">
        <KpiStrip
          columns={6}
          cells={[
            { icon: <Banknote size={18} />, label: 'Funding Amount', value: formatNaira(pkg.amount) },
            { icon: <Sprout size={18} />, label: 'Farming Type', value: pkg.category },
            { icon: <RefreshCw size={18} />, label: 'Farming Cycle', value: `${pkg.tenureMonths} Months` },
            { icon: <Activity size={18} />, label: 'Package Status', value: pkg.status },
            { icon: <Users size={18} />, label: 'Farmers', value: pkg.farmersCount },
            { icon: <UserRound size={18} />, label: 'Investors', value: pkg.investorsCount },
          ]}
        />
      </div>

      <Card>
        <CardHeader
          title="Funding progress"
          subtitle="Raised means confirmed received by the financial partner. A commitment is not received money."
          action={<strong>{f.pct}% funded</strong>}
        />
        <Progress value={f.pct} label={`${pkg.name} funding progress`} />
        <div className="caption muted mt-2"><span className="inv-green strong">{formatNaira(pkg.raised)}</span> raised of {formatNaira(pkg.amount)}. Closing {formatDate(pkg.closingDate)}{isClosed(pkg) ? ' (closed)' : ''}.</div>
        <div className="inv-fund-six mt-4">
          {[
            ['Funding target', six.target, 'The full amount the package needs.'],
            ['Formally committed', six.committed, 'Signed up by investors. Not yet received money.'],
            ['Confirmed received', six.confirmed, 'The partner has confirmed it holds this money.'],
            ['Available for disbursement', six.available, 'Confirmed money not yet released in a tranche.'],
            ['Actually disbursed', six.disbursed, 'Released tranches, paid out after approval.'],
            ['Repaid or distributed', six.distributed, 'Paid back to investors on record.'],
          ].map(([label, value, help]) => (
            <div className="inv-fund-six__cell" key={label}>
              <span className="caption muted">{label}</span>
              <span className="strong">{formatNaira(value)}</span>
              <span className="caption muted">{help}</span>
            </div>
          ))}
        </div>
        <p className="caption muted mt-2">Each investor also has an "intended" amount, a plan that is recorded privately on their own investment page.</p>
      </Card>

      <Tabs items={TABS} value={tab} onChange={setTab} auto label="Package sections" />

      {tab === 'overview' && (
        <div className="grid-main inv-grid">
          <Card>
            <CardHeader title="What's Included" subtitle="What the funding in this package pays for, as set in the approved budget." />
            <ul className="checklist">
              {pkg.inclusions.map((i) => <CheckRow key={i.item} right={formatNaira(i.amount)}>{i.item}</CheckRow>)}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Return structure" />
            <div className="stack">
              <div>
                <div className="strong">{pkg.returnStructure}</div>
                <p className="small muted">Estimated return of about {pkg.expectedRoiPct}% over {pkg.tenureMonths} months. This is an estimate, not a guarantee.</p>
              </div>
              <div className="inv-note-box"><strong>{model.kind}.</strong> {model.text}</div>
              <p className="caption muted">Profit sharing means you share in what is left after approved costs are paid. Repayment of your original money (capital) is separate from profit. The funding model is configurable and is set in the signed agreement. It is not decided on this screen.</p>
            </div>
          </Card>
          <Card>
            <CardHeader title="Terms at a glance" />
            <InfoList compact items={[
              ['Smallest commitment', formatNaira(pkg.minInvestment)],
              ['Largest commitment', formatNaira(pkg.maxInvestment)],
              ['Still to be committed', formatNaira(Math.max(0, pkg.amount - pkg.committed))],
              ['Funding closes', formatDate(pkg.closingDate)],
              ['Farming starts', formatDate(pkg.startDate)],
              ['Farming ends', formatDate(pkg.endDate)],
              ['Cooperative share', `${pkg.coopSharePct}% (illustrative)`],
              ['Regions', pkg.regions],
            ]} />
          </Card>
          <Card tone="tint">
            <CardHeader title="A simple illustration" />
            <p className="small">If you committed {formatNaira(exampleCommit)} and the {pkg.expectedRoiPct}% estimate held, the estimated total back would be {formatNaira(Math.round(exampleCommit * (1 + pkg.expectedRoiPct / 100)))}.</p>
            <p className="caption muted mt-2">Illustration only. Real results depend on harvest, prices and the signed agreement. You can get back less than you put in.</p>
          </Card>
        </div>
      )}

      {tab === 'budget' && (
        <Card>
          <CardHeader title="Approved budget" subtitle="Money is released against this budget, in stages, not simply because it has been committed." action={<StatusPill tone={recon.ok ? 'green' : 'amber'}>{recon.ok ? 'Budget matches funding target' : `Difference ${formatNaira(Math.abs(recon.difference))}`}</StatusPill>} />
          <DataTable
            bare
            hideFooter
            pageSize={50}
            rows={pkg.budget}
            emptyTitle="No budget lines yet"
            emptyText="The approved budget will appear here once the cooperative's plan is final."
            columns={[
              { key: 'category', header: 'Category' },
              { key: 'description', header: 'Purpose' },
              { key: 'amount', header: 'Approved amount', align: 'right', render: (r) => formatNaira(r.amount) },
              { key: 'responsible', header: 'Responsible' },
              { key: 'docs', header: 'Supporting document' },
              { key: 'approval', header: 'Approval', render: (r) => <StatusPill>{r.approval}</StatusPill> },
            ]}
          />
          <div className="row between mt-4"><strong>Total approved budget</strong><strong>{formatNaira(recon.total)}</strong></div>
        </Card>
      )}

      {tab === 'cooperative' && (
        <div className="grid-main inv-grid">
          <Card>
            <CardHeader title={coop?.name || 'Cooperative'} action={coop && <StatusPill>{coop.status}</StatusPill>} />
            {coop ? (
              <>
                <InfoList compact items={[
                  ['Verification', <span key="v" className="row-wrap" style={{ gap: 8 }}><ShieldCheck size={16} color="var(--green-600)" />{coop.status === 'Verified' ? `Verified on ${formatDate(coop.verifiedAt)}` : coop.status}</span>],
                  ['Registration number', coop.regNumber],
                  ['Established', coop.yearEstablished],
                  ['Location', `${coop.lga}, ${coop.state}`],
                  ['Representatives', coop.representatives.map((r) => `${r.name} (${r.role})`).join(', ')],
                  ['Verified farmers', `${coopFarmers.length} (names and contact details are not shown to investors)`],
                  ['Packages on record', `${coopPackages.length}, of which ${coopPackages.filter((p) => p.status === 'Completed').length} completed`],
                ]} />
                <div className="mt-4"><LinkButton to={`/investor/farmers?coop=${coop.id}`} variant="outline-green" size="sm">See verified farmers (privacy preserving)</LinkButton></div>
              </>
            ) : <p className="muted">Cooperative details are not available.</p>}
          </Card>
          <Card>
            <CardHeader title="Documents checked" subtitle="Uploaded means the cooperative sent it. Verified means a CollabFarm reviewer checked it." />
            {coop?.documents?.length ? (
              <ul className="stack-sm" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {coop.documents.map((d) => (
                  <li key={d.id} className="row between small"><span>{d.type}</span><StatusPill>{d.status}</StatusPill></li>
                ))}
              </ul>
            ) : <p className="small muted">Document checks for this cooperative are held by the CollabFarm review team.</p>}
          </Card>
        </div>
      )}

      {tab === 'tranches' && (
        <div className="stack-lg">
          <Card>
            <CardHeader title="Tranches" subtitle="A tranche is one stage of the money. A stage is released only after the one before it is released and its evidence is approved." />
            <ol className="inv-track">
              {tranches.map((t) => (
                <li key={t.id} className={`inv-track__node inv-track__node--${t.status === 'Released' ? 'released' : t.status === 'Under Review' || t.status === 'Pending Evidence' ? 'review' : 'locked'}`}>
                  <div className="inv-track__head"><span className="inv-track__num">T{t.number}</span><StatusPill>{t.status}</StatusPill></div>
                  <strong>{t.name}</strong>
                  <span className="strong">{formatNaira(t.amount)}</span>
                  <span className="caption muted">{t.purpose}</span>
                  <ul className="caption muted" style={{ margin: '4px 0 0', paddingLeft: 16 }}>{t.conditions.map((c) => <li key={c}>{c}</li>)}</ul>
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <CardHeader title="Timeline and reporting dates" subtitle="Dates are plans. Late dates are reviewed and are not treated as fraud." />
            <Timeline items={[
              { title: 'Funding closes', meta: formatDate(pkg.closingDate), state: isClosed(pkg) ? 'done' : 'active' },
              { title: 'Farming starts', meta: formatDate(pkg.startDate), state: new Date(`${pkg.startDate}T00:00:00`) < APP_TODAY ? 'done' : undefined },
              ...milestones.map((m) => ({ title: m.title, meta: `Report due ${formatDate(m.dueDate)}. Status: ${m.status}`, body: m.description, state: m.status === 'Approved' ? 'done' : m.status === 'Delayed' ? 'bad' : m.status === 'Under Review' ? 'active' : undefined })),
              { title: 'Farming cycle ends', meta: formatDate(pkg.endDate) },
            ]} />
            {milestones.length === 0 && <p className="caption muted">Milestone reporting dates are set after funding is confirmed.</p>}
          </Card>
        </div>
      )}

      {tab === 'risks' && (
        <div className="grid-main inv-grid">
          <Card>
            <CardHeader title="Risks for this package" subtitle="Named by the cooperative and reviewed by CollabFarm." />
            <ul className="stack-sm" style={{ margin: 0, paddingLeft: 20 }}>
              {pkg.risks.map((r) => <li key={r}>{r}</li>)}
            </ul>
            <div className="inv-note-box mt-4">Crop failure is not fraud. A genuine loss is assessed on evidence and on the signed agreement.</div>
          </Card>
          <Card tone="tint">
            <CardHeader title="Three things to remember" />
            <ul className="stack-sm" style={{ margin: 0, paddingLeft: 20 }}>
              <li>A commitment is not received money.</li>
              <li>Approval is not a guarantee of success.</li>
              <li>Crop failure is not fraud.</li>
            </ul>
          </Card>
          <Card className="grid-span">
            <CardHeader title="Risks that apply to every package" action={<Link to="/investor/risk-disclosures" className="small strong">Read the full risk disclosure</Link>} />
            <div className="stack-sm">
              {RISK_ITEMS.map((r) => (
                <div key={r.id}><strong className="small">{r.title}</strong><p className="small muted">{r.detail}</p></div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'documents' && (
        <div className="stack-lg">
          <Card>
            <CardHeader title="Investor Funding Agreement (Agreement A)" subtitle={`Template ${version}. You sign it when you commit. Preview below.`} />
            <div className="inv-agreement">
              <div className="row-wrap between">
                <strong>Funding model: {pkg.returnStructure}</strong>
                <Button size="sm" variant="outline-green" onClick={downloadAgreement}><Download size={16} />Download preview</Button>
              </div>
              <p className="small muted">{model.text} The model is configurable and is set in the signed agreement.</p>
              <dl>
                {AGREEMENT_SECTIONS.map(([h, t]) => (<div key={h}><dt>{h}</dt><dd>{t}</dd></div>))}
              </dl>
            </div>
          </Card>
          <Card>
            <CardHeader title="Disclosures and related agreements" />
            <div className="stack-sm">
              <div className="inv-doc">
                <div className="row" style={{ alignItems: 'flex-start' }}><span className="inv-doc__icon"><FileText size={20} /></span><div><strong>Investor risk disclosure</strong><div className="caption muted">Plain-language risks of investing, including possible loss.</div></div></div>
                <LinkButton to="/investor/risk-disclosures" variant="outline-green" size="sm">Read disclosure</LinkButton>
              </div>
              <div className="inv-doc">
                <div className="row" style={{ alignItems: 'flex-start' }}><span className="inv-doc__icon"><FileText size={20} /></span><div><strong>Cooperative Funding and Accountability Agreement (B)</strong><div className="caption muted">Signed by the cooperative. It sets approved uses of money and reporting duties.</div></div></div>
                <StatusPill>{agreementB ? agreementB.status : 'Not yet issued'}</StatusPill>
              </div>
              <div className="inv-doc">
                <div className="row" style={{ alignItems: 'flex-start' }}><span className="inv-doc__icon"><FileText size={20} /></span><div><strong>Your signed agreements</strong><div className="caption muted">Download or review agreements you have already signed.</div></div></div>
                <LinkButton to="/investor/contracts" variant="outline-green" size="sm">Open agreements</LinkButton>
              </div>
            </div>
            <p className="caption muted mt-4">Funding steps are blocked while a mandatory agreement is missing.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
