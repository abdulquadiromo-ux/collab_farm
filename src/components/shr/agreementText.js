// Sample agreement wording for the three agreement types (docs/REQUIREMENTS_DIGEST.md, "Agreements").
// EVERYTHING here is clearly labelled sample text. The legal wording, funding model and liability are open decisions
// (PRD section 21) and stay configurable. Nothing here promises a return.
import { formatNaira, formatDateShort } from '../../utils/format.js';
import { TRANCHE_PLAN } from '../../data/funding.js';
import { PROFIT_ILLUSTRATION } from '../../data/operations.js';
import { byId } from './shrUtils.js';

export const SAMPLE_NOTE = 'Sample wording for demonstration. Final legal text, the funding model and liability terms are configurable and not yet decided.';

const FUNDING_MODEL_OPEN = 'Set in this agreement. Open decision: loan, grant, profit share or other.';

function trancheClauses(pkg) {
  return TRANCHE_PLAN.map((t) => `Tranche ${t.number}, ${t.name} (${Math.round(t.share * 100)}% of the approved budget${pkg ? `, about ${formatNaira(Math.round(pkg.amount * t.share))}` : ''}). Released only after: ${t.conditions.join('; ')}. No tranche is released on request alone.`);
}
function budgetClauses(pkg) {
  if (!pkg || !pkg.budget?.length) return ['The approved budget has not been attached yet. Budget lines must add up to the approved funding plan before funding steps continue.'];
  const lines = pkg.budget.map((b) => `${b.category}: ${b.description}, ${formatNaira(b.amount)}.`);
  const total = pkg.budget.reduce((s, b) => s + b.amount, 0);
  return [...lines, `Budget total ${formatNaira(total)} against an approved funding plan of ${formatNaira(pkg.amount)}${total === pkg.amount ? ', which reconciles.' : ', which does not yet reconcile.'}`];
}

