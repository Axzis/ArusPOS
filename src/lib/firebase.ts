
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// This file is being deprecated for initialization logic.
// Initialization is now handled in 'src/firebase/index.ts' to ensure it's client-side only.
// Functions in 'lib/firestore.ts' will now accept a db instance.

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This function is kept for legacy purposes but should not be the primary init point.
// The primary initialization is now in src/firebase/index.ts
function initializeFirebase() {
  if (getApps().length) {
    const app = getApp();
    return {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
    };
  }

  if (!firebaseConfig.apiKey) {
    console.error("Firebase config is not available. Please check your environment variables.");
    throw new Error("Firebase configuration is missing. Ensure NEXT_PUBLIC_FIREBASE_* environment variables are set.");
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  return { app, auth, db };
}

export { initializeFirebase };
