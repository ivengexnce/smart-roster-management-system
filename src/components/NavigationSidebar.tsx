'use client';

import React from 'react';
import {
  IconGrid,
  IconLayers,
  IconBriefcase,
  IconUsers,
  IconCalendar,
  IconAlertOctagon,
  IconTerminal,
  IconFileText,
  IconShield,
  IconAnimatedArrow,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
} from './icons';
import { UserRole } from '@/types';

export type ActiveNavSection =
  | 'COMPANY'
  | 'POD'
  | 'BRAND'
  | 'PROCESS'
  | 'EMPLOYEE'
  | 'ANALYTICS'
  | 'SWAPS'
  | 'DISPATCH'
  | 'LEAVES'
  | 'BENCHMARK'
  | 'CONFLICTS'
  | 'TERMINAL'
  | 'AUDIT'
  | 'PRIVACY';

interface NavigationSidebarProps {
  activeSection: ActiveNavSection;
  onSelectSection: (section: ActiveNavSection) => void;
  criticalConflictCount: number;
  totalLeavesCount: number;
  actorRole: UserRole;
  currentUser?: { fullName: string; email: string; role: UserRole } | null;
  onLogout?: () => void;
  onRoleChange?: (role: UserRole) => void;
  onOpenPrivacy: () => void;
  onOpenConflicts: () => void;
  onOpenLeaves: () => void;
  onOpenStaffManagement?: () => void;
  version: number;
  monthYear: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function NavigationSidebar({
  activeSection,
  onSelectSection,
  criticalConflictCount,
  totalLeavesCount,
  actorRole,
  currentUser,
  onLogout,
  onRoleChange,
  onOpenPrivacy,
  onOpenConflicts,
  onOpenLeaves,
  onOpenStaffManagement,
  version,
  monthYear,
  isCollapsed,
  onToggleCollapse,
}: NavigationSidebarProps) {
  const isEmployee = actorRole === UserRole.EMPLOYEE;
  const isPodLead = actorRole === UserRole.POD_LEAD;

  const matrixItems = isEmployee
    ? [
        { id: 'EMPLOYEE', label: '1. My Schedule & Shift', short: 'My Shift', icon: IconUsers, count: 'Personal' },
      ]
    : isPodLead
    ? [
        { id: 'POD', label: '1. My Pod Teams', short: 'Pod', icon: IconLayers, count: 'Pod Alpha' },
        { id: 'BRAND', label: '2. Brand-Wise Health', short: 'Brands', icon: IconBriefcase, count: '6 Accounts' },
        { id: 'PROCESS', label: '3. Process Coverage', short: 'Procs', icon: IconCalendar, count: '4 Procs' },
        { id: 'EMPLOYEE', label: '4. Staff Inspector', short: 'Staff', icon: IconUsers, count: 'Pod Alpha' },
      ]
    : [
        { id: 'COMPANY', label: '1. Company Master', short: 'Master', icon: IconGrid, count: '30 Emps' },
        { id: 'POD', label: '2. Pod-Wise Teams', short: 'Pods', icon: IconLayers, count: '3 Pods' },
        { id: 'BRAND', label: '3. Brand-Wise Health', short: 'Brands', icon: IconBriefcase, count: '18 Accts' },
        { id: 'PROCESS', label: '4. Process Coverage', short: 'Procs', icon: IconCalendar, count: '4 Procs' },
        { id: 'EMPLOYEE', label: '5. Employee Inspector', short: 'Staff', icon: IconUsers, count: 'Individual' },
      ];

  const opsItems = isEmployee
    ? [
        { id: 'SWAPS', label: 'My Swaps & Comp-Off', short: 'Swaps', icon: IconAnimatedArrow, tag: 'Self-Service' },
        { id: 'LEAVES', label: 'My Leave Requests', short: 'Leaves', icon: IconCalendar, badge: totalLeavesCount, isLeave: true },
      ]
    : isPodLead
    ? [
        { id: 'STAFF_MGMT', label: 'Staff Directory & Preview', short: 'Staff', icon: IconUsers, tag: 'Pod' },
        { id: 'ANALYTICS', label: 'SLA Analytics (Pod)', short: 'SLA', icon: IconCheck, tag: 'Pod KPI' },
        { id: 'SWAPS', label: 'Shift Swaps & Comp', short: 'Swaps', icon: IconAnimatedArrow, tag: 'Pod Flex' },
        { id: 'DISPATCH', label: 'Dispatch Sheet (PDF)', short: 'Print', icon: IconFileText, tag: 'Print' },
        { id: 'LEAVES', label: 'Leave Approvals', short: 'Leaves', icon: IconCalendar, badge: totalLeavesCount, isLeave: true },
        { id: 'CONFLICTS', label: 'Conflict Center', short: 'Gaps', icon: IconAlertOctagon, badge: criticalConflictCount },
        { id: 'TERMINAL', label: 'Solver Console', short: 'Trace', icon: IconTerminal, tag: 'Trace' },
      ]
    : [
        { id: 'STAFF_MGMT', label: 'Staff Management & Range', short: 'Staff', icon: IconUsers, tag: 'Admin' },
        { id: 'ANALYTICS', label: 'SLA Analytics', short: 'SLA', icon: IconCheck, tag: 'KPI' },
        { id: 'SWAPS', label: 'Shift Swaps & Comp', short: 'Swaps', icon: IconAnimatedArrow, tag: 'Flex' },
        { id: 'DISPATCH', label: 'Dispatch Sheet (PDF)', short: 'Print', icon: IconFileText, tag: 'Print' },
        { id: 'LEAVES', label: 'Leave Tracking', short: 'Leaves', icon: IconCalendar, badge: totalLeavesCount, isLeave: true },
        { id: 'BENCHMARK', label: 'Benchmark Demo', short: 'Demo', icon: IconAnimatedArrow, tag: 'E01 Nov 12' },
        { id: 'CONFLICTS', label: 'Conflict Center', short: 'Gaps', icon: IconAlertOctagon, badge: criticalConflictCount },
        { id: 'TERMINAL', label: 'Solver Console', short: 'Trace', icon: IconTerminal, tag: 'Trace' },
        { id: 'AUDIT', label: 'Audit Trail', short: 'Audit', icon: IconFileText, tag: 'History' },
      ];

  return (
    <aside
      className={`bg-white border-r border-gray-300 flex flex-col justify-between shrink-0 select-none h-screen sticky top-0 transition-all duration-150 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Section: Sidebar Header & User Profile Card */}
      <div className="shrink-0">
        <div className="p-3 border-b border-gray-300 bg-gray-50 flex items-center justify-between">
          {!isCollapsed && (
            <div className="truncate pr-2">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-mono font-bold px-1 py-0.5 bg-gray-900 text-white uppercase">
                  Datastraw
                </span>
                <span className="text-[10px] font-mono text-gray-500">v1.0.0</span>
              </div>
              <h2 className="text-xs font-black text-gray-900 tracking-tight mt-1 truncate">
                SMART ROSTER OS
              </h2>
            </div>
          )}

          {/* Collapse / Expand Toggle Button */}
          <button
            onClick={onToggleCollapse}
            className="p-1 border border-gray-300 hover:bg-gray-100 text-gray-700 mx-auto"
            title={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
          >
            {isCollapsed ? (
              <IconChevronRight className="w-3.5 h-3.5" />
            ) : (
              <IconChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Authenticated User Profile & Logout - Repositioned from Header */}
        {!isCollapsed ? (
          <div className="p-2.5 border-b border-gray-300 bg-white">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="font-bold text-gray-900 text-xs truncate leading-tight font-sans">
                {currentUser?.fullName || (isEmployee ? 'Ananya Roy (E02)' : isPodLead ? 'Rahul Sharma' : 'Operations Manager')}
              </span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="px-2 py-0.5 bg-white border border-gray-300 hover:bg-rose-50 hover:text-rose-700 text-gray-700 text-[11px] font-mono font-semibold transition-colors shrink-0"
                  title="Sign Out of Session"
                >
                  Logout
                </button>
              )}
            </div>
            <div className="text-[10px] text-gray-500 font-mono truncate mb-2">
              {currentUser?.email || (isEmployee ? 'ananya.roy@datastraw.io' : isPodLead ? 'rahul.alpha@datastraw.io' : 'manager@datastraw.io')}
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
              <span
                className={`text-[9px] px-1.5 py-0.5 font-bold uppercase font-mono border ${
                  isEmployee
                    ? 'bg-gray-200 text-gray-800 border-gray-400'
                    : isPodLead
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-blue-100 text-blue-900 border-blue-300'
                }`}
              >
                {actorRole.replace('_', ' ')}
              </span>
              <span className="flex items-center space-x-1 text-[9px] font-mono text-emerald-600">
                <span className="w-1.5 h-1.5 bg-emerald-500 inline-block" />
                <span>ONLINE</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="p-2 border-b border-gray-300 flex flex-col items-center justify-center space-y-1">
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-1.5 py-0.5 bg-white border border-gray-300 hover:bg-rose-50 hover:text-rose-700 text-gray-700 text-[9px] font-mono font-bold"
                title="Sign Out of Session"
              >
                Exit
              </button>
            )}
          </div>
        )}
      </div>

      {/* Scrollable Middle Navigation Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Section 1: 5 Core Roster Matrix Views */}
        <div className="p-2">
          {!isCollapsed && (
            <div className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider px-2 mb-1.5">
              ROSTER MATRICES
            </div>
          )}
          <nav className="space-y-1">
            {matrixItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSection(item.id as ActiveNavSection)}
                  title={`${item.label} (${item.count})`}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-2'
                  } text-xs font-semibold border transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-900 border-blue-300 font-bold'
                      : 'bg-white text-gray-700 border-transparent hover:bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-gray-500'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    <span className="text-[10px] font-mono text-gray-400">{item.count}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section 2: Operations & Diagnostics */}
        <div className="p-2 border-t border-gray-200">
          {!isCollapsed && (
            <div className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider px-2 mb-1.5">
              OPERATIONS &amp; SOLVER
            </div>
          )}
          <nav className="space-y-1">
            {opsItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'CONFLICTS') {
                      onOpenConflicts();
                    } else if (item.id === 'LEAVES') {
                      onOpenLeaves();
                    } else if (item.id === 'STAFF_MGMT') {
                      if (onOpenStaffManagement) {
                        onOpenStaffManagement();
                      } else {
                        onSelectSection('EMPLOYEE');
                      }
                    } else {
                      onSelectSection(item.id as ActiveNavSection);
                    }
                  }}
                  title={item.label}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center p-2 relative' : 'justify-between px-2.5 py-2'
                  } text-xs font-semibold border transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-900 border-blue-300 font-bold'
                      : 'bg-white text-gray-700 border-transparent hover:bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-gray-500'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border ${
                        item.isLeave
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : item.badge > 0
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      } ${isCollapsed ? 'absolute -top-1 -right-1 text-[8px] px-1 py-0' : ''}`}
                    >
                      {isCollapsed
                        ? item.badge
                        : item.isLeave
                        ? `${item.badge} Leaves`
                        : item.badge > 0
                        ? `${item.badge} Gaps`
                        : '0 Gaps'}
                    </span>
                  )}
                  {!isCollapsed && item.tag && (
                    <span className="text-[10px] font-mono text-gray-400">{item.tag}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section 3: Governance */}
        <div className="p-2 border-t border-gray-200">
          {!isCollapsed && (
            <div className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider px-2 mb-1.5">
              GOVERNANCE
            </div>
          )}
          <button
            onClick={onOpenPrivacy}
            title="Privacy Policy & Governance"
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'space-x-2 px-2.5 py-2'
            } text-xs font-semibold text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200`}
          >
            <IconShield className="w-4 h-4 text-gray-500 shrink-0" />
            {!isCollapsed && <span>Privacy Policy</span>}
          </button>
        </div>
      </div>

      {/* Sidebar Footer: System Status */}
      <div className="p-2.5 border-t border-gray-300 bg-gray-50 shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 inline-block" />
              <span>Solver Engine</span>
            </span>
            <span>Port 3000</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-1" title={`Role: ${actorRole}`}>
            <span className="w-2 h-2 bg-emerald-500 inline-block" />
          </div>
        )}
      </div>
    </aside>
  );
}
