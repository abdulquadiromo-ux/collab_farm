import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, FileWarning, ShieldCheck } from 'lucide-react';
import '../../styles/pages/shr.css';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { Banner, DataTable, KpiStrip, PageHeader, PageSkeleton, StatusPill } from '../../components/ui/index.js';
import { CONTRACT_TYPES, agreementBlockers, baseFor, contractsForUser, pkgName } from '../../components/shr/shrUtils.js';
import { formatDateShort } from '../../utils/format.js';

const COPY = {
  cooperative: {
    title: 'Contracts and agreements',
    sub: 'Agreement B for each of your packages, and the status of Agreement C for the farmers in them.',
    help: 'Agreement B is signed by the cooperative for each package. Agreement C is signed by each farmer. Funding steps stay blocked until the mandatory agreements are signed.',
  },
  investor: {
    title: 'Agreements',
    sub: 'Your Investor Funding Agreements (Agreement A), one for each package you fund.',
    help: 'Agreement A explains the funding model, the risks and when money is released. It is signed before a commitment can be confirmed. It never guarantees a return.',
  },
};

export default function Contracts() {
  const { data, user, role } = useApp();
  const navigate = useNavigate();
  const loading = useSimulatedLoad(350);
  const base = baseFor(role);
  const copy = COPY[role] || COPY.cooperative;

  const rows = useMemo(() => contractsForUser(data, user), [data, user]);
  const blockers = useMemo(() => agreementBlockers(data, user), [data, user]);
  const count = (s) => rows.filter((r) => r.status === s).length;
  const typeOptions = useMemo(() => [...new Set(rows.map((r) => r.type))].sort().map((t) => ({ value: t, label: `${CONTRACT_TYPES[t].label} (${CONTRACT_TYPES[t].party})` })), [rows]);
  const pkgOptions = useMemo(() => [...new Set(rows.map((r) => r.packageId))].map((id) => ({ value: id, label: pkgName(data, id) })), [rows, data]);

  const columns = [
    {
      key: 'title', header: 'Agreement', sortable: true,
      render: (r) => (
        <div>
          <Link to={`${base}/contracts/${r.id}`} className="strong" onClick={(e) => e.stopPropagation()}>{r.title}</Link>
          <div className="cell-sub">{r.id}</div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', className: 'nowrap', sortable: true, render: (r) => <span className={`shr-type shr-type--${r.type}`}>{CONTRACT_TYPES[r.type].label}</span> },
    { key: 'packageId', header: 'Package', render: (r) => <span className="shr-clamp">{pkgName(data, r.packageId)}</span> },
    { key: 'partyName', header: 'Party', render: (r) => (<div><div>{r.partyName}</div><div className="cell-sub">{r.partyType}</div></div>) },
    { key: 'version', header: 'Version', className: 'nowrap', render: (r) => r.version },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <StatusPill>{r.status}</StatusPill> },
    { key: 'signedAt', header: 'Signed', className: 'nowrap', sortable: true, sortValue: (r) => r.signedAt || '', render: (r) => (r.signedAt ? formatDateShort(r.signedAt) : <span className="muted">Not signed</span>) },
  ];

  if (loading) return <PageSkeleton />;

  return (
    <div className="page shr-page">
      <PageHeader title={copy.title} subtitle={copy.sub} />

      <Banner tone="info" title="How agreements work">
        {copy.help} The funding model (loan, grant, profit share or other) is an open decision set in each agreement. Versions are never overwritten: a change creates a new version that needs acceptance.
      </Banner>

      {blockers.length > 0 ? (
        <Banner tone="warn" title={`Missing or unsigned mandatory agreements block funding steps (${blockers.length})`}>
          <ul className="shr-blockers">
            {blockers.map((b) => (
              <li key={b.key}>
                <span><strong>{b.title}.</strong> {b.text}</span>
                <Link to={b.to} className="strong nowrap">{b.kind === 'Missing' ? 'Open package' : 'Open agreement'}</Link>
              </li>
            ))}
          </ul>
        </Banner>
      ) : (
        <Banner tone="success" title="No funding step is blocked by an agreement">All mandatory agreements for your packages are signed and in date.</Banner>
      )}

      <KpiStrip
        columns={3}
        cells={[
          { icon: <Clock size={18} />, label: 'Awaiting signature', value: count('Awaiting Signature'), sub: 'Needs a signature before funding continues' },
          { icon: <CheckCircle2 size={18} />, label: 'Signed', value: count('Signed'), sub: 'Version, signatory and time are recorded' },
          { icon: <FileWarning size={18} />, label: 'Expired', value: count('Expired'), sub: 'A new version is needed' },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={(r) => `${r.title} ${r.id} ${r.partyName} ${pkgName(data, r.packageId)} ${r.version}`}
        searchPlaceholder="Search agreements"
        filters={[
          ...(typeOptions.length > 1 ? [{ key: 'type', allLabel: 'All types', options: typeOptions }] : []),
          { key: 'status', allLabel: 'All statuses', options: ['Awaiting Signature', 'Signed', 'Expired'] },
          { key: 'packageId', allLabel: 'All packages', options: pkgOptions },
        ]}
        onRowClick={(r) => navigate(`${base}/contracts/${r.id}`)}
        totalLabel="agreements"
        emptyTitle="No agreements yet"
        emptyText="Agreements appear here when a package is approved and funding steps begin."
      />

      <p className="small muted"><ShieldCheck size={14} style={{ verticalAlign: '-2px' }} /> Agreement wording shown in this demo is sample text for illustration.</p>
    </div>
  );
}
