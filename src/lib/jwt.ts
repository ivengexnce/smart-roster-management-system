/**
 * ENTERPRISE JWT AUTHENTICATION ENGINE
 * Datastraw Smart Roster Management System
 * Author: Meet Maru (meetmaru@datastraw.io)
 *
 * Implements:
 * 1. Cryptographically signed JWT Access Tokens (HS256, 15m lifetime)
 * 2. Cryptographically signed JWT Refresh Tokens (HS256, 7d lifetime)
 * 3. Secure HttpOnly, SameSite=Lax cookie management
 * 4. Refresh token registration, rotation, and revocation
 * 5. PBKDF2 cryptographic password hashing and verification
 * 6. Dual token transport (HttpOnly cookies + Authorization: Bearer <token>)
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { User, UserRole } from '@/types';
import { registerRefreshToken, isRefreshTokenValid, revokeRefreshToken } from './db';

// Fallback secrets with high entropy if environment variables are not supplied
const JWT_SECRET =
  process.env.JWT_SECRET ||
  '4514d2d117ee02546752c920c1340bf763d99a5c080a9de7f8c7fc8585025955';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  '6892db8cf79c0684e0aa9affa0b1fd9104a81f53fc7ff4973da69c6ea1cace86';

const ACCESS_TOKEN_EXPIRATION = process.env.JWT_EXPIRES_IN || '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRATION = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // 7 days

export interface JWTAccessPayload {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  podId?: string;
  employeeRef?: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface JWTRefreshPayload {
  userId: string;
  email: string;
  tokenId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Sign a JWT access token for an authenticated user.
 */
export function signAccessToken(user: User): string {
  const payload: JWTAccessPayload = {
    userId: user.id,
    email: user.email.toLowerCase(),
    fullName: user.fullName,
    role: user.role,
    podId: user.podId,
    employeeRef: user.employeeRef,
    type: 'access',
  };

  const options: SignOptions = {
    expiresIn: ACCESS_TOKEN_EXPIRATION as any,
    algorithm: 'HS256',
    issuer: 'datastraw-smart-roster',
    audience: 'datastraw-roster-users',
  };

  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Sign a cryptographically tracked JWT refresh token.
 */
export function signRefreshToken(user: User): { token: string; tokenId: string } {
  const tokenId = `rt_${crypto.randomBytes(16).toString('hex')}`;
  const payload: JWTRefreshPayload = {
    userId: user.id,
    email: user.email.toLowerCase(),
    tokenId,
    type: 'refresh',
  };

  const options: SignOptions = {
    expiresIn: REFRESH_TOKEN_EXPIRATION as any,
    algorithm: 'HS256',
    issuer: 'datastraw-smart-roster',
    audience: 'datastraw-roster-users',
  };

  const token = jwt.sign(payload, JWT_REFRESH_SECRET, options);
  registerRefreshToken(tokenId);

  return { token, tokenId };
}

/**
 * Verify and decode a JWT access token.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 */
export function verifyAccessToken(token: string): JWTAccessPayload {
  const decoded = jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: 'datastraw-smart-roster',
    audience: 'datastraw-roster-users',
  }) as JWTAccessPayload;

  if (decoded.type !== 'access') {
    throw new Error('Invalid token type: expected access token');
  }

  return decoded;
}

/**
 * Verify and decode a JWT refresh token, checking backend revocation status.
 */
export function verifyRefreshToken(token: string): JWTRefreshPayload {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
    algorithms: ['HS256'],
    issuer: 'datastraw-smart-roster',
    audience: 'datastraw-roster-users',
  }) as JWTRefreshPayload;

  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type: expected refresh token');
  }

  if (!isRefreshTokenValid(decoded.tokenId)) {
    throw new Error('Revoked refresh token: session terminated or rotated');
  }

  return decoded;
}

/**
 * Invalidate a refresh token upon logout or rotation.
 */
export function invalidateRefreshToken(tokenOrTokenId: string): void {
  try {
    if (tokenOrTokenId.startsWith('rt_')) {
      revokeRefreshToken(tokenOrTokenId);
    } else {
      const decoded = jwt.decode(tokenOrTokenId) as JWTRefreshPayload | null;
      if (decoded?.tokenId) {
        revokeRefreshToken(decoded.tokenId);
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Secure PBKDF2 Password Hashing
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHashOrPassword?: string): boolean {
  if (!storedHashOrPassword) return false;

  // If already hashed as salt:hash
  if (storedHashOrPassword.includes(':')) {
    const [salt, originalHash] = storedHashOrPassword.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
  }

  // Plaintext fallback for initial benchmark seeds (e.g. password123)
  return password === storedHashOrPassword;
}

/**
 * Set HttpOnly, Secure, and SameSite cookies on a Next.js response.
 */
export function setAuthCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken?: string
): void {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 minutes
  });

  if (refreshToken) {
    res.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  }
}

/**
 * Clear authentication cookies on logout.
 */
export function clearAuthCookies(res: NextResponse): void {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookies.set('access_token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  res.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Extract JWT access token from HttpOnly cookie or Authorization header.
 */
export function extractToken(request: Request): string | null {
  // 1. Check Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 2. Check Cookie header
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const accessCookie = cookies.find((c) => c.startsWith('access_token='));
    if (accessCookie) {
      return decodeURIComponent(accessCookie.substring('access_token='.length));
    }
  }

  return null;
}

/**
 * Extract JWT refresh token from cookie or request body.
 */
export function extractRefreshToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));
    if (refreshCookie) {
      return decodeURIComponent(refreshCookie.substring('refresh_token='.length));
    }
  }
  return null;
}
