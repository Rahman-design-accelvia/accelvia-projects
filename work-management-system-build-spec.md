# Work Management System — Product & Engineering Build Specification

**Document version:** 1.0  
**Date:** 2026-10-30  
**Status:** Source of truth for MVP planning and implementation  
**Product type:** Internal work management and client-delivery platform  
**Frontend:** React + TypeScript + Parcel  
**Backend platform:** Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions)  

> **Implementation instruction:** Treat this document as the authoritative MVP specification. Implement in phases, keep database migrations and automated tests in version control, and do not bypass a security rule to make a UI feature easier. If a requirement is unclear, prefer confidentiality, auditability, and preservation of previously approved business records. Record deliberate deviations in an ADR (Architecture Decision Record) before implementing them.

---

## 1. Product summary

Build an internal work management application that connects clients, projects, conversations, estimates, estimate revisions, approvals, additional scope, work orders, hours, project budgets, and delivery history.

The MVP's central workflow is:

1. A Super Admin invites internal users and assigns their roles.
2. An Admin creates a client and a project for that client.
3. Team members record and participate in the project's conversation.
4. An Admin creates an estimate from the conversation, adds scope items and hours, and sends it for client review.
5. Client feedback, rejection, approval, or revision requests appear in the conversation and estimate history.
6. A revised estimate creates a new version; previous versions are preserved.
7. Once a specific version is approved, an authorized Admin or Super Admin can generate a detailed work order or a summary work order from that exact approved version.
8. Additional work is represented by a separate scope/estimate package, separately approved and separately timestamped.
9. The application displays project hours, event history, and delivery state consistently. Only authorized roles can see monetary rates or totals.
10. The Super Admin can audit corrections, edits, deletions, approvals, budget changes, and other significant activity.

This is a work management platform with lightweight client/project records and an estimate approval workflow. It is **not** intended to be a full sales CRM, accounting platform, or ClickUp clone in the MVP.

## 2. Product principles

1. **One source of truth:** project, message, estimate version, approval, and work order records are linked and not recreated independently in the UI.
2. **Security is enforced server-side:** hiding a button or field is never considered authorization.
3. **Approved data is immutable:** revisions create new versions; previously approved estimates and generated work orders remain historically accurate.
4. **Audit history is append-only:** edits and deletions create audit events. The regular application UI cannot rewrite or erase those audit events.
5. **One authoritative timestamp:** store an event timestamp once, in UTC, and render the same instant in the relevant client timezone and Bangladesh time.
6. **Separate hours from money:** Members can see authorized scope/hours but cannot see monetary budgets, hourly monetary rates, or USD/BDT totals.
7. **No public signup:** internal accounts are created or invited only by a Super Admin.
8. **Build the MVP workflow first:** prioritize clients, projects, conversations, estimate versions, approvals, additional scope, work orders, access control, and audit history over advanced task-board features.

## 3. Scope and non-goals

### 3.1 MVP scope

- Internal authentication and profiles.
- Three roles: `super_admin`, `admin`, `member`.
- Super Admin-only invitation, user creation, role assignment, deactivation, and role management.
- Client/company directory and client contact details.
- Projects under clients, project timezone, project access assignments, and a primary conversation per project.
- Chronological conversation messages with rich text, links, images, and video attachments.
- Message editing/deletion by the message author, subject to role rules.
- Super Admin audit log, including before/after content for message changes and other significant records.
- Estimate packages, line items, revisions, notes, hourly totals, rate snapshots, and status lifecycle.
- Client-facing estimate review page for approval, rejection, and revision requests. Authenticate client approval actions with a secure expiring link and, preferably, email verification/OTP.
- Separate additional-work estimate packages tied to an existing project.
- Detailed and summary work order generation, stored document snapshots, approval timestamp, and completion tracking.
- Internal project hour budgets and monetary rate settings, with role-specific visibility.
- Display event times in client/project local time and `Asia/Dhaka` time.
- Rich-text copy/paste behavior that preserves structure but removes source-theme background/foreground colors.
- Private file storage with access checks and 10 MB image / 50 MB video product limits.
- Audit-friendly historical correction of displayed event times and content by the Super Admin.
- Responsive desktop-first interface, validation, tests, migrations, deployment environments, and backups.

### 3.2 Explicitly out of scope for the first release

Unless approved as a separate scope, do not build these before the MVP workflow is stable:

- Full CRM sales pipeline, lead generation, campaigns, or revenue forecasting.
- Email inbox sync or automatic ingestion from Gmail/Outlook.
- Full client chat accounts with access to arbitrary internal project data.
- Invoicing, accounting, payroll, or payment processing.
- Advanced automation builder, custom scripting, or AI agents.
- Full ClickUp parity, advanced Gantt charts, complex recurring tasks, or a marketplace.
- Public multi-tenant SaaS subscription billing.
- Microservices, Kubernetes, or a separate backend service solely for architectural fashion.

The MVP may maintain organization-aware schema fields so a future SaaS expansion does not require a total data-model rewrite, but only one internal organization needs to be supported initially.

### 3.3 Conversation model assumption

For MVP, a project has one primary conversation thread. Internal users record and participate in the conversation. Clients can review and respond to estimate approval requests through a secure review page; this does not automatically mean that emails or third-party chat systems are synchronized. If full two-way external client messaging or email sync is required, treat it as a separate integration scope.

---

## 4. Roles and permission model

There are exactly three internal roles in the MVP. The schema may permit multiple Super Admins, but the system must always retain at least one active Super Admin. Only a Super Admin can create/invite any role, including another Super Admin.

### 4.1 Super Admin

Full control across all company data and settings. Can:

- Create/invite, deactivate/reactivate, and manage Admins and Members; assign roles.
- Create another Super Admin if required; cannot remove or demote the last active Super Admin.
- View all clients, projects, conversations, participants, estimates, all versions, budgets, rates, work orders, attachments, and audit history.
- Change all business records, including messages from other users, scope content, budget settings, estimate details, and editable event timestamps.
- Remove any conversation from ordinary views, including old conversations, using audited soft deletion/archive.
- Restore an archived/soft-deleted conversation, where retention rules permit.
- Change application settings and timezone defaults.
- View a private audit console with the real actor identity, previous values, updated values, and server-recorded correction time.

A Super Admin's **original system timestamps** (such as the immutable row creation timestamp and audit timestamp) cannot be rewritten through the UI. The Super Admin may correct the displayed/business event time (`event_at`), while the actual correction is separately audited.

### 4.2 Admin

Admins can operate the business but cannot manage user accounts or access the private audit console. Admins can:

- View and manage all company clients, projects, conversations, participants, budgets, estimates, work orders, and timelines.
- Create/edit projects, messages, estimates, estimate versions, additional-scope proposals, work orders, and completion states within the permitted workflow.
- Edit or delete only their own messages.
- View internal monetary information, including configured rates, project budgets, USD/BDT totals, and financial project data.
- See Admin/Member profiles and which internal employees are assigned to a project/conversation.
- View business activity/timestamps needed for work.

Admins cannot:

- Create, invite, deactivate, or change the role of any user.
- See the Super Admin's identity or profile through normal application screens, participant lists, search, notifications, or frontend-facing data responses.
- Open the private Super Admin audit console or retrieve historical message revisions/audit payloads.
- Edit or delete another user's messages unless promoted to Super Admin.
- Change protected system settings reserved for the Super Admin.

### 4.3 Member

Members can:

