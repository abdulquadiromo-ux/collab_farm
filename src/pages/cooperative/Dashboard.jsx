import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Landmark, PackageCheck, Printer, ShieldCheck, Users, Banknote, Circle } from 'lucide-react';
import {
  Avatar, Button, Card, CardHeader, DataTable, EmptyState, KpiCard, LinkButton, PageHeader, PageSkeleton, StatusPill,
} from '../../components/ui/index.js';
import { BarChart, DonutChart } from '../../components/charts/Charts.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate, formatNaira, formatNumber, formatTime } from '../../utils/format.js';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';
import { downloadCsv, toCsv, timeOfDay } from '../../components/coopa/helpers.js';
import '../../styles/pages/coopa.css';

export default function Dashboard() {
  const { accessToken, user, signOut } = useApp();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState('6m');
  const [reloadKey, setReloadKey] = useState(0);
  const [directoryFarmers, setDirectoryFarmers] = useState(null);

  useEffect(() => {
    if (!accessToken) {
      setError('Your session has expired. Sign in again to load your dashboard.');
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`${API_BASE_URL}/dashboard/overview`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, `Dashboard request failed (${response.status}).`));
        setOverview(payload || {});
      })
      .catch((cause) => {
        if (cause.name !== 'AbortError') setError(cause.message || 'Could not load your dashboard. Please try again.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, reloadKey]);

  useEffect(() => {
    if (!accessToken) { setDirectoryFarmers([]); return undefined; }
    const controller = new AbortController();
    const loadRecent = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/farmers/directory?page=1&page_size=5`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error('Could not load recent farmers.');
        setDirectoryFarmers((Array.isArray(payload?.items) ? payload.items : []).map((item, index) => ({
          id: item?.id || item?.farmer_id || `directory-${index}`,
          name: item?.full_name || [item?.first_name, item?.last_name].filter(Boolean).join(' ') || item?.name || 'Farmer',
          cropType: item?.farming_category || item?.crop_type || item?.crop || '—',
          dateAdded: item?.date_added || '',
          status: item?.verification_status || item?.status || '—',
          profileId: item?.id || item?.farmer_id,
        })));
      } catch (cause) { if (cause.name !== 'AbortError') setDirectoryFarmers(null); }
    };
    loadRecent();
    return () => controller.abort();
  }, [accessToken, reloadKey]);

  const kpis = overview?.kpis || {};
  const totalFarmers = metricValue(kpis.total_farmers, 'count');
  const verifiedFarmers = metricValue(kpis.verified_farmers, 'count');
  const packagesCreated = metricValue(kpis.total_packages_created, 'count');
  const fundingReceived = metricValue(kpis.total_funding_received, 'money');

  const roiRows = useMemo(() => {
    const source = Array.isArray(overview?.accumulative_roi) ? overview.accumulative_roi : [];
    const rows = source.map((item, index) => {
      const value = numericValue(item?.roi_percentage ?? item?.percentage ?? item?.roi ?? item?.value ?? item?.amount);
      return {
        label: String(item?.label || item?.month || item?.period || item?.date || `Period ${index + 1}`),
        value: value === null ? null : Math.min(100, Math.max(0, value)),
        tone: item?.tone === 'gold' ? 'gold' : 'green',
      };
    }).filter((item) => item.value !== null);
    return rows.slice(range === '6m' ? -6 : -12);
  }, [overview, range]);

  const categoryRows = useMemo(() => {
    const source = Array.isArray(overview?.farmers_by_farming_category) ? overview.farmers_by_farming_category : [];
    const rows = source.map((item) => ({
      label: String(item?.category || item?.farming_category || item?.farmingCategory || item?.name || 'Other'),
      value: numericValue(item?.count ?? item?.total ?? item?.value ?? item?.farmers) ?? 0,
    })).filter((item) => item.value > 0);
    const total = rows.reduce((sum, item) => sum + item.value, 0);
    return rows.map((item) => ({ ...item, display: `${formatNumber(item.value)} (${total ? Math.round((item.value / total) * 1000) / 10 : 0}%)` }));
  }, [overview]);

  const recentFarmers = useMemo(() => {
    if (directoryFarmers !== null) return directoryFarmers;
    const source = Array.isArray(overview?.recent_farmers) ? overview.recent_farmers : [];
    return source.map((item, index) => ({
      id: item?.id || item?.farmer_id || `recent-${index}`,
      name: item?.name || item?.farmer_name || item?.full_name || 'Farmer',
      cropType: item?.crop_type || item?.farming_category || item?.farmingCategory || item?.crop || '—',
      dateAdded: item?.date_added || item?.created_at || item?.createdAt || item?.date || '',
      status: item?.status || '—',
      profileId: item?.id || item?.farmer_id,
    }));
  }, [overview, directoryFarmers]);

  const investmentSummary = overview?.investment_summary || {};
  const investmentRows = [
    ['Active', countValue(investmentSummary.active), '#17b26a'],
    ['Pending', countValue(investmentSummary.pending), '#f79009'],
    ['Repaid', countValue(investmentSummary.repaid), '#2970ff'],
    ['Overdue', countValue(investmentSummary.overdue), '#d92d20'],
  ];
  const investmentTotal = investmentRows.reduce((sum, [, count]) => sum + count, 0);
  const first = overview?.greeting_name || user?.firstName || user?.name?.split(' ')[0] || 'there';

  const exportReport = () => {
    downloadCsv('cooperative-summary.csv', toCsv([
      ['Cooperative', overview?.cooperative_name || ''], ['Report date', formatDate(new Date())], [],
      ['Measure', 'Value'],
      ['Total farmers', numericValue(kpis.total_farmers) ?? ''],
      ['Verified farmers', numericValue(kpis.verified_farmers) ?? ''],
      ['Total packages created', numericValue(kpis.total_packages_created) ?? ''],
      ['Total farm area', metricRaw(kpis.total_farm_area) ?? ''],
      ['Funding received (NGN)', numericValue(kpis.total_funding_received) ?? ''],
    ]));
  };

  if (loading) return <PageSkeleton />;
  if (error) {
    return (
      <div className="page">
        <EmptyState
          title="Dashboard unavailable"
          action={<Button onClick={() => error.includes('session has expired') ? (signOut(), window.location.assign('/login')) : setReloadKey((key) => key + 1)}>Try again</Button>}
        >
          {error}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="page coopa">
      <PageHeader
        greeting
        title={<>Good {timeOfDay()}, <em>{first}</em></>}
        subtitle={overview?.cooperative_name ? `Overview for ${overview.cooperative_name}.` : 'Monitor your farmers, farms and funding in one place.'}
        actions={<Button variant="outline" onClick={exportReport}><Printer size={18} />Export Report</Button>}
      />

      <div className="kpi-grid">
        <KpiCard icon={<Users size={18} />} label="Total Farmers" value={totalFarmers}>
          <div className="kpi-card__delta">Farmers registered with your cooperative</div>
        </KpiCard>
        <KpiCard icon={<ShieldCheck size={18} />} label="Verified Farmers" value={verifiedFarmers}>
          <div className="kpi-card__delta">Verified by CollabFarm reviewers</div>
        </KpiCard>
        <KpiCard icon={<PackageCheck size={18} />} label="Total Packages Created" value={packagesCreated}>
          <div className="kpi-card__delta">Funding packages created by your cooperative</div>
        </KpiCard>
        <KpiCard icon={<Banknote size={18} />} label="Total Funding Received" value={fundingReceived} tone="gold">
          <div className="kpi-card__delta">Confirmed by the financial partner</div>
        </KpiCard>
      </div>
      <p className="caption muted coopa-note">Funding received is money confirmed by the financial partner. A commitment from an investor is a promise, not received money, so it is not counted here.</p>

      <div className="grid-2 coopa-charts">
        <Card>
          <CardHeader
            title="Accumulative ROI"
            subtitle="Accumulated return on investment over time."
            action={(
              <select className="select select--filter" value={range} onChange={(event) => setRange(event.target.value)} aria-label="ROI range">
                <option value="6m">Last 6 periods</option>
                <option value="12m">Last 12 periods</option>
              </select>
            )}
          />
          {roiRows.length ? <BarChart data={roiRows} height={280} /> : <EmptyState title="No ROI data yet">ROI figures will appear here when available.</EmptyState>}
        </Card>
        <Card>
          <CardHeader title="Farmers by Farming Category" action={<LinkButton to="/coop/farmers" variant="outline" size="sm">View All Farmers</LinkButton>} />
          {categoryRows.length ? (
            <DonutChart data={categoryRows} total={formatNumber(categoryRows.reduce((sum, item) => sum + item.value, 0))} />
          ) : (
            <EmptyState icon={<Users size={28} />} title="No category data yet" action={<LinkButton to="/coop/farmers/new" size="sm">Add Farmer</LinkButton>}>
              Farmer category totals will appear here when available.
            </EmptyState>
          )}
        </Card>
      </div>

      <div className="grid-main coopa-top">
        <Card className="coopa-compact">
          <CardHeader title="Recent Farmers" action={<LinkButton to="/coop/farmers" variant="outline" size="sm">View All Farmers</LinkButton>} />
          <DataTable
            bare
            hideFooter
            pageSize={5}
            rows={recentFarmers}
            emptyTitle="No recent farmers"
            emptyText="Newly registered farmers will appear here."
            columns={[
              { key: 'name', header: 'Names', render: (farmer) => <div className="cell-person"><Avatar name={farmer.name} />{farmer.profileId ? <Link to={`/coop/farmers/${farmer.profileId}`} className="coopa-name">{farmer.name}</Link> : <span className="coopa-name">{farmer.name}</span>}</div> },
              { key: 'cropType', header: 'Crop type' },
              { key: 'dateAdded', header: 'Date & time added', render: (farmer) => farmer.dateAdded ? <div>{formatDate(farmer.dateAdded)}<div className="cell-sub">{formatTime(farmer.dateAdded)}</div></div> : '—' },
              { key: 'status', header: 'Status', render: (farmer) => <StatusPill>{farmer.status}</StatusPill> },
            ]}
          />
        </Card>

        <Card>
          <CardHeader title="Recent investments" subtitle="Investor commitments to your funding packages." />
          {investmentTotal === 0 ? (
            <EmptyState icon={<Landmark size={28} />} title="No investments yet" action={<LinkButton to="/coop/funding" variant="outline" size="sm">View funding</LinkButton>}>
              Investment totals will appear here when available.
            </EmptyState>
          ) : (
            <>
              <ul className="coopa-inv">
                {investmentRows.map(([label, count, color]) => (
                  <li key={label}>
                    <Link to="/coop/investments" className="coopa-inv__row">
                      <Circle size={10} fill={color} stroke={color} />
                      <span className="grow">{label}</span>
                      <strong>{count}</strong>
                      <ChevronRight size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="caption muted" style={{ marginTop: 12 }}>Pending means an investor has committed but the financial partner has not confirmed the money yet.</p>
              <LinkButton to="/coop/investments" variant="outline" block className="mt-4">View all investments</LinkButton>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function metricRaw(metric) {
  if (metric === null || metric === undefined) return undefined;
  if (typeof metric !== 'object') return metric;
  return metric.value ?? metric.count ?? metric.total ?? metric.amount ?? metric.number;
}

function numericValue(metric) {
  const value = metricRaw(metric);
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function countValue(metric) {
  return numericValue(metric) ?? 0;
}

function metricValue(metric, kind) {
  if (metric === null || metric === undefined) return '—';
  if (typeof metric === 'object') {
    const formatted = metric.formatted_value || metric.formatted || metric.display;
    if (formatted !== undefined && formatted !== null) return formatted;
  }
  const raw = metricRaw(metric);
  if (raw === undefined || raw === null || raw === '') return '—';
  if (kind === 'money') {
    const number = Number(raw);
    return Number.isFinite(number) ? formatNaira(number) : String(raw);
  }
  const number = Number(raw);
  const display = Number.isFinite(number) ? formatNumber(number) : String(raw);
  if (kind === 'area' && typeof metric === 'object') return `${display}${metric.unit ? ` ${metric.unit}` : ''}`;
  return kind === 'area' && Number.isFinite(number) ? `${display} ha` : display;
}

