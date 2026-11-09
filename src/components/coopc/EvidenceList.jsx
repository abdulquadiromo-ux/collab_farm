import { FileText, Camera, MapPin, ShieldCheck } from 'lucide-react';
import { StatusPill } from '../ui/index.js';
import { formatDate } from '../../utils/format.js';
import { isSupportingOnly } from './helpers.js';

// Evidence items for a milestone. Uploaded and verified are shown as separate states (PRD 6.4 and 8).
// Photos and GPS are flagged as supporting, not conclusive.
export default function EvidenceList({ items, fallbackBy, fallbackDate }) {
  return (
    <ul className="coopc-ev-list">
      {items.map((ev) => {
        const supporting = isSupportingOnly(ev);
        const Icon = /photo/i.test(ev.type || '') || /\.(jpe?g|png|gif|heic|webp)$/i.test(ev.name || '') ? Camera : ev.gps && !ev.name ? MapPin : FileText;
        return (
          <li className="coopc-ev" key={ev.id}>
            <span className="coopc-ev__icon"><Icon size={20} /></span>
            <div>
              <div className="coopc-ev__name">{ev.name}</div>
              <div className="cell-sub">{ev.type}</div>
              <div className="cell-sub">Uploaded by {ev.uploadedBy || fallbackBy || 'Cooperative'} on {formatDate(ev.uploadedAt || fallbackDate)}</div>
              {ev.gps && <div className="cell-sub"><MapPin size={12} style={{ verticalAlign: '-1px' }} /> GPS point {ev.gps}</div>}
              {ev.notes && <div className="small" style={{ marginTop: 4 }}>{ev.notes}</div>}
              {supporting && <div className="caption muted" style={{ marginTop: 4 }}>Supporting evidence only. Photos and GPS points help a reviewer but do not prove a claim on their own.</div>}
            </div>
            <div className="coopc-ev__tags">
              {ev.verified
                ? <StatusPill tone="green"><ShieldCheck size={14} />Verified</StatusPill>
                : <StatusPill tone="gray">Uploaded, not yet verified</StatusPill>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
