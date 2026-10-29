# ADR 0001: Super Admin Identity Masking and Role Protection

## Status
Accepted

## Context
The Work Management System features three distinct internal roles: `super_admin`, `admin`, and `member`.
A key product requirement is that internal employees (both Admins and Members) must not be able to identify who the Super Admin is. Admins and Members should not see the Super Admin's name, email, avatar, user ID, role assignment, or presence in user directories and conversation rosters.
Furthermore, when a Super Admin posts a message to a project conversation, the frontend must render the author as a neutral label (`Management`), without providing a link to their profile or exposing their underlying UUID in standard API query responses.

## Decision
1. **Server-Side Projection & Filtering**:
   - The Super Admin's profile record is excluded from all standard `user_profiles` `SELECT` queries by PostgreSQL Row Level Security (RLS) policies for non-Super-Admin callers.
   - Conversation message queries for Admins and Members execute via a secure view/RPC (`get_conversation_messages_safe`) that replaces `author_user_id` with `NULL` and returns `display_author: 'Management'` whenever the author holds the `super_admin` role.
   - The raw `author_user_id` is only accessible to users with the `super_admin` role via the dedicated audit table and privileged audit RPCs.
2. **Realtime Payload Sanitization**:
   - Realtime updates broadcast sanitized message metadata or signal clients to re-fetch via the authorized safe RPC. Raw database rows containing the Super Admin UUID are never published to unauthenticated or non-Super-Admin channels.
3. **Immutability of the Last Super Admin**:
   - A PostgreSQL check trigger (`trg_ensure_active_super_admin`) prevents any update or deletion from leaving zero active `super_admin` users in `user_roles`.

## Consequences
- **Positive**: Complete privacy for leadership; prevents social engineering, bypassing of management channels, or enumeration of administrative accounts.
- **Negative**: Regular UI message lookups must use the safe projection rather than raw `SELECT * FROM messages`. We enforce this at the database level with RLS denying direct message table queries unless filtered.
