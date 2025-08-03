import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../services/Firebase";
import { toast } from "react-toastify";

export default function AuthModal({ open, onClose, onSuccess }) {
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);

  // Login state
  const [login, setLogin] = useState({ email: "", password: "" });
  // Signup state
  const [signup, setSignup] = useState({
    email: "",
    phoneno: "",
    password: "",
    confirmpassword: "",
    vehicle: "",
  });

  // Handlers
  const handleLoginChange = (e) =>
    setLogin({ ...login, [e.target.name]: e.target.value });
  const handleSignupChange = (e) =>
    setSignup({ ...signup, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, login.email, login.password);
      toast.success("Login successful!");
      if (onSuccess) onSuccess();
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
      await createUserWithEmailAndPassword(auth, signup.email, signup.password);
      // Optionally save phone/vehicle to Firestore here
      toast.success("Signup successful!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40">
      <div className="bg-white rounded-lg shadow-lg p-6 relative w-full max-w-md">
        <button
          className="absolute top-2 right-2 text-gray-500 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="flex mb-6">
          <button
            className={`flex-1 py-2 font-semibold rounded-l ${
              tab === "login"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => setTab("login")}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 font-semibold rounded-r ${
              tab === "signup"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => setTab("signup")}
          >
            Signup
          </button>
        </div>
        {tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              className="w-full border rounded px-3 py-2"
              type="email"
              name="email"
              placeholder="Email"
              value={login.email}
              onChange={handleLoginChange}
              required
            />
            <input
              className="w-full border rounded px-3 py-2"
              type="password"
              name="password"
              placeholder="Password"
              value={login.password}
              onChange={handleLoginChange}
              required
            />
            <button
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold"
              type="submit"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <input
              className="w-full border rounded px-3 py-2"
              type="email"
              name="email"
              placeholder="Email"
              value={signup.email}
              onChange={handleSignupChange}
              required
            />
            <input
              className="w-full border rounded px-3 py-2"
              type="tel"
              name="phoneno"
              placeholder="Phone Number"
              value={signup.phoneno}
              onChange={handleSignupChange}
              required
            />
            <input
              className="w-full border rounded px-3 py-2"
              type="text"
              name="vehicle"
              placeholder="Vehicle Number"
              value={signup.vehicle}
              onChange={handleSignupChange}
              required
            />
            <input
              className="w-full border rounded px-3 py-2"
              type="password"
              name="password"
              placeholder="Password"
              value={signup.password}
              onChange={handleSignupChange}
              required
            />
            <input
              className="w-full border rounded px-3 py-2"
              type="password"
              name="confirmpassword"
              placeholder="Confirm Password"
              value={signup.confirmpassword}
              onChange={handleSignupChange}
              required
            />
            <button
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold"
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
