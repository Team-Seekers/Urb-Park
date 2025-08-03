import React from "react";
import { NavLink } from "react-router-dom";

const Header = () => {
  const activeLinkClass = "text-white font-bold";
  const inactiveLinkClass = "text-gray-900 hover:text-white transition-colors";

  return (
    <header className="bg-yellow-500 shadow-sm sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <NavLink
            to="/"
            className="text-2xl font-bold tracking-tight text-gray-900"
          >
            <span>Urb</span>
            <span className="text-white">Park</span>
          </NavLink>
          <nav>
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
                <NavLink
                  to="/find"
                  className={({ isActive }) =>
                    isActive ? activeLinkClass : inactiveLinkClass
                  }
                >
                  Find Parking
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/list-space"
                  className={({ isActive }) =>
                    isActive ? activeLinkClass : inactiveLinkClass
                  }
                >
                  List Your Space
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    isActive ? activeLinkClass : inactiveLinkClass
                  }
                >
                  My Bookings
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    isActive ? activeLinkClass : inactiveLinkClass
                  }
                >
                  Admin
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
