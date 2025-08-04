import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
/* import HeroIllustration from '../components/HeroIllustration'; */

const HomePage = ({ user, onProtectedNav }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      if (user) {
        navigate(`/find?search=${encodeURIComponent(trimmedSearch)}`);
      } else {
        onProtectedNav?.(`/find?search=${encodeURIComponent(trimmedSearch)}`);
      }
    } else {
      if (user) {
        navigate("/find");
      } else {
        onProtectedNav?.("/find");
      }
    }
  };

  const handleNavClick = (path) => {
    if (user) {
      navigate(path);
    } else {
      onProtectedNav?.(path);
    }
  };

  return (
    <div className="space-y-24 md:space-y-32 mt-10">
      {/* Hero Section */}
      <section className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-4">
              Your Parking Spot, <br /> In a Tap.
            </h1>
            <p className="text-lg text-gray-600 max-w-xl mx-auto md:mx-0 mb-8">
              No more circling. Find, book, and pay for your parking space in
              seconds with real-time availability.
            </p>
            <form onSubmit={handleSearchSubmit} className="mt-8">
              <div className="flex items-center bg-gray-900 p-2 rounded-lg shadow-lg max-w-xl mx-auto md:mx-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-300 mx-3 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Enter an address, landmark, or area..."
                  className="w-full p-2 border-none focus:ring-0 text-lg bg-transparent text-white placeholder-gray-400"
                  aria-label="Search for parking"
                />
                <button
                  onClick={() => handleNavClick("/find")}
                  className="bg-yellow-400 whitespace-nowrap hover:bg-yellow-300 text-gray-900 font-bold py-3 px-6 rounded-md text-lg transition-transform transform hover:scale-105 shadow-sm"
                >
                  Find Parking Now
                </button>
              </div>
            </form>
          </div>
          <div className="hidden md:block">{/* <HeroIllustration /> */}</div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="text-center">
        <h2 className="text-3xl font-bold mb-2 text-gray-900">
          Why Choose UrbPark?
        </h2>
        <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
          We're building the future of urban mobility, one parking spot at a
          time.
        </p>
        <div className="flex flex-col lg:flex-row lg:flex-nowrap gap-8 text-left mx-auto">
          <div className="bg-white p-8 rounded-lg shadow-lg flex items-start space-x-4 md:w-25">
            <div className="flex-shrink-0 bg-green-100 text-green-600 rounded-full p-3 mt-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">
                Real-Time Data with Automated theft alerts
              </h3>
              <p className="text-gray-600">
                Live availability and dynamic pricing means you always get the
                best spot at the best price.
              </p>
            </div>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-lg flex items-start space-x-4 md:w-25">
            <div className="flex-shrink-0 bg-yellow-100 text-yellow-400 rounded-full p-3 mt-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Seamless Booking</h3>
              <p className="text-gray-600">
                From Automated Verification entry to in-app payments, your
                entire journey is smooth and hassle-free.
              </p>
            </div>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-lg flex items-start space-x-4 md:w-25">
            <div className="flex-shrink-0 bg-blue-100 text-blue-500 rounded-full p-3 mt-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {" "}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5h.01"
                />{" "}
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Earn With Your Space</h3>
              <p className="text-gray-600">
                Turn your empty driveway or garage into a passive income stream.
                List your spot securely and set your own rules.
              </p>
            </div>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-lg flex items-start space-x-4 md:w-25">
            <div className="flex-shrink-0 bg-cyan-100 text-cyan-600 rounded-full p-3 mt-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {" "}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 1.5c-5.83 2.17-10.5 7.83-10.5 14.5a10.5 10.5 0 0021 0c0-6.67-4.67-12.33-10.5-14.5zM12 21v-9"
                />{" "}
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Drive Greener</h3>
              <p className="text-gray-600">
                By reducing the time spent searching for parking, we help cut
                down on traffic congestion and CO2 emissions, making our cities
                cleaner.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
