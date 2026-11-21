import { NextResponse } from 'next/server';
import { getStore, logAudit } from '@/lib/db';
import { UserRole } from '@/types';
import { signAccessToken, signRefreshToken, setAuthCookies } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  if (!code || !clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/?auth_error=missing_oauth_code`);
  }

  try {
    // 1. Exchange OAuth code for Google Access & ID Tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${appUrl}/?auth_error=token_exchange_failed`);
    }

    const tokenData = await tokenRes.json();

    // 2. Fetch User Profile from Google UserInfo endpoint
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      return NextResponse.redirect(`${appUrl}/?auth_error=profile_fetch_failed`);
    }

    const profile = await profileRes.json();
    const store = getStore();
    const cleanEmail = profile.email.toLowerCase().trim();

    let user = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      user = {
        id: `u-google-${Date.now()}`,
        email: cleanEmail,
        fullName: profile.name || cleanEmail.split('@')[0],
        role: UserRole.OPERATIONS_MANAGER,
      };
      store.users.push(user);
    }

    store.currentSessionUser = user;
    const accessToken = signAccessToken(user);
    const { token: refreshToken } = signRefreshToken(user);

    logAudit(
      'GENERATE',
      { id: user.id, name: user.fullName, role: user.role },
      `Google OAuth redirect callback authenticated for ${user.fullName}`
    );

    const redirectResponse = NextResponse.redirect(`${appUrl}/`);
    setAuthCookies(redirectResponse, accessToken, refreshToken);
    return redirectResponse;
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${appUrl}/?auth_error=internal_callback_error`);
  }
}
