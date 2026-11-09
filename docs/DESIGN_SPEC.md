# CollabFarm design spec (from the Figma file)

Figma file key: `e6lnAK81A68HsFQovyG5wW` ("Collab-Farm-Web-App"). Desktop frames are 1512 wide.

## How to look at Figma screens
Call `mcp__Figma__create_session` is already done for this task. Reuse the session id given in your brief. For a screen, call `mcp__Figma__get_screenshot` with `enableBase64Response: true` and a `maxDimension` around 1300 (use 1800 or more for very tall frames). Do NOT try to download Figma asset URLs with curl: the egress proxy blocks `www.figma.com` (403 policy denial). Do not route around it. Photos are therefore replaced by the `<Photo>` placeholder component (see `src/components/common/Photo.jsx`), which first tries `/images/<name>.jpg` from `public/images` and falls back to a generated illustration.

## Tokens (already in `src/styles/tokens.css`)
Fonts: Manrope (UI, 400/500/600/700) and Playfair Display (serif display headings on landing and auth, logo wordmark).
Primary green 500 `#305d41`, 50 `#e7f3ec`, 100 `#d0e7d9`, 300 `#6eb489`, 400 `#498d63`, 700 `#1e3928`, 900 `#0a140e`.
Gold: `#d4af36` (secondary), `#f8cd42` (300), `#feefd4` (100).
Greens for status: 500 `#17b26a`, 600 `#079455`, 100 `#dcfae6`. Yellow 500 `#f79009`, 600 `#dc6803`, 100 `#fef0c7`. Red 600 `#d92d20`, 100 `#fee4e2`. Blue 500 `#2970ff`.
Greys: 100 `#f7f7f7` (page bg), 200 `#ededed`, 400 `#d7d7d7`, 500 `#c0c0c0`, 600 `#a2a2a2`, 700 `#717171`, 800 `#494949`, 900 `#313131`, 1000 `#181818`.
Radius 8, 12, 16, 24, full. Type: body 16/25.6, small 14/22.4, caption 12/19.2, subheading 24 bold, button 14 semibold and 18 semibold.

## App shell (cooperative and investor)
- Topbar 90px high, white, bottom border grey 200. Left 230px block holds the logo (round gold-green badge + serif "CollabFarm" + spaced "FINANCE"). Then page context title (18px, e.g. "Green Fields Cooperative", "Investor Portal", "Cooperative Portal", "Investor Dashboard"). Dashboard and directory pages also show a 528px rounded search input ("Search Farmers") centred. Right side: bell button (grey circle 46px with green dot when unread) and an Account pill (green circle avatar + "Account" + chevron).
- Sidebar 230px, white, right border. Items 54px high, 12px radius, icon + label 16px. Active item background green 100 `#d0e7d9` with filled icon. Settings and Help and Support are pinned to the bottom group.
- Cooperative nav: Dashboard, Farmer Directory, Funding, Investments, Disbursements, Farming Progress, Settlements, Reports, Profile | Settings, Help and Support.
- Investor nav: Dashboard, Farmer Directory, Wallet, Packages, Investments, Profile | Settings, Help and Support.
- Page background `#f7f7f7`. Content padding about 24px. Cards are white with 1px border (grey 200 or green 100), radius 16 to 24.
- Floating chatbot avatar (round, robot) sits bottom right on dashboards.

## Patterns seen in Figma
- Page header: H1 24px bold + grey subtitle 16px, actions on the right (outlined "Export Report"/"Export" with printer icon, filled green "+ Add Farmer", "Create Custom Package").
- Greeting: "Good Morning, <span green>Arnold</span>".
- KPI cards (4 in a row): small circular tinted icon, label, big value (28 to 32px, semibold), delta line ("+12 in the last 30 days" with green up arrow or red down arrow), optional green pill "+12". Some KPI groups render as one bordered container with vertical dividers (Farmers page, Disbursements page, Custom packages).
- Investor dashboard KPIs: Available Balance (dark green icon tile, "Fund Wallet" button), Locked Funds, Disbursed Funds, Overdue Returns (red alert dot), each with "View Details ->" link.
- Cooperative dashboard KPIs: Total Farmers, Verified Farmers, Total Farm Area (ha), Total Funding Received.
- Charts: "Accumulative ROI" vertical bars (gold and dark green bars on light track, y axis 0 to 100%, months Dec to May, "In 6 months" select). "Farmers by Crop Type" and "Portfolio Allocation by Crop" donuts with centre total and legend (Maize, Yam, Rice, Groundnut, Others) in light green, mid green, near black, dark green and sage tones.
- Tables: header row uppercase 12px grey with letter spacing, rows about 68px, avatar + bold name, status pill (outlined, tinted), "View" outlined button, kebab menu. Sticky card with search left, three filter selects right ("All Crop Types", "All Status", "Date Added"). Pagination: circular numbered buttons (active filled green), prev and next arrows, "Showing 1 - 10 of 120 ...".
- Status pills: Verified or Active or Disbursed = green; Pending = amber; Reviewing = amber; Removed or Rejected or Overdue = red; Repaid or Completed = blue; Open = green outline.
- Forms: cards with a numbered or icon circle header ("Personal Information"), 2 column grid, labels 14px with red asterisk for required and grey "(Optional)", inputs 52px high, radius 12, fill grey 100, border grey 200. Dashed upload dropzone with "Choose File". Tabs rendered as two wide underlined segments ("Package Basics", "Funding Details"). "Add another item" outlined button, red trash icons for row removal.
- Breadcrumb: "Farmer Directory > Add Farmer" grey then dark.
- Modals: centred 380 to 480px, radius 24, blurred and dimmed backdrop. Remove Farmer modal: red tinted circle with trash icon, title, body with bold name, amber warning banner, Cancel (outlined) and red "Remove Farmer". Disbursement Details modal: title, close X in grey circle, farmer card with status pill, bordered info table (Amount Disbursed, Date Disbursed, Recorded by, Transaction Reference).
- Auth: split layout. Left rounded 24px image panel (838x897) with caption and white logo bar; right column 570px: serif H1 ("Welcome Back" or "Create an account"), subtitle, fields, full-width green button, "or" divider, grey "Sign in with Google" button, link to switch. Login has Email, Password (eye toggle), "Forgot Password?". Sign up has First Name, Last Name, Email, Phone.
- Landing: sticky navbar (logo, How it Works, Solutions, About Us, Contact, outlined Login, filled Get Started), hero with dark overlay photo, "VERIFIED FARMERS" chip, serif H1 "Connecting Farmers, Cooperatives and Investors Through Verified Agricultural Data", subtitle, two CTAs (Investor Portal, Get Started), mini feature row. Dark green stats band (500+ Verified Farmers, 500+ Cooperatives Registered, 500+ Associations Onboarded, N2.5B+ Investment Facilitated). "Explore Our Platform" bento grid (Farmers, Cooperatives, Investors, Associations). "Secure Identity Verification" photo with four overlay cards (GPS Mapping, Field Visits, Document Authentication, AI Risk Scoring). "Ecosystem Integration" with an embedded investor dashboard preview. "Why Choose CollabFarm Finance?" three coloured cards (green, gold, green) + wide photo. Final CTA over photo, then 4 column footer.

