// Farms, disbursements, milestones, inputs, harvests, sales and distributions (mock).

export const FARMS = [
  { id: 'farm-1', coopId: 'coop-1', name: 'Kwali Block A', location: 'Kwali, FCT', areaHa: 42, landAccess: 'Verified', crop: 'Maize', season: 'Wet 2026', status: 'Active', lastInspection: '2026-09-18', documents: ['Lease agreement', 'Survey plan'] },
  { id: 'farm-2', coopId: 'coop-1', name: 'Kwali Block B', location: 'Kwali, FCT', areaHa: 58, landAccess: 'Verified', crop: 'Yam', season: 'Wet 2026', status: 'Active', lastInspection: '2026-09-18', documents: ['Lease agreement'] },
  { id: 'farm-3', coopId: 'coop-1', name: 'Gwagwalada Plot 3', location: 'Gwagwalada, FCT', areaHa: 31, landAccess: 'Uploaded', crop: 'Groundnut', season: 'Wet 2026', status: 'Active', lastInspection: '2026-08-30', documents: ['Community consent letter'] },
  { id: 'farm-4', coopId: 'coop-1', name: 'Bwari Riverside', location: 'Bwari, FCT', areaHa: 24, landAccess: 'Pending', crop: 'Rice', season: 'Dry 2026/27', status: 'Inactive', lastInspection: null, documents: [] },
];

export const SUPPLIERS = [
  { id: 'sup-1', name: 'AgroPlus Inputs Ltd', category: 'Seeds and fertiliser', verification: 'Verified', phone: '+234 809 330 1100' },
  { id: 'sup-2', name: 'Savanna Machinery Hire', category: 'Machinery and equipment', verification: 'Verified', phone: '+234 806 770 4500' },
  { id: 'sup-3', name: 'GreenAqua Feeds', category: 'Other approved expenses', verification: 'Under Review', phone: '+234 805 910 7788' },
];

// Names match the generated farmer list in people.js (ids and names must stay in step).
const farmerRows = [
  ['f-001', 'Bruce Banner'], ['f-002', 'Natasha Romanoff'], ['f-005', 'Stephen Strange'], ['f-006', 'Yahaya Bello'], ['f-007', 'Ayo Tunde'], ['f-003', 'Aisha Bello'],
  ['f-009', 'Blessing Audu'], ['f-010', 'Richard Olaolu'], ['f-011', 'Kenechukwu Adeyemi'], ['f-012', 'Sulaihat Mamoud'], ['f-013', 'Akpan Akpabio'],
];
const items = ['Carrot Harvest', 'Catfish Rearing', 'Chick Starter', 'Grazing Fund', 'Tomato Harvest', 'Labour support (tranche 2)', 'Rice planting', 'Rice planting', 'Rice planting', 'Rice planting', 'Rice planting'];
const cats = ['Crop Farming', 'Fishery', 'Poultry', 'Livestock', 'Crop Farming', 'Crop Farming', 'Crop Farming', 'Crop Farming', 'Crop Farming', 'Crop Farming', 'Crop Farming'];
const amts = [560000, 500000, 5000000, 1000000, 560000, 100000, 560000, 560000, 560000, 560000, 560000];
const stat = ['Disbursed', 'Reviewing', 'Rejected', 'Pending', 'Disbursed', 'Disbursed', 'Disbursed', 'Disbursed', 'Disbursed', 'Disbursed', 'Disbursed'];
const dates = ['2026-08-11', '2026-09-11', '2026-10-11', '2026-10-20', '2026-10-11', '2026-10-11', '2026-10-11', '2026-10-11', '2026-10-11', '2026-10-11', '2026-10-11'];

