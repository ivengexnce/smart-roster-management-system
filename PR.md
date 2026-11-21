# Product Requirements Document (PRD)

# Smart Roster Management System

**Project:** Datastraw Tech Internship Assessment  
**Product:** Smart Roster Management System  
**Version:** 1.0.0  
**Status:** Development Specification  
**Prepared by:** Meet Maru  

---

## 1. Product Overview

### 1.1 Purpose
The Smart Roster Management System is a browser-based workforce scheduling application designed to help operations managers plan, generate, validate and manage monthly employee rosters across multiple brands, operational processes and teams.

The system addresses the complexity of workforce scheduling in customer experience and operations companies where employees may handle multiple brands or processes, and each process can have different working-day requirements.

### 1.2 Problem Statement
Managing employee schedules manually becomes increasingly difficult as the number of employees, brands and operational processes grows.

Common challenges include:
- Employees being assigned weekly offs when their processes require coverage.
- Brands becoming understaffed due to employee leave or unavailability.
- Different brands following different operating calendars.
- Employees handling multiple brands or processes.
- Scheduling conflicts caused by overlapping responsibilities.
- Changes in employee availability affecting multiple client accounts.
- Difficulty identifying coverage gaps before publishing monthly rosters.

The application must solve these problems through centralized workforce management, configurable scheduling rules and reliable constraint-based roster generation.

### 1.3 Product Vision
Build a centralized, scalable and intelligent workforce scheduling platform that enables operations managers to generate valid monthly rosters, maintain operational coverage and respond to employee availability changes without manually rebuilding schedules.

---

## 2. Product Objectives
The primary objectives are:
1. Centralize employee, brand, process and pod management.
2. Support at least 30 employees and multiple operational teams.
3. Configure individual operating calendars for brands and processes.
4. Generate monthly employee schedules automatically.
5. Account for weekly offs, public holidays, planned leaves and comp-offs.
6. Detect scheduling conflicts and insufficient staffing.
7. Provide multiple roster views for different operational requirements.
8. Allow manual schedule adjustments with automatic validation.
9. Identify the impact of employee availability changes.
10. Support future expansion without major architectural changes.

---

## 3. Target Users and Roles

### 3.1 Operations Manager
The primary system administrator responsible for workforce scheduling.
**Permissions:**
- Manage employees, brands, pods and processes.
- Configure working-day and coverage rules.
- Manage employee assignments.
- Generate monthly rosters.
- Review scheduling conflicts.
- Modify schedules.
- Publish and export rosters.

### 3.2 Pod Lead
Responsible for supervising employees within an assigned operational pod.
**Permissions:**
- View pod-wise schedules.
- Review employee availability.
- Monitor coverage requirements.
- Review scheduling conflicts.
- Request roster adjustments.
- Approve schedules if approval workflows are enabled.

### 3.3 Employee
An individual assigned to one or more brands or operational processes.
**Permissions:**
- View personal monthly roster.
- View weekly offs and holidays.
- Submit planned leave requests.
- View assigned brands and processes.
- View schedule changes.

---

## 4. Core System Modules

### 4.1 Dashboard
Provide an overview of workforce operations.
**Key information:**
- Total employees.
- Total brands.
- Total operational pods.
- Total processes.
- Employees working today.
- Employees on leave.
- Employees on weekly offs.
- Pending leave requests.
- Coverage gaps.
- Scheduling conflicts.
- Monthly roster completion status.

### 4.2 Employee Management
Maintain a centralized employee database.
**Employee attributes:**
- Employee ID.
- Full name.
- Email address.
- Contact information.
- Assigned pod.
- Pod lead.
- Employment status.
- Weekly-off preference.
- Assigned brands.
- Assigned processes.
- Availability status.

**Operations:**
- Create employee.
- Edit employee details.
- Deactivate employee.
- View employee assignments.
- View individual schedules.

The system must support employees assigned to multiple brands and processes.

### 4.3 Brand Management
Maintain information about client brands.
**Brand attributes:**
- Brand ID.
- Brand name.
- Description.
- Assigned operational pod.
- Assigned employees.
- Associated processes.
- Operating status.

