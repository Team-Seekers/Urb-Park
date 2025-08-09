import { SpotStatus, BookingStatus } from "../../types";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  doc,
  updateDoc,
  Timestamp,
  getDoc,
  arrayUnion,
  deleteDoc,
  setDoc,
  onSnapshot,
  orderBy,
  limit,
  runTransaction,
} from "firebase/firestore";
import { db } from "./Firebase";

// ===== UTILITY FUNCTIONS =====

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

// Parse coordinates from various formats to standardized [lat, lng] array
export const parseCoordinates = (coordStr) => {
  if (!coordStr) return [0, 0];

  try {
    // Handle array format [lat, lng]
    if (Array.isArray(coordStr) && coordStr.length === 2) {
      return [parseFloat(coordStr[0]), parseFloat(coordStr[1])];
    }

    // Handle object format {lat, lng} or {latitude, longitude}
    if (typeof coordStr === "object") {
      if (coordStr.lat && coordStr.lng) {
        return [parseFloat(coordStr.lat), parseFloat(coordStr.lng)];
      }
      if (coordStr.latitude && coordStr.longitude) {
        return [parseFloat(coordStr.latitude), parseFloat(coordStr.longitude)];
      }
    }

    // Handle string format "11° N, 8° E" or "11, 8"
    if (typeof coordStr === "string") {
      const cleanStr = coordStr.replace(/[°]/g, "").trim();
      const parts = cleanStr.split(",").map((part) => part.trim());

      if (parts.length === 2) {
        let lat = parseFloat(parts[0]);
        let lng = parseFloat(parts[1]);

        // Handle N/S and E/W indicators
        if (parts[0].includes("S")) lat = -lat;
        if (parts[1].includes("W")) lng = -lng;

        return [lat, lng];
      }
    }
  } catch (error) {
    console.error("Error parsing coordinates:", error);
  }

  return [0, 0];
};

// Helper to generate slots for a parking area
const generateSlots = (totalSpots) => {
  const slots = [];
  for (let i = 1; i <= totalSpots; i++) {
    slots.push({
      slotId: `slot${i}`,
      bookings: [],
    });
  }
  return slots;
};

// Check if time overlaps with existing bookings
const isTimeOverlapping = (existingBookings, newStart, newEnd) => {
  if (!Array.isArray(existingBookings)) return false;
  
  const newStartTime = new Date(newStart);
  const newEndTime = new Date(newEnd);

  return existingBookings.some((booking) => {
    // Skip cancelled or inactive bookings
    if (booking.status !== 'active') return false;

    // Safely handle different time formats
    let existingStart, existingEnd;
    
    try {
      // Handle Firestore Timestamp objects
      if (booking.startTime && typeof booking.startTime.toDate === 'function') {
        existingStart = booking.startTime.toDate();
      } else if (booking.startTime) {
        existingStart = new Date(booking.startTime);
      } else {
        // Skip bookings with invalid start time
        return false;
      }
      
      if (booking.endTime && typeof booking.endTime.toDate === 'function') {
        existingEnd = booking.endTime.toDate();
      } else if (booking.endTime) {
        existingEnd = new Date(booking.endTime);
      } else {
        // Skip bookings with invalid end time
        return false;
      }
      
      // Validate dates
      if (isNaN(existingStart.getTime()) || isNaN(existingEnd.getTime())) {
        return false;
      }
      
    } catch (error) {
      console.warn('Invalid booking time format:', booking);
      return false;
    }

    return (
      (newStartTime >= existingStart && newStartTime < existingEnd) ||
      (newEndTime > existingStart && newEndTime <= existingEnd) ||
      (newStartTime <= existingStart && newEndTime >= existingEnd)
    );
  });
};

// Validate and clean booking data
const validateBookingData = (bookingData) => {
  if (!bookingData) {
    throw new Error("Booking data is required");
  }

  const requiredFields = ['userId', 'startTime', 'endTime'];
  for (const field of requiredFields) {
    if (!bookingData[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Clean and validate the data
  return {
    userId: bookingData.userId,
    vehicleNumber: bookingData.vehicleNumber || "N/A",
    startTime: bookingData.startTime,
    endTime: bookingData.endTime,
    status: bookingData.status || "active",
    paymentComplete: bookingData.paymentComplete || false,
    paymentId: bookingData.paymentId || null,
    orderId: bookingData.orderId || null,
  };
};

// ===== CORE PARKING AREA FUNCTIONS =====

// Fetch all parking areas from Firestore
export const fetchAllParkingAreas = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "parkingAreas"));
    const parkingAreas = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      // Accept both `coordinates` and `location` as coordinate sources
      const rawCoordinates =
        data.coordinates !== undefined && data.coordinates !== null
          ? data.coordinates
          : data.location;
      const coordinates = parseCoordinates(rawCoordinates);
      
      return {
        id: doc.id,
        name: data.name || `Parking ${doc.id}`,
        address: data.address || "Address not available",
        coordinates: coordinates,
        totalSpots: data.totalSpots || 0,
        availableSpots: data.availableSpots || 0,
        pricePerHour: data.pricePerHour || 50,
        rating: data.rating || 4.0,
        reviewCount: data.reviewCount || 0,
        status: data.status || "Active",
        createdAt: data.createdAt || Timestamp.now(),
        slots: data.slots || [],
        features: data.features || [],
        image: data.image,
        // Convenience properties
        lat: coordinates[0],
        lng: coordinates[1],
      };
    });
    
    return parkingAreas;
  } catch (error) {
    console.error("Error fetching parking areas:", error);
    return [];
  }
};

