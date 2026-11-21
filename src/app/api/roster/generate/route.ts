import { NextResponse } from 'next/server';
import { generateRoster } from '@/lib/scheduling-engine';
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
    const monthYear = body.monthYear || '2026-11';
    const podId = body.podId || undefined;
    const actorRole = token ? (auth.user?.role || UserRole.OPERATIONS_MANAGER) : (body.actorRole || auth.user?.role || UserRole.OPERATIONS_MANAGER);

    if (actorRole === UserRole.EMPLOYEE) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Employees cannot generate operational rosters.' },
        { status: 403 }
      );
    }

    const store = getStore();
    const actor = token
      ? (store.users.find((u) => u.id === auth.user?.userId) || store.users.find((u) => u.role === actorRole) || store.users[0])
      : (store.users.find((u) => u.role === actorRole) || store.users[0]);

    const result = generateRoster(monthYear, actor, podId);

    return NextResponse.json({
      success: true,
      message: `Roster generated for ${monthYear}. Critical conflicts: ${result.roster.totalConflicts.critical}, Warnings: ${result.roster.totalConflicts.warning}.`,
      roster: result.roster,
      conflicts: result.conflicts,
      totalEntries: result.entries.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
