import { Link, useNavigate } from 'react-router-dom';
import { Building2, Sprout, Wallet, FileText, ShieldCheck, ArrowRight, Bell, CalendarClock, MessageSquareWarning, LifeBuoy, CheckCircle2, PenLine, Upload, PackageCheck, Wheat, Hourglass, IdCard } from 'lucide-react';
import { Card, CardHeader, PageHeader, Banner, Timeline, EmptyState, LinkButton } from '../../components/ui/index.js';
import { useSimulatedLoad, useApp } from '../../context/AppContext.jsx';
import { formatNaira, formatDate, relativeTime } from '../../utils/format.js';
import { useFarmerCtx, dueText } from '../../components/farm/farmerData.js';
import { farmerGate, BigStat, StatusChip, ProgressRing } from '../../components/farm/FarmUi.jsx';
import '../../styles/pages/farm.css';

const NEXT_ICON = { sign: PenLine, identity: IdCard, wait: Hourglass, moreinfo: Upload, evidence: Upload, inputs: PackageCheck, payment: Wallet, harvest: Wheat, done: CheckCircle2 };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const loading = useSimulatedLoad(350);
  const ctx = useFarmerCtx();
  const gate = farmerGate(ctx, loading);
  if (gate) return gate;
  return <DashboardContent ctx={ctx} />;
}

