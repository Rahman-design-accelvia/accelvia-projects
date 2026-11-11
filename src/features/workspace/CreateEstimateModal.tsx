// src/features/workspace/CreateEstimateModal.tsx
// High-performance modal for creating Estimate scopes with deliverables, multi-task lists, and instant chat dispatch

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ScopePackage, ProjectFinancialSettings } from '../../types';
import { Modal } from '../../components/Modal';
import { formatHours, formatUSD, formatBDT } from '../../lib/formatting/currency';
import { 
  Plus, 
  X, 
  AlertCircle, 
  Send, 
  FileSpreadsheet, 
  CheckCircle2, 
  MessageSquare, 
  ListPlus, 
  Sparkles, 
  Trash2,
  Layers,
  ClipboardPaste,
  HelpCircle
} from 'lucide-react';

export interface DeliverableItemRow {
  id: string;
  title: string;
  hours: number | string;
}

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

// Popular task list presets for instant 1-click authoring
const TASK_PRESETS: Record<string, Array<{ title: string; hours: number }>> = {
  'Web Development': [
    { title: 'Home page & Global settings', hours: 16.0 },
    { title: 'Responsive layout & mobile tuning', hours: 10.0 },
    { title: 'Cross-browser QA & performance audit', hours: 5.5 },
  ],
  'UI/UX & Product Design': [
    { title: 'Wireframing & user flow architecture', hours: 12.0 },
    { title: 'High-fidelity Figma UI design system', hours: 18.0 },
    { title: 'Interactive prototypes & client review revisions', hours: 8.0 },
  ],
  'Backend & Database': [
    { title: 'Database schema, migrations & RLS security', hours: 14.0 },
    { title: 'Core REST / RPC API endpoints implementation', hours: 20.0 },
    { title: 'Automated integration testing & security verification', hours: 8.0 },
  ],
};

