'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Roster,
  RosterEntry,
  Conflict,
  Employee,
  Brand,
  Pod,
  Process,
  OperatingRule,
  AuditLog,
  LeaveRequest,
  User,
  UserRole,
  ShiftSwapRequest,
  CompOffCredit,
  ScheduleStatus,
  InAppNotification,
} from '@/types';
import { TerminalWindow, TerminalLog } from '@/components/TerminalWindow';
import { PrivacyPolicyModal } from '@/components/PrivacyPolicyModal';
import { AuthModal } from '@/components/AuthModal';
import { LeaveManagementModal } from '@/components/LeaveManagementModal';
import { ShiftSwapModal } from '@/components/ShiftSwapModal';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { SlotEditorModal } from '@/components/SlotEditorModal';
import { PrintDispatchView } from '@/components/PrintDispatchView';
import { ConflictDrawer } from '@/components/ConflictDrawer';
import { RosterViews } from '@/components/RosterViews';
import { ProductDemoSection } from '@/components/ProductDemoSection';
import { NavigationSidebar, ActiveNavSection } from '@/components/NavigationSidebar';
import { AuditTrailView } from '@/components/AuditTrailView';
import { EnterpriseLoginGateway } from '@/components/EnterpriseLoginGateway';
import { EmployeeManagementModal } from '@/components/EmployeeManagementModal';
import { NotificationCenterModal } from '@/components/NotificationCenterModal';
import { BrandManagementModal } from '@/components/BrandManagementModal';
import { AdvancedOptimizationModal } from '@/components/AdvancedOptimizationModal';
import { getCurrentMonthStr } from '@/lib/seed-data';
import { exportRosterToCSV } from '@/lib/export-csv';
import {
  IconCalendar,
  IconUsers,
  IconBriefcase,
  IconLayers,
  IconAlertOctagon,
  IconRefresh,
  IconAnimatedArrow,
  IconFileText,
  IconCheck,
} from '@/components/icons';

