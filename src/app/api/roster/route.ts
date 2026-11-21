import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const monthYear = searchParams.get('monthYear') || '2024-11';
  const podId = searchParams.get('podId') || undefined;

  const store = getStore();
  const rosterId = `roster-${monthYear}${podId ? `-${podId}` : ''}`;

  const roster = store.rosters.find((r) => r.id === rosterId || r.monthYear === monthYear);
  const entries = store.rosterEntries.filter((e) => (roster ? e.rosterId === roster.id : false));
  const conflicts = store.conflicts.filter((c) => (roster ? c.rosterId === roster.id : false));

  return NextResponse.json({
    roster: roster || null,
    entries,
    conflicts,
    employees: store.employees,
    brands: store.brands,
    pods: store.pods,
    processes: store.processes,
    operatingRules: store.operatingRules,
    leaves: store.leaves,
    holidays: store.holidays,
    auditLogs: store.auditLogs.slice(0, 20),
  });
}
