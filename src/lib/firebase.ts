import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBwl-d9goFFTjNJZ2JitkyTAm3z2b86v5o",
  authDomain: "studio-1191005763-3307e.firebaseapp.com",
  projectId: "studio-1191005763-3307e",
  storageBucket: "studio-1191005763-3307e.appspot.com",
  messagingSenderId: "426291301177",
  appId: "1:426291301177:web:cdf4d105b692811a5db6e8",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
