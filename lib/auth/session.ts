import 'server-only';

import crypto from 'crypto';

export type SessionUser = {
  userId: string;
  email: string;
  role: string;
  username?: string;
  namaLengkap?: string;
};

const SESSION_COOKIE_NAME = 'otw_session';

function base64UrlEncode(input: Buffer | string) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buffer
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function base64UrlDecodeToBuffer(input: string) {
  const padded = input.replaceAll('-', '+').replaceAll('_', '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const withPadding = padded + '='.repeat(padLength);
  return Buffer.from(withPadding, 'base64');
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.trim().length > 0) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET is required in production');
  }
  return 'dev-auth-secret-change-me';
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function createSessionToken(user: SessionUser) {
  const payload = {
    ...user,
    iat: Date.now(),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', getAuthSecret())
    .update(encodedPayload)
    .digest();

  return `${encodedPayload}.${base64UrlEncode(signature)}`;
}

export function verifySessionToken(token: string): SessionUser | null {
  const [encodedPayload, encodedSignature] = token.split('.');
  if (!encodedPayload || !encodedSignature) return null;

  const expectedSignature = crypto
    .createHmac('sha256', getAuthSecret())
    .update(encodedPayload)
    .digest();

  const actualSignature = base64UrlDecodeToBuffer(encodedSignature);
  if (
    actualSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const payloadJson = base64UrlDecodeToBuffer(encodedPayload).toString('utf8');
    const payload = JSON.parse(payloadJson) as SessionUser & { iat?: number };
    if (!payload?.userId || !payload?.email || !payload?.role) return null;
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      username: payload.username,
      namaLengkap: payload.namaLengkap,
    };
  } catch {
    return null;
  }
}