// Fetch a single parking area by ID
export const fetchParkingAreaById = async (parkingId) => {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const parkingSnap = await getDoc(parkingRef);
    
    if (!parkingSnap.exists()) return null;
    
    const data = parkingSnap.data();
    const rawCoordinates =
      data.coordinates !== undefined && data.coordinates !== null
        ? data.coordinates
        : data.location;
    const coordinates = parseCoordinates(rawCoordinates);
    
    return {
      id: parkingSnap.id,
      name: data.name,
      address: data.address,
      coordinates: coordinates,
      totalSpots: data.totalSpots,
      availableSpots: data.availableSpots,
      pricePerHour: data.pricePerHour,
      rating: data.rating,
      status: data.status,
      createdAt: data.createdAt,
      slots: data.slots || [],
      features: data.features || [],
      image: data.image,
      reviewCount: data.reviewCount,
      lat: coordinates[0],
      lng: coordinates[1],
    };
  } catch (error) {
    console.error("Error fetching parking area by ID:", error);
    return null;
  }
};

// Create a new parking area with proper schema
export const createParkingArea = async (parkingData) => {
  try {
    const totalSpots = parkingData.totalSpots || 20;
    const slots = generateSlots(totalSpots);
    
    const newParkingArea = {
      name: parkingData.name,
      address: parkingData.address,
      coordinates: parseCoordinates(
        parkingData.coordinates !== undefined && parkingData.coordinates !== null
          ? parkingData.coordinates
          : parkingData.location
      ),
      totalSpots: totalSpots,
      availableSpots: totalSpots,
      pricePerHour: parkingData.pricePerHour || 50,
      rating: 4.0,
      status: "Active",
      createdAt: Timestamp.now(),
      slots: slots,
    };

    const docRef = await addDoc(collection(db, "parkingAreas"), newParkingArea);
    
    return {
      id: docRef.id,
      ...newParkingArea,
      lat: newParkingArea.coordinates[0],
      lng: newParkingArea.coordinates[1],
    };
  } catch (error) {
    console.error("Error creating parking area:", error);
    throw error;
  }
};

// Update parking area details
export const updateParkingArea = async (parkingId, updateData) => {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const updatePayload = { ...updateData };
    
    // Parse coordinates if provided
    if (
      Object.prototype.hasOwnProperty.call(updateData, "coordinates") ||
      Object.prototype.hasOwnProperty.call(updateData, "location")
    ) {
      const rawCoordinates =
        updateData.coordinates !== undefined && updateData.coordinates !== null
          ? updateData.coordinates
          : updateData.location;
      updatePayload.coordinates = parseCoordinates(rawCoordinates);
    }
    
    await updateDoc(parkingRef, updatePayload);
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

// ===== SLOT MANAGEMENT FUNCTIONS =====

// Fetch slots for a specific parking area - returns both array format and object map
export const fetchSlotsForParkingArea = async (parkingId, returnAsMap = false) => {
  try {
    const parkingArea = await fetchParkingAreaById(parkingId);
    if (!parkingArea || !parkingArea.slots) {
      return returnAsMap ? {} : [];
    }

    if (returnAsMap) {
      // Convert slots array to object map for easier access
      const slotsMap = {};
      parkingArea.slots.forEach(slot => {
        slotsMap[slot.slotId] = slot.bookings || [];
      });
      return slotsMap;
    }

    return parkingArea.slots || [];
  } catch (error) {
    console.error("Error fetching slots for parking area:", error);
    return returnAsMap ? {} : [];
  }
};

// Add slots to a parking area
export const addSlotsToParkingArea = async (parkingId, newSlotIds) => {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const parkingDoc = await getDoc(parkingRef);
    
    if (!parkingDoc.exists()) {
      throw new Error("Parking area not found");
    }

    const currentData = parkingDoc.data();
    const currentSlots = currentData.slots || [];

    // Add new slots that don't already exist
    newSlotIds.forEach((slotId) => {
      if (!currentSlots.find((slot) => slot.slotId === slotId)) {
        currentSlots.push({
          slotId,
          bookings: [],
        });
      }
    });

    const totalSpots = currentSlots.length;
    const availableSpots = calculateAvailableSpots(currentSlots);

    await updateDoc(parkingRef, {
      slots: currentSlots,
      totalSpots: totalSpots,
      availableSpots: availableSpots,
    });

    return { success: true, slots: currentSlots, totalSpots, availableSpots };
  } catch (error) {
    console.error("Error adding slots to parking area:", error);
    throw error;
  }
};

