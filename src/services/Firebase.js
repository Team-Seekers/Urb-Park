import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAd9NpMcYgQ18uWhfIT7MBwh_KNprdZLoQ",
  authDomain: "urban-park-d8825.firebaseapp.com",
  projectId: "urban-park-d8825",
  storageBucket: "urban-park-d8825.firebasestorage.app",
  messagingSenderId: "258352254915",
  appId: "1:258352254915:web:2487d3a17efa302fd8b776",
  measurementId: "G-8BB8ZTJMK5"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };