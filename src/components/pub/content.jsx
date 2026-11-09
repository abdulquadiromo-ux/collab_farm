// Static, plain-language content for the public pages. Nothing here is a promise of returns.
// Anything that depends on live sample data (counts, package values) is computed inside the pages instead.
import {
  HandCoins, Landmark, ClipboardCheck, Layers, Camera, Wheat, Coins, Building2, ShieldCheck, FileCheck2, Users, UserCheck,
  Scale, CloudRain, TrendingDown, Hourglass, Lock, ShieldAlert, AlertTriangle, MapPin, Sprout, FileSignature, Eye,
  Handshake, Truck, FileSearch, Search, Flag, LifeBuoy, Gavel, Briefcase, Headphones, Shield, Banknote, ListChecks,
} from 'lucide-react';

/* ------------------------------------------------------------------------------------------------ */
/* How it works: the lifecycle                                                                       */
/* ------------------------------------------------------------------------------------------------ */

export const ROLE_TABS = [
  { id: 'investor', label: 'Investor', icon: <Coins size={18} /> },
  { id: 'cooperative', label: 'Cooperative', icon: <Building2 size={18} /> },
  { id: 'farmer', label: 'Farmer', icon: <Sprout size={18} /> },
];

export const ROLE_END_LINK = {
  investor: { to: '/register/investor', label: 'Register as an investor' },
  cooperative: { to: '/register/cooperative', label: 'Register your cooperative' },
  farmer: { to: '/farmer-activation', label: 'Activate your farmer account' },
};

