import 'server-only';

import { NextRequest } from 'next/server';
import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';

export function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(getSessionCookieName())?.value;
  return token ? verifySessionToken(token) : null;
}

export function requireSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    const error = new Error('UNAUTHORIZED');
    (error as any).status = 401;
    throw error;
  }
  return session;
}

export function requireRole(request: NextRequest, allowedRoles: string[]) {
  const session = requireSession(request);
  if (!allowedRoles.includes(session.role)) {
    const error = new Error('FORBIDDEN');
    (error as any).status = 403;
    throw error;
  }
  return session;
}

