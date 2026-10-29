-- 20261030000001_initial_schema.sql
-- Accelvia Work Management System — Foundational Schema
-- Version: 1.0 (2026-10-30)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role_type AS ENUM ('super_admin', 'admin', 'member');
CREATE TYPE account_status_type AS ENUM ('active', 'invited', 'suspended', 'deactivated');
CREATE TYPE client_status_type AS ENUM ('active', 'lead', 'archived');
CREATE TYPE project_status_type AS ENUM ('active', 'on_hold', 'completed', 'archived');
CREATE TYPE package_kind_type AS ENUM ('initial', 'additional');
CREATE TYPE scope_version_status_type AS ENUM ('draft', 'pending', 'revision_requested', 'approved', 'rejected', 'superseded', 'void');
CREATE TYPE scope_decision_type AS ENUM ('approved', 'rejected', 'revision_requested');
CREATE TYPE decision_source_type AS ENUM ('client_review_link', 'admin_recorded_client_response', 'super_admin_override');
CREATE TYPE work_order_kind_type AS ENUM ('detailed', 'summary');
CREATE TYPE work_order_status_type AS ENUM ('approved', 'in_progress', 'delivered', 'completed', 'cancelled');
CREATE TYPE message_visibility_type AS ENUM ('internal', 'client_visible');
CREATE TYPE audit_source_type AS ENUM ('ui', 'edge_function', 'database_trigger', 'client_review');

-- 1. Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    default_timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 2. User Profiles
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_storage_path TEXT,
    account_status account_status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 3. User Roles
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    role user_role_type NOT NULL,
    assigned_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_user_org UNIQUE (user_id, organization_id)
);

-- 4. Clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    status client_status_type NOT NULL DEFAULT 'active',
    notes_internal TEXT,
    default_timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    created_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    archived_at TIMESTAMPTZ
);

-- 5. Client Contacts
CREATE TABLE client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    job_title TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 6. Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description_internal TEXT,
    status project_status_type NOT NULL DEFAULT 'active',
    owner_user_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    start_date DATE,
    target_due_date DATE,
    created_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    archived_at TIMESTAMPTZ
);

-- 7. Project Members (Internal assignments)
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    assignment_role TEXT NOT NULL DEFAULT 'contributor',
    assigned_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    removed_at TIMESTAMPTZ,
    CONSTRAINT uq_project_user_active UNIQUE (project_id, user_id)
);

-- 8. Project Financial Settings (Confidential: Admin & Super Admin only)
CREATE TABLE project_financial_settings (
    project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    internal_budget_hours NUMERIC(10, 2) CHECK (internal_budget_hours >= 0),
    internal_budget_amount_usd NUMERIC(12, 2) CHECK (internal_budget_amount_usd >= 0),
    internal_budget_amount_bdt NUMERIC(14, 2) CHECK (internal_budget_amount_bdt >= 0),
    internal_cost_rate_usd_per_hour NUMERIC(10, 2) CHECK (internal_cost_rate_usd_per_hour >= 0),
    internal_cost_rate_bdt_per_hour NUMERIC(10, 2) CHECK (internal_cost_rate_bdt_per_hour >= 0),
    client_rate_usd_per_hour NUMERIC(10, 2) CHECK (client_rate_usd_per_hour >= 0),
    client_rate_bdt_per_hour NUMERIC(10, 2) CHECK (client_rate_bdt_per_hour >= 0),
    currency_rate_mode TEXT NOT NULL DEFAULT 'independent_rates',
    updated_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 9. Conversations (One primary per project in MVP)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'primary',
    created_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    archived_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL
);

-- 10. Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    author_user_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    content_json JSONB NOT NULL,
    plain_text_search TEXT,
    event_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    visibility message_visibility_type NOT NULL DEFAULT 'internal'
);

-- 11. Message Revisions (Immutable audit of message edits)
CREATE TABLE message_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    revision_number INT NOT NULL,
    previous_content_json JSONB NOT NULL,
    new_content_json JSONB NOT NULL,
    changed_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    change_reason TEXT,
    CONSTRAINT uq_message_revision UNIQUE (message_id, revision_number)
);

-- 12. Message Attachments
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    storage_bucket TEXT NOT NULL DEFAULT 'attachments',
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    uploaded_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    deleted_at TIMESTAMPTZ
);

-- 13. Scope Packages (Initial scope or additional scope packages)
CREATE TABLE scope_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    package_kind package_kind_type NOT NULL DEFAULT 'initial',
    title TEXT NOT NULL,
    description_internal TEXT,
    parent_package_id UUID REFERENCES scope_packages(id) ON DELETE SET NULL,
    created_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    archived_at TIMESTAMPTZ
);

