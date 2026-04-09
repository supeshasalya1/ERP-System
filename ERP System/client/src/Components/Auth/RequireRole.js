// client/src/Components/Auth/RequireRole.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export function RequireRole({ allowedRoles, children }) {
  const location = useLocation();

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const role =
    (typeof window !== "undefined" &&
      (localStorage.getItem("role") || localStorage.getItem("userRole"))) ||
    "";

  // Not logged in → go to login
  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Logged in but wrong role
  if (!allowedRoles.includes(role)) {
    // If it's an admin, send to admin dashboard
    if (role === "admin" || role === "super_admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    // Otherwise treat as normal user and send to user dashboard
    return <Navigate to="/user/dashboard" replace />;
  }

  return children;
}

// Convenience wrappers
export function RequireAdmin({ children }) {
  return (
    <RequireRole allowedRoles={["admin", "super_admin"]}>
      {children}
    </RequireRole>
  );
}

export function RequireUser({ children }) {
  return <RequireRole allowedRoles={["user"]}>{children}</RequireRole>;
}

// Default export kept as RequireAdmin for any existing imports
export default RequireAdmin;
