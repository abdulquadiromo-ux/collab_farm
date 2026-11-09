import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, Landmark, Pencil, Plus, ShieldCheck, Trash2, Upload, UserPlus, Users } from 'lucide-react';
import {
  Avatar, Banner, Button, Card, ConfirmDialog, DataTable, EmptyState, InfoList, LinkButton, Modal, PageHeader, PageSkeleton, Progress, SectionHead, SelectField, StatusPill, TextField,
} from '../../components/ui/index.js';
import { useApp, simulate, useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatDateShort } from '../../utils/format.js';
import { DocLegend, DocStatusPill, UnverifiedBanner } from '../../components/coopa/Bits.jsx';
import { UploadDocumentModal } from '../../components/coopa/UploadDocumentModal.jsx';
import { COOP_DOC_TYPES, isEmail, normalisePhone, useCoop, useStableCallback } from '../../components/coopa/helpers.js';
import { BANKS } from '../../components/inv/invData.js';
import '../../styles/pages/coopa.css';

const REP_ROLES = ['Chairman', 'Chairperson', 'President', 'Secretary', 'Treasurer', 'Financial Secretary', 'Other signatory'];
const STATUS_TEXT = {
  Draft: 'Your registration is still a draft. Finish it and submit it for review.',
  Submitted: 'Your registration was submitted. A CollabFarm reviewer will pick it up soon.',
  'Under Review': 'A CollabFarm reviewer is checking your documents. This can take a few working days.',
  'Additional Information Required': 'The reviewer needs more information. Upload the missing or rejected documents below.',
  Verified: 'Your cooperative is verified. You can create funding requests and request disbursements.',
  Rejected: 'Your registration was not approved. Check the reviewer notes in the status page.',
  Suspended: 'Your cooperative is suspended. New funding and disbursements are paused until the reviewer lifts it.',
};

const toIntl = (display) => `+234 ${display.slice(1, 4)} ${display.slice(4, 7)} ${display.slice(7)}`;