export const LIFECYCLE = [
  {
    id: 'commitment', title: 'Commitment', icon: HandCoins,
    plain: 'An investor chooses an approved funding package and signs a funding agreement for an amount. This is a promise. No money has moved yet.',
    term: ['Commitment', 'Your signed promise to invest an amount. It is not money received.'],
    roles: {
      investor: {
        headline: 'You pick an approved package and sign Agreement A.',
        does: ['Browse approved funding packages and read the budget, risks and terms', 'Tick the risk acknowledgement and sign Agreement A with your typed name', 'Commit an amount between the package minimum and maximum'],
        sees: ['Your commitment, shown as Pending', 'The version and time of the agreement you signed'],
        guard: 'Only verified investors who have acknowledged the risks can commit. A commitment is a promise, not received money.',
      },
      cooperative: {
        headline: 'Your approved project opens to investors.',
        does: ['Submit the project and funding request for review', 'Wait for the decision. Approval does not guarantee funding or success', 'Sign Agreement B, the funding and accountability agreement'],
        sees: ['How much has been committed and how much is confirmed', 'The review status of your request'],
        guard: 'A package is shown to investors only after an administrator approves it. Only confirmed funds count toward the funding target.',
      },
      farmer: {
        headline: 'Your cooperative proposes you for support.',
        does: ['Complete your profile and identity check', 'Read your Farmer Participation Agreement (Agreement C). A plain language copy is available', 'Give consent to share limited details with investors'],
        sees: ['Your membership and proposed support'],
        guard: 'You are not active in a project until identity, membership and consent checks are complete.',
      },
    },
  },
  {
    id: 'confirmed', title: 'Confirmed funds', icon: Landmark,
    plain: 'The investor pays through a regulated financial partner. Funds count only when the partner confirms receipt and the payment is checked against our records.',
    term: ['Reconciliation', 'Matching our records with the financial partner\'s records so every naira agrees.'],
    roles: {
      investor: {
        headline: 'You pay the financial partner and wait for confirmation.',
        does: ['Pay using the details shown. CollabFarm never takes the money itself', 'Wait for the partner to confirm receipt'],
        sees: ['Payment status: Initiated, Pending, then Confirmed', 'The amount confirmed received, shown apart from your commitment'],
        guard: 'A payment initiation is never proof of receipt. Only the partner\'s confirmation, checked by an administrator, moves an amount to Confirmed.',
      },
      cooperative: {
        headline: 'You watch confirmed funding build toward the target.',
        does: ['Follow committed and confirmed amounts side by side', 'Do not spend against commitments that are not yet confirmed'],
        sees: ['Committed versus confirmed amounts', 'A notice when the funding target is reached'],
        guard: 'Spending is controlled by the approved budget and confirmed funds, never by commitments alone.',
      },
      farmer: {
        headline: 'Nothing is needed from you yet.',
        does: ['Wait for your cooperative to tell you funding is confirmed'],
        sees: ['A notification when your project is funded'],
        guard: 'No support is paid to you before funds are confirmed and the relevant stage is approved.',
      },
    },
  },
  {
    id: 'budget', title: 'Approved budget', icon: ClipboardCheck,
    plain: 'The cooperative lists every planned cost, and a reviewer approves the budget. The lines must add up to the approved funding plan.',
    term: ['Budget line', 'One planned cost, such as seeds, with an amount, a purpose and a document that supports it.'],
    roles: {
      investor: {
        headline: 'You can read the approved budget before and after you commit.',
        does: ['Read each budget line, its purpose and the supplier quotation', 'Ask support a question if a line is unclear'],
        sees: ['Budget by category, such as seeds, land preparation and equipment', 'Reviewer decisions and any material change requests'],
        guard: 'Budget lines must add up to the approved plan. A material change needs a second reviewer.',
      },
      cooperative: {
        headline: 'You build the budget and propose each farmer\'s share.',
        does: ['Build the budget by category with supporting documents', 'Propose how much each farmer receives, and whether it is cash or goods', 'Submit it for review'],
        sees: ['Review status and reviewer notes', 'Remaining unallocated amount'],
        guard: 'Allocations cannot exceed the budget or repeat for the same farmer. The cooperative proposes and a different person approves.',
      },
      farmer: {
        headline: 'You check what has been proposed for you.',
        does: ['Review your allocation and the type of support, cash or inputs'],
        sees: ['Your approved amount, purpose and expected date'],
        guard: 'You cannot change your own allocation. Questions go to your cooperative or to support.',
      },
    },
  },
  {
    id: 'release', title: 'Staged release', icon: Layers,
    plain: 'The budget is released in four stages, not all at once. Each stage opens only when the one before it is released and its evidence is approved.',
    term: ['Tranche', 'One instalment of the approved budget. There are four, released one at a time.'],
    roles: {
      investor: {
        headline: 'You follow four stages from preparation to harvest.',
        does: ['Follow each stage: preparation, planting, crop maintenance and harvest'],
        sees: ['Stage status: Locked, Pending Evidence, Under Review, Approved or Released', 'Who approved each release, and when'],
        guard: 'No stage is released on request alone. Payments above the approval limit need a second, different approver.',
      },
      cooperative: {
        headline: 'You request each stage with evidence.',
        does: ['Request a stage and attach the required evidence', 'Pay suppliers directly where practical'],
        sees: ['Stage status, amounts and remaining funds'],
        guard: 'Duties are separated: the cooperative requests, a reviewer checks evidence, a payment approver authorises, the partner pays and the system reconciles.',
      },
      farmer: {
        headline: 'Support reaches you as inputs or payments in your name.',
        does: ['Receive the inputs or labour payments recorded for you', 'Tell your cooperative if something does not arrive'],
        sees: ['Inputs and payments recorded against your name'],
        guard: 'Payments go only to a verified account. Never to an unrelated personal account without a documented review.',
      },
    },
  },
  {
    id: 'activity', title: 'Verified farming activity', icon: Camera,
    plain: 'Farming work is reported with evidence such as receipts, inspection reports and photos. A reviewer decides whether the evidence is enough.',
    term: ['Milestone', 'A checkpoint in the farming cycle, such as land preparation finished, that must be proven with evidence.'],
    roles: {
      investor: {
        headline: 'You follow progress and incidents as they are reported.',
        does: ['Read progress reports', 'Ask a question or raise a concern if something looks wrong'],
        sees: ['Milestone reports with receipts, photos and field inspection results', 'Delays and incidents'],
        guard: 'Photos and GPS support a review but are not conclusive. A person decides whether evidence is enough.',
      },
      cooperative: {
        headline: 'You upload evidence and report problems early.',
        does: ['Upload delivery receipts, supplier invoices, inspection reports and planting or maintenance reports', 'Report delays or crop problems as soon as you know'],
        sees: ['Milestone status and reviewer comments'],
        guard: 'A missed deadline or a failed crop is never treated as fraud automatically. Each case is reviewed on evidence.',
      },
      farmer: {
        headline: 'You report your own progress.',
        does: ['Submit progress reports and photos for your activities', 'Report crop failure or delayed support'],
        sees: ['Your assigned activities and due dates'],
        guard: 'Reports are read by people. A problem you report is not held against you automatically.',
      },
    },
  },
  {
    id: 'harvest', title: 'Harvest and sales', icon: Wheat,
    plain: 'The cooperative records how much was harvested and sold. A sale counts as money received only after the buyer\'s payment is confirmed.',
    term: ['Verified sale', 'A sale where the buyer\'s payment has been confirmed, not only recorded.'],
    roles: {
      investor: {
        headline: 'You see expected versus actual harvest and what was sold.',
        does: ['Review harvest and sales reports'],
        sees: ['Expected and actual quantity, quality and storage', 'Each sale with buyer, quantity, price and payment status'],
        guard: 'A recorded sale is not money received until the payment is confirmed and reconciled.',
      },
      cooperative: {
        headline: 'You record the harvest and every sale.',
        does: ['Record harvest quantity, quality and where it is stored', 'Record each sale with buyer, price and reference', 'Upload receipts or buyer confirmations'],
        sees: ['Sales that are still Under Reconciliation', 'Outstanding buyer balances'],
        guard: 'An administrator approves the harvest record. Sales stay Under Reconciliation until payment is confirmed.',
      },
      farmer: {
        headline: 'You see the harvest record for your plot.',
        does: ['Check the harvest record', 'Deliver produce or repay as your agreement says'],
        sees: ['Your repayment or produce obligation and its due date'],
        guard: 'Your terms are exactly those in your signed agreement. Crop loss is assessed on evidence.',
      },
    },
  },
  {
    id: 'return', title: 'Repayment or distribution', icon: Banknote,
    plain: 'Money flows back as the signed agreement says: repayment of capital, a share of profit, or a share of harvest. Returns depend on the harvest and are never guaranteed.',
    term: ['Profit share', 'When the agreement says so, investors receive an agreed percentage of the profit left after eligible costs. It is not a fixed or guaranteed amount.'],
    roles: {
      investor: {
        headline: 'You review the calculation, then receive payment through the partner.',
        does: ['Review how the amount was calculated', 'Raise a dispute if the amount looks wrong'],
        sees: ['Amount due, paid, outstanding and disputed', 'The calculation, traced back to verified sales and costs'],
        guard: 'Repayment of capital is never confused with profit. Calculations are reviewed before payment and double payment is blocked.',
      },
      cooperative: {
        headline: 'You make sure proceeds reach the agreed account and close the books.',
        does: ['Pass sales proceeds on as the agreement says', 'Submit the final account, including any unspent funds'],
        sees: ['Distribution status and outstanding obligations'],
        guard: 'Unspent funds are reconciled and handled as the agreements say. There is no automatic seizure.',
      },
      farmer: {
        headline: 'You settle what your agreement says you owe, if anything.',
        does: ['Make the repayment or produce delivery in your agreement', 'Ask for a statement of what is outstanding'],
        sees: ['What you owe, when, and what you have already paid'],
        guard: 'A failed harvest is not fraud. Options such as rescheduling are considered case by case on evidence.',
      },
    },
  },
];

