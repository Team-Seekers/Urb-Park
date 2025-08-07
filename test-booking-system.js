const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, Timestamp } = require('firebase/firestore');

// Your Firebase config (replace with your actual config)
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "urban-park.firebaseapp.com",
  projectId: "urban-park",
  storageBucket: "urban-park.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test function to simulate a booking
async function testBooking() {
  try {
    const parkingId = "delhiCentralLot";
    const slotId = "slot1";
    
    // Test booking data
    const bookingData = {
      userId: "test-user-123",
      vehicleNumber: "DL-01-AB-1234",
      startTime: "2025-01-15T10:00:00",
      endTime: "2025-01-15T12:00:00",
      status: "active",
      paymentComplete: true
    };
    
    console.log("Testing booking system...");
    
    // 1. Check current slots
    const parkingRef = doc(db, "parkingAreas", parkingId);
    const parkingDoc = await getDoc(parkingRef);
    
    if (!parkingDoc.exists()) {
      console.log("❌ Parking area not found");
      return;
    }
    
    const parkingData = parkingDoc.data();
    console.log("📊 Current slots data:", parkingData.slots || {});
    
    // 2. Add a test booking to slot1
    const currentSlots = parkingData.slots || {};
    if (!currentSlots[slotId]) {
      currentSlots[slotId] = [];
    }
    
    const newBooking = {
      userId: bookingData.userId,
      vehicleNumber: bookingData.vehicleNumber,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      status: bookingData.status,
      paymentComplete: bookingData.paymentComplete,
      createdAt: Timestamp.now()
    };
    
    currentSlots[slotId].push(newBooking);
    
    // 3. Update the parking area
    await updateDoc(parkingRef, {
      slots: currentSlots,
      availableSpots: Math.max(0, (parkingData.availableSpots || 0) - 1)
    });
    
    console.log("✅ Test booking added successfully!");
    console.log("📋 Booking details:", newBooking);
    
    // 4. Verify the update
    const updatedDoc = await getDoc(parkingRef);
    const updatedData = updatedDoc.data();
    console.log("📊 Updated slots data:", updatedData.slots);
    
  } catch (error) {
    console.error("❌ Error testing booking system:", error);
  }
}

// Run the test
testBooking(); 