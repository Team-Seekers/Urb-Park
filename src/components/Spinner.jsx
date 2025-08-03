
import React from 'react';

const Spinner = () => {
  return (
    <div className="flex justify-center items-center p-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
    </div>
  );
};

export default Spinner;