// Remove slots from a parking area
export const removeSlotsFromParkingArea = async (parkingId, slotIdsToRemove) => {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const parkingDoc = await getDoc(parkingRef);
    
    if (!parkingDoc.exists()) {
      throw new Error("Parking area not found");
    }

    const currentData = parkingDoc.data();
    const currentSlots = currentData.slots || [];

    // Remove specified slots
    const updatedSlots = currentSlots.filter(
      (slot) => !slotIdsToRemove.includes(slot.slotId)
    );

    const totalSpots = updatedSlots.length;
    const availableSpots = calculateAvailableSpots(updatedSlots);

    await updateDoc(parkingRef, {
      slots: updatedSlots,
      totalSpots: totalSpots,
      availableSpots: availableSpots,
    });

    return { success: true, slots: updatedSlots, totalSpots, availableSpots };
  } catch (error) {
    console.error("Error removing slots from parking area:", error);
    throw error;
  }
};

// Calculate available spots based on current active bookings
const calculateAvailableSpots = (slots) => {
  if (!Array.isArray(slots)) return 0;
  
  const currentTime = new Date();
  let occupiedCount = 0;

  slots.forEach((slot) => {
    if (Array.isArray(slot.bookings)) {
      const hasActiveBooking = slot.bookings.some((booking) => {
        if (booking.status !== "active") return false;
        
        // Safely handle different time formats
        let startTime, endTime;
        
        try {
          if (booking.startTime && typeof booking.startTime.toDate === 'function') {
            startTime = booking.startTime.toDate();
          } else if (booking.startTime) {
            startTime = new Date(booking.startTime);
          } else {
            return false;
          }
          
          if (booking.endTime && typeof booking.endTime.toDate === 'function') {
            endTime = booking.endTime.toDate();
          } else if (booking.endTime) {
            endTime = new Date(booking.endTime);
          } else {
            return false;
          }
          
          // Validate dates
          if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            return false;
          }
          
        } catch (error) {
          console.warn('Invalid booking time format in calculateAvailableSpots:', booking);
          return false;
        }
        
        return currentTime >= startTime && currentTime <= endTime;
      });
      
      if (hasActiveBooking) occupiedCount++;
    }
  });

  return Math.max(0, slots.length - occupiedCount);
};

// Update parking area availability
export const updateParkingAreaAvailability = async (parkingId) => {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const parkingDoc = await getDoc(parkingRef);
    
    if (!parkingDoc.exists()) {
      throw new Error("Parking area not found");
    }

    const data = parkingDoc.data();
    const slots = data.slots || [];
    const availableSpots = calculateAvailableSpots(slots);

    await updateDoc(parkingRef, {
      availableSpots: availableSpots,
    });

    return { 
      success: true, 
      totalSpots: slots.length, 
      availableSpots 
    };
  } catch (error) {
    console.error("Error updating parking area availability:", error);
    throw error;
  }
};

// ===== BOOKING FUNCTIONS =====

// Check slot availability for a specific time range
export const getSlotAvailabilityForTimeRange = async (parkingId, startTime, endTime) => {
  try {
    const slotsMap = await fetchSlotsForParkingArea(parkingId, true);
    const availabilityMap = {};

    Object.keys(slotsMap).forEach((slotId) => {
      const isBooked = isTimeOverlapping(slotsMap[slotId], startTime, endTime);
      availabilityMap[slotId] = isBooked ? "booked" : "available";
    });

    return availabilityMap;
  } catch (error) {
    console.error("Error getting slot availability:", error);
    return {};
  }
};

// Book a parking slot with transaction safety for concurrent bookings
export const bookParkingSlot = async (parkingId, slotId, bookingData) => {
  try {
    // Validate required parameters
    if (!parkingId) {
      throw new Error("Parking area ID is required");
    }
    if (!slotId) {
      throw new Error("Slot ID is required");
    }
    if (!bookingData) {
      throw new Error("Booking data is required");
    }

    // Validate and clean booking data
    const validatedBookingData = validateBookingData(bookingData);

    // Use Firestore transaction to prevent race conditions
    const result = await runTransaction(db, async (transaction) => {
      const parkingRef = doc(db, "parkingAreas", parkingId);
      const parkingDoc = await transaction.get(parkingRef);
      
      if (!parkingDoc.exists()) {
        throw new Error("Parking area not found");
      }

      const parkingData = parkingDoc.data();
      const slots = [...(parkingData.slots || [])];
      let slotIndex = slots.findIndex((slot) => slot.slotId === slotId);
      
      // If slot doesn't exist, create it
      if (slotIndex === -1) {
        const newSlot = {
          slotId: slotId,
          bookings: [],
        };
        slots.push(newSlot);
        slotIndex = slots.length - 1;
        console.log(`Created new slot ${slotId} for parking area ${parkingId}`);
      }

      const slot = slots[slotIndex];
      
      // Check for time conflicts with active bookings only
      if (isTimeOverlapping(slot.bookings, validatedBookingData.startTime, validatedBookingData.endTime)) {
        throw new Error("This slot has been booked just now by another user before you. Please select a different slot or time.");
      }

      // Create new booking with proper validation
      const newBooking = {
        userId: validatedBookingData.userId,
        vehicleNumber: validatedBookingData.vehicleNumber,
        startTime: Timestamp.fromDate(new Date(validatedBookingData.startTime)),
        endTime: Timestamp.fromDate(new Date(validatedBookingData.endTime)),
        status: validatedBookingData.status,
        paymentComplete: validatedBookingData.paymentComplete,
        paymentId: validatedBookingData.paymentId,
        orderId: validatedBookingData.orderId,
        createdAt: Timestamp.now(),
      };

      // Add booking to slot
      slots[slotIndex].bookings.push(newBooking);

      // Update parking area with transaction
      const availableSpots = calculateAvailableSpots(slots);
      
      transaction.update(parkingRef, {
        slots: slots,
        availableSpots: availableSpots,
      });

      return { newBooking, slotId };
    });

    // Add to user history if not guest (outside transaction)
    if (validatedBookingData.userId && validatedBookingData.userId !== "guest") {
      try {
        const historyData = {
          areaId: parkingId,
          slotId: slotId,
          startTime: validatedBookingData.startTime,
          endTime: validatedBookingData.endTime,
          vehicleNumber: validatedBookingData.vehicleNumber,
          paymentId: validatedBookingData.paymentId,
          orderId: validatedBookingData.orderId,
        };
        
        await addBookingToUserHistory(validatedBookingData.userId, historyData);
      } catch (historyError) {
        console.warn("Could not add to user history:", historyError);
      }
    }

    return { 
      success: true, 
      message: `Successfully booked slot ${slotId}`,
      booking: result.newBooking 
    };
  } catch (error) {
    console.error("Error booking parking slot:", error);
    throw error;
  }
};

