import { useState } from 'react';
import { Send } from 'lucide-react';
import { Card, CardHeader, Button, SelectField, TextField, FileDrop } from '../ui/index.js';
import { useApp, simulate, newId } from '../../context/AppContext.jsx';
import { formatNumber } from '../../utils/format.js';
import { isoNow, TODAY_ISO } from './farmerData.js';

const UNITS = ['kg', 'bags', 'tonnes', 'baskets'];
const QUALITY = [
  { value: 'Grade A', label: 'Good (Grade A)' },
  { value: 'Grade B', label: 'Fair (Grade B)' },
  { value: 'Grade C', label: 'Poor (Grade C)' },
];

// "Report harvest". Saved on the farmer's own record, and copied as evidence to the harvest milestone so the cooperative sees it.
export default function HarvestForm({ ctx, onSent }) {
  const { update, notify, toast } = useApp();
  const { farmer, name, crop, tasks } = ctx;
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('kg');
  const [date, setDate] = useState(TODAY_ISO);
  const [quality, setQuality] = useState('Grade A');
  const [location, setLocation] = useState('');
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const clear = (k) => setErrors((s) => ({ ...s, [k]: undefined }));

  const submit = async (ev) => {
    ev.preventDefault();
    const e = {};
    const n = Number(qty);
    if (!qty || Number.isNaN(n) || n <= 0) e.qty = 'Type how much you harvested. Use a number bigger than 0.';
    if (!date) e.date = 'Choose the day you harvested.';
    else if (date > TODAY_ISO) e.date = 'The harvest date cannot be in the future.';
    if (location.trim().length < 3) e.location = 'Tell us where the harvest is kept, for example "My store at home".';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    await simulate(600);
    const report = { id: newId('hr'), crop, qty: n, unit, date, quality, location: location.trim(), photos: files.map((f) => f.name), submittedAt: isoNow(), status: 'Submitted' };
    update(
      'farmers',
      farmer.id,
      (f) => ({ harvestReports: [report, ...(f.harvestReports || [])] }),
      { action: 'Farmer harvest reported', entityType: 'Farmer', summary: `${name} reported ${formatNumber(n)} ${unit} of ${crop} (${quality}).`, reason: 'Farmer harvest report, not yet checked' },
    );
    const harvestMilestone = tasks.find((t) => t.key === 'harvest')?.milestone;
    if (harvestMilestone) {
      update('milestones', harvestMilestone.id, (m) => ({
        evidence: [...(m.evidence || []), { id: report.id, type: 'Farmer harvest report', name: files[0]?.name || `Harvest report from ${name}`, verified: false, uploadedBy: name, farmerId: farmer.id, qty: n, unit, quality, location: report.location, submittedAt: report.submittedAt }],
      }));
    }
    notify('cooperative', 'Farmer harvest reported', `${name} reported ${formatNumber(n)} ${unit} of ${crop}. Please check it.`, harvestMilestone ? `/coop/farming-progress/${harvestMilestone.id}` : '/coop/farming-progress', 'harvest');
    setSaving(false);
    setQty('');
    setLocation('');
    setFiles([]);
    toast('Your harvest report was sent to your cooperative.');
    onSent?.();
  };

  return (
    <Card id="report-harvest" className="farm-scroll-target">
      <CardHeader title="Report my harvest" subtitle="Tell us what you harvested. Your cooperative checks it before it is counted." />
      <form onSubmit={submit} noValidate className="stack-lg">
        <div className="form-grid">
          <TextField label="How much did you harvest?" required type="number" inputMode="decimal" min="0" value={qty} onChange={(e) => { setQty(e.target.value); clear('qty'); }} error={errors.qty} placeholder="For example 250" />
          <SelectField label="Counted in" required value={unit} onChange={(e) => setUnit(e.target.value)} options={UNITS} />
          <TextField label="Day of harvest" required type="date" max={TODAY_ISO} value={date} onChange={(e) => { setDate(e.target.value); clear('date'); }} error={errors.date} />
          <SelectField label="How good is it?" required value={quality} onChange={(e) => setQuality(e.target.value)} options={QUALITY} />
          <TextField className="full" label="Where is it kept?" required value={location} onChange={(e) => { setLocation(e.target.value); clear('location'); }} error={errors.location} placeholder="For example: My store at home, or the cooperative store" />
        </div>
        <FileDrop label="Photo of the harvest (optional)" multiple files={files} onFiles={setFiles} accept="JPG or PNG, up to 5MB. Photos stay on this device in this demo." prompt="Tap to add a photo" />
        <div className="farm-actions">
          <Button type="submit" size="lg" className="farm-btn" loading={saving}><Send size={18} />Send harvest report</Button>
        </div>
      </form>
    </Card>
  );
}
