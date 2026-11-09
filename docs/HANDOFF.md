# CollabFarm Cooperative Portal: Handoff Summary

Purpose of this file: let another AI platform (Gemini, ChatGPT, Claude, Grok) or a developer continue the work without the original chat. Everything below is the state at the end of the build session (31 Oct 2026).

## 1. What was asked

The user attached three reference files and said "execute":

| File | Role |
|---|---|
| Master prompt (`d92d631c-attachment.txt`) | The brief and the rules |
| `CollabFarm_MVP_Deck.pptx` | Concept and structure guide |
| `CollabFarm.pdf` (PRD v2.0, 37 pages) | Functional guide |
| Figma `https://www.figma.com/design/e6lnAK81A68HsFQovyG5wW/Collab-Farm-Web-App?node-id=6046-783` (fileKey `e6lnAK81A68HsFQovyG5wW`, node `6046:783`) | Visual guide |

Deliverable: a complete, professional, responsive, interactive **React frontend only** for the CollabFarm Cooperative Portal, with a separate experience per role (cooperative, investor, admin, farmer). No backend, database, API calls, server auth, payment gateways, external services or backend environment variables. Everything runs on mock data and local state. Where references conflict, name the conflict instead of silently inventing a solution.

Final deliverables: full codebase, README with install and run steps, confirmation of no backend or API calls.

## 2. Status: complete

- 91 routed pages across Public (10), Auth and onboarding (9), Cooperative (18), Investor (13), Admin (21), Farmer (8), Shared (12).
- Production build passes (`npm run build`).
- Route crawl of every page at 1440, 820 and 390 px for the correct role: 0 console errors, 0 page errors, 0 external requests, 0 overflow, 0 stubs, 0 not-found, 0 crashes. Final run on the settled code: 0 issues in all 15 area and width combinations. A clean copy (no node_modules) was installed with `npm install` and built with `npm run build` successfully.
- No `fetch`, `XMLHttpRequest`, `axios`, WebSocket, EventSource or `sendBeacon` in `src`. No `import.meta.env`, `process.env` or http(s) URLs in `src` or `index.html`.
- No em dashes or en dashes anywhere in source, docs or README.

