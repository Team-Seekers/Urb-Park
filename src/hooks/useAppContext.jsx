import React, { createContext, useContext, useState } from "react";

/**
 * @typedef {Object} AppContextType
 * @property {any} user
 * @property {function} setUser
 * @property {boolean} isAuthenticated
 * @property {function} setIsAuthenticated
 * @property {any} [otherProps]
 */
const AppContext = createContext(undefined);

export const AppProvider = ({ children }) => {
  const [booking, setBooking] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message) => {
    setNotifications((prev) => [...prev, message]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const value = {
    booking,
    setBooking,
    notifications,
    addNotification,
    clearNotifications,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
