// src/features/workspace/EditEstimateModal.tsx
// Modal for Admin and Super Admin to edit an Estimate prior to client approval

import React, { useState, useEffect } from 'react';
import { ScopeVersion } from '../../types';
import { Modal } from '../../components/Modal';
import { formatHours } from '../../lib/formatting/currency';
import { Plus, Trash2, Edit3, CheckCircle2, ShieldAlert } from 'lucide-react';

interface EditEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: ScopeVersion | null;
  initialPackageTitle?: string;
  onSave: (
    versionId: string,
    updatedPackageTitle: string,
    items: Array<{ title: string; hours: number }>
  ) => void;
}

export const EditEstimateModal: React.FC<EditEstimateModalProps> = ({
  isOpen,
  onClose,
  version,
  initialPackageTitle = 'Scope Package',
  onSave,
}) => {
  const [packageTitle, setPackageTitle] = useState(initialPackageTitle);
  const [items, setItems] = useState<Array<{ title: string; hours: number | string }>>([
    { title: '', hours: '' },
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (version && isOpen) {
      setPackageTitle(initialPackageTitle);
      if (version.items && version.items.length > 0) {
        setItems(
          version.items.map((it) => ({
            title: it.title,
            hours: it.hours,
          }))
        );
      } else {
        setItems([
          { title: 'Core Deliverables Implementation', hours: version.total_hours_snapshot || 10 },
        ]);
      }
      setError(null);
    }
  }, [version, initialPackageTitle, isOpen]);

  if (!version) return null;

  // Immutability Guard: strictly prohibit editing once approved
  const isApproved = version.status === 'approved' || version.status === 'superseded';
  if (isApproved) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Estimate Immutable"
        subtitle="Approved contracts cannot be edited"
        maxWidth="md"
      >
        <div className="p-4 space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2 text-rose-600 font-bold">
            <ShieldAlert className="w-4 h-4" />
            <span>Editing Strictly Prohibited</span>
          </div>
          <p>
            Estimate <strong>v{version.version_number}.0</strong> has already been approved and signed off.
            Legally binding scope versions cannot be modified after approval. Further changes require creating a new revision.
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

    onSave(version.id, packageTitle.trim() || initialPackageTitle, validItems);
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
      title={`Edit Estimate Scope — v${version.version_number}.0`}
      subtitle="Update deliverable tasks and estimated hours prior to client approval"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Scope Package Title */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
            Package Title
          </label>
          <input
            type="text"
            required
            value={packageTitle}
            onChange={(e) => setPackageTitle(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Deliverable Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Deliverables & Scope Tasks
            </label>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-[11px] font-semibold text-emerald-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Deliverable</span>
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
                  placeholder="Task or deliverable name"
                  className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
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
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 text-right pr-6"
                  />
                  <span className="text-[10px] text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none font-mono">
                    h
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-1.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0 cursor-pointer"
                  title="Remove line item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Real-time Tally */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500">Updated Total Scope:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-teal-400 text-sm">
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
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save Estimate Changes</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
