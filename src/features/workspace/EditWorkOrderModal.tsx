// src/features/workspace/EditWorkOrderModal.tsx
// Modal for Admin and Super Admin to edit a Work Order prior to final approval or completion

import React, { useState, useEffect } from 'react';
import { WorkOrder } from '../../types';
import { Modal } from '../../components/Modal';
import { formatHours } from '../../lib/formatting/currency';
import { Plus, Trash2, CheckCircle2, ShieldAlert, ListOrdered } from 'lucide-react';

interface EditWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder | null;
  onSave: (
    workOrderId: string,
    items: Array<{ title: string; hours: number }>
  ) => void;
}

export const EditWorkOrderModal: React.FC<EditWorkOrderModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  onSave,
}) => {
  const [items, setItems] = useState<Array<{ title: string; hours: number | string }>>([
    { title: '', hours: '' },
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workOrder && isOpen) {
      if (workOrder.items && workOrder.items.length > 0) {
        setItems(
          workOrder.items.map((it) => ({
            title: it.title,
            hours: it.hours,
          }))
        );
      } else {
        const h = workOrder.hours_snapshot || 0;
        setItems([
          { title: 'Core Deliverables Implementation', hours: Math.round(h * 0.45 * 10) / 10 },
          { title: 'System Integration & Testing', hours: Math.round(h * 0.35 * 10) / 10 },
          { title: 'Client Deployment & QA Signoff', hours: Math.round(h * 0.20 * 10) / 10 },
        ]);
      }
      setError(null);
    }
  }, [workOrder, isOpen]);

  if (!workOrder) return null;

  // Immutability Guard: strictly prohibit editing once approved, delivered, or completed
  const isLocked = workOrder.status === 'completed' || workOrder.status === 'delivered';
  if (isLocked) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Work Order Immutable"
        subtitle="Completed work orders cannot be edited"
        maxWidth="md"
      >
        <div className="p-4 space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2 text-rose-600 font-bold">
            <ShieldAlert className="w-4 h-4" />
            <span>Editing Strictly Prohibited</span>
          </div>
          <p>
            Work Order <strong>{workOrder.work_order_number}</strong> is in <strong>{workOrder.status}</strong> state.
            Legally binding delivery orders cannot be edited after completion.
          </p>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 text-white font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  const handleItemChange = (idx: number, field: 'title' | 'hours', val: string) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: val } : it))
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { title: '', hours: '' }]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) {
      setItems([{ title: '', hours: '' }]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validItems = items
      .map((it) => ({
        title: it.title.trim(),
        hours: Number(it.hours) || 0,
      }))
      .filter((it) => it.title.length > 0 && it.hours > 0);

    if (validItems.length === 0) {
      setError('Please provide at least one valid deliverable task with hours greater than 0.');
      return;
    }

    onSave(workOrder.id, validItems);
    onClose();
  };

  const currentTotalHours = items.reduce(
    (acc, it) => acc + (Number(it.hours) || 0),
    0
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Work Order — ${workOrder.work_order_number}`}
      subtitle="Update deliverable scope tasks and hours breakdown prior to completion"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Deliverable Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ListOrdered className="w-3.5 h-3.5 text-blue-500" />
              <span>Deliverable / Scope Task Breakdown</span>
            </label>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {items.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400 w-4 text-right shrink-0">
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  required
                  value={it.title}
                  onChange={(e) => handleItemChange(idx, 'title', e.target.value)}
                  placeholder="Deliverable / Scope Task name"
                  className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
                <div className="relative w-20 shrink-0">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={it.hours}
                    onChange={(e) => handleItemChange(idx, 'hours', e.target.value)}
                    placeholder="0"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 text-right pr-6"
                  />
                  <span className="text-[10px] text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none font-mono">
                    h
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-1.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0 cursor-pointer"
                  title="Remove task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Real-time Tally */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500">Updated Total Hours:</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
              {formatHours(currentTotalHours)}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save Work Order Changes</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
