
'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This function is the single source of truth for Firebase initialization.
// It is only ever called from client components.
export function initializeFirebase() {
  if (getApps().length) {
    const app = getApp();
    return {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
    };
  }

  // This check is important for Vercel deployment
  if (!firebaseConfig.apiKey) {
    throw new Error("Firebase configuration is missing. Ensure NEXT_PUBLIC_FIREBASE_* environment variables are set in your Vercel project.");
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  return { app, auth, db };
}
