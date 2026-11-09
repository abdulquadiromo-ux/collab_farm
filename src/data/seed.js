// Assembles the initial client-side state. Nothing here talks to a server.
import { DEMO_USERS, COOPERATIVES, INVESTORS, FARMERS } from './people.js';
import { PACKAGES, TRANCHES, INVESTMENTS, TRANSACTIONS, WALLET } from './funding.js';
import { FARMS, SUPPLIERS, DISBURSEMENTS, MILESTONES, INPUT_RECORDS, EXPENSES, HARVESTS, SALES, DISTRIBUTIONS, FARMER_OBLIGATIONS } from './operations.js';
import { CONTRACTS, COMPLAINTS, NOTIFICATIONS, AUDIT_LOG, RECONCILIATION, RISK_CASES, APPLICATIONS, USER_VERIFICATION, PLATFORM_SETTINGS } from './governance.js';

const clone = (x) => JSON.parse(JSON.stringify(x));

export function createSeed() {
  return clone({
    users: DEMO_USERS,
    cooperatives: COOPERATIVES,
    investors: INVESTORS,
    farmers: FARMERS,
    farms: FARMS,
    suppliers: SUPPLIERS,
    packages: PACKAGES,
    tranches: TRANCHES,
    investments: INVESTMENTS,
    transactions: TRANSACTIONS,
    wallets: WALLET,
    disbursements: DISBURSEMENTS,
    milestones: MILESTONES,
    inputRecords: INPUT_RECORDS,
    expenses: EXPENSES,
    harvests: HARVESTS,
    sales: SALES,
    distributions: DISTRIBUTIONS,
    obligations: FARMER_OBLIGATIONS,
    contracts: CONTRACTS,
    complaints: COMPLAINTS,
    notifications: NOTIFICATIONS,
    audit: AUDIT_LOG,
    reconciliation: RECONCILIATION,
    riskCases: RISK_CASES,
    applications: APPLICATIONS,
    userVerification: USER_VERIFICATION,
    platformSettings: PLATFORM_SETTINGS,
    userSettings: { notifications: { news: true, reminders: true, activity: true, email: true, sms: false }, language: 'English' },
  });
}
