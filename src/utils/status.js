// Maps status labels used across the PRD to a visual tone for <StatusPill>.
// Tones: green, amber, red, blue, purple, gray.

const TONES = {
  // positive
  verified: 'green', active: 'green', disbursed: 'green', approved: 'green', released: 'green', confirmed: 'green',
  open: 'green', signed: 'green', resolved: 'green', paid: 'green', received: 'green', success: 'green', 'on track': 'green',
  reconciled: 'green', delivered: 'green', 'ready for disbursement': 'green', 'funding target reached': 'green', 'open for funding': 'green',
  // waiting
  pending: 'amber', reviewing: 'amber', 'under review': 'amber', submitted: 'amber', draft: 'gray', initiated: 'amber',
  'pending evidence': 'amber', 'awaiting response': 'amber', 'additional information required': 'amber', 'changes requested': 'amber',
  'awaiting partner': 'amber', 'awaiting signature': 'amber', 'under reconciliation': 'amber', 'in progress': 'amber', 'at risk': 'amber', delayed: 'amber', due: 'amber',
  'partially funded': 'amber', invited: 'amber', 'awaiting confirmation': 'amber', committed: 'amber', 'not started': 'gray', scheduled: 'amber',
  // negative
  rejected: 'red', removed: 'red', overdue: 'red', failed: 'red', suspended: 'red', reversed: 'red', escalated: 'red', 'high risk': 'red',
  terminated: 'red', 'failed or terminated': 'red', expired: 'red', disputed: 'red', 'crop failure': 'red', flagged: 'red', deactivated: 'red', high: 'red',
  // info
  repaid: 'blue', completed: 'blue', refunded: 'blue', distributed: 'blue', 'in review': 'blue', info: 'blue', closed: 'blue',
  // neutral
  locked: 'gray', inactive: 'gray', paused: 'gray', 'not signed': 'gray', 'not uploaded': 'gray', uploaded: 'gray', low: 'green', medium: 'amber',
};

// A released payment instruction is still unpaid until the financial partner confirms it.
export function disbursementLabel(d) {
  return d.status === 'Reviewing' && d.instructionSentAt ? 'Awaiting partner' : d.status;
}

export function statusTone(label = '') {
  return TONES[String(label).toLowerCase()] || 'gray';
}

export const CATEGORY_TONES = {
  'Crop Farming': { bg: '#f3fbf6', fg: '#079455', border: '#17b26a' },
  Fishery: { bg: '#f5f8ff', fg: '#2970ff', border: '#a9c1ff' },
  'Mixed Farming': { bg: '#faf3ff', fg: '#8a3fc0', border: '#dcb8f3' },
  Livestock: { bg: '#fffaeb', fg: '#dc6803', border: '#f8cd42' },
  Poultry: { bg: '#fff4ed', fg: '#c4320a', border: '#f9b99c' },
  Custom: { bg: '#f7f7f7', fg: '#494949', border: '#d7d7d7' },
};

export const PACKAGE_TIER_DOT = { Starter: '#2970ff', Growth: '#17b26a', Commercial: '#a855d8' };
