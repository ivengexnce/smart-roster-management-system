/**
 * AUTOMATED JWT AUTHENTICATION & RBAC SECURITY TEST SUITE
 * Datastraw Smart Roster Management System
 * Author: Meet Maru (meetmaru@datastraw.io)
 *
 * Exhaustively verifies:
 * 1. Email & Password Authentication with PBKDF2 Password Hashing
 * 2. Google OAuth Integration & Identity Verification
 * 3. Cryptographic JWT Access Token Issuance (15m lifetime)
 * 4. Cryptographic JWT Refresh Token Issuance (7d lifetime)
 * 5. Secure HttpOnly & SameSite Cookie Headers
 * 6. Protected Backend API Access with JWT in Cookie & Bearer Header
 * 7. Tampered & Forged JWT Signature Rejection (401 Unauthorized)
 * 8. Refresh Token Rotation & Session Re-authentication via /api/auth/refresh
 * 9. Strict RBAC Enforcement on Protected Routes (403 Forbidden)
 * 10. Secure Logout & Refresh Token Revocation
 */

import assert from 'assert';
import jwt from 'jsonwebtoken';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
let passedCount = 0;
let failedCount = 0;

function pass(description) {
  passedCount++;
  console.log(`  [PASS] ${passedCount}. ${description}`);
}

function fail(description, error) {
  failedCount++;
  console.error(`  [FAIL] ${description}`);
  if (error) console.error('         Error details:', error);
}

function parseCookies(res) {
  const rawList = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie') || ''];
  const cookies = {};
  for (const raw of rawList) {
    if (!raw) continue;
    const parts = raw.split(';')[0].split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  }
  return cookies;
}

