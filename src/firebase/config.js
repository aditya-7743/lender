// src/firebase/config.js
// ⚠️ APNA FIREBASE CONFIG YAHAN DAALO
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableNetwork } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDXfEL5X4fhAAOklii5OlsWo2dlheJwH60",
  authDomain: "library-lender.firebaseapp.com",
  databaseURL: "https://library-lender-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "library-lender",
  storageBucket: "library-lender.firebasestorage.app",
  messagingSenderId: "1047723054622",
  appId: "1:1047723054622:web:9ba659a7a594cea62e400f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence + instant sync
enableNetwork(db);

export default app;
