import React, { useState } from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import { AppProvider } from "./hooks/useAppContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import FindParkingPage from "./pages/FindParkingPage";
import BookingPage from "./pages/BookingPage";
import TicketPage from "./pages/TicketPage";
import ListSpacePage from "./pages/ListSpacePage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import ManagerDashboard from "./pages/ManagerDashboard";
import NotFoundPage from "./pages/NotFoundPage";
import Chatbot from "./components/Chatbot";
import PaymentPage from "./pages/PaymentPage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthTabs from "./components/AuthTabs";
import AuthModal from "./components/AuthModal";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./services/Firebase";

const App = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/");
  const [user] = useAuthState(auth);

  // Handler for protected navigation
  const handleProtectedNav = (path) => {
    if (!user) {
      setRedirectPath(path);
      setAuthModalOpen(true);
    } else {
      window.location.hash = `#${path}`;
    }
  };

  // After login, redirect to intended page
  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
    window.location.hash = `#${redirectPath}`;
  };

  return (
    <HashRouter>
      <AppProvider>
        <ToastContainer />
        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
        <div className="flex flex-col min-h-screen font-sans text-gray-900">
          <Header onProtectedNav={handleProtectedNav} user={user} />
          <main className="flex-grow container mx-auto px-4 py-8">
            <Routes>
              {/* Auth route */}
              <Route path="/auth" element={<AuthTabs />} />
              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <HomePage onProtectedNav={handleProtectedNav} user={user} />
                }
              />
              <Route
                path="/find"
                element={
                  user ? (
                    <FindParkingPage />
                  ) : (
                    <HomePage onProtectedNav={handleProtectedNav} user={user} />
                  )
                }
              />
              <Route path="/book/:id" element={<BookingPage />} />
              <Route path="/payment" element={<PaymentPage />} />
              <Route path="/ticket" element={<TicketPage />} />
              <Route path="/list-space" element={<ListSpacePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/manager-dashboard/:id"
                element={<ManagerDashboard />}
              />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            {/* For the "Find Parking Now" button */}
          </main>
          <Footer />
          <Chatbot />
        </div>
      </AppProvider>
    </HashRouter>
  );
};

export default App;
