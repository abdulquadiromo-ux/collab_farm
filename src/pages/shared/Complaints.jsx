import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquarePlus, ShieldCheck } from 'lucide-react';
import '../../styles/pages/shr.css';
import { useApp } from '../../context/AppContext.jsx';
import { Banner, DataTable, FilterSelect, LinkButton, PageHeader, PageSkeleton, StatusPill, SearchInput, Pagination, EmptyState, Button } from '../../components/ui/index.js';
import { baseFor, ageInDays, roleLabel } from '../../components/shr/shrUtils.js';
import { formatDateShort, cx } from '../../utils/format.js';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';

const PAGE_SIZE = 20;
const STATUSES = ['OPEN', 'UNDER_REVIEW', 'AWAITING_RESPONSE', 'RESOLVED', 'ESCALATED'];
const CATEGORIES = ['PACKAGE', 'INVESTMENT', 'PAYMENT', 'DELIVERY', 'FARMER', 'OTHER'];
const display = (value) => String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const apiStatus = (value) => String(value || '').toUpperCase().replaceAll(' ', '_');

function mapComplaint(item = {}) {
  return {
    ...item,
    id: item.id,
    ref: item.reference || item.ref || item.id,
    subject: item.subject || 'Complaint',
    description: item.description || '',
    category: display(item.category),
    categoryValue: apiStatus(item.category),
    packageId: item.package_id || item.package?.id || '',
    packageTitle: item.package_title || item.package?.title || '',
    submittedBy: item.raised_by_name || item.submitted_by_name || '—',
    role: String(item.raised_by_role || item.role || '').toLowerCase(),
    status: display(item.status),
    statusValue: apiStatus(item.status),
    assignee: item.reviewer_name || 'Unassigned',
    createdAt: item.created_at || item.createdAt || '',
    updatedAt: item.updated_at || item.updatedAt || item.created_at || '',
  };
}

function categoryOption(item) {
  if (typeof item === 'string') return { value: apiStatus(item), label: display(item) };
  const value = item?.value || item?.key || item?.name || item?.category || item?.code;
  return value ? { value: apiStatus(value), label: item.label || item.title || display(value) } : null;
}

const SUB = {
  cooperative: 'Complaints raised by your organisation and members, and complaints about your packages.',
  investor: 'Questions, disputes and complaints you have raised. Only you and the reviewers can see them.',
  admin: 'Triage, assign and resolve complaints from every role.',
  farmer: 'Track complaints and responses from your cooperative and CollabFarm reviewers.',
};

