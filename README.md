# CollabFarm Cooperative Portal (frontend only)

A complete, responsive, interactive React frontend for the CollabFarm Finance platform: public site, sign in and registration, and four separate role experiences (Cooperative, Investor, Administrator, Farmer).

**This is a frontend-only build.** There is no backend, database, API, authentication service, payment gateway or external service. Every screen runs on sample data and local browser state. Nothing is sent anywhere. See [No backend, confirmed](#no-backend-confirmed).

## Quick start

Requirements: Node.js 18 or newer and npm.

```bash
npm install
npm run dev        # starts the app at http://localhost:5173
```

Other commands:

```bash
npm run build      # production build into dist/
npm run preview    # serves the production build at http://localhost:4173
```

The app uses client side routing. If you host the `dist/` folder on a static host, configure it to serve `index.html` for unknown paths (a single page app fallback). `npm run dev` and `npm run preview` already do this.

## Demo accounts

There are no real passwords. On the login page use the "Demo accounts" panel (one click), or type one of these emails with any password of 8 or more characters. You can also switch account at any time from the **Account** menu in the top bar.

| Role | Name | Email | Lands on |
|---|---|---|---|
| Cooperative | Arnold Smith (Green Fields Cooperative) | arnold@greenfieldscoop.example | /coop |
| Investor | Arnold Okafor | arnold.okafor@impactfund.example | /investor |
| Administrator (project reviewer) | Zainab Bello | zainab.bello@collabfarm.example | /admin |
| Administrator (payment approver) | Emeka Eze | emeka.eze@collabfarm.example | /admin |
| Farmer | Aisha Bello | aisha.bello@example.com | /farmer |

Two administrators exist on purpose. The payment rules need a different person to give the second approval (separation of duties), so to try a large payment, approve as one admin, then switch account and approve as the other.

You can also register a brand new cooperative or investor (`/register`), use the demo OTP shown on screen, complete the onboarding wizard, and then use the "Demo only: simulate admin decision" box on the status page to get verified. Farmers are invited by their cooperative: use `/farmer-activation` with a demo invite code shown on that page.

## Suggested walkthrough (about 10 minutes)

This is the main money flow across all four roles. Each step uses the account switcher in the top bar.

1. **Cooperative (Arnold Smith):** Funding, New request. Fill the three steps (details, budget, farmer allocation) and submit.
2. **Administrator (Zainab Bello):** Applications, open the new request, start review, approve. A farmer-facing agreement (Agreement B) is created.
3. **Cooperative:** Contracts, sign Agreement B.
4. **Administrator:** open the approved application and choose "Open for funding".
5. **Investor (Arnold Okafor):** Packages, open the package, Invest. Four steps: amount, risks and Agreement A, review, confirm. The commitment is recorded and your wallet moves money from Available to Locked.
6. **Administrator (Zainab Bello):** Disbursements, open `TX-33810023` (N100,000). Her first approval is already recorded, and the page blocks her from giving the second one herself (separation of duties).
7. **Administrator (Emeka Eze):** give the second approval. The Release button stays off because the Tranche 3 milestone is not approved yet.
8. **Administrator (Zainab Bello):** Milestone Approval, open "Crop maintenance verified", verify the evidence, tick the release conditions, add notes, approve.
9. **Administrator (Emeka Eze):** back on the disbursement, release the payment instruction, then use the "Demo only" button to simulate the partner confirmation. A reconciliation record opens and the cooperative is notified.

Other things to try: suspend a user under **User Management** and see that they can no longer sign in; report an issue as a farmer; file a complaint as an investor.

## What is inside

| Area | Base path | Main pages |
|---|---|---|
| Public site | `/` | Home, How it works, Cooperative funding, Investor information and risks, About, FAQ, Contact, Terms, Privacy, Complaints information |
| Auth and onboarding | `/login` and friends | Login, Register, OTP verification, Forgot and reset password, Farmer activation, Cooperative and Investor onboarding wizards, Verification status |
| Cooperative | `/coop` | Dashboard, Farmer directory (add, edit, bulk upload, remove), Farms and plots, Funding packages and requests (create, budget, allocate farmers), Investments, Disbursements, Farming progress (milestones and evidence), Settlements (harvest, sales, distributions), Reports, Profile, Contracts, Complaints, Audit history, Settings, Help |
| Investor | `/investor` | Dashboard, Farmer directory (privacy preserving), Wallet, Packages, Package detail and invest flow, Investments and detail, Distributions, Transactions, Agreements, Risk disclosures, Reports, Complaints, Profile, Settings, Help |
| Administrator | `/admin` | Overview, User verification, Cooperative verification, Applications and budget review, Farmers and farms, Contract status, Reconciliation, Milestone approval, Disbursements (two person approval), Project monitoring, Risk alerts and cases, Complaints, Distributions, Audit logs, Reports, User management, System settings |
| Farmer | `/farmer` | Dashboard, My allocation, Activities and progress reports, Inputs and payments, Harvest and repayment, My agreement, Report an issue, Profile, Settings, Help |

There are 91 routed pages in total. The full route list lives in `src/routes/manifest.js`.

## Project structure

```
src/
  main.jsx, App.jsx          entry and routing
  routes/                    manifest.js (every route), lazyPage.jsx (lazy loading and error boundary)
  layouts/                   PublicLayout, AuthLayout, OnboardingLayout, DashboardLayout, navConfig
  pages/                     one folder per area: public, auth, cooperative, investor, admin, farmer, shared
  components/
    ui/                      reusable kit: Button, Card, Form, Modal, DataTable, Nav, Dropdown
    charts/                  small SVG charts (bar, donut, line), no chart library
    common/                  Brand (logo), Photo, ChatWidget
    <group>/                 page specific helper components
  context/AppContext.jsx     the client side store, toasts, simulated latency
  data/                      all mock data (people, funding, operations, governance, seed)
  utils/                     formatting, status colours, business rules
  styles/                    tokens.css (design tokens), index.css (global and shared classes), pages/*.css
public/images/               optional photo slots (see below)
docs/                        requirements digest, design spec, build brief
scripts/make-stubs.mjs       developer helper used while scaffolding
```

Dependencies are deliberately few: React, React Router, and the Lucide icon set, plus the Manrope and Playfair Display fonts bundled locally (no font CDN).

## How the demo works

- **State.** A React context store holds all records. It is saved to `localStorage` so a refresh keeps your changes. Use **Account menu, Switch demo account** to change user. To start over, an administrator can use **System Settings, Reset demo data**, or clear the site data in your browser.
- **Simulated server behaviour.** Approvals, reconciliation, partner confirmations, OTP, notifications and audit entries are simulated in the browser. Wherever a real service would normally act (for example the financial partner confirming a payment), the page shows a clearly labelled **"Demo only"** control.
- **Rules from the product requirements are enforced in the UI.** Examples: a budget must reconcile with the funding plan, farmer allocations cannot exceed the budget, a tranche (a stage of funding) is released only when the previous tranche is released and milestone evidence is approved (or a recorded exception exists), large payments need a second, different approver, and a recorded sale is not money received until reconciled.
- **Audit trail.** Every material change writes an audit entry. Financial records are never deleted, only moved to a new status.
- **Plain language.** Financial terms (tranche, reconciliation, commitment, distribution) are explained where they appear.

## Photos

The Figma file uses photographs hosted on Figma. They could not be downloaded in the build environment, so photo areas use a built in illustrated placeholder. To use real photos, drop files into `public/images/` with the names listed in `public/images/README.md`. They load automatically with no code changes.

## Where the reference documents disagree

Where the Figma file, the MVP deck and the PRD conflict, the choice made is listed here so you can overrule it. Nothing was silently invented.

| Topic | Conflict | Decision in this build |
|---|---|---|
| Investor "Wallet" | Figma shows a wallet with "Fund Wallet". The PRD says CollabFarm must not hold or pool investor money and lists a wallet as out of scope. | The page keeps the Figma name and layout, but shows a banner that funds are held by a regulated financial partner, a payment initiation is not proof of receipt, and balances move to Available only after (simulated) partner confirmation. |
| Funding packages vs projects | Figma has fixed packages (Starter, Growth, Commercial, Custom). The PRD describes a project with a budget, allocations and four tranches. | A package is the investable unit of a project. One record carries budget, funding plan, allocations and tranches. |
| "Backend" in the PRD | The PRD describes server side validation, secure APIs and a payment partner. The brief says frontend only. | All of that is simulated client side behind a single store, so a real API can replace it later. |
| Sign in with Google | Present in Figma auth screens. External sign in is not allowed here. | The button is shown and opens an explanation with the demo accounts. |
| "AI Risk Scoring" | Figma landing page lists it. The PRD puts AI credit scoring out of the MVP. | Shown as "Risk Review" (documented human review). |
| Landing page statistics | Figma shows template numbers (500+ farmers, N2.5B+). | Numbers are computed from the sample data and labelled as sample figures. |
| Template leftovers | Some Figma frames carry copy from another product. | Replaced with CollabFarm wording. |
| Farmer and Administrator portals | The PRD requires them, but the Figma file has no screens for them. | Designed in the same visual language using the same components. |
| Colour palette | Figma greens differ slightly from the deck. | Figma tokens are used. |
| Open decisions | The PRD (section 21) leaves the funding model, returns basis, liability and more undecided. | The UI never decides them. Agreement text shows them as set per agreement, and System Settings lists them as open decisions. |

## No backend, confirmed

- No `fetch`, `XMLHttpRequest`, `axios`, WebSocket or EventSource calls exist in the source. You can check with: `grep -rnE "fetch\(|XMLHttpRequest|axios|WebSocket|EventSource|sendBeacon" src`
- No environment variables, no API URLs, no server code, no database, no payment or identity service.
- Fonts and icons are bundled. The only things the browser stores are `localStorage` entries named `collabfarm-demo-state-v1` and `collabfarm-demo-session-v1`.
- File uploads are local only: a chosen file contributes its name to the record, and nothing is read or sent.
- CSV and text downloads are generated in the browser.

## Connecting a real backend later

Pages read data and change it only through the store in `src/context/AppContext.jsx` (`add`, `update`, `patchData`, `notify`, `audit`, `signIn`). Replace those with API calls and the pages stay as they are. The simulated delays use `simulate()` and `useSimulatedLoad()`, which mark where real requests would go.
#   c o l l a b _ f a r m  
 #   c o l l a b _ f a r m  
 