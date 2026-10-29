// src/features/workspace/MiddlePanelScope.tsx
// Middle Panel: Scope Packages, Versioned Estimates, Rates & Work Orders

import React, { useState } from 'react';
import { 
  Project, 
  Client,
  ScopePackage, 
  ScopeVersion, 
  WorkOrder, 
  ProjectFinancialSettings 
} from '../../types';
import { useAuth } from '../auth/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import { DualTimeBadge } from '../../components/DualTimeBadge';
import { Modal } from '../../components/Modal';
import { formatHours, formatUSD, formatBDT, calculateScopeTotals } from '../../lib/formatting/currency';
import { calculateProjectApprovedHours } from '../../lib/state-machines';
import { 
  FileSpreadsheet, 
  Layers, 
  FileCheck, 
  Send, 
  Plus, 
  Sliders, 
  ExternalLink, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  Eye, 
  FileText,
  Building2,
  ChevronLeft
} from 'lucide-react';

interface MiddlePanelScopeProps {
  project: Project | null;
  client?: Client | null;
  packages: ScopePackage[];
  versions: ScopeVersion[];
  workOrders: WorkOrder[];
  financialSettings?: ProjectFinancialSettings;
  onUpdateFinancials: (settings: Partial<ProjectFinancialSettings>) => void;
  onCreateEstimateDraft: (pkgId: string | null, title: string, items: Array<{ title: string; hours: number }>) => void;
  onSendEstimate: (versionId: string, email: string, postToConversation: boolean) => void;
  onGenerateWorkOrder: (versionId: string, kind: 'detailed' | 'summary') => void;
  onUpdateWorkOrderStatus: (woId: string, status: any) => void;
  onOpenClientReviewModal: (versionId: string) => void;
  onBackToProjects?: () => void;
}

