import '../../styles/pages/shr.css';
import { useSimulatedLoad } from '../../context/AppContext.jsx';
import { PageHeader, PageSkeleton } from '../../components/ui/index.js';
import { NotificationSettings, SecuritySettings } from '../../components/shr/SettingsPanels.jsx';

export default function Settings() {
  const loading = useSimulatedLoad(350);

  if (loading) return <PageSkeleton />;

  return (
    <div className="page shr-page shr-settings">
      <PageHeader title="Settings" subtitle="Manage your notifications and account security." />
      <div className="shr-settings__body">
        <NotificationSettings />
        <SecuritySettings />
      </div>
    </div>
  );
}
