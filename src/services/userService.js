import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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
        profileComplete: false
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
      updatedAt: new Date()
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
      profileComplete: true
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}; 