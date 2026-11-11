// src/features/workspace/WorkspaceLayout.tsx
// Core Three-Panel Workspace Layout with live state management

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { LeftPanelClients } from './LeftPanelClients';
import { MiddlePanelScope } from './MiddlePanelScope';
import { RightPanelConversation } from './RightPanelConversation';
import { AuditConsoleModal } from '../audit/AuditConsoleModal';
import { ClientReviewModal } from '../approvals/ClientReviewModal';
import { CorrectEventTimeModal } from '../audit/CorrectEventTimeModal';
import { GenerateWorkOrderModal } from '../work-orders/GenerateWorkOrderModal';
import { 
  Client, 
  Project, 
  ScopePackage, 
  ScopeVersion, 
  WorkOrder, 
  SafeMessage, 
  AuditEvent,
  ProjectFinancialSettings,
  VoiceNoteData
} from '../../types';
import {
  supabase,
  isSupabaseConfigured,
  SEED_CLIENTS,
  SEED_PROJECTS,
  SEED_PACKAGES,
  SEED_VERSIONS,
  SEED_WORK_ORDERS,
  SEED_MESSAGES,
  SEED_AUDIT_EVENTS,
  SEED_FINANCIALS,
} from '../../lib/supabase/client';
import { formatDualTime } from '../../lib/timezone';
import { calculateProjectApprovedHours } from '../../lib/state-machines';
import { 
  ShieldCheck, 
  UserCheck, 
  Clock, 
  Globe, 
  Layers, 
  ShieldAlert, 
  SlidersHorizontal,
  Building2,
  Menu,
  X,
  FolderKanban,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  UserPlus,
  LogOut,
  Users,
  CheckCircle2,
  Palette,
  Smartphone,
  User,
  Briefcase
} from 'lucide-react';
import { Sun, Moon } from '../../components/ThemeIcons';
import { BellIcon, BellRingIcon } from '../../components/NotificationIcons';
import { useNotifications } from '../notifications/NotificationContext';
import { NotificationCenterDropdown } from '../notifications/NotificationCenterDropdown';
import { PushToastContainer } from '../notifications/PushToastContainer';
import { LoginView } from '../auth/LoginView';
import { TeamManagementModal } from '../auth/TeamManagementModal';
import { UserProfileModal } from '../auth/UserProfileModal';
import { TemporaryPasswordModal } from '../auth/TemporaryPasswordModal';
import { Modal } from '../../components/Modal';
import { ProjectCalendarModal } from '../calendar/ProjectCalendarModal';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useOrganization } from '../organization/OrganizationContext';
import { CompanySettingsModal } from '../organization/CompanySettingsModal';
import { ThemeCustomizerModal } from '../theme/ThemeCustomizerModal';
import { InstallAppBanner } from '../../components/InstallAppBanner';
import { CreateEstimateModal } from './CreateEstimateModal';

/**
 * Isolates conversation messages strictly to a specific project.
 * Ensures newly created projects start with a clean thread and messages
 * from other projects never leak across clients or projects.
 */
export function filterMessagesForProject(
  messages: SafeMessage[],
  targetProjectId: string
): SafeMessage[] {
  if (!targetProjectId) return [];
  const targetConvId = `conv-${targetProjectId}`;
  return messages.filter((m) => {
    // 1. Direct project_id association
    if (m.project_id) {
      return m.project_id === targetProjectId;
    }
    // 2. Matching conversation_id (conv-{projectId})
    if (m.conversation_id === targetConvId) {
      return true;
    }
    // 3. Fallback for legacy seed messages in the default proj-1 project
    if (targetProjectId === 'proj-1' && m.conversation_id === 'conv-1') {
      return true;
    }
    return false;
  });
}

/**
 * Helper to extract plain text snippet from Tiptap JSON document for push notification previews
 */
export function extractMessageSnippet(contentJson: Record<string, unknown>): string {
  try {
    const doc = contentJson as any;
    if (Array.isArray(doc?.content)) {
      const texts: string[] = [];
      const recurse = (node: any) => {
        if (node?.text) texts.push(node.text);
        if (Array.isArray(node?.content)) node.content.forEach(recurse);
      };
      doc.content.forEach(recurse);
      if (texts.length > 0) return texts.join(' ').replace(/\s+/g, ' ').trim();
    }
  } catch {}
  return 'New message in conversation thread';
}

/**
 * Isolated live dual-clock component.
 * By keeping the 1-second interval self-contained, WorkspaceLayout NEVER re-renders on clock ticks!
 */
const TopNavDualClock: React.FC<{ timezone: string }> = ({ timezone }) => {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dualTime = useMemo(() => formatDualTime(time, timezone), [time, timezone]);

  return (
    <>
      {/* Full display for 15"+ laptop screens (xl and 2xl) */}
      <div className="hidden xl:flex items-center gap-4 text-xs font-mono bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 px-3 py-1 rounded-full text-slate-700 dark:text-slate-300 shrink-0">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
          <span>Project ({dualTime.clientTzAbbrev}):</span>
          <span className="text-slate-900 dark:text-slate-100 font-semibold">{dualTime.clientTime}</span>
        </div>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
          <span>Bangladesh (BST):</span>
          <span className="text-emerald-700 dark:text-teal-300 font-semibold">{dualTime.bangladeshTime}</span>
        </div>
      </div>

      {/* Compact display for tablet / 13" laptop (md to xl) */}
      <div className="hidden md:flex xl:hidden items-center gap-2 text-xs font-mono bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 px-2.5 py-1 rounded-full text-slate-700 dark:text-slate-300 shrink-0">
        <span className="text-blue-700 dark:text-cyan-300 font-semibold">{dualTime.clientTzAbbrev}: {dualTime.clientTime}</span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="text-emerald-700 dark:text-teal-300 font-semibold">BST: {dualTime.bangladeshTime}</span>
      </div>

      {/* Mobile Mini Clock chip (sm to md) */}
      <div className="hidden sm:flex md:hidden items-center gap-1 text-[11px] font-mono bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 px-2 py-0.5 rounded-full text-emerald-700 dark:text-teal-300 shrink-0">
        <Clock className="w-3 h-3 text-emerald-600 dark:text-teal-400" />
        <span>{dualTime.bangladeshTime}</span>
      </div>
    </>
  );
};

