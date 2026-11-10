import { useMemo } from 'react';
import { useApp, newId } from '../../context/AppContext.jsx';
import { formatNaira } from '../../utils/format.js';
import { todayIso } from './logic.js';

// The signed in cooperative and its own records. Everything a page shows is scoped to `user.orgId`.
export function useCoop() {
  const { data, user } = useApp();
  const orgId = user?.orgId;
  const coop = useMemo(() => data.cooperatives.find((c) => c.id === orgId) || null, [data.cooperatives, orgId]);
  const packages = useMemo(() => data.packages.filter((p) => p.coopId === orgId), [data.packages, orgId]);
  const farms = useMemo(() => data.farms.filter((f) => f.coopId === orgId), [data.farms, orgId]);
  const farmers = useMemo(() => data.farmers.filter((f) => f.coopId === orgId), [data.farmers, orgId]);
  return { coop, orgId, verified: coop?.status === 'Verified', packages, farms, farmers };
}

const OPEN_STAGES = ['Submitted', 'Under Review', 'Changes Requested'];

// Workflow actions that touch several collections. They follow the appendix contracts in docs/BUILD_BRIEF.md.
export function usePackageActions() {
  const { data, add, update, patchData, notify, toast, user } = useApp();
  const coopName = data.cooperatives.find((c) => c.id === user?.orgId)?.name || 'A cooperative';

  const syncPackageFarmers = (pkg) => {
    const selected = new Map((pkg.farmers || []).map((f) => [f.farmerId, Number(f.allocatedAmount) || 0]));
    patchData((current) => ({
      ...current,
      farmers: current.farmers.map((farmer) => {
        if (selected.has(farmer.id)) {
          const amount = selected.get(farmer.id);
          return { ...farmer, allocationPackageId: pkg.id, allocatedAmount: amount, allocation: { ...(farmer.allocation || {}), purpose: `Package allocation: ${pkg.name}`, supportType: 'Cash', expectedDate: pkg.startDate || '', approval: 'Pending' } };
        }
        if (farmer.allocationPackageId === pkg.id) return { ...farmer, allocationPackageId: null, allocatedAmount: 0, allocation: null };
        return farmer;
      }),
    }));
  };

  // Store a package as Draft (new or existing). Returns the saved record.
  const saveDraft = (record, existing) => {
    const rec = { ...record, status: existing?.status || 'Draft' };
    if (existing) {
      update('packages', existing.id, rec, { action: 'Funding package draft saved', entityType: 'Package', summary: `${rec.name} saved (${formatNaira(rec.amount)})`, reason: 'Edited by cooperative' });
    } else {
      add('packages', rec, { action: 'Funding package draft created', entityType: 'Package', summary: `${rec.name} created as Draft (${formatNaira(rec.amount)})`, reason: 'Created by cooperative' });
    }
    syncPackageFarmers(rec);
    return rec;
  };

  // Submit for review: package becomes Submitted and an application record is added (or reopened after changes were requested).
  const submitPackage = (record, existing) => {
    const rec = { ...record, status: 'Submitted', submittedAt: todayIso(), withdrawReason: null };
    if (existing) {
      update('packages', existing.id, rec, { action: 'Funding request submitted', entityType: 'Package', summary: `${rec.name} submitted for review (${formatNaira(rec.amount)})`, reason: `Status ${existing.status} to Submitted` });
    } else {
      add('packages', rec, { action: 'Funding request submitted', entityType: 'Package', summary: `${rec.name} submitted for review (${formatNaira(rec.amount)})`, reason: 'Status Draft to Submitted' });
    }
    syncPackageFarmers(rec);
    const reopen = data.applications.find((a) => a.packageId === rec.id && a.type === 'Funding application' && a.stage === 'Changes Requested');
    let appId;
    if (reopen) {
      appId = reopen.id;
      update('applications', reopen.id, { stage: 'Submitted', submittedAt: todayIso(), amount: rec.amount, resubmittedAt: todayIso() }, { action: 'Funding application resubmitted', entityType: 'Application', summary: `${rec.name} resubmitted after changes`, reason: 'Cooperative updated the package' });
    } else {
      appId = newId('app');
      add('applications', { id: appId, packageId: rec.id, coopId: rec.coopId, type: 'Funding application', submittedAt: todayIso(), stage: 'Submitted', reviewer: null, secondApprover: null, amount: rec.amount, notes: '' }, { action: 'Funding application created', entityType: 'Application', summary: `Funding application for ${rec.name}`, reason: 'Submitted by cooperative' });
    }
    notify('admin', 'New funding application', `${coopName} submitted ${rec.name} (${formatNaira(rec.amount)}) for review.`, `/admin/applications/${appId}`, 'funding');
    toast('Funding request submitted for review. You will be notified of the decision.');
    return rec;
  };

  // Withdraw before review starts. The package returns to Draft and the application goes back to the cooperative.
  const withdrawPackage = (pkg, reason) => {
    update('packages', pkg.id, { status: 'Draft', withdrawReason: reason, withdrawnAt: todayIso() }, { action: 'Funding request withdrawn', entityType: 'Package', summary: `${pkg.name} returned to Draft`, reason });
    const app = data.applications.find((a) => a.packageId === pkg.id && a.type === 'Funding application' && ['Submitted', 'Under Review'].includes(a.stage));
    if (app) {
      update('applications', app.id, { stage: 'Changes Requested', notes: `Withdrawn by the cooperative before review. Reason: ${reason}`, withdrawn: true }, { action: 'Funding application withdrawn', entityType: 'Application', summary: `${pkg.name} withdrawn by the cooperative`, reason });
      notify('admin', 'Funding application withdrawn', `${coopName} withdrew ${pkg.name}: ${reason}`, `/admin/applications/${app.id}`, 'funding');
    }
    toast('Request withdrawn. The package is back in Draft and can be edited.', 'info');
  };

  // Material budget change on an approved package. A second reviewer is required later by the admin.
  const openBudgetChange = (pkg) => data.applications.find((a) => a.packageId === pkg.id && a.type === 'Budget change' && OPEN_STAGES.includes(a.stage)) || null;
  const requestBudgetChange = (pkg, newAmount, reason) => {
    const id = newId('app');
    add('applications', {
      id, packageId: pkg.id, coopId: pkg.coopId, type: 'Budget change', submittedAt: todayIso(), stage: 'Submitted', reviewer: null, secondApprover: null,
      amount: newAmount, previousAmount: pkg.amount, requiresSecondReviewer: true,
      notes: `Cooperative request: change the package amount from ${formatNaira(pkg.amount)} to ${formatNaira(newAmount)}. Reason: ${reason}`,
    }, { action: 'Budget change requested', entityType: 'Package', entityId: pkg.id, summary: `${pkg.name}: ${formatNaira(pkg.amount)} to ${formatNaira(newAmount)}`, reason });
    notify('admin', 'Budget change requested', `${coopName} asked to change ${pkg.name} from ${formatNaira(pkg.amount)} to ${formatNaira(newAmount)}. A second reviewer is required.`, `/admin/applications/${id}`, 'funding');
    toast('Budget change request sent. The approved budget stays as it is until two reviewers agree.');
    return id;
  };

  const duplicateAsDraft = (pkg) => {
    const copy = {
      ...pkg,
      id: newId('pkg'),
      name: `${pkg.name} (copy)`,
      status: 'Draft', raised: 0, committed: 0, investorsCount: 0, farmersCount: 0,
      createdAt: todayIso(), withdrawReason: null, withdrawnAt: null, submittedAt: null,
      budget: (pkg.budget || []).map((b) => ({ ...b, id: newId('b'), approval: 'Pending' })),
    };
    add('packages', copy, { action: 'Funding package duplicated', entityType: 'Package', summary: `${pkg.name} duplicated as a new Draft`, reason: 'Duplicated by cooperative' });
    toast('A copy was saved as a Draft.');
    return copy;
  };

  return { saveDraft, submitPackage, withdrawPackage, requestBudgetChange, openBudgetChange, duplicateAsDraft };
}
