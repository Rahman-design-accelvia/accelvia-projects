// src/types/index.ts
// Accelvia Work Management System — Core Domain Types

export type UserRole = 'super_admin' | 'admin' | 'member';
export type AccountStatus = 'active' | 'invited' | 'suspended' | 'deactivated';
export type ClientStatus = 'active' | 'lead' | 'archived';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';
export type PackageKind = 'initial' | 'additional';
export type ScopeVersionStatus = 
  | 'draft' 
  | 'pending' 
  | 'revision_requested' 
  | 'approved' 
  | 'rejected' 
  | 'superseded' 
  | 'void';

export type ScopeDecisionType = 'approved' | 'rejected' | 'revision_requested';
export type DecisionSource = 'client_review_link' | 'admin_recorded_client_response' | 'super_admin_override';
export type WorkOrderKind = 'detailed' | 'summary';
export type WorkOrderStatus = 'approved' | 'in_progress' | 'delivered' | 'completed' | 'cancelled';
export type MessageVisibility = 'internal' | 'client_visible';

export interface Organization {
  id: string;
  name: string;
  default_timezone: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  user_id: string;
  organization_id: string;
  display_name: string;
  email: string;
  avatar_storage_path?: string | null;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  assigned_by?: string | null;
  assigned_at: string;
}

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  status: ClientStatus;
  notes_internal?: string | null;
  default_timezone: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  contacts?: ClientContact[];
}

export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  email: string;
  phone?: string | null;
  job_title?: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  client_id?: string | null;
  name: string;
  description_internal?: string | null;
  status: ProjectStatus;
  owner_user_id?: string | null;
  timezone: string; // IANA name e.g. America/New_York
  start_date?: string | null;
  target_due_date?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  assignment_role: string;
  assigned_by?: string | null;
  assigned_at: string;
  removed_at?: string | null;
}

// Confidential: Restricted to Admin and Super Admin
export interface ProjectFinancialSettings {
  project_id: string;
  internal_budget_hours: number | null;
  internal_budget_amount_usd: number | null;
  internal_budget_amount_bdt: number | null;
  internal_cost_rate_usd_per_hour: number | null;
  internal_cost_rate_bdt_per_hour: number | null;
  client_rate_usd_per_hour: number | null;
  client_rate_bdt_per_hour: number | null;
  currency_rate_mode: string;
  updated_by?: string | null;
  updated_at: string;
}

export interface Conversation {
  id: string;
  organization_id: string;
  project_id: string;
  kind: 'primary';
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  storage_bucket: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by?: string | null;
  created_at: string;
  deleted_at?: string | null;
}

export interface SafeMessage {
  id: string;
  conversation_id: string;
  author_id: string | null; // Null if super_admin for non-SA callers
  author_name: string;      // 'Management' if super_admin
  author_is_management: boolean;
  content_json: Record<string, unknown>;
  event_at: string;         // Canonical ISO instant
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  is_deleted: boolean;
  attachments: MessageAttachment[];
  estimate_version_id?: string | null;
  estimate_card?: {
    version_id: string;
    package_title: string;
    version_number: number;
    total_hours: number;
    total_usd?: number | null;
    total_bdt?: number | null;
    status: ScopeVersionStatus;
    items?: Array<{ title: string; hours: number }>;
    approved_by_name?: string;
    approved_at?: string;
  } | null;
}

export interface ScopePackage {
  id: string;
  organization_id: string;
  project_id: string;
  package_kind: PackageKind;
  title: string;
  description_internal?: string | null;
  parent_package_id?: string | null;
  created_by?: string | null;
  created_at: string;
  archived_at?: string | null;
}

export interface ScopeItem {
  id: string;
  scope_version_id: string;
  position: number;
  title: string;
  description?: string | null;
  hours: number;
  is_billable: boolean;
  created_at: string;
}

export interface ScopeVersion {
  id: string;
  scope_package_id: string;
  version_number: number;
  status: ScopeVersionStatus;
  revision_type: string;
  scope_summary?: string | null;
  assumptions?: string | null;
  exclusions?: string | null;
  internal_note?: string | null;
  // Confidential financial fields (undefined for Member role)
  client_rate_usd_per_hour_snapshot?: number | null;
  client_rate_bdt_per_hour_snapshot?: number | null;
  total_hours_snapshot: number;
  total_usd_snapshot?: number | null;
  total_bdt_snapshot?: number | null;
  supersedes_version_id?: string | null;
  created_by?: string | null;
  created_at: string;
  sent_by?: string | null;
  sent_at?: string | null;
  event_at: string;
  approved_at?: string | null;
  rejected_at?: string | null;
  revision_requested_at?: string | null;
  items?: ScopeItem[];
}

export interface ScopeDecision {
  id: string;
  scope_version_id: string;
  decision: ScopeDecisionType;
  decision_source: DecisionSource;
  actor_user_id?: string | null;
  client_contact_id?: string | null;
  client_display_name_snapshot?: string | null;
  client_email_snapshot?: string | null;
  comment?: string | null;
  decided_at: string;
  server_recorded_at: string;
}

export interface WorkOrder {
  id: string;
  organization_id: string;
  project_id: string;
  scope_package_id: string;
  approved_scope_version_id: string;
  work_order_number: string;
  work_order_kind: WorkOrderKind;
  status: WorkOrderStatus;
  hours_snapshot: number;
  // Confidential financial fields (undefined for Member role)
  total_usd_snapshot?: number | null;
  total_bdt_snapshot?: number | null;
  generated_by?: string | null;
  generated_at: string;
  approved_at_snapshot: string;
  delivered_at?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  document_storage_path?: string | null;
  document_sha256?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderItem {
  id: string;
  work_order_id: string;
  source_scope_item_id?: string | null;
  position: number;
  title_snapshot: string;
  description_snapshot?: string | null;
  hours_snapshot: number;
  rate_usd_snapshot?: number | null;
  rate_bdt_snapshot?: number | null;
  line_total_usd_snapshot?: number | null;
  line_total_bdt_snapshot?: number | null;
}

export interface AuditEvent {
  id: string;
  organization_id: string;
  actor_user_id?: string | null;
  actor_role_snapshot?: UserRole | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  reason?: string | null;
  request_id?: string | null;
  server_recorded_at: string;
  source: string;
}
