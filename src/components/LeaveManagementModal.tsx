'use client';

import React, { useState } from 'react';
import { LeaveRequest, LeaveType, LeaveStatus, Employee, User, UserRole } from '@/types';
import { IconClose, IconCalendar, IconCheck, IconAnimatedArrow } from './icons';

interface LeaveManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaves: LeaveRequest[];
  employees: Employee[];
  currentUser: User | null;
  currentMonth: string;
  onLeaveUpdated: () => void;
}

export function LeaveManagementModal({
  isOpen,
  onClose,
  leaves,
  employees,
  currentUser,
  currentMonth,
  onLeaveUpdated,
}: LeaveManagementModalProps) {
  const [tab, setTab] = useState<'LIST' | 'SUBMIT'>('LIST');
  const [selectedEmpId, setSelectedEmpId] = useState(() => {
    if (currentUser?.employeeRef) {
      const match = employees.find((e) => e.employeeCode === currentUser.employeeRef);
      if (match) return match.id;
    }
    return employees[0]?.id || '';
  });
  const [leaveDate, setLeaveDate] = useState(`${currentMonth}-12`);
  const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.PLANNED_LEAVE);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  React.useEffect(() => {
    if (currentUser?.employeeRef) {
      const match = employees.find((e) => e.employeeCode === currentUser.employeeRef);
      if (match) setSelectedEmpId(match.id);
    }
  }, [currentUser, employees]);

  const isEmployee = currentUser?.role === UserRole.EMPLOYEE;
  const isPodLead = currentUser?.role === UserRole.POD_LEAD;
  const isManager = currentUser?.role === UserRole.OPERATIONS_MANAGER;

  const myEmp = React.useMemo(() => {
    return (
      employees.find((e) => e.employeeCode === currentUser?.employeeRef) ||
      employees.find((e) => e.email?.toLowerCase() === currentUser?.email?.toLowerCase()) ||
      employees.find((e) => e.id === currentUser?.id)
    );
  }, [employees, currentUser]);

  const visibleLeaves = React.useMemo(() => {
    if (isEmployee) {
      const myId = myEmp?.id || currentUser?.id;
      const myCode = myEmp?.employeeCode || currentUser?.employeeRef;
      return leaves.filter(
        (l) =>
          l.employeeId === myId ||
          (myCode && l.employeeName?.includes(`(${myCode})`)) ||
          l.employeeName?.toLowerCase().includes((currentUser?.fullName || '').toLowerCase())
      );
    }
    if (isPodLead) {
      const targetPodId = currentUser?.podId || 'pod-alpha';
      const podEmpIds = new Set(employees.filter((e) => e.podId === targetPodId).map((e) => e.id));
      return leaves.filter((l) => podEmpIds.has(l.employeeId));
    }
    return leaves;
  }, [leaves, isEmployee, isPodLead, myEmp, currentUser, employees]);

  if (!isOpen) return null;

  const canApprove = isManager || isPodLead;

  const handleAction = async (leaveId: string, action: 'APPROVE' | 'REJECT') => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          leaveId,
          actorRole: currentUser?.role || UserRole.OPERATIONS_MANAGER,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onLeaveUpdated();
      } else {
        setErrorMsg(data.error || 'Action failed');
      }
    } catch {
      setErrorMsg('Network error while processing leave action');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          date: leaveDate,
          leaveType,
          reason,
          actorRole: currentUser?.role || UserRole.EMPLOYEE,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Leave request logged for ${leaveDate}. Schedule will reflect this availability change.`);
        setReason('');
        onLeaveUpdated();
        setTimeout(() => setTab('LIST'), 800);
      } else {
        setErrorMsg(data.error || 'Failed to submit leave request');
      }
    } catch {
      setErrorMsg('Network error while submitting leave');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-400 max-w-2xl w-full p-6 select-text max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-300 mb-4">
          <div className="flex items-center space-x-2">
            <IconCalendar className="w-5 h-5 text-gray-900" />
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                Leave Management &amp; Availability Tracking
              </h3>
              <p className="text-[11px] text-gray-500 font-mono">
                Planned Leaves, Sick Days, and Compensatory Offs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-black hover:bg-gray-100"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border border-gray-300 mb-4">
          <button
            onClick={() => {
              setTab('LIST');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-tight ${
              tab === 'LIST' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isEmployee
              ? `My Requests (${visibleLeaves.length})`
              : isPodLead
              ? `Pod Requests (${visibleLeaves.length})`
              : `All Requests (${visibleLeaves.length})`}
          </button>
          <button
            onClick={() => {
              setTab('SUBMIT');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-tight ${
              tab === 'SUBMIT' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            + Submit Leave Request
          </button>
        </div>

        {/* Feedback messages */}
        {errorMsg && (
          <div className="p-2 mb-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-2 mb-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            {successMsg}
          </div>
        )}

        {/* Tab 1: Requests List */}
        {tab === 'LIST' && (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 text-gray-700">
                  <th className="p-2 font-sans font-bold">Employee</th>
                  <th className="p-2 font-sans font-bold">Date</th>
                  <th className="p-2 font-sans font-bold">Type</th>
                  <th className="p-2 font-sans font-bold">Reason</th>
                  <th className="p-2 font-sans font-bold">Status</th>
                  {canApprove && <th className="p-2 font-sans font-bold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visibleLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-400 font-sans">
                      {isEmployee
                        ? 'You have no personal leave requests logged for this operational period.'
                        : isPodLead
                        ? 'No leave requests logged for your operational pod.'
                        : 'No leave records logged for this operational period.'}
                    </td>
                  </tr>
                ) : (
                  visibleLeaves.map((leave) => {
                    const isPending = leave.status === LeaveStatus.PENDING;
                    const isApproved = leave.status === LeaveStatus.APPROVED;

                    return (
                      <tr key={leave.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-2 font-bold text-gray-900 font-sans">
                          {leave.employeeName || leave.employeeId}
                        </td>
                        <td className="p-2 text-gray-700 whitespace-nowrap">{leave.date}</td>
                        <td className="p-2">
                          <span className="text-[10px] font-mono px-1 py-0.5 bg-gray-100 text-gray-700 border border-gray-300">
                            {leave.leaveType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-2 text-gray-600 truncate max-w-xs">{leave.reason || '-'}</td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold uppercase border ${
                              isApproved
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : isPending
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-red-50 text-red-800 border-red-200'
                            }`}
                          >
                            {leave.status}
                          </span>
                        </td>
                        {canApprove && (
                          <td className="p-2 text-right space-x-1 whitespace-nowrap">
                            {isPending && (
                              <>
                                <button
                                  disabled={isSubmitting}
                                  onClick={() => handleAction(leave.id, 'APPROVE')}
                                  className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold uppercase"
                                >
                                  Approve
                                </button>
                                <button
                                  disabled={isSubmitting}
                                  onClick={() => handleAction(leave.id, 'REJECT')}
                                  className="px-2 py-1 bg-red-700 hover:bg-red-800 text-white text-[10px] font-bold uppercase"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Submit New Request */}
        {tab === 'SUBMIT' && (
          <form onSubmit={handleSubmitLeave} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-gray-700 uppercase">
                  Select Employee
                </label>
                {isEmployee && (
                  <span className="text-[10px] text-gray-500 font-mono">
                    (Self-Service: Locked to your profile)
                  </span>
                )}
              </div>
              {isEmployee ? (
                <div className="p-2 border border-gray-300 bg-gray-100 text-xs font-mono text-gray-900 font-bold">
                  {myEmp?.employeeCode || currentUser?.employeeRef || 'E02'} - {myEmp?.fullName || currentUser?.fullName} ({myEmp?.podName || 'Pod Alpha'})
                </div>
              ) : (
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full border border-gray-300 p-2 text-xs bg-white text-gray-900"
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
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                  Leave Date
                </label>
                <input
                  type="date"
                  required
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="w-full border border-gray-300 p-2 text-xs bg-white text-gray-900 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                  Leave Type
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full border border-gray-300 p-2 text-xs bg-white text-gray-900"
                >
                  <option value={LeaveType.PLANNED_LEAVE}>Planned Vacation</option>
                  <option value={LeaveType.SICK_LEAVE}>Sick Leave</option>
                  <option value={LeaveType.COMP_OFF}>Compensatory Off</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                Operational Rationale / Reason
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Specify the reason for this planned leave..."
                className="w-full border border-gray-300 p-2 text-xs bg-white text-gray-900"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>Submit Leave Request</span>
              <IconAnimatedArrow className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-gray-200 mt-4 flex items-center justify-between text-xs text-gray-500">
          <span>Approved leaves take precedence over schedule assignments.</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 uppercase"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
