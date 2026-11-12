import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarCheck, Power, Upload, Users } from 'lucide-react';
import {
  Avatar, Banner, Breadcrumb, Button, Card, CardHeader, ConfirmDialog, DataTable, EmptyState, InfoList, LinkButton, PageHeader, PageSkeleton, StatusPill,
} from '../../components/ui/index.js';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';
import { formatDate, formatDateShort } from '../../utils/format.js';
import { DocLegend, DocStatusPill } from '../../components/coopa/Bits.jsx';
import { UploadDocumentModal } from '../../components/coopa/UploadDocumentModal.jsx';
import { FARM_DOC_TYPES, farmSizeLabel, useCoop } from '../../components/coopa/helpers.js';
import '../../styles/pages/coopa.css';

const LAND_TYPES = ['Lease agreement', 'Certificate of Occupancy', 'Community consent letter'];
const ACRES_PER_HA = 2.47105;

// Seed farms keep document names as plain strings. Documents added in this app also get a record with a status and date.
function documentsOf(farm) {
  const records = farm.documentRecords || [];
  const known = new Set(records.map((r) => r.name));
  const derived = (farm.documents || []).filter((n) => !known.has(n)).map((n, i) => ({ id: `seed-${i}`, name: n, type: n, status: farm.landAccess === 'Verified' ? 'Verified' : 'Uploaded', uploadedAt: null }));
  return [...derived, ...records];
}

