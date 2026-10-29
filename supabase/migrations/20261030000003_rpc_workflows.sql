-- 20261030000003_rpc_workflows.sql
-- Accelvia Work Management System — Atomic Workflows and Secure RPCs
-- Version: 1.0 (2026-10-30)

-- ============================================================================
-- 1. SAFE MESSAGE RETRIEVAL (Masks Super Admin identity)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_conversation_messages_safe(p_conversation_id UUID)
RETURNS TABLE (
    id UUID,
    conversation_id UUID,
    author_id UUID,
    author_name TEXT,
    author_is_management BOOLEAN,
    content_json JSONB,
    event_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_edited BOOLEAN,
    is_deleted BOOLEAN,
    attachments JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_is_sa BOOLEAN;
    v_proj_id UUID;
BEGIN
    SELECT project_id INTO v_proj_id FROM conversations WHERE id = p_conversation_id;
    IF v_proj_id IS NULL OR NOT has_project_access(v_proj_id) THEN
        RAISE EXCEPTION 'Access denied to this conversation.';
    END IF;

    v_is_sa := is_super_admin();

    RETURN QUERY
    SELECT 
        m.id,
        m.conversation_id,
        CASE 
            WHEN v_is_sa THEN m.author_user_id
            WHEN ur.role = 'super_admin' THEN NULL::UUID
            ELSE m.author_user_id
        END AS author_id,
        CASE 
            WHEN ur.role = 'super_admin' THEN 'Management'
            ELSE COALESCE(up.display_name, 'Unknown')
        END AS author_name,
        (ur.role = 'super_admin') AS author_is_management,
        CASE 
            WHEN m.deleted_at IS NOT NULL AND NOT v_is_sa THEN '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "[Message deleted]"}]}]}'::jsonb
            ELSE m.content_json
        END AS content_json,
        m.event_at,
        m.created_at,
        m.updated_at,
        (m.updated_at > m.created_at) AS is_edited,
        (m.deleted_at IS NOT NULL) AS is_deleted,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', a.id,
                        'original_filename', a.original_filename,
                        'storage_path', a.storage_path,
                        'mime_type', a.mime_type,
                        'size_bytes', a.size_bytes
                    )
                )
                FROM message_attachments a 
                WHERE a.message_id = m.id AND a.deleted_at IS NULL
            ), 
            '[]'::jsonb
        ) AS attachments
    FROM messages m
    LEFT JOIN user_profiles up ON up.user_id = m.author_user_id
    LEFT JOIN user_roles ur ON ur.user_id = m.author_user_id
    WHERE m.conversation_id = p_conversation_id
      AND (m.deleted_at IS NULL OR v_is_sa)
    ORDER BY m.event_at ASC;
END;
$$;

-- ============================================================================
-- 2. CREATE ESTIMATE DRAFT
-- ============================================================================

