# System Design Document (SDD)
# Smart Roster Management System

**Project:** Datastraw Tech Internship Assessment  
**Product:** Smart Roster Management System  
**Version:** 1.0.0  
**Author:** Meet Maru  
**Status:** Approved for Implementation  

---

## 1. Executive Summary & Architectural Overview

The **Smart Roster Management System** is an enterprise-grade, browser-based workforce scheduling platform engineered for customer experience (CX) and operational companies. It solves multi-client, multi-process workforce planning where employees manage multiple brands and processes with heterogeneous operational operating calendars (Type A 365-day, Type B public holiday off, Type C Sunday & holiday off).

### 1.1 Core Architectural Principles
1. **Deterministic Constraint-Based Engine:** Roster generation and conflict detection rely on provable, deterministic rule-satisfaction algorithms rather than stochastic LLM generation. This guarantees 100% reproducibility, zero hallucination, and instant mathematical explainability.
2. **Atomic & Incremental Change Management:** When an employee becomes unavailable (e.g., approved leave), the system isolates the affected dates, brands, and processes. It calculates candidate replacements and repairs the roster locally without destructive full-month regenerations.
3. **High-Density, Accessible UI/UX (Quiet Motion):** Tailored specifically for Operations Managers and Pod Leads handling dense matrix data. Adheres strictly to WCAG 2.2 AA accessibility standards, responsive tabular viewports, and deliberate semantic color-coding.
4. **Defense-in-Depth Security:** Aligned with OWASP Top 10 API Security (2023), robust RFC 7519 JWT session lifecycle, strict Role-Based Access Control (RBAC), Broken Object Level Authorization (BOLA) prevention, and append-only audit logging.

```
+----------------------------------------------------------------------------------------------------+
|                                    PRESENTATION LAYER (Next.js)                                    |
|  +-------------------+  +-------------------+  +---------------------+  +-----------------------+  |
|  | Company Matrix    |  | Pod-Wise View     |  | Brand-Wise View     |  | Process & Emp Views   |  |
|  +-------------------+  +-------------------+  +---------------------+  +-----------------------+  |
|  +-----------------------------------------------------------------------------------------------+  |
|  | State & Interaction: Filter Bar | Conflict Drawer | Backup Resolver Modal | Audit History     |  |
+--+-----------------------------------------------------------------------------------------------+--+
                                                |  HTTPS / REST / JSON
+-----------------------------------------------+----------------------------------------------------+
|                                     API & SECURITY LAYER                                           |
|  +-------------------+  +-------------------+  +---------------------+  +-----------------------+  |
|  | JWT Auth & Cookie |  | RBAC Middleware   |  | Zod Schema Validator|  | Rate Limiter & Helmet |  |
|  | (RFC 7519 / HS256)|  | (BOLA / BFLA Prev)|  | (Mass-Assign Defense|  | (OWASP Top 10 API)    |  |
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
|  - In-Memory / Local Emulator Fallback Adapter (Instant Zero-Config Development & Testing)         |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Domain Model & Data Schemas

The database schema is modeled to preserve clean relational integrity between organizational units, operating constraints, and temporal schedules.

```
       +--------------------+
       |        Pod         |
       +--------------------+
         | 1              1 |
         | has            | manages
         | N              | N
+------------------+    +------------------+
|     Employee     |    |      Brand       |
+------------------+    +------------------+
         | 1              | 1
         | works          | owns
         | N              | N
+------------------------------------------+       +-------------------+
|               Assignment                 |------>|      Process      |
| (employeeId, brandId, processId, primary)|       +-------------------+
+------------------------------------------+                 | 1
                      |                                      | dictates
                      v                                      v
       +------------------------------+            +-------------------+
       |         RosterEntry          |<-----------|   OperatingRule   |
       | (date, status, isOverride)   |            |  (Type A, B, C)   |
       +------------------------------+            +-------------------+
```

### 2.1 Entity Definitions & TypeScript Specifications

#### 1. User & Authentication
```typescript
export enum UserRole {
  OPERATIONS_MANAGER = 'OPERATIONS_MANAGER',
  POD_LEAD = 'POD_LEAD',
  EMPLOYEE = 'EMPLOYEE'
}