- View only projects/conversations explicitly assigned to them.
- Read and send messages in assigned conversations.
- Edit or delete only their own messages.
- See scope descriptions, line-item/task hours, approved/allocated hours, relevant deadlines/timeline, task instructions, and attachments they are authorized to access.
- See the normal authors of messages sent by Members/Admins when that information is permitted.

Members cannot:

- View monetary budgets, internal cost budgets, hourly monetary rates, USD/BDT values, financial totals, or financial reports.
- See the conversation participant roster or assignment list for other team members.
- Search for or enumerate unassigned projects/conversations.
- See the Super Admin's profile, name, email, avatar, role, ID, participant listing, or other identifying profile data.
- Create/invite users, modify roles, approve estimates on behalf of clients, generate official work orders, change rates/budgets, or modify another user's messages.
- Access the audit console, message-revision history, or deleted-message content.

Members may see the hour values specifically included in an assigned scope or work instruction. These should be labelled **scope hours**, **approved hours**, or **allocated hours**, not monetary budgets.

### 4.4 Super Admin identity hiding

The latest requirement is that the Super Admin must not be visible to Admins or Members. Therefore:

- Exclude Super Admin profiles from ordinary user directories and participant lists.
- Do not expose their email, avatar, user ID, role, or profile fields through frontend-facing APIs or queries.
- Do not include their real identity in Realtime payloads, notifications, or standard activity feeds for Admins/Members.
- If a Super Admin-authored message must appear in a normal conversation, render its author as a neutral label such as **Management**, without a profile link or identifying metadata.
- Keep the actual actor identity in the restricted audit record for Super Admin review.
- Do not make a fake identity impersonating another employee. The neutral label is a privacy presentation rule, not identity substitution in the audit data.

### 4.5 Permission matrix

| Capability | Super Admin | Admin | Member |
|---|---:|---:|---:|
| View all projects/conversations | Yes | Yes | No; assigned only |
| View assigned conversation | Yes | Yes | Yes |
| See internal participant roster | Yes | Yes, excluding Super Admin identity | No |
| View monetary budgets/rates/USD/BDT totals | Yes | Yes | No |
| View assigned scope and hour values | Yes | Yes | Yes |
| Create/invite user or change role | Yes | No | No |
| Create/edit estimate | Yes | Yes | No; can suggest via message |
| Approve/reject client estimate | Can record/override only with explicit privileged action | Can record/manage approval workflow, but client approval must be attributed to client response | No |
| Generate official work order | Yes | Yes | No |
| Edit own message | Yes | Yes | Yes |
| Edit another user's message | Yes | No | No |
| Delete own message from normal view | Yes | Yes | Yes |
| Delete/archive any conversation | Yes | No | No |
| Correct `event_at` for historical event | Yes, audited | No | No |
| View audit console | Yes | No | No |
| Change system settings | Yes | Only explicitly delegated, non-security settings if enabled | No |

**Important:** Client approval is a distinct decision source. An Admin may help manage a response or create a correction record, but must not make an approval appear to have been made by the client. Any exceptional administrative override must be explicitly labelled as an override and audited.

---

## 5. Interface and navigation requirements

### 5.1 Main workspace

Use a three-panel project workspace:

1. **Left panel — Clients and projects**
   - Searchable client/company list.
   - Each client can expand to show its projects.
   - Project status/unread indicators.
   - Create client and project actions appear only to authorized roles.
   - Super Admin identity must not appear in normal directories.

2. **Middle panel — Scope, estimates, and work orders**
   - Pinned panel for the selected project's scope packages, estimate versions, additional-work proposals, and generated work orders.
   - Each entry shows identifier/title, current state, total hours, last activity, and relevant timestamp.
   - Money fields are shown only to Super Admin/Admin.
   - Members see only the scope and hour data they are allowed to see.
   - Selecting an item opens its details and immutable version history where the role permits.

3. **Right panel — Conversation**
   - Chronological message feed.
   - Rich-text message editor.
   - Actions for message, attachment, Create Estimate, and Additional Work (based on role).
   - Estimate/work order cards link to the matching middle-panel record.
   - Each message and important event displays client/project local time and Bangladesh time.

### 5.2 Required screens

- Login and password reset.
- Client directory and client detail.
- Project list and project detail.
- Three-panel project workspace.
- Estimate editor and version detail.
- Secure client estimate-review page.
- Work order preview/download.
- Team/member assignment management for Super Admin/Admin as permitted.
- Project budget/rates panel for Admin/Super Admin only.
- Super Admin-only audit console.
- Super Admin-only system settings.
- User profile/preferences with no role self-editing.

### 5.3 Status color system

Use consistent colors in the middle panel and conversation cards:

- Draft: neutral gray.
- Pending client response: yellow/amber.
- Revision requested: orange.
- Approved: green with checkmark.
- Rejected: red.
- Superseded: neutral gray with explicit label.
- Work approved but not completed: orange.
- Work delivered/verified completed: green.

Never use color alone to communicate status; every badge must include a textual label and accessible contrast.

---

## 6. Domain model and database schema

The list below describes conceptual tables and important fields. Exact SQL types, indexes, constraints, and RLS policies must be implemented in migrations and reviewed before release. Use UUID primary keys for application entities unless a strong reason dictates otherwise. Every table that belongs to the company should include `organization_id` directly or be unambiguously scoped through a parent with a verified same-organization constraint.

### 6.1 Identity and organization

#### `organizations`
- `id`
- `name`
- `default_timezone` (default `Asia/Dhaka`)
- `created_at` (immutable server time)
- `updated_at`

MVP starts with one organization. Keep the structure extensible, but do not implement public tenant signup or billing.

#### `user_profiles`
- `user_id` (references Supabase Auth user)
- `organization_id`
- `display_name`
- `avatar_storage_path` (optional private or controlled asset)
- `account_status` (`active`, `invited`, `suspended`, `deactivated`)
- `created_at`, `updated_at`

Keep profile fields separated from privileged role data. Public-facing queries must not expose Super Admin profile fields to Admins/Members.

#### `user_roles`
- `user_id`
- `organization_id`
- `role` (`super_admin`, `admin`, `member`)
- `assigned_by`
- `assigned_at`

Only trusted server-side operations may write role records. The frontend must never be able to change its own role. Enforce at least one active Super Admin through a trusted transaction/constraint strategy.

#### `workspaces` (optional in first release but recommended for future structure)
- `id`, `organization_id`, `name`, `settings`, `created_at`

If a workspace layer is omitted for the MVP, use the organization as the default workspace concept and do not create empty abstractions that are never used.

### 6.2 Clients and projects

#### `clients`
- `id`, `organization_id`, `name`, `status`, `notes_internal`, `default_timezone`, `created_by`, `created_at`, `updated_at`, `archived_at`

#### `client_contacts`
- `id`, `client_id`, `name`, `email`, `phone`, `job_title`, `is_primary`, `created_at`, `updated_at`

Contact records are business data. Do not expose them to Members unless explicitly needed for their assignment.

#### `projects`
- `id`, `organization_id`, `client_id` (nullable for internal projects), `name`, `description_internal`, `status`, `owner_user_id`, `timezone`, `start_date`, `target_due_date`, `created_by`, `created_at`, `updated_at`, `archived_at`
- `timezone` is an IANA timezone name, defaulted from the client then organization, but can be overridden per project.

#### `project_members`
- `project_id`, `user_id`, `assignment_role`, `assigned_by`, `assigned_at`, `removed_at`
- Unique active membership on `(project_id, user_id)`.

