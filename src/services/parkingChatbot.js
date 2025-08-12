// src/services/chatbotParkingService.js
// Chatbot integration with existing Firebase parking service

import {
  fetchAllParkingAreas,
  getNearbyParkingAreas,
  searchParkingAreasWithAvailability,
  getSlotAvailabilityForTimeRange,
  bookParkingSlot,
  getUserLocation
} from './parkingService'; // Removed calculatePrice from imports

export class ChatbotParkingService {
  // Parse user message to extract booking details
  parseUserMessage(message) {
    const parsed = {
      location: null,
      date: null,
      startTime: null,
      endTime: null,
      duration: null
    };

    // Extract location patterns
    const locationPatterns = [
      /(?:in|at|near)\s+([a-zA-Z\s]+?)(?:\s+(?:from|for|on|at)|$)/i,
      /parking\s+(?:in|at|near)\s+([a-zA-Z\s]+)/i,
      /book.*(?:in|at|near)\s+([a-zA-Z\s]+)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match) {
        parsed.location = match[1].trim();
        break;
      }
    }

    // Extract time patterns
    const timeMatches = message.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/gi);
    if (timeMatches && timeMatches.length >= 2) {
      parsed.startTime = this.parseTimeString(timeMatches[0]);
      parsed.endTime = this.parseTimeString(timeMatches[1]);
    } else if (timeMatches && timeMatches.length === 1) {
      parsed.startTime = this.parseTimeString(timeMatches[0]);
      // Default to 2 hours duration if only start time provided
      const start = new Date(parsed.startTime);
      parsed.endTime = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    }

    // Extract duration patterns
    const durationMatch = message.match(/(\d+)\s*hour[s]?/i);
    if (durationMatch && parsed.startTime) {
      const hours = parseInt(durationMatch[1]);
      const start = new Date(parsed.startTime);
      parsed.endTime = new Date(start.getTime() + hours * 60 * 60 * 1000);
      parsed.duration = hours;
    }

    // Extract date patterns
    const today = new Date();
    if (/today/i.test(message)) {
      parsed.date = new Date(today);
    } else if (/tomorrow/i.test(message)) {
      parsed.date = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    }

    // Apply date to times if parsed
    if (parsed.date && parsed.startTime) {
      const startTime = new Date(parsed.startTime);
      const endTime = new Date(parsed.endTime);
      
      // Set the correct date
      startTime.setFullYear(parsed.date.getFullYear());
      startTime.setMonth(parsed.date.getMonth());
      startTime.setDate(parsed.date.getDate());
      
      endTime.setFullYear(parsed.date.getFullYear());
      endTime.setMonth(parsed.date.getMonth());
      endTime.setDate(parsed.date.getDate());
      
      parsed.startTime = startTime;
      parsed.endTime = endTime;
    }

    return parsed;
  }

  // Parse time string like "2pm" or "2:30pm" to full datetime
  parseTimeString(timeStr) {
    const now = new Date();
    const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    
    if (!timeMatch) return null;
    
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3].toLowerCase();
    
    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }
    
    const result = new Date();
    result.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, assume tomorrow
    if (result <= now) {
      result.setDate(result.getDate() + 1);
    }
    
    return result;
  }

  // Search parking spaces based on user input
  async searchParkingSpaces(searchParams) {
    try {
      const { location, startTime, endTime, maxDistance = 10 } = searchParams;
      
      let results = [];
      
      if (location) {
        // Search by location name/address
        if (startTime && endTime) {
          results = await searchParkingAreasWithAvailability(location, startTime, endTime);
        } else {
          const allAreas = await fetchAllParkingAreas();
          results = allAreas.filter(area => 
            area.name.toLowerCase().includes(location.toLowerCase()) ||
            area.address.toLowerCase().includes(location.toLowerCase())
          );
        }
      } else {
        // Get nearby areas if no specific location
        try {
          if (startTime && endTime) {
            results = await this.getNearbyParkingAreasWithAvailability(maxDistance, startTime, endTime);
          } else {
            results = await getNearbyParkingAreas(maxDistance);
          }
        } catch (locationError) {
          // Fallback to all areas if location access fails
          results = await fetchAllParkingAreas();
          results = results.slice(0, 5); // Limit to top 5
        }
      }

      return {
        success: true,
        data: results,
        count: results.length,
        message: `Found ${results.length} parking ${results.length === 1 ? 'space' : 'spaces'}`
      };
    } catch (error) {
      console.error('Error searching parking spaces:', error);
      return {
        success: false,
        data: [],
        count: 0,
        message: 'Error searching for parking spaces. Please try again.'
      };
    }
  }

  // Get nearby parking areas with availability (wrapper for your existing function)
  async getNearbyParkingAreasWithAvailability(maxDistance, startTime, endTime) {
    try {
      const userLocation = await getUserLocation();
      const nearbyAreas = await getNearbyParkingAreas(maxDistance);

      const areasWithAvailability = await Promise.all(
        nearbyAreas.map(async (area) => {
          const availability = await getSlotAvailabilityForTimeRange(
            area.id,
            startTime,
            endTime
          );
          const availableCount = Object.values(availability).filter(
            (status) => status === "available"
          ).length;

          return {
            ...area,
            availableSpotsForTime: availableCount,
            availabilityMap: availability,
          };
        })
      );

      return areasWithAvailability
        .filter(area => area.availableSpotsForTime > 0)
        .sort((a, b) => b.availableSpotsForTime - a.availableSpotsForTime);
    } catch (error) {
      console.error("Error getting nearby areas with availability:", error);
      return [];
    }
  }

  // Create booking through chatbot
  async createBooking(bookingData) {
    try {
      const {
        parkingId,
        slotId,
        startTime,
        endTime,
        userDetails,
        vehicleDetails
      } = bookingData;

      // Validate required fields
      if (!parkingId || !startTime || !endTime) {
        throw new Error('Missing required booking information');
      }

      // Auto-select slot if not provided
      let selectedSlotId = slotId;
      if (!selectedSlotId) {
        const availability = await getSlotAvailabilityForTimeRange(
          parkingId,
          startTime,
          endTime
        );
        
        const availableSlots = Object.keys(availability).filter(
          slot => availability[slot] === 'available'
        );
        
        if (availableSlots.length === 0) {
          throw new Error('No available slots for the selected time');
        }
        
        selectedSlotId = availableSlots[0]; // Take first available slot
      }

      // Prepare booking data for Firebase function
      const firebaseBookingData = {
        userId: userDetails?.userId || 'chatbot-user',
        vehicleNumber: vehicleDetails?.number || 'TEMP-' + Date.now(),
        startTime,
        endTime,
        status: 'active',
        paymentComplete: false,
        userDetails: userDetails || {},
        vehicleDetails: vehicleDetails || {}
      };

      // Create booking using your existing Firebase function
      const result = await bookParkingSlot(parkingId, selectedSlotId, firebaseBookingData);

      if (result.success) {
        return {
          success: true,
          data: {
            ...result.booking,
            parkingId,
            slotId: selectedSlotId,
            bookingId: `${parkingId}-${selectedSlotId}-${Date.now()}`
          },
          message: 'Booking created successfully!'
        };
      } else {
        throw new Error(result.message || 'Booking failed');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      return {
        success: false,
        message: error.message || 'Failed to create booking. Please try again.'
      };
    }
  }

  // Calculate pricing - moved to internal method since not exported from parkingService
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
      hours,
      pricePerHour
    };
  }

  // Generate QR code for booking
  async generateQRCode(bookingId) {
    try {
      const QRCode = await import('qrcode');
      const qrData = {
        bookingId,
        type: 'parking_ticket',
        timestamp: new Date().toISOString()
      };
      
      return await QRCode.toDataURL(JSON.stringify(qrData));
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  // Format parking areas for chatbot display
  formatParkingAreasForDisplay(areas) {
    return areas.map(area => ({
      id: area.id,
      name: area.name,
      address: area.address,
      pricePerHour: area.pricePerHour,
      availableSpots: area.availableSpotsForTime || area.availableSpots,
      totalSpots: area.totalSpots,
      distance: area.distance ? `${area.distance.toFixed(1)} km away` : null,
      rating: area.rating ? `${area.rating.toFixed(1)}⭐` : null,
      features: area.features || []
    }));
  }

  // Check if message is booking related
  isBookingIntent(message) {
    const bookingKeywords = [
      'book', 'reserve', 'parking', 'slot', 'space',
      'need parking', 'find parking', 'available',
      'spots', 'today', 'tomorrow', 'am', 'pm'
    ];
    
    const lowerMessage = message.toLowerCase();
    return bookingKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // Generate booking confirmation message
  generateBookingConfirmation(booking, parkingArea, pricing) {
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    
    return `
🎉 *Booking Confirmed!*

*📍 Location:* ${parkingArea.name}
*📅 Date:* ${startTime.toDateString()}
*⏰ Time:* ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}
*🚗 Slot:* ${booking.slotId || 'Auto-assigned'}
*💰 Total:* ₹${pricing.totalAmount.toFixed(2)}

*Booking ID:* ${booking.bookingId}

Your digital parking ticket will be generated after payment completion.
    `.trim();
  }

  // Generate search results message
  generateSearchResultsMessage(areas, searchParams) {
    if (areas.length === 0) {
      return "Sorry, I couldn't find any available parking spaces for your requirements. Try adjusting your location or time.";
    }

    let message = `I found ${areas.length} parking ${areas.length === 1 ? 'space' : 'spaces'}`;
    
    if (searchParams.location) {
      message += ` near "${searchParams.location}"`;
    }
    
    if (searchParams.startTime) {
      const startTime = new Date(searchParams.startTime);
      message += ` for ${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString()}`;
    }

    message += ":\n\n";

    const formattedAreas = this.formatParkingAreasForDisplay(areas.slice(0, 5));
    
    formattedAreas.forEach((area, index) => {
      message += `**${index + 1}. ${area.name}**\n`;
      message += `📍 ${area.address}\n`;
      message += `💰 ₹${area.pricePerHour}/hour\n`;
      message += `🅿 ${area.availableSpots}/${area.totalSpots} spots available\n`;
      if (area.distance) message += `📏 ${area.distance}\n`;
      if (area.rating) message += `⭐ ${area.rating}\n`;
      message += "\n";
    });

    message += "Click on any parking space above to proceed with booking! 🚗";
    
    return message;
  }

  // Validate user input for booking
  validateBookingInput(searchParams) {
    const errors = [];

    if (searchParams.startTime && searchParams.endTime) {
      const start = new Date(searchParams.startTime);
      const end = new Date(searchParams.endTime);
      const now = new Date();

      if (start < now) {
        errors.push("Start time cannot be in the past");
      }

      if (end <= start) {
        errors.push("End time must be after start time");
      }

      const timeDiff = (end - start) / (1000 * 60 * 60); // hours
      if (timeDiff > 24) {
        errors.push("Booking duration cannot exceed 24 hours");
      }

      if (timeDiff < 0.5) {
        errors.push("Minimum booking duration is 30 minutes");
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Format time for display
  formatTimeForDisplay(dateTime) {
    if (!dateTime) return 'N/A';
    
    try {
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid Date';
    }
  }

  // Format currency for display
  formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '₹0.00';
    return `₹${amount.toFixed(2)}`;
  }

  // Get booking duration in human-readable format
  getBookingDuration(startTime, endTime) {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMs = end - start;
      
      if (diffMs <= 0) return 'Invalid duration';
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours === 0) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      } else if (minutes === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
      } else {
        return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
    } catch (error) {
      console.error('Error calculating duration:', error);
      return 'Unknown duration';
    }
  }

  // Generate alternative suggestions when no spaces are found
  generateAlternativeSuggestions(searchParams) {
    const suggestions = [];
    
    if (searchParams.location) {
      suggestions.push(`Try searching in nearby areas around ${searchParams.location}`);
    }
    
    if (searchParams.startTime) {
      const altTime = new Date(searchParams.startTime);
      altTime.setHours(altTime.getHours() + 1);
      suggestions.push(`Try booking for ${this.formatTimeForDisplay(altTime)} instead`);
    }
    
    if (searchParams.startTime && searchParams.endTime) {
      const duration = this.getBookingDuration(searchParams.startTime, searchParams.endTime);
      suggestions.push(`Try booking for a shorter duration than ${duration}`);
    }
    
    suggestions.push('Check our featured parking areas with guaranteed availability');
    suggestions.push('Contact our support team for personalized assistance');
    
    return suggestions;
  }

  // Check availability status and provide user-friendly message
  getAvailabilityMessage(area, searchParams) {
    const availableSpots = area.availableSpotsForTime || area.availableSpots;
    
    if (availableSpots === 0) {
      return '❌ Fully booked';
    } else if (availableSpots <= 2) {
      return `⚠️ Only ${availableSpots} spot${availableSpots !== 1 ? 's' : ''} left`;
    } else if (availableSpots <= 5) {
      return `✅ ${availableSpots} spots available`;
    } else {
      return `✅ ${availableSpots} spots available`;
    }
  }

  // Generate comprehensive search results with additional context
  generateEnhancedSearchResults(areas, searchParams) {
    if (areas.length === 0) {
      const alternatives = this.generateAlternativeSuggestions(searchParams);
      let message = "😔 **No Available Parking Found**\n\n";
      message += "I couldn't find any parking spaces matching your exact requirements.\n\n";
      message += "**Here are some alternatives:**\n";
      alternatives.forEach((suggestion, index) => {
        message += `${index + 1}. ${suggestion}\n`;
      });
      return message;
    }

    let message = `🎯 **Found ${areas.length} Parking Option${areas.length !== 1 ? 's' : ''}**\n\n`;
    
    if (searchParams.location) {
      message += `📍 **Location:** Near "${searchParams.location}"\n`;
    }
    
    if (searchParams.startTime && searchParams.endTime) {
      const duration = this.getBookingDuration(searchParams.startTime, searchParams.endTime);
      message += `⏰ **Duration:** ${duration}\n`;
      message += `📅 **Time:** ${this.formatTimeForDisplay(searchParams.startTime)} - ${this.formatTimeForDisplay(searchParams.endTime)}\n`;
    }
    
    message += "\n**Available Options:**\n\n";

    const formattedAreas = this.formatParkingAreasForDisplay(areas.slice(0, 5));
    
    formattedAreas.forEach((area, index) => {
      const availabilityMsg = this.getAvailabilityMessage(area, searchParams);
      const pricing = searchParams.startTime && searchParams.endTime ? 
        this.calculatePrice(area.pricePerHour, searchParams.startTime, searchParams.endTime) : null;
      
      message += `**${index + 1}. ${area.name}**\n`;
      message += `📍 ${area.address}\n`;
      message += `🅿️ ${availabilityMsg}\n`;
      
      if (pricing) {
        message += `💰 ${this.formatCurrency(pricing.totalAmount)} (${this.formatCurrency(area.pricePerHour)}/hour)\n`;
      } else {
        message += `💰 ${this.formatCurrency(area.pricePerHour)}/hour\n`;
      }
      
      if (area.distance) message += `📏 ${area.distance}\n`;
      if (area.rating) message += `⭐ ${area.rating}\n`;
      
      if (area.features && area.features.length > 0) {
        const topFeatures = area.features.slice(0, 3);
        message += `✨ ${topFeatures.join(', ')}\n`;
      }
      
      message += "\n";
    });

    message += "🚗 **Tap any parking space above to book instantly!**\n\n";
    
    if (areas.length > 5) {
      message += `_Showing top 5 results. ${areas.length - 5} more available._`;
    }
    
    return message;
  }

  // Generate booking summary for confirmation
  generateBookingSummary(bookingData, parkingArea, pricing) {
    const startTime = new Date(bookingData.startTime);
    const endTime = new Date(bookingData.endTime);
    const duration = this.getBookingDuration(bookingData.startTime, bookingData.endTime);
    
    return `
📋 **Booking Summary**

**🏢 Parking Area:** ${parkingArea.name}
**📍 Address:** ${parkingArea.address}
**🚗 Slot:** ${bookingData.slotId || 'Auto-assigned'}

**⏰ Booking Details:**
• **Date:** ${startTime.toDateString()}
• **Time:** ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}
• **Duration:** ${duration}

**💰 Pricing Breakdown:**
• **Base Amount:** ${this.formatCurrency(pricing.baseAmount)}
• **Tax (18% GST):** ${this.formatCurrency(pricing.tax)}
• **Total Amount:** ${this.formatCurrency(pricing.totalAmount)}

**📱 Booking ID:** ${bookingData.bookingId}
    `.trim();
  }

  // Handle booking errors with user-friendly messages
  handleBookingError(error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('already booked') || errorMessage.includes('occupied')) {
      return {
        title: '🚫 Slot Unavailable',
        message: 'This parking slot was just booked by another user. Please try selecting a different slot or time.',
        suggestion: 'Select another available slot from the list above.'
      };
    } else if (errorMessage.includes('payment')) {
      return {
        title: '💳 Payment Issue',
        message: 'There was a problem processing your payment. Your slot is still available.',
        suggestion: 'Please try again or use a different payment method.'
      };
    } else if (errorMessage.includes('time') || errorMessage.includes('past')) {
      return {
        title: '⏰ Invalid Time',
        message: 'The selected booking time is invalid or in the past.',
        suggestion: 'Please select a future time for your booking.'
      };
    } else if (errorMessage.includes('user') || errorMessage.includes('auth')) {
      return {
        title: '👤 User Authentication',
        message: 'Please make sure you are logged in to complete the booking.',
        suggestion: 'Try refreshing the page and logging in again.'
      };
    } else {
      return {
        title: '❌ Booking Failed',
        message: error.message || 'An unexpected error occurred while processing your booking.',
        suggestion: 'Please try again or contact our support team for assistance.'
      };
    }
  }

  // Generate help message for users
  generateHelpMessage() {
    return `
🤖 **Hi! I'm Parky, your parking assistant!**

**I can help you with:**
• 🔍 Finding available parking spaces
• 📅 Booking parking slots
• 💰 Checking prices and availability
• ❓ Answering questions about payments and policies

**How to book parking:**
Just tell me where and when you need parking! For example:
• "Book parking in Bangalore from 2pm to 4pm today"
• "Find parking near MG Road for 3 hours"
• "I need parking tomorrow at 9am"

**Quick Commands:**
• "Find parking near me"
• "Check prices in [location]"
• "Cancel my booking"
• "Show my bookings"

**Need help?** Just ask me anything about parking! 🅿️
    `.trim();
  }

  // Process natural language queries for better understanding
  processNaturalLanguageQuery(message) {
    const processed = {
      intent: 'general',
      entities: {},
      confidence: 0.5
    };

    const lowerMessage = message.toLowerCase();

    // Determine intent
    if (this.isBookingIntent(message)) {
      processed.intent = 'booking';
      processed.confidence = 0.8;
    } else if (lowerMessage.includes('cancel')) {
      processed.intent = 'cancellation';
      processed.confidence = 0.9;
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      processed.intent = 'pricing_inquiry';
      processed.confidence = 0.7;
    } else if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
      processed.intent = 'help';
      processed.confidence = 0.9;
    }

    // Extract entities
    const searchParams = this.parseUserMessage(message);
    processed.entities = {
      location: searchParams.location,
      startTime: searchParams.startTime,
      endTime: searchParams.endTime,
      duration: searchParams.duration
    };

    return processed;
  }
}

const chatbotParkingService = new ChatbotParkingService();
export default chatbotParkingService;