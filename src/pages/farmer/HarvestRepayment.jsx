import { Link } from 'react-router-dom';
import { Wheat, Scale, Warehouse, HandCoins, CircleMinus, Hourglass, Package, Banknote, CloudRain, ListOrdered, Sprout } from 'lucide-react';
import { Card, CardHeader, PageHeader, Banner, EmptyState, LinkButton, Button } from '../../components/ui/index.js';
import { useSimulatedLoad } from '../../context/AppContext.jsx';
import { formatNaira, formatDate, formatNumber } from '../../utils/format.js';
import { useFarmerCtx, dueText, obligationDone } from '../../components/farm/farmerData.js';
import { farmerGate, BigStat, StatusChip, ItemCard, Explain } from '../../components/farm/FarmUi.jsx';
import HarvestForm from '../../components/farm/HarvestForm.jsx';
import OweCalculator from '../../components/farm/OweCalculator.jsx';
import '../../styles/pages/farm.css';

export default function HarvestRepayment() {
  const loading = useSimulatedLoad(350);
  const ctx = useFarmerCtx();
  const gate = farmerGate(ctx, loading);
  if (gate) return gate;
  return <HarvestContent ctx={ctx} />;
}

const jump = (id) => window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);

function HarvestContent({ ctx }) {
  const { farmer, crop, expectedHarvestKg, harvestReports, obligations, ob, tasks, pkg } = ctx;
  const harvestTask = tasks.find((t) => t.key === 'harvest');

  if (!pkg) {
    return (
      <div className="page farm-page">
        <PageHeader title="Harvest and Repayment" subtitle="Your harvest, and what you agreed to give back." />
        <Card>
          <EmptyState icon={<Sprout size={28} />} title="Nothing to show yet" action={<LinkButton to="/farmer/allocation" variant="outline-green" className="farm-btn">See my allocation</LinkButton>}>
            Once your cooperative allocates support to you, your harvest plan and any repayment terms appear here.
          </EmptyState>
        </Card>
      </div>
    );
  }

  return (
    <div className="page farm-page">
      <PageHeader
        title="Harvest and Repayment"
        subtitle="Your harvest, and what you agreed to give back."
        actions={<Button className="farm-btn" onClick={() => jump('report-harvest')}><Wheat size={18} />Report harvest</Button>}
      />

      <Banner tone="green" title="If your crop fails, you are not treated as a cheat">
        Crop failure from weather, pests or disease gets a fair review. It is never treated as fraud, and nothing is taken from you automatically.
      </Banner>

      <section className="farm-stat-grid" aria-label="My harvest">
        <BigStat icon={<Scale size={20} />} label="Expected harvest (estimate)" value={`About ${formatNumber(expectedHarvestKg)} kg`} explain={`A careful guess for ${farmer.farmSize} ${String(farmer.farmSizeUnit).toLowerCase()} of ${crop.toLowerCase()}. Weather, pests and prices can change it. It is not a promise.`} />
        <BigStat icon={<Warehouse size={20} />} label="Harvest reported" value={harvestReports.length ? `${formatNumber(harvestReports[0].qty)} ${harvestReports[0].unit}` : 'Not yet'} explain={harvestReports.length ? `Last report on ${formatDate(harvestReports[0].date)}. Your cooperative checks it.` : 'Tell us once you have harvested.'} />
        <BigStat icon={<CloudRain size={20} />} label="Harvest step" value={harvestTask ? harvestTask.status : 'Not set'} small explain={harvestTask?.dueDate ? `${dueText(harvestTask.dueDate)} (${formatDate(harvestTask.dueDate)})` : 'Your cooperative will set the date.'} />
      </section>

      <HarvestForm ctx={ctx} onSent={() => jump('harvest-reports')} />

      <section id="harvest-reports" className="stack farm-scroll-target" aria-labelledby="hr-title">
        <h2 id="hr-title" className="farm-section-title"><Warehouse size={22} aria-hidden="true" />My harvest reports</h2>
        {harvestReports.length === 0 ? (
          <Card><EmptyState icon={<Wheat size={28} />} title="No harvest reported yet">When you report your harvest, it shows here with its status.</EmptyState></Card>
        ) : (
          <ul className="farm-list">
            {harvestReports.map((h) => (
              <ItemCard key={h.id} icon={<Wheat size={22} />} title={`${formatNumber(h.qty)} ${h.unit} of ${h.crop.toLowerCase()}`} meta={`Harvested ${formatDate(h.date)}. Quality ${h.quality}`} chip={<StatusChip>{h.status}</StatusChip>}>
                <dl className="farm-facts">
                  <div><dt>Kept at</dt><dd>{h.location}</dd></div>
                  <div><dt>Photos</dt><dd>{h.photos?.length ? `${h.photos.length} added` : 'None'}</dd></div>
                </dl>
                <p className="small muted">Your cooperative will check this. A report is not final until it is approved.</p>
              </ItemCard>
            ))}
          </ul>
        )}
      </section>

      <section className="stack" aria-labelledby="owe-title">
        <h2 id="owe-title" className="farm-section-title"><HandCoins size={22} aria-hidden="true" />What I agreed to give back</h2>
        <Explain>Your agreement says if you give back money, part of your harvest, or both. Nothing else can be asked from you.</Explain>
        <div className="farm-stat-grid farm-stat-grid--4">
          <BigStat icon={<Banknote size={20} />} label="Repayment due" value={formatNaira(ob.repayDue)} explain="Money you agreed to pay back." />
          <BigStat icon={<CircleMinus size={20} />} label="Paid or deducted so far" value={formatNaira(ob.repaid)} explain="Amounts already paid back, or taken off only as your agreement allows." />
          <BigStat icon={<Hourglass size={20} />} label="Outstanding balance" value={formatNaira(ob.repayOutstanding)} tone="gold" explain="What you still have to pay back." />
          <BigStat icon={<Package size={20} />} label="Produce to deliver" value={`${formatNumber(ob.produceOutstandingKg)} kg`} explain="Part of your harvest to give to the cooperative store." />
        </div>
        {obligations.length === 0 ? (
          <Card><EmptyState icon={<HandCoins size={28} />} title="You do not owe anything right now">If your agreement has repayment or produce terms, they show here.</EmptyState></Card>
        ) : (
          <ul className="farm-list">
            {obligations.map((o) => (
              <ItemCard
                key={o.id}
                icon={o.type === 'Repayment' ? <Banknote size={22} /> : <Package size={22} />}
                title={o.type === 'Repayment' ? 'Pay back money' : 'Give part of my harvest'}
                meta={`${dueText(o.dueDate)}. ${formatDate(o.dueDate)}`}
                chip={<StatusChip tone={obligationDone(o) ? 'green' : 'amber'}>{o.status}</StatusChip>}
              >
                {o.amount ? <p className="farm-amount">{formatNaira(o.amount)}</p> : null}
                <p>{o.description}</p>
                <p className="small muted">{o.type === 'Repayment' ? 'Repayment means paying back money you were given.' : 'Produce delivery means giving part of your harvest instead of money.'}</p>
              </ItemCard>
            ))}
          </ul>
        )}
      </section>

      <Card>
        <CardHeader title="How repayment and produce delivery work" action={<Link to="/farmer/agreement" className="farm-link">Read my agreement</Link>} />
        <ol className="farm-steps">
          <li>Clause 6 of your agreement says what you owe: money, produce or both. The amounts here come from it.</li>
          <li>After harvest you report how much you harvested. Your cooperative checks it.</li>
          <li>For produce delivery, you take the agreed amount to the cooperative store and keep the receipt.</li>
          <li>For repayment, you pay into the account your cooperative shows you. Do not hand cash to anyone without a receipt.</li>
          <li>Only items listed in your agreement can be taken off what you are owed. You see each one with its reason.</li>
          <li><strong>If your crop fails,</strong> a fair review is done by your cooperative and CollabFarm. You can explain and show evidence. It is never treated as fraud, and a missed date alone is never treated as misuse.</li>
        </ol>
      </Card>

      <OweCalculator ctx={ctx} />

      <Card tone="tint">
        <CardHeader title="Did your crop fail or get damaged?" />
        <p className="small">Floods, drought, pests or fire can ruin a crop. Tell us as soon as you can, so the fair review can start.</p>
        <div className="farm-actions">
          <LinkButton to={`/farmer/report-issue?${new URLSearchParams({ category: 'Other', about: 'My crop failed or was badly damaged.' }).toString()}`} className="farm-btn"><ListOrdered size={18} />Tell us about it</LinkButton>
        </div>
      </Card>
    </div>
  );
}
