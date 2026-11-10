// Route manifest. Pure data, so a node script can read it to generate stubs and docs.
// `file` is a path under src/pages without the .jsx extension. Shared pages are mounted under several roles
// and read the signed in role from useApp().

const shared = (opts = {}) => {
  const all = [
    { path: 'notifications', file: 'shared/Notifications' },
    { path: 'complaints', file: 'shared/Complaints' },
    { path: 'complaints/new', file: 'shared/ComplaintNew' },
    { path: 'complaints/:id', file: 'shared/ComplaintDetail' },
    { path: 'contracts', file: 'shared/Contracts' },
    { path: 'contracts/:id', file: 'shared/ContractDetail' },
    { path: 'reports', file: 'shared/Reports' },
    { path: 'settings', file: 'shared/Settings' },
    { path: 'help', file: 'shared/Help' },
  ];
  const skip = new Set(opts.skip || []);
  return all.filter((r) => !skip.has(r.path));
};

export const publicRoutes = [
  { index: true, file: 'public/Home' },
  { path: 'how-it-works', file: 'public/HowItWorks' },
  { path: 'cooperative-funding', file: 'public/CooperativeFundingInfo' },
  { path: 'investor-information', file: 'public/InvestorInformation' },
  { path: 'about', file: 'public/About' },
  { path: 'faq', file: 'public/Faq' },
  { path: 'contact', file: 'public/Contact' },
  { path: 'terms', file: 'public/Terms' },
  { path: 'privacy', file: 'public/Privacy' },
  { path: 'complaints-information', file: 'public/ComplaintsInformation' },
];

export const authRoutes = [
  { path: 'login', file: 'auth/Login' },
  { path: 'register', file: 'auth/Register' },
  { path: 'register/:role', file: 'auth/Register' },
  { path: 'forgot-password', file: 'auth/ForgotPassword' },
  { path: 'reset-password', file: 'auth/ResetPassword' },
  { path: 'verify-otp', file: 'auth/VerifyOtp' },
  { path: 'farmer-activation', file: 'auth/FarmerActivation' },
];

export const onboardingRoutes = [
  { path: 'onboarding/cooperative', file: 'auth/OnboardingCooperative' },
  { path: 'onboarding/investor', file: 'auth/OnboardingInvestor' },
  { path: 'onboarding/status', file: 'auth/OnboardingStatus' },
];

export const coopRoutes = [
  { index: true, file: 'cooperative/Dashboard' },
  { path: 'farmers', file: 'cooperative/FarmerDirectory' },
  { path: 'farmers/new', file: 'cooperative/FarmerForm' },
  { path: 'farmers/:id', file: 'cooperative/FarmerProfile' },
  { path: 'farmers/:id/edit', file: 'cooperative/FarmerForm' },
  { path: 'farms', file: 'cooperative/Farms' },
  { path: 'farms/:id', file: 'cooperative/FarmDetail' },
  { path: 'funding', file: 'cooperative/Funding' },
  { path: 'funding/new', file: 'cooperative/CreateFunding' },
  { path: 'funding/:id', file: 'cooperative/FundingDetail' },
  { path: 'investments', file: 'cooperative/Investments' },
  { path: 'disbursements', file: 'cooperative/Disbursements' },
  { path: 'farming-progress', file: 'cooperative/FarmingProgress' },
  { path: 'farming-progress/:id', file: 'cooperative/MilestoneDetail' },
  { path: 'settlements', file: 'cooperative/Settlements' },
  { path: 'settlements/harvest/new', file: 'cooperative/RecordHarvest' },
  { path: 'settlements/distributions/:id', file: 'cooperative/DistributionDetail' },
  { path: 'profile', file: 'cooperative/Profile' },
  { path: 'audit-log', file: 'shared/AuditLog' },
  ...shared(),
];

export const investorRoutes = [
  { index: true, file: 'investor/Dashboard' },
  { path: 'farmers', file: 'investor/FarmerDirectory' },
  { path: 'farmers/:id', file: 'investor/FarmerView' },
  { path: 'wallet', file: 'investor/Wallet' },
  { path: 'packages', file: 'investor/Packages' },
  { path: 'packages/:id', file: 'investor/PackageDetail' },
  { path: 'packages/:id/invest', file: 'investor/Invest' },
  { path: 'investments', file: 'investor/Investments' },
  { path: 'investments/:id', file: 'investor/InvestmentDetail' },
  { path: 'distributions', file: 'investor/Distributions' },
  { path: 'transactions', file: 'investor/Transactions' },
  { path: 'risk-disclosures', file: 'investor/RiskDisclosures' },
  { path: 'profile', file: 'investor/Profile' },
  ...shared(),
];

export const adminRoutes = [
  { index: true, file: 'admin/Overview' },
  { path: 'verification/users', file: 'admin/UserVerification' },
  { path: 'verification/users/:id', file: 'admin/UserVerificationDetail' },
  { path: 'verification/cooperatives', file: 'admin/CooperativeVerification' },
  { path: 'verification/cooperatives/:id', file: 'admin/CooperativeVerificationDetail' },
  { path: 'applications', file: 'admin/Applications' },
  { path: 'applications/:id', file: 'admin/ApplicationReview' },
  { path: 'farmers-farms', file: 'admin/FarmersFarms' },
  { path: 'contracts', file: 'admin/ContractStatus' },
  { path: 'contracts/:id', file: 'shared/ContractDetail' },
  { path: 'reconciliation', file: 'admin/Reconciliation' },
  { path: 'milestones', file: 'admin/MilestoneApproval' },
  { path: 'milestones/:id', file: 'admin/MilestoneReview' },
  { path: 'disbursements', file: 'admin/Disbursements' },
  { path: 'disbursements/:id', file: 'admin/DisbursementReview' },
  { path: 'monitoring', file: 'admin/Monitoring' },
  { path: 'monitoring/:id', file: 'admin/ProjectMonitor' },
  { path: 'risk-alerts', file: 'admin/RiskAlerts' },
  { path: 'risk-alerts/:id', file: 'admin/RiskCase' },
  { path: 'distributions', file: 'admin/Distributions' },
  { path: 'audit-logs', file: 'shared/AuditLog' },
  { path: 'users', file: 'admin/UserManagement' },
  { path: 'settings', file: 'admin/SystemSettings' },
  { path: 'profile', file: 'shared/AccountProfile' },
  ...shared({ skip: ['contracts', 'contracts/:id', 'settings'] }),
];

export const farmerRoutes = [
  { index: true, file: 'farmer/Dashboard' },
  { path: 'allocation', file: 'farmer/MyAllocation' },
  { path: 'activities', file: 'farmer/Activities' },
  { path: 'inputs-payments', file: 'farmer/InputsPayments' },
  { path: 'harvest', file: 'farmer/HarvestRepayment' },
  { path: 'agreement', file: 'farmer/MyAgreement' },
  { path: 'report-issue', file: 'farmer/ReportIssue' },
  { path: 'profile', file: 'farmer/Profile' },
  { path: 'complaints/:id', file: 'shared/ComplaintDetail' },
  { path: 'notifications', file: 'shared/Notifications' },
  { path: 'settings', file: 'shared/Settings' },
  { path: 'help', file: 'shared/Help' },
];

export const allPageFiles = () => {
  const set = new Set(['shared/NotFound', 'shared/AccountProfile']);
  [publicRoutes, authRoutes, onboardingRoutes, coopRoutes, investorRoutes, adminRoutes, farmerRoutes].forEach((list) => list.forEach((r) => set.add(r.file)));
  return [...set].sort();
};
