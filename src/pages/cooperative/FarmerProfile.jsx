import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Check, Eye, EyeOff, Pencil, Send, Trash2, X } from 'lucide-react';
import {
  Avatar, Banner, Breadcrumb, Button, Card, CardHeader, DataTable, EmptyState, InfoList, LinkButton, PageHeader, PageSkeleton, StatusPill, Tabs, Timeline,
} from '../../components/ui/index.js';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatDate, formatDateShort, formatDateTime, formatNaira, cx } from '../../utils/format.js';
import { statusTone } from '../../utils/status.js';
import { ReminderModal } from '../../components/coopa/ReminderModal.jsx';
import { RemoveFarmerModal } from '../../components/coopa/RemoveFarmerModal.jsx';
import { farmSizeLabel, fmtHa, maskNin, toHa, useCoop } from '../../components/coopa/helpers.js';
import '../../styles/pages/coopa.css';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'allocation', label: 'Farm and allocation' },
  { id: 'agreement', label: 'Agreement' },
  { id: 'activity', label: 'Activity and records' },
  { id: 'history', label: 'History' },
];

export default function FarmerProfile() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const { data } = useApp();
  const { coop, farmers, farms } = useCoop();
  const loading = useSimulatedLoad(350);
  const [showNin, setShowNin] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [reminding, setReminding] = useState(false);
  const tab = TABS.some((t) => t.id === sp.get('tab')) ? sp.get('tab') : 'overview';
  const farmer = farmers.find((f) => f.id === id);

  const rel = useMemo(() => {
    if (!farmer) return null;
    const contracts = data.contracts.filter((c) => c.type === 'C' && c.partyId === farmer.id);
    const inputs = data.inputRecords.filter((i) => i.farmerId === farmer.id);
    const obligations = data.obligations.filter((o) => o.farmerId === farmer.id);
    const payments = data.disbursements.filter((d) => d.recipientType === 'Farmer' && d.recipientId === farmer.id);
    const pkgId = farmer.allocationPackageId || contracts[0]?.packageId || inputs[0]?.packageId || obligations[0]?.packageId || null;
    const pkg = data.packages.find((p) => p.id === pkgId) || null;
    const allocated = Number(farmer.allocatedAmount) || 0;
    const cash = payments.filter((p) => p.status === 'Disbursed').reduce((s, p) => s + p.amount, 0);
    const inKind = inputs.filter((i) => i.delivered).reduce((s, i) => s + i.cost, 0);
    const history = data.audit.filter((a) => a.entityType === 'Farmer' && a.entityId === farmer.id).sort((a, b) => new Date(b.at) - new Date(a.at));
    return { contracts, inputs, obligations, payments, pkg, allocated, cash, inKind, outstanding: Math.max(0, allocated - cash - inKind), history, farm: farms.find((f) => f.id === farmer.farmId) || null };
  }, [farmer, data, farms]);

  if (loading) return <PageSkeleton />;
  if (!coop) return <div className="page"><EmptyState title="We could not find your cooperative record" action={<LinkButton to="/coop" variant="outline">Back to dashboard</LinkButton>}>Sign in again with a cooperative account.</EmptyState></div>;
  if (!farmer) {
    return <div className="page"><EmptyState title="Farmer not found" action={<LinkButton to="/coop/farmers" variant="outline">Back to Farmer Directory</LinkButton>}>This farmer is not in your cooperative, or the link is out of date.</EmptyState></div>;
  }

  const removed = farmer.status === 'Removed';
  const { contracts, inputs, obligations, payments, pkg, allocated, cash, inKind, outstanding, history, farm } = rel;
  const agreement = contracts[0] || null;
  const openObligations = obligations.filter((o) => o.status !== 'Completed' && o.status !== 'Confirmed').length;

  const checks = [
    { ok: farmer.identityStatus === 'Verified', label: 'Identity verified', fix: 'A CollabFarm reviewer still needs to check this farmer.' },
    { ok: farmer.membership === 'Active member', label: 'Active cooperative member', fix: `Membership is ${farmer.membership || 'not set'}.` },
    { ok: Boolean(farmer.consent), label: 'Consent to data use recorded', fix: 'Edit the farmer to record consent.' },
    { ok: farmer.agreementStatus === 'Signed', label: 'Participation agreement (Agreement C) signed', fix: farmer.agreementStatus === 'Awaiting Signature' ? 'Waiting for the farmer to sign.' : 'Not issued or not signed yet.' },
  ];
  const ready = checks.every((c) => c.ok);

  const history2 = [
    ...history.map((a) => ({ title: a.action, meta: `${a.actor} on ${formatDateTime(a.at)}`, body: [a.summary, a.reason && `Reason: ${a.reason}`].filter(Boolean).join(' '), state: 'done' })),
    ...(history.some((a) => a.action === 'Farmer added') ? [] : [{ title: 'Added to the cooperative', meta: `${formatDateTime(farmer.dateAdded)} (from the farmer record)`, body: 'Status set to Pending until identity is checked.', state: 'done' }]),
  ];

  return (
    <div className="page coopa">
      <Breadcrumb items={[{ label: 'Farmer Directory', to: '/coop/farmers' }, { label: 'Farmer Details' }]} />
      <PageHeader
        title="Farmer Details"
        subtitle="View and manage farmer information, farm allocation and records."
        actions={removed ? <LinkButton to="/coop/farmers" variant="outline">Back to Farmer Directory</LinkButton> : (
          <>
            <Button variant="outline" onClick={() => setReminding(true)}><Send size={18} />Send reminder</Button>
            <LinkButton to={`/coop/farmers/${farmer.id}/edit`} variant="outline-green"><Pencil size={18} />Edit Farmer</LinkButton>
            <Button variant="danger-outline" onClick={() => setRemoving(true)}><Trash2 size={18} />Remove Farmer</Button>
          </>
        )}
      />

      {removed && (
        <Banner tone="danger" title="This farmer was removed from your list">
          {farmer.removedAt ? `Removed on ${formatDate(farmer.removedAt)}. ` : ''}{farmer.removalReason ? `Reason: ${farmer.removalReason}. ` : ''}The record, agreements and payment history are kept and cannot be deleted.
        </Banner>
      )}
      {farmer.duplicateFlag && !removed && (
        <Banner tone="warn" title="Possible duplicate identity flagged for review">
          {farmer.duplicateFlag}. This is a prompt for a reviewer to check the record. It is not a finding of wrongdoing.
        </Banner>
      )}

      <Card className="coopa-head">
        <div className="coopa-head__who">
          <Avatar name={farmer.name} size="lg" />
          <div>
            <h2 className="coopa-head__name">{farmer.name}</h2>
            <div className="row-wrap" style={{ gap: 8, marginTop: 6 }}>
              <StatusPill>{farmer.status}</StatusPill>
              <StatusPill>{`Identity: ${farmer.identityStatus}`}</StatusPill>
              <StatusPill>{`Agreement: ${farmer.agreementStatus}`}</StatusPill>
            </div>
            <div className="small muted coopa-nin">
              NIN: <span className="nowrap">{showNin ? farmer.nin : maskNin(farmer.nin)}</span>
              <button type="button" className="kebab" aria-label={showNin ? 'Hide NIN' : 'Show NIN'} aria-pressed={showNin} onClick={() => setShowNin((s) => !s)}>{showNin ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
        </div>
        <dl className="coopa-facts">
          <div><dt>Phone number</dt><dd>{farmer.phone}</dd></div>
          <div><dt>Crop type</dt><dd>{farmer.cropType || '-'}</dd></div>
          <div><dt>Farm size</dt><dd>{farmSizeLabel(farmer)}</dd></div>
          <div><dt>Date added</dt><dd>{formatDate(farmer.dateAdded)}</dd></div>
        </dl>
      </Card>

      <div className="grid-main coopa-top">
        <Card className="coopa-tabcard">
          <Tabs items={TABS} value={tab} onChange={(t) => setSp(t === 'overview' ? {} : { tab: t }, { replace: true })} auto label="Farmer sections" />
          <div className="coopa-tabpanel" role="tabpanel">
            {tab === 'overview' && (
              <div className="stack">
                <div className={cx('coopa-ready', ready && 'coopa-ready--ok')}>
                  <div className="strong small">{ready ? 'Ready to join a funded project' : 'Not ready for a funded project yet'}</div>
                  <p className="caption muted">A farmer is not active in a project until identity, membership, consent and agreement checks are all complete.</p>
                  <ul className="coopa-checks">
                    {checks.map((c) => (
                      <li key={c.label} className={c.ok ? 'is-ok' : 'is-no'}>
                        <span className="coopa-checks__mark">{c.ok ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}</span>
                        <span><strong>{c.label}</strong>{!c.ok && <span className="muted">. {c.fix}</span>}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <InfoList compact items={[
                  ['Full name', farmer.name],
                  ['Gender', farmer.gender || '-'],
                  ['Phone number', farmer.phone],
                  ['Email address', farmer.email || '-'],
                  ['Date of birth', farmer.dob ? formatDateShort(farmer.dob) : '-'],
                  ['Crop type', farmer.cropType || '-'],
                  ['Farm size', farmer.farmSize ? `${farmSizeLabel(farmer)} (about ${fmtHa(toHa(farmer.farmSize, farmer.farmSizeUnit))})` : '-'],
                  ['Years of experience', farmer.experienceYears == null || farmer.experienceYears === '' ? '-' : `${farmer.experienceYears} years`],
                  ['Skills', farmer.skills?.length ? <span className="tag-list">{farmer.skills.map((s) => <span key={s} className="chip coopa-skill">{s}</span>)}</span> : '-'],
                  ['Membership', farmer.membership || '-'],
                  ['Consent to data use', farmer.consent ? 'Recorded' : 'Not recorded'],
                  ['ID document', farmer.idFile || 'None uploaded'],
                  ['Notes', farmer.notes || '-'],
                ]}
                />
              </div>
            )}

            {tab === 'allocation' && (
              <div className="stack">
                <div>
                  <h3 className="coopa-h3">Assigned farm</h3>
                  {farm ? (
                    <div className="coopa-box row between">
                      <div>
                        <Link to={`/coop/farms/${farm.id}`} className="strong">{farm.name}</Link>
                        <div className="cell-sub">{farm.location}. {farm.areaHa} ha. {farm.crop}, {farm.season}</div>
                      </div>
                      <StatusPill>{farm.status}</StatusPill>
                    </div>
                  ) : (
                    <Banner tone="info">No farm is assigned yet. {!removed && <Link to={`/coop/farmers/${farmer.id}/edit`} className="strong">Assign a farm</Link>}</Banner>
                  )}
                </div>
                <div>
                  <h3 className="coopa-h3">Allocation</h3>
                  <p className="caption muted" style={{ marginBottom: 8 }}>An allocation is the support approved for this farmer in a funding package. It is a plan, not money received. Cash and goods are counted separately.</p>
                  {pkg ? (
                    <InfoList compact items={[
                      ['Funding package', <Link key="p" to={`/coop/funding/${pkg.id}`} className="strong">{pkg.name}</Link>],
                      ['Package status', <StatusPill key="s">{pkg.status}</StatusPill>],
                      ['Approved allocation', allocated ? formatNaira(allocated) : 'Amount not recorded yet'],
                      ['Paid in cash (confirmed)', formatNaira(cash)],
                      ['Inputs delivered (goods)', formatNaira(inKind)],
                      ['Outstanding balance', allocated ? formatNaira(outstanding) : '-'],
                    ]}
                    />
                  ) : (
                    <EmptyState title="No allocation yet">Farmers need a verified identity and a signed agreement before they can be allocated to a funding package.</EmptyState>
                  )}
                  {pkg && <LinkButton to={`/coop/funding/${pkg.id}/allocate`} variant="outline-green" size="sm" className="mt-4">Open allocation</LinkButton>}
                </div>
              </div>
            )}

            {tab === 'agreement' && (
              <div className="stack">
                <Banner tone="info" title="What is Agreement C?">
                  It is the individual Farmer Participation Agreement. It sets out the support allocated, what it may be used for, reporting duties, any repayment, and what happens if a crop fails. Genuine crop failure is not treated as fraud.
                </Banner>
                <div className="coopa-box">
                  <div className="row between" style={{ flexWrap: 'wrap' }}>
                    <div>
                      <div className="strong">Farmer Participation Agreement (Agreement C)</div>
                      <div className="cell-sub">{agreement ? `Version ${agreement.version}${pkg ? ` for ${data.packages.find((p) => p.id === agreement.packageId)?.name || pkg.name}` : ''}` : 'No agreement issued yet'}</div>
                    </div>
                    <StatusPill tone={statusTone(agreement?.status || farmer.agreementStatus)}>{agreement?.status || farmer.agreementStatus}</StatusPill>
                  </div>
                  {agreement && (
                    <InfoList compact items={[
                      ['Signed by', agreement.signatory || 'Not signed yet'],
                      ['Signed on', agreement.signedAt ? formatDateTime(agreement.signedAt) : '-'],
                      ['Language', agreement.language || '-'],
                      ['Versions', `${agreement.history?.length || 1} recorded. Earlier versions are never overwritten.`],
                    ]}
                    />
                  )}
                </div>
                <div className="row-wrap">
                  {agreement && <LinkButton to={`/coop/contracts/${agreement.id}`} variant="outline-green" size="sm">Open agreement</LinkButton>}
                  <LinkButton to="/coop/contracts" variant="outline" size="sm">All contracts</LinkButton>
                  {!removed && farmer.agreementStatus !== 'Signed' && <Button variant="outline" size="sm" onClick={() => setReminding(true)}><Send size={16} />Remind farmer to sign</Button>}
                </div>
              </div>
            )}

            {tab === 'activity' && (
              <div className="stack-lg">
                <section>
                  <h3 className="coopa-h3">Inputs received</h3>
                  <DataTable
                    bare hideFooter pageSize={50} rows={inputs}
                    emptyTitle="No inputs recorded" emptyText="Seeds, fertiliser and tools delivered to this farmer will be listed here."
                    columns={[
                      { key: 'item', header: 'Item', render: (r) => <span className="strong">{r.item}</span> },
                      { key: 'qty', header: 'Quantity', render: (r) => `${r.qty} ${r.unit}` },
                      { key: 'cost', header: 'Value', render: (r) => formatNaira(r.cost) },
                      { key: 'supplier', header: 'Supplier' },
                      { key: 'date', header: 'Date', render: (r) => formatDateShort(r.date) },
                      { key: 'delivered', header: 'Delivery', render: (r) => <StatusPill tone={r.delivered ? 'green' : 'amber'}>{r.delivered ? 'Delivered' : 'Pending'}</StatusPill> },
                    ]}
                  />
                </section>
                <section>
                  <h3 className="coopa-h3">Payments recorded</h3>
                  <DataTable
                    bare hideFooter pageSize={50} rows={payments}
                    emptyTitle="No payments recorded" emptyText="Payments to this farmer appear here after they are approved and confirmed."
                    columns={[
                      { key: 'purpose', header: 'Purpose', render: (r) => <span className="strong">{r.purpose}</span> },
                      { key: 'amount', header: 'Amount', render: (r) => formatNaira(r.amount) },
                      { key: 'date', header: 'Date', render: (r) => formatDateShort(r.date) },
                      { key: 'ref', header: 'Reference' },
                      { key: 'status', header: 'Status', render: (r) => <StatusPill>{r.status}</StatusPill> },
                    ]}
                  />
                </section>
                <section>
                  <h3 className="coopa-h3">Obligations</h3>
                  <p className="caption muted" style={{ marginBottom: 8 }}>Repayment or produce delivery agreed in the participation agreement. A missed date or a failed harvest is reviewed, it is never treated as fraud by itself.</p>
                  <DataTable
                    bare hideFooter pageSize={50} rows={obligations}
                    emptyTitle="No obligations" emptyText="Any repayment or produce delivery agreed with this farmer will be listed here."
                    columns={[
                      { key: 'type', header: 'Type', render: (r) => <span className="strong">{r.type}</span> },
                      { key: 'description', header: 'Details' },
                      { key: 'amount', header: 'Amount', render: (r) => (r.amount ? formatNaira(r.amount) : '-') },
                      { key: 'dueDate', header: 'Due', render: (r) => formatDateShort(r.dueDate) },
                      { key: 'status', header: 'Status', render: (r) => <StatusPill>{r.status}</StatusPill> },
                    ]}
                  />
                </section>
              </div>
            )}

            {tab === 'history' && (
              <div className="stack">
                <p className="caption muted">Every change to this farmer is recorded with who did it and when. Entries cannot be edited or deleted.</p>
                <Timeline items={history2} />
              </div>
            )}
          </div>
        </Card>

        <Card className="coopa-summary">
          <CardHeader title="Support summary" />
          <div className="coopa-stats">
            <div><span>Funding package</span><strong>{pkg ? pkg.name : 'None yet'}</strong></div>
            <div><span>Approved allocation</span><strong>{allocated ? formatNaira(allocated) : '-'}</strong></div>
            <div><span>Received so far</span><strong>{formatNaira(cash + inKind)}</strong><em>{formatNaira(cash)} cash, {formatNaira(inKind)} goods</em></div>
            <div><span>Outstanding balance</span><strong>{allocated ? formatNaira(outstanding) : '-'}</strong></div>
            <div><span>Open obligations</span><strong>{openObligations}</strong></div>
          </div>
          <p className="caption muted">Figures are records from the platform. They are not guarantees of yield or repayment.</p>
          <LinkButton to="/coop/funding" variant="outline" block className="mt-4">View funding</LinkButton>
        </Card>
      </div>

      <ReminderModal open={reminding} farmer={farmer} coop={coop} onClose={() => setReminding(false)} />
      <RemoveFarmerModal open={removing} farmer={farmer} onClose={() => { setRemoving(false); }} />
    </div>
  );
}