export default function Complaints() {
  const { accessToken, role } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const base = baseFor(role);
  const isAdmin = role === 'admin';
  const status = params.get('status') || '';
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState(CATEGORIES.map((value) => ({ value, label: display(value) })));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => { const timer = setTimeout(() => { setPage(1); setSearchQuery(search.trim()); }, 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { setPage(1); }, [category, status]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError('');
      if (!accessToken) { setError('Your session has expired. Sign in again to view complaints.'); setLoading(false); return; }
      const query = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (searchQuery) query.set('search', searchQuery);
      if (category) query.set('category', category);
      if (status) query.set('status', status);
      try {
        const response = await fetch(`${API_BASE_URL}/complaints?${query}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not load complaints (${response.status}).`));
        setRows((Array.isArray(payload?.items) ? payload.items : []).map(mapComplaint));
        setTotal(Number(payload?.total) || 0);
        setSummary(payload || {});
      } catch (loadError) { if (loadError.name !== 'AbortError') { setRows([]); setTotal(0); setError(loadError.message || 'Could not load complaints.'); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    load(); return () => controller.abort();
  }, [accessToken, page, searchQuery, category, status, reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    if (!accessToken) return () => controller.abort();
    fetch(`${API_BASE_URL}/complaints/categories`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal })
      .then(async (response) => { const payload = await response.json().catch(() => null); if (!response.ok) throw new Error('Categories unavailable'); return payload; })
      .then((payload) => { const options = Array.isArray(payload) ? payload.map(categoryOption).filter(Boolean) : []; if (options.length) setCategories(options); })
      .catch(() => {})
      .finally(() => {});
    return () => controller.abort();
  }, [accessToken]);

  const setStatus = (value) => {
    const next = new URLSearchParams(params);
    const normalized = apiStatus(value);
    if (normalized && normalized !== status) next.set('status', normalized); else next.delete('status');
    setParams(next, { replace: true });
  };

  const counts = useMemo(() => ({
    Open: Number(summary.open_count) || 0,
    'Under Review': Number(summary.under_review_count) || 0,
    'Awaiting Response': Number(summary.awaiting_response_count) || 0,
    Resolved: Number(summary.resolved_count) || 0,
    Escalated: Number(summary.escalated_count) || 0,
  }), [summary]);

  const columns = [
    { key: 'ref', header: 'Reference', render: (row) => <div><Link to={`${base}/complaints/${row.id}`} className="strong" onClick={(event) => event.stopPropagation()}>{row.ref}</Link><div className="cell-sub shr-clamp">{row.subject}</div></div> },
    { key: 'category', header: 'Category', className: 'nowrap' },
    { key: 'packageTitle', header: 'Package', render: (row) => <span className="shr-clamp">{row.packageTitle || 'Not package specific'}</span> },
    { key: 'submittedBy', header: 'Raised by', render: (row) => <div><div>{row.submittedBy}</div><div className="cell-sub">{roleLabel(row.role)}</div></div> },
    { key: 'status', header: 'Status', render: (row) => <StatusPill>{row.status}</StatusPill> },
    ...(isAdmin ? [{ key: 'assignee', header: 'Assignee', className: 'nowrap', render: (row) => row.assignee === 'Unassigned' ? <span className="danger-text strong">Unassigned</span> : row.assignee }, { key: 'age', header: 'Age', className: 'nowrap', render: (row) => { const days = ageInDays(row.createdAt); return <span className={cx(row.status !== 'Resolved' && days > 7 && 'danger-text strong')}>{days} day{days === 1 ? '' : 's'}</span>; } }] : []),
    { key: 'createdAt', header: 'Raised', className: 'nowrap', render: (row) => formatDateShort(row.createdAt) },
    { key: 'view', header: '', align: 'right', render: (row) => <LinkButton to={`${base}/complaints/${row.id}`} variant="outline" size="sm" onClick={(event) => event.stopPropagation()}>View</LinkButton> },
  ];

  if (loading && !rows.length) return <PageSkeleton />;
  return <div className="page shr-page">
    <PageHeader title="Complaints" subtitle={SUB[role] || SUB.cooperative} actions={<LinkButton to={`${base}/complaints/new`}><MessageSquarePlus size={18} />Raise a complaint</LinkButton>} />
    <Banner tone="green" title="A complaint is a request for review, not an accusation">Every complaint gets a reference, a reviewer and a visible status. It is seen only by the people involved and CollabFarm reviewers. A complaint never causes a public accusation or an automatic penalty.</Banner>
    <div className="shr-status-strip" role="group" aria-label="Complaints by status">
      {Object.entries(counts).map(([name, count]) => <button key={name} type="button" className="shr-stat" aria-pressed={apiStatus(name) === status} onClick={() => setStatus(name)}><span className="shr-stat__label">{name}</span><span className="shr-stat__value">{count}</span><span className="caption muted">{apiStatus(name) === status ? 'Showing. Click to clear' : 'Click to filter'}</span></button>)}
    </div>
    {error ? <EmptyState title="Complaints unavailable" action={<Button onClick={() => setReloadKey((key) => key + 1)}>Try again</Button>}>{error}</EmptyState> : <div className="coopb-inv-table">
      <div className="table-toolbar"><div className="row-wrap grow"><SearchInput value={search} onChange={setSearch} placeholder="Search by reference, subject or name" /></div><div className="table-toolbar__filters">
        <FilterSelect value={category} onChange={setCategory} allLabel="All categories" options={categories} />
        <FilterSelect value={status} onChange={setStatus} allLabel="All statuses" options={STATUSES.map((value) => ({ value, label: display(value) }))} />
      </div></div>
      <DataTable columns={columns} rows={rows} loading={loading} bare hideFooter pageSize={PAGE_SIZE} onRowClick={(row) => navigate(`${base}/complaints/${row.id}`)} emptyTitle="No complaints yet" emptyText="When you raise a complaint, or one is raised about your packages, it will be listed here." emptyAction={<LinkButton to={`${base}/complaints/new`} variant="outline-green"><ShieldCheck size={16} />Raise a complaint</LinkButton>} />
      {!loading && total > 0 && <div className="pagination-bar"><span className="muted">Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)} of {total} complaints</span><Pagination page={page} pages={pages} onPage={setPage} /></div>}
    </div>}
  </div>;
}
