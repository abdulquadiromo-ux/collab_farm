import { useMemo, useState } from 'react';
import { Users, UserCheck, PauseCircle, MailPlus, UserPlus, KeyRound, ChevronDown, ChevronUp, Ban, Check, Minus, Shield, PlayCircle, Send } from 'lucide-react';
import { useApp, useSimulatedLoad, simulate, newId } from '../../context/AppContext.jsx';
import { PageHeader, PageSkeleton, DataTable, StatusPill, Avatar, Banner, KpiStrip, Button, Card, ConfirmDialog, Modal, TextField, SelectField, KebabMenu } from '../../components/ui/index.js';
import { formatDateTime } from '../../utils/format.js';
import { adminFunctionOf, ADMIN_FUNCTIONS, sampleLastSignIn, lc, ROLE_LABEL, PARTY_ROLE, nowIso } from '../../components/adma/helpers.js';
import { ReasonDialog } from '../../components/adma/Dialogs.jsx';
import '../../styles/pages/adma.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maskEmail = (e = '') => {
  const [a, d] = e.split('@');
  return d ? `${a.slice(0, 1)}${'*'.repeat(Math.max(2, a.length - 1))}@${d}` : e;
};

const MATRIX = [
  ['Register and complete verification', 'Yes', 'Yes', 'Yes', 'Invited by an administrator'],
  ['Submit projects and funding applications', 'No', 'Yes', 'No', 'No'],
  ['Approve or reject funding applications', 'No', 'No', 'No', 'Yes, project reviewer'],
  ['Change an approved budget', 'No', 'Propose only', 'No', 'Material change needs two reviewers'],
  ['Commit funds through the approved process', 'No', 'No', 'Yes', 'No'],
  ['Add and manage farmers', 'No', 'Yes', 'No', 'Verify identity only'],
  ['See farmer ID and phone details', 'Own record', 'Own farmers', 'No, privacy-preserving view', 'ID shows last 3 digits'],
  ['Submit milestone evidence and reports', 'Progress evidence', 'Yes', 'No', 'No'],
  ['Approve milestone completion', 'No', 'No', 'No', 'Yes, milestone reviewer'],
  ['Authorise a disbursement', 'No', 'No', 'No', 'Yes, payment approver. Two people above the limit'],
  ['Confirm receipts and reconcile with the partner', 'No', 'No', 'No', 'Yes, reconciliation officer'],
  ['Record harvest and sales', 'No', 'Yes', 'No', 'Approve harvest'],
  ['See repayments or distributions', 'Own obligations', 'Own projects', 'Own investments', 'All'],
  ['Raise a complaint or dispute', 'Yes', 'Yes', 'Yes', 'Triage and respond'],
  ['Mark a payment successful without partner confirmation', 'No', 'No', 'No', 'No'],
  ['Edit or delete audit history', 'No', 'No', 'No', 'No'],
];

function Cell({ v }) {
  if (v === 'Yes') return <span className="adma-perm adma-perm--yes"><Check size={14} aria-hidden="true" />Yes</span>;
  if (v === 'No') return <span className="adma-perm adma-perm--no"><Minus size={14} aria-hidden="true" />No</span>;
  return <span className="adma-perm adma-perm--part">{v}</span>;
}

