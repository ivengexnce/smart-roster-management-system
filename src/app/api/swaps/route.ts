import { NextResponse } from 'next/server';
import { getStore, logAudit, checkPermission } from '@/lib/db';
import {
  ShiftSwapRequest,
  SwapStatus,
  CompOffCredit,
  UserRole,
  LeaveRequest,
  LeaveType,
  LeaveStatus,
  ScheduleStatus,
} from '@/types';
import { authenticateRequest } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const store = getStore();
  const authReq = authenticateRequest(request);
  const currentUser = authReq.user;
  if (!authReq.authenticated || !currentUser) {
    return NextResponse.json({
      shiftSwaps: store.shiftSwaps || [],
      compOffs: store.compOffs || [],
    });
  }

  const role = currentUser.role;
  if (role === UserRole.EMPLOYEE) {
    const emp = store.employees.find(
      (e) =>
        e.employeeCode === currentUser.employeeRef ||
        e.email.toLowerCase() === currentUser.email.toLowerCase()
    );
    const empId = emp?.id || currentUser.userId;
    const mySwaps = (store.shiftSwaps || []).filter(
      (s) => s.requesterEmpId === empId || s.targetEmpId === empId
    );
    const myCompOffs = (store.compOffs || []).filter((c) => c.employeeId === empId);
    return NextResponse.json({
      shiftSwaps: mySwaps,
      compOffs: myCompOffs,
    });
  }

  if (role === UserRole.POD_LEAD) {
    const podId = currentUser.podId || 'pod-alpha';
    const podEmpIds = new Set(store.employees.filter((e) => e.podId === podId).map((e) => e.id));
    const podSwaps = (store.shiftSwaps || []).filter(
      (s) => podEmpIds.has(s.requesterEmpId) || podEmpIds.has(s.targetEmpId)
    );
    const podCompOffs = (store.compOffs || []).filter((c) => podEmpIds.has(c.employeeId));
    return NextResponse.json({
      shiftSwaps: podSwaps,
      compOffs: podCompOffs,
    });
  }

  return NextResponse.json({
    shiftSwaps: store.shiftSwaps || [],
    compOffs: store.compOffs || [],
  });
}

