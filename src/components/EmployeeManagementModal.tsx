'use client';

/**
 * Employee Management & Rich Detail Preview Modal
 * Author: Meet Maru (meetmaru@datastraw.io)
 * Project: Datastraw Tech Internship Assessment
 * 
 * Provides:
 * 1. Range Selection & Slicing (1-10, 11-20, 21-30, Custom Range, All)
 * 2. Preview All Employee Details (Profile, Pod, Qualifications, Weekly Off, Shifts, Mini Timeline)
 * 3. Manager Employee Management (Add New Employee, Edit Employee, Deactivate)
 * 4. Strict Role-Gated Access Control (Manager can write, Lead/Staff can view)
 */

import React, { useState, useMemo } from 'react';
import {
  Employee,
  Pod,
  Brand,
  Process,
  RosterEntry,
  LeaveRequest,
  CompOffCredit,
  UserRole,
  ScheduleStatus,
} from '@/types';
import {
  IconClose,
  IconUsers,
  IconBriefcase,
  IconLayers,
  IconCalendar,
  IconCheck,
  IconAnimatedArrow,
  IconFilter,
} from './icons';

interface EmployeeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  pods: Pod[];
  brands: Brand[];
  processes: Process[];
  entries: RosterEntry[];
  leaves: LeaveRequest[];
  compOffs: CompOffCredit[];
  actorRole: UserRole;
  currentMonth: string;
  onRefresh: () => void;
}

