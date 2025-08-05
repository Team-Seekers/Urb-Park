import React, { useState, useEffect } from "react";
import {
  getParkingLots,
  getNearbyParkingAreas,
  fetchAllParkingAreas,
} from "../services/parkingService";
import ParkingCard from "../components/ParkingCard";
import Spinner from "../components/Spinner";

const ALL_FEATURES = [
  "EV Charging",
  "Covered",
  "24/7 Security",
  "Mobile Pass",
  "Valet",
  "Affordable",
  "24/7 Access",
];

const FindParkingPage = () => {
  const [lots, setLots] = useState([]);
  const [filteredLots, setFilteredLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [priceFilter, setPriceFilter] = useState(100);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [featuresFilter, setFeaturesFilter] = useState([]);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [showNearbyOnly, setShowNearbyOnly] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchData = async (isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true);
    const data = await getParkingLots();
    setLots(data);
    if (isInitialLoad) setLoading(false);
  };

  useEffect(() => {
    fetchData(true);
    const intervalId = setInterval(() => fetchData(false), 5000); // Refresh data every 5 seconds
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let results = lots.filter(
      (lot) =>
        (lot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lot.address.toLowerCase().includes(searchTerm.toLowerCase())) &&
        lot.pricePerHour <= priceFilter &&
        lot.rating >= ratingFilter
    );

    if (featuresFilter.length > 0) {
      results = results.filter((lot) =>
        featuresFilter.every((feature) => lot.features.includes(feature))
      );
    }
    setFilteredLots(results);
  }, [searchTerm, lots, priceFilter, ratingFilter, featuresFilter]);

  const handleFeatureToggle = (feature) => {
    setFeaturesFilter((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const handleNearbyParking = async () => {
    try {
      setNearbyLoading(true);
      setShowNearbyOnly(true);

      const nearbyAreas = await getNearbyParkingAreas(5); // 5km radius

      // Convert Firestore data to match the expected format
      const convertedAreas = nearbyAreas.map((area) => ({
        id: area.id,
        name: area.name,
        address: area.location,
        lat: area.lat,
        lng: area.lng,
        distance: area.distance,
        totalSpots: 50, // Default values since not in Firestore
        availableSpots: 30,
        pricePerHour: 50,
        rating: 4.0,
        reviewCount: 25,
        features: ["Covered", "24/7 Security", "Mobile Pass"],
        image:
          "https://picsum.photos/400/300?random=" +
          Math.floor(Math.random() * 100),
        spots: [],
        status: "active",
        ownerId: "firestore-owner",
        verificationChecks: {
          cameraFixed: true,
          apiIntegrated: true,
          rehearsalComplete: true,
        },
      }));

      setLots(convertedAreas);
      setFilteredLots(convertedAreas);
    } catch (error) {
      console.error("Error fetching nearby parking:", error);
      alert(
        "Could not fetch nearby parking. Please check your location permissions."
      );
    } finally {
      setNearbyLoading(false);
    }
  };

  const handleShowAllParking = () => {
    setShowNearbyOnly(false);
    fetchData(true);
  };

  const handleSearchParking = async () => {
    if (!searchTerm.trim()) return;

    try {
      setSearchLoading(true);
      setShowNearbyOnly(false);

      const allAreas = await fetchAllParkingAreas();

      // Filter areas by search term
      const matchingAreas = allAreas.filter(
        (area) =>
          area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          area.location.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Convert Firestore data to match the expected format
      const convertedAreas = matchingAreas.map((area) => ({
        id: area.id,
        name: area.name,
        address: area.location,
        lat: area.lat || 0,
        lng: area.lng || 0,
        distance: 0, // No distance calculation for search
        totalSpots: 50,
        availableSpots: 30,
        pricePerHour: 50,
        rating: 4.0,
        reviewCount: 25,
        features: ["Covered", "24/7 Security", "Mobile Pass"],
        image:
          "https://picsum.photos/400/300?random=" +
          Math.floor(Math.random() * 100),
        spots: [],
        status: "active",
        ownerId: "firestore-owner",
        verificationChecks: {
          cameraFixed: true,
          apiIntegrated: true,
          rehearsalComplete: true,
        },
      }));

      setLots(convertedAreas);
      setFilteredLots(convertedAreas);
    } catch (error) {
      console.error("Error searching parking areas:", error);
      alert("Could not search parking areas. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value);
    // If search term is cleared, show all parking
    if (!e.target.value.trim()) {
      setShowNearbyOnly(false);
      fetchData(true);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      handleSearchParking();
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold text-center mb-2 text-gray-900">
        Find Your Perfect Spot
      </h1>
      <p className="text-center text-lg text-gray-600 mb-8">
        Real-time availability and dynamic pricing at your fingertips.
      </p>

      <div className="mb-6 flex justify-center lg:justify-start gap-4">
        <button
          onClick={() => setIsFilterVisible(!isFilterVisible)}
          className="bg-white hover:bg-gray-100 text-gray-900 font-bold py-2 px-6 rounded-lg shadow-md transition-colors flex items-center gap-2"
          aria-expanded={isFilterVisible}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          {isFilterVisible ? "Hide" : "Show"} Filters
        </button>

        <button
          onClick={handleNearbyParking}
          disabled={nearbyLoading}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {nearbyLoading ? (
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
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
          )}
          {nearbyLoading ? "Finding..." : "Nearby Parking"}
        </button>

        {showNearbyOnly && (
          <button
            onClick={handleShowAllParking}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-colors"
          >
            Show All Parking
          </button>
        )}
      </div>

      {showNearbyOnly && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            📍 Showing nearby parking areas within 5km of your location
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filter Sidebar */}
        {isFilterVisible && (
          <aside className="lg:w-1/4">
            <div className="bg-white p-6 rounded-lg shadow-lg sticky top-24">
              <h3 className="text-xl font-bold mb-4 border-b pb-2">
                Filter Options
              </h3>
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="search"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Search
                  </label>
                  <form onSubmit={handleSearchSubmit} className="flex gap-2">
                    <input
                      id="search"
                      type="text"
                      placeholder="Name or address..."
                      value={searchTerm}
                      onChange={handleSearchInputChange}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={searchLoading || !searchTerm.trim()}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {searchLoading ? (
                        <svg
                          className="animate-spin h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      ) : (
                        "Search"
                      )}
                    </button>
                  </form>
                </div>

                <div>
                  <label
                    htmlFor="price"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Max Price:{" "}
                    <span className="font-bold text-green-600">
                      ₹{priceFilter.toFixed(2)}
                    </span>
                  </label>
                  <input
                    id="price"
                    type="range"
                    min="20"
                    max="100"
                    step="5"
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="rating"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Min Rating:{" "}
                    <span className="font-bold text-yellow-500">
                      {ratingFilter.toFixed(1)} ★
                    </span>
                  </label>
                  <input
                    id="rating"
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                  />
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Features
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {ALL_FEATURES.map((feature) => (
                      <button
                        key={feature}
                        onClick={() => handleFeatureToggle(feature)}
                        className={`px-3 py-1 text-sm rounded-full border-2 transition-colors ${
                          featuresFilter.includes(feature)
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-green-600"
                        }`}
                      >
                        {feature}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className={isFilterVisible ? "lg:w-3/4" : "w-full"}>
          {loading || nearbyLoading || searchLoading ? (
            <Spinner />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
              {filteredLots.length > 0 ? (
                filteredLots.map((lot) => (
                  <ParkingCard key={lot.id} lot={lot} />
                ))
              ) : (
                <div className="col-span-full text-center py-16 bg-white rounded-lg shadow-lg">
                  <p className="text-xl text-gray-500">
                    {showNearbyOnly
                      ? "No nearby parking areas found within 5km."
                      : searchTerm.trim()
                      ? `No parking areas found for "${searchTerm}".`
                      : "No parking lots found."}
                  </p>
                  <p className="text-gray-400 mt-2">
                    {showNearbyOnly
                      ? "Try expanding your search radius or check location permissions."
                      : searchTerm.trim()
                      ? "Try a different search term or check your spelling."
                      : "Try adjusting your filters."}
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default FindParkingPage;
