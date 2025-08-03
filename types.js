export const SpotStatus = {
  AVAILABLE: "available",
  UNAVAILABLE: "unavailable", // Manually set by manager for maintenance, etc.
  RESERVED: "reserved", // Manually set by manager
  OCCUPIED: "occupied", // Set by a booking
};

export const BookingStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  ACTIVE: "ACTIVE", // User has arrived
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

/**
 * @typedef {Object} Spot
 * @property {string} id
 * @property {string} status
 * @property {string} [bookingId]
 */

/**
 * @typedef {Object} VerificationChecks
 * @property {boolean} cameraFixed
 * @property {boolean} apiIntegrated
 * @property {boolean} rehearsalComplete
 */

/**
 * @typedef {Object} Booking
 * @property {string} id
 * @property {string} lotId
 * @property {string} lotName
 * @property {string} spotId
 * @property {string} vehicleNumber
 * @property {Date} bookingTime
 * @property {string} status
 * @property {string} paymentMethod
 * @property {boolean} rated
 */

/**
 * @typedef {Object} ParkingLot
 * @property {string} id
 * @property {string} name
 * @property {string} address
 * @property {number} lat
 * @property {number} lng
 * @property {number} distance
 * @property {number} totalSpots
 * @property {number} availableSpots
 * @property {number} pricePerHour
 * @property {number} rating
 * @property {number} reviewCount
 * @property {string[]} features
 * @property {string} image
 * @property {Spot[]} spots
 * @property {string} status
 * @property {string} ownerId
 * @property {VerificationChecks} verificationChecks
 */

/**
 * @typedef {Object} SecurityEvent
 * @property {string} id
 * @property {Date} timestamp
 * @property {('ENTRY'|'EXIT_OK'|'ALERT_WRONG_SPOT'|'ALERT_MISMATCH')} type
 * @property {string} message
 * @property {('info'|'warning'|'critical')} level
 */
