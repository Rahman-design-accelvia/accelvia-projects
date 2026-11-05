// src/features/workspace/DeleteConfirmationModal.tsx
// Confirmation Modal for Admin / Super Admin deletions of Estimates and Work Orders

import React from 'react';
import { Modal } from '../../components/Modal';
import { Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  itemDetails: {
    label: string;
    value: string;
  }[];
  isApprovedProhibited?: boolean;
  onConfirm: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  itemDetails,
  isApprovedProhibited = false,
  onConfirm,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle || 'Confirm permanent deletion'}
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {isApprovedProhibited ? (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Deletion Strictly Prohibited</span>
            </div>
            <p className="leading-relaxed">
              This record has already been approved. Under compliance and audit rules, approved estimates and work orders are legally binding snapshots that cannot be deleted or modified.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Warning: Irreversible Action</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Deleting this proposal will permanently remove it from the workspace, project timeline, and conversations. An immutable entry will be recorded in the system audit log.
            </p>
          </div>
        )}

        {/* Snapshot Details Card */}
        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-1.5 font-mono">
          {itemDetails.map((det, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-sans">{det.label}:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{det.value}</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          {!isApprovedProhibited && (
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Confirm Delete</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
