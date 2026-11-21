# UI/UX Design Specification Document

**Project:** Datastraw Tech Internship Assessment  
**Product:** Smart Roster Management System  
**Version:** 1.0.0  
**Author:** Meet Maru  
**Design Standard:** WCAG 2.2 AA Compliant | Quiet Motion Level  

---

## 1. Executive Summary & Design Philosophy

The **Smart Roster Management System** is an operational planning tool built specifically for Operations Managers, Pod Leads, and Operational Analysts handling high-density workforce schedules.

### Core Design Philosophy
An enterprise operations interface fails in two ways: it is either **unusable** due to visual clutter, or **generic** through superficial aesthetic trends that hinder fast decision-making. 

Our interface is built on **high information density, immediate legibility, zero decorative fluff, and deterministic feedback**. Every visual element performs a specific operational duty:
- **It is not a decorative dashboard, it is an operational control matrix.**
- **It is not a collection of cards, it is a high-density, real-time schedule grid.**
- **It is not styled with AI clichés, it is derived directly from operational constraints.**

---

## 2. Target Users & Operational Personas

### 2.1 Operations Manager (Primary User)
- **Mental Model:** Needs to scan 30+ employees across 30 days in under 5 seconds, identify all coverage gaps, and resolve them before publishing.
- **Key Interactions:** 1-click benchmark seeding, global deterministic roster generation, conflict inspection via slide-over drawer, 1-click backup reassignment, final publication gatekeeper.

### 2.2 Pod Lead (Supervisory User)
- **Mental Model:** Focuses strictly on their operational pod (Pod Alpha, Beta, or Gamma), monitoring daily attendance, planned leaves, and brand coverage.
- **Key Interactions:** Pod-scoped matrix filtering, reviewing leave requests, evaluating floater allocations.

### 2.3 Operational Employee (Individual Contributor)
- **Mental Model:** Needs immediate clarity on upcoming shifts, assigned brands, designated weekly offs, and planned leave approvals.
- **Key Interactions:** Viewing individual calendar cards, checking reassigned override duties.

---

## 3. The 30 Mandatory Design Directives

The user interface strictly adheres to 30 explicit design directives:

| # | Directive | Implementation in Codebase |
| --- | --- | --- |
| 1 | **Terminal Window** | Dedicated `TerminalWindow` component with a monospace console prompt (`>_`) logging solver traces, constraint evaluations, and atomic reassignment steps in real time. |
| 2 | **"It's not x, it's y" copy style** | Purposeful operational messaging throughout the header and cards (e.g. *"It is not a random scheduler, it is deterministic constraint enforcement"*). |
| 3 | **No checkmark bullets** | Lists use clean typographic numbers (`01.`, `02.`) or structured key-value labels instead of checkmark icons. |
| 4 | **Enterprise Dashboard Hierarchy** | Clean operational command layout focusing exclusively on workforce scheduling, conflict detection, and audit transparency. |
| 5 | **Real Product Demos** | Interactive benchmark simulation of E01's 12 November leave request, gap detection on Brand A, and automatic local repair with E09. |
| 6 | **No soft corner radius** | Hard geometric structure with sharp 0px corners (`rounded-none` / `border-radius: 0px !important`). |
| 7 | **No purple and black** | Zero purple/black dark themes. Uses a clean, pure white canvas with neutral slate borders. |
| 8 | **No skeleton loaders** | Clean text loading indicators or minimal spinners; no animated skeleton shimmer blocks. |
| 9 | **No radial orbs** | Solid backgrounds with zero ambient blurry orbs or glow spots. |
| 10 | **No dot grids** | Completely solid, flat white background canvas without background dot grids. |
| 11 | **No sparkle icons** | Strictly zero AI sparkles (✨) or magic wands. |
| 12 | **Animated arrows** | Subtle, CSS-animated arrow component (`IconAnimatedArrow`) that shifts right on button hover (`group-hover:translate-x-1`). |
| 13 | **No TOS** | Omitted generic terms-of-service boilerplate. |
| 14 | **Privacy Policy** | Dedicated `PrivacyPolicyModal` detailing RBAC data isolation, immutable audit logging, and data governance. |
| 15 | **Hover animations** | Crisp, tactile hover transitions on table rows (`hover:bg-gray-50`), buttons, and view tabs. |
| 16 | **No neon colors** | Muted, professional, high-contrast palette; zero neon greens, cyans, or hot pinks. |
| 17 | **No harsh gradients** | Completely flat, solid fills with crisp 1px borders. |
| 18 | **No Lucide icons** | Custom, lightweight, hand-crafted inline SVG icons in `src/components/icons.tsx`. |
| 19 | **Pure white background** | `#ffffff` canvas with light gray border dividers (`#e5e7eb` / `#d1d5db`). |
| 20 | **No rainbow coloring** | Semantic discipline: status communicates meaning through green, red, amber, and slate only. |
| 21 | **No drop shadows** | Completely flat design; visual boundaries are established with `1px solid` border dividers instead of box shadows (`box-shadow: none !important`). |
| 22 | **Feature cards in a row** | All feature sections and tiers are laid out in horizontal equal-height card rows. |
| 23 | **No emojis** | Zero emojis across the entire interface. |
| 24 | **No liquid glass** | No glassmorphism, background blurs, or translucent frosted surfaces. |
| 25 | **No em dashes** | Hyphens (`-`) or colons are used exclusively instead of em dashes (`—`). |
| 26 | **No Inter / Geist / Space Grotesk** | Native system font stack: `system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`. |
| 27 | **No colored left stripe** | Cards use clean, uniform 1px perimeter borders without artificial left accent bars. |
| 28 | **No fake testimonials** | All operational metrics reflect real CX staffing ratios and Datastraw assessment parameters. |
| 29 | **No bento grids** | Structured, symmetrical operational tables, matrices, and horizontal card decks. |
| 30 | **Basic pastel colors** | Soft, high-contrast pastel fills for all status badges and schedule chips. |

