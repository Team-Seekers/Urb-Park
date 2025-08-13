# Urb-Park: AI-Enabled Parking & Smart Ticketing

## 📌 Overview

**Urb-Park** is an AI-powered smart parking and ticketing system designed to solve urban congestion problems.
It integrates **AI, IoT, and cloud services** to fully automate parking operations — from slot search to secure exit.
The platform eliminates manual monitoring, optimizes parking usage, and enhances security with real-time alerts.

---

## 🚀 Key Features

* **Search & Select Parking Area** – View available slots in real time, with nearby options shown within a 5 km radius.
* **Slot & Time Reservation** – Book a specific slot for a chosen time period.
* **Vehicle Registration** – Validate bookings via AI-powered number plate recognition.
* **Online Payment** – Secure booking confirmation via Razorpay.
* **Navigation Assistance** – Auto-generated route using ORS API.
* **AI-Powered Entry Gate** – Automatic access control based on license plate.
* **Wrong Slot Detection** – Instant notification if parked in an incorrect slot.
* **Anti-Theft Alerts** – Detects suspicious car movement and alerts the user.

---

## 🛠️ Tech Stack

**Frontend:**

* React.js
* Tailwind CSS

**Backend:**

* Node.js + Express.js
* Google Maps API
* Razorpay API
* ORS API

**Authentication:**

* Firebase Auth
* Google OAuth

**Database:**

* Google Cloud Firestore

**AI Module:**

* OpenCV + EasyOCR
* Number Plate Recognition
* Theft Detection & Slot Misuse Alerts

---

## 📂 Project Structure

```
urb-park/
│── frontend/        # React.js + Tailwind CSS frontend
│── backend/         # Express.js backend with APIs
│── models/          # AI scripts & ML models
│── README.md        # Project documentation
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/username/urb-park.git
cd urb-park
```

### 2️⃣ Install Dependencies

```bash
cd frontend && npm install
cd ../backend && npm install
```

### 3️⃣ Create `.env` Files

> ⚠️ Never commit `.env` files to GitHub — keep them private.

**Backend `.env`**

```env
# Firebase
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id
FIREBASE_APP_ID=your_firebase_app_id

# Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# OpenRouteService API
ORS_API_KEY=your_ors_api_key
```

**Frontend `.env`** *(if applicable)*

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

---

### 4️⃣ Run the Project

```bash
# Start backend
cd backend && npm start

# Start frontend
cd frontend && npm run dev
```

### 5️⃣ Access App

Open `http://localhost:5173` in your browser.

---

## 🎯 Uniqueness

* **Fully replaces manual monitoring** using AI and IoT integration.
* **Vehicle number–based automatic entry** ensures seamless, contactless access.
* **AI-driven wrong-slot and theft alerts** improve security.
* **Cloud-hosted & scalable**, ready for smart city infrastructure.

