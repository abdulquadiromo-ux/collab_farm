import { useEffect, useState } from 'react';
import { Button, Modal, SelectField, TextField } from '../ui/index.js';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { CROP_OPTIONS, LAND_ACCESS_TYPES, SEASON_OPTIONS, nextFarmId, useStableCallback } from './helpers.js';

const BLANK = { name: '', location: '', areaHa: '', landAccessType: '', crop: '', season: SEASON_OPTIONS[0] };

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
    if (!v.landAccessType) e.landAccessType = 'Choose how the cooperative has access to this land.';
    if (!v.crop) e.crop = 'Choose the main crop.';
    if (!v.season) e.season = 'Choose a season.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    await simulate(600);
    const record = add('farms', {
      id: nextFarmId(data.farms), coopId: coop.id, name: v.name.trim(), location: v.location.trim(), areaHa: Number(v.areaHa),
      landAccess: 'Pending', landAccessType: v.landAccessType, crop: v.crop, season: v.season, status: 'Active', lastInspection: null, documents: [], documentRecords: [],
    }, { action: 'Farm added', entityType: 'Farm', summary: `${v.name.trim()}, ${v.areaHa} ha, ${v.crop}, ${v.season}`, reason: 'Added by cooperative. Land-access evidence not yet uploaded.' });
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
      <p className="small muted" style={{ marginTop: -8, marginBottom: 16 }}>Provide the farm details to register it under your cooperative. You can upload land documents on the next page.</p>
      <div className="form-grid">
        <TextField label="Farm name or reference" required placeholder="For example, Kwali Block C" value={v.name} onChange={set('name')} error={errors.name} />
        <TextField label="Location" required placeholder="Village or town, LGA" value={v.location} onChange={set('location')} error={errors.location} />
        <TextField label="Approximate area (hectares)" required inputMode="decimal" placeholder="For example, 12.5" value={v.areaHa} onChange={set('areaHa')} error={errors.areaHa} hint="One hectare is about two and a half acres." />
        <SelectField label="Land access" required placeholder="How do you hold this land?" options={LAND_ACCESS_TYPES} value={v.landAccessType} onChange={set('landAccessType')} error={errors.landAccessType} />
        <SelectField label="Main crop" required placeholder="Select crop" options={CROP_OPTIONS} value={v.crop} onChange={set('crop')} error={errors.crop} />
        <SelectField label="Season" required options={SEASON_OPTIONS} value={v.season} onChange={set('season')} error={errors.season} />
      </div>
    </Modal>
  );
}
