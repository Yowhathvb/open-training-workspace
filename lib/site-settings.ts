import 'server-only';

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

import { isEnvConfigured } from '@/lib/app-config';

type SiteSettings = {
  siteName: string;
  logoUrl: string;
};

const SITE_SETTINGS_PATH = 'settings/site';

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

function toSettings(raw: any): SiteSettings {
  return {
    siteName: normalizeString(raw?.siteName) || 'OTW Platform',
    logoUrl: normalizeString(raw?.logoUrl) || '',
  };
}

let cachedDatabase: ReturnType<typeof getDatabase> | null = null;

function getFirebaseDatabase() {
  if (cachedDatabase) return cachedDatabase;

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
  cachedDatabase = getDatabase(app);
  return cachedDatabase;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!isEnvConfigured()) {
    return { siteName: 'OTW Platform', logoUrl: '' };
  }

  try {
    const database = getFirebaseDatabase();
    const snapshot = await get(ref(database, SITE_SETTINGS_PATH));
    return toSettings(snapshot.exists() ? snapshot.val() : {});
  } catch {
    return { siteName: 'OTW Platform', logoUrl: '' };
  }
}

