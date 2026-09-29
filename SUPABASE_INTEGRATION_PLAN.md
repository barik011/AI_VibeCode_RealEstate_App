# Future Supabase integration

This is a migration plan only. The application currently runs entirely with local mock repositories. No Supabase SDK, connection, environment variables or credentials are required or configured.

## Replaceable boundaries

- `src/services/authService.js`: replace `getSession`, `signIn`, `signOut`, and `requestPasswordReset` with a Supabase auth adapter. The mock account mapping must be removed, not carried into production.
- `src/services/crmService.js`: preserve the asynchronous command interface and replace local snapshot transactions with authorized API/RPC calls. `applyCommand` documents workflow rules and side effects. Move authoritative validation and activity creation to database functions; client validation remains for UX.
- `src/repositories/index.js`: entity query/mutation contracts for leads, properties, agents, tasks and viewings. Introduce an adapter factory here when supporting both demo and backend modes.
- `src/repositories/mockDatabase.js`: browser persistence and subscription boundary. Replace this storage implementation; do not expose a complete database snapshot to public or agent sessions.
- `src/services/inquiryService.js`: route public inquiry creation to a controlled submission endpoint. Retire the legacy browser inquiry archive.
- `src/services/catalog.js`: keep public catalog shape stable; query only published properties. Editorial JSON can remain local initially.
- `src/features/crm/store.js`: Redux hydration/subscription boundary. Replace full demo snapshots with authorized entity queries and server mutation results. UI selectors and page components can retain their view models.

## Tables and columns

Use `timestamptz` for event times, `numeric(16,2)` for AED amounts, and database enum/check constraints for stages, priorities and record statuses. Keep database names snake_case and map them to current camelCase frontend objects in adapters.

| Table           | Suggested columns                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| profiles        | `id uuid PK references auth.users`, `name text`, `role app_role`, `created_at timestamptz`                                                                                                                                                                                                                                                                                                                                                                                              |
| agents          | `id uuid PK`, `profile_id uuid unique FK`, `name`, `email`, `phone`, `avatar_url`, `specialization`, `locations text[]`, `languages text[]`, `status`                                                                                                                                                                                                                                                                                                                                   |
| properties      | `id bigint identity PK`, `slug text unique`, `title`, `purpose`, `category`, `location`, `location_slug`, `price`, `currency`, `bedrooms`, `bathrooms`, `area`, `area_unit`, `description`, `amenities text[]`, `images text[]`, `featured boolean`, `status`, `coordinates jsonb`, `created_at`, `updated_at`                                                                                                                                                                          |
| leads           | `id uuid PK`, `display_id text unique`, `customer_name`, `customer_email`, `customer_phone`, `customer_country`, `property_id bigint nullable FK`, `source`, `purpose`, `budget_min`, `budget_max`, `preferred_location`, `preferred_contact`, `status`, `priority`, `assigned_agent_id uuid nullable FK`, `assigned_at`, `next_follow_up`, `created_at`, `updated_at`, `lost_reason`, `lost_notes`, `final_property_id bigint nullable FK`, `deal_value`, `closing_date`, `deal_notes` |
| lead_activities | `id uuid PK`, `lead_id uuid FK`, `type`, `message`, `author_profile_id uuid nullable FK`, `author_label`, `created_at`                                                                                                                                                                                                                                                                                                                                                                  |
| lead_notes      | `id uuid PK`, `lead_id uuid FK`, `author_profile_id uuid nullable FK`, `author_label`, `content`, `created_at`                                                                                                                                                                                                                                                                                                                                                                          |
| tasks           | `id uuid PK`, `lead_id uuid FK`, `agent_id uuid FK`, `title`, `type`, `due_date timestamptz`, `priority`, `status`, `notes`, `is_follow_up boolean`, `created_at`, `updated_at`                                                                                                                                                                                                                                                                                                         |
| viewings        | `id uuid PK`, `lead_id uuid FK`, `property_id bigint FK`, `agent_id uuid FK`, `date timestamptz`, `meeting_location`, `notes`, `status`, `outcome`, `outcome_notes`, `completed_at`, `created_at`                                                                                                                                                                                                                                                                                       |
| notifications   | `id uuid PK`, `lead_id uuid nullable FK`, `recipient_profile_id uuid FK`, `message`, `created_at`, `read_at timestamptz nullable`, `deduplication_key text unique`                                                                                                                                                                                                                                                                                                                      |
| crm_settings    | `id singleton PK`, `company`, `email`, `phone`, `default_view`, `updated_at`                                                                                                                                                                                                                                                                                                                                                                                                            |

The demo uses stable numeric property IDs, human-readable seed lead IDs and prefixed UUIDs for new records. During migration, build explicit old-to-new ID maps for leads/agents/tasks/viewings/activities/notes and rewrite all foreign keys. Preserve seed display IDs separately. Do not cast prefixed demo IDs to UUIDs. Existing property slugs and numeric property relationships can remain intact.

