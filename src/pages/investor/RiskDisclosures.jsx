import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertOctagon, CheckCircle2, CloudRain, Clock, Download, Landmark, LineChart, Lock, ShieldAlert, ShieldOff, TrendingDown } from 'lucide-react';
import { Banner, Button, Card, CardHeader, Checkbox, InfoList, Modal, PageSkeleton, StatusPill } from '../../components/ui/index.js';
import { simulate, useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatDate } from '../../utils/format.js';
import { useInvestor } from '../../components/inv/useInvestor.js';
import { MissingRecord } from '../../components/inv/Common.jsx';
import { RISK_ITEMS, RISK_VERSION, downloadText, isoDay, nowIso } from '../../components/inv/invData.js';
import '../../styles/pages/inv.css';

const ICONS = { loss: TrendingDown, crop: CloudRain, price: LineChart, delay: Clock, default: AlertOctagon, guarantee: ShieldOff, liquidity: Lock, custody: Landmark };

function AckForm({ first, onClose }) {
  const { investor, update, toast } = useInvestor();
  const [ticked, setTicked] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!ticked) { setError('Tick the box to confirm you have read and understood the risks.'); return; }
    setSaving(true);
    try {
      await simulate(700);
      const at = nowIso();
      update('investors', investor.id, { riskAcknowledged: true, riskAckAt: at, riskAckVersion: RISK_VERSION }, {
        action: first ? 'Risk disclosure acknowledged' : 'Risk disclosure re-acknowledged',
        entityType: 'Investor',
        summary: `${investor.name} ${first ? 'acknowledged' : 're-acknowledged'} risk disclosure ${RISK_VERSION}`,
        reason: 'Investor confirmation',
      });
      toast(first ? 'Risk acknowledgement recorded.' : 'Risk acknowledgement renewed.', 'success');
      onClose();
    } catch {
      setSaving(false);
      toast('We could not record your acknowledgement. Nothing was changed. Please try again.', 'error');
    }
  };

  return (
    <form onSubmit={submit} className="stack" noValidate>
      <p className="small muted">You are confirming the eight risks on this page, version {RISK_VERSION}. Your confirmation is recorded with the date and time.</p>
      <ul className="stack-sm small" style={{ margin: 0, paddingLeft: 20 }}>
        {RISK_ITEMS.map((r) => <li key={r.id}>{r.title}</li>)}
      </ul>
      <Checkbox checked={ticked} onChange={(v) => { setTicked(v); setError(''); }} error={error}>
        I have read the risk disclosure above. I understand I can lose some or all of my money, that returns are estimates and not guarantees, and that CollabFarm does not hold my money.
      </Checkbox>
      <div className="modal__foot">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" loading={saving}>{first ? 'Record acknowledgement' : 'Re-acknowledge'}</Button>
      </div>
    </form>
  );
}

export default function RiskDisclosures() {
  return <Navigate to="/investor/contracts?section=risks" replace />;
}

