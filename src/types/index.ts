export enum UserRole {
  OPERATIONS_MANAGER = 'OPERATIONS_MANAGER',
  POD_LEAD = 'POD_LEAD',
  EMPLOYEE = 'EMPLOYEE',
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  employeeRef?: string;
  podId?: string;
}

export interface Pod {
  id: string;
  name: string;
  code: string;
  leadEmployeeId: string;
  leadName?: string;
  description?: string;
  employeeCount?: number;
  brandCount?: number;
}

export interface Brand {
  id: string;
  name: string;
  code: string;
  podId: string;
  isSingleResource: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  assignedEmployeeIds?: string[];
  processIds?: string[];
}

export enum OperatingCalendarType {
  TYPE_A_365 = 'TYPE_A_365', // Mon-Sun + Public Holidays
  TYPE_B_HOLIDAYS_OFF = 'TYPE_B_HOLIDAYS_OFF', // Mon-Sun, Public Holidays OFF
  TYPE_C_SUN_HOLIDAYS_OFF = 'TYPE_C_SUN_HOLIDAYS_OFF', // Mon-Sat, Sun & Holidays OFF
}

export interface Process {
  id: string;
  code: string; // 'CS', 'ACC', 'NDR', 'RETENTION'
  name: string;
  description: string;
}

export enum ShiftTiming {
  MORNING = 'MORNING',       // 08:00 - 16:00
  AFTERNOON = 'AFTERNOON',   // 16:00 - 00:00
  NIGHT = 'NIGHT',           // 00:00 - 08:00
  GENERAL = 'GENERAL',       // 09:00 - 18:00 (Standard single-shift)
}

export interface OperatingRule {
  id: string;
  brandId: string;
  processId: string;
  calendarType: OperatingCalendarType;
  minStaffingRequired: number;
  shiftTiming?: ShiftTiming;
}

export interface Employee {
  id: string;
  employeeCode: string; // 'E01' ... 'E30'
  fullName: string;
  email: string;
  phone: string;
  podId: string;
  podName?: string;
  weeklyOffPreference: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  qualifiedProcessIds: string[]; // ['CS', 'ACC', 'NDR', etc.]
  isPodLead?: boolean;
}

export interface Assignment {
  id: string;
  employeeId: string;
  brandId: string;
  processId: string;
  isPrimary: boolean;
}

export enum LeaveType {
  PLANNED_LEAVE = 'PLANNED_LEAVE',
  SICK_LEAVE = 'SICK_LEAVE',
  COMP_OFF = 'COMP_OFF',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  leaveType: LeaveType;
  date: string; // YYYY-MM-DD
  status: LeaveStatus;
  approvedBy?: string;
  reason?: string;
}

export interface PublicHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  appliesToAll: boolean;
}

export enum RosterStatus {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
  PUBLISHED = 'PUBLISHED',
}

export enum SwapStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface ShiftSwapRequest {
  id: string;
  requesterEmpId: string;
  requesterEmpName: string;
  targetEmpId: string;
  targetEmpName: string;
  date: string; // YYYY-MM-DD
  brandId: string;
  brandName?: string;
  processId: string;
  processName?: string;
  reason: string;
  status: SwapStatus;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface CompOffCredit {
  id: string;
  employeeId: string;
  employeeName: string;
  earnedDate: string; // date worked on weekly off / holiday
  earnedReason: string;
  expiryDate: string;
  status: 'AVAILABLE' | 'REDEEMED' | 'EXPIRED';
  redeemedOnLeaveDate?: string;
}

export enum ScheduleStatus {
  WORKING = 'WORKING',
  WEEKLY_OFF = 'WEEKLY_OFF',
  APPROVED_LEAVE = 'APPROVED_LEAVE',
  COMP_OFF = 'COMP_OFF',
  PUBLIC_HOLIDAY = 'PUBLIC_HOLIDAY',
  UNASSIGNED = 'UNASSIGNED',
}

export interface RosterEntry {
  id: string;
  rosterId: string;
  date: string; // YYYY-MM-DD
  employeeId: string;
  brandId: string;
  processId: string;
  status: ScheduleStatus;
  shiftTiming?: ShiftTiming;
  isOverride: boolean;
  originalEmployeeId?: string;
  overrideReason?: string;
}

export enum ConflictType {
  COVERAGE_GAP = 'COVERAGE_GAP',
  UNDERSTAFFED = 'UNDERSTAFFED',
  LEAVE_COLLISION = 'LEAVE_COLLISION',
  CROSS_BRAND_COLLISION = 'CROSS_BRAND_COLLISION',
  WEEKLY_OFF_COLLISION = 'WEEKLY_OFF_COLLISION',
}

export enum ConflictSeverity {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
}

export interface Conflict {
  id: string;
  rosterId: string;
  date: string;
  brandId: string;
  brandName?: string;
  processId: string;
  processName?: string;
  employeeId?: string;
  employeeName?: string;
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

export interface Roster {
  id: string;
  monthYear: string; // '2024-11'
  podId?: string;
  status: RosterStatus;
  version: number;
  totalConflicts: {
    critical: number;
    warning: number;
  };
  generatedAt: string;
  publishedAt?: string;
  publishedBy?: string;
  lastUpdatedBy?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'GENERATE' | 'EDIT_SLOT' | 'REASSIGN_BACKUP' | 'PUBLISH' | 'APPROVE_LEAVE' | 'REJECT_LEAVE' | 'SHIFT_SWAP' | 'GRANT_COMPOFF';
  targetDate?: string;
  affectedBrandId?: string;
  affectedProcessId?: string;
  details: string;
}

export interface InAppNotification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  category: 'ALERT' | 'INFO' | 'SUCCESS' | 'WARNING';
  read: boolean;
  actionUrl?: string;
}
