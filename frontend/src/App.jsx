import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PrivateRoute } from "./components/PrivateRoute";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { SignUp } from "./pages/SignUp";
import { UsersPage } from "./pages/UsersPage";
import { AuthSuccess } from "./pages/AuthSuccess";
import { Profile } from "./pages/Profile";

// Tracks page views on every route change (required for SPAs)
function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
      });
    }
  }, [location]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <PageTracker />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/auth/success" element={<AuthSuccess />} />
          <Route path="/users" element={<PrivateRoute><UsersPage /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
