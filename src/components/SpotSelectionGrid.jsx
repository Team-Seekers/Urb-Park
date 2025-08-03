import React from "react";
import { SpotStatus } from "../../types";

const SpotSelectionGrid = ({ spots, selectedSpotId, onSelectSpot }) => {
  const getSpotClasses = (spot) => {
    const baseClasses =
      "w-full h-12 rounded-md flex items-center justify-center font-bold text-sm border-2 transition-colors duration-200";

    if (spot.id === selectedSpotId) {
      return `${baseClasses} bg-green-600 text-white border-green-700 ring-2 ring-offset-1 ring-green-600`;
    }

    switch (spot.status) {
      case SpotStatus.AVAILABLE:
        return `${baseClasses} bg-green-100 text-green-600 border-green-300 hover:bg-green-200 cursor-pointer`;
      case SpotStatus.OCCUPIED:
      case SpotStatus.RESERVED:
      case SpotStatus.UNAVAILABLE:
      default:
        return `${baseClasses} bg-red-200 text-red-700 border-red-400 cursor-not-allowed`;
    }
  };

  const handleSpotClick = (spot) => {
    if (spot.status === SpotStatus.AVAILABLE) {
      onSelectSpot(spot.id);
    }
  };

  const Legend = () => (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 text-sm text-gray-600">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-300"></div>
        Available
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-red-200 border-2 border-red-400"></div>
        Booked
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-green-600 border-2 border-green-700"></div>
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
        {spots.map((spot) => (
          <button
            key={spot.id}
            onClick={() => handleSpotClick(spot)}
            disabled={spot.status !== SpotStatus.AVAILABLE}
            className={getSpotClasses(spot)}
            aria-label={`Spot ${spot.id}, Status: ${
              spot.status === SpotStatus.AVAILABLE ? "Available" : "Booked"
            }`}
            aria-pressed={spot.id === selectedSpotId}
          >
            {spot.id.replace("S-", "")}
          </button>
        ))}
      </div>
      <Legend />
    </div>
  );
};

export default SpotSelectionGrid;
