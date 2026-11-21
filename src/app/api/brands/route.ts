import { NextResponse } from 'next/server';
import { getStore, logAudit, checkPermission } from '@/lib/db';
import { Brand, UserRole } from '@/types';
import { authenticateRequest } from '@/lib/authMiddleware';

export const dynamic = 'force-dynamic';

/**
 * Brand Management API Endpoint
 * Author: Meet Maru (meetmaru@datastraw.io)
 * Project: Datastraw Tech Internship Assessment
 * 
 * Supports:
 * - GET: Retrieve all client brands with assigned staff and associated pods.
 * - POST: Operations Manager creates a new brand.
 * - PUT: Operations Manager updates brand details or deactivates.
 * - DELETE: Operations Manager removes a brand.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const podId = searchParams.get('podId');
  const store = getStore();

  let brands = [...store.brands];
  if (podId) {
    brands = brands.filter((b) => b.podId === podId);
  }

  return NextResponse.json({
    success: true,
    brands,
    totalCount: brands.length,
    singleResourceCount: brands.filter((b) => b.isSingleResource).length,
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
      podId,
      isSingleResource = true,
      assignedEmployeeIds = [],
      processIds = ['proc-cs', 'proc-ndr'],
      actorRole = authReq.user?.role || UserRole.OPERATIONS_MANAGER,
    } = body;

    const auth = checkPermission(actorRole, UserRole.OPERATIONS_MANAGER);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Operations Managers can create brands.' },
        { status: 403 }
      );
    }

    if (!name || !code || !podId) {
      return NextResponse.json(
        { success: false, error: 'Missing required brand fields (name, code, podId).' },
        { status: 400 }
      );
    }

    const store = getStore();

    // Check duplicate code
    if (store.brands.some((b) => b.code.toUpperCase() === code.toUpperCase())) {
      return NextResponse.json(
        { success: false, error: `Brand code ${code} already exists.` },
        { status: 400 }
      );
    }

    const newBrand: Brand = {
      id: `brand-${code.toUpperCase()}`,
      name,
      code: code.toUpperCase(),
      podId,
      isSingleResource: Boolean(isSingleResource),
      status: 'ACTIVE',
      assignedEmployeeIds,
      processIds,
    };

    store.brands.push(newBrand);

    logAudit(
      'EDIT_SLOT',
      { id: 'mgr-admin', name: 'Operations Manager', role: actorRole },
      `Created new brand account: ${newBrand.name} (${newBrand.code}) in ${podId}`
    );

    return NextResponse.json({
      success: true,
      message: `Brand ${newBrand.name} created successfully.`,
      brand: newBrand,
      totalBrands: store.brands.length,
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
      name,
      podId,
      isSingleResource,
      status,
      assignedEmployeeIds,
      processIds,
      actorRole = authReq.user?.role || UserRole.OPERATIONS_MANAGER,
    } = body;

    const auth = checkPermission(actorRole, [UserRole.OPERATIONS_MANAGER, UserRole.POD_LEAD]);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient privileges to update brand.' },
        { status: 403 }
      );
    }

    const store = getStore();
    const brandIndex = store.brands.findIndex((b) => b.id === id);
    if (brandIndex === -1) {
      return NextResponse.json({ success: false, error: 'Brand not found.' }, { status: 404 });
    }

    const brand = store.brands[brandIndex];
    store.brands[brandIndex] = {
      ...brand,
      name: name || brand.name,
      podId: podId || brand.podId,
      isSingleResource: typeof isSingleResource === 'boolean' ? isSingleResource : brand.isSingleResource,
      status: status || brand.status,
      assignedEmployeeIds: assignedEmployeeIds || brand.assignedEmployeeIds,
      processIds: processIds || brand.processIds,
    };

    const updated = store.brands[brandIndex];

    logAudit(
      'EDIT_SLOT',
      { id: 'actor', name: actorRole, role: actorRole },
      `Updated brand record for ${updated.name} (${updated.code}) - Status: ${updated.status}`
    );

    return NextResponse.json({
      success: true,
      message: `Brand ${updated.name} updated successfully.`,
      brand: updated,
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
        { success: false, error: 'Forbidden: Only Operations Managers can delete brands.' },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Brand ID is required.' }, { status: 400 });
    }

    const store = getStore();
    const brandIndex = store.brands.findIndex((b) => b.id === id);
    if (brandIndex === -1) {
      return NextResponse.json({ success: false, error: 'Brand not found.' }, { status: 404 });
    }

    const deleted = store.brands.splice(brandIndex, 1)[0];

    logAudit(
      'EDIT_SLOT',
      { id: 'mgr-admin', name: 'Operations Manager', role: actorRole },
      `Deleted brand: ${deleted.name} (${deleted.code})`
    );

    return NextResponse.json({
      success: true,
      message: `Brand ${deleted.name} removed from active roster operations.`,
      totalBrands: store.brands.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
