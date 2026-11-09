import { FAQ } from '../../data/governance.js';
import { formatNaira } from '../../utils/format.js';

export const FAQ_CATEGORIES = ['Getting started', 'Investing', 'Cooperatives and farmers', 'Money and payments', 'Risks', 'Support and privacy'];

// The shared FAQ data has no categories, so they are assigned here by question text.
const CATEGORY_BY_QUESTION = {
  'What is CollabFarm Finance?': 'Getting started',
  'Do you offer a mobile app?': 'Getting started',
  'Does CollabFarm hold my money?': 'Money and payments',
  'How do farmers get paid?': 'Money and payments',
  'Is my return guaranteed?': 'Risks',
  'What happens if a crop fails?': 'Risks',
  'Who checks the cooperatives?': 'Cooperatives and farmers',
  'How do I raise a complaint?': 'Support and privacy',
};

// Extra questions written for the public site. `minInvestment` comes from the platform settings in the store.
function extraQuestions({ minInvestment }) {
  return [
    { category: 'Getting started', q: 'Who uses CollabFarm?', a: 'Four kinds of people: investors, cooperatives, farmers who belong to a cooperative, and CollabFarm administrators who review and approve work. Each person sees only what their role allows.', link: { to: '/how-it-works', label: 'See how it works for each role' } },
    { category: 'Investing', q: 'Who can invest?', a: 'Investors who have confirmed their identity, shown they are eligible and acknowledged the risks. The exact eligibility rules depend on the legal structure, which is still being confirmed.', link: { to: '/register/investor', label: 'Register as an investor' } },
    { category: 'Investing', q: 'What is the smallest amount I can invest?', a: `The platform minimum is ${formatNaira(minInvestment)}. Each funding package also sets its own minimum and maximum, which you can read on the package page before you commit.` },
    { category: 'Investing', q: 'Can I take my money out after I commit?', a: 'Not outside the agreed terms. Money is committed for the whole farming cycle and there is no secondary market in this release. What happens to amounts if a package does not reach its minimum target is set in the agreement and is still being confirmed.' },
    { category: 'Investing', q: 'How are returns worked out?', a: 'Each agreement says whether the package is a loan, profit sharing or harvest participation, and how any amount due is calculated. The funding model and return structure can differ between packages. Figures shown on the platform are illustrations, not promises.', link: { to: '/investor-information', label: 'Try the profit share calculator' } },
    { category: 'Risks', q: 'Can I lose the money I invest?', a: 'Yes. You can lose some or all of it. Crops can fail, prices can fall and repayments can be late or missed. Approval of a project is not a guarantee, and any figure on this site is an illustration. Only invest an amount you can afford to lose.', link: { to: '/investor-information#risks', label: 'Read the risks in full' } },
    { category: 'Risks', q: 'What if a project is late or a milestone is missed?', a: 'Delays are shown on the project and reviewed on evidence. A late report or a missed deadline is not treated as fraud. The reviewer can ask for more information, agree a new date or pause the next stage.' },
    { category: 'Cooperatives and farmers', q: 'How does a cooperative join?', a: 'A cooperative registers, uploads its documents and waits for an administrator to verify them. Only a verified cooperative can submit a funding request.', link: { to: '/register/cooperative', label: 'Register a cooperative' } },
    { category: 'Cooperatives and farmers', q: 'Do farmers need their own account?', a: 'Farmers are invited by their cooperative. After identity and consent checks they can see their support, report progress, report problems and download their agreement.', link: { to: '/farmer-activation', label: 'Activate a farmer account' } },
    { category: 'Cooperatives and farmers', q: 'What if a farmer cannot repay?', a: 'Each case is reviewed on evidence and the signed agreement. Options can include rescheduling or other remedies agreed in advance. There is no automatic seizure, and nobody is publicly labelled as fraudulent.' },
    { category: 'Money and payments', q: 'What is a tranche?', a: 'A tranche is one instalment of the approved budget. Every project has four: project preparation, planting, crop maintenance and harvest. A stage is released only after the one before it and its evidence are approved.', link: { to: '/cooperative-funding', label: 'See the four stages' } },
    { category: 'Money and payments', q: 'What is the difference between committed and received money?', a: 'Committed means you signed a promise to invest. Received means the regulated financial partner confirmed the money arrived and our records match. Only received money counts toward a funding target, and starting a payment is never proof of receipt.' },
    { category: 'Support and privacy', q: 'What can investors see about farmers?', a: 'A privacy-preserving profile. Investors never see a farmer\'s national identity number, phone number or exact home address.', link: { to: '/privacy', label: 'Read the privacy notice' } },
    { category: 'Support and privacy', q: 'Who do I contact for help?', a: 'Use the contact page for general questions. If something went wrong with a project, a payment or how you were treated, raise a complaint so that it gets a reference and a reviewer.', link: { to: '/contact', label: 'Contact support' } },
  ];
}

export function buildFaq(settings) {
  const minInvestment = settings?.investor?.minimumInvestment ?? 50000;
  const base = FAQ.map((f) => ({ category: CATEGORY_BY_QUESTION[f.q] || 'Getting started', q: f.q, a: f.a }));
  const extra = extraQuestions({ minInvestment });
  const seen = new Set(base.map((b) => b.q));
  return [...base, ...extra.filter((e) => !seen.has(e.q))].map((f, i) => ({ id: `faq-${i}`, ...f }));
}
