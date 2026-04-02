import { NextRequest, NextResponse } from 'next/server';
import { get, ref, update } from 'firebase/database';

import { requireSession } from '@/lib/auth/api';
import { createSessionToken, getSessionCookieName } from '@/lib/auth/session';
import { getRtdb } from '@/lib/firebase-server';
import { syncUserToFirestoreBestEffort } from '@/lib/firestore-sync';

export const runtime = 'nodejs';

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

function toPublicUser(userId: string, raw: any) {
  return {
    id: userId,
    username: normalizeString(raw?.username),
    namaLengkap: normalizeString(raw?.namaLengkap) || normalizeString(raw?.nama),
    email: normalizeString(raw?.email),
    noHp: normalizeString(raw?.noHp),
    nis: normalizeString(raw?.nis),
    emailPemulihan: normalizeString(raw?.emailPemulihan),
    role: normalizeString(raw?.role),
    status: normalizeString(raw?.status),
    createdAt: raw?.createdAt || null,
    updatedAt: raw?.updatedAt || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    const database = getRtdb();

    const snapshot = await get(ref(database, `users/${session.userId}`));
    if (!snapshot.exists()) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user: toPublicUser(session.userId, snapshot.val()) });
  } catch (error: any) {
    const status =
      error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = requireSession(request);
    const database = getRtdb();

    const snapshot = await get(ref(database, `users/${session.userId}`));
    if (!snapshot.exists()) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const current = snapshot.val() as any;
    const body = await request.json().catch(() => ({}));

    const namaLengkap = normalizeString(body?.namaLengkap).slice(0, 80);
    const noHp = normalizeString(body?.noHp).slice(0, 30);
    const emailPemulihan = normalizeString(body?.emailPemulihan).slice(0, 200);

    if (!namaLengkap) {
      return NextResponse.json({ error: 'Nama lengkap wajib diisi' }, { status: 400 });
    }

    const updated = {
      namaLengkap,
      noHp,
      emailPemulihan,
      updatedAt: new Date().toISOString(),
    };

    await update(ref(database, `users/${session.userId}`), updated);
    await syncUserToFirestoreBestEffort(session.userId, { ...current, ...updated });

    const token = createSessionToken({
      userId: session.userId,
      email: current?.email || session.email,
      role: current?.role || session.role,
      username: current?.username || session.username,
      namaLengkap,
    });

    const response = NextResponse.json({
      ok: true,
      user: toPublicUser(session.userId, { ...current, ...updated }),
    });

    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return response;
  } catch (error: any) {
    const status =
      error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

