
'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

// This function is the single source of truth for Firebase initialization.
// It is only ever called from client components.
export function initializeFirebase(): FirebaseServices {
  if (getApps().length) {
    const app = getApp();
    return {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
    };
  }

  // This check is crucial. It ensures that we don't try to initialize
  // Firebase on the server during build, where env vars might be missing.
  if (!firebaseConfig.apiKey) {
    throw new Error("Firebase configuration is missing. This app cannot start without it.");
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  return { app, auth, db };
}
