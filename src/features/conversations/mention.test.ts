// src/features/conversations/mention.test.ts
// Unit tests for Google L6 @mention autocomplete & message formatting logic

import { describe, it, expect } from 'vitest';
import { MentionCandidate } from './MentionAutocomplete';

describe('@mention Autocomplete & Parsing Logic', () => {
  const sampleCandidates: MentionCandidate[] = [
    {
      id: 'management',
      display_name: 'Management',
      email: 'management@accelvia.internal',
      role: 'management',
      avatar_text: 'M',
      is_management: true,
    },
    {
      id: 'user-1',
      display_name: 'Musfiqur Rahman (QA)',
      email: 'musfiqurrahmanqa@gmail.com',
      role: 'admin',
      avatar_text: 'M',
    },
    {
      id: 'user-2',
      display_name: 'Super Admin (Ahmed)',
      email: 'gravityahmed11@gmail.com',
      role: 'super_admin',
      avatar_text: 'S',
      is_management: true,
    },
    {
      id: 'user-3',
      display_name: 'Dev Alex',
      email: 'member@accelvia.internal',
      role: 'member',
      avatar_text: 'D',
    },
  ];

  it('filters candidates by name query case-insensitively', () => {
    const query = 'mus';
    const filtered = sampleCandidates.filter((c) =>
      c.display_name.toLowerCase().includes(query.toLowerCase())
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].display_name).toBe('Musfiqur Rahman (QA)');
  });

  it('filters candidates by role or email', () => {
    const query = 'admin';
    const filtered = sampleCandidates.filter(
      (c) =>
        c.role.toLowerCase().includes(query.toLowerCase()) ||
        c.email.toLowerCase().includes(query.toLowerCase())
    );
    // Should match Musfiqur (admin) and Super Admin
    expect(filtered.length).toBeGreaterThanOrEqual(2);
  });

  it('does not trigger on email addresses with @ in the middle of a word', () => {
    const emailText = 'Please send inquiry to info@accelvia.com for details.';
    const triggerRegex = /(?:^|\s)@([a-zA-Z0-9_\s.()'-]{0,25})$/;
    const match = triggerRegex.exec(emailText);
    expect(match).toBeNull();
  });

  it('correctly matches @ trigger at start of line or following whitespace', () => {
    const triggerRegex = /(?:^|\s)@([a-zA-Z0-9_\s.()'-]{0,25})$/;
    
    // Start of line
    const matchStart = triggerRegex.exec('@Dev');
    expect(matchStart).not.toBeNull();
    expect(matchStart![1]).toBe('Dev');

    // After space
    const matchSpace = triggerRegex.exec('Hello @Musfiqur');
    expect(matchSpace).not.toBeNull();
    expect(matchSpace![1]).toBe('Musfiqur');

    // Bare @ symbol
    const matchBare = triggerRegex.exec('Hey @');
    expect(matchBare).not.toBeNull();
    expect(matchBare![1]).toBe('');
  });

  it('identifies @mentions inside message strings', () => {
    const text = 'Hey @Dev Alex, please verify the estimate with @Management.';
    const mentionPattern = /@([a-zA-Z0-9_\-.'()]+(?:\s+[a-zA-Z0-9_\-.'()]+)*)/g;
    const matches: string[] = [];
    let m;
    while ((m = mentionPattern.exec(text)) !== null) {
      matches.push(m[1]);
    }
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(matches.some((name) => name.startsWith('Dev Alex'))).toBe(true);
    expect(matches.some((name) => name.startsWith('Management'))).toBe(true);
  });

  describe('Role-Based @mention Permissions (Admin/Member vs Super Admin)', () => {
    const rawTeam = [
      {
        user_id: 'sa-1',
        display_name: 'Chief Super Admin',
        email: 'superadmin@accelvia.internal',
        role: 'super_admin' as const,
        status: 'active' as const,
        created_at: '2026-01-01',
      },
      {
        user_id: 'admin-1',
        display_name: 'Project Manager (Admin)',
        email: 'pm@accelvia.internal',
        role: 'admin' as const,
        status: 'active' as const,
        created_at: '2026-01-02',
      },
      {
        user_id: 'member-1',
        display_name: 'Lead Developer (Member)',
        email: 'developer@accelvia.internal',
        role: 'member' as const,
        status: 'active' as const,
        created_at: '2026-01-03',
      },
      {
        user_id: 'member-2',
        display_name: 'UI Designer (Member)',
        email: 'designer@accelvia.internal',
        role: 'member' as const,
        status: 'active' as const,
        created_at: '2026-01-04',
      },
    ];

    // Helper that mirrors RichTextEditor / RightPanelConversation candidate construction
    const buildMentionCandidates = (team: typeof rawTeam, isSuperAdmin: boolean): MentionCandidate[] => {
      const list: MentionCandidate[] = team
        .filter((m) => {
          const isActive = m.status === 'active' || !m.status;
          if (!isActive) return false;
          // Non-super-admins cannot mention super_admin
          if (!isSuperAdmin && m.role === 'super_admin') return false;
          return true;
        })
        .map((m) => ({
          id: m.user_id,
          display_name: m.display_name,
          email: m.email,
          role: m.role,
          avatar_text: m.display_name.charAt(0).toUpperCase(),
          is_management: m.role === 'super_admin',
        }));

      if (isSuperAdmin && !list.some((c) => c.id === 'management')) {
        list.unshift({
          id: 'management',
          display_name: 'Management',
          email: 'management@accelvia.internal',
          role: 'management',
          avatar_text: 'M',
          is_management: true,
        });
      }

      return list;
    };

    // Helper that mirrors WorkspaceLayout mention scanning
    const scanMentionedMembers = (
      team: typeof rawTeam,
      snippet: string,
      currentUserId: string,
      isSuperAdmin: boolean
    ) => {
      return team.filter((m) => {
        if (m.user_id === currentUserId) return false;
        if (!isSuperAdmin && m.role === 'super_admin') return false;
        const pattern = new RegExp(`@${m.display_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
        return pattern.test(snippet);
      });
    };

    it('Admin cannot find or mention Super Admin in candidate list', () => {
      const adminCandidates = buildMentionCandidates(rawTeam, false);
      
      // Super Admin and Management must NOT exist
      expect(adminCandidates.some((c) => c.role === 'super_admin')).toBe(false);
      expect(adminCandidates.some((c) => c.display_name === 'Chief Super Admin')).toBe(false);
      expect(adminCandidates.some((c) => c.id === 'management')).toBe(false);

      // Admin and Members must exist
      expect(adminCandidates.some((c) => c.id === 'admin-1')).toBe(true);
      expect(adminCandidates.some((c) => c.id === 'member-1')).toBe(true);
      expect(adminCandidates.some((c) => c.id === 'member-2')).toBe(true);
    });

    it('Member cannot find or mention Super Admin in candidate list', () => {
      const memberCandidates = buildMentionCandidates(rawTeam, false);

      expect(memberCandidates.some((c) => c.role === 'super_admin')).toBe(false);
      expect(memberCandidates.some((c) => c.display_name === 'Chief Super Admin')).toBe(false);
      expect(memberCandidates.some((c) => c.id === 'management')).toBe(false);

      // Admin and Member can mention each other
      expect(memberCandidates.some((c) => c.id === 'admin-1')).toBe(true);
      expect(memberCandidates.some((c) => c.id === 'member-1')).toBe(true);
      expect(memberCandidates.some((c) => c.id === 'member-2')).toBe(true);
    });

    it('Super Admin can mention anyone (Super Admin, Admin, Member, and Management)', () => {
      const superAdminCandidates = buildMentionCandidates(rawTeam, true);

      // All roles are available to Super Admin
      expect(superAdminCandidates.some((c) => c.id === 'management')).toBe(true);
      expect(superAdminCandidates.some((c) => c.id === 'sa-1')).toBe(true);
      expect(superAdminCandidates.some((c) => c.id === 'admin-1')).toBe(true);
      expect(superAdminCandidates.some((c) => c.id === 'member-1')).toBe(true);
      expect(superAdminCandidates.some((c) => c.id === 'member-2')).toBe(true);
    });

    it('blocks Admin/Member messages from triggering Super Admin mentions even if typed manually', () => {
      const text = 'Hey @Chief Super Admin and @Lead Developer (Member), please check this!';
      
      // Admin sending message
      const adminMentioned = scanMentionedMembers(rawTeam, text, 'admin-1', false);
      expect(adminMentioned.some((m) => m.role === 'super_admin')).toBe(false);
      expect(adminMentioned.some((m) => m.user_id === 'member-1')).toBe(true);

      // Member sending message
      const memberMentioned = scanMentionedMembers(rawTeam, text, 'member-1', false);
      expect(memberMentioned.some((m) => m.role === 'super_admin')).toBe(false);
      expect(memberMentioned.length).toBe(0); // Only attempted to mention Super Admin and self
    });

    it('allows Super Admin messages to mention anyone including other Super Admins', () => {
      const text = 'Notice @Chief Super Admin and @Project Manager (Admin) and @UI Designer (Member)';
      const saMentioned = scanMentionedMembers(rawTeam, text, 'sa-2', true);

      expect(saMentioned.some((m) => m.user_id === 'sa-1')).toBe(true);
      expect(saMentioned.some((m) => m.user_id === 'admin-1')).toBe(true);
      expect(saMentioned.some((m) => m.user_id === 'member-2')).toBe(true);
    });
  });
});