// Farmer disbursements (payments to farmers). Supplier payments follow below.
export const DISBURSEMENTS = [
  ...farmerRows.map(([fid, name], i) => ({
    id: `dis-${i + 1}`, packageId: ['pkg-6', 'pkg-2', 'pkg-3', 'pkg-4', 'pkg-7', 'pkg-1', 'pkg-6', 'pkg-7', 'pkg-9', 'pkg-7', 'pkg-6'][i], trancheId: `${['pkg-6', 'pkg-2', 'pkg-3', 'pkg-4', 'pkg-7', 'pkg-1', 'pkg-6', 'pkg-7', 'pkg-9', 'pkg-7', 'pkg-6'][i]}-t${fid === 'f-003' ? 2 : 1}`,
    recipientType: 'Farmer', recipientId: fid, recipientName: name, purpose: items[i], category: cats[i], amount: amts[i], date: dates[i], status: stat[i],
    ref: `TX-1234567${i}`, recordedBy: 'Admin User', approvals: stat[i] === 'Disbursed' ? [{ by: 'Zainab Bello', role: 'Project reviewer' }, { by: 'Emeka Eze', role: 'Payment approver' }] : [],
    idempotencyKey: `idem-${i + 1}-${fid}`, destination: 'Verified payout account ending 4402',
  })),
  { id: 'dis-12', packageId: 'pkg-1', trancheId: 'pkg-1-t1', recipientType: 'Supplier', recipientId: 'sup-1', recipientName: 'AgroPlus Inputs Ltd', purpose: 'Seeds and NPK fertiliser (PO-2026-014)', category: 'Crop Farming', amount: 300000, date: '2026-05-22', status: 'Disbursed', ref: 'TX-33810021', recordedBy: 'Admin User', approvals: [{ by: 'Zainab Bello', role: 'Project reviewer' }, { by: 'Emeka Eze', role: 'Payment approver' }], idempotencyKey: 'idem-sup-1', destination: 'Verified supplier account ending 9910', invoice: 'INV-AP-5521', deliveryEvidence: 'Delivery note signed 21 May 2026' },
  { id: 'dis-13', packageId: 'pkg-1', trancheId: 'pkg-1-t2', recipientType: 'Supplier', recipientId: 'sup-2', recipientName: 'Savanna Machinery Hire', purpose: 'Tractor hire for ridging', category: 'Crop Farming', amount: 200000, date: '2026-06-18', status: 'Disbursed', ref: 'TX-33810022', recordedBy: 'Admin User', approvals: [{ by: 'Zainab Bello', role: 'Project reviewer' }, { by: 'Emeka Eze', role: 'Payment approver' }], idempotencyKey: 'idem-sup-2', destination: 'Verified supplier account ending 2205', invoice: 'INV-SM-0042', deliveryEvidence: 'Job card signed 17 Jun 2026' },
  { id: 'dis-14', packageId: 'pkg-1', trancheId: 'pkg-1-t3', recipientType: 'Cooperative', recipientId: 'coop-1', recipientName: 'Green Fields Cooperative', purpose: 'Crop maintenance operating costs (Tranche 3, first part)', category: 'Crop Farming', amount: 100000, date: '2026-10-28', status: 'Pending', ref: 'TX-33810023', recordedBy: 'Zainab Bello', approvals: [{ by: 'Zainab Bello', role: 'Project reviewer' }], idempotencyKey: 'idem-coop-3', destination: 'Cooperative payout account ending 4821' },
];

