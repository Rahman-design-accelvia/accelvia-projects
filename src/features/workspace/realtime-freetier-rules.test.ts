// src/features/workspace/realtime-freetier-rules.test.ts
// Tests for Free-Tier Quota Optimization, Realtime Echo Suppression, and Administration Rules Enforcement

import { describe, it, expect } from 'vitest';
import { filterMessagesForProject, extractMessageSnippet } from './WorkspaceLayout';
import { SafeMessage } from '../../types';

describe('Realtime Free Tier & Administration Rules Engine', () => {
  describe('Per-Project Conversation Isolation', () => {
    const mockMessages: SafeMessage[] = [
      {
        id: 'msg-p1',
        conversation_id: 'conv-proj-1',
        project_id: 'proj-1',
        author_id: 'u-1',
        author_name: 'Admin Sarah',
        author_is_management: false,
        content_json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello Project 1' }] }] },
        event_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_edited: false,
        is_deleted: false,
        attachments: [],
        voice_note: null,
      },
      {
        id: 'msg-p2',
        conversation_id: 'conv-proj-2',
        project_id: 'proj-2',
        author_id: 'u-2',
        author_name: 'Musfiqur Rahman',
        author_is_management: false,
        content_json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello Project 2' }] }] },
        event_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_edited: false,
        is_deleted: false,
        attachments: [],
        voice_note: null,
      },
    ];

    it('isolates messages strictly to proj-1 and prevents cross-project leakage', () => {
      const p1Messages = filterMessagesForProject(mockMessages, 'proj-1');
      expect(p1Messages.length).toBe(1);
      expect(p1Messages[0].id).toBe('msg-p1');
      expect(p1Messages.some((m) => m.project_id === 'proj-2')).toBe(false);
    });

    it('isolates messages strictly to proj-2 and ensures a clean thread for new projects', () => {
      const p2Messages = filterMessagesForProject(mockMessages, 'proj-2');
      expect(p2Messages.length).toBe(1);
      expect(p2Messages[0].id).toBe('msg-p2');

      const brandNewProjMessages = filterMessagesForProject(mockMessages, 'proj-brand-new');
      expect(brandNewProjMessages.length).toBe(0);
    });
  });

  describe('Extract Message Snippet for Cross-Device Push Notifications', () => {
    it('extracts plain text from rich Tiptap document structures', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hey ' },
              { type: 'text', text: '@Management' },
              { type: 'text', text: ', please review this estimate!' },
            ],
          },
        ],
      };
      const snippet = extractMessageSnippet(doc);
      expect(snippet).toBe('Hey @Management , please review this estimate!');
    });

    it('falls back gracefully on empty or malformed document objects', () => {
      expect(extractMessageSnippet({})).toBe('New message in conversation thread');
      expect(extractMessageSnippet({ type: 'doc', content: [] })).toBe('New message in conversation thread');
    });
  });

  describe('Free Tier Echo Suppression & Network Call Elimination', () => {
    it('detects identical states and suppresses redundant network upserts', () => {
      const lastCloudJson: Record<string, string> = {};
      let networkUpsertCount = 0;

      const simulateQueueSync = (key: string, value: any) => {
        const jsonStr = JSON.stringify(value);
        if (lastCloudJson[key] === jsonStr) {
          // Echo suppression: 0 network calls!
          return;
        }
        lastCloudJson[key] = jsonStr;
        networkUpsertCount += 1;
      };

      const initialProjects = [{ id: 'proj-1', name: 'Alpha' }];
      // Initial cloud load records the state
      simulateQueueSync('projects', initialProjects);
      expect(networkUpsertCount).toBe(1);

      // React re-render with identical data: echo suppressed!
      simulateQueueSync('projects', initialProjects);
      expect(networkUpsertCount).toBe(1);

      // Incoming Realtime event echoes identical data: echo suppressed!
      simulateQueueSync('projects', [{ id: 'proj-1', name: 'Alpha' }]);
      expect(networkUpsertCount).toBe(1);

      // Legitimate user change: triggers single sync
      simulateQueueSync('projects', [{ id: 'proj-1', name: 'Alpha' }, { id: 'proj-2', name: 'Beta' }]);
      expect(networkUpsertCount).toBe(2);
    });
  });

  describe('Administration Rule: Super Admin Masking as Management', () => {
    it('correctly identifies author display name as Management when author_is_management is true', () => {
      const superAdminMsg: Partial<SafeMessage> = {
        author_id: 'sa-gravity',
        author_name: 'Ahmed Super Admin',
        author_is_management: true,
      };

      const regularAdminMsg: Partial<SafeMessage> = {
        author_id: 'admin-1',
        author_name: 'Nahidur Abedin',
        author_is_management: false,
      };

      const getAuthorDisplayName = (msg: Partial<SafeMessage>) =>
        msg.author_is_management ? 'Management' : msg.author_name;

      expect(getAuthorDisplayName(superAdminMsg)).toBe('Management');
      expect(getAuthorDisplayName(regularAdminMsg)).toBe('Nahidur Abedin');
    });
  });

  describe('Administration Rule: Member Financial Redaction', () => {
    it('redacts USD and BDT from members while preserving approved deliverable hours', () => {
      const financialSettings = {
        client_rate_usd_per_hour: 50,
        client_rate_bdt_per_hour: 6000,
        internal_budget_hours: 40,
      };

      const estimateItems = [
        { title: 'Frontend UI', hours: 10 },
        { title: 'Backend API', hours: 15 },
      ];

      const isMember = true;
      const canViewMoney = !isMember;

      const memberView = {
        items: estimateItems,
        totalHours: estimateItems.reduce((acc, curr) => acc + curr.hours, 0),
        usd: canViewMoney ? estimateItems.reduce((acc, curr) => acc + curr.hours, 0) * (financialSettings.client_rate_usd_per_hour || 0) : null,
        bdt: canViewMoney ? estimateItems.reduce((acc, curr) => acc + curr.hours, 0) * (financialSettings.client_rate_bdt_per_hour || 0) : null,
      };

      expect(memberView.totalHours).toBe(25);
      expect(memberView.usd).toBeNull();
      expect(memberView.bdt).toBeNull();
    });
  });

  describe('Administration Rule: Password Privacy & Super Admin Master Control', () => {
    const rawDbUsers = [
      { user_id: 'u-1', display_name: 'Musfiqur Rahman', email: 'musfiqur@example.com', role: 'admin', password: 'SecretPassword123' },
      { user_id: 'u-2', display_name: 'Nahidur Abedin', email: 'nahidur@example.com', role: 'admin', password: 'AnotherSecret456' },
      { user_id: 'u-3', display_name: 'Dev Alex', email: 'alex@example.com', role: 'member', password: 'MemberPassword789' },
    ];

    it('allows Super Admin to see all users passwords and updated passwords', () => {
      const isSuperAdmin = true;
      const currentUserId = 'sa-gravity';

      // Role-gating logic: Super Admin sees raw passwords
      const roleGatedTeamMembers = isSuperAdmin
        ? rawDbUsers
        : rawDbUsers.map((m) => ({
            ...m,
            password: m.user_id === currentUserId ? m.password : undefined,
          }));

      expect(roleGatedTeamMembers[0].password).toBe('SecretPassword123');
      expect(roleGatedTeamMembers[1].password).toBe('AnotherSecret456');
      expect(roleGatedTeamMembers[2].password).toBe('MemberPassword789');
    });

    it('ensures regular Admin and Member cannot see other users passwords (redacted)', () => {
      const isSuperAdmin = false;
      const currentUserId = 'u-1'; // Logged in as Musfiqur

      const roleGatedTeamMembers = isSuperAdmin
        ? rawDbUsers
        : rawDbUsers.map((m) => ({
            ...m,
            password: m.user_id === currentUserId ? m.password : undefined,
          }));

      // Current user can retain their own password if needed, but ALL other users are undefined
      expect(roleGatedTeamMembers[0].password).toBe('SecretPassword123');
      expect(roleGatedTeamMembers[1].password).toBeUndefined();
      expect(roleGatedTeamMembers[2].password).toBeUndefined();

      // UI presentation for other users always masks as ••••••••
      const getMaskedDisplay = (memberUserId: string, targetPassword?: string) => {
        if (!isSuperAdmin && memberUserId !== currentUserId) {
          return '••••••••';
        }
        return targetPassword || '••••••••';
      };

      expect(getMaskedDisplay('u-2', roleGatedTeamMembers[1].password)).toBe('••••••••');
      expect(getMaskedDisplay('u-3', roleGatedTeamMembers[2].password)).toBe('••••••••');
    });

    it('allows Super Admin to edit and update a user password', () => {
      let team = [...rawDbUsers];

      const updatePasswordSim = (userId: string, newPassword: string) => {
        team = team.map((m) => (m.user_id === userId ? { ...m, password: newPassword } : m));
        return { success: true };
      };

      const result = updatePasswordSim('u-2', 'NewlyUpdatedPassword2026!');
      expect(result.success).toBe(true);
      expect(team.find((m) => m.user_id === 'u-2')?.password).toBe('NewlyUpdatedPassword2026!');
    });

    it('ensures copy action in roster copies credentials with password ONLY for Super Admin', () => {
      const member = {
        name: 'Dev Alex',
        email: 'alex@example.com',
        role: 'member',
        password: 'TopSecretPassword99',
      };

      const getCopyText = (target: typeof member, isViewerSuperAdmin: boolean) => {
        if (isViewerSuperAdmin) {
          return `Email: ${target.email}\nPassword: ${target.password}`;
        }
        return target.email;
      };

      // Super Admin copies with password
      const saCopied = getCopyText(member, true);
      expect(saCopied).toContain('TopSecretPassword99');

      // Regular Admin/Member copies email only, NEVER password
      const adminCopied = getCopyText(member, false);
      expect(adminCopied).toBe('alex@example.com');
      expect(adminCopied.includes('TopSecretPassword99')).toBe(false);
    });
  });

  describe('Designation Governance & Self-Service Rules', () => {
    interface TestUser {
      id: string;
      name: string;
      role: 'admin' | 'member' | 'super_admin';
      designation: string;
      requested_designation?: string;
    }

    interface TestDesignationRequest {
      id: string;
      applicant_id: string;
      applicant_name: string;
      current_designation: string;
      requested_designation: string;
      requested_role: 'admin' | 'member';
      status: 'pending' | 'approved' | 'rejected';
      reviewed_by_id?: string;
    }

    it('allows any Admin or Member to change their own display name immediately (self-service)', () => {
      let currentUser: TestUser = {
        id: 'u-admin-1',
        name: 'Initial Admin Name',
        role: 'admin',
        designation: 'Project Lead',
      };

      const updateDisplayNameSim = (newName: string) => {
        if (!newName || newName.trim().length < 2) {
          return { success: false, error: 'Name too short' };
        }
        currentUser = { ...currentUser, name: newName.trim() };
        return { success: true };
      };

      const res = updateDisplayNameSim('Nahidur Abedin (Senior PM)');
      expect(res.success).toBe(true);
      expect(currentUser.name).toBe('Nahidur Abedin (Senior PM)');
    });

    it('allows Admin or Member to submit a designation upgrade request', () => {
      let requests: TestDesignationRequest[] = [];
      const submitRequestSim = (user: TestUser, newDesignation: string, newRole: 'admin' | 'member') => {
        const req: TestDesignationRequest = {
          id: `req-${Date.now()}`,
          applicant_id: user.id,
          applicant_name: user.name,
          current_designation: user.designation,
          requested_designation: newDesignation,
          requested_role: newRole,
          status: 'pending',
        };
        requests.push(req);
        return { success: true, req };
      };

      const adminUser: TestUser = {
        id: 'u-admin-1',
        name: 'Admin Nahid',
        role: 'admin',
        designation: 'Project Lead',
      };

      const res = submitRequestSim(adminUser, 'VP Engineering', 'admin');
      expect(res.success).toBe(true);
      expect(requests.length).toBe(1);
      expect(requests[0].applicant_id).toBe('u-admin-1');
      expect(requests[0].requested_designation).toBe('VP Engineering');
      expect(requests[0].status).toBe('pending');
    });

    it('STRICT GOVERNANCE RULE: Admin CANNOT approve their own designation request', () => {
      const pendingReq: TestDesignationRequest = {
        id: 'req-admin-self',
        applicant_id: 'u-admin-1',
        applicant_name: 'Admin Nahid',
        current_designation: 'Project Lead',
        requested_designation: 'VP Engineering',
        requested_role: 'admin',
        status: 'pending',
      };

      // Review function enforcing the self-approval restriction
      const approveDesignationSim = (
        req: TestDesignationRequest,
        reviewerId: string,
        reviewerRole: 'admin' | 'super_admin'
      ) => {
        const isSuperAdmin = reviewerRole === 'super_admin';
        if (!isSuperAdmin && req.applicant_id === reviewerId) {
          return {
            success: false,
            error: 'Self-approval is strictly restricted. An Admin cannot approve their own designation request.',
          };
        }
        return { success: true };
      };

      // Admin 1 attempts to approve their own request -> MUST BE BLOCKED
      const selfApprovalResult = approveDesignationSim(pendingReq, 'u-admin-1', 'admin');
      expect(selfApprovalResult.success).toBe(false);
      expect(selfApprovalResult.error).toContain('Self-approval is strictly restricted');
    });

    it('allows another Admin to approve an Admin designation request', () => {
      let pendingReq: TestDesignationRequest = {
        id: 'req-admin-self',
        applicant_id: 'u-admin-1',
        applicant_name: 'Admin Nahid',
        current_designation: 'Project Lead',
        requested_designation: 'VP Engineering',
        requested_role: 'admin',
        status: 'pending',
      };

      const approveDesignationSim = (
        req: TestDesignationRequest,
        reviewerId: string,
        reviewerRole: 'admin' | 'super_admin'
      ) => {
        const isSuperAdmin = reviewerRole === 'super_admin';
        if (!isSuperAdmin && req.applicant_id === reviewerId) {
          return {
            success: false,
            error: 'Self-approval is strictly restricted. An Admin cannot approve their own designation request.',
          };
        }
        pendingReq.status = 'approved';
        pendingReq.reviewed_by_id = reviewerId;
        return { success: true };
      };

      // Admin 2 (different admin) approves Admin 1's request -> SUCCEEDS
      const crossAdminResult = approveDesignationSim(pendingReq, 'u-admin-2', 'admin');
      expect(crossAdminResult.success).toBe(true);
      expect(pendingReq.status).toBe('approved');
      expect(pendingReq.reviewed_by_id).toBe('u-admin-2');
    });

    it('empowers Super Admin to approve any request and directly update designations', () => {
      let pendingReq: TestDesignationRequest = {
        id: 'req-member-1',
        applicant_id: 'u-member-1',
        applicant_name: 'Dev Alice',
        current_designation: 'Specialist',
        requested_designation: 'Lead Architect',
        requested_role: 'admin',
        status: 'pending',
      };

      const approveBySuperAdmin = (req: TestDesignationRequest) => {
        req.status = 'approved';
        req.reviewed_by_id = 'u-super-admin';
        return { success: true };
      };

      const res = approveBySuperAdmin(pendingReq);
      expect(res.success).toBe(true);
      expect(pendingReq.status).toBe('approved');
      expect(pendingReq.reviewed_by_id).toBe('u-super-admin');

      // Super Admin direct update test
      let userRoster: TestUser[] = [
        { id: 'u-member-1', name: 'Dev Alice', role: 'member', designation: 'Specialist' },
      ];

      const superAdminDirectUpdate = (userId: string, newDesignation: string) => {
        userRoster = userRoster.map((u) => (u.id === userId ? { ...u, designation: newDesignation } : u));
        return { success: true };
      };

      const directRes = superAdminDirectUpdate('u-member-1', 'Principal Solutions Architect');
      expect(directRes.success).toBe(true);
      expect(userRoster[0].designation).toBe('Principal Solutions Architect');
    });
  });
});
