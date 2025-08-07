import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../hooks/useAppContext";
import {
  getUserBookingHistory,
  submitRatingForBooking,
} from "../services/parkingService";
import InteractiveRating from "../components/InteractiveRating";
import Spinner from "../components/Spinner";

const ProfilePage = () => {
  const {
    booking: currentBooking,
    notifications,
    clearNotifications,
    user
  } = useAppContext();
  /** @type {[any[], Function]} */
  const [pastBookings, setPastBookings] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      if (!user) {
        setPastBookings([]);
        setLoadingHistory(false);
        return;
      }
      const allBookings = await getUserBookingHistory(user.uid);
      // Filter for completed bookings
      const completed = allBookings.filter(b => b.status === "completed" || b.status === "COMPLETED");
      setPastBookings(
        completed.sort(
          (a, b) =>
            new Date(b.endTime?.toDate ? b.endTime.toDate() : b.endTime).getTime() -
            new Date(a.endTime?.toDate ? a.endTime.toDate() : a.endTime).getTime()
        )
      );
      setLoadingHistory(false);
    };
    fetchHistory();
  }, [user]);

  const handleRateBooking = async (bookingId, lotId, rating) => {
    try {
      // Find the booking index in pastBookings
      const bookingIndex = pastBookings.findIndex((b) => b.id === bookingId);
      if (bookingIndex === -1 || !user) throw new Error("Booking not found");
      await submitRatingForBooking(user.uid, bookingIndex, lotId, rating);
      setPastBookings((prev) =>
        prev.map((b, idx) => (idx === bookingIndex ? { ...b, rated: true } : b))
      );
    } catch (error) {
      console.error("Failed to submit rating", error);
      // In a real app, you would show an error toast to the user.
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">
        My Bookings
      </h1>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Current Booking Section */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 border-b pb-2">
            Current Booking
          </h2>
          {currentBooking && currentBooking.status !== "COMPLETED" ? (
            <div className="space-y-3">
              <p>
                <strong>Lot:</strong> {currentBooking.lotName}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span className="font-semibold capitalize">
                  {currentBooking.status.toLowerCase()}
                </span>
              </p>
              <p>
                <strong>Booking Time:</strong>{" "}
                {new Date(currentBooking.bookingTime).toLocaleString()}
              </p>
              <Link
                to="/ticket"
                className="inline-block mt-4 bg-yellow-500 text-gray-900 font-bold py-2 px-4 rounded-lg hover:bg-yellow-300"
              >
                View My Ticket
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-gray-600">You have no active bookings.</p>
              <Link
                to="/find"
                className="inline-block mt-4 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700"
              >
                Find Parking
              </Link>
            </div>
          )}
        </div>

        {/* Notifications Section */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-2xl font-bold">Notifications</h2>
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="text-sm text-blue-600 hover:underline"
              >
                Clear All
              </button>
            )}
          </div>
          {notifications.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {notifications.map((msg, index) => (
                <div
                  key={index}
                  className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 rounded"
                >
                  {msg}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">You have no new notifications.</p>
          )}
        </div>
      </div>

      {/* Booking History */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 border-b pb-2">
          Booking History
        </h2>
        {loadingHistory ? (
          <Spinner />
        ) : (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
            {pastBookings.length > 0 ? (
              pastBookings.map((b) => (
                <div key={b.id} className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-lg">{b.lotName}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(b.bookingTime).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="mt-2 pt-2 text-right">
                      {b.rated ? (
                        <p className="text-sm text-green-600 font-semibold flex items-center gap-1">
                          Rated <span className="text-yellow-500">★</span>
                        </p>
                      ) : (
                        <div>
                          <p className="text-sm font-medium mb-1 text-gray-700">
                            How was your experience?
                          </p>
                          <InteractiveRating
                            onRate={(rating) =>
                              handleRateBooking(b.id, b.lotId, rating)
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">Your past bookings will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;