export const NEVER_CONFUSE = [
  { title: 'A commitment is not received money', body: 'A signed commitment or a payment that has been started is only a promise. It counts as funds only after the regulated financial partner confirms receipt.' },
  { title: 'Approval is not a guarantee', body: 'When a reviewer approves a project, it means the paperwork passed checks. It does not mean the crop will succeed or that any return will be paid.' },
  { title: 'Crop failure is not fraud', body: 'A missed deadline or a failed harvest never labels a farmer or cooperative as dishonest. Each case is reviewed on evidence and the signed agreement.' },
];

export const SEPARATION_CHAIN = [
  { who: 'Cooperative', what: 'Submits the budget' },
  { who: 'Project reviewer', what: 'Approves the budget' },
  { who: 'Milestone reviewer', what: 'Checks the evidence' },
  { who: 'Payment approver', what: 'Authorises the payment' },
  { who: 'Financial partner', what: 'Pays and confirms' },
  { who: 'System', what: 'Reconciles the records' },
];

/* ------------------------------------------------------------------------------------------------ */
/* Cooperative funding                                                                               */
/* ------------------------------------------------------------------------------------------------ */

export const COOP_STEPS = [
  { title: 'Register', icon: Building2, body: 'Create the cooperative account with its name, registration number, address, official contacts and authorised representatives.' },
  { title: 'Get verified', icon: ShieldCheck, body: 'Upload your registration certificate, proof of address and leadership identification. An administrator reviews each one.' },
  { title: 'Build a budget', icon: ClipboardCheck, body: 'List every planned cost by category, with an amount, a purpose and a supporting quotation. The lines must add up to the funding plan.' },
  { title: 'Allocate farmers', icon: Users, body: 'Propose how much support each verified farmer receives and whether it is cash or goods. Totals cannot exceed the budget.' },
  { title: 'Sign agreements', icon: FileSignature, body: 'Sign the Cooperative Funding and Accountability Agreement. Each farmer signs a participation agreement of their own.' },
  { title: 'Receive funds in four stages', icon: Layers, body: 'Funds are released in stages, each one after the previous stage is released and its evidence is approved.' },
  { title: 'Report evidence', icon: Camera, body: 'Upload receipts, invoices, inspection and progress reports as the farming cycle moves forward.' },
  { title: 'Record harvest and sales', icon: Wheat, body: 'Record what was harvested and sold. Sales count as received only when payment is confirmed.' },
];

