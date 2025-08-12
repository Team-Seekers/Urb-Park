import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../hooks/useAppContext";
import { deleteHistoryEntry } from "../services/userService";
import InteractiveRating from "../components/InteractiveRating";
import Spinner from "../components/Spinner";

const ProfilePage = () => {
  const {
    booking: currentBooking,
    notifications,
    clearNotifications,
    deleteNotification,
    user,
    userProfile,
  } = useAppContext();
  /** @type {[any[], Function]} */
  const [bookingHistory, setBookingHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      if (!userProfile) {
        setBookingHistory([]);
        setLoadingHistory(false);
        return;
      }

      const history = userProfile.history || [];
      // Sort history by creation date (newest first)
      const sortedHistory = history.sort((a, b) => {
        const dateA = a.createdAt?.toDate
          ? a.createdAt.toDate()
          : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate
          ? b.createdAt.toDate()
          : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      setBookingHistory(sortedHistory);
      setLoadingHistory(false);
    };
    fetchHistory();
  }, [userProfile]);

  const handleDeleteHistoryEntry = async (historyIndex) => {
    try {
      if (!user) throw new Error("User not found");
      await deleteHistoryEntry(user.uid, historyIndex);

      // Update local state by removing the deleted entry
      setBookingHistory((prev) =>
        prev.filter((_, index) => index !== historyIndex)
      );
    } catch (error) {
      console.error("Failed to delete history entry:", error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return "Just now";

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
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
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-l-4 p-3 rounded relative ${
                    notification.read
                      ? "bg-gray-50 border-gray-300 text-gray-600"
                      : "bg-yellow-100 border-yellow-500 text-yellow-800"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {notification.message}
                      </p>
                      <p className="text-xs mt-1 opacity-75">
                        {formatNotificationTime(notification.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete notification"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
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
          My Bookings History
        </h2>
        {loadingHistory ? (
          <Spinner />
        ) : (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
            {bookingHistory.length > 0 ? (
              bookingHistory.map((booking, index) => {
                const startTime = booking.startTime?.toDate
                  ? booking.startTime.toDate()
                  : new Date(booking.startTime);
                const endTime = booking.endTime?.toDate
                  ? booking.endTime.toDate()
                  : new Date(booking.endTime);
                const createdAt = booking.createdAt?.toDate
                  ? booking.createdAt.toDate()
                  : new Date(booking.createdAt);

                return (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg text-gray-900">
                            {booking.areaId || "Unknown Location"}
                          </h3>
                          <button
                            onClick={() => handleDeleteHistoryEntry(index)}
                            className="text-red-500 hover:text-red-700 transition-colors ml-2"
                            title="Delete booking history"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <p>
                              <strong>Slot:</strong> {booking.slotId || "N/A"}
                            </p>
                            <p>
                              <strong>Vehicle:</strong>{" "}
                              {booking.vehicleNumber || "N/A"}
                            </p>
                            <p>
                              <strong>Status:</strong>
                              <span
                                className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  booking.status === "active"
                                    ? "bg-green-100 text-green-800"
                                    : booking.status === "completed"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {booking.status || "N/A"}
                              </span>
                            </p>
                          </div>
                          <div>
                            <p>
                              <strong>Start:</strong>{" "}
                              {startTime.toLocaleString()}
                            </p>
                            <p>
                              <strong>End:</strong> {endTime.toLocaleString()}
                            </p>
                            <p>
                              <strong>Booked:</strong>{" "}
                              {createdAt.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {booking.paymentId && (
                          <p className="text-xs text-gray-500 mt-2">
                            Payment ID: {booking.paymentId}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">
                  Your booking history will appear here.
                </p>
                <p className="text-sm mt-2">
                  Complete a booking to see it in your history.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
