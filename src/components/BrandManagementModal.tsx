'use client';

/**
 * Brand & Process Configuration Console Modal
 * Author: Meet Maru (meetmaru@datastraw.io)
 * Project: Datastraw Tech Internship Assessment
 * 
 * Fulfills:
 * - Brand Management: Create, edit and deactivate brands.
 * - Single-resource & multi-resource (2-3 employees) configuration.
 * - Shared employee assignments across multiple brands.
 * - Process & operating calendar configuration per brand.
 */

import React, { useState } from 'react';
import { Brand, Pod, Employee, Process, OperatingRule, OperatingCalendarType, UserRole } from '@/types';
import { IconBriefcase, IconClose, IconPlus, IconCheck, IconLayers, IconCalendar } from './icons';

interface BrandManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  brands: Brand[];
  pods: Pod[];
  employees: Employee[];
  processes: Process[];
  operatingRules: OperatingRule[];
  actorRole: UserRole;
  onRefresh: () => void;
}

export function BrandManagementModal({
  isOpen,
  onClose,
  brands,
  pods,
  employees,
  processes,
  operatingRules,
  actorRole,
  onRefresh,
}: BrandManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'ADD_BRAND' | 'RULES'>('DIRECTORY');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPodFilter, setSelectedPodFilter] = useState('');

  // Editing state
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // New Brand Form State
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newPodId, setNewPodId] = useState(pods[0]?.id || 'pod-alpha');
  const [newIsSingleResource, setNewIsSingleResource] = useState(true);
  const [newAssignedEmps, setNewAssignedEmps] = useState<string[]>([]);
  const [newProcessIds, setNewProcessIds] = useState<string[]>(['proc-cs', 'proc-ndr']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);

  const isManager = actorRole === UserRole.OPERATIONS_MANAGER;

  if (!isOpen) return null;

  const filteredBrands = brands.filter((b) => {
    if (selectedPodFilter && b.podId !== selectedPodFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q);
    }
    return true;
  });

  // Handle Create Brand
  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManager) return;
    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          name: newName,
          podId: newPodId,
          isSingleResource: newIsSingleResource,
          assignedEmployeeIds: newAssignedEmps,
          processIds: newProcessIds,
          actorRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg({ type: 'SUCCESS', text: data.message });
        setNewCode('');
        setNewName('');
        onRefresh();
        setTimeout(() => setActiveTab('DIRECTORY'), 1200);
      } else {
        setFeedbackMsg({ type: 'ERROR', text: data.error || 'Failed to create brand' });
      }
    } catch {
      setFeedbackMsg({ type: 'ERROR', text: 'Network error while creating brand' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Update Brand
  const handleUpdateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;
    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch('/api/brands', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBrand.id,
          name: editingBrand.name,
          podId: editingBrand.podId,
          isSingleResource: editingBrand.isSingleResource,
          status: editingBrand.status,
          assignedEmployeeIds: editingBrand.assignedEmployeeIds,
          processIds: editingBrand.processIds,
          actorRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg({ type: 'SUCCESS', text: data.message });
        setEditingBrand(null);
        onRefresh();
      } else {
        setFeedbackMsg({ type: 'ERROR', text: data.error || 'Update failed' });
      }
    } catch {
      setFeedbackMsg({ type: 'ERROR', text: 'Network error while updating brand' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-6 select-text font-sans">
      <div className="bg-white border border-gray-900 w-full max-w-5xl h-[88vh] flex flex-col shadow-none rounded-none overflow-hidden">
        {/* Top Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-300 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-900 text-white">
              <IconBriefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase bg-blue-600 text-white px-1.5 py-0.2 font-bold">
                  Client Accounts Console
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  {brands.length} Client Brands · {brands.filter((b) => b.isSingleResource).length} Single-Resource
                </span>
              </div>
              <h2 className="text-base font-black text-gray-900 uppercase tracking-tight mt-0.5">
                BRAND &amp; PROCESS MANAGEMENT CONSOLE
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex border border-gray-300 text-xs font-mono mr-2">
              <button
                onClick={() => {
                  setActiveTab('DIRECTORY');
                  setEditingBrand(null);
                }}
                className={`px-3 py-1.5 font-bold transition-colors ${
                  activeTab === 'DIRECTORY' && !editingBrand ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Brand Directory
              </button>
              {isManager && (
                <button
                  onClick={() => {
                    setActiveTab('ADD_BRAND');
                    setEditingBrand(null);
                  }}
                  className={`px-3 py-1.5 font-bold transition-colors ${
                    activeTab === 'ADD_BRAND' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  + Add Brand
                </button>
              )}
              <button
                onClick={() => {
                  setActiveTab('RULES');
                  setEditingBrand(null);
                }}
                className={`px-3 py-1.5 font-bold transition-colors ${
                  activeTab === 'RULES' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Process Calendars
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 border border-gray-300 text-gray-700 rounded-none"
              title="Close"
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
        {activeTab === 'DIRECTORY' && !editingBrand && (
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            {/* Filter Bar */}
            <div className="p-3 bg-gray-50 border-b border-gray-300 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center space-x-2 flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by brand name or code..."
                  className="p-1.5 border border-gray-300 bg-white text-gray-900 w-64 focus:outline-none"
                />
                <select
                  value={selectedPodFilter}
                  onChange={(e) => setSelectedPodFilter(e.target.value)}
                  className="p-1.5 border border-gray-300 bg-white text-gray-900"
                >
                  <option value="">All Pods</option>
                  {pods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-gray-600 font-semibold">
                Showing {filteredBrands.length} of {brands.length} Brands
              </div>
            </div>

            {/* Table of Brands */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 text-gray-700">
                    <th className="p-2.5 font-bold">Brand Code &amp; Name</th>
                    <th className="p-2.5 font-bold">Operational Pod</th>
                    <th className="p-2.5 font-bold">Staffing Model</th>
                    <th className="p-2.5 font-bold">Assigned Staff</th>
                    <th className="p-2.5 font-bold">Processes</th>
                    <th className="p-2.5 font-bold">Status</th>
                    {isManager && <th className="p-2.5 font-bold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBrands.map((brand) => {
                    const pod = pods.find((p) => p.id === brand.podId);
                    const assignedNames = (brand.assignedEmployeeIds || [])
                      .map((id) => employees.find((e) => e.id === id)?.fullName || id)
                      .join(', ');

                    return (
                      <tr key={brand.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-2.5 font-bold text-gray-900">
                          <span className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 mr-2 text-gray-800">
                            {brand.code}
                          </span>
                          {brand.name}
                        </td>
                        <td className="p-2.5 text-gray-700">{pod?.name || brand.podId}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 font-bold text-[10px] uppercase border ${
                              brand.isSingleResource
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-blue-50 text-blue-900 border-blue-300'
                            }`}
                          >
                            {brand.isSingleResource ? 'Single-Resource (~78%)' : 'Multi-Resource (2-3 Emps)'}
                          </span>
                        </td>
                        <td className="p-2.5 text-gray-600 truncate max-w-xs" title={assignedNames}>
                          {assignedNames || 'Floater Pool'}
                        </td>
                        <td className="p-2.5">
                          <div className="flex flex-wrap gap-1">
                            {(brand.processIds || ['proc-cs']).map((pid) => (
                              <span
                                key={pid}
                                className="px-1 py-0.2 bg-gray-100 border border-gray-200 text-[9px] uppercase font-bold"
                              >
                                {pid.replace('proc-', '')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 font-bold text-[10px] uppercase border ${
                              brand.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                : 'bg-gray-100 text-gray-600 border-gray-300'
                            }`}
                          >
                            {brand.status}
                          </span>
                        </td>
                        {isManager && (
                          <td className="p-2.5 text-right space-x-1">
                            <button
                              onClick={() => setEditingBrand(brand)}
                              className="px-2 py-1 bg-white border border-gray-300 hover:border-black text-gray-900 font-bold"
                            >
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Brand Form */}
        {activeTab === 'ADD_BRAND' && isManager && (
          <form onSubmit={handleCreateBrand} className="flex-1 p-6 overflow-y-auto space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight pb-2 border-b">
              Register New Client Brand
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Brand Code (Unique):</label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. S, T, U"
                  className="w-full border border-gray-400 p-2 text-xs bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Brand Name:</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Brand S Logistics"
                  className="w-full border border-gray-400 p-2 text-xs bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Operational Pod:</label>
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
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Staffing Model:</label>
                <div className="flex items-center space-x-3 pt-2">
                  <label className="flex items-center space-x-1.5 text-xs">
                    <input
                      type="radio"
                      checked={newIsSingleResource}
                      onChange={() => setNewIsSingleResource(true)}
                    />
                    <span>Single-Resource Dedicated (~78%)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 text-xs">
                    <input
                      type="radio"
                      checked={!newIsSingleResource}
                      onChange={() => setNewIsSingleResource(false)}
                    />
                    <span>Multi-Resource (2-3 Staff)</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Associated Operational Processes:
              </label>
              <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-xs">
                {processes.map((proc) => {
                  const isChecked = newProcessIds.includes(proc.id);
                  return (
                    <label
                      key={proc.id}
                      className={`p-2 border cursor-pointer flex items-center space-x-2 ${
                        isChecked ? 'bg-blue-50 border-blue-400 font-bold' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setNewProcessIds(newProcessIds.filter((p) => p !== proc.id));
                          } else {
                            setNewProcessIds([...newProcessIds, proc.id]);
                          }
                        }}
                      />
                      <span>{proc.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex justify-end space-x-2 border-t">
              <button
                type="button"
                onClick={() => setActiveTab('DIRECTORY')}
                className="px-4 py-2 border border-gray-400 text-xs font-bold uppercase hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold uppercase hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Registering...' : 'Register Brand'}
              </button>
            </div>
          </form>
        )}

        {/* Edit Brand Modal Form */}
        {editingBrand && isManager && (
          <form onSubmit={handleUpdateBrand} className="flex-1 p-6 overflow-y-auto space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight pb-2 border-b">
              Edit Brand: {editingBrand.name} ({editingBrand.code})
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Brand Name:</label>
                <input
                  type="text"
                  required
                  value={editingBrand.name}
                  onChange={(e) => setEditingBrand({ ...editingBrand, name: e.target.value })}
                  className="w-full border border-gray-400 p-2 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Operational Pod:</label>
                <select
                  value={editingBrand.podId}
                  onChange={(e) => setEditingBrand({ ...editingBrand, podId: e.target.value })}
                  className="w-full border border-gray-400 p-2 text-xs bg-white font-mono"
                >
                  {pods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Staffing Model:</label>
                <select
                  value={editingBrand.isSingleResource ? 'SINGLE' : 'MULTI'}
                  onChange={(e) =>
                    setEditingBrand({ ...editingBrand, isSingleResource: e.target.value === 'SINGLE' })
                  }
                  className="w-full border border-gray-400 p-2 text-xs bg-white font-mono"
                >
                  <option value="SINGLE">Single-Resource Dedicated (~78%)</option>
                  <option value="MULTI">Multi-Resource (2-3 Staff)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Status:</label>
                <select
                  value={editingBrand.status}
                  onChange={(e) =>
                    setEditingBrand({ ...editingBrand, status: e.target.value as 'ACTIVE' | 'INACTIVE' })
                  }
                  className="w-full border border-gray-400 p-2 text-xs bg-white font-mono"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end space-x-2 border-t">
              <button
                type="button"
                onClick={() => setEditingBrand(null)}
                className="px-4 py-2 border border-gray-400 text-xs font-bold uppercase hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-900 text-white text-xs font-bold uppercase hover:bg-black disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Brand Updates'}
              </button>
            </div>
          </form>
        )}

        {/* Process Operating Calendars Tab */}
        {activeTab === 'RULES' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight pb-2 border-b flex items-center justify-between">
              <span>Operating Calendars &amp; Minimum Staffing by Process</span>
              <span className="text-xs font-mono text-gray-500">{operatingRules.length} Configured Rules</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 text-gray-700">
                    <th className="p-2 font-bold">Rule ID</th>
                    <th className="p-2 font-bold">Brand</th>
                    <th className="p-2 font-bold">Process</th>
                    <th className="p-2 font-bold">Calendar Type</th>
                    <th className="p-2 font-bold">Min Staffing</th>
                    <th className="p-2 font-bold">Coverage Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {operatingRules.map((rule) => {
                    const brand = brands.find((b) => b.id === rule.brandId);
                    const proc = processes.find((p) => p.id === rule.processId);

                    return (
                      <tr key={rule.id} className="hover:bg-gray-50">
                        <td className="p-2 font-bold text-gray-800">{rule.id}</td>
                        <td className="p-2 text-gray-900">{brand?.name || rule.brandId}</td>
                        <td className="p-2 text-gray-900">{proc?.name || rule.processId}</td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 font-bold text-[10px] uppercase border ${
                              rule.calendarType === OperatingCalendarType.TYPE_A_365
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                : rule.calendarType === OperatingCalendarType.TYPE_B_HOLIDAYS_OFF
                                ? 'bg-blue-50 text-blue-900 border-blue-300'
                                : 'bg-gray-100 text-gray-800 border-gray-300'
                            }`}
                          >
                            {rule.calendarType === OperatingCalendarType.TYPE_A_365
                              ? '365-Day Continuous'
                              : rule.calendarType === OperatingCalendarType.TYPE_B_HOLIDAYS_OFF
                              ? 'Excl. Holidays'
                              : 'Excl. Sun & Holidays'}
                          </span>
                        </td>
                        <td className="p-2 font-bold text-gray-900">
                          {rule.minStaffingRequired} {rule.minStaffingRequired > 1 ? 'heads' : 'head'}
                        </td>
                        <td className="p-2 text-gray-500 text-[11px]">
                          {rule.minStaffingRequired > 1 ? 'Multi-resource mandatory' : 'Single resource dedicated'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
