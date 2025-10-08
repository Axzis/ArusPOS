
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

// IMPORTANT: This function should only be called ONCE and only on the client.
export function initializeFirebase(): FirebaseServices {
  if (getApps().length) {
    const app = getApp();
    return {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
    };
  }

  if (!firebaseConfig.apiKey) {
    throw new Error("Firebase configuration is missing. This app cannot start without it.");
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  return { app, auth, db };
}


// Barrel exports for hooks and providers
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
