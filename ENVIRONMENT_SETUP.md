# Environment Variables Setup

This project uses environment variables to securely store API keys and configuration values. Follow these steps to set up your environment:

## 1. Frontend Environment Variables

Create a `.env` file in the root directory (`Urb-Park/`) with the following variables:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_firebase_app_id_here
VITE_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id_here

# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id_here

# Gemini AI Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

## 2. Backend Environment Variables

Create a `.env` file in the root directory (`Urb-Park/`) with the following variables:

```bash
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here

# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_PATH=path/to/your/firebase-service-account.json

# Server Configuration
PORT=3000
NODE_ENV=development
```

## 3. Python Environment Variables

Create a `.env` file in the `pythonFiles/` directory with the following variables:

```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email_here
EMAIL_PASSWORD=your_app_password_here

# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_PATH=path/to/your/firebase-service-account.json
```

## 4. Installation

### Frontend & Backend

```bash
npm install
```

### Python Dependencies

```bash
cd pythonFiles
pip install -r requirements.txt
```

## 5. Security Notes

- **Never commit `.env` files to version control**
- **Keep your API keys secure and private**
- **Use different keys for development and production**
- **Rotate your keys regularly**

## 6. Current Configuration

The following files have been updated to use environment variables:

- `src/services/Firebase.js` - Firebase configuration
- `server.js` - Razorpay API keys
- `src/services/razorpayService.js` - Razorpay frontend key
- `src/services/backendService.js` - Razorpay backend keys (example code)
- `src/components/Razorpay.jsx` - Razorpay frontend key
- `pythonFiles/part-1_code/EntryGateDetection.py` - Firebase service account path
- `pythonFiles/part-2_code/WrongParkingPrevention.py` - Email configuration & Firebase service account path
- `pythonFiles/part-3_code/ThiefDetection.py` - Email configuration & Firebase service account path
- `src/services/geminiService.js` - Already using environment variables

## 7. Example Values

### Firebase

- Get these values from your Firebase project console
- Go to Project Settings > General > Your apps
- For service account: Go to Project Settings > Service Accounts > Generate new private key

### Razorpay

- Get these values from your Razorpay dashboard
- Go to Settings > API Keys
- Use the same key ID for both frontend and backend

### Email

- Use Gmail App Password (not your regular password)
- Enable 2FA and generate an app password

### Gemini

- Get this from Google AI Studio
- Go to https://makersuite.google.com/app/apikey

## 8. Important Notes

- **Frontend Razorpay Key**: Use `VITE_RAZORPAY_KEY_ID` for components that need the key in the browser
- **Backend Razorpay Keys**: Use `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` for server-side operations
- **Python dotenv**: Make sure to install `python-dotenv` for Python files to load environment variables
- **Vite Environment Variables**: All frontend environment variables must be prefixed with `VITE_` to be accessible in the browser
