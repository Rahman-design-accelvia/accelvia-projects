// src/lib/export/documentExporter.ts
// Cross-platform copy & PDF print generator for Estimates and Work Orders:
// 1. Copy formatted text / spreadsheet table to clipboard with dual HTML + PlainText formats
// 2. Client-ready branded printable PDF layout via native window.print()

import { ScopeVersion, WorkOrder } from '../../types';
import { formatHours, formatUSD, formatBDT } from '../formatting/currency';
import { getStoredCompanySettings } from '../../features/organization/OrganizationContext';

interface ExportEstimateOptions {
  version: ScopeVersion | {
    version_id?: string;
    version_number: number;
    total_hours?: number;
    total_hours_snapshot?: number;
    total_usd?: number | null;
    total_usd_snapshot?: number | null;
    total_bdt?: number | null;
    total_bdt_snapshot?: number | null;
    status: string;
    items?: Array<{ title: string; hours: number }>;
  };
  packageTitle?: string;
  projectName?: string;
  clientName?: string;
  canViewMoney?: boolean;
  companyName?: string;
}

interface ExportWorkOrderOptions {
  workOrder: WorkOrder | {
    work_order_id?: string;
    work_order_number: string;
    package_title?: string;
    hours_snapshot: number;
    total_usd_snapshot?: number | null;
    total_bdt_snapshot?: number | null;
    status: string;
    authorized_by?: string;
    generated_at?: string;
    items?: Array<{ title: string; hours: number }>;
  };
  projectName?: string;
  clientName?: string;
  canViewMoney?: boolean;
  companyName?: string;
}

/**
 * Format Estimate as plain text and HTML for rich clipboard paste
 */
export function generateEstimateText(opts: ExportEstimateOptions): { text: string; html: string; tsv: string } {
  const { version, packageTitle = 'Scope Package', projectName = 'Project', clientName = 'Client', canViewMoney = false } = opts;
  const company = (opts.companyName || getStoredCompanySettings().companyName || 'Company').trim();
  const verNum = version.version_number;
  const totalHrs = ('total_hours_snapshot' in version ? version.total_hours_snapshot : (version as any).total_hours) || 0;
  const totalUsd = 'total_usd_snapshot' in version ? version.total_usd_snapshot : (version as any).total_usd;
  const totalBdt = 'total_bdt_snapshot' in version ? version.total_bdt_snapshot : (version as any).total_bdt;
  const items = version.items || [];

  // Plain Text Layout
  let text = `============================================================\n`;
  text += `${company.toUpperCase()} — ESTIMATE SCOPE v${verNum}.0\n`;
  text += `Package:  ${packageTitle}\n`;
  text += `Project:  ${projectName}\n`;
  text += `Client:   ${clientName}\n`;
  text += `Status:   ${version.status.toUpperCase()}\n`;
  text += `============================================================\n\n`;
  text += `DELIVERABLES:\n`;
  text += `------------------------------------------------------------\n`;
  text += `No.  Deliverable Task                           Hours\n`;
  text += `------------------------------------------------------------\n`;

  items.forEach((it, idx) => {
    const num = String(idx + 1).padEnd(4, ' ');
    const title = it.title.padEnd(42, ' ').slice(0, 42);
    const hrs = `${Number(it.hours).toFixed(1)}h`;
    text += `${num} ${title} ${hrs.padStart(8, ' ')}\n`;
  });

  text += `------------------------------------------------------------\n`;
  text += `TOTAL ESTIMATED SCOPE:                        ${totalHrs.toFixed(1)}h\n`;
  if (canViewMoney && totalUsd != null) {
    text += `COMMERCIAL VALUE:                             ${formatUSD(totalUsd)} (${formatBDT(totalBdt || 0)})\n`;
  }
  text += `============================================================\n`;

  // TSV for Excel / Google Sheets
  let tsv = `Deliverable Item\tHours\n`;
  items.forEach((it) => {
    tsv += `${it.title}\t${it.hours}\n`;
  });
  tsv += `Total Hours\t${totalHrs}\n`;
  if (canViewMoney && totalUsd != null) {
    tsv += `Commercial Value USD\t${totalUsd}\n`;
  }

  // Rich HTML for Google Docs / Word / Email paste
  let html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">`;
  html += `<h2 style="margin: 0 0 4px 0; color: #0f172a; font-size: 18px;">Estimate Scope: ${packageTitle} (v${verNum}.0)</h2>`;
  html += `<p style="margin: 0 0 16px 0; color: #64748b; font-size: 13px;">Project: <strong>${projectName}</strong> &bull; Client: <strong>${clientName}</strong> &bull; Status: <span style="text-transform: uppercase; font-weight: bold; color: #059669;">${version.status}</span></p>`;
  html += `<table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">`;
  html += `<thead><tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;"><th style="padding: 8px 12px;">#</th><th style="padding: 8px 12px;">Deliverable Task</th><th style="padding: 8px 12px; text-align: right;">Estimated Hours</th></tr></thead>`;
  html += `<tbody>`;
  items.forEach((it, idx) => {
    html += `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 12px; color: #64748b;">${idx + 1}</td><td style="padding: 8px 12px; font-weight: 500;">${it.title}</td><td style="padding: 8px 12px; text-align: right; font-family: monospace;">${Number(it.hours).toFixed(1)}h</td></tr>`;
  });
  html += `</tbody><tfoot>`;
  html += `<tr style="border-top: 2px solid #cbd5e1; font-weight: bold;"><td colspan="2" style="padding: 10px 12px;">Total Estimated Scope</td><td style="padding: 10px 12px; text-align: right; font-family: monospace; color: #059669;">${totalHrs.toFixed(1)}h</td></tr>`;
  if (canViewMoney && totalUsd != null) {
    html += `<tr style="font-weight: bold; color: #0f172a;"><td colspan="2" style="padding: 6px 12px;">Commercial Valuation</td><td style="padding: 6px 12px; text-align: right; font-family: monospace;">${formatUSD(totalUsd)}</td></tr>`;
  }
  html += `</tfoot></table></div>`;

  return { text, html, tsv };
}

