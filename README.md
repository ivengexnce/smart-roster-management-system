# Smart Roster Management System

**Project:** Datastraw Tech Internship Assessment  
**Product:** Smart Roster Management System  
**Version:** 1.0.0  
**Author:** Meet Maru  
**Live Development URL:** `https://srm-datastraw.vercel.app/`  

---

## 1. Executive Overview

The **Smart Roster Management System** is an enterprise-grade workforce scheduling platform engineered for customer experience (CX) and multi-client operational environments. It automates monthly roster generation across complex organizational matrices where employees manage multiple brands and operational processes, and each process operates under a distinct operating calendar.

### The Problem It Solves
1. **Multi-Calendar Operations:** Different brands and processes follow conflicting operating schedules (e.g., 365-day continuous coverage vs. public holidays off vs. Sunday & holiday exclusions).
2. **Multi-Process Assignment Complexity:** ~80% of client accounts operate under a single dedicated employee who must cover multiple processes (such as Customer Support, Abandoned Cart Conversions, and Non-Delivery Reports).
3. **Availability Shocks & Coverage Gaps:** When a dedicated resource takes approved leave, multiple client processes suddenly lose mandatory coverage.
4. **Deterministic Local Repair:** Manual recalculations often disrupt the entire month. This system isolates affected dates and processes, identifies qualified backup candidates, and applies local atomic repair without invalidating the rest of the roster.

---

## 2. Core Architectural Principles

```
+----------------------------------------------------------------------------------------------------+
|                                    PRESENTATION LAYER (Next.js)                                    |
|  +-------------------+  +-------------------+  +---------------------+  +-----------------------+  |
|  | Company Matrix    |  | Pod-Wise View     |  | Brand-Wise View     |  | Process & Emp Views   |  |
|  +-------------------+  +-------------------+  +---------------------+  +-----------------------+  |
|  +-----------------------------------------------------------------------------------------------+  |
|  | State & Interaction: Filter Bar | Conflict Drawer | Backup Resolver Modal | Live Terminal Log |  |
+--+-----------------------------------------------------------------------------------------------+--+
                                                |  HTTPS / REST / JSON
+-----------------------------------------------+----------------------------------------------------+
|                                     API & SECURITY LAYER                                           |
|  +-------------------+  +-------------------+  +---------------------+  +-----------------------+  |
|  | JWT Session Auth  |  | RBAC Middleware   |  | Zod Schema Validator|  | Rate Limiter & Headers|  |
|  | (RFC 7519 / HS256)|  | (BOLA Prevention) |  | (Mass-Assign Defense|  | (OWASP Top 10 API)    |  |
|  +-------------------+  +-------------------+  +---------------------+  +-----------------------+  |
+-----------------------------------------------+----------------------------------------------------+
                                                |
+-----------------------------------------------+----------------------------------------------------+
|                                     BUSINESS LOGIC LAYER                                           |
|  +---------------------------------------------+  +---------------------------------------------+  |
|  |      DETERMINISTIC SCHEDULING ENGINE        |  |            VALIDATION ENGINE                |  |
|  | - Calendar Generator (Type A, B, C)         |  | - Hard Constraint Verifier                  |  |
|  | - Availability & Skill Masking              |  | - Coverage Gap & Understaffing Detector     |  |
|  | - Dedicated vs Shared Slot Allocator        |  | - Leave & Cross-Brand Overlap Analyzer      |  |
|  | - Local Repair & Backup Recommendation      |  | - Critical vs Warning Severity Classifier   |  |
|  +---------------------------------------------+  +---------------------------------------------+  |
+-----------------------------------------------+----------------------------------------------------+
                                                |
+-----------------------------------------------+----------------------------------------------------+
|                      PERSISTENCE LAYER (Firebase Firestore & Adapter)                              |
|  Users | Employees | Pods | Brands | Processes | Assignments | Rosters | RosterEntries | AuditLogs  |
|  - Cloud Firestore collections (Production)                                                        |
|  - In-Memory Fallback Adapter (Instant Zero-Config Development & Assessment Testing)               |
+----------------------------------------------------------------------------------------------------+
```

