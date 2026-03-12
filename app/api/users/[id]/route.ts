import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, update, remove } from 'firebase/database';

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

// GET - Fetch specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const snapshot = await get(ref(database, `users/${userId}`));

    if (snapshot.exists()) {
      const userData = snapshot.val();
      // Remove password from response
      const { password, ...userWithoutPassword } = userData;
      return NextResponse.json({
        id: userId,
        ...userWithoutPassword,
      });
    } else {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const body = await request.json();

    const snapshot = await get(ref(database, `users/${userId}`));

    if (!snapshot.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update only allowed fields
    const updateData: any = {};
    const allowedFields = ['namaLengkap', 'username', 'nis', 'noHp', 'emailPemulihan', 'role'];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    updateData.updatedAt = new Date().toISOString();

    await update(ref(database, `users/${userId}`), updateData);

    const updatedSnapshot = await get(ref(database, `users/${userId}`));
    const userData = updatedSnapshot.val();
    const { password, ...userWithoutPassword } = userData;

    return NextResponse.json({
      id: userId,
      ...userWithoutPassword,
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const snapshot = await get(ref(database, `users/${userId}`));

    if (!snapshot.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await remove(ref(database, `users/${userId}`));

    return NextResponse.json({ success: true, id: userId });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