// Cancel a booking
export const cancelBooking = async (parkingId, slotId, bookingToCancel) => {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const parkingDoc = await getDoc(parkingRef);
    
    if (!parkingDoc.exists()) {
      throw new Error("Parking area not found");
    }

    const parkingData = parkingDoc.data();
    const slots = [...(parkingData.slots || [])];
    const slotIndex = slots.findIndex((slot) => slot.slotId === slotId);
    
    if (slotIndex === -1) {
      throw new Error("Slot not found");
    }

    // Find and update the booking status
    const bookings = slots[slotIndex].bookings;
    const bookingIndex = bookings.findIndex((booking) => 
      booking.userId === bookingToCancel.userId &&
      booking.startTime.toMillis() === new Date(bookingToCancel.startTime).getTime()
    );

    if (bookingIndex === -1) {
      throw new Error("Booking not found");
    }

    // Update booking status
    slots[slotIndex].bookings[bookingIndex].status = "cancelled";

    // Update parking area
    const availableSpots = calculateAvailableSpots(slots);
    
    await updateDoc(parkingRef, {
      slots: slots,
      availableSpots: availableSpots,
    });

    return { success: true, message: "Booking cancelled successfully" };
  } catch (error) {
    console.error("Error cancelling booking:", error);
    throw error;
  }
};

// ===== USER FUNCTIONS =====

// Add booking to user's history
export const addBookingToUserHistory = async (userId, bookingData) => {
  try {
    if (!userId || userId === "guest") {
      throw new Error("Invalid user ID");
    }

    const userRef = doc(db, "users", userId);

    // Check if user document exists
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid: userId,
        history: [],
        createdAt: Timestamp.now(),
      });
    }

    // Create booking entry for history with proper validation
    const bookingEntry = {
      areaId: bookingData.areaId || null,
      slotId: bookingData.slotId || null,
      startTime: Timestamp.fromDate(new Date(bookingData.startTime)),
      endTime: Timestamp.fromDate(new Date(bookingData.endTime)),
      vehicleNumber: bookingData.vehicleNumber || "N/A",
      paymentId: bookingData.paymentId || null,
      orderId: bookingData.orderId || null,
      status: "active",
      paymentComplete: true,
      createdAt: Timestamp.now(),
    };

    // Filter out undefined values to prevent Firebase errors
    const cleanBookingEntry = Object.fromEntries(
      Object.entries(bookingEntry).filter(([_, value]) => value !== undefined)
    );

    // Add to user history
    await updateDoc(userRef, {
      history: arrayUnion(cleanBookingEntry),
    });

    return { success: true, booking: cleanBookingEntry };
  } catch (error) {
    console.error("Error adding booking to user history:", error);
    throw error;
  }
};

// Get user's booking history
export const getUserBookingHistory = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
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

// Get user's active booking
export const getActiveBookingFromUser = async (userId) => {
  try {
    const userHistory = await getUserBookingHistory(userId);
    
    // Find most recent active booking
    const activeBooking = userHistory
      .filter((booking) => booking.status === "active")
      .sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate())[0];

    return activeBooking || null;
  } catch (error) {
    console.error("Error fetching active booking:", error);
    return null;
  }
};

// ===== LOCATION-BASED FUNCTIONS =====

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

