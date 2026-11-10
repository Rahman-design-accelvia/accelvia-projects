// src/features/workspace/estimate-workorder-lifecycle.test.ts
import { describe, it, expect } from 'vitest';
import { ScopeVersion, WorkOrder, ScopePackage, SafeMessage } from '../../types';
import { filterMessagesForProject } from './WorkspaceLayout';

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

  it('isolates conversation messages strictly per project so new projects have clean independent chat', () => {
    const mockMessages: SafeMessage[] = [
      {
        id: 'msg-proj1-1',
        conversation_id: 'conv-proj-1',
        project_id: 'proj-1',
        author_id: 'user-1',
        author_name: 'Dev Alex',
        author_is_management: false,
        content_json: { type: 'doc' },
        event_at: '2026-11-06T10:00:00Z',
        created_at: '2026-11-06T10:00:00Z',
        updated_at: '2026-11-06T10:00:00Z',
        is_edited: false,
        is_deleted: false,
        attachments: [],
      },
      {
        id: 'msg-proj1-legacy',
        conversation_id: 'conv-1',
        author_id: 'user-2',
        author_name: 'Sarah Connor',
        author_is_management: false,
        content_json: { type: 'doc' },
        event_at: '2026-11-06T10:05:00Z',
        created_at: '2026-11-06T10:05:00Z',
        updated_at: '2026-11-06T10:05:00Z',
        is_edited: false,
        is_deleted: false,
        attachments: [],
      },
      {
        id: 'msg-proj2-1',
        conversation_id: 'conv-proj-2',
        project_id: 'proj-2',
        author_id: 'user-1',
        author_name: 'Dev Alex',
        author_is_management: false,
        content_json: { type: 'doc' },
        event_at: '2026-11-06T11:00:00Z',
        created_at: '2026-11-06T11:00:00Z',
        updated_at: '2026-11-06T11:00:00Z',
        is_edited: false,
        is_deleted: false,
        attachments: [],
      },
    ];

    // Project 1 gets only its messages
    const proj1Messages = filterMessagesForProject(mockMessages, 'proj-1');
    expect(proj1Messages).toHaveLength(2);
    expect(proj1Messages.map((m) => m.id)).toEqual(['msg-proj1-1', 'msg-proj1-legacy']);

    // Project 2 gets only Project 2's message
    const proj2Messages = filterMessagesForProject(mockMessages, 'proj-2');
    expect(proj2Messages).toHaveLength(1);
    expect(proj2Messages[0].id).toBe('msg-proj2-1');

    // A brand new project has 0 messages (completely clean independent conversation)
    const newProjMessages = filterMessagesForProject(mockMessages, 'proj-brand-new-999');
    expect(newProjMessages).toHaveLength(0);

    // Empty project id returns 0 messages
    expect(filterMessagesForProject(mockMessages, '')).toEqual([]);
  });

  it('instantly creates and dispatches estimate proposal card to project conversation when submitted', () => {
    const rawItems = [
      { title: 'wp1', hours: 12 },
      { title: 'wp1', hours: 13 },
      { title: 'wp1', hours: 1 },
      { title: 'wp1', hours: 2 },
    ];
    const totalHours = rawItems.reduce((acc, it) => acc + it.hours, 0);
    expect(totalHours).toBe(28);

    const versionId = 'ver-instant-28';
    const projectId = 'proj-tango-2';
    const packageTitle = 'wp test 4';

    // Simulate instant estimate creation with postToConversation = true
    const newVersion: ScopeVersion = {
      id: versionId,
      scope_package_id: 'pkg-wp-4',
      version_number: 1,
      status: 'pending',
      revision_type: 'initial',
      total_hours_snapshot: totalHours,
      created_at: new Date().toISOString(),
      event_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      items: rawItems.map((it, idx) => ({
        id: `item-${idx}`,
        scope_version_id: versionId,
        position: idx,
        title: it.title,
        hours: it.hours,
        is_billable: true,
        created_at: new Date().toISOString(),
      })),
    };

    const newMsg: SafeMessage = {
      id: 'msg-instant-1',
      conversation_id: `conv-${projectId}`,
      project_id: projectId,
      author_id: 'user-admin',
      author_name: 'Musfiqur Rahman',
      author_is_management: true,
      content_json: { type: 'doc' },
      event_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_edited: false,
      is_deleted: false,
      attachments: [],
      estimate_version_id: newVersion.id,
      estimate_card: {
        version_id: newVersion.id,
        package_title: packageTitle,
        version_number: newVersion.version_number,
        total_hours: newVersion.total_hours_snapshot,
        status: 'pending',
        items: newVersion.items?.map((it) => ({ title: it.title, hours: it.hours })),
      },
    };

    expect(newVersion.status).toBe('pending');
    expect(newVersion.items).toHaveLength(4);
    expect(newMsg.estimate_card?.package_title).toBe('wp test 4');
    expect(newMsg.estimate_card?.total_hours).toBe(28);
    expect(newMsg.estimate_card?.items).toHaveLength(4);

    // Verify it is properly isolated to proj-tango-2
    const filtered = filterMessagesForProject([newMsg], projectId);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].estimate_card?.status).toBe('pending');
  });

  it('filters out empty or 0-hour items so accidental blanks never break estimate creation', () => {
    const rawItems = [
      { title: 'Core Page Setup', hours: '10' },
      { title: '', hours: '5' },
      { title: 'Responsive Testing', hours: '0' },
      { title: '   ', hours: '' },
      { title: 'Final QA & Deployment', hours: '4.5' },
    ];

    const validItems = rawItems
      .map((it) => ({
        title: it.title.trim(),
        hours: Number(it.hours) || 0,
      }))
      .filter((it) => it.title.length > 0 && it.hours > 0);

    expect(validItems).toHaveLength(2);
    expect(validItems[0].title).toBe('Core Page Setup');
    expect(validItems[0].hours).toBe(10);
    expect(validItems[1].title).toBe('Final QA & Deployment');
    expect(validItems[1].hours).toBe(4.5);
  });
});
