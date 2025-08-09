// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // ✅ Firestore import

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC9Th_FHov-avJUlrol5bEMCmReGV4jUlI",
  authDomain: "aura-ba72b.firebaseapp.com",
  projectId: "aura-ba72b",
  storageBucket: "aura-ba72b.firebasestorage.app",
  messagingSenderId: "939020673455",
  appId: "1:939020673455:web:293efabe5bbbf3f594cf5a",
  measurementId: "G-NTKM8477FD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// ✅ Initialize Firestore
const db = getFirestore(app);

// ✅ Export db so App.jsx can use it
export { db };