function generateRowId(): string {
  return `row-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
  const [items, setItems] = useState<DeliverableItemRow[]>([
    { id: generateRowId(), title: '', hours: '' },
  ]);
  const [postToConversation, setPostToConversation] = useState<boolean>(defaultPostToConversation);
  const [error, setError] = useState<string | null>(null);

  // Multiple Task List / Bulk Paste state
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [bulkInputText, setBulkInputText] = useState<string>('');
  const [defaultBulkHours, setDefaultBulkHours] = useState<number>(4);

  // References to keep input focus smooth when pressing Enter
  const hasInitializedRef = useRef<boolean>(false);
  const titleInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const hoursInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Reset or initialize form ONLY when transitioning from closed to open
  // This prevents any parent re-renders or background timers from wiping out typed deliverables!
  useEffect(() => {
    if (isOpen && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
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
        { id: generateRowId(), title: '', hours: '' },
      ]);
      setIsBulkMode(false);
      setBulkInputText('');
    } else if (!isOpen) {
      hasInitializedRef.current = false;
    }
  }, [isOpen]); // Strict dependency on isOpen only!

  // Add a single deliverable row
  const handleAddItemRow = (focusNew = true) => {
    const newId = generateRowId();
    setItems((prev) => [...prev, { id: newId, title: '', hours: '' }]);
    if (focusNew) {
      setTimeout(() => {
        titleInputRefs.current[newId]?.focus();
      }, 50);
    }
  };

  // Add multiple empty rows at once
  const handleAddMultipleEmptyRows = (count: number) => {
    const newRows: DeliverableItemRow[] = Array.from({ length: count }, () => ({
      id: generateRowId(),
      title: '',
      hours: '',
    }));
    setItems((prev) => [...prev, ...newRows]);
    setTimeout(() => {
      titleInputRefs.current[newRows[0].id]?.focus();
    }, 50);
  };

  // Remove a row
  const handleRemoveItemRow = (id: string) => {
    setItems((prev) => {
      if (prev.length <= 1) {
        return [{ id: generateRowId(), title: '', hours: '' }];
      }
      return prev.filter((it) => it.id !== id);
    });
  };

  // Clear all items to a single clean slate
  const handleClearAllItems = () => {
    setItems([{ id: generateRowId(), title: '', hours: '' }]);
    setError(null);
  };

  // Update a single row field
  const handleItemChange = (id: string, field: 'title' | 'hours', value: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  // Handle keyboard navigation: Enter on title moves to hours; Enter on hours creates next row
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      hoursInputRefs.current[id]?.focus();
    }
  };

  const handleHoursKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If it's the last row, create a new row; otherwise focus the next row title
      if (index === items.length - 1) {
        handleAddItemRow(true);
      } else {
        const nextItem = items[index + 1];
        if (nextItem) {
          titleInputRefs.current[nextItem.id]?.focus();
        }
      }
    }
  };

  // Apply a pre-built task pack
  const handleApplyPreset = (presetName: string) => {
    const presetItems = TASK_PRESETS[presetName];
    if (!presetItems) return;

    // Filter out existing blank rows
    const existingFilled = items.filter((it) => it.title.trim().length > 0 || Number(it.hours) > 0);
    const newRows: DeliverableItemRow[] = presetItems.map((p) => ({
      id: generateRowId(),
      title: p.title,
      hours: p.hours,
    }));

    if (existingFilled.length === 0) {
      setItems(newRows);
      if (pkgId === 'new' && !packageTitle.trim()) {
        setPackageTitle(`${presetName} Scope`);
      }
    } else {
      setItems([...existingFilled, ...newRows]);
    }
  };

  // Parse bulk pasted text into deliverable rows
  // Matches formats like:
  // "Home page & Global settings (16 hrs)"
  // "Responsive layout: 10"
  // "QA, 5.5"
  // "Feature description"
  const handleImportBulkTasks = () => {
    if (!bulkInputText.trim()) return;

    const lines = bulkInputText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const parsedRows: DeliverableItemRow[] = lines.map((line) => {
      // Strip leading bullet points or numbers (e.g. "1. ", "- ", "* ")
      const cleanLine = line.replace(/^(?:[-*•]|\d+[.)])\s*/, '').trim();

      // Look for hours in parentheses, colons, or commas at the end of line
      // e.g. "(16 hrs)", " - 10 hours", ": 5.5", ", 8"
      const matchWithHours = cleanLine.match(/^(.*?)(?:[\(\[\{,:\-–]\s*(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)?[\)\]\}]?)\s*$/i);

      if (matchWithHours && matchWithHours[1].trim() && matchWithHours[2]) {
        return {
          id: generateRowId(),
          title: matchWithHours[1].trim(),
          hours: Number(matchWithHours[2]) || defaultBulkHours,
        };
      }

      // Check if line ends with digits + hrs (e.g. "Home page 16 hrs")
      const matchTrailingHrs = cleanLine.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)$/i);
      if (matchTrailingHrs && matchTrailingHrs[1].trim()) {
        return {
          id: generateRowId(),
          title: matchTrailingHrs[1].trim(),
          hours: Number(matchTrailingHrs[2]) || defaultBulkHours,
        };
      }

      // Default: clean line title with default hours
      return {
        id: generateRowId(),
        title: cleanLine,
        hours: defaultBulkHours > 0 ? defaultBulkHours : '',
      };
    });

    // Remove existing empty rows and append parsed rows
    const existingFilled = items.filter((it) => it.title.trim().length > 0 || Number(it.hours) > 0);
    setItems([...existingFilled, ...parsedRows]);
    setBulkInputText('');
    setIsBulkMode(false);
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
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Package Target Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Package Target
            </label>
            <select
              value={pkgId}
              onChange={(e) => setPkgId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-500 transition font-medium"
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
          {pkgId === 'new' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Scope Package Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={packageTitle}
                onChange={(e) => setPackageTitle(e.target.value)}
                placeholder="e.g. Core WP Development"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-teal-500 transition font-medium"
              />
            </div>
          ) : (
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 pt-6">
              <span>Appending revision to existing package: <strong>{packages.find((p) => p.id === pkgId)?.title}</strong></span>
            </div>
          )}
        </div>

        {/* Validation Error Banner */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Presets & Bulk Tool Toolbar */}
        <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Quick Presets:</span>
              <div className="flex flex-wrap items-center gap-1 ml-1">
                {Object.keys(TASK_PRESETS).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Bulk Paste Mode */}
            <button
              type="button"
              onClick={() => setIsBulkMode(!isBulkMode)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                isBulkMode
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 border-teal-300 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/40'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>{isBulkMode ? 'Hide Bulk Paste' : '⚡ Paste / Bulk Add Task List'}</span>
            </button>
          </div>

          {/* Bulk Paste Expansion Drawer */}
          {isBulkMode && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span className="font-semibold flex items-center gap-1">
                  <ListPlus className="w-3.5 h-3.5 text-teal-500" />
                  Paste multiple tasks (one per line, e.g. "Task description (12 hrs)" or "Task name"):
                </span>
                <div className="flex items-center gap-1.5">
                  <span>Default hours:</span>
                  <input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={defaultBulkHours}
                    onChange={(e) => setDefaultBulkHours(Number(e.target.value) || 0)}
                    className="w-14 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-center font-mono text-[11px]"
                  />
                </div>
              </div>

              <textarea
                rows={4}
                value={bulkInputText}
                onChange={(e) => setBulkInputText(e.target.value)}
                placeholder={`Home page & Global settings (16 hrs)\nResponsive layout (10 hrs)\nQA & testing (5.5 hrs)\nPerformance audit`}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 font-mono placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
              />

              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500">
                  Tip: Supports formats with hours in parentheses, colons, or commas.
                </span>
                <button
                  type="button"
                  onClick={handleImportBulkTasks}
                  disabled={!bulkInputText.trim()}
                  className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition shadow-xs disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Import Lines into Deliverables</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Deliverables Section */}
        <div>
          <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Deliverables & Scope Tasks</span>
              <span className="text-[11px] font-normal text-slate-500">
                (Press <kbd className="px-1 py-0.2 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[10px]">Enter</kbd> to add next row)
              </span>
            </label>

            {/* Quick Multi-Row Add Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAddItemRow(true)}
                className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800/80 text-xs font-semibold flex items-center gap-1 cursor-pointer transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Task</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddMultipleEmptyRows(3)}
                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium cursor-pointer transition"
                title="Add 3 empty deliverable rows"
              >
                + 3 Rows
              </button>
              <button
                type="button"
                onClick={() => handleAddMultipleEmptyRows(5)}
                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium cursor-pointer transition"
                title="Add 5 empty deliverable rows"
              >
                + 5 Rows
              </button>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={handleClearAllItems}
                  className="px-2 py-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-medium cursor-pointer transition"
                  title="Reset to 1 empty deliverable"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* List of Deliverable Rows */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div key={item.id} className="flex gap-2 items-center group">
                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500 flex items-center justify-center shrink-0 select-none">
                  {idx + 1}
                </span>

                {/* Deliverable Title Input */}
                <input
                  ref={(el) => { titleInputRefs.current[item.id] = el; }}
                  type="text"
                  placeholder={`Deliverable #${idx + 1} (e.g. Home page & Global settings)`}
                  value={item.title}
                  onChange={(e) => handleItemChange(item.id, 'title', e.target.value)}
                  onKeyDown={(e) => handleTitleKeyDown(e, item.id)}
                  className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-teal-500 transition font-medium"
                />

                {/* Hours Input */}
                <div className="relative w-24 sm:w-28 shrink-0">
                  <input
                    ref={(el) => { hoursInputRefs.current[item.id] = el; }}
                    type="number"
                    step="0.25"
                    min="0"
                    placeholder="Hours"
                    value={item.hours}
                    onChange={(e) => handleItemChange(item.id, 'hours', e.target.value)}
                    onKeyDown={(e) => handleHoursKeyDown(e, item.id, idx)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-2.5 pr-7 py-2 text-xs text-slate-800 dark:text-slate-100 font-mono placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-teal-500 transition font-semibold"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 dark:text-slate-500 font-mono pointer-events-none select-none">
                    hrs
                  </span>
                </div>

                {/* Delete row button */}
                <button
                  type="button"
                  onClick={() => handleRemoveItemRow(item.id)}
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
          <div className="mt-2.5 pt-2.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-mono text-xs">
              <strong className="text-teal-600 dark:text-teal-400">{validItemsCount}</strong> valid deliverable{validItemsCount !== 1 ? 's' : ''} configured
            </span>
            <div className="flex items-center gap-3">
              {(projectedUsd != null || projectedBdt != null) && (
                <div className="text-xs font-mono text-slate-600 dark:text-slate-400 hidden sm:inline">
                  Commercial Value:{' '}
                  {projectedUsd != null && (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatUSD(projectedUsd)}
                    </span>
                  )}
                  {projectedUsd != null && projectedBdt != null && ' • '}
                  {projectedBdt != null && (
                    <span className="font-bold text-teal-600 dark:text-teal-400">
                      {formatBDT(projectedBdt)}
                    </span>
                  )}
                </div>
              )}
              <div className="font-mono bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 mr-1 text-[11px]">Total Scope:</span>
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
            className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
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
