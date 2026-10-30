// src/features/workspace/WorkspaceLayout.tsx
// Core Three-Panel Workspace Layout with live state management and developer role switcher

import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { LeftPanelClients } from './LeftPanelClients';
import { MiddlePanelScope } from './MiddlePanelScope';
import { RightPanelConversation } from './RightPanelConversation';
import { AuditConsoleModal } from '../audit/AuditConsoleModal';
import { ClientReviewModal } from '../approvals/ClientReviewModal';
import { CorrectEventTimeModal } from '../audit/CorrectEventTimeModal';
import { 
  Client, 
  Project, 
  ScopePackage, 
  ScopeVersion, 
  WorkOrder, 
  SafeMessage, 
  AuditEvent,
  ProjectFinancialSettings
} from '../../types';
import {
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
  PanelLeftOpen
} from 'lucide-react';
import { Sun, Moon } from '../../components/ThemeIcons';
import { BellIcon, BellRingIcon } from '../../components/NotificationIcons';
import { useNotifications } from '../notifications/NotificationContext';
import { NotificationCenterDropdown } from '../notifications/NotificationCenterDropdown';
import { PushToastContainer } from '../notifications/PushToastContainer';

export const WorkspaceLayout: React.FC = () => {
  const { currentRole, setRole, currentUser, isSuperAdmin, isMember } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { notify, unreadCount } = useNotifications();

  // Notification center menu open state
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);

  // Primary state stores
  const [clients, setClients] = useState<Client[]>(SEED_CLIENTS);
  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('proj-1');

  const [financials, setFinancials] = useState<Record<string, ProjectFinancialSettings>>(SEED_FINANCIALS);
  const [packages, setPackages] = useState<ScopePackage[]>(SEED_PACKAGES);
  const [versions, setVersions] = useState<ScopeVersion[]>(SEED_VERSIONS);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(SEED_WORK_ORDERS);
  const [messages, setMessages] = useState<SafeMessage[]>(SEED_MESSAGES);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(SEED_AUDIT_EVENTS);

  // Modals state
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [reviewVersionId, setReviewVersionId] = useState<string | null>(null);
  const [timeCorrectionMessage, setTimeCorrectionMessage] = useState<SafeMessage | null>(null);

  // Responsive view & collapsible panel state
  const [mobileTab, setMobileTab] = useState<'projects' | 'scope' | 'chat'>('chat');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isScopePanelCollapsed, setIsScopePanelCollapsed] = useState(false);

  // Active project and assigned client company
  const activeProject: Project | null = projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  const activeClient: Client | null = activeProject?.client_id
    ? clients.find((c) => c.id === activeProject.client_id) || null
    : null;
  const activeFinancials = activeProject ? financials[activeProject.id] : undefined;
  const activePackages = activeProject ? packages.filter((p) => p.project_id === activeProject.id) : [];
  const activeVersions = versions.filter((v) =>
    activePackages.some((pkg) => pkg.id === v.scope_package_id)
  );
  const activeWorkOrders = activeProject ? workOrders.filter((wo) => wo.project_id === activeProject.id) : [];

  // Authoritative approved hours for mobile badge
  const packagesWithVersions = activePackages.map((pkg) => ({
    ...pkg,
    versions: versions.filter((v) => v.scope_package_id === pkg.id),
  }));
  const totalApprovedHours = calculateProjectApprovedHours(packagesWithVersions);

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setMobileTab('chat');
    setIsMobileDrawerOpen(false);
  };

  // Live Bangladesh & Local clock in top nav
  const [currentTimeInstant, setCurrentTimeInstant] = useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTimeInstant(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const topDualTime = formatDualTime(currentTimeInstant, activeProject?.timezone || 'Asia/Dhaka');

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

    // Initialize default project financials for this newly created project
    setFinancials((prev) => ({
      ...prev,
      [newProj.id]: {
        project_id: newProj.id,
        internal_budget_hours: 100,
        internal_budget_amount_usd: 5000,
        internal_budget_amount_bdt: 600000,
        internal_cost_rate_usd_per_hour: 25,
        internal_cost_rate_bdt_per_hour: 3000,
        client_rate_usd_per_hour: 50,
        client_rate_bdt_per_hour: 6000,
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

  // Helper to extract text from Tiptap JSON document for push notification previews
  const extractMessageSnippet = (contentJson: Record<string, unknown>): string => {
    try {
      const doc = contentJson as any;
      if (Array.isArray(doc?.content)) {
        const texts: string[] = [];
        const recurse = (node: any) => {
          if (node?.text) texts.push(node.text);
          if (Array.isArray(node?.content)) node.content.forEach(recurse);
        };
        doc.content.forEach(recurse);
        if (texts.length > 0) return texts.join(' ').trim();
      }
    } catch {}
    return 'New message in conversation thread';
  };

  const handleSendMessage = (contentJson: Record<string, unknown>, attachments: File[]) => {
    const newMsg: SafeMessage = {
      id: `msg-${Date.now()}`,
      conversation_id: 'conv-1',
      author_id: currentUser.user_id,
      author_name: currentUser.display_name,
      author_is_management: isSuperAdmin,
      content_json: contentJson,
      event_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_edited: false,
      is_deleted: false,
      attachments: attachments.map((f, i) => ({
        id: `att-${Date.now()}-${i}`,
        message_id: `msg-${Date.now()}`,
        storage_bucket: 'attachments',
        storage_path: `conv-1/${f.name}`,
        original_filename: f.name,
        mime_type: f.type,
        size_bytes: f.size,
        created_at: new Date().toISOString(),
      })),
    };
    setMessages((prev) => [...prev, newMsg]);

    // Dispatch real-time web push notification for conversation message
    const snippet = extractMessageSnippet(contentJson);
    notify({
      title: `💬 New Message (${currentUser.display_name})`,
      body: snippet.length > 120 ? `${snippet.slice(0, 117)}...` : snippet,
      category: 'conversation',
      project_id: activeProject?.id,
      project_name: activeProject?.name,
      author_name: currentUser.display_name,
    });
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
    items: Array<{ title: string; hours: number }>
  ) => {
    let targetPkgId = pkgId;
    if (!targetPkgId) {
      const newPkg: ScopePackage = {
        id: `pkg-${Date.now()}`,
        organization_id: 'org-1',
        project_id: selectedProjectId,
        package_kind: packages.length === 0 ? 'initial' : 'additional',
        title: title || 'Additional Work Scope',
        created_at: new Date().toISOString(),
      };
      setPackages((prev) => [...prev, newPkg]);
      targetPkgId = newPkg.id;
    }

    const pkgExistingVersions = versions.filter((v) => v.scope_package_id === targetPkgId);
    const verNumber = pkgExistingVersions.length + 1;
    const totalHours = items.reduce((acc, it) => acc + (Number(it.hours) || 0), 0);
    const rateUsd = activeFinancials?.client_rate_usd_per_hour || 50;
    const rateBdt = activeFinancials?.client_rate_bdt_per_hour || 6000;

    const newVersion: ScopeVersion = {
      id: `ver-${Date.now()}`,
      scope_package_id: targetPkgId,
      version_number: verNumber,
      status: 'draft',
      revision_type: verNumber === 1 ? 'initial' : 'replacement',
      client_rate_usd_per_hour_snapshot: rateUsd,
      client_rate_bdt_per_hour_snapshot: rateBdt,
      total_hours_snapshot: totalHours,
      total_usd_snapshot: totalHours * rateUsd,
      total_bdt_snapshot: totalHours * rateBdt,
      created_at: new Date().toISOString(),
      event_at: new Date().toISOString(),
      items: items.map((it, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        scope_version_id: `ver-${Date.now()}`,
        position: idx,
        title: it.title,
        hours: it.hours,
        is_billable: true,
        created_at: new Date().toISOString(),
      })),
    };

    setVersions((prev) => [...prev, newVersion]);

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
  };

  const handleSendEstimate = (versionId: string, email: string, postToConversation: boolean = true) => {
    let targetVer: ScopeVersion | undefined;

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
          after_state: { status: 'pending', recipient: email },
          reason: 'Sent to client with expiring review token',
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
    notify({
      title: `📤 Estimate Sent to Client: v${verNum}.0`,
      body: `Estimate Scope (${hrs} hrs) dispatched to ${email}. Status updated to Pending Client Review.`,
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
        const newMsg: SafeMessage = {
          id: `msg-${Date.now()}`,
          conversation_id: 'conv-1',
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
            package_title: 'Core Project Scope',
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

  const handleGenerateWorkOrder = (versionId: string, kind: 'detailed' | 'summary') => {
    const ver = versions.find((v) => v.id === versionId);
    if (!ver || ver.status !== 'approved') return;

    const seq = workOrders.length + 1;
    const woNum = `WO-20261030-${String(seq).padStart(4, '0')}`;

    const newWo: WorkOrder = {
      id: `wo-${Date.now()}`,
      organization_id: 'org-1',
      project_id: selectedProjectId,
      scope_package_id: ver.scope_package_id,
      approved_scope_version_id: ver.id,
      work_order_number: woNum,
      work_order_kind: kind,
      status: 'approved',
      hours_snapshot: ver.total_hours_snapshot,
      total_usd_snapshot: ver.total_usd_snapshot,
      total_bdt_snapshot: ver.total_bdt_snapshot,
      generated_at: new Date().toISOString(),
      approved_at_snapshot: ver.approved_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
      after_state: { number: woNum, hours: ver.total_hours_snapshot },
      reason: 'Official document generated from approved scope version',
      server_recorded_at: new Date().toISOString(),
      source: 'ui',
    };
    setAuditEvents((a) => [auditEntry, ...a]);

    notify({
      title: `📄 Work Order Created: ${woNum}`,
      body: `Generated for ${ver.total_hours_snapshot} hrs from approved estimate scope v${ver.version_number}.0.`,
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

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Application Bar */}
      <header className="h-14 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-4 z-20 shrink-0 shadow-xs">
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

          {/* Brand Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 dark:bg-teal-500 flex items-center justify-center font-bold text-white dark:text-slate-950 shadow-md shadow-emerald-600/20 dark:shadow-teal-950 text-xs sm:text-sm">
              A
            </div>
            <span className="hidden sm:inline font-bold tracking-tight text-xs sm:text-sm text-slate-900 dark:text-slate-100">
              ACCELVIA <span className="text-emerald-600 dark:text-teal-400 font-mono text-[10px] sm:text-xs">WMS</span>
            </span>
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

        {/* Center Live Dual-Time Indicator */}
        {/* Full display for 15"+ laptop screens (xl and 2xl) */}
        <div className="hidden xl:flex items-center gap-4 text-xs font-mono bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 px-3 py-1 rounded-full text-slate-700 dark:text-slate-300 shrink-0">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
            <span>Project ({topDualTime.clientTzAbbrev}):</span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">{topDualTime.clientTime}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
            <span>Bangladesh (BST):</span>
            <span className="text-emerald-700 dark:text-teal-300 font-semibold">{topDualTime.bangladeshTime}</span>
          </div>
        </div>

        {/* Compact display for tablet / 13" laptop (md to xl) */}
        <div className="hidden md:flex xl:hidden items-center gap-2 text-xs font-mono bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 px-2.5 py-1 rounded-full text-slate-700 dark:text-slate-300 shrink-0">
          <span className="text-blue-700 dark:text-cyan-300 font-semibold">{topDualTime.clientTzAbbrev}: {topDualTime.clientTime}</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="text-emerald-700 dark:text-teal-300 font-semibold">BST: {topDualTime.bangladeshTime}</span>
        </div>

        {/* Mobile Mini Clock chip (< md) */}
        <div className="flex md:hidden items-center gap-1 text-[11px] font-mono bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 px-2 py-0.5 rounded-full text-emerald-700 dark:text-teal-300 shrink-0">
          <Clock className="w-3 h-3 text-emerald-600 dark:text-teal-400" />
          <span>{topDualTime.bangladeshTime}</span>
        </div>

        {/* Right Section: Push Notification Center, Theme Switcher, Role Switcher & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Push Notification Center Bell Button with live unread badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationMenuOpen(!isNotificationMenuOpen)}
              className="relative p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition shadow-xs flex items-center justify-center"
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

          {/* Theme Toggle Button (Light White & Green vs Dark Green & Dark) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition shadow-xs flex items-center justify-center"
            title={isDark ? "Switch to Light Theme (White & Emerald Green)" : "Switch to Dark Theme (Dark Slate & Green)"}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-emerald-600 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Desktop/Tablet segmented role buttons */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 px-1.5 hidden md:inline">Role:</span>
            <button
              onClick={() => setRole('super_admin')}
              className={`px-2 py-0.5 rounded font-semibold text-xs transition ${
                currentRole === 'super_admin'
                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Super Admin
            </button>
            <button
              onClick={() => setRole('admin')}
              className={`px-2 py-0.5 rounded font-semibold text-xs transition ${
                currentRole === 'admin'
                  ? 'bg-emerald-100 dark:bg-teal-500/20 text-emerald-800 dark:text-teal-300 border border-emerald-300 dark:border-teal-500/40 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => setRole('member')}
              className={`px-2 py-0.5 rounded font-semibold text-xs transition ${
                currentRole === 'member'
                  ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Member
            </button>
          </div>

          {/* Mobile Role Switcher Select (< sm) */}
          <div className="sm:hidden">
            <select
              value={currentRole}
              onChange={(e) => setRole(e.target.value as any)}
              className={`text-[11px] font-bold rounded-lg px-2 py-1 border focus:outline-none transition ${
                currentRole === 'super_admin'
                  ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/50'
                  : currentRole === 'admin'
                  ? 'bg-emerald-50 dark:bg-teal-950/80 text-emerald-800 dark:text-teal-300 border-emerald-300 dark:border-teal-500/50'
                  : 'bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-500/50'
              }`}
            >
              <option value="super_admin" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Super Admin</option>
              <option value="admin" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Admin</option>
              <option value="member" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Member</option>
            </select>
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-1.5 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-teal-400 shrink-0">
              {currentUser.display_name.charAt(0)}
            </div>
            <div className="hidden lg:block text-left text-xs">
              <div className="font-semibold text-slate-800 dark:text-slate-200 leading-none truncate max-w-[90px]">
                {currentUser.display_name}
              </div>
              <div className="text-[10px] text-slate-500 capitalize">{currentRole.replace('_', ' ')}</div>
            </div>
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
            onSendEstimate={handleSendEstimate}
            onGenerateWorkOrder={handleGenerateWorkOrder}
            onUpdateWorkOrderStatus={handleUpdateWorkOrderStatus}
            onOpenClientReviewModal={(vId) => setReviewVersionId(vId)}
          />
        )}

        {/* Panel 3: Conversation (Right) */}
        <RightPanelConversation
          project={activeProject}
          client={activeClient}
          messages={messages}
          versions={versions}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onApproveEstimate={handleApproveEstimateFromConversation}
          onOpenAuditConsole={() => setIsAuditModalOpen(true)}
          onOpenEstimateDraftModal={() => handleCreateEstimateDraft(null, 'New Estimate Scope', [])}
          onOpenCorrectTimeModal={(msg) => setTimeCorrectionMessage(msg)}
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
            onSendEstimate={handleSendEstimate}
            onGenerateWorkOrder={handleGenerateWorkOrder}
            onUpdateWorkOrderStatus={handleUpdateWorkOrderStatus}
            onOpenClientReviewModal={(vId) => setReviewVersionId(vId)}
            onBackToProjects={() => setMobileTab('projects')}
          />
        )}

        {mobileTab === 'chat' && (
          <RightPanelConversation
            project={activeProject}
            client={activeClient}
            messages={messages}
            versions={versions}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onApproveEstimate={handleApproveEstimateFromConversation}
            onOpenAuditConsole={() => setIsAuditModalOpen(true)}
            onOpenEstimateDraftModal={() => handleCreateEstimateDraft(null, 'New Estimate Scope', [])}
            onOpenCorrectTimeModal={(msg) => setTimeCorrectionMessage(msg)}
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
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-2.5 bg-emerald-100 dark:bg-teal-950 text-emerald-800 dark:text-teal-400 text-[10px] font-mono px-1 rounded-full border border-emerald-300 dark:border-teal-800">
                {messages.length}
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

      {/* Floating Web Push Toast Notifications Stack */}
      <PushToastContainer
        onNavigateToScope={() => setMobileTab('scope')}
        onNavigateToChat={() => setMobileTab('chat')}
      />
    </div>
  );
};
