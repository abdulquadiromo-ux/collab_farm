// Contracts, complaints, notifications, audit log, reconciliation, risk cases, applications and admin settings (mock).

import { INVESTMENTS } from './funding.js';
import { INVESTORS } from './people.js';

const BASE_CONTRACTS = [
  { id: 'ag-a-1', type: 'A', title: 'Investor Funding Agreement', packageId: 'pkg-1', partyType: 'Investor', partyId: 'inv-1', partyName: 'Arnold Okafor', version: 'v2.1', status: 'Signed', signedAt: '2026-08-11T10:05:00', signatory: 'Arnold Okafor (identity verified)', fundingModel: 'Profit sharing (illustrative, configurable)', history: [{ version: 'v1.0', date: '2026-04-02', change: 'Initial template' }, { version: 'v2.0', date: '2026-07-15', change: 'Added crop failure clause 9.2' }, { version: 'v2.1', date: '2026-08-01', change: 'Clarified distribution calculation' }] },
  { id: 'ag-a-2', type: 'A', title: 'Investor Funding Agreement', packageId: 'pkg-2', partyType: 'Investor', partyId: 'inv-1', partyName: 'Arnold Okafor', version: 'v2.1', status: 'Signed', signedAt: '2026-10-22T09:00:00', signatory: 'Arnold Okafor (identity verified)', fundingModel: 'Profit sharing (illustrative, configurable)', history: [{ version: 'v2.1', date: '2026-08-01', change: 'Current template' }] },
  { id: 'ag-a-3', type: 'A', title: 'Investor Funding Agreement', packageId: 'pkg-3', partyType: 'Investor', partyId: 'inv-1', partyName: 'Arnold Okafor', version: 'v1.0', status: 'Signed', signedAt: '2026-02-11T10:00:00', signatory: 'Arnold Okafor (identity verified)', fundingModel: 'Loan with profit share', history: [{ version: 'v1.0', date: '2026-01-12', change: 'Initial template' }] },
  { id: 'ag-a-4', type: 'A', title: 'Investor Funding Agreement', packageId: 'pkg-4', partyType: 'Investor', partyId: 'inv-1', partyName: 'Arnold Okafor', version: 'v2.1', status: 'Awaiting Signature', signedAt: null, signatory: null, fundingModel: 'Profit sharing (illustrative, configurable)', history: [{ version: 'v2.1', date: '2026-08-01', change: 'Current template' }] },
  { id: 'ag-b-1', type: 'B', title: 'Cooperative Funding and Accountability Agreement', packageId: 'pkg-1', partyType: 'Cooperative', partyId: 'coop-1', partyName: 'Green Fields Cooperative', version: 'v1.3', status: 'Signed', signedAt: '2026-05-10T11:30:00', signatory: 'Arnold Smith, Chairman', liability: 'Coordination and reporting only. Not a guarantor of farmer repayment (configurable).', history: [{ version: 'v1.0', date: '2026-03-12', change: 'Initial' }, { version: 'v1.3', date: '2026-05-01', change: 'Unspent funds clause updated' }] },
  { id: 'ag-b-2', type: 'B', title: 'Cooperative Funding and Accountability Agreement', packageId: 'pkg-2', partyType: 'Cooperative', partyId: 'coop-1', partyName: 'Green Fields Cooperative', version: 'v1.3', status: 'Awaiting Signature', signedAt: null, signatory: null, liability: 'Coordination and reporting only (configurable).', history: [{ version: 'v1.3', date: '2026-05-01', change: 'Current template' }] },
  { id: 'ag-b-3', type: 'B', title: 'Cooperative Funding and Accountability Agreement', packageId: 'pkg-5', partyType: 'Cooperative', partyId: 'coop-1', partyName: 'Green Fields Cooperative', version: 'v1.3', status: 'Signed', signedAt: '2026-09-12T09:10:00', signatory: 'Arnold Smith, Chairman', liability: 'Coordination and reporting only (configurable).', history: [{ version: 'v1.3', date: '2026-05-01', change: 'Current template' }] },
  { id: 'ag-c-1', type: 'C', title: 'Individual Farmer Participation Agreement', packageId: 'pkg-1', partyType: 'Farmer', partyId: 'f-003', partyName: 'Aisha Bello', version: 'v1.1', status: 'Signed', signedAt: '2026-05-14T08:40:00', signatory: 'Aisha Bello (identity verified)', language: 'English, Hausa summary provided', repayment: 'Repayment of N25,000 plus delivery of 300 kg of yam (illustrative, per agreement)', history: [{ version: 'v1.0', date: '2026-03-20', change: 'Initial' }, { version: 'v1.1', date: '2026-05-01', change: 'Privacy and consent wording updated' }] },
  { id: 'ag-c-2', type: 'C', title: 'Individual Farmer Participation Agreement', packageId: 'pkg-1', partyType: 'Farmer', partyId: 'f-001', partyName: 'Bruce Banner', version: 'v1.1', status: 'Awaiting Signature', signedAt: null, signatory: null, language: 'English', repayment: 'As per agreement', history: [{ version: 'v1.1', date: '2026-05-01', change: 'Current template' }] },
  { id: 'ag-c-3', type: 'C', title: 'Individual Farmer Participation Agreement', packageId: 'pkg-9', partyType: 'Farmer', partyId: 'f-020', partyName: 'Hauwa Lawal', version: 'v1.0', status: 'Expired', signedAt: '2025-11-01T08:00:00', signatory: 'Hauwa Lawal', language: 'English', repayment: 'As per agreement', history: [{ version: 'v1.0', date: '2025-10-01', change: 'Initial' }] },
];

