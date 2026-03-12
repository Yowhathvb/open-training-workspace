import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'e-learning-tugas',
    databaseURL: 'https://e-learning-tugas-default-rtdb.asia-southeast1.firebasedatabase.app/',
  });
}

export const adminDb = admin.database();
export const adminAuth = admin.auth();
export const adminDatabase = admin.database();

export default admin;
