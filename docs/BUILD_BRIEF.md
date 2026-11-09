# Page build brief (read this fully before writing any page)

You are building pages for the CollabFarm Finance portal. The foundation (data, UI kit, layouts, routing, CSS) is finished. Your job is to replace the STUB pages assigned to you with complete, polished, working pages.

## Hard rules

1. FRONTEND ONLY. No `fetch`, `XMLHttpRequest`, `axios`, `WebSocket`, `EventSource`, `navigator.sendBeacon`, no backend code, no env vars, no external services, no remote images, no CDN scripts. Everything runs on mock data and local state. Simulated waits use `simulate(ms)` or `useSimulatedLoad(ms)` from `src/context/AppContext.jsx`.
2. NO EM DASHES anywhere (UI text, comments, strings, docs). Use a period, comma, colon or restructure. Do not use the en dash as a substitute in prose either (a plain hyphen inside ranges like 1-10 is fine).
3. Money is shown with `formatNaira()` from `src/utils/format.js`. Dates with `formatDate` and friends. Never hard code the currency sign.
4. Explain financial terms in plain language where a normal person would stumble (tranche, reconciliation, maker-checker, profit share, commitment vs received money, and so on). Use short helper text, an info line under a heading, or a small glossary banner.
5. Never imply guaranteed returns. Expected returns are estimates. Keep the three PRD rules visible where relevant: a commitment is not received money, approval is not a guarantee of success, crop failure is not fraud.
6. Every visible control must do something local: navigate, open a modal, switch a tab, filter, sort, paginate, validate a form, save to the store, show a toast. No dead buttons, no `href="#"`. If a control has no meaningful local effect, remove it rather than leave it inert.
7. Do not edit shared files. You may only create or overwrite: your assigned page files, helper components inside `src/components/<your-group>/`, and one stylesheet `src/styles/pages/<your-group>.css` (import it from your page files with `import '../../styles/pages/<your-group>.css'`). Do NOT touch: `src/context`, `src/data`, `src/utils`, `src/components/ui`, `src/components/common`, `src/components/charts`, `src/layouts`, `src/routes`, `src/styles/index.css`, `src/styles/tokens.css`, `package.json`, `docs`. If you find a bug or a missing capability in shared code, work around it locally and list it in your final report.
8. Use only existing dependencies: react, react-router-dom, lucide-react. No new packages.
9. Plain CSS only, using the tokens in `src/styles/tokens.css` and the class vocabulary in `src/styles/index.css`. Prefer existing classes. Namespace any new class with your group prefix (for example `.coop-…`) so nothing collides with other builders working in parallel.
10. Never use `dangerouslySetInnerHTML`. Never store passwords or real personal data. Sample people and organisations are fictional.

## Read first (in this order)

1. `docs/REQUIREMENTS_DIGEST.md` (domain rules, statuses, agreements, tranches, what is out of scope)
2. `docs/DESIGN_SPEC.md` (visual language, Figma node ids)
3. `src/routes/manifest.js` and `src/layouts/navConfig.jsx` (which routes exist, where you are mounted)
4. `src/context/AppContext.jsx` (`useApp()` returns `data, user, role, roleMeta, toast, add, update, audit, notify, patchData, signIn, signOut, resetDemo`; plus `useSimulatedLoad`, `simulate`, `newId`)
5. `src/components/ui/*.jsx` (Button, Card, Form, Modal, DataTable, Nav, Dropdown, barrel `index.js`), `src/components/charts/Charts.jsx`, `src/components/common/{Brand,Photo}.jsx`
6. `src/data/*.js` and `src/utils/{format,status,rules}.js`
7. Skim `src/styles/index.css` for the available classes and `src/styles/tokens.css` for variables.
8. One or two existing finished pages in your group (if another builder has already written them) are the style reference for consistency. Otherwise follow the DESIGN_SPEC.

Import the UI kit from the barrel: `import { Card, Button, DataTable, … } from '../../components/ui/index.js'`.

## Data and state

