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

export const SEED_CLIENTS: Client[] = [];

export const SEED_PROJECTS: Project[] = [];

export const SEED_FINANCIALS: Record<string, ProjectFinancialSettings> = {};

export const SEED_MESSAGES: SafeMessage[] = [];

export const SEED_PACKAGES: ScopePackage[] = [];

export const SEED_VERSIONS: ScopeVersion[] = [];

export const SEED_WORK_ORDERS: WorkOrder[] = [];

export const SEED_AUDIT_EVENTS: AuditEvent[] = [];