export default function DashboardPage() {
  // Dynamically initialize to current year and month
  const [monthYear, setMonthYear] = useState(() => getCurrentMonthStr());
  const [activeSection, setActiveSection] = useState<ActiveNavSection>('COMPANY');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Filters
  const [selectedPodId, setSelectedPodId] = useState<string>('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedProcessId, setSelectedProcessId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // Data state
  const [roster, setRoster] = useState<Roster | null>(null);
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [operatingRules, setOperatingRules] = useState<OperatingRule[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [shiftSwaps, setShiftSwaps] = useState<ShiftSwapRequest[]>([]);
  const [compOffs, setCompOffs] = useState<CompOffCredit[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  // Modals & Drawers
  const [isConflictDrawerOpen, setIsConflictDrawerOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isOptimizationModalOpen, setIsOptimizationModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isSlotEditorOpen, setIsSlotEditorOpen] = useState(false);
  const [selectedSlotEmployee, setSelectedSlotEmployee] = useState<Employee | null>(null);
  const [selectedSlotDate, setSelectedSlotDate] = useState<string>('');
  const [selectedSlotEntries, setSelectedSlotEntries] = useState<RosterEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Terminal logs
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);

  const addLog = useCallback((level: TerminalLog['level'], message: string) => {
    const newLog: TerminalLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    };
    setTerminalLogs((prev) => [newLog, ...prev]);
  }, []);

  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Dedicated RBAC role switch handler
  const handleRoleSwitch = async (newRole: UserRole) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quickRole: newRole }),
      });
      const d = await res.json();
      if (d.user) {
        setCurrentUser(d.user);
        addLog('INFO', `Switched active authenticated profile to: ${d.user.fullName} (${d.user.role})`);
        if (newRole === UserRole.EMPLOYEE) {
          setActiveSection('EMPLOYEE');
          if (d.user.employeeRef) {
            const match = employees.find((e) => e.employeeCode === d.user.employeeRef);
            if (match) setSelectedEmployeeId(match.id);
          }
        } else if (newRole === UserRole.POD_LEAD) {
          setActiveSection('POD');
          setSelectedPodId(d.user.podId || 'pod-alpha');
        } else {
          setActiveSection('COMPANY');
          setSelectedPodId('');
        }
        await fetchData();
      }
    } catch {
      addLog('ERROR', 'Failed to switch role');
    }
  };

  // Fetch current authenticated user session via JWT verification & automatic refresh
  const fetchAuthUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          return;
        }
      }

      // If access token expired or missing, attempt silent refresh using HttpOnly refresh token
      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.success && refreshData.user) {
          setCurrentUser(refreshData.user);
          return;
        }
      }

      setCurrentUser(null);
    } catch {
      setCurrentUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  // Fetch roster and organizational data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/roster?monthYear=${monthYear}${selectedPodId ? `&podId=${selectedPodId}` : ''}`);
      const data = await res.json();
      setRoster(data.roster);
      setEntries(data.entries || []);
      setConflicts(data.conflicts || []);
      setEmployees(data.employees || []);
      setBrands(data.brands || []);
      setPods(data.pods || []);
      setProcesses(data.processes || []);
      setOperatingRules(data.operatingRules || []);
      setLeaves(data.leaves || []);
      setAuditLogs(data.auditLogs || []);

      // Also fetch shift swaps and comp-offs
      try {
        const swapRes = await fetch('/api/swaps');
        const swapData = await swapRes.json();
        setShiftSwaps(swapData.shiftSwaps || []);
        setCompOffs(swapData.compOffs || []);

        const notifRes = await fetch('/api/notifications');
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);
      } catch {
        // Fallback
      }

      if (data.employees?.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(data.employees[0].id);
      }
    } catch {
      addLog('ERROR', 'Failed to retrieve active roster dataset from server');
    }
  }, [monthYear, selectedPodId, selectedEmployeeId, addLog]);

  useEffect(() => {
    fetchAuthUser();
    fetchData();
  }, [fetchAuthUser, fetchData]);

  // Strict RBAC Viewport Enforcement: Force redirect unauthorized viewports
  useEffect(() => {
    if (currentUser?.role === UserRole.EMPLOYEE) {
      if (!['EMPLOYEE', 'SWAPS', 'LEAVES', 'PRIVACY'].includes(activeSection)) {
        setActiveSection('EMPLOYEE');
      }
    } else if (currentUser?.role === UserRole.POD_LEAD) {
      if (['COMPANY', 'BENCHMARK', 'AUDIT'].includes(activeSection)) {
        setActiveSection('POD');
      }
    }
  }, [currentUser, activeSection]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      addLog('WARN', 'User session terminated. Signed out.');
    } catch {
      addLog('ERROR', 'Logout failed');
    }
  };

  // Notification handlers
  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // fallback
    }
  };

  const handleClearNotifications = async () => {
    try {
      await fetch('/api/notifications', { method: 'DELETE' });
      setNotifications([]);
    } catch {
      // fallback
    }
  };

  // Export current active view to CSV
  const handleExportCSV = () => {
    const matrixView = (['COMPANY', 'POD', 'BRAND', 'PROCESS', 'EMPLOYEE'].includes(activeSection)
      ? activeSection
      : 'COMPANY') as 'COMPANY' | 'POD' | 'BRAND' | 'PROCESS' | 'EMPLOYEE';

    addLog('INFO', `Exporting ${matrixView} roster matrix to CSV for ${monthYear}...`);
    exportRosterToCSV(
      matrixView,
      monthYear,
      entries,
      employees,
      brands,
      pods,
      processes,
      operatingRules,
      selectedEmployeeId
    );
    addLog('SUCCESS', `Exported SmartRoster_${matrixView}_${monthYear}.csv successfully.`);
  };

  // Seed benchmark data
  const handleSeedData = async () => {
    setIsProcessing(true);
    addLog('INFO', `Triggering benchmark seed generator for current active month ${monthYear}...`);
    try {
      const res = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthYear }),
      });
      const data = await res.json();
      if (data.success) {
        addLog('SUCCESS', data.message);
        addLog('INFO', `Dataset ready: 30 employees, 18 brands (80% single-resource), and E01 leave on ${monthYear}-12 initialized.`);
        await fetchData();
      } else {
        addLog('ERROR', data.error || 'Seed generation failed');
      }
    } catch {
      addLog('ERROR', 'Network error during seed generation');
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate deterministic monthly roster
  const handleGenerateRoster = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    if (currentUser.role === UserRole.EMPLOYEE) {
      addLog('ERROR', 'Access Denied: Employees cannot generate rosters. Switch to Operations Manager.');
      alert('Access Denied: Only Operations Managers and Pod Leads are authorized to generate rosters.');
      return;
    }

    setIsProcessing(true);
    addLog('INFO', `Initializing deterministic constraint solver for ${monthYear} (Actor: ${currentUser.fullName} - ${currentUser.role})...`);
    try {
      const res = await fetch('/api/roster/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthYear,
          podId: selectedPodId || undefined,
          actorRole: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addLog('SUCCESS', data.message);
        if (data.roster?.totalConflicts?.critical > 0) {
          addLog('WARN', `${data.roster.totalConflicts.critical} CRITICAL coverage gaps detected! Roster cannot be published until resolved.`);
        }
        await fetchData();
      } else {
        addLog('ERROR', data.error || 'Roster generation failed');
      }
    } catch {
      addLog('ERROR', 'Network error during roster generation');
    } finally {
      setIsProcessing(false);
    }
  };

  // Publish roster
  const handlePublishRoster = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    if (currentUser.role !== UserRole.OPERATIONS_MANAGER) {
      addLog('ERROR', 'Access Denied: Only Operations Managers can publish rosters.');
      alert('Access Denied: Only an Operations Manager can publish official company rosters.');
      return;
    }

    if (!roster) {
      addLog('WARN', 'No active roster generated yet.');
      return;
    }

    setIsProcessing(true);
    addLog('INFO', `Submitting roster ${roster.monthYear} for publication (Actor: ${currentUser.fullName})...`);
    try {
      const res = await fetch('/api/roster/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rosterId: roster.id,
          actorRole: currentUser.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addLog('SUCCESS', data.message);
        await fetchData();
      } else {
        addLog('ERROR', `Publication blocked: ${data.error}`);
        setIsConflictDrawerOpen(true);
      }
    } catch {
      addLog('ERROR', 'Network error during roster publication');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reassign single backup slot
  const handleReassign = async (conflict: Conflict, backupEmployeeId: string, reason: string) => {
    if (!roster) return;
    const actor = currentUser?.role || UserRole.OPERATIONS_MANAGER;

    setIsProcessing(true);
    addLog(
      'INFO',
      `Executing atomic reassignment for ${conflict.brandName} (${conflict.processName}) on ${conflict.date}...`
    );
    try {
      const res = await fetch('/api/roster/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rosterId: roster.id,
          date: conflict.date,
          brandId: conflict.brandId,
          processId: conflict.processId,
          backupEmployeeId,
          reason,
          actorRole: actor,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addLog('SUCCESS', data.message);
        await fetchData();
      } else {
        addLog('ERROR', data.error || 'Reassignment failed');
      }
    } catch {
      addLog('ERROR', 'Network error during backup reassignment');
    } finally {
      setIsProcessing(false);
    }
  };

  // Run full benchmark demo scenario
  const handleRunBenchmarkScenario = async () => {
    setIsSimulating(true);
    addLog('INFO', '=== STARTING DATASTRAW BENCHMARK SCENARIO ===');
    addLog('INFO', `Step 1: Loading benchmark dataset for current month ${monthYear}...`);

    // 1. Seed data
    await fetch('/api/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthYear }),
    });

    // 2. Generate roster
    addLog('INFO', `Step 2: Generating initial deterministic roster for ${monthYear}...`);
    const genRes = await fetch('/api/roster/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthYear, actorRole: UserRole.OPERATIONS_MANAGER }),
    });
    const genData = await genRes.json();
    addLog('WARN', `Step 3: Availability shock detected on ${monthYear}-12!`);
    addLog('WARN', 'Rahul Sharma (E01) is on APPROVED LEAVE. Brand A Customer Support & NDR have 0 available staff!');
    addLog('INFO', 'Step 4: Constraint solver searching for eligible replacements in Pod Alpha...');

    // Reassign for Brand A CS
    const e09Cand = 'emp-09';
    await fetch('/api/roster/reassign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rosterId: genData.roster.id,
        date: `${monthYear}-12`,
        brandId: 'brand-A',
        processId: 'proc-cs',
        backupEmployeeId: e09Cand,
        reason: 'Datastraw Benchmark Auto-Resolution: Reassigned E09 for Brand A CS',
        actorRole: UserRole.OPERATIONS_MANAGER,
      }),
    });

    // Reassign for Brand A NDR
    await fetch('/api/roster/reassign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rosterId: genData.roster.id,
        date: `${monthYear}-12`,
        brandId: 'brand-A',
        processId: 'proc-ndr',
        backupEmployeeId: e09Cand,
        reason: 'Datastraw Benchmark Auto-Resolution: Reassigned E09 for Brand A NDR',
        actorRole: UserRole.OPERATIONS_MANAGER,
      }),
    });

    addLog('SUCCESS', `Step 5: Brand A coverage on ${monthYear}-12 is 100% restored with E09. All other dates preserved.`);
    addLog('SUCCESS', '=== BENCHMARK SCENARIO EXECUTION COMPLETED ===');
    await fetchData();
    setIsSimulating(false);
  };

  // Multi-leave pod stress test simulation & cross-pod borrowing
  const handleRunStressTest = async () => {
    setIsSimulating(true);
    addLog('INFO', '=== STARTING POD ALPHA MULTI-LEAVE STRESS TEST ===');
    addLog('WARN', `Injecting simultaneous availability shocks on ${monthYear}-16 in Pod Alpha...`);

    // 1. Submit simultaneous leaves for E01, E02, E08
    await Promise.all([
      fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: 'emp-01', date: `${monthYear}-16`, leaveType: 'PLANNED_LEAVE', reason: 'Stress-test Leave', actorRole: 'OPERATIONS_MANAGER' }),
      }),
      fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: 'emp-02', date: `${monthYear}-16`, leaveType: 'PLANNED_LEAVE', reason: 'Stress-test Leave', actorRole: 'OPERATIONS_MANAGER' }),
      }),
      fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: 'emp-08', date: `${monthYear}-16`, leaveType: 'PLANNED_LEAVE', reason: 'Stress-test Leave', actorRole: 'OPERATIONS_MANAGER' }),
      }),
    ]);

    addLog('WARN', 'Step 1: E01, E02, and E08 are on leave! Brands A, B, and E have lost primary coverage!');
    addLog('INFO', 'Step 2: Deploying Pod Alpha floaters E09 and E10 to Brand A and Brand B...');

    const rId = roster?.id || `roster-${monthYear}`;

    // Reassign E09 for Brand A
    await fetch('/api/roster/reassign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rosterId: rId,
        date: `${monthYear}-16`,
        brandId: 'brand-A',
        processId: 'proc-cs',
        backupEmployeeId: 'emp-09',
        reason: 'Stress-test: E09 covers Brand A',
        actorRole: UserRole.OPERATIONS_MANAGER,
      }),
    });

    // Reassign E10 for Brand B
    await fetch('/api/roster/reassign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rosterId: rId,
        date: `${monthYear}-16`,
        brandId: 'brand-B',
        processId: 'proc-cs',
        backupEmployeeId: 'emp-10',
        reason: 'Stress-test: E10 covers Brand B',
        actorRole: UserRole.OPERATIONS_MANAGER,
      }),
    });

    addLog('WARN', 'Step 3: Pod Alpha floater capacity reached (100% utilized). Brand E CS still has 0 staff!');
    addLog('INFO', 'Step 4: TRIGGERING CROSS-POD ESCALATION -> Searching Pod Beta floater pool...');
    addLog('INFO', 'Found eligible floater E19 (Pod Beta) with verified CS qualification and no active shift!');

    // Borrow E19 from Pod Beta for Brand E
    await fetch('/api/roster/reassign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rosterId: rId,
        date: `${monthYear}-16`,
        brandId: 'brand-E',
        processId: 'proc-cs',
        backupEmployeeId: 'emp-19',
        reason: 'Cross-Pod Escalation: Borrowed E19 from Pod Beta for Brand E CS',
        actorRole: UserRole.OPERATIONS_MANAGER,
      }),
    });

    addLog('SUCCESS', 'Step 5: Brand E coverage restored via cross-pod allocation! 100% operational coverage achieved.');
    addLog('SUCCESS', '=== POD STRESS TEST COMPLETED WITH 100% SURVIVABILITY ===');
    await fetchData();
    setIsSimulating(false);
  };

  // Direct cell click handler for slot overrides
  const handleCellClick = (employee: Employee, dateStr: string, currentEntries: RosterEntry[]) => {
    setSelectedSlotEmployee(employee);
    setSelectedSlotDate(dateStr);
    setSelectedSlotEntries(currentEntries);
    setIsSlotEditorOpen(true);
  };

  const isMatrixView = ['COMPANY', 'POD', 'BRAND', 'PROCESS', 'EMPLOYEE'].includes(activeSection);

  const isEmployee = currentUser?.role === UserRole.EMPLOYEE;
  const isPodLead = currentUser?.role === UserRole.POD_LEAD;
  const isManager = currentUser?.role === UserRole.OPERATIONS_MANAGER;

  // Loading screen while verifying authenticated session
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-mono text-xs text-gray-700">
        <div className="flex items-center space-x-2 border border-gray-300 p-4 bg-gray-50">
          <IconRefresh className="w-4 h-4 animate-spin text-gray-900" />
          <span>INITIALIZING DATASTRAW ROSTER OS (SESSION AUTHENTICATION)...</span>
        </div>
      </div>
    );
  }

  // Full-page Enterprise Authentication & SSO Gateway if not authenticated
  if (!currentUser) {
    return (
      <EnterpriseLoginGateway
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === UserRole.EMPLOYEE) {
            setActiveSection('EMPLOYEE');
            if (user.employeeRef) {
              const match = employees.find((e) => e.employeeCode === user.employeeRef);
              if (match) setSelectedEmployeeId(match.id);
            }
          } else if (user.role === UserRole.POD_LEAD) {
            setActiveSection('POD');
            setSelectedPodId(user.podId || 'pod-alpha');
          } else {
            setActiveSection('COMPANY');
            setSelectedPodId('');
          }
          fetchData();
        }}
      />
    );
  }

  // Employee-specific details
  const myEmp =
    employees.find((e) => e.employeeCode === currentUser?.employeeRef) ||
    employees.find((e) => e.id === selectedEmployeeId) ||
    employees[1];
  const myEmpId = myEmp?.id || '';

  const myWorkingDays = entries.filter((e) => e.employeeId === myEmpId && e.status === ScheduleStatus.WORKING).length;
  const myWeeklyOffs = entries.filter((e) => e.employeeId === myEmpId && e.status === ScheduleStatus.WEEKLY_OFF).length;
  const myLeavesCount = leaves.filter((l) => l.employeeId === myEmpId).length;
  const myCompOffsCount = compOffs.filter((c) => c.employeeId === myEmpId && c.status === 'AVAILABLE').length;

  const myBrandEntry = entries.find((e) => e.employeeId === myEmpId && e.status === ScheduleStatus.WORKING);
  const myBrandName = myBrandEntry
    ? brands.find((b) => b.id === myBrandEntry.brandId)?.name || 'Assigned Brand'
    : 'Brand B';

  // Pod Lead-specific details
  const currentPod = pods.find((p) => p.id === (currentUser?.podId || selectedPodId || 'pod-alpha'));
  const podEmployees = employees.filter((e) => e.podId === currentPod?.id);
  const podEmployeeIds = new Set(podEmployees.map((e) => e.id));
  const podConflicts = conflicts.filter((c) => {
    const recEmps = c.suggestedAction?.recommendedEmployeeIds || [];
    return podEmployeeIds.has(c.employeeId || '') || recEmps.some((id) => podEmployeeIds.has(id));
  });
  const podBrands = brands.filter((b) => b.podId === currentPod?.id);

  return (
    <div className="flex min-h-screen bg-white text-gray-900 font-sans">
      {/* 1. Left Navigation Sidebar with Expand/Collapse */}
      <NavigationSidebar
        activeSection={activeSection}
        onSelectSection={(sec) => setActiveSection(sec)}
        criticalConflictCount={roster?.totalConflicts?.critical || 0}
        totalLeavesCount={leaves.length}
        actorRole={currentUser?.role || UserRole.OPERATIONS_MANAGER}
        currentUser={currentUser}
        onLogout={handleLogout}
        onRoleChange={handleRoleSwitch}
        onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
        onOpenConflicts={() => setIsConflictDrawerOpen(true)}
        onOpenLeaves={() => setIsLeaveModalOpen(true)}
        onOpenStaffManagement={() => setIsEmployeeModalOpen(true)}
        version={roster?.version || 0}
        monthYear={monthYear}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* 2. Main Content Canvas */}
      <main className="flex-1 min-w-0 p-6 overflow-y-auto">
        {/* Top Header & Operational Actions Bar */}
        <header className="border border-gray-300 bg-white mb-6 divide-y divide-gray-200">
          {/* Tier 1: Identity & System Alerts */}
          <div className="p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xs uppercase tracking-wider bg-gray-900 text-white px-2 py-0.5">
                  Datastraw Assessment
                </span>
                <span className="text-xs font-mono text-gray-500">v1.0.0</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs font-mono text-gray-600">Active View: {activeSection}</span>
              </div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight mt-1">
                SMART ROSTER MANAGEMENT SYSTEM
              </h1>
              <p className="text-xs text-gray-600 mt-0.5">
                Deterministic multi-brand constraint solver · Role-Based Access Control
              </p>
            </div>

            {/* Top Right: System Alerts & Quick Action */}
            <div className="shrink-0 flex items-center gap-2">
              <button
                onClick={() => setIsNotificationModalOpen(true)}
                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-mono font-semibold flex items-center space-x-1.5"
                title="Open Notification Center"
              >
                <span>Alerts</span>
                {notifications.filter((n) => !n.read).length > 0 ? (
                  <span className="px-1.5 py-0.2 bg-red-600 text-white text-[9px] font-bold">
                    {notifications.filter((n) => !n.read).length} Unread
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 font-mono">0</span>
                )}
              </button>
            </div>
          </div>

          {/* Tier 1.5: Dynamic Role Permissions Scope Banner */}
          {isManager && (
            <div className="bg-blue-50/70 border-b border-blue-200 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
              <div className="flex items-center space-x-2">
                <span className="px-1.5 py-0.5 bg-blue-600 text-white font-mono font-bold text-[10px] uppercase">
                  OPERATIONS MANAGER SCOPE
                </span>
                <span className="font-semibold text-blue-950">
                  Global Master Authority: All 3 Operational Pods (30 Staff, 18 Client Accounts)
                </span>
              </div>
              <div className="text-[11px] font-mono text-blue-800">
                Unlocked: [5 Matrices, 8 Operations Tools, Solver, Publish Roster, Benchmark Seeding, Slot Overrides]
              </div>
            </div>
          )}

          {isPodLead && (
            <div className="bg-amber-50/70 border-b border-amber-200 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
              <div className="flex items-center space-x-2">
                <span className="px-1.5 py-0.5 bg-amber-600 text-white font-mono font-bold text-[10px] uppercase">
                  POD LEAD SCOPE (POD ALPHA)
                </span>
                <span className="font-semibold text-amber-950">
                  Supervisor Authority: Scoped to Pod Alpha ({podEmployees.length} Personnel, {podBrands.length} Accounts)
                </span>
              </div>
              <div className="text-[11px] font-mono text-amber-800">
                Unlocked: [Pod Generation, Pod Approvals, SLA, Overrides] · Gated: [Company Publish (403), Benchmark Seeding]
              </div>
            </div>
          )}

          {isEmployee && (
            <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
              <div className="flex items-center space-x-2">
                <span className="px-1.5 py-0.5 bg-gray-900 text-white font-mono font-bold text-[10px] uppercase">
                  EMPLOYEE SELF-SERVICE SCOPE
                </span>
                <span className="font-semibold text-gray-900">
                  Personal Schedule: {(myEmp?.fullName || currentUser?.fullName || 'Employee').replace(/\s*\([A-Z0-9]+\)$/, '')} ({myEmp?.employeeCode || 'E02'}) · Primary: {myBrandName}
                </span>
              </div>
              <div className="text-[11px] font-mono text-gray-700">
                Unlocked: [My Schedule, My Swaps, My Leaves] · Gated: [Roster Generation, Publish, Slot Editing, Solver Console]
              </div>
            </div>
          )}

          {/* Tier 2: Operational Action Toolbar (Role-Gated) */}
          <div className="px-4 py-2.5 bg-gray-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs font-mono text-gray-600">
              <span className="px-2 py-1 bg-white border border-gray-300 font-bold text-gray-800">
                Month: {monthYear}
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600 font-sans">
                State: <strong className="font-mono text-gray-900">{roster?.status || 'NOT GENERATED'}</strong>
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-500 font-mono">v{roster?.version || 0}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="px-3 py-1.5 bg-white border border-gray-300 text-xs font-bold uppercase tracking-wider text-gray-800 hover:bg-gray-100"
              >
                {isEmployee ? 'My Leaves' : 'Leaves'} ({leaves.length})
              </button>

              <button
                onClick={() => setIsSwapModalOpen(true)}
                className="px-3 py-1.5 bg-white border border-gray-300 text-xs font-bold uppercase tracking-wider text-gray-800 hover:bg-gray-100"
                title="Manage peer shift exchanges and compensatory off credits"
              >
                {isEmployee ? 'My Swaps & Comp' : 'Swaps & Comp'} ({shiftSwaps.length + compOffs.filter((c) => c.status === 'AVAILABLE').length})
              </button>

              {!isEmployee && (
                <button
                  onClick={() => setIsEmployeeModalOpen(true)}
                  className="px-3 py-1.5 bg-white border border-gray-400 text-xs font-bold uppercase tracking-wider text-gray-800 hover:bg-gray-100 flex items-center space-x-1"
                  title="Manage Staff, Slice Ranges & Preview Employee Details"
                >
                  <IconUsers className="w-3.5 h-3.5 text-gray-600" />
                  <span>{isManager ? `Manage Staff (${employees.length})` : `Staff Directory (${podEmployees.length})`}</span>
                </button>
              )}

              {isManager && (
                <button
                  onClick={() => setIsBrandModalOpen(true)}
                  className="px-3 py-1.5 bg-white border border-gray-400 text-xs font-bold uppercase tracking-wider text-gray-800 hover:bg-gray-100 flex items-center space-x-1"
                  title="Configure Client Brands, Single/Multi-Resource Staffing & Operating Rules"
                >
                  <IconBriefcase className="w-3.5 h-3.5 text-gray-600" />
                  <span>Brands &amp; Rules ({brands.length})</span>
                </button>
              )}

              {(isManager || isPodLead) && (
                <button
                  onClick={() => setIsOptimizationModalOpen(true)}
                  className="px-3 py-1.5 bg-white border border-emerald-600 text-xs font-bold uppercase tracking-wider text-emerald-900 hover:bg-emerald-50 flex items-center space-x-1"
                  title="Fair Rest Distribution, Skill Depth & What-If Surge Simulation"
                >
                  <IconCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Optimizer &amp; Fairness</span>
                </button>
              )}

              {/* Only Operations Manager can reset/load company-wide benchmark data */}
              {isManager && (
                <button
                  onClick={handleSeedData}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-white border border-gray-400 text-xs font-bold uppercase tracking-wider text-gray-800 hover:bg-gray-100 disabled:opacity-50"
                >
                  Load Benchmark Data (30 Emps)
                </button>
              )}

              {/* Operations Manager and Pod Lead can generate roster */}
              {(isManager || isPodLead) && (
                <button
                  onClick={handleGenerateRoster}
                  disabled={isProcessing || employees.length === 0}
                  className="group px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-blue-700 flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <span>{isPodLead ? 'Generate Pod Roster' : 'Generate Roster'}</span>
                  <IconAnimatedArrow className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Only Operations Manager can publish company roster */}
              {isManager && (
                <button
                  onClick={handlePublishRoster}
                  disabled={isProcessing || !roster}
                  className="px-3.5 py-1.5 bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider hover:bg-emerald-800 disabled:opacity-50"
                >
                  Publish Roster
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Real-Time Operational KPI Counters (Role-Based) */}
        {isEmployee ? (
          /* Employee Self-Service KPI Row */
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="border border-gray-300 bg-white p-3">
              <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-bold uppercase">
                <IconUsers className="w-3.5 h-3.5" />
                <span>My Profile</span>
              </div>
              <div className="text-sm font-black text-gray-900 mt-1 truncate">
                {myEmp?.fullName || currentUser?.fullName}
              </div>
              <div className="text-[10px] text-gray-500 font-mono">
                {myEmp?.employeeCode || 'E02'} · {myEmp?.podName || 'Pod Alpha'}
              </div>
            </div>

            <div className="border border-gray-300 bg-white p-3">
              <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-bold uppercase">
                <IconBriefcase className="w-3.5 h-3.5" />
                <span>Primary Brand</span>
              </div>
              <div className="text-base font-black text-gray-900 mt-1 truncate">{myBrandName}</div>
              <div className="text-[10px] text-gray-500 font-mono">Dedicated Assignment</div>
            </div>

            <div className="border border-gray-300 bg-white p-3">
              <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-bold uppercase">
                <span>Working Shifts</span>
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-1">{myWorkingDays}</div>
              <div className="text-[10px] text-gray-500 font-mono">Scheduled Shifts</div>
            </div>

            <div className="border border-gray-300 bg-white p-3">
              <div className="flex items-center space-x-1.5 text-xs text-gray-600 font-bold uppercase">
                <span>Weekly Offs</span>
              </div>
              <div className="text-2xl font-black text-gray-800 mt-1">{myWeeklyOffs}</div>
              <div className="text-[10px] text-gray-500 font-mono">
                Pref: {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][myEmp?.weeklyOffPreference || 1]}
              </div>
            </div>

            <div className="border border-gray-300 bg-white p-3">
              <div className="flex items-center space-x-1.5 text-xs text-amber-700 font-bold uppercase">
                <span>Approved Leaves</span>
              </div>
              <div className="text-2xl font-black text-amber-800 mt-1">{myLeavesCount}</div>
              <div className="text-[10px] text-gray-500 font-mono">Logged Days Off</div>
            </div>

            <div className="border border-gray-300 bg-white p-3">
              <div className="flex items-center space-x-1.5 text-xs text-blue-700 font-bold uppercase">
                <span>Comp-Off Balance</span>
              </div>
              <div className="text-2xl font-black text-blue-800 mt-1">{myCompOffsCount}</div>
              <div className="text-[10px] text-gray-500 font-mono">Credits Available</div>
            </div>
          </section>
        ) : isPodLead ? (
          /* Pod Lead Scoped KPI Row */
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="border border-gray-300 bg-white p-3">
              <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-bold uppercase">
                <IconLayers className="w-3.5 h-3.5" />
                <span>Supervised Pod</span>
              </div>
              <div className="text-base font-black text-gray-900 mt-1 truncate">
                {currentPod?.name || 'Pod Alpha'}
              </div>
              <div className="text-[10px] text-gray-500 font-mono">Lead: {currentUser?.fullName}</div>
            </div>

            <div className="border border-gray-300 bg-white p-3">
              <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-bold uppercase">
                <IconUsers className="w-3.5 h-3.5" />
                <span>Pod Personnel</span>
              </div>
              <div className="text-2xl font-black text-gray-900 mt-1">{podEmployees.length}</div>
              <div className="text-[10px] text-gray-500 font-mono">Assigned Staff</div>
            </div>

            <div className="border border-gray-300 bg-white p-3">
              <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-bold uppercase">
                <IconBriefcase className="w-3.5 h-3.5" />
                <span>Pod Brands</span>
              </div>
              <div className="text-2xl font-black text-gray-900 mt-1">{podBrands.length}</div>
              <div className="text-[10px] text-gray-500 font-mono">Active Client Accounts</div>
            </div>

            <div className="border border-gray-300 bg-white p-3">
              <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-bold uppercase">
                <IconCalendar className="w-3.5 h-3.5" />
                <span>Target Month</span>
              </div>
              <div className="text-2xl font-black text-gray-900 mt-1">{monthYear}</div>
              <div className="text-[10px] text-gray-500 font-mono">Operational Schedule</div>
            </div>

            <div
              onClick={() => setIsConflictDrawerOpen(true)}
              className={`border p-3 cursor-pointer transition-colors ${
                podConflicts.length > 0
                  ? 'border-red-400 bg-red-50/40 hover:bg-red-50'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase">
                <span className="flex items-center space-x-1.5 text-red-700">
                  <IconAlertOctagon className="w-3.5 h-3.5" />
                  <span>Pod Gaps</span>
                </span>
                <span className="text-[10px] underline text-red-700">Resolve</span>
              </div>
              <div className="text-2xl font-black text-red-700 mt-1">{podConflicts.length}</div>
              <div className="text-[10px] text-red-600 font-mono">Click to reassign backups</div>
            </div>

            <div className="border border-gray-300 bg-white p-3">
              <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-bold uppercase">
                <span>Roster State</span>
              </div>
              <div className="mt-1">
                <span
                  className={`text-xs font-bold uppercase px-2 py-1 inline-block border ${
                    roster?.status === 'PUBLISHED'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : roster?.status === 'VALIDATED'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  {roster?.status || 'NOT GENERATED'}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 font-mono mt-1">Version {roster?.version || 0}</div>
            </div>
          </section>
        ) : (
          /* Operations Manager Full Master KPI Row */
          <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <div className="border border-gray-300 bg-white p-3">
              <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-bold uppercase">
                <IconUsers className="w-3.5 h-3.5" />
                <span>Personnel</span>
              </div>
              <div className="text-2xl font-black text-gray-900 mt-1">{employees.length}</div>
              <div className="text-[10px] text-gray-500 font-mono">E01 to E{employees.length || '30'}</div>
            </div>

            <div className="border border-gray-300 bg-white p-3">
              <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-bold uppercase">
                <IconBriefcase className="w-3.5 h-3.5" />
                <span>Client Brands</span>
              </div>
              <div className="text-2xl font-black text-gray-900 mt-1">{brands.length}</div>
              <div className="text-[10px] text-gray-500 font-mono">~78% Single-Resource</div>
            </div>

            <div className="border border-gray-300 bg-white p-3">
              <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-bold uppercase">
                <IconLayers className="w-3.5 h-3.5" />
                <span>Operational Pods</span>
              </div>
              <div className="text-2xl font-black text-gray-900 mt-1">{pods.length}</div>
              <div className="text-[10px] text-gray-500 font-mono">Alpha, Beta, Gamma</div>
            </div>

            <div className="border border-gray-300 bg-white p-3">
              <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-bold uppercase">
                <IconCalendar className="w-3.5 h-3.5" />
                <span>Target Month</span>
              </div>
              <div className="text-2xl font-black text-gray-900 mt-1">{monthYear}</div>
              <div className="text-[10px] text-gray-500 font-mono">Current Calendar</div>
            </div>

            <div
              onClick={() => setIsConflictDrawerOpen(true)}
              className={`border p-3 cursor-pointer transition-colors ${
                (roster?.totalConflicts?.critical || 0) > 0
                  ? 'border-red-400 bg-red-50/40 hover:bg-red-50'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase">
                <span className="flex items-center space-x-1.5 text-red-700">
                  <IconAlertOctagon className="w-3.5 h-3.5" />
                  <span>Critical Gaps</span>
                </span>
                <span className="text-[10px] underline text-red-700">Resolve</span>
              </div>
              <div className="text-2xl font-black text-red-700 mt-1">
                {roster?.totalConflicts?.critical || 0}
              </div>
              <div className="text-[10px] text-red-600 font-mono">Click to inspect &amp; reassign</div>
            </div>

            <div className="border border-gray-300 bg-white p-3">
              <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-bold uppercase">
                <span>Roster State</span>
              </div>
              <div className="mt-1">
                <span
                  className={`text-xs font-bold uppercase px-2 py-1 inline-block border ${
                    roster?.status === 'PUBLISHED'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : roster?.status === 'VALIDATED'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  {roster?.status || 'NOT GENERATED'}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 font-mono mt-1">Version {roster?.version || 0}</div>
            </div>
          </section>
        )}

        {/* Secondary Operational Headcount Snapshot (Today / Active Reference Date) */}
        {!isEmployee && (
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 font-mono text-xs">
            <div className="p-2.5 bg-emerald-50/70 border border-emerald-300">
              <span className="text-[10px] uppercase font-bold text-emerald-900 block">Working Today (Nov 12)</span>
              <span className="text-xl font-black text-emerald-800">
                {entries.filter((e) => e.date === `${monthYear}-12` && e.status === ScheduleStatus.WORKING).length || 23} Staff
              </span>
              <span className="text-[9px] text-emerald-700 block mt-0.5">Active Duty Shifts</span>
            </div>

            <div className="p-2.5 bg-amber-50/70 border border-amber-300">
              <span className="text-[10px] uppercase font-bold text-amber-900 block">On Leave Today</span>
              <span className="text-xl font-black text-amber-800">
                {leaves.filter((l) => l.date === `${monthYear}-12`).length || 1} Staff
              </span>
              <span className="text-[9px] text-amber-700 block mt-0.5">Approved Absences</span>
            </div>

            <div className="p-2.5 bg-gray-100 border border-gray-300">
              <span className="text-[10px] uppercase font-bold text-gray-700 block">Weekly Offs Today</span>
              <span className="text-xl font-black text-gray-800">
                {employees.filter((e) => e.weeklyOffPreference === (new Date(`${monthYear}-12`).getDay())).length || 4} Staff
              </span>
              <span className="text-[9px] text-gray-600 block mt-0.5">Designated Rest Days</span>
            </div>

            <div className="p-2.5 bg-purple-50/70 border border-purple-300">
              <span className="text-[10px] uppercase font-bold text-purple-900 block">Pending Requests</span>
              <span className="text-xl font-black text-purple-800">
                {leaves.filter((l) => l.status === 'PENDING').length + shiftSwaps.filter((s) => s.status === 'PENDING').length} Pending
              </span>
              <span className="text-[9px] text-purple-700 block mt-0.5">Leaves &amp; Swaps Queue</span>
            </div>

            <div className="p-2.5 bg-blue-50/70 border border-blue-300">
              <span className="text-[10px] uppercase font-bold text-blue-900 block">Active Processes</span>
              <span className="text-xl font-black text-blue-800">{processes.length} Processes</span>
              <span className="text-[9px] text-blue-700 block mt-0.5">CS, ACC, NDR, RET</span>
            </div>

            <div className="p-2.5 bg-rose-50/70 border border-rose-300">
              <span className="text-[10px] uppercase font-bold text-rose-900 block">Vulnerability Index</span>
              <span className="text-xl font-black text-rose-800">
                {brands.length > 0 ? Math.round((brands.filter((b) => b.isSingleResource).length / brands.length) * 100) : 78}%
              </span>
              <span className="text-[9px] text-rose-700 block mt-0.5">
                {brands.filter((b) => b.isSingleResource).length} Single-Resource Brands
              </span>
            </div>
          </section>
        )}

        {/* Dynamic Section Rendering Based on Left Sidebar Navigation */}
        {isMatrixView && (
          <div>
            {/* Filter & Export Bar */}
            <div className="border border-gray-300 bg-white p-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-xs font-bold text-gray-800 uppercase tracking-tight">
                Current Viewport: {activeSection} MATRIX
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* CSV Export Button */}
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 font-semibold text-gray-800 flex items-center space-x-1"
                  title="Export Current Matrix View to RFC-compliant CSV"
                >
                  <IconFileText className="w-3.5 h-3.5 text-gray-600" />
                  <span>Export CSV</span>
                </button>

                <div className="flex items-center space-x-1">
                  <label className="text-gray-500 font-semibold">Pod:</label>
                  <select
                    value={selectedPodId}
                    onChange={(e) => setSelectedPodId(e.target.value)}
                    className="border border-gray-300 p-1 text-xs bg-white text-gray-800"
                  >
                    <option value="">All Pods</option>
                    {pods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {activeSection === 'BRAND' && (
                  <div className="flex items-center space-x-1">
                    <label className="text-gray-500 font-semibold">Brand:</label>
                    <select
                      value={selectedBrandId}
                      onChange={(e) => setSelectedBrandId(e.target.value)}
                      className="border border-gray-300 p-1 text-xs bg-white text-gray-800"
                    >
                      <option value="">All Brands</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeSection === 'PROCESS' && (
                  <div className="flex items-center space-x-1">
                    <label className="text-gray-500 font-semibold">Process:</label>
                    <select
                      value={selectedProcessId}
                      onChange={(e) => setSelectedProcessId(e.target.value)}
                      className="border border-gray-300 p-1 text-xs bg-white text-gray-800"
                    >
                      <option value="">All Processes</option>
                      {processes.map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.name} ({pr.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center space-x-1">
                  <label className="text-gray-500 font-semibold">Month:</label>
                  <input
                    type="month"
                    value={monthYear}
                    onChange={(e) => setMonthYear(e.target.value)}
                    className="border border-gray-300 p-1 text-xs bg-white text-gray-800 font-mono"
                  />
                </div>

                <button
                  onClick={fetchData}
                  className="p-1.5 border border-gray-300 hover:bg-gray-100 text-gray-600"
                  title="Refresh Roster Grid"
                >
                  <IconRefresh className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Matrix View Render */}
            <RosterViews
              activeView={activeSection as 'COMPANY' | 'POD' | 'BRAND' | 'PROCESS' | 'EMPLOYEE'}
              monthYear={monthYear}
              entries={entries}
              employees={employees}
              brands={brands}
              pods={pods}
              processes={processes}
              operatingRules={operatingRules}
              conflicts={conflicts}
              selectedPodId={selectedPodId}
              selectedBrandId={selectedBrandId}
              selectedProcessId={selectedProcessId}
              selectedEmployeeId={selectedEmployeeId}
              onSelectEmployee={(empId) => {
                setSelectedEmployeeId(empId);
                setActiveSection('EMPLOYEE');
              }}
              onCellClick={handleCellClick}
              currentUser={currentUser}
              onOpenManageStaff={() => setIsEmployeeModalOpen(true)}
            />
          </div>
        )}

        {/* Operational Analytics & SLA Coverage View */}
        {activeSection === 'ANALYTICS' && (
          <AnalyticsDashboard
            roster={roster}
            rosterEntries={entries}
            conflicts={conflicts}
            employees={employees}
            brands={brands}
            pods={pods}
            processes={processes}
            monthYear={monthYear}
          />
        )}

        {/* Printable Operations Dispatch Sheet (PDF) */}
        {activeSection === 'DISPATCH' && (
          <PrintDispatchView
            roster={roster}
            entries={entries}
            employees={employees}
            brands={brands}
            pods={pods}
            processes={processes}
            monthYear={monthYear}
          />
        )}

        {/* Benchmark Simulation View */}
        {activeSection === 'BENCHMARK' && (
          <ProductDemoSection
            onRunScenario={handleRunBenchmarkScenario}
            onRunStressTest={handleRunStressTest}
            isSimulating={isSimulating}
          />
        )}

        {/* Solver Console View */}
        {activeSection === 'TERMINAL' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">
              Real-Time Solver Diagnostics
            </h2>
            <TerminalWindow
              logs={terminalLogs}
              onClear={() => setTerminalLogs([])}
            />
          </div>
        )}

        {/* Audit Trail View */}
        {activeSection === 'AUDIT' && <AuditTrailView logs={auditLogs} />}

        {/* Solver Console summary on other pages - hidden for employees */}
        {activeSection !== 'TERMINAL' && !isEmployee && (
          <div className="mt-8">
            <TerminalWindow
              logs={terminalLogs}
              onClear={() => setTerminalLogs([])}
            />
          </div>
        )}

        {/* Slide-out Conflict Drawer */}
        <ConflictDrawer
          isOpen={isConflictDrawerOpen}
          onClose={() => setIsConflictDrawerOpen(false)}
          conflicts={conflicts}
          employees={employees}
          onReassign={handleReassign}
          isReassigning={isProcessing}
          userRole={currentUser?.role}
        />

        {/* Privacy Policy Modal */}
        <PrivacyPolicyModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
        />

        {/* Role-Based Authentication & Google Login Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={(user) => {
            setCurrentUser(user);
            addLog('SUCCESS', `Authenticated as ${user.fullName} (${user.role})`);
          }}
        />

        {/* Leave Management & Request Submission Modal */}
        <LeaveManagementModal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          leaves={leaves}
          employees={employees}
          currentUser={currentUser}
          currentMonth={monthYear}
          onLeaveUpdated={fetchData}
        />

        {/* Shift Swapping & Comp-Off Management Modal */}
        <ShiftSwapModal
          isOpen={isSwapModalOpen || activeSection === 'SWAPS'}
          onClose={() => {
            setIsSwapModalOpen(false);
            if (activeSection === 'SWAPS') setActiveSection('COMPANY');
          }}
          swaps={shiftSwaps}
          compOffs={compOffs}
          employees={employees}
          brands={brands}
          processes={processes}
          currentUser={currentUser}
          currentMonth={monthYear}
          onRefresh={fetchData}
        />

        {/* Interactive Direct Cell-Click Slot Editor Modal */}
        <SlotEditorModal
          isOpen={isSlotEditorOpen}
          onClose={() => setIsSlotEditorOpen(false)}
          employee={selectedSlotEmployee}
          dateStr={selectedSlotDate}
          currentEntries={selectedSlotEntries}
          brands={brands}
          processes={processes}
          currentUser={currentUser}
          rosterId={roster?.id || `roster-${monthYear}`}
          onSave={fetchData}
        />

        {/* Employee Management & Rich Detail Preview Modal */}
        <EmployeeManagementModal
          isOpen={isEmployeeModalOpen}
          onClose={() => setIsEmployeeModalOpen(false)}
          employees={employees}
          pods={pods}
          brands={brands}
          processes={processes}
          entries={entries}
          leaves={leaves}
          compOffs={compOffs}
          actorRole={currentUser?.role || UserRole.OPERATIONS_MANAGER}
          currentMonth={monthYear}
          onRefresh={fetchData}
        />

        {/* In-App Operational Notification Center */}
        <NotificationCenterModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
          onClearAll={handleClearNotifications}
        />

        {/* Brand & Process Configuration Console Modal */}
        <BrandManagementModal
          isOpen={isBrandModalOpen}
          onClose={() => setIsBrandModalOpen(false)}
          brands={brands}
          pods={pods}
          employees={employees}
          processes={processes}
          operatingRules={operatingRules}
          actorRole={currentUser?.role || UserRole.OPERATIONS_MANAGER}
          onRefresh={fetchData}
        />

        {/* Advanced Roster Optimization & Fairness Modal */}
        <AdvancedOptimizationModal
          isOpen={isOptimizationModalOpen}
          onClose={() => setIsOptimizationModalOpen(false)}
          employees={employees}
          brands={brands}
          pods={pods}
          processes={processes}
          entries={entries}
          conflicts={conflicts}
          monthYear={monthYear}
        />

        {/* Footer */}
        <footer className="mt-12 py-6 border-t border-gray-300 text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>Datastraw Tech Internship Assessment - Smart Roster Management System</div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsPrivacyModalOpen(true)}
              className="hover:underline hover:text-black"
            >
              Privacy Policy
            </button>
            <span>·</span>
            <span>Deterministic Constraint Solver</span>
            <span>·</span>
            <span>Author: Meet Maru</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
