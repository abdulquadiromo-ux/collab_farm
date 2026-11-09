import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Download, HandCoins, Landmark, ShieldAlert } from 'lucide-react';
import { Banner, Breadcrumb, Button, Card, CardHeader, Checkbox, ConfirmDialog, InfoList, MoneyField, PageHeader, Progress, Stepper, StatusPill, TextField, Timeline } from '../../components/ui/index.js';
import { LinkButton } from '../../components/ui/Button.jsx';
import { newId, simulate } from '../../context/AppContext.jsx';
import { formatNaira, formatDate, formatDateTime } from '../../utils/format.js';
import { packageFunding } from '../../utils/rules.js';
import { useInvestor } from '../../components/inv/useInvestor.js';
import { CategoryChip, MissingRecord, PkgStatusChip } from '../../components/inv/Common.jsx';
import { AGREEMENT_SECTIONS, RISK_ITEMS, agreementAVersion, downloadText, fundingModelWording, getWallet, investGate, nextRef, nowIso, txRef } from '../../components/inv/invData.js';
import '../../styles/pages/inv.css';

const STEPS = ['Amount', 'Risks and agreement', 'Review', 'Confirmation'];

export default function Invest() {
  const { id } = useParams();
  const { data, investor, wallet, investments, pkgById, coopById, add, update, patchData, notify, toast } = useInvestor();
  const pkg = pkgById[id];
  const coop = pkg ? coopById[pkg.coopId] : null;

  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('balance');
  const [ticks, setTicks] = useState({});
  const [signName, setSignName] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { window.scrollTo?.(0, 0); }, [step]);

  const version = useMemo(() => agreementAVersion(data.contracts), [data.contracts]);
  const gate = useMemo(() => (pkg ? investGate(investor, pkg) : []), [investor, pkg]);

  if (!pkg) {
    return <MissingRecord title="Package not found" text="We could not find this funding package." to="/investor/packages" label="Back to Funding Packages" />;
  }

  const remaining = Math.max(0, pkg.amount - pkg.committed);
  const maxAllowed = Math.min(pkg.maxInvestment, remaining);
  const funding = packageFunding(pkg);
  const model = fundingModelWording(pkg.returnStructure);
  const canUseBalance = !!amount && amount <= wallet.available;
  const shortfall = amount && amount > wallet.available ? amount - wallet.available : 0;
  const drawn = canUseBalance && source === 'balance';
  const held = investments.filter((i) => i.packageId === pkg.id);
  const chips = [...new Set([pkg.minInvestment, 100000, 250000, 500000, maxAllowed])].filter((v) => v >= pkg.minInvestment && v <= maxAllowed).sort((a, b) => a - b);

  // Only block before the commitment is made. After it, the success step must stay visible even though the package changed.
  if (!result && gate.length > 0) {
    return (
      <div className="page">
        <Breadcrumb items={[{ label: 'Funding Packages', to: '/investor/packages' }, { label: pkg.name, to: `/investor/packages/${pkg.id}` }, { label: 'Invest' }]} />
        <PageHeader title={`Invest in ${pkg.name}`} subtitle="This commitment cannot be made right now." />
        <Banner tone="danger" title="You cannot commit funds to this package">
          <ul className="inv-reasons">
            {gate.map((r) => (
              <li key={r.id}><span>{r.text}</span>{r.to && <Link to={r.to} className="strong">{r.toLabel}</Link>}</li>
            ))}
          </ul>
        </Banner>
        <div><LinkButton to={`/investor/packages/${pkg.id}`} variant="outline-green">Back to package</LinkButton></div>
      </div>
    );
  }

  const amountError = () => {
    if (!amount) return 'Enter the amount you want to commit.';
    if (amount < pkg.minInvestment) return `The smallest commitment is ${formatNaira(pkg.minInvestment)}.`;
    if (amount > pkg.maxInvestment) return `The largest single commitment is ${formatNaira(pkg.maxInvestment)}.`;
    if (amount > remaining) return `Only ${formatNaira(remaining)} is still open in this package. Enter that amount or less.`;
    return '';
  };

  const nextFromAmount = () => {
    const err = amountError();
    setErrors(err ? { amount: err } : {});
    if (!err) setStep(1);
  };

  const nextFromRisks = () => {
    const next = {};
    if (RISK_ITEMS.some((r) => !ticks[r.id])) next.risks = 'Tick every risk to show you have read and understood it.';
    if (signName.trim().toLowerCase() !== (investor.name || '').toLowerCase() || !signName.trim()) next.name = `Type your full name exactly as on your profile: ${investor.name}.`;
    if (!consent) next.consent = 'Tick the box to agree to the agreement.';
    setErrors(next);
    if (Object.keys(next).length === 0) setStep(2);
  };

  const downloadPreview = () => downloadText(
    `agreement-a-${pkg.id}-${version}-preview.txt`,
    [`INVESTOR FUNDING AGREEMENT (Agreement A) ${version}, PREVIEW`, `Package: ${pkg.name}`, `Funding model: ${pkg.returnStructure}. ${model.text}`, 'Terms are configurable and set in the signed agreement. Illustrative only.', '', ...AGREEMENT_SECTIONS.map(([h, t]) => `${h}\n  ${t}`)].join('\n'),
  );

  const commit = () => {
    const now = nowIso();
    const invId = newId('inv-r');
    const ref = nextRef('INV-2026', data.investments.length);
    const txr = txRef();
    const first = held.length === 0;
    const signature = `${signName.trim()} (typed signature, consent recorded)`;
    const awaiting = data.contracts.find((c) => c.type === 'A' && c.packageId === pkg.id && c.partyId === investor.id && c.status === 'Awaiting Signature');
    const contractId = awaiting ? awaiting.id : newId('ag-a');
    const contractAudit = { action: 'Signed Agreement A', entityType: 'Contract', summary: `Agreement A ${version} signed for ${pkg.name} by typed name at ${formatDateTime(now)}`, reason: 'Investor consent recorded with version and timestamp' };

    if (awaiting) {
      update('contracts', awaiting.id, (c) => ({ status: 'Signed', version, signedAt: now, signatory: signature, fundingModel: pkg.returnStructure, history: [...(c.history || []), { version, date: now.slice(0, 10), change: 'Signed by investor' }] }), contractAudit);
    } else {
      add('contracts', {
        id: contractId, type: 'A', title: 'Investor Funding Agreement', packageId: pkg.id, partyType: 'Investor', partyId: investor.id, partyName: investor.name,
        version, status: 'Signed', signedAt: now, signatory: signature, fundingModel: pkg.returnStructure,
        history: [{ version, date: now.slice(0, 10), change: first ? 'Signed by investor' : 'Signed for an additional commitment' }],
      }, contractAudit);
    }

    add('investments', {
      id: invId, investorId: investor.id, packageId: pkg.id, intended: amount, committed: amount, confirmed: drawn ? amount : 0, available: drawn ? amount : 0,
      disbursed: 0, repaid: 0, status: drawn ? 'Active' : 'Pending', dateInvested: now.slice(0, 10), expectedSettlementDate: pkg.endDate, agreementId: contractId, ref,
    }, { action: 'Committed funds', entityType: 'Investment', summary: `Commitment ${formatNaira(amount)} to ${pkg.name}. ${drawn ? 'Funds confirmed from available balance.' : 'Receipt not yet confirmed.'}`, reason: `Investor agreement ${version} accepted` });

    const reachedTarget = pkg.raised + (drawn ? amount : 0) >= pkg.amount;
    update('packages', pkg.id, (p) => ({
      raised: p.raised + (drawn ? amount : 0),
      committed: p.committed + amount,
      investorsCount: p.investorsCount + (first ? 1 : 0),
      ...(p.raised + (drawn ? amount : 0) >= p.amount && p.status === 'Open for Funding' ? { status: 'Funding Target Reached' } : {}),
    }));

    if (drawn) {
      patchData((d) => {
        const w = getWallet(d, investor.id);
        return { wallets: { ...d.wallets, [investor.id]: { ...w, available: Math.max(0, w.available - amount), locked: w.locked + amount } } };
      });
    } else {
      add('reconciliation', { id: newId('rc'), ref: txr, packageId: pkg.id, type: 'Investor receipt', internal: amount, provider: 0, providerRef: '', status: 'Pending', reconciledBy: null, reconciledAt: null, note: 'No provider confirmation yet. Commitment is not received money.' });
    }

    add('transactions', {
      id: newId('tx'), ref: txr, type: drawn ? 'Allocation' : 'Commitment', partyId: investor.id, packageId: pkg.id, amount, status: drawn ? 'Confirmed' : 'Pending', date: now, direction: 'in',
      note: drawn ? 'Allocated from your available balance. The partner already holds these funds.' : 'Commitment recorded. Waiting for the partner to receive and confirm the funds.',
    }, { action: drawn ? 'Funds allocated to package' : 'Commitment transaction recorded', entityType: 'Transaction', summary: `${txr} ${formatNaira(amount)} for ${pkg.name}`, reason: drawn ? 'Moved from available to locked' : 'Awaiting partner confirmation' });

    notify('cooperative', 'New investor commitment', `An investor committed ${formatNaira(amount)} to ${pkg.name}. ${drawn ? 'The funds are confirmed from the investor wallet.' : 'Awaiting partner confirmation.'}`, '/coop/investments', 'funding');
    notify('admin', 'New investor commitment', `${investor.name} committed ${formatNaira(amount)} to ${pkg.name} (${ref}). ${drawn ? 'Funds confirmed from wallet.' : 'Receipt not yet confirmed.'}`, '/admin/reconciliation', 'funding');
    if (reachedTarget && pkg.status === 'Open for Funding') notify('cooperative', 'Funding target reached', `${pkg.name} has reached its funding target.`, '/coop/funding', 'project');

    return { invId, ref, txr, drawn, amount, contractId, status: drawn ? 'Active' : 'Pending', at: now };
  };

  const confirm = async () => {
    setSaving(true);
    try {
      await simulate(900);
      const rec = commit();
      setResult(rec);
      setConfirmOpen(false);
      setStep(3);
      toast(rec.drawn ? 'Commitment recorded and funds allocated from your balance.' : 'Commitment recorded. It stays Pending until the partner confirms your funds.', 'success');
    } catch {
      toast('We could not record the commitment. Nothing was changed. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const summaryRows = [
    ['Recipient', `${pkg.name}, run by ${coop?.name || 'the cooperative'}`],
    ['Amount', formatNaira(amount)],
    ['Purpose', 'Farming inputs and costs in the approved budget, released in tranches'],
    ['Approval status', `Package ${pkg.status}. Approved by CollabFarm review. Approval is not a guarantee of success or returns.`],
  ];

  return (
    <div className="page">
      <Breadcrumb items={[{ label: 'Funding Packages', to: '/investor/packages' }, { label: pkg.name, to: `/investor/packages/${pkg.id}` }, { label: 'Invest' }]} />
      <PageHeader title={`Invest in ${pkg.name}`} subtitle="Four short steps. Nothing is paid until the financial partner confirms your funds." />
      <Card><Stepper steps={STEPS} current={step} /></Card>

      {step < 3 && (
        <div className="inv-invest">
          <div className="stack">
            {step === 0 && (
              <>
                <Card>
                  <CardHeader title="How much would you like to invest?" subtitle="Enter the amount in Naira. You can commit up to the largest amount shown, and not more than is still open." />
                  <div className="stack">
                    <MoneyField
                      label="Amount to commit"
                      required
                      value={amount}
                      onChange={(v) => { setAmount(v); setErrors({}); }}
                      error={errors.amount}
                      hint={`Smallest ${formatNaira(pkg.minInvestment)}. Largest ${formatNaira(pkg.maxInvestment)}. Still open in this package: ${formatNaira(remaining)}.`}
                    />
                    <div>
                      <div className="caption muted" style={{ marginBottom: 6 }}>Quick amounts</div>
                      <div className="inv-chips" role="group" aria-label="Quick amounts">
                        {chips.map((v) => (
                          <button key={v} type="button" className="inv-chips__chip" aria-pressed={amount === v} onClick={() => { setAmount(v); setErrors({}); }}>
                            {v === maxAllowed && v !== pkg.minInvestment ? `Maximum ${formatNaira(v)}` : formatNaira(v)}
                          </button>
                        ))}
                      </div>
                    </div>
                    {held.length > 0 && <Banner tone="info">You already hold {formatNaira(held.reduce((s, i) => s + i.committed, 0))} in this package. The largest single commitment applies to each new commitment.</Banner>}
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Your wallet" subtitle="Funds are held by a regulated financial partner, not by CollabFarm." action={<Link to="/investor/wallet" className="small strong">Open Wallet</Link>} />
                  <InfoList compact items={[
                    ['Available balance', <strong key="a">{formatNaira(wallet.available)}</strong>],
                    ['Waiting for partner confirmation', `${formatNaira(wallet.pendingConfirmation)} (cannot be used yet)`],
                    ['Locked in commitments', formatNaira(wallet.locked)],
                  ]} />
                  {shortfall > 0 && (
                    <Banner tone="warn" className="mt-4" title={`Shortfall of ${formatNaira(shortfall)}`}>
                      Your available balance is {formatNaira(wallet.available)}. The remainder must be funded through the <Link to="/investor/wallet" className="strong">Wallet</Link>. You can still record this commitment. It stays Pending until the partner confirms it has received the money.
                    </Banner>
                  )}
                  {amount > 0 && (
                    <div className="stack-sm mt-4" role="radiogroup" aria-label="How will this be funded">
                      <label className={`inv-radio${canUseBalance ? '' : ' inv-radio--off'}`}>
                        <input type="radio" name="source" checked={drawn} disabled={!canUseBalance} onChange={() => setSource('balance')} />
                        <span><strong>Use my available balance.</strong><br /><span className="muted">The money is already confirmed at the partner, so the commitment becomes Active straight away and the amount is locked.</span></span>
                      </label>
                      <label className="inv-radio">
                        <input type="radio" name="source" checked={!drawn} onChange={() => setSource('later')} />
                        <span><strong>I will fund it through the Wallet.</strong><br /><span className="muted">The commitment is recorded as Pending. It becomes Active only when the partner confirms receipt.</span></span>
                      </label>
                    </div>
                  )}
                </Card>
                <div className="inv-step-actions">
                  <LinkButton to={`/investor/packages/${pkg.id}`} variant="outline">Back to package</LinkButton>
                  <Button onClick={nextFromAmount}>Continue</Button>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <Card>
                  <CardHeader title="Understand the risks" subtitle="Tick each one to confirm you have read it. Investing can lead to loss." action={<Link to="/investor/risk-disclosures" className="small strong">Full risk disclosure</Link>} />
                  <div className="inv-risk-list">
                    {RISK_ITEMS.map((r) => (
                      <div className="inv-risk-item" key={r.id}>
                        <Checkbox checked={!!ticks[r.id]} onChange={(v) => { setTicks((s) => ({ ...s, [r.id]: v })); setErrors((s) => ({ ...s, risks: undefined })); }}>
                          <strong>{r.title}.</strong> {r.short}
                        </Checkbox>
                      </div>
                    ))}
                  </div>
                  {errors.risks && <span className="field__error mt-2" role="alert">{errors.risks}</span>}
                </Card>
                <Card>
                  <CardHeader title={`Agreement A summary (${version})`} subtitle="This is a summary. The full signed agreement is saved to your Agreements page." action={<Button size="sm" variant="outline-green" onClick={downloadPreview}><Download size={16} />Preview</Button>} />
                  <div className="inv-note-box"><strong>Funding model: {model.kind}.</strong> {model.text} The funding model for this package is shown as "{pkg.returnStructure}". It is configurable and set in the agreement, not decided on this page.</div>
                  <div className="inv-agreement mt-4">
                    <dl>
                      {AGREEMENT_SECTIONS.map(([h, t]) => (<div key={h}><dt>{h}</dt><dd>{t}</dd></div>))}
                    </dl>
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Sign the agreement" subtitle="Your typed name is your signature. We record the version and the time." />
                  <div className="stack">
                    <TextField label="Type your full name" required value={signName} onChange={(e) => { setSignName(e.target.value); setErrors((s) => ({ ...s, name: undefined })); }} error={errors.name} hint={`As on your profile: ${investor.name}`} autoComplete="off" />
                    <Checkbox checked={consent} onChange={(v) => { setConsent(v); setErrors((s) => ({ ...s, consent: undefined })); }} error={errors.consent}>
                      I have read the Agreement A summary ({version}), I understand the funding model above, and I agree to be bound by the signed agreement.
                    </Checkbox>
                  </div>
                </Card>
                <div className="inv-step-actions">
                  <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
                  <Button onClick={nextFromRisks}>Continue to review</Button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <Card>
                  <CardHeader title="Review your commitment" subtitle="Check every line. This is a commitment, not a payment." />
                  <InfoList items={[
                    ...summaryRows,
                    ['Funding source', drawn ? 'Available balance (already confirmed by the partner)' : 'To be funded through the Wallet. Pending until confirmed'],
                    ['Agreement', `Agreement A ${version}, signed by typed name: ${signName.trim()}`],
                    ['Risks acknowledged', `${RISK_ITEMS.length} of ${RISK_ITEMS.length}`],
                    ['Status after you confirm', <StatusPill key="s">{drawn ? 'Active' : 'Pending'}</StatusPill>],
                  ]} />
                  <Banner tone="warn" className="mt-4">Your estimated return of about {pkg.expectedRoiPct}% is an estimate, not a guarantee. You can lose some or all of your money.</Banner>
                </Card>
                <div className="inv-step-actions">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={() => setConfirmOpen(true)}>Confirm commitment</Button>
                </div>
              </>
            )}
          </div>

          <aside className="inv-invest__side">
            <Card>
              <div className="row between"><CategoryChip category={pkg.category} /><PkgStatusChip status={pkg.status} /></div>
              <h2 style={{ marginTop: 10 }}>{pkg.name}</h2>
              <p className="caption muted">by {coop?.name}</p>
              <div className="stack-sm mt-4">
                <div className="row between small"><span>{funding.pct}% funded</span><span className="muted">{formatNaira(pkg.raised)} of {formatNaira(pkg.amount)}</span></div>
                <Progress value={funding.pct} label="Package funding progress" />
              </div>
              <InfoList compact items={[
                ['Your amount', amount ? <strong key="a">{formatNaira(amount)}</strong> : 'Not entered'],
                ['Smallest', formatNaira(pkg.minInvestment)],
                ['Largest', formatNaira(pkg.maxInvestment)],
                ['Still open', formatNaira(remaining)],
                ['Closes', formatDate(pkg.closingDate)],
                ['Estimated return', `About ${pkg.expectedRoiPct}% (estimate)`],
              ]} />
            </Card>
          </aside>
        </div>
      )}

      {step === 3 && result && (
        <>
          <Card>
            <div className="inv-success">
              <span className="inv-success__icon"><CheckCircle2 size={36} /></span>
              <h2>Your commitment is recorded</h2>
              <p className="muted" style={{ maxWidth: 520 }}>
                {result.drawn
                  ? 'The amount was taken from your available balance and locked. It is confirmed because the partner already held that money.'
                  : 'This is a commitment, not a payment. It is not received money until the financial partner confirms it.'}
              </p>
              <StatusPill>{result.status}</StatusPill>
            </div>
            <InfoList compact items={[
              ['Investment reference', <strong key="r">{result.ref}</strong>],
              ['Transaction reference', result.txr],
              ['Package', pkg.name],
              ['Amount', formatNaira(result.amount)],
              ['Agreement A', `${version}, signed ${formatDateTime(result.at)}`],
            ]} />
          </Card>
          <Card>
            <CardHeader title="What happens next" />
            <Timeline items={[
              { title: 'Commitment recorded', meta: formatDateTime(result.at), body: 'The cooperative and CollabFarm reviewers have been notified.', state: 'done' },
              { title: result.drawn ? 'Funds confirmed' : 'Funds confirmed only when the partner receives them', meta: result.drawn ? 'Already confirmed from your balance' : 'Fund your wallet and wait for the partner to confirm. A payment initiation is not proof of receipt.', state: result.drawn ? 'done' : 'active' },
              { title: 'Release only after milestones are approved', meta: 'Money is released in four tranches, and only after evidence for the previous stage is approved.' },
              { title: 'Updates and returns', meta: `You will see progress, disbursements and any distribution on your investment page. The estimated return of about ${pkg.expectedRoiPct}% is not guaranteed.` },
            ]} />
          </Card>
          <div className="inv-step-actions">
            <LinkButton to="/investor/packages" variant="outline">Back to packages</LinkButton>
            <div className="row-wrap">
              {!result.drawn && <LinkButton to="/investor/wallet" variant="outline-green"><Landmark size={16} />Fund wallet</LinkButton>}
              <LinkButton to={`/investor/investments/${result.invId}`}><HandCoins size={16} />View investment</LinkButton>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => !saving && setConfirmOpen(false)}
        onConfirm={confirm}
        loading={saving}
        tone="green"
        icon={ShieldAlert}
        title="Confirm your commitment"
        message="Check the details before you confirm."
        summary={summaryRows}
        warning="A commitment is not received money. Funds count as confirmed only when the financial partner receives them."
        confirmLabel="Confirm commitment"
        cancelLabel="Go back"
      />
    </div>
  );
}
