import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ContactForm from "./components/ContactForm";
import SubmissionsDashboard from "./components/SubmissionsDashboard";
import SubmissionAnalytics from "./components/SubmissionAnalytics";
import RoleGate from "./auth/RoleGate";
import { useRole } from "./auth/useRole";
import "./index.css";

export default function App() {
  const { isAdmin } = useRole();

  return (
    <Router>
      <Navbar />

      <Routes>
        <Route path="/" element={<ContactForm />} />
        <Route
          path="/dashboard"
          element={
            <RoleGate allow={["user", "admin"]}>
              <SubmissionsDashboard />
            </RoleGate>
          }
        />
        <Route
          path="/analytics"
          element={
            <RoleGate allow={["user", "admin"]}>
              <SubmissionAnalytics />
            </RoleGate>
          }
        />
      </Routes>
    </Router>
  );
}
