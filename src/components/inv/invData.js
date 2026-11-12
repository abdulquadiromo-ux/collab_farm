// Helpers shared by the investor pages (group `inv`). Pure functions and constants, no network calls.
import { sum } from '../../utils/rules.js';

// ---------- time ----------
// The demo data is written as if "today" is 30 Oct 2026. Use a fixed anchor so closing dates and overdue
// checks stay consistent with the seed, and so records created in the session always sort after it.
const LOAD_TIME = Date.now();
export const APP_TODAY = new Date('2026-10-30T12:30:00');
export function appNow() {
  const real = new Date();
  return real > APP_TODAY ? real : new Date(APP_TODAY.getTime() + (Date.now() - LOAD_TIME));
}
export const nowIso = () => appNow().toISOString();
const endOfDay = (d) => new Date(`${d}T23:59:59`);
export const isClosed = (pkg) => !!pkg.closingDate && endOfDay(pkg.closingDate) < appNow();
export const daysLeft = (pkg) => (pkg.closingDate ? Math.ceil((endOfDay(pkg.closingDate) - appNow()) / 86400000) : null);
export const isoDay = (input) => {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// ---------- wallet ----------
export const EMPTY_WALLET = { partner: 'Regulated financial partner (not yet assigned)', accountRef: 'Not yet issued', available: 0, locked: 0, pendingConfirmation: 0 };
export const getWallet = (data, investorId) => ({ ...EMPTY_WALLET, ...(data.wallets?.[investorId] || {}) });

// ---------- packages ----------
export const PKG_STATUS_LABEL = {
  'Open for Funding': 'Open',
  'Funding Target Reached': 'Fully funded',
  Active: 'Active',
  Completed: 'Completed',
  'Ready for Disbursement': 'Ready',
};
export const PKG_STATUS_CLASS = { Open: 'open', 'Fully funded': 'funded', Active: 'active', Completed: 'completed', Ready: 'active' };

const CROP_KEYS = [['yam', 'Yam'], ['catfish', 'Catfish'], ['fish', 'Fish'], ['poultry', 'Poultry'], ['broiler', 'Poultry'], ['grazing', 'Small ruminants'], ['cattle', 'Cattle'], ['maize', 'Maize'], ['wheat', 'Wheat'], ['rice', 'Rice'], ['cassava', 'Cassava'], ['tomato', 'Tomato'], ['groundnut', 'Groundnut']];
export function cropOf(pkg) {
  const name = String(pkg?.name || '').toLowerCase();
  const hit = CROP_KEYS.find(([k]) => name.includes(k));
  return hit ? hit[1] : pkg?.category || 'Other';
}

export const PHOTO_THEME = { 'Crop Farming': 'seedling', Fishery: 'fishery', 'Mixed Farming': 'field', Livestock: 'harvest', Poultry: 'poultry', Custom: 'machinery' };

export const categoryList = ['Crop Farming', 'Fishery', 'Mixed Farming', 'Livestock', 'Poultry'];

// Package totals across the whole package (all investors), derived from the store.
export function packageSix(pkg, data) {
  const released = data.tranches.filter((t) => t.packageId === pkg.id && t.status === 'Released');
  const disbursed = sum(released, (t) => t.amount);
  const distributed = sum(data.distributions.filter((d) => d.packageId === pkg.id), (d) => d.amountPaid);
  return {
    target: pkg.amount,
    committed: pkg.committed,
    confirmed: pkg.raised,
    available: Math.max(0, pkg.raised - disbursed),
    disbursed,
    distributed,
  };
}

// Why can this investor not invest in this package right now? Returns a list of reasons (empty means allowed).
export function investGate(investor, pkg) {
  const reasons = [];
  if (!investor) {
    reasons.push({ id: 'noinv', text: 'No investor profile was found for this account.' });
    return reasons;
  }
  if (investor.status !== 'Verified') reasons.push({ id: 'unverified', text: `Your investor account is ${investor.status}. Only verified investors can commit funds.`, to: '/onboarding/investor', toLabel: 'Review profile' });
  if (investor.riskAcknowledged !== true) reasons.push({ id: 'risk', text: 'You have not acknowledged the risk disclosures yet.', to: '/investor/risk-disclosures', toLabel: 'Read and acknowledge risks' });
  if (pkg.status !== 'Open for Funding') {
    const why = pkg.status === 'Funding Target Reached' ? 'This package has reached its funding target and is closed to new commitments.'
      : pkg.status === 'Completed' ? 'This package has completed and is closed to new commitments.'
        : `This package is ${pkg.status} and is not open for new funding.`;
    reasons.push({ id: 'closed', text: why });
  } else if (isClosed(pkg)) {
    reasons.push({ id: 'date', text: 'The funding deadline for this package has passed.' });
  }
  if (pkg.committed >= pkg.amount && pkg.status === 'Open for Funding') reasons.push({ id: 'full', text: 'This package is fully committed. There is no remaining amount to fund.' });
  return reasons;
}

// ---------- farmers (privacy preserving) ----------
// INVESTOR_VISIBLE in utils/rules.js is the list of package statuses an investor may see, not a list of farmer
// fields, so the farmer whitelist lives here. Anything not named below is never read by an investor page:
// no name, NIN, phone, email, address, gender, notes or allocation amount.
export const FARMER_FIELDS_SHOWN = ['reference', 'crop', 'region', 'sizeBand', 'experienceBand', 'cooperative', 'verification', 'participation', 'history'];

export const isVerifiedFarmer = (f) => f.status === 'Verified' && f.identityStatus === 'Verified';

export const sizeBand = (acres) => (acres <= 3 ? 'Up to 3 acres' : acres <= 6 ? '4 to 6 acres' : '7 acres or more');
export const experienceBand = (years) => (years <= 3 ? 'Up to 3 years' : years <= 7 ? '4 to 7 years' : years <= 12 ? '8 to 12 years' : '13 years or more');
export const SIZE_BANDS = ['Up to 3 acres', '4 to 6 acres', '7 acres or more'];
export const PARTICIPATION = ['In a funded package', 'Completed a package', 'Available for a package'];

export function farmerForInvestor(f, data) {
  const coop = data.cooperatives.find((c) => c.id === f.coopId);
  const pkg = f.allocationPackageId ? data.packages.find((p) => p.id === f.allocationPackageId) : null;
  const joined = pkg ? 1 : 0;
  const completed = pkg && pkg.status === 'Completed' ? 1 : 0;
  const inProgress = pkg && ['Open for Funding', 'Funding Target Reached', 'Active', 'Ready for Disbursement'].includes(pkg.status) ? 1 : 0;
  return {
    id: f.id,
    reference: `Verified farmer ${f.id.replace('f-', 'F-')}`,
    crop: f.cropType,
    region: coop?.state || 'Not stated',
    sizeBand: sizeBand(f.farmSize),
    experienceBand: experienceBand(f.experienceYears),
    cooperative: coop?.name || 'Not stated',
    coopId: f.coopId,
    verification: 'Verified',
    participation: inProgress ? PARTICIPATION[0] : completed ? PARTICIPATION[1] : PARTICIPATION[2],
    history: { joined, completed, inProgress },
  };
}

// ---------- funding model wording ----------
export function fundingModelWording(model = '') {
  const m = model.toLowerCase();
  const loan = m.includes('loan');
  const profit = m.includes('profit');
  if (loan && profit) return { kind: 'Loan with profit share', text: 'Your money is treated as a loan that the cooperative repays, plus a share of any profit as set in the agreement. Repayment of your original money (capital) is separate from profit. Neither is guaranteed.' };
  if (profit) return { kind: 'Profit sharing', text: 'You share in the profit left after approved costs, as set in the agreement. If there is no profit you may get back less than you put in, or nothing. Returns are estimates, not guarantees.' };
  if (loan) return { kind: 'Loan', text: 'Your money is treated as a loan to be repaid on the dates in the agreement. Repayment depends on harvest and sales outcomes and is not guaranteed.' };
  if (m.includes('harvest')) return { kind: 'Harvest participation', text: 'You take a share of harvest output or its sale value, as set in the agreement. The value depends on yield and market price and is not guaranteed.' };
  return { kind: 'Other structure', text: 'The way you are repaid or share in results is set out in the signed agreement. Read it before you commit.' };
}

// ---------- plain-language risks ----------
export const RISK_ITEMS = [
  { id: 'loss', title: 'Possible loss of money', short: 'I understand I can lose some or all of the money I put in.', detail: 'Farming is uncertain. If a project does not earn enough, you may get back less than you invested, or nothing.' },
  { id: 'crop', title: 'Crop failure', short: 'I understand crops can fail through drought, flooding, pests or disease, and that a crop failure is not fraud.', detail: 'A genuine crop failure is assessed on evidence and on the signed agreement. It does not mean anyone acted dishonestly, and it does not automatically excuse repayment unless the agreement says so.' },
  { id: 'price', title: 'Price changes', short: 'I understand market prices can fall before harvest and reduce what is available to share.', detail: 'Selling prices change with the season, supply and demand. A lower price means lower sales and a smaller share for everyone.' },
  { id: 'delay', title: 'Delays', short: 'I understand planting, harvest, sales and payments can be late and that dates are estimates.', detail: 'Weather, supplier delays, evidence checks and bank processing can all move dates. A late date is not a default by itself.' },
  { id: 'default', title: 'Default or non-payment', short: 'I understand the cooperative or farmers may not repay in full or on time.', detail: 'If payments are missed, the case is reviewed and the options in the agreement are followed (for example reschedule, restructure, insurance or recovery). Recovery takes time and may be partial.' },
  { id: 'guarantee', title: 'No guarantee', short: 'I understand returns are estimates only and approval of a package is not a guarantee of success.', detail: 'Expected returns shown on the platform are estimates. CollabFarm approval means the package met review checks. It does not promise a profit.' },
  { id: 'liquidity', title: 'Liquidity', short: 'I understand my money is tied up until the agreed settlement date and I cannot withdraw committed funds early.', detail: 'There is no secondary market where you can sell your position. Committed funds are released to the project in stages and come back only as the agreement says.' },
  { id: 'custody', title: 'No custody by CollabFarm', short: 'I understand CollabFarm does not hold or pool my money and that a payment initiation is not proof of receipt.', detail: 'A regulated financial partner holds and moves money. CollabFarm records commitments, approvals and confirmations. Funds count as received only when the partner confirms.' },
];

export const AGREEMENT_SECTIONS = [
  ['Parties', 'The investor and the cooperative named on the package, with CollabFarm Finance as the platform that records approvals.'],
  ['Amount and use of funds', 'The amount you commit and the approved budget categories it may be used for.'],
  ['Release conditions', 'Money is released in four stages (tranches). A stage is released only after the previous stage is released and its evidence is approved.'],
  ['Return or repayment', 'How you are repaid or share in results, and how repayment of capital is kept separate from profit.'],
  ['Risks and potential loss', 'The risks in the risk disclosure, including loss of some or all of your money.'],
  ['Reporting', 'Milestone reports, evidence, harvest and sales reports you can see.'],
  ['Default and recovery', 'What happens when a payment is missed: review, response time, and the options available.'],
  ['Crop failure', 'How genuine crop loss is assessed and who bears it. A crop failure is not treated as fraud.'],
  ['Disputes and termination', 'How to raise a dispute, how it is reviewed, and how the agreement can end.'],
];

// ---------- misc helpers ----------
export const sumBy = (rows, pick) => sum(rows, pick);

export function nextRef(prefix, existing, pad = 4) {
  return `${prefix}-${String(existing + 1).padStart(pad, '0')}`;
}
export const txRef = () => `TX-${String(Math.floor(10000000 + Math.random() * 89999999))}`;

export const TX_STATUS_HELP = {
  Initiated: 'You told us you made a transfer. It is not proof of receipt yet.',
  Pending: 'Waiting for the financial partner to confirm it received the money.',
  Confirmed: 'The partner has confirmed. This is real, received money.',
  Failed: 'The payment did not go through. No money moved. You can try again.',
  Reversed: 'The payment was sent back by the bank or partner. A correcting entry is recorded.',
  Refunded: 'Money was returned to you, for example when a package missed its minimum target.',
  'Under Reconciliation': 'The partner report and our record are being matched. The amount may change after a recorded correction.',
};
export const TX_STATUSES = Object.keys(TX_STATUS_HELP);

// CSV download built in the browser from a Blob. No network request is made.
export function downloadCsv(filename, columns, rows) {
  const esc = (v) => {
    let s = v == null ? '' : String(v);
    if (typeof v === 'string' && /^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => esc(c.header)).join(','), ...rows.map((r) => columns.map((c) => esc(c.value(r))).join(','))];
  const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Highest Agreement A template version in the store (falls back to the seed version).
export function agreementAVersion(contracts = []) {
  const versions = contracts.filter((c) => c.type === 'A').map((c) => c.version).filter(Boolean);
  return versions.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop() || 'v2.1';
}

// The seed's "direction" is from the partner's point of view. An investor reads a ledger from their own side:
// money returned to them (+) or money they paid in or put to work (-).
export const MONEY_TO_INVESTOR = ['Deposit', 'Distribution', 'Refund'];
export const txSign = (t) => (MONEY_TO_INVESTOR.includes(t.type) ? 1 : -1);
export const txSigned = (t, fmt) => `${txSign(t) > 0 ? '+' : '-'}${fmt(t.amount)}`;

export const BANKS = [
  { value: 'Access Bank', label: 'Access Bank', code: '044' },
  { value: 'ALAT by WEMA', label: 'ALAT by WEMA', code: '035A' },
  { value: 'Alternative Bank', label: 'Alternative Bank', code: '304' },
  { value: 'Citibank Nigeria', label: 'Citibank Nigeria', code: '023' },
  { value: 'Dot Microfinance Bank', label: 'Dot Microfinance Bank', code: '50162' },
  { value: 'Ecobank Nigeria', label: 'Ecobank Nigeria', code: '050' },
  { value: 'Eyowo', label: 'Eyowo', code: '50126' },
  { value: 'Fairmoney Microfinance Bank', label: 'Fairmoney Microfinance Bank', code: '51318' },
  { value: 'Fidelity Bank', label: 'Fidelity Bank', code: '070' },
  { value: 'First Bank of Nigeria', label: 'First Bank of Nigeria', code: '011' },
  { value: 'First City Monument Bank (FCMB)', label: 'First City Monument Bank (FCMB)', code: '214' },
  { value: 'Globus Bank', label: 'Globus Bank', code: '103' },
  { value: 'GoMoney', label: 'GoMoney', code: '100022' },
  { value: 'Guaranty Trust Bank (GTBank)', label: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { value: 'Hasal Microfinance Bank', label: 'Hasal Microfinance Bank', code: '50383' },
  { value: 'Heritage Bank', label: 'Heritage Bank', code: '030' },
  { value: 'Hope PSB', label: 'Hope PSB', code: '120002' },
  { value: 'Jaiz Bank', label: 'Jaiz Bank', code: '301' },
  { value: 'Keystone Bank', label: 'Keystone Bank', code: '082' },
  { value: 'Kuda Bank', label: 'Kuda Bank', code: '50211' },
  { value: 'Moniepoint MFB', label: 'Moniepoint MFB', code: '50515' },
  { value: 'MTN MoMo PSB', label: 'MTN MoMo PSB', code: '120003' },
  { value: 'OPay Digital Services', label: 'OPay Digital Services', code: '999992' },
  { value: 'Optimus Bank', label: 'Optimus Bank', code: '107' },
  { value: 'PalmPay', label: 'PalmPay', code: '999991' },
  { value: 'Parallex Bank', label: 'Parallex Bank', code: '526' },
  { value: 'Paystack-Titan', label: 'Paystack-Titan', code: '100039' },
  { value: 'Polaris Bank', label: 'Polaris Bank', code: '076' },
  { value: 'PremiumTrust Bank', label: 'PremiumTrust Bank', code: '105' },
  { value: 'Providus Bank', label: 'Providus Bank', code: '101' },
  { value: 'Rubies MFB', label: 'Rubies MFB', code: '125' },
  { value: 'SmartCash PSB (Airtel)', label: 'SmartCash PSB (Airtel)', code: '120004' },
  { value: 'Stanbic IBTC Bank', label: 'Stanbic IBTC Bank', code: '221' },
  { value: 'Standard Chartered Bank', label: 'Standard Chartered Bank', code: '068' },
  { value: 'Sterling Bank', label: 'Sterling Bank', code: '232' },
  { value: 'Suntrust Bank', label: 'Suntrust Bank', code: '100' },
  { value: 'Taj Bank', label: 'Taj Bank', code: '302' },
  { value: 'Titan Trust Bank', label: 'Titan Trust Bank', code: '102' },
  { value: 'Union Bank of Nigeria', label: 'Union Bank of Nigeria', code: '032' },
  { value: 'United Bank for Africa (UBA)', label: 'United Bank for Africa (UBA)', code: '033' },
  { value: 'Unity Bank', label: 'Unity Bank', code: '215' },
  { value: 'VFD Microfinance Bank', label: 'VFD Microfinance Bank', code: '566' },
  { value: 'Wema Bank', label: 'Wema Bank', code: '035' },
  { value: 'Zenith Bank', label: 'Zenith Bank', code: '057' },
  { value: '9mobile 9Payment Service Bank', label: '9mobile 9Payment Service Bank', code: '120001' },
];
export const RISK_VERSION = 'v1.0';
