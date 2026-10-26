import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AppDataProvider } from './contexts/AppDataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminLayout, Layout } from './components/layout/Layout';
import { ElectricChargerLoader } from './components/common/ElectricChargerLoader';

import { HomePage } from './pages/HomePage';
import { OutagesPage } from './pages/OutagesPage';
import { OutageDetailPage } from './pages/OutageDetailPage';
import { LocationsPage } from './pages/LocationsPage';
import { AlertsPage } from './pages/AlertsPage';
import { AboutPage } from './pages/AboutPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { VerifyOtpPage } from './pages/VerifyOtpPage';
import { ReportProblemPage } from './pages/ReportProblemPage';
import { MyReportsPage } from './pages/MyReportsPage';
import { ReportDetailPage } from './pages/ReportDetailPage';
import { ProtectedRoute } from './pages/ProtectedRoute';
import { CitizenDashboardPage } from './pages/CitizenDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

// Exact minimum display duration: one complete 3-second cycle (3000ms)
const MIN_INITIAL_LOADER_DURATION_MS = 3000;
// Fixed startup timestamp recorded when this script loads on browser refresh
const INITIAL_APP_LOAD_TIME = Date.now();

function AppContent() {
  const { loading } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const elapsed = Date.now() - INITIAL_APP_LOAD_TIME;
    const remainingTime = Math.max(0, MIN_INITIAL_LOADER_DURATION_MS - elapsed);

    if (remainingTime === 0) {
      setMinTimeElapsed(true);
      return;
    }

    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, remainingTime);

    return () => clearTimeout(timer);
  }, []);

  // Display the animated loader immediately on website refresh and keep it mounted
  // for at least one full 3-second cycle, or until genuine auth verification completes (whichever takes longer).
  if (loading || !minTimeElapsed) {
    return (
      <ElectricChargerLoader
        fullScreen
        message="Connecting to the power network..."
      />
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/outages" element={<OutagesPage />} />
        <Route path="/outages/:id" element={<OutageDetailPage />} />
        <Route path="/locations" element={<ProtectedRoute><LocationsPage /></ProtectedRoute>} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/report" element={<ProtectedRoute requiredRole="resident"><ReportProblemPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute requiredRole="resident"><MyReportsPage /></ProtectedRoute>} />
        <Route path="/reports/:id" element={<ProtectedRoute requiredRole="resident"><ReportDetailPage /></ProtectedRoute>} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/citizen-dashboard" element={<ProtectedRoute requiredRole="resident"><CitizenDashboardPage /></ProtectedRoute>} />
        <Route path="/admin-dashboard" element={<AdminLayout><ProtectedRoute requiredRole="municipality_admin"><AdminDashboardPage /></ProtectedRoute></AdminLayout>} />
        <Route path="/ward-dashboard" element={<Navigate to="/admin-dashboard" replace />} />
        <Route path="/staff-dashboard" element={<Navigate to="/admin-dashboard" replace />} />
        <Route path="/nea-dashboard" element={<Navigate to="/admin-dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppDataProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </AppDataProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
