import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAd9NpMcYgQ18uWhfIT7MBwh_KNprdZLoQ",
  authDomain: "urban-park-d8825.firebaseapp.com",
  projectId: "urban-park-d8825",
  storageBucket: "urban-park-d8825.firebasestorage.app",
  messagingSenderId: "258352254915",
  appId: "1:258352254915:web:2487d3a17efa302fd8b776",
  measurementId: "G-8BB8ZTJMK5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample parking areas data
const parkingAreas = [
  {
    name: "Connaught Place Parking",
    address: "Connaught Place, Delhi",
    coordinates: [28.6315, 77.2167],
    availableSpots: 25,
    totalSpots: 50,
    pricePerHour: 60,
    rating: 4.2,
    reviewCount: 45,
    features: ["Covered", "24/7 Security", "Mobile Pass", "EV Charging"],
    status: "Active",
    image: "https://picsum.photos/400/300?random=1",
    createdAt: Timestamp.now()
  },
  {
    name: "Mall Road Parking",
    address: "Mall Road, Shimla",
    coordinates: [31.1048, 77.1734],
    availableSpots: 15,
    totalSpots: 30,
    pricePerHour: 40,
    rating: 4.0,
    reviewCount: 32,
    features: ["Covered", "24/7 Security", "Mobile Pass"],
    status: "Active",
    image: "https://picsum.photos/400/300?random=2",
    createdAt: Timestamp.now()
  },
  {
    name: "Marina Beach Parking",
    address: "Marina Beach, Chennai",
    coordinates: [13.0827, 80.2707],
    availableSpots: 40,
    totalSpots: 80,
    pricePerHour: 50,
    rating: 4.5,
    reviewCount: 67,
    features: ["Covered", "24/7 Security", "Mobile Pass", "Valet"],
    status: "Active",
    image: "https://picsum.photos/400/300?random=3",
    createdAt: Timestamp.now()
  },
  {
    name: "Gateway Parking",
    address: "Gateway of India, Mumbai",
    coordinates: [18.9217, 72.8347],
    availableSpots: 35,
    totalSpots: 60,
    pricePerHour: 70,
    rating: 4.3,
    reviewCount: 89,
    features: ["Covered", "24/7 Security", "Mobile Pass", "EV Charging", "Valet"],
    status: "Active",
    image: "https://picsum.photos/400/300?random=4",
    createdAt: Timestamp.now()
  },
  {
    name: "Park Street Parking",
    address: "Park Street, Kolkata",
    coordinates: [22.5726, 88.3639],
    availableSpots: 20,
    totalSpots: 40,
    pricePerHour: 45,
    rating: 4.1,
    reviewCount: 56,
    features: ["Covered", "24/7 Security", "Mobile Pass"],
    status: "Active",
    image: "https://picsum.photos/400/300?random=5",
    createdAt: Timestamp.now()
  }
];

async function setupParkingData() {
  try {
    console.log("🚀 Setting up parking areas in Firestore...");
    
    for (const parkingArea of parkingAreas) {
      const docRef = await addDoc(collection(db, "parkingAreas"), parkingArea);
      console.log(`✅ Added parking area: ${parkingArea.name} (ID: ${docRef.id})`);
    }
    
    console.log("🎉 Parking areas setup completed!");
    console.log("📊 Summary: Added", parkingAreas.length, "parking areas");
    console.log("🔗 Your app should now show parking cards!");
    
  } catch (error) {
    console.error("❌ Error setting up parking data:", error);
    console.log("💡 Make sure your Firestore rules allow write access:");
    console.log(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
    `);
  }
}

// Run the setup
setupParkingData(); 