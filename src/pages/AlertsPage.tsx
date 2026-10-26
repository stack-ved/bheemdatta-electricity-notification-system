import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppData } from '../contexts/AppDataContext';
import { useAuth } from '../contexts/AuthContext';
import { toNepaliDigits } from '../data/locationsData';
import {
  Bell,
  MapPin,
  Clock,
  Zap,
  Radio,
  Trash2,
  Star,
  Lock,
  ShieldCheck,
  AlertTriangle,
  FileEdit,
} from 'lucide-react';


export const AlertsPage: React.FC = () => {
  const { language, t } = useLanguage();
  const {
    user,
    role,
    wardNumber,
    permanentAddress,
    hasCompletePermanentAddress,
    hasPendingAddressCorrection,
    loading,
  } = useAuth();
  const {
    savedLocations,
    removeSavedLocation,
    setPrimaryLocation,
    preferences,
    updatePreferences,
    notifications,
    enableBrowserNotifications,
    markAllNotificationsAsRead,
    triggerTestNotification,
  } = useAppData();

  const isResident = user && role === 'resident';

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return `${dateStr}, ${timeStr}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/90 text-amber-900 dark:bg-amber-950/90 dark:text-amber-300 text-xs font-semibold border border-amber-200/60 dark:border-amber-800/60 backdrop-blur-xs">
          <Bell className="w-3.5 h-3.5 fill-current text-amber-600 dark:text-amber-400" />
          <span>{language === 'ne' ? 'नगरवासी सूचना केन्द्र' : 'Resident Alert Center'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t.alertsPage.title}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
          {t.alertsPage.subtitle}
        </p>
      </div>

      {/* Selected Location Section: Permanent Verified Address for Residents, Preview for Authenticated Users */}
      {!loading && user ? (
        isResident ? (
        hasCompletePermanentAddress ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {language === 'ne' ? 'तपाईंको स्थायी दर्ता ठेगाना' : 'Permanent Registered Municipal Address'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {language === 'ne'
                    ? 'तपाईंको स्थायी वडाका आधारमा आधिकारिक विद्युत सूचनाहरू प्राप्त हुनेछन्। यो ठेगाना सुरक्षित तथा अपरिवर्तनीय छ।'
                    : 'Official electricity notices and alerts are targeted based on your permanent verified ward. This address is locked.'}
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{language === 'ne' ? 'स्थायी ठेगाना सुरक्षित' : 'Permanent & Locked'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {language === 'ne' ? 'नगरपालिका' : 'Municipality'}
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {language === 'ne' ? 'भीमदत्त नगरपालिका' : 'Bheemdatta Municipality'}
                </p>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {language === 'ne' ? 'स्थायी वडा' : 'Permanent Ward'}
                </span>
                <p className="text-sm font-bold text-blue-900 dark:text-amber-400 mt-1">
                  {language === 'ne'
                    ? `वडा नं. ${toNepaliDigits(wardNumber ?? 0)}`
                    : `Ward No. ${wardNumber}`}
                </p>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {language === 'ne' ? 'स्थायी ठेगाना / टोल' : 'Permanent Address / Tole'}
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 break-words">
                  {permanentAddress?.trim() || (language === 'ne' ? 'रेकर्ड भएको छैन' : 'Not recorded')}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 pt-1">
              <p className="leading-relaxed">
                {hasPendingAddressCorrection
                  ? (language === 'ne'
                    ? 'तपाईंको ठेगाना संशोधन अनुरोध हाल प्रशासकको समीक्षामा छ।'
                    : 'Your address correction request is currently pending municipality administrator review.')
                  : (language === 'ne'
                    ? 'यदि स्थायी ठेगानामा कुनै त्रुटि भएमा आधिकारिक प्रशासकीय समीक्षाका लागि अनुरोध पेश गर्न सक्नुहुन्छ।'
                    : 'If your permanent address needs correction, you can submit an official correction request for administrator approval.')}
              </p>

              <Link
                to="/citizen-dashboard"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors shrink-0"
              >
                <FileEdit className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {hasPendingAddressCorrection
                    ? (language === 'ne' ? 'अनुरोध स्थिति हेर्नुहोस्' : 'View Request Status')
                    : (language === 'ne' ? 'ठेगाना संशोधन अनुरोध' : 'Request Address Correction')}
                </span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h2 className="text-base font-bold text-amber-950 dark:text-amber-100">
                  {language === 'ne' ? 'स्थायी ठेगाना प्रमाणीकरण आवश्यक' : 'Permanent Address Setup Required'}
                </h2>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  {language === 'ne'
                    ? 'वडा-केन्द्रित विद्युत सूचनाहरू पाउनका लागि तपाईंको स्थायी वडा र ठेगाना पुष्टि हुनु आवश्यक छ।'
                    : 'Ward-specific electricity notices and outage alerts require a verified permanent municipal address. Please complete or verify your permanent address in your Citizen Dashboard.'}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/citizen-dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-colors"
              >
                <span>{language === 'ne' ? 'नागरिक ड्यासबोर्डमा ठेगाना भर्नुहोस्' : 'Complete Address in Citizen Dashboard'}</span>
              </Link>
            </div>
          </div>
        )
      ) : (
        /* Guest / Visitor View: Informative preview mode */
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-500" />
                <span>{t.alertsPage.selectedLocationsTitle} (Guest Preview)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'ne'
                  ? 'अतिथि प्रयोगकर्ताका लागि पूर्वदृश्यावलोकन स्थानहरू। आधिकारिक सूचनाहरू पाउन नागरिक खाता खोल्नुहोस्।'
                  : 'Browsing in guest mode. Register a citizen account with your permanent address for official ward notice delivery.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                to="/locations"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-900 text-white dark:bg-amber-500 dark:text-slate-950 hover:bg-blue-800 dark:hover:bg-amber-400 transition-colors"
              >
                <span>{t.alertsPage.changeLocation}</span>
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
              >
                <span>{language === 'ne' ? 'दर्ता गर्नुहोस्' : 'Sign Up'}</span>
              </Link>
            </div>
          </div>

          {/* Saved Locations List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {savedLocations.map((loc) => (
              <div
                key={loc.id}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                  loc.isPrimary
                    ? 'bg-blue-50/70 dark:bg-slate-800/80 border-blue-200 dark:border-amber-500/40 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {language === 'ne' ? loc.nameNe : loc.nameEn}
                    </span>
                    {loc.isPrimary && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950">
                        {t.alertsPage.primaryBadge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {language === 'ne' ? `वडा नं. ${toNepaliDigits(loc.wardNumber)}` : `Ward No. ${loc.wardNumber}`}, Bheemdatta Municipality
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {!loc.isPrimary && (
                    <button
                      type="button"
                      onClick={() => setPrimaryLocation(loc.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                      title="Make Primary"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  {savedLocations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSavedLocation(loc.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                      title="Remove Location"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )) : null}

      {/* Notification Preferences Section */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              <span>{t.alertsPage.prefTitle}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.alertsPage.prefSubtitle}
            </p>
          </div>

          {/* Test Trigger Button */}
          <button
            type="button"
            onClick={triggerTestNotification}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-2xs"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>{t.alertsPage.testNotificationBtn}</span>
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            { key: 'websiteNotifications' as const, title: 'Website notifications', description: 'Show alerts in your notification bell.' },
            { key: 'browserNotifications' as const, title: 'Browser notifications', description: 'Show alerts while this site is open.' },
            { key: 'emailNotifications' as const, title: 'Email notifications', description: 'Manage optional email notices. Official outage alerts and general electricity notices are emailed regardless of this setting.' },
          ].map(({ key, title, description }) => (
            <label key={key} className="flex cursor-pointer items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <span><span className="block text-sm font-bold text-slate-900 dark:text-white">{title}</span><span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{description}</span></span>
              <input type="checkbox" checked={preferences[key]} onChange={(event) => updatePreferences({ [key]: event.target.checked })} className="mt-1 h-5 w-5 accent-amber-500" />
            </label>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
          <div><p className="text-sm font-bold text-slate-900 dark:text-white">Browser permission</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{typeof Notification === 'undefined' ? 'Not supported' : Notification.permission === 'granted' ? 'Notifications enabled' : 'Notifications disabled'}</p></div>
          <button type="button" onClick={() => void enableBrowserNotifications()} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400">Enable browser notifications</button>
        </div>

        {/* Toggles List */}
        <div className="space-y-4">
          {/* Toggle 1: Scheduled Outages */}
          <label className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 cursor-pointer">
            <div className="space-y-1">
              <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🟡</span>
                <span>{t.alertsPage.toggleScheduled}</span>
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                {t.alertsPage.toggleScheduledDesc}
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.scheduledOutages}
              onChange={(e) => updatePreferences({ scheduledOutages: e.target.checked })}
              className="mt-1 w-5 h-5 accent-amber-500 rounded cursor-pointer"
            />
          </label>

          {/* Toggle 2: Active Power Outages */}
          <label className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 cursor-pointer">
            <div className="space-y-1">
              <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🔴</span>
                <span>{t.alertsPage.toggleActive}</span>
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                {t.alertsPage.toggleActiveDesc}
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.activeOutages}
              onChange={(e) => updatePreferences({ activeOutages: e.target.checked })}
              className="mt-1 w-5 h-5 accent-rose-600 rounded cursor-pointer"
            />
          </label>

          {/* Toggle 3: Electricity Restored */}
          <label className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 cursor-pointer">
            <div className="space-y-1">
              <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🟢</span>
                <span>{t.alertsPage.toggleRestored}</span>
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                {t.alertsPage.toggleRestoredDesc}
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.electricityRestored}
              onChange={(e) => updatePreferences({ electricityRestored: e.target.checked })}
              className="mt-1 w-5 h-5 accent-emerald-500 rounded cursor-pointer"
            />
          </label>

          {/* Toggle 4: Important Announcements */}
          <label className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 cursor-pointer">
            <div className="space-y-1">
              <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📢</span>
                <span>{t.alertsPage.toggleAnnouncements}</span>
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                {t.alertsPage.toggleAnnouncementsDesc}
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.importantAnnouncements}
              onChange={(e) => updatePreferences({ importantAnnouncements: e.target.checked })}
              className="mt-1 w-5 h-5 accent-blue-600 rounded cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Notification History Section */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span>{t.alertsPage.historyTitle}</span>
          </h2>

          {notifications.some((n) => !n.read) && (
            <button
              type="button"
              onClick={markAllNotificationsAsRead}
              className="text-xs font-bold text-blue-900 dark:text-amber-400 hover:underline"
            >
              {t.alertsPage.markAllAsRead}
            </button>
          )}
        </div>

        {/* Notification Cards */}
        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const notifTitle = language === 'ne' ? notif.titleNe : notif.titleEn;
              const notifMsg = language === 'ne' ? notif.messageNe : notif.messageEn;

              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                    notif.read
                      ? 'bg-slate-50/70 dark:bg-slate-850/60 border-slate-200/80 dark:border-slate-800'
                      : 'bg-white dark:bg-slate-800 border-amber-300/80 dark:border-amber-600/40 shadow-xs ring-1 ring-amber-400/20'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      notif.type === 'ACTIVE'
                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                        : notif.type === 'RESTORED'
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                    }`}
                  >
                    <Zap className="w-4 h-4 fill-current" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {notifTitle}
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {formatTimestamp(notif.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                      {notifMsg}
                    </p>

                    {notif.outageId && (
                      <Link
                        to={`/outages/${notif.outageId}`}
                        className="inline-block pt-1 text-[11px] font-bold text-blue-900 dark:text-amber-400 hover:underline"
                      >
                        {t.upcoming.viewDetails} →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500">
            {t.alertsPage.historyEmpty}
          </div>
        )}
      </div>
    </div>
  );
};
