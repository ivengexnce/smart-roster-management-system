import { NextResponse } from 'next/server';
import { getStore, logAudit, checkPermission } from '@/lib/db';
import { Process, OperatingRule, UserRole, OperatingCalendarType } from '@/types';
import { authenticateRequest } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

/**
 * Process & Operating Rules Management API
 * Author: Meet Maru (meetmaru@datastraw.io)
 * Project: Datastraw Tech Internship Assessment
 */

export async function GET() {
  const store = getStore();
  return NextResponse.json({
    success: true,
    processes: store.processes,
    operatingRules: store.operatingRules,
  });
}

export async function PUT(request: Request) {
  try {
    const authReq = authenticateRequest(request);
    if (!authReq.authenticated) {
      return authReq.errorResponse!;
    }

    const body = await request.json();
    const {
      ruleId,
      brandId,
      processId,
      minStaffingRequired,
      calendarType,
      actorRole = authReq.user?.role || UserRole.OPERATIONS_MANAGER,
    } = body;

    const auth = checkPermission(actorRole, UserRole.OPERATIONS_MANAGER);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Operations Managers can configure operating rules.' },
        { status: 403 }
      );
    }

    const store = getStore();
    const ruleIndex = store.operatingRules.findIndex(
      (r) => r.id === ruleId || (r.brandId === brandId && r.processId === processId)
    );

    if (ruleIndex === -1) {
      // Create new operating rule if not found
      const newRule: OperatingRule = {
        id: ruleId || `rule-${brandId}-${processId}`,
        brandId,
        processId,
        calendarType: calendarType || OperatingCalendarType.TYPE_A_365,
        minStaffingRequired: typeof minStaffingRequired === 'number' ? minStaffingRequired : 1,
      };
      store.operatingRules.push(newRule);
      return NextResponse.json({ success: true, message: 'Operating rule created', rule: newRule });
    }

    const r = store.operatingRules[ruleIndex];
    store.operatingRules[ruleIndex] = {
      ...r,
      minStaffingRequired: typeof minStaffingRequired === 'number' ? minStaffingRequired : r.minStaffingRequired,
      calendarType: calendarType || r.calendarType,
    };

    const updated = store.operatingRules[ruleIndex];
    logAudit(
      'EDIT_SLOT',
      { id: 'mgr-admin', name: 'Operations Manager', role: actorRole },
      `Updated operating rule for Brand ${updated.brandId} - Process ${updated.processId}: MinStaff=${updated.minStaffingRequired}, Cal=${updated.calendarType}`
    );

    return NextResponse.json({
      success: true,
      message: 'Operating rule updated successfully',
      rule: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