- All records are in `data` from `useApp()`. The shape of every collection is visible in `src/data/*.js`. Key collections: users, cooperatives, investors, farmers, farms, suppliers, packages, tranches, investments, transactions, wallets, disbursements, milestones, inputRecords, expenses, harvests, sales, distributions, obligations, contracts, complaints, notifications, audit, reconciliation, riskCases, applications, userVerification, platformSettings, userSettings.
- Mutate only through `add(collection, record, auditEntry?)`, `update(collection, id, patchOrFn, auditEntry?)`, `patchData(patchOrFn)`, `notify(role, title, message, link, type)`, `toast(message, tone)`. Pass an `auditEntry` like `{ action: 'Farmer added', entityType: 'Farmer', summary: '…', reason: '…' }` for every material change. Financial records are never deleted; change their status instead.
- The signed in user is `user` (`user.role`, `user.orgId`, `user.farmerId`). Scope what you show to that user's own organisation or records (a cooperative sees only its own `coopId`; an investor sees only their own investments; a farmer sees only their own record). Use `data.cooperatives.find(c => c.id === user.orgId)` etc.
- Demo users: `u-coop` (cooperative, org `coop-1`), `u-inv` (investor, org `inv-1`), `u-admin` (project reviewer), `u-admin2` (payment approver), `u-farmer` (farmer `f-003`).
- Business rule helpers are in `src/utils/rules.js` (`budgetReconciles`, `allocationCheck`, `sixAmounts`, `canReleaseTranche`, `needsSecondApprover`, `canSecondApprove`, `profitShare`, `packageFunding`, `INVESTOR_VISIBLE`). Use them instead of re-deriving.
- If a page needs sample records that do not exist in the data, derive them from existing records or define a local constant in your page file. Do not edit `src/data`.
- Pages must handle: a missing record for `:id` (show `EmptyState` with a back link), empty collections (`EmptyState`), and a short loading state on first mount (`useSimulatedLoad(350)` with `Skeleton` or `PageSkeleton`) for list and dashboard pages.

## UX standard

- Page structure: `<div className="page">`, then `PageHeader` (title, subtitle, actions), optional `Breadcrumb` on detail and form pages, then content in `Card`s. Lists use `DataTable` (search, filters, sort, pagination). Use `KpiCard`/`KpiStrip` for headline numbers, `StatusPill` for statuses (tone is derived by `statusTone`), `Banner` for warnings and info.
- Forms: use `Field` wrappers from `Form.jsx`, required marker, inline error text under the field, validate on submit and clear errors as the user edits. Disable the submit button and show `loading` while a simulated save runs, then toast and navigate or close the modal.
- Destructive or financial actions use `ConfirmDialog` with a `summary` (recipient, amount, purpose, approval status).
- Tabs and filters: keep state in the URL query string where it makes sense (`useSearchParams`) so refresh and deep links work.
- Responsive: desktop (1440), laptop (1280), tablet (820), mobile (390). Tables must scroll horizontally inside their card on small screens rather than breaking the page. Grids collapse to one column on mobile. Touch targets at least 40px.
- Accessibility: every input has a visible label, icon-only buttons have `aria-label`, headings are in order, modals trap focus (the shared Modal does), colour is never the only status signal.
- Visual language: follow the Figma-derived tokens. Do not invent new colours. Do not add decorative gradients that are not in the design. Photos use `<Photo name="…" theme="…">` (never `<img>` to a remote URL).

## Figma (optional, for visual reference)

Figma file key `e6lnAK81A68HsFQovyG5wW`. Session id for Figma tools: `8d19c912-a5a1-52dc-92a1-25989a34b65d`. Load the tool first with ToolSearch (`select:mcp__Figma__get_screenshot`), then call it with `fileKey`, `nodeId` (format `6046:1078`), `sessionId`, `enableBase64Response: true`, `maxDimension: 1300`. Node ids per screen are listed in `docs/DESIGN_SPEC.md`. Do not download Figma asset URLs with curl (the proxy blocks the host; do not try to route around it). Screens that are not in Figma must be designed in the same language.

## Verifying your work

