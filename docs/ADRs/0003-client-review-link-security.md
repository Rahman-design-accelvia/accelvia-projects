# ADR 0003: Client Review Link Security and Decision Idempotency

## Status
Accepted

## Context
Clients must be able to review, approve, reject, or request revisions on estimate packages without requiring a full internal employee account. These decisions carry contractual weight and must not be vulnerable to link enumeration, tampering, or duplicate submission.

## Decision
1. **Cryptographic Token Architecture**:
   - Each review invitation generates a 256-bit cryptographically secure pseudorandom token (`crypto.getRandomValues`).
   - The plain token is sent only in the client review link (`/review/:token`).
   - Only the SHA-256 hash of the token (`token_hash`) is persisted in the database (`client_review_tokens`).
2. **Version Pinning & Expiration**:
   - The review token is bound strictly to a single `scope_version_id`.
   - The token contains an explicit `expires_at` timestamp (default: 7 days) and a `revoked_at` column.
   - Once a scope version transitions out of `pending` status, all active tokens for that version are revoked.
3. **Idempotent Decision Processing**:
   - Review submissions execute through a transactional RPC (`submit_client_scope_decision`).
   - An advisory lock or serializable transaction prevents race conditions from concurrent duplicate submissions.
   - If an approval has already been recorded for this version, subsequent attempts return an idempotent success status with the existing decision reference.
4. **Data Isolation**:
   - The client review view is isolated from internal conversations, team rosters, and internal profit margins. Only the client-facing scope items, billable hours, total snapshot, and company metadata are visible.

## Consequences
- **Positive**: Zero trust required for external clients; protects against token theft from database backups.
- **Negative**: Tokens cannot be retrieved once generated; if lost, an Admin must generate a new invitation.
