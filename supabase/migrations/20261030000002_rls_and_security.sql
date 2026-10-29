-- 20261030000002_rls_and_security.sql
-- Accelvia Work Management System — Row Level Security and Identity Masking
-- Version: 1.0 (2026-10-30)

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER with strict search_path)
-- ============================================================================

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role_type
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    );
$$;

CREATE OR REPLACE FUNCTION is_admin_or_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION has_project_access(p_project_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT 
        is_admin_or_super_admin() 
        OR EXISTS (
            SELECT 1 FROM project_members 
            WHERE project_id = p_project_id 
              AND user_id = auth.uid() 
              AND removed_at IS NULL
        );
$$;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_version_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_review_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PREVENT DEMOTION / DELETION OF LAST SUPER ADMIN
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_check_last_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_active_super_admins INT;
BEGIN
    IF (TG_OP = 'DELETE' AND OLD.role = 'super_admin') 
       OR (TG_OP = 'UPDATE' AND OLD.role = 'super_admin' AND NEW.role <> 'super_admin') THEN
        SELECT COUNT(*) INTO v_active_super_admins
        FROM user_roles ur
        JOIN user_profiles up ON up.user_id = ur.user_id
        WHERE ur.role = 'super_admin' 
          AND up.account_status = 'active'
          AND ur.user_id <> OLD.user_id;

        IF v_active_super_admins < 1 THEN
            RAISE EXCEPTION 'Action rejected: System must retain at least one active Super Admin.';
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS ensure_last_super_admin ON user_roles;
CREATE TRIGGER ensure_last_super_admin
BEFORE UPDATE OR DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION trg_check_last_super_admin();

-- ============================================================================
-- AUDIT LOG IMMUTABILITY & AUTOMATED TRIGGER
-- ============================================================================

-- Audit table grants: strictly revoke UPDATE and DELETE from all
REVOKE UPDATE, DELETE ON audit_events FROM PUBLIC, authenticated;

CREATE OR REPLACE FUNCTION log_audit_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_role user_role_type;
    v_org_id UUID;
    v_entity_id UUID;
    v_action TEXT;
    v_before JSONB := NULL;
    v_after JSONB := NULL;
BEGIN
    v_actor_role := auth_user_role();
    v_action := TG_OP;

    IF TG_OP = 'DELETE' THEN
        v_entity_id := OLD.id;
        v_before := to_jsonb(OLD);
        v_org_id := COALESCE(OLD.organization_id, (SELECT organization_id FROM organizations LIMIT 1));
    ELSIF TG_OP = 'UPDATE' THEN
        v_entity_id := NEW.id;
        v_before := to_jsonb(OLD);
        v_after := to_jsonb(NEW);
        v_org_id := COALESCE(NEW.organization_id, OLD.organization_id);
    ELSE
        v_entity_id := NEW.id;
        v_after := to_jsonb(NEW);
        v_org_id := NEW.organization_id;
    END IF;

    -- Redact sensitive tokens/hashes if present
    IF v_before ? 'token_hash' THEN v_before := v_before - 'token_hash'; END IF;
    IF v_after ? 'token_hash' THEN v_after := v_after - 'token_hash'; END IF;

    INSERT INTO audit_events (
        organization_id,
        actor_user_id,
        actor_role_snapshot,
        entity_type,
        entity_id,
        action,
        before_state,
        after_state,
        source
    ) VALUES (
        v_org_id,
        auth.uid(),
        v_actor_role,
        TG_TABLE_NAME,
        v_entity_id,
        v_action,
        v_before,
        v_after,
        'database_trigger'
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_messages_trg AFTER UPDATE OR DELETE ON messages FOR EACH ROW EXECUTE FUNCTION log_audit_change();
CREATE TRIGGER audit_scope_versions_trg AFTER UPDATE ON scope_versions FOR EACH ROW EXECUTE FUNCTION log_audit_change();
CREATE TRIGGER audit_financial_settings_trg AFTER UPDATE ON project_financial_settings FOR EACH ROW EXECUTE FUNCTION log_audit_change();
CREATE TRIGGER audit_work_orders_trg AFTER UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION log_audit_change();
CREATE TRIGGER audit_user_roles_trg AFTER INSERT OR UPDATE OR DELETE ON user_roles FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- 1. Organizations: Viewable by authenticated users in that org
CREATE POLICY "org_view" ON organizations FOR SELECT TO authenticated
USING (id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()));

-- 2. User Profiles:
-- Super Admin can see all.
-- Non-Super Admins can see user profiles EXCEPT super_admin profiles (Super Admin Identity Masking).
CREATE POLICY "profiles_select_super_admin" ON user_profiles FOR SELECT TO authenticated
USING (
    is_super_admin() 
    OR user_id = auth.uid()
    OR (
        NOT EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = user_profiles.user_id 
              AND ur.role = 'super_admin'
        )
    )
);

CREATE POLICY "profiles_update_own" ON user_profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. User Roles:
-- Strictly viewable and manageable by Super Admin only.
CREATE POLICY "roles_super_admin_all" ON user_roles FOR ALL TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- 4. Clients:
-- Admins and Super Admins can manage all clients. Members cannot read client notes or full client table.
CREATE POLICY "clients_admin_all" ON clients FOR ALL TO authenticated
USING (is_admin_or_super_admin())
WITH CHECK (is_admin_or_super_admin());