/**
 * Format Work Order as plain text and HTML for rich clipboard paste
 */
export function generateWorkOrderText(opts: ExportWorkOrderOptions): { text: string; html: string; tsv: string } {
  const { workOrder, projectName = 'Project', clientName = 'Client', canViewMoney = false } = opts;
  const company = (opts.companyName || getStoredCompanySettings().companyName || 'Company').trim();
  const woNum = workOrder.work_order_number;
  const pkgTitle = ('package_title' in workOrder ? workOrder.package_title : 'Work Order Scope') || 'Work Order Scope';
  const hours = workOrder.hours_snapshot || 0;
  const totalUsd = workOrder.total_usd_snapshot;
  const totalBdt = workOrder.total_bdt_snapshot;
  const authorizedBy = ('authorized_by' in workOrder ? workOrder.authorized_by : 'Management') || 'Management';
  const genDate = ('generated_at' in workOrder && workOrder.generated_at ? new Date(workOrder.generated_at).toLocaleDateString() : new Date().toLocaleDateString());
  const items = ('items' in workOrder && workOrder.items ? workOrder.items : []);

  // Plain text
  let text = `============================================================\n`;
  text += `${company.toUpperCase()} — AUTHORIZED WORK ORDER\n`;
  text += `Work Order:  ${woNum}\n`;
  text += `Package:     ${pkgTitle}\n`;
  text += `Project:     ${projectName}\n`;
  text += `Client:      ${clientName}\n`;
  text += `Status:      ${workOrder.status.toUpperCase()}\n`;
  text += `Authorized:  ${authorizedBy} (${genDate})\n`;
  text += `============================================================\n\n`;
  text += `AUTHORIZED DELIVERABLES:\n`;
  text += `------------------------------------------------------------\n`;
  text += `No.  Task Description                           Hours\n`;
  text += `------------------------------------------------------------\n`;

  if (items.length > 0) {
    items.forEach((it, idx) => {
      const num = String(idx + 1).padEnd(4, ' ');
      const title = it.title.padEnd(42, ' ').slice(0, 42);
      const hrs = `${Number(it.hours).toFixed(1)}h`;
      text += `${num} ${title} ${hrs.padStart(8, ' ')}\n`;
    });
    text += `------------------------------------------------------------\n`;
  }

  text += `TOTAL AUTHORIZED HOURS:                       ${hours.toFixed(1)}h\n`;
  if (canViewMoney && totalUsd != null) {
    if (totalBdt != null) {
      text += `TOTAL CONTRACT VALUE:                         ${formatUSD(totalUsd)} (${formatBDT(totalBdt)})\n`;
    } else {
      text += `TOTAL CONTRACT VALUE:                         ${formatUSD(totalUsd)} (USD Only)\n`;
    }
  }
  text += `============================================================\n`;

  // TSV
  let tsv = `Deliverable Item\tHours\n`;
  if (items.length > 0) {
    items.forEach((it) => {
      tsv += `${it.title}\t${it.hours}\n`;
    });
  }
  tsv += `Total Hours\t${hours}\n`;
  if (canViewMoney && totalUsd != null) {
    tsv += `Total Value USD\t${totalUsd}\n`;
    if (totalBdt != null) {
      tsv += `Total Value BDT\t${totalBdt}\n`;
    }
  }

  // Rich HTML
  let html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; padding: 16px; border: 1px solid #bfdbfe; border-radius: 8px; background: #f8fafc;">`;
  html += `<h2 style="margin: 0 0 4px 0; color: #1e3a8a; font-size: 18px;">Work Order: ${woNum}</h2>`;
  html += `<p style="margin: 0 0 4px 0; color: #475569; font-size: 13px;">Scope: <strong>${pkgTitle}</strong> &bull; Project: <strong>${projectName}</strong></p>`;
  html += `<p style="margin: 0 0 16px 0; color: #64748b; font-size: 12px;">Authorized by: <strong>${authorizedBy}</strong> on ${genDate} &bull; Status: <span style="text-transform: uppercase; font-weight: bold; color: #2563eb;">${workOrder.status}</span></p>`;
  
  if (items.length > 0) {
    html += `<table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; background: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0;">`;
    html += `<thead><tr style="background: #eff6ff; border-bottom: 2px solid #bfdbfe;"><th style="padding: 8px 12px;">#</th><th style="padding: 8px 12px;">Deliverable Item</th><th style="padding: 8px 12px; text-align: right;">Hours</th></tr></thead>`;
    html += `<tbody>`;
    items.forEach((it, idx) => {
      html += `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 12px; color: #64748b;">${idx + 1}</td><td style="padding: 8px 12px; font-weight: 500;">${it.title}</td><td style="padding: 8px 12px; text-align: right; font-family: monospace;">${Number(it.hours).toFixed(1)}h</td></tr>`;
    });
    html += `</tbody></table>`;
  }

  html += `<div style="margin-top: 12px; padding: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px;">`;
  html += `<div style="display: flex; justify-content: space-between; font-weight: bold;"><span>Total Authorized Hours:</span><span style="font-family: monospace; color: #2563eb;">${hours.toFixed(1)}h</span></div>`;
  if (canViewMoney && totalUsd != null) {
    html += `<div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 4px;"><span>Total Value:</span><span style="font-family: monospace;">${formatUSD(totalUsd)}${totalBdt != null ? ` <span style="font-size: 11px; color: #64748b; font-weight: normal;">(${formatBDT(totalBdt)})</span>` : ' <span style="font-size: 11px; color: #64748b; font-weight: normal;">(USD Only)</span>'}</span></div>`;
  }
  html += `</div></div>`;

  return { text, html, tsv };
}