## 3. Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
npm run preview  # http://localhost:4173
```

Node 18 or newer. For static hosting, serve `index.html` for unknown paths (single page app fallback).

## 4. Stack and structure

React 18, Vite 5, react-router-dom 6 (BrowserRouter with `v7_startTransition` and `v7_relativeSplatPath` flags), plain JavaScript, plain CSS with design tokens, `lucide-react` icons, fonts bundled locally (`@fontsource/manrope`, `@fontsource/playfair-display`). No chart library: charts are small SVG components. No other dependencies.

```
src/main.jsx, App.jsx            entry and routing
src/routes/manifest.js           every route (single source of truth)
src/routes/lazyPage.jsx          lazy loading via import.meta.glob + error boundary
src/layouts/                     Public, Auth, Onboarding, Dashboard (role guard), navConfig
src/pages/<area>/                public, auth, cooperative, investor, admin, farmer, shared
src/components/ui/               Button, Card, Form, Modal, DataTable, Nav, Dropdown
src/components/charts/           BarChart, DonutChart, LineChart
src/components/<group>/          page helper components (pub, auth, coopa, coopb, coopc, inv, adma, admb, farm, shr)
src/context/AppContext.jsx       the client store (see below)
src/data/                        people, funding, operations, governance, seed
src/utils/                       format, status, rules
src/styles/                      tokens.css, index.css, pages/*.css
docs/                            REQUIREMENTS_DIGEST.md, DESIGN_SPEC.md, BUILD_BRIEF.md (workflow contracts)
public/images/README.md          photo slots
```

### The client store

`useApp()` returns `{ data, user, role, roleMeta, toast, toasts, dismissToast, add, update, audit, notify, patchData, signIn, signOut, resetDemo }`. State is mirrored to `localStorage` under `collabfarm-demo-state-v1` and `collabfarm-demo-session-v1` (all access wrapped in try/catch). `simulate(ms)`, `useSimulatedLoad()` and `newId()` are exported alongside. `notify` is role-scoped. `signIn` returns `false` and shows an error toast for suspended accounts.

To connect a real backend later, replace `add`, `update`, `patchData`, `notify`, `audit` and `signIn` with API calls. Pages stay as they are.

### Business rules (src/utils/rules.js)

`budgetReconciles`, `allocationCheck`, `sixAmounts`, `canReleaseTranche`, `needsSecondApprover`, `canSecondApprove`, `profitShare`, `packageFunding`.

Principles the UI enforces: a commitment is not received money; approval is not a guarantee of success or returns; crop failure is not fraud; expected returns are estimates only; a payment instruction is not proof of payment until the financial partner confirms it; financial records are never deleted, only moved to a new status; every material change writes an audit entry.

Maker-checker: approval limits are 50,000 / 50,000 / 20,000,000 (first, second, daily cap). Payments above 50,000 need a second approver who is a different person.

## 5. Demo accounts

Login accepts a known demo email plus any password of 8 or more characters. OTP is `123456`. The account menu has "Switch demo account".

| Role | User id | Name | Email |
|---|---|---|---|
| Cooperative | `u-coop` | Arnold Smith (Green Fields Cooperative, `coop-1`) | arnold@greenfieldscoop.example |
| Investor | `u-inv` | Arnold Okafor (`inv-1`) | arnold.okafor@impactfund.example |
| Admin, project reviewer | `u-admin` | Zainab Bello | zainab.bello@collabfarm.example |
| Admin, payment approver | `u-admin2` | Emeka Eze | emeka.eze@collabfarm.example |
| Farmer | `u-farmer` | Aisha Bello (`f-003`) | aisha.bello@example.com |

Role base paths: `/coop`, `/investor`, `/admin`, `/farmer`. A signed-in user opening another role's area sees a "Forbidden" view. A suspended user is blocked at login, removed from the switch menu, and sees a "This account is suspended" notice if suspended mid-session.

## 6. Where the references conflicted, and what was chosen

| Topic | Conflict | Decision |
|---|---|---|
| Investor Wallet | Figma shows "Fund Wallet". PRD says CollabFarm must not hold or pool investor money. | Kept the Figma name and layout. Prominent banner: funds are held by a regulated financial partner; a payment initiation is not proof of receipt; balances move to Available only after simulated partner confirmation. |
| Packages vs projects | Figma has fixed packages (Starter, Growth, Commercial, Custom). PRD has a project with budget, allocations and four tranches. | A package is the investable unit of a project. One record carries budget, funding plan, allocations and tranches (T1 to T4). |
| Backend | PRD describes server validation, APIs and a payment partner. Brief says frontend only. | All simulated client side behind one store. |
| Sign in with Google | In Figma. External sign in is not allowed. | Button opens an explanation and the demo accounts. |
| AI Risk Scoring | In Figma. PRD puts AI credit scoring outside the MVP. | Shown as "Risk Review" (documented human review). |
| Landing statistics | Figma has template numbers. | Computed from sample data and labelled as sample figures. |
| Template leftovers | Some Figma frames carry another product's copy. | Replaced with CollabFarm wording. |
| Farmer and Admin portals | Required by the PRD, no Figma screens. | Designed in the same visual language with the same components. |
| Colour palette | Figma greens differ slightly from the deck. | Figma tokens used (primary `#305d41`, gold `#d4af36`). |
| Open decisions | PRD section 21 leaves funding model, returns basis, liability and more undecided. | UI never decides them; agreements say "set per agreement" and System Settings lists them as open. |

## 7. Known limitations

- **Photos.** Figma's image host returned 403 through the build proxy, so photo areas use a built-in gradient placeholder (`<Photo>` component). To add real photos, drop files into `public/images/` using the names in `public/images/README.md`. They load with no code change. The block was not worked around.
- All data is sample data. Names, amounts, ids and bank references are invented.
- No real file handling: an uploaded file contributes only its name to the record.
- Admin ApplicationReview budget table: the action column can clip slightly at about 1280 px wide (cosmetic, not fixed).

## 8. Cross-role flows verified in a real browser (Playwright)

1. Registration, OTP, onboarding wizard and verification status for a new cooperative and a new investor.
2. Cooperative creates and submits a funding package, admin reviews and approves, Agreement B is created, the cooperative signs it, admin opens the package for funding.
3. Investor commits to that package (4 steps: amount, risks and Agreement A signature, review, confirm). Verified: investment record, package raised and committed, Agreement A signed, wallet moves from Available to Locked.
4. Two-person payment (`TX-33810023`, N100,000): the first approver cannot give the second approval; a different approver can; release stays blocked until the Tranche 3 milestone is approved; after milestone approval the instruction is released; simulated partner confirmation marks it Disbursed, opens a reconciliation record, writes audit rows and notifies the cooperative.
5. Suspended user blocked at login, in the switch menu and mid-session.

## 9. Fixes made in the last stretch of the session

- Suspended accounts blocked everywhere (central `signIn` guard plus a login banner and a mid-session notice).
- Disbursement status shows "Awaiting partner" once a payment instruction is sent but not yet confirmed.
- Seed data for `pkg-1` (Yam Harvest Support) realigned: budget lines now use the same category names as expenses and total N1,000,000; expenses mirror the real payments (seeds 300,000, tractor hire 200,000, labour 100,000, plus a pending 95,000 pesticide record); reconciliation records match payment amounts. A scripted audit finds no spend over any budget line, no reconciliation or expense that disagrees with its payment, and no package where payments exceed confirmed investor funds.
- The "confirmed funds cover this payment" check no longer shows a false warning on a payment that is already paid.

## 10. Conventions to keep (user preferences)

- No em dashes in written work. Use periods, commas, colons or restructuring.
- Concise responses. Do not over-distil source content.
- Explain financial terms in plain language (tranche, reconciliation, commitment, distribution).
- Discuss and agree changes before editing a delivered file.
- Do not create Google Drive documents unless explicitly told to.
- When a task completes, produce a markdown summary of the whole context like this one.

## 11. Suggested next steps

1. Review the app with the real photos dropped into `public/images/`.
2. Decide the PRD section 21 open items (funding model, returns basis, liability) so the agreement text can stop saying "set per agreement".
3. When a backend exists: replace the store functions listed in section 4 with API calls; keep `simulate()` call sites as the places to show real loading states.
4. Optional polish: the clipped action column on the Admin ApplicationReview budget table at about 1280 px.
5. Optional: add automated tests (the Playwright journey scripts used here were throwaway and are not in the repo).

## 12. Session reference

Claude Code session: https://claude.ai/code/session_01Wsn2a4ZGuE4Esu3XjnCeVF
Project folder in the build container: `/home/claude/collabfarm-portal`
