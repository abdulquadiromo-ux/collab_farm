import { Sprout, Fish, Layers, Beef, Bird } from 'lucide-react';
import { PACKAGE_TEMPLATES, CATEGORIES } from '../../data/funding.js';

// Funding category tabs. Custom packages are included in All.
export const FUNDING_TABS = [
  { id: 'all', label: 'All', category: null, icon: null },
  { id: 'crop-farming', label: 'Crop Farming', category: 'Crop Farming', icon: <Sprout size={26} strokeWidth={1.5} /> },
  { id: 'fishery', label: 'Fishery', category: 'Fishery', icon: <Fish size={26} strokeWidth={1.5} /> },
  { id: 'mixed-farming', label: 'Mixed Farming', category: 'Mixed Farming', icon: <Layers size={26} strokeWidth={1.5} /> },
  { id: 'livestock', label: 'Livestock', category: 'Livestock', icon: <Beef size={26} strokeWidth={1.5} /> },
  { id: 'poultry', label: 'Poultry', category: 'Poultry', icon: <Bird size={26} strokeWidth={1.5} /> },
];

export const CATEGORY_ICON_LARGE = {
  'Crop Farming': <Sprout size={56} strokeWidth={1.3} />,
  Fishery: <Fish size={56} strokeWidth={1.3} />,
  'Mixed Farming': <Layers size={56} strokeWidth={1.3} />,
  Livestock: <Beef size={56} strokeWidth={1.3} />,
  Poultry: <Bird size={56} strokeWidth={1.3} />,
};

export const PANEL_SUBTITLE = {
  'Crop Farming': 'Support for crop farmers at different stages of production.',
  Fishery: 'Support for fish farmers at different stages of production.',
  'Mixed Farming': 'Support for farms that combine crops and animals.',
  Livestock: 'Support for livestock keepers at different herd sizes.',
  Poultry: 'Support for poultry farmers from small flocks to commercial houses.',
};

export const PHOTO_THEME = {
  'Crop Farming': 'seedling', Fishery: 'fishery', 'Mixed Farming': 'harvest', Livestock: 'farmers', Poultry: 'poultry', Custom: 'machinery',
};

// Only Crop Farming templates exist in src/data/funding.js. The others are defined here so every tab has tier cards.
const LOCAL_TEMPLATES = {
  Fishery: [
    { tier: 'Starter', amount: 1000000, tagline: 'For small scale fish farming', inclusions: ['Fingerlings', 'Fish feed (basic)', 'Pond preparation', 'Basic nets and tools'] },
    { tier: 'Growth', amount: 3000000, tagline: 'For growing fish farms', inclusions: ['Quality fingerlings', 'Feed and water treatment', 'Labour support', 'Pond preparation', 'Basic equipment'] },
    { tier: 'Commercial', amount: 5000000, plus: true, tagline: 'For commercial scale fish production', inclusions: ['Improved fingerlings', 'Feed, treatment and vaccines', 'Aeration and pumps', 'Labour and machinery', 'Harvesting and transport'] },
  ],
  'Mixed Farming': [
    { tier: 'Starter', amount: 1000000, tagline: 'For small mixed farms', inclusions: ['Seeds and starter animals', 'Fertilizer (basic)', 'Land preparation', 'Basic tools and feed'] },
    { tier: 'Growth', amount: 3000000, tagline: 'For growing mixed farms', inclusions: ['Quality seeds', 'Feed and veterinary care', 'Labour support', 'Land preparation', 'Basic equipment'] },
    { tier: 'Commercial', amount: 5000000, plus: true, tagline: 'For commercial mixed farming', inclusions: ['Improved seeds and stock', 'Fertilizer, feed and veterinary care', 'Irrigation support', 'Labour and machinery', 'Harvesting and transport'] },
  ],
  Livestock: [
    { tier: 'Starter', amount: 1000000, tagline: 'For small herds and flocks', inclusions: ['Feed supplements', 'Veterinary care', 'Fencing', 'Basic tools and housing'] },
    { tier: 'Growth', amount: 3000000, tagline: 'For growing herds', inclusions: ['Quality breeding stock', 'Feed and supplements', 'Veterinary care', 'Fencing and housing', 'Labour support'] },
    { tier: 'Commercial', amount: 5000000, plus: true, tagline: 'For commercial livestock production', inclusions: ['Improved breeding stock', 'Feed, vaccines and veterinary care', 'Water systems', 'Labour and equipment', 'Transport and marketing'] },
  ],
  Poultry: [
    { tier: 'Starter', amount: 1000000, tagline: 'For small poultry flocks', inclusions: ['Day-old chicks', 'Feed (basic)', 'Vaccines', 'Basic equipment'] },
    { tier: 'Growth', amount: 3000000, tagline: 'For growing poultry farms', inclusions: ['Quality day-old chicks', 'Feed and supplements', 'Vaccines and medication', 'Labour support', 'Housing repairs'] },
    { tier: 'Commercial', amount: 5000000, plus: true, tagline: 'For commercial poultry houses', inclusions: ['Improved breeds', 'Feed, vaccines and medication', 'Heating and ventilation', 'Labour and equipment', 'Processing and transport'] },
  ],
};

