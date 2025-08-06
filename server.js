import express from 'express';
import cors from 'cors';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Razorpay
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
    console.log('Order created:', order);
    res.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Razorpay server is running' });
});

app.listen(PORT, () => {
  console.log(`Razorpay server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('- POST /api/create-order');
  console.log('- POST /api/verify-payment');
  console.log('- GET /api/health');
}); 