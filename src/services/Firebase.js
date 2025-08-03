import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBze2Vqii2oDFaqp0H13Wj1j0MWz1ZtzsQ",
  authDomain: "urb-park.firebaseapp.com",
  projectId: "urb-park",
  storageBucket: "urb-park.firebasestorage.app",
  messagingSenderId: "77880617933",
  appId: "1:77880617933:web:a460c30750f9bdd363f284",
  measurementId: "G-PWYVPHFV40",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
export { app, analytics, auth };