// Get nearby parking areas
export const getNearbyParkingAreas = async (maxDistance = 5) => {
  try {
    const userLocation = await getUserLocation();
    const parkingAreas = await fetchAllParkingAreas();

    const parkingWithDistance = parkingAreas
      .map((area) => {
        const [lat, lng] = area.coordinates;
        const distance = getDistanceFromLatLonInKm(
          userLocation.lat,
          userLocation.lng,
          lat,
          lng
        );

        return {
          ...area,
          distance,
        };
      })
      .filter((area) => area.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    return parkingWithDistance;
  } catch (error) {
    console.error("Error getting nearby parking areas:", error);
    throw error;
  }
};

// Get nearby parking areas with availability for specific time
export const getNearbyParkingAreasWithAvailability = async (
  maxDistance = 5,
  startTime,
  endTime
) => {
  try {
    const nearbyAreas = await getNearbyParkingAreas(maxDistance);

    const areasWithAvailability = await Promise.all(
      nearbyAreas.map(async (area) => {
        const availability = await getSlotAvailabilityForTimeRange(
          area.id,
          startTime,
          endTime
        );
        const availableCount = Object.values(availability).filter(
          (status) => status === "available"
        ).length;

        return {
          ...area,
          availableSpotsForTime: availableCount,
          availabilityMap: availability,
        };
      })
    );

    return areasWithAvailability.sort(
      (a, b) => b.availableSpotsForTime - a.availableSpotsForTime
    );
  } catch (error) {
    console.error("Error getting nearby areas with availability:", error);
    return [];
  }
};

// ===== REAL-TIME FUNCTIONS =====

// Subscribe to real-time slot updates
export const subscribeToSlotAvailability = (parkingId, callback) => {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    return onSnapshot(parkingRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const slots = data.slots || [];
        
        // Convert to slots map format for compatibility
        const slotsMap = {};
        slots.forEach(slot => {
          slotsMap[slot.slotId] = slot.bookings || [];
        });
        
        callback(slotsMap);
      } else {
        callback({});
      }
    });
  } catch (error) {
    console.error("Error subscribing to slot availability:", error);
    return null;
  }
};

// ===== ANALYTICS FUNCTIONS =====

// Get parking area analytics
export const getParkingAreaAnalytics = async (parkingId) => {
  try {
    const parkingArea = await fetchParkingAreaById(parkingId);
    if (!parkingArea) return null;

    const slots = parkingArea.slots || [];
    const totalSlots = slots.length;
    const currentTime = new Date();
    
    let occupiedSlots = 0;
    let totalRevenue = 0;
    let activeBookings = 0;

    slots.forEach((slot) => {
      if (Array.isArray(slot.bookings)) {
        slot.bookings.forEach((booking) => {
          if (booking.status === "active") {
            const startTime = booking.startTime.toDate 
              ? booking.startTime.toDate() 
              : new Date(booking.startTime);
            const endTime = booking.endTime.toDate 
              ? booking.endTime.toDate() 
              : new Date(booking.endTime);
            
            // Check if booking is currently active
            if (currentTime >= startTime && currentTime <= endTime) {
              occupiedSlots++;
            }
            
            activeBookings++;
            
            // Calculate revenue
            const hours = (endTime - startTime) / (1000 * 60 * 60);
            totalRevenue += hours * parkingArea.pricePerHour;
          }
        });
      }
    });

    return {
      parkingId,
      parkingName: parkingArea.name,
      totalSlots,
      occupiedSlots,
      availableSlots: totalSlots - occupiedSlots,
      occupancyRate: totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0,
      totalRevenue: totalRevenue.toFixed(2),
      activeBookings,
      averageRating: parkingArea.rating || 0,
      reviewCount: parkingArea.reviewCount || 0,
    };
  } catch (error) {
    console.error("Error fetching parking area analytics:", error);
    return null;
  }
};

// Get revenue report for date range
export const getParkingAreaRevenueReport = async (
  parkingId,
  startDate,
  endDate
) => {
  try {
    const parkingArea = await fetchParkingAreaById(parkingId);
    if (!parkingArea) return null;

    const slots = parkingArea.slots || [];
    let totalRevenue = 0;
    let totalBookings = 0;
    let completedPayments = 0;

    slots.forEach((slot) => {
      if (Array.isArray(slot.bookings)) {
        slot.bookings.forEach((booking) => {
          const bookingDate = booking.createdAt.toDate 
            ? booking.createdAt.toDate() 
            : new Date(booking.createdAt);
          
          if (bookingDate >= startDate && bookingDate <= endDate) {
            totalBookings++;
            
            if (booking.paymentComplete) {
              completedPayments++;
              
              const startTime = booking.startTime.toDate 
                ? booking.startTime.toDate() 
                : new Date(booking.startTime);
              const endTime = booking.endTime.toDate 
                ? booking.endTime.toDate() 
                : new Date(booking.endTime);
              
              const hours = (endTime - startTime) / (1000 * 60 * 60);
              totalRevenue += hours * parkingArea.pricePerHour;
            }
          }
        });
      }
    });

    return {
      parkingId,
      parkingName: parkingArea.name,
      totalBookings,
      completedPayments,
      totalRevenue: totalRevenue.toFixed(2),
      dateRange: { startDate, endDate },
    };
  } catch (error) {
    console.error("Error generating revenue report:", error);
    return null;
  }
};

// ===== SEARCH FUNCTIONS =====

