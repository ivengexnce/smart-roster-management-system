/**
 * CENTRALIZED ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSION ENGINE
 * Datastraw Smart Roster Management System
 * Author: Meet Maru (meetmaru@datastraw.io)
 *
 * Implements granular permission mapping, resource-level ownership
 * validation (Organization, Pod Scope, Employee Self-Service),
 * and centralized authorization enforcement.
 */

import { UserRole } from '@/types';
import { JWTAccessPayload } from './jwt';

export type Permission =
  | 'roster.view.all'
  | 'roster.solve.all'
  | 'roster.publish'
  | 'roster.repair'
  | 'staff.view.all'
  | 'staff.manage'
  | 'pod.manage'
  | 'leave.manage.all'
  | 'shift_swap.manage.all'
  | 'analytics.view.global'
  | 'audit.view.global'
  | 'roles.manage'
  | 'roster.view.pod'
  | 'roster.solve.pod'
  | 'staff.view.pod'
  | 'leave.manage.pod'
  | 'shift_swap.manage.pod'
  | 'analytics.view.pod'
  | 'audit.view.pod'
  | 'roster.submit_for_approval'
  | 'roster.view.personal'
  | 'schedule.view.personal'
  | 'leave.submit'
  | 'shift_swap.submit'
  | 'shift_exchange.request'
  | 'attendance.view.personal';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.OPERATIONS_MANAGER]: [
    'roster.view.all',
    'roster.solve.all',
    'roster.publish',
    'roster.repair',
    'staff.view.all',
    'staff.manage',
    'pod.manage',
    'leave.manage.all',
    'shift_swap.manage.all',
    'analytics.view.global',
    'audit.view.global',
    'roles.manage',
  ],

  [UserRole.POD_LEAD]: [
    'roster.view.pod',
    'roster.solve.pod',
    'staff.view.pod',
    'leave.manage.pod',
    'shift_swap.manage.pod',
    'analytics.view.pod',
    'audit.view.pod',
    'roster.submit_for_approval',
  ],

  [UserRole.EMPLOYEE]: [
    'roster.view.personal',
    'schedule.view.personal',
    'leave.submit',
    'shift_swap.submit',
    'shift_exchange.request',
    'attendance.view.personal',
  ],
};

export interface ResourceScope {
  targetOrg?: string;
  targetPodId?: string;
  targetEmployeeId?: string;
  targetEmployeeCode?: string;
}

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
}

/**
 * Checks if a given role possesses a specific permission string.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Multi-layer Authorization Validator:
 * 1. Checks role-level permission string
 * 2. Checks Organization domain (@datastraw.io)
 * 3. Checks Pod-level scoping (Pod Leads cannot access foreign pods)
 * 4. Checks Resource ownership (Employees cannot modify foreign resources)
 */
export function authorizeResourceAccess(
  user: {
    userId: string;
    email: string;
    role: UserRole;
    podId?: string;
    employeeRef?: string;
  },
  permission: Permission,
  scope?: ResourceScope
): AuthorizationResult {
  // 1. Role Permission Check
  if (!hasPermission(user.role, permission)) {
    return {
      authorized: false,
      reason: `Forbidden: Role '${user.role}' lacks required permission '${permission}'.`,
    };
  }

  // 2. Organization Verification (Must be within @datastraw.io or authorized organization)
  if (scope?.targetOrg && scope.targetOrg.toLowerCase() !== 'datastraw') {
    return {
      authorized: false,
      reason: `Forbidden: Cross-organization access to '${scope.targetOrg}' is denied.`,
    };
  }

  // 3. Pod-Level Scope Enforcement for Pod Leads
  if (user.role === UserRole.POD_LEAD) {
    if (scope?.targetPodId && user.podId && scope.targetPodId !== user.podId) {
      return {
        authorized: false,
        reason: `Forbidden: Pod Lead authority is scoped exclusively to '${user.podId}'. Access to '${scope.targetPodId}' is restricted.`,
      };
    }
  }

  // 4. Resource Ownership Enforcement for Employees
  if (user.role === UserRole.EMPLOYEE) {
    if (scope?.targetEmployeeId && scope.targetEmployeeId !== user.userId) {
      // Check employee code/ref match if provided
      if (scope.targetEmployeeCode && user.employeeRef && scope.targetEmployeeCode !== user.employeeRef) {
        return {
          authorized: false,
          reason: `Forbidden: Employee self-service is restricted to personal records. Access to employee '${scope.targetEmployeeId}' is prohibited.`,
        };
      }
    }
  }

  return { authorized: true };
}
