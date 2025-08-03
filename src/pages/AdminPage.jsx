import React, { useState, useEffect, useCallback } from "react";
import {
  getPendingSubmissions,
  updateLotVerificationCheck,
  rejectSubmission,
  approveSubmission,
  updateLotDetails,
} from "../services/parkingService";
import Spinner from "../components/Spinner";
import DocumentViewer from "../components/DocumentViewer";

/**
 * @typedef {Object} EditLotFormData
 * @property {string} name
 * @property {string} address
 * @property {number} totalSpots
 * @property {number} pricePerHour
 * @property {string[]} features
 * @property {string} image
 */
const AdminPage = () => {
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionStates, setActionStates] = useState({});

  const [editingLotId, setEditingLotId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    address: "",
    totalSpots: "",
    lat: "",
    lng: "",
  });

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [documentUrl, setDocumentUrl] = useState("");

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const lots = await getPendingSubmissions();
      setPendingSubmissions(lots);
    } catch (err) {
      setError("Failed to fetch submissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const setActionState = (lotId, state) => {
    setActionStates((prev) => ({ ...prev, [lotId]: state }));
  };

  const handleVerificationToggle = async (lotId, check) => {
    const lot = pendingSubmissions.find((p) => p.id === lotId);
    if (!lot) return;

    setActionState(lotId, true);
    try {
      const updatedLot = await updateLotVerificationCheck(
        lotId,
        check,
        !lot.verificationChecks[check]
      );
      setPendingSubmissions((prev) =>
        prev.map((p) => (p.id === lotId ? updatedLot : p))
      );
    } catch (err) {
      setError(`Failed to update verification for lot ${lotId}.`);
    } finally {
      setActionState(lotId, false);
    }
  };

  const handleAction = async (lotId, action) => {
    setActionState(lotId, true);
    setError("");
    try {
      if (action === "approve") {
        await approveSubmission(lotId);
      } else {
        await rejectSubmission(lotId);
      }
      // Refresh list after action
      await fetchAdminData();
    } catch (err) {
      setError(`Failed to ${action} submission ${lotId}.`);
    } finally {
      setActionState(lotId, false);
    }
  };

  const handleEdit = (lot) => {
    setEditingLotId(lot.id);
    setEditFormData({
      name: lot.name,
      address: lot.address,
      totalSpots: lot.totalSpots,
      lat: lot.lat,
      lng: lot.lng,
    });
  };

  const handleCancelEdit = () => {
    setEditingLotId(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditFormSubmit = async (e) => {
    e.preventDefault();
    if (!editingLotId) return;

    setActionState(editingLotId, true);
    try {
      const parsedData = {
        name: editFormData.name,
        address: editFormData.address,
        totalSpots: parseInt(String(editFormData.totalSpots), 10),
        lat: parseFloat(String(editFormData.lat)),
        lng: parseFloat(String(editFormData.lng)),
      };
      const updatedLot = await updateLotDetails(editingLotId, parsedData);
      setPendingSubmissions((prev) =>
        prev.map((p) => (p.id === editingLotId ? updatedLot : p))
      );
      setEditingLotId(null);
    } catch (err) {
      setError("Failed to save changes.");
    } finally {
      if (editingLotId) setActionState(editingLotId, false);
    }
  };

  const handleViewDocument = (lot) => {
    // In a real app, this would use a URL from the lot data.
    // We'll use a placeholder from picsum photos for demonstration.
    const docUrl = `https://picsum.photos/seed/${lot.id}-doc/800/1100`;
    setDocumentUrl(docUrl);
    setIsViewerOpen(true);
  };

  if (loading) return <Spinner />;

  if (error)
    return (
      <p className="text-center text-red-500 bg-red-50 p-4 rounded-lg">
        {error}
      </p>
    );

  return (
    <div>
      <DocumentViewer
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        documentUrl={documentUrl}
      />
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">
        Admin Panel
      </h1>

      {pendingSubmissions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-md">
          <p className="text-xl text-gray-500">No pending submissions.</p>
          <p className="text-gray-400 mt-2">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {pendingSubmissions.map((lot) => (
            <div
              key={lot.id}
              className="bg-white p-6 rounded-lg shadow-lg relative"
            >
              {editingLotId === lot.id ? (
                <form onSubmit={handleEditFormSubmit} className="space-y-4">
                  {/* Edit Form Fields */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Lot Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditFormChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Address
                    </label>
                    <textarea
                      name="address"
                      value={editFormData.address}
                      onChange={handleEditFormChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
                    ></textarea>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Total Spots
                      </label>
                      <input
                        type="number"
                        name="totalSpots"
                        value={editFormData.totalSpots}
                        onChange={handleEditFormChange}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        name="lat"
                        value={editFormData.lat}
                        onChange={handleEditFormChange}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        name="lng"
                        value={editFormData.lng}
                        onChange={handleEditFormChange}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={actionStates[lot.id]}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                // Display View
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold">{lot.name}</h2>
                      <p className="text-gray-600">{lot.address}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(lot)}
                        className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleViewDocument(lot)}
                        className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full hover:bg-yellow-200"
                      >
                        View Document
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 border-t pt-4">
                    <p>
                      <strong>Spots:</strong> {lot.totalSpots}
                    </p>
                    <p>
                      <strong>Price/Hr:</strong> ₹{lot.pricePerHour.toFixed(2)}
                    </p>
                    <p>
                      <strong>Coords:</strong> {lot.lat}, {lot.lng}
                    </p>
                    <p>
                      <strong>Owner ID:</strong> {lot.ownerId}
                    </p>
                  </div>
                  <div className="mt-4 border-t pt-4">
                    <h3 className="font-semibold mb-2">
                      Verification Checklist
                    </h3>
                    <div className="space-y-2">
                      {Object.keys(lot.verificationChecks).map((key) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={lot.verificationChecks[key]}
                            onChange={() =>
                              handleVerificationToggle(lot.id, key)
                            }
                            className="h-5 w-5 rounded text-green-600 focus:ring-green-600"
                          />
                          <span className="capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-4">
                    <button
                      onClick={() => handleAction(lot.id, "reject")}
                      disabled={actionStates[lot.id]}
                      className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-400"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction(lot.id, "approve")}
                      disabled={
                        actionStates[lot.id] ||
                        Object.values(lot.verificationChecks).some((v) => !v)
                      }
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      title={
                        Object.values(lot.verificationChecks).some((v) => !v)
                          ? "All checks must be complete to approve"
                          : "Approve Submission"
                      }
                    >
                      Approve
                    </button>
                  </div>
                </>
              )}
              {actionStates[lot.id] && (
                <div className="absolute inset-0 bg-white bg-opacity-50 flex justify-center items-center rounded-lg">
                  <Spinner />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
