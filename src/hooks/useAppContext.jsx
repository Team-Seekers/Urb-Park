import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../services/Firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  getUserProfile,
  addNotification as addNotificationToDB,
  clearAllNotifications,
  deleteNotification as deleteNotificationFromDB,
} from "../services/userService";

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

  // useEffect(() => {
  // const fetchNotifications = async () => {
  //   try {
  //     const res = await fetch("http://localhost:3000/api/notifications");
  //     const data = await res.json();
  //     setNotifications(data);
  //   } catch (err) {
  //   //     console.error("Error fetching notifications", err);
  //   //   }
  //   // };

  //   fetchNotifications();
  //   const interval = setInterval(fetchNotifications, 5000); // refresh every 5s

  //   return () => clearInterval(interval);
  // }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        setProfileLoading(true);
        try {
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
          // Sync notifications from database
          setNotifications(profile.notifications || []);
        } catch (error) {
          console.error("Error fetching user profile:", error);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setUserProfile(null);
        setNotifications([]);
      }
    };

    fetchUserProfile();
  }, [user]);

  const addNotification = async (message) => {
    if (!user) {
      // If no user, just add to local state
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          message,
          timestamp: new Date(),
          read: false,
        },
      ]);
      return;
    }

    try {
      const result = await addNotificationToDB(user.uid, message);
      if (result.success) {
        setNotifications((prev) => [...prev, result.notification]);
      }
    } catch (error) {
      console.error("Error adding notification to database:", error);
      // Fallback to local state
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          message,
          timestamp: new Date(),
          read: false,
        },
      ]);
    }
  };

  const clearNotifications = async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    try {
      await clearAllNotifications(user.uid);
      setNotifications([]);
    } catch (error) {
      console.error("Error clearing notifications from database:", error);
      // Fallback to local state
      setNotifications([]);
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!user) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      return;
    }

    try {
      await deleteNotificationFromDB(user.uid, notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification from database:", error);
      // Fallback to local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    }
  };

  const value = {
    booking,
    setBooking,
    notifications,
    addNotification,
    clearNotifications,
    deleteNotification,
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
