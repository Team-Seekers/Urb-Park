import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/Firebase";
import { toast } from "react-toastify";

const Header = ({ user, isAdmin, onLoginClick, onProtectedNav }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully!");
      navigate("/");
    } catch (error) {
      toast.error("Error logging out");
    }
  };

  const handleNavClick = (path) => {
    if (!user) {
      onProtectedNav?.(path);
    } else {
      navigate(path);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-yellow-400 shadow-md py-5 px-6 sticky top-0 z-50 relative">
      <div className="p-4 flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center space-x-8">
          <NavLink
            to="/"
            className="text-3xl font-extrabold text-gray-900 flex items-center"
          >
            <span>Urb</span>
            <span className="text-white">Park</span>
          </NavLink>
          <nav className="hidden md:flex space-x-10 text-lg">
            <NavLink to="/" className="hover:text-white font-medium text-gray-800">
              Home
            </NavLink>
            <button
              onClick={() => handleNavClick("/find")}
              className="hover:text-white font-medium text-gray-800"
            >
              Find Parking
            </button>
            <button
              onClick={() => handleNavClick(isAdmin ? "/admin" : "/profile")}
              className="hover:text-white font-medium text-gray-800"
            >
              {isAdmin ? "Admin Dashboard" : "My Bookings"}
            </button>
          </nav>
        </div>

        {/* Right Side */}
        <div className="relative" ref={dropdownRef}>
          {user ? (
            <>
              <button
                aria-expanded={isDropdownOpen}
                aria-controls="user-menu"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center border-2 border-white hover:scale-105 transition-transform"
              >
                {user.email.charAt(0).toUpperCase()}
              </button>

              {isDropdownOpen && (
                <div
                  id="user-menu"
                  className="absolute right-2 top-14 w-72 z-50 bg-white rounded-xl shadow-lg border border-gray-200 ring-1 ring-yellow-400/30 backdrop-blur-sm transition-all duration-300"
                >
                  {/* User Info Header */}
                  <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-yellow-50 via-white to-yellow-50 rounded-t-xl">
                    <p className="text-xs text-gray-600 uppercase font-semibold tracking-wide">
                      Signed in as
                    </p>
                    <p className="text-sm font-medium text-gray-700 mt-1 truncate">
                      {user.email}
                    </p>
                  </div>

                  {/* Dropdown Options */}
                  <div className="flex flex-col py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-5 py-3 text-sm text-red-600 font-semibold hover:bg-red-50 hover:text-red-700 transition-colors duration-200 rounded-b-xl"
                    >
                      🔓 Logout
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={onLoginClick}
              className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 font-bold transition-transform hover:scale-105"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
