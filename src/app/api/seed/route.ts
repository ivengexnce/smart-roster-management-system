import { NextResponse } from 'next/server';
import { seedBenchmarkData } from '@/lib/seed-data';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetMonth = body.monthYear || '2024-11';
    const result = seedBenchmarkData(targetMonth);

    return NextResponse.json({
      success: true,
      message: `Successfully seeded Datastraw benchmark data for ${targetMonth}: ${result.employeesCount} employees, ${result.brandsCount} brands, ${result.podsCount} pods, and 4 processes.`,
      data: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
