import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { calculateTotalPrice } from "../pages/BookingPage";

// Assume your backend server is running on localhost:3000
const API_BASE_URL = "http://localhost:3000";

// A mock API service to handle communication with your Node.js backend.
// In a real app, this might be a separate file, e.g., 'services/api.js'.
const api = {
  createOrder: async (amount) => {
    try {
      const response = await fetch(`${API_BASE_URL}/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!response.ok) {
        throw new Error("Failed to create order on the backend.");
      }
      return await response.json();
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  },

  verifyPayment: async (paymentDetails) => {
    try {
      // Note: Your backend's `/verify` endpoint requires `authmiddleware`.
      // You would need to include an authentication token (e.g., JWT) here.
      // For this example, we'll omit it for simplicity.
      const response = await fetch(`${API_BASE_URL}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentDetails),
      });
      if (!response.ok) {
        throw new Error("Payment verification failed.");
      }
      return await response.json();
    } catch (error) {
      console.error("Error verifying payment:", error);
      throw error;
    }
  },
};

// This function dynamically loads the Razorpay script from their CDN.
const loadRazorpayScript = () => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Razorpay SDK failed to load."));
    document.body.appendChild(script);
  });
};

// Main React component for the Razorpay payment form.
const Razorpay = ({ bookingDetails }) => {
  // Calculate amount based on booking details
  const calculatedAmount = bookingDetails ? 
    Math.round(parseFloat(calculateTotalPrice(bookingDetails.lot, new Date(bookingDetails.startTime), new Date(bookingDetails.endTime))) ) : 5000;
  
  const [amount, setAmount] = useState(calculatedAmount); // Amount in smallest currency unit (e.g., 5000 paisa = ₹50)
  const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Update amount when booking details change
  useEffect(() => {
    if (bookingDetails) {
      const newAmount = Math.round(parseFloat(calculateTotalPrice(bookingDetails.lot, new Date(bookingDetails.startTime), new Date(bookingDetails.endTime))) );
      setAmount(newAmount);
    }
  }, [bookingDetails]);

  // Load the Razorpay script when the component mounts.
  useEffect(() => {
    const loadScript = async () => {
      try {
        await loadRazorpayScript();
        setIsRazorpayLoaded(true);
      } catch (error) {
        toast.error("Failed to load Razorpay SDK.");
      }
    };
    loadScript();
  }, []);

  const handlePayment = async () => {
    if (!isRazorpayLoaded) {
      toast.error("Razorpay SDK not loaded. Please try again.");
      return;
    }
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      // Step 1: Call your backend to create a Razorpay order.
      const order = await api.createOrder(amount);
      if (!order || !order.id) {
        throw new Error("Invalid order ID received from the backend.");
      }

      // Step 2: Configure and open the Razorpay payment modal.
      const options = {
        key: "rzp_test_rN3ysbintURr2f", // Your Razorpay Key ID
        amount: order.amount,
        currency: order.currency,
        name: "Urb-Park",
        description: "Payment for parking booking",
        order_id: order.id,
        handler: async function (response) {
          // This function is called on successful payment.
          try {
            // Step 3: Send payment details to your backend for verification.
            const verificationResponse = await api.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success(verificationResponse.msg);
          } catch (error) {
            toast.error(error.message);
          }
          setIsProcessing(false);
        },
        prefill: {
          name: "John Doe",
          email: "john.doe@example.com",
          contact: "9999999999",
        },
        notes: {
          booking_id: "parking_booking",
          customer_id: "user"
        },
        theme: {
          color: "#F4B400", // Yellow theme to match the UI
        },
        // Enable UPI and other payment methods
        config: {
          display: {
            blocks: {
              banks: {
                name: "Pay using UPI",
                instruments: [
                  {
                    method: "upi"
                  }
                ]
              },
              other: {
                name: "Other Payment methods",
                instruments: [
                  {
                    method: "card"
                  },
                  {
                    method: "netbanking"
                  }
                ]
              }
            },
            sequence: ["block.banks", "block.other"],
            preferences: {
              show_default_blocks: false
            }
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        toast.error(`Payment failed: ${response.error.description}`);
        setIsProcessing(false);
      });
      rzp.open();
    } catch (error) {
      toast.error(error.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4 font-sans">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full border-t-8 border-yellow-400">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Book & Pay
        </h1>
        <div className="space-y-4">
          <label htmlFor="amount" className="block text-gray-700 font-semibold">
            Calculated Payment Amount (in INR)
          </label>
          <input
            id="amount"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg bg-gray-50 cursor-not-allowed"
            type="number"
            value={amount / 100} // Display amount in rupees
            readOnly
            required
          />
          <p className="text-sm text-gray-500">
            Calculated amount: ₹{(amount / 100).toFixed(2)} (from booking details)
          </p>
          <button
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={handlePayment}
            disabled={!isRazorpayLoaded || isProcessing}
          >
            {isProcessing ? "Processing..." : "Pay with Razorpay"}
          </button>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default Razorpay;
