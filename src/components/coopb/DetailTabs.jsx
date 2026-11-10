import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ArrowRight, FileSignature } from 'lucide-react';
import { Card, CardHeader, InfoList, Checklist, StatusPill, EmptyState, DataTable, LinkButton, Banner, Avatar } from '../ui/index.js';
import { useApp } from '../../context/AppContext.jsx';
import { formatNaira, formatDate, formatDateTime, percent } from '../../utils/format.js';
import { budgetReconciles, canReleaseTranche } from '../../utils/rules.js';
import { EDITABLE_STATUSES } from './constants.jsx';
import { PlainTerms, ReconPanel } from './Common.jsx';
import { trancheAmounts } from './logic.js';

const PRE_APPROVAL = ['Draft', 'Submitted', 'Under Review', 'Changes Requested'];
export const itemApproval = (pkg, b) => (PRE_APPROVAL.includes(pkg.status) ? 'Pending' : b.approval || 'Approved');

/* ---------------------------------------------------------------- Overview */
export function OverviewTab({ pkg, farms }) {
  const items = (pkg.inclusions?.length ? pkg.inclusions.map((i) => i.item) : (pkg.budget || []).map((b) => b.description)).filter(Boolean);
  const chosen = farms.filter((f) => (pkg.farmIds || []).includes(f.id));
  const range = pkg.returnLow || pkg.returnHigh ? `${pkg.returnLow}% to ${pkg.returnHigh}%` : null;
  return (
    <div className="stack-lg">
      <div className="grid-main">
        <Card>
          <CardHeader title="About this package" subtitle="What it funds and the main terms." />
          <p style={{ marginBottom: 12 }}>{pkg.description || 'No description yet.'}</p>
          <InfoList compact items={[
            ['Crop or activity', pkg.crop || pkg.category],
            ['Farming dates', pkg.startDate && pkg.endDate ? `${formatDate(pkg.startDate)} to ${formatDate(pkg.endDate)}` : 'Not set'],
            ['Funding closes', pkg.closingDate ? formatDate(pkg.closingDate) : 'Not set'],
            ['Minimum funding target', pkg.minTarget ? formatNaira(pkg.minTarget) : 'Not set'],
            ['Investment per investor', `${formatNaira(pkg.minInvestment)} to ${formatNaira(pkg.maxInvestment)}`],
            ['Expected return (estimate)', `${range ? `${range}, about ` : ''}${pkg.expectedRoiPct}% (an estimate, not a promise)`],
            ['Cooperative share', `${pkg.coopSharePct}% of profit`],
            ['Expected output', pkg.expectedOutput || 'Not set'],
          ]} />
        </Card>
        <Card>
          <CardHeader title="What's Included" subtitle="Inputs and costs the money pays for." />
          {items.length ? <Checklist items={items} /> : <p className="muted small">No items listed yet.</p>}
          {chosen.length > 0 && (
            <>
              <hr className="divider" />
              <div className="strong small" style={{ marginBottom: 8 }}>Farm locations</div>
              <ul className="coopb-plain-list">{chosen.map((f) => <li key={f.id}>{f.name}, {f.location} ({f.areaHa} ha)</li>)}</ul>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Farmers */
export function FarmersTab({ pkg }) {
  const { data } = useApp();
  const farmers = data.farmers.filter((f) => f.allocationPackageId === pkg.id);
  const columns = [
    { key: 'name', header: 'Farmer', render: (f) => <span className="strong">{f.name}</span> },
    { key: 'cropType', header: 'Crop or activity', render: (f) => f.farmingCategory || f.cropType || '-' },
    { key: 'allocatedAmount', header: 'Allocated amount', render: (f) => <span className="nowrap">{formatNaira(f.allocatedAmount || 0)}</span> },
    { key: 'agreementStatus', header: 'Agreement', render: (f) => <StatusPill>{f.agreementStatus || 'Not Signed'}</StatusPill> },
    { key: 'status', header: 'Verification', render: (f) => <StatusPill>{f.status || 'Pending'}</StatusPill> },
  ];
  return (
    <DataTable
      columns={columns}
      rows={farmers}
      pageSize={10}
      searchKeys={['name', 'cropType', 'farmingCategory']}
      searchPlaceholder="Search farmers"
      totalLabel="farmers"
      emptyTitle="No farmers allocated"
      emptyText="Farmers allocated to this package will appear here."
    />
  );
}

/* ------------------------------------------------------------------ Budget */
export function BudgetTab({ pkg }) {
  const budget = pkg.budget || [];
  const r = budgetReconciles(pkg);
  const approvedTotal = budget.filter((b) => itemApproval(pkg, b) === 'Approved').reduce((s, b) => s + (Number(b.amount) || 0), 0);
  if (!budget.length) {
    return (
      <Card>
        <EmptyState title="No budget items yet" action={EDITABLE_STATUSES.includes(pkg.status) ? <LinkButton to={`/coop/funding/new?edit=${pkg.id}&step=details`}>Add budget items</LinkButton> : undefined}>
          A package needs a budget that adds up to its amount before it can be submitted.
        </EmptyState>
      </Card>
    );
  }
  return (
    <div className="stack-lg">
      <Card>
        <CardHeader title="Budget by category" subtitle={PRE_APPROVAL.includes(pkg.status) ? 'These amounts are your proposal. A reviewer approves each item.' : 'Approved amounts per category. Material changes need a budget change request.'} />
        <div className="table-wrap">
          <table className="data-table" style={{ minWidth: 760 }}>
            <thead><tr><th>Category</th><th>Item</th><th>Responsible</th><th>Document</th><th className="right">Proposed</th><th className="right">Approved</th><th>Approval</th></tr></thead>
            <tbody>
              {budget.map((b) => {
                const ap = itemApproval(pkg, b);
                return (
                  <tr key={b.id}>
                    <td className="strong">{b.category}</td>
                    <td>{b.description}</td>
                    <td>{b.responsible}</td>
                    <td>{b.docs ? <span className="green small strong">{b.docs}</span> : <StatusPill tone="amber">Missing</StatusPill>}</td>
                    <td className="right nowrap">{formatNaira(b.amount)}</td>
                    <td className="right nowrap">{ap === 'Approved' ? formatNaira(b.amount) : '-'}</td>
                    <td><StatusPill>{ap}</StatusPill></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr><td colSpan={4} className="strong">Totals</td><td className="right strong nowrap">{formatNaira(r.total)}</td><td className="right strong nowrap">{formatNaira(approvedTotal)}</td><td /></tr>
            </tfoot>
          </table>
        </div>
      </Card>
      <Card>
        <CardHeader title="Reconciliation" subtitle="The budget must add up exactly to the package amount." />
        <ReconPanel budget={budget} amount={pkg.amount} />
      </Card>
      <PlainTerms terms={['reconciliation']} />
    </div>
  );
}

/* -------------------------------------------------------- Funding and investors */
export function FundingTab({ pkg }) {
  const { data } = useApp();
  const invs = data.investments.filter((i) => i.packageId === pkg.id);
  const name = (id) => data.investors.find((i) => i.id === id)?.name || 'Investor';
  const rows = invs.map((i) => ({ ...i, investorName: name(i.investorId) }));
  const columns = [
    { key: 'investorName', header: 'Investor', render: (r) => <span className="strong">{r.investorName}</span> },
    { key: 'ref', header: 'Reference', render: (r) => <span className="cell-sub">{r.ref}</span> },
    { key: 'committed', header: 'Committed', render: (r) => <span className="nowrap">{formatNaira(r.committed)}</span> },
    { key: 'confirmed', header: 'Confirmed received', render: (r) => (<><span className="nowrap">{formatNaira(r.confirmed)}</span>{r.confirmed < r.committed && <span className="coopb-awaiting">Awaiting confirmation</span>}</>) },
    { key: 'dateInvested', header: 'Date', render: (r) => <span className="nowrap">{formatDate(r.dateInvested)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusPill>{r.status}</StatusPill> },
  ];
  return (
    <div className="stack-lg">
      <div className="stack-sm">
        <h2>Investors</h2>
        <p className="muted small">Shown by display name only. Contact details are never shared with the cooperative.</p>
      </div>
      <DataTable columns={columns} rows={rows} pageSize={6} totalLabel="investments" emptyTitle="No investor has committed yet" emptyText="Investors can commit once the package is open for funding." />
      <PlainTerms terms={['commitment']} />
    </div>
  );
}

/* ---------------------------------------------------------------- Tranches */
export function TranchesTab({ pkg, agreements }) {
  const { data } = useApp();
  const real = data.tranches.filter((t) => t.packageId === pkg.id).sort((a, b) => a.number - b.number);
  const projected = real.length === 0;
  const rows = projected
    ? trancheAmounts(pkg.amount, pkg.category).map((t) => ({ id: `${pkg.id}-plan-${t.number}`, packageId: pkg.id, number: t.number, name: t.name, purpose: t.purpose, conditions: t.conditions, amount: t.amount, status: 'Locked' }))
    : real;
  const nextIdx = rows.findIndex((t) => t.status !== 'Released');
  return (
    <div className="stack-lg">
      {projected && (
        <Banner tone="info" title="Projected stages">
          These are the four stages your package will follow. The tranche records are created when the package is approved. Amounts follow the platform shares and update if you change the package amount.
        </Banner>
      )}
      <PlainTerms terms={['tranche']} />
      <div className="coopb-tranches">
        {rows.map((t, idx) => {
          const rule = projected ? null : canReleaseTranche(t, real, data.milestones);
          const ms = data.milestones.filter((m) => m.trancheId === t.id);
          const approved = ms.filter((m) => m.status === 'Approved').length;
          const missing = [];
          if (t.status !== 'Released') {
            if (projected) missing.push('Created after the package is approved.');
            else {
              if (!rule.prevOk) missing.push(`Tranche ${t.number - 1} has not been released yet.`);
              if (!ms.length) missing.push('No milestone is linked to this tranche yet.');
              else if (!rule.evidenceOk) missing.push(`${approved} of ${ms.length} milestone${ms.length === 1 ? '' : 's'} approved. Evidence must be approved by a reviewer.`);
              if (idx === nextIdx && agreements.missing.length) missing.push(`Mandatory agreement missing: ${agreements.missing.map((m) => `Agreement ${m.key}`).join(' and ')}. See the Agreements tab.`);
            }
          }
          const ready = !projected && t.status !== 'Released' && rule.allowed && !(idx === nextIdx && agreements.missing.length);
          return (
            <article key={t.id} className="coopb-tranche" aria-label={`Tranche ${t.number}`}>
              <div className="stack-sm">
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <span className="coopb-tranche__no">T{t.number}</span>
                  <div className="grow">
                    <div className="strong">{t.name}</div>
                    <div className="cell-sub">{t.purpose}</div>
                  </div>
                  <StatusPill>{t.status}</StatusPill>
                </div>
                <div className="strong" style={{ fontSize: 22 }}>{formatNaira(t.amount)}</div>
                <div className="caption muted">{percent(t.amount, pkg.amount)}% of the package amount{t.releasedAt ? `. Released ${formatDateTime(t.releasedAt)}` : ''}</div>
              </div>
              <div className="stack-sm">
                <div className="strong small">Release conditions</div>
                <ul className="coopb-plain-list">{(t.conditions || []).map((c) => <li key={c}>{c}</li>)}</ul>
                {t.status === 'Released' ? (
                  <ul className="coopb-missing coopb-missing--ok"><li><CheckCircle2 size={16} />Released. Conditions were met and a payment approver authorised the money.</li></ul>
                ) : ready ? (
                  <ul className="coopb-missing coopb-missing--ok"><li><CheckCircle2 size={16} />Conditions are met. A CollabFarm payment approver releases the money. You cannot release it yourself.</li></ul>
                ) : (
                  <>
                    <div className="strong small" style={{ marginTop: 4 }}>What is missing</div>
                    <ul className="coopb-missing coopb-missing--bad">{missing.map((m) => <li key={m}><AlertCircle size={16} />{m}</li>)}</ul>
                  </>
                )}
                {!projected && <Link to="/coop/farming-progress" className="small strong row" style={{ gap: 6 }}>View evidence and milestones <ArrowRight size={14} /></Link>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Agreements */
export function AgreementsTab({ pkg, agreements }) {
  const { b, a, c, required, missing } = agreements;
  const cCols = [
    { key: 'farmer', header: 'Farmer', render: (r) => <span className="cell-person"><Avatar name={r.farmer.name} size="sm" />{r.farmer.name}</span> },
    { key: 'status', header: 'Agreement C', render: (r) => <StatusPill>{r.status}</StatusPill> },
    { key: 'version', header: 'Version', render: (r) => r.contract?.version || '-' },
    { key: 'signed', header: 'Signed', render: (r) => (r.contract?.signedAt ? formatDateTime(r.contract.signedAt) : '-') },
    { key: 'open', header: '', render: (r) => (r.contract ? <Link className="small strong" to={`/coop/contracts/${r.contract.id}`}>Open</Link> : <span className="cell-sub">Not issued</span>) },
  ];
  return (
    <div className="stack-lg">
      {missing.length > 0 && (
        <Banner tone="warn" title="Funding steps are blocked until these agreements are signed">
          <ul className="coopb-terms">{missing.map((m) => <li key={m.key}><strong>{m.label}.</strong> {m.detail}.</li>)}</ul>
          <div style={{ marginTop: 8 }}><Link to="/coop/contracts" className="strong">Open Contracts and sign</Link></div>
        </Banner>
      )}
      {!required && <Banner tone="info" title="Agreements come after approval">Agreement B is issued once the package is approved. Agreement C is signed by each allocated farmer. Agreement A is signed by each investor before they commit.</Banner>}

      <Card>
        <div className="coopb-agreement">
          <div>
            <div className="row"><FileSignature size={20} /><h2 className="card__title strong">Agreement B: Cooperative Funding and Accountability Agreement</h2></div>
            {b ? (
              <InfoList compact items={[
                ['Status', <StatusPill key="s">{b.status}</StatusPill>], ['Version', b.version],
                ['Signed by', b.signatory ? `${b.signatory}, ${formatDateTime(b.signedAt)}` : 'Not signed yet'],
                ['Cooperative liability', b.liability || '-'],
              ]} />
            ) : <p className="muted small" style={{ marginTop: 8 }}>{required ? 'Not issued yet. Contact CollabFarm support if it does not appear soon.' : 'Not issued yet.'}</p>}
          </div>
          <LinkButton to={b ? `/coop/contracts/${b.id}` : '/coop/contracts'} variant="outline-green" size="sm">{b ? 'Open agreement' : 'Open Contracts'}</LinkButton>
        </div>
      </Card>

      <Card>
        <CardHeader title="Agreement A: Investor Funding Agreement" subtitle="Each investor signs this before they commit. You can see the status only." />
        <p className="small">{a.length ? `${a.filter((x) => x.status === 'Signed').length} signed and ${a.filter((x) => x.status !== 'Signed').length} awaiting signature on record for this package.` : 'No investor agreement is on record for this package yet.'}</p>
      </Card>

      <div className="stack-sm">
        <h2>Agreement C: Farmer Participation Agreement</h2>
        <p className="muted small">Every allocated farmer must sign before funds are released to or for them.</p>
      </div>
      <DataTable columns={cCols} rows={c} rowKey={(r) => r.farmer.id} pageSize={8} totalLabel="farmers" emptyTitle="No farmers allocated yet" emptyText="Add farmers and their investment amounts while creating the package. Their agreements are tracked here." />
    </div>
  );
}