Admins and Super Admins can inspect internal assignments. Members cannot inspect the roster of other Members or the Super Admin.

#### `conversations`
- `id`, `organization_id`, `project_id`, `kind` (MVP: `primary`), `created_by`, `created_at`, `updated_at`, `archived_at`, `deleted_at`, `deleted_by`
- MVP: one primary conversation per project. If multiple threads are later required, add them deliberately without changing estimate/version semantics.

### 6.3 Messages and attachments

#### `messages`
- `id`, `organization_id`, `conversation_id`, `author_user_id` (internal identity, protected from unauthorized exposure), `content_json` (sanitized structured rich text), `plain_text_search` (derived), `event_at`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`, `visibility` (`internal`, `client_visible` where applicable)
- `created_at` is immutable actual row creation time.
- `event_at` is the displayed business event time; only Super Admin can correct it, and every correction must be audited.
- Prefer separate internal/client-visible messages or a strict visibility field enforced by RLS; do not rely on frontend filtering.
- For normal users, expose messages through a sanitized view/RPC that can render Super Admin authors as `Management` without revealing the real author ID.

#### `message_revisions`
- `id`, `message_id`, `revision_number`, `previous_content_json`, `new_content_json`, `changed_by`, `changed_at`, `change_reason` (optional)
- Readable only through the private audit surface by the Super Admin.
- Insert-only from trusted database logic. Ordinary users cannot update/delete revisions.

#### `message_attachments`
- `id`, `message_id`, `storage_bucket`, `storage_path`, `original_filename`, `mime_type`, `size_bytes`, `uploaded_by`, `created_at`, `deleted_at`
- Never store the file bytes in a message row.
- Storage key must be generated by the application; do not trust arbitrary client-provided paths.

#### `conversation_members`
- `conversation_id`, `user_id`, `assigned_by`, `assigned_at`, `removed_at`
- Can be omitted if project assignment fully defines conversation access. If retained, policies must prevent access through mismatched project/conversation assignments.

### 6.4 Internal budget and rates

#### `project_financial_settings`
- `project_id`
- `internal_budget_hours` (nullable)
- `internal_budget_amount_usd` (nullable, restricted)
- `internal_budget_amount_bdt` (nullable, restricted)
- `internal_cost_rate_usd_per_hour` (nullable, restricted)
- `internal_cost_rate_bdt_per_hour` (nullable, restricted)
- `client_rate_usd_per_hour` (nullable, restricted from Members)
- `client_rate_bdt_per_hour` (nullable, restricted from Members)
- `currency_rate_mode` (`independent_rates` or, only if explicitly chosen later, `fx_conversion`)
- `updated_by`, `updated_at`

Use separate fields for hour allocation, internal cost, and client-facing pricing. Do not overload one ambiguous `budget` field. The MVP should use explicitly configured USD/BDT rates unless the product owner chooses exchange-rate conversion. Any conversion mode must record the FX rate/source and effective timestamp.

Financial values are visible only to Super Admin/Admin. Member-facing queries return only authorized hour/scope fields, not the monetary fields or a raw JSON object that contains them.

### 6.5 Estimate packages and versioning

Use a package/version model so an initial scope and each additional scope can evolve independently.

#### `scope_packages`
- `id`, `organization_id`, `project_id`
- `package_kind` (`initial`, `additional`)
- `title`, `description_internal`
- `parent_package_id` (optional; typically links additional scope to the original scope)
- `created_by`, `created_at`, `archived_at`
- `current_version_id` (optional pointer; must be updated atomically)

An additional scope is a distinct package, not an edit to the initial package.

#### `scope_versions`
- `id`, `scope_package_id`, `version_number`
- `status` (`draft`, `pending`, `revision_requested`, `approved`, `rejected`, `superseded`, `void`)
- `revision_type` (`initial`, `replacement`, `additional` as appropriate)
- `scope_summary`, `assumptions`, `exclusions`, `internal_note`
- `client_rate_usd_per_hour_snapshot`, `client_rate_bdt_per_hour_snapshot`
- `total_hours_snapshot`, `total_usd_snapshot`, `total_bdt_snapshot`
- `created_by`, `created_at`, `sent_at`, `sent_by`, `event_at` (if a privileged event-date correction is supported)
- `supersedes_version_id` (optional)
- `approved_at`, `rejected_at`, `revision_requested_at` are derived from authoritative decision records or retained as denormalized pointers with consistency checks.

Each sent version is immutable in business content. To change a sent version, create a new version. Any Super Admin correction to historical version data must be a separate, audited correction/amendment, not a silent rewrite of an approved snapshot.

#### `scope_items`
- `id`, `scope_version_id`, `position`, `title`, `description`, `hours`, `is_billable` (optional), `created_at`
- Items belong to one scope version. Changing the version means copying the items into a new version and editing the copy.
- Hours must be non-negative and validated server-side; precision policy must be consistent (recommend decimal hours with two fractional digits).

#### `scope_decisions`
- `id`, `scope_version_id`, `decision` (`approved`, `rejected`, `revision_requested`), `decision_source` (`client_review_link`, `admin_recorded_client_response`, `super_admin_override`), `actor_user_id` (nullable when an external client is the actor), `client_contact_id` (nullable), `client_display_name_snapshot`, `client_email_snapshot`, `comment`, `decided_at`, `server_recorded_at`, `ip_hash`/security metadata only where lawful and needed
- A decision is tied to the exact version and cannot be moved to another version.
- Do not let a normal Admin turn their own click into a client approval. Manual recording of an offline client response must be labelled as such and audited.

#### `scope_version_notes`
- `id`, `scope_version_id`, `visibility` (`internal`, `client_visible`), `author_id`, `body`, `created_at`, `updated_at`
- Prefer separate rows for internal vs client-visible notes; enforce visibility at the database layer.

### 6.6 Work orders

#### `work_orders`
- `id`, `organization_id`, `project_id`, `scope_package_id`, `approved_scope_version_id`
- `work_order_number` (unique human-readable identifier)
- `work_order_kind` (`detailed`, `summary` is document format; business type may be `original`, `additional`, `amendment`)
- `status` (`approved`, `in_progress`, `delivered`, `completed`, `cancelled`)
- `hours_snapshot`, `total_usd_snapshot`, `total_bdt_snapshot`
- `generated_by`, `generated_at`, `approved_at_snapshot`, `delivered_at`, `completed_at`, `completed_by`
- `document_storage_path`, `document_sha256` (optional content integrity hash)
- `created_at`, `updated_at`, `archived_at`

A work order must reference an approved version. Its snapshot must not change when a project rate, future estimate, or source record changes. A newly approved amendment/additional scope should generate a new work order or amendment document; it must not silently rewrite an earlier issued document.

#### `work_order_items`
- `id`, `work_order_id`, `source_scope_item_id` (optional source reference), `title_snapshot`, `description_snapshot`, `hours_snapshot`, `rate_usd_snapshot`, `rate_bdt_snapshot`, `line_total_usd_snapshot`, `line_total_bdt_snapshot`, `position`

#### `work_order_events`
- `id`, `work_order_id`, `event_type`, `actor_id`, `event_at`, `server_recorded_at`, `metadata`
- Covers generation, status changes, delivery, completion, correction, and reissue.

### 6.7 Audit and notifications

#### `audit_events`
- `id`, `organization_id`, `actor_user_id` (nullable for trusted/system/client events), `actor_role_snapshot`, `entity_type`, `entity_id`, `action`, `before_state`, `after_state`, `reason`, `request_id`, `server_recorded_at`, `source` (`ui`, `edge_function`, `database_trigger`, `client_review`)
- Insert-only from trusted logic. No normal user, including Super Admin via the ordinary UI, can update/delete audit rows.
- The audit console is Super Admin-only.
- Use allowlisted before/after fields and redaction rules so secrets, tokens, passwords, and unnecessary personal data are never logged.

#### `notifications`
- `id`, `recipient_user_id`, `event_type`, `entity_type`, `entity_id`, `created_at`, `read_at`, `payload_safe`
- Use safe notification payloads. Never include monetary fields for Members or expose Super Admin identity.

### 6.8 Constraints and indexes

At minimum:

- Foreign keys for all parent/child relationships.
- Unique `(scope_package_id, version_number)`.
- Unique `(project_id, work_order_number)` or globally unique work-order numbers.
- Unique active assignment pairs.
- Check constraints for non-negative hours and valid status values.
- Prevent scope items from referencing a different scope version than their parent package.
- Ensure project, client, conversation, package, version, and work-order records belong to the same organization.
- Add indexes on `organization_id`, `client_id`, `project_id`, `conversation_id`, `author_user_id`, `event_at`, `created_at`, `status`, `scope_package_id`, `scope_version_id`, and common foreign keys.
- Add indexes for common filters and sorts; use full-text search only after determining the privacy-safe search fields.
- Do not cascade-delete historical approvals, work orders, or audit history when a user/client/project is archived.

---

## 7. Business state machines and calculation rules

### 7.1 Scope/estimate version states

Allowed transitions:

- `draft` → `pending` when sent.
- `pending` → `approved` when the client approves that exact version.
- `pending` → `rejected` when the client rejects that exact version.
- `pending` → `revision_requested` when the client requests a revision.
- `revision_requested` → a new `draft` version; the old version remains preserved.
- `approved` → `superseded` only when a replacement version in the same package is approved, or when an explicitly audited exceptional correction is performed.
- `rejected`/`superseded` → no direct edit; create a new version if work continues.
- `draft` → `void` if abandoned, with reason where appropriate.

A client decision must always refer to the version ID they saw. Reject stale approval requests for versions that have already been superseded or otherwise invalidated.

### 7.2 Approved hours calculation

Do not sum every version or every work order, because that double-counts revisions.

- For each `scope_package`, count only its one currently active approved version.
- If a replacement version is pending, retain the previous approved version as the active authorized scope until the replacement is approved, unless a separately audited pause/withdrawal action is recorded.
- For an additional package, include its hours only after a version in that package is approved.
- Project approved hours = sum of active approved version totals across applicable scope packages.
- Pending, rejected, draft, void, and superseded versions contribute zero to the current approved-hours total.
- Work-order totals are snapshots of authorized work, not an independent source for calculating active approved hours.
- A budget comparison may show approved hours vs internal budget hours, but the monetary budget is never returned to a Member.

### 7.3 Hours and money calculations

- Store hours using a consistent decimal scale (recommend two decimal places).
- Total hours = sum of line item hours for the version.
- Total USD = total hours × USD rate snapshot.
- Total BDT = total hours × BDT rate snapshot.
- Use exact decimal/numeric types for currency; never use JavaScript floating-point arithmetic as the authoritative calculator.
- Round currency at a defined point (recommend each displayed line total and version total to two currency decimals; document whether total is sum of rounded lines or rounded sum and use one rule consistently).
- USD and BDT are parallel representations. Never add them together.
- Record the actual rate snapshots on each sent version and each work order.
- Changing a project's current rate affects future drafts only; it must not silently alter a sent version or generated work order.

### 7.4 Client approval rules

- Every client decision records exact scope version, decision, server timestamp, client identity/contact snapshot where known, and comment if provided.
- Secure review URLs are scoped to one version and contain high-entropy bearer tokens stored as hashes at rest.
- Links must be revocable, expiring, rate-limited, and limited to that review page only. They must not grant general conversation or project access.
- Prefer email OTP/magic-link verification before accepting an approval/rejection, especially for commercially significant scopes.
- An approval is idempotent: duplicate submissions must not create duplicate decisions or duplicate work orders.
- Reusing a link after revocation/expiry returns a safe error and creates a security event without exposing private project data.
- An Admin can record a client's offline response only through an explicitly labelled workflow and must not impersonate the client in audit data.

### 7.5 Work-order generation

- Only Admin or Super Admin can generate an official work order.
- Generation requires an approved scope version.
- Generate from a database snapshot in a trusted server/database operation; do not accept client-submitted totals as authoritative.
- Produce both output formats: (A) detailed breakdown and (B) summary with scope and total hours.
- Both formats share the same approved source data and snapshot identifiers.
- Store the generated document in private storage and record its storage path, source version, creator, generation time, and optional SHA-256 checksum.
- Regeneration/reissue creates a new work-order document version/event; do not silently overwrite a previously issued PDF.

### 7.6 Completion

- Work order/scope lifecycle should distinguish `approved`, `in_progress`, `delivered`, and `completed` (MVP may simplify the user-facing steps, but must preserve separate delivery and completion timestamps if both occur).
- Completion requires an Admin/Super Admin action.
- Completion stores `completed_by` and an immutable `completed_at` system timestamp.
- If a historical completion event is corrected, `event_at` may be changed by Super Admin, but `server_recorded_at` stays unchanged and an audit event is written.
- Do not automatically mark a work order completed merely because the estimated hours have elapsed.

---

## 8. Timezone and timestamp requirements

This is a first-class requirement, not a cosmetic detail.

### 8.1 Canonical storage

- Store actual instants using PostgreSQL `timestamptz`.
- Store application event times in UTC semantics; let PostgreSQL preserve the instant.
- Use `Asia/Dhaka` for Bangladesh display.
- Use the client's/project's IANA timezone (e.g. `America/New_York`, `America/Toronto`, `Australia/Sydney`) for client-local display.
- Never hardcode a fixed offset such as UTC-5 or UTC+10 as a timezone, because daylight-saving transitions differ.

### 8.2 Distinguish timestamps

- `created_at`: actual row creation time; immutable.
- `updated_at`: actual record update time; server-generated.
- `event_at`: displayed/business event time; editable only by Super Admin for supported historical corrections.
- `server_recorded_at`: immutable timestamp that the system recorded an action/audit event.
- Domain-specific values such as `sent_at`, `approved_at`, `delivered_at`, and `completed_at` should represent the actual occurrence time and must not be overwritten to disguise a late correction.

If a historical event needs correction, store the corrected business/event time in an explicitly editable field and log the prior and new values. Never rewrite the audit event's server time.

### 8.3 Display behavior

For messages and important events, show both:

- `Client/Project time: {formatted local timestamp + timezone abbreviation}`
- `Bangladesh time: {formatted Asia/Dhaka timestamp}`

Show the date as well as time when useful, and always show the date in the expanded history. The two displayed timestamps must represent the same UTC instant, even when they fall on different calendar dates.

Save a timezone snapshot for important events so that the original display context is known if the project's configured timezone changes later. The Super Admin can correct the event time/timezone only with a recorded reason and audit entry.

### 8.4 Testing

Test dates across US/Canada/Australia daylight-saving transitions, time-zone changes, year boundaries, and cases where the Bangladesh and client dates differ. Verify message, estimate, approval, work order, additional-scope, delivery, and completion timestamps.

---

## 9. Message editing, deletion, historical correction, and audit

### 9.1 Message editing

- Admins and Members can edit only their own messages.
- Super Admin can edit any message.
- Every edit preserves the previous content and writes an audit event.
- Edited messages may display a normal `Edited` indicator and last-updated time. Do not expose previous content to regular users unless explicitly approved in a later requirement.
- Rich-text content must be sanitized both at input and render time.

### 9.2 Message deletion

- Admins and Members can delete only their own messages.
- Super Admin can remove any message and any conversation from the normal application view.
- MVP deletion is **soft deletion/archive**, not immediate physical erasure. The previous content remains available only in the private audit history so the Super Admin can investigate.
- Do not cascade-delete audit rows, revisions, approvals, or work-order snapshots.
- Hard purge is not part of MVP. If later needed, it requires an explicit retention policy, authorization, confirmation, and a documented explanation that physically erased content cannot be recovered from the audit history.

### 9.3 Historical event-time correction

- Super Admin can change supported `event_at` fields for messages, scope records, and other approved correction targets.
- Preserve the immutable original creation/recorded timestamps.
- Every correction records entity, actor, old event time, new event time, old/new timezone context if changed, reason, and server-recorded correction timestamp.
- The regular timeline displays the corrected event time. The private audit console shows both the original and corrected values.

### 9.4 Audit console

Super Admin-only features:

- Filter by date, actor, client, project, conversation, entity type, action, and affected record.
- Show previous state and new state in a side-by-side diff.
- Show actual actor identity, role at the time, server-recorded time, and reason.
- Trace a message from its current record to previous revisions and deletion/restoration events.
- Trace an estimate from draft through each version, send, feedback, decision, and work order.
- Trace project rate/budget changes and identify which future estimate versions used each rate.
- Export audit reports only to the Super Admin, with any export itself recorded as an audit event.

Audit write path:

- Audit events are created by trusted database triggers/functions or trusted Edge Functions.
- Ordinary application users cannot update/delete audit rows.
- The UI offers no delete/edit action for audit events.
- Do not log credentials, auth tokens, signed URLs, or secrets.
- Consider external log export/backups for tamper resistance, but do not claim the application alone provides absolute tamper-proofing against a database owner with infrastructure-level access.

---

## 10. Rich-text editor and copy/paste rules

Use a structured rich-text document format and a maintained editor with table support (recommended: Tiptap with table extensions). The implementation must handle clipboard HTML safely.

### 10.1 Preserve structure

When pasting from ChatGPT or other applications, preserve supported structure:

- Paragraphs and line breaks.
- Headings.
- Ordered/unordered lists.
- Tables, rows, columns, and cell content.
- Bold, italic, underline, and basic inline emphasis.
- Hyperlinks.
- Supported text alignment.

### 10.2 Normalize theme-specific styles

- Remove source `background-color`, dark-mode theme backgrounds, and source foreground color styling from pasted content.
- Remove arbitrary inline styles that are not on an explicit safe allowlist.
- Apply the destination editor's theme and typography after paste.
- Do not flatten a valid table to plain text just to remove dark styling.
- Preserve semantic layout and data even if colors/backgrounds are removed.
- Support clipboard input with only plain text as a fallback.

### 10.3 Security

- Sanitize HTML to prevent XSS, unsafe embeds, scriptable URLs, malicious event attributes, and arbitrary CSS.
- Restrict allowed node types, attributes, and URL schemes.
- Do not render pasted HTML with unsafe raw HTML insertion.
- Store normalized structured JSON, with a derived plain-text field for search where appropriate.
- Test pasting tables from dark mode to light mode and light mode to dark mode, including cells with links and bold text.

### 10.4 Acceptance criteria

- Table structure remains intact after paste.
- Dark background and light foreground from a dark source are not carried into the light editor.
- Light source styling does not force a light-colored cell or black text in the dark editor.
- Links remain functional but are limited to allowed URL schemes.
- Unsafe HTML is removed without losing ordinary text content.

---

## 11. Attachments and external links

### 11.1 Product limits

Use consistent byte-level limits throughout client and server validation:

- Image upload: maximum 10,000,000 bytes (10 MB decimal).
- Video upload: maximum 50,000,000 bytes (50 MB decimal).
- Other file types: configure an explicit allowlist and limit; do not implicitly allow arbitrary files.
- Oversized video: reject the upload and show guidance to use Google Drive or another approved video-hosting provider, then paste the link.

The Supabase project's global Storage limit and the selected hosting plan must support the configured maximum upload size. Configure bucket-specific limits and MIME restrictions no higher than the project's global limit.

### 11.2 Upload security

- Use private Storage buckets for conversations and work-order PDFs.
- Storage paths are generated by the application and scoped by organization/project/conversation.
- Enforce upload/read/delete policies against the same conversation access rules as the database.
- Validate file size and MIME type in the UI and again in trusted server/storage configuration.
- Do not trust the filename extension alone; use MIME validation and, where practical, content-signature checks.
- Use signed URLs with short expiry or authenticated downloads for private objects.
- Do not expose service-role keys to the browser.
- Use resumable uploads when it improves reliability for larger files.
- Orphaned files from failed message posts should be cleaned up safely by a scheduled retention task.

### 11.3 Oversized file message

For an oversized video, show a message such as:

> This video exceeds the 50 MB upload limit. Please upload it to Google Drive or another video-hosting service and share the link in this conversation.

Use a similar compression suggestion for oversized images.

### 11.4 Link handling

- Support plain clickable links and safe link previews where appropriate.
- Limit allowed schemes to `https:` and `http:` unless an additional scheme is explicitly justified.
- Avoid server-side fetching of arbitrary URLs without SSRF protections.
- If a link preview is added later, fetch through a controlled service with private-network and redirect protections.

---

## 12. Security architecture for Supabase

This section is mandatory. UI-only permission checks are insufficient.

### 12.1 Frontend

- React + TypeScript + Parcel.
- Use the Supabase client with the public/publishable key only.
- No Supabase service-role/secret key, database password, signing secret, or admin Auth key in frontend variables or bundles.
- Keep route guards for usability, but assume every frontend check can be bypassed.
- Use a maintained rich-text editor and sanitize all persisted/rendered content.

### 12.2 Database and Data API

- Use PostgreSQL as the canonical source of truth.
- Enable RLS on every exposed table.
- Explicitly configure grants and policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` individually where relevant.
- Default deny. Add only required permissions.
- Verify the relationship chain in every policy: organization, project, conversation membership, role, and entity consistency.
- Do not assume that a view is safe automatically. Use safe views/functions and understand whether they execute as invoker or definer.
- Avoid granting Members direct read access to raw financial tables, role mapping tables, audit tables, or unredacted message author IDs.
- Prefer narrowly scoped database functions/Edge Functions for atomic workflow commands.
- Privileged `SECURITY DEFINER` functions must use a fixed trusted `search_path`, strict input validation, narrow grants, and explicit caller authorization. Do not put arbitrary dynamic SQL in them.
- Database triggers or trusted transaction logic must record before/after audit data for protected edits.