// Every investment points at an Agreement A. Those not written out above are generated here so the links never break.
const generatedA = INVESTMENTS
  .filter((inv) => !BASE_CONTRACTS.some((c) => c.id === inv.agreementId))
  .map((inv) => {
    const name = INVESTORS.find((x) => x.id === inv.investorId)?.name || 'Investor';
    return {
      id: inv.agreementId, type: 'A', title: 'Investor Funding Agreement', packageId: inv.packageId, partyType: 'Investor', partyId: inv.investorId, partyName: name,
      version: 'v2.1', status: 'Signed', signedAt: `${inv.dateInvested}T09:00:00`, signatory: `${name} (identity verified)`,
      fundingModel: 'Profit sharing (illustrative, configurable)', history: [{ version: 'v2.1', date: '2026-08-01', change: 'Current template' }],
    };
  });

export const CONTRACTS = [...BASE_CONTRACTS, ...generatedA];

export const COMPLAINTS = [
  { id: 'cmp-1', ref: 'CMP-2026-0041', subject: 'Delayed input delivery', description: 'Herbicide for my plot has not been delivered although the milestone was approved.', submittedBy: 'Aisha Bello', role: 'farmer', packageId: 'pkg-1', category: 'Delayed support', status: 'Under Review', assignee: 'Zainab Bello', createdAt: '2026-10-18T09:00:00', updatedAt: '2026-10-25T14:00:00', actions: [{ at: '2026-10-19', by: 'Zainab Bello', text: 'Case opened. Cooperative asked to explain the delay.' }, { at: '2026-10-25', by: 'Arnold Smith', text: 'Supplier confirms delivery scheduled for 3 November.' }], outcome: '' },
  { id: 'cmp-2', ref: 'CMP-2026-0042', subject: 'Question on distribution calculation', description: 'Please explain how the profit share for Poultry Expansion was calculated.', submittedBy: 'Arnold Okafor', role: 'investor', packageId: 'pkg-3', category: 'Payment', status: 'Resolved', assignee: 'Emeka Eze', createdAt: '2026-07-04T10:00:00', updatedAt: '2026-07-09T16:00:00', actions: [{ at: '2026-07-05', by: 'Emeka Eze', text: 'Calculation sheet shared with the investor.' }], outcome: 'Calculation confirmed against the signed agreement. No change to the amount.' },
  { id: 'cmp-3', ref: 'CMP-2026-0043', subject: 'Suspected misuse of seed allocation', description: 'A farmer reports that seed allocated to the group was sold to a third party.', submittedBy: 'Chidinma Okeke', role: 'cooperative', packageId: 'pkg-7', category: 'Suspected misuse', status: 'Escalated', assignee: 'Emeka Eze', createdAt: '2026-10-21T08:30:00', updatedAt: '2026-10-28T11:00:00', actions: [{ at: '2026-10-22', by: 'Emeka Eze', text: 'Evidence preserved. Further disbursement paused where the agreement permits.' }], outcome: '' },
  { id: 'cmp-4', ref: 'CMP-2026-0044', subject: 'Delayed repayment notification', description: 'Principal for Kano Wheat Production Fund is shown overdue. Please confirm the new date.', submittedBy: 'Arnold Okafor', role: 'investor', packageId: 'pkg-6', category: 'Payment', status: 'Awaiting Response', assignee: 'Zainab Bello', createdAt: '2026-10-27T13:15:00', updatedAt: '2026-10-28T09:10:00', actions: [{ at: '2026-10-28', by: 'Zainab Bello', text: 'Cooperative asked to submit harvest storage evidence.' }], outcome: '' },
  { id: 'cmp-5', ref: 'CMP-2026-0045', subject: 'Request review of tranche rejection', description: 'We request a second review of the rejection of the Tranche 3 evidence.', submittedBy: 'Arnold Smith', role: 'cooperative', packageId: 'pkg-1', category: 'Dispute', status: 'Open', assignee: 'Unassigned', createdAt: '2026-10-29T16:20:00', updatedAt: '2026-10-29T16:20:00', actions: [], outcome: '' },
];

