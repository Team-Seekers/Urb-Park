// src/components/Chatbot.jsx
// Enhanced Chatbot with Firebase parking integration

import React, { useState, useRef, useEffect } from "react";
import { getBotResponseStream, getParkingSpaceDetails, createBookingWithPayment } from "../services/geminiService";
import chatbotParkingService from "../services/parkingChatbot";
import BookingModal from "./Bookingmodel";
import { ICONS } from "../constants";
import { useNavigate } from "react-router-dom";

const Chatbot = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm Parky, your parking assistant! 🅿\n\nI can help you:\n• Find available parking spaces\n• Book parking slots\n• Check prices and availability\n• Answer questions about payments\n\nJust tell me where and when you need parking! For example:\n\"Book parking in Bangalore from 2pm to 4pm today\"",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [lastSearchParams, setLastSearchParams] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for parking search results
  useEffect(() => {
    const handleSearchResults = (event) => {
      const { results, searchParams } = event.detail;
      setSearchResults(results);
      setLastSearchParams(searchParams);
    };

    window.addEventListener('parkingSearchResults', handleSearchResults);
    return () => window.removeEventListener('parkingSearchResults', handleSearchResults);
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setSearchResults([]); // Clear previous results

    try {
      let assistantContent = "";
      
      const assistantMessage = {
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);

      // Stream the response
      for await (const chunk of getBotResponseStream(messages, inputMessage)) {
        assistantContent += chunk;
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = assistantContent;
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleParkingSpaceClick = async (space) => {
    try {
      // Get detailed information about the parking space
      const detailedSpace = await getParkingSpaceDetails(space.id);
      if (detailedSpace) {
        setSelectedSpace({
          ...detailedSpace,
          availableSpotsForTime: space.availableSpotsForTime || space.availableSpots
        });
        setShowBookingModal(true);
      }
    } catch (error) {
      console.error("Error fetching space details:", error);
      // Fallback to basic space info
      setSelectedSpace(space);
      setShowBookingModal(true);
    }
  };
  
  const handleBookingConfirm = async (bookingData) => {
    try {
      setShowBookingModal(false);
  
      // Add a message showing booking is being processed
      const processingMessage = {
        role: "assistant",
        content: "🔄 Processing your booking...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, processingMessage]);
  
      // Create the booking
      const result = await chatbotParkingService.createBooking({
        parkingId: selectedSpace.id,
        slotId: bookingData.slotId, // This might be auto-assigned
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        userDetails: bookingData.userDetails,
        vehicleDetails: bookingData.vehicleDetails
      });
  
      // Calculate pricing
      const pricing = chatbotParkingService.calculatePrice(
        selectedSpace.pricePerHour,
        bookingData.startTime,
        bookingData.endTime
      );
  
      if (result.success) {
        const confirmationMessage = chatbotParkingService.generateBookingConfirmation(
          result.data,
          selectedSpace,
          pricing
        );
  
        // Update the last message with booking confirmation
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = confirmationMessage;
          return newMessages;
        });
  
        // Add payment button/instructions
        setTimeout(() => {
          const paymentMessage = {
            role: "assistant",
            content: `💳 **Next Step: Complete Payment**\n\nAmount: ₹${pricing.totalAmount.toFixed(
              2
            )}\n\nChoose your payment method:\n• Online Payment (Instant confirmation)\n• Pay at Parking (Cash/Card)\n\n*Click below to proceed with payment*`,
            timestamp: new Date(),
            paymentData: {
              amount: pricing.totalAmount,
              bookingId: result.data.bookingId,
              pricing
            }
          };
          setMessages((prev) => [...prev, paymentMessage]);
        }, 1000);
  
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Booking error:", error);
      const errorMessage = {
        role: "assistant",
        content: `❌ **Booking Failed**\n\n${error.message}\n\nWould you like to try a different time slot or parking space?`,
        timestamp: new Date(),
      };
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = errorMessage;
        return newMessages;
      });
    }
  };
  
  const handlePayment = async (paymentData) => {
    try {
      // Add processing message
      const processingMessage = {
        role: "assistant",
        content: "💳 Processing payment...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, processingMessage]);
  
      // Process payment through your existing payment integration
      const paymentResult = await createBookingWithPayment(
        {
          parkingId: selectedSpace.id,
          startTime: lastSearchParams?.startTime,
          endTime: lastSearchParams?.endTime,
          userDetails: paymentData.userDetails,
          vehicleDetails: paymentData.vehicleDetails
        },
        paymentData
      );
  
      if (paymentResult.success) {
        // Generate QR code for successful booking
        let qrCode = null;
        try {
          qrCode = await chatbotParkingService.generateQRCode(paymentResult.data.bookingId);
        } catch (qrError) {
          console.error("QR generation error:", qrError);
        }
  
        const successMessage = {
          role: "assistant",
          content: `✅ **Payment Successful!**\n\n🎫 **Your Digital Parking Ticket**\n\nBooking ID: ${paymentResult.data.bookingId}\nPayment ID: ${paymentResult.data.paymentId}\n\n📱 Show this QR code at the parking entrance:\n\n*QR Code will be displayed below*\n\n**Need Help?**\n• Call: 1800-URBPARK\n• Email: support@urbpark.com\n\nHave a great day! 🚗✨`,
          timestamp: new Date(),
          qrCode: qrCode,
          bookingData: paymentResult.data
        };
  
        // Update the last message with success
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = successMessage;
          return newMessages;
        });
      } else {
        throw new Error(paymentResult.message);
      }
    } catch (error) {
      console.error("Payment error:", error);
      const errorMessage = {
        role: "assistant",
        content: `❌ **Payment Failed**\n\n${error.message}\n\nYou can try again or contact our support team.\n\nWould you like to try a different payment method?`,
        timestamp: new Date(),
      };
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = errorMessage;
        return newMessages;
      });
    }
  };
  
  const renderMessage = (message, index) => {
    const isUser = message.role === "user";
    const isLastMessage = index === messages.length - 1;

    return (
      <div
        key={index}
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      >
        <div
          className={`max-w-[80%] p-3 rounded-lg ${
            isUser
              ? "bg-blue-500 text-white rounded-br-none"
              : "bg-gray-100 text-gray-800 rounded-bl-none"
          }`}
        >
          {/* Message content with markdown-like formatting */}
          <div className="whitespace-pre-wrap">
            {message.content.split('\n').map((line, lineIndex) => {
              // Handle bold text *text*
              if (line.includes('')) {
                const parts = line.split('');
                return (
                  <div key={lineIndex}>
                    {parts.map((part, partIndex) => 
                      partIndex % 2 === 1 ? 
                        <strong key={partIndex}>{part}</strong> : 
                        part
                    )}
                  </div>
                );
              }
              return <div key={lineIndex}>{line}</div>;
            })}
          </div>

          {/* QR Code display */}
          {message.qrCode && (
            <div className="mt-3 p-2 bg-white rounded flex justify-center">
              <img 
                src={message.qrCode} 
                alt="Booking QR Code" 
                className="w-32 h-32"
              />
            </div>
          )}

          {/* Payment button for payment messages */}
          {message.paymentData && !isUser && (
            <div className="mt-3">
              <button
                onClick={() => handlePayment(message.paymentData)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                💳 Pay ₹{message.paymentData.amount.toFixed(2)}
              </button>
            </div>
          )}

          {/* Timestamp */}
          <div className={`text-xs mt-2 ${isUser ? "text-blue-100" : "text-gray-500"}`}>
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  const renderSearchResults = () => {
    if (searchResults.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-3">Available Parking Spaces:</h3>
          <div className="grid gap-3">
            {searchResults.slice(0, 3).map((space, index) => (
              <div
                key={space.id}
                onClick={() => handleParkingSpaceClick(space)}
                className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-800">{space.name}</h4>
                  <span className="text-green-600 font-semibold">
                    ₹{space.pricePerHour}/hr
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{space.address}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    🅿 {space.availableSpotsForTime || space.availableSpots}/{space.totalSpots} available
                  </span>
                  {space.distance && (
                    <span className="text-gray-600">📏 {space.distance}</span>
                  )}
                </div>
                {space.rating && (
                  <div className="mt-1">
                    <span className="text-yellow-500">⭐ {space.rating}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {searchResults.length > 3 && (
            <button
              onClick={() => navigate('/parking-areas')}
              className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View all {searchResults.length} results →
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-800 rounded-full flex items-center justify-center">
            <span className="text-xl">🅿</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Parky - Your Parking Assistant</h2>
            <p className="text-blue-100 text-sm">
              {isLoading ? "Typing..." : "Online • Ready to help"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => renderMessage(message, index))}
        
        {/* Search Results */}
        {renderSearchResults()}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg rounded-bl-none">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <div className="flex space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about parking... (e.g., 'Book parking in Bangalore from 2pm to 4pm')"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className={`px-6 py-2 rounded-lg transition-colors duration-200 ${
              isLoading || !inputMessage.trim()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            "Find parking near me",
            "Book for 2 hours",
            "Check prices in Bangalore",
            "Cancel booking"
          ].map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setInputMessage(suggestion)}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors duration-200"
              disabled={isLoading}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedSpace && (
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          parkingSpace={selectedSpace}
          searchParams={lastSearchParams}
          onConfirm={handleBookingConfirm}
        />
      )}
    </div>
  );
};

export default Chatbot;