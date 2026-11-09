import { useParams } from 'react-router-dom';
import { Briefcase, EyeOff, Lock, MapPin, Ruler, Sprout } from 'lucide-react';
import { Banner, Breadcrumb, Card, CardHeader, InfoList, KpiStrip, PageHeader, PageSkeleton, StatusPill } from '../../components/ui/index.js';
import { LinkButton } from '../../components/ui/Button.jsx';
import { useSimulatedLoad } from '../../context/AppContext.jsx';
import { useInvestor } from '../../components/inv/useInvestor.js';
import { MissingRecord } from '../../components/inv/Common.jsx';
import { farmerForInvestor, isVerifiedFarmer } from '../../components/inv/invData.js';
import '../../styles/pages/inv.css';

const HIDDEN = ['Name', 'ID number (NIN)', 'Phone number', 'Email address', 'Exact farm or home address', 'Bank and payout details', 'Date of birth and gender'];

export default function FarmerView() {
  const { id } = useParams();
  const loading = useSimulatedLoad(350);
  const { data } = useInvestor();
  if (loading) return <PageSkeleton />;

  const raw = data.farmers.find((f) => f.id === id);
  // A farmer who is not verified is not shown to investors at all, so it looks the same as a record that does not exist.
  if (!raw || !isVerifiedFarmer(raw)) {
    return <MissingRecord title="Farmer not found" text="This farmer record does not exist, or it is not available to investors." to="/investor/farmers" label="Back to Farmer Directory" />;
  }
  const f = farmerForInvestor(raw, data);

  return (
    <div className="page">
      <Breadcrumb items={[{ label: 'Farmer Directory', to: '/investor/farmers' }, { label: f.reference }]} />
      <PageHeader
        title={f.reference}
        subtitle="Restricted profile. Only the details that are safe to share with investors are shown."
        actions={<LinkButton to="/investor/farmers" variant="outline-green">Back to directory</LinkButton>}
      />

      <Banner tone="info" title="Why this profile is short">
        To protect farmers, investors never see a name, ID number, phone number, email address or exact address. What you see here is enough to understand the kind of farming involved, not to identify or contact a person.
      </Banner>

      <KpiStrip cells={[
        { icon: <Sprout size={18} />, label: 'Main crop', value: f.crop, sub: 'Reported by the cooperative' },
        { icon: <MapPin size={18} />, label: 'Region', value: f.region, sub: 'State only, no address' },
        { icon: <Ruler size={18} />, label: 'Farm size', value: f.sizeBand, sub: 'A band, not an exact size' },
        { icon: <Briefcase size={18} />, label: 'Experience', value: f.experienceBand, sub: 'A band, not an exact figure' },
      ]}
      />

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <Card>
          <CardHeader title="Profile summary" subtitle="Shown to investors" />
          <InfoList items={[
            ['Reference', f.reference],
            ['Verification', <StatusPill key="v">{f.verification}</StatusPill>],
            ['Cooperative', f.cooperative],
            ['Current participation', f.participation],
          ]} />
        </Card>
        <div className="stack">
          <Card>
            <CardHeader title="Participation history" subtitle="Totals only. Individual packages are not listed." />
            <InfoList items={[
              ['Packages joined', f.history.joined],
              ['Packages completed', f.history.completed],
              ['Packages in progress', f.history.inProgress],
            ]} />
            <p className="small muted" style={{ margin: 'var(--s-3) 0 0' }}>
              Few or no completed packages is normal for a new farmer. It is not a sign of a problem. To look at the packages the cooperative runs, open the funding packages list.
            </p>
            <div style={{ marginTop: 'var(--s-3)' }}>
              <LinkButton to={`/investor/packages?q=${encodeURIComponent(f.cooperative)}`} variant="outline-green" size="sm">See packages from {f.cooperative}</LinkButton>
            </div>
          </Card>
          <Card>
            <CardHeader title="What is not shown" subtitle="Kept private on purpose" />
            <ul className="stack-sm" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {HIDDEN.map((h) => (
                <li key={h} className="inv-hidden-field"><Lock size={14} aria-hidden="true" /><span>{h}</span><EyeOff size={14} aria-hidden="true" style={{ marginLeft: 'auto' }} /></li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Banner tone="warn">There is no way to contact a farmer from this page. If something worries you about a package, use Raise a concern on that package or investment so a reviewer can look into it.</Banner>
    </div>
  );
}
