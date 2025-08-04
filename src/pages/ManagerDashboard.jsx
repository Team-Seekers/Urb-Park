import React, { useEffect, useState } from "react";
import axios from "axios";

const ManagerDashboard = () => {
  const [manager, setManager] = useState(null);
  const [arena, setArena] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await axios.get("/api/manager/dashboard");
        const { manager, arena, cameras } = res.data;

        setManager(manager || null);
        setArena(arena || null);
        setCameras(Array.isArray(cameras) ? cameras : []);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="text-center mt-10 text-lg text-gray-600">
        Loading Manager Dashboard...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Manager Profile */}
      <section className="bg-white shadow-md rounded-xl p-6">
        <h2 className="text-2xl font-semibold mb-2">Manager Profile</h2>
        {manager ? (
          <div className="text-gray-700">
            <p><strong>Name:</strong> {manager.name}</p>
            <p><strong>Email:</strong> {manager.email}</p>
          </div>
        ) : (
          <p className="text-red-500">Manager info not available</p>
        )}
      </section>

      {/* Parking Arena Details */}
      <section className="bg-white shadow-md rounded-xl p-6">
        <h2 className="text-2xl font-semibold mb-2">Parking Arena Info</h2>
        {arena ? (
          <div className="text-gray-700">
            <p><strong>Name:</strong> {arena.name}</p>
            <p><strong>Location:</strong> {arena.location}</p>
            <p><strong>Total Spots:</strong> {arena.totalSpots}</p>
            <p><strong>Available Spots:</strong> {arena.availableSpots}</p>
          </div>
        ) : (
          <p className="text-red-500">Arena info not available</p>
        )}
      </section>

      {/* Cameras */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Live Camera Feeds</h2>
        {cameras.length === 0 ? (
          <p className="text-gray-500">No cameras linked to this arena.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cameras.map((cam) => (
              <div
                key={cam.id}
                className="bg-white shadow-lg rounded-xl overflow-hidden"
              >
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold">{cam.location}</h3>
                </div>
                <div className="w-full aspect-video bg-black">
                  <iframe
                    src={cam.streamUrl}
                    title={cam.location}
                    className="w-full h-full"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ManagerDashboard;