### 12.3 Role management

- Auth sign-up/public registration is disabled.
- A one-time bootstrap process creates the initial Super Admin out of band (documented, secured, and removed/disabled after use).
- Only a trusted server-side function called by a Super Admin can invite/create a user or change a role.
- Prevent self-promotion by any user.
- Prevent deletion/demotion/deactivation of the last active Super Admin.
- Revoke existing sessions when a user is suspended/deactivated or privileges are reduced, as feasible within the selected auth architecture.
- Log all role/account changes.

### 12.4 Protected message identity

Because the Super Admin identity is hidden from regular users, don't expose raw author IDs through ordinary queries if they can be correlated with privileged profiles.

- Use sanitized views/RPC response types for normal message feeds.
- Map Super Admin authors to a neutral display label and omit profile links/IDs from Admin/Member responses.
- Keep the raw actor ID in protected audit storage.
- Audit and test notifications and Realtime payloads for the same leak.

### 12.5 Financial confidentiality

- Separate protected financial data from member-visible scope/hours data.
- Do not return a full row or generic JSON blob containing monetary fields to Members.
- Use role-aware views/RPC payload schemas.
- Test direct REST/Data API requests, SQL-backed RPCs, Realtime subscriptions, exports, downloads, and notifications.
- PDFs generated for Members must not include monetary fields; detailed/summary work orders containing money are restricted to Admin/Super Admin unless a separately approved client-facing PDF is generated with deliberate fields.

