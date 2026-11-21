import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import {
  extractToken,
  verifyAccessToken,
  extractRefreshToken,
  verifyRefreshToken,
  signAccessToken,
  setAuthCookies,
} from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const store = getStore();
  const token = extractToken(request);

  // 1. Validate JWT Access Token
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      const user = store.users.find(
        (u) =>
          u.id === payload.userId ||
          u.email.toLowerCase() === payload.email.toLowerCase()
      );

      if (user) {
        store.currentSessionUser = user;
        return NextResponse.json({
          authenticated: true,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            podId: user.podId,
            employeeRef: user.employeeRef,
          },
          availableUsers: store.users.map((u) => ({
            id: u.id,
            email: u.email,
            fullName: u.fullName,
            role: u.role,
            podId: u.podId,
          })),
        });
      }
    } catch (err: any) {
      // If access token is expired, attempt seamless refresh via refresh token
      if (err?.name === 'TokenExpiredError') {
        const refreshToken = extractRefreshToken(request);
        if (refreshToken) {
          try {
            const refreshPayload = verifyRefreshToken(refreshToken);
            const user = store.users.find(
              (u) =>
                u.id === refreshPayload.userId ||
                u.email.toLowerCase() === refreshPayload.email.toLowerCase()
            );

            if (user) {
              const newAccessToken = signAccessToken(user);
              store.currentSessionUser = user;

              const response = NextResponse.json({
                authenticated: true,
                user: {
                  id: user.id,
                  email: user.email,
                  fullName: user.fullName,
                  role: user.role,
                  podId: user.podId,
                  employeeRef: user.employeeRef,
                },
                refreshed: true,
              });

              setAuthCookies(response, newAccessToken);
              return response;
            }
          } catch {
            // Refresh failed, proceed to unauthenticated
          }
        }
      }
    }
  }

  // 2. Fallback to active in-memory session if initialized
  if (store.currentSessionUser) {
    const user = store.currentSessionUser;
    const accessToken = signAccessToken(user);
    const response = NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        podId: user.podId,
        employeeRef: user.employeeRef,
      },
      availableUsers: store.users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        podId: u.podId,
      })),
    });

    setAuthCookies(response, accessToken);
    return response;
  }

  // 3. Unauthenticated session
  return NextResponse.json(
    {
      authenticated: false,
      user: null,
      error: 'Unauthenticated: No active JWT session or valid credentials found.',
      availableUsers: store.users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        podId: u.podId,
      })),
    },
    { status: 401 }
  );
}
