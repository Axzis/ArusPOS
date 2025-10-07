
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig as fallbackConfig } from '@/firebase/config'; // Impor konfigurasi fallback

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

  // Gunakan variabel lingkungan jika API key ada, jika tidak, gunakan konfigurasi fallback dari src/firebase/config.ts
  const config = firebaseConfig.apiKey ? firebaseConfig : fallbackConfig;

  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);

  return { app, auth, db };
}

export { initializeFirebase };
