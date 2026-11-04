// src/components/DocumentExportButtons.tsx
// Quick-action export controls:
// 1. Copy Details to Clipboard (Plain Text Table & Rich HTML for Excel / Google Docs)
// 2. Generate and Print Official PDF (via native print)

import React, { useState } from 'react';
import { Copy, Check, Printer } from 'lucide-react';
import {
  generateEstimateText,
  generateWorkOrderText,
  copyToClipboard,
  printDocumentPDF,
  buildEstimatePDFHtml,
  buildWorkOrderPDFHtml
} from '../lib/export/documentExporter';
import { ScopeVersion, WorkOrder } from '../types';

interface EstimateExportProps {
  type: 'estimate';
  version: ScopeVersion | any;
  packageTitle?: string;
  projectName?: string;
  clientName?: string;
  canViewMoney?: boolean;
  size?: 'sm' | 'xs';
}

interface WorkOrderExportProps {
  type: 'work_order';
  workOrder: WorkOrder | any;
  projectName?: string;
  clientName?: string;
  canViewMoney?: boolean;
  size?: 'sm' | 'xs';
}

type DocumentExportButtonsProps = EstimateExportProps | WorkOrderExportProps;

export const DocumentExportButtons: React.FC<DocumentExportButtonsProps> = (props) => {
  const [copied, setCopied] = useState(false);
  const size = props.size || 'xs';

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();

    let textPayload: { text: string; html: string; tsv: string };
    if (props.type === 'estimate') {
      textPayload = generateEstimateText({
        version: props.version,
        packageTitle: props.packageTitle,
        projectName: props.projectName,
        clientName: props.clientName,
        canViewMoney: props.canViewMoney,
      });
    } else {
      textPayload = generateWorkOrderText({
        workOrder: props.workOrder,
        projectName: props.projectName,
        clientName: props.clientName,
        canViewMoney: props.canViewMoney,
      });
    }

    const success = await copyToClipboard(textPayload.text, textPayload.html);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrintPDF = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (props.type === 'estimate') {
      const html = buildEstimatePDFHtml({
        version: props.version,
        packageTitle: props.packageTitle,
        projectName: props.projectName,
        clientName: props.clientName,
        canViewMoney: props.canViewMoney,
      });
      printDocumentPDF(`Estimate_${props.packageTitle || 'Scope'}_v${props.version.version_number}.pdf`, html);
    } else {
      const html = buildWorkOrderPDFHtml({
        workOrder: props.workOrder,
        projectName: props.projectName,
        clientName: props.clientName,
        canViewMoney: props.canViewMoney,
      });
      printDocumentPDF(`WorkOrder_${props.workOrder.work_order_number}.pdf`, html);
    }
  };

  const btnClasses = size === 'xs'
    ? 'px-2 py-1 text-[11px] rounded-md font-medium'
    : 'px-2.5 py-1.5 text-xs rounded-lg font-semibold';

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Copy Button */}
      <button
        type="button"
        onClick={handleCopy}
        className={`${btnClasses} flex items-center gap-1 transition border ${
          copied
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700'
        }`}
        title="Copy table and details to clipboard (pasting into Excel or Sheets formats cells!)"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Copy</span>
          </>
        )}
      </button>

      {/* PDF / Print Button */}
      <button
        type="button"
        onClick={handlePrintPDF}
        className={`${btnClasses} flex items-center gap-1 transition border bg-white hover:bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700`}
        title="Generate official printable PDF / document specification"
      >
        <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        <span>PDF</span>
      </button>
    </div>
  );
};
