// File: src/services/parkingChatbot.js
// Chatbot service to handle parking queries with backend integration

class ParkingChatbot {
  constructor(backendUrl = 'http://localhost:3000') {
    this.backendUrl = backendUrl;
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

    // Extract location (common Indian cities and areas)
    const locationPatterns = [
      /(?:for|in)\s+([a-zA-Z\s]+?)(?:\s+(?:from|on|at|days|area|city))/i,
      /(?:bengaluru|bangalore|mumbai|delhi|chennai|hyderabad|pune|kolkata)/gi,
      /(?:downtown|city center|airport|electronic city|koramangala|indiranagar)/gi
    ];

    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match) {
        parsed.location = match[1] || match[0];
        break;
      }
    }

    // Extract date
    const dateMatches = [
      message.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)/i),
      message.match(/(august\s+\d{1,2}(?:st|nd|rd|th)?)/i),
      message.match(/(\d{1,2}\/\d{1,2}\/?\d{0,4})/),
      message.match(/(today|tomorrow)/i)
    ];
    
    for (const match of dateMatches) {
      if (match) {
        parsed.date = match[1];
        break;
      }
    }

    // Extract time range
    const timeMatch = message.match(/from\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
    if (timeMatch) {
      parsed.startTime = timeMatch[1];
      parsed.endTime = timeMatch[2];
    }

    return parsed;
  }

  // Search for parking spaces
  async searchParkingSpaces(location, time = null) {
    try {
      console.log('Searching for parking in:', location);
      
      const response = await fetch(`${this.backendUrl}/api/parking-spaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: location,
          time: time || new Date().toISOString()
        })
      });

      const data = await response.json();
      console.log('Backend response:', data);
      return data;
    } catch (error) {
      console.error('Error searching parking spaces:', error);
      return { 
        success: false, 
        message: 'Sorry, I cannot connect to the parking service right now. Please try again later.' 
      };
    }
  }

  // Format parking results for chat display
  formatParkingResults(results) {
    if (!results.success || !results.data || results.data.length === 0) {
      return `❌ **No parking spaces found**\n\nTry searching for:\n• Downtown areas\n• Specific neighborhoods\n• Popular locations like "Electronic City", "Koramangala", etc.`;
    }

    let response = `🅿️ **Found ${results.count} available parking spot${results.count > 1 ? 's' : ''}:**\n\n`;
    
    results.data.slice(0, 3).forEach((spot, index) => { // Show max 3 results
      response += `**${index + 1}. ${spot.name}**\n`;
      response += `📍 ${spot.address}\n`;
      response += `💰 ${spot.price}\n`;
      response += `🚗 ${spot.availability}\n`;
      
      if (spot.rating > 0) {
        response += `⭐ ${spot.rating}/5\n`;
      }
      
      if (spot.features && spot.features.length > 0) {
        response += `✨ ${spot.features.join(', ')}\n`;
      }
      
      response += `\n`;
    });

    if (results.data.length > 3) {
      response += `... and ${results.data.length - 3} more spots available.\n\n`;
    }

    response += `\n🔗 **Ready to book?** Click on any parking spot above to proceed with booking!`;
    return response;
  }

  // Main chat response handler
  async handleUserMessage(message) {
    const userMessage = message.toLowerCase().trim();
    
    // Handle parking search requests
    if (this.isParkingQuery(userMessage)) {
      const parsed = this.parseUserMessage(message);
      
      if (parsed.location) {
        const results = await this.searchParkingSpaces(parsed.location);
        return this.formatParkingResults(results);
      } else {
        return "🔍 **I'd love to help you find parking!**\n\nPlease tell me the location where you need parking.\n\n**Examples:**\n• \"Find parking in Bengaluru\"\n• \"Book a spot in Electronic City\"\n• \"Parking near Koramangala\"";
      }
    }
    
    // Handle booking confirmations
    if (userMessage.includes('book') && (userMessage.includes('yes') || userMessage.includes('confirm'))) {
      return "✅ **Great choice!**\n\nTo complete your booking:\n1. Click the **'View Details & Book'** button on your chosen spot\n2. Select your time slot\n3. Complete payment\n4. Get your QR code instantly!\n\nNeed help with anything else?";
    }
    
    // Handle help requests
    if (userMessage.includes('help') || userMessage.includes('how')) {
      return "🤖 **Hi! I'm Parky, your parking assistant**\n\nI can help you:\n• 🔍 Find available parking spots\n• 💰 Compare prices in real-time\n• 📅 Check availability for specific times\n• 🚗 Book spots instantly\n\n**Just tell me where you need parking!**\n\nExample: *\"Find parking in Bengaluru for 2 hours\"*";
    }

    // Handle greetings
    if (this.isGreeting(userMessage)) {
      return "👋 **Hello! I'm Parky**\n\nI'm here to help you find and book parking spots quickly and easily!\n\n🔍 **Where would you like to park?**\n\nJust tell me the location and I'll show you available spots with real-time pricing.";
    }
    
    // Default response
    return "🤔 **I'm not sure I understand**\n\nI can help you find parking spots! Try asking:\n• \"Find parking in [location]\"\n• \"Book a spot near [area]\"\n• \"Show parking options in [city]\"\n\nWhat location are you looking for?";
  }

  // Helper methods
  isParkingQuery(message) {
    const parkingKeywords = ['parking', 'park', 'spot', 'book', 'reserve', 'find', 'need', 'looking'];
    return parkingKeywords.some(keyword => message.includes(keyword));
  }

  isGreeting(message) {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    return greetings.some(greeting => message.includes(greeting));
  }
}

export default ParkingChatbot;