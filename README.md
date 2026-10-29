# Accelvia Work Management System (WMS)

> Internal work management and client-delivery platform connecting clients, projects, primary conversations, estimate revisions, approvals, additional scope, work orders, hours, project budgets, and immutable delivery audit history.

---

## 1. System Overview & Core Principles

The Accelvia Work Management System is an enterprise internal platform built according to Google L5 Senior Software Engineer engineering standards:

1. **One Source of Truth:** PostgreSQL is the single source of truth. All domain entities, relationships, constraints, and audit trails live in transactional SQL.
2. **Security Enforced Server-Side:** Frontend UI hiding is never considered authorization. All tables have default-deny PostgreSQL Row Level Security (RLS) policies.
3. **Approved Data is Immutable:** Estimates and work orders are snapshotted permanently upon send and approval. Modifications create distinct revisions or amendments; past approved records are never mutated.
4. **Append-Only Audit History:** Mutations on critical records generate immutable audit events. Even Super Admins cannot update or delete audit records through the application.
5. **Canonical UTC Instants & Dual-Clock Display:** Every business timestamp is stored canonically in UTC (`timestamptz`) and presented simultaneously in the project's local IANA timezone (e.g. `America/New_York`) and Bangladesh time (`Asia/Dhaka`, UTC+6), properly handling Daylight Saving Time transitions.
6. **Separation of Hours and Money:** Members can see authorized scope and line-item hours, but monetary budgets, hourly rates, and USD/BDT financial totals are strictly redacted.
7. **Super Admin Identity Masking:** The Super Admin identity is hidden from Admins and Members in participant listings, profiles, and conversation messages (rendered neutrally as `Management`).

---

## 2. Tech Stack & Repository Architecture

- **Frontend:** React 18, TypeScript (Strict Mode), Parcel, Tailwind CSS, Lucide Icons, Tiptap Rich-Text Editor with Table extensions and clipboard theme normalizer.
- **Backend & Database:** Supabase (PostgreSQL 15+, Auth, Storage, Realtime, Edge Functions).
- **Testing:** Vitest with coverage, TypeScript unit and domain tests.
- **Continuous Integration:** GitHub Actions (`.github/workflows/ci.yml`).

### Directory Layout
```text
src/
  app/                    # App bootstrap & routing
  components/             # StatusBadge, DualTimeBadge, Modal, UI primitives
  features/
    auth/                 # AuthContext & live role switcher
    clients/              # Client & project management
    conversations/        # RichTextEditor with paste normalizer & attachments
    workspace/            # 3-Panel workspace (Left, Middle, Right)
    approvals/            # Standalone client estimate review portal simulator
    audit/                # Super Admin audit console & diff viewer
  lib/
    formatting/           # Hours & parallel USD/BDT currency calculations
    rich-text/            # DOMPurify HTML sanitizer & theme-stripping normalizer
    state-machines/       # Status transition rules & approved hours aggregator
    supabase/             # Supabase client & in-memory fixture store
    timezone/             # IANA dual-timezone engine (Dhaka + Client)
  types/                  # Strict TypeScript domain types & interfaces

supabase/
  migrations/             # Versioned PostgreSQL migrations (Schema, RLS, RPCs)
  seed.sql                # Seed fixtures for multi-role testing

docs/
  ADRs/                   # Architecture Decision Records (0001 through 0006)
  ERD.md                  # Entity-Relationship diagram & schema outline
```

---

## 3. Quickstart & Local Setup

### Prerequisites
- Node.js >= 20 (Tested on Node.js v24)
- npm >= 10

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd "Accelvia Projects"

# Install dependencies
npm install

# Run automated tests
npm test

# Run TypeScript typechecker
npm run typecheck

# Run Parcel development server
npm run dev
# The workspace is live at http://localhost:3000
```

### Production Build
```bash
npm run build
# Compiles optimized bundles to dist/
```

---

## 4. Role-Based Access Control (RBAC)

The system supports three internal roles and one external reviewer:

| Role | Capabilities & Bounds |
|---|---|
| **Super Admin** | Full access across all company data, user administration, rate settings, audit console, soft-deletions, and audited `event_at` historical corrections. Identity is masked from lower tiers. |
| **Admin** | Manages company clients, projects, scope packages, estimates, work orders, and internal financial rates. Cannot manage users or access the private audit console. |
| **Member** | Restricted to assigned projects only. Sees scope descriptions and approved hours. Cannot see monetary rates, USD/BDT budgets, or other members' rosters. |
| **Client Reviewer** | External client viewing an estimate via a 256-bit expiring cryptographically hashed review link (`/review/:token`). Can approve, reject, or request revisions. |

### Interactive Role Switcher
In local development and preview mode, the top application navigation bar includes an interactive **Role Switcher** (`Super Admin` | `Admin` | `Member`). Switching roles instantly applies all permission invariants across the UI:
- Switch to **Member**: Monetary rates, USD/BDT budgets, and audit console buttons disappear immediately; scope shows as **Hours only**. Super Admin messages show as **Management**.
- Switch to **Admin**: Rates and work order generation appear; user management and audit console remain denied.
- Switch to **Super Admin**: Audit Console, rate overrides, and event time correction tools become active.

---

## 5. Architectural Decision Records (ADRs)

Key architectural decisions are documented in [`docs/ADRs/`](docs/ADRs/):
- **ADR 0001:** [Super Admin Identity Masking and Role Protection](docs/ADRs/0001-super-admin-identity-masking.md)
- **ADR 0002:** [Immutable Audit Log and Soft-Deletion Architecture](docs/ADRs/0002-immutable-audit-and-soft-deletion.md)
- **ADR 0003:** [Client Review Link Security and Decision Idempotency](docs/ADRs/0003-client-review-link-security.md)
- **ADR 0004:** [Canonical Timezone Storage and Dual-Clock Display](docs/ADRs/0004-canonical-timezones-dual-display.md)
- **ADR 0005:** [Currency, Hourly Rates, and Financial Calculation Policy](docs/ADRs/0005-currency-and-rate-calculation-policy.md)
- **ADR 0006:** [Role & Permission Matrix and Authorization Boundaries](docs/ADRs/0006-role-permission-matrix.md)

---

## 6. Database Migrations

Database schema and RLS policies are version-controlled in `supabase/migrations/`:
1. `20261030000001_initial_schema.sql`: Core tables, foreign keys, CHECK constraints, and performance indexes.
2. `20261030000002_rls_and_security.sql`: Row Level Security policies, `SECURITY DEFINER` helper functions, and append-only audit trigger.
3. `20261030000003_rpc_workflows.sql`: Atomic transactional stored procedures (`create_estimate_draft`, `send_estimate_version`, `submit_client_scope_decision`, `generate_work_order`, `correct_event_timestamp`).

---

## 7. Automated Test Suite

Run the full automated test suite with:
```bash
npm test
```
The test suite validates:
- **Financial Arithmetic:** Server-authoritative decimal precision, parallel USD & BDT calculation, and zero floating-point drift.
- **Timezone Calculations:** Dual-clock representation across daylight saving transitions and international date lines.
- **Rich-Text Sanitization:** Normalizing dark/light clipboard table pastes, stripping background styles, and neutralizing XSS payloads.
- **State Machine Transitions:** Scope version lifecycle and approved hours aggregation across initial and additional packages.
- **Authorization Invariants:** Role isolation, Member financial redaction, and Super Admin masking.