export const MILESTONES = [
  { id: 'ms-1', packageId: 'pkg-1', trancheId: 'pkg-1-t1', title: 'Land preparation complete', description: 'Ploughing and ridging on Kwali Block A and B', dueDate: '2026-06-05', status: 'Approved', submittedBy: 'Arnold Smith', submittedAt: '2026-06-03', reviewedBy: 'Zainab Bello', reviewNotes: 'Inspection report matches submitted photos.', evidence: [{ id: 'e1', type: 'Field inspection report', name: 'inspection-kwali-june.pdf', verified: true }, { id: 'e2', type: 'Photograph', name: 'ridged-plots.jpg', verified: false }] },
  { id: 'ms-2', packageId: 'pkg-1', trancheId: 'pkg-1-t2', title: 'Inputs delivered to farmers', description: 'Seeds and fertiliser delivered against PO-2026-014', dueDate: '2026-06-25', status: 'Approved', submittedBy: 'Arnold Smith', submittedAt: '2026-06-22', reviewedBy: 'Zainab Bello', reviewNotes: 'Delivery receipts signed by 24 farmers.', evidence: [{ id: 'e3', type: 'Input delivery receipts', name: 'delivery-receipts.pdf', verified: true }, { id: 'e4', type: 'Supplier invoice', name: 'INV-AP-5521.pdf', verified: true }] },
  { id: 'ms-3', packageId: 'pkg-1', trancheId: 'pkg-1-t3', title: 'Crop maintenance verified', description: 'Weeding, fertiliser application and pest control', dueDate: '2026-10-25', status: 'Under Review', submittedBy: 'Arnold Smith', submittedAt: '2026-10-26', reviewedBy: null, reviewNotes: '', evidence: [{ id: 'e5', type: 'Planting and crop-maintenance report', name: 'maintenance-oct.pdf', verified: false }, { id: 'e6', type: 'Photograph', name: 'field-photos-oct.zip', verified: false }] },
  { id: 'ms-4', packageId: 'pkg-1', trancheId: 'pkg-1-t4', title: 'Harvest and storage ready', description: 'Harvest labour booked and storage confirmed', dueDate: '2026-11-30', status: 'Not Started', submittedBy: null, submittedAt: null, reviewedBy: null, reviewNotes: '', evidence: [] },
  { id: 'ms-5', packageId: 'pkg-6', trancheId: 'pkg-6-t4', title: 'Harvest storage evidence', description: 'Storage records for wheat harvest', dueDate: '2026-10-20', status: 'Delayed', submittedBy: null, submittedAt: null, reviewedBy: null, reviewNotes: '', evidence: [] },
  { id: 'ms-6', packageId: 'pkg-7', trancheId: 'pkg-7-t4', title: 'Paddy harvest report', description: 'Harvest quantities and moisture readings', dueDate: '2026-10-28', status: 'Under Review', submittedBy: 'Chidinma Okeke', submittedAt: '2026-10-29', reviewedBy: null, reviewNotes: '', evidence: [{ id: 'e7', type: 'Harvest quantities', name: 'paddy-weighbridge.pdf', verified: false }] },
  { id: 'ms-7', packageId: 'pkg-2', trancheId: 'pkg-2-t1', title: 'Pond preparation', description: 'Pond liming and water testing', dueDate: '2026-12-15', status: 'Not Started', submittedBy: null, submittedAt: null, reviewedBy: null, reviewNotes: '', evidence: [] },
];

export const INPUT_RECORDS = [
  { id: 'in-1', packageId: 'pkg-1', farmerId: 'f-001', farmerName: 'Bruce Banner', item: 'Yam setts', qty: 400, unit: 'pcs', cost: 60000, date: '2026-06-20', supplier: 'AgroPlus Inputs Ltd', delivered: true },
  { id: 'in-2', packageId: 'pkg-1', farmerId: 'f-003', farmerName: 'Aisha Bello', item: 'NPK fertiliser', qty: 4, unit: 'bags', cost: 72000, date: '2026-06-20', supplier: 'AgroPlus Inputs Ltd', delivered: true },
  { id: 'in-3', packageId: 'pkg-1', farmerId: 'f-003', farmerName: 'Aisha Bello', item: 'Yam setts', qty: 500, unit: 'pcs', cost: 75000, date: '2026-06-20', supplier: 'AgroPlus Inputs Ltd', delivered: true },
  { id: 'in-4', packageId: 'pkg-1', farmerId: 'f-005', farmerName: 'Yahaya Bello', item: 'Herbicide', qty: 6, unit: 'litres', cost: 54000, date: '2026-08-05', supplier: 'AgroPlus Inputs Ltd', delivered: false },
];