export default function FarmDetail() {
  const { id } = useParams();
  const { update, notify, toast, accessToken } = useApp();
  const { coop, farmers, farms } = useCoop();
  const loading = useSimulatedLoad(350);
  const [uploading, setUploading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [busy, setBusy] = useState(false);
  const farm = farms.find((f) => f.id === id);

  const assigned = useMemo(() => farmers.filter((f) => f.farmId === id && f.status !== 'Removed'), [farmers, id]);
  const docs = useMemo(() => (farm ? documentsOf(farm) : []), [farm]);
  const inspections = useMemo(() => {
    if (!farm) return [];
    const own = farm.inspections || [];
    const seed = farm.lastInspection && !own.some((i) => i.date === farm.lastInspection)
      ? [{ id: 'last', date: farm.lastInspection, kind: 'Field inspection', by: 'CollabFarm reviewer', outcome: 'Recorded', note: 'Summary only. The full report is held by the reviewer.' }] : [];
    return [...own, ...seed].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [farm]);

  if (loading) return <PageSkeleton />;
  if (!coop) return <div className="page"><EmptyState title="We could not find your cooperative record" action={<LinkButton to="/coop" variant="outline">Back to dashboard</LinkButton>}>Sign in again with a cooperative account.</EmptyState></div>;
  if (!farm) {
    return <div className="page"><EmptyState title="Farm not found" action={<LinkButton to="/coop/farms" variant="outline">Back to Farms and Plots</LinkButton>}>This farm is not registered under your cooperative, or the link is out of date.</EmptyState></div>;
  }

  const active = farm.status === 'Active';
  const verifiedDocs = docs.filter((d) => d.status === 'Verified').length;
  const landTone = farm.landAccess === 'Verified' ? 'green' : farm.landAccess === 'Uploaded' ? 'amber' : 'gray';
  const landLabel = farm.landAccess === 'Verified' ? 'Verified' : farm.landAccess === 'Uploaded' ? 'Uploaded, awaiting review' : 'No evidence yet';

  const toggleStatus = async () => {
    setBusy(true);
    const next = active ? 'Inactive' : 'Active';
    try {
      if (!accessToken) throw new Error('Your session has expired. Sign in again to update the farm.');
      const response = await fetch(`${API_BASE_URL}/farmers/farms/${encodeURIComponent(farm.id)}/status`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next.toUpperCase() }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not update farm status (${response.status}).`));
      update('farms', farm.id, { status: payload?.status === 'INACTIVE' ? 'Inactive' : 'Active' });
      toast(`${farm.name} is now ${next.toLowerCase()}.`, 'success');
      setToggling(false);
    } catch (error) { toast(error.message || 'Could not update farm status.', 'error'); }
    finally { setBusy(false); }
  };

  const addDocument = (type, file) => {
    update('farms', farm.id, (f) => ({
      documents: [...(f.documents || []), file.name],
      documentRecords: [...(f.documentRecords || []), { id: `doc-${Date.now().toString(36)}`, name: file.name, type, status: 'Uploaded', uploadedAt: new Date().toISOString(), size: file.size }],
      landAccess: f.landAccess === 'Pending' && LAND_TYPES.includes(type) ? 'Uploaded' : f.landAccess,
    }), { action: 'Farm document uploaded', entityType: 'Farm', summary: `${type}: ${file.name}. Status Uploaded, awaiting review.`, reason: 'Added by cooperative' });
    notify('admin', 'Farm document awaiting review', `${coop.name} uploaded ${type} for ${farm.name}.`, '/admin/farmers-farms', 'verification');
    toast(`${type} uploaded. A reviewer will check it, then it shows as Verified.`, 'success');
  };

  const requestInspection = () => {
    update('farms', farm.id, { inspectionRequestedAt: new Date().toISOString() }, {
      action: 'Inspection requested', entityType: 'Farm', summary: `Field inspection requested for ${farm.name}`, reason: 'Requested by cooperative',
    });
    notify('admin', 'Farm inspection requested', `${coop.name} asked for an inspection of ${farm.name}.`, '/admin/farmers-farms', 'info');
    toast('Inspection requested. A reviewer will schedule a visit.', 'success');
  };

  return (
    <div className="page coopa">
      <Breadcrumb items={[{ label: 'Farms and Plots', to: '/coop/farms' }, { label: farm.name }]} />
      <PageHeader
        title={farm.name}
        subtitle={`${farm.location}. ${farm.crop}, ${farm.season}.`}
        actions={(
          <>
            <Button variant="outline-green" onClick={() => setUploading(true)}><Upload size={18} />Add document</Button>
            <Button variant={active ? 'outline' : 'primary'} onClick={() => setToggling(true)}><Power size={18} />{active ? 'Mark inactive' : 'Mark active'}</Button>
          </>
        )}
      />

      {!active && <Banner tone="warn" title="This farm is inactive">Inactive farms cannot be chosen for new funding requests. Existing records and assigned farmers are kept.</Banner>}

      <div className="grid-main coopa-top">
        <div className="stack">
          <Card>
            <CardHeader title="Documents" subtitle={`${verifiedDocs} of ${docs.length} verified`} action={<Button variant="outline-green" size="sm" onClick={() => setUploading(true)}><Upload size={16} />Add document</Button>} />
            <DocLegend />
            <DataTable
              bare hideFooter pageSize={50} rows={docs}
              emptyTitle="No documents yet"
              emptyText="Upload land-access evidence such as a lease agreement or community consent letter so a reviewer can verify this farm."
              emptyAction={<Button size="sm" onClick={() => setUploading(true)}><Upload size={16} />Add document</Button>}
              columns={[
                { key: 'name', header: 'Document', render: (d) => <div><span className="strong">{d.name}</span>{d.type !== d.name && <div className="cell-sub">{d.type}</div>}</div> },
                { key: 'uploadedAt', header: 'Uploaded', render: (d) => (d.uploadedAt ? formatDateShort(d.uploadedAt) : <span className="muted">On record</span>) },
                { key: 'status', header: 'Status', render: (d) => <DocStatusPill status={d.status} /> },
              ]}
            />
          </Card>

          <Card>
            <CardHeader title="Assigned farmers" subtitle={`${assigned.length} ${assigned.length === 1 ? 'farmer' : 'farmers'} assigned to this farm`} action={<LinkButton to="/coop/farmers" variant="outline" size="sm"><Users size={16} />Farmer Directory</LinkButton>} />
            <DataTable
              bare hideFooter pageSize={8} rows={assigned}
              emptyTitle="No farmers assigned"
              emptyText="Assign farmers to this farm from their profile or when you add them."
              columns={[
                { key: 'name', header: 'Farmer', render: (f) => <div className="cell-person"><Avatar name={f.name} /><Link to={`/coop/farmers/${f.id}`} className="coopa-name">{f.name}</Link></div> },
                { key: 'cropType', header: 'Crop' },
                { key: 'farmSize', header: 'Farm size', render: (f) => farmSizeLabel(f) },
                { key: 'status', header: 'Status', render: (f) => <StatusPill>{f.status}</StatusPill> },
              ]}
            />
            {assigned.length > 8 && <p className="caption muted" style={{ marginTop: 8 }}>Showing the first 8 of {assigned.length}. Use the Farmer Directory to see everyone.</p>}
          </Card>

          <Card>
            <CardHeader
              title="Inspection records"
              subtitle="Field visits by CollabFarm reviewers."
              action={farm.inspectionRequestedAt
                ? <span className="caption muted">Requested {formatDateShort(farm.inspectionRequestedAt)}</span>
                : <Button variant="outline-green" size="sm" onClick={requestInspection}><CalendarCheck size={16} />Request inspection</Button>}
            />
            <DataTable
              bare hideFooter pageSize={20} rows={inspections}
              emptyTitle="No inspection recorded yet"
              emptyText="Reviewers record a visit after they inspect the farm. You can ask for one."
              columns={[
                { key: 'date', header: 'Date', render: (i) => formatDate(i.date) },
                { key: 'kind', header: 'Type' },
                { key: 'by', header: 'Recorded by' },
                { key: 'outcome', header: 'Outcome', render: (i) => <div><StatusPill tone="blue">{i.outcome}</StatusPill>{i.note && <div className="cell-sub">{i.note}</div>}</div> },
              ]}
            />
          </Card>
        </div>

        <Card className="coopa-summary">
          <CardHeader title="Farm facts" action={<StatusPill>{farm.status}</StatusPill>} />
          <InfoList compact items={[
            ['Location', farm.location],
            ['Area', `${farm.areaHa} ha (about ${Math.round(farm.areaHa * ACRES_PER_HA)} acres)`],
            ['Main crop', farm.crop],
            ['Season', farm.season],
            ['Land access', <span key="l"><span className="cell-sub" style={{ display: 'block', marginBottom: 4 }}>{farm.landAccessType || farm.documents?.[0] || 'Not stated'}</span><StatusPill tone={landTone}>{landLabel}</StatusPill></span>],
            ['Last inspection', farm.lastInspection ? formatDate(farm.lastInspection) : 'None yet'],
            ['Assigned farmers', assigned.length],
            ['Cooperative', coop.name],
          ]}
          />
          <p className="caption muted" style={{ marginTop: 12 }}>Area and land access are reported by your cooperative. Only a CollabFarm reviewer can mark land access as Verified.</p>
        </Card>
      </div>

      <UploadDocumentModal
        open={uploading}
        onClose={() => setUploading(false)}
        title="Add farm document"
        intro={`Add a document for ${farm.name}, such as land-access evidence or an inspection report.`}
        typeOptions={FARM_DOC_TYPES}
        onSubmit={addDocument}
      />
      <ConfirmDialog
        open={toggling}
        onClose={() => !busy && setToggling(false)}
        onConfirm={toggleStatus}
        loading={busy}
        tone={active ? 'amber' : 'green'}
        icon={Power}
        title={active ? 'Mark this farm inactive?' : 'Mark this farm active?'}
        message={active ? 'Inactive farms cannot be chosen for new funding requests. Records, documents and assigned farmers are kept.' : 'Active farms can be chosen for new funding requests again.'}
        summary={[['Farm', farm.name], ['Assigned farmers', String(assigned.length)], ['Status change', `${farm.status} to ${active ? 'Inactive' : 'Active'}`]]}
        confirmLabel={active ? 'Mark inactive' : 'Mark active'}
      />
    </div>
  );
}