CREATE POLICY "clients_member_select" ON clients FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects p
        JOIN project_members pm ON pm.project_id = p.id
        WHERE p.client_id = clients.id
          AND pm.user_id = auth.uid()
          AND pm.removed_at IS NULL
    )
);

-- 5. Client Contacts:
CREATE POLICY "client_contacts_admin_all" ON client_contacts FOR ALL TO authenticated
USING (is_admin_or_super_admin())
WITH CHECK (is_admin_or_super_admin());

-- 6. Projects:
CREATE POLICY "projects_admin_all" ON projects FOR ALL TO authenticated
USING (is_admin_or_super_admin())
WITH CHECK (is_admin_or_super_admin());

CREATE POLICY "projects_member_select" ON projects FOR SELECT TO authenticated
USING (has_project_access(id) AND archived_at IS NULL);

-- 7. Project Members:
-- Admins and Super Admins can view/manage assignments.
-- Members CANNOT query the participant roster of others.
CREATE POLICY "project_members_admin" ON project_members FOR ALL TO authenticated
USING (is_admin_or_super_admin())
WITH CHECK (is_admin_or_super_admin());

CREATE POLICY "project_members_self_read" ON project_members FOR SELECT TO authenticated
USING (user_id = auth.uid() AND removed_at IS NULL);

-- 8. Project Financial Settings:
-- STRICTLY Admin & Super Admin ONLY!
CREATE POLICY "financial_settings_admin_only" ON project_financial_settings FOR ALL TO authenticated
USING (is_admin_or_super_admin())
WITH CHECK (is_admin_or_super_admin());

-- 9. Conversations:
CREATE POLICY "conversations_admin_all" ON conversations FOR ALL TO authenticated
USING (is_admin_or_super_admin())
WITH CHECK (is_admin_or_super_admin());

CREATE POLICY "conversations_member_select" ON conversations FOR SELECT TO authenticated
USING (has_project_access(project_id) AND deleted_at IS NULL);

-- 10. Messages:
CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated
USING (
    has_project_access((SELECT project_id FROM conversations WHERE id = messages.conversation_id))
    AND (deleted_at IS NULL OR is_super_admin())
);

CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated
WITH CHECK (
    has_project_access((SELECT project_id FROM conversations WHERE id = conversation_id))
    AND author_user_id = auth.uid()
);

CREATE POLICY "messages_update" ON messages FOR UPDATE TO authenticated
USING (
    (author_user_id = auth.uid() AND deleted_at IS NULL)
    OR is_super_admin()
)
WITH CHECK (
    (author_user_id = auth.uid() AND deleted_at IS NULL)
    OR is_super_admin()
);

-- 11. Message Revisions: Strictly Super Admin audit surface
CREATE POLICY "revisions_super_admin_only" ON message_revisions FOR SELECT TO authenticated
USING (is_super_admin());

-- 12. Message Attachments:
CREATE POLICY "attachments_select" ON message_attachments FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM messages m
        WHERE m.id = message_attachments.message_id
          AND has_project_access((SELECT project_id FROM conversations WHERE id = m.conversation_id))
    )
);

CREATE POLICY "attachments_insert" ON message_attachments FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid());

-- 13. Scope Packages & Items:
CREATE POLICY "scope_packages_admin_all" ON scope_packages FOR ALL TO authenticated
USING (is_admin_or_super_admin())
WITH CHECK (is_admin_or_super_admin());

CREATE POLICY "scope_packages_member_select" ON scope_packages FOR SELECT TO authenticated
USING (has_project_access(project_id));

CREATE POLICY "scope_items_admin_all" ON scope_items FOR ALL TO authenticated
USING (is_admin_or_super_admin())
WITH CHECK (is_admin_or_super_admin());

CREATE POLICY "scope_items_member_select" ON scope_items FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM scope_versions sv
        JOIN scope_packages sp ON sp.id = sv.scope_package_id
        WHERE sv.id = scope_items.scope_version_id
          AND has_project_access(sp.project_id)
    )
);

-- 14. Scope Versions:
CREATE POLICY "scope_versions_admin_all" ON scope_versions FOR ALL TO authenticated
USING (is_admin_or_super_admin())
WITH CHECK (is_admin_or_super_admin());

CREATE POLICY "scope_versions_member_select" ON scope_versions FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM scope_packages sp
        WHERE sp.id = scope_versions.scope_package_id
          AND has_project_access(sp.project_id)
    )
);

-- 15. Work Orders:
CREATE POLICY "work_orders_admin_all" ON work_orders FOR ALL TO authenticated
USING (is_admin_or_super_admin())
WITH CHECK (is_admin_or_super_admin());

CREATE POLICY "work_orders_member_select" ON work_orders FOR SELECT TO authenticated
USING (has_project_access(project_id));

-- 16. Audit Events:
-- Super Admin ONLY!
CREATE POLICY "audit_events_super_admin_select" ON audit_events FOR SELECT TO authenticated
USING (is_super_admin());

-- 17. Notifications:
CREATE POLICY "notifications_own" ON notifications FOR ALL TO authenticated
USING (recipient_user_id = auth.uid())
WITH CHECK (recipient_user_id = auth.uid());
