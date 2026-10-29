# ADR 0006: Role & Permission Matrix and Authorization Boundaries

## Status
Accepted

## Context
The system has three internal roles:
1. `super_admin`: Highest executive authority, full visibility, user and role administration, historical correction capability, hidden from lower tiers.
2. `admin`: Operational management, company-wide project visibility, financial visibility, scope and work order management; cannot manage users or access audit console.
3. `member`: Production staff, restricted to explicitly assigned projects/conversations, sees scope and hours only, no financial or roster visibility.

External client reviewers interact via one-time cryptographically hashed links without an internal user profile.

## Permission Matrix

| Operation / Resource | Super Admin | Admin | Member | Client Reviewer |
|---|:---:|:---:|:---:|:---:|
| **User & Role Administration** |
| Invite internal user | ✅ | ❌ | ❌ | ❌ |
| Assign or change role | ✅ | ❌ | ❌ | ❌ |
| Deactivate / reactivate user | ✅ | ❌ | ❌ | ❌ |
| View internal user roster | ✅ | ✅ (excluding Super Admin) | ❌ | ❌ |
| **Clients & Projects** |
| Create / edit client & contacts | ✅ | ✅ | ❌ | ❌ |
| Create / edit project | ✅ | ✅ | ❌ | ❌ |
| View unassigned project | ✅ | ✅ | ❌ | ❌ |
| View assigned project | ✅ | ✅ | ✅ | ❌ |
| View project monetary settings | ✅ | ✅ | ❌ | ❌ |
| Update project monetary settings | ✅ | ✅ | ❌ | ❌ |
| **Conversations & Messages** |
| Read assigned conversation | ✅ | ✅ | ✅ | ❌ |
| Send message & attachments | ✅ | ✅ | ✅ | ❌ |
| Edit own message | ✅ | ✅ | ✅ | ❌ |
| Edit another user's message | ✅ | ❌ | ❌ | ❌ |
| Soft-delete own message | ✅ | ✅ | ✅ | ❌ |
| Archive / delete conversation | ✅ | ❌ | ❌ | ❌ |
| View Super Admin identity | ✅ | ❌ (Masked as `Management`) | ❌ (Masked as `Management`) | ❌ |
| Correct `event_at` timestamp | ✅ (Audited) | ❌ | ❌ | ❌ |
| **Estimates & Scopes** |
| Create estimate draft | ✅ | ✅ | ❌ | ❌ |
| Edit draft estimate | ✅ | ✅ | ❌ | ❌ |
| Send estimate to client | ✅ | ✅ | ❌ | ❌ |
| Client review & approval | Privileged override only | Admin-recorded offline response | ❌ | ✅ (Via secure link) |
| View financial totals / rates | ✅ | ✅ | ❌ (Hours only) | ✅ (Client rate only) |
| Create additional scope package | ✅ | ✅ | ❌ | ❌ |
| **Work Orders** |
| Generate official work order | ✅ | ✅ | ❌ | ❌ |
| View work order (with money) | ✅ | ✅ | ❌ | ❌ |
| View work order (hours only) | ✅ | ✅ | ✅ | ❌ |
| Mark work delivered / completed | ✅ | ✅ | ❌ | ❌ |
| **Audit Console** |
| View audit events & diffs | ✅ | ❌ | ❌ | ❌ |
| View message revision history | ✅ | ❌ | ❌ | ❌ |
| Export audit reports | ✅ | ❌ | ❌ | ❌ |

## Enforcement Strategy
- **Layer 1: Database RLS Policies** (Deny-by-default on all tables).
- **Layer 2: Stored Procedures & RPCs** (`SECURITY DEFINER` with caller role checks).
- **Layer 3: Projection Sanitization** (Views and RPC returns that drop sensitive columns).
- **Layer 4: UI Route & Action Guards** (User experience guidance only; never relied upon for security).
