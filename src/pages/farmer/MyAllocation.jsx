import { Link } from 'react-router-dom';
import { Package, HandCoins, Hourglass, CalendarDays, Boxes, Banknote, ShieldCheck, FileText, Receipt, Sprout, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, PageHeader, Banner, InfoList, Progress, EmptyState, LinkButton } from '../../components/ui/index.js';
import { useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatNaira, formatDate, formatNumber } from '../../utils/format.js';
import { useFarmerCtx } from '../../components/farm/farmerData.js';
import { farmerGate, BigStat, StatusChip, Explain } from '../../components/farm/FarmUi.jsx';
import '../../styles/pages/farm.css';

export default function MyAllocation() {
  const loading = useSimulatedLoad(350);
  const ctx = useFarmerCtx();
  const gate = farmerGate(ctx, loading);
  if (gate) return gate;
  return <AllocationContent ctx={ctx} />;
}

function AllocationContent({ ctx }) {
  const { allocation, pkg, coop, payments } = ctx;

  if (!allocation) {
    return (
      <div className="page farm-page">
        <PageHeader title="My Allocation" subtitle="The help set aside for you in this project." />
        <Card>
          <EmptyState
            icon={<Sprout size={28} />}
            title="Nothing is allocated to you yet"
            action={<LinkButton to="/farmer/help" variant="outline-green" className="farm-btn">Ask a question</LinkButton>}
          >
            Your cooperative will allocate support to you once the project is funded. When that happens you will see your package, your amount and your dates here. We will also send you a message.
          </EmptyState>
        </Card>
        <HowYouArePaid coop={coop} />
      </div>
    );
  }

  const cashPayments = payments.filter((p) => p.packageId === pkg.id);
  const hasCash = allocation.cashPlanned > 0;
  const hasItems = allocation.items.length > 0;

  return (
    <div className="page farm-page">
      <PageHeader title="My Allocation" subtitle="The help set aside for you in this project." actions={<LinkButton to="/farmer/inputs-payments" variant="outline-green" className="farm-btn"><Receipt size={18} />Inputs and payments</LinkButton>} />

      <Card className="farm-hero-card">
        <div className="farm-hero-card__top">
          <span className="farm-item__icon" aria-hidden="true"><Package size={24} /></span>
          <div className="grow">
            <p className="muted small">My package</p>
            <h2 className="farm-hero-card__title">{pkg.name}</h2>
            <p className="muted small">{pkg.tier ? `${pkg.tier} package. ` : ''}{pkg.category}. {ctx.season}.</p>
          </div>
          <StatusChip>{allocation.approval}</StatusChip>
        </div>
        <div className="farm-hero-card__meter">
          <div className="row between">
            <strong>{formatNaira(allocation.delivered)} of {formatNaira(allocation.approved)} given so far</strong>
            <span className="muted small">{allocation.pct}%</span>
          </div>
          <Progress value={allocation.pct} label="Share of your approved support given so far" />
        </div>
        <Explain>Approval means your cooperative and CollabFarm agreed the plan. It is not a promise that the crop will do well.</Explain>
      </Card>

      <section className="farm-stat-grid farm-stat-grid--4" aria-label="My numbers">
        <BigStat icon={<HandCoins size={20} />} label="Amount approved" value={formatNaira(allocation.approved)} explain="The most support you can get in this project." />
        <BigStat icon={<Boxes size={20} />} label="Given or paid so far" value={formatNaira(allocation.delivered)} explain="Items delivered to you plus cash already paid." />
        <BigStat icon={<Hourglass size={20} />} label="Outstanding balance" value={formatNaira(allocation.outstanding)} explain="The part still to come to you. It is not a debt." tone="gold" />
        <BigStat icon={<CalendarDays size={20} />} label="Expected date" value={allocation.expectedDate ? formatDate(allocation.expectedDate) : 'To be set'} small explain={allocation.expectedStage ? `Linked to: ${allocation.expectedStage}.` : 'Your cooperative will tell you the date.'} />
      </section>

      <div className="grid-main">
        <Card>
          <CardHeader title="Details" subtitle="What this package is for." />
          <InfoList items={[
            ['Package', `${pkg.name} (${pkg.status})`],
            ['What it is for', allocation.purpose],
            ['Type of support', hasItems && hasCash ? 'Items and cash' : hasItems ? 'Items only' : 'Cash only'],
            ['Expected date', allocation.expectedDate ? formatDate(allocation.expectedDate) : 'To be set'],
            ['Approval', <StatusChip key="a">{allocation.approval}</StatusChip>],
            ['Cooperative', coop?.name],
          ]} />
        </Card>

        <Card tone="tint">
          <CardHeader title="What each number means" />
          <dl className="farm-glossary">
            <div><dt>Amount approved</dt><dd>The most help you can get. It is the value of your items plus your cash support.</dd></div>
            <div><dt>Given or paid so far</dt><dd>Items that were delivered, plus cash that the financial partner has paid.</dd></div>
            <div><dt>Outstanding balance</dt><dd>Approved amount minus what you already got. This is what is still to come to you.</dd></div>
            <div><dt>Items (in kind)</dt><dd>Things given to you, like seeds and fertiliser, instead of money.</dd></div>
            <div><dt>Cash support</dt><dd>Money paid to you for labour and farm costs.</dd></div>
          </dl>
        </Card>
      </div>

      <div className="grid-2">
        <Card>
          <CardHeader title="Items I receive" subtitle="Given to you as things, not cash." />
          {hasItems ? (
            <>
              <ul className="farm-mini-list">
                {allocation.items.map((i) => (
                  <li key={i.id}>
                    <div>
                      <strong>{i.item}</strong>
                      <span className="muted small">{formatNumber(i.qty)} {i.unit}. Worth {formatNaira(i.cost)}</span>
                    </div>
                    <StatusChip tone={i.delivered || i.farmerConfirmed ? 'green' : 'amber'}>{i.farmerConfirmed ? 'You confirmed' : i.delivered ? 'Delivered' : 'On the way'}</StatusChip>
                  </li>
                ))}
              </ul>
              <div className="farm-total"><span>Items total</span><strong>{formatNaira(allocation.inKindValue)}</strong></div>
            </>
          ) : (
            <p className="muted">No items have been listed for you yet.</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Cash support" subtitle="Money for labour and farm costs." />
          {hasCash ? (
            <>
              <InfoList compact items={[
                ['Approved cash', formatNaira(allocation.cashPlanned)],
                ['Paid so far', formatNaira(allocation.cashPaid)],
                ['Still to come', formatNaira(Math.max(0, allocation.cashPlanned - allocation.cashPaid))],
              ]} />
              <Explain>Cash is paid in steps. Each step is released only after your cooperative shows that the farm work was done.</Explain>
              {cashPayments.length > 0 && <Link to="/farmer/inputs-payments" className="farm-link">See my payments ({cashPayments.length})</Link>}
            </>
          ) : (
            <p className="muted">No cash support is planned for you.</p>
          )}
        </Card>
      </div>

      <HowYouArePaid coop={coop} />

      <Card>
        <CardHeader title="More about my support" />
        <div className="farm-actions">
          <LinkButton to="/farmer/agreement" variant="outline-green" className="farm-btn"><FileText size={18} />My agreement</LinkButton>
          <LinkButton to="/farmer/activities" variant="outline-green" className="farm-btn"><Sprout size={18} />My activities</LinkButton>
          <LinkButton to="/farmer/report-issue?category=Payment" variant="outline-green" className="farm-btn"><AlertTriangle size={18} />Something is wrong</LinkButton>
        </div>
      </Card>
    </div>
  );
}

function HowYouArePaid({ coop }) {
  return (
    <Card>
      <CardHeader title="How you are paid" />
      <ul className="farm-bullets">
        <li><Banknote size={20} aria-hidden="true" /><span>Support goes through <strong>{coop?.name || 'your cooperative'}</strong> and the financial partner. They are the only ones who give you items or pay you.</span></li>
        <li><ShieldCheck size={20} aria-hidden="true" /><span>Money is never sent to unrelated people. Cash is paid to your own verified account.</span></li>
      </ul>
      <Banner tone="warn" title="Never pay to get support">
        If anyone asks you for money, a gift or your PIN to get your support, say no and tell us. Use Report an Issue.
      </Banner>
    </Card>
  );
}
