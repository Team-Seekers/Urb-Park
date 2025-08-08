import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";

// IMPORTANT: This component assumes you have a Firebase.js file
// that exports auth and db like this:
// import { getAuth } from "firebase/auth";
// import { getFirestore } from "firebase/firestore";
// import { initializeApp } from "firebase/app";
//
// const firebaseConfig = { ... }; // Your Firebase config
// const app = initializeApp(firebaseConfig);
// export const auth = getAuth(app);
// export const db = getFirestore(app);
//
// Make sure you have this setup in your project.
import { auth, db } from "../services/Firebase";

export default function AuthModal({ open, onClose, onSuccess }) {
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const [login, setLogin] = useState({ email: "", password: "" });
  const [signup, setSignup] = useState({
    email: "",
    phoneno: "",
    password: "",
    confirmpassword: "",
    vehicle: "",
  });

  const handleLoginChange = (e) =>
    setLogin({ ...login, [e.target.name]: e.target.value });

  const handleSignupChange = (e) =>
    setSignup({ ...signup, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(
        auth,
        login.email,
        login.password
      );
      toast.success("Login successful!");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
  
    if (signup.password !== signup.confirmpassword) {
      toast.error("Passwords do not match");
      return;
    }
  
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        signup.email,
        signup.password
      );
      const uid = userCredential.user.uid;
  
      // Extract name from email
      const nameFromEmail = signup.email.split("@")[0];
  
      await setDoc(doc(db, "users", uid), {
        createdAt: new Date(),
        email: signup.email,
        username: nameFromEmail,
        phone: signup.phoneno,
        role: "user",
        history: [], // initialized empty
        notifications: [], // initialized empty notifications array
        vehicles: signup.vehicle ? [signup.vehicle] : [],
      });
  
      toast.success("Signup successful! You are now logged in.");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
    setLoading(false);
  };
   
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!resetEmail) {
      toast.error("Please enter your email.");
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success("Password reset email sent! Check your inbox or spam.");
      setShowReset(false);
    } catch (err) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl p-8 relative w-full max-w-md">
        <button
          className="absolute top-2 right-2 text-gray-400 text-2xl hover:text-gray-700"
          onClick={onClose}
        >
          &times;
        </button>

        <div className="flex mb-8">
          <button
            className={`flex-1 py-2 font-semibold rounded-l-lg transition-colors duration-200 ${
              tab === "login"
                ? "bg-yellow-400 text-gray-900 shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => {
              setTab("login");
              setShowReset(false);
            }}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 font-semibold rounded-r-lg transition-colors duration-200 ${
              tab === "signup"
                ? "bg-yellow-400 text-gray-900 shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => {
              setTab("signup");
              setShowReset(false);
            }}
          >
            Signup
          </button>
        </div>

        {showReset ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-colors"
              type="email"
              name="resetEmail"
              placeholder="Enter your email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />
            <button
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              type="submit"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <button
              type="button"
              className="w-full text-yellow-600 underline mt-2 hover:text-yellow-700 transition-colors"
              onClick={() => setShowReset(false)}
            >
              Back to Login
            </button>
          </form>
        ) : tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-colors"
              type="email"
              name="email"
              placeholder="Email"
              value={login.email}
              onChange={handleLoginChange}
              required
            />
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-colors"
              type="password"
              name="password"
              placeholder="Password"
              value={login.password}
              onChange={handleLoginChange}
              required
            />
            <button
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              type="submit"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
            <div className="flex justify-between items-center mt-2">
              <button
                type="button"
                className="text-yellow-600 underline text-sm hover:text-yellow-700 transition-colors"
                onClick={async () => {
                  if (!login.email) {
                    toast.error("Enter your email first");
                    return;
                  }
                  setLoading(true);
                  try {
                    await sendPasswordResetEmail(auth, login.email);
                    toast.success("Password reset email sent");
                  } catch (err) {
                    toast.error(err.message);
                  }
                  setLoading(false);
                }}
              >
                Forgot Password?
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-colors"
              type="email"
              name="email"
              placeholder="Email"
              value={signup.email}
              onChange={handleSignupChange}
              required
            />
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-colors"
              type="tel"
              name="phoneno"
              placeholder="Phone Number (e.g. +911234567890)"
              value={signup.phoneno}
              onChange={handleSignupChange}
              required
            />
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-colors"
              type="text"
              name="vehicle"
              placeholder="Vehicle Number"
              value={signup.vehicle}
              onChange={handleSignupChange}
              required
            />
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-colors"
              type="password"
              name="password"
              placeholder="Password"
              value={signup.password}
              onChange={handleSignupChange}
              required
            />
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-colors"
              type="password"
              name="confirmpassword"
              placeholder="Confirm Password"
              value={signup.confirmpassword}
              onChange={handleSignupChange}
              required
            />
            <button
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing up..." : "Signup"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}