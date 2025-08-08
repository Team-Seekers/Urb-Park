import React from "react";
import { toast } from "react-toastify";

const SpotSelectionGrid = ({ 
  spots, 
  selectedSpotId, 
  onSelectSpot, 
  statusMap = {},
  isLoading = false,
  startTime,
  endTime 
}) => {
  
  const getSpotClasses = (spot) => {
    const baseClasses = "w-full h-12 rounded-md flex items-center justify-center font-bold text-sm border-2 transition-all duration-200 relative";
    
    // Show loading state
    if (isLoading) {
      return `${baseClasses} bg-gray-100 text-gray-400 border-gray-300 cursor-wait animate-pulse`;
    }
    
    // Get current status from statusMap
    const slotStatus = statusMap[spot.id] || "available";
    
    // Selected spot styling
    if (spot.id === selectedSpotId) {
      if (slotStatus === "available") {
        return `${baseClasses} bg-blue-600 text-white border-blue-700 ring-2 ring-offset-1 ring-blue-600 shadow-lg transform scale-105`;
      } else {
        // Selected spot became unavailable
        return `${baseClasses} bg-red-500 text-white border-red-600 ring-2 ring-offset-1 ring-red-500 cursor-not-allowed`;
      }
    }
    
    // Status-based styling
    switch (slotStatus) {
      case "available":
        return `${baseClasses} bg-green-200 text-green-800 border-green-400 hover:bg-green-300 hover:border-green-500 hover:scale-105 cursor-pointer shadow-sm hover:shadow-md`;
      case "booked":
        return `${baseClasses} bg-red-300 text-red-900 border-red-500 cursor-not-allowed opacity-80`;
      case "maintenance":
        return `${baseClasses} bg-yellow-200 text-yellow-800 border-yellow-400 cursor-not-allowed opacity-80`;
      default:
        return `${baseClasses} bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed opacity-60`;
    }
  };

  const handleSpotClick = (spot) => {
    if (isLoading) {
      toast.info("Please wait while we update slot availability...");
      return;
    }

    const slotStatus = statusMap[spot.id] || "available";
    
    console.log(`Spot ${spot.id} clicked, status: ${slotStatus}`);
    
    if (slotStatus === "available") {
      onSelectSpot(spot.id);
    } else if (slotStatus === "booked") {
      toast.warn(`Slot ${spot.id.replace("slot", "")} is not available for the selected time period. Please choose another slot.`);
    } else if (slotStatus === "maintenance") {
      toast.warn(`Slot ${spot.id.replace("slot", "")} is under maintenance. Please choose another slot.`);
    }
  };

  const getSpotDisplayText = (spot) => {
    const spotNumber = spot.id.replace("slot", "").replace("S-", "");
    
    if (isLoading) {
      return "...";
    }
    
    return spotNumber;
  };

  const getAriaLabel = (spot) => {
    const spotNumber = spot.id.replace("slot", "").replace("S-", "");
    const slotStatus = statusMap[spot.id] || "available";
    
    if (isLoading) {
      return `Spot ${spotNumber}, Loading...`;
    }
    
    let statusText = "";
    switch (slotStatus) {
      case "available":
        statusText = "Available";
        break;
      case "booked":
        statusText = "Booked for selected time";
        break;
      case "maintenance":
        statusText = "Under Maintenance";
        break;
      default:
        statusText = "Unknown";
    }
    
    return `Spot ${spotNumber}, Status: ${statusText}${spot.id === selectedSpotId ? ", Selected" : ""}`;
  };

  const Legend = () => (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 text-sm text-gray-600">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-green-200 border-2 border-green-400"></div>
        <span>Available</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-red-300 border-2 border-red-500"></div>
        <span>Booked</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-blue-600 border-2 border-blue-700"></div>
        <span>Selected</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-yellow-200 border-2 border-yellow-400"></div>
        <span>Maintenance</span>
      </div>
      {isLoading && (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-100 border-2 border-gray-300 animate-pulse"></div>
          <span>Loading...</span>
        </div>
      )}
    </div>
  );

  const getAvailableCount = () => {
    if (isLoading || !statusMap) return "...";
    return Object.values(statusMap).filter(status => status === "available").length;
  };

  const getTotalCount = () => {
    return spots.length;
  };

  const getBookedCount = () => {
    if (isLoading || !statusMap) return 0;
    return Object.values(statusMap).filter(status => status === "booked").length;
  };

  return (
    <div className="w-full">
      {/* Header with real-time info */}
      <div className="bg-gray-700 text-white text-center py-3 rounded-t-lg font-semibold relative">
        <div>ENTRANCE</div>
        {(startTime && endTime) && (
          <div className="text-xs mt-1 opacity-90">
            {new Date(startTime).toLocaleString()} - {new Date(endTime).toLocaleString()}
          </div>
        )}
        {isLoading && (
          <div className="absolute top-1 right-3">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Availability Summary */}
      <div className="bg-gray-100 px-4 py-2 text-center text-sm text-gray-600 border-x-2 border-gray-200">
        <span className="font-medium">
          {getAvailableCount()} of {getTotalCount()} spots available
        </span>
        {getBookedCount() > 0 && !isLoading && (
          <span className="ml-2 text-red-600">
            • {getBookedCount()} booked for selected time
          </span>
        )}
        {isLoading && (
          <span className="ml-2 text-blue-600 animate-pulse">
            • Checking availability...
          </span>
        )}
      </div>

      {/* Spots Grid */}
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2 p-4 bg-gray-50 rounded-b-lg border-x-2 border-b-2 border-gray-200 min-h-[200px]">
        {spots.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-8 text-gray-500">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
              <p>Loading parking spots...</p>
            </div>
          </div>
        ) : (
          spots.map((spot) => {
            const slotStatus = statusMap[spot.id] || "available";
            const isDisabled = slotStatus === "booked" || slotStatus === "maintenance" || isLoading;
            
            return (
              <button
                key={spot.id}
                onClick={() => handleSpotClick(spot)}
                disabled={isDisabled}
                className={getSpotClasses(spot)}
                aria-label={getAriaLabel(spot)}
                aria-pressed={spot.id === selectedSpotId}
                title={getAriaLabel(spot)}
              >
                {getSpotDisplayText(spot)}
                
                {/* Status indicators */}
                {slotStatus === "booked" && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white" title="Booked for selected time"></div>
                )}
                {spot.id === selectedSpotId && slotStatus === "available" && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white" title="Selected"></div>
                )}
                {slotStatus === "maintenance" && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border border-white" title="Under maintenance"></div>
                )}
                {isLoading && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border border-white animate-pulse" title="Loading..."></div>
                )}
              </button>
            );
          })
        )}
      </div>

      <Legend />

      {/* Real-time update notice */}
      <div className="mt-3 text-xs text-gray-500 text-center bg-blue-50 p-2 rounded-lg">
        <span className="inline-flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-blue-500 animate-pulse'}`}></div>
          {isLoading ? 'Updating slot availability...' : 'Real-time updates: Slot availability refreshes automatically'}
        </span>
      </div>
    </div>
  );
};

export default SpotSelectionGrid;