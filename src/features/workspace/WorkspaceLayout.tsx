// src/features/workspace/WorkspaceLayout.tsx
// Core Three-Panel Workspace Layout with live state management and developer role switcher

import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
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
import { 
  ShieldCheck, 
  UserCheck, 
  Clock, 
  Globe, 
  Layers, 
  ShieldAlert, 
  SlidersHorizontal 
} from 'lucide-react';

export const WorkspaceLayout: React.FC = () => {
  const { currentRole, setRole, currentUser, isSuperAdmin, isMember } = useAuth();

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

  // Active project
  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const activeFinancials = financials[selectedProjectId];
  const activePackages = packages.filter((p) => p.project_id === selectedProjectId);
  const activeVersions = versions.filter((v) =>
    activePackages.some((pkg) => pkg.id === v.scope_package_id)
  );
  const activeWorkOrders = workOrders.filter((wo) => wo.project_id === selectedProjectId);

  // Live Bangladesh & Local clock in top nav
  const [currentTimeInstant, setCurrentTimeInstant] = useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTimeInstant(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const topDualTime = formatDualTime(currentTimeInstant, activeProject.timezone);

  // Handlers
  const handleCreateClient = (clientData: Partial<Client>) => {
    const newClient: Client = {
      id: `client-${Date.now()}`,
      organization_id: 'org-1',
      name: clientData.name || 'New Client',
      status: 'active',
      notes_internal: clientData.notes_internal,
      default_timezone: clientData.default_timezone || 'America/New_York',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setClients((prev) => [...prev, newClient]);
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
  };

  const handleSendEstimate = (versionId: string, email: string) => {
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== versionId) return v;
        const updated = {
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

        return updated;
      })
    );
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

        return {
          ...m,
          event_at: newIsoString,
        };
      })
    );
  };

  const reviewVersion = versions.find((v) => v.id === reviewVersionId) || null;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden text-slate-100">
      {/* Top Application Bar */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 z-20 shrink-0">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-slate-950 shadow-md shadow-teal-950">
              A
            </div>
            <span className="font-bold tracking-tight text-sm text-slate-100">
              ACCELVIA <span className="text-teal-400 font-mono text-xs">WMS</span>
            </span>
          </div>

          <span className="h-4 w-px bg-slate-800" />

          {/* Active project quick badge */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Project:</span>
            <span className="font-semibold text-slate-200">{activeProject.name}</span>
          </div>
        </div>

        {/* Center Live Dual-Time Indicator */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono bg-slate-900/90 border border-slate-800/80 px-3 py-1 rounded-full text-slate-300">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Project ({topDualTime.clientTzAbbrev}):</span>
            <span className="text-slate-100 font-semibold">{topDualTime.clientTime}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span>Bangladesh (BST):</span>
            <span className="text-teal-300 font-semibold">{topDualTime.bangladeshTime}</span>
          </div>
        </div>

        {/* Right Section: Role Switcher & Profile */}
        <div className="flex items-center gap-3">
          {/* Developer Role Switcher (Crucial for testing all permission invariants) */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 px-1.5">Role:</span>
            <button
              onClick={() => setRole('super_admin')}
              className={`px-2 py-0.5 rounded font-semibold text-xs transition ${
                currentRole === 'super_admin'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Super Admin
            </button>
            <button
              onClick={() => setRole('admin')}
              className={`px-2 py-0.5 rounded font-semibold text-xs transition ${
                currentRole === 'admin'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => setRole('member')}
              className={`px-2 py-0.5 rounded font-semibold text-xs transition ${
                currentRole === 'member'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Member
            </button>
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-teal-400">
              {currentUser.display_name.charAt(0)}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <div className="font-semibold text-slate-200 leading-none">
                {currentUser.display_name}
              </div>
              <div className="text-[10px] text-slate-500 capitalize">{currentRole.replace('_', ' ')}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Three-Panel Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel 1: Clients & Projects (Left) */}
        <LeftPanelClients
          clients={clients}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={(id) => setSelectedProjectId(id)}
          onCreateClient={handleCreateClient}
          onCreateProject={handleCreateProject}
        />

        {/* Panel 2: Scope, Estimates, Work Orders (Middle) */}
        <MiddlePanelScope
          project={activeProject}
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

        {/* Panel 3: Conversation (Right) */}
        <RightPanelConversation
          project={activeProject}
          messages={messages}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onOpenAuditConsole={() => setIsAuditModalOpen(true)}
          onOpenEstimateDraftModal={() => handleCreateEstimateDraft(null, 'New Estimate Scope', [])}
          onOpenCorrectTimeModal={(msg) => setTimeCorrectionMessage(msg)}
        />
      </div>

      {/* Super Admin Audit Console Modal */}
      {isSuperAdmin && (
        <AuditConsoleModal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
          auditEvents={auditEvents}
        />
      )}

      {/* Standalone Client Review Portal Simulator */}
      <ClientReviewModal
        isOpen={Boolean(reviewVersionId)}
        onClose={() => setReviewVersionId(null)}
        version={reviewVersion}
        project={activeProject}
        onClientDecision={handleClientDecision}
      />

      {/* Super Admin Privileged Event Time Correction Modal */}
      {isSuperAdmin && (
        <CorrectEventTimeModal
          isOpen={Boolean(timeCorrectionMessage)}
          onClose={() => setTimeCorrectionMessage(null)}
          message={timeCorrectionMessage}
          projectIanaTimezone={activeProject.timezone}
          onConfirmCorrection={handleConfirmCorrection}
        />
      )}
    </div>
  );
};