function RepModal({ open, onClose, existing, onSave }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState(REP_ROLES[3]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const close = useStableCallback(() => { if (!busy) onClose?.(); });
  useEffect(() => { if (open) { setName(''); setRole(REP_ROLES[3]); setError(''); setBusy(false); } }, [open]);
  const submit = async () => {
    const n = name.trim();
    if (n.length < 3 || !/\s/.test(n)) { setError('Enter the full name, first and last name.'); return; }
    if (existing.some((r) => r.name.toLowerCase() === n.toLowerCase())) { setError('This person is already listed as a representative.'); return; }
    setBusy(true);
    await simulate(500);
    onSave({ name: n, role });
    setBusy(false);
    onClose?.();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title="Add authorised representative"
      white
      footer={(<><Button variant="outline" onClick={close} disabled={busy}>Cancel</Button><Button onClick={submit} loading={busy}>Add representative</Button></>)}
    >
      <div className="stack">
        <p className="small muted">Authorised representatives can sign agreements for your cooperative. Their identity is checked by a CollabFarm reviewer.</p>
        <TextField label="Full name" required value={name} placeholder="For example, Ngozi Adeyemi" error={error} onChange={(e) => { setName(e.target.value); if (error) setError(''); }} />
        <SelectField label="Role" required options={REP_ROLES} value={role} onChange={(e) => setRole(e.target.value)} />
      </div>
    </Modal>
  );
}

export default function Profile() {
  const { user, update, notify, toast } = useApp();
  const { coop, verified } = useCoop();
  const loading = useSimulatedLoad(350);
  const { hash } = useLocation();
  const [editing, setEditing] = useState(null); // 'org' | 'bank' | null
  const [org, setOrg] = useState(null);
  const [orgErr, setOrgErr] = useState({});
  const [bank, setBank] = useState({ name: '', number: '' });
  const [bankErr, setBankErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [addingRep, setAddingRep] = useState(false);
  const [removingRep, setRemovingRep] = useState(null);
  const [upload, setUpload] = useState(null); // { doc?: existing document, type }
  const docs = useMemo(() => coop?.documents || [], [coop]);

  useEffect(() => {
    if (!loading && hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 50);
  }, [loading, hash]);

  if (loading) return <PageSkeleton />;
  if (!coop) return <div className="page"><EmptyState title="We could not find your cooperative record" action={<LinkButton to="/coop" variant="outline">Back to dashboard</LinkButton>}>Sign in again with a cooperative account.</EmptyState></div>;

  const reps = coop.representatives || [];
  const bankInfo = coop.bank || { name: '', accountName: '', last4: '' };
  const verifiedDocs = docs.filter((d) => d.status === 'Verified').length;
  const initials = coop.name.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  // ----- organisation details -----
  const startOrg = () => {
    setOrg({ name: coop.name, regNumber: coop.regNumber, yearEstablished: String(coop.yearEstablished || ''), email: coop.email, phone: coop.phone, address: coop.address, state: coop.state, lga: coop.lga });
    setOrgErr({}); setEditing('org');
  };
  const setO = (k) => (e) => { setOrg((s) => ({ ...s, [k]: e.target.value })); if (orgErr[k]) setOrgErr((s) => ({ ...s, [k]: '' })); };
  const saveOrg = async () => {
    const e = {};
    const year = Number(org.yearEstablished);
    if (org.name.trim().length < 3) e.name = 'Enter the cooperative name as it appears on your registration certificate.';
    if (!/^[A-Za-z0-9/.\s-]{4,}$/.test(org.regNumber.trim())) e.regNumber = 'Enter your registration number, at least 4 characters. Letters, numbers, / and - are allowed.';
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) e.yearEstablished = `Enter a year between 1900 and ${new Date().getFullYear()}.`;
    if (!isEmail(org.email)) e.email = 'Enter a valid official email address.';
    const phoneChanged = org.phone.trim() !== coop.phone;
    if (phoneChanged && !normalisePhone(org.phone).ok) e.phone = 'Enter an 11-digit phone number, for example 0803 123 4567.';
    if (!org.address.trim()) e.address = 'Enter the office address.';
    if (!org.state.trim()) e.state = 'Enter the state.';
    if (!org.lga.trim()) e.lga = 'Enter the local government area.';
    setOrgErr(e);
    if (Object.keys(e).length) { setTimeout(() => document.querySelector('.coopa-profile-org [aria-invalid="true"]')?.focus(), 0); return; }
    const next = {
      name: org.name.trim(), regNumber: org.regNumber.trim(), yearEstablished: year, email: org.email.trim(), phone: phoneChanged ? toIntl(normalisePhone(org.phone).display) : coop.phone,
      address: org.address.trim(), state: org.state.trim(), lga: org.lga.trim(),
    };
    const labels = { name: 'Name', regNumber: 'Registration number', yearEstablished: 'Year established', email: 'Email', phone: 'Phone', address: 'Address', state: 'State', lga: 'LGA' };
    const changed = Object.keys(next).filter((k) => String(next[k]) !== String(coop[k]));
    if (!changed.length) { toast('No changes to save.', 'info'); setEditing(null); return; }
    setBusy(true);
    await simulate(700);
    update('cooperatives', coop.id, next, {
      action: 'Cooperative details updated', entityType: 'Cooperative', summary: `Changed: ${changed.map((k) => labels[k]).join(', ')}`, reason: 'Edited by cooperative',
    });
    if (changed.includes('name') || changed.includes('regNumber')) {
      notify('admin', 'Registered details changed', `${next.name} changed its ${changed.filter((k) => ['name', 'regNumber'].includes(k)).map((k) => labels[k].toLowerCase()).join(' and ')}. Please re-check against the certificate.`, `/admin/verification/cooperatives/${coop.id}`, 'verification');
    }
    toast('Organisation details saved.', 'success');
    setBusy(false);
    setEditing(null);
  };

  // ----- payout account -----
  const startBank = () => { setBank({ name: bankInfo.name, number: '' }); setBankErr({}); setEditing('bank'); };
  const saveBank = async () => {
    const e = {};
    if (!bank.name.trim()) e.name = 'Enter the bank name.';
    if (!/^\d{10}$/.test(bank.number)) e.number = 'Enter the full 10-digit account number. We only keep the last 4 digits.';
    setBankErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    await simulate(700);
    const last4 = bank.number.slice(-4);
    update('cooperatives', coop.id, { bank: { name: bank.name.trim(), accountName: coop.name || 'Cooperative account', last4 } }, {
      action: 'Payout account changed', entityType: 'Cooperative', summary: `Bank ${bankInfo.name || 'none'} to ${bank.name.trim()}. Account ending ${bankInfo.last4 || '----'} to ${last4}.`, reason: 'Edited by cooperative',
    });
    notify('admin', 'Payout account change needs review', `${coop.name} changed its payout account. No payment should go to the new account until a reviewer confirms it.`, `/admin/verification/cooperatives/${coop.id}`, 'verification');
    toast('Payout account saved. A reviewer will confirm it before any payment is made to it.', 'success');
    setBusy(false);
    setEditing(null);
  };

  // ----- representatives -----
  const saveReps = (list, action, summary) => update('cooperatives', coop.id, { representatives: list }, { action, entityType: 'Cooperative', summary, reason: 'Edited by cooperative' });
  const addRep = (rep) => {
    saveReps([...reps, rep], 'Authorised representative added', `${rep.name} added as ${rep.role}`);
    toast(`${rep.name} was added as ${rep.role}.`, 'success');
  };
  const removeRep = async () => {
    setBusy(true);
    await simulate(500);
    saveReps(reps.filter((r) => r.name !== removingRep.name), 'Authorised representative removed', `${removingRep.name} (${removingRep.role}) removed`);
    toast(`${removingRep.name} was removed.`, 'success');
    setBusy(false);
    setRemovingRep(null);
  };

  // ----- documents -----
  const saveDocument = (type, file) => {
    const target = upload?.doc;
    const list = target
      ? docs.map((d) => (d.id === target.id ? { ...d, file: file.name, status: 'Uploaded', reviewer: null, reviewedAt: null } : d))
      : [...docs, { id: `doc-${Date.now().toString(36)}`, type, file: file.name, status: 'Uploaded', reviewer: null, reviewedAt: null }];
    update('cooperatives', coop.id, { documents: list }, {
      action: target ? 'Document replaced' : 'Document uploaded', entityType: 'Cooperative', summary: `${type}: ${file.name}. Status Uploaded, awaiting review.`, reason: 'Verification documents',
    });
    notify('admin', 'Cooperative document awaiting review', `${coop.name} uploaded ${type}.`, `/admin/verification/cooperatives/${coop.id}`, 'verification');
    toast(`${type} uploaded. It shows as Uploaded until a reviewer verifies it.`, 'success');
  };

  return (
    <div className="page coopa">
      <PageHeader title="Profile" subtitle="Manage your cooperative's information, representatives, payout account and verification documents." />
      <UnverifiedBanner coop={coop}>Keep your documents up to date below. Funding requests and disbursement requests unlock once a reviewer verifies your cooperative.</UnverifiedBanner>

      <Card className="coopa-profile-head">
        <Avatar name={coop.name} size="lg" />
        <div className="grow">
          <h2 className="coopa-head__name">{coop.name}</h2>
          <div className="small muted">Registration number {coop.regNumber}. Established {coop.yearEstablished}.</div>
          <div className="small muted">{coop.address}, {coop.lga}, {coop.state}</div>
        </div>
        <div className="coopa-profile-head__status">
          <StatusPill tone={verified ? 'green' : 'amber'}>{coop.status}</StatusPill>
          <span className="caption muted">{verified && coop.verifiedAt ? `Verified on ${formatDateShort(coop.verifiedAt)}` : `${initials} cooperative account`}</span>
        </div>
      </Card>

      <Card className="coopa-profile-org">
        <SectionHead icon={<Building2 size={18} />} title="Organisation details" right={editing !== 'org' && <Button variant="outline-green" size="sm" onClick={startOrg} disabled={Boolean(editing)}><Pencil size={16} />Edit</Button>} />
        {editing === 'org' && org ? (
          <div className="stack">
            <div className="form-grid">
              <TextField label="Cooperative name" required value={org.name} onChange={setO('name')} error={orgErr.name} />
              <TextField label="Registration number" required value={org.regNumber} onChange={setO('regNumber')} error={orgErr.regNumber} />
              <TextField label="Year established" required inputMode="numeric" maxLength={4} value={org.yearEstablished} onChange={setO('yearEstablished')} error={orgErr.yearEstablished} />
              <TextField label="Official email address" required type="email" value={org.email} onChange={setO('email')} error={orgErr.email} />
              <TextField label="Phone number" required type="tel" value={org.phone} onChange={setO('phone')} error={orgErr.phone} />
              <TextField label="State" required value={org.state} onChange={setO('state')} error={orgErr.state} />
              <TextField label="Local government area" required value={org.lga} onChange={setO('lga')} error={orgErr.lga} />
              <TextField className="full" label="Office address" required value={org.address} onChange={setO('address')} error={orgErr.address} />
            </div>
            <Banner tone="info">If you change the cooperative name or registration number, a reviewer is asked to re-check it against your certificate.</Banner>
            <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
              <Button onClick={saveOrg} loading={busy}>Save changes</Button>
            </div>
          </div>
        ) : (
          <InfoList items={[
            ['Cooperative name', coop.name],
            ['Registration number', coop.regNumber],
            ['Year established', coop.yearEstablished],
            ['Email address', coop.email],
            ['Phone number', coop.phone],
            ['Country', 'Nigeria'],
            ['State', coop.state],
            ['Local government area', coop.lga],
            ['Office address', coop.address],
          ]}
          />
        )}
      </Card>

      <div className="grid-2 coopa-profile-pair">
        <Card>
          <SectionHead icon={<Users size={18} />} title="Authorised representatives" right={<Button variant="outline-green" size="sm" onClick={() => setAddingRep(true)}><UserPlus size={16} />Add</Button>} />
          <p className="caption muted" style={{ marginBottom: 8 }}>People who can sign agreements and confirm evidence for your cooperative. At least one is required.</p>
          {reps.length === 0 ? (
            <EmptyState icon={<Users size={28} />} title="No representatives listed" action={<Button size="sm" onClick={() => setAddingRep(true)}><Plus size={16} />Add representative</Button>}>Add the chairperson or secretary so agreements can be signed.</EmptyState>
          ) : (
            <ul className="coopa-reps">
              {reps.map((r) => {
                const me = r.name === user?.name;
                return (
                  <li key={r.name} className="coopa-rep">
                    <Avatar name={r.name} />
                    <div className="grow"><div className="strong small">{r.name}{me && <span className="chip coopa-skill" style={{ marginLeft: 8 }}>You</span>}</div><div className="cell-sub">{r.role}</div></div>
                    <button type="button" className="kebab" aria-label={`Remove ${r.name}`} disabled={me || reps.length === 1} title={me ? 'You cannot remove yourself' : reps.length === 1 ? 'At least one representative is required' : `Remove ${r.name}`} onClick={() => setRemovingRep(r)}><Trash2 size={16} /></button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHead icon={<Landmark size={18} />} title="Payout account" right={editing !== 'bank' && <Button variant="outline-green" size="sm" onClick={startBank} disabled={Boolean(editing)}><Pencil size={16} />Edit</Button>} />
          <Banner tone="green" className="coopa-hold">CollabFarm does not hold or pool money. A regulated financial partner pays approved amounts into this account. Enter the full 10-digit account number; this demo retains only its last 4 digits. Bank account-name lookup is not connected.</Banner>
          {editing === 'bank' ? (
            <div className="stack" style={{ marginTop: 16 }}>
              <TextField label="Account name" value={coop.name} readOnly hint="Filled from your cooperative profile. This is not verified against the bank." />
              <SelectField label="Bank name" required placeholder="Choose bank" options={BANKS} value={bank.name} onChange={(e) => { setBank((s) => ({ ...s, name: e.target.value })); if (bankErr.name) setBankErr((s) => ({ ...s, name: '' })); }} error={bankErr.name} />
              <TextField label="Account number" required inputMode="numeric" maxLength={10} autoComplete="off" value={bank.number} placeholder="10-digit account number" onChange={(e) => { setBank((s) => ({ ...s, number: e.target.value.replace(/\D/g, '').slice(0, 10) })); if (bankErr.number) setBankErr((s) => ({ ...s, number: '' })); }} error={bankErr.number} hint="Enter all 10 digits. Only the last 4 are retained in this demo." />
              <Banner tone="warn">A reviewer confirms a new payout account before any payment is made to it.</Banner>
              <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>
                <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
                <Button onClick={saveBank} loading={busy}>Save account</Button>
              </div>
            </div>
          ) : (
            <InfoList compact items={[
              ['Bank name', bankInfo.name || '-'],
              ['Account name', bankInfo.accountName || coop.name],
              ['Account number', bankInfo.last4 ? <span key="n" className="nowrap" aria-label={`Account ending ${bankInfo.last4}`}>{'•••• •••• '}{bankInfo.last4}</span> : 'Not added yet'],
            ]}
            />
          )}
        </Card>
      </div>

      <Card id="verification" className="coopa-verification">
        <SectionHead icon={<ShieldCheck size={18} />} title="Verification status" right={<Button size="sm" onClick={() => setUpload({ doc: null, type: COOP_DOC_TYPES[0] })}><Upload size={16} />Upload document</Button>} />
        <div className="coopa-verif">
          <div className="coopa-verif__status">
            <StatusPill tone={verified ? 'green' : 'amber'}>{coop.status}</StatusPill>
            <p className="small">{STATUS_TEXT[coop.status] || 'Check the verification status page for the latest update.'}</p>
            <Link to="/onboarding/status" className="small strong">View verification status</Link>
          </div>
          <div className="coopa-verif__progress">
            <div className="row between small"><span>Documents verified</span><strong>{verifiedDocs} of {docs.length}</strong></div>
            <Progress value={docs.length ? (verifiedDocs / docs.length) * 100 : 0} label="Documents verified" tone="dark" />
          </div>
        </div>
        <DocLegend />
        <DataTable
          bare hideFooter pageSize={50} rows={docs}
          emptyTitle="No documents uploaded yet"
          emptyText="Upload your registration certificate, proof of address and leadership identification so a reviewer can verify your cooperative."
          emptyAction={<Button size="sm" onClick={() => setUpload({ doc: null, type: COOP_DOC_TYPES[0] })}><Upload size={16} />Upload document</Button>}
          columns={[
            { key: 'type', header: 'Document', render: (d) => <span className="strong">{d.type}</span> },
            { key: 'file', header: 'File', render: (d) => <span className="cell-sub">{d.file}</span> },
            { key: 'status', header: 'Status', render: (d) => <DocStatusPill status={d.status} /> },
            { key: 'reviewer', header: 'Checked by', render: (d) => (d.reviewer ? <div>{d.reviewer}<div className="cell-sub">{d.reviewedAt ? formatDateShort(d.reviewedAt) : ''}</div></div> : <span className="muted">Not checked yet</span>) },
            { key: 'actions', header: 'Actions', render: (d) => (d.status === 'Verified' ? <span className="caption muted">Locked after verification</span> : <Button variant="outline-green" size="sm" onClick={() => setUpload({ doc: d, type: d.type })}>Replace file</Button>) },
          ]}
        />
      </Card>

      <RepModal open={addingRep} onClose={() => setAddingRep(false)} existing={reps} onSave={addRep} />
      <ConfirmDialog
        open={Boolean(removingRep)}
        onClose={() => !busy && setRemovingRep(null)}
        onConfirm={removeRep}
        loading={busy}
        title="Remove this representative?"
        message="They will no longer be able to sign agreements for your cooperative. Agreements they already signed stay valid."
        summary={removingRep ? [['Name', removingRep.name], ['Role', removingRep.role]] : undefined}
        confirmLabel="Remove representative"
      />
      <UploadDocumentModal
        open={Boolean(upload)}
        onClose={() => setUpload(null)}
        title={upload?.doc ? 'Replace document file' : 'Upload document'}
        intro={upload?.doc ? `Upload a new file for ${upload.doc.type}. It goes back to Uploaded until a reviewer checks it.` : 'Upload a document so a CollabFarm reviewer can verify your cooperative.'}
        typeOptions={COOP_DOC_TYPES}
        defaultType={upload?.type}
        lockType={Boolean(upload?.doc)}
        submitLabel={upload?.doc ? 'Replace file' : 'Upload document'}
        onSubmit={saveDocument}
      />
    </div>
  );
}
