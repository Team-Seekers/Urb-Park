import React from "react";

const SpotSelectionGrid = ({ spots, selectedSpotId, onSelectSpot, statusMap = {} }) => {
  const getSpotClasses = (spot) => {
    const baseClasses =
      "w-full h-12 rounded-md flex items-center justify-center font-bold text-sm border-2 transition-colors duration-200";

    if (spot.id === selectedSpotId) {
      return `${baseClasses} bg-blue-600 text-white border-blue-700 ring-2 ring-offset-1 ring-blue-600`;
    }

    // Use statusMap to determine color based on time-based availability
    const slotStatus = statusMap[spot.id] || "available";
    
    switch (slotStatus) {
      case "available":
        return `${baseClasses} bg-green-200 text-green-800 border-green-400 hover:bg-green-300 cursor-pointer`;
      case "booked":
        return `${baseClasses} bg-red-300 text-red-900 border-red-500 cursor-not-allowed`;
      default:
        return `${baseClasses} bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed`;
    }
  };

  const handleSpotClick = (spot) => {
    const slotStatus = statusMap[spot.id] || "available";
    if (slotStatus === "available") {
      onSelectSpot(spot.id);
    }
  };

  const Legend = () => (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 text-sm text-gray-600">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-green-200 border-2 border-green-400"></div>
        Available
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-red-300 border-2 border-red-500"></div>
        Booked
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-blue-600 border-2 border-blue-700"></div>
        Selected
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <div className="bg-gray-700 text-white text-center py-2 rounded-t-lg font-semibold">
        ENTRANCE
      </div>
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2 p-4 bg-gray-50 rounded-b-lg border-x-2 border-b-2 border-gray-200">
        {spots.map((spot) => {
          const slotStatus = statusMap[spot.id] || "available";
          return (
            <button
              key={spot.id}
              onClick={() => handleSpotClick(spot)}
              disabled={slotStatus === "booked"}
              className={getSpotClasses(spot)}
              aria-label={`Spot ${spot.id}, Status: ${
                slotStatus === "available" ? "Available" : "Booked"
              }`}
              aria-pressed={spot.id === selectedSpotId}
            >
              {spot.id.replace("slot", "").replace("S-", "")}
            </button>
          );
        })}
      </div>
      <Legend />
    </div>
  );
};

export default SpotSelectionGrid;
