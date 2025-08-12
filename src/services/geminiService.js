// src/services/geminiService.js
// Enhanced Gemini service with Firebase parking integration

import { GoogleGenAI } from "@google/genai";
import chatbotParkingService from "./parkingChatbot";
import { fetchParkingAreaById } from "./parkingService"; // Fixed import

let ai = null;
let chat = null;

try {
  if (import.meta.env.VITE_GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  } else {
    console.error("Gemini API key is not available. The AI assistant will be disabled.");
  }
} catch (error) {
  console.error("Failed to initialize GoogleGenAI:", error);
}

const initializeChat = () => {
  if (!ai) return;
  
  const systemInstruction = `You are Parky, a friendly and helpful AI assistant for the UrbPark application. 
    Your goal is to assist users with questions about finding parking, booking, payments, listing their own space, and troubleshooting issues.
    
    IMPORTANT INSTRUCTIONS:
    - When users ask about parking or want to book parking, ALWAYS try to extract location, date, and time details
    - If a user says something like "book parking in Bangalore from 2pm to 4pm", immediately search for available spaces
    - Always be helpful and guide users through the booking process step by step
    - If users don't provide complete information, ask for the missing details (location, time, date)
    - Be concise but friendly
    - Use emojis appropriately to make responses engaging
    - Focus on UrbPark parking services only
    
    BOOKING PROCESS:
    1. Extract user requirements (location, time, duration)
    2. Search for available parking spaces
    3. Show options to user with clear details
    4. Guide them through booking confirmation
    5. Handle payment integration
    
    FEATURES TO MENTION:
    - Real-time parking availability
    - Secure booking with QR codes
    - Multiple payment options
    - 24/7 customer support
    - User-friendly mobile app
    
    Always maintain a positive, helpful tone and never provide information outside the scope of UrbPark parking services.`;

  chat = ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction,
      temperature: 0.7,
      topP: 0.9,
    },
  });
};

export const getBotResponseStream = async function* (history, newMessage) {
  if (!ai) {
    yield "Sorry, the AI assistant is currently unavailable due to a configuration issue.";
    return;
  }

  if (!chat) {
    initializeChat();
  }

  try {
    // Check if this is a booking-related query
    const isBookingQuery = chatbotParkingService.isBookingIntent(newMessage);
    
    if (isBookingQuery) {
      // Parse the user message to extract booking details
      const searchParams = chatbotParkingService.parseUserMessage(newMessage);
      
      // If we have enough information to search, do it
      if (searchParams.location || (searchParams.startTime && searchParams.endTime)) {
        yield "🔍 Searching for available parking spaces...\n\n";
        
        try {
          const searchResult = await chatbotParkingService.searchParkingSpaces(searchParams);
          
          if (searchResult.success && searchResult.data.length > 0) {
            const resultsMessage = chatbotParkingService.generateSearchResultsMessage(
              searchResult.data, 
              searchParams
            );
            yield resultsMessage;
            
            // Store search results in a way that can be accessed by the UI
            // You might want to emit this as a custom event or store in context
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('parkingSearchResults', {
                detail: { results: searchResult.data, searchParams }
              }));
            }
            return;
          } else {
            yield "I couldn't find any available parking spaces matching your criteria. Let me help you with alternative options.\n\n";
          }
        } catch (searchError) {
          console.error('Search error:', searchError);
          yield "I'm having trouble searching for parking right now. Let me help you in another way.\n\n";
        }
      }
    }

    // Continue with regular AI response
    const response = await chat.sendMessageStream({ message: newMessage });
    for await (const chunk of response) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Error fetching bot response:", error);
    yield "I'm having trouble connecting right now. Please try again later.";
    // Reset chat on error
    chat = null;
  }
};

// Create order - Razorpay integration (you might already have this)
export const createOrder = async (amount, currency = "INR") => {
  try {
    // If you have a backend API for Razorpay, use it
    // Otherwise, handle this in your Firebase functions
    
    const response = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    // Return mock order for development
    return {
      id: `order_${Date.now()}`,
      amount: amount * 100,
      currency,
      status: 'created'
    };
  }
};

// Verify payment
export const verifyPayment = async (paymentDetails) => {
  try {
    const response = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    // Return success for development
    return { success: true, message: "Payment verified successfully" };
  }
};

// Enhanced booking function that integrates with Firebase
export const createBookingWithPayment = async (bookingData, paymentData) => {
  try {
    // Create the booking first
    const bookingResult = await chatbotParkingService.createBooking(bookingData);
    
    if (!bookingResult.success) {
      throw new Error(bookingResult.message);
    }

    // If payment is required, process it
    if (paymentData && paymentData.amount > 0) {
      const order = await createOrder(paymentData.amount);
      
      // Here you would integrate with Razorpay
      // For now, we'll simulate successful payment
      const paymentResult = await verifyPayment({
        razorpay_order_id: order.id,
        razorpay_payment_id: `pay_${Date.now()}`,
        razorpay_signature: 'mock_signature'
      });

      if (paymentResult.success) {
        // Update booking with payment info
        bookingResult.data.paymentComplete = true;
        bookingResult.data.paymentId = paymentResult.paymentId;
        bookingResult.data.orderId = order.id;
      }
    }

    return bookingResult;
  } catch (error) {
    console.error('Error creating booking with payment:', error);
    return {
      success: false,
      message: error.message || 'Failed to complete booking and payment'
    };
  }
};

