import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyB-roQ2h1t0wM01XZd_4anI60E47qnO4bA",
  authDomain: "e-learning-tugas.firebaseapp.com",
  projectId: "e-learning-tugas",
  databaseURL: "https://e-learning-tugas-default-rtdb.asia-southeast1.firebasedatabase.app/",
  storageBucket: "e-learning-tugas.firebasestorage.app",
  messagingSenderId: "431635146195",
  appId: "1:431635146195:web:cc617d5809f65d010c7b26",
  measurementId: "G-9EQFV5LFV9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firebase Realtime Database
export const database = getDatabase(app);

export default app;
