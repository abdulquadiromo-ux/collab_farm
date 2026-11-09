// Mock people and organisations. Everything here is sample data. No real person or organisation is represented.

export const DEMO_USERS = [
  { id: 'u-coop', role: 'cooperative', name: 'Arnold Smith', firstName: 'Arnold', email: 'arnold@greenfieldscoop.example', phone: '+234 803 123 4567', orgId: 'coop-1', title: 'Cooperative Administrator' },
  { id: 'u-inv', role: 'investor', name: 'Arnold Okafor', firstName: 'Arnold', email: 'arnold.okafor@impactfund.example', phone: '+234 802 555 0147', orgId: 'inv-1', title: 'Impact Investor' },
  { id: 'u-admin', role: 'admin', name: 'Zainab Bello', firstName: 'Zainab', email: 'zainab.bello@collabfarm.example', phone: '+234 809 000 1122', orgId: null, title: 'Platform Administrator (Project Reviewer)' },
  { id: 'u-admin2', role: 'admin', name: 'Emeka Eze', firstName: 'Emeka', email: 'emeka.eze@collabfarm.example', phone: '+234 809 000 3344', orgId: null, title: 'Platform Administrator (Payment Approver)' },
  { id: 'u-farmer', role: 'farmer', name: 'Aisha Bello', firstName: 'Aisha', email: 'aisha.bello@example.com', phone: '0812 345 6789', orgId: 'coop-1', farmerId: 'f-003', title: 'Farmer' },
];

export const ROLE_META = {
  cooperative: { label: 'Cooperative', base: '/coop', title: 'Green Fields Cooperative' },
  investor: { label: 'Investor', base: '/investor', title: 'Investor Dashboard' },
  admin: { label: 'Administrator', base: '/admin', title: 'CollabFarm Administration' },
  farmer: { label: 'Farmer', base: '/farmer', title: 'Farmer Portal' },
};