The system must support both single-resource and multiple-resource brands.
**Staffing distribution:**
- Approximately 80% of brands should have one dedicated employee.
- Remaining brands generally have two or three employees.
- Some employees may share responsibility for the same process.

### 4.4 Process Management
Manage operational processes independently of brands.
**Initial sample processes:**
- Customer Support (CS).
- Abandoned Cart Conversions (ACC).
- Retention.
- Non-Delivery Report Management (NDR).

**Process attributes:**
- Process ID.
- Process name.
- Description.
- Associated brand.
- Assigned employees.
- Operating calendar.
- Minimum staffing requirement.
- Shift configuration, if applicable.

A brand can have multiple processes with different working schedules.

### 4.5 Pod Management
Organize employees into operational teams.
**Pod attributes:**
- Pod ID.
- Pod name.
- Pod lead.
- Assigned employees.
- Associated brands.
- Associated processes.

The application must provide pod-wise employee and roster views.

---

## 5. Working Rules and Scheduling Configuration

The system must support configurable operating calendars.

### 5.1 Operating Calendar Types
- **Type A: 365-Day Operations**
  - Monday through Sunday.
  - Public holidays included.
  - Continuous operational coverage.
- **Type B: Public Holidays Off**
  - Operates every day except configured public holidays.
- **Type C: Sundays and Public Holidays Off**
  - Operates Monday through Saturday.
  - Does not require coverage on Sundays or configured public holidays.

### 5.2 Process-Specific Rules
Operating requirements must be configurable independently for each process.

| Brand   | Process          | Sunday  | Public Holiday |
| ------- | ---------------- | ------- | -------------- |
| Brand A | Customer Support | Working | Working        |
| Brand A | ACC              | Off     | Off            |
| Brand B | Retention        | Working | Off            |
| Brand C | NDR              | Off     | Off            |

The operating calendar of a brand must be distinct from the working schedule of an individual employee.

### 5.3 Employee Availability
The application must account for:
- Weekly offs.
- Planned leaves.
- Approved comp-offs.
- Public holidays.
- Employee availability.
- Employee scheduling preferences.

Mandatory coverage constraints must take priority over employee preferences.

---

## 6. Monthly Roster Generation Engine

### 6.1 Purpose
The scheduling engine is the core component of the application. It must generate employee schedules while respecting business rules, employee assignments and minimum operational coverage requirements.

### 6.2 Input Parameters
1. Selected month and year.
2. Employee records.
3. Employee-to-brand assignments.
4. Employee-to-process assignments.
5. Pod assignments.
6. Brand operating calendars.
7. Process-specific working rules.
8. Employee weekly offs.
9. Approved leaves.
10. Approved comp-offs.
11. Public holidays.
12. Minimum staffing requirements.
13. Employee availability and preferences.

### 6.3 Scheduling Constraints

**Hard Constraints (Must never be violated in a valid roster):**
- Employees cannot work during approved leave.
- Employees cannot be assigned to overlapping incompatible shifts.
- Required operational processes must meet minimum coverage.
- Employees must have valid assignments.
- Employees cannot receive conflicting responsibilities.
- Employees must follow configured availability restrictions.

**Soft Constraints (Optimized wherever possible):**
- Employee weekly-off preferences.
- Fair distribution of weekly offs.
- Balanced workload.
- Preference-based assignments.
- Consistent scheduling patterns.

### 6.4 Generation Workflow
1. Operations manager selects the month.
2. System retrieves employees, brands and processes.
3. System loads operating calendars and staffing requirements.
4. System retrieves employee availability and approved leave.
5. Scheduling engine calculates eligible employee assignments.
6. The engine generates a proposed roster using deterministic constraint algorithms.
7. Validation engine checks all hard constraints.
8. Scheduling conflicts and coverage gaps are identified.
9. Operations manager reviews and modifies the proposed roster.
10. Valid roster can be published.

### 6.5 Invalid Roster Handling
The system must never silently publish an invalid roster.
If the scheduling requirements cannot be satisfied, it must:
- Identify the affected date.
- Identify the affected brand.
- Identify the affected process.
- Show the required staffing level.
- Show the available staffing level.
- Explain the reason for the conflict.
- Suggest possible corrective actions.

---

