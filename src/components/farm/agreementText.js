// Plain-language text for the Farmer Participation Agreement (Agreement C). Terms are illustrative and configurable.
// Nothing here is a full translation. Only the four summary headings have local-language labels.

import { formatNaira, formatDate, formatDateTime } from '../../utils/format.js';

export const LANGUAGES = ['English', 'Hausa', 'Yoruba', 'Igbo', 'Pidgin'];

// Interface labels for the summary headings only. The agreement text itself is not translated here.
export const HEADING_LABELS = {
  English: { receive: 'What you will receive', doTo: 'What you agree to do', fail: 'If the crop fails', data: 'How your data is used', summary: 'The agreement in simple words' },
  Hausa: { receive: 'Abin da za ku samu', doTo: 'Abin da kuka yarda za ku yi', fail: 'Idan amfanin gona ya lalace', data: 'Yadda ake amfani da bayananku', summary: 'Yarjejeniya a taƙaice' },
  Yoruba: { receive: 'Ohun tí o máa gbà', doTo: 'Ohun tí o gbà láti ṣe', fail: 'Tí irè oko bá kùnà', data: 'Bí a ṣe máa lo ìwífún rẹ', summary: 'Àkótán àdéhùn' },
  Igbo: { receive: 'Ihe ị ga-enweta', doTo: 'Ihe ị kwetara ime', fail: 'Ọ bụrụ na ihe ọkụkụ emeghị nke ọma', data: 'Otú a ga-esi jiri ozi gị mee ihe', summary: 'Nchịkọta nkwekọrịta' },
  Pidgin: { receive: 'Wetin you go get', doTo: 'Wetin you agree to do', fail: 'If the crop no do well', data: 'How we go take use your information', summary: 'The agreement for short' },
};

const money = (n) => formatNaira(n);

export function summarySections(ctx) {
  const { allocation, pkg, ob, contract, coop } = ctx;
  const owes = [];
  if (ob.repayDue > 0) owes.push(`pay back ${money(ob.repayDue)}`);
  if (ob.produceDueKg > 0) owes.push(`give ${ob.produceDueKg} kg of your harvest to the cooperative store`);
  return [
    {
      key: 'receive',
      points: allocation
        ? [
          `Inputs worth ${money(allocation.inKindValue)} (for example seeds and fertiliser). You get the items, not cash.`,
          `Cash support for labour and farm costs of up to ${money(allocation.cashPlanned)}, paid in steps as your farming work is checked.`,
          `Everything goes through ${coop?.name || 'your cooperative'} and the financial partner. Nothing goes to unrelated people.`,
        ]
        : ['Your cooperative has not given you a package yet. The details here will fill in once you are allocated support.'],
    },
    {
      key: 'doTo',
      points: [
        'Use the support only for your farm work in this project.',
        'Plant, look after and harvest the crop as advised, and send short progress reports with a photo when asked.',
        'Tell your cooperative early if something goes wrong, such as late inputs or pests.',
        owes.length ? `At harvest, ${owes.join(' and ')}, as in clause 6.` : 'Pay back or deliver produce only as clause 6 says. If clause 6 has no terms for you, you owe nothing.',
      ],
    },
    {
      key: 'fail',
      points: [
        'If the crop fails because of weather, pests or disease, you are not treated as a fraudster.',
        'Your cooperative and CollabFarm do a fair review. Ways to help may include more time, a smaller amount or other support.',
        'Nothing is taken from you automatically, and you can give your side of the story.',
      ],
    },
    {
      key: 'data',
      points: [
        'Your cooperative, CollabFarm and the financial partner see your name, phone and ID number to run this project.',
        'Investors see only a summary of your farm. They do not see your name, phone, ID number or exact address.',
        'You can ask to see or correct your data. You can withdraw your consent, but support may stop if you do.',
      ],
    },
  ].map((s) => ({ ...s, pkg: pkg?.name, contractId: contract?.id }));
}

