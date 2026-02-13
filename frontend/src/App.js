import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/login";
import StudentDashboard from "./pages/StudentDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import StudentQuiz from "./pages/StudentQuiz";  // import your StudentQuiz component

function RequireAuth({ children, allowedRole }) {
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("role");

  if (!token) {
    // Not logged in
    return <Navigate to="/" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    // Role does not match
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/student"
          element={
            <RequireAuth allowedRole="student">
              <StudentDashboard />
            </RequireAuth>
          }
        />

        <Route
          path="/staff"
          element={
            <RequireAuth allowedRole="staff">
              <StaffDashboard />
            </RequireAuth>
          }
        />

        {/* Add this route for quiz details */}
        <Route
          path="/quiz/:quizId"
          element={
            <RequireAuth allowedRole="student">
              <StudentQuiz />
            </RequireAuth>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
