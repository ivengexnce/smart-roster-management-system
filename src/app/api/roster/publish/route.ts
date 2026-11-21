import { NextResponse } from 'next/server';
import { publishRoster } from '@/lib/scheduling-engine';
import { getStore } from '@/lib/db';
import { UserRole } from '@/types';
import { authenticateRequest } from '@/lib/authMiddleware';
import { extractToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.authenticated) {
      return auth.errorResponse!;
    }

    const token = extractToken(request);
    const body = await request.json();
    const { rosterId, actorRole } = body;

    const effectiveRole = token ? (auth.user?.role || UserRole.OPERATIONS_MANAGER) : (actorRole || auth.user?.role);
    if (effectiveRole !== UserRole.OPERATIONS_MANAGER) {
      return NextResponse.json(
        {
          success: false,
          error:
            effectiveRole === UserRole.POD_LEAD
              ? 'Forbidden: Publishing official company-wide rosters requires Operations Manager authority. Pod Leads can submit pod-level rosters for managerial approval.'
              : 'Forbidden: Only Operations Managers are authorized to publish official rosters.',
        },
        { status: 403 }
      );
    }

    if (!rosterId) {
      return NextResponse.json({ success: false, error: 'Missing rosterId' }, { status: 400 });
    }

    const store = getStore();
    const actor = token
      ? (store.users.find((u) => u.id === auth.user?.userId) ||
         store.users.find((u) => u.role === UserRole.OPERATIONS_MANAGER) ||
         store.users[0])
      : (store.users.find((u) => u.role === UserRole.OPERATIONS_MANAGER) || store.users[0]);

    const result = publishRoster(rosterId, actor);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const isAuthError = message.toLowerCase().includes('forbidden') || message.toLowerCase().includes('unauthorized');
    const status = isAuthError ? 403 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
