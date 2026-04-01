import 'server-only';

import { initializeApp, getApps } from 'firebase/app';
import { doc, getFirestore, setDoc } from 'firebase/firestore';

type AnyCourse = Record<string, any>;

const COURSES_COLLECTION = 'courses';

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

function toFirestoreCourse(courseData: AnyCourse) {
  return {
    title: normalizeString(courseData?.title),
    courseKey: normalizeString(courseData?.courseKey),
    createdBy: normalizeString(courseData?.createdBy),
    status: normalizeString(courseData?.status),
    createdAt: courseData?.createdAt || null,
    updatedAt: courseData?.updatedAt || null,
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

export async function syncCourseToFirestoreBestEffort(courseId: string, courseData: AnyCourse) {
  const firestore = getFirestoreDb();
  const courseRef = doc(firestore, COURSES_COLLECTION, courseId);
  await bestEffort(setDoc(courseRef, toFirestoreCourse(courseData), { merge: true }));
}