## 7. Conflict Detection and Validation

The validation engine must identify the following issues:

| Conflict | Description |
| --- | --- |
| Coverage Gap | No available employee for a required process |
| Understaffing | Available employees are below minimum coverage |
| Leave Conflict | Employee is scheduled during approved leave |
| Assignment Conflict | Employee has incompatible responsibilities |
| Weekly-Off Conflict | Weekly off causes insufficient coverage |
| Availability Conflict | Employee is unavailable on the assigned date |
| Cross-Brand Conflict | One employee is assigned to incompatible responsibilities across brands |

### 7.1 Conflict Severity
- **Critical:** Required process has zero coverage; employee is assigned during approved leave; incompatible overlapping assignments.
- **Warning:** Staffing is below preferred levels; employee preference is violated; workload distribution is unbalanced.

---

## 8. Roster Management and Views
The application must provide five primary scheduling views:
1. **Company-Wide View:** Complete monthly roster across all operational pods.
2. **Pod-Wise View:** Employees and schedules grouped by operational pod.
3. **Brand-Wise View:** Assigned employees, operational processes and daily coverage for each brand.
4. **Process-Wise View:** Employees assigned to a particular process and its operational coverage.
5. **Employee-Wise View:** Working days, weekly offs, public holidays, leaves, comp-offs, and assignments for an individual.

### 8.6 Manual Editing
Operations managers must be able to change employee assignments, modify weekly offs, and reassign resources. Every manual change triggers immediate schedule validation.

---

## 9. Change Management (Dynamic Unavailability Handling)

### Example Scenario
- Employee E01 manages all processes for Brand A (CS, ACC, NDR).
- On 12 November, E01 requests approved leave.
- Brand A CS and NDR require coverage (ACC is off).
- System detects 2 mandatory coverage gaps (CS: required 1, available 0; NDR: required 1, available 0).
- System identifies eligible backup resources (e.g., E09 trained for CS and NDR who is currently free or has non-conflicting assignments).
- Manager reassigns E09 to Brand A for 12 November.
- System validates the change and marks the date covered without regenerating the entire monthly roster.

---

## 10. Data Model and Database Entities

| Entity | Purpose |
| --- | --- |
| User | Authentication and RBAC (Manager, Pod Lead, Employee) |
| Employee | Centralized profile and availability metadata |
| Pod | Operational team structure and lead assignment |
| Brand | Client account details and assigned pod |
| Process | Service lines (CS, ACC, NDR, Retention) and minimum staffing |
| Assignment | Many-to-many relationship linking Employee, Brand, and Process |
| OperatingRule | Operating calendar type (A, B, C) and exceptions |
| CoverageRequirement | Date-specific or day-of-week staffing thresholds |
| EmployeeAvailability | Daily availability status override |
| WeeklyOff | Recurring or assigned weekly-off rules |
| Leave | Planned and approved leave requests |
| CompOff | Approved compensatory off days |
| PublicHoliday | Organization-wide and regional calendar holidays |
| Roster | Monthly roster container with state (draft, published, archived) |
| RosterEntry | Daily assignment status per employee/brand/process |
| Conflict | Detected rule violations with severity and diagnostics |
| AuditLog | Immutable history of schedule updates and overrides |

---

## 11. Technical Architecture & Tech Stack

| Layer | Recommended Technology |
| --- | --- |
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js + Express / Next.js Server API Routes |
| Database | MongoDB (Mongoose) |
| Authentication | JWT with secure HTTP-only cookies, RFC 7519 standards |
| Engine | Deterministic constraint-based scheduling solver |
| Visualization | Recharts, Custom Calendar Matrix Grid |

---

## 12. Benchmark Dataset Specification
The application must be seeded with realistic fictional data matching Datastraw's specifications:
- Minimum **30 employees**.
- Multiple operational pods with designated Pod Leads.
- Multiple client brands where **~80% are single-resource brands** and remaining brands have 2-3 employees.
- 4 primary processes: CS, ACC, NDR, Retention.
- Configured Type A, B, and C operating calendars.
- Realistic distribution of weekly offs, approved leaves, and comp-offs.
- Ready-to-demonstrate conflict scenarios (such as the E01 leave coverage gap).
