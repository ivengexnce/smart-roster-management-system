import { NextResponse } from 'next/server';
import { getStore, logAudit } from '@/lib/db';
import { UserRole } from '@/types';
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  extractToken,
  verifyAccessToken,
} from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, confirmPassword, fullName, role, podId, employeeRef } = body;
    const store = getStore();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { success: false, error: 'Full name, work email, and password are required.' },
        { status: 400 }
      );
    }

    if (confirmPassword && confirmPassword !== password) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify Organization Domain (@datastraw.io)
    if (!cleanEmail.endsWith('@datastraw.io')) {
      return NextResponse.json(
        { success: false, error: 'Invalid organization domain. Only @datastraw.io enterprise work accounts are permitted.' },
        { status: 400 }
      );
    }

    // Role Escalation Prevention:
    // Only an authenticated Operations Manager can create or promote privileged roles
    const token = extractToken(request);
    let isManagerAdmin = false;
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        if (payload.role === UserRole.OPERATIONS_MANAGER) {
          isManagerAdmin = true;
        }
      } catch {
        // Fallback or unauthenticated
      }
    }

    if (!isManagerAdmin && role && (role === UserRole.OPERATIONS_MANAGER || role === UserRole.POD_LEAD)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Self-assignment of privileged roles (Operations Manager, Pod Lead) is prohibited. Privileged accounts must be created or promoted by an authorized administrator.',
        },
        { status: 403 }
      );
    }

    const existing = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account with this email address already exists.' },
        { status: 409 }
      );
    }

    const assignedRole: UserRole = isManagerAdmin && role ? (role as UserRole) : UserRole.EMPLOYEE;
    const hashedPassword = hashPassword(password);
    const newUser = {
      id: `u-reg-${Date.now()}`,
      email: cleanEmail,
      password: hashedPassword,
      fullName: fullName.trim(),
      role: assignedRole,
      podId: podId || undefined,
      employeeRef: employeeRef || undefined,
    };

    store.users.push(newUser);
    store.currentSessionUser = newUser;

    const accessToken = signAccessToken(newUser);
    const { token: refreshToken } = signRefreshToken(newUser);

    logAudit(
      'GENERATE',
      { id: newUser.id, name: newUser.fullName, role: newUser.role },
      `Registered new user account: ${newUser.fullName} (${newUser.role})`
    );

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        podId: newUser.podId,
        employeeRef: newUser.employeeRef,
      },
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '15m',
      message: `Account created successfully! Welcome, ${newUser.fullName}. Assigned Role: ${assignedRole}.`,
    });

    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal registration error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
