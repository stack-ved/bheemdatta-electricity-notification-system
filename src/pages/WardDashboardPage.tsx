import React from 'react';
import { Navigate } from 'react-router-dom';

export const WardDashboardPage: React.FC = () => {
  return <Navigate to="/admin-dashboard" replace />;
};

export default WardDashboardPage;
