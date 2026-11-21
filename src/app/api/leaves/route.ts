import { NextResponse } from 'next/server';
import { getStore, logAudit, checkPermission } from '@/lib/db';
import { LeaveRequest, LeaveStatus, LeaveType, UserRole } from '@/types';
import { authenticateRequest } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const store = getStore();
  const authReq = authenticateRequest(request);
  const currentUser = authReq.user;
  if (!authReq.authenticated || !currentUser) {
    return NextResponse.json({ leaves: store.leaves });
  }

  const role = currentUser.role;
  if (role === UserRole.EMPLOYEE) {
    const emp = store.employees.find(
      (e) =>
        e.employeeCode === currentUser.employeeRef ||
        e.email.toLowerCase() === currentUser.email.toLowerCase()
    );
    const empId = emp?.id || currentUser.userId;
    const personalLeaves = store.leaves.filter((l) => l.employeeId === empId);
    return NextResponse.json({ leaves: personalLeaves });
  }

  if (role === UserRole.POD_LEAD) {
    const podId = currentUser.podId || 'pod-alpha';
    const podEmpIds = new Set(store.employees.filter((e) => e.podId === podId).map((e) => e.id));
    const podLeaves = store.leaves.filter((l) => podEmpIds.has(l.employeeId));
    return NextResponse.json({ leaves: podLeaves });
  }

  return NextResponse.json({ leaves: store.leaves });
}

export async function POST(request: Request) {
  try {
    const authReq = authenticateRequest(request);
    if (!authReq.authenticated) {
      return authReq.errorResponse!;
    }

    const body = await request.json();
    const token = request.headers.get('cookie')?.includes('smart_roster_access_token=') ||
      request.headers.get('authorization')?.startsWith('Bearer ');
    const effectiveRole = token ? authReq.user?.role : (body.actorRole || authReq.user?.role);
    const { employeeId, date, leaveType, reason, action } = body;
    const store = getStore();

    if (action === 'APPROVE' || action === 'REJECT') {
      const auth = checkPermission(effectiveRole || UserRole.OPERATIONS_MANAGER, [
        UserRole.OPERATIONS_MANAGER,
        UserRole.POD_LEAD,
      ]);
      if (!auth.authorized) {
        return NextResponse.json({ success: false, error: auth.reason }, { status: 403 });
      }

      const leave = store.leaves.find((l) => l.id === body.leaveId);
      if (!leave) {
        return NextResponse.json({ success: false, error: 'Leave request not found' }, { status: 404 });
      }

      // Pod Lead can only approve leaves for their own pod
      if (effectiveRole === UserRole.POD_LEAD) {
        const podId = authReq.user?.podId || 'pod-alpha';
        const leaveEmp = store.employees.find((e) => e.id === leave.employeeId);
        if (leaveEmp && leaveEmp.podId !== podId) {
          return NextResponse.json(
            { success: false, error: `Forbidden: Pod Leads cannot approve leaves for employees in ${leaveEmp.podName || leaveEmp.podId}` },
            { status: 403 }
          );
        }
      }

      leave.status = action === 'APPROVE' ? LeaveStatus.APPROVED : LeaveStatus.REJECTED;
      leave.approvedBy = effectiveRole;

      logAudit(
        'APPROVE_LEAVE',
        { id: authReq.user?.userId || 'actor', name: authReq.user?.fullName || effectiveRole, role: effectiveRole },
        `${action} leave request for employee ${leave.employeeId} on ${leave.date}`,
        leave.date
      );

      return NextResponse.json({ success: true, leave });
    }

    // Submit new leave
    if (!employeeId || !date) {
      return NextResponse.json(
        { success: false, error: 'Missing employeeId or date' },
        { status: 400 }
      );
    }

    // Employee privilege guard: Employee cannot submit leaves on behalf of others
    if (effectiveRole === UserRole.EMPLOYEE) {
      const myEmp = store.employees.find(
        (e) =>
          e.employeeCode === authReq.user?.employeeRef ||
          e.email.toLowerCase() === authReq.user?.email.toLowerCase()
      );
      if (myEmp && myEmp.id !== employeeId) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Employees can only submit leave applications for themselves.' },
          { status: 403 }
        );
      }
    }

    const emp = store.employees.find((e) => e.id === employeeId);
    const newLeave: LeaveRequest = {
      id: `leave-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      employeeId,
      employeeName: emp?.fullName || employeeId,
      date,
      leaveType: leaveType || LeaveType.PLANNED_LEAVE,
      status: LeaveStatus.APPROVED, // Auto-approved for simulation
      reason: reason || 'Scheduled personal leave',
    };

    store.leaves.push(newLeave);

    return NextResponse.json({ success: true, leave: newLeave });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