export default function UserManagement() {
  const { data, user, update, add, audit, notify, toast } = useApp();
  const loading = useSimulatedLoad(350);
  const [action, setAction] = useState(null); // { type: 'suspend'|'reactivate'|'reset'|'role'|'resend', row }
  const [invite, setInvite] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', fn: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const out = [];
    const emails = new Set();
    const orgOf = (u) => {
      if (u.role === 'admin') return 'CollabFarm administration';
      if (u.role === 'investor') return data.investors.find((i) => i.id === u.orgId)?.org || '-';
      return data.cooperatives.find((c) => c.id === u.orgId)?.name || '-';
    };
    data.users.forEach((u) => {
      emails.add(lc(u.email));
      out.push({ key: `user:${u.id}`, kind: 'user', id: u.id, name: u.name, email: u.email, role: u.role, org: orgOf(u), fn: u.role === 'admin' ? adminFunctionOf(u) : null, status: u.status || 'Active', lastSignIn: u.status === 'Invited' ? null : sampleLastSignIn(u.id), rec: u });
    });
    data.investors.forEach((i) => {
      if (emails.has(lc(i.email))) return;
      emails.add(lc(i.email));
      out.push({ key: `inv:${i.id}`, kind: 'investor', id: i.id, name: i.name, email: i.email, role: 'investor', org: i.org, fn: null, status: i.status === 'Verified' ? 'Active' : i.status, lastSignIn: sampleLastSignIn(i.id), rec: i });
    });
    data.cooperatives.forEach((c) => {
      if (data.users.some((u) => u.role === 'cooperative' && u.orgId === c.id)) return;
      const rep = c.representatives?.[0];
      out.push({ key: `coop:${c.id}`, kind: 'cooperative', id: c.id, name: rep?.name || c.name, email: c.email, role: 'cooperative', org: c.name, fn: null, status: c.status === 'Verified' ? 'Active' : c.status, lastSignIn: sampleLastSignIn(c.id), rec: c });
    });
    return out.map((r) => ({ ...r, text: `${r.name} ${r.email} ${r.org} ${r.fn || ''}` }));
  }, [data.users, data.investors, data.cooperatives]);

  if (loading) return <PageSkeleton />;

  const activeCount = rows.filter((r) => r.status === 'Active').length;
  const statusOptions = [...new Set(rows.map((r) => r.status))].sort();
  const row = action?.row;

  const changeStatus = async (r, next, reason) => {
    await simulate(500);
    const prev = r.status;
    const entry = { action: next === 'Suspended' ? 'User suspended' : 'User reactivated', entityType: 'User', entityId: r.id, summary: `${r.name} (${ROLE_LABEL[r.role]}): ${prev} to ${next}`, reason };
    if (r.kind === 'user') {
      update('users', r.id, next === 'Suspended' ? { status: 'Suspended', suspendedReason: reason } : { status: 'Active', reactivatedReason: reason }, entry);
    } else {
      const coll = r.kind === 'investor' ? 'investors' : 'cooperatives';
      update(coll, r.id, next === 'Suspended' ? { status: 'Suspended', statusBeforeSuspension: r.rec.status, suspendedReason: reason } : { status: r.rec.statusBeforeSuspension || 'Verified', reactivatedReason: reason }, entry);
    }
    notify(PARTY_ROLE[r.role] || 'admin', next === 'Suspended' ? 'Account suspended' : 'Account reactivated',
      next === 'Suspended' ? `Account update for ${r.name}: your account is suspended. Reason: ${reason}` : `Account update for ${r.name}: your account is active again.`, r.role === 'admin' ? '/admin/users' : '/onboarding/status', 'verification');
    toast(`${r.name} ${next === 'Suspended' ? 'suspended' : 'reactivated'}.`);
    setAction(null);
  };

  const resetAccess = async (r) => {
    setBusy(true);
    await simulate(600);
    audit({ action: r.status === 'Invited' ? 'Invitation resent' : 'Access reset requested', entityType: 'User', entityId: r.id, summary: `${r.name} (${ROLE_LABEL[r.role]}): ${r.status === 'Invited' ? 'invitation' : 'access reset link'} sent to ${maskEmail(r.email)} (simulated)`, reason: 'Administrator request' });
    toast(`${r.status === 'Invited' ? 'Invitation resent' : 'Access reset sent'} to ${maskEmail(r.email)} (simulated, nothing leaves this browser).`, 'info');
    setBusy(false);
    setAction(null);
  };

  const openInvite = () => { setForm({ name: '', email: '', fn: '' }); setErrors({}); setInvite(true); };
  const submitInvite = async (e) => {
    e.preventDefault();
    const er = {};
    const name = form.name.trim();
    const email = form.email.trim();
    if (name.length < 3 || !name.includes(' ')) er.name = 'Enter the first and last name.';
    if (!EMAIL_RE.test(email)) er.email = 'Enter a valid work email, for example name@company.example.';
    else if (data.users.some((u) => lc(u.email) === lc(email)) || data.investors.some((i) => lc(i.email) === lc(email))) er.email = 'This email already belongs to an account.';
    if (!form.fn) er.fn = 'Choose the administrator function. Each person holds one function.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setSaving(true);
    await simulate(700);
    const rec = add('users', {
      id: newId('u'), role: 'admin', name, firstName: name.split(' ')[0], email, phone: '', orgId: null, title: `Platform Administrator (${form.fn})`,
      adminFunction: form.fn, status: 'Invited', invitedBy: user.name, invitedAt: nowIso(),
    }, { action: 'Administrator invited', entityType: 'User', summary: `${name} invited as ${form.fn}. Status Invited until they accept`, reason: 'New administrator function' });
    notify('admin', 'Administrator invited', `${name} was invited as ${form.fn} by ${user.name}.`, '/admin/users', 'info');
    toast(`Invitation sent to ${maskEmail(email)} (simulated).`);
    setSaving(false);
    setInvite(false);
    return rec;
  };

  const fnInfo = ADMIN_FUNCTIONS.find((f) => f.id === form.fn);

  const columns = [
    {
      key: 'name', header: 'Person', sortable: true,
      render: (r) => (
        <div className="cell-person">
          <Avatar name={r.name} />
          <div>
            <div>{r.name}{r.id === user.id && <span className="adma-you"> (you)</span>}</div>
            <div className="cell-sub" style={{ fontWeight: 400 }}>{r.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', sortable: true, render: (r) => <div><span className="adma-role">{ROLE_LABEL[r.role]}</span>{r.fn && <div className="cell-sub">{r.fn}</div>}</div> },
    { key: 'org', header: 'Organisation', sortable: true },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <StatusPill>{r.status}</StatusPill> },
    { key: 'lastSignIn', header: 'Last sign in (sample)', sortable: true, sortValue: (r) => r.lastSignIn || '', render: (r) => (r.lastSignIn ? formatDateTime(r.lastSignIn) : <span className="muted">Not yet</span>) },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: (r) => {
        const self = r.id === user.id;
        const items = [];
        if (r.status === 'Active' && !self) items.push({ label: 'Suspend', icon: <PauseCircle size={16} />, danger: true, onClick: () => setAction({ type: 'suspend', row: r }) });
        if (r.status === 'Suspended') items.push({ label: 'Reactivate', icon: <PlayCircle size={16} />, onClick: () => setAction({ type: 'reactivate', row: r }) });
        if (r.status === 'Invited') items.push({ label: 'Resend invitation', icon: <Send size={16} />, onClick: () => setAction({ type: 'resend', row: r }) });
        else if (!self) items.push({ label: 'Reset access', icon: <KeyRound size={16} />, onClick: () => setAction({ type: 'reset', row: r }) });
        items.push({ label: 'Change role', icon: <Ban size={16} />, onClick: () => setAction({ type: 'role', row: r }) });
        return <KebabMenu label={`Actions for ${r.name}`} items={items} />;
      },
    },
  ];

  return (
    <div className="page adma-page">
      <PageHeader
        title="User management"
        subtitle="Everyone who can sign in or is registered on the platform. Suspend, restore access, or invite another administrator."
        actions={<Button onClick={openInvite}><UserPlus size={16} />Invite administrator</Button>}
      />

      <KpiStrip
        cells={[
          { icon: <Users size={18} />, label: 'People listed', value: rows.length, sub: 'Sign-in accounts and registered organisations' },
          { icon: <UserCheck size={18} />, label: 'Active', value: activeCount, sub: 'Can sign in and act' },
          { icon: <PauseCircle size={18} />, label: 'Suspended', value: rows.filter((r) => r.status === 'Suspended').length, sub: 'Blocked until reactivated' },
          { icon: <MailPlus size={18} />, label: 'Invitations pending', value: rows.filter((r) => r.status === 'Invited').length, sub: 'Waiting to be accepted' },
        ]}
      />

      <Banner tone="info" title="Roles cannot be changed here">
        A person&apos;s role is fixed when they register. Roles keep duties apart, so the people who propose, approve and pay are never the same. Changing a role would break that separation and the audit trail. To move someone to a different role, suspend the account and ask them to register again as the right role. Farmers appear here once they have activated an account; farmer records live in Farmers and farms.
      </Banner>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey="key"
        pageSize={10}
        searchKeys={['text']}
        searchPlaceholder="Search by name, email or organisation"
        totalLabel="people"
        emptyTitle="No users yet"
        filters={[
          { key: 'role', allLabel: 'All roles', options: [{ value: 'admin', label: 'Administrator' }, { value: 'cooperative', label: 'Cooperative' }, { value: 'investor', label: 'Investor' }, { value: 'farmer', label: 'Farmer' }] },
          { key: 'status', allLabel: 'All statuses', options: statusOptions },
        ]}
      />

      <Card>
        <button type="button" className="adma-collapse" aria-expanded={refOpen} aria-controls="adma-perm-ref" onClick={() => setRefOpen((o) => !o)}>
          <span><Shield size={18} aria-hidden="true" /> <strong>Role and permission reference</strong><span className="small muted" style={{ display: 'block' }}>What each role can and cannot do, taken from the product requirements.</span></span>
          {refOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {refOpen && (
          <div id="adma-perm-ref" className="stack" style={{ marginTop: 16 }}>
            <div className="table-wrap">
              <table className="data-table adma-matrix" style={{ minWidth: 820 }}>
                <caption className="sr-only">Role and permission matrix</caption>
                <thead><tr><th scope="col">What</th><th scope="col">Farmer</th><th scope="col">Cooperative</th><th scope="col">Investor</th><th scope="col">Administrator</th></tr></thead>
                <tbody>
                  {MATRIX.map((m) => (
                    <tr key={m[0]}>
                      <th scope="row" className="adma-matrix__row">{m[0]}</th>
                      {m.slice(1).map((v, i) => <td key={i}><Cell v={v} /></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="adma-minor">Administrator functions</h3>
              <p className="small muted">Each administrator holds one function so that nobody proposes, approves and pays alone.</p>
              <ul className="adma-fnlist">
                {ADMIN_FUNCTIONS.map((f) => <li key={f.id}><strong>{f.id}</strong><span className="small muted">{f.can}</span></li>)}
              </ul>
            </div>
          </div>
        )}
      </Card>

      {/* Suspend / reactivate */}
      <ReasonDialog
        open={action?.type === 'suspend'}
        onClose={() => setAction(null)}
        onConfirm={(t) => changeStatus(row, 'Suspended', t)}
        title={row ? `Suspend ${row.name}?` : ''}
        message="Suspension blocks sign in and new activity. It is not a finding of wrongdoing, and no financial record is deleted."
        summary={row ? [['Person', row.name], ['Role', ROLE_LABEL[row.role]], ['Organisation', row.org]] : null}
        label="Reason for suspension"
        placeholder="Write the facts that led to this, for the audit log."
        confirmLabel="Suspend"
      />
      <ReasonDialog
        open={action?.type === 'reactivate'}
        onClose={() => setAction(null)}
        onConfirm={(t) => changeStatus(row, 'Active', t)}
        tone="green"
        title={row ? `Reactivate ${row.name}?` : ''}
        message="The person can sign in again and is notified."
        summary={row ? [['Person', row.name], ['Role', ROLE_LABEL[row.role]], ['Suspended for', row.rec.suspendedReason || '-']] : null}
        label="Reason for reactivation"
        placeholder="For example: documents corrected and checked."
        confirmLabel="Reactivate"
      />

      {/* Reset access / resend invitation */}
      <ConfirmDialog
        open={action?.type === 'reset' || action?.type === 'resend'}
        onClose={() => setAction(null)}
        onConfirm={() => resetAccess(row)}
        loading={busy}
        tone="green"
        icon={KeyRound}
        title={row ? (action.type === 'resend' ? `Resend the invitation to ${row.name}?` : `Reset access for ${row.name}?`) : ''}
        message={row ? (action.type === 'resend' ? 'A fresh invitation link would be sent. This is simulated in the demo.' : 'In a live system a secure link would be sent so the person can set a new password and sign out of other devices. Nothing is sent from this demo.') : ''}
        summary={row ? [['Person', row.name], ['Sent to', maskEmail(row.email)], ['Role', ROLE_LABEL[row.role]]] : null}
        confirmLabel={action?.type === 'resend' ? 'Resend invitation' : 'Reset access'}
      />

      {/* Change role: explanation only */}
      <Modal open={action?.type === 'role'} onClose={() => setAction(null)} title="Changing a role is not allowed" footer={<Button onClick={() => setAction(null)}>I understand</Button>}>
        <div className="stack small">
          <p>{row ? `${row.name} is registered as ${ROLE_LABEL[row.role].toLowerCase()}${row.fn ? ` (${row.fn.toLowerCase()})` : ''}.` : ''} A role is set once, at registration.</p>
          <p>The roles separate duties. If an administrator could turn a cooperative user into a payment approver, one person could propose, approve and pay. History in the audit log would also stop matching the person&apos;s role at the time.</p>
          <p><strong>What to do instead:</strong> suspend this account and ask the person to register again with the correct role, or invite a new administrator with the function you need.</p>
        </div>
      </Modal>

      {/* Invite administrator */}
      <Modal
        open={invite}
        onClose={() => !saving && setInvite(false)}
        title="Invite administrator"
        footer={(
          <>
            <Button variant="outline" onClick={() => setInvite(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="adma-invite-form" loading={saving}><MailPlus size={16} />Send invitation</Button>
          </>
        )}
      >
        <form id="adma-invite-form" onSubmit={submitInvite} noValidate className="stack">
          <p className="small muted">The new administrator is added with the status Invited. They cannot act until they accept. Invitations are simulated in this demo.</p>
          <TextField label="Full name" required value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: '' }); }} error={errors.name} placeholder="First and last name" autoComplete="off" />
          <TextField label="Work email" required type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: '' }); }} error={errors.email} placeholder="name@company.example" autoComplete="off" />
          <SelectField label="Administrator function" required value={form.fn} onChange={(e) => { setForm({ ...form, fn: e.target.value }); setErrors({ ...errors, fn: '' }); }} error={errors.fn} placeholder="Choose a function" options={ADMIN_FUNCTIONS.map((f) => f.id)} hint={fnInfo ? undefined : 'One function per administrator keeps duties apart.'} />
          {fnInfo && <div className="banner banner--green"><Shield size={18} /><div>{fnInfo.can}</div></div>}
        </form>
      </Modal>
    </div>
  );
}
