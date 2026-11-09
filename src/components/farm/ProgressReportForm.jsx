import { useEffect, useState } from 'react';
import { MapPin, Send } from 'lucide-react';
import { Card, CardHeader, Banner, Button, SelectField, TextAreaField, TextField, FileDrop } from '../ui/index.js';
import { useApp, simulate, newId } from '../../context/AppContext.jsx';
import { isoNow } from './farmerData.js';

const SAMPLE_GPS = '8.9420 N, 7.0830 E (sample location near Gwagwalada)';

// "Submit progress report". The report becomes farmer evidence on the related milestone, so the cooperative can see it.
// preset: { key, note, nonce } lets another part of the page prefill the form.
export default function ProgressReportForm({ ctx, preset, onSent }) {
  const { update, notify, toast } = useApp();
  const { tasks, name, farmer } = ctx;
  const [activityKey, setActivityKey] = useState(preset?.key || tasks.find((t) => t.status !== 'Completed')?.key || tasks[0]?.key || '');
  const [note, setNote] = useState(preset?.note || '');
  const [gps, setGps] = useState('');
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!preset) return;
    if (preset.key) setActivityKey(preset.key);
    setNote(preset.note || '');
    setErrors({});
  }, [preset]);

  const task = tasks.find((t) => t.key === activityKey) || null;

  const validate = () => {
    const e = {};
    if (!task) e.activity = 'Choose the activity this report is about.';
    else if (!task.milestone) e.activity = 'Your cooperative has not set up this step yet. Please choose another one.';
    if (note.trim().length < 10) e.note = 'Please write a few words about what you did. At least 10 letters.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    await simulate(600);
    const evidence = {
      id: newId('ev'),
      type: 'Farmer progress report',
      name: files[0]?.name || `Progress report from ${name}`,
      verified: false,
      uploadedBy: name,
      farmerId: farmer.id,
      activityKey: task.key,
      activity: task.title,
      note: note.trim(),
      gps: gps.trim(),
      photos: files.map((f) => f.name),
      submittedAt: isoNow(),
      reportStatus: 'Submitted',
      feedback: '',
    };
    update(
      'milestones',
      task.milestone.id,
      (m) => ({ evidence: [...(m.evidence || []), evidence] }),
      { action: 'Farmer progress report submitted', entityType: 'Milestone', summary: `${name} sent a progress report for "${task.title}" (${files.length} photo${files.length === 1 ? '' : 's'}).`, reason: 'Farmer evidence for milestone review' },
    );
    notify('cooperative', 'New farmer progress report', `${name} sent a progress report for "${task.title}".`, `/coop/farming-progress/${task.milestone.id}`, 'milestone');
    setSaving(false);
    setNote('');
    setGps('');
    setFiles([]);
    toast('Your report was sent to your cooperative.');
    onSent?.();
  };

  return (
    <Card id="send-report" className="farm-scroll-target">
      <CardHeader title="Send a progress report" subtitle="Tell your cooperative what you did on your farm. Keep it short." />
      <form onSubmit={submit} noValidate className="stack-lg">
        <Banner tone="green" title="Photos and location help, but they are not final proof">
          They help your cooperative check your work. People may also visit your farm to confirm.
        </Banner>
        <SelectField
          label="Which activity is this about?"
          required
          value={activityKey}
          onChange={(e) => { setActivityKey(e.target.value); setErrors((s) => ({ ...s, activity: undefined })); }}
          options={tasks.map((t) => ({ value: t.key, label: t.title }))}
          error={errors.activity}
          disabled={!tasks.length}
        />
        <TextAreaField
          label="What did you do?"
          required
          value={note}
          onChange={(e) => { setNote(e.target.value); setErrors((s) => ({ ...s, note: undefined })); }}
          placeholder="For example: I weeded my plot and added fertiliser on Monday."
          error={errors.note}
        />
        <FileDrop
          label="Photo (optional)"
          multiple
          files={files}
          onFiles={setFiles}
          accept="JPG or PNG, up to 5MB. Photos stay on this device in this demo."
          prompt="Tap to add a photo"
        />
        <div className="stack-sm">
          <TextField
            label="Where are you? (optional)"
            value={gps}
            onChange={(e) => setGps(e.target.value)}
            placeholder="Coordinates or a landmark near your farm"
            hint="You can type a place or use the sample location to see how it works."
          />
          <div>
            <Button variant="outline-green" className="farm-btn" onClick={() => setGps(SAMPLE_GPS)}><MapPin size={18} />Use sample location</Button>
          </div>
        </div>
        <div className="farm-actions">
          <Button type="submit" size="lg" className="farm-btn" loading={saving}><Send size={18} />Send report</Button>
        </div>
      </form>
    </Card>
  );
}
