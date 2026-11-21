/**
 * Firebase Client SDK Initialization & Configuration
 * Project: Datastraw Tech Internship Assessment
 * Author: Meet Maru (meetmaru@datastraw.io)
 * Target Project: smart-roster-mngmt-sys (asia-south1)
 *
 * Implements:
 * 1. Safe singleton client initialization (SSR / Next.js safe)
 * 2. Cloud Firestore client instance
 * 3. Firebase Auth client instance
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDKzTXiWwE7AU9WQE2xC-uNN_VYXrBotcI',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'smart-roster-mngmt-sys.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'smart-roster-mngmt-sys',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'smart-roster-mngmt-sys.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '200824875938',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:200824875938:web:7fe98381d788dfeca560fb',
  measurementId: 'G-GM2XWGF5CH',
};

// Initialize Firebase singleton
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestoreClient = getFirestore(firebaseApp);
export const firebaseAuth = getAuth(firebaseApp);
