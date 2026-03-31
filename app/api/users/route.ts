import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, push, get, set } from 'firebase/database';
import crypto from 'crypto';
import { syncUserToFirestoreBestEffort } from '@/lib/firestore-sync';
import { requireRole } from '@/lib/auth/api';

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

// Simple password hashing function (for demo - use bcrypt in production)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// GET - Fetch all users
export async function GET(request: NextRequest) {
  try {
    requireRole(request, ['root', 'administrator']);
    const snapshot = await get(ref(database, 'users'));
    
    if (snapshot.exists()) {
      const users: any[] = [];
      snapshot.forEach((childSnapshot) => {
        const userData = childSnapshot.val();
        // Remove password hash from response
        const { password, ...userWithoutPassword } = userData;
        users.push({
          id: childSnapshot.key,
          ...userWithoutPassword,
        });
      });
      return NextResponse.json(users);
    } else {
      return NextResponse.json([]);
    }
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    requireRole(request, ['root', 'administrator']);
    const body = await request.json();
    const {
      namaLengkap,
      username,
      nis,
      email,
      password,
      noHp,
      emailPemulihan,
      role,
    } = body;

    // Validate required fields
    if (!namaLengkap || !username || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const snapshot = await get(ref(database, 'users'));
    if (snapshot.exists()) {
      let emailExists = false;
      snapshot.forEach((childSnapshot) => {
        if (childSnapshot.val().email === email) {
          emailExists = true;
        }
      });
      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 400 }
        );
      }
    }

    // Store user data in Realtime Database with hashed password
    const userData = {
      namaLengkap,
      username,
      nis: nis || '',
      email,
      password: hashPassword(password), // Hash password for storage
      noHp: noHp || '',
      emailPemulihan: emailPemulihan || '',
      role,
      status: 'pending', // New users start as pending
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newUserRef = push(ref(database, 'users'));
    await set(newUserRef, userData);
    if (newUserRef.key) {
      await syncUserToFirestoreBestEffort(newUserRef.key, userData);
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = userData;

    return NextResponse.json(
      { id: newUserRef.key, ...userWithoutPassword },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