### 12.6 Client approval token security

- Generate high-entropy random tokens server-side; store only hashes at rest.
- Tie each token to a specific scope version and allowed actions.
- Include expiration, revocation, and rate-limit behavior.
- Verify the exact version is still eligible for response before accepting a decision.
- Prefer client email verification/OTP for approval actions.
- Never put internal budget values or private conversation history on a client review page.
- Log link creation, use, expiry, revocation, and approval decisions without storing the raw token.

### 12.7 Additional security controls

- HTTPS in all non-local environments.
- Secure authentication/session settings and password reset behavior.
- Rate-limit login, invitation, review-link, file upload, and other sensitive actions.
- Validate all inputs at the database/server boundary.
- Escape user-provided text in every output context.
- Use CSP and standard security headers at the hosting layer where possible.
- Keep dependency versions pinned and patch regularly.
- Keep production, staging, and local environments separate.
- Never use production secrets/data in an unprotected local or preview environment.

---

## 13. Recommended application architecture

### 13.1 High-level stack

- **Frontend:** React, TypeScript, Parcel, React Router (or another explicit routing choice), a consistent accessible component system, and Tiptap for rich-text tables/paste.
- **Backend:** Supabase Postgres, Auth, Storage, Realtime, and Edge Functions.
- **Database workflows:** transactional PostgreSQL functions/RPCs for operations that need to update multiple related records atomically.
- **External side effects:** Edge Functions for client emails, notifications, secure review links, and PDF orchestration.
- **Testing:** TypeScript unit tests, database/RLS tests, and Playwright end-to-end tests.
- **Repository:** application source, migrations, seed/fixture scripts, Edge Functions, tests, and deployment instructions all version controlled.

