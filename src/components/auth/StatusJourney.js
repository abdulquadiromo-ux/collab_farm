import { formatDate, formatDateTime } from '../../utils/format.js';

// The verification journey shown on the status page. Statuses come from the shared vocabulary only.
export const AIR = 'Additional Information Required';
const MAIN = ['Draft', 'Submitted', 'Under Review', AIR, 'Verified'];

const TITLES = {
  Draft: 'Draft',
  Submitted: 'Submitted',
  'Under Review': 'Under Review',
  [AIR]: AIR,
  Verified: 'Verified',
};
const DESCRIPTIONS = {
  Draft: 'You are filling in your details. Nothing is reviewed until you submit.',
  Submitted: 'Your details and files are in the queue for a CollabFarm reviewer.',
  'Under Review': 'A reviewer is checking your details and documents.',
  [AIR]: 'Only if a reviewer needs something more from you.',
  Verified: 'Your organisation is verified and your dashboard is fully open.',
};

const lastAt = (history, status) => [...history].reverse().find((h) => h.status === status)?.at;

// Returns items for the shared <Timeline>. The description is passed as the body so every step explains itself.
export function buildJourney(org) {
  const status = org.status;
  const history = org.statusHistory || [];
  const hadAir = history.some((h) => h.status === AIR) || status === AIR;
  const negative = status === 'Rejected' || status === 'Suspended';
  const idx = negative ? 3 : Math.max(0, MAIN.indexOf(status));

  const stateFor = (s, i) => {
    if (s === AIR) {
      if (status === AIR) return 'active';
      return hadAir ? 'done' : undefined;
    }
    if (negative) return i < 3 ? 'done' : undefined;
    if (i < idx) return 'done';
    if (i === idx) return status === 'Verified' ? 'done' : 'active';
    return undefined;
  };
  const dateText = (at) => (at ? (String(at).length > 10 ? formatDateTime(at) : formatDate(at)) : undefined);

  const items = MAIN.map((s, i) => {
    const at = lastAt(history, s) || (s === 'Verified' && org.verifiedAt ? org.verifiedAt : null);
    let meta = dateText(at);
    if (!meta && s === AIR && !hadAir) meta = status === 'Verified' || negative ? 'Not needed' : 'If needed';
    return { title: TITLES[s], state: stateFor(s, i), meta, body: DESCRIPTIONS[s] };
  });

  if (negative) {
    items.pop();
    items.push({
      title: status,
      state: 'bad',
      meta: dateText(lastAt(history, status)),
      body: status === 'Rejected' ? 'The registration was not approved.' : 'Access is paused while this is looked into.',
    });
  }
  return items;
}

// What the person should expect next, per status and organisation kind.
export function nextSteps(status, kind) {
  const coop = kind === 'cooperative';
  switch (status) {
    case 'Draft':
      return ['Finish the onboarding steps. Your progress is saved after every step.', 'Check the review page, then submit.', 'Review only starts after you submit.'];
    case 'Submitted':
      return ['A CollabFarm reviewer will pick up your submission.', 'You will get a notification when the review starts.', 'You cannot edit while you wait. If something is wrong, contact support.'];
    case 'Under Review':
      return ['A reviewer is checking your details, and your documents one by one.', 'A document counts as verified only after a reviewer marks it Verified.', 'You will be told the result here and in your notifications.'];
    case AIR:
      return ['Read the reviewer note above.', 'Update the information or upload the file they asked for.', 'Submit again. The review then continues from where it stopped.'];
    case 'Verified':
      return coop
        ? ['Add your farmers and farms from the dashboard.', 'Create a funding request. It still needs project approval and signed agreements.', 'Approval is not a guarantee of funding or success.']
        : ['Browse funding packages and read each one with its risks.', 'Before you can commit, you sign the investor agreement for that package.', 'Returns are estimates, never guaranteed. A commitment is not received money.'];
    case 'Rejected':
      return ['Read the reason above. A rejection is about the information we received, not a judgement of you.', 'If you think it is a mistake, use the complaints route or contact support.', 'You can register again with corrected details.'];
    case 'Suspended':
      return ['Access is paused while the matter is looked into. This is not a finding against you.', 'You will be told what is needed to restore access.', 'Contact support if you have questions.'];
    default:
      return [];
  }
}

export const STATUS_HEADLINE = {
  Draft: 'Your registration is not submitted yet',
  Submitted: 'Submitted and waiting for a reviewer',
  'Under Review': 'A reviewer is checking your details',
  [AIR]: 'The reviewer needs more information',
  Verified: 'You are verified',
  Rejected: 'The registration was not approved',
  Suspended: 'Access is paused',
};