export const COOP_REGISTRATION = [
  'Cooperative name and registration number',
  'Year established, official email and phone',
  'Address, state and local government area',
  'Authorised representatives and their roles',
  'Registration certificate and proof of address',
  'Payout account details, where required',
  'Information about participating farmers',
  'Land access and agricultural documents',
];

export const COOP_RULES = [
  { icon: Lock, title: 'Funds follow the budget, not the commitments', body: 'Money is released against the approved budget and approved evidence. Nothing is released on request alone.' },
  { icon: Scale, title: 'The numbers must add up', body: 'Budget lines must equal the funding plan. Farmer allocations cannot exceed the budget or be entered twice.' },
  { icon: Camera, title: 'Evidence supports, people decide', body: 'Photos and GPS help a reviewer, but they are not conclusive on their own.' },
  { icon: UserCheck, title: 'Farmers must be verified first', body: 'A farmer is not active in a project until identity, membership and consent checks are complete.' },
  { icon: Truck, title: 'Suppliers are paid directly where practical', body: 'This keeps money away from unrelated personal accounts and gives a clear invoice trail.' },
  { icon: Flag, title: 'Problems are reported early', body: 'A genuine crop failure is not fraud. Reporting a problem early protects everyone.' },
];

/* ------------------------------------------------------------------------------------------------ */
/* Investor information                                                                              */
/* ------------------------------------------------------------------------------------------------ */

