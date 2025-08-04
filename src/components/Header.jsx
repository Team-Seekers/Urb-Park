import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/Firebase";
import { toast } from "react-toastify";

const Header = ({ user, onLoginClick, onProtectedNav }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const activeLinkClass = "text-white font-bold";
  const inactiveLinkClass = "text-gray-900 hover:text-white transition-colors";

  const mobileActiveLinkClass = "bg-yellow-400 text-gray-900";
  const mobileInactiveLinkClass = "text-gray-900 hover:bg-yellow-100";
  const mobileLinkBaseClass =
    "block py-3 px-4 text-lg font-semibold transition-colors rounded-lg";

  const closeMenu = () => setIsMenuOpen(false);

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
    closeMenu();
  };

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMenuOpen]);

  return (
    <>
      <header className="bg-yellow-400 shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            {/* Left Side: Logo and Desktop Nav */}
            <div className="flex items-center gap-8">
              <NavLink
                to="/"
                className="text-2xl font-bold tracking-tight text-gray-900 flex-shrink-0"
                onClick={closeMenu}
              >
                <span>Urb</span>
                <span className="text-white">Park</span>
              </NavLink>
              <nav className="hidden md:flex">
                <ul className="flex items-center space-x-6">
                  <li>
                    <NavLink
                      to="/"
                      end
                      className={({ isActive }) =>
                        isActive ? activeLinkClass : inactiveLinkClass
                      }
                    >
                      Home
                    </NavLink>
                  </li>
                  <li>
                    <button
                      onClick={() => handleNavClick("/find")}
                      className={inactiveLinkClass}
                    >
                      Find Parking
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleNavClick("/list-space")}
                      className={inactiveLinkClass}
                    >
                      List Your Space
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleNavClick("/profile")}
                      className={inactiveLinkClass}
                    >
                      My Bookings
                    </button>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Right Side: Desktop Login/User Menu and Mobile Menu Button */}
            <div className="flex items-center gap-4">
              {user ? (
                <div className="hidden md:flex items-center gap-4">
                  <span className="text-gray-900 font-medium">
                    Welcome, {user.email.split("@")[0]}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-gray-900 text-white hover:bg-gray-800 font-bold py-2 px-6 rounded-lg transition-colors duration-300 shadow"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="hidden md:block">
                  <button
                    onClick={onLoginClick}
                    className="bg-gray-900 text-white hover:bg-gray-800 font-bold py-2 px-6 rounded-lg transition-colors duration-300 shadow hover:shadow-lg transform hover:scale-105"
                  >
                    Login
                  </button>
                </div>
              )}
              <div className="md:hidden">
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="p-2 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  aria-controls="mobile-menu"
                  aria-expanded={isMenuOpen}
                  aria-label="Open main menu"
                >
                  <span className="sr-only">Open main menu</span>
                  <svg
                    className="h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Panel */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ease-in-out ${
          isMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={closeMenu}
          aria-hidden="true"
        ></div>

        {/* Panel */}
        <div
          className={`relative h-full w-4/5 max-w-sm bg-gray-50 shadow-2xl flex flex-col transform transition-transform ease-in-out duration-300 ${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          id="mobile-menu"
        >
          {/* Menu Header */}
          <div className="flex justify-between items-center p-4 border-b bg-white">
            <NavLink
              to="/"
              className="text-2xl font-bold tracking-tight text-gray-900"
              onClick={closeMenu}
            >
              <span>Urb</span>
              <span className="text-yellow-400">Park</span>
            </NavLink>
            <button
              onClick={closeMenu}
              className="p-2 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              aria-label="Close menu"
            >
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Menu Links */}
          <nav className="flex-grow p-4 space-y-2">
            <NavLink
              to="/"
              end
              onClick={closeMenu}
              className={({ isActive }) =>
                `${mobileLinkBaseClass} ${
                  isActive ? mobileActiveLinkClass : mobileInactiveLinkClass
                }`
              }
            >
              Home
            </NavLink>
            <button
              onClick={() => handleNavClick("/find")}
              className={`${mobileLinkBaseClass} ${mobileInactiveLinkClass}`}
            >
              Find Parking
            </button>
            <button
              onClick={() => handleNavClick("/list-space")}
              className={`${mobileLinkBaseClass} ${mobileInactiveLinkClass}`}
            >
              List Your Space
            </button>
            <button
              onClick={() => handleNavClick("/profile")}
              className={`${mobileLinkBaseClass} ${mobileInactiveLinkClass}`}
            >
              My Bookings
            </button>
          </nav>

          {/* Footer / Login button or User info */}
          <div className="p-4 border-t mt-auto">
            {user ? (
              <div className="space-y-3">
                <div className="text-center text-gray-700 font-medium">
                  Welcome, {user.email.split("@")[0]}
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    closeMenu();
                  }}
                  className="block w-full text-center bg-gray-900 text-white hover:bg-gray-800 font-bold py-3 px-6 rounded-lg transition-colors duration-300 shadow-lg"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onLoginClick();
                  closeMenu();
                }}
                className="block w-full text-center bg-gray-900 text-white hover:bg-gray-800 font-bold py-3 px-6 rounded-lg transition-colors duration-300 shadow-lg"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
export default Header;
