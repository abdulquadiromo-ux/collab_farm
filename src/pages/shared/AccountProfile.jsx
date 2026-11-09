import '../../styles/pages/shr.css';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { PageHeader, PageSkeleton } from '../../components/ui/index.js';
import { ContactDetails, FunctionCard, ProfileCard, SecurityTips, SessionsCard } from '../../components/shr/AccountPanels.jsx';

export default function AccountProfile() {
  const { role } = useApp();
  const loading = useSimulatedLoad(350);
  if (loading) return <PageSkeleton />;
  return (
    <div className="page shr-page shr-account">
      <PageHeader title="Account Profile" subtitle="Your details, your administrator function and where you are signed in." />
      <div className="shr-account__grid">
        <div className="stack-lg">
          <ProfileCard />
          {role === 'admin' && <FunctionCard />}
          <ContactDetails />
        </div>
        <div className="stack-lg">
          <SessionsCard />
          <SecurityTips />
        </div>
      </div>
    </div>
  );
}