export const INVESTOR_STEPS = [
  { title: 'Register and verify', body: 'Confirm your identity and eligibility, and acknowledge the risks.', icon: UserCheck },
  { title: 'Browse approved packages', body: 'Only projects that passed review are shown. Read the budget, farmers\' privacy-safe profiles, risks and terms.', icon: Search },
  { title: 'Sign Agreement A and commit', body: 'Choose an amount within the package limits, then sign with your typed name. The version and time are recorded.', icon: FileSignature },
  { title: 'Pay the financial partner', body: 'Funds go to the regulated partner, not to CollabFarm. The partner confirms receipt.', icon: Landmark },
  { title: 'Follow every stage', body: 'See stage releases, evidence, harvest, sales and the calculation of what is paid back.', icon: Eye },
];

export const INVESTOR_CAN_SEE = [
  'The approved budget by category',
  'Stage status and who approved each release',
  'Milestone reports, receipts and inspection results',
  'Incidents, delays and crop problems',
  'Verified harvest and sales records',
  'How each repayment or distribution was calculated',
];

export const INVESTOR_CANNOT_SEE = [
  'A farmer\'s national identity number (NIN)',
  'A farmer\'s phone number',
  'A farmer\'s exact home address',
  'Other investors\' private details',
];

export const SIX_AMOUNTS_PLAIN = {
  intended: 'The amount you plan to invest. A plan only.',
  committed: 'The amount you signed an agreement for. A promise, not money received.',
  confirmed: 'The amount the regulated financial partner confirmed it received from you.',
  available: 'Confirmed money that may be released once the budget and stage rules are met.',
  disbursed: 'Money actually paid out, for example to a supplier, after the approvals.',
  repaid: 'Money paid back to you under the agreement, such as capital repayment or a profit share.',
};

export const AGREEMENTS = [
  { code: 'A', title: 'Investor Funding Agreement', who: 'Signed by the investor', body: 'States the amount, how the money may be used, release conditions, how any return or repayment is calculated, the risks including possible loss, reporting, what happens on default or crop failure, disputes and ending the agreement. It says whether the package is a loan, profit sharing or harvest participation.' },
  { code: 'B', title: 'Cooperative Funding and Accountability Agreement', who: 'Signed by the cooperative', body: 'Covers the approved budget and farmer allocations, approved uses, release conditions, reporting and monitoring, supplier payments, harvest and sales reporting, unspent funds, the process if misuse is suspected, and the exact extent of the cooperative\'s liability.' },
  { code: 'C', title: 'Individual Farmer Participation Agreement', who: 'Signed by each farmer', body: 'Covers the farmer\'s allocation, permitted use, reporting duties, any repayment or produce delivery, deductions, what happens if the crop fails, the misuse process, and privacy and consent. A copy in an accessible language is provided.' },
];

export const RISKS = [
  { icon: TrendingDown, title: 'You can lose money', body: 'You may get back less than you invested, or nothing at all. Only invest an amount you can afford to lose.', help: 'You must tick a risk acknowledgement before you can commit.' },
  { icon: CloudRain, title: 'Crops can fail', body: 'Drought, flooding, pests and disease can reduce or wipe out a harvest. A genuine crop failure is assessed on evidence and is not treated as fraud.', help: 'What is repaid after a crop failure depends on your signed agreement.' },
  { icon: Coins, title: 'Prices can change', body: 'If crop prices fall before sale, revenue and any profit share fall too, even when the harvest is good.', help: 'Any figures shown are illustrations, not forecasts.' },
  { icon: Hourglass, title: 'Things can be delayed', body: 'Inputs can arrive late, evidence can be rejected and harvests can slip. Repayment dates can move.', help: 'Delays are shown on your investment page as they are reported.' },
  { icon: ShieldAlert, title: 'Returns are not guaranteed', body: 'Approval of a project is not a guarantee of success. Expected returns are estimates only and may never be paid.', help: 'No page on this site promises a return.' },
  { icon: Lock, title: 'Your money is not easy to get back', body: 'Funds are committed for the full cycle. There is no secondary market where you can sell your position, and you cannot withdraw outside the agreed terms.', help: 'Check the package duration before you commit.' },
  { icon: Handshake, title: 'Others may fail to repay', body: 'A cooperative or farmer may be unable or unwilling to repay. Recovery follows the agreement and the law. There is no automatic seizure.', help: 'Controlled, staged release limits how much is exposed at any time.' },
];

