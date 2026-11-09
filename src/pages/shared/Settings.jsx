import { useSearchParams } from 'react-router-dom';
import '../../styles/pages/shr.css';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { PageHeader, PageSkeleton, Tabs } from '../../components/ui/index.js';
import { NotificationSettings, PreferenceSettings, PrivacySettings, ProfileSummary, SecuritySettings } from '../../components/shr/SettingsPanels.jsx';

const TABS = [
  { id: 'profile', label: 'Profile summary' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'security', label: 'Security' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'privacy', label: 'Data and privacy' },
];

const SUB = {
  farmer: 'Choose how you hear from us and keep your account safe.',
  default: 'Manage how you are notified, how you sign in and how your information is used.',
};

export default function Settings() {
  const { role } = useApp();
  const loading = useSimulatedLoad(350);
  const [sp, setSp] = useSearchParams();
  const tab = TABS.some((t) => t.id === sp.get('tab')) ? sp.get('tab') : 'profile';
  const farmer = role === 'farmer';

  if (loading) return <PageSkeleton />;

  const change = (id) => {
    const next = new URLSearchParams(sp);
    next.set('tab', id);
    setSp(next, { replace: true });
  };

  return (
    <div className={`page shr-page shr-settings${farmer ? ' shr-settings--large' : ''}`}>
      <PageHeader title="Settings" subtitle={farmer ? SUB.farmer : SUB.default} />
      <div className="shr-settings__tabs"><Tabs items={TABS} value={tab} onChange={change} label="Settings sections" auto /></div>
      <div className="shr-settings__body" role="tabpanel">
        {tab === 'profile' && <ProfileSummary />}
        {tab === 'notifications' && <NotificationSettings />}
        {tab === 'security' && <SecuritySettings />}
        {tab === 'preferences' && <PreferenceSettings />}
        {tab === 'privacy' && <PrivacySettings />}
      </div>
    </div>
  );
}
