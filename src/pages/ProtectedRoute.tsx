import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ElectricChargerLoader } from '../components/common/ElectricChargerLoader';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, loading, profileLoading, role, isResident, isMunicipalityAdmin } = useAuth();

  if (loading || (user && profileLoading && !role)) {
    return (
      <ElectricChargerLoader
        message="Connecting to the power network..."
        minHeight="min-h-[65vh]"
      />
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const allowedRoleMatches = !requiredRole || role === requiredRole;

  if (!allowedRoleMatches) {
    if (isResident) {
      return <Navigate to="/citizen-dashboard" replace />;
    }

    if (isMunicipalityAdmin) {
      return <Navigate to="/admin-dashboard" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
