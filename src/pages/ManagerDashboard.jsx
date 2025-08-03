import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getParkingLotById,
  getBookingsByLotId,
} from "../services/parkingService";
import Spinner from "../components/Spinner";
import { ICONS } from "../constants";

const ManagerDashboard = () => {
  const { id } = useParams();
  const [lot, setLot] = useState(null);
  /** @type {[any[], Function]} */
  const [bookings, setBookings] = useState([]);
  const [securityLog, setSecurityLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [time, setTime] = useState(Date.now());
  const logContainerRef = useRef(null);

  useEffect(() => {
    const fetchLotData = async () => {
      if (!id) {
        setError(
          "No parking lot ID provided in the URL. Example: /manager-dashboard/lot-a1"
        );
        setLoading(false);
        return;
      }

      try {
        const [lotData, bookingsData] = await Promise.all([
          getParkingLotById(id),
          getBookingsByLotId(id),
        ]);

        if (lotData) {
          setLot(lotData);
          setBookings(bookingsData);
        } else {
          setError(`Could not find data for your assigned lot (ID: ${id}).`);
        }
      } catch (err) {
        setError("Failed to fetch parking lot data.");
      } finally {
        setLoading(false);
      }
    };

    fetchLotData();
  }, [id]);

  // Effect to simulate security events
  useEffect(() => {
    if (!lot || bookings.length === 0) return;

    const generateRandomVehicleNumber = () =>
      `XX${Math.floor(10 + Math.random() * 90)}YY${Math.floor(
        1000 + Math.random() * 9000
      )}`;

    const interval = setInterval(() => {
      const randomEventType = Math.random();
      const randomBooking =
        bookings[Math.floor(Math.random() * bookings.length)];
      const randomSpot =
        lot.spots[Math.floor(Math.random() * lot.spots.length)];

      let newEvent = null;

      if (randomEventType < 0.4) {
        // ENTRY
        newEvent = {
          id: `evt-${Date.now()}`,
          timestamp: new Date(),
          type: "ENTRY",
          level: "info",
          message: `Vehicle ${randomBooking.vehicleNumber} entered. Booking ${randomBooking.id} confirmed.`,
        };
      } else if (randomEventType < 0.7) {
        // EXIT_OK
        newEvent = {
          id: `evt-${Date.now()}`,
          timestamp: new Date(),
          type: "EXIT_OK",
          level: "info",
          message: `Vehicle ${randomBooking.vehicleNumber} exited successfully. Slot ${randomBooking.spotId} is now available.`,
        };
      } else if (randomEventType < 0.9) {
        // ALERT_WRONG_SPOT
        if (randomBooking.spotId !== randomSpot.id) {
          newEvent = {
            id: `evt-${Date.now()}`,
            timestamp: new Date(),
            type: "ALERT_WRONG_SPOT",
            level: "warning",
            message: `Vehicle ${randomBooking.vehicleNumber} parked in wrong spot! Expected ${randomBooking.spotId}, parked in ${randomSpot.id}.`,
          };
        }
      } else {
        // ALERT_MISMATCH
        newEvent = {
          id: `evt-${Date.now()}`,
          timestamp: new Date(),
          type: "ALERT_MISMATCH",
          level: "critical",
          message: `Vehicle ${generateRandomVehicleNumber()} detected at exit. Does not match active booking. Authorities notified.`,
        };
      }

      if (newEvent) {
        setSecurityLog((prevLog) => [newEvent, ...prevLog].slice(0, 50));
      }
    }, 5000); // New event every 5 seconds

    return () => clearInterval(interval);
  }, [lot, bookings]);

  // Effect to update "live" camera feeds
  useEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [securityLog]);

  const eventUIMap = {
    info: {
      icon: ICONS.ARROW_RIGHT_ON_RECTANGLE,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    warning: { icon: ICONS.BELL, color: "text-yellow-600", bg: "bg-yellow-50" },
    critical: {
      icon: ICONS.SHIELD_EXCLAMATION,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  };

  const renderCameraFeeds = () => {
    if (!lot) return null;
    const cameraCount = 4;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {[...Array(cameraCount)].map((_, index) => (
          <div
            key={index}
            className="bg-black rounded-lg shadow-lg overflow-hidden border-4 border-gray-700"
          >
            <div className="p-2 bg-gray-800 text-white flex justify-between items-center">
              <span className="font-mono text-sm">CAM-0{index + 1}</span>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></span>
                <span className="text-xs font-semibold">REC</span>
              </div>
            </div>
            <img
              src={`https://picsum.photos/seed/${
                lot.id
              }-${index}/${600}/${400}?t=${time}`}
              alt={`Live feed from camera ${index + 1}`}
              className="w-full h-auto"
            />
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <Spinner />;
  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 bg-red-50 rounded-lg p-4">{error}</p>
        <Link
          to="/find"
          className="mt-8 inline-block bg-green-600 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105"
        >
          Go Find a Lot
        </Link>
      </div>
    );
  }
  if (!lot) return null;

  return (
    <div>
      <h1 className="text-4xl font-bold text-center mb-2 text-gray-900">
        Manager Dashboard
      </h1>
      <p className="text-center text-lg text-gray-600 mb-8">
        Live Monitoring for <span className="font-semibold">{lot.name}</span>
      </p>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-4 border-b pb-2">
              Lot Overview
            </h2>
            <div className="grid md:grid-cols-3 gap-4 text-lg">
              <p>
                <strong>Address:</strong> {lot.address}
              </p>
              <p>
                <strong>Total Spots:</strong> {lot.totalSpots}
              </p>
              <p>
                <strong>Available Spots:</strong>{" "}
                <span className="font-bold text-green-600">
                  {lot.availableSpots}
                </span>
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-4 border-b pb-2">
              Live Camera Feeds
            </h2>
            {renderCameraFeeds()}
          </div>
        </div>

        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-xl sticky top-24">
          <h2 className="text-2xl font-bold mb-4 border-b pb-2">
            Live Security Log
          </h2>
          <div
            ref={logContainerRef}
            className="space-y-4 h-[70vh] overflow-y-auto pr-2"
          >
            {securityLog.length > 0 ? (
              securityLog.map((event) => {
                const ui = eventUIMap[event.level];
                let icon = ui.icon;
                if (event.type === "EXIT_OK")
                  icon = ICONS.ARROW_LEFT_ON_RECTANGLE;

                return (
                  <div
                    key={event.id}
                    className={`${ui.bg} p-3 rounded-lg flex items-start gap-3`}
                  >
                    <div className={`mt-1 flex-shrink-0 ${ui.color}`}>
                      {icon}
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-tight">
                        {event.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {event.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Awaiting security events...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