export function RiskDisclosuresPanel() {
  const loading = useSimulatedLoad(350);
  const { data, investor } = useInvestor();
  const [open, setOpen] = useState(false);
  const pending = data.platformSettings?.pendingDecisions || [];

  // The record comes from the investor record and the audit trail, so it is never invented.
  const lastAudit = useMemo(() => data.audit.find((a) => a.entityId === investor?.id && /risk disclosure/i.test(a.action || '')), [data.audit, investor]);
  if (loading) return <PageSkeleton />;
  if (!investor) return <MissingRecord title="Investor record not found" text="We could not find your investor record. Please sign in again." to="/login" label="Go to sign in" />;

  const acked = investor.riskAcknowledged === true;
  const ackAt = investor.riskAckAt || lastAudit?.at || null;
  const download = () => downloadText('collabfarm-risk-disclosure.txt', [
    `CollabFarm Finance. Investor risk disclosure ${RISK_VERSION}`,
    'Sample demo content. Not legal advice.',
    '',
    ...RISK_ITEMS.flatMap((r, i) => [`${i + 1}. ${r.title}`, r.detail, `You confirm: ${r.short}`, '']),
  ].join('\n'));

  return (
    <div className="stack-lg">
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="outline-green" onClick={download}><Download size={16} />Download as text</Button>
      </div>
      <Banner tone="warn" title="Investing in farming can lose you money">
        You can lose some or all of the money you put in. Expected returns are estimates and are not guaranteed. A package being approved does not mean it will succeed.
      </Banner>

      <div className="grid-main inv-grid">
        <Card>
          <CardHeader title="The risks, one by one" subtitle={`Version ${RISK_VERSION}. Each point is something you confirm before you commit.`} />
          <div>
            {RISK_ITEMS.map((r) => {
              const Icon = ICONS[r.id] || ShieldAlert;
              return (
                <section key={r.id} className="inv-risk-card" aria-labelledby={`risk-${r.id}`}>
                  <span className="inv-risk-card__icon"><Icon size={20} aria-hidden="true" /></span>
                  <div>
                    <h3 id={`risk-${r.id}`} className="strong" style={{ margin: 0 }}>{r.title}</h3>
                    <p className="small" style={{ margin: '4px 0 6px' }}>{r.detail}</p>
                    <p className="caption muted" style={{ margin: 0 }}>You confirm: {r.short}</p>
                  </div>
                </section>
              );
            })}
          </div>
        </Card>

        <div className="stack">
          <Card>
            <CardHeader title="Your acknowledgement" subtitle="Needed before you can commit to a package." />
            <InfoList compact items={[
              ['Status', <StatusPill key="s" tone={acked ? 'green' : 'amber'}>{acked ? 'Acknowledged' : 'Not yet acknowledged'}</StatusPill>],
              ['Disclosure version', acked ? (investor.riskAckVersion || RISK_VERSION) : '-'],
              ['Recorded on', acked ? (ackAt ? formatDate(isoDay(ackAt)) : 'At sign-up') : '-'],
              ['Recorded for', investor.name],
            ]} />
            <div style={{ marginTop: 'var(--s-4)' }}>
              <Button onClick={() => setOpen(true)} variant={acked ? 'outline-green' : 'primary'} block>
                <CheckCircle2 size={16} />{acked ? 'Re-acknowledge risks' : 'Acknowledge risks'}
              </Button>
            </div>
            <p className="caption muted" style={{ margin: 'var(--s-3) 0 0' }}>You also tick each risk again when you sign an investment agreement, so every commitment has its own record.</p>
          </Card>

          <Card>
            <CardHeader title="Decisions still to be confirmed" subtitle="Wording can change after these are settled." />
            {pending.length ? (
              <>
                <ul className="stack-sm small" style={{ margin: 0, paddingLeft: 20 }}>
                  {pending.map((p) => <li key={p}>{p}</li>)}
                </ul>
                <p className="caption muted" style={{ margin: 'var(--s-3) 0 0' }}>These points are not final. If one changes in a way that affects you, you will be told and asked to read the agreement again.</p>
              </>
            ) : (
              <p className="small muted" style={{ margin: 0 }}>No open decisions are listed at the moment.</p>
            )}
          </Card>

        </div>
      </div>

      <div className="inv-rules">
        <div className="inv-rule"><strong>Missed payments are reviewed</strong>A late or missed payment is looked at under your agreement. It is not treated as fraud on its own.</div>
        <div className="inv-rule"><strong>Crop failure is assessed on evidence</strong>A genuine crop failure is judged on the evidence and the signed agreement. It is not fraud.</div>
        <div className="inv-rule"><strong>Money is confirmed by the partner</strong>Funds count as received only when the regulated financial partner confirms them.</div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={acked ? 'Re-acknowledge risks' : 'Acknowledge risks'}>
        {open && <AckForm first={!acked} onClose={() => setOpen(false)} />}
      </Modal>
    </div>
  );
}