Keep active lead counts, closed deals, overdue status, chart series and pipeline values derived from records or database views. Avoid duplicating these metrics on agents. `next_follow_up` can become a view or transaction-maintained projection of pending follow-up tasks.

## Authentication and roles

1. Implement `signIn` with `supabase.auth.signInWithPassword()` and map the returned user to a profile and optional agent.
2. Bootstrap with `supabase.auth.getSession()` plus an authorized profile query. The service must support asynchronous session initialization before route guards render.
3. Subscribe to auth changes, handle token refresh/expiry, clear all prior-session CRM state, and fetch the new session’s authorized records.
4. Use `supabase.auth.signOut()` for logout and the supported recovery flow for reset emails. Configure trusted redirect URLs.
5. Provision ADMIN/AGENT profile roles through a trusted administrative process. Users must never be able to elevate their own role. MANAGER is reserved for a later explicitly defined permission model.

The current mock password is public demo content. Remember Me chooses localStorage versus sessionStorage, not a secure credential store. The production adapter must rely on the real auth client/session model.

## Row Level Security strategy

Enable RLS before inserting production records. Frontend route guards and selectors are UX controls, not database security.

- ADMIN: authorized reads and mutations across CRM records, checked using a trusted profile role helper with a fixed search path and carefully scoped permissions.
- AGENT: read leads where `assigned_agent_id` resolves to their agent profile. Notes, activities, tasks and viewings require access to the parent lead; task/viewing ownership must also match. Reassignment is admin-only and transfers outstanding work transactionally.
- Agents may update approved lead fields and their own profile details, but may not change ownership, roles or immutable audit fields. Use restricted RPCs or column privileges rather than a blanket update policy.
- PUBLIC: select only ACTIVE properties and approved public agent fields. No direct CRM reads. Accept inquiries through an Edge Function or restricted RPC that validates payloads, enforces rate limits and writes NEW leads without allowing caller-supplied ownership, status or roles.
- Activities are append-only and generated by trusted workflow operations. Users cannot rewrite history.
- Notifications are recipient-scoped. Use a per-recipient record/read timestamp instead of the demo’s `readBy` array. Admin recipients also get separate notification records.
- Notes and dependent records use restrictive foreign keys. Prefer archive/status changes to destructive deletion.

Test anonymous access, cross-agent access, role escalation, changed ownership, forged audit events and permission revocation directly against the database. Include these tests before deploying the real backend.

## Transactional workflow

Implement assignment, scheduling, viewing completion, closing and reopening as database transactions. Each should atomically mutate the lead, related work, audit history and notifications. Re-check ownership and optimistic version/updated_at in the transaction.

- Assignment moves NEW → ASSIGNED and transfers outstanding work.
- Communication logging records a past interaction; actual messaging is a separate future integration.
- Follow-up creates a task and updates the next follow-up projection.
- Viewings require a customer, property, assigned active agent and future date; enforce agent scheduling conflicts server-side.
- Viewing completion is only valid after the scheduled time. Interest → NEGOTIATION; other outcomes → FOLLOW_UP. LOST always requires an explicit reason.
- WON requires confirmation, final property, positive value and a non-future closing date. Closing a lead cancels outstanding work.
- Reset Demo Data must be absent/disabled for production data.

## Storage

Create `property-images` and `agent-avatars` buckets. Decide whether property assets are publicly readable or served by signed URLs. Limit write operations to authorized admins (and explicitly allowed own-avatar updates), validate content types and size, and use immutable object keys. Save object keys or resolved URL view models through the adapter so existing image components keep working. Never put private customer documents into public buckets.

## Environment and deployment

Future browser environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or the project’s supported public publishable key mapping). Keep `.env.local` untracked. Never expose service-role secrets in a Vite variable; privileged secrets belong only in server-side secret storage. No placeholder credentials or environment requirements have been added in this phase.

Retain SPA rewrites for `/admin/*`, `/agent/*` and public detail routes. Configure auth redirect URLs for localhost, preview and production explicitly.

## Migration sequence

1. Create schema migrations, role enums, constraints, indexes and RLS policies in a separate backend branch.
2. Create test users/profiles/agents and verify policy tests before loading customer data.
3. Implement and test Supabase auth and session hydration.
4. Implement read repositories with stable UI view models and pagination.
5. Implement transactional commands and inquiry submission; retire local persistence in backend mode.
6. Import selected demo/catalog records using explicit ID maps. Do not silently upload visitor browser data.
7. Add Storage and migrate approved images.
8. Run the existing public regression suite and CRM lifecycle tests against an isolated backend test project.
9. Add realtime invalidation, test reconnects and revocation, then deploy behind a backend-mode switch.

## Realtime opportunities

Subscribe only to authorized lead, assignment, task, viewing and notification changes. Invalidate/refetch affected query results or dispatch normalized updates through the existing store subscription boundary. Handle duplicates, out-of-order updates and reconnect reconciliation; unsubscribe and clear data at logout. Public pages can subscribe to published catalog changes separately. No realtime client is implemented in the current phase.
