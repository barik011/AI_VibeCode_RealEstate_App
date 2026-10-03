# Supabase setup and migration

Migrations through `202610030002_property_management.sql` were applied to the configured hosted project on 2026-10-03. They add agent/property audit history, protected CRUD and archive commands, atomic bulk assignment, inactive-account restrictions, and property version checks. Both private command implementations deny direct authenticated execution; property audit RLS and the version trigger were verified on the hosted database. Deploy the matching frontend with the property migration: property updates and deletion now require `expectedVersion`. See [CRM_IMPROVEMENTS.md](CRM_IMPROVEMENTS.md) for behavior and acceptance-test results.

The application now has a Supabase backend adapter as well as its offline mock adapter. The connected mode does **not** fall back to local mock records when a database request fails. Database creation and seed import must finish before connected public pages can load.

Hosted project `oflrgmjcdnavzegqwtuq` is initialized with the shared catalog/CRM data and an administrator profile. Application records can change as the team works; the earlier seed counts are not a current inventory. Use the status script and live CRM for current state. Browser-specific legacy edits require the Settings import from the browser that holds them.

## Configuration

The browser reads these variables from `.env.local`:

```dotenv
VITE_DATA_BACKEND=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Only the public publishable key belongs in a Vite variable. `.env.local` and `.env.supabase.local` are ignored by Git. Do not put secret keys in `src/`, `public/`, a `VITE_` variable or committed configuration.

Administrative scripts read `.env.supabase.local`:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PROJECT_REF=YOUR_PROJECT
SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
SUPABASE_ACCESS_TOKEN=YOUR_PERSONAL_ACCESS_TOKEN
SUPABASE_AUTH_REDIRECT=http://localhost:5173/reset-password
```

