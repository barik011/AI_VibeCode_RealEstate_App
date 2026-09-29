# Dubai Property Portal + CRM

A functional Dubai property portal and real-estate sales CRM, extending the existing Dubai bayt luxury website. The public portal retains its design, routes, property catalog, English/Arabic support, animations, search and favorites. Separate agent and admin workspaces demonstrate the complete inquiry-to-outcome workflow. All records are local demo content; there is no backend connection.

## Run locally

Requires Node.js 22.12+ (or another version supported by Vite 8).

```sh
npm install
npm run dev
```

Open http://localhost:5173. Production commands:

```sh
npm run build
npm run preview
```

## Pages and routes

| Route                           | Page                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/`                             | Homepage with five-slide hero, property search, editorial sections, categories, location selector and testimonials |
| `/properties`                   | Property collection, combined filters, sorting, pagination and grid/list views                                     |
| `/property/:slug`               | Gallery, property details, amenities, advisor, inquiry and similar homes                                           |
| `/category/:slug`               | Validated redirect to the corresponding property filter                                                            |
| `/locations`, `/location/:slug` | Eight neighbourhoods and their matching homes                                                                      |
| `/about`, `/invest`             | Agency story, investment overview, process and FAQs                                                                |
| `/blog`, `/blog/:slug`          | Filterable journal and four full articles                                                                          |
| `/contact`                      | Validated inquiry form; supports `?type=expert` and `?location=slug`                                               |
| `/favorites`                    | Persistent saved collection                                                                                        |
| `/search?q=...`                 | Search results with the full filter controls                                                                       |
| `/privacy`, `/terms`            | Demo privacy and terms information                                                                                 |
| `/*`                            | Branded 404; invalid content slugs also show this page                                                             |

Property query parameters: `purpose`, `location`, `type`, `min`, `max`, `beds`, `baths`, `q`, `sort`, `page`. Prices for rental listings are annual. Filter changes reset pagination. Bedrooms and bathrooms are minimum values.

## English and Arabic

Use the **العربية / English** button in the header on desktop or mobile. English is the default; the choice is saved as `dubai-bayt:language`. Changing language preserves the current route, query filters, favorites and entered form data. Arabic updates the document's `lang` and `dir`, typography, page metadata, labels, validation feedback and catalog content.

- `src/i18n/LanguageProvider.jsx`: language context, switch and localized form validation.
- `src/i18n/ar.json`: Arabic interface messages, keyed by the English source text. Use `t('Message')` or `t('Message {0}', { 0: value })` at display boundaries.
- `src/i18n/ar-content.json`: Arabic property, location, category, testimonial and article content.
- `src/i18n/translate.js`: interpolation, price localization and Arabic search normalization.
- `src/i18n/rtl.css`: Arabic fonts and directional visual adjustments. The main stylesheet uses logical spacing and positioning so layouts mirror naturally.

URLs, property IDs and select values stay language-independent. Search accepts English or Arabic, including Arabic with diacritics. Email addresses and phone inputs remain left-to-right. Arabic fonts load from Google Fonts with local fallbacks.

When editing English copy or adding catalog entries, add the corresponding Arabic entries. Run `npm run test:translations` for literal UI coverage, `npm test` for catalog translation coverage, and `npm run test:e2e -- tests/e2e/languages.spec.js --workers=1` for language persistence, Arabic interactions, page coverage and RTL layouts.

## Application structure

- `src/data/`: 20 properties, eight locations, five categories, three testimonials, four articles and centralized site/image configuration in JSON.
- `src/services/catalog.js`: asynchronous collection adapter, property service, filtering and calculated similar-property ranking.
- `src/hooks/useCatalog.jsx`: shared loading/error handling and collection context.
- `src/store/store.js`: Redux Toolkit for favorites and CRM/auth/UI slices; filters and form inputs stay local or in URL parameters.
- `src/utils/storage.js`: guarded localStorage access with the `dubai-bayt:` prefix.
- `src/components/`: layout, UI primitives, property cards/gallery helpers, search, forms and reusable sections.
- `src/pages/`: lazy-loaded page modules. `App.jsx` contains routing and the error boundary.
- `src/styles.css`: design tokens, Tailwind integration, component styling, breakpoints and reduced-motion rules.

Reusable pieces include Header/Layout, Footer, Logo, Photo with fallback, Button, SectionHeader, PropertyCard/Grid/Facts, FavoriteButton, PropertySearch, Modal, SearchOverlay, ContactForm, NewsletterForm, PageHero, Breadcrumb, EmptyState, Loader, SEO and toast feedback.

Motion handles section reveals, hero text and testimonial fades. The hero uses a 6.5-second interval with CSS crossfades/scale, manual indicators and a pause control. Reduced-motion preferences suppress autoplay and movement. Native dialogs provide focus containment, Escape handling and focus restoration. Mobile navigation locks background scrolling.

## Demo storage

Favorites, newsletter preferences, inquiries and CRM records stay in the current browser. The application never sends form submissions to a server. Admin Settings provides a confirmed CRM demo reset. Forms report when storage is unavailable. Social URLs are configurable platform placeholders; contact details are deliberately non-operational.

Photography is served from Unsplash and typography from Google Fonts; those resources require network access. A local SVG fallback handles failed images. Fonts fall back to Georgia and sans-serif.

Location photography includes [Dubai Marina by Jhonwayne Pumaras](https://unsplash.com/photos/an-aerial-view-of-a-city-and-a-body-of-water-qByXClNnygI) and [Palm Jumeirah by Big Dodzy](https://unsplash.com/photos/aerial-view-of-a-coastal-city-with-many-buildings-psfPhKbF-mw). All image URLs are centralized in the data files.

## CRM architecture and routes

The existing React, Vite, JavaScript/JSX, Tailwind CSS, React Router, Redux Toolkit, Motion and Lucide stack is preserved. No extra runtime dependency was needed. Charts use accessible data-driven CSS bars.

| Area           | Routes                                                                                                                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication | `/login`, `/forgot-password`                                                                                                                                                                                   |
| Admin          | `/admin` (redirect), `/admin/dashboard`, `/admin/leads`, `/admin/leads/:id`, `/admin/properties`, `/admin/agents`, `/admin/agents/:id`, `/admin/viewings`, `/admin/tasks`, `/admin/reports`, `/admin/settings` |
| Agent          | `/agent` (redirect), `/agent/dashboard`, `/agent/leads`, `/agent/leads/:id`, `/agent/tasks`, `/agent/viewings`, `/agent/calendar`, `/agent/profile`                                                            |

PublicLayout (the original Layout component), AuthLayout, AgentLayout and AdminLayout have separate visual structures. CRM pages are English; the public site's persisted English/Arabic preference is preserved. The CRM explicitly uses left-to-right English layout.

### Demo accounts

| Role                | Email                 | Password |
| ------------------- | --------------------- | -------- |
| Admin               | admin@dubaihouse.demo | Demo123! |
| Agent (Sarah Ahmed) | agent@dubaihouse.demo | Demo123! |

One-click demo login buttons are on `/login`, also reachable from the public footer. Normal login supports Remember Me (localStorage); otherwise the session uses sessionStorage. Forgot Password explains the demo credentials and sends no email.

Frontend authentication, selectors and route guards are demonstration UX controls, **not production security**. All demo records exist in the browser. Real authorization requires Supabase Auth and RLS in the next phase.

### Working CRM modules

- Live admin/agent dashboards, status pipeline, source analytics, agent performance and reports.
- Lead table with search, status/agent/source/priority/date filters, sort and pagination; Kanban with keyboard-accessible stage actions.
- Lead details with property/customer context, priority, notes, assignment, communication logs and central activity timeline.
- Follow-ups and tasks: today/upcoming/overdue/completed/cancelled views; start, complete, reschedule and cancel actions.
- Viewings: schedule, reschedule, cancel and record outcomes after the scheduled time. Interested outcomes progress to negotiation; others return to follow-up.
- Won confirmation with final property/value/date; lost outcome with required reason; explicit reopening of closed leads.
- Agent management/profile views, workload and performance. Agents see only their own assigned leads and work in the UI.
- Property add/edit/status/feature controls, image URL preview and live public catalog updates. Only ACTIVE properties appear publicly.
- Calendar with task, follow-up and viewing links, month navigation and today control.
- Scoped global search, notifications with persistent read state, due/overdue alerts, responsive drawer, desktop sidebar collapse, breadcrumbs, toasts and native accessible dialogs.
- Company profile, default table/Kanban preference and confirmed demo reset.

### Recruiter workflow

1. Open a public property and submit its inquiry form.
2. Sign in as Admin. The inquiry appears as NEW on the dashboard, table and pipeline.
3. Open the lead and assign Sarah Ahmed.
4. Sign in as Agent. Find the assigned lead, log a conversation, add a note and schedule a follow-up/task.
5. Schedule a viewing, with a property, future date/time and meeting location.
6. After the viewing time, complete it with an outcome and notes. Interested customers move to NEGOTIATION. For an immediate demo, seeded past scheduled viewings can be completed; the browser workflow test advances the test clock for a newly scheduled viewing.
7. Mark Won with confirmed final deal details, or Mark Lost with a reason. Open work is cancelled automatically.
8. Refresh, then inspect dashboards and reports. Saved changes survive refresh.

Communication actions only log past conversations; they do not send messages. Times are entered and displayed in the browser timezone, stored as ISO timestamps. Pipeline value sums open leads' maximum budgets; it is an estimate, not booked revenue.

### Data, repositories and Redux

`src/data/` adds 40 leads, 6 agents, 28 tasks, 14 viewings and 112 initial activities. Existing 20 property records remain unchanged. `scripts/seed-crm.mjs` reproducibly generates the CRM JSON. Relative seed date offsets are resolved when the demo initializes or resets so the data stays useful.

`src/repositories/mockDatabase.js` centralizes snapshot reads, atomic localStorage persistence and subscriptions. It writes before publishing; storage errors keep the previous state and show a retryable error. Browser storage events refresh other open tabs.

`src/services/crmService.js` owns workflow validation, scoped mutations, activities and related-record updates. All public/CRM mutations use asynchronous service or repository boundaries. `src/repositories/index.js` exposes lead/property/agent/task/viewing repositories. `authService.js` encapsulates mock sessions; `inquiryService.js` bridges the original form to CRM creation.

Redux adds `auth`, `crm` and `crmUi` slices, preserving `favorites`. The CRM snapshot holds normalized entity collections together so a transaction updates all related views atomically. Memoized workspace selectors centralize role scoping; metrics remain derived. Form fields stay local. Public catalog subscriptions consume active properties without rewriting the original pages.

New feature structure:

```text
src/features/auth/          login, layouts, ProtectedRoute and RoleGuard
src/features/crm/components/ reusable UI, CRMLayout and workflow dialogs
src/features/crm/pages/      Dashboard, Leads, Work, Properties, Agents, Settings
src/features/crm/store.js    auth/CRM/UI slices and scoped selectors
src/features/crm/constants.js statuses, labels and permission helpers
src/repositories/           mock database, seed hydration, entity interfaces
src/services/               auth, CRM workflow, inquiry and catalog adapters
```

### Resetting the demo

Admin ? Settings ? Reset Demo Data ? check the confirmation ? Reset Demo Data. This replaces the CRM snapshot, including property edits and inquiry leads, with the original seed. Public favorites, language, newsletter preferences and the legacy inquiry archive remain intact. Records are stored under `dubai-bayt:crm-v1`; the original inquiry archive remains under `dubai-bayt:inquiries` for compatibility. Demo data is local to each browser, not shared between devices.

### Future Supabase integration

See [SUPABASE_INTEGRATION_PLAN.md](SUPABASE_INTEGRATION_PLAN.md) for tables/columns, relationships, ID migration, Auth, RLS, Storage, repository replacement, environment variables, migration sequencing and Realtime. No credentials are requested or required. UI components contain no Supabase-specific code.

## Verification

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

Browser tests cover public routes, combined filters, sorting, pagination, galleries, favorites persistence, forms, search, carousels, English/Arabic layouts and responsive overflow. CRM tests cover the inquiry-to-won lifecycle, lost outcomes, role guards, assignment isolation, property edits, reset, route coverage, notifications, mobile drawer and refresh persistence. Domain tests exercise business rules, reassignment and invalid operations. Desktop and mobile screenshots are saved to `artifacts/`. The Playwright config starts the development server if needed. Only Chromium is configured; Safari and Firefox need separate cross-browser checks before a real production launch.

## Deploy

Run `npm run build` and publish the contents of `dist/`.

- **Netlify / Cloudflare Pages:** build `npm run build`, output directory `dist`. The included `public/_redirects` becomes `dist/_redirects` and rewrites client routes to `index.html`.
- **Vercel:** Vite preset, output `dist`; `vercel.json` includes SPA rewrites.
- **Hostinger / Apache:** upload `dist/` contents to the domain's web root, including the hidden `.htaccess` file. `mod_rewrite` and `AllowOverride` must be enabled.
- **Other static hosts:** serve existing assets normally; rewrite non-file requests to `/index.html` with status 200. Verify a direct request/refresh to `/property/palm-jumeirah-villa`.

The configuration assumes deployment at the domain root. For a subdirectory, update Vite `base`, BrowserRouter `basename`, asset paths and the host rewrite base together.

Before using this as a real agency website, replace demo content, contact/social details and policies with verified business information.