function DashboardContent({ ctx }) {
  const { update } = useApp();
  const navigate = useNavigate();
  const { firstName, coop, pkg, farm, allocation, agreementStatus, agreementSigned, identityStatus, identityVerified, tasks, notifications, next, season } = ctx;
  const NextIcon = NEXT_ICON[next.key] || ArrowRight;
  const doneCount = tasks.filter((t) => t.status === 'Completed').length;
  const upcoming = tasks.filter((t) => t.status !== 'Completed').slice(0, 3);

  const openNotification = (n) => {
    if (!n.read) update('notifications', n.id, { read: true });
    if (n.link) navigate(n.link);
  };

  return (
    <div className="page farm-page">
      <PageHeader
        greeting
        title={<>{greeting()}, <em>{firstName}</em></>}
        subtitle={`Here is where things stand for the ${season} season.`}
      />

      {!identityVerified && (
        <Banner tone="warn" title="Your ID check is not finished yet">
          <p>This is a quick step. Until it is done, you may not be able to get support.</p>
          <div className="farm-banner-action"><LinkButton to="/farmer/profile?section=identity" variant="outline" className="farm-btn">Finish my ID check</LinkButton></div>
        </Banner>
      )}
      {!agreementSigned && (
        <Banner tone="warn" title="Your agreement is not signed yet">
          <p>Please read it in simple words and sign. It tells you what you will get and what you agree to do.</p>
          <div className="farm-banner-action"><LinkButton to="/farmer/agreement" variant="outline" className="farm-btn">Read and sign</LinkButton></div>
        </Banner>
      )}

      <section className="farm-next" aria-labelledby="next-title">
        <span className="farm-next__icon" aria-hidden="true"><NextIcon size={30} /></span>
        <div className="farm-next__body">
          <p className="farm-next__label">What to do next</p>
          <h2 id="next-title" className="farm-next__title">{next.title}</h2>
          <p className="farm-next__text">{next.text}</p>
        </div>
        <LinkButton to={next.to} size="lg" className="farm-btn farm-next__cta">{next.cta}<ArrowRight size={20} /></LinkButton>
      </section>

      <section aria-label="My status" className="farm-stat-grid farm-stat-grid--5">
        <BigStat to="/farmer/profile" icon={<Building2 size={20} />} label="My cooperative" value={coop?.name || 'Not set'} small
          chip={coop && <StatusChip>{coop.status}</StatusChip>} explain="The group that looks after your farm support." />
        <BigStat to="/farmer/allocation" icon={<Sprout size={20} />} label="My project and season" value={pkg ? pkg.name : 'No project yet'} small
          chip={pkg && <StatusChip>{pkg.status}</StatusChip>} explain={pkg ? `${season}${farm ? `, ${farm.name}` : ''}` : 'You will see your project here once you are allocated support.'} />
        <BigStat to="/farmer/allocation" icon={<Wallet size={20} />} label="Support allocated" value={allocation ? formatNaira(allocation.approved) : 'Nothing yet'}
          chip={allocation && <StatusChip>{allocation.approval}</StatusChip>} explain="All the help set aside for you: items and cash together." />
        <BigStat to="/farmer/agreement" icon={<FileText size={20} />} label="Agreement" value={agreementSigned ? 'Signed' : 'Not signed'}
          chip={<StatusChip tone={agreementSigned ? 'green' : 'amber'}>{agreementStatus}</StatusChip>} explain="Your promise to use support well, and your rights." />
        <BigStat to="/farmer/profile?section=identity" icon={<ShieldCheck size={20} />} label="Identity check" value={identityVerified ? 'Done' : 'Waiting'}
          chip={<StatusChip tone={identityVerified ? 'green' : 'amber'}>{identityStatus}</StatusChip>} explain="Confirms that you are who you say you are." />
      </section>

      <div className="grid-main">
        <Card>
          <CardHeader title="My season" subtitle="Each step is checked by your cooperative before it counts as done." />
          {tasks.length ? (
            <div className="farm-season">
              <ProgressRing done={doneCount} total={tasks.length} label={`Season progress: ${doneCount} of ${tasks.length} steps done`} />
              <div className="farm-season__steps">
                <Timeline items={tasks.map((t) => ({
                  title: t.title,
                  meta: t.status === 'Completed' ? 'Done' : `${t.status}. ${dueText(t.dueDate)}`,
                  state: t.status === 'Completed' ? 'done' : t.status === 'Delayed' ? 'bad' : t.status === 'In Progress' || t.status === 'More information needed' ? 'active' : undefined,
                }))} />
              </div>
            </div>
          ) : (
            <EmptyState icon={<Sprout size={28} />} title="No season steps yet">Your steps appear here once your cooperative allocates support to you.</EmptyState>
          )}
        </Card>

        <Card>
          <CardHeader title="Coming up" action={<Link to="/farmer/activities" className="farm-link">All activities</Link>} />
          {upcoming.length ? (
            <ul className="farm-plain-list">
              {upcoming.map((t) => (
                <li key={t.key}>
                  <Link to={`/farmer/activities?task=${t.key}`} className="farm-row-link">
                    <span className="farm-row-link__icon"><CalendarClock size={20} /></span>
                    <span className="farm-row-link__text">
                      <strong>{t.title}</strong>
                      <span className="muted small">{t.dueDate ? `${dueText(t.dueDate)} (${formatDate(t.dueDate)})` : 'No date set'}</span>
                      <span className="farm-row-link__chip"><StatusChip>{t.status}</StatusChip></span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<CheckCircle2 size={28} />} title="Nothing coming up">All your steps are done for now.</EmptyState>
          )}
        </Card>
      </div>

      <div className="grid-main">
        <Card>
          <CardHeader title="Latest messages" action={<Link to="/farmer/notifications" className="farm-link">See all</Link>} />
          {notifications.length ? (
            <ul className="farm-plain-list">
              {notifications.slice(0, 3).map((n) => (
                <li key={n.id}>
                  <button type="button" className="farm-row-link farm-row-link--button" onClick={() => openNotification(n)}>
                    <span className="farm-row-link__icon"><Bell size={20} /></span>
                    <span className="farm-row-link__text">
                      <strong>{n.title}{!n.read && <span className="farm-new">New</span>}</strong>
                      <span className="muted small">{n.message}</span>
                      <span className="muted caption">{relativeTime(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Bell size={28} />} title="No messages yet">We will tell you here when something changes.</EmptyState>
          )}
        </Card>

        <Card tone="tint">
          <CardHeader title="Need help?" />
          <p className="small">If something is late, missing or does not look right, tell us. You will not get in trouble for asking.</p>
          <div className="farm-actions farm-actions--stack">
            <LinkButton to="/farmer/report-issue" className="farm-btn"><MessageSquareWarning size={18} />Report an issue</LinkButton>
            <LinkButton to="/farmer/help" variant="outline-green" className="farm-btn"><LifeBuoy size={18} />Help and support</LinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}