### Deterministic vs. Stochastic Scheduling
- **Zero Hallucination:** Schedules are generated through provable, rule-based constraint satisfaction logic rather than random LLM output.
- **Immediate Explainability:** Every conflict identifies the exact date, brand, process, required headcount, available headcount, and specific reason (e.g. assigned staff on approved leave or weekly off).
- **Publication Gate:** The system strictly prohibits publishing any roster containing unresolved **Critical** conflicts.

---

## 3. Operating Calendars & Rule Engine

The system supports configurable process-level operational calendars:

| Calendar Type | Working Schedule | Sunday Coverage | Public Holiday Coverage | Example Processes |
| --- | --- | --- | --- | --- |
| **Type A: 365-Day Operations** | Monday through Sunday | Required | Required | Brand A Customer Support, Brand A NDR, Brand D CS |
| **Type B: Holidays Off** | Monday through Sunday | Required | Off | Brand B Retention, Brand C CS |
| **Type C: Sundays & Holidays Off** | Monday through Saturday | Off | Off | Brand A ACC, Brand C ACC, Brand D ACC |

---

## 4. Benchmark Dataset (30 Employees)

The pre-configured benchmark dataset matches Datastraw's operational specifications:

- **30 Employees (E01 to E30):** Distributed across 3 Operational Pods:
  - **Pod Alpha:** Supervised by Rahul Sharma (E01–E10)
  - **Pod Beta:** Supervised by Priya Patel (E11–E20)
  - **Pod Gamma:** Supervised by Amit Verma (E21–E30)
- **18 Client Brands:**
  - **~78% (14 brands) Single-Resource Brands:** Dedicated to a primary employee (e.g. Brand A handled by E01; Brand B handled by E02; Brand E handled by E08; Brands F through P handled by E12–E20).
  - **4 Multi-Resource Shared Brands:** Brand C (E03, E04), Brand D (E05, E06, E07 - requires 2 CS staff), Brand Q (E22, E23), Brand R (E24, E25).
  - **Shared Floater Pool:** E09, E10, E26–E30 multi-skilled and eligible for cross-brand backup reassignments.
- **4 Operational Processes:**
  - `CS`: Customer Support (Tier-1 live support)
  - `ACC`: Abandoned Cart Conversions (Sales recovery)
  - `NDR`: Non-Delivery Report Management (Logistics exceptions)
  - `RETENTION`: Customer Retention & Churn Prevention

---

## 5. The Datastraw Benchmark Scenario: Leave & Local Repair

This scenario demonstrates the primary capability evaluated in the assessment:

1. **Dedicated Ownership:** Employee **E01** (Rahul Sharma) is the dedicated owner for all processes of **Brand A** (`CS`, `ACC`, `NDR`).
2. **Leave Ingestion:** E01 submits an approved personal leave request for **12 November 2024**.
3. **Gap Detection:**
   - On 12 November, Brand A CS requires 1 staff -> 0 available -> **Critical Coverage Gap**.
   - Brand A NDR requires 1 staff -> 0 available -> **Critical Coverage Gap**.
   - Brand A ACC does not operate on Sundays/Holidays (or is non-critical) -> 0 required.
   - Total detected: **2 Critical Conflicts**. Publication is blocked.
4. **Candidate Matching:**
   - The engine searches active employees qualified in `[CS, NDR]` who are available on 12 November and not assigned to a critical single-resource brand.
   - Identifies **E09** (Pooja Iyer) in Pod Alpha as the prime candidate.
5. **1-Click Local Reassignment:**
   - The operations manager clicks **Reassign** on E09.
   - The engine atomically creates an override entry for 12 November, marks `isOverride: true`, logs the rationale in the immutable audit log, and clears the conflict.
   - **Unaffected assignments across the remaining 29 days of the month remain untouched.**

