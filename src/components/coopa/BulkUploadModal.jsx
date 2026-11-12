import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Download, FileSpreadsheet, TriangleAlert } from 'lucide-react';
import { Banner, Button, Checkbox, Modal, StatusPill } from '../ui/index.js';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { useStableCallback, parseCsv, validateBulk, templateCsv, sampleCsv, downloadCsv, maskNin, nextFarmerId } from './helpers.js';

const MAX_BYTES = 1024 * 1024;

/**
 * Bulk farmer upload. The CSV is read in the browser with FileReader and never sent anywhere.
 * Steps: choose a file (or use the built-in sample), check every row, import only the valid rows.
 */
export function BulkUploadModal({ open, onClose, coop, farmers, verified }) {
  const { data, patchData, audit, notify, toast } = useApp();
  const inputRef = useRef(null);
  const [stage, setStage] = useState('pick'); // pick | preview | done
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState('');
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [summary, setSummary] = useState(null);
  const close = useStableCallback(() => { if (!busy) onClose?.(); });

  useEffect(() => {
    if (open) { setStage('pick'); setFileName(''); setResult(null); setError(''); setConsent(false); setConsentError(''); setBusy(false); setSummary(null); }
  }, [open]);

  const load = (text, name) => {
    const checked = validateBulk(parseCsv(text), farmers);
    setFileName(name);
    if (checked.fileError) { setError(checked.fileError); return; }
    setError('');
    setResult(checked);
    setStage('preview');
  };

  const readFile = (file) => {
    if (!file) return;
    setError('');
    if (!/\.csv$/i.test(file.name)) { setError('Choose a CSV file (.csv). Excel files must be saved as CSV first.'); return; }
    if (file.size > MAX_BYTES) { setError('This file is larger than 1MB. Split it into smaller files of up to 500 rows.'); return; }
    const reader = new FileReader();
    reader.onload = () => load(String(reader.result || ''), file.name);
    reader.onerror = () => setError('The file could not be read. Try again or choose another file.');
    reader.readAsText(file);
  };

  const rows = result?.rows || [];
  const valid = rows.filter((r) => r.valid);
  const invalid = rows.length - valid.length;

  const doImport = async () => {
    if (!consent) { setConsentError('Confirm consent before importing.'); return; }
    if (!valid.length) return;
    setBusy(true);
    await simulate(700);
    const now = new Date().toISOString();
    const records = valid.map((r, i) => ({
      id: nextFarmerId(data.farmers, i), coopId: coop.id, name: r.name, nin: r.nin, phone: r.phone, email: r.email, gender: r.gender,
      cropType: r.cropType, farmSize: r.farmSize, farmSizeUnit: r.farmSizeUnit, status: 'Pending', identityStatus: 'Pending',
      membership: 'Active member', consent: true, experienceYears: null, skills: [], farmId: null, dateAdded: now, notes: '',
      agreementStatus: 'Not Signed', allocationPackageId: null, allocatedAmount: 0, duplicateFlag: null, source: 'Bulk upload',
    }));
    patchData((d) => ({ farmers: [...records, ...d.farmers] }));
    audit({
      action: 'Farmers imported in bulk', entityType: 'Farmer', entityId: 'bulk',
      summary: `${records.length} farmers imported as Pending, ${invalid} rows skipped. File: ${fileName}`, reason: 'CSV bulk upload with consent confirmed',
    });
    notify('admin', 'Farmers awaiting identity checks', `${coop.name} imported ${records.length} farmers. Identity checks are pending.`, '/admin/farmers-farms', 'verification');
    toast(`${records.length} farmers imported as Pending.`, 'success');
    setSummary({ imported: records.length, skipped: rows.filter((r) => !r.valid) });
    setBusy(false);
    setStage('done');
  };

  const foot = stage === 'pick' ? (
    <Button variant="outline" onClick={close}>Cancel</Button>
  ) : stage === 'preview' ? (
    <>
      <Button variant="outline" onClick={() => { setStage('pick'); setResult(null); setError(''); }} disabled={busy}>Choose another file</Button>
      <Button onClick={doImport} loading={busy} disabled={!valid.length || !verified}>{valid.length ? `Import ${valid.length} ${valid.length === 1 ? 'farmer' : 'farmers'}` : 'Nothing to import'}</Button>
    </>
  ) : (
    <Button onClick={close}>Close</Button>
  );

  return (
    <Modal open={open} onClose={close} title="Bulk upload farmers" wide white footer={foot}>
      {stage === 'pick' && (
        <div className="stack">
          <p className="muted small">Add many farmers at once from a CSV file. Each farmer is added as <strong>Pending</strong> until a CollabFarm reviewer checks their identity. The file is read on your device and checked row by row before anything is saved.</p>
          {!verified && (
            <Banner tone="warn" title="Importing is not available yet">
              Bulk import unlocks after your cooperative is verified. You can still check a file here. Until then, add farmers one at a time. <Link to="/onboarding/cooperative" className="strong">Review cooperative profile</Link>
            </Banner>
          )}
          <div
            className={`dropzone${over ? ' dropzone--over' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); readFile(e.dataTransfer.files?.[0]); }}
          >
            <FileSpreadsheet size={28} />
            <div className="small strong">Click to choose a CSV file or drag it here</div>
            <div className="caption muted">CSV only. Up to 500 rows and 1MB.</div>
            <span className="btn btn--outline btn--sm" style={{ pointerEvents: 'none' }}>Choose File</span>
            <input ref={inputRef} type="file" hidden accept=".csv,text/csv" aria-label="Choose a CSV file" onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          {error && <Banner tone="danger">{error}</Banner>}
          <div className="row-wrap between">
            <Button variant="outline-green" size="sm" onClick={() => load(sampleCsv(farmers), 'sample-farmers.csv')}>Use sample file</Button>
            <button type="button" className="link-btn row small" style={{ gap: 6 }} onClick={() => downloadCsv('farmer-upload-template.csv', templateCsv())}>
              <Download size={16} />Download template
            </button>
          </div>
          <p className="caption muted">Columns: full_name, nin (11 digits), phone, gender, crop_type, farm_size, farm_size_unit, email. Only full_name, nin, phone and crop_type are required.</p>
        </div>
      )}

      {stage === 'preview' && result && (
        <div className="stack">
          <p className="small muted">File: <strong>{fileName}</strong>{result.truncated ? '. Only the first 500 rows were read.' : ''}</p>
          <div className="coopa-bulk-summary">
            <div><span className="muted caption">Rows read</span><strong>{rows.length}</strong></div>
            <div><span className="muted caption">Ready to import</span><strong className="coopa-ok">{valid.length}</strong></div>
            <div><span className="muted caption">Need fixing</span><strong className={invalid ? 'danger-text' : ''}>{invalid}</strong></div>
          </div>
          {invalid > 0 && <Banner tone="warn">Only the {valid.length} valid {valid.length === 1 ? 'row' : 'rows'} will be imported. Rows with problems are skipped. Fix them in your file and upload it again.</Banner>}
          {!verified && <Banner tone="warn">Importing is not available until your cooperative is verified. <Link to="/onboarding/cooperative" className="strong">Review cooperative profile</Link></Banner>}
          <div className="coopa-bulk-scroll">
            <table className="data-table coopa-bulk-table">
              <thead><tr><th>Row</th><th>Name</th><th>NIN</th><th>Phone</th><th>Crop</th><th>Check</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line} className={r.valid ? '' : 'coopa-row-bad'}>
                    <td>{r.line}</td>
                    <td>{r.name || <span className="muted">(missing)</span>}</td>
                    <td className="nowrap">{r.nin ? maskNin(r.nin) : <span className="muted">(missing)</span>}</td>
                    <td className="nowrap">{r.phone || '-'}</td>
                    <td>{r.cropType || '-'}</td>
                    <td>
                      {r.valid ? <StatusPill tone="green"><CheckCircle2 size={14} />Ready</StatusPill> : (
                        <div className="coopa-issues">
                          <StatusPill tone="red"><TriangleAlert size={14} />Fix needed</StatusPill>
                          <ul>{r.errors.map((e) => <li key={e}>{e}</li>)}</ul>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Checkbox checked={consent} onChange={(v) => { setConsent(v); if (v) setConsentError(''); }} error={consentError}>
            I confirm each farmer in this file has agreed to their details being used to verify identity and take part in funded projects.
          </Checkbox>
        </div>
      )}

      {stage === 'done' && summary && (
        <div className="stack">
          <Banner tone="success" title={`${summary.imported} ${summary.imported === 1 ? 'farmer was' : 'farmers were'} imported`}>
            They are listed as Pending. A CollabFarm reviewer will check each identity before they can join a funded project. The import is saved in your audit history.
          </Banner>
          {summary.skipped.length > 0 && (
            <div className="stack-sm">
              <strong className="small">{summary.skipped.length} {summary.skipped.length === 1 ? 'row was' : 'rows were'} skipped</strong>
              <ul className="small coopa-skipped">
                {summary.skipped.map((r) => <li key={r.line}>Row {r.line}{r.name ? ` (${r.name})` : ''}: {r.errors.join(' ')}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
