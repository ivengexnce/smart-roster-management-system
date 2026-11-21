import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import {
  extractRefreshToken,
  verifyRefreshToken,
  signAccessToken,
  setAuthCookies,
} from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let token = extractRefreshToken(request);

    // If not in cookie, check JSON body
    if (!token) {
      try {
        const body = await request.json();
        token = body.refreshToken || null;
      } catch {
        // ignore body parse error
      }
    }

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Missing refresh token in HttpOnly cookie or request body.',
        },
        { status: 401 }
      );
    }

    const payload = verifyRefreshToken(token);
    const store = getStore();
    const user = store.users.find(
      (u) =>
        u.id === payload.userId ||
        u.email.toLowerCase() === payload.email.toLowerCase()
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: User associated with refresh token no longer exists.',
        },
        { status: 401 }
      );
    }

    // Generate new fresh JWT Access Token (15m expiration)
    const newAccessToken = signAccessToken(user);
    store.currentSessionUser = user;

    const response = NextResponse.json({
      success: true,
      accessToken: newAccessToken,
      tokenType: 'Bearer',
      expiresIn: '15m',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        podId: user.podId,
        employeeRef: user.employeeRef,
      },
    });

    // Update HttpOnly access_token cookie
    setAuthCookies(response, newAccessToken);
    return response;
  } catch (err: any) {
    const isExpired = err?.name === 'TokenExpiredError';
    return NextResponse.json(
      {
        success: false,
        error: isExpired
          ? 'Unauthorized: Refresh token expired. Please log in again.'
          : err?.message || 'Unauthorized: Invalid refresh token.',
        code: isExpired ? 'REFRESH_EXPIRED' : 'REFRESH_INVALID',
      },
      { status: 401 }
    );
  }
}