- A dev server is already running at `http://127.0.0.1:5173` (do not start another or kill it). It hot reloads your files.
- Build check (use your own output folder so you do not clash with other builders): `cd /home/claude/collabfarm-portal && npx vite build --outDir /tmp/claude-0/-home-claude/8d19c912-a5a1-52dc-92a1-25989a34b65d/scratchpad/dist-<group> --emptyOutDir`. Other builders' half-written files may cause errors outside your scope. Ignore those and fix only your own.
- Browser check with Playwright (`require('playwright')` works; with node run `NODE_PATH=$(npm root -g) node script.js`). Sign in by seeding the session before navigation: `ctx.addInitScript((id) => localStorage.setItem('collabfarm-demo-session-v1', JSON.stringify(id)), 'u-coop')`. To start from fresh seed data, also `localStorage.removeItem('collabfarm-demo-state-v1')` in the init script. Visit every one of your routes at 1440 and 390 wide, fail on any `console.error` or `pageerror`, and take screenshots of the key pages and LOOK at them (Read the PNG). Exercise the main interactions (open modals, submit forms with invalid and valid input, change tabs, filter, paginate) and confirm the state change. Put scripts and screenshots in the scratchpad folder `/tmp/claude-0/-home-claude/8d19c912-a5a1-52dc-92a1-25989a34b65d/scratchpad/<group>/`, never in the project.
- Fix what you find. Finish only when every assigned route renders without console errors and the main flows work.
- Before finishing, search your own files for forbidden things: em dashes (the character U+2014), `fetch(`, `axios`, `XMLHttpRequest`, `href="#"`, `TODO`, `STUB`.

## Final report (keep it under 250 words, no em dashes)

List: the routes completed, any route not finished and why, bugs or gaps you found in shared code (file and line), any place where the PRD, the deck and Figma disagree (state the conflict, do not silently pick), and anything the integrator must wire. Do not paste code.

---

# Appendix: cross-page workflow contracts

Ten builders work in parallel on different pages that share one store. To make the pieces fit, everyone follows these contracts. Use the existing statuses from the seed data (listed in `docs/REQUIREMENTS_DIGEST.md` and visible in `src/data`). Do not invent new status strings.

## Who changes what

| Record | Created by | Moves through | Changed by |
|---|---|---|---|
| user, cooperative, investor (registration) | auth pages | Submitted, Under Review, Additional Information Required, Verified (or Rejected, Suspended) | Admin verification pages. The auth status page has a clearly labelled "Simulate admin approval (demo only)" button. |
| farmer | Cooperative FarmerForm (status Pending, identityStatus Pending) | Pending, Verified, Removed (soft removal only) | Admin sets identity Verified. Cooperative can remove (status Removed with a reason, audit entry). |
| package (a project and its investable package) | Cooperative CreateFunding (Draft) | Draft, Submitted, Under Review, Changes Requested, Approved, Open for Funding, Funding Target Reached, Active, Completed | Cooperative submits (also adds an `applications` record). Admin Applications review moves it. Investor Invest updates `raised`, `committed`, `investorsCount`. |
| application | Cooperative on submit (`type` Funding application or Budget change) | Submitted, Under Review, Changes Requested, Approved, Rejected | Admin ApplicationReview. A material budget change needs a second reviewer (`secondApprover`) different from `reviewer`. |
| investment | Investor Invest flow (status Pending, `intended`, `committed`) | Pending, Active, Completed, Overdue, Repaid | Becomes Active when funds are confirmed (admin Reconciliation confirmation or wallet confirmation). The six amounts live on the record. |
| wallet (`data.wallets[investorId]`) | seed or created on investor registration | `available`, `locked`, `pendingConfirmation` | Investor Wallet funding flow (a transfer is Initiated then Pending, never Confirmed by the investor), admin Reconciliation confirms. A missing wallet means zero balances. |
| tranche | seed (4 per active package) | Locked, Pending Evidence, Under Review, Approved, Released, Rejected | Gated by `canReleaseTranche`. Released only by an admin payment approval. |
| milestone | seed or created by cooperative | Not Started, Under Review, Approved, Delayed | Cooperative submits evidence (Under Review). Admin MilestoneReview approves or returns. Farmer Activities can add farmer progress evidence to the related milestone. |
| disbursement | Cooperative Disbursements (request) or admin on tranche release | Pending, Reviewing, Disbursed, Rejected | Admin DisbursementReview. `approvals` is an array of `{by, role}`. Above `platformSettings.approvalLimits.secondApproverAbove` a second, different approver is required (`needsSecondApprover`, `canSecondApprove`). Demo reviewer is `u-admin` (Zainab Bello), demo payment approver is `u-admin2` (Emeka Eze). The user who raised or first approved a payment cannot approve it again. |
| harvest, sale | Cooperative RecordHarvest | harvest: Pending, Under Review, Approved. sale paymentStatus: Under Reconciliation, Confirmed | Admin approves harvest, admin Reconciliation confirms sale receipt. A recorded sale is not money received until Confirmed. |
| distribution | seed or generated from an approved sale (`profitShare`) | Pending, Confirmed, Overdue | Admin Distributions approves and marks paid. Investor can raise a dispute (`disputed` amount, plus a complaint). Prevent double payment. |
| contract | seed | Awaiting Signature, Signed, Expired. Versions append to `history`, never overwrite | Signing happens in shared Contracts for the relevant party (typed full name, consent tick, timestamp, version recorded). |
| complaint | any role (shared ComplaintNew, farmer ReportIssue) | Open, Under Review, Awaiting Response, Resolved, Escalated | Admin triages and updates; each change appends an entry to `actions`. Visible only to the submitter, the related parties allowed to see it, and admins. |
| riskCase | admin RiskAlerts (manual) or created from an overdue item | Open, Under Review, Awaiting Response, Escalated (and closed outcomes) | Admin RiskCase. The seven PRD case categories have separate review paths. Never label a person fraudulent from a missed deadline or crop failure. |
| notification | the actor of any material change via `notify(role, …)` | read flag | Every user via the bell or Notifications page. Always include a `link` to the right route. |
| audit | every material change via the `auditEntry` argument | append only | Nobody edits or deletes entries. |