---

## 4. Color System & Semantic Tokens

All color combinations satisfy the **WCAG 2.2 AA** accessibility standard with a minimum contrast ratio of **4.5:1** for normal text and **3:1** for UI components.

### 4.1 Palette Tokens

| Semantic Token | Background | Text Color | Border Color | Meaning & Usage |
| --- | --- | --- | --- | --- |
| `--status-working` | `#dcfce7` (Pastel Green) | `#166534` (Deep Forest) | `#bbf7d0` | Regular scheduled working shift |
| `--status-override` | `#e0f2fe` (Pastel Blue) | `#0369a1` (Deep Blue) | `#bae6fd` | Reassigned backup resource override |
| `--status-critical` | `#fee2e2` (Pastel Red) | `#991b1b` (Deep Crimson) | `#fecaca` | Critical coverage gap (0 available staff) |
| `--status-leave` | `#fef3c7` (Pastel Amber) | `#92400e` (Deep Amber) | `#fde68a` | Approved personal / sick leave |
| `--status-off` | `#f1f5f9` (Pastel Slate) | `#334155` (Slate Gray) | `#e2e8f0` | Scheduled weekly off |
| `--status-holiday` | `#e0f2fe` (Pastel Blue) | `#0369a1` (Deep Blue) | `#bae6fd` | Recognized public holiday |
| `--canvas` | `#ffffff` (Pure White) | `#0f172a` (Slate 900) | `#d1d5db` | Page background canvas |
| `--surface-subtle` | `#f8fafc` (Gray 50) | `#334155` (Slate 700) | `#e5e7eb` | Table headers and metric card fills |

> [!IMPORTANT]
> **Accessibility Rule:** State is never communicated by color alone. Every status chip incorporates:
> 1. A distinct high-contrast text label (`W`, `R: BR-A`, `LV`, `WO`, `PH`, `0/1`).
> 2. Semantic pastel background and border.
> 3. An explanatory title/tooltip detailing the employee, brand, process, and date.

---

## 5. Typography & Spatial Grid