// Search parking areas by name or address
export const searchParkingAreas = async (searchTerm) => {
  try {
    const allAreas = await fetchAllParkingAreas();
    return allAreas.filter(
      (area) =>
        area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        area.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (error) {
    console.error("Error searching parking areas:", error);
    return [];
  }
};

// Search parking areas with availability
export const searchParkingAreasWithAvailability = async (
  searchTerm,
  startTime,
  endTime
) => {
  try {
    const filteredAreas = await searchParkingAreas(searchTerm);

    const areasWithAvailability = await Promise.all(
      filteredAreas.map(async (area) => {
        const availability = await getSlotAvailabilityForTimeRange(
          area.id,
          startTime,
          endTime
        );
        const availableCount = Object.values(availability).filter(
          (status) => status === "available"
        ).length;

        return {
          ...area,
          availableSpotsForTime: availableCount,
          availabilityMap: availability,
        };
      })
    );

    return areasWithAvailability.sort(
      (a, b) => b.availableSpotsForTime - a.availableSpotsForTime
    );
  } catch (error) {
    console.error("Error searching parking areas with availability:", error);
    return [];
  }
};

// ===== RATING FUNCTIONS =====

// Submit rating for a completed booking
export const submitRatingForBooking = async (
  userId,
  bookingIndex,
  parkingId,
  newRating
) => {
  try {
    // Update user history to mark booking as rated
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const history = [...(userData.history || [])];
    
    if (!history[bookingIndex]) {
      throw new Error("Booking not found");
    }

    if (history[bookingIndex].rated) {
      throw new Error("This booking has already been rated");
    }

    // Mark as rated
    history[bookingIndex].rated = true;

    await updateDoc(userRef, { history });

    // Update parking area rating
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const parkingDoc = await getDoc(parkingRef);
    
    if (!parkingDoc.exists()) {
      throw new Error("Parking area not found");
    }

    const parkingData = parkingDoc.data();
    const currentRating = parkingData.rating || 0;
    const reviewCount = parkingData.reviewCount || 0;
    
    const newReviewCount = reviewCount + 1;
    const newAverageRating = (currentRating * reviewCount + newRating) / newReviewCount;

    await updateDoc(parkingRef, {
      rating: newAverageRating,
      reviewCount: newReviewCount,
    });

    return { 
      success: true, 
      newRating: newAverageRating, 
      reviewCount: newReviewCount 
    };
  } catch (error) {
    console.error("Error submitting rating:", error);
    throw error;
  }
};

// ===== MAINTENANCE FUNCTIONS =====

// Add maintenance booking to a slot
export const addMaintenanceBooking = async (
  parkingId,
  slotId,
  maintenanceData
) => {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const parkingDoc = await getDoc(parkingRef);
    
    if (!parkingDoc.exists()) {
      throw new Error("Parking area not found");
    }

    const parkingData = parkingDoc.data();
    const slots = [...(parkingData.slots || [])];
    const slotIndex = slots.findIndex((slot) => slot.slotId === slotId);
    
    if (slotIndex === -1) {
      // Create slot if it doesn't exist
      slots.push({ slotId, bookings: [] });
    }

    const targetSlotIndex = slotIndex === -1 ? slots.length - 1 : slotIndex;

    // Create maintenance booking
    const maintenanceBooking = {
      userId: "maintenance",
      vehicleNumber: "MAINTENANCE",
      startTime: Timestamp.fromDate(new Date(maintenanceData.startTime)),
      endTime: Timestamp.fromDate(new Date(maintenanceData.endTime)),
      status: "maintenance",
      paymentComplete: false,
      paymentId: null,
      orderId: null,
      createdAt: Timestamp.now(),
      maintenanceType: maintenanceData.maintenanceType || "General",
      notes: maintenanceData.notes || "",
    };

    slots[targetSlotIndex].bookings.push(maintenanceBooking);

    // Update availability
    const availableSpots = calculateAvailableSpots(slots);

    await updateDoc(parkingRef, {
      slots: slots,
      availableSpots: availableSpots,
    });

    return { success: true, maintenanceBooking };
  } catch (error) {
    console.error("Error adding maintenance booking:", error);
    throw error;
  }
};

// Get maintenance schedule for a parking area
export const getParkingAreaMaintenanceSchedule = async (parkingId) => {
  try {
    const parkingArea = await fetchParkingAreaById(parkingId);
    if (!parkingArea) return null;

    const maintenanceSlots = [];

    parkingArea.slots.forEach((slot) => {
      if (Array.isArray(slot.bookings)) {
        const maintenanceBookings = slot.bookings.filter(
          (booking) => booking.status === "maintenance"
        );
        
        if (maintenanceBookings.length > 0) {
          maintenanceSlots.push({
            slotId: slot.slotId,
            bookings: maintenanceBookings,
          });
        }
      }
    });

    return {
      parkingId,
      parkingName: parkingArea.name,
      maintenanceSlots,
      totalMaintenanceSlots: maintenanceSlots.length,
    };
  } catch (error) {
    console.error("Error fetching maintenance schedule:", error);
    return null;
  }
};

// ===== BULK OPERATIONS =====

// Bulk update parking area status
export const bulkUpdateParkingAreaStatus = async (parkingIds, newStatus) => {
  try {
    const updatePromises = parkingIds.map(async (parkingId) => {
      const parkingRef = doc(db, "parkingAreas", parkingId);
      await updateDoc(parkingRef, {
        status: newStatus,
      });
    });

    await Promise.all(updatePromises);
    
    return { 
      success: true, 
      updatedCount: parkingIds.length,
      newStatus 
    };
  } catch (error) {
    console.error("Error bulk updating parking area status:", error);
    throw error;
  }
};

// Get all parking areas by status
export const getParkingAreasByStatus = async (status) => {
  try {
    const allAreas = await fetchAllParkingAreas();
    return allAreas.filter((area) => area.status === status);
  } catch (error) {
    console.error("Error fetching parking areas by status:", error);
    return [];
  }
};

// ===== UTILITY FUNCTIONS FOR LEGACY COMPATIBILITY =====

// Get all bookings for a specific parking area
export const getBookingsForParkingArea = async (parkingId) => {
  try {
    const parkingArea = await fetchParkingAreaById(parkingId);
    if (!parkingArea) return [];

    const allBookings = [];

    parkingArea.slots.forEach((slot) => {
      if (Array.isArray(slot.bookings)) {
        slot.bookings.forEach((booking) => {
          allBookings.push({
            ...booking,
            slotId: slot.slotId,
            parkingId,
          });
        });
      }
    });

    return allBookings;
  } catch (error) {
    console.error("Error fetching bookings for parking area:", error);
    return [];
  }
};

// Get all user bookings (alias for getUserBookingHistory)
export const getUserBookings = async (userId) => {
  return await getUserBookingHistory(userId);
};

// Get parking area statistics
export const getParkingAreaStats = async (parkingId) => {
  const analytics = await getParkingAreaAnalytics(parkingId);
  if (!analytics) return null;

  return {
    totalSlots: analytics.totalSlots,
    occupiedSlots: analytics.occupiedSlots,
    availableSlots: analytics.availableSlots,
    occupancyRate: analytics.occupancyRate,
  };
};

// Get all parking areas with analytics
export const getAllParkingAreasWithAnalytics = async () => {
  try {
    const parkingAreas = await fetchAllParkingAreas();
    
    const areasWithAnalytics = await Promise.all(
      parkingAreas.map(async (area) => {
        const analytics = await getParkingAreaAnalytics(area.id);
        return { 
          ...area, 
          analytics: analytics || {
            totalSlots: area.totalSpots,
            occupiedSlots: 0,
            availableSlots: area.availableSpots,
            occupancyRate: 0,
            totalRevenue: "0.00",
            activeBookings: 0,
          }
        };
      })
    );

    return areasWithAnalytics;
  } catch (error) {
    console.error("Error fetching parking areas with analytics:", error);
    return [];
  }
};

// ===== HELPER FUNCTIONS FOR SPECIFIC USE CASES =====

// Check if a specific slot is currently booked
export const isSlotBooked = (slot, currentTime = new Date()) => {
  if (!slot.bookings || !Array.isArray(slot.bookings)) return false;
  
  return slot.bookings.some((booking) => {
    if (booking.status !== "active") return false;
    
    // Safely handle different time formats
    let startTime, endTime;
    
    try {
      if (booking.startTime && typeof booking.startTime.toDate === 'function') {
        startTime = booking.startTime.toDate();
      } else if (booking.startTime) {
        startTime = new Date(booking.startTime);
      } else {
        return false;
      }
      
      if (booking.endTime && typeof booking.endTime.toDate === 'function') {
        endTime = booking.endTime.toDate();
      } else if (booking.endTime) {
        endTime = new Date(booking.endTime);
      } else {
        return false;
      }
      
      // Validate dates
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return false;
      }
      
    } catch (error) {
      console.warn('Invalid booking time format in isSlotBooked:', booking);
      return false;
    }
    
    return currentTime >= startTime && currentTime <= endTime;
  });
};

