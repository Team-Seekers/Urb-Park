import React, { useEffect } from "react";

const DocumentViewer = ({ isOpen, onClose, documentUrl }) => {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-title"
    >
      <div
        className="bg-white rounded-lg shadow-2xl p-4 max-w-4xl max-h-full overflow-auto relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal content
      >
        <div className="flex justify-between items-center border-b pb-2 mb-4">
          <h2 id="document-title" className="text-xl font-bold text-gray-900">
            Document Viewer
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 transition-colors text-3xl font-bold"
            aria-label="Close document viewer"
          >
            &times;
          </button>
        </div>
        <div className="flex justify-center items-center">
          <img
            src={documentUrl}
            alt="Ownership Document"
            className="max-w-full max-h-[80vh] object-contain rounded"
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