export const WorkspaceLayout: React.FC = () => {
  const { currentRole, currentUser, isSuperAdmin, isAdmin, isMember, isAuthenticated, logout, pendingRegistrations, teamMembers, canViewMoney, pendingDesignationRequests, mustChangePassword } = useAuth();
  const { theme, toggleTheme, isDark, preset, accentColor } = useTheme();
  const { notify, unreadCount } = useNotifications();
  const { companyName } = useOrganization();

  // Pending registrations visible to current role (Admins cannot see Super Admin requests)
  const visiblePendingCount = isSuperAdmin
    ? pendingRegistrations.length
    : pendingRegistrations.filter((p) => p.role !== 'super_admin' && p.requested_role !== 'super_admin').length;

  const totalPendingApprovalsCount = visiblePendingCount + (pendingDesignationRequests?.length || 0);

  // Navigation & dropdown states
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCompanySettingsModalOpen, setIsCompanySettingsModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Primary state store storage keys
  const STORAGE_KEY_CLIENTS = 'accelvia_clients_v2';
  const STORAGE_KEY_PROJECTS = 'accelvia_projects_v2';
  const STORAGE_KEY_FINANCIALS = 'accelvia_financials_v2';
  const STORAGE_KEY_PACKAGES = 'accelvia_packages_v2';
  const STORAGE_KEY_VERSIONS = 'accelvia_versions_v2';
  const STORAGE_KEY_WORK_ORDERS = 'accelvia_work_orders_v2';
  const STORAGE_KEY_MESSAGES = 'accelvia_messages_v2';
  const STORAGE_KEY_AUDIT = 'accelvia_audit_events_v2';

  // Primary state stores with persistent browser storage
  const [clients, setClients] = useState<Client[]>(() => {
    if (typeof window === 'undefined') return SEED_CLIENTS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CLIENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_CLIENTS;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    if (typeof window === 'undefined') return SEED_PROJECTS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_PROJECTS;
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'proj-1';
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
      }
    } catch {}
    return 'proj-1';
  });

  const [financials, setFinancials] = useState<Record<string, ProjectFinancialSettings>>(() => {
    if (typeof window === 'undefined') return SEED_FINANCIALS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FINANCIALS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return SEED_FINANCIALS;
  });

  const [packages, setPackages] = useState<ScopePackage[]>(() => {
    if (typeof window === 'undefined') return SEED_PACKAGES;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PACKAGES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_PACKAGES;
  });

  const [versions, setVersions] = useState<ScopeVersion[]>(() => {
    if (typeof window === 'undefined') return SEED_VERSIONS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VERSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_VERSIONS;
  });

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => {
    if (typeof window === 'undefined') return SEED_WORK_ORDERS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WORK_ORDERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_WORK_ORDERS;
  });

  const [messages, setMessages] = useState<SafeMessage[]>(() => {
    if (typeof window === 'undefined') return SEED_MESSAGES;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_MESSAGES;
  });

  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() => {
    if (typeof window === 'undefined') return SEED_AUDIT_EVENTS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUDIT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_AUDIT_EVENTS;
  });

  // Modals state
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [reviewVersionId, setReviewVersionId] = useState<string | null>(null);
  const [timeCorrectionMessage, setTimeCorrectionMessage] = useState<SafeMessage | null>(null);
  const [isCreateEstimateModalOpen, setIsCreateEstimateModalOpen] = useState(false);
  const [createEstimatePostToChatDefault, setCreateEstimatePostToChatDefault] = useState(true);

  const handleOpenCreateEstimateModal = (postToChatDefault = true) => {
    setCreateEstimatePostToChatDefault(postToChatDefault);
    setIsCreateEstimateModalOpen(true);
  };

  // Feature 1: Mark Project Complete dialog state
  const [isMarkCompleteDialogOpen, setIsMarkCompleteDialogOpen] = useState(false);

  // Feature 4: Project Calendar & Master Work Orders Hub
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [workOrderModalVersion, setWorkOrderModalVersion] = useState<ScopeVersion | null>(null);

  // Feature 3: Additional estimate budget confirmation dialog state
  const [budgetUpdateDialog, setBudgetUpdateDialog] = useState<{
    isOpen: boolean;
    newAdditionalHours: number;
    currentBudgetHours: number | null;
    suggestedTotal: number;
    versionId: string;
    packageTitle: string;
    confirmedHours: number;
  } | null>(null);

  // Responsive view & collapsible panel state
  const [mobileTab, setMobileTab] = useState<'projects' | 'scope' | 'chat'>('chat');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isScopePanelCollapsed, setIsScopePanelCollapsed] = useState(false);

  // Active project and assigned client company (memoized for reference stability)
  const activeProject: Project | null = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  const activeClient: Client | null = useMemo(() => {
    if (!activeProject?.client_id) return null;
    return clients.find((c) => c.id === activeProject.client_id) || null;
  }, [activeProject?.client_id, clients]);

  const activeFinancials = useMemo(() => {
    return activeProject ? financials[activeProject.id] : undefined;
  }, [activeProject, financials]);

  const activePackages = useMemo(() => {
    return activeProject ? packages.filter((p) => p.project_id === activeProject.id) : [];
  }, [activeProject, packages]);

  const activeVersions = useMemo(() => {
    return versions.filter((v) =>
      activePackages.some((pkg) => pkg.id === v.scope_package_id)
    );
  }, [versions, activePackages]);

  const activeWorkOrders = useMemo(() => {
    return activeProject ? workOrders.filter((wo) => wo.project_id === activeProject.id) : [];
  }, [activeProject, workOrders]);

  const activeMessages = useMemo(() => {
    return filterMessagesForProject(messages, activeProject?.id || '');
  }, [messages, activeProject?.id]);

  // Authoritative approved hours for mobile badge
  const packagesWithVersions = useMemo(() => {
    return activePackages.map((pkg) => ({
      ...pkg,
      versions: versions.filter((v) => v.scope_package_id === pkg.id),
    }));
  }, [activePackages, versions]);

  const totalApprovedHours = useMemo(() => {
    return calculateProjectApprovedHours(packagesWithVersions);
  }, [packagesWithVersions]);

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setMobileTab('chat');
    setIsMobileDrawerOpen(false);
  };

  // Cache to track the last known cloud JSON state per key — prevents infinite echo loops & saves Supabase free tier quotas

  // Cache to track the last known cloud JSON state per key — prevents infinite echo loops & saves Supabase free tier quotas
  const lastCloudJson = useRef<Record<string, string>>({});
  // Coalescing debounce timers per key to avoid high-frequency REST writes during rapid user actions
  const syncDebounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const isLoadedFromCloud = useRef(false);

  // Keep a reference to current messages for diffing on realtime broadcast
  const messagesRef = useRef<SafeMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Keep a reference to current projects for notifications
  const projectsRef = useRef<Project[]>(projects);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // Clean up debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(syncDebounceTimers.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  // Free Tier Guarded Cloud Sync: Debounced, deduplicated, and echo-suppressed
  const queueSyncToCloud = useCallback((key: string, value: any, debounceMs = 400) => {
    if (!isSupabaseConfigured || !isLoadedFromCloud.current) return;

    const currentJson = JSON.stringify(value);
    // If identical to last known cloud state, completely skip (0 network calls, 0 quota burned!)
    if (lastCloudJson.current[key] === currentJson) {
      return;
    }

    if (syncDebounceTimers.current[key]) {
      clearTimeout(syncDebounceTimers.current[key]);
    }

    syncDebounceTimers.current[key] = setTimeout(async () => {
      // Record current JSON so incoming real-time echo is dropped
      lastCloudJson.current[key] = currentJson;
      try {
        await supabase.from('app_workspace_data').upsert({
          key,
          value,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn(`[Sync] Could not upsert ${key} to Supabase:`, e);
      }
    }, debounceMs);
  }, []);

  // Fetch complete workspace data from Supabase centrally on initial load
  const fetchSupabaseWorkspaceData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      isLoadedFromCloud.current = true;
      return;
    }
    try {
      const { data, error } = await supabase.from('app_workspace_data').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        data.forEach((row) => {
          const valJson = JSON.stringify(row.value);
          lastCloudJson.current[row.key] = valJson;

          if (row.key === 'clients' && Array.isArray(row.value)) {
            setClients(row.value);
            try { localStorage.setItem(STORAGE_KEY_CLIENTS, valJson); } catch {}
          }
          if (row.key === 'projects' && Array.isArray(row.value)) {
            setProjects(row.value);
            try { localStorage.setItem(STORAGE_KEY_PROJECTS, valJson); } catch {}
          }
          if (row.key === 'packages' && Array.isArray(row.value)) {
            setPackages(row.value);
            try { localStorage.setItem(STORAGE_KEY_PACKAGES, valJson); } catch {}
          }
          if (row.key === 'versions' && Array.isArray(row.value)) {
            setVersions(row.value);
            try { localStorage.setItem(STORAGE_KEY_VERSIONS, valJson); } catch {}
          }
          if (row.key === 'work_orders' && Array.isArray(row.value)) {
            setWorkOrders(row.value);
            try { localStorage.setItem(STORAGE_KEY_WORK_ORDERS, valJson); } catch {}
          }
          if (row.key === 'messages' && Array.isArray(row.value)) {
            setMessages(row.value);
            try { localStorage.setItem(STORAGE_KEY_MESSAGES, valJson); } catch {}
          }
          if (row.key === 'financials' && row.value && typeof row.value === 'object') {
            setFinancials(row.value);
            try { localStorage.setItem(STORAGE_KEY_FINANCIALS, valJson); } catch {}
          }
          if (row.key === 'audit_events' && Array.isArray(row.value)) {
            setAuditEvents(row.value);
            try { localStorage.setItem(STORAGE_KEY_AUDIT, valJson); } catch {}
          }
        });
      }
    } catch (e) {
      console.warn('Error fetching Supabase workspace data:', e);
    } finally {
      isLoadedFromCloud.current = true;
    }
  }, []);

  useEffect(() => {
    fetchSupabaseWorkspaceData();
  }, [fetchSupabaseWorkspaceData]);

  // Real-time synchronization across different devices and browsers via single Supabase Realtime channel
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('app_workspace_sync_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_workspace_data' },
        (payload) => {
          const key = (payload.new as any)?.key;
          const value = (payload.new as any)?.value;
          if (!key || value === undefined) return;

          const incomingJson = JSON.stringify(value);
          // Drop self-echoes immediately (0 re-renders, 0 ping-pong loops)
          if (lastCloudJson.current[key] === incomingJson) {
            return;
          }

          // Update last known cloud state before triggering state updates
          lastCloudJson.current[key] = incomingJson;

          if (key === 'clients' && Array.isArray(value)) {
            setClients(value);
            try { localStorage.setItem(STORAGE_KEY_CLIENTS, incomingJson); } catch {}
          } else if (key === 'projects' && Array.isArray(value)) {
            setProjects(value);
            try { localStorage.setItem(STORAGE_KEY_PROJECTS, incomingJson); } catch {}
          } else if (key === 'packages' && Array.isArray(value)) {
            setPackages(value);
            try { localStorage.setItem(STORAGE_KEY_PACKAGES, incomingJson); } catch {}
          } else if (key === 'versions' && Array.isArray(value)) {
            setVersions(value);
            try { localStorage.setItem(STORAGE_KEY_VERSIONS, incomingJson); } catch {}
          } else if (key === 'work_orders' && Array.isArray(value)) {
            setWorkOrders(value);
            try { localStorage.setItem(STORAGE_KEY_WORK_ORDERS, incomingJson); } catch {}
          } else if (key === 'financials' && value && typeof value === 'object') {
            setFinancials(value);
            try { localStorage.setItem(STORAGE_KEY_FINANCIALS, incomingJson); } catch {}
          } else if (key === 'audit_events' && Array.isArray(value)) {
            setAuditEvents(value);
            try { localStorage.setItem(STORAGE_KEY_AUDIT, incomingJson); } catch {}
          } else if (key === 'messages' && Array.isArray(value)) {
            // Check for new incoming messages from other users and trigger notification
            const prevIds = new Set(messagesRef.current.map((m) => m.id));
            const newArrivals = (value as SafeMessage[]).filter((m) => !prevIds.has(m.id));

            newArrivals.forEach((m) => {
              if (m.author_id && m.author_id !== currentUser.user_id) {
                const rawSnippet = extractMessageSnippet(m.content_json as Record<string, unknown>);
                let snippet = rawSnippet;
                if ((!snippet || snippet === 'New message in conversation thread') && m.voice_note) {
                  snippet = `🎙️ Voice Note (${Math.round(m.voice_note.duration_seconds)}s)${m.voice_note.transcript ? ': "' + m.voice_note.transcript + '"' : ''}`;
                }

                const isManagementMentioned = /@Management\b/i.test(snippet) && !isSuperAdmin;
                // Mask Super Admin identity to Management for Admins and Members
                const authorDisplayName = m.author_is_management ? 'Management' : m.author_name;

                const mentionedMembers = (teamMembers || []).filter((tm) => {
                  if (tm.user_id === m.author_id) return false;
                  const pattern = new RegExp(`@${tm.display_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
                  return pattern.test(snippet);
                });

                const isMentioned = mentionedMembers.some((tm) => tm.user_id === currentUser.user_id) ||
                  (isManagementMentioned && isSuperAdmin);

                const targetProj = projectsRef.current.find((p) => p.id === m.project_id);

                if (isMentioned) {
                  notify({
                    title: `🔔 Mention Alert: ${authorDisplayName} mentioned you`,
                    body: snippet.length > 120 ? `"${snippet.slice(0, 117)}..."` : `"${snippet}"`,
                    category: 'conversation',
                    priority: 'high',
                    project_id: m.project_id,
                    project_name: targetProj?.name,
                    author_name: authorDisplayName,
                  });
                } else {
                  notify({
                    title: `💬 New Message (${authorDisplayName})`,
                    body: snippet.length > 120 ? `${snippet.slice(0, 117)}...` : snippet,
                    category: 'conversation',
                    project_id: m.project_id,
                    project_name: targetProj?.name,
                    author_name: authorDisplayName,
                  });
                }
              }
            });

            setMessages(value);
            try { localStorage.setItem(STORAGE_KEY_MESSAGES, incomingJson); } catch {}
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.user_id, isSuperAdmin, notify, teamMembers]);

  // Auto-select first project if current selectedProjectId is invalid or not in loaded projects
  useEffect(() => {
    if (projects.length > 0 && !projects.some((p) => p.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(clients)); } catch {}
    queueSyncToCloud('clients', clients);
  }, [clients, queueSyncToCloud]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects)); } catch {}
    queueSyncToCloud('projects', projects);
  }, [projects, queueSyncToCloud]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_FINANCIALS, JSON.stringify(financials)); } catch {}
    queueSyncToCloud('financials', financials);
  }, [financials, queueSyncToCloud]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_PACKAGES, JSON.stringify(packages)); } catch {}
    queueSyncToCloud('packages', packages);
  }, [packages, queueSyncToCloud]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_VERSIONS, JSON.stringify(versions)); } catch {}
    queueSyncToCloud('versions', versions);
  }, [versions, queueSyncToCloud]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_WORK_ORDERS, JSON.stringify(workOrders)); } catch {}
    queueSyncToCloud('work_orders', workOrders);
  }, [workOrders, queueSyncToCloud]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages)); } catch {}
    queueSyncToCloud('messages', messages, 200);
  }, [messages, queueSyncToCloud]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(auditEvents)); } catch {}
    queueSyncToCloud('audit_events', auditEvents);
  }, [auditEvents, queueSyncToCloud]);

  // Cross-tab real-time sync & notifications receiver
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('accelvia_sync_channel');

    channel.onmessage = (event) => {
      const data = event.data;
      if (!data || !data.type) return;

      if (data.type === 'NEW_MESSAGE' && data.message) {
        if (data.authorId !== currentUser.user_id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });

          const isMentioned = data.mentionedMemberIds?.includes(currentUser.user_id) ||
            (data.isManagementMentioned && isSuperAdmin);

          if (isMentioned) {
            notify({
              title: `🔔 Mention Alert: ${data.authorName} mentioned you`,
              body: data.snippet?.length > 120 ? `"${data.snippet.slice(0, 117)}..."` : `"${data.snippet}"`,
              category: 'conversation',
              priority: 'high',
              project_id: data.projectId,
              project_name: data.projectName,
              author_name: data.authorName,
            });
          } else {
            notify({
              title: `💬 New Message (${data.authorName})`,
              body: data.snippet?.length > 120 ? `${data.snippet.slice(0, 117)}...` : data.snippet,
              category: 'conversation',
              project_id: data.projectId,
              project_name: data.projectName,
              author_name: data.authorName,
            });
          }
        }
      }

      if (data.type === 'USER_DELETED') {
        // If current logged-in user is the one deleted
        if (data.userId === currentUser.user_id) {
          logout();
          alert(`⚠️ Account Terminated: Your account was deleted by Super Admin (${data.deletedBy}). You have been signed out.`);
          return;
        }

        // For other users: broadcast security notice
        notify({
          title: `⚠️ Team Member Removed`,
          body: `Account for ${data.deletedName} (${data.deletedRole}) was permanently deleted by ${data.deletedBy}.`,
          category: 'system',
          priority: 'high',
        });

        // Record audit event
        const auditEntry: AuditEvent = {
          id: `audit-${Date.now()}`,
          organization_id: 'org-1',
          actor_user_id: data.deletedBy,
          actor_role_snapshot: 'super_admin',
          entity_type: 'user_account',
          entity_id: data.userId,
          action: 'DELETE_USER_ACCOUNT',
          before_state: { name: data.deletedName, role: data.deletedRole, email: data.deletedEmail },
          after_state: null,
          reason: `User account permanently deleted by Super Admin (${data.deletedBy})`,
          server_recorded_at: new Date().toISOString(),
          source: 'ui',
        };
        setAuditEvents((a) => [auditEntry, ...a]);
      }

      if (data.type === 'PASSWORD_UPDATED') {
        if (data.userId === currentUser.user_id) {
          notify({
            title: `🔑 Password Changed`,
            body: `Your account password was successfully updated by ${data.updatedBy}.`,
            category: 'system',
            priority: 'high',
          });
        }
      }
    };

    return () => {
      channel.close();
    };
  }, [currentUser.user_id, isSuperAdmin, notify]);

  // Handlers
  const handleCreateClient = (clientData: Partial<Client>) => {
    const newClient: Client = {
      id: `client-${Date.now()}`,
      organization_id: 'org-1',
      name: clientData.name || 'New Client',
      status: 'active',
      notes_internal: clientData.notes_internal,
      default_timezone: clientData.default_timezone || 'America/New_York',
      contacts: clientData.contacts || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setClients((prev) => [...prev, newClient]);

    const auditEntry: AuditEvent = {
      id: `audit-${Date.now()}`,
      organization_id: 'org-1',
      actor_user_id: currentUser.user_id,
      actor_role_snapshot: currentRole,
      entity_type: 'clients',
      entity_id: newClient.id,
      action: 'CREATE_CLIENT_PROFILE',
      before_state: null,
      after_state: { name: newClient.name, timezone: newClient.default_timezone, contacts: newClient.contacts },
      reason: 'Client company profile created by management',
      server_recorded_at: new Date().toISOString(),
      source: 'ui',
    };
    setAuditEvents((a) => [auditEntry, ...a]);
  };

  const handleCreateProject = (projectData: Partial<Project>) => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      organization_id: 'org-1',
      client_id: projectData.client_id,
      name: projectData.name || 'New Project',
      description_internal: projectData.description_internal,
      status: 'active',
      timezone: projectData.timezone || 'America/New_York',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, newProj]);
    setSelectedProjectId(newProj.id);

    // Initialize project financials — no default rates and no default budget hours
    setFinancials((prev) => ({
      ...prev,
      [newProj.id]: {
        project_id: newProj.id,
        internal_budget_hours: null,
        internal_budget_amount_usd: null,
        internal_budget_amount_bdt: null,
        internal_cost_rate_usd_per_hour: null,
        internal_cost_rate_bdt_per_hour: null,
        client_rate_usd_per_hour: null,
        client_rate_bdt_per_hour: null,
        currency_rate_mode: 'independent_rates',
        updated_at: new Date().toISOString(),
      },
    }));

    const assignedClient = clients.find((c) => c.id === projectData.client_id);
    const auditEntry: AuditEvent = {
      id: `audit-${Date.now()}`,
      organization_id: 'org-1',
      actor_user_id: currentUser.user_id,
      actor_role_snapshot: currentRole,
      entity_type: 'projects',
      entity_id: newProj.id,
      action: 'CREATE_PROJECT',
      before_state: null,
      after_state: {
        name: newProj.name,
        assigned_client_id: newProj.client_id,
        assigned_client_name: assignedClient?.name || 'Unassigned',
        timezone: newProj.timezone,
      },
      reason: 'Project initialized and assigned to client company',
      server_recorded_at: new Date().toISOString(),
      source: 'ui',
    };
    setAuditEvents((a) => [auditEntry, ...a]);
  };

  const handleSendMessage = (
    contentJson: Record<string, unknown>,
    attachments: File[],
    voiceNote?: VoiceNoteData | null
  ) => {
    const activeConvId = activeProject ? `conv-${activeProject.id}` : 'conv-1';
    const newMsg: SafeMessage = {
      id: `msg-${Date.now()}`,
      conversation_id: activeConvId,
      project_id: activeProject?.id,
      author_id: currentUser.user_id,
      author_name: currentUser.display_name,
      author_is_management: isSuperAdmin,
      content_json: contentJson,
      event_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_edited: false,
      is_deleted: false,
      voice_note: voiceNote || null,
      attachments: attachments.map((f, i) => ({
        id: `att-${Date.now()}-${i}`,
        message_id: `msg-${Date.now()}`,
        storage_bucket: 'attachments',
        storage_path: `${activeConvId}/${f.name}`,
        original_filename: f.name,
        mime_type: f.type,
        size_bytes: f.size,
        created_at: new Date().toISOString(),
      })),
    };
    setMessages((prev) => [...prev, newMsg]);

    // Extract message snippet for push notifications
    const rawSnippet = extractMessageSnippet(contentJson);
    let snippet = rawSnippet;
    if ((!snippet || snippet === 'New message in conversation thread') && voiceNote) {
      snippet = `🎙️ Voice Note (${Math.round(voiceNote.duration_seconds)}s)${voiceNote.transcript ? ': "' + voiceNote.transcript + '"' : ''}`;
    }

    // Google L6 Standard @mention scanner: Target mentioned users
    const mentionedMembers = (teamMembers || []).filter((m) => {
      if (m.user_id === currentUser.user_id) return false;
      const pattern = new RegExp(`@${m.display_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      return pattern.test(snippet);
    });

    const isManagementMentioned = /@Management\b/i.test(snippet) && !isSuperAdmin;
    const authorDisplayName = isSuperAdmin ? 'Management' : currentUser.display_name;

    // Cross-tab / cross-device broadcast to alert recipients (the sender does not receive a self-toast)
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('accelvia_sync_channel');
        channel.postMessage({
          type: 'NEW_MESSAGE',
          message: newMsg,
          authorId: currentUser.user_id,
          authorName: authorDisplayName,
          snippet,
          projectId: activeProject?.id,
          projectName: activeProject?.name,
          mentionedMemberIds: mentionedMembers.map((m) => m.user_id),
          isManagementMentioned,
        });
        channel.close();
      }
    } catch {}
  };

  const handleEditMessage = (messageId: string, newText: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        // Append audit record for edit
        const auditEntry: AuditEvent = {
          id: `audit-${Date.now()}`,
          organization_id: 'org-1',
          actor_user_id: currentUser.user_id,
          actor_role_snapshot: currentRole,
          entity_type: 'messages',
          entity_id: m.id,
          action: 'EDIT_MESSAGE',
          before_state: m.content_json,
          after_state: { text: newText },
          reason: 'User revised message body',
          server_recorded_at: new Date().toISOString(),
          source: 'ui',
        };
        setAuditEvents((a) => [auditEntry, ...a]);

        // Push notification for conversation revision
        notify({
          title: '✏️ Message Revised',
          body: `A message was revised in ${activeProject?.name || 'Project'}: "${newText.length > 80 ? `${newText.slice(0, 77)}...` : newText}"`,
          category: 'conversation',
          project_id: activeProject?.id,
          project_name: activeProject?.name,
        });

        return {
          ...m,
          content_json: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: newText }] }],
          },
          is_edited: true,
          updated_at: new Date().toISOString(),
        };
      })
    );
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        // Append audit record
        const auditEntry: AuditEvent = {
          id: `audit-${Date.now()}`,
          organization_id: 'org-1',
          actor_user_id: currentUser.user_id,
          actor_role_snapshot: currentRole,
          entity_type: 'messages',
          entity_id: m.id,
          action: 'SOFT_DELETE_MESSAGE',
          before_state: m.content_json,
          after_state: null,
          reason: 'Message author removed message from ordinary view',
          server_recorded_at: new Date().toISOString(),
          source: 'ui',
        };
        setAuditEvents((a) => [auditEntry, ...a]);

        // Push notification for message removal
        notify({
          title: '🗑️ Message Removed',
          body: `A message was removed from the conversation in ${activeProject?.name || 'the project'}.`,
          category: 'conversation',
          project_id: activeProject?.id,
          project_name: activeProject?.name,
        });

        return {
          ...m,
          is_deleted: true,
          updated_at: new Date().toISOString(),
        };
      })
    );
  };

  const handleUpdateFinancials = (settings: Partial<ProjectFinancialSettings>) => {
    setFinancials((prev) => ({
      ...prev,
      [selectedProjectId]: {
        ...prev[selectedProjectId],
        ...settings,
        project_id: selectedProjectId,
        currency_rate_mode: 'independent_rates',
        updated_at: new Date().toISOString(),
      },
    }));

    // Record audit event
    const auditEntry: AuditEvent = {
      id: `audit-${Date.now()}`,
      organization_id: 'org-1',
      actor_user_id: currentUser.user_id,
      actor_role_snapshot: currentRole,
      entity_type: 'project_financial_settings',
      entity_id: selectedProjectId,
      action: 'UPDATE_RATES_BUDGET',
      before_state: financials[selectedProjectId] as any,
      after_state: settings as any,
      reason: 'Commercial rate re-configuration',
      server_recorded_at: new Date().toISOString(),
      source: 'ui',
    };
    setAuditEvents((a) => [auditEntry, ...a]);
  };

  const handleCreateEstimateDraft = (
    pkgId: string | null,
    title: string,
    items: Array<{ title: string; hours: number }>,
    postToConversation: boolean = false
  ) => {
    let targetPkgId = pkgId;
    let targetPkgTitle = title;
    if (!targetPkgId) {
      const newPkg: ScopePackage = {
        id: `pkg-${Date.now()}`,
        organization_id: 'org-1',
        project_id: selectedProjectId,
        package_kind: packages.some((p) => p.project_id === selectedProjectId) ? 'additional' : 'initial',
        title: title || 'Additional Work Scope',
        created_at: new Date().toISOString(),
      };
      setPackages((prev) => [...prev, newPkg]);
      targetPkgId = newPkg.id;
      targetPkgTitle = newPkg.title;
    } else {
      const existing = packages.find((p) => p.id === targetPkgId);
      if (existing) {
        targetPkgTitle = existing.title;
      }
    }

    const pkgExistingVersions = versions.filter((v) => v.scope_package_id === targetPkgId);
    const verNumber = pkgExistingVersions.length + 1;
    const totalHours = items.reduce((acc, it) => acc + (Number(it.hours) || 0), 0);
    const rateUsd = activeFinancials?.client_rate_usd_per_hour ?? null;
    const rateBdt = activeFinancials?.client_rate_bdt_per_hour ?? null;
    const newVersionId = `ver-${Date.now()}`;

    const newVersion: ScopeVersion = {
      id: newVersionId,
      scope_package_id: targetPkgId,
      version_number: verNumber,
      status: postToConversation ? 'pending' : 'draft',
      revision_type: verNumber === 1 ? 'initial' : 'replacement',
      client_rate_usd_per_hour_snapshot: rateUsd,
      client_rate_bdt_per_hour_snapshot: rateBdt,
      total_hours_snapshot: totalHours,
      total_usd_snapshot: rateUsd != null ? totalHours * rateUsd : null,
      total_bdt_snapshot: rateBdt != null ? totalHours * rateBdt : null,
      created_at: new Date().toISOString(),
      event_at: new Date().toISOString(),
      sent_at: postToConversation ? new Date().toISOString() : undefined,
      items: items.map((it, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        scope_version_id: newVersionId,
        position: idx,
        title: it.title,
        hours: it.hours,
        is_billable: true,
        created_at: new Date().toISOString(),
      })),
    };

    setVersions((prev) => [...prev, newVersion]);

    // Auto-set internal budget from the FIRST estimate ever created for this project
    const projectHasNoEstimatesYet = !versions.some((v) =>
      packages.some((pkg) => pkg.id === v.scope_package_id && pkg.project_id === selectedProjectId)
    );
    if (projectHasNoEstimatesYet && totalHours > 0) {
      setFinancials((prev) => {
        const existing = prev[selectedProjectId];
        // Only auto-set if budget has not been manually configured yet
        if (!existing || existing.internal_budget_hours === null) {
          const usdRate = existing?.client_rate_usd_per_hour ?? null;
          const bdtRate = existing?.client_rate_bdt_per_hour ?? null;
          return {
            ...prev,
            [selectedProjectId]: {
              project_id: selectedProjectId,
              internal_budget_hours: totalHours,
              internal_budget_amount_usd: usdRate != null ? totalHours * usdRate : null,
              internal_budget_amount_bdt: bdtRate != null ? totalHours * bdtRate : null,
              internal_cost_rate_usd_per_hour: existing?.internal_cost_rate_usd_per_hour ?? null,
              internal_cost_rate_bdt_per_hour: existing?.internal_cost_rate_bdt_per_hour ?? null,
              client_rate_usd_per_hour: usdRate,
              client_rate_bdt_per_hour: bdtRate,
              currency_rate_mode: existing?.currency_rate_mode ?? 'independent_rates',
              updated_at: new Date().toISOString(),
            },
          };
        }
        return prev;
      });
    }

    if (postToConversation) {
      const hoursFormatted = totalHours.toFixed(2);
      const activeConvId = activeProject ? `conv-${activeProject.id}` : 'conv-1';
      const newMsg: SafeMessage = {
        id: `msg-${Date.now()}`,
        conversation_id: activeConvId,
        project_id: activeProject?.id,
        author_id: currentUser.user_id,
        author_name: currentUser.display_name,
        author_is_management: isSuperAdmin,
        content_json: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: `📋 Estimate Scope v${newVersion.version_number}.0 (${hoursFormatted} hrs) has been sent to client. Management can review and approve directly from this thread.`,
                },
              ],
            },
          ],
        },
        event_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_edited: false,
        is_deleted: false,
        attachments: [],
        estimate_version_id: newVersion.id,
        estimate_card: {
          version_id: newVersion.id,
          package_title: targetPkgTitle,
          version_number: newVersion.version_number,
          total_hours: newVersion.total_hours_snapshot,
          total_usd: newVersion.total_usd_snapshot,
          total_bdt: newVersion.total_bdt_snapshot,
          status: 'pending',
          items: newVersion.items?.map((it) => ({ title: it.title, hours: it.hours })),
        },
      };
      setMessages((prev) => [...prev, newMsg]);

      // Push notification for estimate created and dispatched to conversation
      notify({
        title: `📤 Estimate Created & Sent: v${verNumber}.0`,
        body: `${totalHours.toFixed(1)} billable hrs across ${items.length} deliverables in ${activeProject?.name || 'Project'}. Dispatched to chat for approval.`,
        category: 'estimate_status',
        project_id: selectedProjectId,
        project_name: activeProject?.name,
        estimate_version_id: newVersion.id,
        version_number: verNumber,
      });

      // Record audit event
      const auditEntry: AuditEvent = {
        id: `audit-${Date.now()}`,
        organization_id: 'org-1',
        actor_user_id: currentUser.user_id,
        actor_role_snapshot: currentRole,
        entity_type: 'scope_versions',
        entity_id: newVersion.id,
        action: 'SEND_ESTIMATE_VERSION',
        before_state: null,
        after_state: {
          status: 'pending',
          package_title: targetPkgTitle,
          total_hours: totalHours,
          total_usd: newVersion.total_usd_snapshot,
          total_bdt: newVersion.total_bdt_snapshot,
        },
        reason: 'Estimate created and dispatched to project conversation',
        server_recorded_at: new Date().toISOString(),
        source: 'ui',
      };
      setAuditEvents((a) => [auditEntry, ...a]);
    } else {
      // Push notification for drafted estimate
      notify({
        title: `📝 New Estimate Scope Drafted: v${verNumber}.0`,
        body: `${totalHours.toFixed(1)} billable hrs allocated across ${items.length} deliverables in ${activeProject?.name || 'Project'}.`,
        category: 'estimate_status',
        project_id: selectedProjectId,
        project_name: activeProject?.name,
        estimate_version_id: newVersion.id,
        version_number: verNumber,
      });

      // Record audit event for draft
      const auditEntry: AuditEvent = {
        id: `audit-${Date.now()}`,
        organization_id: 'org-1',
        actor_user_id: currentUser.user_id,
        actor_role_snapshot: currentRole,
        entity_type: 'scope_versions',
        entity_id: newVersion.id,
        action: 'CREATE_ESTIMATE_DRAFT',
        before_state: null,
        after_state: {
          status: 'draft',
          package_title: targetPkgTitle,
          total_hours: totalHours,
          total_usd: newVersion.total_usd_snapshot,
          total_bdt: newVersion.total_bdt_snapshot,
        },
        reason: 'Estimate draft created in scope management',
        server_recorded_at: new Date().toISOString(),
        source: 'ui',
      };
      setAuditEvents((a) => [auditEntry, ...a]);
    }
  };

  const handleSendEstimate = (versionId: string, email: string = '', postToConversation: boolean = true) => {
    let targetVer: ScopeVersion | undefined;
    const cleanEmail = email.trim();

    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== versionId) return v;
        targetVer = {
          ...v,
          status: 'pending' as const,
          sent_at: new Date().toISOString(),
        };

        const auditEntry: AuditEvent = {
          id: `audit-${Date.now()}`,
          organization_id: 'org-1',
          actor_user_id: currentUser.user_id,
          actor_role_snapshot: currentRole,
          entity_type: 'scope_versions',
          entity_id: v.id,
          action: 'SEND_ESTIMATE_VERSION',
          before_state: { status: 'draft' },
          after_state: { status: 'pending', recipient: cleanEmail || 'Client Review Portal (No Email Required)' },
          reason: cleanEmail ? `Sent to client (${cleanEmail})` : 'Estimate locked and issued to pending client review',
          server_recorded_at: new Date().toISOString(),
          source: 'ui',
        };
        setAuditEvents((a) => [auditEntry, ...a]);

        return targetVer;
      })
    );

    // Push notification for estimate status update (sent to client)
    const verSnapshot = targetVer || versions.find((v) => v.id === versionId);
    const verNum = verSnapshot?.version_number || 1;
    const hrs = (verSnapshot?.total_hours_snapshot || 0).toFixed(1);
    const destinationText = cleanEmail ? `dispatched to ${cleanEmail}` : 'issued for client approval';
    notify({
      title: `📤 Estimate Sent to Client: v${verNum}.0`,
      body: `Estimate Scope (${hrs} hrs) ${destinationText}. Status updated to Pending Client Review.`,
      category: 'estimate_status',
      project_id: selectedProjectId,
      project_name: activeProject?.name,
      estimate_version_id: versionId,
      version_number: verNum,
    });

    // If requested, post interactive estimate card to the conversation feed
    if (postToConversation) {
      const verSnapshot = targetVer || versions.find((v) => v.id === versionId);
      if (verSnapshot) {
        const hoursFormatted = (verSnapshot.total_hours_snapshot || 0).toFixed(2);
        const activeConvId = activeProject ? `conv-${activeProject.id}` : 'conv-1';
        const newMsg: SafeMessage = {
          id: `msg-${Date.now()}`,
          conversation_id: activeConvId,
          project_id: activeProject?.id,
          author_id: currentUser.user_id,
          author_name: currentUser.display_name,
          author_is_management: isSuperAdmin,
          content_json: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: `📋 Estimate Scope v${verSnapshot.version_number}.0 (${hoursFormatted} hrs) has been sent to client (${email}). Management can review and approve directly from this thread.`,
                  },
                ],
              },
            ],
          },
          event_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_edited: false,
          is_deleted: false,
          attachments: [],
          estimate_version_id: verSnapshot.id,
          estimate_card: {
            version_id: verSnapshot.id,
            package_title: packages.find((p) => p.id === verSnapshot.scope_package_id)?.title || 'Core Project Scope',
            version_number: verSnapshot.version_number,
            total_hours: verSnapshot.total_hours_snapshot,
            total_usd: verSnapshot.total_usd_snapshot,
            total_bdt: verSnapshot.total_bdt_snapshot,
            status: 'pending',
            items: verSnapshot.items?.map((it) => ({ title: it.title, hours: it.hours })),
          },
        };
        setMessages((prev) => [...prev, newMsg]);
      }
    }
  };

  const handleApproveEstimateFromConversation = (versionId: string) => {
    // 1. Update version to approved
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== versionId) return v;
        return {
          ...v,
          status: 'approved',
          approved_at: new Date().toISOString(),
        };
      })
    );

    // 2. Update conversation cards to approved
    setMessages((prev) =>
      prev.map((m) => {
        if (m.estimate_version_id === versionId || m.estimate_card?.version_id === versionId) {
          return {
            ...m,
            estimate_card: m.estimate_card
              ? {
                  ...m.estimate_card,
                  status: 'approved',
                  approved_by_name: currentUser.display_name,
                  approved_at: new Date().toISOString(),
                }
              : null,
          };
        }
        return m;
      })
    );

    // 3. Record audit event
    const auditEntry: AuditEvent = {
      id: `audit-${Date.now()}`,
      organization_id: 'org-1',
      actor_user_id: currentUser.user_id,
      actor_role_snapshot: currentRole,
      entity_type: 'scope_versions',
      entity_id: versionId,
      action: 'ADMIN_APPROVE_ESTIMATE',
      before_state: { status: 'pending' },
      after_state: { status: 'approved', approved_by: currentUser.display_name },
      reason: 'Approved directly from conversation feed by management',
      server_recorded_at: new Date().toISOString(),
      source: 'ui',
    };
    setAuditEvents((a) => [auditEntry, ...a]);

    // 4. Dispatch Web Push notification for approved estimate
    const targetVer = versions.find((v) => v.id === versionId);
    const verNum = targetVer?.version_number || 1;
    const hrs = (targetVer?.total_hours_snapshot || 0).toFixed(1);
    const valText = targetVer?.total_usd_snapshot ? ` ($${targetVer.total_usd_snapshot.toLocaleString()} USD)` : '';
    notify({
      title: `🎉 Estimate Scope v${verNum}.0 Approved!`,
      body: `Management approved ${hrs} billable hours${valText} for ${activeProject?.name || 'Project'}. Work order generation is unlocked.`,
      category: 'estimate_approved',
      priority: 'high',
      project_id: selectedProjectId,
      project_name: activeProject?.name,
      estimate_version_id: versionId,
      version_number: verNum,
    });

    // 5. Feature 3: If this is an additional scope package, prompt admin to confirm new budget total
    if (targetVer) {
      const scopePkg = packages.find((p) => p.id === targetVer.scope_package_id);
      if (scopePkg && scopePkg.package_kind === 'additional') {
        const currentBudgetHours = activeFinancials?.internal_budget_hours ?? 0;
        const additionalHours = targetVer.total_hours_snapshot;
        const suggestedTotal = (currentBudgetHours ?? 0) + additionalHours;
        setBudgetUpdateDialog({
          isOpen: true,
          newAdditionalHours: additionalHours,
          currentBudgetHours: activeFinancials?.internal_budget_hours ?? null,
          suggestedTotal,
          versionId,
          packageTitle: scopePkg.title,
          confirmedHours: suggestedTotal,
        });
      }
    }
  };

  const handleClientDecision = (
    versionId: string,
    decision: 'approved' | 'rejected' | 'revision_requested',
    clientName: string,
    clientEmail: string,
    comment?: string
  ) => {
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== versionId) return v;

        const auditEntry: AuditEvent = {
          id: `audit-${Date.now()}`,
          organization_id: 'org-1',
          actor_user_id: null,
          actor_role_snapshot: null,
          entity_type: 'scope_decisions',
          entity_id: v.id,
          action: `CLIENT_${decision.toUpperCase()}`,
          before_state: { status: 'pending' },
          after_state: { status: decision, client: clientName, email: clientEmail, comment },
          reason: 'Decision submitted through secure expiring link',
          server_recorded_at: new Date().toISOString(),
          source: 'client_review',
        };
        setAuditEvents((a) => [auditEntry, ...a]);

        // Trigger Web Push alert for client decision
        const verNum = v.version_number;
        if (decision === 'approved') {
          notify({
            title: `🎉 Client Authorized Scope Estimate: v${verNum}.0!`,
            body: `${clientName} (${clientEmail}) authorized the estimate scope for ${activeProject?.name || 'Project'}.`,
            category: 'estimate_approved',
            priority: 'high',
            project_id: selectedProjectId,
            project_name: activeProject?.name,
            estimate_version_id: versionId,
            version_number: verNum,
          });
        } else if (decision === 'rejected') {
          notify({
            title: `❌ Client Rejected Scope Estimate: v${verNum}.0`,
            body: `${clientName} rejected the estimate scope: "${comment || 'No reason provided'}"`,
            category: 'estimate_status',
            priority: 'high',
            project_id: selectedProjectId,
            project_name: activeProject?.name,
            estimate_version_id: versionId,
            version_number: verNum,
          });
        } else if (decision === 'revision_requested') {
          notify({
            title: `🔄 Scope Revision Requested: v${verNum}.0`,
            body: `${clientName} requested adjustments on scope: "${comment || 'Revisions required'}"`,
            category: 'estimate_status',
            priority: 'normal',
            project_id: selectedProjectId,
            project_name: activeProject?.name,
            estimate_version_id: versionId,
            version_number: verNum,
          });
        }

        return {
          ...v,
          status: decision,
          approved_at: decision === 'approved' ? new Date().toISOString() : undefined,
          rejected_at: decision === 'rejected' ? new Date().toISOString() : undefined,
          revision_requested_at: decision === 'revision_requested' ? new Date().toISOString() : undefined,
        };
      })
    );
  };

  const handleGenerateWorkOrder = (
    versionId: string,
    kind: 'detailed' | 'summary' = 'detailed',
    includeBdt: boolean = true,
    customItems?: Array<{ title: string; hours: number }>
  ) => {
    const ver = versions.find((v) => v.id === versionId);
    if (!ver || ver.status !== 'approved') return;

    const seq = workOrders.length + 1;
    const woNum = `WO-20261030-${String(seq).padStart(4, '0')}`;
    const finalBdt = includeBdt ? (ver.total_bdt_snapshot ?? null) : null;

    // Resolve at least 3 items for detailed breakdown
    let woItems: Array<{ id?: string; title: string; hours: number }> = [];
    if (kind === 'detailed') {
      if (customItems && customItems.length >= 3) {
        woItems = customItems;
      } else if (ver.items && ver.items.length >= 3) {
        woItems = ver.items.map((it) => ({ id: it.id, title: it.title, hours: it.hours }));
      } else if (ver.items && ver.items.length > 0) {
        const existing = ver.items.map((it) => ({ id: it.id, title: it.title, hours: it.hours }));
        const needed = 3 - existing.length;
        const totalH = ver.total_hours_snapshot || 0;
        const existingSum = existing.reduce((s, it) => s + it.hours, 0);
        const rem = Math.max(0, totalH - existingSum);
        const defaults = [
          'Core Deliverables & System Integration',
          'Automated Verification & Unit Testing',
          'Production Deployment & Client QA Signoff',
        ];
        const extra = Array.from({ length: needed }).map((_, idx) => ({
          title: defaults[idx] || `Deliverable Scope Task ${existing.length + idx + 1}`,
          hours: rem > 0 ? Math.round((rem / needed) * 10) / 10 : Math.round((totalH * 0.2) * 10) / 10,
        }));
        woItems = [...existing, ...extra];
      } else {
        const totalH = ver.total_hours_snapshot || 0;
        woItems = [
          { title: 'Database Architecture & Security Configuration', hours: Math.round(totalH * 0.4 * 10) / 10 || 10 },
          { title: 'Core Workspace Workflows & API Implementation', hours: Math.round(totalH * 0.4 * 10) / 10 || 10 },
          { title: 'Quality Assurance, Verification & Client Signoff', hours: Math.round(totalH * 0.2 * 10) / 10 || 5 },
        ];
      }
    }

    const newWo: WorkOrder = {
      id: `wo-${Date.now()}`,
      organization_id: 'org-1',
      project_id: selectedProjectId,
      scope_package_id: ver.scope_package_id,
      approved_scope_version_id: ver.id,
      work_order_number: woNum,
      work_order_kind: kind,
      status: 'in_progress',
      hours_snapshot: ver.total_hours_snapshot,
      total_usd_snapshot: ver.total_usd_snapshot,
      total_bdt_snapshot: finalBdt,
      generated_at: new Date().toISOString(),
      approved_at_snapshot: ver.approved_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: woItems,
    };

    setWorkOrders((prev) => [newWo, ...prev]);

    const auditEntry: AuditEvent = {
      id: `audit-${Date.now()}`,
      organization_id: 'org-1',
      actor_user_id: currentUser.user_id,
      actor_role_snapshot: currentRole,
      entity_type: 'work_orders',
      entity_id: newWo.id,
      action: 'GENERATE_WORK_ORDER',
      before_state: null,
      after_state: {
        number: woNum,
        hours: ver.total_hours_snapshot,
        include_bdt: includeBdt,
        currency_mode: includeBdt ? 'USD + BDT' : 'USD only',
        items_count: woItems.length,
      },
      reason: includeBdt
        ? 'Official document generated with dual currency (USD + BDT)'
        : 'Official document generated with USD only (BDT omitted)',
      server_recorded_at: new Date().toISOString(),
      source: 'ui',
    };
    setAuditEvents((a) => [auditEntry, ...a]);

    notify({
      title: `📄 Work Order Created: ${woNum}`,
      body: `Generated for ${ver.total_hours_snapshot} hrs (${includeBdt ? 'USD + BDT' : 'USD only'}) with ${woItems.length} deliverable tasks.`,
      category: 'estimate_status',
      project_id: selectedProjectId,
      project_name: activeProject?.name,
    });

    // Post a work_order_card message to the conversation thread
    const pkg = packages.find((p) => p.id === ver.scope_package_id);
    const totalHoursFormatted = ver.total_hours_snapshot;
    const activeConvId = activeProject ? `conv-${activeProject.id}` : 'conv-1';
    const woConversationMsg: SafeMessage = {
      id: `msg-${Date.now()}-wo`,
      conversation_id: activeConvId,
      project_id: activeProject?.id,
      author_id: currentUser.user_id,
      author_name: currentUser.display_name,
      author_is_management: isSuperAdmin,
      content_json: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `📄 Work Order ${woNum} generated (${includeBdt ? 'USD + BDT' : 'USD only'}). Total: ${totalHoursFormatted}h with ${woItems.length} deliverables breakdown.`,
              },
            ],
          },
        ],
      },
      event_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_edited: false,
      is_deleted: false,
      attachments: [],
      work_order_card: {
        work_order_id: newWo.id,
        work_order_number: woNum,
        package_title: pkg?.title || 'Scope Package',
        hours_snapshot: ver.total_hours_snapshot,
        total_usd_snapshot: ver.total_usd_snapshot,
        total_bdt_snapshot: finalBdt,
        status: newWo.status,
        authorized_by: currentUser.display_name,
        generated_at: newWo.generated_at,
        items: woItems.map((it) => ({ title: it.title, hours: it.hours })),
      },
    };
    setMessages((prev) => [...prev, woConversationMsg]);
  };

  const handleEditEstimate = (
    versionId: string,
    updatedPackageTitle: string,
    updatedItems: Array<{ title: string; hours: number }>
  ) => {
    const ver = versions.find((v) => v.id === versionId);
    if (!ver) return;

    // Strict Immutability Guard: Cannot edit once approved or superseded
    if (ver.status === 'approved' || ver.status === 'superseded') {
      notify({
        title: 'Action Prohibited',
        body: 'Approved estimates are legally immutable contracts and cannot be edited.',
        category: 'system',
      });
      return;
    }

    const totalHours = updatedItems.reduce((acc, it) => acc + (Number(it.hours) || 0), 0);
    const rateUsd = activeFinancials?.client_rate_usd_per_hour ?? null;
    const rateBdt = activeFinancials?.client_rate_bdt_per_hour ?? null;

    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== versionId) return v;
        return {
          ...v,
          total_hours_snapshot: totalHours,
          total_usd_snapshot: rateUsd != null ? totalHours * rateUsd : null,
          total_bdt_snapshot: rateBdt != null ? totalHours * rateBdt : null,
          items: updatedItems.map((it, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            scope_version_id: versionId,
            position: idx + 1,
            title: it.title,
            hours: Number(it.hours) || 0,
            is_billable: true,
            created_at: new Date().toISOString(),
          })),
        };
      })
    );

    // Update package title if changed
    setPackages((prev) =>
      prev.map((p) => (p.id === ver.scope_package_id ? { ...p, title: updatedPackageTitle } : p))
    );

    // Update conversation card if any message contains this version
    setMessages((prev) =>
      prev.map((m) => {
        if (m.estimate_version_id === versionId || m.estimate_card?.version_id === versionId) {
          return {
            ...m,
            estimate_card: m.estimate_card
              ? {
                  ...m.estimate_card,
                  package_title: updatedPackageTitle,
                  total_hours: totalHours,
                  total_usd: rateUsd != null ? totalHours * rateUsd : null,
                  total_bdt: rateBdt != null ? totalHours * rateBdt : null,
                  items: updatedItems,
                }
              : null,
          };
        }
        return m;
      })
    );

    const auditEntry: AuditEvent = {
      id: `audit-${Date.now()}`,
      organization_id: 'org-1',
      actor_user_id: currentUser.user_id,
      actor_role_snapshot: currentRole,
      entity_type: 'scope_versions',
      entity_id: versionId,
      action: 'EDIT_ESTIMATE_VERSION',
      before_state: { hours: ver.total_hours_snapshot, items_count: ver.items?.length || 0 },
      after_state: { hours: totalHours, items_count: updatedItems.length, title: updatedPackageTitle },
      reason: 'Estimate line items and hours revised before client approval',
      server_recorded_at: new Date().toISOString(),
      source: 'ui',
    };
    setAuditEvents((a) => [auditEntry, ...a]);

    notify({
      title: `✏️ Estimate Updated: v${ver.version_number}.0`,
      body: `Scope updated to ${totalHours.toFixed(1)} hrs (${updatedItems.length} deliverables).`,
      category: 'estimate_status',
      project_id: selectedProjectId,
      project_name: activeProject?.name,
    });
  };

  const handleDeleteEstimate = (versionId: string) => {
    const ver = versions.find((v) => v.id === versionId);
    if (!ver) return;

    // Strict Immutability Guard: Cannot delete once approved or superseded
    if (ver.status === 'approved' || ver.status === 'superseded') {
      notify({
        title: 'Action Prohibited',
        body: 'Approved estimates are legally immutable contracts and cannot be deleted.',
        category: 'system',
      });
      return;
    }

    setVersions((prev) => prev.filter((v) => v.id !== versionId));

    // Remove or flag associated conversation cards
    setMessages((prev) =>
      prev.filter(
        (m) => m.estimate_version_id !== versionId && m.estimate_card?.version_id !== versionId
      )
    );

    const auditEntry: AuditEvent = {
      id: `audit-${Date.now()}`,
      organization_id: 'org-1',
      actor_user_id: currentUser.user_id,
      actor_role_snapshot: currentRole,
      entity_type: 'scope_versions',
      entity_id: versionId,
      action: 'DELETE_ESTIMATE_VERSION',
      before_state: { version_number: ver.version_number, hours: ver.total_hours_snapshot, status: ver.status },
      after_state: null,
      reason: 'Estimate proposal deleted by administrator before approval',
      server_recorded_at: new Date().toISOString(),
      source: 'ui',
    };
    setAuditEvents((a) => [auditEntry, ...a]);

    notify({
      title: `🗑️ Estimate Deleted: v${ver.version_number}.0`,
      body: `Estimate proposal (${ver.total_hours_snapshot} hrs) has been permanently removed.`,
      category: 'estimate_status',
      project_id: selectedProjectId,
      project_name: activeProject?.name,
    });
  };

  const handleEditWorkOrder = (
    woId: string,
    updatedItems: Array<{ title: string; hours: number }>
  ) => {
    const wo = workOrders.find((w) => w.id === woId);
    if (!wo) return;

    // Strict Immutability Guard: Prohibited once completed or delivered
    if (wo.status === 'completed' || wo.status === 'delivered') {
      notify({
        title: 'Action Prohibited',
        body: 'Completed work orders are immutable delivery records and cannot be edited.',
        category: 'system',
      });
      return;
    }

    const totalHours = updatedItems.reduce((acc, it) => acc + (Number(it.hours) || 0), 0);
    const rateUsd = activeFinancials?.client_rate_usd_per_hour ?? null;
    const rateBdt = activeFinancials?.client_rate_bdt_per_hour ?? null;

    setWorkOrders((prev) =>
      prev.map((w) => {
        if (w.id !== woId) return w;
        return {
          ...w,
          hours_snapshot: totalHours,
          total_usd_snapshot: rateUsd != null ? totalHours * rateUsd : w.total_usd_snapshot,
          total_bdt_snapshot: rateBdt != null && w.total_bdt_snapshot != null ? totalHours * rateBdt : w.total_bdt_snapshot,
          items: updatedItems,
          updated_at: new Date().toISOString(),
        };
      })
    );

    // Update conversation card if any message contains this work order
    setMessages((prev) =>
      prev.map((m) => {
        if (m.work_order_card?.work_order_id === woId) {
          return {
            ...m,
            work_order_card: {
              ...m.work_order_card,
              hours_snapshot: totalHours,
              items: updatedItems,
            },
          };
        }
        return m;
      })
    );

    const auditEntry: AuditEvent = {
      id: `audit-${Date.now()}`,
      organization_id: 'org-1',
      actor_user_id: currentUser.user_id,
      actor_role_snapshot: currentRole,
      entity_type: 'work_orders',
      entity_id: woId,
      action: 'EDIT_WORK_ORDER',
      before_state: { hours: wo.hours_snapshot, items_count: wo.items?.length || 0 },
      after_state: { hours: totalHours, items_count: updatedItems.length },
      reason: 'Work order deliverables adjusted prior to final delivery signoff',
      server_recorded_at: new Date().toISOString(),
      source: 'ui',
    };
    setAuditEvents((a) => [auditEntry, ...a]);

    notify({
      title: `✏️ Work Order Updated: ${wo.work_order_number}`,
      body: `Work order items revised to ${totalHours.toFixed(1)} hrs.`,
      category: 'estimate_status',
      project_id: selectedProjectId,
      project_name: activeProject?.name,
    });
  };

  const handleDeleteWorkOrder = (woId: string) => {
    const wo = workOrders.find((w) => w.id === woId);
    if (!wo) return;

    // Strict Immutability Guard: Prohibited once completed or delivered
    if (wo.status === 'completed' || wo.status === 'delivered') {
      notify({
        title: 'Action Prohibited',
        body: 'Completed work orders are immutable delivery records and cannot be deleted.',
        category: 'system',
      });
      return;
    }

    setWorkOrders((prev) => prev.filter((w) => w.id !== woId));

    // Remove associated conversation card
    setMessages((prev) =>
      prev.filter((m) => m.work_order_card?.work_order_id !== woId)
    );

    const auditEntry: AuditEvent = {
      id: `audit-${Date.now()}`,
      organization_id: 'org-1',
      actor_user_id: currentUser.user_id,
      actor_role_snapshot: currentRole,
      entity_type: 'work_orders',
      entity_id: woId,
      action: 'DELETE_WORK_ORDER',
      before_state: { number: wo.work_order_number, hours: wo.hours_snapshot, status: wo.status },
      after_state: null,
      reason: 'Work order deleted by administrator prior to delivery',
      server_recorded_at: new Date().toISOString(),
      source: 'ui',
    };
    setAuditEvents((a) => [auditEntry, ...a]);

    notify({
      title: `🗑️ Work Order Deleted: ${wo.work_order_number}`,
      body: `Work order has been removed from project records.`,
      category: 'estimate_status',
      project_id: selectedProjectId,
      project_name: activeProject?.name,
    });
  };

  const handleUpdateWorkOrderStatus = (woId: string, status: any) => {
    setWorkOrders((prev) =>
      prev.map((wo) => {
        if (wo.id !== woId) return wo;
        const updated = {
          ...wo,
          status,
          delivered_at: status === 'delivered' ? new Date().toISOString() : wo.delivered_at,
          completed_at: status === 'completed' ? new Date().toISOString() : wo.completed_at,
        };

        const auditEntry: AuditEvent = {
          id: `audit-${Date.now()}`,
          organization_id: 'org-1',
          actor_user_id: currentUser.user_id,
          actor_role_snapshot: currentRole,
          entity_type: 'work_orders',
          entity_id: woId,
          action: `WORK_ORDER_${String(status).toUpperCase()}`,
          before_state: { status: wo.status },
          after_state: { status },
          reason: 'Work order lifecycle progression',
          server_recorded_at: new Date().toISOString(),
          source: 'ui',
        };
        setAuditEvents((a) => [auditEntry, ...a]);

        notify({
          title: `🚀 Work Order Status: ${String(status).toUpperCase()}`,
          body: `${wo.work_order_number} progressed to ${status}.`,
          category: 'estimate_status',
          project_id: selectedProjectId,
          project_name: activeProject?.name,
        });

        return updated;
      })
    );

    // Also update work_order_card status in conversation messages
    setMessages((prev) =>
      prev.map((m) => {
        if (m.work_order_card?.work_order_id === woId) {
          return {
            ...m,
            work_order_card: {
              ...m.work_order_card!,
              status: status as any,
            },
          };
        }
        return m;
      })
    );
  };

  // Feature 1: Mark active project as completed (Admin-only, manual confirmation)
  const handleMarkProjectComplete = () => {
    if (!activeProject) return;

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== activeProject.id) return p;
        return { ...p, status: 'completed' as const, updated_at: new Date().toISOString() };
      })
    );

    const auditEntry: AuditEvent = {
      id: `audit-${Date.now()}`,
      organization_id: 'org-1',
      actor_user_id: currentUser.user_id,
      actor_role_snapshot: currentRole,
      entity_type: 'projects',
      entity_id: activeProject.id,
      action: 'MARK_PROJECT_COMPLETED',
      before_state: { status: 'active' },
      after_state: { status: 'completed' },
      reason: 'Admin manually confirmed project completion',
      server_recorded_at: new Date().toISOString(),
      source: 'ui',
    };
    setAuditEvents((a) => [auditEntry, ...a]);

    notify({
      title: `🎉 Project Completed: ${activeProject.name}`,
      body: `Admin manually confirmed project completion for ${activeProject.name}.`,
      category: 'system',
      project_id: activeProject.id,
      project_name: activeProject.name,
    });

    setIsMarkCompleteDialogOpen(false);
  };

  const handleConfirmCorrection = (messageId: string, newIsoString: string, reason: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;

        const auditEntry: AuditEvent = {
          id: `audit-${Date.now()}`,
          organization_id: 'org-1',
          actor_user_id: currentUser.user_id,
          actor_role_snapshot: 'super_admin',
          entity_type: 'messages',
          entity_id: messageId,
          action: 'CORRECT_EVENT_TIMESTAMP',
          before_state: { event_at: m.event_at },
          after_state: { event_at: newIsoString },
          reason,
          server_recorded_at: new Date().toISOString(),
          source: 'ui',
        };
        setAuditEvents((a) => [auditEntry, ...a]);

        notify({
          title: '⏱️ Business Event Time Corrected',
          body: `Super Admin adjusted display event instant (Reason: ${reason}).`,
          category: 'conversation',
          project_id: selectedProjectId,
          project_name: activeProject?.name,
        });

        return {
          ...m,
          event_at: newIsoString,
        };
      })
    );
  };

  const reviewVersion = versions.find((v) => v.id === reviewVersionId) || null;

  // Unauthenticated users see the Login Screen
  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="h-screen-dvh w-screen flex flex-col theme-surface-canvas overflow-hidden text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Application Bar */}
      <header className="h-14 theme-surface-header border-b flex items-center justify-between px-3 sm:px-4 z-20 shrink-0 shadow-xs">
        {/* Brand & Left Navigation Controls */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Navigation Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="lg:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition shrink-0"
            title="Open Projects & Clients Drawer"
            aria-label="Open navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Left Sidebar Toggle (Optimizes space on 13" laptops) */}
          <button
            type="button"
            onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition shrink-0"
            title={isLeftPanelCollapsed ? "Expand Projects Panel" : "Collapse Projects Panel"}
          >
            {isLeftPanelCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          {/* Brand Logo & Global Company Setup */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => (isAdmin || isSuperAdmin) && setIsCompanySettingsModalOpen(true)}
              className={`flex items-center gap-2 group text-left ${
                isAdmin || isSuperAdmin ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
              }`}
              title={isAdmin || isSuperAdmin ? "Company & Branding Settings (Click to configure)" : companyName}
            >
              <div 
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-md text-xs sm:text-sm uppercase transition group-hover:scale-105"
                style={{ backgroundColor: accentColor }}
              >
                {companyName ? companyName.charAt(0) : 'A'}
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-bold tracking-tight text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1 leading-none">
                  <span className="truncate max-w-[120px] md:max-w-[180px]">{companyName}</span>
                  {(isAdmin || isSuperAdmin) && (
                    <span className="text-[10px] text-slate-400 group-hover:text-emerald-500 transition opacity-0 group-hover:opacity-100">
                      ⚙️
                    </span>
                  )}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono tracking-wider mt-0.5">
                  ACCELVIA WMS
                </span>
              </div>
            </button>
          </div>

          <span className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block shrink-0" />

          {/* Active Project & Assigned Client Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
            {activeClient && (
              <span className="flex items-center gap-1 min-w-0 truncate">
                <span className="font-semibold text-emerald-600 dark:text-teal-400 truncate max-w-[80px] sm:max-w-[130px]">
                  {activeClient.name}
                </span>
                <span className="text-slate-300 dark:text-slate-600">/</span>
              </span>
            )}
            <span className="hidden sm:inline shrink-0">Project:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[100px] sm:max-w-[180px] md:max-w-[240px]">
              {activeProject ? activeProject.name : 'No project selected'}
            </span>
          </div>
        </div>

        {/* Center Live Dual-Time Indicator (Isolated into TopNavDualClock to prevent root re-renders) */}
        <TopNavDualClock timezone={activeProject?.timezone || 'Asia/Dhaka'} />

        {/* Right Section: Push Notification Center, Theme Switcher, Role Switcher & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Projects Calendar & Master Work Orders Hub Button (md+ screens) */}
          <button
            type="button"
            onClick={() => setIsCalendarModalOpen(true)}
            className="hidden md:flex p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition shadow-xs items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer"
            title="Projects Calendar & Master Work Orders Hub"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
            <span className="hidden lg:inline">Calendar & Orders</span>
          </button>

          {/* Team Roster & Add Member Button (Super Admin & Admin on md+ screens) */}
          {(isAdmin || isSuperAdmin) && (
            <button
              type="button"
              onClick={() => setIsTeamModalOpen(true)}
              className="hidden md:flex p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition shadow-xs items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer"
              title="Manage Team Members & Add Users"
            >
              <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
              <span className="hidden lg:inline">Team</span>
            </button>
          )}

          {/* Push Notification Center Bell Button with live unread badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationMenuOpen(!isNotificationMenuOpen)}
              className="relative p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition shadow-xs flex items-center justify-center cursor-pointer"
              title={unreadCount > 0 ? `${unreadCount} unread push notification${unreadCount > 1 ? 's' : ''}` : 'Notifications & Push Alerts'}
              aria-label="Open notifications menu"
            >
              {unreadCount > 0 ? (
                <BellRingIcon className="w-4 h-4 text-emerald-600 dark:text-teal-400 animate-wiggle" />
              ) : (
                <BellIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              )}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-600 dark:bg-emerald-500 text-white text-[9px] font-bold font-mono px-1 min-w-[16px] h-4 rounded-full flex items-center justify-center shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Center Dropdown */}
            <NotificationCenterDropdown
              isOpen={isNotificationMenuOpen}
              onClose={() => setIsNotificationMenuOpen(false)}
              onSelectNotification={(notif) => {
                setIsNotificationMenuOpen(false);
                if (notif.category === 'estimate_approved' || notif.category === 'estimate_status') {
                  setMobileTab('scope');
                } else if (notif.category === 'conversation') {
                  setMobileTab('chat');
                }
              }}
            />
          </div>

          {/* Theme Toggle Button (sm+ screens) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="hidden sm:flex p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition shadow-xs items-center justify-center cursor-pointer"
            title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-emerald-600 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Admin & Super Admin Theme & Palette Customizer (sm+ screens) */}
          {(isAdmin || isSuperAdmin) && (
            <button
              type="button"
              onClick={() => setIsThemeModalOpen(true)}
              className="hidden sm:flex p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition shadow-xs items-center justify-center group cursor-pointer"
              title="Theme & Appearance Studio (Slack & Discord Themes)"
              aria-label="Customize Theme & Palette"
            >
              <Palette
                className="w-4 h-4 transition-transform group-hover:rotate-12"
                style={{ color: accentColor }}
              />
            </button>
          )}

          {/* Super Admin & Admin Pending Registrations Quick Pill */}
          {(isSuperAdmin || isAdmin) && totalPendingApprovalsCount > 0 && (
            <button
              type="button"
              onClick={() => setIsTeamModalOpen(true)}
              className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 animate-pulse cursor-pointer shadow-xs shrink-0"
              title="Review and approve pending registrations & designation requests"
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">{totalPendingApprovalsCount} Pending</span>
              <span className="sm:hidden font-mono">{totalPendingApprovalsCount}</span>
            </button>
          )}

          {/* User Profile Pill & Dropdown Menu */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800 hover:opacity-85 transition text-left cursor-pointer"
              title="User Account Menu & Sign Out"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-teal-400 shrink-0">
                {currentUser.display_name.charAt(0)}
              </div>
              <div className="hidden lg:block text-left text-xs">
                <div className="font-semibold text-slate-800 dark:text-slate-200 leading-none truncate max-w-[90px]">
                  {currentUser.display_name}
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[90px]" title={currentUser.designation || currentRole.replace('_', ' ')}>
                  {currentUser.designation || currentRole.replace('_', ' ')}
                </div>
              </div>
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-3 z-50 text-xs text-slate-800 dark:text-slate-100 space-y-2.5 animate-in fade-in duration-150">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div className="font-bold text-slate-900 dark:text-slate-100">{currentUser.display_name}</div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</div>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      {currentRole.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {currentUser.designation || 'Team Member'}
                    </span>
                  </div>
                </div>

                {/* Profile & Designation Self-Service (Available to All Users) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full text-left py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
                    <span>My Profile & Designation</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Edit
                  </span>
                </button>

                {/* Projects Calendar & Master Work Orders Hub (Direct Access on mobile) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsCalendarModalOpen(true);
                  }}
                  className="w-full text-left py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
                    <span>Calendar & Orders Hub</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    View
                  </span>
                </button>

                {/* Super Admin & Admin Team Management Action */}
                {(isSuperAdmin || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsTeamModalOpen(true);
                    }}
                    className="w-full text-left py-1.5 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      <span>Team & Approvals</span>
                    </div>
                    {totalPendingApprovalsCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono font-bold animate-pulse">
                        {totalPendingApprovalsCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Admin & Super Admin Company Setup */}
                {(isSuperAdmin || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsCompanySettingsModalOpen(true);
                    }}
                    className="w-full text-left py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
                      <span>Company & Branding Setup</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-[80px]">
                      {companyName}
                    </span>
                  </button>
                )}

                {/* Theme Toggle in Menu (especially for mobile users) */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="sm:hidden w-full text-left py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {isDark ? (
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>{isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {isDark ? 'Light' : 'Dark'}
                  </span>
                </button>

                {/* Admin & Super Admin Theme & Appearance Studio */}
                {(isSuperAdmin || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsThemeModalOpen(true);
                    }}
                    className="w-full text-left py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Palette className="w-3.5 h-3.5" style={{ color: accentColor }} />
                      <span>Theme & Appearance</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono capitalize truncate max-w-[80px]">
                      {preset.replace('-', ' ')}
                    </span>
                  </button>
                )}

                {/* Install Mobile PWA App Action */}
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    window.dispatchEvent(new CustomEvent('accelvia:show-install-prompt'));
                  }}
                  className="w-full text-left py-1.5 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold flex items-center justify-between transition cursor-pointer"
                  title="Install Accelvia on iOS or Android"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
                    <span>Install Mobile App</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-bold">
                    PWA
                  </span>
                </button>

                {/* Sign Out Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left py-1.5 px-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold flex items-center gap-2 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Three-Panel Area (Desktop & 13"+ Laptops: lg screen and above) */}
      <div className="flex-1 hidden lg:flex overflow-hidden">
        {/* Panel 1: Clients & Projects (Left) */}
        {!isLeftPanelCollapsed && (
          <LeftPanelClients
            clients={clients}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
            onCreateClient={handleCreateClient}
            onCreateProject={handleCreateProject}
          />
        )}

        {/* Panel 2: Scope, Estimates, Work Orders (Middle) */}
        {!isScopePanelCollapsed && (
          <MiddlePanelScope
            project={activeProject}
            client={activeClient}
            packages={activePackages}
            versions={activeVersions}
            workOrders={activeWorkOrders}
            financialSettings={activeFinancials}
            onUpdateFinancials={handleUpdateFinancials}
            onCreateEstimateDraft={handleCreateEstimateDraft}
            onOpenCreateEstimateModal={() => handleOpenCreateEstimateModal(true)}
            onEditEstimate={handleEditEstimate}
            onDeleteEstimate={handleDeleteEstimate}
            onEditWorkOrder={handleEditWorkOrder}
            onDeleteWorkOrder={handleDeleteWorkOrder}
            onSendEstimate={handleSendEstimate}
            onGenerateWorkOrder={handleGenerateWorkOrder}
            onUpdateWorkOrderStatus={handleUpdateWorkOrderStatus}
            onOpenClientReviewModal={(vId) => setReviewVersionId(vId)}
            onMarkComplete={() => setIsMarkCompleteDialogOpen(true)}
          />
        )}

        {/* Panel 3: Conversation (Right) */}
        <RightPanelConversation
          project={activeProject}
          client={activeClient}
          messages={activeMessages}
          versions={versions}
          packages={packages}
          teamMembers={teamMembers}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onApproveEstimate={handleApproveEstimateFromConversation}
          onGenerateWorkOrder={(vId) => {
            const v = versions.find((item) => item.id === vId);
            if (v) setWorkOrderModalVersion(v);
          }}
          onOpenAuditConsole={() => setIsAuditModalOpen(true)}
          onOpenEstimateDraftModal={() => handleOpenCreateEstimateModal(true)}
          onOpenCorrectTimeModal={(msg) => setTimeCorrectionMessage(msg)}
          onUpdateWorkOrderStatus={handleUpdateWorkOrderStatus}
        />
      </div>

      {/* Mobile & Tablet App Screen Views (Under lg: Single active screen with native bottom navigation) */}
      <div className="flex-1 flex flex-col lg:hidden overflow-hidden">
        {mobileTab === 'projects' && (
          <LeftPanelClients
            clients={clients}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
            onCreateClient={handleCreateClient}
            onCreateProject={handleCreateProject}
          />
        )}

        {mobileTab === 'scope' && (
          <MiddlePanelScope
            project={activeProject}
            client={activeClient}
            packages={activePackages}
            versions={activeVersions}
            workOrders={activeWorkOrders}
            financialSettings={activeFinancials}
            onUpdateFinancials={handleUpdateFinancials}
            onCreateEstimateDraft={handleCreateEstimateDraft}
            onOpenCreateEstimateModal={() => handleOpenCreateEstimateModal(true)}
            onEditEstimate={handleEditEstimate}
            onDeleteEstimate={handleDeleteEstimate}
            onEditWorkOrder={handleEditWorkOrder}
            onDeleteWorkOrder={handleDeleteWorkOrder}
            onSendEstimate={handleSendEstimate}
            onGenerateWorkOrder={handleGenerateWorkOrder}
            onUpdateWorkOrderStatus={handleUpdateWorkOrderStatus}
            onOpenClientReviewModal={(vId) => setReviewVersionId(vId)}
            onMarkComplete={() => setIsMarkCompleteDialogOpen(true)}
            onBackToProjects={() => setMobileTab('projects')}
          />
        )}

        {mobileTab === 'chat' && (
          <RightPanelConversation
            project={activeProject}
            client={activeClient}
            messages={activeMessages}
            versions={versions}
            packages={packages}
            teamMembers={teamMembers}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onApproveEstimate={handleApproveEstimateFromConversation}
            onGenerateWorkOrder={(vId) => {
              const v = versions.find((item) => item.id === vId);
              if (v) setWorkOrderModalVersion(v);
            }}
            onOpenAuditConsole={() => setIsAuditModalOpen(true)}
            onOpenEstimateDraftModal={() => handleOpenCreateEstimateModal(true)}
            onOpenCorrectTimeModal={(msg) => setTimeCorrectionMessage(msg)}
            onUpdateWorkOrderStatus={handleUpdateWorkOrderStatus}
            onBackToProjects={() => setMobileTab('projects')}
          />
        )}
      </div>

      {/* Mobile App Native Bottom Navigation Bar */}
      <nav className="lg:hidden h-16 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-around px-2 z-20 pb-safe shrink-0 select-none shadow-lg">
        {/* Projects Tab */}
        <button
          type="button"
          onClick={() => setMobileTab('projects')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
            mobileTab === 'projects'
              ? 'text-emerald-600 dark:text-teal-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <FolderKanban className={`w-5 h-5 ${mobileTab === 'projects' ? 'text-emerald-600 dark:text-teal-400 stroke-[2.5]' : ''}`} />
            {projects.length > 0 && (
              <span className="absolute -top-1 -right-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono px-1 rounded-full border border-slate-300 dark:border-slate-700">
                {projects.length}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1">Projects</span>
        </button>

        {/* Scope Tab */}
        <button
          type="button"
          onClick={() => setMobileTab('scope')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
            mobileTab === 'scope'
              ? 'text-emerald-600 dark:text-teal-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Layers className={`w-5 h-5 ${mobileTab === 'scope' ? 'text-emerald-600 dark:text-teal-400 stroke-[2.5]' : ''}`} />
            {totalApprovedHours > 0 && (
              <span className="absolute -top-1 -right-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-[10px] font-mono px-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                {totalApprovedHours}h
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1">Scope</span>
        </button>

        {/* Conversation / Chat Tab */}
        <button
          type="button"
          onClick={() => setMobileTab('chat')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
            mobileTab === 'chat'
              ? 'text-emerald-600 dark:text-teal-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <MessageSquare className={`w-5 h-5 ${mobileTab === 'chat' ? 'text-emerald-600 dark:text-teal-400 stroke-[2.5]' : ''}`} />
            {activeMessages.length > 0 && (
              <span className="absolute -top-1 -right-2.5 bg-emerald-100 dark:bg-teal-950 text-emerald-800 dark:text-teal-400 text-[10px] font-mono px-1 rounded-full border border-emerald-300 dark:border-teal-800">
                {activeMessages.length}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1">Chat</span>
        </button>
      </nav>

      {/* Slide-over Mobile Drawer for Quick Project Switching */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] h-full bg-white dark:bg-slate-950 shadow-2xl z-10 flex flex-col border-r border-slate-200 dark:border-slate-800">
            <LeftPanelClients
              clients={clients}
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={handleSelectProject}
              onCreateClient={handleCreateClient}
              onCreateProject={handleCreateProject}
              onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Super Admin Audit Console Modal */}
      {isSuperAdmin && (
        <AuditConsoleModal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
          auditEvents={auditEvents}
        />
      )}

      {/* Instant Estimate Creation Modal (Opened from Chat or Scope buttons) */}
      {activeProject && (
        <CreateEstimateModal
          isOpen={isCreateEstimateModalOpen}
          onClose={() => setIsCreateEstimateModalOpen(false)}
          packages={activePackages}
          projectName={activeProject.name}
          financialSettings={activeFinancials}
          defaultPostToConversation={createEstimatePostToChatDefault}
          onSubmit={({ pkgId, packageTitle, items, postToConversation }) => {
            handleCreateEstimateDraft(pkgId, packageTitle, items, postToConversation);
          }}
        />
      )}

      {/* Standalone Client Review Portal Simulator */}
      {activeProject && (
        <ClientReviewModal
          isOpen={Boolean(reviewVersionId)}
          onClose={() => setReviewVersionId(null)}
          version={reviewVersion}
          project={activeProject}
          onClientDecision={handleClientDecision}
        />
      )}

      {/* Generate Work Order Modal (Option to create with BDT or without BDT) */}
      {workOrderModalVersion && activeProject && (
        <GenerateWorkOrderModal
          isOpen={Boolean(workOrderModalVersion)}
          onClose={() => setWorkOrderModalVersion(null)}
          version={workOrderModalVersion}
          packageItem={packages.find((p) => p.id === workOrderModalVersion.scope_package_id)}
          projectName={activeProject.name}
          canViewMoney={canViewMoney}
          onConfirm={(vId, kind, includeBdt, items) => {
            handleGenerateWorkOrder(vId, kind, includeBdt, items);
            setWorkOrderModalVersion(null);
          }}
        />
      )}

      {/* Super Admin Privileged Event Time Correction Modal */}
      {isSuperAdmin && activeProject && (
        <CorrectEventTimeModal
          isOpen={Boolean(timeCorrectionMessage)}
          onClose={() => setTimeCorrectionMessage(null)}
          message={timeCorrectionMessage}
          projectIanaTimezone={activeProject.timezone}
          onConfirmCorrection={handleConfirmCorrection}
        />
      )}

      {/* Team & Role Management Modal (Super Admin & Admin) */}
      {(isSuperAdmin || isAdmin) && (
        <TeamManagementModal
          isOpen={isTeamModalOpen}
          onClose={() => setIsTeamModalOpen(false)}
        />
      )}

      {/* User Self-Service Profile & Designation Request Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Mandatory Temporary Password Reset Modal (Google L5 Security Enforcement) */}
      <TemporaryPasswordModal
        isOpen={mustChangePassword}
      />

      {/* Admin Confirm Project Completion Modal */}
      {isMarkCompleteDialogOpen && activeProject && (
        <Modal
          isOpen={isMarkCompleteDialogOpen}
          onClose={() => setIsMarkCompleteDialogOpen(false)}
          title="Confirm Project Completion"
          subtitle={`Mark "${activeProject.name}" as completed`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <p>
              Are you sure you want to mark project <strong className="text-slate-900 dark:text-slate-100">{activeProject.name}</strong> as <strong>Completed</strong>?
            </p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              This will transition the project status to Completed and create an immutable audit log entry. All historical deliverables, work orders, and chat logs remain fully accessible.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsMarkCompleteDialogOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkProjectComplete}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Completion</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Additional Scope Budget Confirmation Dialog */}
      {budgetUpdateDialog && budgetUpdateDialog.isOpen && (
        <Modal
          isOpen={budgetUpdateDialog.isOpen}
          onClose={() => setBudgetUpdateDialog(null)}
          title="Update Internal Budget?"
          subtitle={`Additional scope approved for "${budgetUpdateDialog.packageTitle}"`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <p>
              This additional estimate adds <strong className="text-emerald-600 font-mono font-bold">+{budgetUpdateDialog.newAdditionalHours} hrs</strong> to the project scope.
            </p>
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Budget:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {budgetUpdateDialog.currentBudgetHours != null ? `${budgetUpdateDialog.currentBudgetHours} hrs` : 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Additional Scope:</span>
                <span className="font-mono font-bold text-emerald-600">
                  +{budgetUpdateDialog.newAdditionalHours} hrs
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800 font-semibold">
                <span>Suggested New Budget Total:</span>
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {budgetUpdateDialog.suggestedTotal} hrs
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Confirmed Total Budget Hours:
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={budgetUpdateDialog.confirmedHours}
                onChange={(e) =>
                  setBudgetUpdateDialog((prev) =>
                    prev ? { ...prev, confirmedHours: Number(e.target.value) || 0 } : null
                  )
                }
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBudgetUpdateDialog(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Keep Current Budget
              </button>
              <button
                type="button"
                onClick={() => {
                  const hours = budgetUpdateDialog.confirmedHours;
                  handleUpdateFinancials({ internal_budget_hours: hours });
                  setBudgetUpdateDialog(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm New Budget</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Projects Calendar & Master Work Orders Hub */}
      <ProjectCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        projects={projects}
        clients={clients}
        workOrders={workOrders}
        packages={packages}
        onSelectProject={handleSelectProject}
        onUpdateWorkOrderStatus={handleUpdateWorkOrderStatus}
      />

      {/* Global Company Name & Branding Setup Modal */}
      <CompanySettingsModal
        isOpen={isCompanySettingsModalOpen}
        onClose={() => setIsCompanySettingsModalOpen(false)}
      />

      {/* Admin Theme & Appearance Studio Modal (Slack & Discord Themes) */}
      <ThemeCustomizerModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      {/* Floating Web Push Toast Notifications Stack */}
      <PushToastContainer
        onNavigateToScope={() => setMobileTab('scope')}
        onNavigateToChat={() => setMobileTab('chat')}
      />

      {/* PWA In-App Install Prompt Banner & iOS Safari Setup Guide */}
      <InstallAppBanner />
    </div>
  );
};
