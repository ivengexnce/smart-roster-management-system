'use client';

import React from 'react';
import {
  Roster,
  RosterEntry,
  Conflict,
  Employee,
  Brand,
  Pod,
  Process,
  ScheduleStatus,
  OperatingCalendarType,
} from '@/types';
import { IconCheck, IconAlertOctagon, IconUsers, IconBriefcase, IconLayers } from './icons';

interface AnalyticsDashboardProps {
  roster: Roster | null;
  rosterEntries: RosterEntry[];
  conflicts: Conflict[];
  employees: Employee[];
  brands: Brand[];
  pods: Pod[];
  processes: Process[];
  monthYear: string;
}

export function AnalyticsDashboard({
  roster,
  rosterEntries,
  conflicts,
  employees,
  brands,
  pods,
  processes,
  monthYear,
}: AnalyticsDashboardProps) {
  // 1. Calculate SLA metrics
  const totalSlots = rosterEntries.length;
  const criticalGaps = conflicts.filter((c) => c.severity === 'CRITICAL').length;
  const warnings = conflicts.filter((c) => c.severity === 'WARNING').length;

  const workingSlots = rosterEntries.filter((e) => e.status === ScheduleStatus.WORKING).length;
  const weeklyOffSlots = rosterEntries.filter((e) => e.status === ScheduleStatus.WEEKLY_OFF).length;
  const leaveSlots = rosterEntries.filter((e) => e.status === ScheduleStatus.APPROVED_LEAVE).length;

  // Operational SLA coverage rate
  const requiredWorkingSlots = workingSlots + criticalGaps;
  const slaPercentage =
    requiredWorkingSlots > 0
      ? Math.round((workingSlots / requiredWorkingSlots) * 1000) / 10
      : 100;

  // 2. Single-Resource Vulnerability Metrics
  const singleResourceBrands = brands.filter((b) => b.isSingleResource);
  const multiResourceBrands = brands.filter((b) => !b.isSingleResource);
  const singleResourceRatio = brands.length > 0
    ? Math.round((singleResourceBrands.length / brands.length) * 100)
    : 78;

  // 3. Pod Performance Breakdown
  const podStats = pods.map((pod) => {
    const podEmps = employees.filter((e) => e.podId === pod.id);
    const podEmpIds = new Set(podEmps.map((e) => e.id));
    const podEntries = rosterEntries.filter((e) => podEmpIds.has(e.employeeId));
    const podWorking = podEntries.filter((e) => e.status === ScheduleStatus.WORKING).length;
    
    // Gaps in brands owned by this pod
    const podBrands = brands.filter((b) => b.podId === pod.id);
    const podBrandIds = new Set(podBrands.map((b) => b.id));
    const podConflicts = conflicts.filter((c) => podBrandIds.has(c.brandId));
    const podCritical = podConflicts.filter((c) => c.severity === 'CRITICAL').length;

    const podReq = podWorking + podCritical;
    const podSla = podReq > 0 ? Math.round((podWorking / podReq) * 1000) / 10 : 100;

    return {
      pod,
      employeeCount: podEmps.length,
      brandCount: podBrands.length,
      workingSlots: podWorking,
      criticalGaps: podCritical,
      slaPercentage: podSla,
    };
  });

  // 4. Floater Utilization (Employees with no primary assignments like E09, E10, E19, E20, E29, E30)
  const floaters = employees.filter((e) => {
    const isE09orE10 = ['E09', 'E10', 'E19', 'E20', 'E29', 'E30'].includes(e.employeeCode);
    return isE09orE10;
  });

  const floaterStats = floaters.map((fl) => {
    const assignedOverrides = rosterEntries.filter(
      (e) => e.employeeId === fl.id && e.isOverride
    ).length;
    const totalWorking = rosterEntries.filter(
      (e) => e.employeeId === fl.id && e.status === ScheduleStatus.WORKING
    ).length;
    return {
      employee: fl,
      overrideShifts: assignedOverrides,
      totalWorking,
    };
  });

  return (
    <div className="space-y-6">
      {/* Executive Overview Banner */}
      <div className="border border-gray-900 bg-white p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase bg-gray-900 text-white px-1.5 py-0.5">
                Executive Intelligence
              </span>
              <span className="text-xs font-mono text-gray-500">Month: {monthYear}</span>
              <span className="text-xs font-mono text-gray-400">|</span>
              <span className="text-xs font-mono text-gray-600">Status: {roster?.status || 'DRAFT'}</span>
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight mt-1">
              OPERATIONAL ANALYTICS & SLA COVERAGE
            </h1>
            <p className="text-xs text-gray-600 mt-0.5">
              It&apos;s not passive reporting, it&apos;s deterministic workforce utilization, single-resource risk quantification, and pod compliance auditing.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gray-50 border border-gray-300 text-right">
              <div className="text-[10px] font-mono text-gray-500 uppercase">Monthly SLA Score</div>
              <div
                className={`text-2xl font-black font-mono ${
                  slaPercentage >= 98
                    ? 'text-emerald-700'
                    : slaPercentage >= 90
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                {slaPercentage}%
              </div>
              <div className="text-[10px] font-mono text-gray-400">Target: 100.0%</div>
            </div>
          </div>
        </div>

        {/* 4 Core KPI Stat Boxes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          <div className="p-3 bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between text-gray-500 text-[11px] font-mono uppercase">
              <span>Operational Shifts</span>
              <IconCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold font-mono text-gray-900 mt-1">{workingSlots}</div>
            <div className="text-[10px] text-gray-500 mt-0.5 font-mono">
              Staffed active slots in {monthYear}
            </div>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between text-gray-500 text-[11px] font-mono uppercase">
              <span>Critical Gaps</span>
              <IconAlertOctagon className="w-4 h-4 text-rose-600" />
            </div>
            <div className={`text-xl font-bold font-mono mt-1 ${criticalGaps > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {criticalGaps}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5 font-mono">
              {criticalGaps > 0 ? 'Blocking roster publication' : 'Zero publication blockers'}
            </div>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between text-gray-500 text-[11px] font-mono uppercase">
              <span>Single-Resource Ratio</span>
              <IconBriefcase className="w-4 h-4 text-gray-600" />
            </div>
            <div className="text-xl font-bold font-mono text-gray-900 mt-1">
              {singleResourceRatio}%
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5 font-mono">
              {singleResourceBrands.length} of {brands.length} brands (target: ~80%)
            </div>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between text-gray-500 text-[11px] font-mono uppercase">
              <span>Floaters Deployed</span>
              <IconUsers className="w-4 h-4 text-gray-600" />
            </div>
            <div className="text-xl font-bold font-mono text-gray-900 mt-1">
              {floaters.length} Float
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5 font-mono">
              Standby cross-trained reserves
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Pod-by-Pod Operational Performance */}
      <div className="border border-gray-300 bg-white p-4">
        <div className="flex items-center space-x-2 border-b border-gray-200 pb-2 mb-4">
          <IconLayers className="w-4 h-4 text-gray-700" />
          <h2 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider">
            Pod Operational Health & Compliance
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {podStats.map(({ pod, employeeCount, brandCount, workingSlots, criticalGaps, slaPercentage }) => (
            <div key={pod.id} className="border border-gray-300 p-4 bg-gray-50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-900 font-mono">{pod.name}</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border ${
                      slaPercentage >= 98
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}
                  >
                    {slaPercentage}% SLA
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Lead: {pod.leadName || 'Assigned'} | {pod.code}
                </div>

                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Assigned Workforce:</span>
                    <span className="font-mono font-semibold text-gray-900">{employeeCount} Emps</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Client Brand Accounts:</span>
                    <span className="font-mono font-semibold text-gray-900">{brandCount} Brands</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Operational Shifts:</span>
                    <span className="font-mono font-semibold text-gray-900">{workingSlots} slots</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Critical Coverage Gaps:</span>
                    <span
                      className={`font-mono font-bold ${
                        criticalGaps > 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {criticalGaps}
                    </span>
                  </div>
                </div>
              </div>

              {/* SLA Progress Gauge */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
                  <span>Coverage Gauge</span>
                  <span>{slaPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-none overflow-hidden">
                  <div
                    className={`h-full ${slaPercentage >= 98 ? 'bg-emerald-600' : 'bg-rose-600'}`}
                    style={{ width: `${Math.min(slaPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Single-Resource Risk Radar & Floater Readiness */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Single-Resource Risk Radar */}
        <div className="border border-gray-300 bg-white p-4">
          <div className="border-b border-gray-200 pb-2 mb-3">
            <h2 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider">
              Single-Resource Vulnerability Radar
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              14 of 18 brands (~78%) rely on a single primary employee. A planned leave triggers an immediate critical gap unless backed by qualified floaters.
            </p>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 text-xs">
            {singleResourceBrands.map((b) => {
              const brandConflicts = conflicts.filter((c) => c.brandId === b.id);
              const hasGap = brandConflicts.some((c) => c.severity === 'CRITICAL');
              return (
                <div
                  key={b.id}
                  className={`p-2.5 border flex items-center justify-between ${
                    hasGap
                      ? 'bg-rose-50/60 border-rose-300 text-rose-900'
                      : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs flex items-center space-x-1.5">
                      <span>{b.name}</span>
                      <span className="text-[10px] font-mono text-gray-500">({b.code})</span>
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Pod: {b.podId} | Primary Staff: 1 dedicated
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs">
                    {hasGap ? (
                      <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300">
                        GAP DETECTED
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                        100% COVERED
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floater Readiness & Overrides */}
        <div className="border border-gray-300 bg-white p-4">
          <div className="border-b border-gray-200 pb-2 mb-3">
            <h2 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider">
              Floater Cross-Training & Deployment
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Standby resources with multi-skill qualifications (e.g. E09, E10) deployed for shock absorption and leave coverage.
            </p>
          </div>

          <div className="border border-gray-200 divide-y divide-gray-200 text-xs">
            {floaterStats.map(({ employee, overrideShifts, totalWorking }) => (
              <div key={employee.id} className="p-2.5 flex items-center justify-between bg-white">
                <div>
                  <div className="font-bold text-gray-900 font-mono">
                    {employee.employeeCode} - {employee.fullName}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Pod: {employee.podName || employee.podId} | Qualified: {employee.qualifiedProcessIds.join(', ')}
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <div className="font-bold text-gray-900">
                    {overrideShifts} Backup {overrideShifts === 1 ? 'Shift' : 'Shifts'}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {totalWorking} total shifts active
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 4: Operating Calendar Distribution */}
      <div className="border border-gray-300 bg-white p-4">
        <div className="border-b border-gray-200 pb-2 mb-3">
          <h2 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider">
            Operating Calendar Architecture
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-gray-50 border border-gray-200">
            <div className="font-bold font-mono text-gray-900">Type A: 365-Day Operations</div>
            <div className="text-[11px] text-gray-600 mt-1">
              Operates Monday through Sunday including all national holidays. Zero operational downtime. Requires rotating weekly offs and floater weekend coverage.
            </div>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200">
            <div className="font-bold font-mono text-gray-900">Type B: Public Holidays Off</div>
            <div className="text-[11px] text-gray-600 mt-1">
              Operates Monday through Sunday except declared public holidays. Holidays automatically excused from minimum staffing requirements.
            </div>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200">
            <div className="font-bold font-mono text-gray-900">Type C: Sundays & Holidays Off</div>
            <div className="text-[11px] text-gray-600 mt-1">
              Standard commercial calendar. Operates Monday through Saturday only. Sundays and public holidays are mandatory off days.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
