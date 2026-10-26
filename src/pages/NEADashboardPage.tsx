import React from 'react';
import { Navigate } from 'react-router-dom';

export const NEADashboardPage: React.FC = () => {
  return <Navigate to="/admin-dashboard" replace />;
};

export default NEADashboardPage;
