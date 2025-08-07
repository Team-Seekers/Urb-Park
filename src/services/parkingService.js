import { SpotStatus, BookingStatus } from "../../types";
import { collection, getDocs, addDoc, query, where, doc, updateDoc, Timestamp, getDoc, arrayUnion, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "./Firebase";

// Helper to generate spots for a lot
/**
 * @param {number} totalSpots
 * @returns {any[]}
 */
const generateSpots = (totalSpots) => {
  const spots = [];
  for (let i = 1; i <= totalSpots; i++) {
    spots.push({
      id: `S-${i}`,
      status: SpotStatus.AVAILABLE,
    });
  }
  return spots;
};

// Utility function to calculate distance between two coordinates (Haversine formula)
export const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Parse coordinates from Firestore format (e.g., "11° N, 8° E" to numbers)
export const parseCoordinates = (coordStr) => {
  if (!coordStr) return null;

  try {
    // Handle different coordinate formats
    if (typeof coordStr === "string") {
      // Format: "11° N, 8° E" or "11, 8" or "11.123, 8.456"
      const cleanStr = coordStr.replace(/[°]/g, "").trim();
      const parts = cleanStr.split(",").map((part) => part.trim());

      if (parts.length === 2) {
        let lat = parseFloat(parts[0]);
        let lng = parseFloat(parts[1]);

        // Handle N/S and E/W indicators
        if (parts[0].includes("S")) lat = -lat;
        if (parts[1].includes("W")) lng = -lng;

        return { lat, lng };
      }
    } else if (Array.isArray(coordStr)) {
      // Format: [lat, lng]
      return { lat: coordStr[0], lng: coordStr[1] };
    } else if (typeof coordStr === "object" && coordStr.lat && coordStr.lng) {
      // Format: {lat: number, lng: number}
      return { lat: coordStr.lat, lng: coordStr.lng };
    }
  } catch (error) {
    console.error("Error parsing coordinates:", error);
  }

  return null;
};

// Fetch all parking areas from Firestore
export const fetchAllParkingAreas = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "parkingAreas"));
    const parkingAreas = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      console.log("Raw Firestore data:", data); // Debug log
      
      // Parse coordinates from the actual Firestore format
      let coordinates = [0, 0];
      if (data.coordinatess) {
        // Handle the geopoint format from Firestore
        if (Array.isArray(data.coordinatess)) {
          coordinates = data.coordinatess;
        } else if (data.coordinatess.latitude && data.coordinatess.longitude) {
          coordinates = [data.coordinatess.latitude, data.coordinatess.longitude];
        }
      }
      
      return {
        id: doc.id, // Use the actual document ID (e.g., "delhiCentralLot", "mumbaiLot")
        name: data.name || `Parking ${doc.id}`, // Use document ID as fallback name
        address: data.address || "Address not available",
        coordinates: coordinates,
        availableSpots: data.availableSpots || 0,
        totalSpots: data.totalSpots || data.availableSpots || 50, // Use availableSpots as fallback
        pricePerHour: data.pricePerHour || 50,
        rating: data.rating || 4.0,
        reviewCount: data.reviewCount || 0,
        features: data.features || ["Covered", "24/7 Security", "Mobile Pass"],
        status: data.status || "Active",
        image: data.image || `https://picsum.photos/400/300?random=${doc.id}`,
        slots: data.slots || {},
        createdAt: data.createdAt || new Date(),
        // Add distance calculation if coordinates are available
        lat: coordinates[0],
        lng: coordinates[1]
      };
    });
    
    console.log("Processed parking areas:", parkingAreas); // Debug log
    return parkingAreas;
  } catch (error) {
    console.error("Error fetching parking areas:", error);
    return [];
  }
};

// Get user's current location
export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
};