export async function POST(request: Request) {
  try {
    const authReq = authenticateRequest(request);
    if (!authReq.authenticated) {
      return authReq.errorResponse!;
    }

    const body = await request.json();
    const { action, actorRole = authReq.user?.role } = body;
    const store = getStore();

    if (!store.shiftSwaps) store.shiftSwaps = [];
    if (!store.compOffs) store.compOffs = [];

    // --- ACTION 1: SUBMIT A SHIFT SWAP REQUEST ---
    if (action === 'CREATE_SWAP') {
      const {
        requesterEmpId,
        targetEmpId,
        date,
        brandId,
        processId,
        reason,
      } = body;

      if (!requesterEmpId || !targetEmpId || !date || !brandId || !processId) {
        return NextResponse.json(
          { success: false, error: 'Missing required swap fields (requester, target, date, brand, process)' },
          { status: 400 }
        );
      }

      if (requesterEmpId === targetEmpId) {
        return NextResponse.json(
          { success: false, error: 'Cannot swap shift with yourself' },
          { status: 400 }
        );
      }

      const requester = store.employees.find((e) => e.id === requesterEmpId);
      const target = store.employees.find((e) => e.id === targetEmpId);
      const brand = store.brands.find((b) => b.id === brandId);
      const process = store.processes.find((p) => p.id === processId);

      if (!requester || !target) {
        return NextResponse.json(
          { success: false, error: 'Invalid employee specified for swap' },
          { status: 404 }
        );
      }

      // Validation 1: Target employee must be qualified for the process
      const procCode = process?.code || '';
      if (!target.qualifiedProcessIds.includes(procCode) && !target.qualifiedProcessIds.includes(processId)) {
        return NextResponse.json(
          {
            success: false,
            error: `Target employee ${target.fullName} is not qualified for process ${process?.name || processId}`,
          },
          { status: 400 }
        );
      }

      // Validation 2: Target employee cannot be on approved leave on that date
      const targetOnLeave = store.leaves.some(
        (l) => l.employeeId === targetEmpId && l.date === date && l.status === LeaveStatus.APPROVED
      );
      if (targetOnLeave) {
        return NextResponse.json(
          {
            success: false,
            error: `Target employee ${target.fullName} is on approved leave on ${date}`,
          },
          { status: 400 }
        );
      }

      const newSwap: ShiftSwapRequest = {
        id: `swap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        requesterEmpId,
        requesterEmpName: requester.fullName,
        targetEmpId,
        targetEmpName: target.fullName,
        date,
        brandId,
        brandName: brand?.name || brandId,
        processId,
        processName: process?.name || processId,
        reason: reason || 'Mutual shift exchange request',
        status: SwapStatus.PENDING,
        requestedAt: new Date().toISOString(),
      };

      store.shiftSwaps.unshift(newSwap);

      logAudit(
        'SHIFT_SWAP',
        { id: requester.id, name: requester.fullName, role: actorRole || UserRole.EMPLOYEE },
        `Requested shift swap with ${target.fullName} for ${brand?.name} (${process?.name}) on ${date}: ${newSwap.reason}`,
        date,
        brandId,
        processId
      );

      return NextResponse.json({ success: true, swap: newSwap });
    }

    // --- ACTION 2: APPROVE SHIFT SWAP ---
    if (action === 'APPROVE_SWAP') {
      const auth = checkPermission(actorRole || UserRole.OPERATIONS_MANAGER, [
        UserRole.OPERATIONS_MANAGER,
        UserRole.POD_LEAD,
      ]);
      if (!auth.authorized) {
        return NextResponse.json({ success: false, error: auth.reason }, { status: 403 });
      }

      const swap = store.shiftSwaps.find((s) => s.id === body.swapId);
      if (!swap) {
        return NextResponse.json({ success: false, error: 'Swap request not found' }, { status: 404 });
      }

      swap.status = SwapStatus.APPROVED;
      swap.reviewedBy = actorRole;
      swap.reviewedAt = new Date().toISOString();

      // Perform atomic schedule swap in roster entries if roster exists
      const matchingEntries = store.rosterEntries.filter(
        (e) =>
          e.date === swap.date &&
          e.brandId === swap.brandId &&
          e.processId === swap.processId &&
          e.employeeId === swap.requesterEmpId
      );

      if (matchingEntries.length > 0) {
        for (const entry of matchingEntries) {
          entry.originalEmployeeId = entry.employeeId;
          entry.employeeId = swap.targetEmpId;
          entry.isOverride = true;
          entry.overrideReason = `Approved shift swap from ${swap.requesterEmpName} to ${swap.targetEmpName}`;
          entry.status = ScheduleStatus.WORKING;
        }
      }

      logAudit(
        'SHIFT_SWAP',
        { id: 'actor', name: actorRole, role: actorRole },
        `Approved shift swap: ${swap.targetEmpName} takes shift for ${swap.requesterEmpName} on ${swap.date} (${swap.brandName})`,
        swap.date,
        swap.brandId,
        swap.processId
      );

      return NextResponse.json({ success: true, swap });
    }

    // --- ACTION 3: REJECT SHIFT SWAP ---
    if (action === 'REJECT_SWAP') {
      const auth = checkPermission(actorRole || UserRole.OPERATIONS_MANAGER, [
        UserRole.OPERATIONS_MANAGER,
        UserRole.POD_LEAD,
      ]);
      if (!auth.authorized) {
        return NextResponse.json({ success: false, error: auth.reason }, { status: 403 });
      }

      const swap = store.shiftSwaps.find((s) => s.id === body.swapId);
      if (!swap) {
        return NextResponse.json({ success: false, error: 'Swap request not found' }, { status: 404 });
      }

      swap.status = SwapStatus.REJECTED;
      swap.reviewedBy = actorRole;
      swap.reviewedAt = new Date().toISOString();

      logAudit(
        'SHIFT_SWAP',
        { id: 'actor', name: actorRole, role: actorRole },
        `Rejected shift swap between ${swap.requesterEmpName} and ${swap.targetEmpName} on ${swap.date}`,
        swap.date,
        swap.brandId,
        swap.processId
      );

      return NextResponse.json({ success: true, swap });
    }

    // --- ACTION 4: GRANT COMP-OFF CREDIT ---
    if (action === 'GRANT_COMPOFF') {
      const auth = checkPermission(actorRole || UserRole.OPERATIONS_MANAGER, [
        UserRole.OPERATIONS_MANAGER,
        UserRole.POD_LEAD,
      ]);
      if (!auth.authorized) {
        return NextResponse.json({ success: false, error: auth.reason }, { status: 403 });
      }

      const { employeeId, earnedDate, earnedReason } = body;
      const emp = store.employees.find((e) => e.id === employeeId);
      if (!emp) {
        return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
      }

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 60); // 60 days validity
      const expiryStr = expiryDate.toISOString().split('T')[0];

      const newCredit: CompOffCredit = {
        id: `co-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        employeeId: emp.id,
        employeeName: emp.fullName,
        earnedDate: earnedDate || new Date().toISOString().split('T')[0],
        earnedReason: earnedReason || 'Worked on designated weekly-off / public holiday',
        expiryDate: expiryStr,
        status: 'AVAILABLE',
      };

      store.compOffs.unshift(newCredit);

      logAudit(
        'GRANT_COMPOFF',
        { id: 'actor', name: actorRole, role: actorRole },
        `Granted 1 Comp-Off credit to ${emp.fullName} for working on ${newCredit.earnedDate}: ${newCredit.earnedReason}`,
        newCredit.earnedDate
      );

      return NextResponse.json({ success: true, credit: newCredit });
    }

    // --- ACTION 5: REDEEM COMP-OFF (LEAVE) ---
    if (action === 'REDEEM_COMPOFF') {
      const { compOffId, leaveDate, reason } = body;
      const credit = store.compOffs.find((c) => c.id === compOffId && c.status === 'AVAILABLE');
      if (!credit) {
        return NextResponse.json(
          { success: false, error: 'Available comp-off credit not found' },
          { status: 404 }
        );
      }

      if (!leaveDate) {
        return NextResponse.json(
          { success: false, error: 'Must provide leaveDate for comp-off redemption' },
          { status: 400 }
        );
      }

      credit.status = 'REDEEMED';
      credit.redeemedOnLeaveDate = leaveDate;

      const newLeave: LeaveRequest = {
        id: `leave-co-${Date.now()}`,
        employeeId: credit.employeeId,
        employeeName: credit.employeeName,
        date: leaveDate,
        leaveType: LeaveType.COMP_OFF,
        status: LeaveStatus.APPROVED,
        reason: reason || `Redeemed comp-off credit earned on ${credit.earnedDate}`,
        approvedBy: actorRole || UserRole.OPERATIONS_MANAGER,
      };

      store.leaves.push(newLeave);

      logAudit(
        'APPROVE_LEAVE',
        { id: credit.employeeId, name: credit.employeeName, role: actorRole || UserRole.EMPLOYEE },
        `Redeemed comp-off credit for leave on ${leaveDate} (originally earned on ${credit.earnedDate})`,
        leaveDate
      );

      return NextResponse.json({ success: true, credit, leave: newLeave });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
