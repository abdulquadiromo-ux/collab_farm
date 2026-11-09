import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, Trash2, AlertTriangle, Send, Save, Wand2, Users, Banknote, Wheat, Scale } from 'lucide-react';
import {
  Breadcrumb, PageHeader, Card, CardHeader, KpiStrip, Banner, Button, LinkButton, EmptyState, Avatar, SearchInput, FilterSelect, StatusPill, ConfirmDialog,
} from '../../components/ui/index.js';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { formatNaira, formatDate, formatNumber, NAIRA, cx } from '../../utils/format.js';
import { allocationCheck } from '../../utils/rules.js';
import { useCoop } from '../../components/coopb/hooks.js';
import { ALLOCATABLE_STATUSES, BUDGET_CATEGORIES, FINISHED_STATUSES } from '../../components/coopb/constants.jsx';
import { PlainTerms, ThreeRules } from '../../components/coopb/Common.jsx';
import '../../styles/pages/coopb.css';

const SUPPORT_TYPES = ['Cash', 'In-kind'];

const initRows = (pkg, farmers, purposes) => farmers.filter((f) => f.allocationPackageId === pkg.id).map((f) => ({
  farmerId: f.id,
  purpose: f.allocation?.purpose || purposes[0] || '',
  supportType: f.allocation?.supportType || 'Cash',
  amount: f.allocatedAmount || '',
  expectedDate: f.allocation?.expectedDate || pkg.startDate || '',
}));
const snapshot = (rows) => JSON.stringify(rows.map((r) => [r.farmerId, r.purpose, r.supportType, Number(r.amount) || 0, r.expectedDate]));

function AmountInput({ value, onChange, label, invalid }) {
  return (
    <div className="money">
      <span className="input money__cur" aria-hidden="true" style={{ display: 'grid', placeItems: 'center' }}>{NAIRA}</span>
      <input
        className={cx('input', invalid && 'input--error')} inputMode="numeric" aria-label={label} placeholder="0" aria-invalid={invalid || undefined}
        value={value === '' || value == null ? '' : Number(value).toLocaleString('en-NG')}
        onChange={(e) => { const d = e.target.value.replace(/[^0-9]/g, ''); onChange(d === '' ? '' : Number(d)); }}
      />
    </div>
  );
}

