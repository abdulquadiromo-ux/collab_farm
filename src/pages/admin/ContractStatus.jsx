import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileCheck2, FileSignature, AlarmClockOff, ShieldAlert, Send, Eye, Lock } from 'lucide-react';
import { useApp, useSimulatedLoad, simulate } from '../../context/AppContext.jsx';
import { PageHeader, PageSkeleton, DataTable, StatusPill, Banner, KpiStrip, Tabs, Button, LinkButton, Modal, Progress, FilterSelect, Chip } from '../../components/ui/index.js';
import { formatDate, formatDateShort, percent } from '../../utils/format.js';
import { contractMatrix, AGREEMENT_NAMES, AGREEMENT_SHORT, CONTRACT_STATE_TONE, PARTY_ROLE, nowIso } from '../../components/adma/helpers.js';
import '../../styles/pages/adma.css';

const STATE_OPTIONS = ['Signed', 'Awaiting Signature', 'Expired', 'Not on file'];
const PARTY_LINK = { Investor: '/investor/contracts', Cooperative: '/coop/contracts', Farmer: '/farmer/agreement' };
const DAY = 86400000;

const StatePill = ({ state }) => <StatusPill tone={CONTRACT_STATE_TONE[state] || 'gray'}>{state}</StatusPill>;

function missingNames(items, limit = 2) {
  const miss = items.filter((x) => x.state !== 'Signed' && x.state !== 'Not due yet');
  if (!miss.length) return null;
  const names = miss.slice(0, limit).map((x) => x.partyName).join(', ');
  return `Missing: ${names}${miss.length > limit ? ` and ${miss.length - limit} more` : ''}`;
}

