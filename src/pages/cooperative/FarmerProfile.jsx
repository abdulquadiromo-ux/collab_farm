import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import {
  Avatar, Banner, Breadcrumb, Button, Card, CardHeader, DataTable, EmptyState, InfoList, LinkButton, PageHeader, PageSkeleton, StatusPill, Tabs,
} from '../../components/ui/index.js';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';
import { formatDate, formatDateShort, formatNaira } from '../../utils/format.js';
import { ReminderModal } from '../../components/coopa/ReminderModal.jsx';
import { RemoveFarmerModal } from '../../components/coopa/RemoveFarmerModal.jsx';
import { AddFarmModal } from '../../components/coopa/AddFarmModal.jsx';
import { maskNin, useCoop } from '../../components/coopa/helpers.js';
import '../../styles/pages/coopa.css';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'farms', label: 'Farms' },
  { id: 'investments', label: 'Investments' },
  { id: 'activity', label: 'Activity and records' },
];

function categoryForFarm(farm) {
  if (farm.farmingCategory || farm.category) return farm.farmingCategory || farm.category;
  const crop = String(farm.crop || '').toLowerCase();
  if (/mixed/.test(crop)) return 'Mixed Farming';
  if (/fish|aqua|catfish|tilapia/.test(crop)) return 'Fishery';
  if (/poultry|chick|broiler|layer/.test(crop)) return 'Poultry';
  if (/livestock|cattle|goat|sheep|graz/.test(crop)) return 'Livestock';
  return crop ? 'Crop Farming' : '-';
}

