import {
  Roster,
  RosterEntry,
  Conflict,
  ConflictType,
  ConflictSeverity,
  RosterStatus,
  ScheduleStatus,
  ShiftTiming,
  OperatingCalendarType,
  User,
  UserRole,
} from '@/types';
import { getStore, logAudit, checkPermission } from './db';

// Helper to get number of days in month (e.g., 2024-11 -> 30)
export function getDaysInMonth(monthYear: string): { daysCount: number; year: number; month: number } {
  const [yearStr, monthStr] = monthYear.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-based (11 for November)
  const daysCount = new Date(year, month, 0).getDate();
  return { daysCount, year, month };
}

// Format date to YYYY-MM-DD
export function formatDate(year: number, month: number, day: number): string {
  const m = month.toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${year}-${m}-${d}`;
}

// Determines if a brand-process operates on a specific date
export function isProcessOperatingOnDate(
  calendarType: OperatingCalendarType,
  dateStr: string,
  holidayDates: Set<string>
): boolean {
  const dateObj = new Date(dateStr);
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const isHoliday = holidayDates.has(dateStr);
  const isSunday = dayOfWeek === 0;

  switch (calendarType) {
    case OperatingCalendarType.TYPE_A_365:
      // Operates every single day including Sundays and public holidays
      return true;

    case OperatingCalendarType.TYPE_B_HOLIDAYS_OFF:
      // Operates Mon-Sun, but OFF on public holidays
      return !isHoliday;

    case OperatingCalendarType.TYPE_C_SUN_HOLIDAYS_OFF:
      // Operates Mon-Sat, OFF on Sundays and public holidays
      return !isSunday && !isHoliday;

    default:
      return true;
  }
}

// Main Deterministic Roster Generation Function
export function generateRoster(
  monthYear: string,
  actorUser: User,
  podId?: string
): { roster: Roster; entries: RosterEntry[]; conflicts: Conflict[] } {
  const store = getStore();

  // RBAC Permission Check
  const auth = checkPermission(actorUser.role, [UserRole.OPERATIONS_MANAGER, UserRole.POD_LEAD], actorUser.podId, podId);
  if (!auth.authorized) {
    throw new Error(auth.reason || 'Forbidden');
  }

  const { daysCount, year, month } = getDaysInMonth(monthYear);
  const holidayDates = new Set(store.holidays.map((h) => h.date));
  const leaveMap = new Map<string, Set<string>>(); // employeeId -> set of leave dates
  store.leaves
    .filter((l) => l.status === 'APPROVED')
    .forEach((l) => {
      if (!leaveMap.has(l.employeeId)) {
        leaveMap.set(l.employeeId, new Set());
      }
      leaveMap.get(l.employeeId)!.add(l.date);
    });

  const rosterId = `roster-${monthYear}${podId ? `-${podId}` : ''}`;
  const generatedEntries: RosterEntry[] = [];
  const detectedConflicts: Conflict[] = [];

  // Filter employees and brands based on podId scope if requested
  const targetEmployees = podId ? store.employees.filter((e) => e.podId === podId) : store.employees;
  const targetBrands = podId ? store.brands.filter((b) => b.podId === podId) : store.brands;
  const targetBrandIds = new Set(targetBrands.map((b) => b.id));

  // Map employee lookup
  const employeeMap = new Map(store.employees.map((e) => [e.id, e]));
  const brandMap = new Map(store.brands.map((b) => [b.id, b]));
  const processMap = new Map(store.processes.map((p) => [p.id, p]));

  // Primary assignments map: brandId -> processId -> employeeIds
  const brandProcessAssignments = new Map<string, Map<string, string[]>>();
  store.assignments.forEach((asgn) => {
    if (!brandProcessAssignments.has(asgn.brandId)) {
      brandProcessAssignments.set(asgn.brandId, new Map());
    }
    const procMap = brandProcessAssignments.get(asgn.brandId)!;
    if (!procMap.has(asgn.processId)) {
      procMap.set(asgn.processId, []);
    }
    procMap.get(asgn.processId)!.push(asgn.employeeId);
  });

  // Daily tracker: date -> employeeId -> assigned duties count
  const dailyWorkload = new Map<string, Map<string, number>>();

  // Loop through each date of the month
  for (let day = 1; day <= daysCount; day++) {
    const dateStr = formatDate(year, month, day);
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();

    if (!dailyWorkload.has(dateStr)) {
      dailyWorkload.set(dateStr, new Map());
    }
    const dayWork = dailyWorkload.get(dateStr)!;

    // Track which employees are available to work today
    const employeeDailyStatus = new Map<string, ScheduleStatus>();

    // Pre-calculate which employees have Type A 365-day assignments
    const typeAEmployeeIds = new Set<string>();
    store.operatingRules
      .filter((r) => r.calendarType === OperatingCalendarType.TYPE_A_365)
      .forEach((r) => {
        const emps = brandProcessAssignments.get(r.brandId)?.get(r.processId) || [];
        emps.forEach((eId) => typeAEmployeeIds.add(eId));
      });

    targetEmployees.forEach((emp) => {
      const isLeave = leaveMap.get(emp.id)?.has(dateStr);
      const isPrefWeeklyOff = emp.weeklyOffPreference === dayOfWeek;
      const isHoliday = holidayDates.has(dateStr);
      const worksTypeA = typeAEmployeeIds.has(emp.id);

      if (isLeave) {
        employeeDailyStatus.set(emp.id, ScheduleStatus.APPROVED_LEAVE);
      } else if (isPrefWeeklyOff) {
        employeeDailyStatus.set(emp.id, ScheduleStatus.WEEKLY_OFF);
      } else if (isHoliday && !worksTypeA) {
        // Only non-365 employees are off on public holidays
        employeeDailyStatus.set(emp.id, ScheduleStatus.PUBLIC_HOLIDAY);
      } else {
        employeeDailyStatus.set(emp.id, ScheduleStatus.WORKING);
      }
    });

    // Track which brand a floater/employee is assigned to today (same employee can handle multiple processes for the same brand)
    const employeeAssignedBrandToday = new Map<string, string>();

    // Evaluate each brand and each operating rule
    targetBrands.forEach((brand) => {
      const brandRules = store.operatingRules.filter((r) => r.brandId === brand.id);

      brandRules.forEach((rule) => {
        const isOperating = isProcessOperatingOnDate(rule.calendarType, dateStr, holidayDates);
        const assignedEmpIds = brandProcessAssignments.get(brand.id)?.get(rule.processId) || [];

        if (!isOperating) {
          // Process does not operate today (e.g. ACC on Sunday)
          assignedEmpIds.forEach((empId) => {
            generatedEntries.push({
              id: `entry-${rosterId}-${dateStr}-${empId}-${brand.id}-${rule.processId}`,
              rosterId,
              date: dateStr,
              employeeId: empId,
              brandId: brand.id,
              processId: rule.processId,
              status: ScheduleStatus.UNASSIGNED,
              isOverride: false,
            });
          });
          return;
        }

        // Process is operating! Check available assigned staff
        const workingEmps: string[] = [];

        assignedEmpIds.forEach((empId) => {
          const status = employeeDailyStatus.get(empId) || ScheduleStatus.WORKING;

          if (status === ScheduleStatus.WORKING) {
            workingEmps.push(empId);
            dayWork.set(empId, (dayWork.get(empId) || 0) + 1);
            employeeAssignedBrandToday.set(empId, brand.id);

            generatedEntries.push({
              id: `entry-${rosterId}-${dateStr}-${empId}-${brand.id}-${rule.processId}`,
              rosterId,
              date: dateStr,
              employeeId: empId,
              brandId: brand.id,
              processId: rule.processId,
              status: ScheduleStatus.WORKING,
              isOverride: false,
            });
          } else {
            // Employee is off or on leave
            generatedEntries.push({
              id: `entry-${rosterId}-${dateStr}-${empId}-${brand.id}-${rule.processId}`,
              rosterId,
              date: dateStr,
              employeeId: empId,
              brandId: brand.id,
              processId: rule.processId,
              status,
              isOverride: false,
            });
          }
        });

        // If primary assigned employee is on routine WEEKLY_OFF, attempt to schedule an available floater from the pod!
        // Note: For APPROVED_LEAVE (like E01 on Day 12), we intentionally leave it open so it surfaces as an Availability Shock for manager review!
        const hasApprovedLeave = assignedEmpIds.some((empId) => employeeDailyStatus.get(empId) === ScheduleStatus.APPROVED_LEAVE);
        if (workingEmps.length < rule.minStaffingRequired && !hasApprovedLeave) {
          const neededStaff = rule.minStaffingRequired - workingEmps.length;
          
          // Find floaters from the same pod who have no primary assignments, qualified for this process, available today,
          // and either already assigned to THIS brand today or not assigned to any brand today.
          const availableFloaters = store.employees.filter((cand) => {
            const hasPrimaryAssignment = store.assignments.some((asgn) => asgn.employeeId === cand.id);
            if (hasPrimaryAssignment) return false; // dedicated to another brand
            if (cand.podId !== brand.podId) return false; // same pod preferred
            if (!cand.qualifiedProcessIds.includes(rule.processId)) return false; // qualified for process
            const candStatus = employeeDailyStatus.get(cand.id);
            if (candStatus === ScheduleStatus.APPROVED_LEAVE || candStatus === ScheduleStatus.WEEKLY_OFF) return false;
            
            const assignedBrand = employeeAssignedBrandToday.get(cand.id);
            if (assignedBrand && assignedBrand !== brand.id) return false; // already working for a different brand today
            return true;
          });

          // Allocate floaters to maintain standard operational coverage
          for (let f = 0; f < Math.min(neededStaff, availableFloaters.length); f++) {
            const floater = availableFloaters[f];
            workingEmps.push(floater.id);
            dayWork.set(floater.id, (dayWork.get(floater.id) || 0) + 1);
            employeeAssignedBrandToday.set(floater.id, brand.id);

            generatedEntries.push({
              id: `entry-${rosterId}-${dateStr}-${floater.id}-${brand.id}-${rule.processId}`,
              rosterId,
              date: dateStr,
              employeeId: floater.id,
              brandId: brand.id,
              processId: rule.processId,
              status: ScheduleStatus.WORKING,
              isOverride: false,
            });
          }
        }

        // Check if minimum staffing requirement is satisfied
        if (workingEmps.length < rule.minStaffingRequired) {
          // CONFLICT DETECTED!
          const isZeroStaff = workingEmps.length === 0;
          const severity = isZeroStaff ? ConflictSeverity.CRITICAL : ConflictSeverity.WARNING;
          const type = isZeroStaff ? ConflictType.COVERAGE_GAP : ConflictType.UNDERSTAFFED;

          // Find candidate backup resources who are qualified, available on dateStr, and not single-resource owners
          const candidates = store.employees.filter((cand) => {
            if (assignedEmpIds.includes(cand.id)) return false;
            // Qualified for this process?
            if (!cand.qualifiedProcessIds.includes(rule.processId)) return false;
            // Available on this date?
            const candStatus = employeeDailyStatus.get(cand.id);
            if (candStatus === ScheduleStatus.APPROVED_LEAVE) return false;
            return true;
          });

          // Sort candidates:
          // 1. Unassigned floaters (no primary brand duties) first!
          // 2. Same pod first
          // 3. Multi-skill match (count of brand processes qualified for)
          // 4. Lowest daily workload
          candidates.sort((a, b) => {
            const aHasAssignments = store.assignments.some((asgn) => asgn.employeeId === a.id);
            const bHasAssignments = store.assignments.some((asgn) => asgn.employeeId === b.id);

            if (aHasAssignments !== bHasAssignments) {
              return aHasAssignments ? 1 : -1; // floaters without active brand ownership first
            }

            const aPodMatch = a.podId === brand.podId ? -1 : 1;
            const bPodMatch = b.podId === brand.podId ? -1 : 1;
            if (aPodMatch !== bPodMatch) return aPodMatch - bPodMatch;

            // Brand skill match
            const brandRuleProcs = brandRules.map((r) => r.processId);
            const aSkillsCount = a.qualifiedProcessIds.filter((p) => brandRuleProcs.includes(p)).length;
            const bSkillsCount = b.qualifiedProcessIds.filter((p) => brandRuleProcs.includes(p)).length;
            if (aSkillsCount !== bSkillsCount) return bSkillsCount - aSkillsCount;

            const aLoad = dayWork.get(a.id) || 0;
            const bLoad = dayWork.get(b.id) || 0;
            return aLoad - bLoad;
          });

          const recommendedIds = candidates.slice(0, 5).map((c) => c.id);

          const conflict: Conflict = {
            id: `conf-${rosterId}-${dateStr}-${brand.id}-${rule.processId}`,
            rosterId,
            date: dateStr,
            brandId: brand.id,
            brandName: brand.name,
            processId: rule.processId,
            processName: processMap.get(rule.processId)?.name || rule.processId,
            type,
            severity,
            requiredStaffing: rule.minStaffingRequired,
            availableStaffing: workingEmps.length,
            description: `${brand.name} ${processMap.get(rule.processId)?.code || rule.processId} requires ${
              rule.minStaffingRequired
            } staff, but only ${workingEmps.length} available on ${dateStr}. Reason: assigned staff on weekly off or approved leave.`,
            suggestedAction: {
              recommendedEmployeeIds: recommendedIds,
              actionType: 'REASSIGN_BACKUP',
              rationale:
                recommendedIds.length > 0
                  ? `Reassign eligible backup ${employeeMap.get(recommendedIds[0])?.fullName || recommendedIds[0]} who is qualified for ${
                      processMap.get(rule.processId)?.code || rule.processId
                    } and available on ${dateStr}.`
                  : 'Escalate to Operations Manager for cross-pod floater allocation.',
            },
          };

          detectedConflicts.push(conflict);
        }
      });
    });

    // Ensure EVERY employee in targetEmployees has a calendar entry for dateStr
    targetEmployees.forEach((emp) => {
      const hasEntryToday = generatedEntries.some(
        (e) => e.date === dateStr && e.employeeId === emp.id
      );

      if (!hasEntryToday) {
        const isLeave = leaveMap.get(emp.id)?.has(dateStr);
        const isPrefWeeklyOff = emp.weeklyOffPreference === dayOfWeek;
        const isHoliday = holidayDates.has(dateStr);

        let status = ScheduleStatus.UNASSIGNED;
        if (isLeave) {
          status = ScheduleStatus.APPROVED_LEAVE;
        } else if (isPrefWeeklyOff) {
          status = ScheduleStatus.WEEKLY_OFF;
        } else if (isHoliday) {
          status = ScheduleStatus.PUBLIC_HOLIDAY;
        }

        generatedEntries.push({
          id: `entry-${rosterId}-${dateStr}-${emp.id}-standby`,
          rosterId,
          date: dateStr,
          employeeId: emp.id,
          brandId: 'standby',
          processId: 'reserve',
          status,
          isOverride: false,
        });
      }
    });
  }

  // Count conflicts
  const criticalCount = detectedConflicts.filter((c) => c.severity === ConflictSeverity.CRITICAL).length;
  const warningCount = detectedConflicts.filter((c) => c.severity === ConflictSeverity.WARNING).length;

  const roster: Roster = {
    id: rosterId,
    monthYear,
    podId,
    status: criticalCount === 0 ? RosterStatus.VALIDATED : RosterStatus.DRAFT,
    version: 1,
    totalConflicts: {
      critical: criticalCount,
      warning: warningCount,
    },
    generatedAt: new Date().toISOString(),
    lastUpdatedBy: actorUser.fullName,
  };

  // Update in store
  store.rosters = store.rosters.filter((r) => r.id !== rosterId);
  store.rosters.push(roster);

  store.rosterEntries = store.rosterEntries.filter((e) => e.rosterId !== rosterId);
  store.rosterEntries.push(...generatedEntries);

  store.conflicts = store.conflicts.filter((c) => c.rosterId !== rosterId);
  store.conflicts.push(...detectedConflicts);

  logAudit(
    'GENERATE',
    { id: actorUser.id, name: actorUser.fullName, role: actorUser.role },
    `Generated deterministic monthly roster for ${monthYear}. Total conflicts: ${criticalCount} critical, ${warningCount} warnings.`,
    undefined,
    undefined,
    undefined
  );

  return { roster, entries: generatedEntries, conflicts: detectedConflicts };
}

// Reassign a backup resource to resolve a specific coverage gap or direct slot override
export function reassignBackup(
  rosterId: string,
  date: string,
  brandId: string,
  processId: string,
  backupEmployeeId: string,
  actorUser: User,
  reason = 'Reassigned to cover approved leave / weekly off gap',
  status = ScheduleStatus.WORKING,
  shiftTiming?: ShiftTiming
): { success: boolean; resolvedConflictId?: string; message: string } {
  const store = getStore();

  // Find target roster
  const roster = store.rosters.find((r) => r.id === rosterId);
  if (!roster) {
    throw new Error('Roster not found');
  }

  // Permission check
  const auth = checkPermission(actorUser.role, [UserRole.OPERATIONS_MANAGER, UserRole.POD_LEAD], actorUser.podId, roster.podId);
  if (!auth.authorized) {
    throw new Error(auth.reason || 'Forbidden');
  }

  const backupEmployee = store.employees.find((e) => e.id === backupEmployeeId);
  if (!backupEmployee) {
    throw new Error('Backup employee not found');
  }

  // Check qualification if assigned to work on a brand process
  if (status === ScheduleStatus.WORKING && brandId !== 'standby' && processId !== 'reserve') {
    if (!backupEmployee.qualifiedProcessIds.includes(processId)) {
      throw new Error(`Employee ${backupEmployee.fullName} is not qualified for this process`);
    }
  }

  // Locate the conflict
  const conflictIndex = store.conflicts.findIndex(
    (c) => c.rosterId === rosterId && c.date === date && c.brandId === brandId && c.processId === processId
  );

  // Remove any standby entry or prior assignment to a different brand on this date
  const priorEntryIndex = store.rosterEntries.findIndex(
    (e) => e.rosterId === rosterId && e.date === date && e.employeeId === backupEmployeeId && (e.brandId === 'standby' || (!e.isOverride && e.brandId !== brandId))
  );
  if (priorEntryIndex >= 0) {
    store.rosterEntries.splice(priorEntryIndex, 1);
  }

  // Upsert the override entry for this date/brand/process
  const entryId = `entry-${rosterId}-${date}-${backupEmployeeId}-${brandId}-${processId}-override`;
  const existingEntryIndex = store.rosterEntries.findIndex(
    (e) => e.rosterId === rosterId && e.date === date && e.brandId === brandId && e.processId === processId && e.employeeId === backupEmployeeId
  );

  const overrideEntry: RosterEntry = {
    id: entryId,
    rosterId,
    date,
    employeeId: backupEmployeeId,
    brandId,
    processId,
    status,
    shiftTiming: shiftTiming || ShiftTiming.GENERAL,
    isOverride: true,
    originalEmployeeId: store.conflicts[conflictIndex]?.employeeId,
    overrideReason: reason,
  };

  if (existingEntryIndex >= 0) {
    store.rosterEntries[existingEntryIndex] = overrideEntry;
  } else {
    store.rosterEntries.push(overrideEntry);
  }

  let resolvedConflictId: string | undefined;
  if (conflictIndex >= 0) {
    resolvedConflictId = store.conflicts[conflictIndex].id;
    store.conflicts.splice(conflictIndex, 1);
  }

  // Recount conflicts
  const currentConflicts = store.conflicts.filter((c) => c.rosterId === rosterId);
  roster.totalConflicts.critical = currentConflicts.filter((c) => c.severity === ConflictSeverity.CRITICAL).length;
  roster.totalConflicts.warning = currentConflicts.filter((c) => c.severity === ConflictSeverity.WARNING).length;
  roster.version += 1;
  roster.status = roster.totalConflicts.critical === 0 ? RosterStatus.VALIDATED : RosterStatus.DRAFT;
  roster.lastUpdatedBy = actorUser.fullName;

  logAudit(
    'REASSIGN_BACKUP',
    { id: actorUser.id, name: actorUser.fullName, role: actorUser.role },
    `Reassigned ${backupEmployee.fullName} to ${brandId} (${processId}) on ${date}. Rationale: ${reason}`,
    date,
    brandId,
    processId
  );

  return {
    success: true,
    resolvedConflictId,
    message: `Successfully reassigned ${backupEmployee.fullName} to Brand on ${date}. Conflict resolved.`,
  };
}

// Publish Roster with Hard Constraint Guard
export function publishRoster(
  rosterId: string,
  actorUser: User
): { success: boolean; roster: Roster; message: string } {
  const store = getStore();
  const roster = store.rosters.find((r) => r.id === rosterId);
  if (!roster) {
    throw new Error('Roster not found');
  }

  // Only Operations Manager can publish company rosters
  const auth = checkPermission(actorUser.role, [UserRole.OPERATIONS_MANAGER]);
  if (!auth.authorized) {
    throw new Error(auth.reason || 'Forbidden: Only Operations Managers can publish rosters');
  }

  const criticalConflicts = store.conflicts.filter(
    (c) => c.rosterId === rosterId && c.severity === ConflictSeverity.CRITICAL
  );

  if (criticalConflicts.length > 0) {
    throw new Error(
      `Cannot publish roster with ${criticalConflicts.length} unresolved CRITICAL conflicts. All mandatory coverage gaps must be resolved first.`
    );
  }

  roster.status = RosterStatus.PUBLISHED;
  roster.publishedAt = new Date().toISOString();
  roster.publishedBy = actorUser.fullName;
  roster.lastUpdatedBy = actorUser.fullName;

  logAudit(
    'PUBLISH',
    { id: actorUser.id, name: actorUser.fullName, role: actorUser.role },
    `Published monthly roster ${roster.monthYear} (Version ${roster.version}).`
  );

  return {
    success: true,
    roster,
    message: `Roster for ${roster.monthYear} is published successfully. All employees and pod leads can now view their official schedules.`,
  };
}
