// src/features/workspace/CreateEstimateModal.tsx
// Modal for creating instant Estimate drafts and posting them directly to the conversation feed

import React, { useState, useEffect, useMemo } from 'react';
import { ScopePackage, ProjectFinancialSettings } from '../../types';
import { Modal } from '../../components/Modal';
import { formatHours, formatUSD, formatBDT } from '../../lib/formatting/currency';
import { Plus, X, AlertCircle, Send, FileSpreadsheet, CheckCircle2, MessageSquare } from 'lucide-react';

export interface CreateEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  packages: ScopePackage[];
  projectName?: string;
  financialSettings?: ProjectFinancialSettings | null;
  defaultPostToConversation?: boolean;
  onSubmit: (data: {
    pkgId: string | null;
    packageTitle: string;
    items: Array<{ title: string; hours: number }>;
    postToConversation: boolean;
  }) => void;
}

export const CreateEstimateModal: React.FC<CreateEstimateModalProps> = ({
  isOpen,
  onClose,
  packages,
  projectName = 'Project',
  financialSettings,
  defaultPostToConversation = true,
  onSubmit,
}) => {
  const [pkgId, setPkgId] = useState<string>('new');
  const [packageTitle, setPackageTitle] = useState<string>('');
  const [items, setItems] = useState<Array<{ title: string; hours: number | string }>>([
    { title: '', hours: '' },
  ]);
  const [postToConversation, setPostToConversation] = useState<boolean>(defaultPostToConversation);
  const [error, setError] = useState<string | null>(null);

  // Reset or initialize form whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPostToConversation(defaultPostToConversation);

      if (packages.length === 0) {
        setPkgId('new');
        setPackageTitle('Core Project Scope');
      } else {
        setPkgId('new');
        setPackageTitle('');
      }

      setItems([
        { title: '', hours: '' },
      ]);
    }
  }, [isOpen, packages, defaultPostToConversation]);

  const handleAddItemRow = () => {
    setItems((prev) => [...prev, { title: '', hours: '' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setItems((prev) => {
      if (prev.length <= 1) {
        return [{ title: '', hours: '' }];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleItemChange = (index: number, field: 'title' | 'hours', value: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const totalDraftHours = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.hours) || 0), 0);
  }, [items]);

  const validItemsCount = useMemo(() => {
    return items.filter((it) => it.title.trim().length > 0 && Number(it.hours) > 0).length;
  }, [items]);

  // Projected commercial value if rates are configured
  const rateUsd = financialSettings?.client_rate_usd_per_hour ?? null;
  const rateBdt = financialSettings?.client_rate_bdt_per_hour ?? null;
  const projectedUsd = rateUsd != null ? totalDraftHours * rateUsd : null;
  const projectedBdt = rateBdt != null ? totalDraftHours * rateBdt : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate package title when creating a new package
    const cleanTitle = packageTitle.trim();
    if (pkgId === 'new' && !cleanTitle) {
      setError('Please provide a title for the new scope package (e.g. Core WP Development).');
      return;
    }

    // Auto-filter out empty rows so accidental blanks never block saving
    const validItems = items
      .map((it) => ({
        title: it.title.trim(),
        hours: Number(it.hours) || 0,
      }))
      .filter((it) => it.title.length > 0 && it.hours > 0);

    if (validItems.length === 0) {
      setError('Please enter at least one deliverable item with a title and hours greater than 0.');
      return;
    }

    const selectedPkgId = pkgId === 'new' ? null : pkgId;
    const finalTitle = pkgId === 'new' ? cleanTitle : (packages.find((p) => p.id === pkgId)?.title || cleanTitle);

    onSubmit({
      pkgId: selectedPkgId,
      packageTitle: finalTitle,
      items: validItems,
      postToConversation,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Estimate Scope"
      subtitle={`Configure deliverables & hours for ${projectName}`}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Package Target Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Package Target
          </label>
          <select
            value={pkgId}
            onChange={(e) => setPkgId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-500 transition"
          >
            <option value="new">+ Create New Scope Package</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.title} ({pkg.package_kind})
              </option>
            ))}
          </select>
        </div>

        {/* Package Title (when creating new package) */}
        {pkgId === 'new' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Scope Package Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={packageTitle}
              onChange={(e) => setPackageTitle(e.target.value)}
              placeholder="e.g. Core WP Development or Additional Cloud Storage Scope"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-teal-500 transition"
            />
          </div>
        )}

        {/* Validation Error Banner */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Deliverables Section */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Deliverables & Scope Tasks</span>
            </label>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline flex items-center gap-1 font-semibold cursor-pointer transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Deliverable</span>
            </button>
          </div>

          {/* List of Deliverable Rows */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center group">
                <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 flex items-center justify-center shrink-0 select-none">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  placeholder={`Deliverable #${idx + 1} (e.g. Home page & Global settings)`}
                  value={item.title}
                  onChange={(e) => handleItemChange(idx, 'title', e.target.value)}
                  className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-teal-500 transition"
                />
                <div className="relative w-24 sm:w-28 shrink-0">
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    placeholder="Hours"
                    value={item.hours}
                    onChange={(e) => handleItemChange(idx, 'hours', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-2.5 pr-7 py-2 text-xs text-slate-800 dark:text-slate-100 font-mono placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-teal-500 transition"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 dark:text-slate-500 font-mono pointer-events-none select-none">
                    hrs
                  </span>
                </div>

                {/* Delete row button */}
                <button
                  type="button"
                  onClick={() => handleRemoveItemRow(idx)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/60 transition shrink-0 cursor-pointer"
                  title="Remove this line item"
                  aria-label="Remove item"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Scope Summary Badge Bar */}
          <div className="mt-2.5 pt-2.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              {validItemsCount} valid deliverable{validItemsCount !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-3">
              {(projectedUsd != null || projectedBdt != null) && (
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 hidden sm:inline">
                  Est. Value:{' '}
                  {projectedUsd != null && (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatUSD(projectedUsd)}
                    </span>
                  )}
                  {projectedUsd != null && projectedBdt != null && ' • '}
                  {projectedBdt != null && (
                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                      {formatBDT(projectedBdt)}
                    </span>
                  )}
                </div>
              )}
              <div className="font-mono">
                <span className="text-slate-500 dark:text-slate-400 mr-1">Total Scope:</span>
                <strong className="text-teal-600 dark:text-teal-400 font-bold text-sm">
                  {formatHours(totalDraftHours)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Instant Chat Delivery Option */}
        <div className="p-3 rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/70 dark:bg-teal-950/30 flex items-start gap-3 transition">
          <input
            type="checkbox"
            id="postToConversationCheck"
            checked={postToConversation}
            onChange={(e) => setPostToConversation(e.target.checked)}
            className="mt-0.5 rounded border-teal-300 dark:border-teal-700 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
          />
          <label htmlFor="postToConversationCheck" className="text-xs cursor-pointer select-none flex-1">
            <span className="font-semibold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>Instantly post proposal card to project conversation</span>
            </span>
            <span className="text-teal-700 dark:text-teal-300/80 text-[11px] block mt-0.5 leading-relaxed">
              When checked, this proposal card appears instantly in chat for management review and one-click authorization.
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            {postToConversation ? (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Create & Post to Chat</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save Draft Scope</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
