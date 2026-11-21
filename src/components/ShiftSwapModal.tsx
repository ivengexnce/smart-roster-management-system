'use client';

import React, { useState } from 'react';
import {
  ShiftSwapRequest,
  CompOffCredit,
  Employee,
  Brand,
  Process,
  User,
  UserRole,
  SwapStatus,
} from '@/types';
import { IconClose, IconAnimatedArrow, IconCheck, IconCalendar } from './icons';

interface ShiftSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  swaps: ShiftSwapRequest[];
  compOffs: CompOffCredit[];
  employees: Employee[];
  brands: Brand[];
  processes: Process[];
  currentUser: User | null;
  currentMonth: string;
  onRefresh: () => void;
}

export function ShiftSwapModal({
  isOpen,
  onClose,
  swaps,
  compOffs,
  employees,
  brands,
  processes,
  currentUser,
  currentMonth,
  onRefresh,
}: ShiftSwapModalProps) {
  const [activeTab, setActiveTab] = useState<'SWAPS' | 'CREATE_SWAP' | 'COMPOFF' | 'GRANT_COMPOFF'>('SWAPS');

  // Form states - Shift Swap
  const [requesterId, setRequesterId] = useState(() => {
    if (currentUser?.employeeRef) {
      const match = employees.find((e) => e.employeeCode === currentUser.employeeRef);
      if (match) return match.id;
    }
    return employees[1]?.id || employees[0]?.id || '';
  });
  const [targetId, setTargetId] = useState(employees[7]?.id || employees[0]?.id || '');
  const [swapDate, setSwapDate] = useState(`${currentMonth}-15`);
  const [swapBrandId, setSwapBrandId] = useState(brands[1]?.id || brands[0]?.id || '');
  const [swapProcessId, setSwapProcessId] = useState(processes[0]?.id || '');
  const [swapReason, setSwapReason] = useState('');

  // Form states - Comp-off Grant
  const [grantEmpId, setGrantEmpId] = useState(employees[0]?.id || '');
  const [grantDate, setGrantDate] = useState(`${currentMonth}-08`);
  const [grantReason, setGrantReason] = useState('Weekend shift coverage for 365-day brand');

  // Form states - Comp-off Redeem
  const [redeemCompOffId, setRedeemCompOffId] = useState<string | null>(null);
  const [redeemLeaveDate, setRedeemLeaveDate] = useState(`${currentMonth}-22`);

  // General state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  React.useEffect(() => {
    if (currentUser?.employeeRef) {
      const match = employees.find((e) => e.employeeCode === currentUser.employeeRef);
      if (match) setRequesterId(match.id);
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

  const visibleSwaps = React.useMemo(() => {
    if (isEmployee) {
      const myId = myEmp?.id || currentUser?.id;
      const myCode = myEmp?.employeeCode || currentUser?.employeeRef;
      return swaps.filter(
        (s) =>
          s.requesterEmpId === myId ||
          s.targetEmpId === myId ||
          (myCode && (s.requesterEmpName?.includes(`(${myCode})`) || s.targetEmpName?.includes(`(${myCode})`)))
      );
    }
    if (isPodLead && currentUser?.podId) {
      const podEmpIds = new Set(employees.filter((e) => e.podId === currentUser.podId).map((e) => e.id));
      return swaps.filter((s) => podEmpIds.has(s.requesterEmpId) || podEmpIds.has(s.targetEmpId));
    }
    return swaps;
  }, [swaps, isEmployee, isPodLead, myEmp, currentUser, employees]);

  const visibleCompOffs = React.useMemo(() => {
    if (isEmployee) {
      const myId = myEmp?.id || currentUser?.id;
      const myCode = myEmp?.employeeCode || currentUser?.employeeRef;
      return compOffs.filter(
        (c) =>
          c.employeeId === myId ||
          (myCode && c.employeeName?.includes(`(${myCode})`))
      );
    }
    if (isPodLead && currentUser?.podId) {
      const podEmpIds = new Set(employees.filter((e) => e.podId === currentUser.podId).map((e) => e.id));
      return compOffs.filter((c) => podEmpIds.has(c.employeeId));
    }
    return compOffs;
  }, [compOffs, isEmployee, isPodLead, myEmp, currentUser, employees]);

  if (!isOpen) return null;

  const canManage = isManager || isPodLead;

  // Handle Approve / Reject Swap
  const handleSwapAction = async (swapId: string, action: 'APPROVE_SWAP' | 'REJECT_SWAP') => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/swaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          swapId,
          actorRole: currentUser?.role || UserRole.OPERATIONS_MANAGER,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Swap request has been ${action === 'APPROVE_SWAP' ? 'approved' : 'rejected'}.`);
        onRefresh();
      } else {
        setErrorMessage(data.error || 'Operation failed');
      }
    } catch {
      setErrorMessage('Network error while processing swap');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Shift Swap Request
  const handleSubmitSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/swaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_SWAP',
          requesterEmpId: requesterId,
          targetEmpId: targetId,
          date: swapDate,
          brandId: swapBrandId,
          processId: swapProcessId,
          reason: swapReason,
          actorRole: currentUser?.role || UserRole.EMPLOYEE,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Shift swap request created and routed for review.');
        setSwapReason('');
        onRefresh();
        setTimeout(() => setActiveTab('SWAPS'), 700);
      } else {
        setErrorMessage(data.error || 'Failed to submit shift swap');
      }
    } catch {
      setErrorMessage('Network error submitting shift swap');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Grant Comp-Off Credit
  const handleGrantCompOff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/swaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GRANT_COMPOFF',
          employeeId: grantEmpId,
          earnedDate: grantDate,
          earnedReason: grantReason,
          actorRole: currentUser?.role || UserRole.OPERATIONS_MANAGER,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Comp-Off credit successfully granted and logged.');
        onRefresh();
        setTimeout(() => setActiveTab('COMPOFF'), 700);
      } else {
        setErrorMessage(data.error || 'Failed to grant comp-off');
      }
    } catch {
      setErrorMessage('Network error granting comp-off');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redeem Comp-Off as Leave
  const handleRedeemCompOff = async (compOffId: string) => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/swaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REDEEM_COMPOFF',
          compOffId,
          leaveDate: redeemLeaveDate,
          actorRole: currentUser?.role || UserRole.EMPLOYEE,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Comp-off redeemed as approved leave on ${redeemLeaveDate}.`);
        setRedeemCompOffId(null);
        onRefresh();
      } else {
        setErrorMessage(data.error || 'Failed to redeem comp-off');
      }
    } catch {
      setErrorMessage('Network error redeeming comp-off');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-900 w-full max-w-4xl shadow-none rounded-none max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-300 flex items-center justify-between bg-gray-50">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase bg-gray-900 text-white px-1.5 py-0.5">
                Workforce Flexibility
              </span>
              <span className="text-xs text-gray-500 font-mono">Month: {currentMonth}</span>
            </div>
            <h2 className="text-base font-black text-gray-900 tracking-tight mt-1">
              SHIFT SWAPPING & COMP-OFF MANAGEMENT
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              It&apos;s not informal schedule drift, it&apos;s constraint-validated peer exchanges and audited compensatory credits.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 border border-gray-300 text-gray-700 rounded-none transition-colors"
            title="Close"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-300 bg-gray-100 text-xs font-mono">
          <button
            onClick={() => { setActiveTab('SWAPS'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`px-4 py-2.5 font-bold border-r border-gray-300 flex items-center space-x-2 ${
              activeTab === 'SWAPS' ? 'bg-white text-gray-900 border-b-2 border-b-gray-900' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{isEmployee ? 'My Swaps' : isPodLead ? 'Pod Swaps' : 'Shift Swaps'}</span>
            <span className="bg-gray-200 text-gray-800 text-[10px] px-1.5 py-0.2">
              {visibleSwaps.length}
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('CREATE_SWAP'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`px-4 py-2.5 font-bold border-r border-gray-300 ${
              activeTab === 'CREATE_SWAP' ? 'bg-white text-gray-900 border-b-2 border-b-gray-900' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            + Request Swap
          </button>
          <button
            onClick={() => { setActiveTab('COMPOFF'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`px-4 py-2.5 font-bold border-r border-gray-300 flex items-center space-x-2 ${
              activeTab === 'COMPOFF' ? 'bg-white text-gray-900 border-b-2 border-b-gray-900' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{isEmployee ? 'My Comp-Off' : isPodLead ? 'Pod Comp-Off' : 'Comp-Off Bank'}</span>
            <span className="bg-gray-200 text-gray-800 text-[10px] px-1.5 py-0.2">
              {visibleCompOffs.filter((c) => c.status === 'AVAILABLE').length} Avail
            </span>
          </button>
          {canManage && (
            <button
              onClick={() => { setActiveTab('GRANT_COMPOFF'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`px-4 py-2.5 font-bold ${
                activeTab === 'GRANT_COMPOFF' ? 'bg-white text-gray-900 border-b-2 border-b-gray-900' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              + Grant Credit
            </button>
          )}
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border-b border-red-300 text-xs text-red-700 font-mono">
            <strong>Error:</strong> {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-300 text-xs text-emerald-800 font-mono">
            <strong>Success:</strong> {successMessage}
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* TAB 1: SWAPS LIST */}
          {activeTab === 'SWAPS' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-gray-500 font-mono">
                  {isEmployee ? 'My Active Swaps' : isPodLead ? 'Pod Swap Requests' : 'Total Swap Requests'}: {visibleSwaps.length} | Role: {currentUser?.role || 'OPERATIONS_MANAGER'}
                </span>
                <button
                  onClick={() => setActiveTab('CREATE_SWAP')}
                  className="px-2.5 py-1 text-xs font-mono bg-gray-900 text-white hover:bg-black rounded-none flex items-center space-x-1"
                >
                  <IconAnimatedArrow className="w-3.5 h-3.5" />
                  <span>Propose Shift Swap</span>
                </button>
              </div>

              {visibleSwaps.length === 0 ? (
                <div className="p-8 text-center border border-gray-300 bg-gray-50 text-xs font-mono text-gray-500">
                  {isEmployee
                    ? 'You have not submitted or received any shift swap requests.'
                    : isPodLead
                    ? 'No shift swaps submitted for your operational pod.'
                    : 'No shift swaps submitted yet. Click "Propose Shift Swap" to initiate a peer shift exchange.'}
                </div>
              ) : (
                <div className="border border-gray-300 divide-y divide-gray-200">
                  {visibleSwaps.map((s) => (
                    <div key={s.id} className="p-3 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center space-x-2 font-mono">
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold border ${
                              s.status === SwapStatus.APPROVED
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : s.status === SwapStatus.REJECTED
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            {s.status}
                          </span>
                          <span className="font-bold text-gray-900">{s.date}</span>
                          <span className="text-gray-400">|</span>
                          <span className="text-gray-600 font-sans">{s.brandName || s.brandId}</span>
                          <span className="text-gray-400">|</span>
                          <span className="text-gray-600 font-sans">{s.processName || s.processId}</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-700">
                          <span className="font-semibold text-gray-900">{s.requesterEmpName}</span>
                          <span className="text-gray-500 mx-1.5">swaps with</span>
                          <span className="font-semibold text-gray-900">{s.targetEmpName}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 italic">
                          &quot;{s.reason}&quot;
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-2 self-start md:self-center shrink-0">
                        {s.status === SwapStatus.PENDING && canManage ? (
                          <>
                            <button
                              disabled={isSubmitting}
                              onClick={() => handleSwapAction(s.id, 'APPROVE_SWAP')}
                              className="px-2.5 py-1 text-xs font-mono bg-emerald-700 hover:bg-emerald-800 text-white rounded-none flex items-center space-x-1"
                            >
                              <IconCheck className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              disabled={isSubmitting}
                              onClick={() => handleSwapAction(s.id, 'REJECT_SWAP')}
                              className="px-2.5 py-1 text-xs font-mono bg-rose-700 hover:bg-rose-800 text-white rounded-none"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] font-mono text-gray-400">
                            {s.status === SwapStatus.APPROVED ? 'Synced into Roster' : s.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE SHIFT SWAP */}
          {activeTab === 'CREATE_SWAP' && (
            <form onSubmit={handleSubmitSwap} className="space-y-4 max-w-xl mx-auto border border-gray-300 p-4 bg-gray-50">
              <div className="border-b border-gray-300 pb-2">
                <h3 className="text-xs font-bold text-gray-900 font-mono uppercase">
                  Propose Peer Shift Swap
                </h3>
                <p className="text-[11px] text-gray-600">
                  Target candidate must hold verified qualification for the required process and have no active leave.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Requester (Giving Up Shift)
                  </label>
                  <select
                    value={requesterId}
                    onChange={(e) => setRequesterId(e.target.value)}
                    disabled={!canManage}
                    className="w-full border border-gray-400 p-2 text-xs bg-white rounded-none disabled:bg-gray-100 disabled:text-gray-600"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.employeeCode} - {e.fullName} ({e.podName || e.podId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Target Backup (Taking Shift)
                  </label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full border border-gray-400 p-2 text-xs bg-white rounded-none"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.employeeCode} - {e.fullName} ({e.qualifiedProcessIds.join(', ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={swapDate}
                    onChange={(e) => setSwapDate(e.target.value)}
                    className="w-full border border-gray-400 p-2 text-xs bg-white rounded-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Process Required
                  </label>
                  <select
                    value={swapProcessId}
                    onChange={(e) => setSwapProcessId(e.target.value)}
                    className="w-full border border-gray-400 p-2 text-xs bg-white rounded-none"
                  >
                    {processes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Target Brand Account
                  </label>
                  <select
                    value={swapBrandId}
                    onChange={(e) => setSwapBrandId(e.target.value)}
                    className="w-full border border-gray-400 p-2 text-xs bg-white rounded-none"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.isSingleResource ? 'Single-Resource' : 'Multi-Resource'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Reason for Swap
                  </label>
                  <input
                    type="text"
                    value={swapReason}
                    onChange={(e) => setSwapReason(e.target.value)}
                    placeholder="e.g. Schedule conflict, mutual exchange arrangement"
                    className="w-full border border-gray-400 p-2 text-xs bg-white rounded-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-300">
                <button
                  type="button"
                  onClick={() => setActiveTab('SWAPS')}
                  className="px-3 py-1.5 text-xs font-mono border border-gray-400 text-gray-700 hover:bg-gray-200 rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-mono bg-gray-900 text-white hover:bg-black rounded-none flex items-center space-x-1"
                >
                  <IconAnimatedArrow className="w-3.5 h-3.5" />
                  <span>Submit for Approval</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: COMP-OFF BANK */}
          {activeTab === 'COMPOFF' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-xs text-gray-500 font-mono">
                    Compensatory off credits earned when working on designated weekly offs or holidays.
                  </span>
                </div>
                {canManage && (
                  <button
                    onClick={() => setActiveTab('GRANT_COMPOFF')}
                    className="px-2.5 py-1 text-xs font-mono bg-gray-900 text-white hover:bg-black rounded-none flex items-center space-x-1"
                  >
                    <span>+ Grant Comp-Off</span>
                  </button>
                )}
              </div>

              {visibleCompOffs.length === 0 ? (
                <div className="p-8 text-center border border-gray-300 bg-gray-50 text-xs font-mono text-gray-500">
                  {isEmployee
                    ? 'You have no compensatory off credits in your account.'
                    : isPodLead
                    ? 'No comp-off credits registered for personnel in your operational pod.'
                    : 'No comp-off credits registered yet.'}
                </div>
              ) : (
                <div className="border border-gray-300 divide-y divide-gray-200">
                  {visibleCompOffs.map((c) => (
                    <div key={c.id} className="p-3 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center space-x-2 font-mono">
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold border ${
                              c.status === 'AVAILABLE'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : c.status === 'REDEEMED'
                                ? 'bg-gray-100 text-gray-700 border-gray-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            {c.status}
                          </span>
                          <span className="font-bold text-gray-900">{c.employeeName}</span>
                          <span className="text-gray-400">|</span>
                          <span className="text-gray-600 font-mono">Earned: {c.earnedDate}</span>
                          <span className="text-gray-400">|</span>
                          <span className="text-gray-500 font-mono">Expires: {c.expiryDate}</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          <strong>Earned Reason:</strong> {c.earnedReason}
                        </div>
                        {c.redeemedOnLeaveDate && (
                          <div className="text-[11px] text-emerald-700 font-mono mt-0.5">
                            Redeemed as approved leave on: {c.redeemedOnLeaveDate}
                          </div>
                        )}
                      </div>

                      {/* Redemption controls */}
                      {c.status === 'AVAILABLE' && (
                        <div className="flex items-center space-x-2 self-start md:self-center">
                          {redeemCompOffId === c.id ? (
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="date"
                                value={redeemLeaveDate}
                                onChange={(e) => setRedeemLeaveDate(e.target.value)}
                                className="border border-gray-400 p-1 text-xs font-mono rounded-none"
                              />
                              <button
                                disabled={isSubmitting}
                                onClick={() => handleRedeemCompOff(c.id)}
                                className="px-2 py-1 text-xs font-mono bg-emerald-700 text-white rounded-none hover:bg-emerald-800"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setRedeemCompOffId(null)}
                                className="px-1.5 py-1 text-xs font-mono border border-gray-300 hover:bg-gray-100 rounded-none"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRedeemCompOffId(c.id)}
                              className="px-2.5 py-1 text-xs font-mono border border-gray-900 bg-white hover:bg-gray-100 text-gray-900 rounded-none flex items-center space-x-1"
                            >
                              <IconCalendar className="w-3.5 h-3.5" />
                              <span>Redeem Leave</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: GRANT COMP-OFF CREDIT */}
          {activeTab === 'GRANT_COMPOFF' && canManage && (
            <form onSubmit={handleGrantCompOff} className="space-y-4 max-w-xl mx-auto border border-gray-300 p-4 bg-gray-50">
              <div className="border-b border-gray-300 pb-2">
                <h3 className="text-xs font-bold text-gray-900 font-mono uppercase">
                  Grant Compensatory Credit
                </h3>
                <p className="text-[11px] text-gray-600">
                  Comp-Off credits are awarded to employees who worked on national holidays or designated weekly offs.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Employee
                  </label>
                  <select
                    value={grantEmpId}
                    onChange={(e) => setGrantEmpId(e.target.value)}
                    className="w-full border border-gray-400 p-2 text-xs bg-white rounded-none"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.employeeCode} - {e.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Date Worked
                  </label>
                  <input
                    type="date"
                    value={grantDate}
                    onChange={(e) => setGrantDate(e.target.value)}
                    className="w-full border border-gray-400 p-2 text-xs bg-white rounded-none font-mono"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Earned Rationale
                  </label>
                  <input
                    type="text"
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                    placeholder="e.g. Worked Sunday weekly-off for Brand B Customer Support"
                    className="w-full border border-gray-400 p-2 text-xs bg-white rounded-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-300">
                <button
                  type="button"
                  onClick={() => setActiveTab('COMPOFF')}
                  className="px-3 py-1.5 text-xs font-mono border border-gray-400 text-gray-700 hover:bg-gray-200 rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-mono bg-gray-900 text-white hover:bg-black rounded-none"
                >
                  Grant 1 Credit
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-300 flex justify-between items-center text-xs font-mono text-gray-500">
          <div>Author: Meet Maru | Datastraw Tech Internship Assessment</div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white border border-gray-400 text-gray-800 hover:bg-gray-200 rounded-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
