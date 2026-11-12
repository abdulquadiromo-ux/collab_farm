import { useEffect, useState } from 'react';
import { Button, Modal, TextField } from '../ui/index.js';
import { useApp } from '../../context/AppContext.jsx';
import { useStableCallback } from './helpers.js';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';

const BLANK = { name: '', location: '', areaHa: '' };

// Add farm dialog (Figma 7350:16180, with the land access and season fields the PRD requires).
export function AddFarmModal({ open, onClose, farmerId, farms = [], onAdded }) {
  const { toast, accessToken } = useApp();
  const [v, setV] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState('');
  const close = useStableCallback(() => { if (!busy) onClose?.(); });

  useEffect(() => { if (open) { setV(BLANK); setErrors({}); setBusy(false); setRequestError(''); } }, [open]);

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
    setRequestError('');
    try {
      if (!accessToken) throw new Error('Your session has expired. Sign in again before adding a farm.');
      if (!farmerId) throw new Error('A farmer must be selected before adding a farm.');
      const response = await fetch(`${API_BASE_URL}/farmers/${encodeURIComponent(farmerId)}/farms`, {
        method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: v.name.trim(), location: v.location.trim(), size_in_hectares: Number(v.areaHa), status: 'ACTIVE' }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not add farm (${response.status}).`));
      const record = { ...payload, areaHa: payload?.size_in_hectares ?? Number(v.areaHa), status: payload?.status === 'INACTIVE' ? 'Inactive' : 'Active' };
      toast(`${record.name || v.name} was added.`, 'success');
      onClose?.(); onAdded?.(record);
    } catch (error) { setRequestError(error.message || 'Could not add farm.'); }
    finally { setBusy(false); }
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
      {requestError && <p className="field-error" role="alert">{requestError}</p>}
    </Modal>
  );
}
