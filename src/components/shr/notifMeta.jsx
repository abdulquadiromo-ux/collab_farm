import { Flag, FileSignature, CircleDollarSign, ShieldCheck, Banknote, Landmark, Sprout, AlertTriangle, Receipt, MessageSquareWarning, FileBarChart, Lock } from 'lucide-react';
import { NOTIFICATION_ICON } from '../../layouts/navConfig.jsx';

const S = 20;
// Type specific icons. Anything unknown falls back to the bell used in the app shell.
export const NOTIF_TYPES = {
  milestone: { label: 'Milestones', icon: <Flag size={S} />, tone: 'green' },
  contract: { label: 'Contracts', icon: <FileSignature size={S} />, tone: 'gold' },
  funding: { label: 'Funding', icon: <CircleDollarSign size={S} />, tone: 'green' },
  verification: { label: 'Verification', icon: <ShieldCheck size={S} />, tone: 'blue' },
  disbursement: { label: 'Disbursements', icon: <Banknote size={S} />, tone: 'green' },
  distribution: { label: 'Distributions', icon: <Landmark size={S} />, tone: 'gold' },
  project: { label: 'Projects', icon: <Sprout size={S} />, tone: 'green' },
  risk: { label: 'Risk alerts', icon: <AlertTriangle size={S} />, tone: 'red' },
  payment: { label: 'Payments', icon: <Receipt size={S} />, tone: 'green' },
  complaint: { label: 'Complaints', icon: <MessageSquareWarning size={S} />, tone: 'gold' },
  report: { label: 'Reports', icon: <FileBarChart size={S} />, tone: 'blue' },
  security: { label: 'Security', icon: <Lock size={S} />, tone: 'blue' },
};

export function notifMeta(type) {
  return NOTIF_TYPES[type] || { label: 'General', icon: NOTIFICATION_ICON, tone: 'grey' };
}