---

## 6. The Five Specialized Operational Views

1. **Company-Wide View:** High-density matrix displaying all 30 employees across 30 days with status chips (Working, Reassigned Override, Approved Leave, Weekly Off, Public Holiday).
2. **Pod-Wise View:** Personnel grouped under their respective Pod Leads (Rahul Sharma, Priya Patel, Amit Verma).
3. **Brand-Wise View:** 18-brand daily staffing health showing available vs. required coverage ratios.
4. **Process-Wise View:** Daily aggregate staffing and detected gaps across CS, ACC, NDR, and Retention.
5. **Employee-Wise View:** Individual schedule drilldown with weekly off preference, contact info, and calendar day chips.

---

## 7. Strict UI/UX & Security Design Adherence

The user interface follows strict operational design directives:
- **Terminal Window:** Real-time solver console outputting deterministic scheduling execution traces.
- **Copywriting Style:** Clear "It's not x, it's y" operational framing.
- **Typography & Layout:** Native system font stack (`system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`), sharp 0px corners, flat design with no drop shadows, and no generic bento grids.
- **Clean Iconography:** Hand-crafted, lightweight inline SVGs with zero external icon package overhead and strictly zero emojis or sparkle icons.
- **Semantic Pastel Palette:** High-contrast, WCAG 2.2 AA compliant basic pastels:
  - Working / Covered: Pastel Green (`bg-emerald-50 text-emerald-800 border-emerald-200`)
  - Critical Gap: Pastel Red (`bg-red-50 text-red-800 border-red-200`)
  - Leave / Warning: Pastel Amber (`bg-amber-50 text-amber-800 border-amber-200`)
  - Weekly Off: Pastel Slate (`bg-gray-100 text-gray-700 border-gray-200`)
  - Reassigned Override: Pastel Blue (`bg-blue-100 text-blue-900 border-blue-400`)

---

## 8. Role-Based Authentication & Session Management

The system features a dedicated **Role-Based Authentication (RBAC) System**:
- **Email & Password Authentication:** Standard login and account registration with operational role selection.
- **Google Sign-In:** Official Google OAuth integration with custom claims mapping.
- **1-Click Evaluator Demo Access:** Instant profile switching for assessment evaluation:
  - **Operations Manager:** `manager@datastraw.io` (Full global read/write, solver execution, publication).
  - **Pod Lead (Rahul Sharma):** `rahul.alpha@datastraw.io` (Scoped supervisory access to Pod Alpha).
  - **Operational Employee (Ananya Roy - E01):** `ananya.roy@datastraw.io` (Read-only personal shift schedule).
- **Session Life Cycle:** Active user profile displayed in the header with role badge, email, and one-click **Sign Out / Logout** button.
- **Dynamic Current Month:** The calendar automatically detects and defaults to the active current month and year (e.g. `2026-11`), placing E01's benchmark leave on Day 12 of the current active month.
- **Data Governance:** Dedicated Privacy Policy modal explaining RBAC isolation, data processing scope, and immutable audit logging.

---

## 9. Installation & Setup Instructions

### Prerequisites
- Node.js `18.x` or later (tested on Node `v24.19.0`)
- npm `9.x` or later

### Step 1: Clone or Navigate to Repository
```bash
cd D:\github_repos\smart-roster-management-system
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run the Application
To run in production mode (pre-compiled):
```bash
npm run build
npm run start
```
The server will start at:
```
http://localhost:3000
```

To run in development mode with hot-reloading:
```bash
npm run dev
```

---

## 10. Evaluator Demo Walkthrough (Step-by-Step)

Follow this 2-minute walkthrough to verify all assessment requirements:

1. **Open the browser:** Navigate to `http://localhost:3000`.
2. **Inspect the UI:** Notice the clean pure-white background, sharp corners, collapsible navigation sidebar, and live solver console.
3. **Load Benchmark Data:** Click **"Load Benchmark Data (30 Emps)"** in the top bar.
   - The terminal console will log: *Seeded benchmark dataset: 30 employees, 18 brands (80% single-resource), 3 pods, 4 processes, and E01 Nov 12 leave.*
   - KPI counters update to 30 personnel, 18 brands, 3 pods.
