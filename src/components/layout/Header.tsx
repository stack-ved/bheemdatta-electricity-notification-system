import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { ThemeToggle } from '../common/ThemeToggle';
import { useAppData } from '../../contexts/AppDataContext';
import { Zap, Menu, X, Bell, User, Building2, LogOut } from 'lucide-react';

interface HeaderProps {
  onOpenAdminModal?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const { language, t } = useLanguage();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useAppData();
  const { user, role, wardNumber, isAuthenticated, signOut, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const isResidentHeader = !isAuthenticated || role === 'resident';
  const unreadCount = isResidentHeader ? notifications.filter((n) => !n.read).length : 0;
  const isRoleLoading = loading || (isAuthenticated && role === null);
  const isPublicHeader = !loading && (!isAuthenticated || role === 'resident');
  const managementHome = '/admin-dashboard';
  const roleLabel = role === 'municipality_admin' ? 'Municipality Administration' : 'Citizen';
  const roleBadge = role === 'municipality_admin' ? 'Municipality Admin' : wardNumber ? `Resident (Ward ${wardNumber})` : 'Resident';

  const citizenNavLinks = [
    { to: '/', label: t.nav.home },
    { to: '/outages', label: t.nav.outages },
    { to: '/report', label: t.nav.reportProblem, isAlert: true },
    { to: '/reports', label: t.nav.myReports },
    ...(!loading && isAuthenticated ? [{ to: '/locations', label: t.nav.locations }] : []),
    ...(isAuthenticated ? [{ to: '/alerts', label: t.nav.alerts, badge: unreadCount > 0 ? unreadCount : undefined }] : []),
    { to: '/about', label: t.nav.about },
  ];


  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl transition-colors duration-200 shadow-2xs">
      {isPublicHeader && (
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-slate-300 dark:from-black dark:via-slate-950 dark:to-black text-[11px] py-1.5 px-4 sm:px-8 border-b border-blue-900/40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium tracking-wide">
                {t.nepalGovt} • {t.hero.neaHotline}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-slate-400">
              <span className="hover:text-slate-200 transition-colors">Bheemdatta Distribution Center</span>
              <span className="text-slate-600 dark:text-slate-700">•</span>
              <span className="hover:text-slate-200 transition-colors">Mahendranagar, Kanchanpur</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation Bar */}
      <div className="mx-auto flex h-16 min-w-0 max-w-7xl items-center justify-between gap-2 px-3 sm:h-18 sm:gap-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Name */}
        <Link to={isResidentHeader || isRoleLoading ? '/' : managementHome} className="group flex min-w-0 shrink items-center gap-2.5 sm:gap-3.5 focus-visible:rounded-xl">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-900 via-blue-950 to-slate-950 text-amber-400 shadow-md shadow-blue-950/30 ring-1 ring-blue-700/30 transition-all duration-300 group-hover:scale-105 group-hover:shadow-amber-500/20 dark:from-amber-500 dark:to-amber-600 dark:text-slate-950 dark:ring-amber-400/40 sm:h-10 sm:w-10">
            <Zap className="w-5 h-5 fill-current transition-transform duration-300 group-hover:rotate-6" />
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="truncate text-sm font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-lg group-hover:text-blue-950 dark:group-hover:text-amber-300 transition-colors">
              {language === 'ne' ? t.appNameNepali : t.appName}
            </span>
            <span className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400 sm:text-[11px]">
              {isResidentHeader
                ? language === 'ne' ? 'कञ्चनपुर, नेपाल' : 'Kanchanpur, Nepal'
                : roleLabel}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-2">
          {isRoleLoading ? (
            <div className="h-8 w-32 skeleton-shimmer rounded-lg" aria-label="Loading navigation" />
          ) : isResidentHeader ? citizenNavLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `relative px-3 py-1.5 rounded-xl text-xs xl:text-sm font-semibold transition-all duration-200 active:scale-95 ${
                  link.isAlert
                    ? isActive
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25 font-bold ring-2 ring-rose-600/30'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:shadow-xs font-bold'
                    : isActive
                    ? 'text-blue-900 dark:text-amber-400 bg-blue-50/90 dark:bg-slate-800 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
                }`
              }
            >
              {link.label}
              {link.badge && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs">
                  {link.badge}
                </span>
              )}
            </NavLink>
          )) : (
            <div className="hidden items-center gap-2 rounded-xl border border-orange-200/80 bg-orange-50/90 px-3 py-2 text-xs font-bold text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300 shadow-2xs xl:flex">
              <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              {roleBadge}
            </div>
          )}
        </nav>

        {/* Controls: Language, Theme, Admin Action & Login */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications Quick Icon (Desktop) */}
          {isAuthenticated && (isResidentHeader ? (
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setNotificationOpen((open) => !open)}
                className="relative rounded-xl border border-slate-200/80 p-2 text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 hover:shadow-2xs active:scale-95 dark:border-slate-700/80 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
                title="Notifications"
                aria-label="Open notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">{unreadCount}</span>}
              </button>
              {notificationOpen && (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-2xl backdrop-blur-xl dark:border-slate-700/90 dark:bg-slate-900/95 animate-fade-in-up">
                  <div className="flex items-center justify-between gap-3 px-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Recent Notifications</p>
                    {unreadCount > 0 && <button type="button" onClick={markAllNotificationsAsRead} className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 hover:underline cursor-pointer">Mark all read</button>}
                  </div>
                  <div className="max-h-80 space-y-1.5 overflow-y-auto mt-2">
                    {notifications.slice(0, 6).map((notification) => (
                      <Link
                        key={notification.id}
                        to={notification.noticeId ? '/alerts' : notification.outageId ? `/outages/${notification.outageId}` : '/alerts'}
                        onClick={() => { markNotificationAsRead(notification.id); setNotificationOpen(false); }}
                        className={`block rounded-xl p-3 text-left transition-all duration-150 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 ${notification.read ? '' : 'bg-orange-50/70 border border-orange-200/50 dark:bg-orange-950/30 dark:border-orange-900/40'}`}
                      >
                        <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{notification.titleEn}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">Ward {notification.wardNumber}: {notification.messageEn}</p>
                      </Link>
                    ))}
                    {notifications.length === 0 && <p className="px-2 py-6 text-center text-xs text-slate-500">No notifications yet.</p>}
                  </div>
                  <Link to="/alerts" onClick={() => setNotificationOpen(false)} className="mt-2 block border-t border-slate-100 px-2 pt-3 text-center text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:border-slate-800">View all notifications</Link>
                </div>
              )}
            </div>
          ) : (
            <Link
              to={managementHome}
              className="relative hidden rounded-xl border border-slate-200/80 p-2 text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:border-slate-700/80 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white sm:flex"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">{unreadCount}</span>}
            </Link>
          ))}

          {isAuthenticated && !isResidentHeader && (
            <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-700 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs dark:bg-orange-500 dark:text-slate-950">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="hidden max-w-40 text-right xl:block">
                <p className="truncate text-xs font-bold text-slate-800 dark:text-white">{roleBadge}</p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{user?.email}</p>
              </div>
            </div>
          )}

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => signOut()}
              disabled={loading}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 shadow-2xs transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{user?.email ? 'Logout' : t.nav.login}</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-blue-900 to-blue-950 text-white dark:from-slate-800 dark:to-slate-850 dark:text-slate-100 hover:from-blue-800 hover:to-blue-900 dark:hover:from-slate-700 dark:hover:to-slate-800 border border-blue-900/80 dark:border-slate-700 shadow-xs transition-all duration-200 active:scale-95"
            >
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.nav.login}</span>
            </Link>
          )}

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-2 shadow-2xl animate-fade-in-up">
          <nav className="flex flex-col space-y-1">
            {isRoleLoading ? (
              <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">Loading account navigation...</div>
            ) : isResidentHeader ? citizenNavLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium ${
                    isActive
                      ? 'bg-blue-50 text-blue-900 dark:bg-slate-800 dark:text-amber-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`
                }
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            )) : (
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-900/60 dark:bg-orange-950/30">
                <div className="flex items-center gap-2 text-sm font-bold text-orange-900 dark:text-orange-300">
                  <Building2 className="h-4 w-4" />
                  {roleBadge}
                </div>
                <p className="mt-1 truncate text-xs text-orange-800/80 dark:text-orange-300/80">{user?.email}</p>
              </div>
            )}

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <User className="w-4 h-4" />
                <span>{t.nav.login}</span>
              </Link>
            )}

          </nav>
        </div>
      )}
    </header>
  );
};
