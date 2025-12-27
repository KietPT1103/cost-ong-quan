// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const getEnv = (primary: string, fallback?: string) => {
  const value = process.env[primary] || (fallback ? process.env[fallback] : undefined);
  if (!value) {
    throw new Error(
      `Missing Firebase config value for ${primary}${fallback ? ` (or ${fallback})` : ""}. ` +
        "Check your environment variables (.env.local)."
    );
  }
  return value;
};

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const measurementId =
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID;

const firebaseConfig = {
  apiKey: getEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "FIREBASE_API_KEY"),
  authDomain: getEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv(
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "FIREBASE_MESSAGING_SENDER_ID"
  ),
  appId: getEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "FIREBASE_APP_ID"),
  ...(measurementId ? { measurementId } : {}),
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let analytics;
if (typeof window !== "undefined" && measurementId) {
  // Only initialize analytics on client side and when Measurement ID is provided
  analytics = getAnalytics(app);
}

export const db = getFirestore(app);
