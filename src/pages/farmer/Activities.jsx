import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Camera, MapPin, MessageSquareText, FilePlus2, Wheat, Sprout } from 'lucide-react';
import { Card, CardHeader, PageHeader, EmptyState, Button, LinkButton } from '../../components/ui/index.js';
import { useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatDate, formatDateTime } from '../../utils/format.js';
import { useFarmerCtx, dueText } from '../../components/farm/farmerData.js';
import { farmerGate, StatusChip, ItemCard, Explain } from '../../components/farm/FarmUi.jsx';
import ProgressReportForm from '../../components/farm/ProgressReportForm.jsx';
import '../../styles/pages/farm.css';

export default function Activities() {
  const loading = useSimulatedLoad(350);
  const ctx = useFarmerCtx();
  const gate = farmerGate(ctx, loading);
  if (gate) return gate;
  return <ActivitiesContent ctx={ctx} />;
}

const REPORT_LABEL = { Submitted: 'Submitted', 'Under Review': 'Under review', 'Under review': 'Under review', Accepted: 'Accepted', 'More information needed': 'More information needed' };

function ActivitiesContent({ ctx }) {
  const { tasks, reports, pkg } = ctx;
  const [params, setParams] = useSearchParams();
  const [preset, setPreset] = useState(null);

  const jump = (id) => window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);

  // Deep links: ?task=<key> opens the form for that activity. ?report=<id> opens it to add information to a report.
  useEffect(() => {
    const t = params.get('task');
    const r = params.get('report');
    if (t && tasks.some((x) => x.key === t)) {
      setPreset({ key: t, note: '', nonce: Date.now() });
      jump('send-report');
    } else if (r) {
      const rep = reports.find((x) => x.id === r);
      if (rep) {
        const task = tasks.find((x) => x.milestone?.id === rep.milestoneId);
        setPreset({ key: task?.key, note: 'More information: ', nonce: Date.now() });
        jump('send-report');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const startReport = (key, note = '') => {
    setPreset({ key, note, nonce: Date.now() });
    if (params.get('task') || params.get('report')) setParams({}, { replace: true });
    jump('send-report');
  };

  if (!pkg) {
    return (
      <div className="page farm-page">
        <PageHeader title="Activities" subtitle="Your farm tasks and how to report them." />
        <Card>
          <EmptyState icon={<Sprout size={28} />} title="No activities yet" action={<LinkButton to="/farmer/allocation" variant="outline-green" className="farm-btn">See my allocation</LinkButton>}>
            Your tasks appear here once your cooperative allocates support to you.
          </EmptyState>
        </Card>
      </div>
    );
  }

  const done = tasks.filter((t) => t.status === 'Completed').length;

  return (
    <div className="page farm-page">
      <PageHeader title="Activities" subtitle={`${done} of ${tasks.length} steps done this season.`} actions={<Button className="farm-btn" onClick={() => startReport(tasks.find((t) => t.status !== 'Completed')?.key || tasks[0]?.key)}><FilePlus2 size={18} />Send a report</Button>} />

      <section aria-labelledby="act-title" className="stack">
        <h2 id="act-title" className="farm-section-title"><ClipboardList size={22} aria-hidden="true" />My activities</h2>
        <Explain>Each activity is linked to a step your cooperative must show to get the next part of the project money.</Explain>
        <ul className="farm-list">
          {tasks.map((t, i) => (
            <ItemCard
              key={t.key}
              icon={t.key === 'harvest' ? <Wheat size={22} /> : <span className="farm-num">{i + 1}</span>}
              title={t.title}
              meta={t.dueDate ? (t.status === 'Completed' ? `Done. The due date was ${formatDate(t.dueDate)}` : `${dueText(t.dueDate)}. ${formatDate(t.dueDate)}`) : 'No date set'}
              chip={<StatusChip>{t.status}</StatusChip>}
              tone={t.status === 'Delayed' || t.status === 'More information needed' ? 'attention' : undefined}
              actions={t.status === 'Completed'
                ? null
                : t.key === 'harvest'
                  ? <LinkButton to="/farmer/harvest" className="farm-btn"><Wheat size={18} />Report harvest</LinkButton>
                  : <Button className="farm-btn" onClick={() => startReport(t.key)}><Camera size={18} />Send progress report</Button>}
            >
              <p>{t.detail}</p>
              {t.milestone && <p className="muted small">Cooperative step: {t.milestone.title} ({t.milestone.status})</p>}
              {t.reports.length > 0 && <p className="small"><strong>{t.reports.length}</strong> {t.reports.length === 1 ? 'report' : 'reports'} sent. Latest: <StatusChip>{REPORT_LABEL[t.latest.status] || t.latest.status}</StatusChip></p>}
            </ItemCard>
          ))}
        </ul>
      </section>

      <ProgressReportForm ctx={ctx} preset={preset} onSent={() => jump('my-reports')} />

      <section id="my-reports" aria-labelledby="rep-title" className="stack farm-scroll-target">
        <h2 id="rep-title" className="farm-section-title"><MessageSquareText size={22} aria-hidden="true" />My reports</h2>
        {reports.length === 0 ? (
          <Card>
            <EmptyState icon={<Camera size={28} />} title="You have not sent a report yet">When you send one, it shows here with its status and any feedback from your cooperative.</EmptyState>
          </Card>
        ) : (
          <ul className="farm-list">
            {reports.map((r) => (
              <ItemCard
                key={r.id}
                title={r.activity}
                meta={r.submittedAt ? `Sent ${formatDateTime(r.submittedAt)}` : 'Sent'}
                chip={<StatusChip>{REPORT_LABEL[r.status] || r.status}</StatusChip>}
                tone={r.status === 'More information needed' ? 'attention' : undefined}
                actions={r.status === 'More information needed'
                  ? <Button className="farm-btn" onClick={() => startReport(ctx.tasks.find((x) => x.milestone?.id === r.milestoneId)?.key, 'More information: ')}><FilePlus2 size={18} />Add more information</Button>
                  : null}
              >
                {r.note && <p>{r.note}</p>}
                <p className="muted small">
                  {r.photos.length ? <><Camera size={14} aria-hidden="true" /> {r.photos.length} {r.photos.length === 1 ? 'photo' : 'photos'}. </> : 'No photo. '}
                  {r.gps ? <><MapPin size={14} aria-hidden="true" /> {r.gps}</> : null}
                </p>
                <details className="farm-details">
                  <summary>See feedback</summary>
                  {r.feedback
                    ? <p><strong>{r.feedbackBy || 'Your cooperative'}:</strong> {r.feedback}</p>
                    : <p className="muted">No feedback yet. Your cooperative will reply here.</p>}
                </details>
              </ItemCard>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