// Get nearby parking areas based on user location
export const getNearbyParkingAreas = async (maxDistance = 5) => {
  try {
    const userLocation = await getUserLocation();
    const parkingAreas = await fetchAllParkingAreas();

    const parkingWithDistance = parkingAreas
      .map((area) => {
        const coords = parseCoordinates(area.coordinates);
        if (!coords) return null;

        const distance = getDistanceFromLatLonInKm(
          userLocation.lat,
          userLocation.lng,
          coords.lat,
          coords.lng
        );

        return {
          ...area,
          distance,
          lat: coords.lat,
          lng: coords.lng,
        };
      })
      .filter((area) => area !== null && area.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    return parkingWithDistance;
  } catch (error) {
    console.error("Error getting nearby parking areas:", error);
    throw error;
  }
};

// --- Firestore-based Parking and Booking Functions ---

// Helper: Check if time overlaps with existing bookings
export function isOverlapping(existingBookings, newStart, newEnd) {
  for (const booking of existingBookings) {
    const start = booking.startTime.toDate ? booking.startTime.toDate() : new Date(booking.startTime);
    const end = booking.endTime.toDate ? booking.endTime.toDate() : new Date(booking.endTime);
    if (
      (newStart >= start && newStart < end) || // Starts in between
      (newEnd > start && newEnd <= end) ||     // Ends in between
      (newStart <= start && newEnd >= end)     // Fully overlaps
    ) {
      return true;
    }
  }
  return false;
}

// Fetch slots for a parking area from Firestore
export async function fetchSlotsForParkingArea(parkingId) {
  try {
    // Get parking area document
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const parkingDoc = await getDoc(parkingRef);
    
    if (!parkingDoc.exists()) {
      console.log("Parking area not found:", parkingId);
      return {};
    }
    
    const parkingData = parkingDoc.data();
    const totalSpots = parkingData.totalSpots || parkingData.availableSpots || 20;
    const slotsData = parkingData.slots || {};
    
    // Generate slots based on totalSpots, using existing slots data if available
    const slotBookings = {};
    
    // Create dynamic slot names based on total spots
    for (let i = 1; i <= totalSpots; i++) {
      const slotId = `slot${i}`;
      const existingSlotData = slotsData[slotId] || [];
      
      slotBookings[slotId] = existingSlotData;
    }
    
    console.log("Slot bookings for parking area:", slotBookings);
    return slotBookings;
  } catch (error) {
    console.error("Error fetching slots for parking area:", error);
    return {};
  }
}

// Book a parking slot for a specific time range
export async function bookParkingSlot(parkingId, slotId, bookingData) {
  try {
    // Check for overlapping bookings first
    const existingBookings = await fetchSlotsForParkingArea(parkingId);
    const slotBookings = existingBookings[slotId] || [];
    
    const newStart = new Date(bookingData.startTime);
    const newEnd = new Date(bookingData.endTime);
    
    // Check for overlaps
    for (const booking of slotBookings) {
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);
      
      if (
        (newStart >= bookingStart && newStart < bookingEnd) || // Starts in between
        (newEnd > bookingStart && newEnd <= bookingEnd) ||     // Ends in between
        (newStart <= bookingStart && newEnd >= bookingEnd)     // Fully overlaps
      ) {
        throw new Error("Slot already booked for selected time.");
      }
    }
    
    // Create new booking data for the slots field
    const bookingDoc = {
      userId: bookingData.userId,
      vehicleNumber: bookingData.vehicleNumber,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      status: bookingData.status || "active",
      paymentComplete: bookingData.paymentComplete || false,
      createdAt: Timestamp.now()
    };
    
    // Update the parking area's slots field directly
    await updateParkingAreaSlots(parkingId, slotId, bookingDoc);
    
    // Also add to user's history if user ID is provided
    if (bookingData.userId && bookingData.userId !== "guest") {
      try {
        await addBookingToUserHistory(bookingData.userId, {
          areaId: parkingId,
          slotId: slotId,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
          vehicleNumber: bookingData.vehicleNumber
        });
      } catch (historyError) {
        console.warn("Could not add to user history:", historyError);
      }
    }
    
    return { success: true, message: `Booked ${slotId} successfully.` };
  } catch (error) {
    console.error("Error booking parking slot:", error);
    throw error;
  }
}

// Book a parking slot after successful payment (skips overlap check)
export async function bookParkingSlotAfterPayment(parkingId, slotId, bookingData) {
  try {
    console.log("Booking slot after payment:", { parkingId, slotId, bookingData });
    
    // Create new booking data for the slots field
    const bookingDoc = {
      userId: bookingData.userId,
      vehicleNumber: bookingData.vehicleNumber,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      status: bookingData.status || "active",
      paymentComplete: bookingData.paymentComplete || false,
      paymentId: bookingData.paymentId,
      orderId: bookingData.orderId,
      createdAt: Timestamp.now()
    };
    
    // Update the parking area's slots field directly
    await updateParkingAreaSlots(parkingId, slotId, bookingDoc);
    
    console.log("Successfully booked slot after payment");
    return { success: true, message: `Booked ${slotId} successfully after payment.` };
  } catch (error) {
    console.error("Error booking parking slot after payment:", error);
    throw error;
  }
}

