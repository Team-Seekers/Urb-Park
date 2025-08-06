// Backend service for Razorpay integration
// This is a mock implementation - replace with actual backend API calls

const API_BASE_URL = "http://localhost:3000"; // Replace with your actual backend URL

// Create order - actual API call
export const createOrder = async (amount, currency = "INR") => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, currency }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Order created successfully:', data);
    return data;
  } catch (error) {
    console.error("Error creating order:", error);
    throw new Error("Failed to create order: " + error.message);
  }
};

// Verify payment - actual API call
export const verifyPayment = async (paymentDetails) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentDetails),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Payment verification result:', data);
    return data;
  } catch (error) {
    console.error("Error verifying payment:", error);
    throw new Error("Failed to verify payment: " + error.message);
  }
};

// Example of how to implement the actual backend endpoints:
/*
// Backend Node.js/Express example:

const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: 'rzp_test_rN3ysbintURr2f',
  key_secret: '0BhzmL3LO4S2BoNdOoxt5YkM'
});

// Create order endpoint
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    
    const options = {
      amount: amount * 100, // Convert to paisa
      currency: currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify payment endpoint
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", "0BhzmL3LO4S2BoNdOoxt5YkM")
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
*/ 