import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBze2Vqii2oDFaqp0H13Wj1j0MWz1ZtzsQ",
  authDomain: "urb-park.firebaseapp.com",
  projectId: "urb-park",
  storageBucket: "urb-park.firebasestorage.app",
  messagingSenderId: "77880617933",
  appId: "1:77880617933:web:a460c30750f9bdd363f284",
  measurementId: "G-PWYVPHFV40",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
