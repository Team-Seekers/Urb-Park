import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ICONS } from "../constants";
import { submitNewLot } from "../services/parkingService";

const ListSpacePage = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    lotName: "",
    address: "",
    spots: "1",
    lat: "",
    lng: "",
    documents: null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const lotData = {
        name: formData.lotName,
        address: formData.address,
        spots: parseInt(formData.spots, 10),
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
      };

      if (
        !lotData.name ||
        !lotData.address ||
        isNaN(lotData.spots) ||
        isNaN(lotData.lat) ||
        isNaN(lotData.lng)
      ) {
        throw new Error("Please fill out all fields correctly.");
      }

      await submitNewLot(lotData);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "An error occurred during submission.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFormData((prev) => ({ ...prev, documents: e.target.files[0] }));
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center bg-white p-12 rounded-lg shadow-xl">
        <div className="text-green-600 mx-auto mb-4 w-16 h-16 flex items-center justify-center rounded-full bg-green-100">
          {ICONS.CHECK_CIRCLE}
        </div>
        <h1 className="text-3xl font-bold text-green-600 mb-4">Thank You!</h1>
        <p className="text-lg text-gray-700">
          Your parking space submission has been received. Our team will review
          your details and get back to you within 3-5 business days.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-900">
          List Your Parking Space
        </h1>
        <p className="text-center text-lg text-gray-600 mb-8">
          Turn your empty spot into cash. It's simple and secure.
        </p>
      </div>

      <div className="mt-8 grid md:grid-cols-2 md:gap-16 items-start">
        <div className="space-y-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-8 rounded-lg shadow-lg space-y-6"
          >
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Full Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email Address
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
            <div>
              <label
                htmlFor="lotName"
                className="block text-sm font-medium text-gray-700"
              >
                Lot Name
              </label>
              <input
                type="text"
                name="lotName"
                id="lotName"
                value={formData.lotName}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="e.g., My Downtown Driveway"
              />
            </div>
            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700"
              >
                Parking Space Address
              </label>
              <textarea
                name="address"
                id="address"
                rows={3}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="123 Main Street, Metropolis, 10001"
              ></textarea>
            </div>
            <div>
              <label
                htmlFor="spots"
                className="block text-sm font-medium text-gray-700"
              >
                Number of Spots
              </label>
              <input
                type="number"
                name="spots"
                id="spots"
                min="1"
                value={formData.spots}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Coordinates
              </label>
              <div className="flex gap-4 mt-1">
                <input
                  type="number"
                  name="lat"
                  placeholder="Latitude (e.g., 40.7128)"
                  step="any"
                  value={formData.lat}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                />
                <input
                  type="number"
                  name="lng"
                  placeholder="Longitude (e.g., -74.0060)"
                  step="any"
                  value={formData.lng}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="documents"
                className="block text-sm font-medium text-gray-700"
              >
                Ownership Documents
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Please upload proof of ownership or authorization (e.g., deed,
                lease agreement).
              </p>
              <input
                type="file"
                name="documents"
                id="documents"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-600 hover:file:bg-green-100"
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
              >
                {loading ? "Submitting..." : "Submit for Verification"}
              </button>
            </div>
          </form>
        </div>

        <div className="hidden md:block bg-green-50 p-8 rounded-lg border-2 border-dashed border-green-600/50">
          <h2 className="text-2xl font-bold text-green-600 mb-4">
            Why List With Us?
          </h2>
          <ul className="space-y-6 text-gray-700">
            <li className="flex items-start">
              <span className="text-green-600 mr-3 mt-1">&#10004;</span>
              <span>
                <strong>Automated theft alert</strong>
                <br />
                Monetize your unused parking space effortlessly and securely.
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-3 mt-1">&#10004;</span>
              <span>
                <strong>Authorized entry only</strong>
                <br />
                Set your own prices, availability, and rules for your space.
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-3 mt-1">&#10004;</span>
              <span>
                <strong>We Handle the Tech</strong>
                <br />
                We provide the platform for bookings, payments, and support.
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-3 mt-1">&#10004;</span>
              <span>
                <strong>Join a Community</strong>
                <br />
                Help make parking easier in your city and reduce traffic
                congestion.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ListSpacePage;