CREATE OR REPLACE FUNCTION create_estimate_draft(
    p_project_id UUID,
    p_title TEXT,
    p_items JSONB, -- Array of {title: string, description?: string, hours: number}
    p_scope_package_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_pkg_id UUID := p_scope_package_id;
    v_version_id UUID;
    v_version_num INT := 1;
    v_org_id UUID;
    v_item RECORD;
    v_rate_usd NUMERIC(10, 2) := 0.00;
    v_rate_bdt NUMERIC(10, 2) := 0.00;
    v_pos INT := 0;
BEGIN
    IF NOT is_admin_or_super_admin() THEN
        RAISE EXCEPTION 'Only Admins and Super Admins can create estimates.';
    END IF;

    SELECT organization_id INTO v_org_id FROM projects WHERE id = p_project_id;
    IF v_org_id IS NULL THEN RAISE EXCEPTION 'Project not found.'; END IF;

    -- Fetch current project financial settings
    SELECT 
        COALESCE(client_rate_usd_per_hour, 0.00),
        COALESCE(client_rate_bdt_per_hour, 0.00)
    INTO v_rate_usd, v_rate_bdt
    FROM project_financial_settings
    WHERE project_id = p_project_id;

    -- If no package provided, create initial scope package
    IF v_pkg_id IS NULL THEN
        INSERT INTO scope_packages (
            organization_id,
            project_id,
            package_kind,
            title,
            created_by
        ) VALUES (
            v_org_id,
            p_project_id,
            'initial',
            p_title,
            auth.uid()
        ) RETURNING id INTO v_pkg_id;
    ELSE
        SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_num
        FROM scope_versions WHERE scope_package_id = v_pkg_id;
    END IF;

    INSERT INTO scope_versions (
        scope_package_id,
        version_number,
        status,
        client_rate_usd_per_hour_snapshot,
        client_rate_bdt_per_hour_snapshot,
        created_by,
        created_at,
        event_at
    ) VALUES (
        v_pkg_id,
        v_version_num,
        'draft',
        v_rate_usd,
        v_rate_bdt,
        auth.uid(),
        clock_timestamp(),
        clock_timestamp()
    ) RETURNING id INTO v_version_id;

    -- Insert items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(title TEXT, description TEXT, hours NUMERIC)
    LOOP
        INSERT INTO scope_items (
            scope_version_id,
            position,
            title,
            description,
            hours
        ) VALUES (
            v_version_id,
            v_pos,
            v_item.title,
            v_item.description,
            COALESCE(v_item.hours, 0.00)
        );
        v_pos := v_pos + 1;
    END LOOP;

    RETURN v_version_id;
END;
$$;

-- ============================================================================
-- 3. SEND ESTIMATE VERSION (Snapshots and locks)
-- ============================================================================

CREATE OR REPLACE FUNCTION send_estimate_version(
    p_version_id UUID,
    p_recipient_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ver RECORD;
    v_tot_hours NUMERIC(10, 2);
    v_tot_usd NUMERIC(12, 2);
    v_tot_bdt NUMERIC(14, 2);
    v_raw_token TEXT;
    v_token_hash TEXT;
    v_token_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    IF NOT is_admin_or_super_admin() THEN
        RAISE EXCEPTION 'Only Admins and Super Admins can send estimates.';
    END IF;

    SELECT * INTO v_ver FROM scope_versions WHERE id = p_version_id;
    IF v_ver.id IS NULL THEN RAISE EXCEPTION 'Scope version not found.'; END IF;
    IF v_ver.status <> 'draft' THEN RAISE EXCEPTION 'Only draft versions can be sent.'; END IF;

    -- Calculate total hours from line items
    SELECT COALESCE(SUM(hours), 0.00) INTO v_tot_hours
    FROM scope_items WHERE scope_version_id = p_version_id;

    -- Server authoritative parallel currency calculation
    v_tot_usd := ROUND(v_tot_hours * COALESCE(v_ver.client_rate_usd_per_hour_snapshot, 0.00), 2);
    v_tot_bdt := ROUND(v_tot_hours * COALESCE(v_ver.client_rate_bdt_per_hour_snapshot, 0.00), 2);

    -- Update scope version to pending with immutable snapshots
    UPDATE scope_versions SET
        status = 'pending',
        total_hours_snapshot = v_tot_hours,
        total_usd_snapshot = v_tot_usd,
        total_bdt_snapshot = v_tot_bdt,
        sent_by = auth.uid(),
        sent_at = clock_timestamp()
    WHERE id = p_version_id;

    -- Generate secure client review token (64 hex characters from 32 cryptographically random bytes)
    v_raw_token := encode(gen_random_bytes(32), 'hex');
    v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');
    v_expires_at := clock_timestamp() + interval '7 days';

    INSERT INTO client_review_tokens (
        scope_version_id,
        token_hash,
        recipient_email,
        expires_at
    ) VALUES (
        p_version_id,
        v_token_hash,
        p_recipient_email,
        v_expires_at
    ) RETURNING id INTO v_token_id;

    RETURN jsonb_build_object(
        'version_id', p_version_id,
        'status', 'pending',
        'raw_token', v_raw_token,
        'expires_at', v_expires_at,
        'total_hours', v_tot_hours,
        'total_usd', v_tot_usd,
        'total_bdt', v_tot_bdt
    );
END;
$$;

-- ============================================================================
-- 4. SUBMIT CLIENT SCOPE DECISION (Secure, idempotent client approval)
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_client_scope_decision(
    p_raw_token TEXT,
    p_decision scope_decision_type,
    p_client_name TEXT,
    p_client_email TEXT,
    p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_token_hash TEXT;
    v_token RECORD;
    v_version RECORD;
    v_existing_decision RECORD;
    v_decision_id UUID;
BEGIN
    v_token_hash := encode(digest(p_raw_token, 'sha256'), 'hex');

    SELECT * INTO v_token 
    FROM client_review_tokens 
    WHERE token_hash = v_token_hash;

    IF v_token.id IS NULL THEN
        RAISE EXCEPTION 'Invalid review token.';
    END IF;

    IF v_token.revoked_at IS NOT NULL OR v_token.expires_at < clock_timestamp() THEN
        RAISE EXCEPTION 'This review link has expired or been revoked.';
    END IF;

    SELECT * INTO v_version 
    FROM scope_versions 
    WHERE id = v_token.scope_version_id;

    -- Idempotency check: if decision already recorded for this version
    SELECT * INTO v_existing_decision 
    FROM scope_decisions 
    WHERE scope_version_id = v_version.id;

    IF v_existing_decision.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Decision was already recorded.',
            'decision', v_existing_decision.decision,
            'decided_at', v_existing_decision.decided_at
        );
    END IF;

    IF v_version.status <> 'pending' THEN
        RAISE EXCEPTION 'Scope version is not in pending status (Current: %)', v_version.status;
    END IF;

    -- Record decision
    INSERT INTO scope_decisions (
        scope_version_id,
        decision,
        decision_source,
        client_display_name_snapshot,
        client_email_snapshot,
        comment,
        decided_at,
        server_recorded_at
    ) VALUES (
        v_version.id,
        p_decision,
        'client_review_link',
        p_client_name,
        p_client_email,
        p_comment,
        clock_timestamp(),
        clock_timestamp()
    ) RETURNING id INTO v_decision_id;

    -- Transition scope version status
    IF p_decision = 'approved' THEN
        -- Supersede any previously approved version in this same package
        UPDATE scope_versions 
        SET status = 'superseded'
        WHERE scope_package_id = v_version.scope_package_id
          AND status = 'approved'
          AND id <> v_version.id;

        UPDATE scope_versions 
        SET status = 'approved', approved_at = clock_timestamp()
        WHERE id = v_version.id;
    ELSIF p_decision = 'rejected' THEN
        UPDATE scope_versions 
        SET status = 'rejected', rejected_at = clock_timestamp()
        WHERE id = v_version.id;
    ELSIF p_decision = 'revision_requested' THEN
        UPDATE scope_versions 
        SET status = 'revision_requested', revision_requested_at = clock_timestamp()
        WHERE id = v_version.id;
    END IF;

    -- Revoke token after use
    UPDATE client_review_tokens 
    SET revoked_at = clock_timestamp(), access_count = access_count + 1
    WHERE id = v_token.id;

    RETURN jsonb_build_object(
        'success', true,
        'decision_id', v_decision_id,
        'decision', p_decision,
        'version_id', v_version.id
    );
END;
$$;

-- ============================================================================
-- 5. GENERATE WORK ORDER (From approved version)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_work_order(
    p_scope_version_id UUID,
    p_kind work_order_kind_type DEFAULT 'detailed'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ver RECORD;
    v_pkg RECORD;
    v_wo_id UUID;
    v_wo_num TEXT;
    v_seq INT;
    v_item RECORD;
BEGIN
    IF NOT is_admin_or_super_admin() THEN
        RAISE EXCEPTION 'Only Admins and Super Admins can generate work orders.';
    END IF;

    SELECT * INTO v_ver FROM scope_versions WHERE id = p_scope_version_id;
    IF v_ver.id IS NULL THEN RAISE EXCEPTION 'Scope version not found.'; END IF;
    IF v_ver.status <> 'approved' THEN RAISE EXCEPTION 'Work orders can only be generated from approved scope versions.'; END IF;

    SELECT * INTO v_pkg FROM scope_packages WHERE id = v_ver.scope_package_id;

    -- Generate unique human-readable work order number: WO-YYYYMMDD-XXXX
    SELECT COUNT(*) + 1 INTO v_seq 
    FROM work_orders 
    WHERE created_at >= date_trunc('day', clock_timestamp());

    v_wo_num := 'WO-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');

    INSERT INTO work_orders (
        organization_id,
        project_id,
        scope_package_id,
        approved_scope_version_id,
        work_order_number,
        work_order_kind,
        status,
        hours_snapshot,
        total_usd_snapshot,
        total_bdt_snapshot,
        generated_by,
        generated_at,
        approved_at_snapshot
    ) VALUES (
        v_pkg.organization_id,
        v_pkg.project_id,
        v_pkg.id,
        v_ver.id,
        v_wo_num,
        p_kind,
        'approved',
        v_ver.total_hours_snapshot,
        v_ver.total_usd_snapshot,
        v_ver.total_bdt_snapshot,
        auth.uid(),
        clock_timestamp(),
        v_ver.approved_at
    ) RETURNING id INTO v_wo_id;

    -- Copy items into immutable snapshot
    FOR v_item IN SELECT * FROM scope_items WHERE scope_version_id = v_ver.id ORDER BY position ASC
    LOOP
        INSERT INTO work_order_items (
            work_order_id,
            source_scope_item_id,
            position,
            title_snapshot,
            description_snapshot,
            hours_snapshot,
            rate_usd_snapshot,
            rate_bdt_snapshot,
            line_total_usd_snapshot,
            line_total_bdt_snapshot
        ) VALUES (
            v_wo_id,
            v_item.id,
            v_item.position,
            v_item.title,
            v_item.description,
            v_item.hours,
            v_ver.client_rate_usd_per_hour_snapshot,
            v_ver.client_rate_bdt_per_hour_snapshot,
            ROUND(v_item.hours * COALESCE(v_ver.client_rate_usd_per_hour_snapshot, 0.00), 2),
            ROUND(v_item.hours * COALESCE(v_ver.client_rate_bdt_per_hour_snapshot, 0.00), 2)
        );
    END LOOP;

    RETURN v_wo_id;
END;
$$;

-- ============================================================================
-- 6. HISTORICAL EVENT TIME CORRECTION (Super Admin Only, Audited)
-- ============================================================================

CREATE OR REPLACE FUNCTION correct_event_timestamp(
    p_entity_type TEXT,
    p_entity_id UUID,
    p_new_event_at TIMESTAMPTZ,
    p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old_event_at TIMESTAMPTZ;
    v_org_id UUID;
BEGIN
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Only Super Admins can perform historical event time corrections.';
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'A valid correction reason is required.';
    END IF;

    IF p_entity_type = 'messages' THEN
        SELECT event_at, organization_id INTO v_old_event_at, v_org_id FROM messages WHERE id = p_entity_id;
        IF v_old_event_at IS NULL THEN RAISE EXCEPTION 'Message not found.'; END IF;

        UPDATE messages SET event_at = p_new_event_at WHERE id = p_entity_id;
    ELSIF p_entity_type = 'scope_versions' THEN
        SELECT event_at, sp.organization_id INTO v_old_event_at, v_org_id 
        FROM scope_versions sv
        JOIN scope_packages sp ON sp.id = sv.scope_package_id
        WHERE sv.id = p_entity_id;
        IF v_old_event_at IS NULL THEN RAISE EXCEPTION 'Scope version not found.'; END IF;

        UPDATE scope_versions SET event_at = p_new_event_at WHERE id = p_entity_id;
    ELSE
        RAISE EXCEPTION 'Historical correction not supported for entity type %', p_entity_type;
    END IF;

    -- Record privileged correction in append-only audit log
    INSERT INTO audit_events (
        organization_id,
        actor_user_id,
        actor_role_snapshot,
        entity_type,
        entity_id,
        action,
        before_state,
        after_state,
        reason,
        source
    ) VALUES (
        v_org_id,
        auth.uid(),
        'super_admin',
        p_entity_type,
        p_entity_id,
        'CORRECT_EVENT_TIMESTAMP',
        jsonb_build_object('event_at', v_old_event_at),
        jsonb_build_object('event_at', p_new_event_at),
        p_reason,
        'ui'
    );

    RETURN true;
END;
$$;