4. **Generate Roster:** Click **"Generate Roster"**.
   - The deterministic engine calculates shifts for November 2024.
   - Notice the **Critical Gaps** counter turns red (2 critical gaps).
   - The roster state shows **DRAFT (Version 1)**.
5. **Verify Publication Guard:** Click **"Publish Roster"**.
   - An alert confirms that publication is blocked: *Cannot publish roster with 2 unresolved CRITICAL conflicts.*
6. **Resolve Conflict:** Click on the red **Critical Gaps** KPI card or the **Conflict Drawer**.
   - Read the diagnostic: *Brand A CS/NDR requires 1 staff, but only 0 available on 2024-11-12. Reason: assigned staff on approved leave.*
   - Review the candidate recommendation: *Pooja Iyer (E09) - Pod Alpha, Qualified in CS/NDR, Available.*
   - Click **"Reassign"**.
   - The engine replaces the slot, removes the conflict, logs the audit entry, and updates Roster State to **VALIDATED**.
7. **Publish Roster:** Click **"Publish Roster"**.
   - The roster publishes successfully with status **PUBLISHED**.
8. **Switch Views:** Explore all 5 view tabs:
   - Click **"1. Company-Wide"** to view all 30 employee schedules. Note E09's blue chip on Day 12 showing `R: BR-A`.
   - Click **"2. Pod-Wise"** to view Pod Alpha, Beta, and Gamma breakdowns.
   - Click **"3. Brand-Wise"** to verify 100% green coverage on Brand A.
   - Click **"4. Process-Wise"** to inspect aggregate CS, ACC, NDR, and Retention headcounts.
   - Click **"5. Employee-Wise"** to inspect individual calendar cards.
9. **Role Switcher:** Switch the top right role to **Employee (Ananya Roy)** or **Pod Lead (Rahul Sharma)** to test RBAC authorization.

---

## 11. Shift Swapping & Compensatory Off Management

To provide operational flexibility without sacrificing coverage integrity:
- **Peer Shift Swapping:** Employees and Pod Leads can propose shift swaps on specific dates and brands. The system verifies that the target peer holds verified process qualifications and is not on leave. Upon Pod Lead or Operations Manager approval, shifts are atomically updated with full audit trail logging.
- **Comp-Off Bank:** When employees work on designated weekly offs or public holidays (especially on 365-day accounts), they earn 1 Comp-Off credit. Employees can redeem available credits for approved leaves (`LeaveType.COMP_OFF`).
- **Operational Analytics & SLA Coverage:** Live executive dashboard tracking Monthly SLA compliance %, Single-Resource Vulnerability Index (14 of 18 brands), Pod-by-Pod performance gauges, and Floater readiness distribution.
- **Employee Range Slicing & Detail Preview:** Interactive range selector (`1-10 [Pod Alpha]`, `11-20 [Pod Beta]`, `21-30 [Pod Gamma]`, `All 1-30`, `Custom From [X] To [Y]`) integrated directly into the Company Master Matrix and the Employee Management Console.
- **Operations Manager Staff Administration:** Full CRUD capability via `/api/employees` and UI modal to register new personnel, edit employee profiles (pod transfers, skill qualifications, weekly off preferences, active status), and preview comprehensive employee profiles with 30-day miniature shift timelines.

---

## 12. Automated End-to-End Verification (178/178 Tests Passed)