// Update slot status (for backward compatibility)
export const updateSlotStatus = async (
  parkingId,
  slotId,
  startTime,
  durationInHours,
  userId
) => {
  const endTime = new Date(new Date(startTime).getTime() + durationInHours * 60 * 60 * 1000);
  
  const bookingData = {
    userId: userId,
    vehicleNumber: "N/A", // You might want to require this parameter
    startTime: startTime,
    endTime: endTime,
    status: "active",
    paymentComplete: false,
  };

  return await bookParkingSlot(parkingId, slotId, bookingData);
};

// Create dummy parking area for testing
export const createDummyParkingArea = async () => {
  const dummyData = {
    name: "Urban Park Zone A",
    address: "123 Main Street, Downtown",
    coordinates: [40.7128, -74.0060], // NYC coordinates
    totalSpots: 12,
    pricePerHour: 25,
  };

  return await createParkingArea(dummyData);
};

// Get parking areas (alias for fetchAllParkingAreas)
export const getParkingAreas = async () => {
  return await fetchAllParkingAreas();
};

// Get parking slots (alias for fetchSlotsForParkingArea)
export const getParkingSlots = async (parkingId) => {
  return await fetchSlotsForParkingArea(parkingId);
};

// ===== ADVANCED BOOKING FUNCTIONS =====

// Book parking slot after payment (for payment integration)
export const bookParkingSlotAfterPayment = async (
  parkingId,
  slotId,
  bookingData
) => {
  try {
    // Validate required parameters
    if (!parkingId) {
      throw new Error("Parking area ID is required");
    }
    if (!slotId) {
      throw new Error("Slot ID is required");
    }
    if (!bookingData) {
      throw new Error("Booking data is required");
    }

    const enhancedBookingData = {
      ...bookingData,
      status: "active",
      paymentComplete: true,
    };

    return await bookParkingSlot(parkingId, slotId, enhancedBookingData);
  } catch (error) {
    console.error("Error booking parking slot after payment:", error);
    
    // If slot is already booked, provide a more helpful error message
    if (error.message.includes("already booked")) {
      throw new Error("This slot was booked by another user during payment. Please try booking a different slot or contact support for a refund.");
    }
    
    throw error;
  }
};

