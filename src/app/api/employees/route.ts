import { NextResponse } from 'next/server';
import { getStore, logAudit, checkPermission } from '@/lib/db';
import { Employee, UserRole } from '@/types';
import { authenticateRequest } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

/**
 * Employee Management API Endpoint
 * Author: Meet Maru (meetmaru@datastraw.io)
 * Project: Datastraw Tech Internship Assessment
 * 
 * Supports:
 * - GET: Retrieve employees with range slicing, pod filtering, and search.
 * - POST: Operations Manager creates a new employee profile.
 * - PUT: Operations Manager or Pod Lead updates an employee profile.
 * - DELETE: Operations Manager removes an employee profile.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const podId = searchParams.get('podId') || undefined;
  const search = searchParams.get('search')?.toLowerCase() || undefined;
  const rangeStart = searchParams.get('rangeStart') ? parseInt(searchParams.get('rangeStart')!, 10) : undefined;
  const rangeEnd = searchParams.get('rangeEnd') ? parseInt(searchParams.get('rangeEnd')!, 10) : undefined;

  const store = getStore();
  let emps = [...store.employees];

  if (podId) {
    emps = emps.filter((e) => e.podId === podId);
  }

  if (search) {
    emps = emps.filter(
      (e) =>
        e.fullName.toLowerCase().includes(search) ||
        e.employeeCode.toLowerCase().includes(search) ||
        e.email.toLowerCase().includes(search)
    );
  }

  const totalCount = emps.length;

  if (rangeStart !== undefined && rangeEnd !== undefined) {
    const startIdx = Math.max(0, rangeStart - 1);
    const endIdx = Math.min(totalCount, rangeEnd);
    emps = emps.slice(startIdx, endIdx);
  }

  return NextResponse.json({
    success: true,
    totalCount,
    rangeStart: rangeStart || 1,
    rangeEnd: rangeEnd || totalCount,
    employees: emps,
  });
}

export async function POST(request: Request) {
  try {
    const authReq = authenticateRequest(request);
    if (!authReq.authenticated) {
      return authReq.errorResponse!;
    }

    const body = await request.json();
    const {
      employeeCode,
      fullName,
      email,
      phone,
      podId,
      weeklyOffPreference,
      qualifiedProcessIds,
      status = 'ACTIVE',
      actorRole = authReq.user?.role || UserRole.OPERATIONS_MANAGER,
    } = body;

    const auth = checkPermission(actorRole, UserRole.OPERATIONS_MANAGER);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Operations Managers can add employees.' },
        { status: 403 }
      );
    }

    if (!employeeCode || !fullName || !email || !podId) {
      return NextResponse.json(
        { success: false, error: 'Missing required employee fields (code, name, email, pod).' },
        { status: 400 }
      );
    }

    const store = getStore();

    // Check duplicate code
    if (store.employees.some((e) => e.employeeCode.toUpperCase() === employeeCode.toUpperCase())) {
      return NextResponse.json(
        { success: false, error: `Employee code ${employeeCode} already exists.` },
        { status: 400 }
      );
    }

    const pod = store.pods.find((p) => p.id === podId);
    const newEmp: Employee = {
      id: `emp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      employeeCode: employeeCode.toUpperCase(),
      fullName,
      email,
      phone: phone || '+91 98000 00000',
      podId,
      podName: pod ? pod.name : 'Pod Alpha',
      weeklyOffPreference: typeof weeklyOffPreference === 'number' ? weeklyOffPreference : 1,
      status: status || 'ACTIVE',
      qualifiedProcessIds: Array.isArray(qualifiedProcessIds) && qualifiedProcessIds.length > 0 ? qualifiedProcessIds : ['proc-cs'],
    };

    store.employees.push(newEmp);

    logAudit(
      'EDIT_SLOT',
      { id: 'mgr-admin', name: 'Operations Manager', role: actorRole },
      `Created new employee record: ${newEmp.fullName} (${newEmp.employeeCode}) in ${newEmp.podName}`
    );

    return NextResponse.json({
      success: true,
      message: `Employee ${newEmp.fullName} (${newEmp.employeeCode}) created successfully.`,
      employee: newEmp,
      totalEmployees: store.employees.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authReq = authenticateRequest(request);
    if (!authReq.authenticated) {
      return authReq.errorResponse!;
    }

    const body = await request.json();
    const {
      id,
      fullName,
      email,
      phone,
      podId,
      weeklyOffPreference,
      qualifiedProcessIds,
      status,
      actorRole = authReq.user?.role || UserRole.OPERATIONS_MANAGER,
    } = body;

    const auth = checkPermission(actorRole, [UserRole.OPERATIONS_MANAGER, UserRole.POD_LEAD]);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to edit employee.' },
        { status: 403 }
      );
    }

    const store = getStore();
    const empIndex = store.employees.findIndex((e) => e.id === id);
    if (empIndex === -1) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
    }

    const emp = store.employees[empIndex];
    const prevPod = emp.podName;
    const pod = podId ? store.pods.find((p) => p.id === podId) : undefined;

    store.employees[empIndex] = {
      ...emp,
      fullName: fullName || emp.fullName,
      email: email || emp.email,
      phone: phone || emp.phone,
      podId: podId || emp.podId,
      podName: pod ? pod.name : emp.podName,
      weeklyOffPreference: typeof weeklyOffPreference === 'number' ? weeklyOffPreference : emp.weeklyOffPreference,
      qualifiedProcessIds: qualifiedProcessIds || emp.qualifiedProcessIds,
      status: status || emp.status,
    };

    const updated = store.employees[empIndex];

    logAudit(
      'EDIT_SLOT',
      { id: 'actor', name: actorRole, role: actorRole },
      `Updated employee record for ${updated.fullName} (${updated.employeeCode})${prevPod !== updated.podName ? ` moved to ${updated.podName}` : ''}`
    );

    return NextResponse.json({
      success: true,
      message: `Employee ${updated.fullName} updated successfully.`,
      employee: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authReq = authenticateRequest(request);
    if (!authReq.authenticated) {
      return authReq.errorResponse!;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const actorRole =
      (searchParams.get('actorRole') as UserRole) || authReq.user?.role || UserRole.OPERATIONS_MANAGER;

    const auth = checkPermission(actorRole, UserRole.OPERATIONS_MANAGER);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Operations Managers can delete employees.' },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Employee ID is required.' }, { status: 400 });
    }

    const store = getStore();
    const empIndex = store.employees.findIndex((e) => e.id === id);
    if (empIndex === -1) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
    }

    const deleted = store.employees.splice(empIndex, 1)[0];

    logAudit(
      'EDIT_SLOT',
      { id: 'mgr-admin', name: 'Operations Manager', role: actorRole },
      `Deleted employee record: ${deleted.fullName} (${deleted.employeeCode})`
    );

    return NextResponse.json({
      success: true,
      message: `Employee ${deleted.fullName} removed from active workforce.`,
      totalEmployees: store.employees.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
