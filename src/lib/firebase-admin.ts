/**
 * Firebase Admin SDK & Cloud Firestore Adapter
 * Author: Meet Maru (meetmaru@datastraw.io)
 * Project: Datastraw Tech Internship Assessment
 * Target Database: smart-roster-mngmt-sys (asia-south1)
 *
 * Provides:
 * 1. Safe singleton initialization of Firebase Admin SDK
 * 2. Cloud Firestore reference with automatic fallback
 * 3. Bidirectional persistence helpers for Rosters, Leaves, Swaps & Audit Logs
 */

import admin from 'firebase-admin';

let firestoreDb: admin.firestore.Firestore | null = null;

export function getFirestoreDb(): admin.firestore.Firestore | null {
  if (firestoreDb) return firestoreDb;

  const projectId = process.env.FIREBASE_PROJECT_ID || 'smart-roster-mngmt-sys';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  // If service account credentials are not provided, gracefully return null to use in-memory store
  if (!clientEmail || !privateKey) {
    return null;
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
    firestoreDb = admin.firestore();
    return firestoreDb;
  } catch (err) {
    console.warn('[Firebase Admin] Initialization failed, falling back to in-memory store:', err);
    return null;
  }
}

/**
 * Persist an audit log entry to Cloud Firestore asynchronously
 */
export async function persistAuditLogToFirestore(log: {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  targetDate?: string;
  affectedBrandId?: string;
  affectedProcessId?: string;
  details: string;
}): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    await db.collection('audit_logs').doc(log.id).set(log);
  } catch (err) {
    console.warn('[Firestore] Failed to persist audit log:', err);
  }
}

/**
 * Persist or update a Roster document in Cloud Firestore
 */
export async function persistRosterToFirestore(roster: {
  id: string;
  monthYear: string;
  status: string;
  version: number;
  generatedAt: string;
  publishedAt?: string;
}): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    await db.collection('rosters').doc(roster.id).set(roster, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Failed to persist roster:', err);
  }
}
