
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

function initializeFirebase() {
  if (getApps().length) {
    return {
      app: getApp(),
      auth: getAuth(getApp()),
      db: getFirestore(getApp()),
    };
  }

  if (!firebaseConfig.apiKey) {
    console.error("Firebase config is not available. Please check your environment variables.");
    // Return dummy objects or throw an error to prevent the app from crashing in a confusing way.
    // This helps in debugging missing environment variables.
    throw new Error("Firebase configuration is missing. Ensure NEXT_PUBLIC_FIREBASE_* environment variables are set.");
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  return { app, auth, db };
}

export { initializeFirebase };
