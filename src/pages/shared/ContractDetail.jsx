import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, Info } from 'lucide-react';
import '../../styles/pages/shr.css';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { Banner, Breadcrumb, Button, Card, CardHeader, InfoList, PageHeader, StatusPill } from '../../components/ui/index.js';
import { NoAccess, NotFoundRecord } from '../../components/shr/ShrBits.jsx';
import { AdminPanel, AgreementSections, PendingAmendmentBanner, SigningPanel, VersionTable } from '../../components/shr/ContractPanels.jsx';
import { agreementText, buildAgreement } from '../../components/shr/agreementText.js';
import { CONTRACT_TYPES, baseFor, byId, canSeeContract, downloadFile, isoNow, mustSign, whenLabel } from '../../components/shr/shrUtils.js';
import { formatDateShort } from '../../utils/format.js';

const bump = (v) => {
  const m = /^v(\d+)\.(\d+)$/.exec(v || '');
  return m ? `v${m[1]}.${Number(m[2]) + 1}` : `${v || 'v1.0'}-a`;
};
const today = () => isoNow().slice(0, 10);

export default function ContractDetail() {
  const { id } = useParams();
  const { data, user, role } = useApp();
  const base = baseFor(role);
  const listPath = `${base}/contracts`;
  const listLabel = role === 'investor' ? 'Agreements' : role === 'admin' ? 'Contract Status' : 'Contracts';
  const c = byId(data.contracts, id);
  if (!c) return <NotFoundRecord title="We could not find that agreement" backTo={listPath} backLabel={`Back to ${listLabel}`}>The link may be old, or the agreement may not exist in this demo.</NotFoundRecord>;
  if (!canSeeContract(data, user, c)) return <NoAccess title="You do not have access to this agreement" backTo={listPath} backLabel={`Back to ${listLabel}`}>Agreements are visible only to the parties who sign them and CollabFarm administrators.</NoAccess>;
  return <ContractView c={c} base={base} listPath={listPath} listLabel={listLabel} />;
}