export const NOTIFICATIONS = [
  { id: 'n-1', role: 'cooperative', type: 'milestone', title: 'Milestone under review', message: 'Crop maintenance verified was submitted and is awaiting a milestone reviewer.', createdAt: '2026-10-30T09:12:00', read: false, link: '/coop/farming-progress' },
  { id: 'n-2', role: 'cooperative', type: 'contract', title: 'Contract signing required', message: 'Fishery Starter needs the Cooperative Funding and Accountability Agreement to be signed.', createdAt: '2026-10-29T14:00:00', read: false, link: '/coop/contracts' },
  { id: 'n-3', role: 'cooperative', type: 'funding', title: 'New investor commitment', message: 'An investor committed N500,000 to Maize Growth Package. Awaiting partner confirmation.', createdAt: '2026-10-28T10:30:00', read: true, link: '/coop/investments' },
  { id: 'n-4', role: 'cooperative', type: 'verification', title: 'Document verified', message: 'Proof of address was marked Verified by a CollabFarm reviewer.', createdAt: '2026-10-25T15:45:00', read: true, link: '/coop/profile' },
  { id: 'n-5', role: 'investor', type: 'disbursement', title: 'Disbursement confirmed', message: 'N250,000 was disbursed to Savanna Machinery Hire for Yam Harvest Support.', createdAt: '2026-10-30T08:40:00', read: false, link: '/investor/investments' },
  { id: 'n-6', role: 'investor', type: 'distribution', title: 'Repayment overdue', message: 'Principal repayment for Benue Rice Production Fund was due on 30 Oct 2026.', createdAt: '2026-10-30T07:00:00', read: false, link: '/investor/distributions' },
  { id: 'n-7', role: 'investor', type: 'funding', title: 'Commitment awaiting confirmation', message: 'Your N500,000 commitment to Fishery Starter is awaiting partner confirmation. It is not yet received money.', createdAt: '2026-10-22T09:06:00', read: true, link: '/investor/transactions' },
  { id: 'n-8', role: 'investor', type: 'project', title: 'Funding target reached', message: 'Grazing Support reached its funding target. Please sign the agreement.', createdAt: '2026-10-15T12:00:00', read: true, link: '/investor/contracts' },
  { id: 'n-9', role: 'admin', type: 'verification', title: 'New cooperative submitted', message: 'Benue Rice Growers Union submitted registration documents.', createdAt: '2026-10-30T10:05:00', read: false, link: '/admin/verification/cooperatives' },
  { id: 'n-10', role: 'admin', type: 'disbursement', title: 'Second approval needed', message: 'A N100,000 disbursement for Yam Harvest Support needs a payment approver.', createdAt: '2026-10-29T17:20:00', read: false, link: '/admin/disbursements' },
  { id: 'n-11', role: 'admin', type: 'risk', title: 'Late report', message: 'Kano Wheat Production Fund missed the harvest storage evidence deadline.', createdAt: '2026-10-28T08:00:00', read: true, link: '/admin/risk-alerts' },
  { id: 'n-12', role: 'farmer', type: 'milestone', title: 'New activity assigned', message: 'Submit a crop maintenance progress report by 5 November.', createdAt: '2026-10-29T09:00:00', read: false, link: '/farmer/activities' },
  { id: 'n-13', role: 'farmer', type: 'payment', title: 'Input delivery recorded', message: 'Yam setts (500 pcs) were recorded against your name.', createdAt: '2026-06-20T11:00:00', read: true, link: '/farmer/inputs-payments' },
  { id: 'n-14', role: 'farmer', type: 'complaint', title: 'Complaint update', message: 'Your complaint CMP-2026-0041 is under review.', createdAt: '2026-10-25T14:10:00', read: false, link: '/farmer/report-issue' },
];