The repository includes a comprehensive automated test framework verifying all critical operational, security, and configuration paths:
1. Role-based authentication (Email/Password, Google OAuth simulation, session management, logout).
2. Dynamic month benchmark dataset seeding (30 employees, 18 brands, 3 pods, 4 processes, and E01 Day 12 leave).
3. Deterministic constraint solver execution and critical gap classification.
4. Benchmark availability shock diagnostic on Day 12 and E09 candidate recommendation ranking.
5. Strict publication guard blocking invalid roster publication.
6. Atomic local repair preserving unaffected dates and slots.
7. Shift swap proposal, constraint verification, and manager approval.
8. Compensatory off grant and approved leave redemption.
9. Immutable audit trail logging across all lifecycle actions.
10. Multi-shift timing support (`[M]` Morning, `[A]` Afternoon, `[N]` Night, `[G]` General).
11. Pod Alpha Day 16 multi-leave stress test with cross-pod borrowing (E19 floater from Pod Beta).
12. Multi-tier RBAC enforcement across 7 authorization boundaries.
13. Employee range slicing (`1-10`, `11-20`, `21-30`, `All`, `Custom`) and rich employee detail inspection.
14. Operations Manager employee lifecycle CRUD (Create E31, Update, RBAC 403 blocks for unauthorized staff, Delete).
15. In-app operational notifications API (`/api/notifications`), event broadcast, and read state management.
16. Brand management CRUD (`/api/brands`), single-resource (~78%) vs multi-resource (2-3 staff) configuration.
17. Pods (`/api/pods`) and Process Operating Rules (`/api/processes`) dynamic configuration.
18. Headless Chrome Puppeteer visual verification producing high-res UI screenshots.

To run all automated verification suites:
```bash
# Run all 8 automated test suites (178 tests)
npm run test:all

# Or run individual test suites:
npm run test:jwt        # 20 JWT Authentication & Security Tests
npm run test:e2e        # 32 Core E2E Tests
npm run test:edge       # 13 Advanced Edge Case Tests
npm run test:advanced   # 22 Advanced Feature Tests (Overrides, Shift Timings, Pod Stress)
npm run test:rbac       # 20 Dedicated RBAC Gating Tests
npm run test:employee   # 30 Employee Management & Range Slicing Tests
npm run test:p2         # 21 P2 Enhancements & Configuration Tests
npm run test:ui         # 20 Puppeteer Visual UI & Screenshot Tests

# Or run all 178 tests in sequence:
npm test
```
Output:
```
====================================================
ALL 178/178 AUTOMATED TESTS PASSED ACROSS 8 SUITES!
- JWT Authentication & Security Tests: 20/20 Passed
- Core E2E Tests: 32/32 Passed
- Advanced Edge Cases: 13/13 Passed
- Advanced Features & Stress Tests: 22/22 Passed
- Dedicated RBAC Gating Tests: 20/20 Passed
- Employee Management & Range Tests: 30/30 Passed
- P2 Enhancements & Configuration Tests: 21/21 Passed
- Visual UI Screenshots & RBAC State Tests: 20/20 Passed
====================================================
```

### Visual Verification Artifacts (`public/screenshots/`)
1. `01_login_gateway.png` — Enterprise Login & SSO Gateway with Google Workspace button & 3 role demo launchers.
2. `02_ops_manager_dashboard.png` — Operations Manager console showing 5 matrices, 8 ops tools, and publication authority.
3. `03_pod_lead_dashboard.png` — Pod Lead console showing Pod Alpha scoping, pod generation, and publication gating.
4. `04_employee_dashboard.png` — Employee self-service workspace showing personal KPIs, `[YOU]` badge, and locked managerial buttons.
5. `05_employee_readonly_slot.png` — Employee Read-Only Slot Inspector with editing strictly disabled.

---

## 13. Project Structure

