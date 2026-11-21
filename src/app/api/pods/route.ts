import { NextResponse } from 'next/server';
import { getStore, logAudit, checkPermission } from '@/lib/db';
import { Pod, UserRole } from '@/types';
import { authenticateRequest } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

/**
 * Pod Management API Endpoint
 * Author: Meet Maru (meetmaru@datastraw.io)
 * Project: Datastraw Tech Internship Assessment
 */

export async function GET() {
  const store = getStore();
  return NextResponse.json({
    success: true,
    pods: store.pods,
    totalPods: store.pods.length,
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
      name,
      code,
      leadEmployeeId,
      leadName,
      description,
      actorRole = authReq.user?.role || UserRole.OPERATIONS_MANAGER,
    } = body;

    const auth = checkPermission(actorRole, UserRole.OPERATIONS_MANAGER);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Operations Managers can create pods.' },
        { status: 403 }
      );
    }

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: 'Pod name and code are required.' },
        { status: 400 }
      );
    }

    const store = getStore();
    const newPod: Pod = {
      id: `pod-${code.toLowerCase()}`,
      name,
      code: code.toUpperCase(),
      leadEmployeeId: leadEmployeeId || 'emp-01',
      leadName: leadName || 'Assigned Lead',
      description: description || `Operational Pod ${name}`,
    };

    store.pods.push(newPod);

    logAudit(
      'EDIT_SLOT',
      { id: 'mgr-admin', name: 'Operations Manager', role: actorRole },
      `Created operational pod: ${newPod.name} (${newPod.code})`
    );

    return NextResponse.json({
      success: true,
      message: `Pod ${newPod.name} created successfully.`,
      pod: newPod,
      totalPods: store.pods.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, leadEmployeeId, leadName, description, actorRole = UserRole.OPERATIONS_MANAGER } = body;

    const auth = checkPermission(actorRole, UserRole.OPERATIONS_MANAGER);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Operations Managers can update pods.' },
        { status: 403 }
      );
    }

    const store = getStore();
    const podIndex = store.pods.findIndex((p) => p.id === id);
    if (podIndex === -1) {
      return NextResponse.json({ success: false, error: 'Pod not found.' }, { status: 404 });
    }

    const p = store.pods[podIndex];
    store.pods[podIndex] = {
      ...p,
      name: name || p.name,
      leadEmployeeId: leadEmployeeId || p.leadEmployeeId,
      leadName: leadName || p.leadName,
      description: description || p.description,
    };

    return NextResponse.json({
      success: true,
      message: `Pod ${store.pods[podIndex].name} updated successfully.`,
      pod: store.pods[podIndex],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
