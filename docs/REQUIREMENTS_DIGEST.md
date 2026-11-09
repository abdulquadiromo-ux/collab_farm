# CollabFarm Finance: requirements digest

Source: CollabFarm Finance MVP PRD v2.0 (29 Oct 2026, 37 pages) and the 15 slide MVP deck. This digest is what page builders must respect. The UI is frontend only and runs on mock data.

## What it is
A cooperative-led agricultural funding platform. Investors fund verified cooperatives and their farmers. Every naira must be visible, approved and traceable. Aim: cut fraud, misuse of funds and poor project management.

Lifecycle that the UI must make traceable:
Investor commitment -> confirmed funds -> approved budget -> authorised disbursement -> verified farming activity -> harvest and sales -> contractual repayment or distribution.

## Roles (PRD section 3)
Four experiences in the UI. A regulated financial partner is NOT a user role.

| Role | Can | Cannot |
|---|---|---|
| Farmer | Register or be invited by a cooperative, complete profile and ID verification, view membership and project participation, view allocation and expected support, view assigned activities and milestones, submit progress reports and evidence, view inputs/payments recorded against their name, view harvest records and repayment or produce-delivery obligations, report crop failure, delayed support, suspected misuse or disputes, download signed participation agreement | Approve own funding, change an approved budget, authorise payments, see another farmer's private data |
| Cooperative | Register and submit documents, add and manage farmers (single or bulk), submit projects and funding applications, build budgets and propose farmer allocations, upload land-access evidence, farming plans, supplier quotations, track commitments and disbursements and remaining funds, submit milestone reports with evidence, record input distribution, farming activity, harvests and sales, view investor updates and respond, sign funding and accountability agreement, report crop failure and delays, submit complaints | Approve own funding application, alter approved budgets without authorisation, mark unconfirmed payments completed, change signed terms without consent |
| Investor | Register and verify (identity, eligibility, risk acknowledgement), browse eligible projects and packages, review budgets, participating farmers (privacy preserving), timelines, risks, expected outcomes, review investor agreement and disclosures, commit funds through the approved process, view commitment and payment status, track milestones, disbursements, progress reports and incidents, view verified harvest and sales, view repayment or distribution calculations and payment status, download agreements and reports, submit questions, complaints, disputes | Edit a cooperative's project, bypass funding approval, withdraw committed funds outside agreed terms |
| Administrator | Verify users and cooperatives, approve/reject/request changes on applications, review budgets and documents, approve milestone completion or refer for independent review, suspend new disbursements, monitor suspicious activity, investigate complaints, maintain project status and access, view reconciliation and outstanding obligations, generate reports, manage notifications and approval limits | Silently alter financial records, erase audit history, mark a payment successful without reliable confirmation. High-risk actions need a second authorised approver |

## Principles to show in the UI
Transparency, accountability (every material action has user + timestamp + project), controlled disbursement (by approved budget and milestone, not by commitments), separation of duties (nobody proposes, approves and pays alone), fair risk allocation (genuine crop failure is not fraud), regulatory compliance, data protection.

## Three things never to confuse
1. Commitment is not received money. A payment initiation is never proof of receipt.
2. Project approval is not a guarantee of success or returns.
3. Crop failure is not fraud. A missed deadline or failed harvest never auto-labels a farmer.

## Six amounts tracked separately (show on investor funding detail and admin reconciliation)
1 Intended to invest, 2 Formally committed, 3 Confirmed received by the financial partner, 4 Available for disbursement, 5 Actually disbursed, 6 Repaid or distributed.

## Status vocabularies
- Generic labels: Pending, Under Review, Approved, Rejected, Suspended, Completed.
- Cooperative verification: Draft, Submitted, Under Review, Additional Information Required, Verified, Rejected, Suspended.
- Project: Draft, Submitted, Under Review, Changes Requested, Approved, Open for Funding, Funding Target Reached, Ready for Disbursement, Active, Paused, Completed, Failed or Terminated. "Ready for Disbursement" only after verification, funding, contract and payment arrangements are satisfied.
- Farm: Active, Inactive. Documents: uploaded vs verified (must be visibly distinct).
- Transaction: Initiated, Pending, Confirmed, Failed, Reversed, Refunded, Under Reconciliation.
- Tranche: Locked, Pending Evidence, Under Review, Approved, Released, Rejected.
- Complaint: Open, Under Review, Awaiting Response, Resolved, Escalated.

