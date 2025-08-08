import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  fetchParkingAreaById, 
  bookParkingSlot, 
  fetchSlotsForParkingArea, 
  getSlotStatusForTime,
  subscribeToSlotAvailability
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
  const { setBooking, user } = useAppContext();
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
          // Fetch slots for this parking area
          setIsLoadingSlots(true);
          const slotData = await fetchSlotsForParkingArea(id);
          setSlots(slotData);
          console.log("Parking area data:", data);
          console.log("Slot data:", slotData);
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

  const handleSelectSpot = (spotId) => {
    const slotStatus = slotStatusMap[spotId];
    if (slotStatus === "booked") {
      toast.warn("This slot is not available for the selected time period.");
      return;
    }
    
    setSelectedSpotId((prev) => (prev === spotId ? null : spotId));
    setError(""); // Clear any previous errors on new selection
  };

  // Calculate slot availability based on selected time - FIXED VERSION
  const calculateSlotAvailability = useCallback(() => {
    console.log("Calculating slot availability...", { slots, startTime, endTime, totalSpots: lot?.totalSpots });
    
    // Show loading state while calculating
    setIsLoadingSlots(true);
    
    const newStatusMap = {};
    
    // Generate all possible slot IDs first
    if (lot && lot.totalSpots) {
      for (let i = 1; i <= lot.totalSpots; i++) {
        const slotId = `slot${i}`;
        newStatusMap[slotId] = "available"; // Default to available
      }
    }
    
    // If we have slot booking data, check each slot's availability
    if (slots && Object.keys(slots).length > 0) {
      Object.keys(slots).forEach(slotId => {
        const slotBookings = slots[slotId] || [];
        console.log(`Checking slot ${slotId}:`, slotBookings);
        
        // Use the service function to determine status
        const status = getSlotStatusForTime(slotBookings, startTime, endTime);
        console.log(`Slot ${slotId} status:`, status);
        
        newStatusMap[slotId] = status;
      });
    }
    
    console.log("Final slot status map:", newStatusMap);
    setSlotStatusMap(newStatusMap);
    setIsLoadingSlots(false);
  }, [slots, startTime, endTime, lot]);

  // Update slot availability when dependencies change - FIXED
  useEffect(() => {
    // Only calculate if we have lot data
    if (lot && startTime && endTime) {
      console.log("Dependencies changed, recalculating availability...");
      calculateSlotAvailability();
    }
  }, [lot, slots, startTime, endTime, calculateSlotAvailability]);

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

  const handleBooking = async () => {
    if (!id || !lot || !selectedSpotId || !vehicleNumber) return;

    // Double-check slot availability before booking
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
      const bookingData = {
        userId: user?.uid || "guest",
        vehicleNumber: vehicleNumber.toUpperCase(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        paymentComplete: paymentMethod === "PREPAID",
        status: "active"
      };

      const result = await bookParkingSlot(id, selectedSpotId, bookingData);
      
      if (result.success) {
        setBooking({
          lotId: id,
          slotId: selectedSpotId,
          vehicleNumber: vehicleNumber.toUpperCase(),
          paymentMethod: paymentMethod,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        });
        
        toast.success("Slot booked successfully! Redirecting to payment...");
        navigate("/payment");
      } else {
        setError(result.message || "Booking failed.");
        toast.error(result.message || "Booking failed.");
      }
    } catch (err) {
      const errorMessage = err.message || "An error occurred during booking.";
      setError(errorMessage);
      
      // Show appropriate toast message for concurrent booking
      if (errorMessage.includes("booked just now by another user")) {
        toast.error("This slot was just booked by another user. Please select a different slot.");
        setSelectedSpotId(null);
      } else {
        toast.error(errorMessage);
      }
      
      // Refresh data to get latest availability
      fetchLotData(false);
    } finally {
      setIsBooking(false);
    }
  };

  // Handle start time change with validation - IMPROVED
  const handleStartTimeChange = (date) => {
    if (!date) return;
    
    console.log("Start time changing to:", date);
    setStartTime(date);
    
    // Ensure end time is always after start time (minimum 1 hour)
    if (date && endTime && date >= endTime) {
      const newEndTime = new Date(date.getTime() + 60 * 60 * 1000);
      console.log("Adjusting end time to:", newEndTime);
      setEndTime(newEndTime);
    }
    
    // Clear selected spot when time changes
    if (selectedSpotId) {
      console.log("Clearing selected spot due to time change");
      setSelectedSpotId(null);
    }
  };

  // Handle end time change with validation - IMPROVED
  const handleEndTimeChange = (date) => {
    if (!date) return;
    
    console.log("End time changing to:", date);
    
    // Ensure end time is at least 1 hour after start time
    const minEndTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    if (date < minEndTime) {
      toast.warn("End time must be at least 1 hour after start time.");
      setEndTime(minEndTime);
    } else {
      setEndTime(date);
    }
    
    // Clear selected spot when time changes
    if (selectedSpotId) {
      console.log("Clearing selected spot due to time change");
      setSelectedSpotId(null);
    }
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

  if (loading) return <Spinner />;
  if (!lot)
    return (
      <p className="text-center text-red-500">
        {error || "Could not load parking lot details."}
      </p>
    );

  let buttonText = "Proceed to Payment";
  if (isBooking) {
    buttonText = "Processing...";
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

  const availableSlots = Object.values(slotStatusMap).filter(status => status === "available").length;

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
      <div className="grid md:grid-cols-5">
        <div className="md:col-span-3 p-8 md:p-12">
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
                {availableSlots} / {lot.totalSpots || 0}
                {isLoadingSlots && <span className="text-sm text-blue-500 ml-2">Checking...</span>}
              </span>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="font-semibold text-lg mb-3">Features:</h3>
            <div className="flex flex-wrap gap-2">
              {(lot.features || []).map((feature) => (
                <span
                  key={feature}
                  className="bg-green-100 text-green-600 text-sm font-medium px-3 py-1 rounded-full"
                >
                  {feature}
                </span>
              ))}
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
                  onChange={handleStartTimeChange}
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
                  onChange={handleEndTimeChange}
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
        <div className="hidden md:block md:col-span-2">
          <img
            src={lot.image?.replace("400/300", "800/1200") || "https://picsum.photos/800/1200"}
            alt={lot.name}
            className="w-full h-full object-cover"
          />
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