export function fullClauses(ctx) {
  const { allocation, ob, coop, pkg, obligations, name, contract } = ctx;
  const repaymentLine = contract?.repayment || 'As set out in your obligations list.';
  const produceLines = obligations.filter((o) => o.type === 'Produce delivery').map((o) => `${o.description}, due ${formatDate(o.dueDate)}.`);
  const repayLines = obligations.filter((o) => o.type === 'Repayment').map((o) => `${o.amount ? `${money(o.amount)}. ` : ''}${o.description}, due ${formatDate(o.dueDate)}.`);
  return [
    { n: 1, title: 'Who this agreement is between', body: [`${name} (the Farmer) and ${coop?.name || 'the Cooperative'} (the Cooperative), under the ${pkg?.name || 'funding'} project supported through the CollabFarm Finance platform.`, 'CollabFarm does not hold or pool money. Payments are made by a regulated financial partner.'] },
    { n: 2, title: 'What you receive', body: allocation ? [`Approved support: ${money(allocation.approved)} in total.`, `Inputs (in kind): ${money(allocation.inKindValue)}.`, `Cash support for labour and operating costs: up to ${money(allocation.cashPlanned)}.`, 'Approval of support is not a guarantee that the crop will succeed.'] : ['No support has been allocated to you yet. This clause is completed when your cooperative allocates support to you.'] },
    { n: 3, title: 'How the support may be used', body: ['Support may be used only for the approved farming work of this project, as set out in your allocation.', 'Selling, swapping or lending project inputs is not allowed.'] },
    { n: 4, title: 'What you agree to do', body: ['Carry out the assigned farming activities in good faith.', 'Tell your cooperative early about problems that could affect the crop.', 'Keep your contact details up to date.'] },
    { n: 5, title: 'Reports and evidence', body: ['You send short progress reports when asked. Photos and GPS location help your cooperative check your work.', 'Photos and GPS support a report, but they are not final proof on their own. People may visit to check.'] },
    { n: 6, title: 'Repayment or produce delivery', body: [`Summary: ${repaymentLine}`, ...repayLines, ...produceLines, 'These terms are illustrative and configurable. Final amounts come from this signed agreement.'] },
    { n: 7, title: 'Deductions', body: ['Only amounts listed in this agreement can be deducted from money owed to you.', 'You will be shown every deduction with the reason before or when it is made.'] },
    { n: 8, title: 'If the crop fails', body: ['Genuine crop failure is not fraud and is never treated as fraud.', 'A fair review is carried out by the cooperative and CollabFarm. You can give your side and share evidence.', 'Options may include a new date, a smaller amount, insurance where it exists, or other help. Nothing is taken automatically.'] },
    { n: 9, title: 'If support is misused', body: ['If someone suspects misuse, the matter is recorded and you are told. You have the right to respond.', 'Evidence is collected, the case is classified, and a fair decision is recorded. Missing a deadline alone is never treated as misuse.'] },
    { n: 10, title: 'Privacy and consent', body: ['Your name, phone number and ID number are used only to run this project and to meet legal checks.', 'Investors see a summary without personal details.', 'You can ask to see, correct or limit the use of your data, and you can withdraw consent. Withdrawing consent may stop support.'] },
    { n: 11, title: 'Copies, language and changes', body: ['You get a copy of this agreement. Your cooperative provides full translations on request.', 'Every new version is saved. A change to your terms needs your acceptance before it applies.'] },
    { n: 12, title: 'Questions and disputes', body: ['Use Report an Issue in the portal at any time. Disputes are handled by a fair process and never by public accusation.'] },
  ];
}

export function agreementDownload(ctx, contract) {
  const lines = [];
  lines.push(contract.title || 'Individual Farmer Participation Agreement');
  lines.push(`Version: ${contract.version}`);
  lines.push(`Status: ${contract.status}`);
  lines.push(`Farmer: ${ctx.name}`);
  lines.push(`Cooperative: ${ctx.coop?.name || '-'}`);
  lines.push(`Project: ${ctx.pkg?.name || '-'}`);
  if (contract.signedAt) lines.push(`Signed by: ${contract.signatory || ctx.name} on ${formatDateTime(contract.signedAt)}`);
  lines.push('Terms are illustrative and configurable. Final amounts come from the signed agreement.');
  lines.push('');
  lines.push('IN SIMPLE WORDS');
  summarySections(ctx).forEach((s) => {
    lines.push(HEADING_LABELS.English[s.key]);
    s.points.forEach((p) => lines.push(`  - ${p}`));
  });
  lines.push('');
  lines.push('FULL TERMS');
  fullClauses(ctx).forEach((c) => {
    lines.push(`${c.n}. ${c.title}`);
    c.body.forEach((b) => lines.push(`   ${b}`));
  });
  lines.push('');
  lines.push('VERSION HISTORY');
  (contract.history || []).forEach((h) => lines.push(`  ${h.version}, ${formatDate(h.date)}: ${h.change}`));
  return lines.join('\n');
}