export function buildAgreement(c, data) {
  const pkg = byId(data.packages, c.packageId);
  const coop = pkg ? byId(data.cooperatives, pkg.coopId) : null;
  const inv = c.type === 'A' ? byId(data.investors, c.partyId) : null;
  const investment = c.type === 'A' ? data.investments.find((i) => i.investorId === c.partyId && i.packageId === c.packageId) : null;
  const farmer = c.type === 'C' ? byId(data.farmers, c.partyId) : null;
  const partner = data.wallets?.['inv-1']?.partner || 'a regulated financial partner';
  const pkgLabel = pkg ? `${pkg.name} (${pkg.category}${pkg.tier && pkg.tier !== 'Custom' ? `, ${pkg.tier}` : ''})` : 'the funding package';

  if (c.type === 'A') {
    return {
      plain: [
        `You agree to commit money to ${pkgLabel}, run by ${coop?.name || 'a verified cooperative'}.`,
        `The funding model is: ${c.fundingModel || 'not yet set'}. This is an open decision and is set in the agreement, not assumed.`,
        'Money is released to the project in stages (tranches) only when evidence is approved. A commitment is not received money until the financial partner confirms it.',
        'Returns are estimates and are not guaranteed. You can lose part or all of the money committed. Approval of a project is not a guarantee of success.',
        'You can raise a complaint at any time and nobody is named publicly.',
      ],
      sections: [
        { id: 'parties', title: '1. Parties', plain: 'Who is involved.', clauses: [`The Investor: ${c.partyName}${inv?.org && inv.org !== 'Individual' ? `, ${inv.org}` : ''}.`, `The Cooperative: ${coop?.name || 'to be confirmed'}${coop ? `, registration ${coop.regNumber}` : ''}.`, `Platform operator: CollabFarm Finance, which records approvals and confirmations but does not hold or pool money.`, `Payment partner: ${partner}, which receives and pays out funds.`] },
        { id: 'amount', title: '2. Amount and funding model', plain: 'How much, and whether it is a loan, profit share or something else.', clauses: [investment ? `Amount formally committed: ${formatNaira(investment.committed)}. Confirmed received by the partner: ${formatNaira(investment.confirmed)}.` : 'The amount is set when you commit, within the minimum and maximum for the package.', `Funding model: ${c.fundingModel || 'Not set'}.`, FUNDING_MODEL_OPEN, 'This agreement must say whether the arrangement is a loan, profit sharing or harvest participation. It does not guarantee any return.'] },
        { id: 'use', title: '3. Use of funds', plain: 'What the money can be spent on.', clauses: [...budgetClauses(pkg), 'Funds may only be used for approved budget lines. Supplier payments are made directly where practical.'] },
        { id: 'release', title: '4. Release conditions', plain: 'Money moves in stages, not all at once.', clauses: trancheClauses(pkg) },
        { id: 'return', title: '5. Return or repayment calculation', plain: 'How anything paid back is worked out.', clauses: [`Any distribution is calculated from verified sales less eligible costs, other deductions and agreed reserves, then shared at the agreed percentage. Repayment of capital is never treated as profit.`, `Illustration only, not a default and not a promise: verified sales ${formatNaira(PROFIT_ILLUSTRATION.verifiedSales)}, eligible costs ${formatNaira(PROFIT_ILLUSTRATION.eligibleCosts)}, other deductions ${formatNaira(PROFIT_ILLUSTRATION.otherDeductions)}, distributable profit ${formatNaira(PROFIT_ILLUSTRATION.distributable)}. At an agreed ${PROFIT_ILLUSTRATION.investorSharePct}% share, investors together would receive ${formatNaira(PROFIT_ILLUSTRATION.investorShare)}.`, pkg ? `The platform shows an expected return of about ${pkg.expectedRoiPct}% for this package. That is an estimate, not a guarantee.` : 'Any expected return shown on the platform is an estimate, not a guarantee.', 'A recorded sale is not money received until it is confirmed and reconciled.'] },
        { id: 'risks', title: '6. Risks and potential loss', plain: 'What can go wrong.', clauses: [...(pkg?.risks || ['Drought, flooding, pests, market price changes and delays can reduce output.']), 'You may lose part or all of the money committed. Project approval is not a guarantee of success.'] },
        { id: 'reporting', title: '7. Reporting', plain: 'What you will be told and when.', clauses: ['The cooperative reports milestones with evidence, input deliveries, harvest quantities and sales. Reviewers approve or return each report.', 'Photos and GPS support a report but are not conclusive on their own.', 'You can download this agreement, your statements and project reports at any time.'] },
        { id: 'default', title: '8. Default and recovery', plain: 'What happens if something is late or goes wrong.', clauses: ['A missed deadline or a failed harvest does not by itself mean misuse. Each case is recorded, the cooperative is told and can respond, evidence is collected and the case is classified.', 'Further funding may be suspended where this agreement permits. Options include rescheduling, restructuring, insurance, recovery and dispute resolution. There is no automatic seizure.'] },
        { id: 'crop', title: '9. Crop failure', plain: 'What a genuine crop loss means.', clauses: ['A genuine crop failure is assessed on evidence and is not treated as fraud. Who bears the loss is an open decision set in this agreement and is not assumed here.'] },
        { id: 'disputes', title: '10. Disputes', plain: 'How disagreements are handled.', clauses: ['Raise a complaint first. A reviewer records an outcome and an explanation, and you can appeal. Further steps follow the dispute resolution process named in this agreement.'] },
        { id: 'termination', title: '11. Termination', plain: 'How the agreement can end.', clauses: ['The agreement ends on completion and final distribution, by agreement of the parties, or as set out for serious breach. Unspent funds are reconciled and returned or dealt with as the agreement says.'] },
        { id: 'security', title: '12. Security', plain: 'Whether anything backs the money.', clauses: ['Any real security is listed here. None is assumed. Security recorded for this agreement: none (configurable).'] },
      ],
    };
  }

  if (c.type === 'B') {
    return {
      plain: [
        `The cooperative agrees how ${pkgLabel} will be spent, reported and accounted for.`,
        'Money is released in tranches only when milestone evidence is approved by a reviewer and a payment approver.',
        'The cooperative may not change an approved budget without authorisation. Material changes need a second reviewer.',
        `Liability: ${(c.liability || 'to be set in the agreement').replace(/\.$/, '')}. This is configurable and is not assumed.`,
        'Unspent funds are reconciled and a final account is submitted. A failed harvest is not treated as fraud.',
      ],
      sections: [
        { id: 'parties', title: '1. Parties', plain: 'Who is involved.', clauses: [`The Cooperative: ${c.partyName}${coop ? `, registration ${coop.regNumber}` : ''}.`, `Signatory: ${c.signatory || 'an authorised representative of the cooperative'}.`, 'Platform operator: CollabFarm Finance, which records approvals and does not hold money.'] },
        { id: 'budget', title: '2. Approved budget', plain: 'The agreed spending plan.', clauses: budgetClauses(pkg) },
        { id: 'alloc', title: '3. Farmer allocations', plain: 'How support is shared between farmers.', clauses: [`${pkg?.farmersCount ?? 'The'} farmers are proposed for support. The cooperative proposes allocations and an authorised reviewer approves them.`, 'Total allocations may not exceed the approved budget and no farmer may be allocated twice for the same purpose. Cash and in-kind support are recorded separately.'] },
        { id: 'uses', title: '4. Approved uses', plain: 'What the money may be used for.', clauses: ['Funds may be used only for the approved budget categories. Any other use needs written approval before it happens.'] },
        { id: 'release', title: '5. Release conditions', plain: 'When each stage of money is released.', clauses: trancheClauses(pkg) },
        { id: 'reporting', title: '6. Reporting', plain: 'What the cooperative must report.', clauses: ['Milestone reports with evidence, input deliveries and expenses, harvest quantities and sales, and any incident, delay or crop failure within 7 days.'] },
        { id: 'monitoring', title: '7. Monitoring', plain: 'How the project is checked.', clauses: ['Reviewers may inspect evidence, visit farms and ask for explanations. Photos and GPS support a report but are not conclusive.'] },
        { id: 'suppliers', title: '8. Supplier payments', plain: 'How suppliers are paid.', clauses: ['Suppliers are paid directly where practical against a purchase order or budget item, an invoice or quotation, and delivery evidence. Supplier identity must be verified first.'] },
        { id: 'harvest', title: '9. Harvest and sales reporting', plain: 'How harvest and sales are recorded.', clauses: ['Expected and actual quantities, quality, storage, buyer, price and payment are recorded. A sale is not money received until the payment is confirmed and reconciled.'] },
        { id: 'unspent', title: '10. Unspent funds', plain: 'What happens to money not used.', clauses: ['Unspent funds are reconciled and a final account is submitted. Recoverable amounts are identified and dealt with as this agreement says. There is no automatic seizure.'] },
        { id: 'fraud', title: '11. Fraud and misuse procedure', plain: 'How suspected misuse is handled fairly.', clauses: ['Suspected misuse is recorded, the cooperative is told and can respond, and evidence is reviewed before any classification. Genuine crop failure and missed deadlines are not fraud. No one is named publicly.'] },
        { id: 'liability', title: '12. Extent of cooperative liability', plain: 'What the cooperative is and is not responsible for.', clauses: [c.liability || 'Not set.', 'The exact extent of liability is an open decision set in this agreement.'] },
      ],
    };
  }

  return {
    plain: [
      `You agree to take part in ${pkgLabel} with ${coop?.name || 'your cooperative'} and to use the support only for the agreed purpose.`,
      farmer ? `Your approved support is ${formatNaira(farmer.allocatedAmount)} for this project.` : 'Your approved support is listed in the allocation section.',
      `Repayment, if any: ${c.repayment || 'as set in the agreement'}. If your crop fails for reasons you could not control, that is not treated as misuse.`,
      'You must report progress and any problem. You can raise a complaint at any time.',
      `You get a copy in an accessible language (${c.language || 'English'}).`,
    ],
    sections: [
      { id: 'parties', title: '1. Parties', plain: 'Who is involved.', clauses: [`The Farmer: ${c.partyName}.`, `The Cooperative: ${coop?.name || 'your cooperative'}.`] },
      { id: 'allocation', title: '2. Allocation', plain: 'What support you receive.', clauses: [farmer ? `Approved support: ${formatNaira(farmer.allocatedAmount)}. Cash and in-kind support are recorded separately and each delivery is recorded against your name.` : 'Approved support is recorded against your name when the allocation is approved.', pkg ? `Project: ${pkg.name}, ${formatDateShort(pkg.startDate)} to ${formatDateShort(pkg.endDate)}.` : 'Project dates are set in the package.'] },
      { id: 'use', title: '3. Permitted use', plain: 'What the support may be used for.', clauses: ['Support may be used only for the farming activity agreed for your plot. Selling, swapping or diverting inputs is not allowed.'] },
      { id: 'reporting', title: '4. Reporting duties', plain: 'What you need to report.', clauses: ['Submit progress reports with evidence when asked, and tell your cooperative about any delay, damage or loss within 7 days.'] },
      { id: 'repay', title: '5. Repayment terms', plain: 'What you may need to give back, if anything.', clauses: [c.repayment || 'As set in the agreement.', 'Repayment terms are configurable and shown here as illustrative. Any repayment is not guaranteed regardless of the crop outcome.'] },
      { id: 'deductions', title: '6. Deductions', plain: 'Anything taken from payments.', clauses: ['Any deduction must be listed in this agreement or approved in writing, with a reason, before it is taken. You can see every deduction in your records.'] },
      { id: 'crop', title: '7. Crop failure', plain: 'If your crop fails.', clauses: ['A genuine crop failure, reported with evidence, is assessed fairly and is not treated as fraud or misuse.'] },
      { id: 'misuse', title: '8. Misuse procedure', plain: 'What happens if misuse is suspected.', clauses: ['You will be told, you can explain, and evidence will be reviewed before any decision. You will not be named publicly and no penalty is applied from a complaint alone.'] },
      { id: 'privacy', title: '9. Privacy and consent', plain: 'How your information is used.', clauses: ['Your information is used to run the project and is shared with investors only in a privacy preserving form, with no ID number, phone number or exact address. You can ask to see or correct your record.'] },
      { id: 'copy', title: '10. Your copy', plain: 'Getting a copy you can read.', clauses: [`You receive a copy in ${c.language || 'English'}. Ask your cooperative or a CollabFarm helper if you need it explained.`] },
    ],
  };
}

