import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import { ConfirmDialog } from '../ui/index.js';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { formatNaira } from '../../utils/format.js';
import { useCoop, usePackageActions } from './hooks.js';
import { packageProblems, packageToForm, formToPackage, reconcile } from './logic.js';

/**
 * Shared "Submit for review" flow for an already saved package (used by the Funding list and the detail page).
 * If the package is not complete the cooperative is sent to the Review step of the editor with the checklist.
 * Returns { ask(pkg), dialog }. Render `dialog` once in the page.
 */
export function useSubmitFlow({ verified }) {
  const navigate = useNavigate();
  const { data, toast } = useApp();
  const { farms } = useCoop();
  const { submitPackage } = usePackageActions();
  const [pkg, setPkg] = useState(null);
  const [busy, setBusy] = useState(false);
  const platformMin = data.platformSettings?.investor?.minimumInvestment;

  const ask = (p) => {
    if (!verified) {
      toast('Your cooperative must be verified before it can submit a funding request.', 'error');
      return;
    }
    const problems = packageProblems(p, { verified, platformMin });
    if (problems.length) {
      toast(`Not ready to submit. Still to do: ${problems.slice(0, 2).map((x) => x.label.toLowerCase()).join('; ')}.`, 'error');
      navigate(`/coop/funding/new?edit=${p.id}&step=review`);
      return;
    }
    setPkg(p);
  };

  const confirm = async () => {
    setBusy(true);
    await simulate(600);
    const rec = formToPackage(packageToForm(pkg), { coopId: pkg.coopId, existing: pkg, farms, status: pkg.status });
    submitPackage(rec, pkg);
    setBusy(false);
    setPkg(null);
  };

  const check = pkg ? reconcile(pkg) : null;
  const dialog = (
    <ConfirmDialog
      open={!!pkg}
      onClose={() => !busy && setPkg(null)}
      onConfirm={confirm}
      loading={busy}
      tone="green"
      icon={Send}
      title={pkg ? `Submit "${pkg.name}" for review?` : ''}
      message="A CollabFarm reviewer will check the budget and documents. Approval is not a guarantee of funding or returns."
      confirmLabel="Submit for review"
      summary={pkg ? [
        ['Package', pkg.name],
        ['Package amount', formatNaira(pkg.amount)],
        ['Budget', check.ok ? 'Reconciles with the package amount' : 'Does not reconcile'],
        ['Approval status', 'Not yet submitted'],
      ] : undefined}
    />
  );
  return { ask, dialog };
}
