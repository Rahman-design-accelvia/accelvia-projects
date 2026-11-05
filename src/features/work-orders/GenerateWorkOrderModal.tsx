// src/features/work-orders/GenerateWorkOrderModal.tsx
// Modal dialog allowing Admin/Super Admin to configure Work Order creation (with BDT or without BDT, format kind)

import React, { useState, useEffect } from 'react';
import { ScopeVersion, ScopePackage } from '../../types';
import { Modal } from '../../components/Modal';
import { formatHours, formatUSD, formatBDT } from '../../lib/formatting/currency';
import {
  FileCheck,
  DollarSign,
  Coins,
  CheckCircle2,
  FileText,
  ListOrdered,
  Layers,
  ShieldCheck,
  Plus,
  Trash2,
} from 'lucide-react';

interface GenerateWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: ScopeVersion | null;
  packageItem?: ScopePackage | null;
  projectName: string;
  canViewMoney: boolean;
  onConfirm: (
    versionId: string,
    kind: 'detailed' | 'summary',
    includeBdt: boolean,
    items?: Array<{ title: string; hours: number }>
  ) => void;
}

export const GenerateWorkOrderModal: React.FC<GenerateWorkOrderModalProps> = ({
  isOpen,
  onClose,
  version,
  packageItem,
  projectName,
  canViewMoney,
  onConfirm,
}) => {
  // Option state: default includeBdt to true if version has BDT value, else false
  const [includeBdt, setIncludeBdt] = useState<boolean>(true);
  const [kind, setKind] = useState<'detailed' | 'summary'>('detailed');
  const [tasks, setTasks] = useState<Array<{ title: string; hours: number }>>([]);

  useEffect(() => {
    if (version) {
      // Default to true if BDT snapshot exists, otherwise true as standard dual option
      setIncludeBdt(version.total_bdt_snapshot != null && version.total_bdt_snapshot > 0);
      setKind('detailed');

      const existing = (version.items || []).map((it) => ({
        title: it.title,
        hours: Number(it.hours) || 0,
      }));

      const totalH = version.total_hours_snapshot || 0;

      if (existing.length >= 3) {
        setTasks(existing);
      } else if (existing.length > 0) {
        // Supplement so there are at least 3 tasks as requested
        const needed = 3 - existing.length;
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
        setTasks([...existing, ...extra]);
      } else {
        // No items in version: generate at least 3 standard breakdown deliverables
        setTasks([
          { title: 'Database Architecture & Security Configuration', hours: Math.round(totalH * 0.4 * 10) / 10 || 10 },
          { title: 'Core Workspace Workflows & API Implementation', hours: Math.round(totalH * 0.4 * 10) / 10 || 10 },
          { title: 'Quality Assurance, Verification & Client Signoff', hours: Math.round(totalH * 0.2 * 10) / 10 || 5 },
        ]);
      }
    }
  }, [version]);

  if (!version) return null;

  const totalHours = version.total_hours_snapshot || 0;
  const totalUsd = version.total_usd_snapshot;
  const totalBdt = version.total_bdt_snapshot;
  const itemsCount = tasks.length;

  const handleTaskChange = (idx: number, field: 'title' | 'hours', value: string) => {
    setTasks((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [field]: field === 'hours' ? Number(value) || 0 : value } : t))
    );
  };

  const handleAddTask = () => {
    setTasks((prev) => [...prev, { title: `Scope Task ${prev.length + 1}`, hours: 5 }]);
  };

  const handleRemoveTask = (idx: number) => {
    if (tasks.length <= 1) return;
    setTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(version.id, kind, includeBdt, kind === 'detailed' ? tasks : []);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Authorized Work Order"
      subtitle="Issue formal client work order from approved scope version"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Approved Scope Summary Card */}
        <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {packageItem?.title || 'Scope Package'}
                </div>
                <div className="text-[11px] text-slate-500">
                  Project: <span className="text-slate-700 dark:text-slate-300 font-medium">{projectName}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                v{version.version_number}.0 Approved
              </span>
              <div className="font-mono text-xs font-bold text-emerald-700 dark:text-teal-300 mt-1">
                {formatHours(totalHours)} ({itemsCount} item{itemsCount !== 1 ? 's' : ''})
              </div>
            </div>
          </div>
        </div>

        {/* BDT Currency Configuration: With BDT vs Without BDT */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
            <span>Currency & BDT Option</span>
            <span className="text-[10px] font-normal text-slate-500">Select currency presentation</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Option A: With BDT */}
            <div
              onClick={() => setIncludeBdt(true)}
              className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                includeBdt
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/30'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                    <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
                    <span>With BDT (Dual)</span>
                  </div>
                  {includeBdt && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-teal-400" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Includes both USD and Bangladeshi Taka (BDT) rates and totals.
                </p>
              </div>

              {canViewMoney && totalUsd != null && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 font-mono text-[11px] flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span>{formatUSD(totalUsd)}</span>
                  <span className="font-bold text-emerald-700 dark:text-teal-300">
                    {totalBdt != null ? formatBDT(totalBdt) : 'BDT Available'}
                  </span>
                </div>
              )}
            </div>

            {/* Option B: Without BDT */}
            <div
              onClick={() => setIncludeBdt(false)}
              className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                !includeBdt
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/30'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                    <DollarSign className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Without BDT (USD Only)</span>
                  </div>
                  {!includeBdt && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  BDT is omitted. Only USD contract value is displayed and exported.
                </p>
              </div>

              {canViewMoney && totalUsd != null && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 font-mono text-[11px] flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-blue-700 dark:text-blue-300">{formatUSD(totalUsd)}</span>
                  <span className="text-slate-400 text-[10px] font-sans">BDT Omitted</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Work Order Format Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
            Work Order Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKind('detailed')}
              className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition ${
                kind === 'detailed'
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-600 font-semibold text-slate-900 dark:text-slate-100'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
              <div>
                <div className="text-xs">Detailed (Itemized)</div>
                <div className="text-[10px] text-slate-500 font-normal">Lists all {itemsCount} tasks</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setKind('summary')}
              className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition ${
                kind === 'summary'
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-600 font-semibold text-slate-900 dark:text-slate-100'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="text-xs">Summary (Milestone)</div>
                <div className="text-[10px] text-slate-500 font-normal">Package total only</div>
              </div>
            </button>
          </div>
        </div>

        {/* Itemized Tasks Breakdown for Detailed Format */}
        {kind === 'detailed' && (
          <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ListOrdered className="w-3.5 h-3.5 text-blue-500" />
                <span>Deliverable / Scope Task Breakdown</span>
              </span>
              <button
                type="button"
                onClick={handleAddTask}
                className="text-[11px] font-semibold text-emerald-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Task</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {tasks.map((task, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 w-4 text-right shrink-0">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    required
                    value={task.title}
                    onChange={(e) => handleTaskChange(idx, 'title', e.target.value)}
                    placeholder="Deliverable / Scope Task name"
                    className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
                  />
                  <div className="relative w-20 shrink-0">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      value={task.hours}
                      onChange={(e) => handleTaskChange(idx, 'hours', e.target.value)}
                      placeholder="Hours"
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 text-right pr-6"
                    />
                    <span className="text-[10px] text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none font-mono">
                      h
                    </span>
                  </div>
                  {tasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(idx)}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 transition shrink-0 cursor-pointer"
                      title="Remove task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-1 text-[11px] text-slate-500 border-t border-slate-200 dark:border-slate-800">
              <span>Total Itemized Tasks: {tasks.length} (at least 3 included)</span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                Sum: {tasks.reduce((s, it) => s + (Number(it.hours) || 0), 0).toFixed(1)} hrs
              </span>
            </div>
          </div>
        )}

        {/* Live Preview Summary */}
        <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1 text-slate-600 dark:text-slate-400">
          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Document Snapshot Preview</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span>Billable Scope:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {formatHours(totalHours)}
            </span>
          </div>
          {canViewMoney && totalUsd != null && (
            <div className="flex items-center justify-between">
              <span>Contract Pricing:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {formatUSD(totalUsd)}
                {includeBdt && totalBdt != null && (
                  <span className="text-emerald-600 dark:text-teal-400 ml-1.5">
                    / {formatBDT(totalBdt)}
                  </span>
                )}
                {!includeBdt && (
                  <span className="text-slate-400 font-sans text-[10px] ml-1.5 font-normal">
                    (No BDT)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Generate Work Order ({includeBdt ? 'With BDT' : 'Without BDT'})</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
