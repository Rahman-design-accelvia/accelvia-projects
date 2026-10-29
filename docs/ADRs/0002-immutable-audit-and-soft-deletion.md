# ADR 0002: Immutable Audit Log and Soft-Deletion Architecture

## Status
Accepted

## Context
Commercial agreements, estimate approvals, work orders, scope modifications, message histories, and rate changes represent legal and operational commitments. If business records can be edited or deleted without a historical trail, disputes arise and auditability is lost.

## Decision
1. **Append-Only Audit Log**:
   - `audit_events` is an insert-only table.
   - PostgreSQL RLS and table grants strictly revoke `UPDATE` and `DELETE` privileges on `audit_events` from all application roles (including `super_admin`).
   - Mutations on critical domain entities (`messages`, `scope_versions`, `scope_decisions`, `work_orders`, `project_financial_settings`, `user_roles`) fire database triggers that capture `before_state` and `after_state` as sanitized `jsonb` payloads with the caller identity, role snapshot, and timestamp.
2. **Soft Deletion & Archival**:
   - All deletions in standard workflows are soft deletions: setting `deleted_at = now()` and `deleted_by = auth.uid()`.
   - Normal application queries filter `WHERE deleted_at IS NULL`.
   - Super Admins can archive or soft-delete entire conversations or messages. Hard physical purge is excluded from the MVP.
3. **Audited Historical Corrections**:
   - The Super Admin may correct a historical business event time (`event_at`) on messages or scopes to reflect actual real-world occurrences.
   - However, the system's `created_at` and `server_recorded_at` timestamps are strictly immutable.
   - Any modification to `event_at` requires a mandatory `reason` parameter and is logged as an audit event.

## Consequences
- **Positive**: Complete audit trail and forensic accountability.
- **Negative**: Storage requirements grow linearly with mutations; queries must consistently filter soft-deleted rows.
