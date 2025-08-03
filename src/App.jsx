import React, { useState } from "react";
import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
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
          onSuccess={handleAuthSuccess}
        />
        <div className="flex flex-col min-h-screen font-sans text-gray-900">
          <Header
            user={user}
            onLoginClick={() => setAuthModalOpen(true)}
            onProtectedNav={handleProtectedNav}
          />
          <main className="flex-grow container mx-auto px-4 py-8">
            <Routes>
              <Route
                path="/"
                element={
                  <HomePage user={user} onProtectedNav={handleProtectedNav} />
                }
              />
              {/* All other routes are protected */}
              <Route
                path="/find"
                element={
                  user ? (
                    <FindParkingPage />
                  ) : (
                    <HomePage user={user} onProtectedNav={handleProtectedNav} />
                  )
                }
              />
              <Route
                path="/book/:id"
                element={
                  user ? (
                    <BookingPage />
                  ) : (
                    <HomePage user={user} onProtectedNav={handleProtectedNav} />
                  )
                }
              />
              <Route
                path="/payment"
                element={
                  user ? (
                    <PaymentPage />
                  ) : (
                    <HomePage user={user} onProtectedNav={handleProtectedNav} />
                  )
                }
              />
              <Route
                path="/ticket"
                element={
                  user ? (
                    <TicketPage />
                  ) : (
                    <HomePage user={user} onProtectedNav={handleProtectedNav} />
                  )
                }
              />
              <Route
                path="/list-space"
                element={
                  user ? (
                    <ListSpacePage />
                  ) : (
                    <HomePage user={user} onProtectedNav={handleProtectedNav} />
                  )
                }
              />
              <Route
                path="/profile"
                element={
                  user ? (
                    <ProfilePage />
                  ) : (
                    <HomePage user={user} onProtectedNav={handleProtectedNav} />
                  )
                }
              />
              <Route
                path="/manager-dashboard/:id"
                element={
                  user ? (
                    <ManagerDashboard />
                  ) : (
                    <HomePage user={user} onProtectedNav={handleProtectedNav} />
                  )
                }
              />
              <Route
                path="/admin"
                element={
                  user ? (
                    <AdminPage />
                  ) : (
                    <HomePage user={user} onProtectedNav={handleProtectedNav} />
                  )
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
          <Chatbot />
        </div>
      </AppProvider>
    </HashRouter>
  );
};

export default App;
