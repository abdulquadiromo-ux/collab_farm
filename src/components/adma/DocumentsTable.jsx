import { useState } from 'react';
import { BadgeCheck, Flag, FileText, MailQuestion } from 'lucide-react';
import { Button, DataTable } from '../ui/index.js';
import { DocStatusPill, docStatusNote } from './Parts.jsx';
import { ReasonDialog } from './Dialogs.jsx';

/**
 * Documents with "Uploaded" and "Verified" kept visibly apart.
 * docs: [{ id, type, file, status, reviewer, reviewedAt, flagReason, mandatory, missing }]
 * Actions are hidden when canAct is false. onVerify(doc), onFlag(doc, reason), onAsk(doc) for missing documents.
 */
export default function DocumentsTable({ docs, canAct = true, onVerify, onFlag, onAsk }) {
  const [flagging, setFlagging] = useState(null);
  const [busy, setBusy] = useState(null);

  const verify = async (d) => {
    setBusy(d.id);
    try { await onVerify?.(d); } finally { setBusy(null); }
  };

  const columns = [
    {
      key: 'type', header: 'Document',
      render: (d) => (
        <div className="adma-doc">
          <FileText size={18} aria-hidden="true" />
          <div>
            <div className="strong">{d.type}</div>
            <div className="cell-sub">{d.file || 'Nothing uploaded'}{d.mandatory ? ' · Required' : ''}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (d) => (
        <div className="stack-sm" style={{ gap: 4 }}>
          <DocStatusPill status={d.status} />
          <span className="cell-sub">{docStatusNote(d)}</span>
        </div>
      ),
    },
    {
      key: 'actions', header: canAct ? 'Review' : '', align: 'right',
      render: (d) => {
        if (!canAct) return null;
        if (d.missing) {
          return onAsk ? <Button variant="outline" size="sm" onClick={() => onAsk(d)}><MailQuestion size={14} />Ask for it</Button> : null;
        }
        return (
          <div className="row-wrap" style={{ justifyContent: 'flex-end', gap: 8 }}>
            {d.status !== 'Verified' && <Button size="sm" variant="outline-green" loading={busy === d.id} onClick={() => verify(d)} aria-label={`Verify ${d.type}`}><BadgeCheck size={14} />Verify</Button>}
            {d.status !== 'Rejected' && <Button size="sm" variant="danger-outline" onClick={() => setFlagging(d)} aria-label={`Flag ${d.type}`}><Flag size={14} />Flag</Button>}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable bare hideFooter pageSize={50} rows={docs} columns={columns} rowKey="id" emptyTitle="No documents uploaded" emptyText="Documents will appear here once they are uploaded." />
      <ReasonDialog
        open={!!flagging}
        onClose={() => setFlagging(null)}
        tone="amber"
        title="Flag this document"
        message="A flagged document is not accepted. The person is asked to upload a new one. This is not an accusation."
        summary={flagging ? [['Document', flagging.type], ['File', flagging.file || '-']] : null}
        label="What is wrong with it?"
        placeholder="For example: the page is cut off, the name does not match, the date has expired."
        confirmLabel="Flag document"
        onConfirm={async (reason) => { const d = flagging; await onFlag?.(d, reason); setFlagging(null); }}
      />
    </>
  );
}