### 13.2 Workflow command boundary

Do not implement critical business operations as several unrelated browser-side updates. Prefer a single trusted operation for:

- `create_estimate_draft`
- `send_estimate_version`
- `record_client_scope_decision`
- `create_estimate_revision`
- `create_additional_scope_package`
- `generate_work_order`
- `mark_work_order_delivered`
- `complete_work_order`
- `correct_event_timestamp`
- `archive_conversation`
- `restore_conversation`
- `invite_user_and_assign_role`
- `update_project_financial_settings`

For each command, validate the caller and target records, perform database changes in one transaction where possible, write the required audit event, and return a minimal role-appropriate response. Send email/notifications after commit; use idempotency keys for operations that could be retried.

### 13.3 Realtime

- Use Realtime for message/event updates where it materially improves the experience.
- Apply the same authorization as normal reads.
- Do not broadcast raw database rows if they contain financial fields, internal notes, privileged author IDs, or private audit metadata.
- Re-fetch through authorized views/RPCs after notification where doing so is safer.
- Avoid duplicate notifications and handle reconnect/replay gracefully.

### 13.4 PDF generation

- Generate PDFs from immutable snapshots on a trusted server-side path.
- Store a private PDF file with a work-order reference and generation metadata.
- Detailed format contains ordered line items, descriptions, hours, rate/totals for the allowed audience, approved source version, approval time, project/client details, and document ID.
- Summary format contains client/project details, scope summary, total approved hours, approved currency totals when authorized, source version, work-order ID, and timestamps.
- Member-facing output excludes all monetary values. If client-facing PDFs are enabled, use a deliberate allowlist of client-visible fields.
- Use a clear document version/reissue marker. Never mutate a previously issued PDF invisibly.

---

## 14. Development phases and exit criteria

Each phase must produce working code, migrations, automated tests, and a demo path before proceeding.

### Phase 0 — Product and architecture foundation

Tasks:
- Create the repository and baseline Parcel + React + TypeScript app.
- Connect local Supabase development with versioned migrations.
- Finalize the role/permission matrix and seed/bootstrap process.
- Create the first architecture decision records for Super Admin visibility, audit retention, client review links, timezone rules, rates/currency, and soft deletion.
- Design the three-panel layout and reusable state/status components.
- Define lint/type-check/test/build scripts.

Exit criteria:
- A new developer can follow README instructions to run the app and database locally.
- Migration and test commands work from a clean checkout.
- No secrets are required in tracked files.

### Phase 1 — Authentication and authorization

Tasks:
- Login/logout/password reset.
- One-time initial Super Admin bootstrap.
- User profile, role, invitation, activation/deactivation workflows.
- Super Admin-only user/role management.
- RLS policies and negative tests.
- Hide Super Admin identity from ordinary profile and roster queries.

Exit criteria:
- Admin/Member cannot invite, create users, self-promote, inspect role mappings, or see Super Admin identity.
- Last active Super Admin cannot be removed or demoted.
- RLS tests prove denied actions fail via direct API calls, not only through UI.

### Phase 2 — Clients, projects, assignment, and conversation

Tasks:
- Client and contact CRUD.
- Project creation under a client, project timezone, assignments, primary conversation.
- Three-panel navigation.
- Message create/read/edit/delete.
- Rich-text editor, safe links, image/video upload, Realtime updates.
- Dual-time display for message and event timestamps.
- Message revision and audit foundations.

Exit criteria:
- Admin can create client/project/conversation and assign Members.
- Member sees only assigned project/conversation and cannot inspect assignment roster.
- Message edits/deletes preserve previous content in restricted audit storage.
- Files obey type/size limits and conversation permissions.

### Phase 3 — Estimates, versioning, and budgets

Tasks:
- Scope packages and versioned line items.
- Draft estimate creation from the conversation.
- Calculate hours and parallel USD/BDT totals using server-authoritative decimal math.
- Project budget and rates configuration for Admin/Super Admin.
- Send estimate, immutable version snapshot, and middle-panel item.
- Version history and rate snapshots.

Exit criteria:
- A sent version cannot be silently edited.
- A revised version has a new version ID and keeps the previous content.
- Member responses contain scope/hours only, never monetary fields.
- Changing current rates does not change sent estimate or work order snapshots.

### Phase 4 — Client review and additional scope

Tasks:
- Secure estimate review page.
- Token generation/hash storage, expiry, revocation, and rate limiting.
- Optional email OTP/magic link.
- Approve/reject/request-revision actions tied to exact version.
- Client feedback/comment flow.
- Additional scope as a separate package linked to the project/parent package.
- State badge and approved-hours aggregation.

Exit criteria:
- Approvals cannot be forged by Members or normal Admin actions.
- Duplicate responses are idempotent.
- Pending/rejected scope does not contribute to approved-hours total.
- An additional scope adds to project approved hours only after approval.