export const AUDIT_LOG = [
  { id: 'au-1', at: '2026-10-30T10:05:00', actor: 'Benue Rice Growers Union', role: 'cooperative', action: 'Submitted registration documents', entityType: 'Cooperative', entityId: 'coop-6', reason: 'Onboarding', summary: 'Status Draft to Submitted', ref: 'REQ-90817' },
  { id: 'au-2', at: '2026-10-29T17:18:00', actor: 'Zainab Bello', role: 'admin', action: 'Approved disbursement as project reviewer', entityType: 'Disbursement', entityId: 'dis-14', reason: 'Tranche 3 conditions met', summary: 'Approval 1 of 2 recorded', ref: 'REQ-90805' },
  { id: 'au-3', at: '2026-10-29T16:20:00', actor: 'Arnold Smith', role: 'cooperative', action: 'Submitted complaint', entityType: 'Complaint', entityId: 'cmp-5', reason: 'Request review of tranche rejection', summary: 'New complaint CMP-2026-0045', ref: 'REQ-90801' },
  { id: 'au-4', at: '2026-10-28T11:00:00', actor: 'Emeka Eze', role: 'admin', action: 'Paused further disbursements', entityType: 'Package', entityId: 'pkg-7', reason: 'Suspected misuse under investigation (agreement clause 8.3)', summary: 'Disbursement status Active to Paused for new tranches', ref: 'REQ-90770' },
  { id: 'au-5', at: '2026-10-26T09:30:00', actor: 'Arnold Smith', role: 'cooperative', action: 'Submitted milestone evidence', entityType: 'Milestone', entityId: 'ms-3', reason: 'Crop maintenance verified', summary: '2 files uploaded, status Pending Evidence to Under Review', ref: 'REQ-90712' },
  { id: 'au-6', at: '2026-10-22T09:05:00', actor: 'Arnold Okafor', role: 'investor', action: 'Committed funds', entityType: 'Investment', entityId: 'inv-r2', reason: 'Investor agreement v2.1 accepted', summary: 'Commitment N500,000. Receipt not yet confirmed.', ref: 'REQ-90544' },
  { id: 'au-7', at: '2026-10-15T12:00:00', actor: 'System', role: 'system', action: 'Funding target reached', entityType: 'Package', entityId: 'pkg-4', reason: 'Confirmed receipts reached target', summary: 'Status Open for Funding to Funding Target Reached', ref: 'SYS-1021' },
  { id: 'au-8', at: '2026-10-11T14:30:00', actor: 'Emeka Eze', role: 'admin', action: 'Correction posted', entityType: 'Reconciliation', entityId: 'rc-4', reason: 'Provider amount differed by N2,000 (fee)', summary: 'Correcting entry added. Original record retained.', ref: 'REQ-90310' },
];

