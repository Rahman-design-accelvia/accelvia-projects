// src/lib/supabase/client.ts
// Supabase client initialization with local state fallback for development & offline testing

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  UserProfile, 
  Client, 
  Project, 
  ProjectFinancialSettings, 
  SafeMessage, 
  ScopePackage, 
  ScopeVersion, 
  WorkOrder, 
  AuditEvent 
} from '../../types';

const supabaseUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://vldeebwyoezoluptmnoh.supabase.co';
const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_XkFrqe5gtrOvcoBjh3z8YA_OKs-giVO';

export const isSupabaseConfigured = 
  Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'));

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// IN-MEMORY SEED DATA FOR LOCAL DEV & PREVIEWS
// ============================================================================

export const SEED_USERS: Record<string, UserProfile & { role: 'super_admin' | 'admin' | 'member' }> = {
  'sa-1': {
    user_id: 'sa-1',
    organization_id: 'org-1',
    display_name: 'Executive Director',
    email: 'superadmin@accelvia.internal',
    account_status: 'active',
    role: 'super_admin',
    created_at: '2026-10-30T00:00:00Z',
    updated_at: '2026-10-30T00:00:00Z',
  },
  'admin-1': {
    user_id: 'admin-1',
    organization_id: 'org-1',
    display_name: 'Sarah Connor',
    email: 'admin@accelvia.internal',
    account_status: 'active',
    role: 'admin',
    created_at: '2026-10-30T00:00:00Z',
    updated_at: '2026-10-30T00:00:00Z',
  },
  'member-1': {
    user_id: 'member-1',
    organization_id: 'org-1',
    display_name: 'Dev Alex',
    email: 'member@accelvia.internal',
    account_status: 'active',
    role: 'member',
    created_at: '2026-10-30T00:00:00Z',
    updated_at: '2026-10-30T00:00:00Z',
  },
};

export const SEED_CLIENTS: Client[] = [
  {
    id: 'client-1',
    organization_id: 'org-1',
    name: 'TechSphere Dynamics Inc',
    status: 'active',
    notes_internal: 'Enterprise client in New York. Contract rates locked until Q4 2027.',
    default_timezone: 'America/New_York',
    created_at: '2026-10-25T14:00:00Z',
    updated_at: '2026-10-25T14:00:00Z',
  },
  {
    id: 'client-2',
    organization_id: 'org-1',
    name: 'Nordic Wave Labs',
    status: 'active',
    notes_internal: 'Stockholm fintech partner. Strict delivery timeline.',
    default_timezone: 'Europe/Stockholm',
    created_at: '2026-10-26T10:00:00Z',
    updated_at: '2026-10-26T10:00:00Z',
  },
];

export const SEED_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    organization_id: 'org-1',
    client_id: 'client-1',
    name: 'Cloud Migration & Core Workflows',
    description_internal: 'Migrating legacy monolithic workloads to event-driven Postgres & React architecture.',
    status: 'active',
    timezone: 'America/New_York',
    start_date: '2026-11-01',
    target_due_date: '2026-12-15',
    created_at: '2026-10-26T12:00:00Z',
    updated_at: '2026-10-26T12:00:00Z',
  },
  {
    id: 'proj-2',
    organization_id: 'org-1',
    client_id: 'client-2',
    name: 'High-Frequency Billing Pipeline',
    description_internal: 'Micro-transaction settlement system with multi-currency reconciliation.',
    status: 'active',
    timezone: 'Europe/Stockholm',
    start_date: '2026-11-10',
    target_due_date: '2027-01-30',
    created_at: '2026-10-28T09:00:00Z',
    updated_at: '2026-10-28T09:00:00Z',
  },
];