// Helper function to get parking space details with proper error handling
export const getParkingSpaceDetails = async (spaceId) => {
  try {
    if (!spaceId) {
      throw new Error('Space ID is required');
    }

    // Direct import and call to fetchParkingAreaById
    const spaceDetails = await fetchParkingAreaById(spaceId);
    
    if (!spaceDetails) {
      throw new Error('Parking space not found');
    }

    return spaceDetails;
  } catch (error) {
    console.error('Error fetching parking space details:', error);
    
    // Return null to allow fallback handling in the calling function
    return null;
  }
};

// Calculate pricing helper function
export const calculatePrice = (pricePerHour, startTime, endTime) => {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format');
    }
    
    const hours = Math.ceil((end - start) / (1000 * 60 * 60));
    
    if (hours <= 0) {
      throw new Error('Invalid time range');
    }
    
    const baseAmount = hours * pricePerHour;
    const tax = baseAmount * 0.18; // 18% GST
    const totalAmount = baseAmount + tax;
    
    return {
      baseAmount,
      tax,
      totalAmount,
      hours,
      pricePerHour
    };
  } catch (error) {
    console.error('Error calculating price:', error);
    return {
      baseAmount: 0,
      tax: 0,
      totalAmount: 0,
      hours: 0,
      pricePerHour
    };
  }
};

// Enhanced error handling for API calls
export const handleApiError = (error, context = 'API call') => {
  console.error(`Error in ${context}:`, error);
  
  // Return user-friendly error message based on error type
  if (error.message.includes('not found')) {
    return 'The requested resource was not found.';
  } else if (error.message.includes('network') || error.message.includes('fetch')) {
    return 'Network connection error. Please check your internet connection.';
  } else if (error.message.includes('permission') || error.message.includes('auth')) {
    return 'Permission denied. Please check your credentials.';
  } else {
    return error.message || 'An unexpected error occurred. Please try again.';
  }
};

// Retry mechanism for API calls
export const retryApiCall = async (apiFunction, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiFunction();
    } catch (error) {
      console.warn(`API call attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

// Format parking area data for display
export const formatParkingAreaForDisplay = (area) => {
  if (!area) return null;
  
  return {
    id: area.id,
    name: area.name || 'Unknown Parking Area',
    address: area.address || 'Address not available',
    pricePerHour: area.pricePerHour || 0,
    totalSpots: area.totalSpots || 0,
    availableSpots: area.availableSpots || 0,
    availableSpotsForTime: area.availableSpotsForTime || area.availableSpots || 0,
    rating: area.rating ? parseFloat(area.rating).toFixed(1) : '4.0',
    distance: area.distance ? `${area.distance.toFixed(1)} km` : null,
    features: Array.isArray(area.features) ? area.features : [],
    coordinates: area.coordinates || [0, 0],
    image: area.image || null
  };
};

// Validate booking data before processing
export const validateBookingRequest = (bookingData) => {
  const errors = [];
  
  if (!bookingData.parkingId) {
    errors.push('Parking area ID is required');
  }
  
  if (!bookingData.startTime) {
    errors.push('Start time is required');
  }
  
  if (!bookingData.endTime) {
    errors.push('End time is required');
  }
  
  if (bookingData.startTime && bookingData.endTime) {
    const start = new Date(bookingData.startTime);
    const end = new Date(bookingData.endTime);
    
    if (isNaN(start.getTime())) {
      errors.push('Invalid start time format');
    }
    
    if (isNaN(end.getTime())) {
      errors.push('Invalid end time format');
    }
    
    if (start >= end) {
      errors.push('End time must be after start time');
    }
    
    if (start < new Date()) {
      errors.push('Start time cannot be in the past');
    }
  }
  
  if (!bookingData.userDetails?.userId) {
    errors.push('User information is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generate QR code for booking
export const generateBookingQR = async (bookingId, parkingAreaName) => {
  try {
    // Import QR code library dynamically
    const QRCode = await import('qrcode');
    
    const qrData = {
      type: 'parking_booking',
      bookingId: bookingId,
      parkingArea: parkingAreaName,
      timestamp: new Date().toISOString(),
      appName: 'UrbPark'
    };
    
    const qrString = JSON.stringify(qrData);
    const qrCodeDataUrl = await QRCode.toDataURL(qrString, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

// Initialize chat when module loads
if (ai) {
  initializeChat();
}

export default {
  getBotResponseStream,
  createOrder,
  verifyPayment,
  createBookingWithPayment,
  getParkingSpaceDetails,
  calculatePrice,
  handleApiError,
  retryApiCall,
  formatParkingAreaForDisplay,
  validateBookingRequest,
  generateBookingQR
};