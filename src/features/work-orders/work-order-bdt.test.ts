// src/features/work-orders/work-order-bdt.test.ts
// Unit tests for Work Order generation with BDT and without BDT options

import { describe, it, expect } from 'vitest';
import { WorkOrder } from '../../types';
import { generateWorkOrderText, buildWorkOrderPDFHtml } from '../../lib/export/documentExporter';

describe('Work Order Generation: With BDT vs Without BDT', () => {
  const baseWorkOrder: WorkOrder = {
    id: 'wo-101',
    organization_id: 'org-1',
    project_id: 'proj-1',
    scope_package_id: 'pkg-1',
    approved_scope_version_id: 'ver-1',
    work_order_number: 'WO-20261030-0001',
    work_order_kind: 'detailed',
    status: 'approved',
    hours_snapshot: 20,
    total_usd_snapshot: 1000,
    total_bdt_snapshot: 120000, // with BDT
    generated_at: '2026-11-05T00:00:00.000Z',
    approved_at_snapshot: '2026-11-05T00:00:00.000Z',
    created_at: '2026-11-05T00:00:00.000Z',
    updated_at: '2026-11-05T00:00:00.000Z',
  };

  it('exports with both USD and BDT when total_bdt_snapshot is present', () => {
    const exported = generateWorkOrderText({
      workOrder: baseWorkOrder,
      projectName: 'Test Project',
      clientName: 'Test Client',
      canViewMoney: true,
    });
    
    // Plain text includes BDT
    expect(exported.text).toContain('$1,000.00 (৳120,000.00)');
    
    // TSV includes BDT
    expect(exported.tsv).toContain('Total Value USD\t1000');
    expect(exported.tsv).toContain('Total Value BDT\t120000');
    
    // HTML includes BDT
    expect(exported.html).toContain('৳120,000.00');

    // PDF HTML includes local currency BDT
    const pdfHtml = buildWorkOrderPDFHtml({
      workOrder: baseWorkOrder,
      projectName: 'Test Project',
      clientName: 'Test Client',
      canViewMoney: true,
    });
    expect(pdfHtml).toContain('Local Currency:');
    expect(pdfHtml).toContain('৳120,000.00');
  });

  it('exports with USD Only when created without BDT (total_bdt_snapshot is null)', () => {
    const woWithoutBdt: WorkOrder = {
      ...baseWorkOrder,
      total_bdt_snapshot: null, // without BDT
    };

    const exported = generateWorkOrderText({
      workOrder: woWithoutBdt,
      projectName: 'Test Project',
      clientName: 'Test Client',
      canViewMoney: true,
    });

    // Plain text specifies (USD Only) and does NOT contain BDT symbol or amount
    expect(exported.text).toContain('$1,000.00 (USD Only)');
    expect(exported.text).not.toContain('৳');

    // TSV contains USD only
    expect(exported.tsv).toContain('Total Value USD\t1000');
    expect(exported.tsv).not.toContain('Total Value BDT');

    // HTML specifies (USD Only)
    expect(exported.html).toContain('(USD Only)');
    expect(exported.html).not.toContain('৳');

    // PDF HTML omits local currency row
    const pdfHtml = buildWorkOrderPDFHtml({
      workOrder: woWithoutBdt,
      projectName: 'Test Project',
      clientName: 'Test Client',
      canViewMoney: true,
    });
    expect(pdfHtml).toContain('$1,000.00 (USD Only)');
    expect(pdfHtml).not.toContain('Local Currency:');
  });
});
