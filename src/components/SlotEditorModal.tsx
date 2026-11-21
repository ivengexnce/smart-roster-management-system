'use client';

import React, { useState } from 'react';
import {
  RosterEntry,
  Employee,
  Brand,
  Process,
  ScheduleStatus,
  ShiftTiming,
  User,
  UserRole,
} from '@/types';
import { IconClose, IconCheck, IconCalendar } from './icons';

interface SlotEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  dateStr: string;
  currentEntries: RosterEntry[];
  brands: Brand[];
  processes: Process[];
  currentUser: User | null;
  rosterId: string;
  onSave: () => void;
}

export function SlotEditorModal({
  isOpen,
  onClose,
  employee,
  dateStr,
  currentEntries,
  brands,
  processes,
  currentUser,
  rosterId,
  onSave,
}: SlotEditorModalProps) {
  const primaryEntry = currentEntries[0];

  const [status, setStatus] = useState<ScheduleStatus>(() => {
    return primaryEntry?.status || ScheduleStatus.WORKING;
  });
  const [brandId, setBrandId] = useState<string>(() => {
    return primaryEntry?.brandId && primaryEntry.brandId !== 'standby'
      ? primaryEntry.brandId
      : brands[0]?.id || '';
  });
  const [processId, setProcessId] = useState<string>(() => {
    return primaryEntry?.processId && primaryEntry.processId !== 'reserve'
      ? primaryEntry.processId
      : processes[0]?.id || '';
  });
  const [shiftTiming, setShiftTiming] = useState<ShiftTiming>(() => {
    return primaryEntry?.shiftTiming || ShiftTiming.GENERAL;
  });
  const [overrideReason, setOverrideReason] = useState<string>(
    primaryEntry?.overrideReason || 'Manual operations room slot adjustment'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !employee) return null;

  const canEdit =
    currentUser?.role === UserRole.OPERATIONS_MANAGER ||
    currentUser?.role === UserRole.POD_LEAD;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setErrorMessage('Access Denied: Only Operations Managers and Pod Leads can edit schedule slots.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/roster/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rosterId,
          date: dateStr,
          brandId,
          processId,
          backupEmployeeId: employee.id,
          status,
          shiftTiming,
          reason: overrideReason,
          actorRole: currentUser?.role || UserRole.OPERATIONS_MANAGER,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSave();
        onClose();
      } else {
        setErrorMessage(data.error || 'Failed to update schedule slot');
      }
    } catch {
      setErrorMessage('Network error while saving schedule slot');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-900 w-full max-w-lg shadow-none rounded-none flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-300 flex items-center justify-between bg-gray-50">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase bg-gray-900 text-white px-1.5 py-0.5">
                Slot Inspector &amp; Override
              </span>
              <span className="text-xs text-gray-500 font-mono">{dateStr}</span>
            </div>
            <h2 className="text-sm font-black text-gray-900 tracking-tight mt-1">
              {employee.fullName.replace(/\s*\([A-Z0-9]+\)$/, '')} ({employee.employeeCode})
            </h2>
            <p className="text-[11px] text-gray-500">
              Pod: {employee.podName || employee.podId} | Preferred Off:{' '}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][employee.weeklyOffPreference]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 border border-gray-300 text-gray-700 rounded-none transition-colors"
            title="Close"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border-b border-rose-300 text-xs text-rose-800 font-mono">
            <strong>Error:</strong> {errorMessage}
          </div>
        )}

        {/* Read-Only Mode for Employees */}
        {!canEdit ? (
          <div className="p-4 space-y-4 text-xs font-sans">
            <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 font-mono text-[11px]">
              <strong>ACCESS LEVEL: READ-ONLY (EMPLOYEE ROLE)</strong>
              <p className="mt-1">
                You are viewing slot details in self-service mode. Slot modifications and override reassignments require Operations Manager or Pod Lead authorization.
              </p>
            </div>

            <div className="border border-gray-300 divide-y divide-gray-200">
              <div className="p-2.5 flex justify-between bg-gray-50">
                <span className="font-mono text-gray-500 font-bold">DATE:</span>
                <span className="font-mono font-bold text-gray-900">{dateStr}</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span className="font-mono text-gray-500 font-bold">DUTY STATUS:</span>
                <span className="font-mono font-bold text-gray-900">{primaryEntry?.status || status}</span>
              </div>
              {primaryEntry?.brandId && (
                <div className="p-2.5 flex justify-between">
                  <span className="font-mono text-gray-500 font-bold">BRAND ACCOUNT:</span>
                  <span className="font-bold text-gray-900">
                    {brands.find((b) => b.id === primaryEntry.brandId)?.name || primaryEntry.brandId}
                  </span>
                </div>
              )}
              {primaryEntry?.processId && (
                <div className="p-2.5 flex justify-between">
                  <span className="font-mono text-gray-500 font-bold">PROCESS:</span>
                  <span className="font-bold text-gray-900">
                    {processes.find((p) => p.id === primaryEntry.processId)?.name || primaryEntry.processId}
                  </span>
                </div>
              )}
              <div className="p-2.5 flex justify-between">
                <span className="font-mono text-gray-500 font-bold">SHIFT TIMING:</span>
                <span className="font-mono font-bold text-gray-900">
                  {primaryEntry?.shiftTiming ? `${primaryEntry.shiftTiming} SHIFT` : 'GENERAL (09:00 - 18:00)'}
                </span>
              </div>
              {primaryEntry?.isOverride && (
                <div className="p-2.5 flex justify-between bg-blue-50/50">
                  <span className="font-mono text-blue-800 font-bold">OVERRIDE RATIONALE:</span>
                  <span className="text-blue-900 italic">{primaryEntry.overrideReason || 'Reassigned Duty'}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-gray-900 text-white hover:bg-black rounded-none font-mono text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        ) : (
          /* Form Body */
          <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs font-sans">
            <div>
              <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                Duty Status for {dateStr}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ScheduleStatus)}
                className="w-full border border-gray-400 p-2 text-xs bg-white rounded-none font-mono"
              >
                <option value={ScheduleStatus.WORKING}>WORKING (Assigned Shift)</option>
                <option value={ScheduleStatus.WEEKLY_OFF}>WEEKLY OFF (Scheduled Rest Day)</option>
                <option value={ScheduleStatus.COMP_OFF}>COMPENSATORY OFF (Redeemed Credit)</option>
                <option value={ScheduleStatus.APPROVED_LEAVE}>APPROVED LEAVE (Planned / Sick)</option>
                <option value={ScheduleStatus.PUBLIC_HOLIDAY}>PUBLIC HOLIDAY (Mandatory Off)</option>
                <option value={ScheduleStatus.UNASSIGNED}>RESERVE / STANDBY (Floater Pool)</option>
              </select>
            </div>

            {status === ScheduleStatus.WORKING && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                      Client Brand Account
                    </label>
                    <select
                      value={brandId}
                      onChange={(e) => setBrandId(e.target.value)}
                      className="w-full border border-gray-400 p-2 text-xs bg-white rounded-none"
                    >
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                      Process Duty
                    </label>
                    <select
                      value={processId}
                      onChange={(e) => setProcessId(e.target.value)}
                      className="w-full border border-gray-400 p-2 text-xs bg-white rounded-none"
                    >
                      {processes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} - {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Shift Timing Window
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    {[
                      { id: ShiftTiming.GENERAL, label: 'General', hours: '09:00 - 18:00' },
                      { id: ShiftTiming.MORNING, label: 'Morning', hours: '08:00 - 16:00' },
                      { id: ShiftTiming.AFTERNOON, label: 'Afternoon', hours: '16:00 - 00:00' },
                      { id: ShiftTiming.NIGHT, label: 'Night', hours: '00:00 - 08:00' },
                    ].map((sh) => (
                      <button
                        key={sh.id}
                        type="button"
                        onClick={() => setShiftTiming(sh.id)}
                        className={`p-2 border text-left rounded-none ${
                          shiftTiming === sh.id
                            ? 'border-gray-900 bg-gray-900 text-white font-bold'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="text-[11px]">{sh.label}</div>
                        <div className="text-[9px] opacity-75">{sh.hours}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                Override Rationale (Audit Logged)
              </label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full border border-gray-400 p-2 text-xs bg-white rounded-none font-mono"
                required
              />
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-[10px] text-gray-500 font-mono">
                Action logged by: {currentUser?.fullName || 'Manager'}
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-none font-mono text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !canEdit}
                  className="px-4 py-1.5 bg-gray-900 text-white hover:bg-black rounded-none font-mono text-xs flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <IconCheck className="w-3.5 h-3.5" />
                  <span>Save Override</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
