// A single backend server using Express to handle both parking space queries
// and Razorpay payment integration.
//
// To run this, you need to have Node.js and the following packages installed:
// 1. Install dependencies: npm install express cors body-parser razorpay
// 2. Run the server: node server.js

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Razorpay from 'razorpay';
import crypto from 'crypto'; // crypto is a built-in Node.js module

const app = express();
const port = 3000; // The port the combined server will run on

// Enable CORS for all origins
app.use(cors());
// Parse JSON body for incoming requests
app.use(bodyParser.json());

// --- Mock Database for Parking Spaces ---
// In a real application, this would be a connection to a persistent database.
const mockDatabase = {
  'downtown': [
    { name: 'Central Parking Garage', address: '123 Main St', price: '$5/hour', availability: '4 spots', time: '2 PM' },
    { name: 'City Hall Lot', address: '456 Market St', price: '$3/hour', availability: '10 spots', time: '2 PM' },
  ],
  'airport': [
    { name: 'Terminal A Parking', address: '789 Airway Blvd', price: '$10/hour', availability: '20 spots', time: '2 PM' },
  ],
  'suburbs': [
    { name: 'Community Center Lot', address: '101 Oak Ave', price: '$2/hour', availability: '15 spots', time: '2 PM' },
  ]
};

// --- Razorpay Configuration ---
// IMPORTANT: In a production environment, use environment variables
// to store your API keys.
const razorpay = new Razorpay({
  key_id: 'rzp_test_rN3ysbintURr2f',
  key_secret: '0BhzmL3LO4S2BoNdOoxt5YkM'
});

// ---------------------------
// --- API Endpoints ---
// ---------------------------

// 1. Parking Spaces API Endpoint
// This endpoint simulates fetching parking spaces from the database
app.post('/api/parking-spaces', (req, res) => {
  const { location, time } = req.body;
  console.log(`Received request for parking at location: ${location} and time: ${time}`);

  const spaces = mockDatabase[location.toLowerCase()] || [];

  if (spaces.length > 0) {
    res.status(200).json({ success: true, data: spaces });
  } else {
    res.status(404).json({ success: false, message: 'No parking spaces found for this location.' });
  }
});

// 2. Razorpay Create Order Endpoint
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Invalid amount provided' });
    }
    
    const amountInPaisa = Math.round(Number(amount));
    
    if (amountInPaisa < 100) {
      return res.status(400).json({ error: 'Amount must be at least ₹1 (100 paisa)' });
    }
    
    const options = {
      amount: amountInPaisa,
      currency: currency,
      receipt: `receipt_${Date.now()}`,
    };

    console.log('Creating order with amount:', amountInPaisa, 'paisa (₹' + (amountInPaisa/100).toFixed(2) + ')');
    const order = await razorpay.orders.create(options);
    console.log('Order created successfully:', order.id);
    res.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Razorpay Verify Payment Endpoint
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", '0BhzmL3LO4S2BoNdOoxt5YkM')
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      console.log('Payment verified successfully');
      res.json({ 
        success: true, 
        message: "Payment verified successfully",
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id
      });
    } else {
      console.log('Invalid signature');
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'UrbPark combined server is running' });
});

// Start the server
app.listen(port, () => {
  console.log(`UrbPark combined backend API listening on http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('- POST /api/parking-spaces');
  console.log('- POST /api/create-order');
  console.log('- POST /api/verify-payment');
  console.log('- GET /api/health');
});
