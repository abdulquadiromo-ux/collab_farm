import { useEffect, useState } from 'react';
import { Button, FileDrop, Modal, SelectField } from '../ui/index.js';
import { simulate } from '../../context/AppContext.jsx';
import { checkUpload, useStableCallback } from './helpers.js';

/**
 * Generic "upload a document" dialog. The file is not sent anywhere: only its name and size are kept in the demo store.
 * `onSubmit(type, file)` does the saving and may return nothing.
 */
export function UploadDocumentModal({ open, onClose, title = 'Upload document', intro, typeLabel = 'Document type', typeOptions, defaultType, lockType = false, submitLabel = 'Upload document', onSubmit }) {
  const [type, setType] = useState(defaultType || typeOptions[0]);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const close = useStableCallback(() => { if (!busy) onClose?.(); });

  useEffect(() => {
    if (open) { setType(defaultType || typeOptions[0]); setFiles([]); setError(''); setBusy(false); }
    // typeOptions is a constant list owned by the caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultType]);

  const pick = (list) => {
    const f = list[0];
    if (!f) { setFiles([]); return; }
    const problem = checkUpload(f);
    if (problem) { setError(problem); setFiles([]); return; }
    setError('');
    setFiles([f]);
  };

  const submit = async () => {
    if (!files[0]) { setError('Choose a file to upload.'); return; }
    setBusy(true);
    await simulate(600);
    await onSubmit?.(type, files[0]);
    setBusy(false);
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      white
      footer={(
        <>
          <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
          <Button onClick={submit} loading={busy}>{submitLabel}</Button>
        </>
      )}
    >
      <div className="stack">
        {intro && <p className="small muted">{intro}</p>}
        <SelectField label={typeLabel} required options={typeOptions} value={type} disabled={lockType} onChange={(e) => setType(e.target.value)} />
        <FileDrop label="File" files={files} onFiles={pick} error={error} accept="JPG, PNG or PDF (Max 5MB)" />
        <p className="caption muted">Uploaded files are marked <strong>Uploaded</strong> until a CollabFarm reviewer checks them. Only then do they become <strong>Verified</strong>.</p>
      </div>
    </Modal>
  );
}
