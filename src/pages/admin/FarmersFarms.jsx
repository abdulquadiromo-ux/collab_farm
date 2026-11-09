import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, BadgeCheck, Clock, AlertTriangle, FileText, Eye, Flag, FlagOff, CopyCheck, Power, PowerOff } from 'lucide-react';
import { useApp, useSimulatedLoad, simulate } from '../../context/AppContext.jsx';
import { PageHeader, PageSkeleton, DataTable, StatusPill, Avatar, Banner, KpiStrip, Tabs, Button, ConfirmDialog, Modal, InfoList, KebabMenu } from '../../components/ui/index.js';
import { formatDate, formatNaira } from '../../utils/format.js';
import { maskNin, farmerFlags, farmerAgreement, farmDocState, todayIso, nowIso, lc, slug } from '../../components/adma/helpers.js';
import { ReasonDialog } from '../../components/adma/Dialogs.jsx';
import DocumentsTable from '../../components/adma/DocumentsTable.jsx';
import { DocStatusPill } from '../../components/adma/Parts.jsx';
import '../../styles/pages/adma.css';

// Same-name matches are only a weak hint, so they appear in the record view, not as a table flag.
const tableFlags = (flags) => flags.filter((x) => x.kind !== 'name');

function FlagChips({ flags }) {
  const shown = tableFlags(flags);
  if (!shown.length) return <span className="muted small">None</span>;
  return (
    <div className="stack-sm" style={{ gap: 4 }}>
      {shown.map((f, i) => (
        <span key={i} className={`adma-flag adma-flag--${f.kind}`} title={f.text}>
          <AlertTriangle size={13} aria-hidden="true" />
          {f.kind === 'duplicate' ? 'Possible duplicate' : 'Flagged for review'}
        </span>
      ))}
    </div>
  );
}