## Agreements (three, versioned, signed, never overwritten)
A Investor Funding Agreement (parties, amount, use of funds, release conditions, return/repayment calculation, risks and potential loss, reporting, default and recovery, crop failure, disputes, termination, any real security). Must say whether it is a loan, profit-sharing or harvest participation. No guaranteed return unless genuinely enforceable.
B Cooperative Funding and Accountability Agreement (approved budget, allocations, approved uses, release conditions, reporting, monitoring, supplier payments, harvest/sales reporting, unspent funds, fraud procedure, exact extent of cooperative liability).
C Individual Farmer Participation Agreement (allocation, permitted use, reporting duties, repayment terms if any, deductions, crop failure, misuse procedure, privacy and consent). Farmer gets a copy in an accessible language.
Lifecycle UI: missing mandatory agreements block funding steps. Record exact version, signatory, timestamp. Download, version history, amendments need acceptance, flag expired or incomplete.

## Budget and allocation (section 7)
- Approved budget split by categories: Seeds and fertiliser, Land preparation, Machinery and equipment, Irrigation, Farmer labour, Crop protection, Harvesting, Storage, Transport, Other. Each item: approved amount, purpose, responsible party, supporting documentation. Items must sum to the approved funding plan.
- Farmer allocation: farmer, project, amount approved, purpose, type of support (cash vs in-kind separate), expected date, approval status, amount disbursed or delivered, evidence, outstanding balance, agreement, repayment or produce obligation. Total allocations cannot exceed approved budget. No duplicate allocations. Cooperative proposes, authorised reviewer approves.
- Staged funding in tranches: T1 Project preparation, T2 Planting, T3 Crop maintenance, T4 Harvest. Each tranche has release conditions, evidence, review, approval, rejection, request for more info. No tranche released on request alone.
- Supplier payments: paid directly where practical. Record supplier identity and verification, PO or budget item, invoice or quotation, amount due, payment reference, confirmation, delivery evidence, reviewer.
- Payments to farmers (labour, operating expenses): confirm identity and destination, amount and purpose, terms, authorisation, executed by the financial partner, reconciled, farmer and cooperative notified, outstanding amount recorded. Never to unrelated personal accounts without documented review.
- Separation of duties chain: cooperative submits budget -> project reviewer approves -> milestone reviewer checks evidence -> payment approver authorises -> payment partner confirms -> system reconciles. Material budget changes need a second reviewer. No admin can delete a completed payment or alter its amount outside an auditable correction.
- Financial actions must show a summary of recipient, amount, purpose and approval status before confirmation.
- Unspent funds and failed projects: suspend disbursements, reconcile balance, cooperative submits final account, identify recoverable amounts, notify parties, follow agreements. No automatic seizure.

## Monitoring, accountability, default
- Evidence types: input delivery receipts, supplier invoices, field inspection reports, planting and maintenance reports, harvest quantities, storage records, sales receipts, buyer confirmations, loss records. Photos and GPS support but are not conclusive.
- Seven cases with separate review paths: missed reporting deadline, project delay, disputed expense, genuine crop failure, inability to repay, suspected misuse, confirmed fraud or breach. Flow: record, notify and allow response, collect evidence, classify, suspend further funding if permitted, consider options (reschedule, restructure, insurance, recovery, dispute resolution), record decision, close.
- Reputation or history: only explainable criteria, allow disputes. Never publicly label anyone fraudulent.

## Harvest, sales, distributions (section 9)
- Harvest: expected vs actual quantity, date, crop and quality, storage or delivery location, sold and remaining, evidence, reviewer approval.
- Sales: buyer, quantity, unit price, gross value, date, reference, verified payment received, deductions, outstanding buyer balance. A recorded sale is not money received until confirmed and reconciled.
- Distribution types: loan (amount due, paid, outstanding), profit sharing (revenue less allowable costs and reserves), harvest share. Calculation traceable to inputs and reviewed before payment. Repayment of capital is never confused with profit.
- Illustration to use in mock data: verified sales N15,000,000, eligible costs N10,000,000, other deductions N500,000, illustrative distributable profit N4,500,000; if investors' agreed share is 40% their collective share is N1,800,000. Label as illustration only, not a default or a promise.
- Per investor distribution record: confirmed contribution, share or terms, calculation, amount due, amount paid, payment reference, date, outstanding, disputed amount. Prevent double distribution.

## Notifications (in-app and email)
Registration and verification results, additional information requests, project approval or rejection, new commitments, funding target reached, contract signing required, upcoming milestones, milestone approval or rejection, disbursement initiated or confirmed, late reports, suspected misuse or suspension, crop failure or material changes, harvest and sales reports, repayment or distribution due, complaint and dispute updates. Never expose passwords, codes, full ID documents or unnecessary financial details.

