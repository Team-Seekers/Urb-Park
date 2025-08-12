# Urb-Park Backend Server

This is the backend server for the Urb-Park application that handles Razorpay payment integration and parking space queries.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in this directory with your Razorpay API keys:

```bash
# Copy the example file
cp env.example .env

# Edit .env with your actual values
RAZORPAY_KEY_ID=your_actual_razorpay_key_id
RAZORPAY_KEY_SECRET=your_actual_razorpay_key_secret
PORT=3000
NODE_ENV=development
```

### 3. Get Razorpay API Keys

1. Sign up/login to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to Settings → API Keys
3. Generate a new key pair
4. Copy the Key ID and Key Secret to your `.env` file

### 4. Run the Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## API Endpoints

- `POST /api/parking-spaces` - Get available parking spaces
- `POST /api/create-order` - Create Razorpay order
- `POST /api/verify-payment` - Verify payment signature
- `GET /api/health` - Health check

## Troubleshooting

If you get the error "`key_id` or `oauthToken` is mandatory":

1. Make sure you have a `.env` file in this directory
2. Verify your Razorpay API keys are correct
3. Check that the `.env` file is not in `.gitignore`
4. Restart the server after making changes

## Security Notes

- Never commit your `.env` file to version control
- Keep your Razorpay API keys secure
- Use different keys for development and production
