import React from 'react';

const anim1 = () => {
  return (
    <div className="relative w-full h-screen bg-gray-800 overflow-hidden">
      {/* Background Buildings and Road */}
      <div className="absolute inset-0 flex justify-center items-center">
        <div className="w-11/12 h-5/6 bg-gray-700 rounded-lg shadow-xl" style={{ perspective: '800px', transform: 'rotateX(20deg)' }}>
          {/* Road */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gray-600">
            <div className="absolute inset-x-0 top-1/2 h-px bg-yellow-400" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-white" />
          </div>
          {/* Buildings */}
          <div className="absolute top-0 left-0 w-1/4 h-1/2 bg-gray-500 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-1/4 h-1/2 bg-gray-500 rounded-tr-lg" />
          {/* Parking Building */}
          <div className="absolute bottom-1/2 left-1/2 transform -translate-x-1/2 w-1/3 h-1/3 bg-gray-900 rounded-b-lg p-4">
            <div className="text-white text-center mb-2">
              <span className="text-xl font-bold">65 SLOTS</span>
            </div>
            <div className="absolute top-1/2 left-0 -translate-y-1/2 h-1/2 w-1/6 bg-white flex justify-center items-center">
              <span className="p-2 font-bold text-gray-900 text-3xl animate-breathe">P</span>
            </div>
          </div>
        </div>
      </div>

      {/* Blue Car Animation */}
      <div className="absolute top-0 right-0 w-12 h-6 bg-blue-600 rounded-full animate-blueCar" />

      {/* Yellow Car Animation */}
      <div className="absolute bottom-0 left-0 w-12 h-6 bg-yellow-400 rounded-full animate-yellowCar" />
    </div>
  );
};

export default anim1;