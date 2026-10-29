# ADR 0005: Currency, Hourly Rates, and Financial Calculation Policy

## Status
Accepted

## Context
Commercial estimates and work orders involve hours and parallel pricing in United States Dollars (USD) and Bangladeshi Taka (BDT).
Floating-point IEEE-754 arithmetic in JavaScript (`0.1 + 0.2 === 0.30000000000000004`) produces rounding drift and discrepancies across platforms.
Furthermore, Members are explicitly forbidden from viewing monetary budgets, rates, or financial totals, but need to see authorized scope hours.

## Decision
1. **Server-Authoritative Arithmetic**:
   - Total calculations are performed server-side in PostgreSQL using `NUMERIC(12, 2)` types.
   - Client UI displays calculations strictly computed by PostgreSQL; JavaScript never dictates financial totals to the database.
2. **Parallel Currency Architecture**:
   - USD and BDT rates are explicitly configured per project in `project_financial_settings`.
   - Totals are computed in parallel:
     - `total_usd = ROUND(total_hours * rate_usd_per_hour, 2)`
     - `total_bdt = ROUND(total_hours * rate_bdt_per_hour, 2)`
   - USD and BDT values must NEVER be combined or added together.
3. **Immutable Snapshotting**:
   - When an estimate is sent (`scope_versions.status = 'pending'`), the active rate and resulting monetary totals are permanently snapshotted into `scope_versions` (`total_hours_snapshot`, `total_usd_snapshot`, `total_bdt_snapshot`).
   - Subsequent changes to project rates affect only future drafts, never retroactively altering previously sent estimates or approved work orders.
4. **Member Role Redaction**:
   - Data APIs, RPCs, views, and Realtime channels redact `total_usd_snapshot`, `total_bdt_snapshot`, and all rate fields for users with the `member` role.
   - Members receive only `total_hours_snapshot` and individual line item `hours`.

## Consequences
- **Positive**: Strict financial consistency; zero rounding discrepancies; total protection of company financial margins from unprivileged team members.
- **Negative**: Rate updates require explicit versioning when applied to existing scopes.
