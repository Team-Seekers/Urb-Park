// AuthModal.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  sendEmailVerification,
} from "firebase/auth";
import { auth, db } from "../services/Firebase";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";

export default function AuthModal({ open, onClose, onSuccess }) {
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [timer, setTimer] = useState(60);

  const [login, setLogin] = useState({ email: "", password: "" });
  const [signup, setSignup] = useState({
    email: "",
    phoneno: "",
    password: "",
    confirmpassword: "",
    vehicle: "",
  });

  const recaptchaRef = useRef(null);

  // Timer for resend OTP
  useEffect(() => {
    let interval;
    if (otpSent && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    if (timer === 0) clearInterval(interval);
    return () => clearInterval(interval);
  }, [otpSent, timer]);

  // Handlers
  const handleLoginChange = (e) =>
    setLogin({ ...login, [e.target.name]: e.target.value });
  const handleSignupChange = (e) =>
    setSignup({ ...signup, [e.target.name]: e.target.value });

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(
        auth,
        login.email,
        login.password
      );
      if (!userCred.user.emailVerified) {
        toast.error("Please verify your email first.");
      } else {
        toast.success("Login successful!");
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  // SIGNUP WITH OTP
  const handleSignup = async (e) => {
    e.preventDefault();

    if (signup.password !== signup.confirmpassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!otpSent) {
      setLoading(true);
      try {
        // Setup invisible reCAPTCHA
        if (!recaptchaRef.current) {
          recaptchaRef.current = new RecaptchaVerifier(
            "recaptcha-container",
            { size: "invisible" },
            auth
          );
        }
        const appVerifier = recaptchaRef.current;
        const result = await signInWithPhoneNumber(
          auth,
          signup.phoneno,
          appVerifier
        );
        setConfirmationResult(result);
        setOtpSent(true);
        setTimer(60);
        toast.success("OTP sent to your phone!");
      } catch (err) {
        toast.error(err.message);
      }
      setLoading(false);
    } else {
      // Verify OTP and create user
      setLoading(true);
      try {
        await confirmationResult.confirm(otp);

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          signup.email,
          signup.password
        );
        const uid = userCredential.user.uid;

        await setDoc(doc(db, "users", uid), {
          username: signup.email.split("@")[0],
          email: signup.email,
          phone: signup.phoneno,
          vehicles: [signup.vehicle],
          history: [],
          createdAt: new Date(),
        });

        await sendEmailVerification(userCredential.user);
        toast.success("Signup successful! Verification email sent.");
        onSuccess?.();
        onClose();
      } catch (err) {
        toast.error(err.message);
      }
      setLoading(false);
    }
  };

  // RESEND OTP
  const handleResendOtp = async () => {
    setOtpSent(false);
    setOtp("");
    recaptchaRef.current = null;
    await handleSignup({ preventDefault: () => {} });
  };

  // PASSWORD RESET
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success("Password reset email sent!");
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
            className={`flex-1 py-2 font-semibold rounded-l-lg ${
              tab === "login"
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => {
              setTab("login");
              setShowReset(false);
              setOtpSent(false);
              setOtp("");
            }}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 font-semibold rounded-r-lg ${
              tab === "signup"
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => {
              setTab("signup");
              setShowReset(false);
              setOtpSent(false);
              setOtp("");
            }}
          >
            Signup
          </button>
        </div>

        {showReset ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <input
              className="w-full border rounded px-3 py-2"
              type="email"
              name="resetEmail"
              placeholder="Enter your email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />
            <button
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold"
              type="submit"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <button
              type="button"
              className="w-full text-blue-600 underline mt-2"
              onClick={() => setShowReset(false)}
            >
              Back to Login
            </button>
          </form>
        ) : tab === "login" ? (
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
            <div className="flex justify-between items-center mt-2">
              <button
                type="button"
                className="text-blue-600 underline text-sm"
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
              className="w-full border rounded px-3 py-2"
              type="email"
              name="email"
              placeholder="Email"
              value={signup.email}
              onChange={handleSignupChange}
              required
              disabled={otpSent}
            />
            <input
              className="w-full border rounded px-3 py-2"
              type="tel"
              name="phoneno"
              placeholder="Phone Number (e.g. +911234567890)"
              value={signup.phoneno}
              onChange={handleSignupChange}
              required
              disabled={otpSent}
            />
            <input
              className="w-full border rounded px-3 py-2"
              type="text"
              name="vehicle"
              placeholder="Vehicle Number"
              value={signup.vehicle}
              onChange={handleSignupChange}
              required
              disabled={otpSent}
            />
            <input
              className="w-full border rounded px-3 py-2"
              type="password"
              name="password"
              placeholder="Password"
              value={signup.password}
              onChange={handleSignupChange}
              required
              disabled={otpSent}
            />
            <input
              className="w-full border rounded px-3 py-2"
              type="password"
              name="confirmpassword"
              placeholder="Confirm Password"
              value={signup.confirmpassword}
              onChange={handleSignupChange}
              required
              disabled={otpSent}
            />
            {otpSent && (
              <>
                <input
                  className="w-full border rounded px-3 py-2"
                  type="text"
                  name="otp"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">
                    Resend OTP in {timer}s
                  </span>
                  <button
                    type="button"
                    className="text-blue-600 underline text-sm"
                    onClick={handleResendOtp}
                    disabled={timer > 0}
                  >
                    Resend OTP
                  </button>
                </div>
              </>
            )}
            <div id="recaptcha-container"></div>
            <button
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold"
              type="submit"
              disabled={loading}
            >
              {loading
                ? otpSent
                  ? "Verifying OTP..."
                  : "Sending OTP..."
                : otpSent
                ? "Verify & Signup"
                : "Send OTP"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