export const MiddlePanelScope: React.FC<MiddlePanelScopeProps> = ({
  project,
  client,
  packages,
  versions,
  workOrders,
  financialSettings,
  onUpdateFinancials,
  onCreateEstimateDraft,
  onSendEstimate,
  onGenerateWorkOrder,
  onUpdateWorkOrderStatus,
  onOpenClientReviewModal,
  onBackToProjects,
}) => {
  const { canViewMoney, isSuperAdmin, isMember } = useAuth();

  // Active tab: 'scope' or 'work-orders'
  const [activeTab, setActiveTab] = useState<'scope' | 'work-orders'>('scope');

  // Modals
  const [isFinModalOpen, setIsFinModalOpen] = useState(false);
  const [isNewEstimateModalOpen, setIsNewEstimateModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedVersionForSend, setSelectedVersionForSend] = useState<ScopeVersion | null>(null);
  const [sendRecipientEmail, setSendRecipientEmail] = useState('robert@techspheredynamics.com');
  const [shareToConversation, setShareToConversation] = useState(true);

  const [previewWorkOrder, setPreviewWorkOrder] = useState<WorkOrder | null>(null);

  // Draft estimate creator state
  const [newEstimateTitle, setNewEstimateTitle] = useState('');
  const [newEstimatePkgId, setNewEstimatePkgId] = useState<string>('new');
  const [newEstimateItems, setNewEstimateItems] = useState<Array<{ title: string; hours: number }>>([
    { title: 'Core Implementation', hours: 20 },
    { title: 'Testing & Verification', hours: 10 },
  ]);

  // Financial form state
  const [formBudgetHours, setFormBudgetHours] = useState(financialSettings?.internal_budget_hours?.toString() || '120');
  const [formRateUsd, setFormRateUsd] = useState(financialSettings?.client_rate_usd_per_hour?.toString() || '50');
  const [formRateBdt, setFormRateBdt] = useState(financialSettings?.client_rate_bdt_per_hour?.toString() || '6000');

  // Calculate authoritative approved hours across packages
  const packagesWithVersions = packages.map((pkg) => ({
    ...pkg,
    versions: versions.filter((v) => v.scope_package_id === pkg.id),
  }));
  const totalApprovedHours = calculateProjectApprovedHours(packagesWithVersions);

  const handleAddItemRow = () => {
    setNewEstimateItems((prev) => [...prev, { title: '', hours: 0 }]);
  };

  const handleItemChange = (index: number, field: 'title' | 'hours', value: any) => {
    setNewEstimateItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: field === 'hours' ? Number(value) : value };
      return copy;
    });
  };

  const handleCreateEstimateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pkgId = newEstimatePkgId === 'new' ? null : newEstimatePkgId;
    onCreateEstimateDraft(pkgId, newEstimateTitle.trim(), newEstimateItems);
    setIsNewEstimateModalOpen(false);
    setNewEstimateTitle('');
  };

  const handleSendEstimateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVersionForSend) return;
    onSendEstimate(selectedVersionForSend.id, sendRecipientEmail, shareToConversation);
    setIsSendModalOpen(false);
    setSelectedVersionForSend(null);
  };

  const handleSaveFinancials = (e: React.FormEvent) => {
    e.preventDefault();
    const hours = Number(formBudgetHours) || 0;
    const usdRate = Number(formRateUsd) || 0;
    const bdtRate = Number(formRateBdt) || 0;

    onUpdateFinancials({
      internal_budget_hours: hours,
      client_rate_usd_per_hour: usdRate,
      client_rate_bdt_per_hour: bdtRate,
      internal_budget_amount_usd: hours * usdRate,
      internal_budget_amount_bdt: hours * bdtRate,
    });
    setIsFinModalOpen(false);
  };

  if (!project) {
    return (
      <div className="w-full lg:w-[350px] xl:w-[400px] 2xl:w-[460px] h-full flex flex-col items-center justify-center bg-slate-900/60 lg:border-r border-slate-800/80 p-8 text-center text-slate-500 shrink-0 min-w-0">
        <Layers className="w-12 h-12 text-slate-700 mb-3" />
        <h3 className="text-sm font-bold text-slate-300">No Project Selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Create a client and project from the left panel to begin managing scope, estimates, and work orders.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-[350px] xl:w-[400px] 2xl:w-[460px] h-full flex flex-col bg-slate-900/60 lg:border-r border-slate-800/80 shrink-0 min-w-0">
      {/* Project Overview Header */}
      <div className="p-3 sm:p-4 border-b border-slate-800/80 bg-slate-950/60">
        {onBackToProjects && (
          <button
            onClick={onBackToProjects}
            className="lg:hidden flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 mb-2 font-medium"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to Projects</span>
          </button>
        )}
        <div className="flex items-start justify-between">
          <div className="min-w-0 pr-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-400">
              Active Project Scope
            </div>
            <h2 className="text-base font-bold text-slate-100 truncate max-w-[200px] sm:max-w-[280px]">
              {project.name}
            </h2>

            {/* Assigned Client Company Profile Badge */}
            {client ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1">
                <Building2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="font-semibold text-slate-100 truncate">{client.name}</span>
                {client.contacts && client.contacts.length > 0 && (
                  <span className="text-[11px] text-slate-400 truncate hidden sm:inline max-w-[150px]">
                    ({client.contacts[0].name})
                  </span>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 italic mt-0.5">
                Internal / Unassigned Company
              </div>
            )}

            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>Timezone:</span>
              <span className="font-mono text-cyan-300">{project.timezone}</span>
            </div>
          </div>

          {canViewMoney && (
            <button
              onClick={() => setIsFinModalOpen(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 text-xs shrink-0"
              title="Project Financial Rates & Budgets (Confidential)"
            >
              <Sliders className="w-3.5 h-3.5 text-teal-400" />
              <span>Rates</span>
            </button>
          )}
        </div>

        {/* Aggregated Hours & Monetary KPI Cards */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          {/* Approved Hours Card (Always visible to all roles) */}
          <div className="bg-slate-900 border border-emerald-900/40 rounded-lg p-2.5">
            <div className="text-[10px] uppercase font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Approved Scope</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-300 mt-0.5">
              {formatHours(totalApprovedHours)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Across active approved versions
            </div>
          </div>

          {/* Internal Budget Card (Role restricted) */}
          {canViewMoney ? (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
              <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-cyan-400" />
                <span>Commercial Value</span>
              </div>
              <div className="text-sm font-bold font-mono text-slate-200 mt-1">
                {formatUSD(totalApprovedHours * (financialSettings?.client_rate_usd_per_hour || 50))}
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                {formatBDT(totalApprovedHours * (financialSettings?.client_rate_bdt_per_hour || 6000))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
              <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Budget Allocation</span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-300 mt-0.5">
                {formatHours(financialSettings?.internal_budget_hours || 120)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Internal scope allocation
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mt-3 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('scope')}
            className={`pb-2 px-1 text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'scope'
                ? 'border-b-2 border-teal-400 text-teal-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Scope Packages & Versions ({versions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('work-orders')}
            className={`pb-2 px-1 text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'work-orders'
                ? 'border-b-2 border-teal-400 text-teal-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Work Orders ({workOrders.length})</span>
          </button>
        </div>
      </div>

      {/* Middle Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'scope' ? (
          <>
            {/* Scope Actions Header */}
            {canViewMoney && (
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Estimate Packages
                </span>
                <button
                  onClick={() => setIsNewEstimateModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 text-xs font-medium flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Estimate</span>
                </button>
              </div>
            )}

            {/* Packages & Versions List */}
            {packages.map((pkg) => {
              const pkgVersions = versions
                .filter((v) => v.scope_package_id === pkg.id)
                .sort((a, b) => b.version_number - a.version_number);

              return (
                <div
                  key={pkg.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                      <span className="text-xs font-bold text-slate-200">{pkg.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {pkg.package_kind}
                      </span>
                    </div>
                  </div>

                  {/* Versions Accordion */}
                  <div className="space-y-2">
                    {pkgVersions.map((ver) => (
                      <div
                        key={ver.id}
                        className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-slate-200">
                              v{ver.version_number}.0
                            </span>
                            <StatusBadge status={ver.status} size="sm" />
                          </div>
                          <div className="text-xs font-mono font-semibold text-slate-300">
                            {formatHours(ver.total_hours_snapshot)}
                          </div>
                        </div>

                        {/* Financial Snapshot (Only for Admins / Super Admin) */}
                        {canViewMoney && ver.total_usd_snapshot != null && (
                          <div className="flex items-center justify-between text-xs font-mono text-slate-400 bg-slate-900/60 px-2 py-1 rounded border border-slate-800/50">
                            <span>Client Total:</span>
                            <div className="space-x-2">
                              <span className="text-slate-200 font-semibold">
                                {formatUSD(ver.total_usd_snapshot)}
                              </span>
                              <span className="text-slate-400">
                                {formatBDT(ver.total_bdt_snapshot)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Line items preview */}
                        {ver.items && ver.items.length > 0 && (
                          <div className="space-y-1 text-xs text-slate-400 pt-1">
                            {ver.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[11px]">
                                <span className="truncate max-w-[280px]">• {item.title}</span>
                                <span className="font-mono text-slate-300 shrink-0">
                                  {formatHours(item.hours)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Dual-Time Event Timestamp */}
                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                          <DualTimeBadge
                            isoInstant={ver.approved_at || ver.sent_at || ver.created_at}
                            projectIanaTimezone={project.timezone}
                          />

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1">
                            {/* If Draft: Show Send to Client */}
                            {ver.status === 'draft' && canViewMoney && (
                              <button
                                onClick={() => {
                                  setSelectedVersionForSend(ver);
                                  setIsSendModalOpen(true);
                                }}
                                className="px-2 py-1 rounded bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-[11px] flex items-center gap-1 transition"
                              >
                                <Send className="w-3 h-3" />
                                <span>Send</span>
                              </button>
                            )}

                            {/* If Pending: Review Link */}
                            {ver.status === 'pending' && (
                              <button
                                onClick={() => onOpenClientReviewModal(ver.id)}
                                className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[11px] font-medium flex items-center gap-1 transition"
                                title="Open Client Review Portal Simulator"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Review Portal</span>
                              </button>
                            )}

                            {/* If Approved: Generate Work Order */}
                            {ver.status === 'approved' && canViewMoney && (
                              <button
                                onClick={() => onGenerateWorkOrder(ver.id, 'detailed')}
                                className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-medium flex items-center gap-1 transition"
                              >
                                <FileCheck className="w-3 h-3" />
                                <span>Gen Work Order</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          /* Work Orders Tab */
          <div className="space-y-3">
            {workOrders.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-4 text-center">
                No work orders generated yet. Generate one from an approved estimate version.
              </div>
            ) : (
              workOrders.map((wo) => (
                <div
                  key={wo.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold font-mono text-slate-200">
                        {wo.work_order_number}
                      </span>
                    </div>
                    <StatusBadge status={wo.status} size="sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-2 rounded border border-slate-800/50">
                    <div>
                      <div className="text-slate-500 text-[10px] uppercase">Snapshot Hours</div>
                      <div className="font-mono text-slate-200 font-bold">
                        {formatHours(wo.hours_snapshot)}
                      </div>
                    </div>
                    {canViewMoney && wo.total_usd_snapshot != null && (
                      <div>
                        <div className="text-slate-500 text-[10px] uppercase">Total Value</div>
                        <div className="font-mono text-teal-300 font-bold">
                          {formatUSD(wo.total_usd_snapshot)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dual-Time Generation Stamp */}
                  <div className="flex items-center justify-between pt-1">
                    <DualTimeBadge
                      isoInstant={wo.generated_at}
                      projectIanaTimezone={project.timezone}
                    />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewWorkOrder(wo)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>

                      {canViewMoney && wo.status === 'in_progress' && (
                        <button
                          onClick={() => onUpdateWorkOrderStatus(wo.id, 'delivered')}
                          className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 text-[11px]"
                        >
                          Mark Delivered
                        </button>
                      )}

                      {canViewMoney && wo.status === 'delivered' && (
                        <button
                          onClick={() => onUpdateWorkOrderStatus(wo.id, 'completed')}
                          className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[11px]"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Financial Settings Modal */}
      <Modal
        isOpen={isFinModalOpen}
        onClose={() => setIsFinModalOpen(false)}
        title="Project Rates & Budgets"
        subtitle="Confidential internal commercial settings (Admin & Super Admin only)"
      >
        <form onSubmit={handleSaveFinancials} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Internal Budget Allocation (Hours)
            </label>
            <input
              type="number"
              step="0.01"
              value={formBudgetHours}
              onChange={(e) => setFormBudgetHours(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Client Rate (USD / hr)
              </label>
              <input
                type="number"
                step="0.01"
                value={formRateUsd}
                onChange={(e) => setFormRateUsd(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Client Rate (BDT / hr)
              </label>
              <input
                type="number"
                step="0.01"
                value={formRateBdt}
                onChange={(e) => setFormRateBdt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <strong>ADR 0005 Policy:</strong> Updating rates changes future draft estimates only. Previously sent estimates and generated work orders retain their immutable snapshots.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsFinModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition"
            >
              Update Settings
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Estimate Draft Modal */}
      <Modal
        isOpen={isNewEstimateModalOpen}
        onClose={() => setIsNewEstimateModalOpen(false)}
        title="Create Estimate Draft"
        subtitle="Add scope items and estimated hours"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateEstimateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Package Target</label>
            <select
              value={newEstimatePkgId}
              onChange={(e) => setNewEstimatePkgId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            >
              <option value="new">+ Create New Scope Package</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.title} ({pkg.package_kind})
                </option>
              ))}
            </select>
          </div>

          {newEstimatePkgId === 'new' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Package Title</label>
              <input
                type="text"
                required
                value={newEstimateTitle}
                onChange={(e) => setNewEstimateTitle(e.target.value)}
                placeholder="e.g. Additional Cloud Storage Scope"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-slate-300">Line Items & Hours</label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs text-teal-400 hover:underline flex items-center gap-1"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {newEstimateItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    placeholder="Task or deliverable name"
                    value={item.title}
                    onChange={(e) => handleItemChange(idx, 'title', e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="Hours"
                    value={item.hours}
                    onChange={(e) => handleItemChange(idx, 'hours', e.target.value)}
                    className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewEstimateModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition"
            >
              Save Draft
            </button>
          </div>
        </form>
      </Modal>

      {/* Send Estimate Modal */}
      <Modal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        title="Send Estimate for Client Approval"
        subtitle="Locks immutable version snapshot and issues secure review link"
      >
        <form onSubmit={handleSendEstimateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Client Recipient Email
            </label>
            <input
              type="email"
              required
              value={sendRecipientEmail}
              onChange={(e) => setSendRecipientEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-orange-950/40 border border-orange-500/50">
            <input
              type="checkbox"
              id="shareToConversation"
              checked={shareToConversation}
              onChange={(e) => setShareToConversation(e.target.checked)}
              className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 bg-slate-900 border-slate-700 cursor-pointer"
            />
            <label htmlFor="shareToConversation" className="text-xs text-orange-200 font-semibold cursor-pointer">
              Post interactive estimate card to project conversation feed
            </label>
          </div>

          <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
            <div className="font-semibold text-teal-300">Immutability Notice:</div>
            <div>
              Sending this estimate transitions status to <strong>Pending</strong> and permanently snapshots total hours ({formatHours(selectedVersionForSend?.total_hours_snapshot)}) and parallel USD/BDT rates. Further edits require creating a new revision.
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSendModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition"
            >
              Lock & Send to Client
            </button>
          </div>
        </form>
      </Modal>

      {/* Work Order Preview Modal */}
      <Modal
        isOpen={Boolean(previewWorkOrder)}
        onClose={() => setPreviewWorkOrder(null)}
        title={`Work Order Preview — ${previewWorkOrder?.work_order_number}`}
        subtitle={`Official snapshot generated from approved version`}
        maxWidth="2xl"
      >
        {previewWorkOrder && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <div>
                  <div className="text-sm font-bold text-slate-100">{previewWorkOrder.work_order_number}</div>
                  <div className="text-slate-500 text-[11px]">Format: {previewWorkOrder.work_order_kind}</div>
                </div>
                <StatusBadge status={previewWorkOrder.status} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-slate-300">
                <div>
                  <span className="text-slate-500">Project:</span> {project.name}
                </div>
                <div>
                  <span className="text-slate-500">Total Hours:</span> {formatHours(previewWorkOrder.hours_snapshot)}
                </div>
                {canViewMoney && previewWorkOrder.total_usd_snapshot != null && (
                  <>
                    <div>
                      <span className="text-slate-500">USD Value:</span> {formatUSD(previewWorkOrder.total_usd_snapshot)}
                    </div>
                    <div>
                      <span className="text-slate-500">BDT Value:</span> {formatBDT(previewWorkOrder.total_bdt_snapshot)}
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                <span>Generated Instant:</span>
                <DualTimeBadge isoInstant={previewWorkOrder.generated_at} projectIanaTimezone={project.timezone} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewWorkOrder(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
