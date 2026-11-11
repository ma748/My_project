import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  let token = null;
  let userRole = null;
  try {
    token = localStorage.getItem('token');
    userRole = localStorage.getItem('userRole');
  } catch (e) {
    // Ignore storage errors
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Handle case-insensitive role check
  const hasAllowedRole = allowedRoles.some(
    role => role.toLowerCase() === userRole?.toLowerCase()
  );

  if (!hasAllowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
