import {
  RosterEntry,
  Employee,
  Brand,
  Pod,
  Process,
  ScheduleStatus,
  OperatingRule,
} from '@/types';
import { getDaysInMonth, formatDate } from './scheduling-engine';

export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportRosterToCSV(
  activeView: 'COMPANY' | 'POD' | 'BRAND' | 'PROCESS' | 'EMPLOYEE',
  monthYear: string,
  entries: RosterEntry[],
  employees: Employee[],
  brands: Brand[],
  pods: Pod[],
  processes: Process[],
  operatingRules: OperatingRule[],
  selectedEmployeeId?: string
): void {
  const { daysCount, year, month } = getDaysInMonth(monthYear);
  const daysHeader = Array.from({ length: daysCount }, (_, i) => `Day ${i + 1}`).join(',');
  const brandMap = new Map(brands.map((b) => [b.id, b]));
  const procMap = new Map(processes.map((p) => [p.id, p]));

  // Index entries by: date -> employeeId -> entry
  const entryDateEmpMap = new Map<string, Map<string, RosterEntry[]>>();
  entries.forEach((entry) => {
    if (!entryDateEmpMap.has(entry.date)) {
      entryDateEmpMap.set(entry.date, new Map());
    }
    const empSubMap = entryDateEmpMap.get(entry.date)!;
    if (!empSubMap.has(entry.employeeId)) {
      empSubMap.set(entry.employeeId, []);
    }
    empSubMap.get(entry.employeeId)!.push(entry);
  });

  let csvRows: string[] = [];

  if (activeView === 'COMPANY') {
    csvRows.push(`Employee Code,Employee Name,Pod,${daysHeader},Total Working,Total Leaves,Total Weekly Offs`);

    employees.forEach((emp) => {
      let workingCount = 0;
      let leaveCount = 0;
      let offCount = 0;

      const dayCells = Array.from({ length: daysCount }, (_, i) => {
        const d = i + 1;
        const dateStr = formatDate(year, month, d);
        const empEntries = entryDateEmpMap.get(dateStr)?.get(emp.id);

        if (!empEntries || empEntries.length === 0) {
          offCount++;
          return 'OFF';
        }

        const working = empEntries.find((e) => e.status === ScheduleStatus.WORKING);
        const leave = empEntries.find((e) => e.status === ScheduleStatus.APPROVED_LEAVE);
        const weeklyOff = empEntries.find((e) => e.status === ScheduleStatus.WEEKLY_OFF);

        if (working) {
          workingCount++;
          const b = brandMap.get(working.brandId);
          return working.isOverride ? `"${b?.code || 'W'} (Override)"` : `"${b?.code || 'W'}"`;
        }
        if (leave) {
          leaveCount++;
          return 'LEAVE';
        }
        if (weeklyOff) {
          offCount++;
          return 'WEEKLY_OFF';
        }
        return 'PUBLIC_HOLIDAY';
      });

      csvRows.push(
        `"${emp.employeeCode}","${emp.fullName}","${emp.podName || emp.podId}",${dayCells.join(
          ','
        )},${workingCount},${leaveCount},${offCount}`
      );
    });
  } else if (activeView === 'BRAND') {
    csvRows.push(`Brand Name,Brand Code,Process,Calendar Type,Min Staff Required,${daysHeader}`);

    brands.forEach((brand) => {
      const bRules = operatingRules.filter((r) => r.brandId === brand.id);
      bRules.forEach((rule) => {
        const proc = procMap.get(rule.processId);

        const dayCells = Array.from({ length: daysCount }, (_, i) => {
          const d = i + 1;
          const dateStr = formatDate(year, month, d);
          const activeCount = entries.filter(
            (e) =>
              e.date === dateStr &&
              e.brandId === brand.id &&
              e.processId === rule.processId &&
              e.status === ScheduleStatus.WORKING
          ).length;

          return `"${activeCount}/${rule.minStaffingRequired}"`;
        });

        csvRows.push(
          `"${brand.name}","${brand.code}","${proc?.name || rule.processId}","${rule.calendarType}",${
            rule.minStaffingRequired
          },${dayCells.join(',')}`
        );
      });
    });
  } else if (activeView === 'EMPLOYEE') {
    const targetEmp = employees.find((e) => e.id === selectedEmployeeId) || employees[0];
    csvRows.push('Date,Day Of Week,Status,Assigned Brand,Process,Is Override,Override Reason');

    for (let d = 1; d <= daysCount; d++) {
      const dateStr = formatDate(year, month, d);
      const dateObj = new Date(dateStr);
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
        dateObj.getDay()
      ];
      const dayEntries = entries.filter((e) => e.date === dateStr && e.employeeId === targetEmp?.id);
      const working = dayEntries.find((e) => e.status === ScheduleStatus.WORKING);
      const leave = dayEntries.find((e) => e.status === ScheduleStatus.APPROVED_LEAVE);

      let status = 'WEEKLY_OFF';
      let brandName = '-';
      let procName = '-';
      let isOverride = 'No';
      let overrideReason = '-';

      if (working) {
        status = 'WORKING';
        brandName = brandMap.get(working.brandId)?.name || working.brandId;
        procName = procMap.get(working.processId)?.name || working.processId;
        if (working.isOverride) {
          isOverride = 'Yes';
          overrideReason = working.overrideReason || 'Reassigned floater backup';
        }
      } else if (leave) {
        status = 'APPROVED_LEAVE';
      }

      csvRows.push(
        `"${dateStr}","${dayName}","${status}","${brandName}","${procName}","${isOverride}","${overrideReason}"`
      );
    }
  } else {
    // Generic matrix export for Pods or Processes
    csvRows.push(`Category,Item,${daysHeader}`);
    processes.forEach((proc) => {
      const dayCells = Array.from({ length: daysCount }, (_, i) => {
        const d = i + 1;
        const dateStr = formatDate(year, month, d);
        const count = entries.filter(
          (e) => e.date === dateStr && e.processId === proc.id && e.status === ScheduleStatus.WORKING
        ).length;
        return `${count}`;
      });
      csvRows.push(`"Process","${proc.name}",${dayCells.join(',')}`);
    });
  }

  const csvContent = csvRows.join('\n');
  const filename = `SmartRoster_${activeView}_${monthYear}.csv`;
  downloadCSV(filename, csvContent);
}