export default function ContractStatus() {
  const { data, user, update, audit, notify, toast } = useApp();
  const loading = useSimulatedLoad(350);
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'list' ? 'list' : 'matrix';
  const [typeCol, setTypeCol] = useState('');
  const [detail, setDetail] = useState(null); // package id
  const [sending, setSending] = useState(null);

  const matrix = useMemo(() => contractMatrix(data), [data]);
  const list = useMemo(() => {
    const byId = new Map(data.packages.map((p) => [p.id, p]));
    const rows = data.contracts.map((c) => {
      const pkg = byId.get(c.packageId);
      return {
        key: c.id, contract: c, type: c.type, title: c.title, packageId: c.packageId, pkgName: pkg?.name || c.packageId, partyType: c.partyType, partyId: c.partyId, partyName: c.partyName,
        version: c.version, state: c.status, signedAt: c.signedAt, lastReminder: c.reminders?.[c.reminders.length - 1]?.at || null,
      };
    });
    matrix.forEach((m) => [...m.aItems, m.bItem, ...m.cItems].forEach((it) => {
      if (!it.contract && it.state === 'Not on file') {
        rows.push({ key: `missing-${m.pkg.id}-${it.type}-${it.partyId}`, contract: null, type: it.type, title: AGREEMENT_NAMES[it.type], packageId: m.pkg.id, pkgName: m.pkg.name, partyType: it.partyType, partyId: it.partyId, partyName: it.partyName, version: '-', state: 'Not on file', signedAt: null, lastReminder: null });
      }
    }));
    return rows.map((r) => ({ ...r, text: `${r.title} ${r.pkgName} ${r.partyName} ${r.type} ${r.key}` }));
  }, [data.contracts, data.packages, matrix]);

  if (loading) return <PageSkeleton />;

  const issuedRows = matrix.filter((m) => m.issued);
  const allItems = issuedRows.flatMap((m) => m.all);
  const countState = (s) => allItems.filter((i) => i.state === s).length;
  const blocked = matrix.filter((m) => m.blockers.length > 0).length;
  const setView = (id) => setParams(id === 'matrix' ? {} : { view: id }, { replace: true });
  const detailRow = matrix.find((m) => m.pkg.id === detail) || null;

  const sendReminder = async (item) => {
    const pkg = data.packages.find((p) => p.id === item.packageId);
    const key = `${item.packageId}-${item.type}-${item.partyId}`;
    setSending(key);
    await simulate(450);
    const verb = item.state === 'Expired' ? 'has expired and must be renewed and signed again' : item.state === 'Not on file' ? 'is not on file yet and needs to be recorded and signed' : 'is waiting for a signature';
    notify(PARTY_ROLE[item.partyType], 'Contract signing required', `Reminder for ${item.partyName}: ${AGREEMENT_SHORT[item.type]} (${AGREEMENT_NAMES[item.type]}) for ${pkg?.name || item.packageId} ${verb}.`, PARTY_LINK[item.partyType], 'contract');
    const entry = { action: 'Signing reminder sent', entityType: 'Contract', entityId: item.contract?.id || key, summary: `${AGREEMENT_SHORT[item.type]} for ${pkg?.name || item.packageId}: reminder to ${item.partyName}`, reason: 'Mandatory agreement outstanding' };
    if (item.contract) update('contracts', item.contract.id, (c) => ({ reminders: [...(c.reminders || []), { at: nowIso(), by: user.name }] }), entry);
    else audit(entry);
    toast(`Reminder sent to ${item.partyName}.`);
    setSending(null);
  };

  const recentlyReminded = (at) => at && Date.now() - new Date(at).getTime() < DAY;

  const reminderButton = (item, size = 'sm') => {
    if (item.state === 'Signed' || item.state === 'Not due yet') return null;
    const last = item.contract?.reminders?.[item.contract.reminders.length - 1]?.at;
    const key = `${item.packageId}-${item.type}-${item.partyId}`;
    const wait = recentlyReminded(last);
    return (
      <Button size={size} variant="outline" loading={sending === key} disabled={wait} onClick={() => sendReminder(item)} aria-label={`Send reminder to ${item.partyName}`} title={wait ? `Reminded ${formatDateShort(last)}` : undefined}>
        <Send size={14} />{wait ? 'Reminded' : 'Send reminder'}
      </Button>
    );
  };

  // ----- matrix -----
  const showCol = (t) => !typeCol || typeCol === t;
  const progressCell = (items, signed) => {
    if (!items.length) return <span className="muted small">None expected</span>;
    return (
      <div className="adma-checks">
        <span><strong>{signed}</strong> of {items.length} signed</span>
        <Progress value={percent(signed, items.length)} label={`${signed} of ${items.length} signed`} />
        {missingNames(items) && <span className="cell-sub">{missingNames(items)}</span>}
      </div>
    );
  };
  const matrixRows = matrix.map((m) => ({ ...m, id: m.pkg.id, pkgName: m.pkg.name, coopName: data.cooperatives.find((c) => c.id === m.pkg.coopId)?.name || m.pkg.coopId, text: `${m.pkg.name} ${m.pkg.id}` }));
  const matrixCols = [
    { key: 'pkgName', header: 'Funding package', sortable: true, render: (m) => <div><div className="strong">{m.pkgName}</div><div className="cell-sub">{m.coopName}</div><StatusPill>{m.pkg.status}</StatusPill></div> },
    ...(showCol('A') ? [{ key: 'A', header: 'A: Investors', render: (m) => (m.issued ? progressCell(m.aItems, m.aSigned) : <StatePill state="Not due yet" />) }] : []),
    ...(showCol('B') ? [{ key: 'B', header: 'B: Cooperative', render: (m) => <div className="stack-sm" style={{ gap: 4 }}><StatePill state={m.bItem.state} />{m.bItem.contract && <span className="cell-sub">{m.bItem.contract.version}</span>}</div> }] : []),
    ...(showCol('C') ? [{ key: 'C', header: 'C: Farmers', render: (m) => (m.issued ? progressCell(m.cItems, m.cSigned) : <StatePill state="Not due yet" />) }] : []),
    {
      key: 'overall', header: 'Overall', sortable: true,
      render: (m) => <StatusPill tone={m.overall === 'Complete' ? 'green' : m.overall === 'Expired' ? 'red' : m.overall === 'Incomplete' ? 'amber' : 'gray'}>{m.overall}</StatusPill>,
    },
    {
      key: 'blockers', header: 'Blocked funding steps',
      render: (m) => (m.blockers.length
        ? <ul className="adma-blockers">{m.blockers.map((b) => <li key={b.type}><Lock size={13} aria-hidden="true" />{b.step}</li>)}</ul>
        : <span className="muted small">None</span>),
    },
    { key: 'go', header: '', align: 'right', render: (m) => <Button size="sm" variant="outline" onClick={() => setDetail(m.pkg.id)}><Eye size={14} />Details</Button> },
  ];

  // ----- list -----
  const listCols = [
    { key: 'title', header: 'Agreement', sortable: true, render: (r) => <div><div className="strong">{r.title}</div><div className="cell-sub"><Chip bg="#e7f3ec" fg="#1e3928" border="#d0e7d9">Agreement {r.type}</Chip> {r.contract ? r.contract.id : 'No record'}</div></div> },
    { key: 'pkgName', header: 'Package', sortable: true },
    { key: 'partyName', header: 'Party', sortable: true, render: (r) => <div><div>{r.partyName}</div><div className="cell-sub">{r.partyType}</div></div> },
    { key: 'version', header: 'Version', render: (r) => r.version },
    { key: 'state', header: 'Status', sortable: true, render: (r) => <StatePill state={r.state} /> },
    { key: 'signedAt', header: 'Signed', sortable: true, sortValue: (r) => r.signedAt || '', render: (r) => (r.signedAt ? formatDate(r.signedAt) : <span className="muted">Not signed</span>) },
    {
      key: 'flags', header: 'Flags',
      render: (r) => (
        <div className="stack-sm" style={{ gap: 4 }}>
          {r.state === 'Expired' && <span className="adma-flag adma-flag--expired">Expired</span>}
          {r.state === 'Awaiting Signature' && <span className="adma-flag adma-flag--review">Incomplete</span>}
          {r.state === 'Not on file' && <span className="adma-flag adma-flag--expired">Not on file</span>}
          {r.state === 'Signed' && <span className="muted small">None</span>}
        </div>
      ),
    },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: (r) => (
        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
          {r.contract && <LinkButton to={`/admin/contracts/${r.contract.id}`} variant="outline" size="sm"><Eye size={14} />View</LinkButton>}
          {reminderButton(r)}
        </div>
      ),
    },
  ];

  return (
    <div className="page adma-page">
      <PageHeader
        title="Contract status"
        subtitle="Which agreements are signed for every funding package. Administrators can remind a party but can never sign for them."
      />

      <KpiStrip
        cells={[
          { icon: <FileCheck2 size={18} />, label: 'Signed', value: `${countState('Signed')} of ${allItems.length}`, sub: 'Agreements expected on issued packages' },
          { icon: <FileSignature size={18} />, label: 'Awaiting signature', value: countState('Awaiting Signature'), sub: 'A party still has to sign' },
          { icon: <AlarmClockOff size={18} />, label: 'Expired or not on file', value: countState('Expired') + countState('Not on file'), sub: 'Needs renewing or recording' },
          { icon: <ShieldAlert size={18} />, label: 'Packages with blocked steps', value: blocked, sub: 'A mandatory agreement is missing' },
        ]}
      />

      <Banner tone="info" title="Three agreements, each versioned and never overwritten">
        <strong>A</strong> is signed by each investor, <strong>B</strong> by the cooperative and <strong>C</strong> by every farmer who is allocated support. Funding steps stay blocked while a mandatory agreement is missing. The expected list is built from the investments and allocations recorded in this demo.
      </Banner>

      <Tabs items={[{ id: 'matrix', label: 'Matrix by package' }, { id: 'list', label: 'All agreements', count: list.length }]} value={view} onChange={setView} label="View" auto />

      {view === 'matrix' ? (
        <DataTable
          key="matrix"
          rows={matrixRows}
          columns={matrixCols}
          rowKey="id"
          pageSize={12}
          searchKeys={['text']}
          searchPlaceholder="Search by package"
          totalLabel="packages"
          emptyTitle="No funding packages yet"
          filters={[
            { key: 'id', allLabel: 'All packages', options: data.packages.map((p) => ({ value: p.id, label: p.name })) },
            { key: 'overall', allLabel: 'Any overall status', options: ['Complete', 'Incomplete', 'Expired', 'Not due yet'] },
            { key: 'blocked', allLabel: 'Blocked or not', options: [{ value: 'yes', label: 'Has blocked steps' }, { value: 'no', label: 'No blocked steps' }], match: (m, v) => (v === 'yes' ? m.blockers.length > 0 : m.blockers.length === 0) },
          ]}
          toolbarExtra={<FilterSelect value={typeCol} onChange={setTypeCol} allLabel="All agreement types" options={[{ value: 'A', label: 'A: Investors' }, { value: 'B', label: 'B: Cooperative' }, { value: 'C', label: 'C: Farmers' }]} />}
        />
      ) : (
        <DataTable
          key="list"
          rows={list}
          columns={listCols}
          rowKey="key"
          pageSize={10}
          searchKeys={['text']}
          searchPlaceholder="Search by agreement, package or party"
          totalLabel="agreements"
          emptyTitle="No agreements on file"
          filters={[
            { key: 'type', allLabel: 'All types', options: [{ value: 'A', label: 'A: Investor' }, { value: 'B', label: 'B: Cooperative' }, { value: 'C', label: 'C: Farmer' }] },
            { key: 'state', allLabel: 'All statuses', options: STATE_OPTIONS },
            { key: 'packageId', allLabel: 'All packages', options: data.packages.map((p) => ({ value: p.id, label: p.name })) },
          ]}
        />
      )}

      <Modal
        open={!!detailRow}
        onClose={() => setDetail(null)}
        title={detailRow ? `Agreements: ${detailRow.pkg.name}` : ''}
        wide
        footer={<Button variant="outline" onClick={() => setDetail(null)}>Close</Button>}
      >
        {detailRow && (
          <div className="stack">
            {detailRow.blockers.length > 0 ? (
              <Banner tone="warn" title="Funding steps blocked by missing agreements">
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{detailRow.blockers.map((b) => <li key={b.type}>{b.text}</li>)}</ul>
              </Banner>
            ) : detailRow.issued ? (
              <Banner tone="success">No funding step is blocked by a missing agreement on this package.</Banner>
            ) : (
              <Banner tone="info">Agreements are issued once the package is approved. Nothing is due yet.</Banner>
            )}
            <div className="table-wrap">
              <table className="data-table" style={{ minWidth: 560 }}>
                <thead><tr><th>Agreement</th><th>Party</th><th>Status</th><th>Version</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {[...detailRow.aItems, detailRow.bItem, ...detailRow.cItems].map((it) => (
                    <tr key={`${it.type}-${it.partyId}`}>
                      <td><strong>{AGREEMENT_SHORT[it.type]}</strong><div className="cell-sub">{AGREEMENT_NAMES[it.type]}</div></td>
                      <td>{it.partyName}<div className="cell-sub">{it.partyType}</div></td>
                      <td><StatePill state={it.state} />{it.recordedOnFarmer && <div className="cell-sub">Recorded on the farmer record</div>}</td>
                      <td>{it.contract?.version || '-'}{it.contract?.signedAt && <div className="cell-sub">{formatDateShort(it.contract.signedAt)}</div>}</td>
                      <td>
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                          {it.contract && <LinkButton to={`/admin/contracts/${it.contract.id}`} variant="outline" size="sm">View</LinkButton>}
                          {reminderButton(it)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="caption muted">Need the full agreement text and version history? Open an agreement with View. <Link to="/admin/audit-logs">Reminders are written to the audit log.</Link></p>
          </div>
        )}
      </Modal>
    </div>
  );
}
