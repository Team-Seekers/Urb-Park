import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../hooks/useAppContext";
import {
  getParkingLotById,
  addBookingToFirestore,
} from "../services/parkingService";
import Spinner from "../components/Spinner";

const PaymentPage = () => {
  const { booking } = useAppContext();
  const navigate = useNavigate();
  const [lot, setLot] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");

  // Get current user ID (you'll need to implement this based on your auth system)
  const getCurrentUserId = () => {
    // For now, using a mock user ID. Replace this with your actual auth user ID
    return "user123"; // Replace with actual user ID from your auth system
  };

  useEffect(() => {
    if (!booking) {
      navigate("/find");
      return;
    }
    getParkingLotById(booking.lotId)
      .then((data) => {
        if (data) setLot(data);
        else setError("Could not load lot details.");
      })
      .catch(() => setError("Could not load lot details."));
  }, [booking, navigate]);

  const handlePayment = async () => {
    setProcessing(true);
    setError("");

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // After successful payment, store booking in Firestore
      const uid = getCurrentUserId();
      const bookingData = {
        areaId: booking.lotId || "park1",
        slotId: booking.spotId || "s1",
        startTime: new Date("2025-08-31T11:00:00"),
        endTime: new Date("2025-08-31T12:00:00"),
        lotName: booking.lotName,
        vehicleNumber: booking.vehicleNumber,
        paymentMethod: booking.paymentMethod,
      };

      await addBookingToFirestore(uid, bookingData);

      setProcessing(false);
      setPaid(true);

      setTimeout(() => {
        navigate("/ticket");
      }, 2000);
    } catch (error) {
      console.error("Payment or booking storage failed:", error);
      setError("Payment failed. Please try again.");
      setProcessing(false);
    }
  };

  if (!booking || !lot) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  const isPayAsYouGo = booking.paymentMethod === "PAY_AS_YOU_GO";
  const amountToPay = isPayAsYouGo ? 100 : lot.pricePerHour;

  if (paid) {
    return (
      <div className="max-w-md mx-auto text-center bg-white p-12 rounded-lg shadow-xl">
        <div className="text-green-600 mx-auto mb-4 w-24 h-24 flex items-center justify-center rounded-full bg-green-100 animate-pulse">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          Payment Successful!
        </h1>
        <p className="text-lg text-gray-700">
          Your booking is confirmed. Generating your ticket...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-start">
      {/* Order Summary */}
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 border-b pb-4 text-gray-900">
          Order Summary
        </h2>
        <div className="space-y-4 text-gray-700">
          <div className="flex justify-between">
            <span>Parking Lot:</span>
            <span className="font-semibold">{booking.lotName}</span>
          </div>
          <div className="flex justify-between">
            <span>Assigned Spot:</span>
            <span className="font-semibold">{booking.spotId}</span>
          </div>
          <div className="flex justify-between">
            <span>Vehicle Number:</span>
            <span className="font-semibold">{booking.vehicleNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment Method:</span>
            <span className="font-semibold capitalize">
              {booking.paymentMethod.replace("_", " ").toLowerCase()}
            </span>
          </div>
          {isPayAsYouGo && (
            <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm">
              A refundable deposit is required for Pay-as-you-go bookings. This
              amount will be adjusted against your final bill.
            </div>
          )}
          <div className="border-t my-4"></div>
          <div className="flex justify-between text-xl font-bold">
            <span>
              {isPayAsYouGo ? "Deposit Amount:" : "Total (per hour):"}
            </span>
            <span>₹{amountToPay.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 border-b pb-4 text-gray-900">
          Confirm Payment
        </h2>
        <div className="space-y-6">
          <p className="text-gray-600">
            You will be redirected to our secure payment partner, Razorpay, to
            complete your transaction. No card details are required on this
            site.
          </p>
          <div className="pt-4">
            <button
              onClick={handlePayment}
              disabled={processing}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
            >
              {processing
                ? "Processing..."
                : `Proceed to Pay ₹${amountToPay.toFixed(2)}`}
            </button>
          </div>
          {error && (
            <p className="text-red-500 text-sm text-center mt-2">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
