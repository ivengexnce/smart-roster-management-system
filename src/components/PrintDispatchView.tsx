'use client';

import React from 'react';
import {
  Roster,
  RosterEntry,
  Employee,
  Brand,
  Pod,
  Process,
  ScheduleStatus,
} from '@/types';
import { getDaysInMonth, formatDate } from '@/lib/scheduling-engine';
import { IconFileText, IconCheck } from './icons';

interface PrintDispatchViewProps {
  roster: Roster | null;
  entries: RosterEntry[];
  employees: Employee[];
  brands: Brand[];
  pods: Pod[];
  processes: Process[];
  monthYear: string;
}

export function PrintDispatchView({
  roster,
  entries,
  employees,
  brands,
  pods,
  processes,
  monthYear,
}: PrintDispatchViewProps) {
  const { daysCount, year, month } = getDaysInMonth(monthYear);
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);
  const brandMap = new Map(brands.map((b) => [b.id, b]));

  // Index entries by: date -> employeeId -> entries
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print Controls Bar (Hidden during actual print) */}
      <div className="print:hidden border border-gray-900 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 font-mono text-xs">
            <span className="bg-gray-900 text-white px-1.5 py-0.5 uppercase font-bold text-[10px]">
              Dispatch Document
            </span>
            <span className="text-gray-500">Target Month: {monthYear}</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-700">Status: {roster?.status || 'DRAFT'}</span>
          </div>
          <h2 className="text-base font-black text-gray-900 mt-1">
            OPERATIONS ROOM PHYSICAL DISPATCH PRINT SHEET
          </h2>
          <p className="text-xs text-gray-600">
            High-contrast, A4 landscape monochrome format engineered for shift handovers, emergency muster rosters, and command center walls.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-gray-900 text-white font-mono text-xs font-bold uppercase hover:bg-black flex items-center space-x-2 rounded-none shrink-0"
        >
          <IconFileText className="w-4 h-4" />
          <span>Print / Save PDF (A4)</span>
        </button>
      </div>

      {/* Actual Printable Document Container */}
      <div className="border border-gray-300 bg-white p-6 print:border-none print:p-0">
        {/* Document Header */}
        <div className="border-b-2 border-gray-900 pb-3 mb-4 flex justify-between items-start">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-700">
              Datastraw Operations Command Center
            </div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight uppercase">
              MONTHLY WORKFORCE DISPATCH ROSTER &bull; {monthYear}
            </h1>
            <div className="text-[11px] font-mono text-gray-600 mt-0.5">
              Roster Version: v{roster?.version || 1} | State: {roster?.status || 'VALIDATED'} | Personnel: 30 | Brands: 18 | Pods: 3
            </div>
          </div>
          <div className="text-right text-[10px] font-mono text-gray-600">
            <div>Printed: {new Date().toLocaleDateString()}</div>
            <div>Author: Meet Maru</div>
            <div className="font-bold text-gray-900 mt-1">OFFICIAL DISPATCH</div>
          </div>
        </div>

        {/* Legend */}
        <div className="text-[10px] font-mono border border-gray-400 p-1.5 mb-4 bg-gray-50 flex flex-wrap gap-4 print:bg-white">
          <span><strong>LEGEND:</strong></span>
          <span><strong>[BR-*]</strong> Working Brand Duty</span>
          <span><strong>[R: BR-*]</strong> Reassigned Backup Override</span>
          <span><strong>[WO]</strong> Scheduled Weekly Off</span>
          <span><strong>[LV]</strong> Approved Leave</span>
          <span><strong>[PH]</strong> Public Holiday</span>
          <span><strong>[RSV]</strong> Floater Active Reserve</span>
        </div>

        {/* Pod by Pod Printable Matrix */}
        {pods.map((pod) => {
          const podEmps = employees.filter((e) => e.podId === pod.id);

          return (
            <div key={pod.id} className="mb-6 break-inside-avoid">
              <div className="bg-gray-200 border border-gray-900 px-2 py-1 text-xs font-mono font-bold uppercase flex justify-between print:bg-gray-200">
                <span>{pod.name} ({pod.code}) &bull; Supervisor: {pod.leadName || 'Assigned Lead'}</span>
                <span>{podEmps.length} Personnel</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse border border-gray-900 text-[9px] font-mono">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-900">
                      <th className="p-1 text-left w-36 border-r border-gray-400">Employee</th>
                      {daysArray.map((d) => (
                        <th key={d} className="p-0.5 border-r border-gray-300 w-5">
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {podEmps.map((emp) => (
                      <tr key={emp.id} className="border-b border-gray-300">
                        <td className="p-1 text-left border-r border-gray-400 font-bold truncate">
                          {emp.employeeCode} {emp.fullName}
                        </td>
                        {daysArray.map((d) => {
                          const dateStr = formatDate(year, month, d);
                          const empEntries = entryDateEmpMap.get(dateStr)?.get(emp.id) || [];
                          const work = empEntries.find((e) => e.status === ScheduleStatus.WORKING);
                          const leave = empEntries.find((e) => e.status === ScheduleStatus.APPROVED_LEAVE);
                          const wo = empEntries.find((e) => e.status === ScheduleStatus.WEEKLY_OFF);

                          let text = 'RSV';
                          if (work) {
                            const b = brandMap.get(work.brandId);
                            text = (work.isOverride ? 'R:' : '') + (b?.code || work.brandId.replace('brand-', ''));
                          } else if (leave) {
                            text = 'LV';
                          } else if (wo) {
                            text = 'WO';
                          }

                          return (
                            <td key={d} className="p-0.5 border-r border-gray-300 text-[8px]">
                              {text}
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

        {/* Supervisor Sign-Off & Emergency Dispatch Block */}
        <div className="border-t-2 border-gray-900 pt-4 mt-6 grid grid-cols-3 gap-4 text-xs font-mono break-inside-avoid">
          <div className="border border-gray-400 p-3">
            <div className="font-bold uppercase text-[10px] text-gray-500">Prepared By</div>
            <div className="mt-2 font-bold text-gray-900">Meet Maru</div>
            <div className="text-[10px] text-gray-500">Operations Engineer</div>
          </div>

          <div className="border border-gray-400 p-3">
            <div className="font-bold uppercase text-[10px] text-gray-500">Shift Lead Sign-Off</div>
            <div className="mt-6 border-b border-dotted border-gray-600" />
            <div className="text-[10px] text-gray-400 mt-1 text-center">Authorized Signature</div>
          </div>

          <div className="border border-gray-400 p-3">
            <div className="font-bold uppercase text-[10px] text-gray-500">Emergency Standby Pool</div>
            <div className="text-[10px] text-gray-700 mt-1">
              Alpha Floaters: E09, E10<br />
              Beta Floaters: E19, E20<br />
              Gamma Floaters: E29, E30
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
