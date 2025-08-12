import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./Firebase";

// Get user profile with role information
export const getUserProfile = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return userDoc.data();
    } else {
      // Create default user profile if it doesn't exist
      const defaultProfile = {
        uid: uid,
        role: "user", // Default role
        createdAt: new Date(),
        history: [],
        notifications: [], // Add notifications array
        profileComplete: false,
      };
      await setDoc(userRef, defaultProfile);
      return defaultProfile;
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};

// Update user role (admin only)
export const updateUserRole = async (uid, newRole) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      role: newRole,
      updatedAt: new Date(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
};

// Check if user is admin
export const isUserAdmin = async (uid) => {
  try {
    const profile = await getUserProfile(uid);
    return profile.role === "admin";
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

// Update user profile
export const updateUserProfile = async (uid, profileData) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      ...profileData,
      updatedAt: new Date(),
      profileComplete: true,
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

// Add notification to user profile
export const addNotification = async (uid, notification) => {
  try {
    const userRef = doc(db, "users", uid);
    const notificationData = {
      id: Date.now().toString(),
      message: notification,
      timestamp: new Date(),
      read: false,
    };

    await updateDoc(userRef, {
      notifications: arrayUnion(notificationData),
    });

    return { success: true, notification: notificationData };
  } catch (error) {
    console.error("Error adding notification:", error);
    throw error;
  }
};

// Get user notifications
export const getUserNotifications = async (uid) => {
  try {
    const profile = await getUserProfile(uid);
    return profile.notifications || [];
  } catch (error) {
    console.error("Error getting user notifications:", error);
    return [];
  }
};

// Clear all notifications
export const clearAllNotifications = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      notifications: [],
    });
    return { success: true };
  } catch (error) {
    console.error("Error clearing notifications:", error);
    throw error;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (uid, notificationId) => {
  try {
    const userRef = doc(db, "users", uid);
    const profile = await getUserProfile(uid);
    const notifications = profile.notifications || [];

    const updatedNotifications = notifications.map((notification) =>
      notification.id === notificationId
        ? { ...notification, read: true }
        : notification
    );

    await updateDoc(userRef, {
      notifications: updatedNotifications,
    });

    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

// Delete specific notification
export const deleteNotification = async (uid, notificationId) => {
  try {
    const userRef = doc(db, "users", uid);
    const profile = await getUserProfile(uid);
    const notifications = profile.notifications || [];

    const updatedNotifications = notifications.filter(
      (notification) => notification.id !== notificationId
    );

    await updateDoc(userRef, {
      notifications: updatedNotifications,
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
};

// Delete specific history entry
export const deleteHistoryEntry = async (uid, historyIndex) => {
  try {
    const userRef = doc(db, "users", uid);
    const profile = await getUserProfile(uid);
    const history = profile.history || [];

    if (historyIndex < 0 || historyIndex >= history.length) {
      throw new Error("Invalid history index");
    }

    const updatedHistory = history.filter((_, index) => index !== historyIndex);

    await updateDoc(userRef, {
      history: updatedHistory,
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting history entry:", error);
    throw error;
  }
};
