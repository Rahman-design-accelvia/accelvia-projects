// src/features/workspace/MiddlePanelScope.tsx
// Middle Panel: Scope Packages, Versioned Estimates, Rates & Work Orders

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Project, 
  Client,
  ScopePackage, 
  ScopeVersion, 
  WorkOrder, 
  ProjectFinancialSettings 
} from '../../types';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { StatusBadge } from '../../components/StatusBadge';
import { DualTimeBadge } from '../../components/DualTimeBadge';
import { Modal } from '../../components/Modal';
import { DocumentExportButtons } from '../../components/DocumentExportButtons';
import { GenerateWorkOrderModal } from '../work-orders/GenerateWorkOrderModal';
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
  ChevronLeft,
  X,
  Trash2,
  AlertCircle,
  Edit3,
  Lock
} from 'lucide-react';
import { EditEstimateModal } from './EditEstimateModal';
import { EditWorkOrderModal } from './EditWorkOrderModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface MiddlePanelScopeProps {
  project: Project | null;
  client?: Client | null;
  packages: ScopePackage[];
  versions: ScopeVersion[];
  workOrders: WorkOrder[];
  financialSettings?: ProjectFinancialSettings;
  onUpdateFinancials: (settings: Partial<ProjectFinancialSettings>) => void;
  onCreateEstimateDraft: (pkgId: string | null, title: string, items: Array<{ title: string; hours: number }>) => void;
  onEditEstimate?: (versionId: string, updatedPackageTitle: string, items: Array<{ title: string; hours: number }>) => void;
  onDeleteEstimate?: (versionId: string) => void;
  onEditWorkOrder?: (woId: string, items: Array<{ title: string; hours: number }>) => void;
  onDeleteWorkOrder?: (woId: string) => void;
  onSendEstimate: (versionId: string, email: string, postToConversation: boolean) => void;
  onGenerateWorkOrder: (
    versionId: string,
    kind: 'detailed' | 'summary',
    includeBdt?: boolean,
    customItems?: Array<{ title: string; hours: number }>
  ) => void;
  onUpdateWorkOrderStatus: (woId: string, status: any) => void;
  onOpenClientReviewModal: (versionId: string) => void;
  onMarkComplete?: () => void;
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
  onEditEstimate,
  onDeleteEstimate,
  onEditWorkOrder,
  onDeleteWorkOrder,
  onSendEstimate,
  onGenerateWorkOrder,
  onUpdateWorkOrderStatus,
  onOpenClientReviewModal,
  onMarkComplete,
  onBackToProjects,
}) => {
  const { canViewMoney, isSuperAdmin, isMember } = useAuth();
  const { accentColor } = useTheme();

  // Active tab: 'scope' or 'work-orders'
  const [activeTab, setActiveTab] = useState<'scope' | 'work-orders'>('scope');

  // Modals
  const [isFinModalOpen, setIsFinModalOpen] = useState(false);
  const [isNewEstimateModalOpen, setIsNewEstimateModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedVersionForSend, setSelectedVersionForSend] = useState<ScopeVersion | null>(null);
  const [sendRecipientEmail, setSendRecipientEmail] = useState('');
  const [shareToConversation, setShareToConversation] = useState(true);

  // Edit & Delete modal states
  const [editingVersion, setEditingVersion] = useState<{ version: ScopeVersion; packageTitle: string } | null>(null);
  const [deletingEstimate, setDeletingEstimate] = useState<{ version: ScopeVersion; packageTitle: string } | null>(null);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
  const [deletingWorkOrder, setDeletingWorkOrder] = useState<WorkOrder | null>(null);

  const [previewWorkOrder, setPreviewWorkOrder] = useState<WorkOrder | null>(null);
  const [selectedVersionForWorkOrder, setSelectedVersionForWorkOrder] = useState<ScopeVersion | null>(null);

  // Check if either USD rate or BDT rate is configured (> 0)
  const hasRateSet = useMemo(() => {
    const usd = financialSettings?.client_rate_usd_per_hour;
    const bdt = financialSettings?.client_rate_bdt_per_hour;
    const hasUsd = usd != null && !isNaN(Number(usd)) && Number(usd) > 0;
    const hasBdt = bdt != null && !isNaN(Number(bdt)) && Number(bdt) > 0;
    return Boolean(hasUsd || hasBdt);
  }, [financialSettings?.client_rate_usd_per_hour, financialSettings?.client_rate_bdt_per_hour]);

  // Draft estimate creator state (starts clean with 0 preset data)
  const [newEstimateTitle, setNewEstimateTitle] = useState('');
  const [newEstimatePkgId, setNewEstimatePkgId] = useState<string>('new');
  const [newEstimateItems, setNewEstimateItems] = useState<Array<{ title: string; hours: number | string }>>([
    { title: '', hours: '' },
  ]);
  const [estimateDraftError, setEstimateDraftError] = useState<string | null>(null);

  const handleOpenNewEstimateModal = () => {
    setNewEstimateTitle('');
    setNewEstimatePkgId('new');
    setNewEstimateItems([{ title: '', hours: '' }]);
    setEstimateDraftError(null);
    setIsNewEstimateModalOpen(true);
  };

  const handleAddItemRow = () => {
    setNewEstimateItems((prev) => [...prev, { title: '', hours: '' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setNewEstimateItems((prev) => {
      if (prev.length <= 1) {
        // If it's the last row, clear it to clean slate
        return [{ title: '', hours: '' }];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleItemChange = (index: number, field: 'title' | 'hours', value: string) => {
    setNewEstimateItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const totalDraftHours = useMemo(() => {
    return newEstimateItems.reduce((acc, it) => acc + (Number(it.hours) || 0), 0);
  }, [newEstimateItems]);

  const handleCreateEstimateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEstimateDraftError(null);

    // Auto-filter out empty rows so accidental blanks never block saving
    const validItems = newEstimateItems
      .map((it) => ({
        title: it.title.trim(),
        hours: Number(it.hours) || 0,
      }))
      .filter((it) => it.title.length > 0 && it.hours > 0);

    if (validItems.length === 0) {
      setEstimateDraftError('Please enter at least one deliverable item with a title and hours greater than 0.');
      return;
    }

    const pkgId = newEstimatePkgId === 'new' ? null : newEstimatePkgId;
    onCreateEstimateDraft(pkgId, newEstimateTitle.trim(), validItems);
    setIsNewEstimateModalOpen(false);
    setNewEstimateTitle('');
    setNewEstimateItems([{ title: '', hours: '' }]);
  };

  // Financial form state — budget hours and rates start empty when not yet set (no default fake rates)
  const [formBudgetHours, setFormBudgetHours] = useState(
    financialSettings?.internal_budget_hours != null
      ? financialSettings.internal_budget_hours.toString()
      : ''
  );
  const [formRateUsd, setFormRateUsd] = useState(
    financialSettings?.client_rate_usd_per_hour != null
      ? financialSettings.client_rate_usd_per_hour.toString()
      : ''
  );
  const [formRateBdt, setFormRateBdt] = useState(
    financialSettings?.client_rate_bdt_per_hour != null
      ? financialSettings.client_rate_bdt_per_hour.toString()
      : ''
  );

  // Synchronize form state whenever active financialSettings change
  useEffect(() => {
    setFormBudgetHours(
      financialSettings?.internal_budget_hours != null
        ? financialSettings.internal_budget_hours.toString()
        : ''
    );
    setFormRateUsd(
      financialSettings?.client_rate_usd_per_hour != null
        ? financialSettings.client_rate_usd_per_hour.toString()
        : ''
    );
    setFormRateBdt(
      financialSettings?.client_rate_bdt_per_hour != null
        ? financialSettings.client_rate_bdt_per_hour.toString()
        : ''
    );
  }, [financialSettings]);

  // Calculate authoritative approved hours across packages
  const packagesWithVersions = packages.map((pkg) => ({
    ...pkg,
    versions: versions.filter((v) => v.scope_package_id === pkg.id),
  }));
  const totalApprovedHours = calculateProjectApprovedHours(packagesWithVersions);

  // Authoritative approved versions count for Member visibility
  const approvedVersionsCount = useMemo(() => {
    return versions.filter((v) => v.status === 'approved').length;
  }, [versions]);

  const handleSendEstimateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVersionForSend) return;
    onSendEstimate(selectedVersionForSend.id, sendRecipientEmail.trim(), shareToConversation);
    setIsSendModalOpen(false);
    setSelectedVersionForSend(null);
    setSendRecipientEmail('');
  };

  const handleSaveFinancials = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow null/unset budget and rates — only compute monetary value if a rate is explicitly provided
    const hours = formBudgetHours.trim() !== '' ? Number(formBudgetHours) : null;
    const usdRate = formRateUsd.trim() !== '' ? Number(formRateUsd) : null;
    const bdtRate = formRateBdt.trim() !== '' ? Number(formRateBdt) : null;

    onUpdateFinancials({
      internal_budget_hours: hours,
      client_rate_usd_per_hour: usdRate,
      client_rate_bdt_per_hour: bdtRate,
      internal_budget_amount_usd: hours != null && usdRate != null ? hours * usdRate : null,
      internal_budget_amount_bdt: hours != null && bdtRate != null ? hours * bdtRate : null,
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
    <div className="w-full lg:w-[350px] xl:w-[400px] 2xl:w-[460px] h-full flex flex-col theme-surface-panel lg:border-r theme-border shrink-0 min-w-0 text-slate-900 dark:text-slate-100">
      {/* Project Overview Header */}
      <div className="p-3 sm:p-4 border-b theme-border theme-surface-header">
        {onBackToProjects && (
          <button
            onClick={onBackToProjects}
            className="lg:hidden flex items-center gap-1 text-xs text-emerald-600 dark:text-teal-400 hover:text-emerald-500 dark:hover:text-teal-300 mb-2 font-medium"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to Projects</span>
          </button>
        )}
        <div className="flex items-start justify-between">
          <div className="min-w-0 pr-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-teal-400">
              Active Project Scope
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-[280px]">
              {project.name}
            </h2>

            {/* Assigned Client Company Profile Badge */}
            {client ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 mt-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400 shrink-0" />
                <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{client.name}</span>
                {client.contacts && client.contacts.length > 0 && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:inline max-w-[150px]">
                    ({client.contacts[0].name})
                  </span>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 italic mt-0.5">
                Internal / Unassigned Company
              </div>
            )}

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>Timezone:</span>
              <span className="font-mono text-cyan-700 dark:text-cyan-300">{project.timezone}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {project.status === 'completed' ? (
              <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold text-xs flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
                <span>Completed</span>
              </span>
            ) : (
              canViewMoney && onMarkComplete && (
                <button
                  type="button"
                  onClick={onMarkComplete}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 transition shadow-xs"
                  title="Manually confirm and mark this project as completed"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Complete Project</span>
                  <span className="sm:hidden">Complete</span>
                </button>
              )
            )}

            {canViewMoney && (
              <button
                type="button"
                onClick={() => setIsFinModalOpen(true)}
                data-testid="rates-button"
                className={`p-1.5 rounded-lg transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                  !hasRateSet
                    ? 'animate-rates-blink bg-amber-500/15 border border-amber-500/80 text-amber-700 dark:text-amber-300 shadow-sm shadow-amber-500/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:border-transparent dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                }`}
                title={
                  !hasRateSet
                    ? 'Rates Not Configured: Click to set either USD or BDT rate'
                    : 'Project Financial Rates & Budgets (Configured)'
                }
              >
                {!hasRateSet && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
                <Sliders
                  className={`w-3.5 h-3.5 shrink-0 ${
                    !hasRateSet
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-teal-400'
                  }`}
                />
                <span>Rates</span>
                {!hasRateSet && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 hidden sm:inline">
                    (Set)
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Aggregated Hours & Monetary KPI Cards */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          {/* Approved Hours Card (Always visible to all roles) */}
          <div className="bg-emerald-50 border border-emerald-200 dark:bg-slate-900 dark:border-emerald-900/40 rounded-lg p-2.5 shadow-xs">
            <div className="text-[10px] uppercase font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Approved Scope</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-800 dark:text-emerald-300 mt-0.5">
              {formatHours(totalApprovedHours)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Across active approved versions
            </div>
          </div>

          {/* Internal Budget Card (Role restricted) */}
          {canViewMoney ? (
            <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-lg p-2.5 shadow-xs">
              <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                <span>Commercial Value</span>
              </div>
              <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-200 mt-1">
                {financialSettings?.client_rate_usd_per_hour != null
                  ? formatUSD(totalApprovedHours * financialSettings.client_rate_usd_per_hour)
                  : <span className="text-slate-400 text-xs font-normal">Rate not set</span>}
              </div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {financialSettings?.client_rate_bdt_per_hour != null
                  ? formatBDT(totalApprovedHours * financialSettings.client_rate_bdt_per_hour)
                  : <span className="text-slate-400">BDT not set</span>}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-lg p-2.5 shadow-xs">
              <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Budget Allocation</span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-300 mt-0.5">
                {financialSettings?.internal_budget_hours != null
                  ? formatHours(financialSettings.internal_budget_hours)
                  : <span className="text-slate-400 text-sm font-medium">Not set</span>}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Internal scope allocation
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mt-3 border-b theme-border overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('scope')}
            className={`pb-2 px-1 text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
              activeTab === 'scope'
                ? 'border-b-2 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            style={activeTab === 'scope' ? { borderBottomColor: accentColor, color: accentColor } : undefined}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Scope Packages & Versions ({isMember ? approvedVersionsCount : versions.length})</span>
            <span className="sm:hidden">Scope & Versions ({isMember ? approvedVersionsCount : versions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('work-orders')}
            className={`pb-2 px-1 text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
              activeTab === 'work-orders'
                ? 'border-b-2 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            style={activeTab === 'work-orders' ? { borderBottomColor: accentColor, color: accentColor } : undefined}
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
                  type="button"
                  onClick={handleOpenNewEstimateModal}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition shadow-xs cursor-pointer"
                  style={{
                    backgroundColor: 'var(--theme-accent-subtle)',
                    color: accentColor,
                    border: '1px solid var(--theme-accent-subtle-border)',
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Estimate</span>
                </button>
              </div>
            )}

            {/* Packages & Versions List */}
            {(() => {
              const visiblePackages = packages.filter((pkg) => {
                if (!isMember) return true;
                return versions.some((v) => v.scope_package_id === pkg.id && v.status === 'approved');
              });

              if (isMember && visiblePackages.length === 0) {
                return (
                  <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-slate-500 space-y-2">
                    <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600" />
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      No Approved Estimates Yet
                    </div>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Estimate scopes and deliverable hours will appear here once authorized and approved by management.
                    </p>
                  </div>
                );
              }

              return visiblePackages.map((pkg) => {
                const pkgVersions = versions
                  .filter((v) => v.scope_package_id === pkg.id)
                  .filter((v) => !isMember || v.status === 'approved')
                  .sort((a, b) => b.version_number - a.version_number);

                return (
                <div
                  key={pkg.id}
                  className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-200">{pkg.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {pkg.package_kind}
                      </span>
                    </div>
                  </div>

                  {/* Versions Accordion */}
                  <div className="space-y-2">
                    {pkgVersions.map((ver) => (
                      <div
                        key={ver.id}
                        className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-200">
                              v{ver.version_number}.0
                            </span>
                            <StatusBadge status={ver.status} size="sm" />
                          </div>
                          <div className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {formatHours(ver.total_hours_snapshot)}
                          </div>
                        </div>

                        {/* Financial Snapshot (Only for Admins / Super Admin) */}
                        {canViewMoney && ver.total_usd_snapshot != null && (
                          <div className="flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900/60 px-2 py-1 rounded border border-slate-200 dark:border-slate-800/50">
                            <span>Client Total:</span>
                            <div className="space-x-2">
                              <span className="text-slate-900 dark:text-slate-200 font-semibold">
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
                              <div key={idx} className="flex justify-between items-start gap-2 text-[11px] py-0.5">
                                <span className="text-slate-700 dark:text-slate-300 break-words flex-1 min-w-0">• {item.title}</span>
                                <span className="font-mono text-slate-800 dark:text-slate-300 font-semibold shrink-0">
                                  {formatHours(item.hours)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Dual-Time Event Timestamp & Responsive Actions Container */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60 flex flex-col gap-2">
                          {/* Row 1: Dual-Time Stamp & Immutability Badge */}
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <DualTimeBadge
                              isoInstant={ver.approved_at || ver.sent_at || ver.created_at}
                              projectIanaTimezone={project.timezone}
                            />

                            {/* If Approved: Strictly Immutable Pill */}
                            {ver.status === 'approved' && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-mono flex items-center gap-1 shrink-0"
                                title="Approved estimates are legally immutable contracts and cannot be edited or deleted"
                              >
                                <Lock className="w-2.5 h-2.5 text-slate-400" />
                                <span>Locked</span>
                              </span>
                            )}
                          </div>

                          {/* Row 2: Action Buttons (Responsive flex-wrap) */}
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <DocumentExportButtons
                              type="estimate"
                              version={ver}
                              packageTitle={pkg.title}
                              projectName={project.name}
                              clientName={client?.name}
                              canViewMoney={canViewMoney}
                              size="xs"
                            />

                            {/* If Draft: Show Send to Client */}
                            {ver.status === 'draft' && canViewMoney && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedVersionForSend(ver);
                                  setIsSendModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 font-semibold text-[11px] flex items-center gap-1 transition shadow-xs cursor-pointer whitespace-nowrap"
                              >
                                <Send className="w-3 h-3" />
                                <span>Send</span>
                              </button>
                            )}

                            {/* If Pending: Review Link */}
                            {ver.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => onOpenClientReviewModal(ver.id)}
                                className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap border border-amber-500/30"
                                title="Open Client Review Portal Simulator"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Review Portal</span>
                              </button>
                            )}

                            {/* If unapproved: Admin / Super Admin can Edit and Delete */}
                            {ver.status !== 'approved' && ver.status !== 'superseded' && canViewMoney && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEditingVersion({ version: ver, packageTitle: pkg.title })}
                                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap border border-slate-200 dark:border-slate-700"
                                  title="Edit estimate deliverables & hours"
                                >
                                  <Edit3 className="w-3 h-3 text-blue-500" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingEstimate({ version: ver, packageTitle: pkg.title })}
                                  className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap border border-rose-200 dark:border-rose-900/60"
                                  title="Delete estimate proposal"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              </>
                            )}

                            {/* If Approved: Generate Work Order Button */}
                            {ver.status === 'approved' && canViewMoney && (
                              <button
                                type="button"
                                onClick={() => setSelectedVersionForWorkOrder(ver)}
                                className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap border border-emerald-500/30"
                              >
                                <FileCheck className="w-3 h-3 text-emerald-600 dark:text-teal-400" />
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
            });
          })()}
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
                        {wo.total_bdt_snapshot != null ? (
                          <div className="text-[10px] font-mono text-slate-400">
                            {formatBDT(wo.total_bdt_snapshot)}
                          </div>
                        ) : (
                          <div className="text-[10px] font-sans text-slate-500">
                            USD Only
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Deliverable Scope Tasks Breakdown Table */}
                  {wo.items && wo.items.length > 0 && (
                    <div className="bg-slate-950/70 rounded-lg p-2.5 border border-slate-800/80 space-y-1.5">
                      <div className="flex justify-between items-center text-[11px] font-semibold text-blue-400 border-b border-slate-800 pb-1">
                        <span>Deliverable / Scope Task</span>
                        <span>Hours</span>
                      </div>
                      <div className="divide-y divide-slate-850/60 text-xs">
                        {wo.items.map((item, idx) => (
                          <div key={idx} className="py-1 flex justify-between items-center text-[11px]">
                            <span className="text-slate-300 truncate max-w-[240px] sm:max-w-[280px]">
                              {idx + 1}. {item.title}
                            </span>
                            <span className="font-mono text-blue-300 font-semibold shrink-0">
                              {formatHours(item.hours)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dual-Time Generation Stamp & Responsive Actions Container */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60 flex flex-col gap-2">
                    {/* Row 1: Dual-Time Stamp & Lock Pill */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <DualTimeBadge
                        isoInstant={wo.generated_at}
                        projectIanaTimezone={project.timezone}
                      />

                      {/* Locked for completed / delivered work orders */}
                      {(wo.status === 'completed' || wo.status === 'delivered') && (
                        <span
                          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-mono flex items-center gap-1 shrink-0"
                          title="Completed and delivered work orders are legally immutable and cannot be edited or deleted"
                        >
                          <Lock className="w-2.5 h-2.5 text-slate-400" />
                          <span>Locked</span>
                        </span>
                      )}
                    </div>

                    {/* Row 2: Action Buttons (Responsive flex-wrap) */}
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <DocumentExportButtons
                        type="work_order"
                        workOrder={wo}
                        projectName={project.name}
                        clientName={client?.name}
                        canViewMoney={canViewMoney}
                        size="xs"
                      />

                      <button
                        type="button"
                        onClick={() => setPreviewWorkOrder(wo)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap border border-slate-200 dark:border-slate-700"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>

                      {/* Edit & Delete for in_progress / uncompleted work orders */}
                      {wo.status !== 'completed' && wo.status !== 'delivered' && canViewMoney && (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingWorkOrder(wo)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap border border-slate-200 dark:border-slate-700"
                            title="Edit work order tasks & hours"
                          >
                            <Edit3 className="w-3 h-3 text-blue-400" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingWorkOrder(wo)}
                            className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap border border-rose-200 dark:border-rose-900/60"
                            title="Delete work order"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}

                      {canViewMoney && wo.status === 'in_progress' && (
                        <button
                          type="button"
                          onClick={() => onUpdateWorkOrderStatus(wo.id, 'delivered')}
                          className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap border border-amber-500/30"
                        >
                          Mark Delivered
                        </button>
                      )}

                      {canViewMoney && wo.status === 'delivered' && (
                        <button
                          type="button"
                          onClick={() => onUpdateWorkOrderStatus(wo.id, 'completed')}
                          className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap border border-emerald-500/30"
                        >
                          Mark Completed
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
              <span className="ml-1 text-slate-500 font-normal">(auto-set from first estimate if left empty)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formBudgetHours}
              onChange={(e) => setFormBudgetHours(e.target.value)}
              placeholder="e.g. 80 — leave blank to auto-set from first estimate"
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500 placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Client Rate (USD / hr)
                <span className="ml-1 text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 50 — not set"
                value={formRateUsd}
                onChange={(e) => setFormRateUsd(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500 placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Client Rate (BDT / hr)
                <span className="ml-1 text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 6000 — not set"
                value={formRateBdt}
                onChange={(e) => setFormRateBdt(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500 placeholder:text-slate-400 dark:placeholder:text-slate-600"
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

          {/* Validation Error Notice */}
          {estimateDraftError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{estimateDraftError}</span>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <span>Line Items & Hours</span>
                <span className="text-[10px] text-slate-500 font-normal">(each row has a cross button to remove)</span>
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs text-teal-400 hover:text-teal-300 hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item</span>
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {newEstimateItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center group">
                  <input
                    type="text"
                    placeholder={`Deliverable #${idx + 1} (e.g. Core API architecture)`}
                    value={item.title}
                    onChange={(e) => handleItemChange(idx, 'title', e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                  <div className="relative w-28 shrink-0">
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      placeholder="Hours"
                      value={item.hours}
                      onChange={(e) => handleItemChange(idx, 'hours', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-7 py-2 text-xs text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono pointer-events-none">
                      hrs
                    </span>
                  </div>

                  {/* Cross button to delete this item row */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItemRow(idx)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/60 transition shrink-0"
                    title="Remove this line item"
                    aria-label="Remove item"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Total Estimated Hours summary */}
            <div className="flex items-center justify-between pt-2 px-1 text-xs text-slate-400 font-mono border-t border-slate-800/60 mt-2">
              <span>
                {newEstimateItems.filter((it) => String(it.title).trim().length > 0).length} valid item{newEstimateItems.filter((it) => String(it.title).trim().length > 0).length !== 1 ? 's' : ''}
              </span>
              <span>
                Total Scope:{' '}
                <strong className="text-teal-400 font-bold text-sm">
                  {formatHours(totalDraftHours)}
                </strong>
              </span>
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
        onClose={() => {
          setIsSendModalOpen(false);
          setSendRecipientEmail('');
        }}
        title="Send Estimate for Client Approval"
        subtitle="Locks immutable version snapshot and issues secure review link"
      >
        <form onSubmit={handleSendEstimateSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                Client Recipient Email(s)
              </label>
              <span className="text-[11px] text-slate-500 font-normal">Optional</span>
            </div>
            <input
              type="text"
              value={sendRecipientEmail}
              onChange={(e) => setSendRecipientEmail(e.target.value)}
              placeholder="e.g. client@company.com, manager@domain.com (or leave blank)"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Supports any mail platform (Gmail, Outlook, custom domain) • Separate multiple emails with commas or semicolons
            </p>
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
              onClick={() => {
                setIsSendModalOpen(false);
                setSendRecipientEmail('');
              }}
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

      {/* Generate Work Order Modal (With BDT or Without BDT configuration) */}
      <GenerateWorkOrderModal
        isOpen={Boolean(selectedVersionForWorkOrder)}
        onClose={() => setSelectedVersionForWorkOrder(null)}
        version={selectedVersionForWorkOrder}
        packageItem={packages.find((p) => p.id === selectedVersionForWorkOrder?.scope_package_id)}
        projectName={project.name}
        canViewMoney={canViewMoney}
        onConfirm={(vId, kind, includeBdt, items) => {
          onGenerateWorkOrder(vId, kind, includeBdt, items);
          setSelectedVersionForWorkOrder(null);
        }}
      />

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
                      <span className="text-slate-500">BDT Value:</span>{' '}
                      {previewWorkOrder.total_bdt_snapshot != null ? (
                        formatBDT(previewWorkOrder.total_bdt_snapshot)
                      ) : (
                        <span className="text-slate-500 font-sans italic">Not included (USD only)</span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Deliverable / Scope Task Breakdown Table */}
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60 font-sans">
                <div className="bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-blue-400 border-b border-slate-800 flex justify-between">
                  <span>Deliverable / Scope Task</span>
                  <span>Hours</span>
                </div>
                <div className="divide-y divide-slate-800/80 text-xs">
                  {previewWorkOrder.items && previewWorkOrder.items.length > 0 ? (
                    previewWorkOrder.items.map((it, idx) => (
                      <div key={idx} className="px-3 py-2 flex items-center justify-between text-slate-200">
                        <span className="font-medium truncate max-w-[360px]">
                          {idx + 1}. {it.title}
                        </span>
                        <span className="font-mono text-blue-300 font-bold shrink-0">
                          {formatHours(it.hours)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-slate-500 italic text-center">
                      Summary format (tasks grouped under milestone)
                    </div>
                  )}
                </div>
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
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Estimate Scope Modal (Only for unapproved estimates) */}
      <EditEstimateModal
        isOpen={Boolean(editingVersion)}
        onClose={() => setEditingVersion(null)}
        version={editingVersion?.version || null}
        initialPackageTitle={editingVersion?.packageTitle}
        onSave={(vId, updatedTitle, updatedItems) => {
          if (onEditEstimate) {
            onEditEstimate(vId, updatedTitle, updatedItems);
          }
        }}
      />

      {/* Delete Estimate Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(deletingEstimate)}
        onClose={() => setDeletingEstimate(null)}
        title={`Delete Estimate Scope — v${deletingEstimate?.version.version_number}.0?`}
        subtitle={`Package: ${deletingEstimate?.packageTitle}`}
        isApprovedProhibited={
          deletingEstimate?.version.status === 'approved' ||
          deletingEstimate?.version.status === 'superseded'
        }
        itemDetails={[
          { label: 'Scope Package', value: deletingEstimate?.packageTitle || 'Package' },
          { label: 'Version Number', value: `v${deletingEstimate?.version.version_number}.0` },
          {
            label: 'Total Scope Hours',
            value: formatHours(deletingEstimate?.version.total_hours_snapshot || 0),
          },
          {
            label: 'Current Status',
            value: deletingEstimate?.version.status?.toUpperCase() || 'DRAFT',
          },
        ]}
        onConfirm={() => {
          if (deletingEstimate && onDeleteEstimate) {
            onDeleteEstimate(deletingEstimate.version.id);
          }
        }}
      />

      {/* Edit Work Order Modal (Only for in_progress/uncompleted work orders) */}
      <EditWorkOrderModal
        isOpen={Boolean(editingWorkOrder)}
        onClose={() => setEditingWorkOrder(null)}
        workOrder={editingWorkOrder}
        onSave={(woId, updatedItems) => {
          if (onEditWorkOrder) {
            onEditWorkOrder(woId, updatedItems);
          }
        }}
      />

      {/* Delete Work Order Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(deletingWorkOrder)}
        onClose={() => setDeletingWorkOrder(null)}
        title={`Delete Work Order — ${deletingWorkOrder?.work_order_number}?`}
        subtitle="Remove work order from project pipeline"
        isApprovedProhibited={
          deletingWorkOrder?.status === 'completed' ||
          deletingWorkOrder?.status === 'delivered'
        }
        itemDetails={[
          { label: 'Work Order #', value: deletingWorkOrder?.work_order_number || '' },
          {
            label: 'Authorized Hours',
            value: formatHours(deletingWorkOrder?.hours_snapshot || 0),
          },
          {
            label: 'Current Status',
            value: deletingWorkOrder?.status?.toUpperCase() || '',
          },
        ]}
        onConfirm={() => {
          if (deletingWorkOrder && onDeleteWorkOrder) {
            onDeleteWorkOrder(deletingWorkOrder.id);
          }
        }}
      />
    </div>
  );
};
