import { LayoutDashboard, Users, CircleDollarSign, BarChart3, Banknote, TrendingUp, Landmark, FileBarChart, UserCircle, Settings, Headphones, Wallet, Package, ClipboardList, FileCheck2, Scale, Activity, AlertTriangle, ScrollText, UserCog, Building2, Sprout, FileSignature, MessageSquareWarning, Receipt, Wheat, FileText, Bell } from 'lucide-react';

const I = (C) => <C size={22} strokeWidth={1.6} />;

// Each entry: { to, label, icon, end? }. `main` is the top group, `bottom` is pinned to the base of the sidebar.
export const NAV = {
  cooperative: {
    main: [
      { to: '/coop', label: 'Dashboard', icon: I(LayoutDashboard), end: true },
      { to: '/coop/farmers', label: 'Farmer Directory', icon: I(Users) },
      { to: '/coop/funding', label: 'Funding', icon: I(CircleDollarSign) },
      { to: '/coop/investments', label: 'Investments', icon: I(BarChart3) },
      { to: '/coop/disbursements', label: 'Disbursements', icon: I(Banknote) },
      { to: '/coop/farming-progress', label: 'Farming Progress', icon: I(TrendingUp) },
      { to: '/coop/settlements', label: 'Settlements', icon: I(Landmark) },
      { to: '/coop/reports', label: 'Reports', icon: I(FileBarChart) },
    ],
    more: [
      { to: '/coop/contracts', label: 'Contracts', icon: I(FileSignature) },
      { to: '/coop/complaints', label: 'Complaints', icon: I(MessageSquareWarning) },
    ],
    bottom: [
      { to: '/coop/help', label: 'Help & Support', icon: I(Headphones) },
    ],
  },
  investor: {
    main: [
      { to: '/investor', label: 'Dashboard', icon: I(LayoutDashboard), end: true },
      { to: '/investor/farmers', label: 'Farmer Directory', icon: I(Users) },
      { to: '/investor/wallet', label: 'Wallet', icon: I(Wallet) },
      { to: '/investor/packages', label: 'Packages', icon: I(Package) },
      { to: '/investor/investments', label: 'Investments', icon: I(BarChart3) },
    ],
    more: [
      { to: '/investor/distributions', label: 'Distributions', icon: I(Landmark) },
      { to: '/investor/transactions', label: 'Transactions', icon: I(Receipt) },
      { to: '/investor/contracts', label: 'Agreements', icon: I(FileSignature) },
      { to: '/investor/reports', label: 'Reports', icon: I(FileBarChart) },
      { to: '/investor/complaints', label: 'Complaints', icon: I(MessageSquareWarning) },
    ],
    bottom: [
      { to: '/investor/help', label: 'Help & Support', icon: I(Headphones) },
    ],
  },
  admin: {
    main: [
      { to: '/admin', label: 'Overview', icon: I(LayoutDashboard), end: true },
      { to: '/admin/verification/users', label: 'User Verification', icon: I(UserCog) },
      { to: '/admin/verification/cooperatives', label: 'Cooperatives', icon: I(Building2) },
      { to: '/admin/applications', label: 'Applications', icon: I(ClipboardList) },
      { to: '/admin/farmers-farms', label: 'Farmers and Farms', icon: I(Sprout) },
      { to: '/admin/contracts', label: 'Contract Status', icon: I(FileCheck2) },
      { to: '/admin/reconciliation', label: 'Reconciliation', icon: I(Scale) },
      { to: '/admin/milestones', label: 'Milestone Approval', icon: I(TrendingUp) },
      { to: '/admin/disbursements', label: 'Disbursements', icon: I(Banknote) },
      { to: '/admin/monitoring', label: 'Project Monitoring', icon: I(Activity) },
      { to: '/admin/risk-alerts', label: 'Risk Alerts', icon: I(AlertTriangle) },
      { to: '/admin/complaints', label: 'Complaints', icon: I(MessageSquareWarning) },
      { to: '/admin/distributions', label: 'Distributions', icon: I(Landmark) },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: I(ScrollText) },
      { to: '/admin/reports', label: 'Reports', icon: I(FileBarChart) },
    ],
    more: [],
    bottom: [
      { to: '/admin/users', label: 'User Management', icon: I(Users) },
    ],
  },
  farmer: {
    main: [
      { to: '/farmer', label: 'Dashboard', icon: I(LayoutDashboard), end: true },
      { to: '/farmer/allocation', label: 'My Allocation', icon: I(CircleDollarSign) },
      { to: '/farmer/activities', label: 'Activities', icon: I(ClipboardList) },
      { to: '/farmer/inputs-payments', label: 'Inputs and Payments', icon: I(Receipt) },
      { to: '/farmer/harvest', label: 'Harvest and Repayment', icon: I(Wheat) },
      { to: '/farmer/agreement', label: 'My Agreement', icon: I(FileText) },
      { to: '/farmer/report-issue', label: 'Report an Issue', icon: I(MessageSquareWarning) },
      { to: '/farmer/profile', label: 'Profile', icon: I(UserCircle) },
    ],
    more: [],
    bottom: [
      { to: '/farmer/settings', label: 'Settings', icon: I(Settings) },
      { to: '/farmer/help', label: 'Help & Support', icon: I(Headphones) },
    ],
  },
};

export const NOTIFICATION_ICON = I(Bell);