export default function FarmerProfile() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const { accessToken, data, add } = useApp();
  const { coop } = useCoop();
  const loading = useSimulatedLoad(350);
  const [remoteFarmer, setRemoteFarmer] = useState(null);
  const [remoteFarms, setRemoteFarms] = useState(null);
  const [remoteInvestments, setRemoteInvestments] = useState([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [showNin, setShowNin] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [addingFarm, setAddingFarm] = useState(false);
  const tab = TABS.some((t) => t.id === sp.get('tab')) ? sp.get('tab') : 'overview';
  const farmer = remoteFarmer;
  const farms = remoteFarms || [];

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setProfileLoading(true);
      if (!accessToken) { setProfileError('Your session has expired. Sign in again to view this farmer.'); setProfileLoading(false); return; }
      try {
        const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };
        const [profileResponse, farmsResponse, investmentsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/farmers/${encodeURIComponent(id)}`, { headers, signal: controller.signal }),
          fetch(`${API_BASE_URL}/farmers/${encodeURIComponent(id)}/farms`, { headers, signal: controller.signal }),
          fetch(`${API_BASE_URL}/farmers/${encodeURIComponent(id)}/investments`, { headers, signal: controller.signal }),
        ]);
        const profile = await profileResponse.json().catch(() => null);
        if (!profileResponse.ok) throw new Error(apiErrorMessage(profile, `Could not load farmer (${profileResponse.status}).`));
        const farmPayload = await farmsResponse.json().catch(() => []);
        if (!farmsResponse.ok) throw new Error(apiErrorMessage(farmPayload, `Could not load farms (${farmsResponse.status}).`));
        const investmentPayload = await investmentsResponse.json().catch(() => []);
        if (!investmentsResponse.ok) throw new Error(apiErrorMessage(investmentPayload, `Could not load investments (${investmentsResponse.status}).`));
        const category = profile.farming_category || '';
        const status = String(profile.verification_status || '').toLowerCase();
        setRemoteFarmer({ ...profile, id: profile.id || id, name: profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' '), firstName: profile.first_name, lastName: profile.last_name, phone: profile.phone_number || '-', bankName: profile.bank_name || profile.bankName || '', accountNumber: profile.account_number || profile.accountNumber || '', cropType: category, farmingCategory: category, dob: profile.date_of_birth, experienceYears: profile.years_of_experience, dateAdded: profile.date_added || profile.created_at, status: ['verified', 'approved'].includes(status) ? 'Verified' : status === 'removed' ? 'Removed' : status === 'rejected' ? 'Rejected' : 'Pending' });
        const mappedFarms = (Array.isArray(farmPayload) ? farmPayload : []).map((farm) => ({ ...farm, areaHa: farm.size_in_hectares, farmingCategory: farm.farming_category, status: farm.status === 'ACTIVE' ? 'Active' : 'Inactive', coopId: profile.cooperative_id || coop?.id, farmerId: id }));
        mappedFarms.forEach((farm) => { if (farm.id && !data.farms.some((existing) => existing.id === farm.id)) add('farms', farm); });
        setRemoteFarms(mappedFarms);
        setRemoteInvestments((Array.isArray(investmentPayload) ? investmentPayload : []).map((loan) => ({ ...loan, id: loan.loan_id, loanId: loan.loan_id, amount: Number(loan.loan_amount) || 0, repaymentAmount: Number(loan.repayment_amount) || 0, repaidAmount: 0, loanDate: loan.loan_date || '', dueDate: loan.due_date || '', status: loan.status || 'Pending' })));
        setProfileError('');
      } catch (error) { if (error.name !== 'AbortError') setProfileError(error.message || 'Could not load farmer profile.'); }
      finally { if (!controller.signal.aborted) setProfileLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [accessToken, id, coop, data.farms, add]);

  const rel = { inputs: [], obligations: [], payments: [], loans: remoteInvestments };

  if (loading || profileLoading) return <PageSkeleton />;
  if (!coop) return <div className="page"><EmptyState title="We could not find your cooperative record" action={<LinkButton to="/coop" variant="outline">Back to dashboard</LinkButton>}>Sign in again with a cooperative account.</EmptyState></div>;
  if (profileError && !farmer) return <div className="page"><EmptyState title="Could not load farmer profile" action={<LinkButton to="/coop/farmers" variant="outline">Back to Farmer Directory</LinkButton>}>{profileError}</EmptyState></div>;
  if (!farmer) {
    return <div className="page"><EmptyState title="Farmer not found" action={<LinkButton to="/coop/farmers" variant="outline">Back to Farmer Directory</LinkButton>}>This farmer is not in your cooperative, or the link is out of date.</EmptyState></div>;
  }

  const removed = farmer.status === 'Removed';
  const { inputs, obligations, payments, loans } = rel;
  const totalBorrowed = Number(farmer.performance_summary?.total_amount_borrowed) || loans.reduce((sum, loan) => sum + loan.amount, 0);
  const totalRepaid = Number(farmer.performance_summary?.total_amount_repaid) || loans.reduce((sum, loan) => sum + loan.repaidAmount, 0);
  const repaymentRate = Number(farmer.performance_summary?.repayment_rate) || (totalBorrowed ? (totalRepaid / totalBorrowed) * 100 : 0);

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
            </div>
            <div className="small muted coopa-nin">
              NIN: <span className="nowrap">{showNin ? farmer.nin : maskNin(farmer.nin)}</span>
              <button type="button" className="kebab" aria-label={showNin ? 'Hide NIN' : 'Show NIN'} aria-pressed={showNin} onClick={() => setShowNin((s) => !s)}>{showNin ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
        </div>
        <dl className="coopa-facts">
          <div><dt>Phone number</dt><dd>{farmer.phone}</dd></div>
          <div><dt>Farming category</dt><dd>{farmer.farmingCategory || farmer.cropType || '-'}</dd></div>
          <div><dt>Bank name</dt><dd>{farmer.bankName || '-'}</dd></div>
          <div><dt>Account number</dt><dd>{farmer.accountNumber || '-'}</dd></div>
          <div><dt>Date added</dt><dd>{formatDate(farmer.dateAdded)}</dd></div>
        </dl>
      </Card>

      <div className="grid-main coopa-top">
        <Card className="coopa-tabcard">
          <Tabs items={TABS} value={tab} onChange={(t) => setSp(t === 'overview' ? {} : { tab: t }, { replace: true })} auto label="Farmer sections" />
          <div className="coopa-tabpanel" role="tabpanel">
            {tab === 'overview' && (
              <div className="stack">
                <InfoList compact items={[
                  ['Full name', farmer.name],
                  ['Gender', farmer.gender || '-'],
                  ['Phone number', farmer.phone],
                  ['Email address', farmer.email || '-'],
                  ['Date of birth', farmer.dob ? formatDateShort(farmer.dob) : '-'],
                  ['Farming category', farmer.farmingCategory || farmer.cropType || '-'],
                  ['Bank name', farmer.bankName || '-'],
                  ['Account number', farmer.accountNumber || '-'],
                  ['Years of experience', farmer.experienceYears == null || farmer.experienceYears === '' ? '-' : `${farmer.experienceYears} years`],
                  ['Membership', farmer.membership || '-'],
                  ['Consent to data use', farmer.consent ? 'Recorded' : 'Not recorded'],
                ]}
                />
              </div>
            )}

            {tab === 'farms' && (
              <div className="coopa-farms">
                <div className="coopa-farms__header">
                  <h3 className="coopa-h3">Farms</h3>
                  {!removed && <Button variant="outline-green" onClick={() => setAddingFarm(true)}><Plus size={17} />Add Farm</Button>}
                </div>
                <DataTable
                  bare hideFooter pageSize={50} rows={farms} emptyTitle="No farms registered yet"
                  columns={[
                    { key: 'name', header: 'Farm', render: (f) => <Link to={`/coop/farms/${f.id}`} className="coopa-farm-name"><img src="/images/hero-farm.jpg" alt="" />{f.name}</Link> },
                    { key: 'areaHa', header: 'Size', render: (f) => `${f.areaHa} ha` },
                    { key: 'location', header: 'Location' },
                    { key: 'category', header: 'Farming category', render: categoryForFarm },
                    { key: 'status', header: 'Status', render: (f) => <StatusPill tone={f.status === 'Active' ? 'green' : 'gray'}>{f.status}</StatusPill> },
                  ]}
                />
              </div>
            )}

            {tab === 'investments' && (
              <div className="coopa-loans">
                <div className="coopa-farms__header">
                  <h3 className="coopa-h3">Loan History</h3>
                  <LinkButton to="/coop/settlements?tab=obligations" variant="outline-green" size="sm">View All Loans</LinkButton>
                </div>
                <DataTable
                  bare hideFooter pageSize={50} rows={loans} emptyTitle="No loan history recorded"
                  columns={[
                    { key: 'loanId', header: 'Loan ID', render: (loan) => <span className="coopa-loan-id">{loan.loanId}</span> },
                    { key: 'amount', header: 'Loan Amount', render: (loan) => formatNaira(loan.amount) },
                    { key: 'repaymentAmount', header: 'Repayment Amount', render: (loan) => formatNaira(loan.repaymentAmount) },
                    { key: 'loanDate', header: 'Loan Date', render: (loan) => loan.loanDate ? formatDateShort(loan.loanDate) : '-' },
                    { key: 'dueDate', header: 'Due Date', render: (loan) => loan.dueDate ? formatDateShort(loan.dueDate) : '-' },
                    { key: 'status', header: 'Status', render: (loan) => <StatusPill tone={loan.status === 'Repaid' ? 'blue' : loan.status === 'Overdue' ? 'red' : loan.status === 'Pending' ? 'amber' : 'green'}>{loan.status}</StatusPill> },
                  ]}
                />
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

          </div>
        </Card>

        <Card className="coopa-summary coopa-performance">
          <CardHeader title="Performance Summary" />
          <div className="coopa-stats">
            <div><span>Total Loans Taken</span><strong>{loans.length}</strong></div>
            <div><span>Total Amount Borrowed</span><strong>{formatNaira(totalBorrowed)}</strong></div>
            <div><span>Total Amount Repaid</span><strong>{formatNaira(totalRepaid)}</strong></div>
            <div><span>Repayment Rate</span><strong>{repaymentRate.toFixed(1)}%</strong></div>
          </div>
          <LinkButton to="/coop/reports" variant="outline" block>View Full Performance Report</LinkButton>
        </Card>
      </div>

      <ReminderModal open={reminding} farmer={farmer} coop={coop} onClose={() => setReminding(false)} />
      <RemoveFarmerModal open={removing} farmer={farmer} onClose={() => { setRemoving(false); }} />
      <AddFarmModal open={addingFarm} onClose={() => setAddingFarm(false)} farmerId={farmer.id} farms={farms} onAdded={(farm) => { const record = { ...farm, coopId: farmer.cooperative_id || coop?.id, farmerId: farmer.id, status: 'Active' }; setRemoteFarms((current) => [record, ...(current || [])]); if (record.id && !data.farms.some((existing) => existing.id === record.id)) add('farms', record); setSp({ tab: 'farms' }, { replace: true }); }} />
    </div>
  );
}