### 5.1 Font Stack
To ensure instant native rendering with zero layout shift and no third-party webfont dependencies:
- **Primary Body & Headings:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- **Tabular Data & Terminal Logs:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace`

### 5.2 Typographic Hierarchy
- **Header Title:** `20px` (font-black, uppercase, tracking-tight)
- **Section Headings:** `16px` (font-bold, uppercase, tracking-tight)
- **KPI Metrics:** `24px` (font-black, tabular figures)
- **Table Cell Data:** `11px` (font-mono, font-medium)
- **Helper & Meta Text:** `10px`–`11px` (font-mono, text-gray-500)

### 5.3 Spatial Layout (4px Base Grid)
- Standard margins and paddings: `12px` (p-3), `16px` (p-4), `24px` (p-6).
- Card gaps: `12px`–`16px`.
- Table cell height: Compact `28px` to fit 30+ employees on a standard 1080p viewport without vertical scrolling fatigue.

---

## 6. Detailed Specifications of the Five Roster Views

```
+---------------------------------------------------------------------------------------------+
|                                    VIEW NAVIGATION TABS                                     |
| [1. Company-Wide]  [2. Pod-Wise]  [3. Brand-Wise]  [4. Process-Wise]  [5. Employee-Wise]     |
+---------------------------------------------------------------------------------------------+
```

### View 1: Company-Wide Master Matrix
- **Layout:** Full 30-employee rows $\times$ 30-day columns.
- **Fixed Left Columns:** Employee Name (truncate with full name on hover) + Pod Name.
- **Matrix Cells:** Display compact status badges (`W: Brand`, `LV`, `WO`, `PH`).
- **Interactive Drilldown:** Clicking any employee name instantly switches to their individual Employee-Wise card.

### View 2: Pod-Wise View
- **Layout:** Symmetrical horizontal blocks grouped by Pod Alpha, Pod Beta, and Pod Gamma.
- **Header:** Identifies Pod Lead (Rahul Sharma, Priya Patel, Amit Verma) and active personnel count.
- **Purpose:** Allows Pod Leads to inspect their team's balance without cross-pod clutter.

### View 3: Brand-Wise Health View
- **Layout:** 18 client brand rows $\times$ 30-day columns.
- **Cell Metric:** Displays daily coverage ratio (e.g. `1/1` in green for staffed, `0/1` in bright red for critical gap).
- **Process Sub-Rows:** Brands with multiple processes (e.g. Brand A CS, ACC, NDR) show individual process rows.

### View 4: Process-Wise Aggregate View
- **Layout:** Operational lines (CS, ACC, NDR, Retention) plotted against the calendar days.
- **Metrics Tracked:** Total active on-duty staff vs. detected gaps per day.

### View 5: Employee-Wise Calendar Card
- **Layout:** Detailed employee profile card with contact info, pod assignment, and weekly-off rule.
- **Monthly Grid:** 30 individual date blocks showing full shift status, assigned brand, and override status.

---

## 7. Interactive Components & Micro-Interactions

### 7.1 Slide-Over Conflict & Resolution Drawer
- **Trigger:** Clicking the red **Critical Gaps** KPI badge or "Resolve" button.
- **Content:**
  - Explanatory diagnostic: identifies the date, brand, process, and reason for the gap.
  - Candidate backup matching list: shows eligible floaters sorted by skill qualification and pod proximity.
- **Action:** 1-click **Reassign** button with animated arrow (`IconAnimatedArrow`) that atomically repairs the slot and logs an audit record.

### 7.2 Live Solver Console (Terminal Window)
- **Features:** Monospace text stream displaying real-time execution logs.
- **Log Levels:** `INFO` (blue), `SUCCESS` (green), `WARN` (amber), `ERROR` (red).
- **Controls:** Event counter and "Clear Output" button.

### 7.3 Role-Based Authentication & Google Login Modal
- **Trigger:** Clicking **Sign In** in the top navigation header or when an unauthenticated user attempts a restricted action.
- **Modes:** 
  1. **1-Click Evaluator Quick Logins:** Instant access as Operations Manager, Pod Lead (Rahul Sharma), or Employee (Ananya Roy).
  2. **Google Sign-In:** Clean, official Google 'G' SVG button with single-click OAuth simulation.
  3. **Email & Password Authentication:** Form supporting login and registration with explicit role selection.
- **Active User Session:** Displays user name, email, high-contrast role badge, and a **Logout** button that terminates the session.
- **Dynamic Current Month:** Roster engine automatically queries and renders the active current year and month (e.g. `2026-11`).

### 7.4 Role-Based Feature Matrix (RBAC UI Architecture)
The user interface automatically reorganizes all toolbars, navigation trees, KPI counters, and interactive modals based strictly on the authenticated role:

| Feature / Capability | Operations Manager | Pod Lead (e.g. Rahul Sharma) | Employee (e.g. Ananya Roy) |
| --- | --- | --- | --- |
| **Default Landing Matrix** | Company Master Matrix | Pod-Wise Matrix (Filtered to Pod Alpha) | My Schedule (Employee Inspector) |
| **Top Action Toolbar** | Load Benchmark Data, Generate Roster, Publish Roster, Leaves, Swaps | Generate Pod Roster, Leaves (Pod), Swaps (Pod); Publish & Seed hidden | My Leaves, My Swaps; Management buttons hidden |
| **Navigation Sidebar Matrices** | All 5 Core Matrices | Pod Matrix, Company Master, Brand, Process, Staff | My Schedule (Inspector), Company Roster (Read-Only) |
| **Navigation Sidebar Operations** | Full Operations Suite (8 tools) | SLA Analytics, Swaps, Dispatch Sheet, Leaves, Conflicts, Console | My Swaps & Comp-Offs, My Leave Requests only |
| **Slot Inspector / Override** | Full Slot Override & Multi-Shift Timing Dialog | Full Slot Override & Multi-Shift Timing Dialog | Read-Only Slot Inspector (Edit controls disabled) |
| **Conflict Center** | Full Atomic Backup Reassignment & Gaps Drawer | Reassign Backups within Pod | Read-Only View (Reassign buttons hidden) |
| **Leave Management** | Company-wide Approval, Rejection & Submission | Pod-scoped Approval, Rejection & Submission | Submit for Self Only (Target locked); Approval hidden |
| **Shift Swaps & Comp-Offs** | Approve, Reject, Propose, Grant Credits | Approve, Reject, Propose, Grant Credits | Propose for Self Only; Redeem Comp-Offs; Grant hidden |
| **Dashboard Top KPI Cards** | Personnel (30), Brands (18), Pods (3), Month, Gaps, State | Pod Personnel (10), Pod Brands (6), Lead, Month, Pod Gaps, State | My Profile, Primary Brand, Shifts, Rest Days, Leaves, Comp-Off Balance |
| **Solver Console Stream** | Real-time live execution trace | Real-time live execution trace | Hidden (Eliminates non-operational noise) |
| **Header Role Switcher** | Instant 1-click switcher pill | Instant 1-click switcher pill | Instant 1-click switcher pill |
| **Role Scope Banner** | Blue Scope Banner (All 3 Pods) | Amber Scope Banner (Pod Alpha) | Gray Scope Banner (Personal Schedule) |

### 7.5 Automated Visual Screenshots & Verification Evidence
A dedicated headless Chrome test suite (`scripts/test-ui-screenshots.mjs` and `scripts/test-range-screenshot.mjs`) generates pixel-perfect visual proof of each workspace:
1. `public/screenshots/01_login_gateway.png`: Enterprise Login & SSO Gateway with Google Workspace button & 3 role demo launchers.
2. `public/screenshots/02_ops_manager_dashboard.png`: Operations Manager console showing 5 matrices, 8 ops tools, and publication authority.
3. `public/screenshots/03_pod_lead_dashboard.png`: Pod Lead console showing Pod Alpha scoping, pod generation, and publication gating.
4. `public/screenshots/04_employee_dashboard.png`: Employee self-service workspace showing personal KPIs, `[YOU]` badge, and locked managerial buttons.
5. `public/screenshots/05_employee_readonly_slot.png`: Employee Read-Only Slot Inspector with editing strictly disabled.
6. `public/screenshots/06_master_matrix_range_slices.png`: Company Master Matrix featuring interactive Range Slices bar (`1–10`, `11–20`, `21–30`, `All`, `Custom`) and staff count indicators.
7. `public/screenshots/07_employee_management_preview_modal.png`: Dual-column Employee Management & Range Preview Modal displaying sliced employee list, detailed profile inspector, live monthly KPIs, and 30-day shift timeline.

### 7.6 Employee Range Slicing & Detail Preview Architecture
- **Problem Solved:** Viewing 30+ employees with 30 day columns causes vertical cognitive fatigue. Range slicing provides logical operational boundaries aligned with Pod structures:
  - `1–10 [Alpha]`: Pod Alpha staff (E01 to E10).
  - `11–20 [Beta]`: Pod Beta staff (E11 to E20).
  - `21–30 [Gamma]`: Pod Gamma staff (E21 to E30).
  - `All 1–30`: Global overview.
  - `Custom Range`: User-defined bounds (`From [X] To [Y]`).
- **Detail Preview Panel:** A dedicated side inspector displaying:
  - Personal details: Code, name, email, phone, status pill.
  - Operational context: Pod supervisor, standard weekly off day.
  - Active month KPIs: Scheduled shifts, weekly offs, approved leaves, comp-off credits.
  - Competency badges: Verified process qualifications (`CS`, `NDR`, `ACC`, `RETENTION`).
  - Dedicated primary account assignment.
  - Mini 30-day shift timeline visualization with color-coded day pills.
- **Manager Workforce CRUD:** Role-gated tab allowing Operations Manager to register new staff or edit existing personnel directly within the operational flow.

---

## 8. Motion & Micro-Interaction Guidelines

Adheres to the **Quiet Motion Level** defined in the UI/UX design standard:
1. **Duration:** Micro-interactions (hover, active) run between `120ms` and `200ms`.
2. **Easing:** Standard `ease-out` for transitions; layout properties are never animated to eliminate Cumulative Layout Shift (CLS = 0).
3. **Accessibility:** Strict support for `prefers-reduced-motion`. In reduced-motion mode, all elements render in their final, fully visible static state without transition delays.

---

## 9. Verification & Compliance Checklist

- [x] Pure white background (`#ffffff`) across all pages.
- [x] Sharp 0px corners (`rounded-none` / 0px radius).
- [x] Flat visual structure with zero drop shadows.
- [x] Strictly zero emojis and zero sparkle icons.
- [x] Custom hand-crafted inline SVGs (no Lucide icons package).
- [x] Monospace live solver terminal window implemented.
- [x] Dedicated collapsible navigation sidebar with instant view switching.
- [x] Real product demo simulation for the Nov 12 leave scenario.
- [x] Five specialized operational views (Company, Pod, Brand, Process, Employee).
- [x] WCAG 2.2 AA contrast compliance ($\ge 4.5:1$ text contrast).
- [x] Native system font stack (no Inter, Geist, or Space Grotesk).
- [x] Author metadata attributed to **Meet Maru**.