export const COOPERATIVES = [
  {
    id: 'coop-1', name: 'Green Fields Cooperative', regNumber: 'RC/CAC/IT 1234567', yearEstablished: 2016, email: 'info@greenfieldscoop.example', phone: '+234 803 123 4567',
    address: 'No 1, Euphrates Street, Maitama', state: 'FCT, Abuja', lga: 'Abuja Municipal', status: 'Verified', verifiedAt: '2026-06-12',
    representatives: [{ name: 'Arnold Smith', role: 'Chairman' }, { name: 'Ngozi Adeyemi', role: 'Secretary' }],
    bank: { name: 'Sample Partner Bank', accountName: 'Green Fields Cooperative', last4: '4821' },
    documents: [
      { id: 'd1', type: 'Registration certificate', file: 'cac-certificate.pdf', status: 'Verified', reviewer: 'Zainab Bello', reviewedAt: '2026-06-10' },
      { id: 'd2', type: 'Proof of address', file: 'utility-bill-may-2026.pdf', status: 'Verified', reviewer: 'Zainab Bello', reviewedAt: '2026-06-10' },
      { id: 'd3', type: 'Leadership identification', file: 'leadership-ids.pdf', status: 'Verified', reviewer: 'Emeka Eze', reviewedAt: '2026-06-11' },
      { id: 'd4', type: 'Land-access evidence', file: 'kwali-land-lease.pdf', status: 'Uploaded', reviewer: null, reviewedAt: null },
      { id: 'd5', type: 'Payout account letter', file: 'bank-letter.pdf', status: 'Verified', reviewer: 'Emeka Eze', reviewedAt: '2026-06-11' },
    ],
  },
  { id: 'coop-2', name: 'Kano Farmers Cooperative', regNumber: 'RC/KN/CS 8841', yearEstablished: 2012, email: 'office@kanofarmers.example', phone: '+234 806 111 2200', address: 'Sabon Gari Road', state: 'Kano', lga: 'Fagge', status: 'Verified', verifiedAt: '2026-05-02', representatives: [{ name: 'Ibrahim Danjuma', role: 'Chairman' }], bank: { name: 'Sample Partner Bank', accountName: 'Kano Farmers Cooperative', last4: '7730' }, documents: [] },
  { id: 'coop-3', name: 'Umuada Farmers Cooperative', regNumber: 'RC/EN/CS 2209', yearEstablished: 2019, email: 'hello@umuada.example', phone: '+234 805 330 9911', address: 'Market Road', state: 'Enugu', lga: 'Nsukka', status: 'Verified', verifiedAt: '2026-04-18', representatives: [{ name: 'Chidinma Okeke', role: 'Chairperson' }], bank: { name: 'Sample Partner Bank', accountName: 'Umuada Farmers Cooperative', last4: '1156' }, documents: [] },
  { id: 'coop-4', name: 'Oyo Valley Growers', regNumber: 'RC/OY/CS 5530', yearEstablished: 2018, email: 'team@oyovalley.example', phone: '+234 807 880 4421', address: 'Ogbomosho Road', state: 'Oyo', lga: 'Ogbomosho North', status: 'Under Review', verifiedAt: null, representatives: [{ name: 'Tunde Adebayo', role: 'Chairman' }], bank: { name: 'Sample Partner Bank', accountName: 'Oyo Valley Growers', last4: '9087' }, documents: [{ id: 'x1', type: 'Registration certificate', file: 'cac.pdf', status: 'Verified' }, { id: 'x2', type: 'Proof of address', file: 'address.pdf', status: 'Uploaded' }, { id: 'x3', type: 'Land-access evidence', file: 'land.pdf', status: 'Uploaded' }] },
  { id: 'coop-5', name: 'Niger Delta Fish Farmers', regNumber: 'RC/DT/CS 7712', yearEstablished: 2020, email: 'contact@ndfish.example', phone: '+234 809 223 1100', address: 'Creek Road', state: 'Delta', lga: 'Warri South', status: 'Additional Information Required', verifiedAt: null, representatives: [{ name: 'Efe Oghenekaro', role: 'Chairman' }], bank: { name: 'Sample Partner Bank', accountName: 'Niger Delta Fish Farmers', last4: '3304' }, documents: [{ id: 'y1', type: 'Registration certificate', file: 'cac.pdf', status: 'Verified' }, { id: 'y2', type: 'Proof of address', file: 'address.pdf', status: 'Rejected' }] },
  { id: 'coop-6', name: 'Benue Rice Growers Union', regNumber: 'RC/BN/CS 1920', yearEstablished: 2010, email: 'union@benuerice.example', phone: '+234 802 450 7788', address: 'Wurukum Market Road', state: 'Benue', lga: 'Makurdi', status: 'Submitted', verifiedAt: null, representatives: [{ name: 'Terhemba Aondo', role: 'President' }], bank: { name: 'Sample Partner Bank', accountName: 'Benue Rice Growers Union', last4: '5512' }, documents: [{ id: 'z1', type: 'Registration certificate', file: 'cac.pdf', status: 'Uploaded' }] },
];

export const INVESTORS = [
  { id: 'inv-1', name: 'Arnold Okafor', org: 'Impact Horizon Fund', type: 'Impact Investor', email: 'arnold.okafor@impactfund.example', phone: '+234 802 555 0147', country: 'Nigeria', location: 'Abuja, Nigeria', address: 'No 14, Aso Drive, Maitama, Abuja', status: 'Verified', eligibility: 'Eligible', riskAcknowledged: true, agreementSigned: true, bio: 'Supporting sustainable agricultural growth across Africa', verifiedAt: '2026-03-20' },
  { id: 'inv-2', name: 'Halima Yusuf', org: 'Savanna Capital', type: 'Private Investor', email: 'halima@savanna.example', phone: '+234 803 700 1212', country: 'Nigeria', location: 'Kaduna, Nigeria', address: '5 Ahmadu Bello Way, Kaduna', status: 'Verified', eligibility: 'Eligible', riskAcknowledged: true, agreementSigned: true, verifiedAt: '2026-04-02' },
  { id: 'inv-3', name: 'Michael Eze', org: 'Individual', type: 'Private Investor', email: 'michael.eze@example.com', phone: '+234 807 100 4545', country: 'Nigeria', location: 'Lagos, Nigeria', address: '22 Allen Avenue, Ikeja', status: 'Under Review', eligibility: 'Pending checks', riskAcknowledged: false, agreementSigned: false, verifiedAt: null },
  { id: 'inv-4', name: 'Rural Growth Trust', org: 'Rural Growth Trust', type: 'Institutional', email: 'invest@ruralgrowth.example', phone: '+234 809 800 3000', country: 'Nigeria', location: 'Abuja, Nigeria', address: 'Plot 8, Central Business District', status: 'Additional Information Required', eligibility: 'Pending checks', riskAcknowledged: true, agreementSigned: false, verifiedAt: null },
];

