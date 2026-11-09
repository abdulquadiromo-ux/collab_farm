import { Modal, StatusPill, Avatar } from '../ui/index.js';

// Detail modal in the Figma style: title, close X in a grey circle, a person or item card with a status pill,
// then a bordered information table. `rows` is [label, value][]. Used for disbursements, harvests, sales and obligations.
export default function DetailModal({ open, onClose, title, name, sub, status, sectionTitle, rows, footer, children }) {
  return (
    <Modal open={open} onClose={onClose} title={title} white footer={footer}>
      <div className="coopc-stack">
        <div className="coopc-card coopc-person">
          <Avatar name={name || ''} />
          <div className="grow">
            <div className="strong">{name}</div>
            {sub && <div className="cell-sub">{sub}</div>}
          </div>
          {status && <StatusPill>{status}</StatusPill>}
        </div>
        <div className="coopc-card coopc-info">
          <h3 className="coopc-info__title">{sectionTitle}</h3>
          <dl className="info-list info-list--compact">
            {rows.map(([k, v]) => (
              <div className="info-row" key={k}>
                <dt>{k}</dt>
                <dd>{v ?? '-'}</dd>
              </div>
            ))}
          </dl>
        </div>
        {children}
      </div>
    </Modal>
  );
}
