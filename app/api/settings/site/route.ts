import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';

import { isEnvConfigured } from '@/lib/app-config';
import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';

export const runtime = 'nodejs';

const SITE_SETTINGS_PATH = 'settings/site';

function getFirebaseDatabase() {
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY!,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.FIREBASE_PROJECT_ID!,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.FIREBASE_APP_ID!,
    databaseURL: process.env.FIREBASE_DATABASE_URL!,
  };

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getDatabase(app);
}

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

function toPublicSettings(raw: any) {
  return {
    siteName: normalizeString(raw?.siteName) || 'OTW Platform',
    logoUrl: normalizeString(raw?.logoUrl) || '',
  };
}

export async function GET() {
  try {
    if (!isEnvConfigured()) {
      return NextResponse.json(
        { error: 'ENV_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    const database = getFirebaseDatabase();
    const snapshot = await get(ref(database, SITE_SETTINGS_PATH));
    const settings = toPublicSettings(snapshot.exists() ? snapshot.val() : {});
    return NextResponse.json({ ok: true, settings });
  } catch (error: any) {
    console.error('Error fetching site settings:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isEnvConfigured()) {
      return NextResponse.json(
        { error: 'ENV_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    const token = request.cookies.get(getSessionCookieName())?.value;
    const session = token ? verifySessionToken(token) : null;
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    if (session.role !== 'root') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await request.json();
    const siteName = normalizeString(body?.siteName).slice(0, 60);
    const logoUrl = normalizeString(body?.logoUrl).slice(0, 500);

    if (!siteName) {
      return NextResponse.json(
        { error: 'Nama website wajib diisi' },
        { status: 400 }
      );
    }

    const database = getFirebaseDatabase();
    await update(ref(database, SITE_SETTINGS_PATH), {
      siteName,
      logoUrl,
      updatedAt: new Date().toISOString(),
      updatedBy: session.userId,
    });

    return NextResponse.json({
      ok: true,
      settings: { siteName, logoUrl },
    });
  } catch (error: any) {
    console.error('Error updating site settings:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal error' },
      { status: 500 }
    );
  }
}

