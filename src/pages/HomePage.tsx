import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppData } from '../contexts/AppDataContext';
import { useAuth } from '../contexts/AuthContext';
import { toNepaliDigits } from '../data/locationsData';
import { StatusBadge } from '../components/common/StatusBadge';
import { OutageCard } from '../components/outages/OutageCard';
import { ElectricChargerLoader } from '../components/common/ElectricChargerLoader';
import {
  Zap,
  Bell,
  MapPin,
  Clock,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Radio,
} from 'lucide-react';


export const HomePage: React.FC = () => {
  const { language, t } = useLanguage();
  const { outages, outagesLoading, triggerTestNotification, enableBrowserNotifications, showToast } = useAppData();
  const { user, role, wardNumber, hasCompletePermanentAddress, loading } = useAuth();

  const isResident = user && role === 'resident';

  // Status simulation view filter (allows resident to see municipal overview)
  const [selectedStatusPreview, setSelectedStatusPreview] = useState<'NORMAL' | 'SCHEDULED' | 'ACTIVE' | 'RESTORATION'>('SCHEDULED');

  const activeCount = outages.filter((o) => o.status === 'ACTIVE').length;
  const scheduledCount = outages.filter((o) => o.status === 'SCHEDULED').length;
  const restoredCount = outages.filter((o) => o.status === 'RESTORED').length;

  const handleEnableNotifications = async () => {
    const enabled = await enableBrowserNotifications();
    triggerTestNotification();
    showToast({
      type: 'success',
      title: language === 'ne' ? 'सूचनाहरू सक्षम गरियो' : 'Notifications Enabled',
      message: enabled
        ? (language === 'ne'
          ? 'स्थान मिल्ने विद्युत सूचनाहरू यस उपकरणमा प्राप्त हुनेछन्।'
          : 'You will receive matching outage alerts on this device.')
        : (language === 'ne'
        ? 'तपाईंले भीमदत्त नगरपालिकाका विद्युत सूचनाहरू प्राप्त गर्नुहुनेछ।'
        : 'In-app alerts are enabled. Allow browser notifications for device alerts.'),
    });
  };

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950 text-white pt-10 pb-16 sm:pt-16 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        {/* Abstract Electricity Grid Background Lines */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
            {/* Transmission line decorative paths */}
            <path d="M 0 100 Q 300 180 600 120 T 1200 150" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.4" />
            <path d="M 0 120 Q 300 200 600 140 T 1200 170" fill="none" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.3" />
          </svg>
        </div>

        {/* Ambient Hero Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/15 blur-[120px] pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          {/* Official Public Service Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-900/70 border border-blue-700/60 text-blue-200 text-xs font-semibold backdrop-blur-md shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>{language === 'ne' ? 'भीमदत्त नगरपालिका • कञ्चनपुर, नेपाल' : 'Bheemdatta Municipality • Kanchanpur, Nepal'}</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            {t.hero.heading}
          </h1>

          {/* Subheading */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed font-sans">
            {t.hero.subheading}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span>{t.hero.enableNotifications}</span>
            </button>

            {!loading && user ? (
              isResident ? (
                hasCompletePermanentAddress ? (
                  <Link
                    to="/citizen-dashboard"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm bg-blue-900/80 hover:bg-blue-800 text-white border border-blue-700/70 transition-all backdrop-blur-xs shadow-md active:scale-95"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'ne' ? `मेरो वडा नं. ${toNepaliDigits(wardNumber ?? 0)}` : `My Ward ${wardNumber}`}</span>
                  </Link>
                ) : (
                  <Link
                    to="/citizen-dashboard"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm bg-amber-600 hover:bg-amber-500 text-white border border-amber-500/70 transition-all backdrop-blur-xs shadow-md active:scale-95"
                  >
                    <MapPin className="w-4 h-4 text-white" />
                    <span>{language === 'ne' ? 'स्थायी ठेगाना पुष्टि गर्नुहोस्' : 'Complete Address Setup'}</span>
                  </Link>
                )
              ) : (
                <Link
                  to="/locations"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm bg-blue-900/80 hover:bg-blue-800 text-white border border-blue-700/70 transition-all backdrop-blur-xs shadow-md active:scale-95"
                >
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>{t.hero.selectLocation}</span>
                </Link>
              )
            ) : null}

            <Link
              to="/outages"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
            >
              <span>{t.hero.browseOutages}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Live Metric Counters */}
          <div className="grid grid-cols-3 gap-3.5 pt-6 max-w-lg mx-auto border-t border-slate-800/80 text-left">
            <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800/90 shadow-md card-interactive">
              <span className="text-xl sm:text-2xl font-black text-rose-400">{activeCount}</span>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{t.hero.quickStatActive}</p>
            </div>
            <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800/90 shadow-md card-interactive">
              <span className="text-xl sm:text-2xl font-black text-amber-400">{scheduledCount}</span>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{t.hero.quickStatScheduled}</p>
            </div>
            <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800/90 shadow-md card-interactive">
              <span className="text-xl sm:text-2xl font-black text-emerald-400">{restoredCount}</span>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{t.hero.quickStatRestored}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Prominent Current Electricity Status Card Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 sm:-mt-12 relative z-20">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            {/* Left: Electricity Status Title and Location */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-2xs">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  {t.statusSection.title}
                </h2>
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 pl-11.5">
                📍 {t.statusSection.municipalityLabel} (Sudurpashchim Province, Kanchanpur)
              </p>
            </div>

            {/* Middle: Active Status Badge & Last Updated */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Status:
                </span>
                <StatusBadge status={selectedStatusPreview} size="lg" />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/90 px-3.5 py-1.5 rounded-full font-medium shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  {t.statusSection.lastUpdated}: 10 {language === 'ne' ? 'मिनेट अगाडि' : 'minutes ago'}
                </span>
              </div>
            </div>

            {/* Right: Quick Action */}
            <Link
              to="/outages"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-900 text-white dark:bg-amber-500 dark:text-slate-950 hover:bg-blue-800 dark:hover:bg-amber-400 transition-all duration-150 active:scale-95 shadow-xs"
            >
              <span>{t.statusSection.viewStatusReport}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Interactive Status Switcher (Demonstrating all required statuses) */}
          <div className="mt-5 pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {language === 'ne' ? 'प्रणालीगत स्थिति अवलोकन:' : 'System status simulation preview:'}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(['NORMAL', 'SCHEDULED', 'ACTIVE', 'RESTORATION'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatusPreview(st)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all duration-150 active:scale-95 cursor-pointer ${
                    selectedStatusPreview === st
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {st === 'NORMAL' && '🟢 Normal'}
                  {st === 'SCHEDULED' && '🟡 Scheduled'}
                  {st === 'ACTIVE' && '🔴 Outage'}
                  {st === 'RESTORATION' && '🔵 Restoration'}
                </button>
              ))}
            </div>
          </div>

          {/* Explanatory summary text */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-start gap-3">
            <Radio className="w-4 h-4 text-blue-500 shrink-0 mt-0.5 animate-pulse" />
            <p className="leading-relaxed font-sans">
              {selectedStatusPreview === 'NORMAL'
                ? t.statusSection.summaryNormal
                : t.statusSection.summaryAttention}
            </p>
          </div>
        </div>
      </section>

      {/* Upcoming Outages Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
              <Zap className="w-4 h-4 fill-current" />
              <span>{language === 'ne' ? 'ताजा तालिका' : 'Power Advisories'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {t.upcoming.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
              {t.upcoming.subtitle}
            </p>
          </div>

          <Link
            to="/outages"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-900 dark:text-amber-400 hover:underline"
          >
            <span>{t.upcoming.viewAllBtn} ({outages.length})</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Outage Cards Grid with NEA Electric Charger Loading */}
        {outagesLoading ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white/80 dark:border-slate-800/80 dark:bg-slate-900/80 backdrop-blur-md p-6 sm:p-10 shadow-sm">
            <ElectricChargerLoader
              message={language === 'ne' ? 'विद्युत तालिका लोड हुँदैछ...' : 'Loading power advisories...'}
              minHeight="min-h-[38vh]"
            />
          </div>
        ) : outages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 shadow-2xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {language === 'ne' ? 'हाल कुनै विद्युत अवरोध छैन।' : 'No current electricity outage updates.'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm font-sans">
              {language === 'ne'
                ? 'भीमदत्त नगरपालिकामा हाल कुनै सक्रिय वा तालिकाबद्ध विद्युत अवरोध रिपोर्ट गरिएको छैन।'
                : 'There are no active or scheduled electricity outages currently reported in Bheemdatta Municipality.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outages.slice(0, 6).map((outage, idx) => (
              <OutageCard key={outage.id} outage={outage} featured={idx === 0} />
            ))}
          </div>
        )}
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-slate-100/90 via-blue-50/40 to-slate-100/90 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 border border-slate-200/90 dark:border-slate-800 p-8 sm:p-12 shadow-xs">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-amber-400">
              {language === 'ne' ? 'नागरिक सेवा' : 'Simple Citizen Guide'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {t.howItWorks.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 font-sans">
              {t.howItWorks.subtitle}
            </p>
          </div>

          {/* 3 Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 shadow-xs card-interactive relative">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-black text-lg mb-4 shadow-2xs">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                {t.howItWorks.step1Title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                {t.howItWorks.step1Desc}
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 shadow-xs card-interactive relative">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center font-black text-lg mb-4 shadow-2xs">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                {t.howItWorks.step2Title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                {t.howItWorks.step2Desc}
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 shadow-xs card-interactive relative">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-black text-lg mb-4 shadow-2xs">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                {t.howItWorks.step3Title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                {t.howItWorks.step3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Prominent Report Electricity Problem Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-rose-950/90 via-slate-900 to-slate-900 border border-rose-500/40 p-6 sm:p-9 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-rose-950/30 backdrop-blur-xl relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center font-black shrink-0 shadow-lg shadow-rose-600/40">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-bold border border-rose-500/30">
                <span>{language === 'ne' ? 'प्रत्यक्ष क्यामेरा र GPS प्रमाणित' : 'Live Camera & GPS Verified'}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {t.reportProblem.pageTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-sans leading-relaxed">
                {t.reportProblem.pageSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end relative z-10">
            <Link
              to="/reports"
              className="px-4.5 py-3 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all active:scale-95 shadow-xs"
            >
              {language === 'ne' ? 'मेरा रिपोर्टहरू' : 'My Reports'}
            </Link>
            <Link
              to="/report"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-lg shadow-rose-600/40 transition-all duration-150 active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <span>{language === 'ne' ? '🚨 समस्या रिपोर्ट गर्नुहोस्' : '🚨 Report Problem'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Emergency Hotline Notice */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-amber-500/10 dark:bg-amber-950/25 border border-amber-300/80 dark:border-amber-700/60 p-5 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md shadow-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'ne' ? 'अनपेक्षित विद्युत अवरोध वा दुर्घटना भएमा' : 'Report Unscheduled Emergency Tripping or Hazard'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-sans leading-relaxed">
                {language === 'ne'
                  ? 'नेपाल विद्युत प्राधिकरण महेन्द्रनगर वितरण केन्द्र २४/७ आपतकालीन हटलाइन: ११५३ वा ०९९-५२११५३'
                  : 'Contact NEA Mahendranagar 24/7 Breakdown Hotline: 1153 or 099-521153 directly.'}
              </p>
            </div>
          </div>

          <Link
            to="/about"
            className="shrink-0 px-4.5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all duration-150 active:scale-95 shadow-xs"
          >
            {language === 'ne' ? 'थप सम्पर्कहरू' : 'All Contacts'}
          </Link>
        </div>
      </section>
    </div>
  );
};
