-- supabase/seed.sql
-- Accelvia Work Management System — Development & Testing Seed Fixtures

DO $$
DECLARE
    v_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
    v_sa_id UUID := '11111111-1111-1111-1111-111111111111'::uuid;
    v_admin_id UUID := '22222222-2222-2222-2222-222222222222'::uuid;
    v_member_id UUID := '33333333-3333-3333-3333-333333333333'::uuid;
    v_client_id UUID := '44444444-4444-4444-4444-444444444444'::uuid;
    v_contact_id UUID := '55555555-5555-5555-5555-555555555555'::uuid;
    v_proj_id UUID := '66666666-6666-6666-6666-666666666666'::uuid;
    v_conv_id UUID := '77777777-7777-7777-7777-777777777777'::uuid;
    v_pkg_id UUID := '88888888-8888-8888-8888-888888888888'::uuid;
    v_ver_id UUID := '99999999-9999-9999-9999-999999999999'::uuid;
BEGIN
    -- 1. Organization
    INSERT INTO organizations (id, name, default_timezone)
    VALUES (v_org_id, 'Accelvia Global', 'Asia/Dhaka')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Mock auth users in auth.users (if table exists)
    BEGIN
        INSERT INTO auth.users (id, email) VALUES
        (v_sa_id, 'superadmin@accelvia.internal'),
        (v_admin_id, 'admin@accelvia.internal'),
        (v_member_id, 'member@accelvia.internal')
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 3. User Profiles
    INSERT INTO user_profiles (user_id, organization_id, display_name, email, account_status) VALUES
    (v_sa_id, v_org_id, 'Executive Director', 'superadmin@accelvia.internal', 'active'),
    (v_admin_id, v_org_id, 'Sarah Connor', 'admin@accelvia.internal', 'active'),
    (v_member_id, v_org_id, 'Dev Alex', 'member@accelvia.internal', 'active')
    ON CONFLICT (user_id) DO NOTHING;

    -- 4. User Roles
    INSERT INTO user_roles (user_id, organization_id, role, assigned_by) VALUES
    (v_sa_id, v_org_id, 'super_admin', v_sa_id),
    (v_admin_id, v_org_id, 'admin', v_sa_id),
    (v_member_id, v_org_id, 'member', v_sa_id)
    ON CONFLICT (user_id, organization_id) DO NOTHING;

    -- 5. Client
    INSERT INTO clients (id, organization_id, name, status, notes_internal, default_timezone, created_by)
    VALUES (v_client_id, v_org_id, 'TechSphere Dynamics Inc', 'active', 'Enterprise partner in New York', 'America/New_York', v_admin_id)
    ON CONFLICT (id) DO NOTHING;

    -- 6. Client Contact
    INSERT INTO client_contacts (id, client_id, name, email, job_title, is_primary)
    VALUES (v_contact_id, v_client_id, 'Robert Vance', 'robert@techspheredynamics.com', 'VP Engineering', true)
    ON CONFLICT (id) DO NOTHING;

    -- 7. Project
    INSERT INTO projects (id, organization_id, client_id, name, description_internal, status, timezone, created_by)
    VALUES (v_proj_id, v_org_id, v_client_id, 'Cloud Migration & Core Workflows', 'Phase 1 MVP architecture rollout', 'active', 'America/New_York', v_admin_id)
    ON CONFLICT (id) DO NOTHING;

    -- 8. Project Assignment (Assign member and admin)
    INSERT INTO project_members (project_id, user_id, assignment_role, assigned_by)
    VALUES (v_proj_id, v_member_id, 'lead_developer', v_admin_id)
    ON CONFLICT (project_id, user_id) DO NOTHING;

    -- 9. Project Financial Settings (Admin & SA only)
    INSERT INTO project_financial_settings (
        project_id,
        internal_budget_hours,
        internal_budget_amount_usd,
        internal_budget_amount_bdt,
        internal_cost_rate_usd_per_hour,
        internal_cost_rate_bdt_per_hour,
        client_rate_usd_per_hour,
        client_rate_bdt_per_hour
    ) VALUES (
        v_proj_id,
        120.00,
        6000.00,
        720000.00,
        25.00,
        3000.00,
        50.00,
        6000.00
    ) ON CONFLICT (project_id) DO NOTHING;

    -- 10. Primary Conversation
    INSERT INTO conversations (id, organization_id, project_id, kind, created_by)
    VALUES (v_conv_id, v_org_id, v_proj_id, 'primary', v_admin_id)
    ON CONFLICT (id) DO NOTHING;

    -- 11. Initial Scope Package
    INSERT INTO scope_packages (id, organization_id, project_id, package_kind, title, created_by)
    VALUES (v_pkg_id, v_org_id, v_proj_id, 'initial', 'Initial Architecture & Foundation Scope', v_admin_id)
    ON CONFLICT (id) DO NOTHING;

    -- 12. Scope Version (Approved version)
    INSERT INTO scope_versions (
        id,
        scope_package_id,
        version_number,
        status,
        client_rate_usd_per_hour_snapshot,
        client_rate_bdt_per_hour_snapshot,
        total_hours_snapshot,
        total_usd_snapshot,
        total_bdt_snapshot,
        created_by,
        sent_by,
        approved_at
    ) VALUES (
        v_ver_id,
        v_pkg_id,
        1,
        'approved',
        50.00,
        6000.00,
        80.00,
        4000.00,
        480000.00,
        v_admin_id,
        v_admin_id,
        clock_timestamp()
    ) ON CONFLICT (id) DO NOTHING;

    -- 13. Scope Items
    INSERT INTO scope_items (scope_version_id, position, title, description, hours) VALUES
    (v_ver_id, 0, 'Database Schema & Security RLS', 'PostgreSQL tables, triggers, and immutability', 30.00),
    (v_ver_id, 1, 'Three-Panel Workspace UI', 'React + TypeScript desktop workspace with live dual-timezone', 35.00),
    (v_ver_id, 2, 'Work Order Generator Engine', 'Automated PDF snapshot generator with verification', 15.00)
    ON CONFLICT (id) DO NOTHING;

END $$;
