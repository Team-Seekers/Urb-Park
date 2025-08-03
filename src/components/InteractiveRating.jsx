import React, { useState } from "react";
import { ICONS } from "../constants";

const InteractiveRating = ({ onRate }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleRate = (rate) => {
    setRating(rate);
    setSubmitted(true);
    onRate(rate);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2">
        {[...Array(5)].map((_, index) => (
          <span
            key={index}
            className={index < rating ? "text-yellow-500" : "text-gray-300"}
          >
            {ICONS.STAR}
          </span>
        ))}
        <span className="font-bold text-sm text-green-600">Thanks!</span>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, index) => {
        const starValue = index + 1;
        return (
          <button
            key={starValue}
            className="focus:outline-none"
            onClick={() => handleRate(starValue)}
            onMouseEnter={() => setHoverRating(starValue)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`Rate ${starValue} stars`}
          >
            <span
              className={`
                ${
                  starValue <= (hoverRating || rating)
                    ? "text-yellow-500"
                    : "text-gray-300"
                }
                transition-colors duration-150
                `}
            >
              {ICONS.STAR}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default InteractiveRating;