export interface IUser {
  _id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  employeeRef?: string; // Links to Employee entity for POD_LEAD and EMPLOYEE
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. Pod (Operational Team)
```typescript
export interface IPod {
  _id: string;
  name: string; // e.g., 'Pod Alpha', 'Pod Beta'
  code: string; // 'POD-A'
  leadEmployeeId: string; // Reference to Employee (Rahul, Priya)
  description?: string;
  createdAt: Date;
}
```

#### 3. Brand (Client Account)
```typescript
export interface IBrand {
  _id: string;
  name: string; // e.g., 'Brand A', 'Brand B'
  code: string; // 'BR-A'
  podId: string; // Pod responsible for this brand
  isSingleResource: boolean; // Flag: ~80% brands are single-resource
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
}
```

#### 4. Process (Operational Function)
```typescript
export enum OperatingCalendarType {
  TYPE_A_365 = 'TYPE_A_365',                 // Mon-Sun + Public Holidays (Full 365)
  TYPE_B_HOLIDAYS_OFF = 'TYPE_B_HOLIDAYS_OFF', // Mon-Sun, but Public Holidays OFF
  TYPE_C_SUN_HOLIDAYS_OFF = 'TYPE_C_SUN_HOLIDAYS_OFF' // Mon-Sat, Sun & Holidays OFF
}

export interface IProcess {
  _id: string;
  code: string; // 'CS', 'ACC', 'NDR', 'RETENTION'
  name: string; // Customer Support, Abandoned Cart Conversions, etc.
  description: string;
  createdAt: Date;
}
```

#### 5. Operating Rule & Minimum Staffing
```typescript
export interface IOperatingRule {
  _id: string;
  brandId: string;
  processId: string;
  calendarType: OperatingCalendarType;
  customDayOverrides?: {
    dayOfWeek: number; // 0=Sunday, 6=Saturday
    isWorking: boolean;
  }[];
  minStaffingRequired: number; // Minimum simultaneous heads required (e.g. 1 or 2)
  notes?: string;
}
```

#### 6. Employee & Assignment
```typescript
export interface IEmployee {
  _id: string;
  employeeCode: string; // 'E01', 'E02', ..., 'E30'
  fullName: string;
  email: string;
  phone: string;
  podId: string;
  status: 'ACTIVE' | 'ON_NOTICE' | 'INACTIVE';
  weeklyOffPreference: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  qualifiedProcessIds: string[]; // Skills inventory (e.g., ['CS', 'ACC', 'NDR'])
  createdAt: Date;
}

export interface IAssignment {
  _id: string;
  employeeId: string;
  brandId: string;
  processId: string;
  isPrimary: boolean; // True if this employee is the default owner
  allocationWeight: number; // e.g., 1.0 (Full), 0.5 (Shared)
  createdAt: Date;
}
```

#### 7. Availability, Leave, Comp-Off, and Public Holiday
```typescript
export enum LeaveType {
  PLANNED_LEAVE = 'PLANNED_LEAVE',
  SICK_LEAVE = 'SICK_LEAVE',
  COMP_OFF = 'COMP_OFF',
  EMERGENCY = 'EMERGENCY'
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface ILeaveRequest {
  _id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: LeaveStatus;
  approvedBy?: string;
  reason?: string;
}

export interface IPublicHoliday {
  _id: string;
  date: string; // YYYY-MM-DD
  name: string; // e.g., 'Diwali', 'New Year'
  appliesToAllPods: boolean;
  affectedPodIds?: string[];
}
```

#### 8. Roster, Entries, Conflicts & Audit Log
```typescript
export enum RosterStatus {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export enum ScheduleStatus {
  WORKING = 'WORKING',
  WEEKLY_OFF = 'WEEKLY_OFF',
  APPROVED_LEAVE = 'APPROVED_LEAVE',
  COMP_OFF = 'COMP_OFF',
  PUBLIC_HOLIDAY = 'PUBLIC_HOLIDAY',
  UNASSIGNED = 'UNASSIGNED'
}

export interface IRoster {
  _id: string;
  monthYear: string; // e.g., '2026-11'
  podId?: string;    // Null for company-wide roster
  status: RosterStatus;
  version: number;
  totalConflicts: {
    critical: number;
    warning: number;
  };
  generatedAt: Date;
  publishedAt?: Date;
  publishedBy?: string;
}

export interface IRosterEntry {
  _id: string;
  rosterId: string;
  date: string; // YYYY-MM-DD
  employeeId: string;
  brandId: string;
  processId: string;
  status: ScheduleStatus;
  isOverride: boolean;
  originalEmployeeId?: string; // For backup reassignments (e.g., E09 replacing E01)
  overrideReason?: string;
}

export enum ConflictSeverity {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING'
}

export enum ConflictType {
  COVERAGE_GAP = 'COVERAGE_GAP',                     // 0 staff available when >= 1 required
  UNDERSTAFFED = 'UNDERSTAFFED',                     // Staff available < min required
  LEAVE_COLLISION = 'LEAVE_COLLISION',               // Employee assigned while on approved leave
  WEEKLY_OFF_COLLISION = 'WEEKLY_OFF_COLLISION',     // Weekly off causes unstaffed process
  CROSS_BRAND_COLLISION = 'CROSS_BRAND_COLLISION',   // Conflicting multi-brand hours/incompatibility
  AVAILABILITY_VIOLATION = 'AVAILABILITY_VIOLATION'  // Assigned outside working eligibility
}

export interface IConflict {
  _id: string;
  rosterId: string;
  date: string;
  brandId: string;
  processId: string;
  employeeId?: string;
  type: ConflictType;
  severity: ConflictSeverity;
  requiredStaffing: number;
  availableStaffing: number;
  description: string;
  suggestedAction: {
    recommendedEmployeeIds: string[];
    actionType: 'REASSIGN_BACKUP' | 'SWAP_WEEKLY_OFF' | 'OVERRIDE_ALLOW';
    rationale: string;
  };
}

export interface IAuditLog {
  _id: string;
  rosterId: string;
  timestamp: Date;
  userId: string;
  userRole: UserRole;
  action: 'GENERATE' | 'EDIT_SLOT' | 'REASSIGN_BACKUP' | 'PUBLISH' | 'OVERRIDE';
  targetDate: string;
  affectedBrandId?: string;
  affectedProcessId?: string;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  reason: string;
}
```

---

## 3. Deterministic Scheduling & Validation Engine

### 3.1 Mathematical Formulation of the Scheduling Problem
Let:
- $D = \{d_1, d_2, \dots, d_T\}$ be the set of days in the month (e.g. $T = 30$).
- $E = \{e_1, e_2, \dots, e_N\}$ be the active workforce ($N \ge 30$).
- $B = \{b_1, b_2, \dots, b_M\}$ be the brands.
- $P = \{p_1, p_2, \dots, p_K\}$ be the operational processes.
- $R(b, p, d) \in \{0, 1\}$ indicate if process $p$ of brand $b$ requires operations on day $d$ under its `OperatingRule`.
- $M(b, p) \in \mathbb{N}_{\ge 1}$ be the minimum staffing requirement when active.
- $L(e, d) \in \{0, 1\}$ indicate whether employee $e$ has approved leave or comp-off on day $d$.
- $W(e, d) \in \{0, 1\}$ indicate whether day $d$ is employee $e$'s designated weekly off.

### 3.2 Constraints

#### Hard Constraints (Violation = `CRITICAL` Conflict)
1. **Leave Inviolability:** If $L(e, d) = 1$, employee $e$ cannot be assigned `WORKING` to any $(b, p)$ on date $d$.
2. **Coverage Sufficiency:** For every active brand-process $(b, p)$ where $R(b, p, d) = 1$, the count of available assigned employees must satisfy:
   $$\sum_{e \in E} \text{Assigned}(e, b, p, d) \ge M(b, p)$$
3. **Single Shift Capacity:** An employee cannot exceed their maximum daily allocation across incompatible brand-process duties (preventing cross-brand collisions).
4. **Valid Assignment & Competency:** An employee $e$ can only be assigned to $(b, p)$ if $e$ possesses the required process qualification ($p \in e.\text{qualifiedProcessIds}$).

#### Soft Constraints (Violation = `WARNING` Conflict / Optimization Penalty)
1. **Weekly-Off Preference:** Respect the employee's preferred day of the week unless operational coverage requires a floating swap.
2. **Workload Balance:** Equalize working days across shared resources (target: 22–24 working days/month).
3. **Single-Resource Protection:** Avoid swapping dedicated primary brand owners unless necessitated by leave/unavailability.

### 3.3 Two-Phase Deterministic Generation Algorithm

```
+-----------------------------------------------------------------------------+
| PHASE 1: REQUIREMENT MATRIX & BASELINE MASKING                             |
| 1. Generate Calendar Matrix: For each day d in Month, evaluate all (b, p)   |
|    calendars (Type A, B, C) -> produce RequiredSlots(b, p, d).             |
| 2. Generate Employee Availability Matrix: Mask out Approved Leaves,         |
|    Comp-Offs, and Preferred Weekly Offs for all e in E.                     |
+-----------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
| PHASE 2: PRIORITY ALLOCATION (DEDICATED FIRST, THEN SHARED)                |
| 3. Step A: Allocate ~80% Single-Resource Primary Owners:                    |
|    If e is primary for b, assign e to (b, p, d) on all working days.         |
|    - If d is e's weekly-off but (b, p) is 365-day:                         |
|      Tag as "Weekly Off Coverage Gap" -> trigger Phase 3 Candidate Match.   |
| 4. Step B: Allocate Multi-Resource Shared Brands (e.g. Brands C & D):       |
|    For each required slot, sort eligible pool by:                           |
|    - Primary assignment status                                              |
|    - Lowest current monthly shift count (workload fairness)                 |
|    - Non-conflicting availability on d                                      |
+-----------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
| PHASE 3: CONFLICT IDENTIFICATION & CANDIDATE RESOLUTION                     |
| 5. Run Validation Pass over all (b, p, d):                                  |
|    - Available Staff < Required -> emit Conflict (COVERAGE_GAP)             |
|    - Find eligible candidates: e_backup where:                             |
|        * e_backup is qualified for process p                               |
|        * e_backup is available on date d (not on leave, not weekly off)     |
|        * e_backup has no conflicting primary obligation on date d          |
|    - Attach top 3 candidates to Conflict metadata.                          |
+-----------------------------------------------------------------------------+
```

---

## 4. Change Management & Unavailability Handling

### 4.1 Step-by-Step Scenario: E01 Approved Leave on Nov 12
This is Datastraw's primary assessment benchmark scenario:

1. **Baseline State:**
   - Employee **E01** is the sole dedicated resource assigned to **Brand A** handling 3 processes:
     - `Customer Support (CS)`: Type A (365 days / Mon–Sun + Holiday) -> Required: 1.
     - `Abandoned Cart Conversions (ACC)`: Type C (Mon–Sat, Sun & Holiday OFF) -> Required: 0 or 1.
     - `Non-Delivery Report Management (NDR)`: Type A (365 days / Mon–Sun + Holiday) -> Required: 1.
2. **Leave Ingestion:**
   - On **12 November 2026**, E01 submits an approved leave request.
   - Status of E01 on Nov 12 flips from `WORKING` to `APPROVED_LEAVE`.
3. **Impact Isolation Engine:**
   - The system detects E01's removal from Brand A on Nov 12.
   - Evaluates Brand A operating calendar on Nov 12 (assume a regular weekday):
     - `CS`: Required = 1, Available = 0 $\rightarrow$ **CRITICAL COVERAGE GAP**.
     - `NDR`: Required = 1, Available = 0 $\rightarrow$ **CRITICAL COVERAGE GAP**.
     - `ACC`: If non-working or deprioritized, Required = 0.
   - Total detected gaps: **2 Critical Conflicts**.
4. **Eligible Candidate Search Algorithm:**
   - Query filter:
     ```typescript
     const candidates = await Employee.find({
       _id: { $ne: 'E01' },
       status: 'ACTIVE',
       podId: 'POD_ALPHA', // Preferred same pod first, then cross-pod
       qualifiedProcessIds: { $all: ['CS', 'NDR'] },
       // Availability check for 2026-11-12:
       _id: { $nin: leavesOnDateNov12 },
       weeklyOffPreference: { $ne: dayOfWeek(Nov12) },
       // Conflict check: Not already assigned to an essential single-resource brand
       _id: { $nin: busySingleResourceEmployeesOnNov12 }
     });
     ```
   - Matches: **E09** (Trained in CS & NDR, shared resource in Pod Alpha, available on Nov 12).
5. **Atomic Resolution & Incremental Re-validation:**
   - Operations Manager clicks **"Reassign E09 to Brand A for Nov 12"**.
   - System updates `RosterEntry` for `date: 2026-11-12, brand: Brand A`:
     - Creates override slot with `employeeId: E09`, `originalEmployeeId: E01`, `isOverride: true`.
     - Re-validates only Nov 12 Brand A coverage $\rightarrow$ CS: 1/1 Covered, NDR: 1/1 Covered.
     - Severity drops from `CRITICAL` to `RESOLVED`.
     - Appends entry to `AuditLog`.
   - **Crucial Rule:** Unaffected dates (Nov 1–11, Nov 13–30) and other brands remain untouched.

---

## 5. UI/UX Design System (Guided by `ui-ux-design` Skill)

### 5.1 Design Brief & Direction
- **Audience:** Operations Managers, Pod Leads, and Operational Analysts.
- **Job:** Fast scanning of 30+ employees over 30 days, instant spot-check of coverage gaps, one-click resolution.
- **Tone:** High-density, professional, reliable, zero decorative fluff.
- **Motion Level:** **Quiet** (120ms–200ms transitions for dropdowns and drawers, zero disruptive layout shifts, instantaneous matrix updates).
- **Accessibility Floor:** WCAG 2.2 AA compliant; minimum 4.5:1 text contrast; never communicate state by color alone (status chips combine icon, label, and high-contrast color); 24px minimum touch targets.

### 5.2 Color Tokens & Semantic Hierarchy

| Token | Hex | Semantic Meaning |
| --- | --- | --- |
| `--bg-canvas` | `#090d16` / `#ffffff` | Primary background canvas |
| `--bg-surface` | `#111827` / `#f8fafc` | Card & table header container |
| `--border-subtle` | `#1f2937` / `#e2e8f0` | Grid line dividers |
| `--text-primary` | `#f9fafb` / `#0f172a` | High-contrast body & headings |
| `--text-muted` | `#9ca3af` / `#64748b` | Metadata, timestamps, helper text |
| `--accent-brand` | `#2563eb` | Primary call to action, active tab indicator |
| `--status-covered` | `#059669` (text: `#10b981`) | Fully staffed / Valid |
| `--status-critical` | `#dc2626` (text: `#ef4444`) | Coverage Gap (0 staff) / Hard Collision |
| `--status-warning` | `#d97706` (text: `#f59e0b`) | Understaffed / Preference Violation |
| `--status-leave` | `#7c3aed` (text: `#8b5cf6`) | Approved Leave / Comp-Off |
| `--status-off` | `#4b5563` (text: `#9ca3af`) | Weekly Off / Public Holiday |

### 5.4 Mandatory UI/UX Rules & Aesthetic Specification (User Directives)

The UI must strictly obey the following 30 design rules:
1. **Terminal window:** Include an interactive/live terminal console window for scheduling execution output and diagnostic traces.
2. **"It's not x, it's y" copy style:** Use purposeful, product-specific problem/solution framing (e.g. "It's not just a calendar, it's deterministic constraint enforcement").
3. **No checkmark bullets:** Use clean typographic lists or numbered steps, never checkmark bullet icons.
4. **Collapsible Navigation Sidebar:** Left navigation rail with quick `<` / `>` toggle for all 5 matrices, operations, and audit trail.
5. **Real product demos:** Interactive simulations of real scheduling workflows, notably the Nov 12 leave conflict resolution.
6. **No soft corner radius:** Use sharp corners (`rounded-none` or `rounded-xs` / 0–2px max). Flat geometric structure.
7. **No purple and black:** Strictly avoid purple/black dark themes.
8. **No skeleton loaders:** Use clear text indicators or clean minimal spinners.
9. **No radial orbs:** Zero decorative orbs, glows, or ambient blur spots.
10. **No dot grids:** Clean solid backgrounds without fake background dot grids.
11. **No sparkle icons:** Absolutely zero AI sparkles (✨) or magic wands.
12. **Animated arrows:** Subtle, crisp animated CSS arrows (`->`) for workflow progression and state transitions.
13. **No TOS:** Omit generic terms of service boilerplate.
14. **Privacy policy:** Dedicated privacy and data governance modal / link.
15. **Hover animations:** Crisp, tactile state feedback on buttons, matrix cells, and tabs.
16. **No neon colors:** Zero eye-straining neon greens, cyans, or hot pinks.
17. **No harsh gradients:** Flat, solid fills with clean border definitions.
18. **No Lucide icons:** Use clean, hand-crafted, lightweight inline SVG icons.
19. **Pure white background:** Clean `#ffffff` canvas with light crisp borders (`#e5e7eb` / `#d1d5db`).
20. **No rainbow coloring:** Strict semantic restraint (covered, gap, warning, off).
21. **No drop shadows:** Flat design language; use clean `1px solid` borders for separation instead of box shadows.
22. **Feature cards in a row:** Clean horizontal card decks with equal height columns.
23. **No emojis:** Strictly zero emojis in headers, badges, or buttons.
24. **No liquid glass:** Zero glassmorphism, backdrop blurs, or translucent frosted surfaces.
25. **No em dashes:** Never use em dashes (`—`); use hyphens (`-`) or standard colons.
26. **No Inter / Geist / Space Grotesk:** Use clean native system font stack: `system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`.
27. **No colored left stripe:** Avoid generic cards with vertical colored accent borders on the left.
28. **No fake testimonials:** All operational metrics and references are authentic to Datastraw's CX operations.
29. **No bento grids:** Use structured, symmetrical operational tables, matrices, and horizontal card decks.
30. **Use Basic pastel colors:** Soft, professional pastel fills for status indicators:
    - Covered: Pastel Green (`bg-emerald-50 text-emerald-800 border-emerald-200`)
    - Critical Gap: Pastel Red (`bg-red-50 text-red-800 border-red-200`)
    - Warning / Leave: Pastel Amber (`bg-amber-50 text-amber-800 border-amber-200`)
    - Weekly Off: Pastel Slate (`bg-gray-100 text-gray-700 border-gray-200`)
    - Primary Accent: Soft Classic Blue / Pastel Blue (`bg-blue-50 text-blue-800 border-blue-200`)

1. **Header & Operational KPI Bar:**
   - Quick counters: Total Staff (30), Brands (18), Working Today (24), Leaves (3), Critical Gaps (2), Roster Status (`DRAFT` / `PUBLISHED` Pill).
2. **Universal Filter Bar:**
   - Pod Dropdown (`All Pods`, `Pod Alpha`, `Pod Beta`, `Pod Gamma`).
   - Brand Selector & Process Multi-select.
   - Month/Year Picker with Jump-to-Today button.
   - "Show Only Conflicts" Toggle.
3. **The 5 Specialized Operational Matrices & Range Slicing:**
   - **Company-Wide Matrix:** Rows = 30 Employees, Columns = 30 Days. Matrix cells show chip indicators (`W: Brand A`, `OFF`, `LEAVE`, `ALERT`). Features interactive Range Slices bar (`1–10 [Alpha]`, `11–20 [Beta]`, `21–30 [Gamma]`, `All 1–30`, `Custom From [X] To [Y]`) to slice workforce view without vertical scroll fatigue.
   - **Pod-Wise Matrix:** Groups employees under Pod Lead headers (Rahul's team vs Priya's team).
   - **Brand-Wise Matrix:** Rows = Brands, Columns = Days. Each cell displays coverage ratio (e.g. `1/1` in green, `0/1` in bright red pulse).
   - **Process-Wise Matrix:** Filtered by CS, ACC, NDR, Retention; shows aggregate heads on duty vs required threshold.
   - **Employee-Wise Schedule Card:** Individual calendar drilldown with leave submission form and brand assignments list.
   - **Employee Management Console & Range Directory:** Dual-pane modal allowing Operations Manager to add new personnel, update profiles, and preview comprehensive employee records (profile, pod supervisor, process competencies, live monthly KPIs, and 30-day shift timeline).
4. **Slide-Out Conflict & Resolution Drawer:**
   - Opens on clicking any red conflict badge or "Resolve Conflicts" button.
   - Displays exact diagnostic: *"Brand A · Customer Support · 12 Nov: 0/1 Staff (E01 on Leave)"*.
   - Renders 1-click candidate action cards: *"Assign E09 (Pod Alpha, Qualified in CS/NDR, Available)"* $\rightarrow$ Button: **"Apply Reassignment"**.

---

## 6. Comprehensive Security Architecture (Guided by `security` Skill)

The security architecture directly addresses the risks identified in OWASP Top 10 API Security (2023) and cryptographic standards.

### 6.1 Authentication & Session Management (RFC 7519 JWT)
- **Token Format:** Signed JSON Web Tokens (JWT) using `HMAC-SHA256` (HS256) with a minimum 256-bit entropy secret key (`JWT_SECRET`).
- **Token Hardening:**
  - Strict algorithm allowlisting: explicit rejection of `alg=none` and defense against RS256/HS256 algorithm confusion.
  - Standard claim validation: `iss` (datastraw-roster), `aud` (datastraw-client), `exp` (15 minutes), `nbf`, `sub` (userId).
- **Transport Security:** Tokens transmitted in secure, `httpOnly`, `SameSite=Strict`, `Secure` cookies to eliminate client-side XSS token theft.
- **Refresh Token Rotation:** Refresh tokens stored hashed in database with single-use revocation on rotation.

### 6.2 Role-Based Access Control (RBAC) & BOLA/IDOR Prevention

| Role | Permitted Actions | Scoping / BOLA Enforcement |
| --- | --- | --- |
| `OPERATIONS_MANAGER` | All endpoints: Roster generation, rule editing, manual override, publish, audit logs. | Global system access. |
| `POD_LEAD` | View pod roster, view conflicts, suggest reassignments, view assigned employees. | Query scoped strictly to `podId === req.user.podId`. Cannot modify operating rules or publish rosters. |
| `EMPLOYEE` | View personal schedule, submit personal leave requests, view holiday calendar. | Scoped strictly to `employeeId === req.user.employeeRef`. Cannot view other employees' personal requests. |

**BOLA/IDOR Defense Implementation:**
Every entity access endpoint (e.g. `/api/leaves/:id`, `/api/rosters/:id`) executes ownership verification middleware:
```typescript
export async function verifyEmployeeOwnership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user.role === UserRole.OPERATIONS_MANAGER) return next();
  const leave = await LeaveRequest.findById(req.params.id);
  if (!leave) return res.status(404).json({ error: 'Resource not found' });
  if (req.user.role === UserRole.EMPLOYEE && leave.employeeId.toString() !== req.user.employeeRef) {
    return res.status(403).json({ error: 'Forbidden: Cannot access another employee record' });
  }
  next();
}
```

### 6.3 Input Validation & Mass-Assignment Defense
- All mutation endpoints enforce strict **Zod schemas**.
- Strips any disallowed properties (such as attempting to inject `role: 'OPERATIONS_MANAGER'` or `isOverride: true` from unauthorized callers).
- Example:
  ```typescript
  export const LeaveRequestSchema = z.object({
    leaveType: z.nativeEnum(LeaveType),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().max(250).optional()
  }).strict(); // Disallows extra fields
  ```

### 6.4 Non-Repudiation & Immutable Audit Trail
Every manual roster override, reassignment, or publication creates an immutable `AuditLog` entry capturing:
- Actor ID & IP address hash.
- Previous schedule status vs New schedule status.
- Timestamp and explicit operator rationale.

### 6.5 API Security Headers & Rate Limiting
- `Helmet.js` configuration enforcing Content-Security-Policy (CSP), `X-Content-Type-Options: nosniff`, and `HSTS`.
- Rate limiting via `express-rate-limit`:
  - Auth routes (`/api/auth/*`): 10 requests / minute (brute-force protection).
  - Scheduling engine (`/api/rosters/generate`): 5 requests / minute.
  - Standard queries: 100 requests / minute.

### 6.6 Frontend RBAC Enforcement Matrix & Enterprise Login Gateway
The client presentation layer reflects backend permissions through role-gated UI composition:
1. **Unauthenticated Session Defense:** If no user session is active (`!currentUser`), the application locks all matrices and displays the **Enterprise Role-Based Login & SSO Gateway** featuring:
   - Google Workspace SSO (`meetmaru@datastraw.io`) simulation.
   - Email & Password Login & Register tabs with demo credential shortcuts.
   - 3 Instant Role Demo Launchers (Operations Manager, Pod Lead, Employee).
2. **Operations Manager:** Full enterprise control. Can generate and publish company rosters, seed benchmark datasets, view all 5 matrices, resolve all conflicts via one-click overrides, and manage all leaves and swaps.
3. **Pod Lead:** Pod-level supervision. Can generate rosters for their assigned pod, approve/reject leaves and swaps within their pod, view pod-level SLA analytics, and resolve pod-level gaps. Cannot publish company rosters (403 Forbidden) or reset global seed data.
4. **Employee:** Self-service and personal visibility. Default landing on personal schedule (Employee Inspector) with `[YOU]` badge on matrix rows. Can submit leaves for self only and propose shift swaps with peers. Management action buttons (`Generate Roster`, `Publish Roster`, `Load Benchmark Data`), solver console traces, and slot override editing are completely hidden or rendered in read-only inspection mode.
5. **Interactive Header Switcher:** A prominent 1-click segmented switcher allows instant role toggling during demonstrations.
6. **Role Permission Scope Banner:** An ambient context banner at the top of the workspace clearly outlines active permissions and blocked actions.

### 6.7 Automated Test Coverage (107/107 Passing Tests)
The system is protected by 5 dedicated automated test suites (`npm run test:all`):
1. `scripts/test-e2e.mjs` (32 tests): Auth, benchmark seeding, deterministic solver, Day 12 shock, publication guard, E09 repair, audit trail, shift swaps, comp-off bank.
2. `scripts/test-edge-cases.mjs` (13 tests): Unqualified swap rejection, leave collision rejection, RBAC block, self-swap rejection, Brand D multi-staffing, Type C Sunday exclusions.
3. `scripts/test-advanced-features.mjs` (22 tests): Slot overrides with shift timings (`[M]`, `[A]`, `[N]`, `[G]`), Pod Alpha triple-leave stress test, cross-pod borrowing (E19 from Pod Beta), dispatch sheet dataset.
4. `scripts/test-rbac-gating.mjs` (20 tests): Manager, Pod Lead, and Employee sessions; publication gating; slot override gating; leave/swap approval gating; comp-off grant gating; employee self-service.
5. `scripts/test-ui-screenshots.mjs` (20 tests): Headless Chrome visual verification capturing 5 high-res UI screenshots in `public/screenshots/`.

---

## 7. Realistic Seed Dataset Specification (30 Employees Benchmark)

To fulfill Datastraw's internship assessment criteria, the seed data contains:

### 7.1 Organizational Distribution
- **3 Operational Pods:**
  - **Pod Alpha:** Pod Lead: Rahul Sharma (E01–E10)
  - **Pod Beta:** Pod Lead: Priya Patel (E11–E20)
  - **Pod Gamma:** Pod Lead: Amit Verma (E21–E30)
- **18 Brands:**
  - **14 Single-Resource Brands (~78%):** Dedicated to individual primary employees (e.g., Brand A $\rightarrow$ E01; Brand B $\rightarrow$ E02; Brand E $\rightarrow$ E08; Brands F–P $\rightarrow$ E11–E20).
  - **4 Multi-Resource Brands:**
    - Brand C: Shared by E03 & E04 (CS, ACC).
    - Brand D: Handled by E05, E06, E07 (CS, ACC, NDR).
    - Brand Q: Handled by E21, E22 (Retention, CS).
    - Brand R: Handled by E23, E24, E25 (CS, NDR).
  - **Eligible Shared Resource Pool:** E09, E10, E26, E27, E28, E29, E30 configured as flexible multi-skilled floaters across pods.

### 7.2 Process Calendars
- **Process 1: Customer Support (CS)** $\rightarrow$ Type A (365 Days, 7-day coverage required).
- **Process 2: Abandoned Cart Conversions (ACC)** $\rightarrow$ Type C (Mon–Sat, Sundays & Public Holidays OFF).
- **Process 3: Non-Delivery Report Management (NDR)** $\rightarrow$ Type A (365 Days, 7-day coverage required).
- **Process 4: Retention** $\rightarrow$ Type B (Mon–Sun, Public Holidays OFF).

### 7.3 Embedded Benchmark Scenario
- Seeded approved leave for **E01 on 12 November 2026**.
- Generates the exact 2-gap diagnostic on Brand A CS & NDR.
- Pre-seeds **E09** as the prime compatible recommendation in Pod Alpha.

---

## 8. Technology Stack & Implementation Roadmap

### 8.1 Technology Stack

| Layer | Choice | Rationale |
| --- | --- | --- |
| **Framework** | Next.js 14/15 (App Router) | Unified SSR + API routes, optimal bundling, server actions where appropriate |
| **Language** | TypeScript (Strict Mode) | End-to-end type safety across schemas, API payloads, and engine |
| **Database** | Firebase Firestore + Fallback Adapter | Cloud Firestore with local memory fallback adapter for zero-friction setup |
| **Authentication** | Firebase Auth + Custom JWT Session | Firebase Auth client with custom claims + RFC 7519 secure JWT session cookies |
| **Styling** | Tailwind CSS + Lucide Icons | Rapid design token execution adhering to the `ui-ux-design` specification |
| **UI Components** | Radix UI / custom shadcn primitives | Unstyled, fully accessible (WCAG AA) keyboard-navigable components |
| **Validation** | Zod | Runtime schema validation and defense against mass assignment |
| **Charts & Data** | Recharts / Custom CSS Grid Matrix | Native virtualized grid rendering for 30x30 scheduling cells |

### 8.2 Prioritized Development Plan

```
+-----------------------------------------------------------------------------------+
| SPRINT 1: Core Domain Models & Seed Dataset (Priority: Critical)                  |
| - Setup project scaffold with Next.js App Router, TypeScript, and Tailwind        |
| - Implement Mongoose models (User, Employee, Pod, Brand, Process, Assignment, etc)|
| - Build comprehensive seed script generating the 30-employee benchmark dataset   |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| SPRINT 2: Deterministic Scheduling & Conflict Validation Engine (Priority: Crit)  |
| - Implement Calendar Type A, B, C date-rule evaluator                             |
| - Build 2-phase deterministic generation algorithm                                |
| - Build hard constraint verifier & conflict classifier (Critical vs Warning)      |
| - Write unit tests verifying zero coverage gaps on sample dates                   |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| SPRINT 3: Change Management & Dynamic Backup Resolver (Priority: Critical)        |
| - Build candidate matcher for unavailable employees                               |
| - Implement atomic slot override & incremental re-validation API                  |
| - Verify the E01 (Nov 12) leave scenario end-to-end                               |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| SPRINT 4: Security Hardening & RBAC (Priority: High)                              |
| - Implement RFC 7519 JWT auth with secure cookies                                  |
| - Add RBAC and BOLA prevention middleware                                         |
| - Add Zod validation on all mutation endpoints & rate limiting                    |
| - Wire up immutable AuditLog collection                                           |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| SPRINT 5: Operations Dashboard & 5 Interactive Matrix Views (Priority: High)      |
| - Build High-Density UI Header with real-time KPI counters                        |
| - Implement Company, Pod, Brand, Process, and Employee roster views               |
| - Build Conflict Resolution Slide-over Drawer with 1-click replacement buttons    |
| - Add CSV / PDF Export utilities and Audit Log visualizer                         |
+-----------------------------------------------------------------------------------+
```