```
smart-roster-management-system/
├── PR.md                                  # Complete Product Requirements Document
├── system_design.md                       # System Architecture & Design Document (by Meet Maru)
├── UI_UX_design.md                        # Visual Architecture & Aesthetic Specification (by Meet Maru)
├── README.md                              # Setup guide and technical documentation (by Meet Maru)
├── package.json                           # Dependencies & scripts
├── tsconfig.json                          # TypeScript strict compiler options
├── tailwind.config.js                     # Design tokens (0px radius, flat shadow, pastel palette)
├── postcss.config.js                      # PostCSS plugins
├── .env.example                           # Sample environment configuration
├── .env.local                             # Local environment configuration
├── vercel.json                            # Vercel deployment configuration (bom1 region)
├── public/
│   └── screenshots/                       # Automated verification screenshots
├── scripts/
│   ├── test-jwt-auth.mjs                  # 20-test JWT authentication & security suite
│   ├── test-e2e.mjs                       # 32-test automated verification suite
│   ├── test-edge-cases.mjs                # 13-test advanced edge case suite
│   ├── test-advanced-features.mjs         # 22-test advanced features verification suite
│   ├── test-rbac-gating.mjs               # 20-test dedicated RBAC gating & JWT suite
│   ├── test-employee-mgmt.mjs             # 30-test workforce management & range slicing suite
│   ├── test-p2-features.mjs               # 21-test P2 enhancements & configuration suite
│   ├── test-range-screenshot.mjs          # Modal and matrix range visual screenshot capture
│   └── test-ui-screenshots.mjs            # 20-test headless Chrome visual verification suite
└── src/
    ├── app/
    │   ├── layout.tsx                     # Global HTML root layout
    │   ├── page.tsx                       # Main Operations Dashboard & Roster Matrix
    │   ├── globals.css                    # Global Tailwind directives & resets
    │   └── api/
    │       ├── auth/                      # Login, logout, session me, refresh, register API
    │       ├── seed/route.ts              # Benchmark seed data loader (30 employees)
    │       ├── employees/route.ts         # Range slicing & employee CRUD management API
    │       ├── brands/route.ts            # Brand management CRUD API
    │       ├── pods/route.ts              # Pod configuration API
    │       ├── processes/route.ts         # Process & operating rules API
    │       ├── notifications/route.ts     # In-app operational notifications API
    │       ├── roster/
    │       │   ├── route.ts               # Active roster query endpoint (auto-seeding on cold start)
    │       │   ├── generate/route.ts      # Deterministic roster generation API
    │       │   ├── reassign/route.ts      # 1-click atomic backup reassignment & slot override API
    │       │   └── publish/route.ts       # Publication gatekeeper API
    │       ├── leaves/route.ts            # Leave submission and approval API
    │       └── swaps/route.ts             # Shift swap & comp-off credit management API
    ├── components/
    │   ├── icons.tsx                      # Custom SVG icons (pure SVG, 0 emojis, Google SSO)
    │   ├── EnterpriseLoginGateway.tsx     # Full-page Enterprise Authentication & SSO Gateway
    │   ├── NavigationSidebar.tsx          # Collapsible navigation sidebar
    │   ├── RosterViews.tsx                # 5 Matrix Viewports (Company, Pod, Brand, Process, Staff)
    │   ├── LeaveManagementModal.tsx       # Leave approval and submission modal
    │   ├── ShiftSwapModal.tsx             # Peer shift exchange and comp-off bank modal
    │   ├── SlotEditorModal.tsx            # Slot override & read-only inspector modal
    │   ├── ConflictDrawer.tsx             # Slide-out real-time conflict & backup drawer
    │   ├── EmployeeManagementModal.tsx    # Workforce management & range slicing modal
    │   ├── BrandManagementModal.tsx       # Client brand SLA & operating rule modal
    │   ├── AdvancedOptimizationModal.tsx  # Fairness optimizer & what-if surge simulation
    │   ├── NotificationCenterModal.tsx    # Operational notification drawer
    │   ├── AnalyticsDashboard.tsx         # Real-time SLA analytics & KPI dashboard
    │   ├── AuditTrailView.tsx             # Immutable audit log view
    │   ├── PrintDispatchView.tsx          # Clean printable shift dispatch sheet
    │   ├── PrivacyPolicyModal.tsx         # Data governance & privacy policy modal
    │   └── TerminalWindow.tsx             # Solver Diagnostics Console (sidebar only)
    ├── lib/
    │   ├── authMiddleware.ts              # Server-side JWT authentication & RBAC validator
    │   ├── db.ts                          # In-memory store with audit logging
    │   ├── export-csv.ts                  # CSV export engine
    │   ├── firebase.ts                    # Safe client Firebase singleton
    │   ├── firebase-admin.ts              # Server-only Firebase Admin SDK
    │   ├── jwt.ts                         # Cryptographic signing, verification & hashing
    │   ├── permissions.ts                 # Role-based feature gate matrices
    │   ├── scheduling-engine.ts           # Deterministic multi-brand constraint solver
    │   └── seed-data.ts                   # 30-employee, 18-brand benchmark dataset
    └── types/
        └── index.ts                       # Complete TypeScript domain contracts
```