### Phase 5 — Work orders and completion

Tasks:
- Detailed and summary PDF generation.
- Work-order number generation and immutable snapshots.
- Approval/source timestamp display.
- Additional-scope work orders and amendments.
- In-progress, delivery, and completion state transitions.
- Completion actor/time and status colors.

Exit criteria:
- Only Admin/Super Admin can generate official work orders.
- Work order source version must be approved.
- Both formats represent the same scope and totals.
- Reissuing creates a new document version/event.
- Member documents do not leak financial fields.

### Phase 6 — Super Admin audit and historical correction tools

Tasks:
- Audit console filters and before/after diff.
- Message and conversation history.
- Scope/rate/budget/approval/work-order change history.
- Correctable business-event timestamps with reasons.
- Super Admin conversation archive/restore.
- Privileged edit flows and corresponding audit records.

Exit criteria:
- Every protected write path produces required audit data.
- Audit rows cannot be modified/deleted through the normal application.
- Super Admin corrections preserve the original values and server-recorded correction time.
- Admin/Member cannot access the audit UI or records directly.

### Phase 7 — Hardening and production release

Tasks:
- Full database, RLS, API, storage, and Realtime security tests.
- Timezone/DST testing.
- Rich-text paste and sanitization tests.
- Load/performance tests using representative data.
- Backups and restore drills.
- Production/staging environment separation, monitoring, alerting, error logging, and deployment rollback.
- Accessibility, responsive layout, and user acceptance testing.

Exit criteria:
- All P0 acceptance tests pass.
- No known critical/high severity authorization or data leakage issue remains.
- Backup restoration and deployment rollback are demonstrated.
- Production checklist and runbook are documented.

---

## 15. Acceptance test catalogue

These are launch-blocking tests, not optional manual suggestions.

### 15.1 Roles and identity

- [ ] An unauthenticated user cannot access internal pages or protected data.
- [ ] A Member cannot create/invite users or alter role records through the UI or direct API.
- [ ] An Admin cannot create/invite users or alter role records through the UI or direct API.
- [ ] Only a Super Admin can invite or change roles.
- [ ] A caller cannot promote themselves to Super Admin.
- [ ] The last active Super Admin cannot be deleted, suspended, or demoted.
- [ ] Admin and Member API responses do not reveal Super Admin name, email, avatar, profile ID, or roster entry.
- [ ] Super Admin-authored messages do not reveal profile identity in ordinary feeds, notifications, or Realtime events.

### 15.2 Project and conversation isolation

- [ ] Admin can view all company projects/conversations.
- [ ] Member can view an assigned conversation.
- [ ] Member cannot view an unassigned conversation by changing a URL, ID, query parameter, or API request.
- [ ] Member cannot enumerate participants or other project members.
- [ ] Realtime subscriptions do not deliver events from an unauthorized conversation.
- [ ] A file URL from an unauthorized conversation cannot be used to download an attachment.

### 15.3 Message editing/deletion/audit

- [ ] Admin can edit/delete their own message.
- [ ] Member can edit/delete their own message.
- [ ] Admin/Member cannot edit/delete another user's message.
- [ ] Super Admin can edit/remove any message.
- [ ] Each edit writes an immutable revision and audit event containing the prior and new content.
- [ ] Each delete is represented as a soft deletion and audit event; ordinary users cannot retrieve deleted body content.
- [ ] Super Admin can filter and view previous content and corrections.
- [ ] Audit rows cannot be updated/deleted by application roles through direct API or RPC.

### 15.4 Estimates and approvals

- [ ] Estimate creation calculates total hours and currency totals server-side.
- [ ] Sending creates a new immutable version with a timestamp and actor.
- [ ] Editing a sent estimate is blocked; a new revision must be created.
- [ ] Every client decision is tied to the exact version reviewed.
- [ ] A revision request creates or enables a new version without overwriting prior versions.
- [ ] Rejected scope is not counted in current approved hours.
- [ ] Pending additional scope is not counted in current approved hours.
- [ ] An approved revision replaces the active approved version in the same package without double-counting it.
- [ ] An additional package adds hours only when approved.
- [ ] Expired/revoked review links cannot submit decisions.
- [ ] Duplicate client submissions do not produce duplicate approvals or work orders.
- [ ] Members cannot approve, reject, or change estimate statuses.

### 15.5 Budgets and money

- [ ] Admin and Super Admin can read/edit permitted rate and budget fields.
- [ ] Member responses do not include internal budget amounts, hourly monetary rates, USD/BDT totals, hidden columns, or unredacted JSON.
- [ ] Member exports, notifications, Realtime events, and PDFs do not leak financial data.
- [ ] USD and BDT totals use decimal calculation and the documented rounding rule.
- [ ] USD and BDT are not added together.
- [ ] Updating current project rates does not alter previously sent estimates or issued work orders.

### 15.6 Work orders and completion

- [ ] Work order creation requires an approved scope version.
- [ ] Only Admin/Super Admin can generate a work order.
- [ ] Detailed and summary work orders use the same source version and snapshot totals.
- [ ] Work order PDF is private and protected by authorization.
- [ ] Reissue/updated amendment creates a new document revision/event.
- [ ] Completion requires an authorized actor and records `completed_by` and `completed_at`.
- [ ] Hour estimates alone do not auto-complete a work order.

### 15.7 Time and historical correction

- [ ] Each required message and business event shows client/project time and Bangladesh time.
- [ ] Both displays represent the same instant.
- [ ] DST boundaries and date rollovers are correct for supported US/Canada/Australia zones.
- [ ] Only Super Admin can correct event time.
- [ ] Correction preserves original creation/audit timestamps and records old/new values plus correction time.

### 15.8 Attachments and paste

- [ ] Image above 10,000,000 bytes is blocked with useful guidance.
- [ ] Video above 50,000,000 bytes is blocked with Drive/hosting-link guidance.
- [ ] MIME/size restrictions are enforced outside the UI too.
- [ ] Unauthorized user cannot read/upload/delete conversation media.
- [ ] Dark-mode table pasted into light editor keeps table structure but loses source dark background/foreground colors.
- [ ] Light-mode table pasted into dark editor keeps table structure and adopts destination theme.
- [ ] Scriptable HTML, event-handler attributes, unsafe URL schemes, and dangerous CSS are removed.
- [ ] Plain-text paste still works.

### 15.9 Operations

- [ ] Database migrations build a clean environment reproducibly.
- [ ] CI runs lint, type-check, unit tests, database/RLS tests, and production build.
- [ ] Backup restoration has been tested.
- [ ] Secrets are not present in the repository or frontend bundles.
- [ ] Production errors can be investigated without logging secrets or sensitive payloads.

---

## 16. Non-functional requirements

### Reliability and data integrity

- Use transactions for multi-record operations: send estimate, record approval, update active scope version, generate work order snapshot, role changes, and corrections.
- Make retriable commands idempotent where possible.
- Do not send external notifications before the database commit succeeds.
- Add a unique idempotency/request key where duplicate requests could cause duplicate approval/work-order records.
- Preserve source-version IDs and snapshots.

### Performance

- Use server-side pagination for long conversation histories, client lists, audit histories, and work-order lists.
- Index foreign keys and common filter/sort columns.
- Avoid sending full audit payloads to the conversation screen.
- Load old message pages on demand.
- Use Realtime for updates, not as a replacement for a reliable database query.

### Accessibility and usability