// Plain text copy for the download button. Generated locally.
export function agreementText(c, data, built) {
  const lines = [];
  lines.push(`${c.title.toUpperCase()}`);
  lines.push(`Agreement type: ${c.type}   Version: ${c.version}   Status: ${c.status}`);
  lines.push(`Party: ${c.partyName} (${c.partyType})`);
  const pkg = byId(data.packages, c.packageId);
  lines.push(`Package: ${pkg?.name || c.packageId}`);
  if (c.signedAt) lines.push(`Signed: ${c.signedAt}   Signatory: ${c.signatory || '-'}`);
  lines.push('');
  lines.push(`NOTE: ${SAMPLE_NOTE}`);
  lines.push('');
  lines.push('SUMMARY IN PLAIN LANGUAGE');
  built.plain.forEach((p) => lines.push(`- ${p}`));
  lines.push('');
  built.sections.forEach((s) => {
    lines.push(s.title.toUpperCase());
    lines.push(`In plain language: ${s.plain}`);
    s.clauses.forEach((cl) => lines.push(`  [Sample text] ${cl}`));
    lines.push('');
  });
  lines.push('VERSION HISTORY');
  (c.history || []).forEach((h) => lines.push(`  ${h.version}  ${h.date}  ${h.change}`));
  lines.push('');
  lines.push('This copy contains no passwords or identity document contents.');
  return lines.join('\r\n');
}
