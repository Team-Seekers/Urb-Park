// src/components/Mapguider.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import axios from "axios";

// Routing services
const ROUTING_SERVICES = {
  ORS: {
    url: "https://api.openrouteservice.org/v2/directions/driving-car",
    key: "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImEyZmU4NmY3ZDU3YjQ4YjZiMjYzMTk0NzljZWQyMmIyIiwiaCI6Im11cm11cjY0In0=",
  },
  OSRM: {
    url: "https://router.project-osrm.org/route/v1/driving",
  },
};

// Component to auto-fit map bounds
const MapBounds = ({ userLocation, destination, routeCoords }) => {
  const map = useMap();

  useEffect(() => {
    if (userLocation && destination) {
      const bounds = L.latLngBounds([userLocation, destination]);
      if (routeCoords.length > 0) bounds.extend(routeCoords);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [userLocation, destination, routeCoords, map]);

  return null;
};

const Mapguider = ({ destination }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [isRouting, setIsRouting] = useState(false);
  const [routingService, setRoutingService] = useState(null);
  const routeCalculatedRef = useRef(false);
  const lastRouteKeyRef = useRef("");
  const routeTimeoutRef = useRef(null);

  // Get user's current location
  useEffect(() => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported by your browser");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        if (
          !userLocation ||
          Math.abs(newLocation[0] - userLocation[0]) > 0.0001 ||
          Math.abs(newLocation[1] - userLocation[1]) > 0.0001
        ) {
          setUserLocation(newLocation);
        }
      },
      (error) => {
        const msg = {
          1: "Location access denied. Please enable location services.",
          2: "Location information unavailable.",
          3: "Location request timed out.",
        };
        alert(msg[error.code] || "Unable to get your location");
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 600000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [userLocation]);

  // Calculate route
  useEffect(() => {
    if (userLocation && destination) {
      const routeKey = `${userLocation[0].toFixed(4)},${userLocation[1].toFixed(
        4
      )}-${destination[0].toFixed(4)},${destination[1].toFixed(4)}`;

      if (routeTimeoutRef.current) clearTimeout(routeTimeoutRef.current);

      if (routeCalculatedRef.current && lastRouteKeyRef.current === routeKey) {
        console.log("Route already calculated.");
        return;
      }

      routeTimeoutRef.current = setTimeout(async () => {
        routeCalculatedRef.current = true;
        lastRouteKeyRef.current = routeKey;
        setIsRouting(true);

        const tryRoutingService = async (serviceName) => {
          try {
            if (serviceName === "ORS") {
              const res = await axios.post(
                ROUTING_SERVICES.ORS.url,
                {
                  coordinates: [
                    [userLocation[1], userLocation[0]],
                    [destination[1], destination[0]],
                  ],
                  instructions: true,
                  geometry: true,
                  preference: "shortest",
                  units: "meters",
                },
                {
                  headers: {
                    Authorization: ROUTING_SERVICES.ORS.key,
                    "Content-Type": "application/json",
                  },
                }
              );
              if (res.data.features?.length) {
                return res.data.features[0].geometry.coordinates.map(
                  ([lng, lat]) => [lat, lng]
                );
              }
            } else if (serviceName === "OSRM") {
              const coordsStr = `${userLocation[1]},${userLocation[0]};${destination[1]},${destination[0]}`;
              const res = await axios.get(
                `${ROUTING_SERVICES.OSRM.url}/${coordsStr}?overview=full&geometries=geojson`
              );
              if (res.data.routes?.length) {
                return res.data.routes[0].geometry.coordinates.map(
                  ([lng, lat]) => [lat, lng]
                );
              }
            }
          } catch (err) {
            console.error(`${serviceName} failed:`, err);
            return null;
          }
        };

        let coords = await tryRoutingService("ORS");
        if (coords?.length >= 3) {
          setRouteCoords(coords);
          setRoutingService("ORS");
        } else {
          coords = await tryRoutingService("OSRM");
          if (coords?.length >= 3) {
            setRouteCoords(coords);
            setRoutingService("OSRM");
          } else {
            setRouteCoords([]);
            setRoutingService(null);
          }
        }

        setIsRouting(false);
      }, 1000);
    }
  }, [userLocation, destination]);

  useEffect(() => {
    if (destination) {
      routeCalculatedRef.current = false;
      lastRouteKeyRef.current = "";
      setRouteCoords([]);
      setRoutingService(null);
    }
  }, [destination]);

  const startIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    className: "start-marker",
  });

  const destinationIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [30, 46],
    iconAnchor: [15, 46],
    className: "destination-marker",
  });

  if (!userLocation)
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Getting your current location...</p>
        </div>
      </div>
    );

  if (!destination)
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600">No destination selected</p>
          <p className="text-sm text-gray-500">
            Please select a parking lot to see directions
          </p>
        </div>
      </div>
    );

  const centerLat = (userLocation[0] + destination[0]) / 2;
  const centerLng = (userLocation[1] + destination[1]) / 2;

  return (
    <div className="h-64 w-full relative z-0">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={13}
        className="h-full w-full"
        zoomControl={false}
      >
        <ZoomControl position="topright" />
        <MapBounds
          userLocation={userLocation}
          destination={destination}
          routeCoords={routeCoords}
        />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={userLocation} icon={startIcon}>
          <Popup>
            <div className="text-center">
              <p className="font-bold text-green-600">
                📍 Your Current Location
              </p>
              <p className="text-sm text-gray-600">
                Start your journey from here
              </p>
            </div>
          </Popup>
        </Marker>
        <Marker position={destination} icon={destinationIcon}>
          <Popup>
            <div className="text-center">
              <p className="font-bold text-red-600">🎯 Parking Destination</p>
              <p className="text-sm text-gray-600">Your parking spot is here</p>
            </div>
          </Popup>
        </Marker>
        {isRouting && (
          <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-lg px-3 py-1 shadow-md z-[1000]">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-800">
                Calculating road route...
              </span>
            </div>
          </div>
        )}

        {routeCoords.length > 0 && (
          <>
            <Polyline
              positions={routeCoords}
              color="#000000"
              weight={12}
              opacity={0.3}
            />
            <Polyline
              positions={routeCoords}
              color="#1E40AF"
              weight={8}
              opacity={0.6}
            />
            <Polyline
              positions={routeCoords}
              color="#3B82F6"
              weight={5}
              opacity={1.0}
            />
            <Polyline
              positions={routeCoords}
              color="#FFFFFF"
              weight={2}
              opacity={1.0}
            />
            <Polyline
              positions={routeCoords}
              color="#3B82F6"
              weight={1}
              opacity={1.0}
              dashArray="6, 3"
            />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default Mapguider;