---

## 14. Enterprise JWT Authentication & RBAC Specification

The system implements a production-grade, cryptographically secure JWT authentication and role-based access control (RBAC) architecture adhering to RFC 7519:

### Authentication Mechanisms
1. **Email & Password Authentication:**
   - PBKDF2 cryptographic password hashing (`crypto.pbkdf2Sync`) with 100,000 iterations and 16-byte unique cryptographic salts.
   - Constant-time password comparison (`crypto.timingSafeEqual`) to eliminate timing attacks.
2. **Google OAuth & Workspace SSO:**
   - Direct integration with Google OAuth 2.0 (`https://oauth2.googleapis.com/tokeninfo?id_token=...`).
   - Domain-level verification for `@datastraw.io` enterprise accounts.
   - Automatic user identity sync and account linking.

### JWT Token Lifecycle & Security
- **Access Tokens:** Signed using HMAC-SHA256 (`HS256`) with a 15-minute expiration (`15m`). Contains user ID, email, role, and pod scope.
- **Refresh Tokens:** Signed using `HS256` with a 7-day expiration (`7d`). Issued with a unique `tokenId` tracked in an in-memory database registry (`activeRefreshTokens`).
- **Secure Cookie Storage:** Stored in client browsers via `HttpOnly`, `SameSite=Lax`, and `Path=/` cookie headers. Never exposed to client-side JavaScript.
- **Dual Transport Support:** Backend endpoints accept tokens via both `HttpOnly` cookies and `Authorization: Bearer <token>` headers.
- **Token Invalidation on Logout:** Revokes refresh token in the database registry and clears client cookies with `Max-Age=0`.

### Strict RBAC Tiering & Endpoint Protection
| Role | Permissions & Scope | Restricted Endpoints / UI Actions |
| :--- | :--- | :--- |
| **Operations Manager** (`manager@datastraw.io`) | Global Master Authority: Full read/write access across all 3 Pods (30 Staff, 18 Client Brands, 4 Processes), Roster Generation, Roster Publication, Benchmark Seeding, Workforce CRUD, and Slot Overrides. | None. Unrestricted administrative access. |
| **Pod Lead** (`rahul.alpha@datastraw.io`) | Supervisor Authority: Scoped to designated Pod (Pod Alpha: 10 Personnel, 6 Accounts), Pod Roster Generation, Leave Approvals, Shift Swap Reviews, and Slot Overrides. | Gated from company-wide Roster Publication (`HTTP 403`), cross-pod workforce modifications, and benchmark seeding. |
| **Employee** (`ananya.roy@datastraw.io`) | Self-Service Scope: Personal schedule inspector, personal leave requests, and mutual shift swap submissions. | Strictly read-only on company roster. Gated from Roster Generation (`403`), Publication (`403`), Slot Overrides (`403`), and Workforce CRUD (`403`). |

