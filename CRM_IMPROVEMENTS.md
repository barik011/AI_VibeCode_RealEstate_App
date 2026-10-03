# CRM improvements and release notes

## Implemented

| Area | Changes |
| --- | --- |
| Agent management | Accessible add, edit and delete icon buttons on the directory; edit/delete on the agent detail page; contact, language and location search; active/inactive filters; workload sorting; summary cards and team activity history. |
| Safe deletion | Administrators can delete unused agents after typing their name. Linked leads, tasks, viewings, notifications and login accounts block permanent deletion. Historical records are preserved. Open work must be reassigned before deactivation. |
| Permissions | Agent creation/deletion and bulk assignment are checked on the server. Agents can update only their own profile, cannot change their status, and lose CRM reads and writes when inactive. The previous workflow implementation is private and cannot be called to bypass the new checks. |
| Validation | Required and bounded profile fields, phone/email validation, case-insensitive unique agent email, nonempty language/location lists, no duplicate form submission, and no closing a form while its command is pending. Existing email addresses remain read-only; login account changes use account administration. |
| Lead operations | Page selection and bulk assignment of up to 100 open leads. Outstanding tasks and viewings transfer with the leads. A failed batch rolls back in full. Lead activity records and assignment notifications are retained. |
| Follow-ups | Overdue, due-today, upcoming and unscheduled filters; visible follow-up badges; missing/overdue counts in reports. Time-sensitive indicators refresh each minute and when the window regains focus. |
| Reporting | Created-date and agent filters, metrics scoped to matching leads and their work, and CSV exports from the filtered lead list and reports. CSV cells are quoted and formula-like user input is neutralized. |
| Property management | Accessible add/edit/delete icons, title confirmation for permanent deletion, archive instead of deleting linked leads/deals/viewings, retained administrator audit history, reference search, bounded inputs and server permissions. |
| Concurrent property edits | Version-checked updates, deletion, archiving and featured toggles reject stale records. Database triggers increment the version for every update, including administrative imports. Featured toggles update only their intended field. |
| Connection recovery | Visible saved-but-refresh-failed warning, retry/manual refresh, reconnect status and periodic/focus/online refresh. A committed mutation is not presented as a failed save. Audit snapshots load only the latest 100 entries. |
| Production configuration | Production builds require Supabase backend, URL and public key. A demonstration build requires an explicit `--mode demo`. |
| Styling | New controls reuse the shared font/color tokens, focus styles, mobile layouts and dialog components. |

## Database rollout

The connected CRM requires `supabase/migrations/202610030001_agent_management.sql` before this frontend is released. It adds an administrator-readable `agent_events` table, a case-insensitive email index, the secured command wrapper and active-agent access checks. It does not delete existing records, create auth users or send invitations.

Run `npm run supabase:migrate` with the configured migration credentials. The runner records the migration transactionally and skips versions already applied. Duplicate agent emails differing only by case or surrounding spaces must be resolved before the unique index can be added; the migration fails without partially applying changes in that case.

For a fresh database, regenerate the bootstrap with `npm run supabase:bootstrap`; do not replay the bootstrap against an existing database. Agent login provisioning continues to use the existing administrator invitation workflow in `SUPABASE_SETUP.md`.

Property management additionally requires `supabase/migrations/202610030002_property_management.sql`. It adds property versions, indexed relationship checks, administrator-only property history and transactional property commands. Existing rows start at version 1. Deploy the matching frontend with this migration: earlier clients without `expectedVersion` will be asked to refresh instead of being allowed to overwrite records. The new public command remains the only authenticated command entry point.

## Validation

Verified on 2026-10-03: production build passed; all 27 unit/database tests and all 7 selected browser tests passed. Migration `202610030001_agent_management.sql` was applied to the configured Supabase project. Hosted metadata checks confirmed the public command permission, denied direct execution of the private implementation, and enabled row-level security on team history. The connected browser acceptance check also passed against the local frontend on port 5175 and the hosted database: agent add/edit/delete with audit history, bulk assignment, filtered CSV exports, real password login, agent isolation, follow-up/viewing/won-deal persistence, and inactive-account browser/API restrictions. All temporary accounts and records were removed afterward. Website publishing was not performed.

- `npm test`: mock commands, SQL migrations/RPCs, row-level permissions, deletion constraints, batch rollback, report filtering and CSV escaping.
- `npm run test:e2e -- tests/e2e/crm-improvements.spec.js tests/e2e/crm-management.spec.js --workers=1`: new workflows and existing management regressions in the isolated demo backend.
- `npm run build`: production bundle and CSS token checks.
- `npm run supabase:smoke -- http://localhost:5175`: opt-in connected acceptance test against a running Supabase-backed frontend. It creates only uniquely identified test accounts/records, sends no invitations, and cleans them up in `finally`. It uses the current published listing title rather than assuming the original seed title is unchanged.

## Remaining production work

This release improves the existing CRM; it does not certify every operational requirement for a production deployment. These are separate follow-on projects:

- Replace full-workspace snapshot loading with server-side pagination and aggregate reports before scaling to large lead volumes.
- Add a background job queue, delivery preferences, retries and provider configuration for email/SMS/WhatsApp reminders. Current reminders are in-app, and communication logging does not send messages.
- Extend the implemented property version checks to other editable records, including profiles and workspace settings. Property conflicts currently retain the unsaved form and ask the user to close, refresh and review the current record before retrying; they do not automatically merge edits.
- Establish monitored backups, restoration drills, error monitoring, retention rules and deployment rollback procedures for the hosted environment.
- Add an administrator account-management screen for invitations and account recovery; creating an agent directory record alone does not provision a login.

The unit/database tests use local PGlite and the Playwright regression suite uses the demo backend. The separate connected smoke check uses the hosted Supabase database and the local frontend; it does not verify a newly published website bundle.
