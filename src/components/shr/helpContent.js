import { FAQ } from '../../data/governance.js';
import { formatNaira } from '../../utils/format.js';

// Role specific questions that sit beside the shared FAQ from src/data/governance.js.
// Each item: { q, a, roles? } where roles is a list of roles that should see it (all roles when omitted).
const EXTRA = [
  { roles: ['investor'], q: 'What does it mean when I "commit" to a funding package?', a: 'A commitment is your promise to fund. It is not received money. A commitment only becomes confirmed funding once the financial partner confirms the payment and the platform shows the confirmation.' },
  { roles: ['investor'], q: 'Why can I not invest straight away?', a: 'You need a verified account, to have acknowledged the risks and to have signed Agreement A. If one of these is missing the Contracts page shows exactly which one.' },
  { roles: ['investor'], q: 'When do I get repayments or a share of the harvest?', a: 'Only after harvest, sales and reconciliation, and only as set out in your signed agreement. Any amounts you see before then are estimates, not promises. You can lose some or all of the money you put in.' },
  { roles: ['investor'], q: 'What can I see about the farmers?', a: 'A privacy preserving view: counts, crop type and progress. You never see ID numbers, phone numbers or exact addresses.' },
  { roles: ['cooperative'], q: 'Why is my funding request not visible to investors?', a: 'A request is shown to investors only after your cooperative is verified, Agreement B is signed and an administrator has approved the package. Approval is not a guarantee that it will be funded or succeed.' },
  { roles: ['cooperative'], q: 'How are tranches released?', a: 'Funds are released in stages (tranches). Each stage needs the earlier milestone to be approved, a request that states the recipient, amount and purpose, and an independent approval. Above the approval limit a second approver is needed.' },
  { roles: ['cooperative'], q: 'What evidence should I upload for a milestone?', a: 'Clear photos, receipts, delivery notes or inspection notes that match the milestone. Evidence you upload is marked User-submitted until an administrator reviews it.' },
  { roles: ['cooperative'], q: 'A farmer is waiting for activation. What do I do?', a: 'Open the farmer record and check that the phone number is correct, then ask them to complete activation with the code they received. Identity checks are done by administrators.' },
  { roles: ['farmer'], q: 'What is my agreement and why do I need to sign it?', a: 'It is the plain agreement between you and your cooperative about the support you receive and what you will deliver or repay. Read the short summary first. Ask your cooperative if anything is unclear before you sign.' },
  { roles: ['farmer'], q: 'Will I receive cash?', a: 'Often not. Support may be seeds, tools or services paid straight to a supplier. Your Inputs and Payments page shows what was recorded for you. If something is wrong, use Report an issue.' },
  { roles: ['farmer'], q: 'My crop failed. Will I be treated as a fraud?', a: 'No. A genuine crop failure is checked on evidence. It is not treated as fraud. Tell your cooperative early and report it so it can be recorded.' },
  { roles: ['farmer'], q: 'Who can see my details?', a: 'Your cooperative and platform administrators. Investors only see a privacy preserving view and never your ID number, phone number or exact address.' },
  { roles: ['admin'], q: 'Why can I not approve a payment I raised?', a: 'Payments use maker-checker control. The person who raised or first approved a payment cannot approve it again. Above the limit a second, different approver is required.' },
  { roles: ['admin'], q: 'How do I handle a suspected misuse case?', a: 'Open a risk case and record the reason, evidence and status. A case is a review, not a finding, and nothing is made public. Mark it resolved only with a written outcome.' },
  { roles: ['admin'], q: 'Can an audit entry be edited or deleted?', a: 'No. The audit log is append only. A correction is recorded as a new entry that points to the original.' },
  { roles: ['cooperative', 'investor', 'farmer'], q: 'How do I change my password?', a: 'Open Settings, choose Security and select Change Password. In this demo any current password is accepted and nothing is stored.' },
  { roles: ['admin'], q: 'How do I change my contact details?', a: 'Open your profile from the account menu, edit the contact details and save. The change is written to the audit log.' },
];

export function faqFor(role) {
  const core = FAQ.map((f, i) => ({ id: `core-${i}`, q: f.q, a: f.a, tag: 'General' }));
  const own = EXTRA.filter((e) => !e.roles || e.roles.includes(role)).map((e, i) => ({ id: `role-${i}`, q: e.q, a: e.a, tag: 'For you' }));
  return [...own, ...core];
}