export default function FarmersFarms() {
  const { data, user, update, notify, toast } = useApp();
  const loading = useSimulatedLoad(350);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'farms' ? 'farms' : 'farmers';
  const [record, setRecord] = useState(null); // farmer id shown in the record modal
  const [verifying, setVerifying] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reasonFor, setReasonFor] = useState(null); // { kind: 'flag'|'unflag'|'dup', farmer }
  const [docsFarm, setDocsFarm] = useState(null); // farm id
  const [toggleFarm, setToggleFarm] = useState(null); // farm

  const coops = data.cooperatives;
  const coopName = (id) => coops.find((c) => c.id === id)?.name || id;

  const farmers = useMemo(() => data.farmers.map((f) => {
    const flags = farmerFlags(data, f);
    return {
      ...f, flags, coopName: coopName(f.coopId), agreement: farmerAgreement(data, f).status, hasDup: flags.some((x) => x.kind === 'duplicate'),
      text: `${f.name} ${f.id} ${f.nin} ${f.email}`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data.farmers, data.contracts, data.cooperatives]);
  const farms = useMemo(() => data.farms.map((f) => ({ ...f, coopName: coopName(f.coopId), text: `${f.name} ${f.location} ${f.crop} ${f.id}`, docCount: (f.documents || []).length })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.farms, data.cooperatives]);

  if (loading) return <PageSkeleton />;

  const fmr = farmers.find((f) => f.id === record) || null;
  const docsFarmRec = farms.find((f) => f.id === docsFarm) || null;
  const live = farmers.filter((f) => f.status !== 'Removed');
  const coopOptions = coops.map((c) => ({ value: c.id, label: c.name }));

  const setTab = (id) => setParams(id === 'farmers' ? {} : { tab: id }, { replace: true });

  // ----- farmer actions -----
  const verifyIdentity = async (f) => {
    setBusy(true);
    await simulate(500);
    update('farmers', f.id, { identityStatus: 'Verified', status: 'Verified', identityVerifiedBy: user.name, identityVerifiedAt: todayIso() }, {
      action: 'Farmer identity verified', entityType: 'Farmer', entityId: f.id, summary: `${f.name}: identity ${f.identityStatus} to Verified, status ${f.status} to Verified`, reason: 'Identity checked by reviewer',
    });
    // Keep the matching registration record in step without approving the account
    const uv = data.userVerification.find((u) => lc(u.email) === lc(f.email));
    if (uv && ['Submitted', 'Under Review', 'Additional Information Required'].includes(uv.status)) {
      update('userVerification', uv.id, (r) => ({
        checks: { ...(r.checks || {}), identity: 'Verified' },
        ...(r.documents ? { documents: r.documents.map((d) => (d.isIdentity ? { ...d, status: 'Verified', reviewer: user.name, reviewedAt: todayIso() } : d)) } : {}),
      }));
    }
    notify('cooperative', 'Farmer identity verified', `${f.name} (${f.id}) was verified by a CollabFarm reviewer.`, `/coop/farmers/${f.id}`, 'verification');
    toast(`${f.name} verified.`);
    setBusy(false);
    setVerifying(null);
  };

  const flagFarmer = async (f, reason) => {
    await simulate(350);
    update('farmers', f.id, { reviewFlag: { reason, by: user.name, at: nowIso() } }, { action: 'Farmer flagged for review', entityType: 'Farmer', entityId: f.id, summary: `${f.name} flagged for review`, reason });
    toast('Flagged for review. This is a prompt to look again, not a finding.', 'info');
    setReasonFor(null);
  };
  const unflagFarmer = async (f, reason) => {
    await simulate(350);
    update('farmers', f.id, { reviewFlag: null }, { action: 'Farmer review flag cleared', entityType: 'Farmer', entityId: f.id, summary: `${f.name}: review flag cleared`, reason });
    toast('Flag cleared.');
    setReasonFor(null);
  };
  const resolveDup = async (f, note) => {
    await simulate(350);
    update('farmers', f.id, { duplicateResolved: { by: user.name, at: nowIso(), note }, duplicateFlag: null }, { action: 'Duplicate check completed', entityType: 'Farmer', entityId: f.id, summary: `${f.name}: possible duplicate reviewed and cleared`, reason: note });
    toast('Duplicate check recorded.');
    setReasonFor(null);
  };

  // ----- farm actions -----
  const farmDocs = (farm) => (farm.documents || []).map((name) => {
    const st = farmDocState(farm, name);
    const meta = farm.docMeta?.[name] || {};
    return { id: name, type: name, file: `${slug(name)}.pdf`, status: st, reviewer: meta.reviewer || null, reviewedAt: meta.at || null, flagReason: meta.reason };
  });
  const writeFarmDocs = (farm, name, status, reason, auditAction) => {
    const docStatus = { ...(farm.docStatus || {}), [name]: status };
    const docMeta = { ...(farm.docMeta || {}), [name]: { reviewer: user.name, at: todayIso(), reason: reason || '' } };
    const names = farm.documents || [];
    const all = names.length > 0 && names.every((n) => (docStatus[n] || farmDocState(farm, n)) === 'Verified');
    const landAccess = all ? 'Verified' : farm.landAccess === 'Verified' ? 'Uploaded' : farm.landAccess === 'Pending' ? 'Uploaded' : farm.landAccess;
    update('farms', farm.id, { docStatus, docMeta, landAccess }, { action: auditAction, entityType: 'Farm', entityId: farm.id, summary: `${farm.name}: ${name} ${status === 'Verified' ? 'verified' : 'flagged'}. Land access ${landAccess}`, reason: reason || 'Checked by reviewer' });
  };
  const verifyFarmDoc = async (d) => { await simulate(300); writeFarmDocs(docsFarmRec, d.id, 'Verified', '', 'Farm document verified'); toast(`${d.type} marked as verified.`); };
  const flagFarmDoc = async (d, reason) => { await simulate(300); writeFarmDocs(docsFarmRec, d.id, 'Rejected', reason, 'Farm document flagged'); notify('cooperative', 'Farm document needs attention', `${d.type} for ${docsFarmRec.name} was flagged: ${reason}`, `/coop/farms/${docsFarmRec.id}`, 'verification'); toast(`${d.type} flagged.`, 'info'); };

  const switchFarm = async (farm, reason) => {
    await simulate(400);
    const next = farm.status === 'Active' ? 'Inactive' : 'Active';
    update('farms', farm.id, { status: next, statusReason: reason }, { action: `Farm marked ${next}`, entityType: 'Farm', entityId: farm.id, summary: `${farm.name}: ${farm.status} to ${next}`, reason });
    notify('cooperative', 'Farm status changed', `${farm.name} is now ${next}. ${reason}`, `/coop/farms/${farm.id}`, 'info');
    toast(`${farm.name} marked ${next}.`);
    setToggleFarm(null);
  };

  // ----- columns -----
  const farmerCols = [
    {
      key: 'name', header: 'Farmer', sortable: true,
      render: (f) => (
        <div className={`cell-person${f.hasDup ? ' adma-flagged' : ''}`}>
          <Avatar name={f.name} />
          <div><div>{f.name}</div><div className="cell-sub" style={{ fontWeight: 400 }}>{f.id} · {f.coopName}</div></div>
        </div>
      ),
    },
    { key: 'nin', header: 'NIN', render: (f) => <span className="adma-mono" title="Only the last 3 digits are shown">{maskNin(f.nin)}</span> },
    { key: 'cropType', header: 'Crop and farm', render: (f) => <div><div>{f.cropType}</div><div className="cell-sub">{f.farmSize} {f.farmSizeUnit}</div></div> },
    { key: 'identityStatus', header: 'Identity', sortable: true, render: (f) => <StatusPill>{f.identityStatus}</StatusPill> },
    { key: 'status', header: 'Status', sortable: true, render: (f) => <StatusPill>{f.status}</StatusPill> },
    { key: 'agreement', header: 'Agreement C', render: (f) => <StatusPill>{f.agreement}</StatusPill> },
    { key: 'flags', header: 'Flags', render: (f) => <FlagChips flags={f.flags} /> },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: (f) => (
        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }} onClick={(e) => e.stopPropagation()}>
          {f.identityStatus !== 'Verified' && f.status !== 'Removed' && <Button size="sm" variant="outline-green" onClick={() => setVerifying(f)} aria-label={`Verify identity of ${f.name}`}><BadgeCheck size={14} />Verify identity</Button>}
          <KebabMenu label={`Actions for ${f.name}`} items={[
            { label: 'View record', icon: <Eye size={16} />, onClick: () => setRecord(f.id) },
            ...(f.reviewFlag ? [{ label: 'Clear review flag', icon: <FlagOff size={16} />, onClick: () => setReasonFor({ kind: 'unflag', farmer: f }) }] : [{ label: 'Flag for review', icon: <Flag size={16} />, onClick: () => setReasonFor({ kind: 'flag', farmer: f }) }]),
            ...(f.hasDup ? [{ label: 'Mark duplicate check done', icon: <CopyCheck size={16} />, onClick: () => setReasonFor({ kind: 'dup', farmer: f }) }] : []),
          ]} />
        </div>
      ),
    },
  ];

  const farmCols = [
    { key: 'name', header: 'Farm', sortable: true, render: (f) => <div><div className="strong">{f.name}</div><div className="cell-sub">{f.id} {'·'} {f.location}</div></div> },
    { key: 'coopName', header: 'Cooperative', sortable: true },
    { key: 'areaHa', header: 'Area', sortable: true, render: (f) => `${f.areaHa} ha` },
    { key: 'crop', header: 'Crop and season', render: (f) => <div><div>{f.crop}</div><div className="cell-sub">{f.season}</div></div> },
    { key: 'landAccess', header: 'Land access', sortable: true, render: (f) => <DocStatusPill status={f.landAccess === 'Pending' ? 'Not uploaded' : f.landAccess} /> },
    { key: 'status', header: 'Status', sortable: true, render: (f) => <StatusPill>{f.status}</StatusPill> },
    { key: 'lastInspection', header: 'Last inspection', sortable: true, sortValue: (f) => f.lastInspection || '', render: (f) => (f.lastInspection ? formatDate(f.lastInspection) : <span className="muted">Never</span>) },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: (f) => (
        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
          <Button size="sm" variant="outline" onClick={() => setDocsFarm(f.id)}><FileText size={14} />Documents ({f.docCount})</Button>
          <KebabMenu label={`Actions for ${f.name}`} items={[
            f.status === 'Active'
              ? { label: 'Mark Inactive', icon: <PowerOff size={16} />, onClick: () => setToggleFarm(f) }
              : { label: 'Mark Active', icon: <Power size={16} />, onClick: () => setToggleFarm(f) },
          ]} />
        </div>
      ),
    },
  ];

  const dupWarn = verifying?.flags?.some((x) => x.kind === 'duplicate');

  return (
    <div className="page adma-page">
      <PageHeader title="Farmers and farms" subtitle="Every farmer and farm across cooperatives. National ID numbers show the last 3 digits only." />

      <KpiStrip
        cells={[
          { icon: <Users size={18} />, label: 'Farmers on record', value: live.length, sub: `${farms.length} farms` },
          { icon: <BadgeCheck size={18} />, label: 'Identity verified', value: live.filter((f) => f.identityStatus === 'Verified').length, sub: 'Checked by a reviewer' },
          { icon: <Clock size={18} />, label: 'Identity pending', value: live.filter((f) => f.identityStatus === 'Pending').length, sub: 'Not active in a project yet' },
          { icon: <AlertTriangle size={18} />, label: 'Possible duplicates', value: live.filter((f) => f.hasDup).length, sub: 'To compare and clear' },
        ]}
      />

      <Banner tone="info" title="How duplicate flags work">
        A flag means two records look alike and a person should compare them. It is never an accusation. Compare name, ID number, phone and farm, then clear the flag or ask the cooperative.
      </Banner>

      <Tabs items={[{ id: 'farmers', label: 'Farmers', count: live.length }, { id: 'farms', label: 'Farms', count: farms.length }]} value={tab} onChange={setTab} label="Records" auto />

      {tab === 'farmers' ? (
        <DataTable
          key="farmers"
          rows={farmers}
          columns={farmerCols}
          rowKey="id"
          pageSize={10}
          searchKeys={['text']}
          searchPlaceholder="Search by name, NIN or reference"
          totalLabel="farmers"
          onRowClick={(f) => setRecord(f.id)}
          emptyTitle="No farmers on record"
          emptyText="Farmers appear here when a cooperative adds them."
          filters={[
            { key: 'coopId', allLabel: 'All cooperatives', options: coopOptions },
            { key: 'identityStatus', allLabel: 'Any identity status', options: ['Pending', 'Verified', 'Rejected'] },
            { key: 'status', allLabel: 'Any status', options: ['Verified', 'Pending', 'Suspended', 'Removed'] },
            { key: 'flags', allLabel: 'Any flags', options: [{ value: 'duplicate', label: 'Possible duplicates' }, { value: 'review', label: 'Flagged for review' }, { value: 'none', label: 'No flags' }], match: (r, v) => (v === 'none' ? tableFlags(r.flags).length === 0 : r.flags.some((x) => x.kind === v)) },
          ]}
        />
      ) : (
        <DataTable
          key="farms"
          rows={farms}
          columns={farmCols}
          rowKey="id"
          pageSize={10}
          searchKeys={['text']}
          searchPlaceholder="Search by farm, place or crop"
          totalLabel="farms"
          emptyTitle="No farms on record"
          emptyText="Farms appear here when a cooperative adds them."
          filters={[
            { key: 'coopId', allLabel: 'All cooperatives', options: coopOptions },
            { key: 'status', allLabel: 'Any status', options: ['Active', 'Inactive'] },
            { key: 'landAccess', allLabel: 'Any land access', options: [{ value: 'Verified', label: 'Verified' }, { value: 'Uploaded', label: 'Uploaded, not checked' }, { value: 'Pending', label: 'Not uploaded' }] },
          ]}
        />
      )}

      {/* Farmer record */}
      <Modal
        open={!!fmr}
        onClose={() => setRecord(null)}
        title={fmr ? `${fmr.name} (${fmr.id})` : ''}
        wide
        footer={fmr && (
          <>
            <Button variant="outline" onClick={() => setRecord(null)}>Close</Button>
            {fmr.identityStatus !== 'Verified' && fmr.status !== 'Removed' && <Button onClick={() => { setVerifying(fmr); setRecord(null); }}><BadgeCheck size={16} />Verify identity</Button>}
          </>
        )}
      >
        {fmr && (
          <div className="stack">
            <InfoList compact items={[
              ['Cooperative', fmr.coopName],
              ['National ID number', maskNin(fmr.nin)],
              ['Phone', fmr.phone],
              ['Main crop', `${fmr.cropType}, ${fmr.farmSize} ${fmr.farmSizeUnit}`],
              ['Experience', `${fmr.experienceYears} years`],
              ['Membership', fmr.membership],
              ['Consent recorded', fmr.consent ? 'Yes' : 'No'],
              ['Identity', <StatusPill key="i">{fmr.identityStatus}</StatusPill>],
              ['Status', <StatusPill key="s">{fmr.status}</StatusPill>],
              ['Agreement C', <StatusPill key="a">{fmr.agreement}</StatusPill>],
              ['Allocation', fmr.allocationPackageId ? `${data.packages.find((p) => p.id === fmr.allocationPackageId)?.name || fmr.allocationPackageId}, ${formatNaira(fmr.allocatedAmount)}` : 'None'],
              ...(fmr.identityVerifiedBy ? [['Identity checked by', `${fmr.identityVerifiedBy}, ${formatDate(fmr.identityVerifiedAt)}`]] : []),
            ]} />
            {fmr.flags.length > 0 && (
              <Banner tone="warn" title="Flags on this record">
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{fmr.flags.map((x, i) => <li key={i}>{x.kind === 'duplicate' ? `Possible duplicate: review. ${x.text}` : x.kind === 'review' ? `Flagged for review: ${x.text}` : x.text}</li>)}</ul>
              </Banner>
            )}
            {fmr.duplicateResolved && <Banner tone="success">Duplicate check completed by {fmr.duplicateResolved.by}: {fmr.duplicateResolved.note}</Banner>}
          </div>
        )}
      </Modal>

      {/* Verify identity */}
      <ConfirmDialog
        open={!!verifying}
        onClose={() => setVerifying(null)}
        onConfirm={() => verifyIdentity(verifying)}
        loading={busy}
        tone="green"
        title={verifying ? `Verify identity of ${verifying.name}?` : ''}
        message="Only confirm after you have compared the national ID details with the record."
        summary={verifying ? [['Farmer', `${verifying.name} (${verifying.id})`], ['Cooperative', verifying.coopName], ['National ID number', maskNin(verifying.nin)], ['Result', 'Identity and status become Verified']] : null}
        warning={dupWarn ? 'This record has a possible duplicate. Compare it with the other record before verifying.' : null}
        confirmLabel="Verify identity"
      />

      {/* Flag, clear, duplicate */}
      <ReasonDialog
        open={reasonFor?.kind === 'flag'}
        onClose={() => setReasonFor(null)}
        onConfirm={(t) => flagFarmer(reasonFor.farmer, t)}
        tone="amber"
        title="Flag for review"
        message="A flag asks a reviewer to look again. It is not a finding and the farmer is not told."
        summary={reasonFor ? [['Farmer', `${reasonFor.farmer.name} (${reasonFor.farmer.id})`]] : null}
        label="What needs a second look?"
        placeholder="For example: name on the ID slip differs slightly from the cooperative's list."
        confirmLabel="Flag for review"
      />
      <ReasonDialog
        open={reasonFor?.kind === 'unflag'}
        onClose={() => setReasonFor(null)}
        onConfirm={(t) => unflagFarmer(reasonFor.farmer, t)}
        tone="green"
        title="Clear the review flag"
        summary={reasonFor ? [['Farmer', `${reasonFor.farmer.name} (${reasonFor.farmer.id})`], ['Flag', reasonFor.farmer.reviewFlag?.reason || '-']] : null}
        label="Reason for clearing"
        placeholder="What did you check and what did you find?"
        confirmLabel="Clear flag"
      />
      <ReasonDialog
        open={reasonFor?.kind === 'dup'}
        onClose={() => setReasonFor(null)}
        onConfirm={(t) => resolveDup(reasonFor.farmer, t)}
        tone="green"
        title="Duplicate check done"
        message="Record what you compared. The flag is removed from this record."
        summary={reasonFor ? [['Farmer', `${reasonFor.farmer.name} (${reasonFor.farmer.id})`], ['Flag', reasonFor.farmer.flags.find((x) => x.kind === 'duplicate')?.text || '-']] : null}
        label="What did you compare?"
        placeholder="For example: compared ID number, phone and farm location. They are different people."
        confirmLabel="Record check"
      />

      {/* Farm documents */}
      <Modal
        open={!!docsFarmRec}
        onClose={() => setDocsFarm(null)}
        title={docsFarmRec ? `Documents: ${docsFarmRec.name}` : ''}
        wide
        footer={<Button variant="outline" onClick={() => setDocsFarm(null)}>Close</Button>}
      >
        {docsFarmRec && (
          <div className="stack">
            <p className="small muted">Uploaded means the cooperative sent the file. Verified means a reviewer checked it. Land access becomes Verified when every document is Verified.</p>
            <div className="row-wrap" style={{ gap: 8 }}><span className="small">Land access</span><DocStatusPill status={docsFarmRec.landAccess === 'Pending' ? 'Not uploaded' : docsFarmRec.landAccess} /></div>
            <DocumentsTable docs={farmDocs(docsFarmRec)} canAct onVerify={verifyFarmDoc} onFlag={flagFarmDoc} />
          </div>
        )}
      </Modal>

      {/* Farm active / inactive */}
      <ReasonDialog
        open={!!toggleFarm}
        onClose={() => setToggleFarm(null)}
        onConfirm={(t) => switchFarm(toggleFarm, t)}
        tone={toggleFarm?.status === 'Active' ? 'amber' : 'green'}
        title={toggleFarm ? `Mark ${toggleFarm.name} ${toggleFarm.status === 'Active' ? 'Inactive' : 'Active'}?` : ''}
        message={toggleFarm?.status === 'Active' ? 'An inactive farm cannot be assigned to new projects. Existing records stay.' : 'An active farm can be assigned to projects.'}
        warning={toggleFarm && toggleFarm.status !== 'Active' && toggleFarm.landAccess !== 'Verified' ? 'Land access for this farm is not verified yet. Make sure that is understood before activating.' : null}
        summary={toggleFarm ? [['Farm', toggleFarm.name], ['Cooperative', toggleFarm.coopName], ['Land access', toggleFarm.landAccess === 'Pending' ? 'Not uploaded' : toggleFarm.landAccess]] : null}
        label="Reason"
        placeholder="Why is the status changing?"
        confirmLabel={toggleFarm?.status === 'Active' ? 'Mark Inactive' : 'Mark Active'}
      />
    </div>
  );
}