function ContractView({ c, base, listPath, listLabel }) {
  const { data, user, role, update, notify, toast } = useApp();
  const isAdmin = role === 'admin';
  const pkg = byId(data.packages, c.packageId);
  const coop = pkg ? byId(data.cooperatives, pkg.coopId) : null;
  const typeInfo = CONTRACT_TYPES[c.type];
  const built = useMemo(() => buildAgreement(c, data), [c, data]);
  const signerHere = mustSign(user, c);
  const canSign = signerHere && c.status === 'Awaiting Signature';
  const canAccept = signerHere && c.status === 'Signed' && !!c.pendingAmendment;
  const partyLink = { A: '/investor/contracts', B: '/coop/contracts', C: '/farmer/agreement' }[c.type];
  const adminLink = `/admin/contracts/${c.id}`;

  const signatoryLabel = () => {
    if (c.type === 'B') {
      const rep = coop?.representatives?.find((r) => r.name === user.name);
      return rep ? `${user.name}, ${rep.role}` : `${user.name}, authorised representative`;
    }
    return `${user.name} (identity verified, typed name and consent recorded)`;
  };

  const sign = async () => {
    await simulate(800);
    const now = isoNow();
    update('contracts', c.id, (r) => ({
      status: 'Signed', signedAt: now, signatory: signatoryLabel(), signedVersion: r.version, signedBy: user.id,
      signatures: [...(r.signatures || []), { version: r.version, at: now, by: signatoryLabel() }],
      history: [...(r.history || []), { version: r.version, date: today(), change: `Signed by ${user.name} (typed name and consent)` }],
    }), { action: 'Signed agreement', entityType: 'Contract', reason: `Agreement ${c.type} ${c.version} accepted by typed name and consent`, summary: `Status Awaiting Signature to Signed, version ${c.version}` });
    if (c.type === 'A') notify('cooperative', 'Investor signed Agreement A', `${c.partyName} signed the Investor Funding Agreement for ${pkg?.name || 'a package'} (${c.version}).`, '/coop/contracts', 'contract');
    notify('admin', `${typeInfo.label} signed`, `${user.name} signed ${c.title} for ${pkg?.name || c.packageId} (${c.version}).`, adminLink, 'contract');
    toast(`${typeInfo.label} signed. Version ${c.version} was recorded with the time.`);
  };

  const accept = async () => {
    const am = c.pendingAmendment;
    await simulate(800);
    const now = isoNow();
    update('contracts', c.id, (r) => ({
      version: am.version, status: 'Signed', signedAt: now, signatory: signatoryLabel(), signedBy: user.id, pendingAmendment: null,
      signatures: [...(r.signatures || (r.signedAt ? [{ version: r.version, at: r.signedAt, by: r.signatory }] : [])), { version: am.version, at: now, by: signatoryLabel() }],
      history: (r.history || []).map((h) => (h.version === am.version && h.status === 'Awaiting acceptance' ? { ...h, status: 'Accepted', acceptedBy: user.name, acceptedAt: now } : h)),
    }), { action: 'Accepted agreement amendment', entityType: 'Contract', reason: am.change, summary: `Version ${c.version} to ${am.version}. Earlier version kept in history.` });
    notify('admin', `${typeInfo.label} amendment accepted`, `${user.name} accepted ${am.version} of ${c.title}.`, adminLink, 'contract');
    toast(`Amendment ${am.version} accepted. The earlier version is kept in the history.`);
  };

  const addNote = async (text) => {
    await simulate(250);
    const now = isoNow();
    update('contracts', c.id, (r) => ({ adminNotes: [...(r.adminNotes || []), { at: now, by: user.name, text }] }), { action: 'Added admin note on agreement', entityType: 'Contract', reason: 'Internal note', summary: `Note added to ${c.id}` });
    toast('Note saved');
  };

  const remind = async () => {
    await simulate(300);
    const msg = `Please sign ${c.title} for ${pkg?.name || 'your package'} (${c.version}). Funding steps stay blocked until it is signed.`;
    notify(c.type === 'A' ? 'investor' : c.type === 'B' ? 'cooperative' : 'farmer', 'Contract signing required', c.type === 'C' ? `${c.partyName}: ${msg}` : msg, partyLink, 'contract');
    if (c.type === 'C') notify('cooperative', 'Farmer agreement still unsigned', `${c.partyName} has not signed ${c.title}.`, '/coop/contracts', 'contract');
    update('contracts', c.id, { lastReminderAt: isoNow() }, { action: 'Sent signing reminder', entityType: 'Contract', reason: 'Agreement awaiting signature', summary: `Reminder sent for ${c.version}` });
    toast('Signing reminder sent');
  };

  const nextVersion = bump(c.version);
  const amend = async (change) => {
    await simulate(300);
    const now = isoNow();
    update('contracts', c.id, (r) => ({
      pendingAmendment: { version: nextVersion, change, proposedBy: user.name, proposedAt: now },
      history: [...(r.history || []), { version: nextVersion, date: today(), change, status: 'Awaiting acceptance' }],
    }), { action: 'Proposed agreement amendment', entityType: 'Contract', reason: change, summary: `New version ${nextVersion} proposed. Version ${c.version} kept.` });
    notify(c.type === 'A' ? 'investor' : c.type === 'B' ? 'cooperative' : 'farmer', 'Agreement amendment to accept', `${c.title} has a proposed new version (${nextVersion}). Read it and accept it, or contact support.`, partyLink, 'contract');
    toast(`Version ${nextVersion} proposed. The party must accept it.`);
  };

  const download = () => {
    const ok = downloadFile(`${c.id}-${c.version}.txt`, agreementText(c, data, built));
    toast(ok ? 'A text copy was generated on your device' : 'Could not create the file in this browser', ok ? 'success' : 'error');
  };

  const signSummary = [
    ['Agreement', `${typeInfo.label}, ${typeInfo.long}`], ['Package', pkg?.name || c.packageId], ['Version', (canAccept ? c.pendingAmendment?.version : c.version) || '-'],
    ['Signing as', user.name], ...(c.fundingModel ? [['Funding model', c.fundingModel]] : []), ['Return', 'Not guaranteed'],
  ];

  const facts = [
    ['Agreement', `${typeInfo.label}, ${typeInfo.long}`],
    ['Package', pkg ? (isAdmin ? <Link to={`/admin/monitoring/${pkg.id}`}>{pkg.name}</Link> : pkg.name) : c.packageId],
    ['Party', `${c.partyName} (${c.partyType})`],
    ...(coop ? [['Cooperative', coop.name]] : []),
    ['Version', c.version],
    ...(c.type === 'A' ? [['Funding model', c.fundingModel || 'Not set']] : []),
    ['Signed', c.signedAt ? whenLabel(c.signedAt) : 'Not signed yet'],
    ['Signatory', c.signatory || '-'],
  ];

  return (
    <div className="page shr-page">
      <Breadcrumb items={[{ label: listLabel, to: listPath }, { label: c.id }]} />
      <PageHeader
        title={c.title}
        subtitle={`${typeInfo.label} · ${c.version} · ${pkg?.name || c.packageId}`}
        actions={(<><StatusPill>{c.status}</StatusPill><Button variant="outline" onClick={download}><Download size={18} />Download text copy</Button></>)}
      />

      {c.status === 'Expired' && (
        <Banner tone="danger" title="This agreement has expired">
          It is no longer valid for funding steps. {isAdmin ? 'Ask the party to sign a new version.' : 'A new version must be offered and signed before this party can take part again.'}
        </Banner>
      )}
      {c.status === 'Awaiting Signature' && (
        <Banner tone="warn" title="Incomplete: not signed yet">
          {canSign ? 'This agreement is waiting for your signature. Funding steps for this package are blocked until it is signed.' : `Waiting for ${c.partyName} to sign. Funding steps that depend on this agreement stay blocked until then.${c.lastReminderAt ? ` A reminder was sent on ${formatDateShort(c.lastReminderAt)}.` : ''}`}
        </Banner>
      )}
      {c.pendingAmendment && <PendingAmendmentBanner amendment={c.pendingAmendment} canAccept={canAccept} />}

      <div className="grid-main">
        <div className="stack-lg">
          <Card tone="tint">
            <CardHeader title="In plain language" subtitle="Read this first. The full agreement follows below." />
            <ul className="shr-plain">
              {built.plain.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
            <p className="caption muted mt-4"><Info size={13} style={{ verticalAlign: '-2px' }} /> Returns are estimates and are never guaranteed. A commitment is not received money. Approval is not a guarantee of success.</p>
          </Card>

          <Card>
            <CardHeader title="Full agreement" subtitle="Open any section to read the sample wording. Each section starts with a plain language line." />
            <AgreementSections sections={built.sections} />
          </Card>

          <Card>
            <CardHeader title="Version history" subtitle="Versions are never overwritten. A change creates a new version that must be accepted." />
            <VersionTable contract={c} />
          </Card>
        </div>

        <div className="stack-lg">
          <Card>
            <CardHeader title="Agreement details" />
            <InfoList compact items={facts} />
          </Card>

          {canSign && <SigningPanel mode="sign" signerName={user.name} contract={c} versionLabel={c.version} summary={signSummary} onConfirm={sign} />}
          {canAccept && <SigningPanel mode="accept" signerName={user.name} contract={c} versionLabel={c.pendingAmendment.version} summary={signSummary} onConfirm={accept} />}
          {!signerHere && !isAdmin && c.status === 'Awaiting Signature' && (
            <Banner tone="info" title="Only the named party can sign">{c.type === 'C' ? 'The farmer signs this agreement from their own account. The cooperative cannot sign on their behalf.' : 'This agreement is signed by the named party.'}</Banner>
          )}
          {signerHere && c.status === 'Signed' && !c.pendingAmendment && (
            <Banner tone="success" title="You have signed this version">Signed {whenLabel(c.signedAt)}. You can download a text copy at any time.</Banner>
          )}

          {isAdmin && <AdminPanel contract={c} onNote={addNote} onRemind={remind} onAmend={amend} nextVersion={nextVersion} />}
        </div>
      </div>
    </div>
  );
}
