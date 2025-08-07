import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../hooks/useAppContext";
import { BookingStatus } from "../../types";
import QRCode from "../components/QRCode";
import Spinner from "../components/Spinner";
import { updateBookingStatusInUserHistory, getUserBookingHistory } from "../services/parkingService";
import Mapguider from "../components/Mapguider";

const TicketPage = () => {
  const { booking, setBooking, user } = useAppContext();
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!booking) {
      navigate("/find");
      return;
    }
    if (booking.status === BookingStatus.CONFIRMED) {
      setStatusMessage("You'll be verified at the entry gate.");
    }
  }, [booking, navigate]);

  // Helper to update booking status in Firestore and local state
  const updateStatus = async (newStatus) => {
    if (!user || !booking) return;
    try {
      // Fetch user booking history to find the index
      const history = await getUserBookingHistory(user.uid);
      const bookingIndex = history.findIndex(
        (b) => b.areaId === booking.lotId && b.slotId === booking.spotId && b.startTime.toDate().getTime() === new Date(booking.startTime).getTime()
      );
      if (bookingIndex === -1) throw new Error("Booking not found in user history.");
      await updateBookingStatusInUserHistory(user.uid, bookingIndex, newStatus);
      // Update local booking state
      setBooking({ ...booking, status: newStatus });
      if (newStatus === BookingStatus.ACTIVE) {
        setStatusMessage("Welcome! Your parking session has started.");
      } else if (newStatus === BookingStatus.COMPLETED) {
        setStatusMessage("Your session is complete. Thank you for parking with us!");
      }
    } catch (e) {
      setStatusMessage("Error updating session status.");
    }
  };

  const handleSimulateEntry = async () => {
    await updateStatus(BookingStatus.ACTIVE);
  };

  const handleSimulateExit = async () => {
    await updateStatus(BookingStatus.COMPLETED);
  };

  const getStatusUI = () => {
    if (!booking) return null;
    switch (booking.status) {
      case BookingStatus.CONFIRMED:
        return (
          <div
            className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4"
            role="alert"
          >
            <p className="font-bold">Status: Awaiting Arrival</p>
            <p>{statusMessage}</p>
          </div>
        );
      case BookingStatus.ACTIVE:
        return (
          <div
            className="bg-green-100 border-l-4 border-green-600 text-green-600 p-4"
            role="alert"
          >
            <p className="font-bold">Status: Active</p>
            <p>Welcome! Your parking session has started.</p>
          </div>
        );
      case BookingStatus.COMPLETED:
        return (
          <div
            className="bg-blue-100 border-l-4 border-blue-600 text-blue-800 p-4"
            role="alert"
          >
            <p className="font-bold">Status: Completed</p>
            <p>
              Thank you for using UrbPark! You can now rate this booking on your
              profile page.
            </p>
          </div>
        );
      case BookingStatus.CANCELLED:
        return (
          <div
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4"
            role="alert"
          >
            <p className="font-bold">Status: Cancelled</p>
            <p>This booking has been cancelled due to no-show.</p>
          </div>
        );
      default:
        return null;
    }
  };

  if (!booking) {
    return <Spinner />;
  }

  return (
    <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-2xl text-center">
      <h1 className="text-3xl font-bold mb-4 text-gray-900">
        Your Parking Ticket
      </h1>

      <div className="mb-6">{getStatusUI()}</div>

      {booking.status !== BookingStatus.CANCELLED && (
        <>
          <p className="text-gray-600 mb-2">
            E-Ticket for your parking session.
          </p>
          <QRCode
            data={JSON.stringify({
              bookingId: booking.id,
              spotId: booking.spotId,
              vehicleNumber: booking.vehicleNumber,
            })}
          />

          <div className="mt-8 border-t pt-6 space-y-3 text-left">
            <p>
              <strong>Lot:</strong> {booking.lotName}
            </p>
            <p>
              <strong>Booking ID:</strong> {booking.id}
            </p>
            <p>
              <strong>Spot ID:</strong> {booking.spotId}
            </p>
            <p>
              <strong>Vehicle No:</strong> {booking.vehicleNumber}
            </p>
            <p>
              <strong>Payment:</strong>{" "}
              {booking.paymentMethod.replace("_", "-")}
            </p>
            <p>
              <strong>Time:</strong>{" "}
              {new Date(booking.bookingTime).toLocaleString()}
            </p>
          </div>
        </>
      )}

      {booking.status === BookingStatus.CONFIRMED && (
        <button
          onClick={handleSimulateEntry}
          className="mt-6 w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors"
        >
          Simulate Entry Scan
        </button>
      )}

      {booking.status === BookingStatus.ACTIVE && (
        <button
          onClick={handleSimulateExit}
          className="mt-6 w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Simulate Exit Scan
        </button>
      )}

      {booking.status === BookingStatus.CONFIRMED && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            Directions to Parking
          </h2>
          <div className="bg-white rounded-lg shadow-md border overflow-hidden">
            <Mapguider destination={[booking.lotLat, booking.lotLng]} />
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${booking.lotLat},${booking.lotLng}`;
                window.open(url, "_blank");
              }}
              className="flex-1 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
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
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3"
                />
              </svg>
              Open in Google Maps
            </button>

            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: "Parking Directions",
                    text: `Navigate to ${booking.lotName}`,
                    url: `https://www.google.com/maps/dir/?api=1&destination=${booking.lotLat},${booking.lotLng}`,
                  });
                } else {
                  // Fallback: copy to clipboard
                  navigator.clipboard.writeText(
                    `Navigate to ${booking.lotName}: https://www.google.com/maps/dir/?api=1&destination=${booking.lotLat},${booking.lotLng}`
                  );
                  alert("Directions link copied to clipboard!");
                }
              }}
              className="bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
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
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367 2.684z"
                />
              </svg>
              Share
            </button>
          </div>
        </div>
      )}

      {booking.status !== BookingStatus.CONFIRMED &&
        booking.status !== BookingStatus.CANCELLED && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-center">
              <p className="text-yellow-800 font-semibold">
                Directions Available After Payment
              </p>
              <p className="text-sm text-yellow-600 mt-1">
                Complete your payment to access navigation directions to your
                parking spot.
              </p>
            </div>
          </div>
        )}
      {(booking.status === BookingStatus.CANCELLED ||
        booking.status === BookingStatus.COMPLETED) && (
        <button
          onClick={() => navigate("/find")}
          className="mt-6 w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-600 transition-colors"
        >
          Find New Parking
        </button>
      )}
    </div>
  );
};

export default TicketPage;