export const EXPENSES = [
  { id: 'ex-1', packageId: 'pkg-1', category: 'Seeds and fertiliser', description: 'Yam setts and NPK (PO-2026-014)', amount: 300000, date: '2026-05-22', supplier: 'AgroPlus Inputs Ltd', status: 'Confirmed', ref: 'TX-33810021' },
  { id: 'ex-2', packageId: 'pkg-1', category: 'Machinery and equipment', description: 'Tractor hire for ridging', amount: 200000, date: '2026-06-18', supplier: 'Savanna Machinery Hire', status: 'Confirmed', ref: 'TX-33810022' },
  { id: 'ex-3', packageId: 'pkg-1', category: 'Farmer labour', description: 'Labour support paid to farmers', amount: 100000, date: '2026-10-11', supplier: 'Paid to farmers', status: 'Under Reconciliation', ref: 'TX-12345675' },
  { id: 'ex-4', packageId: 'pkg-1', category: 'Crop protection', description: 'Pesticide purchase', amount: 95000, date: '2026-09-02', supplier: 'AgroPlus Inputs Ltd', status: 'Pending', ref: 'TX-33810031' },
];

export const HARVESTS = [
  { id: 'hv-1', packageId: 'pkg-3', crop: 'Broiler chickens (1,500 birds)', expectedQty: 1500, actualQty: 1452, unit: 'birds', date: '2026-06-08', quality: 'Grade A', location: 'Coop cold room, Gwagwalada', soldQty: 1452, remainingQty: 0, status: 'Approved', reviewer: 'Zainab Bello', evidence: 'weighing-sheet.pdf' },
  { id: 'hv-2', packageId: 'pkg-9', crop: 'Paddy rice', expectedQty: 24000, actualQty: 22600, unit: 'kg', date: '2026-07-06', quality: 'Grade B', location: 'Kwali warehouse', soldQty: 22600, remainingQty: 0, status: 'Approved', reviewer: 'Zainab Bello', evidence: 'weighbridge-ticket.pdf' },
  { id: 'hv-3', packageId: 'pkg-7', crop: 'Paddy rice', expectedQty: 90000, actualQty: 84300, unit: 'kg', date: '2026-10-27', quality: 'Grade A', location: 'Makurdi store', soldQty: 30000, remainingQty: 54300, status: 'Under Review', reviewer: null, evidence: 'paddy-weighbridge.pdf' },
  { id: 'hv-4', packageId: 'pkg-6', crop: 'Wheat', expectedQty: 45000, actualQty: 0, unit: 'kg', date: '', quality: '', location: '', soldQty: 0, remainingQty: 0, status: 'Pending', reviewer: null, evidence: '' },
];

export const SALES = [
  { id: 'sl-1', packageId: 'pkg-3', harvestId: 'hv-1', buyer: 'FreshBird Foods Ltd', qty: 1452, unit: 'birds', unitPrice: 6500, gross: 9438000, date: '2026-06-12', ref: 'SALE-77120', paymentStatus: 'Confirmed', deductions: 0, outstanding: 0 },
  { id: 'sl-2', packageId: 'pkg-9', harvestId: 'hv-2', buyer: 'Makurdi Rice Mill', qty: 22600, unit: 'kg', unitPrice: 700, gross: 15820000, date: '2026-07-10', ref: 'SALE-77121', paymentStatus: 'Confirmed', deductions: 150000, outstanding: 0 },
  { id: 'sl-3', packageId: 'pkg-7', harvestId: 'hv-3', buyer: 'Benue Agro Traders', qty: 30000, unit: 'kg', unitPrice: 690, gross: 20700000, date: '2026-10-29', ref: 'SALE-77130', paymentStatus: 'Under Reconciliation', deductions: 0, outstanding: 4000000 },
];

