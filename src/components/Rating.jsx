
import React from 'react';
import { ICONS } from '../constants';

const Rating = ({ rating, maxRating = 5 }) => {
  // Handle undefined or null rating
  const safeRating = rating || 0;
  const displayRating = typeof safeRating === 'number' ? safeRating.toFixed(1) : '0.0';
  const roundedRating = Math.round(safeRating);

  return (
    <div className="flex items-center">
      <span className="text-sm font-bold text-gray-700 mr-2">{displayRating}</span>
      <div className="flex">
        {[...Array(maxRating)].map((_, index) => {
          const starClass = index < roundedRating ? 'text-yellow-500' : 'text-gray-300';
          return <span key={index} className={starClass}>{ICONS.STAR}</span>;
        })}
      </div>
    </div>
  );
};

export default Rating;
