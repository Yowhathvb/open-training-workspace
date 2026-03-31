import 'server-only';

import { initializeApp, getApps } from 'firebase/app';
import { deleteDoc, doc, getFirestore, setDoc } from 'firebase/firestore';

type AnyUser = Record<string, any>;

const USERS_COLLECTION = 'users';

let cachedFirestore: ReturnType<typeof getFirestore> | null = null;

function getFirebaseApp() {
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || 'missing',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'missing',
    projectId: process.env.FIREBASE_PROJECT_ID || 'missing',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'missing',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || 'missing',
    appId: process.env.FIREBASE_APP_ID || 'missing',
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'missing',
  };

  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

function getFirestoreDb() {
  if (cachedFirestore) return cachedFirestore;
  cachedFirestore = getFirestore(getFirebaseApp());
  return cachedFirestore;
}

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

function toFirestoreUser(userData: AnyUser) {
  return {
    username: normalizeString(userData?.username),
    nama: normalizeString(userData?.nama) || normalizeString(userData?.namaLengkap),
    email: normalizeString(userData?.email),
    password: normalizeString(userData?.password),
    role: normalizeString(userData?.role),
    ...(userData?.status ? { status: normalizeString(userData.status) } : {}),
    ...(userData?.createdAt ? { createdAt: userData.createdAt } : {}),
    ...(userData?.updatedAt ? { updatedAt: userData.updatedAt } : {}),
  };
}

async function bestEffort<T>(operation: Promise<T>) {
  operation.catch((error) => {
    console.warn('Firestore sync skipped:', error?.code || error);
    return null;
  });

  await Promise.race([
    operation,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
  ]);
}

export async function syncUserToFirestoreBestEffort(userId: string, userData: AnyUser) {
  const firestore = getFirestoreDb();
  const userRef = doc(firestore, USERS_COLLECTION, userId);
  await bestEffort(setDoc(userRef, toFirestoreUser(userData), { merge: true }));
}

export async function deleteUserFromFirestoreBestEffort(userId: string) {
  const firestore = getFirestoreDb();
  const userRef = doc(firestore, USERS_COLLECTION, userId);
  await bestEffort(deleteDoc(userRef));
}