-- 14. Scope Versions (Immutable once sent)
CREATE TABLE scope_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_package_id UUID NOT NULL REFERENCES scope_packages(id) ON DELETE CASCADE,
    version_number INT NOT NULL CHECK (version_number >= 1),
    status scope_version_status_type NOT NULL DEFAULT 'draft',
    revision_type TEXT NOT NULL DEFAULT 'initial',
    scope_summary TEXT,
    assumptions TEXT,
    exclusions TEXT,
    internal_note TEXT,
    client_rate_usd_per_hour_snapshot NUMERIC(10, 2) CHECK (client_rate_usd_per_hour_snapshot >= 0),
    client_rate_bdt_per_hour_snapshot NUMERIC(10, 2) CHECK (client_rate_bdt_per_hour_snapshot >= 0),
    total_hours_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_hours_snapshot >= 0),
    total_usd_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_usd_snapshot >= 0),
    total_bdt_snapshot NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_bdt_snapshot >= 0),
    supersedes_version_id UUID REFERENCES scope_versions(id) ON DELETE SET NULL,
    created_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    sent_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ,
    event_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    revision_requested_at TIMESTAMPTZ,
    CONSTRAINT uq_package_version UNIQUE (scope_package_id, version_number)
);

-- 15. Scope Items
CREATE TABLE scope_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_version_id UUID NOT NULL REFERENCES scope_versions(id) ON DELETE CASCADE,
    position INT NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    description TEXT,
    hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (hours >= 0),
    is_billable BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 16. Scope Decisions (Client response / audit record)
CREATE TABLE scope_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_version_id UUID NOT NULL REFERENCES scope_versions(id) ON DELETE RESTRICT,
    decision scope_decision_type NOT NULL,
    decision_source decision_source_type NOT NULL,
    actor_user_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    client_contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
    client_display_name_snapshot TEXT,
    client_email_snapshot TEXT,
    comment TEXT,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    server_recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    ip_hash TEXT
);

-- 17. Scope Version Notes
CREATE TABLE scope_version_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_version_id UUID NOT NULL REFERENCES scope_versions(id) ON DELETE CASCADE,
    visibility message_visibility_type NOT NULL DEFAULT 'internal',
    author_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 18. Client Review Tokens (Cryptographic secure review links)
CREATE TABLE client_review_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_version_id UUID NOT NULL REFERENCES scope_versions(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    recipient_email TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    revoked_at TIMESTAMPTZ,
    first_accessed_at TIMESTAMPTZ,
    access_count INT NOT NULL DEFAULT 0
);

-- 19. Work Orders (Generated exclusively from approved scope versions)
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    scope_package_id UUID NOT NULL REFERENCES scope_packages(id) ON DELETE RESTRICT,
    approved_scope_version_id UUID NOT NULL REFERENCES scope_versions(id) ON DELETE RESTRICT,
    work_order_number TEXT NOT NULL UNIQUE,
    work_order_kind work_order_kind_type NOT NULL DEFAULT 'detailed',
    status work_order_status_type NOT NULL DEFAULT 'approved',
    hours_snapshot NUMERIC(10, 2) NOT NULL CHECK (hours_snapshot >= 0),
    total_usd_snapshot NUMERIC(12, 2) NOT NULL CHECK (total_usd_snapshot >= 0),
    total_bdt_snapshot NUMERIC(14, 2) NOT NULL CHECK (total_bdt_snapshot >= 0),
    generated_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    approved_at_snapshot TIMESTAMPTZ NOT NULL,
    delivered_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    document_storage_path TEXT,
    document_sha256 TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    archived_at TIMESTAMPTZ
);

-- 20. Work Order Items
CREATE TABLE work_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    source_scope_item_id UUID REFERENCES scope_items(id) ON DELETE SET NULL,
    position INT NOT NULL DEFAULT 0,
    title_snapshot TEXT NOT NULL,
    description_snapshot TEXT,
    hours_snapshot NUMERIC(10, 2) NOT NULL CHECK (hours_snapshot >= 0),
    rate_usd_snapshot NUMERIC(10, 2) CHECK (rate_usd_snapshot >= 0),
    rate_bdt_snapshot NUMERIC(10, 2) CHECK (rate_bdt_snapshot >= 0),
    line_total_usd_snapshot NUMERIC(12, 2) CHECK (line_total_usd_snapshot >= 0),
    line_total_bdt_snapshot NUMERIC(14, 2) CHECK (line_total_bdt_snapshot >= 0)
);

-- 21. Work Order Events
CREATE TABLE work_order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    actor_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    event_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    server_recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 22. Audit Events (Append-only forensic log)
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    actor_user_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    actor_role_snapshot user_role_type,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    before_state JSONB,
    after_state JSONB,
    reason TEXT,
    request_id TEXT,
    server_recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    source audit_source_type NOT NULL DEFAULT 'database_trigger'
);

-- 23. Notifications (Sanitized, member-safe payloads)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    payload_safe JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    read_at TIMESTAMPTZ
);

-- Indexes for performance & query isolation
CREATE INDEX idx_user_profiles_org ON user_profiles(organization_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_clients_org ON clients(organization_id);
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_project_members_proj ON project_members(project_id, user_id);
CREATE INDEX idx_conversations_proj ON conversations(project_id);
CREATE INDEX idx_messages_conv_created ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_event_at ON messages(event_at);
CREATE INDEX idx_scope_packages_proj ON scope_packages(project_id);
CREATE INDEX idx_scope_versions_pkg ON scope_versions(scope_package_id, status);
CREATE INDEX idx_scope_items_ver ON scope_items(scope_version_id, position);
CREATE INDEX idx_work_orders_proj ON work_orders(project_id);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_recorded ON audit_events(server_recorded_at DESC);
CREATE INDEX idx_client_review_tokens_hash ON client_review_tokens(token_hash);