- All primary actions are keyboard accessible.
- Statuses are not communicated by color alone.
- Forms expose validation errors next to relevant fields.
- Destructive actions require clear confirmation and explain consequences.
- The layout must work on standard desktop widths and remain usable on tablet/small screens; prioritize desktop for the first release because the three-panel UI is operationally dense.

### Observability

- Track application errors and request correlation IDs.
- Track failed uploads, rejected review-link requests, permission denials, failed work-order generation, and queue/notification failures.
- Do not log passwords, tokens, signed URLs, full secrets, or unnecessary message bodies in external telemetry.
- Audit business actions separately from operational logs.

### Backup and recovery

- Enable suitable managed database backups for the chosen Supabase plan.
- Define retention and recovery objectives before production release.
- Back up or regenerate stored documents with deliberate retention rules.
- Test a restore in a non-production environment.
- Do not claim a backup exists merely because the cloud provider offers the feature; verify configuration and restore ability.

---

## 17. Repository and code quality expectations

Suggested structure (adapt to the selected libraries, but preserve separation of concerns):

```text
src/
  app/                  # routing, providers, layout
  components/           # reusable UI components
  features/
    auth/
    clients/
    projects/
    conversations/
    rich-text/
    estimates/
    approvals/
    work-orders/
    budgets/
    audit/
    users/
  lib/
    supabase/
    timezone/
    formatting/
    validation/
  types/
  test/

supabase/
  migrations/
  functions/
    invite-user/
    send-estimate/
    review-estimate/
    generate-work-order/
    correct-event-time/
  tests/

scripts/
docs/
  ADRs/
  runbooks/
```

Engineering standards:

- TypeScript strict mode enabled.
- No `any` on critical business/security workflows without documented reason.
- Shared schemas/types for request validation, status values, and response payloads.
- No financial arithmetic as authoritative client-side math.
- Keep UI components separate from business workflow calls.
- Centralize timezone formatting and money/hour formatting.
- Keep migrations forward-only and reviewable; do not rely on manual dashboard-only schema changes.
- Maintain `.env.example` with names/placeholders only; never commit secrets.
- Document local setup, environment configuration, deployment, bootstrap Super Admin, backup restore, and incident response.

---

## 18. Release gates and definition of done

A feature is not done merely because the happy-path UI works. Before marking any feature complete:

1. Acceptance criteria are satisfied.
2. Authorization is tested at the database/API boundary.
3. Loading, empty, success, validation-error, denied, and failure states are implemented.
4. Audit requirements are implemented for protected changes.
5. Database migrations and required indexes/constraints are committed.
6. Unit/feature/database tests are added.
7. At least one end-to-end test covers the critical workflow.
8. Sensitive data is not leaked through Realtime, logs, downloads, or notifications.
9. The feature has been checked against Admin, Member, and Super Admin roles.
10. Documentation and any ADRs are updated.

MVP cannot be considered production-ready until all launch-blocking tests in Section 15 pass and a backup restore has been demonstrated.

---

## 19. Implementation order for an AI coding agent or development team

Use the following workflow when implementing this specification:

1. Read this document completely and identify any conflicting requirements before coding.
2. Create a task breakdown from Phase 0 and implement only Phase 0 first.
3. Establish database migrations, local Supabase workflow, lint/type-check/test scripts, and seed fixtures.
4. Implement role/security primitives and prove them with RLS tests before building application features.
5. Build each phase vertically (database + permission + UI + tests), not as disconnected UI-only work.
6. After every phase, run all tests from earlier phases to prevent regressions.
7. Do not replace security logic with frontend-only checks.
8. Do not silently change state-machine behavior, rate math, timestamp semantics, or deletion/retention behavior.
9. If a requirement needs clarification, stop only the affected area, write the ambiguity and recommended default in an ADR, and continue with unblocked work.
10. At the end of each phase, report: completed items, migrations, security rules added, tests run, known limitations, and next phase.

### Required initial implementation outputs

Before writing the full feature set, create:

- A repository README with local setup and environment variables.
- A role and permission matrix based on Section 4.
- An architecture decision record covering: Super Admin identity masking, audit immutability/retention, client review-link authentication, soft delete vs hard purge, timezone snapshot behavior, currency/rate policy, and client conversation scope.
- Initial ERD/schema outline covering Section 6.
- First migrations for organization, users/roles, clients, projects, assignments, and conversations.
- RLS tests proving that Admins/Members cannot access protected profiles, budgets, roles, or audit events.
- A CI pipeline that runs lint, type-check, tests, and a Parcel production build.

---

## 20. Architecture decisions that are assumed unless explicitly changed

1. **Single internal organization for MVP; organization-aware records for future expansion.**
2. **Super Admin identity is hidden from Admins and Members.** If a Super Admin message appears in a normal conversation, its displayed author is a neutral `Management` label.
3. **Only Super Admin creates/invites users and changes roles.** At least one active Super Admin must always exist.
4. **Members see assigned scope and hours but no monetary values and no participant roster.**
5. **Admins can see company-wide work and financial fields, but cannot manage user accounts or view the private audit console.**
6. **One primary conversation per project in MVP.**
7. **Clients respond to estimates through a restricted review page; no full external messaging/email sync in MVP.**
8. **Deletion in normal workflows is soft deletion/archive.** Super Admin can remove historical conversations from ordinary views while preserving a private audit trail. Permanent purge is excluded from MVP.
9. **Sent estimates and generated work orders are snapshots.** Changes create revisions or amendments, never silent mutations.
10. **Project rates use explicitly configured USD and BDT rates initially.** Automatic FX conversion is a separate decision.
11. **Timestamps store actual instants; client-local time and Bangladesh time are display conversions.** Super Admin corrections apply to `event_at`, not immutable system/audit timestamps.
12. **Upload size means decimal MB by exact byte limit:** 10,000,000 bytes for image and 50,000,000 bytes for video.
13. **A scope package's current approved total includes only its active approved version.** Pending/rejected versions do not count; a pending replacement does not remove the previously approved version until the replacement becomes approved.
14. **All financial calculations are authoritative on the server/database and use decimal types.**
15. **Audit history is append-only from the application's perspective.** Infrastructure/database owners may have capabilities outside ordinary application permissions; absolute tamper-proofing requires separately protected backups/external logging.

---

## 21. Official technical references

Check the current official documentation during implementation and pin compatible package/runtime versions. These links support implementation decisions; they do not override the product requirements in this document.

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase securing data and Data API: https://supabase.com/docs/guides/database/secure-data
- Supabase database functions and RPC: https://supabase.com/docs/guides/database/functions
- Supabase securing Edge Functions: https://supabase.com/docs/guides/functions/auth
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Storage upload limits: https://supabase.com/docs/guides/storage/uploads/file-limits
- Supabase Realtime authorization: https://supabase.com/docs/guides/realtime/authorization
- Parcel React and TypeScript: https://parceljs.org/recipes/react/
- Parcel documentation: https://parceljs.org/docs
- Tiptap table extension: https://tiptap.dev/docs/editor/extensions/nodes/table
- PostgreSQL date/time types: https://www.postgresql.org/docs/current/datatype-datetime.html

---

## Final directive

Build this as a secure, audit-friendly internal work management system whose source of truth is PostgreSQL. Keep role checks, money calculations, approvals, work order generation, and historical corrections in trusted server/database operations. Preserve estimate versions and approved documents. Enforce privacy in database policies and response shapes. Implement one tested workflow end-to-end before expanding the product.