export const SEED_FINANCIALS: Record<string, ProjectFinancialSettings> = {
  'proj-1': {
    project_id: 'proj-1',
    internal_budget_hours: 120.0,
    internal_budget_amount_usd: 6000.0,
    internal_budget_amount_bdt: 720000.0,
    internal_cost_rate_usd_per_hour: 25.0,
    internal_cost_rate_bdt_per_hour: 3000.0,
    client_rate_usd_per_hour: 50.0,
    client_rate_bdt_per_hour: 6000.0,
    currency_rate_mode: 'independent_rates',
    updated_at: '2026-10-26T12:00:00Z',
  },
  'proj-2': {
    project_id: 'proj-2',
    internal_budget_hours: 200.0,
    internal_budget_amount_usd: 14000.0,
    internal_budget_amount_bdt: 1680000.0,
    internal_cost_rate_usd_per_hour: 35.0,
    internal_cost_rate_bdt_per_hour: 4200.0,
    client_rate_usd_per_hour: 70.0,
    client_rate_bdt_per_hour: 8400.0,
    currency_rate_mode: 'independent_rates',
    updated_at: '2026-10-28T09:00:00Z',
  },
};

export const SEED_MESSAGES: SafeMessage[] = [
  {
    id: 'msg-1',
    conversation_id: 'conv-1',
    author_id: 'admin-1',
    author_name: 'Sarah Connor',
    author_is_management: false,
    content_json: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Welcome team! We had our scoping session with TechSphere. We need to complete the schema design, security isolation, and work order PDF engine.',
            },
          ],
        },
      ],
    },
    event_at: '2026-10-29T14:30:00Z',
    created_at: '2026-10-29T14:30:00Z',
    updated_at: '2026-10-29T14:30:00Z',
    is_edited: false,
    is_deleted: false,
    attachments: [],
  },
  {
    id: 'msg-2',
    conversation_id: 'conv-1',
    author_id: 'sa-1', // Will be masked as 'Management' when viewed by Admin/Member
    author_name: 'Executive Director',
    author_is_management: true,
    content_json: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Note from Leadership: Ensure all financial calculations are strictly verified on the PostgreSQL layer and that audit logging is active for every change.',
            },
          ],
        },
      ],
    },
    event_at: '2026-10-29T16:00:00Z',
    created_at: '2026-10-29T16:00:00Z',
    updated_at: '2026-10-29T16:00:00Z',
    is_edited: false,
    is_deleted: false,
    attachments: [],
  },
  {
    id: 'msg-3',
    conversation_id: 'conv-1',
    author_id: 'member-1',
    author_name: 'Dev Alex',
    author_is_management: false,
    content_json: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Understood. Initial Scope estimate with 80 hours total is drafted and ready for review.',
            },
          ],
        },
      ],
    },
    event_at: '2026-10-29T18:15:00Z',
    created_at: '2026-10-29T18:15:00Z',
    updated_at: '2026-10-29T18:15:00Z',
    is_edited: false,
    is_deleted: false,
    attachments: [],
  },
  {
    id: 'msg-4',
    conversation_id: 'conv-1',
    author_id: 'admin-1',
    author_name: 'Sarah Connor',
    author_is_management: false,
    content_json: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Here is the estimate proposal for the Initial Build Scope (80.00 hrs) sent to the client. You can review the scope line items and approve it directly below.',
            },
          ],
        },
      ],
    },
    event_at: '2026-10-30T01:00:00Z',
    created_at: '2026-10-30T01:00:00Z',
    updated_at: '2026-10-30T01:00:00Z',
    is_edited: false,
    is_deleted: false,
    attachments: [],
    estimate_version_id: 'ver-1',
    estimate_card: {
      version_id: 'ver-1',
      package_title: 'Initial Build & Architecture Scope',
      version_number: 1,
      total_hours: 80.0,
      total_usd: 4000.0,
      total_bdt: 480000.0,
      status: 'pending',
      items: [
        { title: 'Database Schema & Security RLS', hours: 30.0 },
        { title: 'Three-Panel Workspace UI', hours: 35.0 },
        { title: 'Work Order Generator Engine', hours: 15.0 },
      ],
    },
  },
];

export const SEED_PACKAGES: ScopePackage[] = [
  {
    id: 'pkg-1',
    organization_id: 'org-1',
    project_id: 'proj-1',
    package_kind: 'initial',
    title: 'Initial Build & Architecture Scope',
    created_at: '2026-10-28T10:00:00Z',
  },
];

