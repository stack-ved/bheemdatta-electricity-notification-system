import React from 'react';
import { Navigate } from 'react-router-dom';

export const StaffDashboardPage: React.FC = () => {
  return <Navigate to="/admin-dashboard" replace />;
};

export default StaffDashboardPage;