// Update parking area's slots field when a booking is made
export async function updateParkingAreaSlots(parkingId, slotId, bookingData) {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const parkingDoc = await getDoc(parkingRef);
    
    if (!parkingDoc.exists()) {
      throw new Error("Parking area not found");
    }
    
    const parkingData = parkingDoc.data();
    const currentSlots = parkingData.slots || {};
    
    // Initialize slot array if it doesn't exist
    if (!currentSlots[slotId]) {
      currentSlots[slotId] = [];
    }
    
    // Add the new booking to the slot
    currentSlots[slotId].push({
      userId: bookingData.userId,
      vehicleNumber: bookingData.vehicleNumber,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      createdAt: bookingData.createdAt,
      paymentComplete: bookingData.paymentComplete,
      status: bookingData.status,
      paymentId: bookingData.paymentId,
      orderId: bookingData.orderId
    });
    
    // Update the parking area document
    await updateDoc(parkingRef, {
      slots: currentSlots,
      availableSpots: Math.max(0, (parkingData.availableSpots || 0) - 1)
    });
    
    console.log(`Updated slots for parking area ${parkingId}, slot ${slotId}`);
  } catch (error) {
    console.error("Error updating parking area slots:", error);
    throw error;
  }
}

// Get slot status for a given time range (returns 'booked' if overlap, else 'available')
export function getSlotStatusForTime(existingBookings, startTime, endTime) {
  if (!startTime || !endTime || !existingBookings || existingBookings.length === 0) {
    return "available";
  }
  
  const newStart = new Date(startTime);
  const newEnd = new Date(endTime);
  
  for (const booking of existingBookings) {
    const bookingStart = new Date(booking.startTime);
    const bookingEnd = new Date(booking.endTime);
    
    if (
      (newStart >= bookingStart && newStart < bookingEnd) || // Starts in between
      (newEnd > bookingStart && newEnd <= bookingEnd) ||     // Ends in between
      (newStart <= bookingStart && newEnd >= bookingEnd)     // Fully overlaps
    ) {
      return "booked";
    }
  }
  
  return "available";
}

// --- Firestore Booking Functions ---

// Add a new booking to user's history after successful payment
export const addBookingToUserHistory = async (uid, bookingData) => {
  try {
    console.log("Adding booking to user history:", { uid, bookingData });
    
    if (!uid || uid === "guest") {
      throw new Error("Invalid user ID");
    }
    
    const userRef = doc(db, "users", uid);
    
    // Check if user document exists
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      console.log("User document doesn't exist, creating new user document");
      // Create user document if it doesn't exist
      await setDoc(userRef, {
        uid: uid,
        history: [],
        createdAt: Timestamp.now()
      });
    }
    
    // Create the booking entry for history
    const bookingEntry = {
      areaId: bookingData.areaId,
      slotId: bookingData.slotId,
      startTime: Timestamp.fromDate(new Date(bookingData.startTime)),
      endTime: Timestamp.fromDate(new Date(bookingData.endTime)),
      createdAt: Timestamp.now(),
      paymentComplete: true,
      status: "active",
      paymentId: bookingData.paymentId,
      orderId: bookingData.orderId,
      vehicleNumber: bookingData.vehicleNumber
    };

    console.log("Booking entry to add:", bookingEntry);

    // Update the user document by appending to history array
    await updateDoc(userRef, {
      history: arrayUnion(bookingEntry)
    });

    console.log("Successfully added booking to user history");
    return { success: true, booking: bookingEntry };
  } catch (error) {
    console.error("Error adding booking to user history:", error);
    
    // If it's a permissions error, log it but don't throw
    if (error.message.includes("Missing or insufficient permissions")) {
      console.warn("Firestore permissions issue - booking will still be saved to parking area");
      return { success: false, error: "User history not saved due to permissions" };
    }
    
    throw error;
  }
};

// Get all bookings for a user (booking history)
export const getUserBookingHistory = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.history || [];
    }
    return [];
  } catch (error) {
    console.error("Error fetching user booking history:", error);
    return [];
  }
};

// Get the active booking for a user
export const getActiveBookingFromUser = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const history = userData.history || [];
      
      // Find the most recent active booking
      const activeBooking = history
        .filter(booking => booking.status === "active")
        .sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate())[0];
      
      return activeBooking || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching active booking:", error);
    return null;
  }
};

