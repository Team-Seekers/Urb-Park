import React from "react";

const Header = ({ user, onLoginClick, onProtectedNav }) => {
  const navLink = (label, path) => (
    <li>
      <button
        className="bg-transparent text-gray-900 hover:text-white transition-colors"
        onClick={() => onProtectedNav(path)}
      >
        {label}
      </button>
    </li>
  );

  return (
    <header className="bg-yellow-500 shadow-sm sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <span className="text-2xl font-bold tracking-tight text-gray-900">
            <span>Urb</span>
            <span className="text-white">Park</span>
          </span>
          <nav>
            <ul className="flex items-center space-x-6">
              {navLink("Home", "/")}
              {navLink("Find Parking", "/find")}
              {navLink("List Your Space", "/list-space")}
              {navLink("My Bookings", "/profile")}
              {navLink("Admin", "/admin")}
              {!user && (
                <li>
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                    onClick={onLoginClick}
                  >
                    Login / Signup
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
