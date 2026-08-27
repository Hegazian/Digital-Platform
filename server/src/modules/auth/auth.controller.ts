import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { AuthService } from './auth.service';

const REFRESH_COOKIE = 'eduplat_rt';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The refresh token travels ONLY as an httpOnly cookie scoped to the auth
 * API - JavaScript (and therefore XSS) can never read or exfiltrate it.
 * Same-origin API proxying on the client makes this cookie first-party.
 * It must NEVER be serialized into a JSON response body, so every handler
 * passes its service result through publicAuthPayload() before responding.
 */
function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

/** Minimal signed-cookie-free parser (avoids a cookie-parser dependency). */
export function getRefreshTokenFromRequest(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === REFRESH_COOKIE) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        // Malformed escape sequence: treat as no cookie rather than a 500.
        return undefined;
      }
    }
  }
  return undefined;
}

type WithTokens = { tokens?: { accessToken?: string; refreshToken?: string } };

/**
 * Removes refresh tokens from a service result so they can never leak into
 * the response body while the cookie is still set from the original value.
 */
function publicAuthPayload<T extends WithTokens>(result: T) {
  if (!result.tokens) return { ...result, tokens: undefined };
  const { refreshToken: _omit, ...safeTokens } = result.tokens;
  return { ...result, tokens: safeTokens };
}

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.register(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.login(req.body);
      if (!result.mfaRequired && result.tokens?.refreshToken) {
        setRefreshCookie(res, result.tokens.refreshToken);
      }
      res.status(200).json({ success: true, data: publicAuthPayload(result) });
    } catch (error) {
      next(error);
    }
  }

  static async mfaLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.verifyMfaLogin(req.body);
      if (result.tokens?.refreshToken) {
        setRefreshCookie(res, result.tokens.refreshToken);
      }
      res.status(200).json({ success: true, data: publicAuthPayload(result) });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      // Cookie-first; body token kept as transition fallback.
      const refreshToken = getRefreshTokenFromRequest(req) || req.body?.refreshToken;
      const result = await AuthService.refreshToken(refreshToken);
      if (result.refreshToken) {
        setRefreshCookie(res, result.refreshToken);
      }
      // New refresh token is delivered via the cookie only.
      res.status(200).json({ success: true, data: { accessToken: result.accessToken } });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // Only revoke the session carried by the httpOnly cookie.
      // The legacy body fallback is removed to prevent griefing attacks
      // where an attacker revokes another user's refresh token.
      const token = getRefreshTokenFromRequest(req);
      await AuthService.logout(token);
      clearRefreshCookie(res);
      res.status(200).json({ success: true, message: 'Logged out' });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user.userId;
      const user = await AuthService.getProfile(userId);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user.userId;
      const updated = await AuthService.updateProfile(userId, req.body);
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}
