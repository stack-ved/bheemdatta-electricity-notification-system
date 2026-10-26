import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppData } from '../../contexts/AppDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Home, Zap, Bell, AlertTriangle, FileText } from 'lucide-react';


export const MobileBottomNav: React.FC = () => {
  const { language, t } = useLanguage();
  const { notifications, reports } = useAppData();
  const { isAuthenticated, role, loading } = useAuth();

  if (!loading && isAuthenticated && role !== 'resident') {
    return null;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-2xl px-3 py-1.5 transition-colors duration-200"
    >
      <div className="flex items-center justify-around relative max-w-md mx-auto">
        {/* Home */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 active:scale-90 ${
              isActive
                ? 'text-blue-900 dark:text-amber-400 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`
          }
        >
          <Home className="w-5 h-5 transition-transform duration-150" />
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">{t.nav.home}</span>
        </NavLink>

        {/* Outages */}
        <NavLink
          to="/outages"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 active:scale-90 ${
              isActive
                ? 'text-blue-900 dark:text-amber-400 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`
          }
        >
          <Zap className="w-5 h-5 transition-transform duration-150" />
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">{t.nav.outages}</span>
        </NavLink>

        {/* PROMINENT CENTER ACTION: 🚨 Report Problem */}
        <NavLink
          to="/report"
          className="relative -top-4 flex flex-col items-center justify-center group focus-visible:outline-hidden"
          title={t.nav.reportProblem}
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-rose-700 hover:from-rose-600 hover:to-rose-800 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 ring-4 ring-white dark:ring-slate-950 active:scale-90 transition-all duration-200 group-hover:scale-105">
            <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] mt-1 font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
            {language === 'ne' ? 'समस्या रिपोर्ट' : 'Report'}
          </span>
        </NavLink>

        {/* My Reports */}
        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 active:scale-90 ${
              isActive
                ? 'text-blue-900 dark:text-amber-400 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`
          }
        >
          <div className="relative">
            <FileText className="w-5 h-5 transition-transform duration-150" />
            {reports.length > 0 && (
              <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-bold flex items-center justify-center shadow-xs">
                {reports.length}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">
            {language === 'ne' ? 'रिपोर्टहरू' : 'Reports'}
          </span>
        </NavLink>

        {/* Alerts */}
        {isAuthenticated && (
          <NavLink
            to="/alerts"
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 active:scale-90 ${
                isActive
                  ? 'text-blue-900 dark:text-amber-400 font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`
            }
          >
            <div className="relative">
              <Bell className="w-5 h-5 transition-transform duration-150" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-sans">{t.nav.alerts}</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
};

