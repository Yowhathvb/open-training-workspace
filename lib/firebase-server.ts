import 'server-only';

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

import { isEnvConfigured } from '@/lib/app-config';

let cachedApp: ReturnType<typeof initializeApp> | null = null;
let cachedDatabase: ReturnType<typeof getDatabase> | null = null;
let cachedFirestore: ReturnType<typeof getFirestore> | null = null;

export function getFirebaseApp() {
  if (!isEnvConfigured()) {
    throw new Error('ENV_NOT_CONFIGURED');
  }

  if (cachedApp) return cachedApp;
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY!,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.FIREBASE_PROJECT_ID!,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.FIREBASE_APP_ID!,
    databaseURL: process.env.FIREBASE_DATABASE_URL!,
  };
  cachedApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return cachedApp;
}

export function getRtdb() {
  if (cachedDatabase) return cachedDatabase;
  cachedDatabase = getDatabase(getFirebaseApp());
  return cachedDatabase;
}

export function getFirestoreDb() {
  if (cachedFirestore) return cachedFirestore;
  cachedFirestore = getFirestore(getFirebaseApp());
  return cachedFirestore;
}