The server secret authorizes database row imports and Auth administration. It cannot create SQL tables. `SUPABASE_ACCESS_TOKEN` is a Supabase **personal access token**, from [Account → Access Tokens](https://supabase.com/dashboard/account/tokens), used only by the migration script's Management API request. A PostgreSQL connection with its real database password is another way to execute the migrations.

## Apply the schema and seed

```sh
npm run supabase:status
npm run supabase:migrate
npm run supabase:seed
```

The migration runner records successful migrations in `app_private.schema_migrations`. Each migration and its tracking row commit in one transaction. It creates only the application's tables/functions/policies; it does not drop a database or reset existing tables. If a table with a conflicting schema already exists, migration fails for review instead of overwriting it.

The seed imports 20 properties, 40 leads, 6 agents, 28 tasks, 14 viewings and 112 original activities. It also imports locations, categories, articles, testimonials and site configuration into `public_content`. Seed reruns preserve existing records and remote edits. Dates are resolved relative to the import date.

If using the SQL Editor instead of a personal access token:

```sh
npm run supabase:bootstrap
```

Open `supabase/bootstrap.sql` and run it once in the SQL Editor of an empty target project. This generated script includes schema, permissions, workflow functions and seed data, and contains no credentials. Do not rerun the entire bootstrap against existing tables; use tracked migrations thereafter.

## Authentication

Connected mode uses Supabase password sign-in, persistent sessions, token refresh, logout, recovery and password updates. Public demo login buttons are hidden. The mock accounts do not become real accounts automatically.

Configure the password-setup redirect and disable public signup:

```sh
npm run supabase:configure-auth
```

This preserves existing redirect URLs and adds `SUPABASE_AUTH_REDIRECT` (default `http://localhost:5173/reset-password`). Set `SUPABASE_SITE_URL` to explicitly update the hosted Site URL; without it, only the default localhost:3000 value is replaced. The current production settings are `SUPABASE_SITE_URL=https://realstate.mohammadbarique.online` and `SUPABASE_AUTH_REDIRECT=https://realstate.mohammadbarique.online/reset-password`.

To provision an administrator without sending an email:

```sh
npm run supabase:provision-admin -- owner@example.com "Team Administrator"
```

Open `.env.admin-setup.local` and copy `PASSWORD_SETUP_URL` into your browser while the app is running. Set your own password, then sign in. This private file is ignored by Git and blocked by Vite's development server. The link is single-use and expires; rerun the command if a fresh link is needed. The command supports an existing account by generating a recovery link.

Create an administrator profile for a real team email. The following command **sends an invitation email** and then provisions its ADMIN profile; run it only for the intended recipient:

```sh
npm run supabase:invite -- owner@example.com ADMIN "Team Administrator"
```

For an agent, supply the agent record ID:

```sh
npm run supabase:invite -- agent@example.com AGENT "Sarah Ahmed" agent-1
```

The account's role comes from `profiles`, not user-editable Auth metadata. There is no public CRM signup. Existing Auth accounts can be linked by inserting an authorized `profiles` record through the SQL Editor or server administrative client.

Configure Supabase Authentication → URL Configuration with your site URL and `/reset-password` redirect URLs for localhost and your deployed domain. Configure SMTP if reliable production delivery is required. `supabase/config.toml` provides local CLI defaults; it does not automatically change hosted-project settings.

## Data access and workflow

- `profiles`, `agents`, `properties`, `leads`, `lead_activities`, `lead_notes`, `tasks`, `viewings`, `notifications`, `crm_settings`, `public_content`, `newsletter_subscriptions`, `visitor_preferences` store the application data.
- Existing numeric property IDs and textual CRM IDs are preserved so public URLs and relationships survive migration. New CRM IDs use a prefix plus a UUID. New property IDs use a database identity sequence.
- RLS limits anonymous readers to ACTIVE properties and public editorial content. Agents can read their assigned leads and matching work. Administrators can read all CRM records.
- Browser roles have SELECT privileges but no direct CRM INSERT/UPDATE/DELETE privileges. `crm_command` validates identity, role, ownership and business rules before changing records transactionally.
- `submit_inquiry` accepts only customer inquiry fields and always creates a NEW, unassigned lead. It validates fields, checks active property availability and limits repeated inquiries for the same email. For a public launch, add CAPTCHA/IP abuse controls at an Edge Function or gateway; the per-email limit is not comprehensive bot protection.
- Private helper functions have a fixed empty search path and restricted execute privileges. Audit entries are generated by server workflows; browser clients cannot edit them directly.
- Realtime subscriptions refresh role-scoped records after property, lead, task, viewing, activity, note, notification or settings changes. The adapter paginates reads rather than truncating at Supabase's default 1,000-row limit.
- Images remain URL references; no image files are uploaded. A future Storage uploader can replace URL entry without changing property views.

## Browser-local data

The existing local snapshot is preserved as a backup. Admin Settings → **Import local records** previews its record counts. The default imports missing IDs; an explicit checkbox applies local edits to matching records. History and notes are inserted without overwriting matching audit IDs. Import runs as a single authorized database transaction.

Existing favorites are imported into `visitor_preferences` when this browser first connects. A random visitor token stays locally; only its SHA-256 hash and favorite property IDs are stored in the database. Visitor RPCs cannot list other visitors' preferences. Favorites remain associated with that browser token; clearing it starts a new collection. Newsletter form submissions now persist in Supabase.

The importer also converts older standalone inquiry archives into leads, preserves their messages and dates, skips inquiries already linked to CRM leads, and imports the locally saved newsletter subscription. It works even if that browser has no CRM snapshot. Local archives remain available after import.

UI preferences such as language and sidebar collapse, the visitor token, and the Supabase auth session remain in browser storage by design. They are not the CRM database.

## Verification

```sh
npm test
npm run test:translations
npm run test:e2e
npm run build
```

`tests/supabase.test.js` executes the real SQL migrations in an isolated PostgreSQL-compatible PGlite instance, tests the server workflow, anonymous/agent RLS, role-escalation denial, imports, visitor favorite isolation and protected newsletter storage. This is local database validation, not evidence that a hosted project has been migrated.

The Playwright regression suite deliberately starts its own server on port 5174 with `VITE_DATA_BACKEND=mock`; it never reuses a live server or seeds/resets the hosted project. It uses one worker to avoid browser resource contention during the full route checks. Connected mode needs an additional live acceptance test after migrations and team accounts are provisioned: submit a public inquiry, log in as admin, assign an agent, complete the workflow and verify another session sees the changes.

With the connected app running at `http://localhost:5173`, `npm run supabase:smoke` performs an opt-in hosted acceptance test. It checks anonymous access restrictions, submits an inquiry through the browser, signs into temporary admin/agent accounts, assigns the lead, schedules follow-up and viewing, closes the deal and verifies persistence after reload. It removes its temporary records/accounts in a `finally` block and never signs into or resets a real team account. It does not send emails. Set `SUPABASE_APP_URL` or pass a URL argument to test another app origin, for example `npm run supabase:smoke -- https://realstate.mohammadbarique.online`.

For an offline demo, set `VITE_DATA_BACKEND=mock` and restart Vite. Demo bundles must use `npm run build -- --mode demo`; the default production build requires Supabase configuration. Keep live and demo browser sessions separate when evaluating persistence.