export const SEED_VERSIONS: ScopeVersion[] = [
  {
    id: 'ver-1',
    scope_package_id: 'pkg-1',
    version_number: 1,
    status: 'pending',
    revision_type: 'initial',
    scope_summary: 'PostgreSQL schema, three-panel UI, dual-timezone display, and work order generation.',
    client_rate_usd_per_hour_snapshot: 50.0,
    client_rate_bdt_per_hour_snapshot: 6000.0,
    total_hours_snapshot: 80.0,
    total_usd_snapshot: 4000.0,
    total_bdt_snapshot: 480000.0,
    created_at: '2026-10-28T10:30:00Z',
    sent_at: '2026-10-28T11:00:00Z',
    event_at: '2026-10-28T11:00:00Z',
    items: [
      {
        id: 'item-1',
        scope_version_id: 'ver-1',
        position: 0,
        title: 'Database Schema & Security RLS',
        description: 'PostgreSQL tables, triggers, and immutability',
        hours: 30.0,
        is_billable: true,
        created_at: '2026-10-28T10:30:00Z',
      },
      {
        id: 'item-2',
        scope_version_id: 'ver-1',
        position: 1,
        title: 'Three-Panel Workspace UI',
        description: 'React + TypeScript desktop workspace with live dual-timezone',
        hours: 35.0,
        is_billable: true,
        created_at: '2026-10-28T10:30:00Z',
      },
      {
        id: 'item-3',
        scope_version_id: 'ver-1',
        position: 2,
        title: 'Work Order Generator Engine',
        description: 'Automated PDF snapshot generator with verification',
        hours: 15.0,
        is_billable: true,
        created_at: '2026-10-28T10:30:00Z',
      },
    ],
  },
];

export const SEED_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'wo-1',
    organization_id: 'org-1',
    project_id: 'proj-1',
    scope_package_id: 'pkg-1',
    approved_scope_version_id: 'ver-1',
    work_order_number: 'WO-20261029-0001',
    work_order_kind: 'detailed',
    status: 'in_progress',
    hours_snapshot: 80.0,
    total_usd_snapshot: 4000.0,
    total_bdt_snapshot: 480000.0,
    generated_at: '2026-10-29T15:30:00Z',
    approved_at_snapshot: '2026-10-29T15:00:00Z',
    created_at: '2026-10-29T15:30:00Z',
    updated_at: '2026-10-29T15:30:00Z',
  },
];

export const SEED_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'audit-1',
    organization_id: 'org-1',
    actor_user_id: 'sa-1',
    actor_role_snapshot: 'super_admin',
    entity_type: 'projects',
    entity_id: 'proj-1',
    action: 'CREATE_PROJECT',
    before_state: null,
    after_state: { name: 'Cloud Migration & Core Workflows', timezone: 'America/New_York' },
    reason: 'Initial onboarding',
    server_recorded_at: '2026-10-26T12:00:00Z',
    source: 'ui',
  },
  {
    id: 'audit-2',
    organization_id: 'org-1',
    actor_user_id: 'admin-1',
    actor_role_snapshot: 'admin',
    entity_type: 'scope_versions',
    entity_id: 'ver-1',
    action: 'SEND_ESTIMATE_VERSION',
    before_state: { status: 'draft' },
    after_state: { status: 'pending', total_hours: 80.0, total_usd: 4000.0, total_bdt: 480000.0 },
    reason: 'Submitted for client sign-off',
    server_recorded_at: '2026-10-28T11:00:00Z',
    source: 'database_trigger',
  },
  {
    id: 'audit-3',
    organization_id: 'org-1',
    actor_user_id: null,
    actor_role_snapshot: null,
    entity_type: 'scope_decisions',
    entity_id: 'ver-1',
    action: 'CLIENT_APPROVAL',
    before_state: { status: 'pending' },
    after_state: { status: 'approved', client: 'Robert Vance (VP Engineering)' },
    reason: 'Approved via secure expiring review link',
    server_recorded_at: '2026-10-29T15:00:00Z',
    source: 'client_review',
  },
];
