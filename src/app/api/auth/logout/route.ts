import { NextResponse } from 'next/server';
import { getStore, logAudit } from '@/lib/db';
import { extractRefreshToken, invalidateRefreshToken, clearAuthCookies } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const store = getStore();
  const prevUser = store.currentSessionUser;

  // Invalidate active refresh token in database
  const refreshToken = extractRefreshToken(request);
  if (refreshToken) {
    invalidateRefreshToken(refreshToken);
  }

  if (prevUser) {
    logAudit(
      'GENERATE',
      { id: prevUser.id, name: prevUser.fullName, role: prevUser.role },
      `User ${prevUser.fullName} (${prevUser.role}) signed out. Session and JWT tokens revoked.`
    );
  }

  store.currentSessionUser = null;

  const response = NextResponse.json({
    success: true,
    message: 'User logged out successfully. JWT session and tokens invalidated.',
  });

  clearAuthCookies(response);
  return response;
}