/* ------------------------------------------------------------------------------------------------ */
/* About                                                                                             */
/* ------------------------------------------------------------------------------------------------ */

export const PRINCIPLES = [
  { icon: Eye, title: 'Transparency', body: 'Budgets, approvals, evidence and payments are visible to the people they concern, in plain language.' },
  { icon: FileSearch, title: 'Accountability', body: 'Every material action records who did it, when, and for which project. Records are never silently changed.' },
  { icon: Lock, title: 'Controlled disbursement', body: 'Money is released by approved budget and approved evidence, in stages. Commitments alone release nothing.' },
  { icon: Users, title: 'Separation of duties', body: 'No one proposes, approves and pays alone. High value payments need a second, different approver.' },
  { icon: Scale, title: 'Fair risk allocation', body: 'Genuine crop failure is not fraud. Risks are written down before anyone commits, and disputes can be raised.' },
];

export const CF_IS = [
  'A platform that records commitments, approvals, evidence and confirmations',
  'A way for verified cooperatives to present approved projects to investors',
  'A workflow with checks, second approvals and an audit trail',
  'A place to see how every naira was used, step by step',
];

export const CF_IS_NOT = [
  'It does not hold, pool or transfer investor money. A regulated partner does',
  'It does not guarantee returns or promise that a project will succeed',
  'It does not score people with automated credit scoring or give automated investment advice',
  'It does not publicly label anyone as fraudulent over a missed deadline or failed crop',
];

export const PARTNER_FLOW = [
  { icon: Coins, title: 'Investor', body: 'Commits and pays' },
  { icon: Landmark, title: 'Regulated financial partner', body: 'Receives, holds and pays out funds, then confirms each payment' },
  { icon: Truck, title: 'Suppliers and farmers', body: 'Receive approved payments' },
];

export const TEAM_ROLES = [
  { icon: Briefcase, role: 'Platform lead', focus: 'Product direction and delivery' },
  { icon: ShieldCheck, role: 'Head of verification', focus: 'Cooperative, farmer and investor checks' },
  { icon: Scale, role: 'Compliance and data protection lead', focus: 'Regulation, agreements and privacy' },
  { icon: Sprout, role: 'Agricultural operations lead', focus: 'Project review and field monitoring' },
  { icon: Landmark, role: 'Financial partner liaison', focus: 'Payments, confirmations and reconciliation' },
  { icon: Headphones, role: 'Support and complaints lead', focus: 'Questions, complaints and disputes' },
];

/* ------------------------------------------------------------------------------------------------ */
/* Complaints                                                                                        */
/* ------------------------------------------------------------------------------------------------ */

export const COMPLAINT_STEPS = [
  { title: 'Sign in', body: 'Complaints are raised from your own account so that we know who you are and what you are allowed to see.' },
  { title: 'Describe what happened', body: 'Pick the project and the people involved, explain the problem and attach any evidence you have.' },
  { title: 'Get a reference', body: 'Every complaint gets a reference number and an assigned reviewer.' },
  { title: 'Track the status', body: 'Follow the status and read each action taken, with the date and who took it.' },
];

