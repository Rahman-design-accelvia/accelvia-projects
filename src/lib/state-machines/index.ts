// src/lib/state-machines/index.ts
// State transitions and business calculation engines

import { ScopeVersionStatus, ScopePackage, ScopeVersion, WorkOrderStatus } from '../../types';

/**
 * Valid transitions for Scope Version Status.
 */
export const ALLOWED_SCOPE_TRANSITIONS: Record<ScopeVersionStatus, ScopeVersionStatus[]> = {
  draft: ['pending', 'void'],
  pending: ['approved', 'rejected', 'revision_requested'],
  revision_requested: [], // Historical; creates a new draft version instead
  approved: ['superseded'], // Only when a newer approved version replaces it
  rejected: [],
  superseded: [],
  void: [],
};

export function canTransitionScopeStatus(
  current: ScopeVersionStatus,
  target: ScopeVersionStatus
): boolean {
  const allowed = ALLOWED_SCOPE_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

/**
 * Valid transitions for Work Order Status.
 */
export const ALLOWED_WORK_ORDER_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  approved: ['in_progress', 'cancelled'],
  in_progress: ['delivered', 'cancelled'],
  delivered: ['completed', 'in_progress'],
  completed: [],
  cancelled: [],
};

export function canTransitionWorkOrderStatus(
  current: WorkOrderStatus,
  target: WorkOrderStatus
): boolean {
  const allowed = ALLOWED_WORK_ORDER_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

/**
 * Calculates the authoritative Approved Scope Hours for a project across all its packages.
 *
 * Rules:
 * 1. For each scope package, counts only the SINGLE currently active approved version.
 * 2. Pending, draft, rejected, superseded, and void versions contribute ZERO hours.
 * 3. Additional scope packages contribute hours ONLY after they have an approved version.
 * 4. Revisions do not double-count.
 */
export function calculateProjectApprovedHours(
  packages: Array<ScopePackage & { versions?: ScopeVersion[] }>
): number {
  let totalApprovedHours = 0;

  for (const pkg of packages) {
    if (!pkg.versions || pkg.versions.length === 0) continue;

    // Find the active approved version for this package (latest version number that is approved)
    const approvedVersions = pkg.versions
      .filter((v) => v.status === 'approved')
      .sort((a, b) => b.version_number - a.version_number);

    if (approvedVersions.length > 0) {
      const activeApproved = approvedVersions[0];
      totalApprovedHours += Number(activeApproved.total_hours_snapshot) || 0;
    }
  }

  return Math.round((totalApprovedHours + Number.EPSILON) * 100) / 100;
}
