import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../services/Firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { getUserProfile } from "../services/userService";

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
  const [user, loading, error] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Fetch user profile when user changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        setProfileLoading(true);
        try {
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error("Error fetching user profile:", error);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setUserProfile(null);
      }
    };

    fetchUserProfile();
  }, [user]);

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
    user,
    loading,
    error,
    userProfile,
    profileLoading,
    isAdmin: userProfile?.role === "admin",
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
