import React from "react";
import AuthTabs from "./AuthTabs";

export default function AuthModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 relative w-full max-w-md">
        <button
          className="absolute top-2 right-2 text-gray-500 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        <AuthTabs onSuccess={onClose} />
      </div>
    </div>
  );
}
