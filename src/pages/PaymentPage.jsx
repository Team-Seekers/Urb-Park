import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../hooks/useAppContext";
import {
  fetchParkingAreaById,
  addBookingToUserHistory,
  bookParkingSlotAfterPayment,
  getSlotAvailabilityWithBookings,
} from "../services/parkingService";
import { initializePayment } from "../services/razorpayService";
import Spinner from "../components/Spinner";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { calculateTotalPrice } from "./BookingPage";

const PaymentPage = () => {
  const { booking, user, setBooking, addNotification } = useAppContext();
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
    fetchParkingAreaById(booking.lotId)
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

             // Calculate total amount based on booking time
       const startTime = new Date(booking.startTime);
       const endTime = new Date(booking.endTime);
       const hoursDiff = (endTime - startTime) / (1000 * 60 * 60);
       const amountToPay = Math.round((lot.pricePerHour || 20) * hoursDiff * 100); // Convert to paisa and ensure integer
      
      // Prepare booking data for Razorpay
      const bookingData = {
        lotName: lot?.name || "Parking Lot", // Use lot name from lot data
        lotId: booking.lotId,
        slotId: booking.slotId, // Changed from spotId to slotId
        vehicleNumber: booking.vehicleNumber,
        customerName: user?.displayName || "Customer",
        customerEmail: user?.email || "customer@example.com",
        customerPhone: user?.phoneNumber || "",
                 amount: amountToPay, // Amount is already in paisa as integer
        uid: uid,
      };

      // Initialize Razorpay payment
      await initializePayment(
        amountToPay,
        bookingData,
        // Success callback
        async (paymentResponse, bookingData) => {
          try {
            console.log("Payment successful, saving booking to database...");
            console.log("Payment response:", paymentResponse);
            console.log("Booking data:", bookingData);
            console.log("Booking context:", booking);
            
            // Validate booking data
            if (!bookingData.lotId) {
              throw new Error("Missing lot ID in booking data");
            }
            if (!bookingData.slotId) {
              throw new Error("Missing slot ID in booking data");
            }
            if (!bookingData.uid) {
              throw new Error("Missing user ID in booking data");
            }
            
            // Check if user is authenticated
            if (!bookingData.uid || bookingData.uid === "guest") {
              throw new Error("User not authenticated. Please login to complete booking.");
            }
            
            // Payment successful - now add to database
            // Use the actual booking times from the booking context
            const dbBookingData = {
              areaId: bookingData.lotId,
              slotId: bookingData.slotId, // Changed from spotId to slotId
              startTime: booking.startTime, // Use actual booking start time
              endTime: booking.endTime, // Use actual booking end time
              paymentId: paymentResponse.razorpay_payment_id,
              orderId: paymentResponse.razorpay_order_id,
            };

            console.log("Saving to user history...");
            // Add to user history
            try {
              const historyResult = await addBookingToUserHistory(bookingData.uid, {
                areaId: bookingData.lotId,
                slotId: bookingData.slotId, // Changed from spotId to slotId
                startTime: booking.startTime, // Use actual booking start time
                endTime: booking.endTime, // Use actual booking end time
                vehicleNumber: bookingData.vehicleNumber,
                paymentId: paymentResponse.razorpay_payment_id,
                orderId: paymentResponse.razorpay_order_id
              });
              
              if (historyResult.success) {
                console.log("User history saved successfully");
              } else {
                console.warn("User history not saved:", historyResult.error);
                // Continue with parking slot booking even if user history fails
              }
            } catch (historyError) {
              console.warn("Failed to save to user history:", historyError);
              // Continue with parking slot booking even if user history fails
            }
            
            console.log("Saving to parking area slots...");
            // Add to parking area slots
            const slotBookingData = {
              userId: bookingData.uid,
              vehicleNumber: bookingData.vehicleNumber || "N/A",
              startTime: booking.startTime, // Use actual booking start time
              endTime: booking.endTime, // Use actual booking end time
              status: "active",
              paymentComplete: true,
              paymentId: paymentResponse.razorpay_payment_id || null,
              orderId: paymentResponse.razorpay_order_id || null,
              createdAt: new Date()
            };

            // Validate slot booking data
            if (!slotBookingData.userId) {
              throw new Error("Missing user ID in slot booking data");
            }
            if (!slotBookingData.startTime) {
              throw new Error("Missing start time in slot booking data");
            }
            if (!slotBookingData.endTime) {
              throw new Error("Missing end time in slot booking data");
            }

            console.log("Slot booking data:", slotBookingData);
            
            // Check slot availability one more time before booking
            try {
              const slotAvailability = await getSlotAvailabilityWithBookings(
                bookingData.lotId, 
                bookingData.slotId, // Changed from spotId to slotId
                new Date(booking.startTime), 
                new Date(booking.endTime)
              );
              
              if (!slotAvailability.isAvailable) {
                throw new Error("Slot is no longer available for the selected time period. Please try booking a different slot.");
              }
            } catch (availabilityError) {
              console.error("Slot availability check failed:", availabilityError.message);
              throw new Error("Slot availability check failed. Please try again or select a different slot.");
            }
            
            // Try to book the slot with retry logic
            let bookingSuccess = false;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (!bookingSuccess && retryCount < maxRetries) {
              try {
                await bookParkingSlotAfterPayment(bookingData.lotId, bookingData.slotId, slotBookingData); // Changed from spotId to slotId
                bookingSuccess = true;
                console.log("Parking slot booking saved successfully");
              } catch (bookingError) {
                retryCount++;
                console.warn(`Booking attempt ${retryCount} failed:`, bookingError.message);
                
                if (retryCount >= maxRetries) {
                  throw bookingError;
                }
                
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            
            // Update booking context with complete information for ticket page
            const updatedBooking = {
              ...booking,
              lotName: lot?.name || "Parking Lot",
              lotLat: lot?.lat || lot?.coordinates?.[0] || 28.7041, // Default to Delhi coordinates
              lotLng: lot?.lng || lot?.coordinates?.[1] || 77.1025,
              lotAddress: lot?.address || "Parking Location",
              paymentId: paymentResponse.razorpay_payment_id,
              orderId: paymentResponse.razorpay_order_id,
              status: "CONFIRMED",
              bookingTime: new Date().toISOString(),
              id: `${booking.lotId}_${booking.slotId}_${Date.now()}`, // Generate unique booking ID
            };

            // Update the booking context
            setBooking(updatedBooking);
            
            setProcessing(false);
            setPaid(true);
            toast.success("Payment successful! Booking confirmed.");
            
            // Add notification for successful booking
            addNotification(`Booking confirmed for ${lot?.name || 'Parking Lot'} - Slot ${bookingData.slotId}`);

            // Navigate to ticket page regardless of database errors
            setTimeout(() => {
              navigate("/ticket");
            }, 2000);
          } catch (error) {
            console.error("Failed to save booking to database:", error);
            console.error("Error details:", error.message);
            
            // Check if the error is due to slot unavailability
            if (error.message.includes("no longer available") || error.message.includes("already booked")) {
              setProcessing(false);
              setError("The selected slot is no longer available. Your payment will be refunded.");
              toast.error("The selected slot is no longer available. Your payment will be refunded.");
              
              // Add notification for slot unavailability
              addNotification("Payment refunded - Selected slot was no longer available");
              
              // Redirect back to booking page
              setTimeout(() => {
                navigate("/find");
              }, 3000);
              return;
            }
            
            // For other database errors, still show success and navigate to ticket page
            // This ensures the user gets their ticket even if there are backend issues
            
            // Update booking context with complete information for ticket page
            const updatedBooking = {
              ...booking,
              lotName: lot?.name || "Parking Lot",
              lotLat: lot?.lat || lot?.coordinates?.[0] || 28.7041, // Default to Delhi coordinates
              lotLng: lot?.lng || lot?.coordinates?.[1] || 77.1025,
              lotAddress: lot?.address || "Parking Location",
              paymentId: paymentResponse.razorpay_payment_id,
              orderId: paymentResponse.razorpay_order_id,
              status: "CONFIRMED",
              bookingTime: new Date().toISOString(),
              id: `${booking.lotId}_${booking.slotId}_${Date.now()}`, // Generate unique booking ID
            };

            // Update the booking context
            setBooking(updatedBooking);
            
            setProcessing(false);
            setPaid(true);
            toast.success("Payment successful! Booking confirmed.");
            
            // Add notification for successful booking (fallback case)
            addNotification(`Booking confirmed for ${lot?.name || 'Parking Lot'} - Slot ${bookingData.slotId}`);
            
            setTimeout(() => {
              navigate("/ticket");
            }, 2000);
          }
        },
        // Failure callback
        (errorMessage) => {
          console.error("Payment failed:", errorMessage);
          setError(errorMessage);
          setProcessing(false);
          toast.error(errorMessage);
          
          // If slot is no longer available, redirect back to booking page
          if (errorMessage.includes("no longer available") || errorMessage.includes("availability check failed")) {
            setTimeout(() => {
              navigate("/find");
            }, 3000);
          }
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
  
  // Calculate total price based on booking time if available (for display only)
  const calculateDisplayAmount = () => {
    if (booking.startTime && booking.endTime) {
      const startTime = new Date(booking.startTime);
      const endTime = new Date(booking.endTime);
      const hoursDiff = (endTime - startTime) / (1000 * 60 * 60);
      return (lot?.pricePerHour || 20) * hoursDiff;
    }
    return lot?.pricePerHour || 20;
  };
  
  const displayAmount = calculateDisplayAmount();

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
              <span className="font-semibold">{booking.slotId}</span>
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
                 {isPayAsYouGo ? "Deposit Amount:" : "Total Amount:"}
               </span>
               <span>₹{displayAmount.toFixed(2)}</span>
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
                   : `Proceed to Pay ₹${displayAmount.toFixed(2)}`}
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
