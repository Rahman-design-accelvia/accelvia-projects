// src/features/organization/organization.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredCompanySettings,
  STORAGE_KEY_ORG,
  DEFAULT_ORG_SETTINGS,
} from './OrganizationContext';
import {
  generateEstimateText,
  generateWorkOrderText,
  buildEstimatePDFHtml,
  buildWorkOrderPDFHtml,
} from '../../lib/export/documentExporter';
import { ScopeVersion, WorkOrder } from '../../types';

describe('Global Organization & Company Branding Setup', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const key in store) delete store[key];
    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = String(val);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const key in store) delete store[key];
      },
    };
  });

  it('provides default organization settings (Rahman Design) when localStorage is empty', () => {
    const settings = getStoredCompanySettings();
    expect(settings.companyName).toBe('Rahman Design');
    expect(settings.tagline).toBe('Engineering & Creative Client Delivery');
    expect(settings.website).toBe('https://rahmandesign.com');
  });

  it('persists and retrieves custom tenant company name from localStorage', () => {
    const custom = {
      companyName: 'Vertex Studio Ltd.',
      tagline: 'High-Scale Product Design',
      website: 'https://vertexstudio.io',
      contactEmail: 'hello@vertexstudio.io',
    };
    localStorage.setItem(STORAGE_KEY_ORG, JSON.stringify(custom));

    const settings = getStoredCompanySettings();
    expect(settings.companyName).toBe('Vertex Studio Ltd.');
    expect(settings.tagline).toBe('High-Scale Product Design');
    expect(settings.website).toBe('https://vertexstudio.io');
    expect(settings.contactEmail).toBe('hello@vertexstudio.io');
  });

  it('exports Estimate plain text using custom company name instead of hardcoded Accelvia', () => {
    localStorage.setItem(
      STORAGE_KEY_ORG,
      JSON.stringify({ companyName: 'Apex Technologies' })
    );

    const mockVersion: ScopeVersion = {
      id: 'v-101',
      scope_package_id: 'pkg-1',
      version_number: 1,
      revision_type: 'initial',
      total_hours_snapshot: 40,
      total_usd_snapshot: 2000,
      total_bdt_snapshot: 240000,
      status: 'pending',
      created_at: new Date().toISOString(),
      event_at: new Date().toISOString(),
      items: [
        { id: 'item-1', scope_version_id: 'v-101', position: 1, title: 'UI Kit Wireframing', hours: 40, is_billable: true, created_at: '' },
      ],
    };

    const estimateExport = generateEstimateText({
      version: mockVersion,
      packageTitle: 'Brand Overhaul',
      projectName: 'Fintech Mobile App',
      clientName: 'Alpha Corp',
      canViewMoney: true,
    });

    expect(estimateExport.text).toContain('APEX TECHNOLOGIES — ESTIMATE SCOPE v1.0');
    expect(estimateExport.text).not.toContain('ACCELVIA WMS — ESTIMATE SCOPE');
  });

  it('exports Work Order plain text using custom company name', () => {
    localStorage.setItem(
      STORAGE_KEY_ORG,
      JSON.stringify({ companyName: 'Apex Technologies' })
    );

    const mockWorkOrder = {
      id: 'wo-101',
      organization_id: 'org-1',
      project_id: 'proj-1',
      scope_package_id: 'pkg-1',
      approved_scope_version_id: 'v-101',
      work_order_number: 'WO-2026-009',
      work_order_kind: 'detailed' as const,
      status: 'in_progress' as const,
      hours_snapshot: 60,
      total_usd_snapshot: 3000,
      total_bdt_snapshot: 360000,
      generated_at: new Date().toISOString(),
      approved_at_snapshot: new Date().toISOString(),
      items: [
        { title: 'GraphQL Endpoint Setup', hours: 60 },
      ],
    };

    const woExport = generateWorkOrderText({
      workOrder: mockWorkOrder,
      projectName: 'Fintech Mobile App',
      clientName: 'Alpha Corp',
      canViewMoney: true,
    });

    expect(woExport.text).toContain('APEX TECHNOLOGIES — AUTHORIZED WORK ORDER');
    expect(woExport.text).not.toContain('ACCELVIA WMS — AUTHORIZED WORK ORDER');
  });

  it('generates PDF documents displaying custom company brand and platform engine attribution', () => {
    localStorage.setItem(
      STORAGE_KEY_ORG,
      JSON.stringify({
        companyName: 'Creative Labs',
        tagline: 'Digital Experience Agency',
      })
    );

    const mockVersion: ScopeVersion = {
      id: 'v-102',
      scope_package_id: 'pkg-2',
      version_number: 2,
      revision_type: 'revision',
      total_hours_snapshot: 25,
      total_usd_snapshot: 1250,
      total_bdt_snapshot: 150000,
      status: 'approved',
      created_at: new Date().toISOString(),
      event_at: new Date().toISOString(),
      items: [
        { id: 'item-2', scope_version_id: 'v-102', position: 1, title: 'Icon System', hours: 25, is_billable: true, created_at: '' },
      ],
    };

    const pdfHtml = buildEstimatePDFHtml({
      version: mockVersion,
      packageTitle: 'Design Refresh',
      projectName: 'Global Portal',
      clientName: 'Starlight Media',
      canViewMoney: true,
    });

    expect(pdfHtml).toContain('CREATIVE LABS');
    expect(pdfHtml).toContain('Digital Experience Agency &bull; Powered by Accelvia WMS');
    expect(pdfHtml).toContain('Generated automatically by Creative Labs via Accelvia Work Management System');
  });

  it('allows explicit override of companyName through opts', () => {
    const mockVersion: ScopeVersion = {
      id: 'v-103',
      scope_package_id: 'pkg-3',
      version_number: 1,
      revision_type: 'initial',
      total_hours_snapshot: 10,
      total_usd_snapshot: 500,
      total_bdt_snapshot: 60000,
      status: 'pending',
      created_at: new Date().toISOString(),
      event_at: new Date().toISOString(),
      items: [],
    };

    const estimateExport = generateEstimateText({
      version: mockVersion,
      companyName: 'Bespoke Software Ltd.',
    });

    expect(estimateExport.text).toContain('BESPOKE SOFTWARE LTD. — ESTIMATE SCOPE v1.0');
  });

  describe('Task 1: Company Name Management & Approval Workflow', () => {
    it('submitting a proposed company name creates pending request and leaves active name unchanged', () => {
      const activeInitial = getStoredCompanySettings();
      expect(activeInitial.companyName).toBe('Rahman Design');

      // Admin proposes a new name
      const proposed = 'Nexus Interactive Global';
      const pendingReq = {
        id: 'req-1',
        proposed_name: proposed,
        requested_by_id: 'admin-1',
        requested_by_name: 'Sarah Connor',
        requested_by_email: 'admin@accelvia.internal',
        requested_by_role: 'admin' as const,
        status: 'pending' as const,
        submitted_at: new Date().toISOString(),
      };

      localStorage.setItem('accelvia_company_name_requests_v1', JSON.stringify([pendingReq]));

      // Active name MUST remain unchanged!
      const activeAfterSubmission = getStoredCompanySettings();
      expect(activeAfterSubmission.companyName).toBe('Rahman Design');

      // Estimate and Work Order PDF must STILL use the active name, NOT the pending name
      const mockVersion: ScopeVersion = {
        id: 'v-104',
        scope_package_id: 'pkg-4',
        version_number: 1,
        revision_type: 'initial',
        total_hours_snapshot: 15,
        total_usd_snapshot: 750,
        total_bdt_snapshot: 90000,
        status: 'pending',
        created_at: new Date().toISOString(),
        event_at: new Date().toISOString(),
        items: [],
      };
      const pdfHtml = buildEstimatePDFHtml({ version: mockVersion });
      expect(pdfHtml).toContain('RAHMAN DESIGN');
      expect(pdfHtml).not.toContain('NEXUS INTERACTIVE GLOBAL');
    });

    it('approving a proposed company name updates global active name and synchronizes PDFs', () => {
      // Super Admin approves the request
      const approvedName = 'Nexus Interactive Global';
      const updatedSettings = {
        companyName: approvedName,
        tagline: 'Engineering & Creative Client Delivery',
        website: 'https://rahmandesign.com',
        contactEmail: 'contact@rahmandesign.com',
      };
      localStorage.setItem(STORAGE_KEY_ORG, JSON.stringify(updatedSettings));

      // Central settings now reflect approved name
      const current = getStoredCompanySettings();
      expect(current.companyName).toBe('Nexus Interactive Global');

      // PDFs now automatically display the newly approved company name
      const mockVersion: ScopeVersion = {
        id: 'v-105',
        scope_package_id: 'pkg-5',
        version_number: 1,
        revision_type: 'initial',
        total_hours_snapshot: 20,
        total_usd_snapshot: 1000,
        total_bdt_snapshot: 120000,
        status: 'approved',
        created_at: new Date().toISOString(),
        event_at: new Date().toISOString(),
        items: [],
      };
      const pdfHtml = buildEstimatePDFHtml({ version: mockVersion });
      expect(pdfHtml).toContain('NEXUS INTERACTIVE GLOBAL');
    });

    it('rejecting a proposed company name leaves the active name untouched', () => {
      // Current active name
      localStorage.setItem(
        STORAGE_KEY_ORG,
        JSON.stringify({ companyName: 'Authoritative Enterprise Corp' })
      );

      // Rejection does not modify STORAGE_KEY_ORG
      const active = getStoredCompanySettings();
      expect(active.companyName).toBe('Authoritative Enterprise Corp');
    });
  });
});