## Gating rules every page respects

- An unverified cooperative (status not Verified) cannot create or submit funding, record farmers in bulk beyond drafts, or request disbursements. Show a `Banner` explaining why and linking to `/onboarding/status`.
- An investor who is not Verified, or has not acknowledged risk, cannot commit. The Invest flow requires: amount within minimum and maximum and remaining target, a risk acknowledgement tick, and a typed-name signature of Agreement A (version and timestamp recorded).
- Funding steps are blocked while a mandatory agreement is missing (Agreement A for the investor, B for the cooperative, C for each allocated farmer). Show which one is missing and link to Contracts.
- Tranche release needs the previous tranche released and the milestone evidence approved, or a recorded exception with a reason (`canReleaseTranche`).
- Budget must reconcile with the funding plan, and farmer allocations must not exceed the budget or duplicate (`budgetReconciles`, `allocationCheck`).
- Financial confirmations always show recipient, amount, purpose and approval status first (`ConfirmDialog` `summary`).
- Investors see farmer information only at the privacy preserving level in `INVESTOR_VISIBLE` (no NIN, no phone, no exact address).

## Route links (all paths come from `src/routes/manifest.js`)

Cooperative `/coop/...`, investor `/investor/...`, admin `/admin/...`, farmer `/farmer/...`, public `/`, auth `/login` and friends. Link between areas with these paths. A link to a record in another builder's page (for example admin linking to `/admin/applications/:id`) must use the `:id` of the same record in the store. Notifications link to the route that the recipient role can open.

## Naming

The Figma file uses "Funding Packages" and a "Wallet" for investors. The PRD describes a project with a budget, tranches and no custody of funds. In the UI: call the investable item a "Funding Package" and the cooperative's request a "funding request" or "project". It is one record in `packages`. Label the investor "Wallet" page as "Wallet" in the nav (to match Figma) but put a visible banner on it: funds are held by a regulated financial partner, CollabFarm does not hold or pool money, and a payment initiation is not proof of receipt. Do not add features from the PRD "not in the MVP" list.

## Tone of copy

Plain, calm, specific. Short sentences. Say what happens next. Error messages say how to fix the problem. No marketing hype in the app (the public Home page may be warmer, but still no guaranteed returns).