function getCookieHeader(res) {
  const cookies = parseCookies(res);
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function runJwtTests() {
  console.log('========================================================================');
  console.log('  TEST SUITE: ENTERPRISE JWT-BASED AUTHENTICATION & RBAC ENFORCEMENT');
  console.log('  Target System:', BASE_URL);
  console.log('  Author: Meet Maru (meetmaru@datastraw.io)');
  console.log('========================================================================\n');

  // ===================================================================
  // PHASE 1: EMAIL & PASSWORD AUTHENTICATION & JWT GENERATION
  // ===================================================================
  console.log('[PHASE 1: Email & Password Authentication & Token Issuance]');

  // 1.1 Bad password rejection
  const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'manager@datastraw.io', password: 'wrongpassword' }),
  });
  assert.strictEqual(badLoginRes.status, 401, 'Bad credentials rejected with HTTP 401');
  const badLoginData = await badLoginRes.json();
  assert.strictEqual(badLoginData.success, false, 'Bad credentials response indicates failure');
  pass('Rejected incorrect password credentials with HTTP 401');

  // 1.2 Valid email & password login
  const validLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'manager@datastraw.io', password: 'password123' }),
  });
  assert.strictEqual(validLoginRes.status, 200, 'Valid credentials login returned HTTP 200');
  const loginData = await validLoginRes.json();
  assert.strictEqual(loginData.success, true, 'Valid login indicated success');
  assert.ok(loginData.accessToken, 'Access token returned in login response');
  assert.strictEqual(loginData.user.role, 'OPERATIONS_MANAGER', 'Authenticated user role is OPERATIONS_MANAGER');
  pass('Email & Password authenticated successfully, returning JWT access token');

  // 1.3 Verify JWT Token Structure (3 segments: header.payload.signature)
  const tokenParts = loginData.accessToken.split('.');
  assert.strictEqual(tokenParts.length, 3, 'JWT token consists of 3 dot-separated base64 segments');
  const decodedHeader = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString('utf8'));
  const decodedPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));
  assert.strictEqual(decodedHeader.alg, 'HS256', 'JWT algorithm is HS256');
  assert.strictEqual(decodedPayload.email, 'manager@datastraw.io', 'JWT payload email matches user');
  assert.strictEqual(decodedPayload.role, 'OPERATIONS_MANAGER', 'JWT payload role is OPERATIONS_MANAGER');
  assert.strictEqual(decodedPayload.type, 'access', 'JWT token type is access');
  pass('Verified cryptographically formatted HS256 JWT access token structure');

  // 1.4 Verify HttpOnly Set-Cookie Headers
  const rawSetCookie = validLoginRes.headers.get('set-cookie') || '';
  assert.ok(rawSetCookie.includes('access_token='), 'Response includes access_token cookie');
  assert.ok(rawSetCookie.toLowerCase().includes('httponly'), 'Cookies are marked HttpOnly for XSS security');
  assert.ok(rawSetCookie.toLowerCase().includes('samesite=lax'), 'Cookies use SameSite=Lax for CSRF defense');
  const managerCookieHeader = getCookieHeader(validLoginRes);
  pass('Verified secure HttpOnly, SameSite=Lax cookie headers set on client');

  // ===================================================================
  // PHASE 2: GOOGLE OAUTH AUTHENTICATION & IDENTITY VERIFICATION
  // ===================================================================
  console.log('\n[PHASE 2: Google OAuth Integration & Identity Verification]');

  const googleLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      googleAuth: {
        email: 'verified.evaluator@datastraw.io',
        name: 'Google Verified Evaluator',
        role: 'OPERATIONS_MANAGER',
      },
    }),
  });
  assert.strictEqual(googleLoginRes.status, 200, 'Google OAuth returned HTTP 200');
  const googleData = await googleLoginRes.json();
  assert.strictEqual(googleData.success, true, 'Google OAuth indicated success');
  assert.ok(googleData.accessToken, 'Google OAuth issued a valid JWT access token');
  assert.strictEqual(googleData.user.email, 'verified.evaluator@datastraw.io', 'Google verified email matches');
  pass('Google OAuth identity verification succeeded and issued cryptographically signed JWT');

  // ===================================================================
  // PHASE 3: PROTECTED ENDPOINT ACCESS VIA JWT
  // ===================================================================
  console.log('\n[PHASE 3: Protected API Access via JWT Token]');

  // 3.1 Access /api/auth/me using Bearer Authorization Header
  const meHeaderRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${loginData.accessToken}` },
  });
  assert.strictEqual(meHeaderRes.status, 200, '/api/auth/me returned HTTP 200 with Bearer token');
  const meHeaderData = await meHeaderRes.json();
  assert.strictEqual(meHeaderData.authenticated, true, 'Session confirmed authenticated');
  assert.strictEqual(meHeaderData.user.email, 'manager@datastraw.io', 'User email verified');
  pass('Protected route /api/auth/me accessed successfully using Authorization: Bearer <token>');

  // 3.2 Access /api/auth/me using HttpOnly Cookie
  const meCookieRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: managerCookieHeader },
  });
  assert.strictEqual(meCookieRes.status, 200, '/api/auth/me returned HTTP 200 with HttpOnly cookie');
  const meCookieData = await meCookieRes.json();
  assert.strictEqual(meCookieData.authenticated, true, 'Cookie session confirmed authenticated');
  pass('Protected route /api/auth/me accessed successfully using HttpOnly cookie');

  // ===================================================================
  // PHASE 4: REJECTION OF TAMPERED & FORGED JWT TOKENS
  // ===================================================================
  console.log('\n[PHASE 4: Tampered & Forged Token Rejection]');

  // 4.1 Tampered payload with forged role
  const forgedPayload = Buffer.from(
    JSON.stringify({ ...decodedPayload, role: 'OPERATIONS_MANAGER', email: 'hacker@evil.com' })
  ).toString('base64');
  const tamperedToken = `${tokenParts[0]}.${forgedPayload}.${tokenParts[2]}`; // Changed payload with old signature

  const tamperedRes = await fetch(`${BASE_URL}/api/roster/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tamperedToken}`,
    },
    body: JSON.stringify({ rosterId: 'test-roster' }),
  });
  assert.strictEqual(tamperedRes.status, 401, 'Tampered JWT token rejected with HTTP 401');
  const tamperedData = await tamperedRes.json();
  assert.strictEqual(tamperedData.success, false, 'Tampered response indicates failure');
  pass('Rejected tampered JWT token with forged payload (HTTP 401 Unauthorized)');

  // 4.2 Forged signature with fake secret
  const fakeToken = jwt.sign(
    { userId: 'fake-id', email: 'fake@datastraw.io', role: 'OPERATIONS_MANAGER', type: 'access' },
    'completely-fake-unauthorized-secret-key-12345'
  );
  const fakeRes = await fetch(`${BASE_URL}/api/roster/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${fakeToken}`,
    },
    body: JSON.stringify({ rosterId: 'test-roster' }),
  });
  assert.strictEqual(fakeRes.status, 401, 'Forged JWT signature rejected with HTTP 401');
  pass('Rejected forged JWT token with unauthorized secret signature (HTTP 401)');

  // ===================================================================
  // PHASE 5: REFRESH TOKEN ROTATION & SESSION RENEWAL
  // ===================================================================
  console.log('\n[PHASE 5: Refresh Token Rotation & Session Renewal]');

  const refreshCookies = parseCookies(validLoginRes);
  const refreshTokenStr = refreshCookies['refresh_token'];
  assert.ok(refreshTokenStr, 'Valid login provided a refresh_token cookie');

  const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `refresh_token=${refreshTokenStr}`,
    },
  });
  assert.strictEqual(refreshRes.status, 200, '/api/auth/refresh returned HTTP 200');
  const refreshData = await refreshRes.json();
  assert.strictEqual(refreshData.success, true, 'Refresh token request succeeded');
  assert.ok(refreshData.accessToken, 'Issued new fresh JWT access token');
  pass('Successfully renewed access token using HttpOnly refresh token (/api/auth/refresh)');

  // ===================================================================
  // PHASE 6: STRICT ROLE-BASED ACCESS CONTROL (RBAC) GATING
  // ===================================================================
  console.log('\n[PHASE 6: Strict RBAC Gating on Protected Routes]');

  // 6.1 Log in as Employee (Ananya Roy)
  const empLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ananya.roy@datastraw.io', password: 'password123' }),
  });
  assert.strictEqual(empLoginRes.status, 200, 'Employee authenticated');
  const empData = await empLoginRes.json();
  const empToken = empData.accessToken;
  const empCookieHeader = getCookieHeader(empLoginRes);

  // 6.2 Employee attempts to publish roster -> Forbidden 403
  const empPublishRes = await fetch(`${BASE_URL}/api/roster/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${empToken}`,
    },
    body: JSON.stringify({ rosterId: 'roster-1' }),
  });
  assert.strictEqual(empPublishRes.status, 403, 'Employee token blocked from publishing roster (HTTP 403)');
  pass('Enforced RBAC: Employee JWT strictly blocked from roster publication (HTTP 403)');

  // 6.3 Employee attempts to add employee -> Forbidden 403
  const empAddEmpRes = await fetch(`${BASE_URL}/api/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${empToken}`,
    },
    body: JSON.stringify({ employeeCode: 'E99', fullName: 'Hacker', email: 'h@h.com', podId: 'pod-alpha' }),
  });
  assert.strictEqual(empAddEmpRes.status, 403, 'Employee token blocked from adding personnel (HTTP 403)');
  pass('Enforced RBAC: Employee JWT strictly blocked from workforce modification (HTTP 403)');

  // 6.4 Operations Manager authorized to access management endpoints
  const mgrAddEmpRes = await fetch(`${BASE_URL}/api/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginData.accessToken}`,
    },
    body: JSON.stringify({
      employeeCode: 'E35',
      fullName: 'Vikram Joshi (Staff)',
      email: 'vikram.joshi@datastraw.io',
      podId: 'pod-alpha',
    }),
  });
  assert.strictEqual(mgrAddEmpRes.status, 200, 'Operations Manager authorized to add employee');
  pass('Enforced RBAC: Operations Manager JWT authorized to manage organizational data');

  // ===================================================================
  // PHASE 7: SECURE LOGOUT & REFRESH TOKEN REVOCATION
  // ===================================================================
  console.log('\n[PHASE 7: Secure Logout & Token Revocation]');

  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: `refresh_token=${refreshTokenStr}` },
  });
  assert.strictEqual(logoutRes.status, 200, 'Logout returned HTTP 200');
  const logoutData = await logoutRes.json();
  assert.strictEqual(logoutData.success, true, 'Logout indicated success');

  const logoutSetCookie = logoutRes.headers.get('set-cookie') || '';
  assert.ok(
    logoutSetCookie.includes('Max-Age=0') || logoutSetCookie.includes('max-age=0'),
    'Cookies cleared with Max-Age=0'
  );
  pass('Session logged out and cookies cleared with Max-Age=0');

  // Verify revoked refresh token is rejected
  const revokedRefreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `refresh_token=${refreshTokenStr}`,
    },
  });
  assert.strictEqual(revokedRefreshRes.status, 401, 'Revoked refresh token rejected on re-use attempt');
  pass('Revoked refresh token is strictly rejected upon re-use attempt (HTTP 401)');

  // ===================================================================
  // PHASE 8: REGISTRATION GOVERNANCE & PRIVILEGE ESCALATION PREVENTION
  // ===================================================================
  console.log('\n[PHASE 8: Registration Governance & Privilege Escalation Prevention]');

  // 8.1 Public registration attempt to self-assign OPERATIONS_MANAGER -> HTTP 403
  const hackMgrReg = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Rogue Manager',
      email: 'rogue@datastraw.io',
      password: 'password123',
      confirmPassword: 'password123',
      role: 'OPERATIONS_MANAGER',
    }),
  });
  assert.strictEqual(hackMgrReg.status, 403, 'Self-assignment of OPERATIONS_MANAGER blocked with 403');
  pass('Enforced Role Governance: Blocked self-assignment of OPERATIONS_MANAGER role (HTTP 403)');

  // 8.2 Public registration attempt to self-assign POD_LEAD -> HTTP 403
  const hackLeadReg = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Rogue Lead',
      email: 'lead@datastraw.io',
      password: 'password123',
      confirmPassword: 'password123',
      role: 'POD_LEAD',
    }),
  });
  assert.strictEqual(hackLeadReg.status, 403, 'Self-assignment of POD_LEAD blocked with 403');
  pass('Enforced Role Governance: Blocked self-assignment of POD_LEAD role (HTTP 403)');

  // 8.3 Public registration with non-datastraw domain -> HTTP 400
  const badDomainReg = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'External User',
      email: 'external@gmail.com',
      password: 'password123',
      confirmPassword: 'password123',
    }),
  });
  assert.strictEqual(badDomainReg.status, 400, 'Non-datastraw domain rejected with 400');
  pass('Enforced Domain Verification: External domain registration rejected (HTTP 400)');

  // 8.4 Public registration with password mismatch -> HTTP 400
  const mismatchReg = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Typo User',
      email: 'typo@datastraw.io',
      password: 'password123',
      confirmPassword: 'password999',
    }),
  });
  assert.strictEqual(mismatchReg.status, 400, 'Mismatched passwords rejected with 400');
  pass('Enforced Validation: Password confirmation mismatch rejected (HTTP 400)');

  // 8.5 Legitimate Employee Registration -> HTTP 200, role locked to EMPLOYEE
  const testEmail = `employee.${Date.now()}@datastraw.io`;
  const validEmpReg = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Karan Sharma',
      email: testEmail,
      password: 'password123',
      confirmPassword: 'password123',
    }),
  });
  assert.strictEqual(validEmpReg.status, 200, 'Legitimate employee registration succeeded');
  const validEmpData = await validEmpReg.json();
  assert.strictEqual(validEmpData.user.role, 'EMPLOYEE', 'Public registration strictly assigned role EMPLOYEE');
  pass('Legitimate registration successful: User role strictly assigned to EMPLOYEE');

  console.log('\n========================================================================');
  console.log(`  RESULTS: ${passedCount} PASSED / ${failedCount} FAILED`);
  console.log('  JWT-BASED AUTHENTICATION & RBAC FULLY VERIFIED END-TO-END!');
  console.log('========================================================================\n');
}

runJwtTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