// Update booking status in user history
export const updateBookingStatusInUserHistory = async (
  uid,
  bookingIndex,
  newStatus
) => {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const history = userData.history || [];
      
      if (history[bookingIndex]) {
        history[bookingIndex].status = newStatus;
        
        await updateDoc(userRef, {
          history: history
        });
      }
    }
  } catch (error) {
    console.error("Error updating booking status:", error);
    throw error;
  }
};

// --- Firestore-based rating function ---

/**
 * Submit a rating for a completed booking.
 * @param {string} userId - The user's UID
 * @param {number} bookingIndex - The index of the booking in the user's history
 * @param {string} lotId - The parking lot ID
 * @param {number} newRating - The new rating value
 */
export const submitRatingForBooking = async (userId, bookingIndex, lotId, newRating) => {
  // Update booking as rated in user history
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) throw new Error("User not found");
  const userData = userDoc.data();
  const history = userData.history || [];
  if (!history[bookingIndex]) throw new Error("Booking not found");
  if (history[bookingIndex].rated) throw new Error("This booking has already been rated.");
  history[bookingIndex].rated = true;
  await updateDoc(userRef, { history });

  // Update lot rating
  const lotRef = doc(db, "parkingAreas", lotId);
  const lotDoc = await getDoc(lotRef);
  if (!lotDoc.exists()) throw new Error("Parking lot not found");
  const lotData = lotDoc.data();
  const reviewCount = lotData.reviewCount || 0;
  const rating = lotData.rating || 0;
  const newReviewCount = reviewCount + 1;
  const newAvgRating = (rating * reviewCount + newRating) / newReviewCount;
  await updateDoc(lotRef, {
    reviewCount: newReviewCount,
    rating: newAvgRating,
  });
  return { success: true };
};

/**
 * Fetch a single parking area by its ID from Firestore.
 * @param {string} parkingId
 * @returns {Promise<Object|null>}
 */
export const fetchParkingAreaById = async (parkingId) => {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const parkingSnap = await getDoc(parkingRef);
    if (!parkingSnap.exists()) return null;
    return { id: parkingSnap.id, ...parkingSnap.data() };
  } catch (error) {
    console.error("Error fetching parking area by ID:", error);
    return null;
  }
};

// --- Comprehensive Firestore Data Management Functions ---

// Create a new parking area
export const createParkingArea = async (parkingData) => {
  try {
    const docRef = await addDoc(collection(db, "parkingAreas"), {
      ...parkingData,
      createdAt: Timestamp.now(),
      status: "Active",
      availableSpots: parkingData.totalSpots || 0,
      slots: {}
    });
    return { id: docRef.id, ...parkingData };
  } catch (error) {
    console.error("Error creating parking area:", error);
    throw error;
  }
};

// Update parking area details
export const updateParkingArea = async (parkingId, updateData) => {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    await updateDoc(parkingRef, {
      ...updateData,
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating parking area:", error);
    throw error;
  }
};

// Delete parking area
export const deleteParkingArea = async (parkingId) => {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    await deleteDoc(parkingRef);
    return { success: true };
  } catch (error) {
    console.error("Error deleting parking area:", error);
    throw error;
  }
};

// Add slots to a parking area
export const addSlotsToParkingArea = async (parkingId, slotIds) => {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const parkingDoc = await getDoc(parkingRef);
    if (!parkingDoc.exists()) throw new Error("Parking area not found");
    
    const currentData = parkingDoc.data();
    const currentSlots = currentData.slots || {};
    
    // Add new slots
    slotIds.forEach(slotId => {
      if (!currentSlots[slotId]) {
        currentSlots[slotId] = [];
      }
    });
    
    await updateDoc(parkingRef, {
      slots: currentSlots,
      totalSpots: Object.keys(currentSlots).length,
      availableSpots: Object.keys(currentSlots).length
    });
    
    return { success: true, slots: currentSlots };
  } catch (error) {
    console.error("Error adding slots:", error);
    throw error;
  }
};

// Remove slots from a parking area
export const removeSlotsFromParkingArea = async (parkingId, slotIds) => {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const parkingDoc = await getDoc(parkingRef);
    if (!parkingDoc.exists()) throw new Error("Parking area not found");
    
    const currentData = parkingDoc.data();
    const currentSlots = currentData.slots || {};
    
    // Remove specified slots
    slotIds.forEach(slotId => {
      delete currentSlots[slotId];
    });
    
    await updateDoc(parkingRef, {
      slots: currentSlots,
      totalSpots: Object.keys(currentSlots).length,
      availableSpots: Object.keys(currentSlots).length
    });
    
    return { success: true, slots: currentSlots };
  } catch (error) {
    console.error("Error removing slots:", error);
    throw error;
  }
};

