import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, SearchX } from 'lucide-react';
import { SearchInput, FilterSelect } from './Form.jsx';
import { EmptyState, Skeleton } from './Card.jsx';
import { cx } from '../../utils/format.js';

export function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  const windowed = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  for (let i = start; i <= Math.min(pages, start + 4); i += 1) windowed.push(i);
  return (
    <nav className="pagination" aria-label="Pagination">
      <button className="page-btn" onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Previous page"><ChevronLeft size={16} /></button>
      {windowed.map((n) => (
        <button key={n} className="page-btn" aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)} aria-label={`Page ${n}`}>{n}</button>
      ))}
      <button className="page-btn" onClick={() => onPage(page + 1)} disabled={page === pages} aria-label="Next page"><ChevronRight size={16} /></button>
    </nav>
  );
}

/**
 * Client-side table with search, filters, sorting and pagination. Everything runs on local data.
 *
 * columns: [{ key, header, render?(row), sortable?, sortValue?(row), align?, width?, className? }]
 * filters: [{ key, allLabel, options, match?(row, value) }]   (match defaults to row[key] === value)
 * searchKeys: string[] | (row) => string  (text searched when the user types)
 * rowKey: field name or fn. Defaults to 'id'.
 * totalLabel: noun for the "Showing 1 - 10 of N <noun>" footer.
 * toolbarExtra: node rendered right of the filters (for example a date range or export button).
 * bare: render without the surrounding card.
 */
export function DataTable({
  columns, rows, rowKey = 'id', pageSize = 10, searchKeys, searchPlaceholder = 'Search', filters = [],
  toolbarExtra, onRowClick, emptyTitle = 'Nothing to show yet', emptyText, emptyAction, totalLabel = 'records',
  loading = false, bare = false, defaultSort, hideFooter = false, toolbarLeft,
}) {
  const [query, setQuery] = useState('');
  const [fv, setFv] = useState({});
  const [sort, setSort] = useState(defaultSort || null); // {key, dir}
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let out = rows;
    const q = query.trim().toLowerCase();
    if (q && searchKeys) {
      out = out.filter((r) => {
        const hay = typeof searchKeys === 'function' ? searchKeys(r) : searchKeys.map((k) => r[k]).join(' ');
        return String(hay).toLowerCase().includes(q);
      });
    }
    filters.forEach((f) => {
      const v = fv[f.key];
      if (v) out = out.filter((r) => (f.match ? f.match(r, v) : String(r[f.key]) === v));
    });
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      const get = (r) => (col?.sortValue ? col.sortValue(r) : r[sort.key]);
      out = [...out].sort((a, b) => {
        const x = get(a); const y = get(b);
        if (x === y) return 0;
        const cmp = x > y ? 1 : -1;
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, query, fv, sort, searchKeys, filters, columns]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from = filtered.length ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, filtered.length);

  const toggleSort = (key) => setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));
  const hasToolbar = searchKeys || filters.length > 0 || toolbarExtra || toolbarLeft;

  const body = (
    <>
      {hasToolbar && (
        <div className="table-toolbar">
          <div className="row-wrap grow">
            {searchKeys && <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder={searchPlaceholder} />}
            {toolbarLeft}
          </div>
          <div className="table-toolbar__filters">
            {filters.map((f) => (
              <FilterSelect key={f.key} allLabel={f.allLabel} options={f.options} value={fv[f.key] || ''} onChange={(v) => { setFv((s) => ({ ...s, [f.key]: v })); setPage(1); }} />
            ))}
            {toolbarExtra}
          </div>
        </div>
      )}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cx(c.sortable && 'sortable', c.className)}
                  style={{ textAlign: c.align || 'left', width: c.width }}
                  aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                >
                  {c.header}
                  {c.sortable && <ArrowUpDown size={12} style={{ marginLeft: 6, verticalAlign: 'middle', opacity: sort?.key === c.key ? 1 : 0.4 }} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{columns.map((c) => <td key={c.key}><Skeleton h={18} /></td>)}</tr>
              ))
              : shown.map((r, i) => {
                const k = typeof rowKey === 'function' ? rowKey(r) : r[rowKey] ?? i;
                return (
                  <tr key={k} className={cx(onRowClick && 'clickable')} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                    {columns.map((c) => (
                      <td key={c.key} style={{ textAlign: c.align || 'left' }} className={c.className}>
                        {c.render ? c.render(r) : r[c.key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <EmptyState icon={<SearchX size={28} />} title={rows.length ? 'No results match your filters' : emptyTitle} action={emptyAction}>
            {rows.length ? 'Try a different search term or clear a filter.' : emptyText}
          </EmptyState>
        )}
      </div>
    </>
  );

  return (
    <>
      {bare ? body : <div className="table-card">{body}</div>}
      {!hideFooter && filtered.length > 0 && (
        <div className="pagination-bar">
          <span className="muted">Showing {from} - {to} of {filtered.length} {totalLabel}</span>
          <Pagination page={page} pages={pages} onPage={setPage} />
        </div>
      )}
    </>
  );
}
