// src/features/conversations/EstimateConversationCard.tsx
// Interactive estimate card embedded directly in the conversation feed
// ClickUp-inspired clean, spacious, fully responsive design
// Shows special orange border & tab when Pending; transitions to Green border when Approved by Admin/Super Admin

import React, { useState } from 'react';
import { ScopeVersion } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import { DocumentExportButtons } from '../../components/DocumentExportButtons';
import { formatHours, formatUSD, formatBDT } from '../../lib/formatting/currency';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  DollarSign, 
  FileCheck,
  Check,
  Sparkles,
  Layers
} from 'lucide-react';

interface EstimateConversationCardProps {
  version: ScopeVersion;
  packageTitle?: string;
  onApprove: (versionId: string) => void;
  onGenerateWorkOrder?: (versionId: string) => void;
}

export const EstimateConversationCard: React.FC<EstimateConversationCardProps> = ({
  version,
  packageTitle = 'Scope Package',
  onApprove,
  onGenerateWorkOrder,
}) => {
  const { canViewMoney, isSuperAdmin, isAdmin, isMember } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isApproving, setIsApproving] = useState(false);

  const isApproved = version.status === 'approved';
  const isPending = version.status === 'pending';
  const canApprove = (isSuperAdmin || isAdmin) && isPending;

  // Strict Rule: Members can ONLY see the estimate scopes and hours AFTER approval from the admin
  if (isMember && !isApproved) {
    return null;
  }

  const handleApproveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsApproving(true);
    onApprove(version.id);
    setTimeout(() => setIsApproving(false), 500);
  };

  // Border & Accent Color System as specified by user:
  // "it will show like special tab with orange color when the admin or super admin approved it it will be green border"
  const containerClasses = isApproved
    ? 'border-2 border-emerald-500 bg-white dark:bg-slate-900 shadow-lg shadow-emerald-500/10 dark:shadow-emerald-950/40 ring-1 ring-emerald-500/20'
    : isPending
    ? 'border-2 border-orange-500 bg-white dark:bg-slate-900 shadow-lg shadow-orange-500/10 dark:shadow-orange-950/40 ring-1 ring-orange-500/20'
    : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs';

  const tabHeaderColor = isApproved
    ? 'bg-emerald-600 text-white dark:bg-emerald-950/90 dark:text-emerald-200 border-b border-emerald-700 dark:border-emerald-800'
    : isPending
    ? 'bg-orange-500 text-white dark:bg-orange-950/90 dark:text-orange-200 border-b border-orange-600 dark:border-orange-800'
    : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800';

  const items = version.items || [];

  return (
    <div className={`w-full max-w-full rounded-2xl overflow-hidden transition-all duration-300 my-2.5 ${containerClasses}`}>
      {/* ClickUp-style Top Header / Tab Banner */}
      <div className={`px-3 sm:px-4 py-2.5 flex items-center justify-between text-xs font-semibold tracking-wide ${tabHeaderColor}`}>
        <div className="flex items-center gap-2 min-w-0 pr-2">
          {isApproved ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-100 dark:text-emerald-400 shrink-0" />
          ) : isPending ? (
            <Clock className="w-4 h-4 text-orange-100 dark:text-orange-400 shrink-0 animate-pulse" />
          ) : (
            <FileSpreadsheet className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          )}
          <span className="uppercase text-[10px] sm:text-[11px] font-bold truncate">
            {isApproved
              ? 'Authorized Scope • Approved'
              : isPending
              ? 'Estimate Proposal • Pending'
              : `Estimate Scope • ${version.status}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="font-mono text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/20 dark:bg-black/30 text-white border border-white/25 dark:border-white/10">
            v{version.version_number}.0
          </span>
          <StatusBadge status={version.status} size="sm" />
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-black/20 text-white/90 hover:text-white transition"
            title={isExpanded ? 'Collapse line items' : 'Expand line items'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Card Content */}
      <div className="p-3 sm:p-4.5 space-y-3.5">
        {/* Header: Package Title & Summary */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 break-words leading-tight">
              {packageTitle}
            </h4>
          </div>
          {version.scope_summary && (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
              {version.scope_summary}
            </p>
          )}
        </div>

        {/* ClickUp-style Responsive Metrics Tiles */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Tile 1: Total Hours */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center gap-1 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              <Clock className="w-3 h-3 text-emerald-600 dark:text-teal-400 shrink-0" />
              <span className="truncate">Estimated Scope</span>
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-700 dark:text-teal-300 mt-1">
              {formatHours(version.total_hours_snapshot)}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
              {items.length} deliverable task{items.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Tile 2: Commercial Value or Status */}
          {canViewMoney && version.total_usd_snapshot != null ? (
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                <DollarSign className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span className="truncate">Commercial Value</span>
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 truncate">
                {formatUSD(version.total_usd_snapshot)}
              </div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {formatBDT(version.total_bdt_snapshot)}
              </div>
            </div>
          ) : (
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                <Layers className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate">Scope State</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mt-1 capitalize">
                {version.status}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {isApproved ? 'Locked contract' : 'Pending review'}
              </div>
            </div>
          )}
        </div>

        {/* ClickUp-style Deliverables List (NO horizontal drag required!) */}
        {isExpanded && items.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-1 uppercase tracking-wider">
              <span>Deliverable Tasks</span>
              <span>Hours</span>
            </div>

            <div className="space-y-1.5">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 sm:p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/40 dark:hover:border-teal-500/40 transition flex items-start justify-between gap-2.5"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5 shadow-2xs">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs text-slate-800 dark:text-slate-100 break-words leading-snug">
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 break-words mt-0.5 leading-relaxed">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-white dark:bg-slate-900 text-emerald-700 dark:text-teal-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
                      <Clock className="w-3 h-3 text-emerald-600 dark:text-teal-400" />
                      {formatHours(item.hours)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ClickUp-style Responsive Footer */}
        <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800/80 space-y-2.5">
          {/* Status Message Card */}
          <div className="text-xs">
            {isApproved ? (
              <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-teal-400 shrink-0" />
                <span className="font-semibold">Approved & Authorized by Management</span>
              </div>
            ) : isPending ? (
              <div className="p-2 sm:p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/80 text-orange-800 dark:text-orange-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 animate-pulse" />
                <span className="font-medium">Awaiting Client or Executive Approval</span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Status: <span className="font-semibold text-slate-700 dark:text-slate-300">{version.status}</span>
              </div>
            )}
          </div>

          {/* Action Buttons: Responsive Layout for Mobile PWA */}
          <div className="space-y-2">
            {/* Primary Action Button: Approve Estimate for Admin / Super Admin */}
            {canApprove && (
              <button
                type="button"
                onClick={handleApproveClick}
                disabled={isApproving}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/25 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                title="Approve this estimate directly from conversation"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isApproving ? 'Approving Estimate...' : 'Approve Estimate'}</span>
              </button>
            )}

            {/* If approved: option to generate work order */}
            {isApproved && canViewMoney && onGenerateWorkOrder && (
              <button
                type="button"
                onClick={() => onGenerateWorkOrder(version.id)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-teal-500/15 dark:hover:bg-teal-500/25 border border-emerald-300 dark:border-teal-500/30 text-emerald-800 dark:text-teal-300 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <FileCheck className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
                <span>Generate Work Order</span>
              </button>
            )}

            {/* Document Export Buttons (Copy Table & Print PDF side-by-side) */}
            <DocumentExportButtons
              type="estimate"
              version={version}
              packageTitle={packageTitle}
              canViewMoney={canViewMoney}
              size="xs"
              fullWidth={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