## Funding package screens
- Cooperative Funding: pill category tabs (Crop Farming, Fishery, Mixed Farming, Livestock, Poultry, Custom) with icons; selected tab filled green. Crop Farming view shows a tinted panel with three package cards: Starter N1,000,000 (blue dot), Growth N3,000,000 (green dot), Commercial N5,000,000+ (purple dot), each with a check list and a "View Package ->" button (Starter filled, others outlined). Custom tab shows a KPI strip then a package table (Package, Package Type, Investors, Farmers, Amount, Date Invested, Status, Actions).
- Package detail: breadcrumb, title, subtitle, "Invest >" button, wide banner image, price, description, bordered 6-up stat strip (Funding Amount, Farming Type, Farming Cycle, Package Status, Farmers, Investors), "What's Included" check list.
- Create Custom Package: two tabs (Package Basics, Funding Details). Funding Details: Total Package Amount with N currency select, Expected Duration, Expected ROI, Cooperative Share, Start Date, End Date, "What's Included?" repeater (ITEM/INPUT, AMOUNT) with red trash and "Add another item". Header buttons Cancel, Save as Draft, Continue. A "Review and submit" frame follows.
- Investor Packages: filter pills (All + categories), 3-up card grid. Card: category chip (colour per category) + status chip (Open or Completed), title, description, amount, "70% Funded" label, progress bar (green, amber under 50%), "raised of" line, farmers using, regions, closing date, "View Package >" button.
- Investor Investments page: 4 KPI cards (Total Invested, Active Investments, Packages Funded, Pending Settlement), table with search, All Status, All Packages, Sort by Newest; columns Package, Package Type, Amount Invested, Funding Progress, Expected Settlement, Date Invested, Status, Actions.

## Figma node ids for screenshots (file `e6lnAK81A68HsFQovyG5wW`)
Landing page 6017:424 (sections: Hero 6021:3629, Stats 6017:426, Explore 6017:441, Verification 6017:533, Ecosystem 6017:550, Why Choose Us 6017:555, Footer 6017:578, Navbar 6017:631).
Auth: Login 6046:1010, Create account 6046:1040, other variants 6092:4202, 6092:4762, 6092:5077, 6092:4337, 6108:8113, investor-side 6244:13837, 6244:13867, 6565:8803, 6565:8828, 6565:8885.
Cooperative: Dashboard 6046:1078, Farmers Directory 6050:2492, Add Farmer 6060:4346 (also 6092:6824, 7305:15407, 7350:16180), Add Farmer NIN error 6092:5684, Edit Farmer 6164:2492, Remove farmer modal 6164:3376 and 6192:12029, Funding Packages 7046:17354, 7123:18195, 7131:19180 (Create custom, funding details), 7099:13080, 7123:17566, 7893:17617, Review and submit 7145:20920, Investments 7305:14351, Disbursements 7377:17899, 7895:21769, detail modals 7377:30083 and 7895:22006, Profile 7377:31358, Settings 7397:31628 and 7397:33155.
Investor: Dashboard 6244:14828 (states 6482:10251, 7293:12356, 7895:19411, 7903:23458), Investment Packages 7546:18197 and 7560:20435, Investments 6933:11585 and 7633:19572, Profile 6945:15117, Funding Packages 7841:14830 and 7841:15513, dropdowns 6570:12400 (Status), 6570:12445 (Tranches), 6570:12423 (Sort by), date picker 6565:10117.
Style guide page 78:12848, text styles 119:560.

## Screens NOT in Figma (design them in the same language)
Farmer portal, Administrator portal, public information pages (About, How it works, Cooperative funding, Investor info and risk disclosures, FAQ, Contact, Terms, Privacy, Complaints info), onboarding and verification wizards, contracts, milestones and evidence, harvest and sales, distributions, reconciliation, audit logs, complaints, reports, notifications. Reuse the shell, cards, tables, pills and forms above. Never invent a new visual system.
