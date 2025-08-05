import React from "react";
import { Link } from "react-router-dom";
import { ICONS } from "../constants";
import Rating from "./Rating";

const ParkingCard = ({ lot }) => {
  const availabilityRatio = lot.availableSpots / lot.totalSpots;
  const availabilityColor =
    availabilityRatio > 0.5
      ? "text-green-600"
      : availabilityRatio > 0.2
      ? "text-yellow-500"
      : "text-red-500";

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
      <img
        src={lot.image}
        alt={lot.name}
        className="w-full h-48 object-cover"
      />
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-900">{lot.name}</h3>
          <Rating rating={lot.rating} />
        </div>
        <p className="text-gray-600 mb-4">
          {ICONS.LOCATION}
          {lot.address}
        </p>

        {/* Show distance if available */}
        {lot.distance !== undefined && (
          <div className="mb-3 p-2 bg-blue-50 rounded-lg">
            <div className="flex items-center text-blue-700 text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="font-medium">
                {lot.distance < 1
                  ? `${(lot.distance * 1000).toFixed(0)}m away`
                  : `${lot.distance.toFixed(1)}km away`}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-700">
          <div className="flex items-center">
            {ICONS.CAR}
            <span className={availabilityColor}>
              <strong>{lot.availableSpots}</strong> / {lot.totalSpots} spots
            </span>
          </div>
          <div className="flex items-center">
            {ICONS.PRICE}
            <span>
              <strong>₹{lot.pricePerHour.toFixed(2)}</strong> / hour
            </span>
          </div>
        </div>

        <div className="mt-auto">
          <Link
            to={`/book/${lot.id}`}
            className="block w-full text-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors duration-300"
          >
            View Details & Book
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ParkingCard;
