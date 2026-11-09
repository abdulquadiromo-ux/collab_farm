import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, TriangleAlert, ThumbsUp } from 'lucide-react';
import { Button, Modal, TextAreaField } from '../ui/index.js';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { formatNaira } from '../../utils/format.js';
import { useStableCallback } from './helpers.js';

/**
 * Remove Farmer confirmation (Figma 6164:3376) followed by the success state (6192:12029).
 * Removal is soft: the status becomes 'Removed', the record, agreements and payment history are kept.
 */
export function RemoveFarmerModal({ farmer, open, onClose }) {
  const { update, toast, notify, data } = useApp();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const close = useStableCallback(() => { if (!busy) onClose?.(); });

  useEffect(() => {
    if (open) { setReason(''); setError(''); setBusy(false); setDone(false); }
  }, [open, farmer?.id]);

  if (!farmer) return null;
  const pkg = data.packages.find((p) => p.id === farmer.allocationPackageId);
  const hasAllocation = pkg && farmer.allocatedAmount > 0;

  const confirm = async () => {
    const text = reason.trim();
    if (text.length < 5) { setError('Enter a reason of at least 5 characters. It is saved in the audit history.'); return; }
    setBusy(true);
    await simulate(600);
    update('farmers', farmer.id, { status: 'Removed', membership: 'Ended', removedAt: new Date().toISOString(), removalReason: text }, {
      action: 'Farmer removed', entityType: 'Farmer', summary: `${farmer.name} set to Removed. Record, agreements and payment history are kept.`, reason: text,
    });
    notify('admin', 'Farmer removed by cooperative', `${farmer.name} was removed from the cooperative list. Reason recorded in the audit log.`, '/admin/farmers-farms', 'verification');
    toast(`${farmer.name} was removed from your list. Their records are kept.`, 'success');
    setBusy(false);
    setDone(true);
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
          <h2 id="coopa-removed-title">Farmer removed successfully</h2>
          <p>{farmer.name} has been removed from your list. Their allocation history and records are kept safe and are not deleted.</p>
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
        <p>Are you sure you want to remove <strong>{farmer.name}</strong> from your active farmer list?</p>
        <div className="banner banner--warn" style={{ textAlign: 'left' }}>
          <TriangleAlert size={18} />
          <div>This action will remove the farmer from your list, but their agreements, payment history and records will be kept safe and will not be deleted.</div>
        </div>
        {hasAllocation && (
          <div className="banner banner--info" style={{ textAlign: 'left' }}>
            <TriangleAlert size={18} />
            <div>{farmer.name} has an allocation of {formatNaira(farmer.allocatedAmount)} in {pkg.name}. Removing the farmer does not cancel payments already recorded. Review the allocation on the funding page.</div>
          </div>
        )}
        <div style={{ textAlign: 'left' }}>
          <TextAreaField
            label="Reason for removal"
            required
            rows={3}
            value={reason}
            placeholder="For example: left the cooperative, moved away, duplicate record"
            error={error}
            onChange={(e) => { setReason(e.target.value); if (error) setError(''); }}
          />
        </div>
      </div>
    </Modal>
  );
}
