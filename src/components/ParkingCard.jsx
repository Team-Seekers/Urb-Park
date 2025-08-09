import React from "react";
import { Link } from "react-router-dom";
import { ICONS } from "../constants";
import Rating from "./Rating";
const decision = (lot) => {
  const address = (lot.address||"").trim();
  if(address == "Bengaluru"){
    return "https://content.jdmagicbox.com/comp/def_content/car-parking-management/cars-parked-in-parking-lot-car-parking-management-1-0stjw.jpg"

  }else if(address == "Chennai"){
    return "https://media.istockphoto.com/id/172385575/photo/parking.jpg?s=612x612&w=0&k=20&c=nJorPk_qIMe46mLqdX1aDMu1alojHK7oKPOaAbOzQLM="
  }else if(address == "Hyderabad"){
    return "https://watermark.lovepik.com/photo/20211202/large/lovepik-parking-lot-picture_501404976.jpg"
  }
  else if(address == "Delhi"){
    return "https://media.istockphoto.com/id/578832718/photo/public-garage.jpg?s=612x612&w=0&k=20&c=sH5-S64sgWBBU-trmC-LE5IwShx_Xlu1kTRDOczmgzE="
  }else if(address == "Mumbai"){
    return "https://cdn.dnaindia.com/sites/default/files/2019/08/14/858787-underground-parking.jpg?im=FitAndFill=(1200,900)"
  }
  else{
    return lot.image
  }
}
const ParkingCard = ({ lot }) => {
  // Debug: Log features data
  console.log("ParkingCard - lot features:", lot.features, "type:", typeof lot.features);
  
  const availabilityRatio = lot.availableSpots / lot.totalSpots;
  const availabilityColor =
    availabilityRatio > 0.5
      ? "text-green-600"
      : availabilityRatio > 0.2
      ? "text-yellow-500"
      : "text-red-500";

  // Enhanced feature styling with different colors based on feature type
  const getFeatureStyle = (feature) => {
    const featureLower = feature.toLowerCase();
    
    if (featureLower.includes('security') || featureLower.includes('cctv') || featureLower.includes('guard')) {
      return "bg-gradient-to-r from-red-100 to-red-200 text-red-700 border border-red-200";
    }
    if (featureLower.includes('ev') || featureLower.includes('electric') || featureLower.includes('charging')) {
      return "bg-gradient-to-r from-green-100 to-green-200 text-green-700 border border-green-200";
    }
    if (featureLower.includes('covered') || featureLower.includes('shelter') || featureLower.includes('roof')) {
      return "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border border-blue-200";
    }
    if (featureLower.includes('wash') || featureLower.includes('clean')) {
      return "bg-gradient-to-r from-cyan-100 to-cyan-200 text-cyan-700 border border-cyan-200";
    }
    if (featureLower.includes('valet') || featureLower.includes('service')) {
      return "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border border-purple-200";
    }
    if (featureLower.includes('24') || featureLower.includes('hour')) {
      return "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-700 border border-yellow-200";
    }
    // Default style
    return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-200";
  };

  return (
    <div className="bg-white rounded-lg shadow-lg hover:shadow-2xl hover:scale-105 transition duration-300 overflow-hidden flex flex-col">
      <img
       src={decision(lot)}
       alt={lot.name}
      className="w-full h-48 object-cover"
      />


      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-900">{lot.name}</h3>
          <Rating rating={lot.rating} />
        </div>
        <p className="text-gray-600 mb-4 flex items-center gap-1">
          {ICONS.LOCATION}
          {lot.address}
        </p>

        {/* Enhanced Features Section */}
        {lot.features && Array.isArray(lot.features) && lot.features.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {lot.features.map((feature, index) => (
              <span
                key={index}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md cursor-default ${getFeatureStyle(feature)}`}
              >
                {feature}
              </span>
            ))}
          </div>
        ) : lot.features && typeof lot.features === 'string' ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {lot.features.split(',').map((feature, index) => (
              <span
                key={index}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md cursor-default ${getFeatureStyle(feature.trim())}`}
              >
                {feature.trim()}
              </span>
            ))}
          </div>
        ) : (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-sm text-gray-400 text-center font-medium">No features available</p>
          </div>
        )}

        {/* Distance */}
        {lot.distance !== undefined && (
          <div className="mb-3 p-2 bg-blue-50 rounded-lg">
            <div className="flex items-center text-blue-700 text-sm">
              {ICONS.LOCATION}
              <span className="font-medium">
                {lot.distance < 1
                  ? `${(lot.distance * 1000).toFixed(0)}m away`
                  : `${lot.distance.toFixed(1)}km away`}
              </span>
            </div>
          </div>
        )}

        {/* Spots & Price */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-700">
          <div className="flex items-center">
            {ICONS.PRICE}
            <span>
              <strong>₹{lot.pricePerHour.toFixed(2)}</strong> / hour
            </span>
          </div>
        </div>

        {/* Button */}
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