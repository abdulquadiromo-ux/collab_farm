import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, simulate, newId } from '../../context/AppContext.jsx';
import { Modal, Button, SelectField, TextField, TextAreaField, Banner } from '../ui/index.js';
import { RISK_CATEGORIES } from '../../data/governance.js';
import { SEVERITIES, RISK_PATHS } from './riskPaths.js';
import { nowIso, todayIso } from './lib.js';

// Opens a new risk case. A case is a request to look at something. It is never a finding of fault.
export default function RiskCaseForm({ open, onClose, defaultPackageId = '', lockPackage = false }) {
  const { data, user, add, notify, toast } = useApp();
  const navigate = useNavigate();
  const blank = { category: '', packageId: defaultPackageId, severity: 'Medium', title: '', detail: '' };
  const [v, setV] = useState(blank);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setV({ ...blank, packageId: defaultPackageId }); setErr({}); setBusy(false); } }, [open, defaultPackageId]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => { setV((s) => ({ ...s, [k]: e.target.value })); setErr((s) => ({ ...s, [k]: '' })); };
  const pkgOptions = data.packages.filter((p) => !['Draft', 'Submitted'].includes(p.status)).map((p) => ({ value: p.id, label: p.name }));

  const submit = async () => {
    const e = {};
    if (!v.category) e.category = 'Choose the category that fits best. You can change the review path later by opening a new case.';
    if (!v.packageId) e.packageId = 'Choose the project this case is about.';
    if (!v.severity) e.severity = 'Choose a severity.';
    if (v.title.trim().length < 5) e.title = 'Give the case a short title of at least 5 characters.';
    if (v.detail.trim().length < 20) e.detail = 'Describe what was seen in at least 20 characters. Stick to facts. Do not name a cause or blame anyone yet.';
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    await simulate(500);
    const pkg = data.packages.find((p) => p.id === v.packageId);
    const rec = add('riskCases', {
      id: newId('rk'), packageId: v.packageId, coopId: pkg?.coopId, category: v.category, severity: v.severity, title: v.title.trim(), detail: v.detail.trim(),
      status: 'Open', raisedAt: todayIso(), owner: user.name, pathDone: 1, evidence: [], responses: [],
      timeline: [{ at: nowIso(), by: user.name, text: `Case opened by ${user.name}. A case asks for a closer look. It is not a finding of fault.` }],
    }, { action: 'Risk case opened', entityType: 'Risk case', summary: `${v.category}, ${v.severity} severity, ${pkg?.name}. ${v.title.trim()}`, reason: v.detail.trim() });
    notify('admin', 'New risk case opened', `${v.title.trim()} (${pkg?.name}) was opened by ${user.name}.`, `/admin/risk-alerts/${rec.id}`, 'risk');
    setBusy(false);
    onClose();
    toast('Risk case opened. Nobody has been told yet. Use the review path to notify the cooperative.');
    navigate(`/admin/risk-alerts/${rec.id}`);
  };

  const path = RISK_PATHS[v.category];

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} title="Open a risk case" wide white footer={(<><Button variant="outline" onClick={onClose} disabled={busy} block>Cancel</Button><Button onClick={submit} loading={busy} block>Open case</Button></>)}>
      <div className="stack">
        <Banner tone="info">A case asks for a closer look at something. It is not an accusation. The cooperative can respond and dispute it at every step.</Banner>
        <div className="form-grid">
          <SelectField label="Category" required options={RISK_CATEGORIES} placeholder="Choose a category" value={v.category} onChange={set('category')} error={err.category} />
          <SelectField label="Project" required options={pkgOptions} placeholder="Choose a project" value={v.packageId} onChange={set('packageId')} error={err.packageId} disabled={lockPackage} />
          <SelectField label="Severity" required options={SEVERITIES} value={v.severity} onChange={set('severity')} error={err.severity} hint="How soon it needs attention. It is not a judgement of the people involved." />
          <TextField label="Short title" required value={v.title} onChange={set('title')} error={err.title} placeholder="For example: Storage records overdue" />
          <TextAreaField className="full" label="What was seen" required value={v.detail} onChange={set('detail')} error={err.detail} />
        </div>
        {path && <div className="admb-hint">{path.blurb} {path.guard}</div>}
      </div>
    </Modal>
  );
}
