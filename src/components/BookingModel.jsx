// src/components/BookingModal.jsx
import React, { useState, useEffect } from 'react';
import parkingBookingService from '../services/parkingBookingService';

const BookingModal = ({ space, onClose, onConfirm, searchParams }) => {
  const [bookingDetails, setBookingDetails] = useState({
    startTime: searchParams?.startTime || '',
    endTime: searchParams?.endTime || '',
    userDetails: {
      name: '',
      phone: '',
      email: ''
    },
    vehicleDetails: {
      number: '',
      type: 'car'
    }
  });

  const [pricing, setPricing] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Calculate pricing when times change
  useEffect(() => {
    if (bookingDetails.startTime && bookingDetails.endTime && space) {
      const calculatedPricing = parkingBookingService.calculatePrice(
        space.pricePerHour,
        bookingDetails.startTime,
        bookingDetails.endTime
      );
      setPricing(calculatedPricing);
    }
  }, [bookingDetails.startTime, bookingDetails.endTime, space]);

  const handleInputChange = (section, field, value) => {
    setBookingDetails(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));

    // Clear error when user starts typing
    if (errors[`${section}.${field}`]) {
      setErrors(prev => ({
        ...prev,
        [`${section}.${field}`]: null
      }));
    }
  };

  const handleTimeChange = (field, value) => {
    setBookingDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!bookingDetails.userDetails.name) {
      newErrors['userDetails.name'] = 'Name is required';
    }
    if (!bookingDetails.userDetails.phone) {
      newErrors['userDetails.phone'] = 'Phone is required';
    }
    if (!bookingDetails.userDetails.email) {
      newErrors['userDetails.email'] = 'Email is required';
    }
    if (!bookingDetails.vehicleDetails.number) {
      newErrors['vehicleDetails.number'] = 'Vehicle number is required';
    }
    if (!bookingDetails.startTime) {
      newErrors['startTime'] = 'Start time is required';
    }
    if (!bookingDetails.endTime) {
      newErrors['endTime'] = 'End time is required';
    }
    if (bookingDetails.startTime && bookingDetails.endTime) {
      const start = new Date(bookingDetails.startTime);
      const end = new Date(bookingDetails.endTime);
      if (end <= start) {
        newErrors['endTime'] = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBooking = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const bookingData = {
        spaceId: space.id,
        ...bookingDetails,
        totalAmount: pricing.totalAmount
      };

      const result = await parkingBookingService.createBooking(bookingData);

      if (result.success) {
        onConfirm({
          ...result.data,
          space,
          pricing
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Book Parking Slot</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {/* Space Details */}
        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <h3 className="font-semibold">{space.name}</h3>
          <p className="text-sm text-gray-600">{space.location}</p>
          <p className="text-sm">₹{space.pricePerHour}/hour • {space.availableSpots} spots available</p>
        </div>

        {/* Time Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Start Time</label>
          <input
            type="datetime-local"
            value={bookingDetails.startTime}
            onChange={(e) => handleTimeChange('startTime', e.target.value)}
            className={`w-full p-2 border rounded-lg ${errors.startTime ? 'border-red-500' : 'border-gray-300'}`}
            min={new Date().toISOString().slice(0, 16)}
          />
          {errors.startTime && <p className="text-red-500 text-xs mt-1">{errors.startTime}</p>}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">End Time</label>
          <input
            type="datetime-local"
            value={bookingDetails.endTime}
            onChange={(e) => handleTimeChange('endTime', e.target.value)}
            className={`w-full p-2 border rounded-lg ${errors.endTime ? 'border-red-500' : 'border-gray-300'}`}
            min={bookingDetails.startTime}
          />
          {errors.endTime && <p className="text-red-500 text-xs mt-1">{errors.endTime}</p>}
        </div>

        {/* User Details */}
        <div className="mb-4">
          <h4 className="font-medium mb-2">Your Details</h4>
          <input
            type="text"
            placeholder="Full Name"
            value={bookingDetails.userDetails.name}
            onChange={(e) => handleInputChange('userDetails', 'name', e.target.value)}
            className={`w-full p-2 border rounded-lg mb-2 ${errors['userDetails.name'] ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors['userDetails.name'] && <p className="text-red-500 text-xs mb-2">{errors['userDetails.name']}</p>}

          <input
            type="tel"
            placeholder="Phone Number"
            value={bookingDetails.userDetails.phone}
            onChange={(e) => handleInputChange('userDetails', 'phone', e.target.value)}
            className={`w-full p-2 border rounded-lg mb-2 ${errors['userDetails.phone'] ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors['userDetails.phone'] && <p className="text-red-500 text-xs mb-2">{errors['userDetails.phone']}</p>}

          <input
            type="email"
            placeholder="Email"
            value={bookingDetails.userDetails.email}
            onChange={(e) => handleInputChange('userDetails', 'email', e.target.value)}
            className={`w-full p-2 border rounded-lg ${errors['userDetails.email'] ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors['userDetails.email'] && <p className="text-red-500 text-xs mt-1">{errors['userDetails.email']}</p>}
        </div>

        {/* Vehicle Details */}
        <div className="mb-4">
          <h4 className="font-medium mb-2">Vehicle Details</h4>
          <input
            type="text"
            placeholder="Vehicle Number (e.g., KA01AB1234)"
            value={bookingDetails.vehicleDetails.number}
            onChange={(e) => handleInputChange('vehicleDetails', 'number', e.target.value.toUpperCase())}
            className={`w-full p-2 border rounded-lg mb-2 ${errors['vehicleDetails.number'] ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors['vehicleDetails.number'] && <p className="text-red-500 text-xs mb-2">{errors['vehicleDetails.number']}</p>}

          <select
            value={bookingDetails.vehicleDetails.type}
            onChange={(e) => handleInputChange('vehicleDetails', 'type', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="car">Car</option>
            <option value="bike">Bike</option>
            <option value="truck">Truck</option>
          </select>
        </div>

        {/* Pricing */}
        {pricing && (
          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <h4 className="font-medium mb-2">Pricing Details</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Duration: {pricing.hours} hour(s)</span>
              </div>
              <div className="flex justify-between">
                <span>Base Amount:</span>
                <span>₹{pricing.baseAmount}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (18%):</span>
                <span>₹{pricing.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Total Amount:</span>
                <span>₹{pricing.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleBooking}
            disabled={isLoading || !pricing}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : `Book for ₹${pricing?.totalAmount.toFixed(2) || 0}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
