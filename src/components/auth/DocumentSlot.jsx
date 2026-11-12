import { useState } from 'react';
import { FileDrop, StatusPill } from '../ui/index.js';
import { checkFile } from './authUtils.js';

// One document upload. Keep the selected file object in the active form so it can be submitted to the API.
export default function DocumentSlot({ label, hint, required, doc, onChange, error, accept, uploadedStatus = 'Uploaded' }) {
  const [localError, setLocalError] = useState('');
  const files = doc?.file ? [{ name: doc.file, size: doc.size }] : [];
  return (
    <div className="auth-doc" role="group" aria-label={label}>
      <div className="auth-doc__head">
        <span className="field__label">
          {label}
          {required ? <span className="req" aria-hidden="true">*</span> : <span className="opt">(Optional)</span>}
        </span>
        {doc?.file && <StatusPill>{doc.status || uploadedStatus}</StatusPill>}
      </div>
      {hint && <span className="field__hint">{hint}</span>}
      <FileDrop
        includeFile
        files={files}
        accept={accept || 'PDF, JPG or PNG (Max 5MB)'}
        error={localError || error}
        onFiles={(arr) => {
          if (!arr.length) { setLocalError(''); onChange(null); return; }
          const problem = checkFile(arr[0]);
          if (problem) { setLocalError(problem); return; }
          setLocalError('');
          // A new file starts in the supplied pending state. Only a reviewer can mark it Verified.
          onChange({ ...(doc || {}), file: arr[0].name, fileObject: arr[0].file || arr[0], size: arr[0].size, status: uploadedStatus, reviewer: null, reviewedAt: null });
        }}
      />
    </div>
  );
}
