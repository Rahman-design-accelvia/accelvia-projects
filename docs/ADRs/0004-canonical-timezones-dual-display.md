# ADR 0004: Canonical Timezone Storage and Dual-Clock Display

## Status
Accepted

## Context
The Accelvia team operates primarily out of Bangladesh (`Asia/Dhaka`, UTC+6), whereas clients are distributed across diverse international time zones (e.g., North America Eastern `America/New_York`, Pacific `America/Los_Angeles`, Europe `Europe/London`, Australia `Australia/Sydney`). Fixed UTC offsets (such as UTC-5) fail when Daylight Saving Time (DST) changes.
Messages, estimate revisions, and work order events must communicate the exact instant in both Bangladesh time and the client/project local time.

## Decision
1. **Canonical UTC Instant Storage**:
   - All temporal values are stored in PostgreSQL using `timestamptz` (Timestamp with Time Zone).
   - In PostgreSQL, `timestamptz` canonicalizes internally to UTC microsecond instants.
   - Project records maintain a canonical IANA timezone identifier string in `projects.timezone` (e.g., `America/New_York`), defaulting from `clients.default_timezone` or `organizations.default_timezone` (`Asia/Dhaka`).
2. **Dual-Clock Rendering**:
   - Every message and timestamped business event displays:
     1. Client / Project Local Time: Formatted using the project's IANA timezone name with time-zone abbreviation (e.g., `10:30 AM EDT`).
     2. Bangladesh Time: Formatted using `Asia/Dhaka` (e.g., `8:30 PM BST`).
   - The UI uses modern ECMAScript `Intl.DateTimeFormat` with IANA timezone identifiers to compute calendar dates and local times without external bulky dependencies.
3. **Historical Event Time Snapshot**:
   - Work orders and estimates snapshot the active project timezone identifier at the time of creation so subsequent project timezone reconfigurations do not distort historical documents.

## Consequences
- **Positive**: Handles DST shifts without code adjustments; prevents confusion between off-shore teams and international clients.
- **Negative**: Display components must always receive the project timezone context.