export const RECONCILIATION = [
  { id: 'rc-1', ref: 'TX-33810021', packageId: 'pkg-1', type: 'Disbursement to supplier', internal: 300000, provider: 300000, providerRef: 'PRV-88120', status: 'Confirmed', reconciledBy: 'System', reconciledAt: '2026-05-22', note: '' },
  { id: 'rc-2', ref: 'TX-12345675', packageId: 'pkg-1', type: 'Disbursement to farmers', internal: 100000, provider: 100000, providerRef: 'PRV-90412', status: 'Under Reconciliation', reconciledBy: null, reconciledAt: null, note: 'Awaiting final provider batch report' },
  { id: 'rc-7', ref: 'TX-33810022', packageId: 'pkg-1', type: 'Disbursement to supplier', internal: 200000, provider: 200000, providerRef: 'PRV-88121', status: 'Confirmed', reconciledBy: 'System', reconciledAt: '2026-06-18', note: '' },
  { id: 'rc-3', ref: 'TX-84120938', packageId: 'pkg-2', type: 'Investor receipt', internal: 500000, provider: 0, providerRef: '', status: 'Pending', reconciledBy: null, reconciledAt: null, note: 'No provider confirmation yet. Commitment is not received money.' },
  { id: 'rc-4', ref: 'TX-84120950', packageId: 'pkg-6', type: 'Investor receipt', internal: 2000000, provider: 1998000, providerRef: 'PRV-77412', status: 'Confirmed', reconciledBy: 'Emeka Eze', reconciledAt: '2026-10-11', note: 'Corrected for N2,000 provider fee through an auditable correction entry' },
  { id: 'rc-5', ref: 'TX-33810099', packageId: 'pkg-7', type: 'Disbursement to farmers', internal: 940000, provider: 0, providerRef: 'PRV-91002', status: 'Failed', reconciledBy: null, reconciledAt: null, note: 'Provider reported account mismatch. Retry is idempotent. No duplicate payment created.' },
  { id: 'rc-6', ref: 'TX-33810101', packageId: 'pkg-7', type: 'Sale receipt', internal: 20700000, provider: 16700000, providerRef: 'PRV-91210', status: 'Under Reconciliation', reconciledBy: null, reconciledAt: null, note: 'Buyer balance of N4,000,000 outstanding' },
];