export const COMPLAINT_STATUSES = [
  { status: 'Open', body: 'We have received your complaint and given it a reference. It is waiting for a reviewer.', youCan: ['Keep your reference number', 'Add more detail or evidence'], next: 'A reviewer picks it up and the status becomes Under Review.' },
  { status: 'Under Review', body: 'A reviewer is reading the evidence and may ask other parties for their account.', youCan: ['Answer any question you are asked', 'Add evidence you forgot to include'], next: 'The reviewer may ask for a reply, reach a decision or escalate the case.' },
  { status: 'Awaiting Response', body: 'We asked someone for information, which may be you. The case waits until they reply.', youCan: ['Reply as soon as you can if the question is for you', 'Say so if you need more time'], next: 'When the reply arrives the case goes back to Under Review.' },
  { status: 'Resolved', body: 'A decision was made and the outcome and reasons were recorded and shared with the people allowed to see them.', youCan: ['Read the outcome and the reasons', 'Appeal if you disagree. The time allowed is to be confirmed'], next: 'Nothing, unless someone appeals the decision.' },
  { status: 'Escalated', body: 'The case needs a second reviewer, an independent assessor or a formal process. You are told when this happens.', youCan: ['Give any extra information that is requested', 'Expect to be told what happens next'], next: 'The second reviewer records a decision and the case becomes Resolved.' },
];

export const COMPLAINT_TOPICS = [
  { icon: Truck, title: 'Delayed support', body: 'Inputs or payments that were approved but have not arrived.' },
  { icon: Banknote, title: 'Payments and calculations', body: 'A repayment, distribution or confirmation that looks wrong or late.' },
  { icon: AlertTriangle, title: 'Suspected misuse', body: 'You believe funds or goods were used for something other than the approved purpose.' },
  { icon: Gavel, title: 'Disputes', body: 'You disagree with a review decision, such as a rejected stage or evidence.' },
  { icon: Shield, title: 'Privacy or data', body: 'You think your information was seen or used in a way you did not agree to.' },
  { icon: LifeBuoy, title: 'Anything else', body: 'Other problems with how the platform or a participant has treated you.' },
];

export const COMPLAINT_TIMELINES = [
  ['We acknowledge your complaint', 'To be confirmed'],
  ['A reviewer completes a first review', 'To be confirmed'],
  ['Target time to a decision', 'To be confirmed'],
  ['Time allowed to appeal a decision', 'To be confirmed'],
];

/* ------------------------------------------------------------------------------------------------ */
/* Home page                                                                                         */
/* ------------------------------------------------------------------------------------------------ */

export const VERIFY_CARDS = [
  { icon: MapPin, title: 'GPS Mapping', body: 'Farm locations are recorded with GPS coordinates to help planning and transparency. GPS supports a review but is not conclusive on its own.' },
  { icon: Eye, title: 'Field Visits', body: 'On-site inspections check farm activity and collect ground data that desk checks cannot.' },
  { icon: FileCheck2, title: 'Document Authentication', body: 'People review identity and ownership documents. Uploaded and verified documents are always shown apart.' },
  { icon: ClipboardCheck, title: 'Risk Review', body: 'A reviewer weighs each project against documented criteria and records the reasons. There is no automated scoring in this release.' },
];

export const WHY_CARDS = [
  { icon: ShieldCheck, title: 'Comprehensive Verification', body: 'Layered checks on cooperatives, farmers and documents help reduce the chance of fraud and misuse of funds.', tone: 'green' },
  { icon: MapPin, title: 'GPS Land Records', body: 'Field-recorded GPS mapping gives investors farm size and location data. It supports a review and is not proof by itself.', tone: 'gold' },
  { icon: ClipboardCheck, title: 'Transparent Risk Review', body: 'People review each project against documented criteria, and the main risks are written in plain language before you commit.', tone: 'green' },
];

export const HERO_FEATURES = [
  { icon: UserCheck, label: 'Verified Farmers' },
  { icon: Building2, label: 'Verified Cooperatives' },
  { icon: MapPin, label: 'GPS-tagged Farms' },
  { icon: ListChecks, label: 'Funding Tracking' },
];

export const CONTACT_TOPICS = [
  'General question',
  'Cooperative registration',
  'Investor registration',
  'Payments and confirmations',
  'Technical problem',
  'Privacy or data request',
  'Complaint or dispute',
  'Media or partnership',
];
