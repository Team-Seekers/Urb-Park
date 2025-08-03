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
