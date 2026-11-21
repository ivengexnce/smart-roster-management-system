'use client';

import React, { useState } from 'react';
import {
  RosterEntry,
  Employee,
  Brand,
  Pod,
  Process,
  ScheduleStatus,
  ShiftTiming,
  OperatingRule,
  Conflict,
  User,
  UserRole,
} from '@/types';
import { getDaysInMonth, formatDate } from '@/lib/scheduling-engine';

interface RosterViewsProps {
  activeView: 'COMPANY' | 'POD' | 'BRAND' | 'PROCESS' | 'EMPLOYEE';
  monthYear: string;
  entries: RosterEntry[];
  employees: Employee[];
  brands: Brand[];
  pods: Pod[];
  processes: Process[];
  operatingRules: OperatingRule[];
  conflicts: Conflict[];
  selectedPodId?: string;
  selectedBrandId?: string;
  selectedProcessId?: string;
  selectedEmployeeId?: string;
  onSelectEmployee?: (empId: string) => void;
  onCellClick?: (employee: Employee, dateStr: string, currentEntries: RosterEntry[]) => void;
  currentUser?: User | null;
  onOpenManageStaff?: () => void;
}

export function RosterViews({
  activeView,
  monthYear,
  entries,
  employees,
  brands,
  pods,
  processes,
  operatingRules,
  conflicts,
  selectedPodId,
  selectedBrandId,
  selectedProcessId,
  selectedEmployeeId,
  onSelectEmployee,
  onCellClick,
  currentUser,
  onOpenManageStaff,
}: RosterViewsProps) {
  const isEmployee = currentUser?.role === UserRole.EMPLOYEE;
  const isPodLead = currentUser?.role === UserRole.POD_LEAD;

  // Company Matrix Range Slicing State
  const [rangePreset, setRangePreset] = useState<'ALL' | '1-10' | '11-20' | '21-30' | 'CUSTOM'>('ALL');
  const [customStart, setCustomStart] = useState<number>(1);
  const [customEnd, setCustomEnd] = useState<number>(10);

  const { daysCount, year, month } = getDaysInMonth(monthYear);
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  // Quick lookup maps
  const brandMap = new Map(brands.map((b) => [b.id, b]));
  const procMap = new Map(processes.map((p) => [p.id, p]));
  const empMap = new Map(employees.map((e) => [e.id, e]));

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

  // Conflicts lookup by: date -> brandId -> processId
  const conflictMap = new Map<string, Conflict>();
  conflicts.forEach((c) => {
    conflictMap.set(`${c.date}-${c.brandId}-${c.processId}`, c);
  });

  // Cell status renderer helper
  const renderStatusBadge = (statusList: RosterEntry[] | undefined, defaultOff = false) => {
    if (!statusList || statusList.length === 0) {
      if (defaultOff) {
        return (
          <span className="block text-[10px] py-1 px-0.5 bg-gray-100 text-gray-600 border border-gray-200 font-mono">
            OFF
          </span>
        );
      }
      return (
        <span className="block text-[10px] py-0.5 px-0.5 bg-gray-50 text-gray-500 border border-gray-200 font-mono" title="Active Standby Reserve">
          RSV
        </span>
      );
    }

    // Prioritize manual override entries over regular working entries
    const overrideEntry = statusList.find((e) => e.isOverride);
    const workingEntry = overrideEntry || statusList.find((e) => e.status === ScheduleStatus.WORKING);
    const leaveEntry = statusList.find((e) => e.status === ScheduleStatus.APPROVED_LEAVE);
    const weeklyOffEntry = statusList.find((e) => e.status === ScheduleStatus.WEEKLY_OFF);
    const holidayEntry = statusList.find((e) => e.status === ScheduleStatus.PUBLIC_HOLIDAY);

    if (workingEntry) {
      const brand = brandMap.get(workingEntry.brandId);
      const proc = procMap.get(workingEntry.processId);
      const isOverride = workingEntry.isOverride;
      const shiftTag =
        workingEntry.shiftTiming === ShiftTiming.MORNING
          ? ' [M]'
          : workingEntry.shiftTiming === ShiftTiming.AFTERNOON
          ? ' [A]'
          : workingEntry.shiftTiming === ShiftTiming.NIGHT
          ? ' [N]'
          : '';

      return (
        <span
          className={`block text-[10px] py-0.5 px-1 truncate border ${
            isOverride
              ? 'bg-blue-100 text-blue-900 border-blue-400 font-bold'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
          }`}
          title={`${brand?.name || workingEntry.brandId} - ${proc?.code || workingEntry.processId} ${
            workingEntry.shiftTiming ? `(${workingEntry.shiftTiming})` : ''
          } ${isOverride ? '(Reassigned Override)' : ''}`}
        >
          {isOverride ? 'R: ' : ''}
          {brand?.code || brand?.name?.replace('Brand ', '') || 'W'}
          {shiftTag}
        </span>
      );
    }

    if (leaveEntry) {
      return (
        <span
          className="block text-[10px] py-0.5 px-0.5 bg-amber-50 text-amber-900 border border-amber-200 font-semibold"
          title="Approved Leave"
        >
          LV
        </span>
      );
    }

    if (weeklyOffEntry) {
      return (
        <span
          className="block text-[10px] py-0.5 px-0.5 bg-gray-100 text-gray-600 border border-gray-200"
          title="Weekly Off"
        >
          WO
        </span>
      );
    }

    if (holidayEntry) {
      return (
        <span
          className="block text-[10px] py-0.5 px-0.5 bg-blue-50 text-blue-800 border border-blue-200"
          title="Public Holiday"
        >
          PH
        </span>
      );
    }

    return (
      <span className="block text-[10px] py-0.5 px-0.5 bg-gray-50 text-gray-500 border border-gray-200 font-mono" title="Active Standby Reserve">
        RSV
      </span>
    );
  };

  // 1. Company-Wide View (All 30 Employees)
  if (activeView === 'COMPANY') {
    const filteredEmps = selectedPodId
      ? employees.filter((e) => e.podId === selectedPodId)
      : employees;

    // Apply Range Slicing to Master Table
    let displayedEmps = filteredEmps;
    if (rangePreset === '1-10') {
      displayedEmps = filteredEmps.slice(0, 10);
    } else if (rangePreset === '11-20') {
      displayedEmps = filteredEmps.slice(10, 20);
    } else if (rangePreset === '21-30') {
      displayedEmps = filteredEmps.slice(20, 30);
    } else if (rangePreset === 'CUSTOM') {
      const s = Math.max(0, customStart - 1);
      const e = Math.min(filteredEmps.length, customEnd);
      displayedEmps = filteredEmps.slice(s, e);
    }

    return (
      <div className="border border-gray-300 bg-white overflow-hidden">
        <div className="p-3 bg-gray-50 border-b border-gray-300 flex items-center justify-between text-xs">
          <div className="font-bold text-gray-800 uppercase tracking-tight">
            Company-Wide Master Matrix ({displayedEmps.length} of {filteredEmps.length} Employees - {daysCount} Days)
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-gray-600">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-300 inline-block" />
              <span>Working</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 bg-blue-100 border border-blue-400 inline-block" />
              <span>Reassigned Override</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 bg-amber-100 border border-amber-300 inline-block" />
              <span>Leave</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 bg-gray-100 border border-gray-300 inline-block" />
              <span>Weekly Off</span>
            </span>
          </div>
        </div>

        {/* Master Matrix Range Filter Bar & Controls */}
        <div className="p-2.5 bg-white border-b border-gray-300 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase text-gray-500">Range Slices:</span>
            <div className="flex items-center space-x-1 font-mono">
              <button
                onClick={() => setRangePreset('1-10')}
                className={`px-2 py-1 text-xs font-bold border transition-colors ${
                  rangePreset === '1-10'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
                title="View Employees 1 to 10 (Pod Alpha)"
              >
                1–10 [Alpha]
              </button>
              <button
                onClick={() => setRangePreset('11-20')}
                className={`px-2 py-1 text-xs font-bold border transition-colors ${
                  rangePreset === '11-20'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
                title="View Employees 11 to 20 (Pod Beta)"
              >
                11–20 [Beta]
              </button>
              <button
                onClick={() => setRangePreset('21-30')}
                className={`px-2 py-1 text-xs font-bold border transition-colors ${
                  rangePreset === '21-30'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
                title="View Employees 21 to 30 (Pod Gamma)"
              >
                21–30 [Gamma]
              </button>
              <button
                onClick={() => setRangePreset('ALL')}
                className={`px-2 py-1 text-xs font-bold border transition-colors ${
                  rangePreset === 'ALL'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
                title="View All 30 Employees"
              >
                All (1–{filteredEmps.length})
              </button>
              <button
                onClick={() => setRangePreset('CUSTOM')}
                className={`px-2 py-1 text-xs font-bold border transition-colors ${
                  rangePreset === 'CUSTOM'
                    ? 'bg-purple-700 text-white border-purple-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
                title="Custom Slice Range"
              >
                Custom
              </button>
            </div>

            {rangePreset === 'CUSTOM' && (
              <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-purple-50 border border-purple-200 text-xs font-mono">
                <span className="text-[10px] uppercase font-bold text-purple-900">From</span>
                <input
                  type="number"
                  min={1}
                  max={filteredEmps.length}
                  value={customStart}
                  onChange={(e) => setCustomStart(parseInt(e.target.value, 10) || 1)}
                  className="w-12 border border-gray-300 p-0.5 text-center bg-white"
                />
                <span className="text-[10px] uppercase font-bold text-purple-900">To</span>
                <input
                  type="number"
                  min={1}
                  max={filteredEmps.length}
                  value={customEnd}
                  onChange={(e) => setCustomEnd(parseInt(e.target.value, 10) || filteredEmps.length)}
                  className="w-12 border border-gray-300 p-0.5 text-center bg-white"
                />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[11px] font-mono text-gray-600 font-semibold">
              Showing <strong className="text-gray-900">{displayedEmps.length}</strong> of {filteredEmps.length} Staff
            </span>
            {!isEmployee && onOpenManageStaff && (
              <button
                onClick={onOpenManageStaff}
                className="px-2.5 py-1 bg-gray-900 hover:bg-black text-white text-xs font-mono font-bold flex items-center space-x-1"
                title={isPodLead ? 'View Pod Staff Directory' : 'Manage Employees & Preview Details'}
              >
                <span>{isPodLead ? 'Pod Staff Directory' : 'Preview & Manage Staff'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-gray-700">
                <th className="p-2 text-left w-48 sticky left-0 bg-gray-100 border-r border-gray-300 font-sans font-bold">
                  Employee
                </th>
                <th className="p-2 text-left w-24 border-r border-gray-300 font-sans font-bold">
                  Pod
                </th>
                {daysArray.map((d) => {
                  const dateStr = formatDate(year, month, d);
                  const dateObj = new Date(dateStr);
                  const isSun = dateObj.getDay() === 0;
                  return (
                    <th
                      key={d}
                      className={`p-1.5 w-8 border-r border-gray-200 ${
                        isSun ? 'bg-gray-200 text-gray-900 font-bold' : ''
                      }`}
                    >
                      <div className="text-[11px] font-bold">{d}</div>
                      <div className="text-[9px] text-gray-500">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'][dateObj.getDay()]}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayedEmps.map((emp) => {
                const isCurrentEmp = currentUser?.employeeRef === emp.employeeCode;
                return (
                  <tr
                    key={emp.id}
                    className={`border-b border-gray-200 transition-colors ${
                      isCurrentEmp ? 'bg-blue-50/60 font-semibold' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td
                      className={`p-2 text-left sticky left-0 border-r border-gray-300 font-sans ${
                        isCurrentEmp ? 'bg-blue-50/90' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onSelectEmployee?.(emp.id)}
                          className="font-bold text-gray-900 hover:text-blue-600 hover:underline text-left block truncate w-36"
                        >
                          {emp.fullName}
                        </button>
                        {isCurrentEmp && (
                          <span className="text-[9px] bg-blue-600 text-white px-1 py-0.2 font-mono font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {emp.employeeCode} · Pref Off: {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][emp.weeklyOffPreference]}
                      </span>
                    </td>
                    <td className="p-2 text-left border-r border-gray-300 font-sans text-[11px] text-gray-600">
                      {emp.podName}
                    </td>
                  {daysArray.map((d) => {
                    const dateStr = formatDate(year, month, d);
                    const empEntries = entryDateEmpMap.get(dateStr)?.get(emp.id);
                    return (
                      <td
                        key={d}
                        onClick={() => onCellClick?.(emp, dateStr, empEntries || [])}
                        className="p-0.5 border-r border-gray-200 text-[10px] cursor-pointer hover:bg-blue-50/60 transition-colors"
                        title={`Click to inspect or override ${emp.fullName}'s duty on ${dateStr}`}
                      >
                        {renderStatusBadge(empEntries)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 2. Pod-Wise View (Grouped by Pod Alpha, Pod Beta, Pod Gamma)
  if (activeView === 'POD') {
    const targetPods = isPodLead
      ? pods.filter((p) => p.id === (currentUser?.podId || 'pod-alpha'))
      : selectedPodId
      ? pods.filter((p) => p.id === selectedPodId)
      : pods;

    return (
      <div className="space-y-6">
        {targetPods.map((pod) => {
          const podEmps = employees.filter((e) => e.podId === pod.id);
          const podBrands = brands.filter((b) => b.podId === pod.id);

          return (
            <div key={pod.id} className="border border-gray-300 bg-white">
              <div className="p-3 bg-gray-100 border-b border-gray-300 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase">
                    {pod.name} - Supervised by {pod.leadName || 'Pod Lead'}
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {podEmps.length} active personnel · {podBrands.length} client accounts assigned
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-1 bg-white border border-gray-300 text-gray-800">
                  {pod.code}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                      <th className="p-2 text-left w-48 font-sans font-bold border-r border-gray-200">
                        Employee
                      </th>
                      {daysArray.map((d) => (
                        <th key={d} className="p-1 w-8 border-r border-gray-200 text-[10px]">
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {podEmps.map((emp) => (
                      <tr key={emp.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-2 text-left border-r border-gray-200 font-sans font-semibold text-gray-900 truncate">
                          {emp.fullName}
                        </td>
                        {daysArray.map((d) => {
                          const dateStr = formatDate(year, month, d);
                          const empEntries = entryDateEmpMap.get(dateStr)?.get(emp.id);
                          return (
                            <td key={d} className="p-0.5 border-r border-gray-200 text-[10px]">
                              {renderStatusBadge(empEntries)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // 3. Brand-Wise View (18 Brands - Coverage Status & Daily Health)
  if (activeView === 'BRAND') {
    const filteredBrands = isPodLead
      ? brands.filter((b) => b.podId === (currentUser?.podId || 'pod-alpha'))
      : selectedBrandId
      ? brands.filter((b) => b.id === selectedBrandId)
      : brands;

    return (
      <div className="border border-gray-300 bg-white">
        <div className="p-3 bg-gray-50 border-b border-gray-300 flex items-center justify-between text-xs">
          <div className="font-bold text-gray-800 uppercase tracking-tight">
            Brand-Wise Operational Coverage Grid ({filteredBrands.length} Client Accounts)
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-gray-600">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-300 inline-block" />
              <span>Covered</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 bg-red-100 border border-red-300 inline-block" />
              <span>Coverage Gap (0 Staff)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 bg-gray-100 border border-gray-300 inline-block" />
              <span>Not Operating</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-gray-700">
                <th className="p-2 text-left w-48 sticky left-0 bg-gray-100 border-r border-gray-300 font-sans font-bold">
                  Brand / Process
                </th>
                <th className="p-2 text-left w-24 border-r border-gray-300 font-sans font-bold">
                  Calendar
                </th>
                {daysArray.map((d) => (
                  <th key={d} className="p-1 w-8 border-r border-gray-200 text-[10px]">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredBrands.map((brand) => {
                const brandRules = operatingRules.filter((r) => r.brandId === brand.id);

                return brandRules.map((rule) => {
                  const proc = procMap.get(rule.processId);

                  return (
                    <tr
                      key={`${brand.id}-${rule.processId}`}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="p-2 text-left sticky left-0 bg-white border-r border-gray-300 font-sans">
                        <div className="font-bold text-gray-900">{brand.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {proc?.name} ({proc?.code}) · Req: {rule.minStaffingRequired}
                        </div>
                      </td>
                      <td className="p-2 text-left border-r border-gray-300 font-sans text-[10px] text-gray-600">
                        {rule.calendarType.replace('TYPE_', '').replace(/_/g, ' ')}
                      </td>
                      {daysArray.map((d) => {
                        const dateStr = formatDate(year, month, d);
                        const conflict = conflictMap.get(`${dateStr}-${brand.id}-${rule.processId}`);

                        // Count working staff for this brand & process on dateStr
                        const activeEntries = entries.filter(
                          (e) =>
                            e.date === dateStr &&
                            e.brandId === brand.id &&
                            e.processId === rule.processId &&
                            e.status === ScheduleStatus.WORKING
                        );

                        if (conflict) {
                          return (
                            <td
                              key={d}
                              className="p-0.5 border-r border-gray-200 bg-red-50 text-red-800 border-red-300 font-bold"
                              title={conflict.description}
                            >
                              0/{rule.minStaffingRequired}
                            </td>
                          );
                        }

                        if (activeEntries.length >= rule.minStaffingRequired) {
                          return (
                            <td
                              key={d}
                              className="p-0.5 border-r border-gray-200 bg-emerald-50 text-emerald-800 text-[10px]"
                              title={`Staffed: ${activeEntries.length} assigned`}
                            >
                              {activeEntries.length}/{rule.minStaffingRequired}
                            </td>
                          );
                        }

                        return (
                          <td key={d} className="p-0.5 border-r border-gray-200 text-gray-300">
                            -
                          </td>
                        );
                      })}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 4. Process-Wise View (CS, ACC, NDR, Retention aggregated across days)
  if (activeView === 'PROCESS') {
    const targetProcs = selectedProcessId
      ? processes.filter((p) => p.id === selectedProcessId)
      : processes;

    return (
      <div className="space-y-6">
        {targetProcs.map((proc) => {
          const rules = operatingRules.filter((r) => r.processId === proc.id);
          const totalRequiredPerDay = rules.reduce((acc, r) => acc + r.minStaffingRequired, 0);

          return (
            <div key={proc.id} className="border border-gray-300 bg-white">
              <div className="p-3 bg-gray-50 border-b border-gray-300 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase">
                    Process: {proc.name} ({proc.code})
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {proc.description} · Baseline required coverage: ~{totalRequiredPerDay} heads/day
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-1 bg-white border border-gray-300 text-gray-800">
                  {rules.length} Active Accounts
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
                      <th className="p-2 text-left w-48 font-sans font-bold border-r border-gray-300">
                        Operational Metric
                      </th>
                      {daysArray.map((d) => (
                        <th key={d} className="p-1 w-8 border-r border-gray-200 text-[10px]">
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="p-2 text-left border-r border-gray-300 font-sans font-bold text-gray-800">
                        Active Working Heads
                      </td>
                      {daysArray.map((d) => {
                        const dateStr = formatDate(year, month, d);
                        const count = entries.filter(
                          (e) =>
                            e.date === dateStr &&
                            e.processId === proc.id &&
                            e.status === ScheduleStatus.WORKING
                        ).length;

                        return (
                          <td
                            key={d}
                            className={`p-1 border-r border-gray-200 ${
                              count === 0 ? 'bg-gray-100 text-gray-400' : 'text-emerald-800 font-bold'
                            }`}
                          >
                            {count}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="p-2 text-left border-r border-gray-300 font-sans font-bold text-red-700">
                        Detected Gaps / Warnings
                      </td>
                      {daysArray.map((d) => {
                        const dateStr = formatDate(year, month, d);
                        const gapCount = conflicts.filter(
                          (c) => c.date === dateStr && c.processId === proc.id
                        ).length;

                        return (
                          <td
                            key={d}
                            className={`p-1 border-r border-gray-200 ${
                              gapCount > 0
                                ? 'bg-red-50 text-red-700 font-bold border-red-200'
                                : 'text-gray-300'
                            }`}
                          >
                            {gapCount > 0 ? gapCount : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // 5. Employee-Wise View (Individual Schedule Inspector & Drilldown)
  const targetEmp =
    (isEmployee
      ? employees.find((e) => e.employeeCode === currentUser?.employeeRef) ||
        employees.find((e) => e.email?.toLowerCase() === currentUser?.email?.toLowerCase())
      : null) ||
    employees.find((e) => e.id === selectedEmployeeId) ||
    employees.find((e) => (isPodLead ? e.podId === (currentUser?.podId || 'pod-alpha') : true)) ||
    employees[0];

  if (!targetEmp) {
    return (
      <div className="border border-gray-300 bg-white p-8 text-center text-xs font-mono text-gray-500">
        Loading employee schedule profile...
      </div>
    );
  }

  const empEntries = entries.filter((e) => e.employeeId === targetEmp?.id);

  return (
    <div className="border border-gray-300 bg-white p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-300 gap-4">
        <div>
          <span className="text-xs font-mono font-bold text-blue-700 uppercase">
            {targetEmp?.employeeCode}
          </span>
          <h2 className="text-xl font-bold text-gray-900">{targetEmp?.fullName?.replace(/\s*\([A-Z0-9]+\)$/, '')}</h2>
          <div className="flex items-center space-x-3 text-xs text-gray-600 mt-1">
            <span>{targetEmp?.email}</span>
            <span>·</span>
            <span>{targetEmp?.podName}</span>
            <span>·</span>
            <span>
              Weekly Off: {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][targetEmp?.weeklyOffPreference || 0]}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {currentUser?.role === UserRole.EMPLOYEE ? (
            <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-300 px-2 py-1 uppercase">
              Personal Schedule View: {targetEmp?.fullName?.replace(/\s*\([A-Z0-9]+\)$/, '')} ({targetEmp?.employeeCode})
            </span>
          ) : (
            <>
              <label className="text-xs text-gray-600 font-sans">Select Employee:</label>
              <select
                value={targetEmp?.id}
                onChange={(e) => onSelectEmployee?.(e.target.value)}
                className="border border-gray-400 bg-white p-1.5 text-xs font-medium text-gray-800"
              >
                {(isPodLead
                  ? employees.filter((e) => e.podId === (currentUser?.podId || 'pod-alpha'))
                  : employees
                ).map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeCode} - {emp.fullName} ({emp.podName})
                  </option>
                ))}
              </select>
              {onOpenManageStaff && (
                <button
                  onClick={onOpenManageStaff}
                  className="px-2.5 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-mono font-bold"
                  title="Open Full Staff Directory & Preview All Details"
                >
                  Preview All Details
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-tight mb-3">
          Daily Schedule Breakdown for {monthYear}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {daysArray.map((d) => {
            const dateStr = formatDate(year, month, d);
            const dateObj = new Date(dateStr);
            const dayEntries = empEntries.filter((e) => e.date === dateStr);
            const workingEntry = dayEntries.find((e) => e.status === ScheduleStatus.WORKING);
            const leaveEntry = dayEntries.find((e) => e.status === ScheduleStatus.APPROVED_LEAVE);
            const isWeeklyOff = targetEmp?.weeklyOffPreference === dateObj.getDay();

            let statusLabel = 'Working';
            let statusColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';

            if (leaveEntry) {
              statusLabel = 'Approved Leave';
              statusColor = 'bg-amber-50 text-amber-900 border-amber-300 font-bold';
            } else if (isWeeklyOff && !workingEntry) {
              statusLabel = 'Weekly Off';
              statusColor = 'bg-gray-100 text-gray-700 border-gray-200';
            } else if (workingEntry?.isOverride) {
              statusLabel = 'Reassigned Override';
              statusColor = 'bg-blue-100 text-blue-900 border-blue-400 font-bold';
            }

            return (
              <div
                key={d}
                onClick={() => onCellClick?.(targetEmp, dateStr, dayEntries)}
                className={`border p-2.5 ${statusColor} cursor-pointer hover:ring-1 hover:ring-gray-900 transition-all`}
                title={`Click to inspect or override ${targetEmp?.fullName || 'employee'}'s duty on ${dateStr}`}
              >
                <div className="flex justify-between items-center text-xs font-mono font-bold">
                  <span>Day {d}</span>
                  <span>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()]}</span>
                </div>
                <div className="text-xs font-semibold mt-1.5 truncate">{statusLabel}</div>
                {workingEntry && (
                  <div className="text-[11px] text-gray-600 mt-0.5 truncate font-mono">
                    {brandMap.get(workingEntry.brandId)?.name || workingEntry.brandId}
                    {workingEntry.shiftTiming && workingEntry.shiftTiming !== ShiftTiming.GENERAL && (
                      <span className="ml-1 text-[10px] font-bold text-gray-800">
                        ({workingEntry.shiftTiming})
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