// Plain language meanings. `example` is illustrative only.
export const GLOSSARY = [
  { term: 'Funding package', meaning: 'A farming project that asks for money. It has a budget, a plan and a set of tranches. It is not a savings product and nothing about it is guaranteed.', example: `A 12 hectare maize project with a budget of ${formatNaira(8500000)}.` },
  { term: 'Commitment', meaning: 'A promise to fund. It is not money that has been received. It becomes confirmed funding only after the financial partner confirms the payment.', example: `You commit ${formatNaira(500000)} today. Your funding is confirmed when the partner confirms receipt.` },
  { term: 'Tranche', meaning: 'One stage of the money. Funds are released in stages instead of all at once, so each stage can be checked before the next one is paid.', example: 'Tranche 1 pays for seeds and land preparation. Tranche 2 is released after the first milestone is approved.' },
  { term: 'Milestone', meaning: 'A checkpoint in the farming plan with evidence, such as planting finished or harvest started. Approving a milestone can unlock the next tranche.', example: 'Planting complete, with photos and an inspection note.' },
  { term: 'Disbursement', meaning: 'A payment going out to a supplier, farmer or cooperative. A request is not the same as money received. Look for the partner confirmation.', example: 'Seed supplier paid for 40 bags of seed.' },
  { term: 'Reconciliation', meaning: 'Matching what the platform records against what the financial partner reports, line by line, so differences can be found and explained.', example: `The platform shows ${formatNaira(600000)} released. The partner statement shows ${formatNaira(600000)} paid out. They match.` },
  { term: 'Distribution', meaning: 'A payment back to investors after harvest, sales and reconciliation, as set in the agreement. Amounts before then are estimates.', example: 'A share of sales proceeds paid back after the season closes.' },
  { term: 'Maker-checker', meaning: 'A safety rule: one person prepares or approves a payment and a different person must approve it too. Nobody can approve their own payment.', example: 'One administrator reviews the request and another approves the payment.' },
  { term: 'Partner account', meaning: 'Money passes through an account held by a regulated financial partner. CollabFarm does not hold or pool money. This is not described as an escrow service.', example: 'Your payment goes to the partner, who confirms it back to the platform.' },
  { term: 'Confirmed, Estimate, User-submitted', meaning: 'Confirmed means checked by a reviewer or the partner. Estimate is a projection and never a promise. User-submitted is a claim that has not been verified yet.', example: 'A harvest weight entered by a cooperative stays User-submitted until reviewed.' },
  { term: 'Agreements A, B and C', meaning: 'A is between an investor and the platform. B is between the cooperative and the platform. C is between a farmer and the cooperative. Funding steps are blocked while a needed agreement is missing.', example: 'A farmer cannot be allocated funds until Agreement C is signed.' },
  { term: 'Audit log', meaning: 'A record of who did what and when. Entries are added, never edited or deleted, and they never contain passwords or identity documents.', example: 'Zainab Bello approved milestone M2 at 10:12.' },
];

export const HOURS = [
  { day: 'Monday to Friday', time: '8:00 AM to 5:00 PM' },
  { day: 'Saturday', time: '9:00 AM to 1:00 PM' },
  { day: 'Sunday and public holidays', time: 'Closed' },
];

export const SUPPORT = { email: 'support@collabfarm.example', phone: '+234 800 000 0000', note: 'Placeholder contact details for this demo. Times are West Africa Time.' };

export const TOPICS = ['Funding or commitments', 'Payments or disbursements', 'Agreements or signing', 'My account or sign in', 'Reports or data', 'Something else'];

// Quick links by role. `to` is relative to the role base path.
export const QUICK_LINKS = {
  cooperative: [
    { label: 'How funding works', hint: 'Funding requests and tranches', to: '/funding', icon: 'wallet' },
    { label: 'Raise a complaint', hint: 'Report a problem and get a reference', to: '/complaints/new', icon: 'flag' },
    { label: 'My agreements', hint: 'Sign or read Agreements B and C', to: '/contracts', icon: 'file' },
    { label: 'Farming progress', hint: 'Milestones and evidence', to: '/farming-progress', icon: 'sprout' },
  ],
  investor: [
    { label: 'How funding works', hint: 'Browse funding packages', to: '/packages', icon: 'wallet' },
    { label: 'Raise a complaint', hint: 'Report a problem and get a reference', to: '/complaints/new', icon: 'flag' },
    { label: 'Risk disclosures', hint: 'What can go wrong, in plain words', to: '/risk-disclosures', icon: 'shield' },
    { label: 'My agreements', hint: 'Read and sign Agreement A', to: '/contracts', icon: 'file' },
  ],
  admin: [
    { label: 'Raise or review complaints', hint: 'Triage and update cases', to: '/complaints', icon: 'flag' },
    { label: 'Audit logs', hint: 'Who did what and when', to: '/audit-logs', icon: 'file' },
    { label: 'Reports', hint: 'Platform wide reports', to: '/reports', icon: 'chart' },
    { label: 'Risk alerts', hint: 'Cases that need a review', to: '/risk-alerts', icon: 'shield' },
  ],
  farmer: [
    { label: 'How my funding works', hint: 'See what was set aside for me', to: '/allocation', icon: 'wallet' },
    { label: 'Report an issue', hint: 'Tell us if something is wrong', to: '/report-issue', icon: 'flag' },
    { label: 'My agreement', hint: 'Read the plain summary', to: '/agreement', icon: 'file' },
    { label: 'Inputs and payments', hint: 'What was recorded for me', to: '/inputs-payments', icon: 'sprout' },
  ],
};

export const REMEMBER = [
  { title: 'A commitment is not received money', text: 'It becomes confirmed funding only when the financial partner confirms the payment.' },
  { title: 'Approval is not a guarantee of success', text: 'A project can be approved and still run into problems. Returns are estimates, never promises.' },
  { title: 'Crop failure is not fraud', text: 'A genuine failure is checked on evidence and on the signed agreement. Report it early.' },
];
