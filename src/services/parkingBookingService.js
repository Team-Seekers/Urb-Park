// src/services/parkingBookingService.js
// Complete parking booking service

class ParkingBookingService {
    constructor(backendUrl = "http://localhost:3000") {
      this.backendUrl = backendUrl;
    }
  
    // Search parking spaces
    async searchParkingSpaces(searchParams) {
      try {
        const queryParams = new URLSearchParams(searchParams);
        const response = await fetch(`${this.backendUrl}/api/parking/search?${queryParams}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error searching parking spaces:", error);
        throw error;
      }
    }
  
    // Get parking space details
    async getParkingSpace(spaceId) {
      try {
        const response = await fetch(`${this.backendUrl}/api/parking/${spaceId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error fetching parking space:", error);
        throw error;
      }
    }
  
    // Create booking
    async createBooking(bookingData) {
      try {
        const response = await fetch(`${this.backendUrl}/api/bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingData)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error creating booking:", error);
        throw error;
      }
    }
  
    // Parse user message to extract booking details
    parseUserMessage(message) {
      const parsed = {
        location: null,
        date: null,
        startTime: null,
        endTime: null,
        duration: null
      };
  
      // Extract location
      const locationPatterns = [
        /(?:in|at|near)\s+([a-zA-Z\s]+?)(?:\s+(?:from|for|on|at)|$)/i,
        /parking\s+(?:in|at|near)\s+([a-zA-Z\s]+)/i
      ];
      
      for (const pattern of locationPatterns) {
        const match = message.match(pattern);
        if (match) {
          parsed.location = match[1].trim();
          break;
        }
      }
  
      // Extract time patterns
      const timePatterns = [
        /(\d{1,2}(?::\d{2})?\s*(?:am|pm))/gi,
        /(\d{1,2})\s*(?:to|\-)\s*(\d{1,2})/gi
      ];
  
      // Extract date patterns
      const datePatterns = [
        /today/i,
        /tomorrow/i,
        /(\d{1,2}\/\d{1,2}\/\d{4})/,
        /(\d{1,2}-\d{1,2}-\d{4})/
      ];
  
      return parsed;
    }
  
    // Calculate price
    calculatePrice(pricePerHour, startTime, endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const hours = Math.ceil((end - start) / (1000 * 60 * 60));
      
      const baseAmount = hours * pricePerHour;
      const tax = baseAmount * 0.18; // 18% GST
      const totalAmount = baseAmount + tax;
      
      return {
        baseAmount,
        tax,
        totalAmount,
        hours
      };
    }
  
    // Generate QR code for booking
    async generateQRCode(bookingId) {
      try {
        const QRCode = await import("qrcode");
        const qrData = {
          bookingId,
          type: "parking_ticket",
          timestamp: new Date().toISOString()
        };
        
        return await QRCode.toDataURL(JSON.stringify(qrData));
      } catch (error) {
        console.error("Error generating QR code:", error);
        throw error;
      }
    }
  }
  
  const parkingBookingService = new ParkingBookingService();
  export default parkingBookingService;
  