import React from "react";
import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <div className="text-center py-16">
      <h1 className="text-9xl font-extrabold text-green-600 tracking-widest">
        404
      </h1>
      <div className="bg-yellow-500 px-2 text-sm rounded rotate-12 absolute">
        Page Not Found
      </div>
      <p className="text-2xl md:text-3xl text-gray-600 mt-4">
        Oops! The page you're looking for doesn't exist.
      </p>
      <p className="text-gray-500 mt-2">
        You might have mistyped the address or the page may have moved.
      </p>
      <Link
        to="/"
        className="mt-8 inline-block bg-green-600 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105"
      >
        Go Back Home
      </Link>
    </div>
  );
};

export default NotFoundPage;
