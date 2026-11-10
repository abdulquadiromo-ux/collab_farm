import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, Pencil, Send, Copy, Plus } from 'lucide-react';
import { DataTable, StatusPill, KebabMenu, LinkButton, Button } from '../ui/index.js';
import { formatNaira, formatDate, formatNumber } from '../../utils/format.js';
import { EDITABLE_STATUSES } from './constants.jsx';
import { usePackageActions } from './hooks.js';
import { useSubmitFlow } from './SubmitFlow.jsx';
import { TierDot } from './Common.jsx';

/**
 * Table of this cooperative's packages (Figma 7131:19180). Actions: View, and a kebab with
 * View, Edit (Draft or Changes Requested), Submit for review and Duplicate as draft.
 */
export default function PackagesTable({ rows, verified, emptyTitle, emptyText, emptyAction, totalLabel = 'packages', pageSize = 8, showCategory = true }) {
  const { duplicateAsDraft } = usePackageActions();
  const { ask: askSubmit, dialog } = useSubmitFlow({ verified });

  const columns = [
    {
      key: 'name', header: 'Package', sortable: true,
      render: (p) => (
        <Link to={`/coop/funding/${p.id}`} className="coopb-cell-link">
          <span className="strong coopb-trunc">{p.name}</span>
          {showCategory && <span className="cell-sub">{p.category}</span>}
        </Link>
      ),
    },
    { key: 'tier', header: 'Package Type', render: (p) => <span className="row" style={{ gap: 8 }}><TierDot tier={p.tier} />{p.tier}</span> },
    { key: 'investorsCount', header: 'Investors', sortable: true, render: (p) => formatNumber(p.investorsCount || 0) },
    { key: 'farmersCount', header: 'Farmers', sortable: true, render: (p) => formatNumber(p.farmersCount || 0) },
    { key: 'amount', header: 'Amount', sortable: true, render: (p) => <span className="nowrap">{formatNaira(p.amount)}</span> },
    { key: 'createdAt', header: 'Date Created', sortable: true, render: (p) => <span className="nowrap">{formatDate(p.createdAt)}</span> },
    { key: 'status', header: 'Status', render: (p) => <StatusPill>{p.status}</StatusPill> },
    {
      key: 'actions', header: 'Actions',
      render: (p) => {
        const editable = EDITABLE_STATUSES.includes(p.status);
        const items = [{ label: 'View', icon: <Eye size={16} />, to: `/coop/funding/${p.id}` }];
        if (editable) items.push({ label: 'Edit', icon: <Pencil size={16} />, to: `/coop/funding/new?edit=${p.id}` });
        if (editable && verified) items.push({ label: 'Submit for review', icon: <Send size={16} />, onClick: () => askSubmit(p) });
        if (verified) items.push({ label: 'Duplicate as draft', icon: <Copy size={16} />, onClick: () => duplicateAsDraft(p) });
        return (
          <div className="row" style={{ gap: 8 }}>
            <LinkButton to={`/coop/funding/${p.id}`} variant="primary" size="sm" className="coopb-view-package" aria-label={`View package ${p.name}`}>View Package <ArrowRight size={16} /></LinkButton>
            <KebabMenu items={items} label={`More actions for ${p.name}`} />
          </div>
        );
      },
    },
  ];

  const statuses = useMemo(() => [...new Set(rows.map((r) => r.status))], [rows]);
  const tiers = useMemo(() => [...new Set(rows.map((r) => r.tier))], [rows]);
  const filters = useMemo(() => [
    { key: 'tier', allLabel: 'All Package Types', options: tiers },
    { key: 'status', allLabel: 'All Status', options: statuses },
  ], [tiers, statuses]);

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={(r) => `${r.name} ${r.category} ${r.tier} ${r.status}`}
        searchPlaceholder="Search by package name, type or status"
        filters={filters}
        totalLabel={totalLabel}
        pageSize={pageSize}
        defaultSort={{ key: 'createdAt', dir: 'desc' }}
        emptyTitle={emptyTitle || 'No packages yet'}
        emptyText={emptyText}
        emptyAction={emptyAction}
      />
      {dialog}
    </>
  );
}

export function CreatePackageButton({ verified, size = 'lg', children = 'Create Package' }) {
  const sz = size === 'md' ? undefined : size;
  if (!verified) {
    return <Button size={sz} disabled title="Available once your cooperative is verified"><Plus size={20} />{children}</Button>;
  }
  return <LinkButton to="/coop/funding/new" size={sz}><Plus size={20} />{children}</LinkButton>;
}
