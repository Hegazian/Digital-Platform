import { NextRequest, NextResponse } from 'next/server';

/**
 * Optimistic route navigation guard. API authorization remains authoritative.
 *
 * The httpOnly refresh cookie (`eduplat_rt`) is first-party thanks to the
 * /api/v1 rewrite proxy. The decoded cookie is an unverified navigation hint;
 * it never authorizes data access. Malformed/expired hints go to sign-in,
 * instead of redirecting an unknown role back to the same dashboard forever.
 */
const PROTECTED_PREFIXES = ['/admin', '/teacher', '/student', '/profile'];

/** Role required for each route prefix. Profile is accessible to any role. */
const ROLE_MAP: Record<string, string[]> = {
  '/admin': ['ADMIN'],
  '/teacher': ['TEACHER', 'ADMIN'],
  '/student': ['STUDENT', 'ADMIN'],
  '/profile': ['STUDENT', 'TEACHER', 'ADMIN'],
};

/** Decode a JWT payload without verification (Base64url → JSON). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url → Base64 → decode
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!needsAuth) return NextResponse.next();

  const refreshCookie = req.cookies.get('eduplat_rt')?.value;
  const payload = refreshCookie ? decodeJwtPayload(refreshCookie) : null;
  const role = typeof payload?.role === 'string' ? payload.role : '';
  const validHint = ['ADMIN', 'TEACHER', 'STUDENT'].includes(role)
    && typeof payload?.exp === 'number' && Number.isFinite(payload.exp)
    && payload.exp > Date.now() / 1000;
  if (!validHint) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('auth', 'required');
    return NextResponse.redirect(url);
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