const FIRST = ['Bruce', 'Natasha', 'Stephen', 'Clint', 'Aisha', 'Yahaya', 'Ayo', 'Nanpak', 'Blessing', 'Richard', 'Kenechukwu', 'Sulaihat', 'Akpan', 'Amanda', 'Grace', 'Musa', 'Fatima', 'Chukwuemeka', 'Hauwa', 'Tobi', 'Ifeoma', 'Danladi', 'Rukayat', 'Segun', 'Mercy', 'Garba', 'Ngozi', 'Emmanuel'];
const LAST = ['Banner', 'Romanoff', 'Strange', 'Barton', 'Bello', 'Bello', 'Tunde', 'Green', 'Audu', 'Olaolu', 'Adeyemi', 'Mamoud', 'Akpabio', 'Ike', 'Okoro', 'Ibrahim', 'Sani', 'Nwosu', 'Lawal', 'Ojo', 'Eze', 'Gambo', 'Adekunle', 'Falade', 'Udoh', 'Bala', 'Obi', 'Okon'];
const CROPS = ['Maize', 'Yam', 'Groundnut', 'Spinach', 'Potatoes', 'Rice', 'Cassava', 'Tomato'];
const STATUSES = ['Verified', 'Pending', 'Verified', 'Pending', 'Verified', 'Verified', 'Pending', 'Verified'];
const GENDERS = ['Male', 'Female'];

// The demo farmer login (Aisha Bello) is farmer f-003 and takes part in package pkg-1. These overrides keep the
// generated list consistent with the agreement, input records, obligations and payments that reference her.
const FARMER_OVERRIDES = {
  'f-003': { name: 'Aisha Bello', email: 'aisha.bello@example.com', phone: '0812 345 6789', cropType: 'Yam', allocationPackageId: 'pkg-1', allocatedAmount: 250000 },
  'f-005': { name: 'Stephen Strange', email: 'stephen.strange@example.com' },
};

// Deterministic generator so every reload gives the same data.
export const FARMERS = Array.from({ length: 36 }, (_, i) => {
  const n = i + 1;
  const status = i === 3 ? 'Removed' : STATUSES[i % STATUSES.length];
  const name = `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`;
  const day = 1 + ((i * 3) % 27);
  const month = 7 + (i % 3);
  return {
    id: `f-${String(n).padStart(3, '0')}`,
    coopId: 'coop-1',
    name,
    nin: `${22000000000 + i * 7919331}`.slice(0, 11),
    phone: `08${12 + (i % 8)} ${300 + i * 7} ${(6789 + i * 131) % 10000}`.replace(/\s(\d{3})\s(\d{1,4})$/, (m, a, b) => ` ${a} ${String(b).padStart(4, '0')}`),
    email: `${name.toLowerCase().replace(/\s/g, '.')}@example.com`,
    gender: GENDERS[(i + 1) % 2],
    cropType: CROPS[i % CROPS.length],
    farmSize: 2 + (i % 7),
    farmSizeUnit: 'Acres',
    status,
    identityStatus: status === 'Verified' ? 'Verified' : status === 'Removed' ? 'Verified' : 'Pending',
    membership: status === 'Removed' ? 'Ended' : 'Active member',
    consent: status === 'Verified',
    experienceYears: 2 + (i % 14),
    skills: ['Land preparation', 'Planting', i % 2 ? 'Irrigation' : 'Crop protection'],
    farmId: `farm-${(i % 4) + 1}`,
    dateAdded: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T09:30:00`,
    notes: i % 5 === 0 ? 'Experienced with rainfed maize and groundnut intercropping.' : '',
    agreementStatus: status === 'Verified' ? (i % 4 === 0 ? 'Awaiting Signature' : 'Signed') : 'Not Signed',
    allocationPackageId: status === 'Verified' && i % 3 !== 2 ? ['pkg-1', 'pkg-2', 'pkg-3'][i % 3] : null,
    allocatedAmount: status === 'Verified' && i % 3 !== 2 ? [120000, 300000, 300000][i % 3] : 0,
    duplicateFlag: i === 9 ? 'Possible duplicate NIN with f-005' : null,
  };
}).map((f) => (FARMER_OVERRIDES[f.id] ? { ...f, ...FARMER_OVERRIDES[f.id] } : f));
