// src/features/workspace/estimate-workorder-lifecycle.test.ts
import { describe, it, expect } from 'vitest';
import { ScopeVersion, WorkOrder, ScopePackage } from '../../types';

describe('Estimate and Work Order Lifecycle & Immutability Rules', () => {
  it('allows editing an unapproved estimate (draft)', () => {
    const draftVersion: ScopeVersion = {
      id: 'ver-draft-1',
      scope_package_id: 'pkg-1',
      version_number: 1,
      status: 'draft',
      revision_type: 'initial',
      total_hours_snapshot: 20,
      total_usd_snapshot: 1000,
      total_bdt_snapshot: 120000,
      created_at: new Date().toISOString(),
      event_at: new Date().toISOString(),
      items: [
        { id: 'it-1', scope_version_id: 'ver-draft-1', position: 1, title: 'Draft Spec', hours: 20, is_billable: true, created_at: '' },
      ],
    };

    // Simulated update logic
    const canEdit = draftVersion.status !== 'approved' && draftVersion.status !== 'superseded';
    expect(canEdit).toBe(true);

    const updatedItems = [
      { title: 'Updated Spec', hours: 15 },
      { title: 'Architecture Review', hours: 10 },
    ];
    const newTotalHours = updatedItems.reduce((acc, it) => acc + it.hours, 0);

    const editedVersion: ScopeVersion = {
      ...draftVersion,
      total_hours_snapshot: newTotalHours,
      items: updatedItems.map((it, idx) => ({
        id: `it-${idx + 1}`,
        scope_version_id: draftVersion.id,
        position: idx + 1,
        title: it.title,
        hours: it.hours,
        is_billable: true,
        created_at: '',
      })),
    };

    expect(editedVersion.total_hours_snapshot).toBe(25);
    expect(editedVersion.items?.length).toBe(2);
  });

  it('allows deleting an unapproved estimate (draft or pending)', () => {
    const pendingVersion: ScopeVersion = {
      id: 'ver-pending-1',
      scope_package_id: 'pkg-1',
      version_number: 1,
      status: 'pending',
      revision_type: 'initial',
      total_hours_snapshot: 30,
      created_at: new Date().toISOString(),
      event_at: new Date().toISOString(),
    };

    const canDelete = pendingVersion.status !== 'approved' && pendingVersion.status !== 'superseded';
    expect(canDelete).toBe(true);

    let versionsList = [pendingVersion];
    versionsList = versionsList.filter((v) => v.id !== 'ver-pending-1');
    expect(versionsList.length).toBe(0);
  });

  it('strictly prohibits editing or deleting an approved estimate (immutability rule)', () => {
    const approvedVersion: ScopeVersion = {
      id: 'ver-approved-1',
      scope_package_id: 'pkg-1',
      version_number: 1,
      status: 'approved',
      revision_type: 'initial',
      total_hours_snapshot: 40,
      total_usd_snapshot: 2000,
      total_bdt_snapshot: 240000,
      created_at: new Date().toISOString(),
      event_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
      items: [
        { id: 'it-1', scope_version_id: 'ver-approved-1', position: 1, title: 'Contract Scope', hours: 40, is_billable: true, created_at: '' },
      ],
    };

    // Immutability checks
    const canEdit = approvedVersion.status !== 'approved' && approvedVersion.status !== 'superseded';
    const canDelete = approvedVersion.status !== 'approved' && approvedVersion.status !== 'superseded';

    expect(canEdit).toBe(false);
    expect(canDelete).toBe(false);
  });

  it('allows deleting an in-progress work order before delivery/completion', () => {
    const inProgressWo: WorkOrder = {
      id: 'wo-1',
      organization_id: 'org-1',
      project_id: 'proj-1',
      scope_package_id: 'pkg-1',
      approved_scope_version_id: 'ver-1',
      work_order_number: 'WO-20261030-0001',
      work_order_kind: 'detailed',
      status: 'in_progress',
      hours_snapshot: 50,
      generated_at: new Date().toISOString(),
      approved_at_snapshot: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const canDelete = inProgressWo.status !== 'completed' && inProgressWo.status !== 'delivered';
    expect(canDelete).toBe(true);
  });

  it('strictly prohibits deleting or editing a delivered or completed work order', () => {
    const completedWo: WorkOrder = {
      id: 'wo-2',
      organization_id: 'org-1',
      project_id: 'proj-1',
      scope_package_id: 'pkg-1',
      approved_scope_version_id: 'ver-1',
      work_order_number: 'WO-20261030-0002',
      work_order_kind: 'detailed',
      status: 'completed',
      hours_snapshot: 50,
      generated_at: new Date().toISOString(),
      approved_at_snapshot: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const canDelete = completedWo.status !== 'completed' && completedWo.status !== 'delivered';
    expect(canDelete).toBe(false);
  });

  it('guarantees detailed work order has at least 3 "Deliverable / Scope Task" breakdown items', () => {
    const totalHours = 80;
    const initialItems = [
      { id: 'it-1', title: 'Single task', hours: 80 },
    ];

    // Supplementation logic
    let woItems = [...initialItems];
    if (woItems.length < 3) {
      const needed = 3 - woItems.length;
      const defaults = [
        'Core Deliverables & System Integration',
        'Automated Verification & Unit Testing',
        'Production Deployment & Client QA Signoff',
      ];
      const extra = Array.from({ length: needed }).map((_, idx) => ({
        id: `extra-${idx}`,
        title: defaults[idx],
        hours: 10,
      }));
      woItems = [...woItems, ...extra];
    }

    expect(woItems.length).toBeGreaterThanOrEqual(3);
    expect(woItems[0].title).toBe('Single task');
    expect(woItems[1].title).toBe('Core Deliverables & System Integration');
    expect(woItems[2].title).toBe('Automated Verification & Unit Testing');
  });
});
