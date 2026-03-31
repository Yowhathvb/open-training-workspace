import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, push, set } from 'firebase/database';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import crypto from 'crypto';

import { isEnvConfigured } from '@/lib/app-config';
import { createSessionToken, getSessionCookieName } from '@/lib/auth/session';
import { ROOT_BOOTSTRAP } from '@/app/login/root-bootstrap';

export const runtime = 'nodejs';

let cachedDatabase: ReturnType<typeof getDatabase> | null = null;
let cachedFirestore: ReturnType<typeof getFirestore> | null = null;

function getFirebaseApp() {
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY!,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.FIREBASE_PROJECT_ID!,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.FIREBASE_APP_ID!,
    databaseURL: process.env.FIREBASE_DATABASE_URL!,
  };

  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

function getFirebaseDatabase() {
  if (cachedDatabase) return cachedDatabase;
  const app = getFirebaseApp();
  cachedDatabase = getDatabase(app);
  return cachedDatabase;
}

function getFirebaseFirestore() {
  if (cachedFirestore) return cachedFirestore;
  const app = getFirebaseApp();
  cachedFirestore = getFirestore(app);
  return cachedFirestore;
}

function toFirestoreUser(userData: any) {
  return {
    username: userData?.username ?? '',
    nama: userData?.nama ?? userData?.namaLengkap ?? '',
    email: userData?.email ?? '',
    password: userData?.password ?? '',
    role: userData?.role ?? '',
  };
}

async function syncUserToFirestoreBestEffort(userId: string, userData: any) {
  const operation = (async () => {
    const firestore = getFirebaseFirestore();
    const userRef = doc(firestore, 'users', userId);
    await setDoc(userRef, toFirestoreUser(userData), { merge: true });
    return true;
  })();

  operation.catch((error) => {
    console.warn('Firestore sync skipped:', error?.code || error);
    return false;
  });

  // Don't block login if Firestore is slow/offline.
  await Promise.race([
    operation,
    new Promise<false>((resolve) => setTimeout(() => resolve(false), 1500)),
  ]);
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function normalizeEmail(input: unknown) {
  return typeof input === 'string' ? input.trim().toLowerCase() : '';
}

function normalizeUsername(input: unknown) {
  return typeof input === 'string' ? input.trim().toLowerCase() : '';
}

function isLikelyEmail(input: string) {
  return input.includes('@');
}

export async function POST(request: NextRequest) {
  try {
    if (!isEnvConfigured()) {
      return NextResponse.json(
        { error: 'ENV_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    const database = getFirebaseDatabase();
    const body = await request.json();
    const identifierRaw = typeof body?.identifier === 'string' ? body.identifier : '';
    const identifier = identifierRaw.trim();
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Username/Email dan password wajib diisi' },
        { status: 400 }
      );
    }

    const usersSnapshot = await get(ref(database, 'users'));

    let rootExists = false;
    if (usersSnapshot.exists()) {
      usersSnapshot.forEach((child) => {
        const user = child.val();
        if (user?.role === 'root') rootExists = true;
      });
    }

    // Seed root on first login when there is no root yet.
    if (!usersSnapshot.exists() || !rootExists) {
      const identifierAsEmail = normalizeEmail(identifier);
      const identifierAsUsername = normalizeUsername(identifier);
      const bootstrapEmail = normalizeEmail(ROOT_BOOTSTRAP.email);
      const bootstrapUsername = normalizeUsername(ROOT_BOOTSTRAP.username);

      const isBootstrapIdentifier =
        (identifierAsEmail && identifierAsEmail === bootstrapEmail) ||
        (identifierAsUsername && identifierAsUsername === bootstrapUsername);

      if (!isBootstrapIdentifier || password !== ROOT_BOOTSTRAP.password) {
        return NextResponse.json(
          {
            error:
              'Akun root belum ada. Login dulu memakai akun root (bootstrap) yang ada di halaman login.',
          },
          { status: 403 }
        );
      }

      const rootData = {
        namaLengkap: 'Root',
        username: ROOT_BOOTSTRAP.username,
        nis: '',
        email: ROOT_BOOTSTRAP.email,
        password: hashPassword(ROOT_BOOTSTRAP.password),
        noHp: '',
        emailPemulihan: '',
        role: 'root',
        status: 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newUserRef = push(ref(database, 'users'));
      await set(newUserRef, rootData);
      if (newUserRef.key) {
        await syncUserToFirestoreBestEffort(newUserRef.key, rootData);
      }

      const token = createSessionToken({
        userId: newUserRef.key || 'root',
        email: rootData.email,
        role: rootData.role,
        username: rootData.username,
        namaLengkap: rootData.namaLengkap,
      });

      const response = NextResponse.json({
        ok: true,
        user: {
          id: newUserRef.key,
          email: rootData.email,
          role: rootData.role,
          username: rootData.username,
          namaLengkap: rootData.namaLengkap,
        },
        seededRoot: true,
      });

      response.cookies.set(getSessionCookieName(), token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });

      return response;
    }

    let matchedUserId: string | null = null;
    let matchedUser: any | null = null;

    usersSnapshot.forEach((child) => {
      if (matchedUser) return;
      const user = child.val();
      const identifierAsEmail = normalizeEmail(identifier);
      const identifierAsUsername = normalizeUsername(identifier);
      if (
        (identifierAsEmail && normalizeEmail(user?.email) === identifierAsEmail) ||
        (identifierAsUsername &&
          normalizeUsername(user?.username) === identifierAsUsername)
      ) {
        matchedUserId = child.key;
        matchedUser = user;
      }
    });

    if (!matchedUserId || !matchedUser) {
      return NextResponse.json(
        { error: 'Username/Email atau password salah' },
        { status: 401 }
      );
    }

    if (matchedUser.password !== hashPassword(password)) {
      return NextResponse.json(
        { error: 'Username/Email atau password salah' },
        { status: 401 }
      );
    }

    if (matchedUser.role !== 'root' && matchedUser.status !== 'approved') {
      return NextResponse.json(
        { error: 'Akun belum disetujui admin' },
        { status: 403 }
      );
    }

    await syncUserToFirestoreBestEffort(matchedUserId, matchedUser);

    const token = createSessionToken({
      userId: matchedUserId,
      email: matchedUser.email,
      role: matchedUser.role,
      username: matchedUser.username,
      namaLengkap: matchedUser.namaLengkap,
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: matchedUserId,
        email: matchedUser.email,
        role: matchedUser.role,
        username: matchedUser.username,
        namaLengkap: matchedUser.namaLengkap,
      },
    });

    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error login:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
