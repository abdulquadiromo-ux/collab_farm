import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, TriangleAlert, ThumbsUp } from 'lucide-react';
import { Button, Modal } from '../ui/index.js';
import { useApp } from '../../context/AppContext.jsx';
import { useStableCallback } from './helpers.js';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';

/**
 * Remove Farmer confirmation (Figma 6164:3376) followed by the success state (6192:12029).
 * Deletes the farmer through the authenticated farmer API.
 */
export function RemoveFarmerModal({ farmer, open, onClose, onRemoved }) {
  const { toast, accessToken } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [requestError, setRequestError] = useState('');
  const close = useStableCallback(() => { if (!busy) onClose?.(); });

  useEffect(() => {
    if (open) { setBusy(false); setDone(false); setRequestError(''); }
  }, [open, farmer?.id]);

  if (!farmer) return null;
  const confirm = async () => {
    if (!accessToken) { setRequestError('Your session has expired. Sign in again to delete this farmer.'); return; }
    setBusy(true);
    setRequestError('');
    try {
      const response = await fetch(`${API_BASE_URL}/farmers/${encodeURIComponent(farmer.id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not remove farmer (${response.status}).`));
      toast(`${farmer.name} was deleted.`, 'success');
      onRemoved?.();
      setBusy(false);
      setDone(true);
    } catch (error) { setRequestError(error.message || 'Could not remove farmer.'); setBusy(false); }
  };

  if (done) {
    return (
      <Modal
        open={open}
        onClose={close}
        labelledBy="coopa-removed-title"
        footer={(
          <>
            <Button variant="outline" onClick={close}>Close</Button>
            <Button onClick={() => { onClose?.(); navigate('/coop/farmers'); }}>Back to Farmers</Button>
          </>
        )}
      >
        <div className="modal__icon modal__icon--green"><ThumbsUp size={26} /></div>
        <div className="modal__body">
        <h2 id="coopa-removed-title">Farmer deleted</h2>
          <p>{farmer.name} was deleted from the directory.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      labelledBy="coopa-remove-title"
      footer={(
        <>
          <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={confirm} loading={busy}>Remove Farmer</Button>
        </>
      )}
    >
      <div className="modal__icon modal__icon--red"><Trash2 size={26} /></div>
      <div className="modal__body">
        <h2 id="coopa-remove-title">Remove Farmer?</h2>
        <p>Are you sure you want to delete <strong>{farmer.name}</strong> from your farmer directory? This action cannot be undone.</p>
        <div className="banner banner--warn" style={{ textAlign: 'left' }}>
          <TriangleAlert size={18} />
          <div>Deleting this farmer removes their directory record.</div>
        </div>
        {requestError && <p className="field-error" role="alert">{requestError}</p>}
      </div>
    </Modal>
  );
}