// Illustration from PRD 9.4. It is not a default or a promise of returns.
export const PROFIT_ILLUSTRATION = { verifiedSales: 15000000, eligibleCosts: 10000000, otherDeductions: 500000, distributable: 4500000, investorSharePct: 40, investorShare: 1800000 };

export const DISTRIBUTIONS = [
  { id: 'ds-1', packageId: 'pkg-3', investorId: 'inv-1', type: 'Principal repayment', basis: 'Loan, scheduled principal', contribution: 5000000, amountDue: 5000000, amountPaid: 5000000, dueDate: '2026-06-30', paidDate: '2026-06-30', ref: 'DIST-0001', status: 'Confirmed', disputed: 0, reviewedBy: 'Zainab Bello' },
  { id: 'ds-2', packageId: 'pkg-3', investorId: 'inv-1', type: 'Profit distribution', basis: 'Profit sharing, 15% of distributable profit', contribution: 5000000, amountDue: 750000, amountPaid: 750000, dueDate: '2026-06-30', paidDate: '2026-06-30', ref: 'DIST-0002', status: 'Confirmed', disputed: 0, reviewedBy: 'Emeka Eze' },
  { id: 'ds-3', packageId: 'pkg-9', investorId: 'inv-1', type: 'Principal repayment', basis: 'Loan, scheduled principal', contribution: 1500000, amountDue: 1500000, amountPaid: 1500000, dueDate: '2026-07-31', paidDate: '2026-07-31', ref: 'DIST-0003', status: 'Confirmed', disputed: 0, reviewedBy: 'Zainab Bello' },
  { id: 'ds-4', packageId: 'pkg-9', investorId: 'inv-1', type: 'Profit distribution', basis: 'Profit sharing', contribution: 1500000, amountDue: 225000, amountPaid: 225000, dueDate: '2026-07-31', paidDate: '2026-07-31', ref: 'DIST-0004', status: 'Confirmed', disputed: 0, reviewedBy: 'Emeka Eze' },
  { id: 'ds-5', packageId: 'pkg-6', investorId: 'inv-1', type: 'Principal repayment', basis: 'Loan, scheduled principal', contribution: 2000000, amountDue: 2000000, amountPaid: 0, dueDate: '2026-10-04', paidDate: null, ref: 'DIST-0005', status: 'Overdue', disputed: 0, reviewedBy: null },
  { id: 'ds-6', packageId: 'pkg-7', investorId: 'inv-1', type: 'Principal repayment', basis: 'Loan, scheduled principal', contribution: 2000000, amountDue: 2000000, amountPaid: 0, dueDate: '2026-10-30', paidDate: null, ref: 'DIST-0006', status: 'Overdue', disputed: 0, reviewedBy: null },
  { id: 'ds-7', packageId: 'pkg-7', investorId: 'inv-1', type: 'Profit distribution', basis: 'Profit sharing, pending harvest sales reconciliation', contribution: 2000000, amountDue: 360000, amountPaid: 0, dueDate: '2026-11-15', paidDate: null, ref: 'DIST-0007', status: 'Pending', disputed: 0, reviewedBy: null },
  { id: 'ds-8', packageId: 'pkg-1', investorId: 'inv-1', type: 'Principal repayment', basis: 'Loan, scheduled principal', contribution: 560000, amountDue: 560000, amountPaid: 0, dueDate: '2026-12-20', paidDate: null, ref: 'DIST-0008', status: 'Pending', disputed: 0, reviewedBy: null },
];

export const FARMER_OBLIGATIONS = [
  { id: 'ob-1', farmerId: 'f-003', packageId: 'pkg-1', type: 'Produce delivery', description: 'Deliver 300 kg of yam tubers to the cooperative store', dueDate: '2026-12-10', status: 'Pending' },
  { id: 'ob-2', farmerId: 'f-003', packageId: 'pkg-1', type: 'Repayment', description: 'Repayment per Farmer Participation Agreement (clause 6)', amount: 25000, dueDate: '2026-12-20', status: 'Pending' },
];