## Reports
- Cooperative: budgets and spending, farmer allocations, milestone progress, input delivery and usage, harvest and sales, unspent balances, outstanding obligations.
- Investor: committed and confirmed amounts, funding status, disbursements and approved expenses, project progress, material risks and incidents, harvest and sales, contractual repayments or distributions.
- Admin: registered users and verified cooperatives, projects submitted/approved/active/completed/suspended, total commitments and confirmed receipts, amount disbursed and reconciled, outstanding obligations, milestone delays, disputes and suspected misuse, projects with missing reports or unexplained variances.
- Reports must distinguish confirmed financial data from estimates and user-submitted claims.

## Complaints (all roles can raise)
Reference, submitter, project and parties, description and evidence, date, assigned reviewer, status, actions taken, outcome and explanation, appeal or escalation. Visible only to authorised parties. A complaint never triggers public accusation or irreversible penalty.

## Public site (section 4.1)
Home, About, How the platform works, How cooperative funding works, Investor information and risk disclosures, Cooperative registration, Investor registration, Login, FAQ, Contact and support, Terms, Privacy, Complaints and dispute resolution information. Public pages never expose private farmer records, unapproved projects, confidential agreements or financial information.

## Dashboard page lists from the PRD
- Cooperative (4.2): Overview, Cooperative profile, Verification status, Farmers and members, Farms and plots, Projects, Project budgets, Funding applications, Investor commitments, Funding allocation and disbursement tracking, Milestones and evidence, Input distribution and expenses, Harvest and sales, Contracts and agreements, Notifications, Complaints and support, Reports and audit history.
- Investor (4.3): Overview, Available projects, Project details, Investment commitments, Funding and disbursement status, Project progress, Risk disclosures and agreements, Harvest and sales reports, Repayments or distributions, Notifications, Support and complaints, Transaction history.
- Admin (4.4): Overview and platform statistics, User verification, Cooperative verification, Project applications, Project budget review, Farmer and farm records, Contract status, Funding and payment reconciliation, Milestone approval, Project monitoring, Risk alerts and suspicious activity, Complaints and disputes, Repayment and distribution monitoring, Audit logs, System settings and reports.

## UX requirements (section 5)
Trustworthy, straightforward, agricultural, professional. Works for low digital literacy: plain language, explain financial terms. Responsive desktop, tablet, mobile. Clear status labels. Naira amounts (use the N sign, en-NG format). Clear dates and payment references. Confirmation before sensitive actions. Loading, empty, success and error states. Form validation with useful messages. Never present estimates as confirmed payments or guaranteed returns. Accessible labels, keyboard navigation, contrast. Clearly distinguish commitments from funds received and disbursed.

## Cooperative registration fields (6.2)
Cooperative name, registration number, year established, official email and phone, address, state, LGA, authorised representatives, registration certificate, proof of address, bank or payout account where required, participating farmers info, land-access and agricultural documents. Farm creation is OPTIONAL during onboarding (never force a default farm).

## Farmer record fields (6.3)
First and last name, contact, cooperative membership, identity verification status, farming experience and skills, crop types, farm or plot assignment, project participation, approved support allocation, signed participation agreement, progress and harvest records. A farmer is not active in a project until identity, membership and consent checks complete. Detect duplicate identities and allocations.

## Farm fields (6.4)
Name or reference, location and approximate area, land-access info, crop type, season, assigned farmers, status (Active or Inactive), supporting documents, inspection records.

## Project fields (6.5)
Title, description, cooperative, farm locations and farmers, crop or activity, season and duration, start and end dates, total funding requested, minimum funding target, detailed budget, funding milestones, supplier quotations, expected harvest or output, expected sales assumptions, main risks and mitigation, proposed investor return or repayment structure, monitoring plan, contracts and disclosures.

## Investor project discovery (6.7)
Cooperative info, objectives and activity, funding target and progress, amount requested, approved budget summary, duration, privacy-preserving farmer info, key risks, milestones and reporting dates, return or repayment terms, min and max investment, funding deadline, required agreement and disclosures.

## Audit log fields (13.19)
Actor, action, entity type and id, timestamp, request reference, reason, change summary. Cannot be edited or deleted by ordinary users. No passwords or ID document contents in logs.

## Open decisions (PRD section 21). Show as configurable, never decide in the UI
Funding model (loan, grant, profit share), investor returns basis, borrower, cooperative liability, disbursement method, financial partner, minimum target shortfall handling, crop failure loss bearer, harvest sales route, regulatory structure. Mock data may include one example of each agreement type but labels must say terms are configurable and illustrative.

## Not in the MVP (do not build)
Own wallet or custody of investor funds, AI credit scoring or automated investment recommendations, blockchain, satellite monitoring, secondary marketplace, full produce marketplace or logistics, native apps, guaranteed capital return, guaranteed farmer repayment regardless of crop outcome.
