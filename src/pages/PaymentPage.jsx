import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../hooks/useAppContext";
import {
  getParkingLotById,
  addBookingToUserHistory,
} from "../services/parkingService";
import { initializePayment } from "../services/razorpayService";
import Spinner from "../components/Spinner";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PaymentPage = () => {
  const { booking, user } = useAppContext();
  const navigate = useNavigate();
  const [lot, setLot] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");

  // Get current user ID from context
  const getCurrentUserId = () => {
    return user?.uid;
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
      const uid = getCurrentUserId();
      if (!uid) {
        throw new Error("User not authenticated");
      }

      const amountToPay = isPayAsYouGo ? 100 : lot.pricePerHour;
      
      // Prepare booking data for Razorpay
      const bookingData = {
        lotName: booking.lotName,
        lotId: booking.lotId,
        spotId: booking.spotId,
        vehicleNumber: booking.vehicleNumber,
        customerName: user?.displayName || "Customer",
        customerEmail: user?.email || "customer@example.com",
        customerPhone: user?.phoneNumber || "",
        amount: amountToPay,
        uid: uid,
      };

      // Initialize Razorpay payment
      await initializePayment(
        amountToPay,
        bookingData,
        // Success callback
        async (paymentResponse, bookingData) => {
          try {
            // Payment successful - now add to database
            const dbBookingData = {
              areaId: bookingData.lotId,
              slotId: bookingData.spotId,
              startTime: new Date(),
              endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
              paymentId: paymentResponse.razorpay_payment_id,
              orderId: paymentResponse.razorpay_order_id,
            };

            await addBookingToUserHistory(bookingData.uid, dbBookingData);
            
            setProcessing(false);
            setPaid(true);
            toast.success("Payment successful! Booking confirmed.");

            setTimeout(() => {
              navigate("/ticket");
            }, 2000);
          } catch (error) {
            console.error("Failed to save booking to database:", error);
            toast.error("Payment successful but failed to save booking. Please contact support.");
            setProcessing(false);
          }
        },
        // Failure callback
        (errorMessage) => {
          console.error("Payment failed:", errorMessage);
          setError(errorMessage);
          setProcessing(false);
          toast.error(errorMessage);
        }
      );

    } catch (error) {
      console.error("Payment initialization failed:", error);
      setError("Failed to initialize payment. Please try again.");
      setProcessing(false);
      toast.error("Failed to initialize payment. Please try again.");
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
    <>
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
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
};

export default PaymentPage;
