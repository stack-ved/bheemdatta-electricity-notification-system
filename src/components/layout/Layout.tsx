import React, { Component, type ErrorInfo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';
import { ToastContainer } from '../common/ToastContainer';
import { AdminOutageModal } from '../admin/AdminOutageModal';
import { NotificationPermissionGate } from '../common/NotificationPermissionGate';
import { useAuth } from '../../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const { user, role } = useAuth();
  const location = useLocation();

  if (user && role === 'municipality_admin') {
    const managementHome = '/admin-dashboard';

    if (location.pathname !== managementHome) {
      return <Navigate to={managementHome} replace />;
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Ambient background decorative layer (non-interactive) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-400/10 dark:bg-blue-600/10 blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 rounded-full bg-amber-400/8 dark:bg-amber-500/5 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 rounded-full bg-emerald-400/8 dark:bg-emerald-600/5 blur-3xl" />
      </div>

      <Header onOpenAdminModal={() => setIsAdminModalOpen(true)} />
      
      <main className="relative z-10 flex-1 w-full animate-fade-in">
        {children}
      </main>

      <Footer />
      <MobileBottomNav />
      <ToastContainer />
      <NotificationPermissionGate />
      <AdminOutageModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />
    </div>
  );
};

export const AdminLayout: React.FC<LayoutProps> = ({ children }) => (
  <div className="relative min-h-screen bg-slate-50 text-slate-800 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
    {/* Admin ambient background subtle glow */}
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/5 dark:bg-blue-500/10 blur-[100px]" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] rounded-full bg-orange-500/5 dark:bg-orange-500/8 blur-[90px]" />
    </div>
    <main className="relative z-10 min-h-[calc(100vh-5rem)] w-full animate-fade-in">
      <AdminErrorBoundary>{children}</AdminErrorBoundary>
    </main>
    <ToastContainer />
  </div>
);

interface AdminErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AdminErrorBoundary extends Component<React.PropsWithChildren, AdminErrorBoundaryState> {
  state: AdminErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): AdminErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unexpected administrative dashboard error.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Administrative dashboard render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4 py-12">
          <div className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900 dark:bg-rose-950/30">
            <h1 className="text-xl font-bold text-rose-900 dark:text-rose-200">Administrative dashboard could not load</h1>
            <p className="mt-2 text-sm text-rose-800 dark:text-rose-300">{this.state.message}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-orange-500 dark:text-slate-950">
              Reload dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
