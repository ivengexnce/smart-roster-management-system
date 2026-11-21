import {
  User,
  Pod,
  Brand,
  Process,
  OperatingRule,
  Employee,
  Assignment,
  LeaveRequest,
  PublicHoliday,
  Roster,
  RosterEntry,
  Conflict,
  AuditLog,
  UserRole,
  ShiftSwapRequest,
  CompOffCredit,
  InAppNotification,
} from '@/types';

// In-Memory Data Store interface with fallback adapter
interface DataStore {
  users: (User & { password?: string })[];
  currentSessionUser: User | null;
  pods: Pod[];
  brands: Brand[];
  processes: Process[];
  operatingRules: OperatingRule[];
  employees: Employee[];
  assignments: Assignment[];
  leaves: LeaveRequest[];
  holidays: PublicHoliday[];
  rosters: Roster[];
  rosterEntries: RosterEntry[];
  conflicts: Conflict[];
  auditLogs: AuditLog[];
  shiftSwaps: ShiftSwapRequest[];
  compOffs: CompOffCredit[];
  notifications: InAppNotification[];
  activeRefreshTokens: Set<string>;
}

declare global {
  // eslint-disable-next-line no-var
  var __GLOBAL_DATA_STORE__: DataStore | undefined;
}

function getInitialStore(): DataStore {
  const defaultUsers: (User & { password?: string })[] = [
    {
      id: 'u-admin',
      email: 'manager@datastraw.io',
      password: 'password123',
      fullName: 'Operations Manager',
      role: UserRole.OPERATIONS_MANAGER,
    },
    {
      id: 'u-lead-alpha',
      email: 'rahul.alpha@datastraw.io',
      password: 'password123',
      fullName: 'Rahul Sharma',
      role: UserRole.POD_LEAD,
      employeeRef: 'E01',
      podId: 'pod-alpha',
    },
    {
      id: 'u-lead-beta',
      email: 'priya.beta@datastraw.io',
      password: 'password123',
      fullName: 'Priya Patel',
      role: UserRole.POD_LEAD,
      employeeRef: 'E11',
      podId: 'pod-beta',
    },
    {
      id: 'u-emp-02',
      email: 'ananya.roy@datastraw.io',
      password: 'password123',
      fullName: 'Ananya Roy (E02)',
      role: UserRole.EMPLOYEE,
      employeeRef: 'E02',
      podId: 'pod-alpha',
    },
  ];

  return {
    users: defaultUsers,
    currentSessionUser: defaultUsers[0], // Default logged-in as Operations Manager
    pods: [],
    brands: [],
    processes: [],
    operatingRules: [],
    employees: [],
    assignments: [],
    leaves: [],
    holidays: [],
    rosters: [],
    rosterEntries: [],
    conflicts: [],
    auditLogs: [],
    shiftSwaps: [],
    compOffs: [],
    notifications: [
      {
        id: 'notif-1',
        timestamp: new Date().toISOString(),
        title: 'Workforce Slicing Enabled',
        message: 'Range selection (1-10 Alpha, 11-20 Beta, 21-30 Gamma, Custom) is active.',
        category: 'INFO',
        read: false,
      },
      {
        id: 'notif-2',
        timestamp: new Date().toISOString(),
        title: 'Single-Resource Coverage Alert',
        message: '14 of 18 brands are operating under single-resource dependencies.',
        category: 'WARNING',
        read: false,
      },
    ],
    activeRefreshTokens: new Set<string>(),
  };
}

export function getStore(): DataStore {
  if (!global.__GLOBAL_DATA_STORE__) {
    global.__GLOBAL_DATA_STORE__ = getInitialStore();
  }
  if (!global.__GLOBAL_DATA_STORE__.activeRefreshTokens) {
    global.__GLOBAL_DATA_STORE__.activeRefreshTokens = new Set<string>();
  }
  return global.__GLOBAL_DATA_STORE__;
}

export function registerRefreshToken(tokenId: string): void {
  const store = getStore();
  store.activeRefreshTokens.add(tokenId);
}

export function isRefreshTokenValid(tokenId: string): boolean {
  const store = getStore();
  return store.activeRefreshTokens.has(tokenId);
}

export function revokeRefreshToken(tokenId: string): void {
  const store = getStore();
  store.activeRefreshTokens.delete(tokenId);
}

export function resetStore(): void {
  global.__GLOBAL_DATA_STORE__ = getInitialStore();
}

// RBAC Validator Helper
export function checkPermission(
  userRole: UserRole,
  requiredRole: UserRole | UserRole[],
  userPodId?: string,
  targetPodId?: string
): { authorized: boolean; reason?: string } {
  if (userRole === UserRole.OPERATIONS_MANAGER) {
    return { authorized: true };
  }

  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  if (!allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      reason: `Unauthorized: Action requires ${allowedRoles.join(' or ')} permission`,
    };
  }

  // Scoped pod check for Pod Leads
  if (userRole === UserRole.POD_LEAD && targetPodId && userPodId) {
    if (userPodId !== targetPodId) {
      return {
        authorized: false,
        reason: 'Unauthorized: Pod Leads can only modify their designated pod',
      };
    }
  }

  return { authorized: true };
}

// Audit Logger
export function logAudit(
  action: AuditLog['action'],
  user: { id: string; name: string; role: UserRole },
  details: string,
  targetDate?: string,
  affectedBrandId?: string,
  affectedProcessId?: string
): void {
  const store = getStore();
  const entry: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    targetDate,
    affectedBrandId,
    affectedProcessId,
    details,
  };
  store.auditLogs.unshift(entry);
}

// In-App Notification Helper
export function addNotification(
  title: string,
  message: string,
  category: InAppNotification['category'] = 'INFO',
  actionUrl?: string
): InAppNotification {
  const store = getStore();
  const notif: InAppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    title,
    message,
    category,
    read: false,
    actionUrl,
  };
  store.notifications.unshift(notif);
  return notif;
}
