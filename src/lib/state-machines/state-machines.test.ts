// src/lib/state-machines/state-machines.test.ts
import { describe, it, expect } from 'vitest';
import {
  canTransitionScopeStatus,
  canTransitionWorkOrderStatus,
  calculateProjectApprovedHours,
} from './index';
import { ScopePackage, ScopeVersion } from '../../types';

describe('State Machine & Approved Hours Engine', () => {
  it('enforces valid scope version transitions', () => {
    // Draft -> Pending: OK
    expect(canTransitionScopeStatus('draft', 'pending')).toBe(true);
    // Draft -> Approved directly: BLOCKED (must be sent to client first)
    expect(canTransitionScopeStatus('draft', 'approved')).toBe(false);

    // Pending -> Approved/Rejected/Revision Requested: OK
    expect(canTransitionScopeStatus('pending', 'approved')).toBe(true);
    expect(canTransitionScopeStatus('pending', 'rejected')).toBe(true);
    expect(canTransitionScopeStatus('pending', 'revision_requested')).toBe(true);

    // Approved -> Superseded: OK
    expect(canTransitionScopeStatus('approved', 'superseded')).toBe(true);
    // Approved -> Draft: BLOCKED (cannot silently edit approved version)
    expect(canTransitionScopeStatus('approved', 'draft')).toBe(false);
  });

  it('enforces valid work order transitions', () => {
    expect(canTransitionWorkOrderStatus('approved', 'in_progress')).toBe(true);
    expect(canTransitionWorkOrderStatus('in_progress', 'delivered')).toBe(true);
    expect(canTransitionWorkOrderStatus('delivered', 'completed')).toBe(true);
    // Cannot jump from approved directly to completed
    expect(canTransitionWorkOrderStatus('approved', 'completed')).toBe(false);
  });

  it('calculates project approved hours without double-counting revisions', () => {
    // Package 1 (Initial Scope):
    // Version 1 (Approved, 40 hrs) -> superseded by Version 2 (Approved, 50 hrs)
    // Version 3 (Pending revision, 60 hrs) -> not approved yet!
    const pkg1: ScopePackage & { versions: ScopeVersion[] } = {
      id: 'pkg-1',
      organization_id: 'org-1',
      project_id: 'proj-1',
      package_kind: 'initial',
      title: 'Initial Build',
      created_at: new Date().toISOString(),
      versions: [
        {
          id: 'v1',
          scope_package_id: 'pkg-1',
          version_number: 1,
          status: 'superseded',
          revision_type: 'initial',
          total_hours_snapshot: 40,
          created_at: new Date().toISOString(),
          event_at: new Date().toISOString(),
        },
        {
          id: 'v2',
          scope_package_id: 'pkg-1',
          version_number: 2,
          status: 'approved',
          revision_type: 'replacement',
          total_hours_snapshot: 50,
          created_at: new Date().toISOString(),
          event_at: new Date().toISOString(),
        },
        {
          id: 'v3',
          scope_package_id: 'pkg-1',
          version_number: 3,
          status: 'pending',
          revision_type: 'replacement',
          total_hours_snapshot: 60,
          created_at: new Date().toISOString(),
          event_at: new Date().toISOString(),
        },
      ],
    };

    // Package 2 (Additional Scope):
    // Version 1 (Draft, 25 hrs) -> not approved!
    const pkg2: ScopePackage & { versions: ScopeVersion[] } = {
      id: 'pkg-2',
      organization_id: 'org-1',
      project_id: 'proj-1',
      package_kind: 'additional',
      title: 'Additional Integration',
      created_at: new Date().toISOString(),
      versions: [
        {
          id: 'v2-1',
          scope_package_id: 'pkg-2',
          version_number: 1,
          status: 'draft',
          revision_type: 'initial',
          total_hours_snapshot: 25,
          created_at: new Date().toISOString(),
          event_at: new Date().toISOString(),
        },
      ],
    };

    // Only v2 from pkg1 should count (50 hrs).
    // v1 is superseded. v3 is pending. pkg2 is draft.
    const approvedHours = calculateProjectApprovedHours([pkg1, pkg2]);
    expect(approvedHours).toBe(50.00);

    // Now approve pkg2
    pkg2.versions[0].status = 'approved';
    const approvedHoursWithPkg2 = calculateProjectApprovedHours([pkg1, pkg2]);
    expect(approvedHoursWithPkg2).toBe(75.00); // 50 + 25
  });
});