export const TEMPLATES = { 'Crop Farming': PACKAGE_TEMPLATES['Crop Farming'], ...LOCAL_TEMPLATES };
export const TEMPLATE_CATEGORIES = Object.keys(TEMPLATES);
export const TIERS = ['Starter', 'Growth', 'Commercial', 'Custom'];
export const ALL_CATEGORIES = [...CATEGORIES, 'Custom'];

// PRD 7.1 budget categories.
export const BUDGET_CATEGORIES = [
  'Seeds and fertiliser', 'Land preparation', 'Machinery and equipment', 'Irrigation', 'Farmer labour',
  'Crop protection', 'Harvesting', 'Storage', 'Transport', 'Other',
];

export const RESPONSIBLE_PARTIES = [
  'Cooperative procurement lead', 'Cooperative farm lead', 'Cooperative secretary', 'Cooperative treasurer',
  'Verified supplier (paid directly)', 'Farmers (paid directly)',
];

export const SEASONS = ['Wet 2026', 'Dry 2026/27', 'Wet 2027', 'Dry 2027/28'];

// Status groups used across the group's pages.
export const EDITABLE_STATUSES = ['Draft', 'Changes Requested'];
export const ALLOCATABLE_STATUSES = ['Draft', 'Changes Requested', 'Approved', 'Open for Funding'];
export const BUDGET_CHANGE_STATUSES = ['Approved', 'Open for Funding', 'Funding Target Reached', 'Ready for Disbursement', 'Active', 'Paused'];
export const AGREEMENT_REQUIRED_STATUSES = ['Approved', 'Open for Funding', 'Funding Target Reached', 'Ready for Disbursement', 'Active'];
export const LIVE_STATUSES = ['Open for Funding', 'Funding Target Reached', 'Ready for Disbursement', 'Active'];
export const PENDING_REVIEW_STATUSES = ['Submitted', 'Under Review'];
export const FINISHED_STATUSES = ['Completed', 'Failed or Terminated'];

// Status timeline (detail page). `hint` is plain language for what the stage means.
export const STAGES = [
  { id: 'Under Review', hint: 'Package submitted for review' },
  { id: 'Approved', hint: 'Budget approved' },
  { id: 'Ongoing', hint: 'Farming and payments' },
  { id: 'Completed', hint: 'Cycle closed' },
];

const STAGE_INDEX = {
  Draft: 0, Submitted: 0, 'Under Review': 0, 'Changes Requested': 0,
  Approved: 1, 'Open for Funding': 1, 'Funding Target Reached': 1, 'Ready for Disbursement': 1,
  Active: 2, Paused: 2, 'Failed or Terminated': 2, Completed: 3,
};
export const stageIndex = (status) => (status in STAGE_INDEX ? STAGE_INDEX[status] : 0);

export const WIZARD_STEPS = [
  { id: 'basics', label: 'Package Basics' },
  { id: 'details', label: 'Funding Details' },
  { id: 'review', label: 'Review and submit' },
];

export const GLOSSARY = {
  tranche: { term: 'Tranche', text: 'One stage of the money. Funds are released tranche by tranche, only after evidence for the earlier stage is approved.' },
  reconciliation: { term: 'Reconciliation', text: 'Checking that the budget items add up exactly to the package amount, so every naira is accounted for.' },
  commitment: { term: 'Commitment', text: 'A promise to invest. It is not money received. Only amounts confirmed by the regulated financial partner count as received.' },
  roi: { term: 'ROI (return on investment)', text: 'The extra money investors might get back on top of what they put in. It is an estimate, never a promise.' },
  coopShare: { term: 'Cooperative share', text: 'The part of the profit the cooperative keeps to run the project.' },
  allocation: { term: 'Allocation', text: 'How the approved budget is shared between your farmers. Cash is paid out, in-kind means goods such as seed or fertiliser.' },
  agreementC: { term: 'Agreement C', text: 'The Farmer Participation Agreement. Each allocated farmer must sign it before funds are released to or for them.' },
  maker: { term: 'Second reviewer', text: 'A big budget change needs two different CollabFarm reviewers to approve it, so no one person decides alone.' },
};
