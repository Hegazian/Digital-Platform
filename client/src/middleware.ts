import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge route protection.
 *
 * The httpOnly refresh cookie (`eduplat_rt`) is first-party thanks to the
 * /api/v1 rewrite proxy, so the middleware can gate dashboard routes by
 * session presence AND role claims WITHOUT trusting any client-editable
 * state (the old localStorage role check).
 *
 * NOTE: We decode (not cryptographically verify) the JWT here because the
 * signing secret is not available at the edge. This is acceptable because:
 * 1. The cookie is httpOnly and cannot be modified by client-side JS.
 * 2. Fine-grained authorization is always enforced by the API itself.
 * 3. This is purely a UX guard to prevent navigation to wrong dashboards.
 */
const PROTECTED_PREFIXES = ['/admin', '/teacher', '/student', '/profile'];

/** Role required for each route prefix. Profile is accessible to any role. */
const ROLE_MAP: Record<string, string[]> = {
  '/admin': ['ADMIN'],
  '/teacher': ['TEACHER', 'ADMIN'],
  '/student': ['STUDENT', 'ADMIN'],
  '/profile': ['STUDENT', 'TEACHER', 'ADMIN'],
};

const VALID_ROLES = new Set(['STUDENT', 'TEACHER', 'ADMIN']);

interface DecodedTokenPayload {
  userId?: string;
  role?: string;
  exp?: number;
  [key: string]: unknown;
}

/** Decode a JWT payload without verification (Base64url → JSON). */
function decodeJwtPayload(token: string): DecodedTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url → Base64 → decode
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as DecodedTokenPayload;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!needsAuth) return NextResponse.next();

  const refreshCookie = req.cookies.get('eduplat_rt')?.value;

  const redirectToLogin = (reason: string = 'required') => {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('auth', reason);
    const response = NextResponse.redirect(url);
    response.cookies.delete('eduplat_rt');
    return response;
  };

  if (!refreshCookie) {
    return redirectToLogin('required');
  }

  // Decode JWT to extract role and check expiry for edge route gating.
  const payload = decodeJwtPayload(refreshCookie);
  if (!payload) {
    return redirectToLogin('invalid');
  }

  // Expired token check (NFR-001 / P0-5b)
  if (typeof payload.exp === 'number') {
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSec) {
      return redirectToLogin('expired');
    }
  }

  const role = payload.role;
  if (!role || typeof role !== 'string' || !VALID_ROLES.has(role)) {
    return redirectToLogin('invalid_role');
  }

  // Find which prefix matches and check the required roles.
  const matchedPrefix = PROTECTED_PREFIXES.find(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const allowedRoles = matchedPrefix ? ROLE_MAP[matchedPrefix] : null;

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Wrong role: redirect to their correct dashboard instead of a raw block.
    const url = req.nextUrl.clone();
    if (role === 'ADMIN') url.pathname = '/admin/dashboard';
    else if (role === 'TEACHER') url.pathname = '/teacher/dashboard';
    else url.pathname = '/student/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/student/:path*', '/profile'],
};