export function EmployeeManagementModal({
  isOpen,
  onClose,
  employees,
  pods,
  brands,
  processes,
  entries,
  leaves,
  compOffs,
  actorRole,
  currentMonth,
  onRefresh,
}: EmployeeManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'ADD_EMPLOYEE'>('DIRECTORY');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPodFilter, setSelectedPodFilter] = useState<string>('');
  
  // Range selection state
  const [rangePreset, setRangePreset] = useState<'ALL' | '1-10' | '11-20' | '21-30' | 'CUSTOM'>('1-10');
  const [customRangeStart, setCustomRangeStart] = useState<number>(1);
  const [customRangeEnd, setCustomRangeEnd] = useState<number>(10);

  // Selected employee for detail preview
  const [previewEmployeeId, setPreviewEmployeeId] = useState<string>(() => {
    return employees[0]?.id || '';
  });

  // Editing state
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Add Employee Form State
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('+91 98000 00000');
  const [newPodId, setNewPodId] = useState(pods[0]?.id || 'pod-alpha');
  const [newWeeklyOff, setNewWeeklyOff] = useState<number>(1);
  const [newQualifications, setNewQualifications] = useState<string[]>(['proc-cs']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);

  const isManager = actorRole === UserRole.OPERATIONS_MANAGER;
  const isPodLead = actorRole === UserRole.POD_LEAD;

  // Filter and Slice Employees by Range
  const filteredEmployees = useMemo(() => {
    let result = [...employees];

    if (isPodLead) {
      result = result.filter((e) => e.podId === 'pod-alpha');
    } else if (selectedPodFilter) {
      result = result.filter((e) => e.podId === selectedPodFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q)
      );
    }

    // Apply Range Slicing (Pod Leads are pre-scoped to their 10 staff in Pod Alpha)
    if (isPodLead) {
      return result;
    }

    if (rangePreset === '1-10') {
      result = result.slice(0, 10);
    } else if (rangePreset === '11-20') {
      result = result.slice(10, 20);
    } else if (rangePreset === '21-30') {
      result = result.slice(20, 30);
    } else if (rangePreset === 'CUSTOM') {
      const start = Math.max(0, customRangeStart - 1);
      const end = Math.min(result.length, customRangeEnd);
      result = result.slice(start, end);
    }

    return result;
  }, [employees, isPodLead, selectedPodFilter, searchQuery, rangePreset, customRangeStart, customRangeEnd]);

  // Target preview employee
  const previewEmp = useMemo(() => {
    return employees.find((e) => e.id === previewEmployeeId) || filteredEmployees[0] || employees[0];
  }, [employees, previewEmployeeId, filteredEmployees]);

  // Compute live operational metrics for preview employee
  const previewMetrics = useMemo(() => {
    if (!previewEmp) return null;
    const empId = previewEmp.id;
    const workingShifts = entries.filter((e) => e.employeeId === empId && e.status === ScheduleStatus.WORKING).length;
    const weeklyOffs = entries.filter((e) => e.employeeId === empId && e.status === ScheduleStatus.WEEKLY_OFF).length;
    const approvedLeaves = leaves.filter((l) => l.employeeId === empId && l.status === 'APPROVED').length;
    const compOffBalance = compOffs.filter((c) => c.employeeId === empId && c.status === 'AVAILABLE').length;

    const brandEntry = entries.find((e) => e.employeeId === empId && e.status === ScheduleStatus.WORKING);
    const assignedBrandName = brandEntry
      ? brands.find((b) => b.id === brandEntry.brandId)?.name || brandEntry.brandId
      : 'Brand Dedicated';

    return {
      workingShifts,
      weeklyOffs,
      approvedLeaves,
      compOffBalance,
      assignedBrandName,
    };
  }, [previewEmp, entries, leaves, compOffs, brands]);

  if (!isOpen || actorRole === UserRole.EMPLOYEE) return null;

  // Handle Add Employee Submit
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManager) {
      setFeedbackMsg({ type: 'ERROR', text: 'Access Denied: Only Operations Managers can add employees.' });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode: newCode,
          fullName: newName,
          email: newEmail,
          phone: newPhone,
          podId: newPodId,
          weeklyOffPreference: newWeeklyOff,
          qualifiedProcessIds: newQualifications,
          actorRole,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedbackMsg({ type: 'SUCCESS', text: data.message });
        setNewCode('');
        setNewName('');
        setNewEmail('');
        onRefresh();
        setTimeout(() => setActiveTab('DIRECTORY'), 1200);
      } else {
        setFeedbackMsg({ type: 'ERROR', text: data.error || 'Failed to create employee.' });
      }
    } catch {
      setFeedbackMsg({ type: 'ERROR', text: 'Network error while creating employee.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Update Employee Submit
  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEmployee.id,
          fullName: editingEmployee.fullName,
          email: editingEmployee.email,
          phone: editingEmployee.phone,
          podId: editingEmployee.podId,
          weeklyOffPreference: editingEmployee.weeklyOffPreference,
          qualifiedProcessIds: editingEmployee.qualifiedProcessIds,
          status: editingEmployee.status,
          actorRole,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedbackMsg({ type: 'SUCCESS', text: data.message });
        setEditingEmployee(null);
        onRefresh();
      } else {
        setFeedbackMsg({ type: 'ERROR', text: data.error || 'Update failed.' });
      }
    } catch {
      setFeedbackMsg({ type: 'ERROR', text: 'Network error while updating employee.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-6 select-text font-sans">
      <div className="bg-white border border-gray-900 w-full max-w-6xl h-[90vh] flex flex-col shadow-none rounded-none overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-300 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-900 text-white">
              <IconUsers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase bg-blue-600 text-white px-1.5 py-0.2 font-bold">
                  Workforce Console
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  {employees.length} Registered Personnel · Target: {currentMonth}
                </span>
              </div>
              <h2 className="text-base font-black text-gray-900 uppercase tracking-tight mt-0.5">
                EMPLOYEE MANAGEMENT &amp; RANGE DIRECTORY
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isManager && (
              <div className="flex border border-gray-300 text-xs font-mono mr-2">
                <button
                  onClick={() => {
                    setActiveTab('DIRECTORY');
                    setEditingEmployee(null);
                  }}
                  className={`px-3 py-1.5 font-bold transition-colors ${
                    activeTab === 'DIRECTORY' && !editingEmployee
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Directory &amp; Preview
                </button>
                <button
                  onClick={() => {
                    setActiveTab('ADD_EMPLOYEE');
                    setEditingEmployee(null);
                  }}
                  className={`px-3 py-1.5 font-bold transition-colors ${
                    activeTab === 'ADD_EMPLOYEE'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  + Add Employee
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 border border-gray-300 text-gray-700 rounded-none transition-colors"
              title="Close Modal"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`px-4 py-2 text-xs font-mono border-b flex items-center justify-between ${
              feedbackMsg.type === 'SUCCESS'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-rose-50 text-rose-900 border-rose-300'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)} className="text-gray-500 hover:text-black">
              <IconClose className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        {activeTab === 'DIRECTORY' && !editingEmployee ? (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-gray-300">
            {/* Left Column: Range Slicing Controls & Employee List (55% width) */}
            <div className="w-full md:w-[55%] flex flex-col min-h-0 bg-white">
              {/* Range Selector Bar */}
              <div className="p-3 bg-gray-50/80 border-b border-gray-300 space-y-2.5 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-gray-600 uppercase text-[10px]">Range Preset:</span>
                    {isPodLead ? (
                      <span className="px-2 py-0.5 text-xs font-bold bg-amber-600 text-white border border-amber-600">
                        Pod Alpha Staff (1–10)
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => setRangePreset('1-10')}
                          className={`px-2 py-0.5 text-xs font-bold border transition-colors ${
                            rangePreset === '1-10'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          1–10 (Alpha)
                        </button>
                        <button
                          onClick={() => setRangePreset('11-20')}
                          className={`px-2 py-0.5 text-xs font-bold border transition-colors ${
                            rangePreset === '11-20'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          11–20 (Beta)
                        </button>
                        <button
                          onClick={() => setRangePreset('21-30')}
                          className={`px-2 py-0.5 text-xs font-bold border transition-colors ${
                            rangePreset === '21-30'
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          21–30 (Gamma)
                        </button>
                        <button
                          onClick={() => setRangePreset('ALL')}
                          className={`px-2 py-0.5 text-xs font-bold border transition-colors ${
                            rangePreset === 'ALL'
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          All (1–{employees.length})
                        </button>
                        <button
                          onClick={() => setRangePreset('CUSTOM')}
                          className={`px-2 py-0.5 text-xs font-bold border transition-colors ${
                            rangePreset === 'CUSTOM'
                              ? 'bg-purple-700 text-white border-purple-700'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          Custom
                        </button>
                      </>
                    )}
                  </div>

                  <span className="text-[11px] text-gray-500 font-bold">
                    Showing {filteredEmployees.length} of {employees.length}
                  </span>
                </div>

                {/* Custom Range Input Bar (Visible when rangePreset === 'CUSTOM') */}
                {rangePreset === 'CUSTOM' && (
                  <div className="flex items-center space-x-2 p-2 bg-purple-50/50 border border-purple-200 text-xs font-mono">
                    <span className="font-bold text-purple-900 uppercase text-[10px]">Slice Range:</span>
                    <span>From</span>
                    <input
                      type="number"
                      min={1}
                      max={employees.length}
                      value={customRangeStart}
                      onChange={(e) => setCustomRangeStart(parseInt(e.target.value, 10) || 1)}
                      className="w-14 border border-gray-400 p-1 text-center bg-white"
                    />
                    <span>To</span>
                    <input
                      type="number"
                      min={1}
                      max={employees.length}
                      value={customRangeEnd}
                      onChange={(e) => setCustomRangeEnd(parseInt(e.target.value, 10) || employees.length)}
                      className="w-14 border border-gray-400 p-1 text-center bg-white"
                    />
                    <span className="text-[10px] text-gray-500">
                      (Max: {employees.length} employees)
                    </span>
                  </div>
                )}

                {/* Search & Pod Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by name, E-code, or email..."
                    className="flex-1 border border-gray-300 p-1.5 text-xs bg-white focus:outline-none focus:border-black font-mono"
                  />

                  <select
                    value={selectedPodFilter}
                    onChange={(e) => setSelectedPodFilter(e.target.value)}
                    className="border border-gray-300 p-1.5 text-xs bg-white text-gray-800 font-mono"
                  >
                    <option value="">All Pods</option>
                    {pods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scrollable Employee Table List */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-200">
                {filteredEmployees.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 font-mono">
                    No employees found matching the active range/filters.
                  </div>
                ) : (
                  filteredEmployees.map((emp, idx) => {
                    const isSelected = previewEmp?.id === emp.id;
                    const prefOffDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][emp.weeklyOffPreference];

                    return (
                      <div
                        key={emp.id}
                        onClick={() => setPreviewEmployeeId(emp.id)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50/80 border-l-4 border-l-blue-600'
                            : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-mono font-bold text-gray-400 w-6">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-xs bg-gray-100 border border-gray-300 px-1 py-0.2 text-gray-800">
                                {emp.employeeCode}
                              </span>
                              <span className="font-bold text-sm text-gray-900">{emp.fullName}</span>
                              <span
                                className={`text-[9px] font-mono px-1 py-0.2 uppercase border ${
                                  emp.status === 'ACTIVE'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}
                              >
                                {emp.status}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">
                              {emp.podName} · Off: {prefOffDay} · {emp.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 text-xs">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewEmployeeId(emp.id);
                            }}
                            className="px-2 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-mono text-[11px]"
                          >
                            Preview
                          </button>
                          {isManager && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEmployee(emp);
                              }}
                              className="px-2 py-1 bg-white border border-gray-300 hover:border-black text-gray-900 font-mono text-[11px] font-bold"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Preview All Employee Details (45% width) */}
            <div className="w-full md:w-[45%] flex flex-col min-h-0 bg-gray-50/50 p-4 overflow-y-auto">
              {previewEmp ? (
                <div className="space-y-4">
                  {/* Preview Header */}
                  <div className="p-4 bg-white border border-gray-300">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold bg-blue-600 text-white px-2 py-0.5">
                            {previewEmp.employeeCode}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 uppercase border ${
                              previewEmp.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {previewEmp.status}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight mt-1">
                          {previewEmp.fullName}
                        </h3>
                        <p className="text-xs text-gray-500 font-mono">{previewEmp.email}</p>
                        <p className="text-xs text-gray-500 font-mono">{previewEmp.phone}</p>
                      </div>

                      {isManager && (
                        <button
                          onClick={() => setEditingEmployee(previewEmp)}
                          className="px-3 py-1.5 bg-gray-900 text-white text-xs font-mono font-bold uppercase hover:bg-black"
                        >
                          Edit Profile
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Operational Detail Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-gray-300">
                      <div className="text-[10px] font-mono text-gray-500 uppercase font-bold">
                        Operational Pod
                      </div>
                      <div className="text-sm font-bold text-gray-900 mt-0.5">{previewEmp.podName}</div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        Lead: {pods.find((p) => p.id === previewEmp.podId)?.leadName || 'Assigned Lead'}
                      </div>
                    </div>

                    <div className="p-3 bg-white border border-gray-300">
                      <div className="text-[10px] font-mono text-gray-500 uppercase font-bold">
                        Weekly Off Day
                      </div>
                      <div className="text-sm font-bold text-gray-900 mt-0.5">
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][previewEmp.weeklyOffPreference]}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">Standard Rest Day</div>
                    </div>
                  </div>

                  {/* Month Live KPI Metrics */}
                  <div className="p-3 bg-white border border-gray-300">
                    <div className="text-[10px] font-mono text-gray-500 uppercase font-bold mb-2">
                      Active Operational Metrics ({currentMonth})
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center font-mono">
                      <div className="p-2 bg-emerald-50 border border-emerald-200">
                        <div className="text-base font-black text-emerald-800">
                          {previewMetrics?.workingShifts || 0}
                        </div>
                        <div className="text-[9px] text-emerald-900 uppercase">Shifts</div>
                      </div>
                      <div className="p-2 bg-gray-100 border border-gray-300">
                        <div className="text-base font-black text-gray-800">
                          {previewMetrics?.weeklyOffs || 0}
                        </div>
                        <div className="text-[9px] text-gray-600 uppercase">Offs</div>
                      </div>
                      <div className="p-2 bg-amber-50 border border-amber-200">
                        <div className="text-base font-black text-amber-800">
                          {previewMetrics?.approvedLeaves || 0}
                        </div>
                        <div className="text-[9px] text-amber-900 uppercase">Leaves</div>
                      </div>
                      <div className="p-2 bg-blue-50 border border-blue-200">
                        <div className="text-base font-black text-blue-800">
                          {previewMetrics?.compOffBalance || 0}
                        </div>
                        <div className="text-[9px] text-blue-900 uppercase">Credits</div>
                      </div>
                    </div>
                  </div>

                  {/* Qualifications & Dedicated Brands */}
                  <div className="p-3 bg-white border border-gray-300 space-y-2">
                    <div>
                      <span className="text-[10px] font-mono text-gray-500 uppercase font-bold block mb-1">
                        Qualified Operations Processes:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {previewEmp.qualifiedProcessIds.map((procId) => {
                          const pObj = processes.find((p) => p.id === procId);
                          return (
                            <span
                              key={procId}
                              className="text-xs font-mono font-bold bg-blue-50 text-blue-900 border border-blue-300 px-2 py-0.5"
                            >
                              {pObj?.name || procId.replace('proc-', '').toUpperCase()}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-[10px] font-mono text-gray-500 uppercase font-bold block mb-1">
                        Primary Dedicated Account:
                      </span>
                      <span className="text-xs font-bold text-gray-800">
                        {previewMetrics?.assignedBrandName}
                      </span>
                    </div>
                  </div>

                  {/* 30-Day Monthly Schedule Timeline Preview */}
                  <div className="p-3 bg-white border border-gray-300">
                    <span className="text-[10px] font-mono text-gray-500 uppercase font-bold block mb-2">
                      30-Day Shift Timeline Preview ({currentMonth}):
                    </span>
                    <div className="grid grid-cols-6 sm:grid-cols-10 gap-1 text-center font-mono text-[10px]">
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                        const dateStr = `${currentMonth}-${day.toString().padStart(2, '0')}`;
                        const dayEntries = entries.filter(
                          (e) => e.employeeId === previewEmp.id && e.date === dateStr
                        );
                        const isWorking = dayEntries.some((e) => e.status === ScheduleStatus.WORKING);
                        const isLeave = dayEntries.some((e) => e.status === ScheduleStatus.APPROVED_LEAVE);
                        const isOff = dayEntries.some((e) => e.status === ScheduleStatus.WEEKLY_OFF);

                        let badgeColor = 'bg-gray-50 text-gray-400 border-gray-200';
                        let label = `${day}`;

                        if (isLeave) {
                          badgeColor = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
                          label = 'LV';
                        } else if (isOff) {
                          badgeColor = 'bg-gray-200 text-gray-700 border-gray-300';
                          label = 'OFF';
                        } else if (isWorking) {
                          badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
                          label = 'W';
                        }

                        return (
                          <div
                            key={day}
                            className={`p-1 border ${badgeColor} flex flex-col justify-center items-center`}
                            title={`Day ${day}: ${isLeave ? 'Approved Leave' : isOff ? 'Weekly Off' : isWorking ? 'Working Shift' : 'Reserve'}`}
                          >
                            <span className="text-[9px] text-gray-500">{day}</span>
                            <span className="font-bold">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-gray-500 font-mono">
                  Select an employee from the directory to preview full operational details.
                </div>
              )}
            </div>
          </div>
        ) : editingEmployee ? (
          /* TAB: EDIT EMPLOYEE PROFILE */
          <div className="flex-1 p-6 overflow-y-auto max-w-2xl mx-auto w-full">
            <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase bg-gray-900 text-white px-2 py-0.5 font-bold">
                  Edit Personnel Record
                </span>
                <h3 className="text-base font-black text-gray-900 mt-1">
                  Updating {editingEmployee.fullName} ({editingEmployee.employeeCode})
                </h3>
              </div>
              <button
                onClick={() => setEditingEmployee(null)}
                className="px-3 py-1 bg-white border border-gray-300 text-xs font-mono hover:bg-gray-100"
              >
                Back to Directory
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingEmployee.fullName}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, fullName: e.target.value })
                    }
                    className="w-full border border-gray-400 p-2 text-xs bg-white focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={editingEmployee.email}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, email: e.target.value })
                    }
                    className="w-full border border-gray-400 p-2 text-xs font-mono bg-white focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Operational Pod
                  </label>
                  <select
                    value={editingEmployee.podId}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, podId: e.target.value })
                    }
                    className="w-full border border-gray-400 p-2 text-xs bg-white font-mono"
                  >
                    {pods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Weekly Off Preference
                  </label>
                  <select
                    value={editingEmployee.weeklyOffPreference}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        weeklyOffPreference: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full border border-gray-400 p-2 text-xs bg-white font-mono"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                  Active Status
                </label>
                <select
                  value={editingEmployee.status}
                  onChange={(e) =>
                    setEditingEmployee({
                      ...editingEmployee,
                      status: e.target.value as 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE',
                    })
                  }
                  className="w-full border border-gray-400 p-2 text-xs bg-white font-mono"
                >
                  <option value="ACTIVE">ACTIVE (Eligible for Shifts)</option>
                  <option value="ON_LEAVE">ON_LEAVE (Temporary Hold)</option>
                  <option value="INACTIVE">INACTIVE (Deactivated)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                  Qualified Processes (Check all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2 border border-gray-300 p-3 bg-gray-50">
                  {processes.map((proc) => {
                    const isChecked = editingEmployee.qualifiedProcessIds.includes(proc.id);
                    return (
                      <label key={proc.id} className="flex items-center space-x-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newQ = e.target.checked
                              ? [...editingEmployee.qualifiedProcessIds, proc.id]
                              : editingEmployee.qualifiedProcessIds.filter((id) => id !== proc.id);
                            setEditingEmployee({ ...editingEmployee, qualifiedProcessIds: newQ });
                          }}
                        />
                        <span>{proc.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-xs font-mono font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-bold uppercase disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Changes...' : 'Save Employee Profile'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* TAB: ADD NEW EMPLOYEE */
          <div className="flex-1 p-6 overflow-y-auto max-w-2xl mx-auto w-full">
            <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase bg-blue-600 text-white px-2 py-0.5 font-bold">
                  New Workforce Intake
                </span>
                <h3 className="text-base font-black text-gray-900 mt-1">
                  Register New Employee to Pod Roster
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('DIRECTORY')}
                className="px-3 py-1 bg-white border border-gray-300 text-xs font-mono hover:bg-gray-100"
              >
                Back to Directory
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Employee Code (Unique)
                  </label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="e.g. E31"
                    className="w-full border border-gray-400 p-2 text-xs font-mono bg-white focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Tarun Chopra"
                    className="w-full border border-gray-400 p-2 text-xs bg-white focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Corporate Email
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. tarun.chopra@datastraw.io"
                    className="w-full border border-gray-400 p-2 text-xs font-mono bg-white focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full border border-gray-400 p-2 text-xs font-mono bg-white focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Assign to Pod
                  </label>
                  <select
                    value={newPodId}
                    onChange={(e) => setNewPodId(e.target.value)}
                    className="w-full border border-gray-400 p-2 text-xs bg-white font-mono"
                  >
                    {pods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                    Weekly Off Preference
                  </label>
                  <select
                    value={newWeeklyOff}
                    onChange={(e) => setNewWeeklyOff(parseInt(e.target.value, 10))}
                    className="w-full border border-gray-400 p-2 text-xs bg-white font-mono"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                  Qualified Operational Processes
                </label>
                <div className="grid grid-cols-2 gap-2 border border-gray-300 p-3 bg-gray-50">
                  {processes.map((proc) => {
                    const isChecked = newQualifications.includes(proc.id);
                    return (
                      <label key={proc.id} className="flex items-center space-x-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewQualifications([...newQualifications, proc.id]);
                            } else {
                              setNewQualifications(newQualifications.filter((id) => id !== proc.id));
                            }
                          }}
                        />
                        <span>{proc.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('DIRECTORY')}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-xs font-mono font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-bold uppercase disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering Employee...' : '+ Add Employee to System'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-300 flex items-center justify-between text-xs text-gray-500 font-mono shrink-0">
          <div>
            Showing employees in active range: <strong className="text-gray-900">{rangePreset}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 uppercase font-bold"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
}