export default function Allocation() {
  const { id } = useParams();
  const { data, user, toast, patchData, audit, notify } = useApp();
  const { coop, verified, farmers } = useCoop();
  const pkg = data.packages.find((p) => p.id === id && p.coopId === user.orgId);

  const purposes = useMemo(() => {
    const own = [...new Set((pkg?.budget || []).map((b) => b.category).filter(Boolean))];
    return own.length ? own : BUDGET_CATEGORIES;
  }, [pkg]);

  const [rows, setRows] = useState(() => (pkg ? initRows(pkg, farmers, purposes) : []));
  const [saved, setSaved] = useState(() => (pkg ? snapshot(initRows(pkg, farmers, purposes)) : '[]'));
  const [search, setSearch] = useState('');
  const [crop, setCrop] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [askSign, setAskSign] = useState(false);
  const [signBusy, setSignBusy] = useState(false);

  if (!pkg) {
    return (
      <div className="page">
        <EmptyState title="Package not found" action={<LinkButton to="/coop/funding">Back to Funding Packages</LinkButton>}>
          This package does not exist or belongs to another cooperative.
        </EmptyState>
      </div>
    );
  }
  if (!ALLOCATABLE_STATUSES.includes(pkg.status)) {
    return (
      <div className="page">
        <Breadcrumb items={[{ label: 'Funding Packages', to: '/coop/funding' }, { label: pkg.name, to: `/coop/funding/${pkg.id}` }, { label: 'Allocate to Farmers' }]} />
        <EmptyState title="Allocation is closed for this package" action={<LinkButton to={`/coop/funding/${pkg.id}?tab=allocation`}>See the allocation summary</LinkButton>}>
          Farmers can be allocated while a package is Draft, Changes Requested, Approved or Open for Funding. This package is {pkg.status}.
        </EmptyState>
      </div>
    );
  }

  const farmerById = (fid) => data.farmers.find((f) => f.id === fid);
  const inRows = new Set(rows.map((r) => r.farmerId));
  const pkgStatus = (pid) => data.packages.find((p) => p.id === pid)?.status;
  const lockedElsewhere = (f) => f.allocationPackageId && f.allocationPackageId !== pkg.id && !FINISHED_STATUSES.includes(pkgStatus(f.allocationPackageId));
  const verifiedFarmers = farmers.filter((f) => f.status === 'Verified');
  const hidden = verifiedFarmers.filter((f) => !inRows.has(f.id) && lockedElsewhere(f)).length;
  const crops = [...new Set(verifiedFarmers.map((f) => f.cropType))].sort();
  const q = search.trim().toLowerCase();
  const available = verifiedFarmers.filter((f) => !inRows.has(f.id) && !lockedElsewhere(f)
    && (!crop || f.cropType === crop) && (!q || `${f.name} ${f.cropType}`.toLowerCase().includes(q)));

  const check = allocationCheck(pkg, rows.map((r) => ({ farmerId: r.farmerId, amount: Number(r.amount) || 0 })));
  const cash = rows.filter((r) => r.supportType === 'Cash').reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const inKind = check.total - cash;
  const dirty = snapshot(rows) !== saved;

  const flagsFor = (fid) => {
    const f = farmerById(fid);
    const out = [];
    if (!f) return out;
    if (f.identityStatus !== 'Verified') out.push('Identity is not verified yet.');
    if (f.agreementStatus !== 'Signed') out.push(`Agreement C is ${f.agreementStatus === 'Awaiting Signature' ? 'awaiting signature' : 'not signed'}. It must be signed before funds are released.`);
    if (f.duplicateFlag) out.push(`${f.duplicateFlag}. A reviewer must clear it.`);
    return out;
  };
  const warnedCount = rows.filter((r) => flagsFor(r.farmerId).length).length;

  const addFarmer = (f) => {
    setRows((r) => [...r, { farmerId: f.id, purpose: purposes[0] || '', supportType: 'Cash', amount: '', expectedDate: pkg.startDate || '' }]);
  };
  const removeRow = (fid) => { setRows((r) => r.filter((x) => x.farmerId !== fid)); setErrors((e) => { const { [fid]: _x, ...rest } = e; return rest; }); };
  const patchRow = (fid, patch) => {
    setRows((r) => r.map((x) => (x.farmerId === fid ? { ...x, ...patch } : x)));
    setErrors((e) => (e[fid] ? { ...e, [fid]: { ...e[fid], ...Object.fromEntries(Object.keys(patch).map((k) => [k, undefined])) } } : e));
  };

  const splitRemaining = () => {
    const empty = rows.filter((r) => !Number(r.amount));
    if (!empty.length) { toast('Every farmer already has an amount.', 'info'); return; }
    if (check.remaining <= 0) { toast('There is no budget left to share.', 'error'); return; }
    const share = Math.floor(check.remaining / empty.length / 1000) * 1000;
    if (share <= 0) { toast('The remaining budget is too small to split.', 'error'); return; }
    const lastId = empty[empty.length - 1].farmerId;
    // Work out the new amounts before calling setRows so the result does not depend on how often React runs the updater.
    const amounts = {};
    let used = 0;
    empty.forEach((x) => {
      if (x.farmerId === lastId) { amounts[x.farmerId] = check.remaining - used; return; }
      amounts[x.farmerId] = share;
      used += share;
    });
    setRows((r) => r.map((x) => (amounts[x.farmerId] !== undefined && !Number(x.amount) ? { ...x, amount: amounts[x.farmerId] } : x)));
    toast('Remaining budget split equally. Review each amount before saving.', 'info');
  };

  const validate = () => {
    const e = {};
    rows.forEach((r) => {
      const re = {};
      if (!(Number(r.amount) > 0)) re.amount = 'Enter an amount above zero.';
      if (!r.purpose) re.purpose = 'Choose a purpose.';
      if (!r.expectedDate) re.expectedDate = 'Choose the expected date.';
      if (Object.keys(re).length) e[r.farmerId] = re;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const blocked = !verified || check.overBudget || check.duplicates.length > 0;
  const save = async () => {
    if (!verified) { toast('Your cooperative must be verified first.', 'error'); return; }
    if (check.overBudget) { toast(`Allocations are ${formatNaira(-check.remaining)} over the budget. Reduce them before saving.`, 'error'); return; }
    if (!rows.length) { toast('Add at least one farmer before saving.', 'error'); return; }
    if (!validate()) { toast('Some rows need attention. They are marked in red.', 'error'); return; }
    setSaving(true);
    await simulate(600);
    const byId = Object.fromEntries(rows.map((r) => [r.farmerId, r]));
    patchData((d) => ({
      farmers: d.farmers.map((f) => {
        const r = byId[f.id];
        if (r) return { ...f, allocationPackageId: pkg.id, allocatedAmount: Number(r.amount), allocation: { purpose: r.purpose, supportType: r.supportType, expectedDate: r.expectedDate, approval: 'Pending' } };
        if (f.allocationPackageId === pkg.id) return { ...f, allocationPackageId: null, allocatedAmount: 0, allocation: null };
        return f;
      }),
      packages: d.packages.map((p) => (p.id === pkg.id ? { ...p, farmersCount: rows.length } : p)),
    }));
    audit({ action: 'Farmer allocation saved', entityType: 'Package', entityId: pkg.id, summary: `${rows.length} farmer${rows.length === 1 ? '' : 's'}, ${formatNaira(check.total)} allocated (cash ${formatNaira(cash)}, in-kind ${formatNaira(inKind)})`, reason: 'Allocation proposed by the cooperative, pending review' });
    setSaved(snapshot(rows));
    setSaving(false);
    toast(`Allocation saved for ${rows.length} farmer${rows.length === 1 ? '' : 's'}.`);
  };

  const needSig = data.farmers.filter((f) => f.allocationPackageId === pkg.id && f.agreementStatus !== 'Signed');
  const requestSignatures = async () => {
    setSignBusy(true);
    await simulate(600);
    const ids = new Set(needSig.map((f) => f.id));
    patchData((d) => ({ farmers: d.farmers.map((f) => (ids.has(f.id) ? { ...f, agreementStatus: 'Awaiting Signature' } : f)) }));
    const accounts = needSig.filter((f) => data.users.some((u) => u.role === 'farmer' && u.farmerId === f.id)).length;
    // notify() is role based, so one message goes to farmer accounts; each farmer sees their own status on their agreement page.
    if (accounts > 0) {
      notify('farmer', 'Agreement signature requested', `${coop?.name || 'Your cooperative'} asked farmers allocated to ${pkg.name} to sign the Farmer Participation Agreement (Agreement C). Open your agreement to see if it is waiting for you.`, '/farmer/agreement', 'contract');
    }
    const notified = accounts;
    audit({ action: 'Agreement C signatures requested', entityType: 'Package', entityId: pkg.id, summary: `${needSig.length} farmer${needSig.length === 1 ? '' : 's'} set to Awaiting Signature`, reason: 'Cooperative requested signatures' });
    setSignBusy(false);
    setAskSign(false);
    toast(`Signature requests recorded for ${needSig.length} farmer${needSig.length === 1 ? '' : 's'}. ${notified} with app accounts were notified. Please also tell the others in person.`);
  };

  const cells = [
    { icon: <Banknote size={20} />, label: 'Package budget', value: formatNaira(pkg.amount), sub: 'The most you can allocate' },
    { icon: <Users size={20} />, label: 'Total allocated', value: formatNaira(check.total), sub: `${rows.length} farmer${rows.length === 1 ? '' : 's'}` },
    { icon: <Scale size={20} />, label: check.overBudget ? 'Over budget by' : 'Remaining', value: formatNaira(Math.abs(check.remaining)), sub: check.overBudget ? 'Reduce amounts to continue' : 'Still to allocate' },
    { icon: <Wheat size={20} />, label: 'Cash and in-kind', value: `${formatNaira(cash, { compact: true })} / ${formatNaira(inKind, { compact: true })}`, sub: 'Cash paid out / goods supplied' },
  ];

  return (
    <div className="page">
      <Breadcrumb items={[{ label: 'Funding Packages', to: '/coop/funding' }, { label: pkg.name, to: `/coop/funding/${pkg.id}` }, { label: 'Allocate to Farmers' }]} />
      <PageHeader
        title="Allocate to Farmers"
        subtitle={`Share the budget of ${pkg.name} between your verified farmers.`}
        actions={(
          <>
            <LinkButton to={`/coop/funding/${pkg.id}`} variant="soft" size="lg">Back to package</LinkButton>
            <Button variant="outline-green" size="lg" onClick={() => setAskSign(true)} disabled={!verified || dirty || needSig.length === 0} title={dirty ? 'Save the allocation first' : needSig.length === 0 ? 'All allocated farmers have signed' : undefined}><Send size={16} />Request Agreement C signatures</Button>
            <Button size="lg" onClick={save} loading={saving} disabled={blocked || !dirty}><Save size={16} />Save allocation</Button>
          </>
        )}
      />

      {!verified && <Banner tone="warn" title="Your cooperative is not verified yet">You cannot change allocations until CollabFarm verifies your cooperative. <Link to="/onboarding/status">Check your status</Link>.</Banner>}
      <PlainTerms terms={['allocation', 'agreementC']} />
      <KpiStrip cells={cells} />

      {check.overBudget && <Banner tone="danger" title="Allocations are over the package budget">Total allocated is {formatNaira(check.total)} and the budget is {formatNaira(pkg.amount)}. Reduce amounts by {formatNaira(-check.remaining)} before you can save.</Banner>}
      {check.duplicates.length > 0 && <Banner tone="danger" title="A farmer appears more than once">Remove the duplicate rows before saving.</Banner>}
      {warnedCount > 0 && <Banner tone="warn" title={`${warnedCount} allocated farmer${warnedCount === 1 ? ' needs' : 's need'} attention`}>These are warnings, not blockers: you can save. Funds are not released to a farmer until identity is verified and Agreement C is signed.</Banner>}
      {dirty && <Banner tone="info">You have unsaved changes. Nothing is stored until you choose Save allocation.</Banner>}

      <div className="coopb-alloc">
        <Card>
          <CardHeader title="Available farmers" subtitle={`${available.length} verified and free to allocate`} />
          <div className="stack-sm" style={{ marginBottom: 12 }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search farmers" />
            <FilterSelect value={crop} onChange={setCrop} allLabel="All crops" options={crops} label="Filter by crop" />
          </div>
          {available.length === 0 ? (
            <p className="muted small">{verifiedFarmers.length === 0 ? 'No verified farmers yet.' : 'No farmers match. Everyone free has been added or filtered out.'}</p>
          ) : (
            <ul className="coopb-pick" aria-label="Available farmers">
              {available.map((f) => (
                <li key={f.id} className="coopb-pick__item">
                  <Avatar name={f.name} size="sm" />
                  <div className="grow">
                    <div className="coopb-pick__name">{f.name}</div>
                    <div className="cell-sub">{f.cropType}, {f.farmSize} {f.farmSizeUnit.toLowerCase()}</div>
                    <div className="coopb-pick__flags">
                      {f.agreementStatus !== 'Signed' && <StatusPill tone="amber">Agreement C {f.agreementStatus === 'Awaiting Signature' ? 'awaiting' : 'not signed'}</StatusPill>}
                      {f.duplicateFlag && <StatusPill tone="red">Possible duplicate</StatusPill>}
                    </div>
                  </div>
                  <button type="button" className="coopb-add" disabled={!verified} onClick={() => addFarmer(f)} aria-label={`Add ${f.name} to the allocation`}><Plus size={18} /></button>
                </li>
              ))}
            </ul>
          )}
          {hidden > 0 && <p className="caption muted" style={{ marginTop: 10 }}>{hidden} verified farmer{hidden === 1 ? ' is' : 's are'} hidden because they are already allocated to another active package.</p>}
        </Card>

        <Card>
          <CardHeader title="Allocation" subtitle="Cash is paid out. In-kind means goods or services such as seed or ploughing." />
          <div className="coopb-split-row">
            <Button variant="outline-green" size="sm" onClick={splitRemaining} disabled={rows.length === 0}><Wand2 size={14} />Split remaining equally</Button>
          </div>
          {rows.length === 0 ? (
            <EmptyState icon={<Users size={28} />} title="No farmers allocated yet">Use the plus button next to a farmer in the Available farmers list to add them to this package.</EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="data-table coopb-alloc-table">
                <thead>
                  <tr><th>Farmer</th><th>Purpose</th><th>Support type</th><th>Amount</th><th>Expected date</th><th><span className="sr-only">Remove</span></th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const f = farmerById(r.farmerId);
                    const flags = flagsFor(r.farmerId);
                    const er = errors[r.farmerId] || {};
                    return (
                      <tr key={r.farmerId}>
                        <td style={{ minWidth: 150 }}>
                          <div className="cell-person"><Avatar name={f?.name || ''} size="sm" /><div><div>{f?.name || r.farmerId}</div><div className="cell-sub" style={{ fontWeight: 400 }}>{f?.cropType}</div></div></div>
                          {flags.map((w) => <div key={w} className="coopb-warn"><AlertTriangle size={13} />{w}</div>)}
                        </td>
                        <td style={{ minWidth: 140 }}>
                          <select className={cx('select', er.purpose && 'input--error')} title={r.purpose} aria-label={`Purpose for ${f?.name}`} value={r.purpose} onChange={(e) => patchRow(r.farmerId, { purpose: e.target.value })}>
                            <option value="">Choose</option>
                            {[...new Set([...purposes, r.purpose].filter(Boolean))].map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                          {er.purpose && <div className="coopb-cell-error">{er.purpose}</div>}
                        </td>
                        <td style={{ minWidth: 100 }}>
                          <select className="select" aria-label={`Type of support for ${f?.name}`} value={r.supportType} onChange={(e) => patchRow(r.farmerId, { supportType: e.target.value })}>
                            {SUPPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td style={{ minWidth: 140 }}>
                          <AmountInput label={`Amount for ${f?.name}`} value={r.amount} invalid={!!er.amount || check.overBudget} onChange={(v) => patchRow(r.farmerId, { amount: v })} />
                          {er.amount && <div className="coopb-cell-error">{er.amount}</div>}
                        </td>
                        <td style={{ minWidth: 140 }}>
                          <input type="date" className={cx('input', er.expectedDate && 'input--error')} aria-label={`Expected date for ${f?.name}`} value={r.expectedDate} onChange={(e) => patchRow(r.farmerId, { expectedDate: e.target.value })} />
                          {er.expectedDate && <div className="coopb-cell-error">{er.expectedDate}</div>}
                        </td>
                        <td>
                          <button type="button" className="coopb-trash" onClick={() => removeRow(r.farmerId)} aria-label={`Remove ${f?.name} from the allocation`}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="coopb-totals" aria-label="Allocation totals">
            <div className="coopb-stat"><div className="caption muted">Cash</div><div className="coopb-stat__value">{formatNaira(cash)}</div></div>
            <div className="coopb-stat"><div className="caption muted">In-kind</div><div className="coopb-stat__value">{formatNaira(inKind)}</div></div>
            <div className={cx('coopb-stat', check.overBudget ? 'coopb-stat--amber' : 'coopb-stat--green')}><div className="caption muted">Total allocated</div><div className="coopb-stat__value">{formatNaira(check.total)}</div></div>
            <div className="coopb-stat"><div className="caption muted">{check.overBudget ? 'Over budget by' : 'Remaining'}</div><div className="coopb-stat__value">{formatNaira(Math.abs(check.remaining))}</div></div>
          </div>
        </Card>
      </div>

      <ThreeRules />

      <ConfirmDialog
        open={askSign}
        onClose={() => !signBusy && setAskSign(false)}
        onConfirm={requestSignatures}
        loading={signBusy}
        tone="green"
        icon={Send}
        title="Request Agreement C signatures?"
        message="Each farmer below will be marked Awaiting Signature. Farmers with an app account are notified."
        confirmLabel="Request signatures"
        summary={[
          ['Package', pkg.name],
          ['Farmers to sign', `${formatNumber(needSig.length)}: ${needSig.slice(0, 3).map((f) => f.name).join(', ')}${needSig.length > 3 ? ` and ${needSig.length - 3} more` : ''}`],
          ['Total allocated', formatNaira(check.total)],
          ['Approval status', `Allocation saved, review pending${pkg.startDate ? `. Farming starts ${formatDate(pkg.startDate)}` : ''}`],
        ]}
      />
    </div>
  );
}
