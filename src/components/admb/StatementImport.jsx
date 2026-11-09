import { useState } from 'react';
import { Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useApp, simulate } from '../../context/AppContext.jsx';
import { Modal, Button, Banner, EmptyState, StatusPill } from '../ui/index.js';
import { formatNaira } from '../../utils/format.js';
import { confirmReconciliation, appendNote, nowIso, pkgName } from './lib.js';

// Simulation only. No file is read and nothing is sent. It builds a few sample provider lines from open items
// and auto-matches them, so the reconciliation workflow can be demonstrated without a real bank feed.
export default function StatementImport({ open, onClose }) {
  const ctx = useApp();
  const { data, user, update, audit, toast } = ctx;
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const candidates = data.reconciliation.filter((r) => ['Pending', 'Under Reconciliation'].includes(r.status) && !r.statementImportedAt && !r.exception).slice(0, 4);
  const lines = candidates.map((r) => ({
    rec: r,
    providerRef: r.providerRef || `PRV-${String(r.ref).replace(/\D/g, '').slice(-5).padStart(5, '0')}`,
    amount: r.provider > 0 ? r.provider : r.internal,
  }));

  const close = () => { if (busy) return; setResult(null); onClose(); };

  const run = async () => {
    setBusy(true);
    await simulate(900);
    const matched = []; const review = [];
    lines.forEach((l) => {
      const patch = { providerRef: l.providerRef, provider: l.amount, statementImportedAt: nowIso() };
      if (l.amount === l.rec.internal) {
        confirmReconciliation(ctx, { ...l.rec, ...patch }, { actor: 'System (simulated statement)', patch, auto: true, note: '' });
        matched.push(l);
      } else {
        update('reconciliation', l.rec.id, { ...patch, status: 'Under Reconciliation', note: appendNote(l.rec.note, `Simulated statement line received for ${formatNaira(l.amount)}. It does not match our records and needs review.`, 'System') }, {
          action: 'Statement line needs review (simulated)', entityType: 'Reconciliation', summary: `${l.rec.ref}: partner ${formatNaira(l.amount)}, our records ${formatNaira(l.rec.internal)}`, reason: 'Simulated statement import',
        });
        review.push(l);
      }
    });
    audit({ action: 'Simulated partner statement imported', entityType: 'Reconciliation', summary: `${lines.length} sample lines. ${matched.length} auto-matched, ${review.length} need review.`, reason: `Demo only, imported by ${user.name}` });
    setResult({ matched, review });
    setBusy(false);
    toast(`Simulated import done: ${matched.length} matched, ${review.length} need review.`, 'info');
  };

  return (
    <Modal open={open} onClose={close} title="Import partner statement (simulation)" wide white>
      <div className="stack">
        <Banner tone="warn" title="This is a simulation">No file is uploaded and no bank is contacted. Sample partner lines are generated from open items so you can see how matching works. In the real product the financial partner supplies the statement.</Banner>
        {!result && lines.length === 0 && <EmptyState title="Nothing left to match">Every open item has already had a statement line, has an exception, or is confirmed.</EmptyState>}
        {!result && lines.length > 0 && (
          <>
            <p className="small muted">These sample lines would be read from the statement. Exact matches are confirmed automatically. Anything that differs stays open for you to review.</p>
            <div className="table-wrap">
              <table className="admb-mini-table">
                <thead><tr><th>Partner ref</th><th>Our reference</th><th>Project</th><th>Partner line</th><th>Our records</th><th>Result</th></tr></thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.rec.id}>
                      <td className="admb-nowrap">{l.providerRef}</td>
                      <td className="admb-nowrap">{l.rec.ref}</td>
                      <td>{pkgName(data, l.rec.packageId)}</td>
                      <td className="admb-mono">{formatNaira(l.amount)}</td>
                      <td className="admb-mono">{formatNaira(l.rec.internal)}</td>
                      <td>{l.amount === l.rec.internal ? <span className="admb-diff admb-diff--ok"><CheckCircle2 size={14} /> Will match</span> : <span className="admb-diff"><AlertTriangle size={14} /> Difference {formatNaira(Math.abs(l.rec.internal - l.amount))}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row-wrap">
              <Button onClick={run} loading={busy}><Upload size={18} />Import and auto-match</Button>
              <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
            </div>
          </>
        )}
        {result && (
          <>
            <Banner tone="success" title="Simulated import finished">{result.matched.length} line{result.matched.length === 1 ? '' : 's'} matched and confirmed by the system. {result.review.length} line{result.review.length === 1 ? '' : 's'} need your review.</Banner>
            <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {result.matched.map((l) => (<li key={l.rec.id} className="row between small"><span>{l.rec.ref} ({pkgName(data, l.rec.packageId)})</span><StatusPill tone="green">Confirmed</StatusPill></li>))}
              {result.review.map((l) => (<li key={l.rec.id} className="row between small"><span>{l.rec.ref} ({pkgName(data, l.rec.packageId)}), difference {formatNaira(Math.abs(l.rec.internal - l.amount))}</span><StatusPill tone="amber">Needs review</StatusPill></li>))}
            </ul>
            <Button onClick={close}>Close</Button>
          </>
        )}
      </div>
    </Modal>
  );
}
