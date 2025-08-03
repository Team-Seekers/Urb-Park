import { SpotStatus, BookingStatus } from "../../types";

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

let MOCK_PARKING_LOTS = [
  {
    id: "lot-a1",
    name: "EcoPark Downtown",
    address: "Tambaram",
    lat: 13.0827,
    lng: 80.2707,
    distance: 1.2,
    totalSpots: 80,
    availableSpots: 65,
    pricePerHour: 50,
    rating: 4.5,
    reviewCount: 52,
    features: ["EV Charging", "Covered", "24/7 Security", "Mobile Pass"],
    image: "https://picsum.photos/400/300?random=1",
    spots: generateSpots(80),
    status: "active",
    ownerId: "manager-001",
    verificationChecks: {
      cameraFixed: true,
      apiIntegrated: true,
      rehearsalComplete: true,
    },
  },
  {
    id: "lot-b2",
    name: "City Center Garage",
    address: "Delhi",
    lat: 28.6448,
    lng: 77.2167,
    distance: 2.5,
    totalSpots: 150,
    availableSpots: 45,
    pricePerHour: 60,
    rating: 4.2,
    reviewCount: 128,
    features: ["Covered", "Valet", "24/7 Access"],
    image: "https://picsum.photos/400/300?random=2",
    spots: generateSpots(150),
    status: "active",
    ownerId: "system-user",
    verificationChecks: {
      cameraFixed: true,
      apiIntegrated: true,
      rehearsalComplete: true,
    },
  },
  // Add a pending one for the AdminPage to display
  {
    id: "lot-pending-1",
    name: "Jane's Driveway",
    address: "Tambaram",
    lat: 13.0827,
    lng: 80.2707,
    distance: 0,
    totalSpots: 2,
    availableSpots: 2,
    pricePerHour: 75,
    rating: 0,
    reviewCount: 0,
    features: ["Mobile Pass"],
    image: "httpsum.photos/400/300?random=5",
    spots: generateSpots(2),
    status: "pending",
    ownerId: "user-to-be-manager",
    verificationChecks: {
      cameraFixed: false,
      apiIntegrated: false,
      rehearsalComplete: false,
    },
  },
];

// Initialize available spots count
MOCK_PARKING_LOTS.forEach((lot) => {
  lot.availableSpots = lot.spots.filter(
    (s) => s.status === SpotStatus.AVAILABLE
  ).length;
});

let MOCK_BOOKINGS = [];

export const getParkingLots = () => {
  return new Promise((resolve) => {
    // Ensure available spots count is up-to-date
    MOCK_PARKING_LOTS.forEach((lot) => {
      lot.availableSpots = lot.spots.filter(
        (s) => s.status === SpotStatus.AVAILABLE
      ).length;
    });
    const activeLots = MOCK_PARKING_LOTS.filter(
      (lot) => lot.status === "active"
    );
    setTimeout(() => resolve([...activeLots]), 500);
  });
};

export const getParkingLotById = (id) => {
  return new Promise((resolve) => {
    setTimeout(
      () => resolve(MOCK_PARKING_LOTS.find((lot) => lot.id === id)),
      300
    );
  });
};

export const getPendingSubmissions = () => {
  return new Promise((resolve) => {
    const pendingLots = MOCK_PARKING_LOTS.filter(
      (lot) => lot.status === "pending"
    );
    setTimeout(() => resolve([...pendingLots]), 500);
  });
};

export const submitNewLot = (lotData) => {
  return new Promise((resolve) => {
    const newLot = {
      id: `lot-pending-${Date.now()}`,
      name: lotData.name,
      address: lotData.address,
      lat: lotData.lat,
      lng: lotData.lng,
      distance: 0,
      totalSpots: lotData.spots,
      availableSpots: lotData.spots,
      pricePerHour: 65, // Default price
      rating: 0,
      reviewCount: 0,
      features: ["Mobile Pass", "24/7 Access"],
      image: `https://picsum.photos/400/300?random=${Date.now()}`,
      spots: generateSpots(lotData.spots),
      status: "pending",
      ownerId: "submitted-user", // Mock owner ID
      verificationChecks: {
        cameraFixed: false,
        apiIntegrated: false,
        rehearsalComplete: false,
      },
    };
    MOCK_PARKING_LOTS.push(newLot);
    setTimeout(() => resolve(newLot), 700);
  });
};

export const updateLotDetails = (lotId, details) => {
  return new Promise((resolve, reject) => {
    const lotIndex = MOCK_PARKING_LOTS.findIndex((lot) => lot.id === lotId);
    if (lotIndex === -1) {
      return reject(new Error("Lot not found to update."));
    }

    const originalLot = MOCK_PARKING_LOTS[lotIndex];

    // Check if totalSpots has changed, if so, regenerate spots array
    if (details.totalSpots && details.totalSpots !== originalLot.totalSpots) {
      originalLot.spots = generateSpots(details.totalSpots);
      originalLot.availableSpots = details.totalSpots; // Assuming all new spots are available
    }

    // Update the lot with new details
    MOCK_PARKING_LOTS[lotIndex] = { ...originalLot, ...details };

    setTimeout(() => resolve({ ...MOCK_PARKING_LOTS[lotIndex] }), 300);
  });
};

