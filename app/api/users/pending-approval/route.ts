import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';
import { syncUserToFirestoreBestEffort } from '@/lib/firestore-sync';

export const runtime = 'nodejs';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyB-roQ2h1t0wM01XZd_4anI60E47qnO4bA",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "e-learning-tugas.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "e-learning-tugas",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "e-learning-tugas.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "431635146195",
  appId: process.env.FIREBASE_APP_ID || "1:431635146195:web:cc617d5809f65d010c7b26",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://e-learning-tugas-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const database = getDatabase(app);

// GET - Fetch pending users
export async function GET(request: NextRequest) {
  try {
    const snapshot = await get(ref(database, 'users'));
    
    if (snapshot.exists()) {
      const users: any[] = [];
      snapshot.forEach((childSnapshot) => {
        const userData = childSnapshot.val();
        if (userData.status === 'pending') {
          const { password, ...userWithoutPassword } = userData;
          users.push({
            id: childSnapshot.key,
            ...userWithoutPassword,
          });
        }
      });
      return NextResponse.json(users);
    } else {
      return NextResponse.json([]);
    }
  } catch (error: any) {
    console.error('Error fetching pending users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Approve or Reject user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, status } = body; // status: 'approved' or 'rejected'

    if (!userId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid userId or status' },
        { status: 400 }
      );
    }

    const snapshot = await get(ref(database, `users/${userId}`));

    if (!snapshot.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await update(ref(database, `users/${userId}`), {
      status,
      updatedAt: new Date().toISOString(),
      approvedAt: status === 'approved' ? new Date().toISOString() : null,
    });

    const updatedSnapshot = await get(ref(database, `users/${userId}`));
    const userData = updatedSnapshot.val();
    await syncUserToFirestoreBestEffort(userId, userData);
    const { password, ...userWithoutPassword } = userData;

    return NextResponse.json({
      id: userId,
      ...userWithoutPassword,
    });
  } catch (error: any) {
    console.error('Error updating user status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