// Get all bookings for a specific parking area
export const getBookingsForParkingArea = async (parkingId) => {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const parkingDoc = await getDoc(parkingRef);
    if (!parkingDoc.exists()) return [];
    
    const data = parkingDoc.data();
    const allBookings = [];
    
    // Collect all bookings from all slots
    Object.entries(data.slots || {}).forEach(([slotId, bookings]) => {
      bookings.forEach(booking => {
        allBookings.push({
          ...booking,
          slotId,
          parkingId
        });
      });
    });
    
    return allBookings;
  } catch (error) {
    console.error("Error fetching bookings for parking area:", error);
    return [];
  }
};

// Get all bookings for a specific user
export const getUserBookings = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return [];
    
    const userData = userDoc.data();
    return userData.history || [];
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    return [];
  }
};

// Cancel a booking
export const cancelBooking = async (userId, bookingIndex) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) throw new Error("User not found");
    
    const userData = userDoc.data();
    const history = userData.history || [];
    
    if (!history[bookingIndex]) throw new Error("Booking not found");
    
    // Update booking status
    history[bookingIndex].status = "cancelled";
    
    await updateDoc(userRef, { history });
    
    // Also remove from parking area slot
    const booking = history[bookingIndex];
    if (booking.areaId && booking.slotId) {
      const parkingRef = doc(db, "parkingAreas", booking.areaId);
      const parkingDoc = await getDoc(parkingRef);
      if (parkingDoc.exists()) {
        const parkingData = parkingDoc.data();
        const slots = parkingData.slots || {};
        const slotBookings = slots[booking.slotId] || [];
        
        // Remove the cancelled booking from slot
        const updatedSlotBookings = slotBookings.filter(
          b => !(b.userId === userId && 
                 b.startTime.toDate().getTime() === booking.startTime.toDate().getTime())
        );
        
        await updateDoc(parkingRef, {
          [`slots.${booking.slotId}`]: updatedSlotBookings
        });
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error cancelling booking:", error);
    throw error;
  }
};

// Get parking area statistics
export const getParkingAreaStats = async (parkingId) => {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const parkingDoc = await getDoc(parkingRef);
    if (!parkingDoc.exists()) return null;
    
    const data = parkingDoc.data();
    const slots = data.slots || {};
    const totalSlots = Object.keys(slots).length;
    const occupiedSlots = Object.values(slots).reduce((total, bookings) => {
      return total + bookings.filter(b => b.status === "active").length;
    }, 0);
    
    return {
      totalSlots,
      occupiedSlots,
      availableSlots: totalSlots - occupiedSlots,
      occupancyRate: totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0
    };
  } catch (error) {
    console.error("Error fetching parking area stats:", error);
    return null;
  }
};

// Search parking areas by location or name
export const searchParkingAreas = async (searchTerm) => {
  try {
    const allAreas = await fetchAllParkingAreas();
    return allAreas.filter(area => 
      area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      area.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (error) {
    console.error("Error searching parking areas:", error);
    return [];
  }
};

// Get parking areas by status
export const getParkingAreasByStatus = async (status) => {
  try {
    const allAreas = await fetchAllParkingAreas();
    return allAreas.filter(area => area.status === status);
  } catch (error) {
    console.error("Error fetching parking areas by status:", error);
    return [];
  }
};

// Update parking area availability
export const updateParkingAreaAvailability = async (parkingId) => {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const parkingDoc = await getDoc(parkingRef);
    if (!parkingDoc.exists()) throw new Error("Parking area not found");
    
    const data = parkingDoc.data();
    const slots = data.slots || {};
    const totalSlots = Object.keys(slots).length;
    const occupiedSlots = Object.values(slots).reduce((total, bookings) => {
      return total + bookings.filter(b => b.status === "active").length;
    }, 0);
    
    await updateDoc(parkingRef, {
      availableSpots: totalSlots - occupiedSlots,
      totalSpots: totalSlots
    });
    
    return { availableSpots: totalSlots - occupiedSlots, totalSlots };
  } catch (error) {
    console.error("Error updating parking area availability:", error);
    throw error;
  }
};

// --- Smart Parking System Functions ---

export default {
 /* validateParkingEntry,
  requestGateOpen,
   confirmExitByEmail, */
  fetchAllParkingAreas,
  bookParkingSlot,
  getUserBookingHistory,
  submitRatingForBooking
};