// Update booking status in user history
export const updateBookingStatusInUserHistory = async (
  userId,
  bookingIndex,
  newStatus
) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const history = [...(userData.history || [])];

    if (!history[bookingIndex]) {
      throw new Error("Booking not found");
    }

    history[bookingIndex].status = newStatus;

    await updateDoc(userRef, { history });

    return { success: true, newStatus };
  } catch (error) {
    console.error("Error updating booking status in user history:", error);
    throw error;
  }
};

// Get slot status for time range (returns available/booked)
export const getSlotStatusForTime = (existingBookings, startTime, endTime) => {
  if (!Array.isArray(existingBookings) || existingBookings.length === 0) {
    return "available";
  }

  const isBooked = isTimeOverlapping(existingBookings, startTime, endTime);
  return isBooked ? "booked" : "available";
};

// Get all bookings for a specific slot
export const getSlotBookings = async (parkingId, slotId) => {
  try {
    const parkingArea = await fetchParkingAreaById(parkingId);
    if (!parkingArea) return [];

    const slot = parkingArea.slots.find(s => s.slotId === slotId);
    return slot ? slot.bookings || [] : [];
  } catch (error) {
    console.error("Error fetching slot bookings:", error);
    return [];
  }
};

// Get slot availability with detailed booking information
export const getSlotAvailabilityWithBookings = async (parkingId, slotId, startTime, endTime) => {
  try {
    const slotBookings = await getSlotBookings(parkingId, slotId);
    const isBooked = isTimeOverlapping(slotBookings, startTime, endTime);
    
    return {
      slotId,
      isAvailable: !isBooked,
      existingBookings: slotBookings,
      requestedTimeRange: { startTime, endTime }
    };
  } catch (error) {
    console.error("Error getting slot availability with bookings:", error);
    return {
      slotId,
      isAvailable: false,
      existingBookings: [],
      requestedTimeRange: { startTime, endTime }
    };
  }
};

// Ensure slot exists in parking area (creates slot if it doesn't exist)
export const ensureSlotExists = async (parkingId, slotId) => {
  try {
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const parkingDoc = await getDoc(parkingRef);
    
    if (!parkingDoc.exists()) {
      throw new Error("Parking area not found");
    }

    const parkingData = parkingDoc.data();
    const slots = [...(parkingData.slots || [])];
    const slotIndex = slots.findIndex((slot) => slot.slotId === slotId);
    
    // If slot doesn't exist, create it
    if (slotIndex === -1) {
      const newSlot = {
        slotId: slotId,
        bookings: [],
      };
      slots.push(newSlot);
      
      await updateDoc(parkingRef, {
        slots: slots,
      });
      
      console.log(`Created new slot ${slotId} for parking area ${parkingId}`);
      return { success: true, slotCreated: true, slotId };
    }
    
    return { success: true, slotCreated: false, slotId };
  } catch (error) {
    console.error("Error ensuring slot exists:", error);
    throw error;
  }
};

// ===== EXPORT DEFAULT OBJECT =====

export default {
  // Core parking area functions
  fetchAllParkingAreas,
  fetchParkingAreaById,
  createParkingArea,
  updateParkingArea,
  deleteParkingArea,
  
  // Slot management
  fetchSlotsForParkingArea,
  addSlotsToParkingArea,
  removeSlotsFromParkingArea,
  updateParkingAreaAvailability,
  
  // Booking functions
  bookParkingSlot,
  bookParkingSlotAfterPayment,
  cancelBooking,
  getSlotAvailabilityForTimeRange,
  
  // User functions
  addBookingToUserHistory,
  getUserBookingHistory,
  getActiveBookingFromUser,
  updateBookingStatusInUserHistory,
  
  // Location functions
  getUserLocation,
  getNearbyParkingAreas,
  getNearbyParkingAreasWithAvailability,
  
  // Search functions
  searchParkingAreas,
  searchParkingAreasWithAvailability,
  
  // Analytics
  getParkingAreaAnalytics,
  getParkingAreaRevenueReport,
  getAllParkingAreasWithAnalytics,
  
  // Ratings
  submitRatingForBooking,
  
  // Maintenance
  addMaintenanceBooking,
  getParkingAreaMaintenanceSchedule,
  
  // Bulk operations
  bulkUpdateParkingAreaStatus,
  getParkingAreasByStatus,
  
  // Real-time
  subscribeToSlotAvailability,
  
  // Utility functions
  getDistanceFromLatLonInKm,
  parseCoordinates,
  isSlotBooked,
  getSlotStatusForTime,
  getSlotBookings,
  getSlotAvailabilityWithBookings,
  ensureSlotExists,
  validateBookingData,
  
  // Legacy compatibility
  getParkingAreas,
  getParkingSlots,
  updateSlotStatus,
  createDummyParkingArea,
  getBookingsForParkingArea,
  getUserBookings,
  getParkingAreaStats,
};