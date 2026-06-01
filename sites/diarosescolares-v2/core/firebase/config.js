import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAlIzKBPBfrSRFdT15Ci3a-gXgpqDql7l0",
  authDomain: "diarios-escolares.firebaseapp.com",
  projectId: "diarios-escolares",
  storageBucket: "diarios-escolares.firebasestorage.app",
  messagingSenderId: "808426237802",
  appId: "1:808426237802:web:ca250373d16ebaf4cc3f13",
  measurementId: "G-4GDXD8T4GK",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);

export const UserRole = Object.freeze({
  TEACHER: "teacher",
  DIRECTOR: "director",
  GUARDIAN: "guardian",
});

// Canonical role routes — deve espelhar auth/auth.controller.js ROLE_ROUTES
export const ROLE_ROUTES = Object.freeze({
  teacher:  '/app/professor/',
  director: '/app/director/',
  guardian: '/app/guardian/',
});
