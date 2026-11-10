import { useEffect, useState } from 'react';
import { Button, Modal, TextField } from '../ui/index.js';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { nextFarmId, useStableCallback } from './helpers.js';

const BLANK = { name: '', location: '', areaHa: '' };

// Add farm dialog (Figma 7350:16180, with the land access and season fields the PRD requires).
export function AddFarmModal({ open, onClose, coop, farms, onAdded }) {
  const { data, add, toast } = useApp();
  const [v, setV] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const close = useStableCallback(() => { if (!busy) onClose?.(); });

  useEffect(() => { if (open) { setV(BLANK); setErrors({}); setBusy(false); } }, [open]);

  const set = (k) => (e) => {
    setV((s) => ({ ...s, [k]: e.target.value }));
    if (errors[k]) setErrors((s) => ({ ...s, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    const name = v.name.trim();
    if (!name) e.name = 'Enter a name or reference for this farm.';
    else if (farms.some((f) => f.name.toLowerCase() === name.toLowerCase())) e.name = 'You already have a farm with this name. Use a different name.';
    if (!v.location.trim()) e.location = 'Enter where the farm is, for example Kwali, FCT.';
    const area = Number(v.areaHa);
    if (!v.areaHa) e.areaHa = 'Enter the approximate area in hectares.';
    else if (!(area > 0) || area > 10000) e.areaHa = 'Enter a number above 0 and up to 10,000 hectares.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    await simulate(600);
    const record = add('farms', {
      id: nextFarmId(data.farms), coopId: coop.id, name: v.name.trim(), location: v.location.trim(), areaHa: Number(v.areaHa),
      landAccess: 'Pending', landAccessType: '', crop: '', season: '', status: 'Active', lastInspection: null, documents: [], documentRecords: [],
    }, { action: 'Farm added', entityType: 'Farm', summary: `${v.name.trim()}, ${v.areaHa} ha, ${v.location.trim()}`, reason: 'Added by cooperative. Land-access evidence not yet uploaded.' });
    toast(`${record.name} was added. Upload land-access evidence so it can be verified.`, 'success');
    setBusy(false);
    onClose?.();
    onAdded?.(record);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add farm"
      wide
      footer={(
        <>
          <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
          <Button onClick={submit} loading={busy}>Add farm</Button>
        </>
      )}
    >
      <p className="small muted" style={{ marginTop: -8, marginBottom: 16 }}>Enter the name, location and approximate size to register this farm under your cooperative.</p>
      <div className="form-grid">
        <TextField label="Name" required placeholder="For example, Kwali Block C" value={v.name} onChange={set('name')} error={errors.name} />
        <TextField label="Location" required placeholder="Village or town, LGA" value={v.location} onChange={set('location')} error={errors.location} />
        <TextField label="Size (hectares)" required inputMode="decimal" placeholder="For example, 12.5" value={v.areaHa} onChange={set('areaHa')} error={errors.areaHa} />
      </div>
    </Modal>
  );
}