export const RISK_CASES = [
  { id: 'rk-1', packageId: 'pkg-6', coopId: 'coop-2', category: 'Missed reporting deadline', severity: 'Medium', title: 'Harvest storage evidence overdue', detail: 'Required storage records were due on 20 Oct 2026.', status: 'Awaiting Response', raisedAt: '2026-10-21', owner: 'Zainab Bello', timeline: [{ at: '2026-10-21', text: 'System flagged missed deadline. Not treated as fraud.' }, { at: '2026-10-22', text: 'Cooperative notified and asked to respond.' }] },
  { id: 'rk-2', packageId: 'pkg-7', coopId: 'coop-3', category: 'Suspected misuse of funds', severity: 'High', title: 'Seed allocation possibly resold', detail: 'A complaint alleges seed was sold to a third party. Evidence under review.', status: 'Escalated', raisedAt: '2026-10-21', owner: 'Emeka Eze', timeline: [{ at: '2026-10-21', text: 'Complaint CMP-2026-0043 linked.' }, { at: '2026-10-22', text: 'Explanation requested. Evidence preserved.' }, { at: '2026-10-28', text: 'Further disbursements paused where permitted.' }] },
  { id: 'rk-3', packageId: 'pkg-1', coopId: 'coop-1', category: 'Project delay', severity: 'Low', title: 'Herbicide delivery delayed', detail: 'One supplier delivery is 12 days late.', status: 'Under Review', raisedAt: '2026-10-18', owner: 'Zainab Bello', timeline: [{ at: '2026-10-18', text: 'Farmer complaint received.' }] },
  { id: 'rk-4', packageId: 'pkg-9', coopId: 'coop-1', category: 'Genuine crop failure', severity: 'Medium', title: 'Flood damage on 2 plots', detail: 'Flood loss reported with photos and community leader statement. Assessor assigned.', status: 'Under Review', raisedAt: '2026-08-02', owner: 'Emeka Eze', timeline: [{ at: '2026-08-02', text: 'Loss reported within the agreed 7 days.' }, { at: '2026-08-10', text: 'Independent assessor visited. Classified as genuine crop loss, not fraud.' }] },
  { id: 'rk-5', packageId: 'pkg-4', coopId: 'coop-1', category: 'Disputed expense', severity: 'Low', title: 'Fencing quotation differs from invoice', detail: 'Invoice is N15,000 above the approved quotation.', status: 'Open', raisedAt: '2026-10-26', owner: 'Unassigned', timeline: [] },
];

export const RISK_CATEGORIES = ['Missed reporting deadline', 'Project delay', 'Disputed expense', 'Genuine crop failure', 'Inability to repay', 'Suspected misuse of funds', 'Confirmed fraud or breach'];

export const APPLICATIONS = [
  { id: 'app-1', packageId: 'pkg-10', coopId: 'coop-1', type: 'Funding application', submittedAt: '2026-10-24', stage: 'Under Review', reviewer: 'Zainab Bello', secondApprover: null, amount: 1800000, notes: 'Greenhouse materials quotation needs a second supplier.' },
  { id: 'app-2', packageId: 'pkg-11', coopId: 'coop-1', type: 'Funding application', submittedAt: '2026-10-18', stage: 'Changes Requested', reviewer: 'Zainab Bello', secondApprover: null, amount: 1200000, notes: 'Budget items total N1,200,000 but quotation is N1,150,000. Reconcile.' },
  { id: 'app-3', packageId: 'pkg-8', coopId: 'coop-3', type: 'Budget change', submittedAt: '2026-10-27', stage: 'Under Review', reviewer: 'Zainab Bello', secondApprover: null, amount: 2000000, notes: 'Material change: processing equipment +N150,000. Needs a second authorised reviewer.' },
  { id: 'app-4', packageId: 'pkg-2', coopId: 'coop-1', type: 'Funding application', submittedAt: '2026-08-12', stage: 'Approved', reviewer: 'Zainab Bello', secondApprover: 'Emeka Eze', amount: 3000000, notes: 'Approved. Approval is not a guarantee of commercial success.' },
  { id: 'app-5', packageId: 'pkg-12', coopId: 'coop-1', type: 'Funding application', submittedAt: '2026-10-28', stage: 'Submitted', reviewer: null, secondApprover: null, amount: 2200000, notes: '' },
];

