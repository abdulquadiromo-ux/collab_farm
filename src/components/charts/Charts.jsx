import { useState } from 'react';
import { cx } from '../../utils/format.js';

export const DONUT_COLORS = ['#d0e7d9', '#498d63', '#0a140e', '#1e3928', '#6eb489', '#e7f3ec'];

/**
 * Vertical bars on a light track (Figma "Accumulative ROI").
 * data: [{ label, value (0-100), tone: 'gold' | 'green' }]
 */
export function BarChart({ data, height = 300, unit = '%' }) {
  const [hover, setHover] = useState(null);
  const ticks = [100, 80, 60, 40, 20, 0];
  const W = 640; const padL = 48; const padB = 34; const padT = 8;
  const innerH = height - padB - padT;
  const slot = (W - padL) / data.length;
  const barW = Math.min(36, slot * 0.45);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label="Bar chart" style={{ display: 'block' }}>
      {ticks.map((t) => {
        const y = padT + innerH - (t / 100) * innerH;
        return <text key={t} x={padL - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#494949">{t}{unit}</text>;
      })}
      <line x1={padL} x2={W} y1={padT + innerH} y2={padT + innerH} stroke="#c0c0c0" />
      {data.map((d, i) => {
        const x = padL + slot * i + (slot - barW) / 2;
        const h = (d.value / 100) * innerH;
        const fill = d.tone === 'gold' ? '#dbbd5a' : '#547a68';
        return (
          <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} tabIndex={0} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
            <rect x={x} y={padT} width={barW} height={innerH} rx={barW / 2} fill="#f2f3f7" />
            <rect x={x} y={padT + innerH - h} width={barW} height={h} rx={barW / 2} fill={fill} opacity={hover === null || hover === i ? 1 : 0.55} />
            <text x={x + barW / 2} y={height - 10} textAnchor="middle" fontSize="12" fill="#313131">{d.label}</text>
            {hover === i && (
              <g>
                <rect x={x + barW / 2 - 34} y={padT + innerH - h - 30} width="68" height="24" rx="6" fill="#181818" />
                <text x={x + barW / 2} y={padT + innerH - h - 14} textAnchor="middle" fontSize="12" fill="#fff">{d.value}{unit}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Donut with a total in the centre and an interactive legend.
 * data: [{ label, value, display? }]  total: centre text
 */
export function DonutChart({ data, total, size = 240, colors = DONUT_COLORS, format }) {
  const [active, setActive] = useState(null);
  const sum = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2; const ir = r * 0.3;
  let acc = -Math.PI / 2;
  const arcs = data.map((d, i) => {
    const a0 = acc; const a1 = acc + (d.value / sum) * Math.PI * 2; acc = a1;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (a, rad) => [r + rad * Math.cos(a), r + rad * Math.sin(a)];
    const [x0, y0] = p(a0, r - 2); const [x1, y1] = p(a1, r - 2);
    const path = `M ${r} ${r} L ${x0} ${y0} A ${r - 2} ${r - 2} 0 ${large} 1 ${x1} ${y1} Z`;
    return { path, color: colors[i % colors.length], d, i };
  });
  return (
    <div className="row-wrap" style={{ justifyContent: 'center', gap: 32 }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Donut chart" style={{ maxWidth: '100%' }}>
        {arcs.map((a) => (
          <path key={a.d.label} d={a.path} fill={a.color} stroke="#fff" strokeWidth="1" opacity={active === null || active === a.i ? 1 : 0.5} onMouseEnter={() => setActive(a.i)} onMouseLeave={() => setActive(null)} />
        ))}
        <circle cx={r} cy={r} r={ir + r * 0.2} fill="#fff" />
        <text x={r} y={r + 7} textAnchor="middle" fontSize="22" fontWeight="600" fill="#181818">{active !== null ? (format ? format(data[active].value) : data[active].value) : total}</text>
      </svg>
      <div className="legend" style={{ minWidth: 150 }}>
        {data.map((d, i) => (
          <div key={d.label} className="legend__row" onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} style={{ fontWeight: active === i ? 700 : 400 }}>
            <span className="dot" style={{ background: colors[i % colors.length], border: i === 0 ? '1px solid #b5d3c1' : 0 }} />
            <span>{d.label}</span>
            <span>{d.display ?? `${d.value}`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Multi series line chart. series: [{ name, color, values: number[] }], labels: string[]
 */
export function LineChart({ labels, series, height = 260, format = (v) => v, area = true }) {
  const W = 640; const padL = 52; const padB = 30; const padT = 12; const padR = 12;
  const all = series.flatMap((s) => s.values);
  const max = Math.max(...all, 1) * 1.1;
  const innerW = W - padL - padR; const innerH = height - padB - padT;
  const x = (i) => padL + (labels.length === 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW);
  const y = (v) => padT + innerH - (v / max) * innerH;
  const [hover, setHover] = useState(null);
  const grid = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label="Line chart" style={{ display: 'block' }}>
        {grid.map((g) => (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={padT + innerH * (1 - g)} y2={padT + innerH * (1 - g)} stroke="#ededed" />
            <text x={padL - 8} y={padT + innerH * (1 - g) + 4} textAnchor="end" fontSize="11" fill="#717171">{format(Math.round(max * g))}</text>
          </g>
        ))}
        {labels.map((l, i) => <text key={l} x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill="#313131">{l}</text>)}
        {series.map((s) => {
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
          return (
            <g key={s.name}>
              {area && <polygon points={`${x(0)},${padT + innerH} ${pts} ${x(s.values.length - 1)},${padT + innerH}`} fill={s.color} opacity="0.08" />}
              <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5 : 3} fill="#fff" stroke={s.color} strokeWidth="2" />)}
            </g>
          );
        })}
        {labels.map((l, i) => (
          <rect key={l} x={x(i) - innerW / labels.length / 2} y={padT} width={innerW / labels.length} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}
      </svg>
      <div className="row-wrap small" style={{ justifyContent: 'center', gap: 20 }}>
        {series.map((s) => (
          <span key={s.name} className="row" style={{ gap: 6 }}><span className="dot" style={{ background: s.color }} />{s.name}{hover !== null && <strong className={cx('nowrap')}>{format(s.values[hover])}</strong>}</span>
        ))}
      </div>
    </div>
  );
}