export const updateLotVerificationCheck = (lotId, check, value) => {
  return new Promise((resolve, reject) => {
    const lotIndex = MOCK_PARKING_LOTS.findIndex((lot) => lot.id === lotId);
    if (lotIndex === -1) {
      return reject(new Error("Lot not found to update verification."));
    }
    const lot = MOCK_PARKING_LOTS[lotIndex];
    lot.verificationChecks[check] = value;
    setTimeout(() => resolve({ ...lot }), 300);
  });
};

export const approveSubmission = (lotId) => {
  return new Promise((resolve, reject) => {
    const lotIndex = MOCK_PARKING_LOTS.findIndex((lot) => lot.id === lotId);
    if (lotIndex === -1) {
      return reject(new Error("Lot not found to approve."));
    }

    MOCK_PARKING_LOTS[lotIndex].status = "active";
    console.log(`Lot ${lotId} has been manually approved.`);

    setTimeout(() => resolve({ ...MOCK_PARKING_LOTS[lotIndex] }), 300);
  });
};

export const rejectSubmission = (lotId) => {
  return new Promise((resolve, reject) => {
    const initialLength = MOCK_PARKING_LOTS.length;
    MOCK_PARKING_LOTS = MOCK_PARKING_LOTS.filter((lot) => lot.id !== lotId);
    if (MOCK_PARKING_LOTS.length === initialLength) {
      return reject(new Error("Lot not found to reject."));
    }
    setTimeout(() => resolve({ success: true }), 300);
  });
};

export const createBooking = (lotId, spotId, vehicleNumber, paymentMethod) => {
  return new Promise((resolve, reject) => {
    const lotIndex = MOCK_PARKING_LOTS.findIndex((p) => p.id === lotId);
    if (lotIndex === -1) {
      return reject(new Error("Parking lot not found."));
    }
    const lot = MOCK_PARKING_LOTS[lotIndex];
    const spotIndex = lot.spots.findIndex((s) => s.id === spotId);

    if (spotIndex === -1) {
      return reject(new Error("Selected spot not found."));
    }

    const selectedSpot = lot.spots[spotIndex];

    if (selectedSpot.status !== SpotStatus.AVAILABLE) {
      return reject(
        new Error(
          "Sorry, this spot is no longer available. Please select another one."
        )
      );
    }

    // Update spot and lot
    selectedSpot.status = SpotStatus.OCCUPIED;
    lot.availableSpots--;

    const newBooking = {
      id: `BK-${Date.now()}`,
      lotId,
      lotName: lot.name,
      lotLat: lot.lat,
      lotLng: lot.lng,
      spotId: selectedSpot.id,
      vehicleNumber,
      bookingTime: new Date(),
      status: BookingStatus.CONFIRMED,
      paymentMethod,
      rated: false,
    };

    selectedSpot.bookingId = newBooking.id;
    MOCK_BOOKINGS.unshift(newBooking); // Add to our "database"
    setTimeout(() => resolve(newBooking), 1000);
  });
};

export const getBookingsByLotId = (lotId) => {
  return new Promise((resolve) => {
    const bookings = MOCK_BOOKINGS.filter((b) => b.lotId === lotId);
    setTimeout(() => resolve(bookings), 400);
  });
};

export const updateBookingStatus = (bookingId, status) => {
  return new Promise((resolve, reject) => {
    const bookingIndex = MOCK_BOOKINGS.findIndex((b) => b.id === bookingId);
    if (bookingIndex === -1) {
      return reject(new Error("Booking not found"));
    }
    const booking = MOCK_BOOKINGS[bookingIndex];
    booking.status = status;

    const lot = MOCK_PARKING_LOTS.find((l) => l.id === booking.lotId);
    if (lot) {
      const spot = lot.spots.find((s) => s.bookingId === bookingId);
      if (spot) {
        if (status === BookingStatus.ACTIVE) {
          spot.status = SpotStatus.OCCUPIED;
        } else if (
          status === BookingStatus.CANCELLED ||
          status === BookingStatus.COMPLETED
        ) {
          spot.status = SpotStatus.AVAILABLE;
          spot.bookingId = undefined;
        }
      }
    }

    setTimeout(() => resolve(booking), 200);
  });
};

export const getCompletedBookings = () => {
  return new Promise((resolve) => {
    const completed = MOCK_BOOKINGS.filter(
      (b) => b.status === BookingStatus.COMPLETED
    );
    setTimeout(() => resolve([...completed]), 300);
  });
};

export const submitRatingForBooking = (bookingId, lotId, newRating) => {
  return new Promise((resolve, reject) => {
    const lotIndex = MOCK_PARKING_LOTS.findIndex((l) => l.id === lotId);
    if (lotIndex === -1) {
      return reject(new Error("Parking lot not found."));
    }
    const lot = MOCK_PARKING_LOTS[lotIndex];

    const bookingIndex = MOCK_BOOKINGS.findIndex((b) => b.id === bookingId);
    if (bookingIndex === -1) {
      return reject(new Error("Booking not found."));
    }
    const booking = MOCK_BOOKINGS[bookingIndex];
    if (booking.rated) {
      return reject(new Error("This booking has already been rated."));
    }

    // Update lot rating
    const totalRating = lot.rating * lot.reviewCount;
    lot.reviewCount++;
    lot.rating = (totalRating + newRating) / lot.reviewCount;

    // Update booking status
    booking.rated = true;

    setTimeout(() => resolve({ ...booking }), 500);
  });
};
