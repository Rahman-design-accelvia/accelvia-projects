-- supabase/clear_test_data.sql
-- Run this in the Supabase Dashboard SQL Editor to wipe all test business data
-- This retains the database schema, functions, triggers, and RLS policies.

BEGIN;

TRUNCATE TABLE 
    audit_events,
    notifications,
    work_order_events,
    work_order_items,
    work_orders,
    client_review_tokens,
    scope_version_notes,
    scope_decisions,
    scope_items,
    scope_versions,
    scope_packages,
    message_attachments,
    message_revisions,
    messages,
    conversations,
    project_financial_settings,
    project_members,
    projects,
    client_contacts,
    clients
CASCADE;

COMMIT;

-- Verify all business tables are empty
SELECT 
    (SELECT count(*) FROM clients) AS client_count,
    (SELECT count(*) FROM projects) AS project_count,
    (SELECT count(*) FROM messages) AS message_count,
    (SELECT count(*) FROM scope_versions) AS estimate_version_count,
    (SELECT count(*) FROM work_orders) AS work_order_count,
    (SELECT count(*) FROM audit_events) AS audit_event_count;