### Centralized Permissions Matrix & Resource Authorization
The system defines granular, centralized permissions in [`src/lib/permissions.ts`](file:///D:/github_repos/smart-roster-management-system/src/lib/permissions.ts) enforced by backend middleware on every protected API:

```typescript
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OPERATIONS_MANAGER: [
    "roster.view.all", "roster.solve.all", "roster.publish", "roster.repair",
    "staff.view.all", "staff.manage", "pod.manage", "leave.manage.all",
    "shift_swap.manage.all", "analytics.view.global", "audit.view.global", "roles.manage"
  ],
  POD_LEAD: [
    "roster.view.pod", "roster.solve.pod", "staff.view.pod", "leave.manage.pod",
    "shift_swap.manage.pod", "analytics.view.pod", "audit.view.pod", "roster.submit_for_approval"
  ],
  EMPLOYEE: [
    "roster.view.personal", "schedule.view.personal", "leave.submit",
    "shift_swap.submit", "shift_exchange.request", "attendance.view.personal"
  ]
};
```

In addition to role-string validation, `authorizeResourceAccess` validates:
1. **Organization Verification:** Must be within `@datastraw.io` domain; external domain registration is strictly rejected (`HTTP 400`).
2. **Pod-Level Scope:** Pod Leads cannot modify foreign pods or query unassigned staff records (`HTTP 403`).
3. **Resource Ownership:** Employees cannot access other employees' private records or approve their own requests (`HTTP 403`).
4. **Role Escalation Prevention:** Public registration strictly assigns `EMPLOYEE` role. Attempts to self-assign `OPERATIONS_MANAGER` or `POD_LEAD` are rejected with `HTTP 403`. Operations Manager and Pod Lead accounts must be provisioned by an authorized administrator.

### UI Layout & Navigation Ergonomics
- **Repositioned User Profile Card:** Per design specifications, the user profile widget (`FullName`, `Email`, `Role Badge`, `Online status`, `Logout`) is positioned inside the sticky left navigation sidebar (`NavigationSidebar.tsx`) directly under the `SMART ROSTER OS` brand header.
- **High-Density Top Bar:** The top application header is dedicated to system status, unread notification alerts, and active role-scoped action triggers.

---

## 15. Comprehensive Automated Test Matrix (178 Passing Tests)

The system includes 8 dedicated automated test suites covering 100% of functional, edge case, and security requirements:

| Test Suite | File | Tests | Status |
| :--- | :--- | :---: | :---: |
| **JWT Authentication & Security** | `scripts/test-jwt-auth.mjs` | **20** | `100% PASS` |
| **Dedicated RBAC Gating** | `scripts/test-rbac-gating.mjs` | **20** | `100% PASS` |
| **End-to-End Operational Lifecycle** | `scripts/test-e2e.mjs` | **32** | `100% PASS` |
| **Advanced Edge Cases & Calendars** | `scripts/test-edge-cases.mjs` | **13** | `100% PASS` |
| **Advanced Solver & Stress Tests** | `scripts/test-advanced-features.mjs` | **22** | `100% PASS` |
| **Employee Management & Range Slicing** | `scripts/test-employee-mgmt.mjs` | **30** | `100% PASS` |
| **P2 Advanced Configuration & Brands** | `scripts/test-p2-features.mjs` | **21** | `100% PASS` |
| **Puppeteer Visual UI & Layout Testing** | `scripts/test-ui-screenshots.mjs` | **20** | `100% PASS` |
| **TOTAL VERIFIED SUITE** | `npm test` / `npm run test:all` | **178** | **100% GREEN** |

---

## 16. Author & License

- **Author:** Meet Maru (`meetmaru@datastraw.io`)  
- **Project:** Datastraw Tech Internship Assessment  
- **License:** Proprietary & Confidential for Datastraw Evaluation
```