export const USER_VERIFICATION = [
  { id: 'uv-1', name: 'Michael Eze', role: 'investor', email: 'michael.eze@example.com', submittedAt: '2026-10-27', status: 'Under Review', checks: { identity: 'Uploaded', eligibility: 'Pending', riskAck: 'Not done', emailVerified: true } },
  { id: 'uv-2', name: 'Rural Growth Trust', role: 'investor', email: 'invest@ruralgrowth.example', submittedAt: '2026-10-20', status: 'Additional Information Required', checks: { identity: 'Verified', eligibility: 'Pending', riskAck: 'Done', emailVerified: true } },
  { id: 'uv-3', name: 'Tobi Ojo', role: 'farmer', email: 'tobi.ojo@example.com', submittedAt: '2026-10-29', status: 'Submitted', checks: { identity: 'Uploaded', eligibility: 'n/a', riskAck: 'n/a', emailVerified: false } },
  { id: 'uv-4', name: 'Grace Okoro', role: 'farmer', email: 'grace.okoro@example.com', submittedAt: '2026-10-26', status: 'Under Review', checks: { identity: 'Uploaded', eligibility: 'n/a', riskAck: 'n/a', emailVerified: true } },
];

export const PLATFORM_SETTINGS = {
  approvalLimits: { singleApproverMax: 50000, secondApproverAbove: 50000, dailyDisbursementCap: 20000000 },
  investor: { minimumInvestment: 50000, requireRiskAcknowledgement: true, eligibilityCheck: 'Configurable per legal structure' },
  notifications: { emailEnabled: true, lateReportReminderDays: 3, milestoneReminderDays: 7 },
  security: { adminMfa: true, loginAttemptLimit: 5, sessionMinutes: 30 },
  pendingDecisions: ['Funding model', 'Investor returns basis', 'Borrower', 'Cooperative liability', 'Disbursement method', 'Financial partner', 'Funding target shortfall handling', 'Crop failure loss bearer', 'Harvest sales route', 'Regulatory structure'],
};

export const FAQ = [
  { q: 'What is CollabFarm Finance?', a: 'A cooperative-led platform that connects investors with verified agricultural cooperatives. Every naira is approved, released in stages and traced from commitment to repayment.' },
  { q: 'Does CollabFarm hold my money?', a: 'No. Payments are received and paid out by a regulated financial partner. CollabFarm records commitments, approvals and confirmations. It does not claim to hold or transfer money itself.' },
  { q: 'Is my return guaranteed?', a: 'No. Project approval is not a guarantee of success and returns depend on the signed agreement and crop outcomes. Expected figures on the platform are estimates, never promises.' },
  { q: 'What happens if a crop fails?', a: 'A genuine crop failure is assessed on evidence and the signed agreement. It is not treated as fraud, and it does not automatically excuse repayment unless the agreement or law says so.' },
  { q: 'How do farmers get paid?', a: 'Funds are released in tranches. Where possible suppliers are paid directly. Payments to farmers need confirmed identity, an approved amount and purpose, and independent approval.' },
  { q: 'Who checks the cooperatives?', a: 'CollabFarm administrators review identity, leadership, registration, membership, farming capacity, location and documents. Uploaded and verified documents are shown separately.' },
  { q: 'How do I raise a complaint?', a: 'Sign in and open Complaints. Every complaint gets a reference, an assigned reviewer and a visible status. A complaint never triggers a public accusation.' },
  { q: 'Do you offer a mobile app?', a: 'The first release is a responsive website that works on phones, tablets and computers. Native apps are not part of the first release.' },
];

export const ROI_SERIES = {
  '6m': [{ label: "Dec '25", value: 72, tone: 'gold' }, { label: "Jan '26", value: 55, tone: 'gold' }, { label: "Feb '26", value: 27, tone: 'green' }, { label: "Mar '26", value: 98, tone: 'gold' }, { label: "Apr '26", value: 45, tone: 'green' }, { label: "May '26", value: 70, tone: 'gold' }],
  '12m': [{ label: 'Jun', value: 35, tone: 'green' }, { label: 'Aug', value: 48, tone: 'gold' }, { label: 'Oct', value: 52, tone: 'green' }, { label: 'Dec', value: 72, tone: 'gold' }, { label: 'Feb', value: 27, tone: 'green' }, { label: 'Apr', value: 70, tone: 'gold' }],
};
