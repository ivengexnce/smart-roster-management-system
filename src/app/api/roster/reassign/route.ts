import { NextResponse } from 'next/server';
import { reassignBackup } from '@/lib/scheduling-engine';
import { getStore } from '@/lib/db';
import { UserRole } from '@/types';
import { authenticateRequest } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.authenticated) {
      return auth.errorResponse!;
    }

    const body = await request.json();
    const {
      rosterId,
      date,
      brandId,
      processId,
      backupEmployeeId,
      reason,
      actorRole = auth.user?.role || UserRole.OPERATIONS_MANAGER,
      status,
      shiftTiming,
    } = body;

    if (actorRole === UserRole.EMPLOYEE) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Employees cannot execute backup reassignments.' },
        { status: 403 }
      );
    }

    if (!rosterId || !date || !brandId || !processId || !backupEmployeeId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields for reassignment' },
        { status: 400 }
      );
    }

    const store = getStore();
    const actor = store.users.find((u) => u.role === (actorRole || UserRole.OPERATIONS_MANAGER)) || store.users[0];

    const result = reassignBackup(
      rosterId,
      date,
      brandId,
      processId,
      backupEmployeeId,
      actor,
      reason,
      status,
      shiftTiming
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const isAuthError = message.toLowerCase().includes('forbidden') || message.toLowerCase().includes('unauthorized');
    const status = isAuthError ? 403 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
