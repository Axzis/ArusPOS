import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBPAXuku-CSe1hJch2TaluiwzQm_VJeuwI",
  authDomain: "lamancerdas.firebaseapp.com",
  projectId: "lamancerdas",
  storageBucket: "lamancerdas.firebasestorage.app",
  messagingSenderId: "312334265416",
  appId: "1:312334265416:web:472ae5b3998673fade7c7d"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
