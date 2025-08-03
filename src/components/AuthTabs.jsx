import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../services/Firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function AuthTabs() {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, form.email, form.password);
      toast.success("Login successful!");
      navigate("/");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, form.email, form.password);
      toast.success("Signup successful!");
      navigate("/");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white rounded-lg shadow-lg p-6">
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
      <form
        onSubmit={tab === "login" ? handleLogin : handleSignup}
        className="space-y-4"
      >
        <input
          className="w-full border rounded px-3 py-2"
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          className="w-full border rounded px-3 py-2"
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />
        <button
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold"
          type="submit"
        >
          {tab === "login" ? "Login" : "Signup"}
        </button>
      </form>
    </div>
  );
}
