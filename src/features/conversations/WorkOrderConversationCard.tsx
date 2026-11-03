// src/features/conversations/WorkOrderConversationCard.tsx
// Work Order card embedded directly in the conversation feed
// Blue/indigo themed, identical pattern to EstimateConversationCard but for delivered work orders

import React, { useState } from 'react';
import { WorkOrderStatus } from '../../types';
import { formatHours, formatUSD, formatBDT } from '../../lib/formatting/currency';
import {
  FileCheck,
  ChevronDown,
  ChevronUp,
  DollarSign,
  CheckCircle2,
  User,
} from 'lucide-react';

interface WorkOrderConversationCardProps {
  workOrder: {
    work_order_id: string;
    work_order_number: string;
    package_title: string;
    hours_snapshot: number;
    total_usd_snapshot?: number | null;
    total_bdt_snapshot?: number | null;
    status: WorkOrderStatus;
    authorized_by: string;
    generated_at: string;
    items?: Array<{ title: string; hours: number }>;
  };
  projectName: string;
  canViewMoney: boolean;
  onMarkComplete?: (woId: string) => void;
}

export const WorkOrderConversationCard: React.FC<WorkOrderConversationCardProps> = ({
  workOrder,
  projectName,
  canViewMoney,
  onMarkComplete,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const isCompleted = workOrder.status === 'completed';
  const isDelivered = workOrder.status === 'delivered';

  // Blue/indigo color scheme — always "delivered to client" state
  const containerClasses = isCompleted
    ? 'border-2 border-emerald-500 bg-gradient-to-br from-emerald-50/70 via-white to-blue-50/20 dark:from-emerald-950/30 dark:via-slate-900/90 dark:to-slate-950 shadow-lg shadow-emerald-500/10 dark:shadow-emerald-950/40 ring-1 ring-emerald-500/30'
    : 'border-2 border-blue-500 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/30 dark:from-blue-950/30 dark:via-slate-900/90 dark:to-slate-950 shadow-lg shadow-blue-500/10 dark:shadow-blue-950/40 ring-1 ring-blue-500/30';

  const tabHeaderColor = isCompleted
    ? 'bg-emerald-600 text-white dark:bg-emerald-950/80 dark:text-emerald-300 border-b border-emerald-700 dark:border-emerald-800/80 shadow-xs'
    : 'bg-blue-600 text-white dark:bg-blue-950/80 dark:text-blue-300 border-b border-blue-700 dark:border-blue-800/80 shadow-xs';

  return (
    <div className={`rounded-xl overflow-hidden transition-all duration-300 my-2.5 ${containerClasses}`}>
      {/* Special Top Tab Banner */}
      <div className={`px-3 sm:px-4 py-2 flex items-center justify-between text-xs font-semibold tracking-wide ${tabHeaderColor}`}>
        <div className="flex items-center gap-2 min-w-0 pr-2">
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-100 dark:text-emerald-400 shrink-0" />
          ) : (
            <FileCheck className="w-4 h-4 text-blue-100 dark:text-blue-400 shrink-0" />
          )}
          <span className="uppercase text-[10px] sm:text-[11px] font-bold truncate">
            {isCompleted
              ? '✅ Work Order — Completed'
              : '📄 Work Order — Delivered to Client'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
            isCompleted
              ? 'bg-emerald-700/40 text-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-300'
              : 'bg-blue-700/40 text-blue-100 dark:bg-blue-900/60 dark:text-blue-300'
          }`}>
            {workOrder.status.replace('_', ' ')}
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-black/20 text-white/80 hover:text-white dark:text-slate-400 dark:hover:text-slate-200 transition"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Card Content */}
      <div className="p-3 sm:p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
              <span className="truncate">{workOrder.package_title}</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/60">
                {workOrder.work_order_number}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Project: <span className="font-medium text-slate-700 dark:text-slate-300">{projectName}</span>
            </div>
          </div>

          {/* Prominent Hours Metric */}
          <div className="text-right shrink-0 bg-white dark:bg-slate-950/80 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-slate-200 dark:border-slate-800/80 shadow-xs">
            <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Total Hours</div>
            <div className="text-sm sm:text-base font-bold font-mono text-blue-700 dark:text-blue-300">
              {formatHours(workOrder.hours_snapshot)}
            </div>
          </div>
        </div>

        {/* Monetary Totals Bar (Only for Admin / Super Admin) */}
        {canViewMoney && workOrder.total_usd_snapshot != null && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono bg-blue-50/50 dark:bg-slate-950/90 px-3 py-2 rounded-lg border border-blue-200 dark:border-slate-800/80 gap-1.5 sm:gap-0">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <DollarSign className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="uppercase text-[10px] font-semibold">Total Value:</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-900 dark:text-slate-100 font-bold text-xs">
                {formatUSD(workOrder.total_usd_snapshot)}
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                {formatBDT(workOrder.total_bdt_snapshot)}
              </span>
            </div>
          </div>
        )}

        {/* Expandable Line Items Preview */}
        {isExpanded && workOrder.items && workOrder.items.length > 0 && (
          <div className="border border-slate-200 dark:border-slate-800/80 rounded-lg overflow-hidden bg-white dark:bg-slate-950/60 shadow-xs">
            <div className="bg-blue-50 dark:bg-slate-900/60 px-3 py-1.5 text-[11px] font-semibold text-blue-700 dark:text-blue-400 border-b border-blue-200 dark:border-slate-800/80 flex justify-between">
              <span>Deliverable / Scope Task</span>
              <span className="text-right">Hours</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {workOrder.items.map((item, idx) => (
                <div key={idx} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-900/30">
                  <div className="min-w-0 pr-2">
                    <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{item.title}</div>
                  </div>
                  <div className="font-mono text-blue-700 dark:text-blue-300 font-semibold shrink-0">
                    {formatHours(item.hours)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer: Authorized by & Generated date */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
            <span>
              Authorized by{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{workOrder.authorized_by}</span>
            </span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="font-mono text-[10px] text-slate-500">
              {new Date(workOrder.generated_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          {/* Mark as Completed button for Admin (only if status is 'delivered') */}
          {isDelivered && onMarkComplete && (
            <button
              type="button"
              onClick={() => onMarkComplete(workOrder.work_order_id)}
              className="w-full sm:w-auto justify-center px-4 py-2 sm:py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-emerald-600/30 active:scale-95"
              title="Mark this work order as completed"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Mark as Completed</span>
            </button>
          )}

          {isCompleted && (
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
