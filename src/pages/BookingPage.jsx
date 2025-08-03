import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getParkingLotById, createBooking } from "../services/parkingService";
import { useAppContext } from "../hooks/useAppContext";
import Spinner from "../components/Spinner";
import Rating from "../components/Rating";
import { ICONS } from "../constants";
import SpotSelectionGrid from "../components/SpotSelectionGrid";

const BookingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setBooking } = useAppContext();
  const [lot, setLot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("PREPAID");
  const [vehicleNumber, setVehicleNumber] = useState("");

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
        const data = await getParkingLotById(id);
        if (data) {
          setLot(data);
        } else {
          setError("Parking lot not found.");
        }
      } catch (err) {
        setError("Failed to fetch parking lot data.");
      } finally {
        if (showLoadingSpinner) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchLotData(true);
  }, [fetchLotData]);

  const handleSelectSpot = (spotId) => {
    setSelectedSpotId((prev) => (prev === spotId ? null : spotId));
    setError(""); // Clear any previous errors on new selection
  };

  const handleBooking = async () => {
    if (!id || !lot || !selectedSpotId || !vehicleNumber) return;

    setIsBooking(true);
    setError("");
    try {
      const newBooking = await createBooking(
        id,
        selectedSpotId,
        vehicleNumber,
        paymentMethod
      );
      setBooking(newBooking);
      navigate("/payment");
    } catch (err) {
      const errorMessage = err.message || "An error occurred during booking.";
      setError(errorMessage);
      // If spot was taken, refresh lot data to show updated availability and deselect
      if (errorMessage.includes("no longer available")) {
        setSelectedSpotId(null);
        fetchLotData(false); // Refresh without showing main spinner
      }
      setIsBooking(false);
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
    buttonText = "Processing...";
  } else if (lot.availableSpots <= 0) {
    buttonText = "Lot Full";
  } else if (!selectedSpotId) {
    buttonText = "Select a Spot to Continue";
  } else if (!vehicleNumber.trim()) {
    buttonText = "Enter Vehicle Number";
  }

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
                ₹{lot.pricePerHour.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold text-gray-600">
                Available Spots:
              </span>
              <span className="font-bold text-xl">
                {lot.availableSpots} / {lot.totalSpots}
              </span>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="font-semibold text-lg mb-3">Features:</h3>
            <div className="flex flex-wrap gap-2">
              {lot.features.map((feature) => (
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
            <h3 className="font-semibold text-lg mb-4">Select Your Spot</h3>
            {lot.availableSpots > 0 ? (
              <SpotSelectionGrid
                spots={lot.spots}
                selectedSpotId={selectedSpotId}
                onSelectSpot={handleSelectSpot}
              />
            ) : (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg">
                <p className="font-bold">This lot is currently full.</p>
                <p className="text-sm">
                  Please check back later or find another location.
                </p>
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
                required
              />
            </div>
          </div>

          <div className="mt-8 border-t pt-6">
            <h3 className="font-semibold text-lg mb-3">Payment Method</h3>
            <div className="grid grid-cols-2 gap-4">
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
              <button
                onClick={() => setPaymentMethod("PAY_AS_YOU_GO")}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  paymentMethod === "PAY_AS_YOU_GO"
                    ? "border-green-600 bg-green-50 ring-2 ring-green-600"
                    : "border-gray-300 hover:border-green-600"
                }`}
              >
                <span className="font-bold">Pay-as-you-go</span>
                <p className="text-sm text-gray-500">Pay at the location.</p>
              </button>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={handleBooking}
              disabled={
                isBooking ||
                !selectedSpotId ||
                lot.availableSpots <= 0 ||
                !vehicleNumber.trim()
              }
              className="w-full bg-green-600 text-white font-bold py-4 px-6 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-xl"
            >
              {buttonText}
            </button>
            {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
          </div>
        </div>
        <div className="hidden md:block md:col-span-2">
          <img
            src={lot.image.replace("400/300", "800/1200")}
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
