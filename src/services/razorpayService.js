// Razorpay service for handling payments
import { createOrder, verifyPayment } from "./backendService";

const RAZORPAY_KEY_ID = "rzp_test_rN3ysbintURr2f";

// Load Razorpay script dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Razorpay SDK failed to load"));
    document.body.appendChild(script);
  });
};

// Initialize Razorpay payment
export const initializePayment = async (amount, bookingData, onSuccess, onFailure) => {
  try {
    // Load Razorpay script
    await loadRazorpayScript();

    // Create order
    const order = await createOrder(amount);

    // Configure Razorpay options
    const options = {
      key: RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: "Urb-Park",
      description: `Parking booking at ${bookingData.lotName}`,
      order_id: order.id,
      handler: async function (response) {
        try {
          // Verify payment
          const verification = await verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          if (verification.success) {
            onSuccess(response, bookingData);
          } else {
            onFailure("Payment verification failed");
          }
        } catch (error) {
          onFailure("Payment verification failed: " + error.message);
        }
      },
      prefill: {
        name: bookingData.customerName || "Customer",
        email: bookingData.customerEmail || "customer@example.com",
        contact: bookingData.customerPhone || "",
      },
      theme: {
        color: "#10B981", // Green theme
      },
      modal: {
        ondismiss: function() {
          onFailure("Payment cancelled by user");
        }
      }
    };

    // Create and open Razorpay instance
    const rzp = new window.Razorpay(options);
    
    rzp.on("payment.failed", function (response) {
      onFailure(`Payment failed: ${response.error.description}`);
    });

    rzp.open();

  } catch (error) {
    onFailure("Failed to initialize payment: " + error.message);
  }
};

// Get Razorpay key for direct integration
export const getRazorpayKey = () => RAZORPAY_KEY_ID; 