/**
 * Copy to user's system clipboard using navigator.clipboard with fallback
 */
export async function copyToClipboard(text: string, html?: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.ClipboardItem && html) {
      const textBlob = new Blob([text], { type: 'text/plain' });
      const htmlBlob = new Blob([html], { type: 'text/html' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': textBlob,
          'text/html': htmlBlob,
        }),
      ]);
      return true;
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn('ClipboardItem write failed, trying fallback writeText:', e);
  }

  // Fallback using textarea execCommand
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(el);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}

/**
 * Open high-resolution printable PDF window and trigger native browser print dialog
 */
export function printDocumentPDF(title: string, htmlContent: string) {
  const printWindow = window.open('', '_blank', 'width=850,height=950');
  if (!printWindow) {
    alert('Please allow popups to generate and print PDF.');
    return;
  }

  const printHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      padding: 24px;
      margin: 0;
      background: #ffffff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #059669;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .brand span {
      color: #059669;
      font-family: monospace;
      font-size: 16px;
    }
    .doc-type {
      text-align: right;
    }
    .doc-type h1 {
      margin: 0;
      font-size: 20px;
      color: #059669;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-type p {
      margin: 4px 0 0 0;
      font-size: 12px;
      color: #64748b;
      font-family: monospace;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
      background: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .meta-item {
      font-size: 12px;
    }
    .meta-item strong {
      display: block;
      color: #64748b;
      text-transform: uppercase;
      font-size: 10px;
      margin-bottom: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 13px;
    }
    th {
      background: #f1f5f9;
      padding: 10px 12px;
      text-align: left;
      font-weight: 700;
      color: #334155;
      border-bottom: 2px solid #cbd5e1;
      text-transform: uppercase;
      font-size: 11px;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .num {
      text-align: right;
      font-family: monospace;
      font-weight: 600;
    }
    .totals-box {
      margin-left: auto;
      width: 280px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 40px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .totals-row.grand {
      border-top: 2px solid #0f172a;
      padding-top: 8px;
      font-size: 15px;
      font-weight: 800;
      color: #059669;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px dashed #cbd5e1;
    }
    .sig-block {
      width: 220px;
      text-align: center;
    }
    .sig-line {
      border-top: 1px solid #0f172a;
      margin-top: 40px;
      padding-top: 4px;
      font-size: 12px;
      color: #475569;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 40px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  ${htmlContent}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
}

/**
 * Build Full HTML Document for Estimate PDF Printing
 */
export function buildEstimatePDFHtml(opts: ExportEstimateOptions): string {
  const { version, packageTitle = 'Scope Package', projectName = 'Project', clientName = 'Client', canViewMoney = false } = opts;
  const company = (opts.companyName || getStoredCompanySettings().companyName || 'Company').trim();
  const orgSettings = getStoredCompanySettings();
  const tagline = orgSettings.tagline || 'Enterprise Client Delivery Platform';
  const verNum = version.version_number;
  const totalHrs = ('total_hours_snapshot' in version ? version.total_hours_snapshot : (version as any).total_hours) || 0;
  const totalUsd = 'total_usd_snapshot' in version ? version.total_usd_snapshot : (version as any).total_usd;
  const totalBdt = 'total_bdt_snapshot' in version ? version.total_bdt_snapshot : (version as any).total_bdt;
  const items = version.items || [];
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `
    <div class="header">
      <div class="brand">
        ${company.toUpperCase()}
        <div style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">
          ${tagline} &bull; Powered by Accelvia WMS
        </div>
      </div>
      <div class="doc-type">
        <h1>Scope Estimate</h1>
        <p>VERSION ${verNum}.0 &bull; ${version.status.toUpperCase()}</p>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <strong>Project Name</strong>
        ${projectName}
      </div>
      <div class="meta-item">
        <strong>Client Company</strong>
        ${clientName}
      </div>
      <div class="meta-item">
        <strong>Scope Package</strong>
        ${packageTitle}
      </div>
      <div class="meta-item">
        <strong>Date Generated</strong>
        ${dateStr}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Deliverable Scope Item</th>
          <th class="num" style="width: 120px;">Estimated Hours</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((it, idx) => `
          <tr>
            <td style="color: #64748b;">${idx + 1}</td>
            <td style="font-weight: 500;">${it.title}</td>
            <td class="num">${Number(it.hours).toFixed(1)} hrs</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals-box">
      <div class="totals-row">
        <span>Deliverable Tasks:</span>
        <span style="font-family: monospace;">${items.length} items</span>
      </div>
      <div class="totals-row grand">
        <span>Total Hours:</span>
        <span style="font-family: monospace;">${totalHrs.toFixed(1)} hrs</span>
      </div>
      ${canViewMoney && totalUsd != null ? `
        <div class="totals-row" style="margin-top: 6px; font-weight: 700;">
          <span>Commercial Value:</span>
          <span style="font-family: monospace;">${formatUSD(totalUsd)}</span>
        </div>
        <div class="totals-row" style="font-size: 11px; color: #64748b;">
          <span>Local Currency:</span>
          <span style="font-family: monospace;">${formatBDT(totalBdt || 0)}</span>
        </div>
      ` : ''}
    </div>

    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line">Prepared by (Management)</div>
      </div>
      <div class="sig-block">
        <div class="sig-line">Accepted & Approved (Client)</div>
      </div>
    </div>

    <div class="footer">
      Generated automatically by ${company} via Accelvia Work Management System &bull; Confidential Client Specification
    </div>
  `;
}

/**
 * Build Full HTML Document for Work Order PDF Printing
 */
export function buildWorkOrderPDFHtml(opts: ExportWorkOrderOptions): string {
  const { workOrder, projectName = 'Project', clientName = 'Client', canViewMoney = false } = opts;
  const company = (opts.companyName || getStoredCompanySettings().companyName || 'Company').trim();
  const orgSettings = getStoredCompanySettings();
  const tagline = orgSettings.tagline || 'Enterprise Client Delivery Platform';
  const woNum = workOrder.work_order_number;
  const pkgTitle = ('package_title' in workOrder ? workOrder.package_title : 'Work Order Scope') || 'Work Order Scope';
  const hours = workOrder.hours_snapshot || 0;
  const totalUsd = workOrder.total_usd_snapshot;
  const totalBdt = workOrder.total_bdt_snapshot;
  const authorizedBy = ('authorized_by' in workOrder ? workOrder.authorized_by : 'Management') || 'Management';
  const genDate = ('generated_at' in workOrder && workOrder.generated_at ? new Date(workOrder.generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  const items = ('items' in workOrder && workOrder.items ? workOrder.items : []);

  return `
    <div class="header">
      <div class="brand">
        ${company.toUpperCase()}
        <div style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">
          ${tagline} &bull; Powered by Accelvia WMS
        </div>
      </div>
      <div class="doc-type">
        <h1 style="color: #2563eb;">Authorized Work Order</h1>
        <p>${woNum} &bull; ${workOrder.status.toUpperCase()}</p>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <strong>Work Order No.</strong>
        <span style="font-family: monospace; font-weight: 700; color: #2563eb;">${woNum}</span>
      </div>
      <div class="meta-item">
        <strong>Client Company</strong>
        ${clientName}
      </div>
      <div class="meta-item">
        <strong>Project Name</strong>
        ${projectName}
      </div>
      <div class="meta-item">
        <strong>Authorized By & Date</strong>
        ${authorizedBy} &bull; ${genDate}
      </div>
    </div>

    ${items.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th>Authorized Scope Deliverable</th>
            <th class="num" style="width: 120px;">Hours</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it, idx) => `
            <tr>
              <td style="color: #64748b;">${idx + 1}</td>
              <td style="font-weight: 500;">${it.title}</td>
              <td class="num">${Number(it.hours).toFixed(1)} hrs</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    <div class="totals-box">
      <div class="totals-row grand" style="border-top-color: #2563eb; color: #2563eb;">
        <span>Total Hours:</span>
        <span style="font-family: monospace;">${hours.toFixed(1)} hrs</span>
      </div>
      ${canViewMoney && totalUsd != null ? `
        <div class="totals-row" style="margin-top: 6px; font-weight: 700;">
          <span>Contract Value:</span>
          <span style="font-family: monospace;">${formatUSD(totalUsd)}${totalBdt == null ? ' (USD Only)' : ''}</span>
        </div>
        ${totalBdt != null ? `
        <div class="totals-row" style="font-size: 11px; color: #64748b;">
          <span>Local Currency:</span>
          <span style="font-family: monospace;">${formatBDT(totalBdt)}</span>
        </div>
        ` : ''}
      ` : ''}
    </div>

    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line">Executive Authorization</div>
      </div>
      <div class="sig-block">
        <div class="sig-line">Client Acceptance</div>
      </div>
    </div>

    <div class="footer">
      Official Delivery Document &bull; Generated by ${company} via Accelvia Work Management System
    </div>
  `;
}
