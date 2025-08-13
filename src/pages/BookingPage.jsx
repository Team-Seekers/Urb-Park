import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  fetchParkingAreaById, 
  bookParkingSlot, 
  fetchSlotsForParkingArea, 
  getSlotStatusForTime,
  subscribeToSlotAvailability,
  getSlotAvailabilityWithBookings,
  getSlotBookings
} from "../services/parkingService";
import { useAppContext } from "../hooks/useAppContext";
import Spinner from "../components/Spinner";
import Rating from "../components/Rating";
import { ICONS } from "../constants";
import SpotSelectionGrid from "../components/SpotSelectionGrid";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "react-toastify";

// Calculate total price for selected time period
export const calculateTotalPrice = (lot, startTime, endTime) => {
  console.log(`${lot?.pricePerHour}, ${startTime}, ${endTime} testing`);
  
  const hoursDiff = (endTime - startTime) / (1000 * 60 * 60);
  const totalPrice = (lot?.pricePerHour || 0) * hoursDiff;
  return totalPrice.toFixed(2);
};

const BookingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setBooking, user, addNotification } = useAppContext();
  const [lot, setLot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("PREPAID");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [slots, setSlots] = useState({});
  const [slotStatusMap, setSlotStatusMap] = useState({});
  const [realtimeUnsubscribe, setRealtimeUnsubscribe] = useState(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [actualSlotsFromDB, setActualSlotsFromDB] = useState([]); // Track actual slots from database

  // Set initial start time to current time (rounded to next hour)
  const getInitialStartTime = () => {
    const now = new Date();
    now.setMinutes(0, 0, 0); // Round to the hour
    now.setHours(now.getHours() + 1); // Start from next hour
    return now;
  };
  
  const initialStartTime = getInitialStartTime();
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(new Date(initialStartTime.getTime() + 60 * 60 * 1000)); // 1 hour from start

  const fetchLotData = useCallback(
    async (showLoadingSpinner = false) => {
      if (!id) {
        setError("Invalid parking lot ID.");
        if (showLoadingSpinner) setLoading(false);
        return;
      }
      if (showLoadingSpinner) setLoading(true);
      setError("");
      try {
        const data = await fetchParkingAreaById(id);
        if (data) {
          setLot(data);
          // Store actual slots from database
          setActualSlotsFromDB(data.slots || []);
          // Fetch slots for this parking area
          setIsLoadingSlots(true);
          const slotData = await fetchSlotsForParkingArea(id);
          setSlots(slotData);
          console.log("Parking area data:", data);
          console.log("Slot data:", slotData);
          console.log("Actual slots from DB:", data.slots);
        } else {
          setError("Parking lot not found.");
        }
      } catch (err) {
        console.error("Error fetching lot data:", err);
        setError("Failed to fetch parking lot data.");
      } finally {
        if (showLoadingSpinner) setLoading(false);
        setIsLoadingSlots(false);
      }
    },
    [id]
  );

  // Setup real-time subscription for slot updates
  useEffect(() => {
    if (id) {
      const unsubscribe = subscribeToSlotAvailability(id, (updatedSlots) => {
        console.log("Real-time slot update received:", updatedSlots);
        setSlots(updatedSlots);
      });
      
      setRealtimeUnsubscribe(() => unsubscribe);
      
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  }, [id]);

  useEffect(() => {
    fetchLotData(true);
  }, [fetchLotData]);

  // Initial slot availability check when component loads
  useEffect(() => {
    if (lot && startTime && endTime) {
      handleTimeChange(startTime, endTime);
    }
  }, [lot]); // Only run when lot data is loaded initially

  const handleSelectSpot = (spotId) => {
    const slotStatus = slotStatusMap[spotId];
    if (slotStatus === "booked") {
      toast.warn("This slot is not available for the selected time period.");
      return;
    }
    
    setSelectedSpotId((prev) => (prev === spotId ? null : spotId));
    setError(""); // Clear any previous errors on new selection
  };

  // Clear selected spot if it becomes unavailable - IMPROVED
  useEffect(() => {
    if (selectedSpotId) {
      const currentStatus = slotStatusMap[selectedSpotId];
      console.log(`Selected spot ${selectedSpotId} current status:`, currentStatus);
      
      if (currentStatus === "booked" || currentStatus === "maintenance") {
        console.log("Selected spot became unavailable, clearing selection");
        setSelectedSpotId(null);
        toast.info("Your selected slot became unavailable. Please select another slot.");
      }
    }
  }, [selectedSpotId, slotStatusMap]);

  // Debug: Log time changes
  useEffect(() => {
    console.log("Time changed - Start:", startTime, "End:", endTime);
    console.log("Hours diff:", (endTime - startTime) / (1000 * 60 * 60));
  }, [startTime, endTime]);

  // Calculate total price for selected time period
  const calculateTotalPrice = () => {
    console.log(`Price: ${lot?.pricePerHour}, Start: ${startTime}, End: ${endTime}`);
  
    const hoursDiff = (endTime - startTime) / (1000 * 60 * 60);
    console.log(`Hours difference: ${hoursDiff}`);
    
    const totalPrice = (lot?.pricePerHour || 0) * hoursDiff;
    console.log(`Total price: ${totalPrice}`);
    
    return totalPrice.toFixed(2);
  };

  // Generate spots array for the grid based on totalSpots
  const generateSpotsArray = () => {
    if (!lot) return [];
    
    const totalSpots = lot.totalSpots || 20;
    const spots = [];
    
    for (let i = 1; i <= totalSpots; i++) {
      const slotId = `slot${i}`;
      spots.push({
        id: slotId,
        status: slotStatusMap[slotId] || "available"
      });
    }
    
    return spots;
  };

  // Calculate available slots based on slotStatusMap (which includes all slots up to totalSpots)
  const getActualAvailableSlots = () => {
    if (!lot || !lot.totalSpots) return 0;
    
    let availableCount = 0;
    for (let i = 1; i <= lot.totalSpots; i++) {
      const slotId = `slot${i}`;
      const slotStatus = slotStatusMap[slotId];
      if (slotStatus === "available" || slotStatus === undefined) {
        availableCount++;
      }
    }
    
    return availableCount;
  };

  // Get total slots count from lot.totalSpots
  const getActualTotalSlots = () => {
    return lot ? (lot.totalSpots || 0) : 0;
  };

  // Check if booking is valid
  const isBookingValid = () => {
    return (
      selectedSpotId &&
      vehicleNumber.trim() &&
      startTime < endTime &&
      slotStatusMap[selectedSpotId] === "available" &&
      !isBooking &&
      !isLoadingSlots
    );
  };

  const handleBooking = async () => {
    if (!id || !lot || !selectedSpotId || !vehicleNumber) return;

    // Double-check slot availability before proceeding to payment
    const currentStatus = slotStatusMap[selectedSpotId];
    if (currentStatus !== "available") {
      setError("Selected slot is no longer available. Please choose another slot.");
      toast.error("Selected slot is no longer available. Please choose another slot.");
      setSelectedSpotId(null);
      return;
    }

    setIsBooking(true);
    setError("");
    
    try {
      // Set booking context without storing in database yet
      // The actual booking will be stored in database only after successful payment
      setBooking({
        lotId: id,
        slotId: selectedSpotId,
        vehicleNumber: vehicleNumber.toUpperCase(),
        paymentMethod: paymentMethod,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        lotName: lot.name,
        lotAddress: lot.address,
        pricePerHour: lot.pricePerHour
      });
         
      toast.success("Redirecting to payment...");
      addNotification(`Preparing payment for ${lot.name} - Slot ${selectedSpotId}`);
      navigate("/payment");
    } catch (err) {
      const errorMessage = err.message || "An error occurred while preparing payment.";
      setError(errorMessage);
      toast.error(errorMessage);
      
      // If slot is no longer available, clear selection
      if (errorMessage.includes("no longer available")) {
        setSelectedSpotId(null);
      }
    } finally {
      setIsBooking(false);
    }
  };

  // Handle time change - reads slot data from Firestore to determine availability
  const handleTimeChange = async (newStartTime, newEndTime) => {
    if (!id || !newStartTime || !newEndTime) return;
    
    setIsLoadingSlots(true);
    setError("");
    
    try {
      // Fetch all slots for this parking area
      const parkingArea = await fetchParkingAreaById(id);
      if (!parkingArea) {
        console.error("No parking area found");
        return;
      }

      const newStatusMap = {};
      const slots = parkingArea.slots || [];
      
      // Update actual slots from database
      setActualSlotsFromDB(slots);
      
      // Check each slot's availability based on time conflicts
      for (const slot of slots) {
        const slotId = slot.slotId;
        const bookings = slot.bookings || [];
        let isAvailable = true;
        
        // Check if any existing booking conflicts with the new time range
        for (const booking of bookings) {
          let bookingStart, bookingEnd;
          
          // Handle Firestore Timestamps
          if (booking.startTime && typeof booking.startTime.toDate === 'function') {
            bookingStart = booking.startTime.toDate();
          } else if (booking.startTime) {
            bookingStart = new Date(booking.startTime);
          } else {
            continue; // Skip bookings without start time
          }
          
          if (booking.endTime && typeof booking.endTime.toDate === 'function') {
            bookingEnd = booking.endTime.toDate();
          } else if (booking.endTime) {
            bookingEnd = new Date(booking.endTime);
          } else {
            continue; // Skip bookings without end time
          }
          
          // Check for time conflict: if new booking overlaps with existing booking
          // Conflict occurs if:
          // 1. New start time is before existing end time AND new end time is after existing start time
          if (newStartTime < bookingEnd && newEndTime > bookingStart) {
            isAvailable = false;
            break;
          }
        }
        
        newStatusMap[slotId] = isAvailable ? "available" : "booked";
      }
      
      // Generate slots for any missing slot IDs (in case totalSpots > existing slots)
      if (parkingArea.totalSpots) {
        for (let i = 1; i <= parkingArea.totalSpots; i++) {
          const slotId = `slot${i}`;
          if (!newStatusMap[slotId]) {
            newStatusMap[slotId] = "available";
          }
        }
      }
      
      setSlotStatusMap(newStatusMap);
      console.log("Updated slot status map:", newStatusMap);
      
    } catch (error) {
      console.error("Error checking slot availability:", error);
      setError("Failed to check slot availability. Please try again.");
    } finally {
      setIsLoadingSlots(false);
    }
  };

  if (loading) return <Spinner />;
  if (!lot)
    return (
      <p className="text-center text-red-500">
        {error || "Could not load parking lot details."}
      </p>
    );

  let buttonText = "Proceed to Payment";
  if (isBooking) {
    buttonText = "Preparing Payment...";
  } else if (isLoadingSlots) {
    buttonText = "Loading availability...";
  } else if (!selectedSpotId) {
    buttonText = "Select a Spot to Continue";
  } else if (!vehicleNumber.trim()) {
    buttonText = "Enter Vehicle Number";
  } else if (startTime >= endTime) {
    buttonText = "Invalid time range";
  } else if (slotStatusMap[selectedSpotId] === "booked") {
    buttonText = "Selected slot is unavailable";
  }

  // Use actual slots count from database
  const availableSlots = getActualAvailableSlots();
  const totalSlots = getActualTotalSlots();

  // Debug: Log features data
  console.log("BookingPage - lot features:", lot?.features, "type:", typeof lot?.features);

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
      <div className="">
        <div className=" p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{lot.name}</h1>
          <div className="text-gray-600 mb-4 flex items-center">
            {ICONS.LOCATION}
            {lot.address}
          </div>
          <Rating rating={lot.rating} />

          <div className="mt-8 space-y-4 border-t pt-6">
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold text-gray-600">
                Price per Hour:
              </span>
              <span className="text-green-600 font-bold text-2xl">
                ₹{lot.pricePerHour?.toFixed(2) || "0.00"}
              </span>
            </div>
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold text-gray-600">
                Total for Selected Time:
              </span>
              <span className="text-green-600 font-bold text-2xl">
                ₹{calculateTotalPrice()}
              </span>
            </div>
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold text-gray-600">
                Available Spots:
              </span>
              <span className="font-bold text-xl">
                {availableSlots} / {totalSlots}
                {isLoadingSlots && <span className="text-sm text-blue-500 ml-2">Checking...</span>}
              </span>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="font-semibold text-lg mb-3">Features:</h3>
            <div className="flex flex-wrap gap-2">
              {lot.features && Array.isArray(lot.features) && lot.features.length > 0 ? (
                lot.features.map((feature, index) => (
                  <span
                    key={index}
                    className="bg-green-100 text-green-600 text-sm font-medium px-3 py-1 rounded-full"
                  >
                    {feature}
                  </span>
                ))
              ) : lot.features && typeof lot.features === 'string' ? (
                lot.features.split(',').map((feature, index) => (
                  <span
                    key={index}
                    className="bg-green-100 text-green-600 text-sm font-medium px-3 py-1 rounded-full"
                  >
                    {feature.trim()}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 text-sm">No features available</span>
              )}
            </div>
          </div>

          <div className="mt-8 border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">Select Date & Time</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <DatePicker
                  selected={startTime}
                  onChange={(date) => {
                    if (!date) return;
                    setStartTime(date);
                    
                    // Ensure end time is always after start time (minimum 1 hour)
                    let newEndTime = endTime;
                    if (date && endTime && date >= endTime) {
                      newEndTime = new Date(date.getTime() + 60 * 60 * 1000);
                      setEndTime(newEndTime);
                    }
                    
                    // Clear selected spot when time changes
                    if (selectedSpotId) {
                      setSelectedSpotId(null);
                    }
                    
                    // Update slot availability
                    handleTimeChange(date, newEndTime);
                  }}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={60} // 1 hour intervals
                  dateFormat="MMMM d, yyyy h:mm aa"
                  minDate={new Date()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 cursor-pointer"
                  placeholderText="Select start time"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <DatePicker
                  selected={endTime}
                  onChange={(date) => {
                    if (!date) return;
                    
                    // Ensure end time is at least 1 hour after start time
                    const minEndTime = new Date(startTime.getTime() + 60 * 60 * 1000);
                    if (date < minEndTime) {
                      toast.warn("End time must be at least 1 hour after start time.");
                      setEndTime(minEndTime);
                      handleTimeChange(startTime, minEndTime);
                    } else {
                      setEndTime(date);
                      handleTimeChange(startTime, date);
                    }
                    
                    // Clear selected spot when time changes
                    if (selectedSpotId) {
                      setSelectedSpotId(null);
                    }
                  }}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={60} // 1 hour intervals
                  dateFormat="MMMM d, yyyy h:mm aa"
                  minDate={startTime ? new Date(startTime.getTime() + 60 * 60 * 1000) : new Date()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 cursor-pointer"
                  placeholderText="Select end time"
                />
              </div>
            </div>
            
            <h3 className="font-semibold text-lg mb-4">Select Your Spot</h3>
            <div className="mb-4 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <span className="font-medium">🔄 Real-time Updates:</span> Slot availability updates automatically. 
              Red slots are booked for your selected time period.
            </div>
            
            {availableSlots > 0 ? (
              <SpotSelectionGrid
                spots={generateSpotsArray()}
                selectedSpotId={selectedSpotId}
                onSelectSpot={handleSelectSpot}
                statusMap={slotStatusMap}
                isLoading={isLoadingSlots}
                startTime={startTime}
                endTime={endTime}
              />
            ) : (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg">
                {isLoadingSlots ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-2"></div>
                    <p className="font-bold">Checking availability...</p>
                  </div>
                ) : (
                  <>
                    <p className="font-bold">All slots are booked for the selected time period.</p>
                    <p className="text-sm">
                      Please select a different time or check back later.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 border-t pt-6">
            <h3 className="font-semibold text-lg mb-3">Vehicle Information</h3>
            <div className="bg-gray-100 p-4 rounded-lg">
              <label
                htmlFor="vehicleNumber"
                className="block text-sm font-medium text-gray-700"
              >
                Vehicle Registration Number
              </label>
              <input
                type="text"
                id="vehicleNumber"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="E.G., ABC-1234"
                maxLength={15}
                required
              />
            </div>
          </div>

          <div className="mt-8 border-t pt-6">
            <h3 className="font-semibold text-lg mb-3">Payment Method</h3>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setPaymentMethod("PREPAID")}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  paymentMethod === "PREPAID"
                    ? "border-green-600 bg-green-50 ring-2 ring-green-600"
                    : "border-gray-300 hover:border-green-600"
                }`}
              >
                <span className="font-bold">Prepaid</span>
                <p className="text-sm text-gray-500">Pay now securely.</p>
              </button>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-blue-700 text-sm">
                💳 <strong>Payment First:</strong> Your slot will be reserved only after successful payment
              </p>
            </div>
            
            <button
              onClick={handleBooking}
              disabled={!isBookingValid()}
              className="w-full bg-green-600 text-white font-bold py-4 px-6 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-xl"
            >
              {buttonText}
            </button>
            {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
            
            {selectedSpotId && slotStatusMap[selectedSpotId] === "available" && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-green-700 font-medium">
                  Slot {selectedSpotId.replace("slot", "")} selected for {((endTime - startTime) / (1000 * 60 * 60)).toFixed(1)} hour(s)
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="hidden md:block ">
          {/* <img
            src={lot.image?.replace("400/300", "800/1200") || "https://picsum.photos/800/1200"}
            alt={lot.name}
            className="w-full h-full object-cover"
          /> */}
        </div>
      </div>
      <div className="bg-gray-50 p-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          Location Information
        </h2>
        <div className="w-full h-60 rounded-lg shadow-md border bg-gray-200 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 font-semibold mb-2">📍 {lot.address}</p>
            <p className="text-sm text-gray-400">
              Directions will be available after payment confirmation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;