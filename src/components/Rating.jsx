
import React from 'react';
import { ICONS } from '../constants';

const Rating = ({ rating, maxRating = 5 }) => {
  return (
    <div className="flex items-center">
      <span className="text-sm font-bold text-gray-700 mr-2">{rating.toFixed(1)}</span>
      <div className="flex">
        {[...Array(maxRating)].map((_, index) => {
          const starClass = index < Math.round(rating) ? 'text-yellow-500' : 'text-gray-300';
          return <span key={index} className={starClass}>{ICONS.STAR}</span>;
        })}
      </div>
    </div>
  );
};

export default Rating;
