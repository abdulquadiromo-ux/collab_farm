import { BarChart, DonutChart, LineChart } from '../charts/Charts.jsx';
import { Card, CardHeader, DataTable, StatusPill } from '../ui/index.js';
import { BasisBadge, BasisLegend } from './ShrBits.jsx';
import { formatDateShort, formatNaira, formatNumber } from '../../utils/format.js';

function cell(c, r) {
  const v = r[c.key];
  switch (c.type) {
    case 'money': return v == null ? <span className="muted">In kind</span> : formatNaira(v);
    case 'date': return v ? formatDateShort(v) : '-';
    case 'status': return v ? <StatusPill>{v}</StatusPill> : '-';
    case 'basis': return <BasisBadge basis={v} />;
    case 'pct': return `${v}%`;
    case 'number': return formatNumber(v);
    default: return v == null || v === '' ? '-' : v;
  }
}

export function tableColumns(cols) {
  return cols.map((c) => ({
    key: c.key,
    header: c.basis ? (<span className="shr-th">{c.header}<BasisBadge basis={c.basis} /></span>) : c.header,
    sortable: true,
    align: c.type === 'money' || c.type === 'number' || c.type === 'pct' ? 'right' : 'left',
    className: c.type === 'date' || c.type === 'money' ? 'nowrap' : undefined,
    render: (r) => cell(c, r),
  }));
}

export function csvColumns(cols) {
  return cols.map((c) => ({ header: c.basis ? `${c.header} (${c.basis})` : c.header, value: (r) => (r[c.key] == null ? '' : r[c.key]) }));
}

function ChartBlock({ chart }) {
  if (!chart) return <p className="small muted">There is not enough data in this selection to draw a chart.</p>;
  return (
    <div>
      <h3 className="shr-chart-title">{chart.title}</h3>
      {chart.kind === 'bar' && <BarChart data={chart.data} unit={chart.unit} height={260} />}
      {chart.kind === 'donut' && <DonutChart data={chart.data} total={chart.total} format={chart.format} size={210} />}
      {chart.kind === 'line' && <LineChart labels={chart.labels} series={chart.series} height={240} />}
    </div>
  );
}

export function ReportResult({ result }) {
  return (
    <div className="stack-lg">
      <BasisLegend />
      <div className="shr-kpis">
        {result.kpis.map((k) => (
          <div className="kpi-card" key={k.label}>
            <div className="kpi-card__top"><span>{k.label}</span></div>
            <div className="kpi-card__value"><span>{k.value}</span></div>
            <div><BasisBadge basis={k.basis} /></div>
            {k.sub && <div className="cell-sub">{k.sub}</div>}
          </div>
        ))}
      </div>
      <div className="grid-main">
        <Card><ChartBlock chart={result.chart} /></Card>
        <Card tone="tint">
          <CardHeader title="How to read this report" />
          <ul className="shr-plain shr-plain--sm">
            {result.notes.map((n, i) => <li key={i}>{n}</li>)}
            <li>Expected returns and projections are estimates. They are never promises.</li>
          </ul>
        </Card>
      </div>
      <DataTable
        columns={tableColumns(result.columns)}
        rows={result.rows}
        searchKeys={(r) => Object.values(r).join(' ')}
        searchPlaceholder="Search this report"
        pageSize={8}
        totalLabel="rows"
        emptyTitle="Nothing to report for this selection"
        emptyText="Try a wider date range or choose all packages."
      />
    </div>
  );
}
