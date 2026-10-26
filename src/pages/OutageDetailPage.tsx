import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppData } from '../contexts/AppDataContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { BheemdattaMap } from '../components/map/BheemdattaMap';
import { toNepaliDigits } from '../data/locationsData';
import { ElectricChargerLoader } from '../components/common/ElectricChargerLoader';
import {
  ArrowLeft,
  MapPin,
  Zap,
  Bell,
  CheckCircle2,
  Share2,
  PhoneCall,
  AlertCircle,
} from 'lucide-react';


export const OutageDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { outages, outagesLoading, subscribedOutageIds, toggleSubscribeOutage, showToast } = useAppData();

  const outage = outages.find((o) => o.id === id) || (outages.length > 0 ? outages[0] : null);

  if (outagesLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <ElectricChargerLoader
          message={language === 'ne' ? 'विद्युत अवरोध विवरण लोड हुँदैछ...' : 'Loading outage details...'}
          minHeight="min-h-[50vh]"
        />
      </div>
    );
  }

  if (!outage) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-900 dark:hover:text-amber-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.outageDetails.backLink}</span>
          </button>
        </div>
        <p className="text-slate-500 dark:text-slate-400">
          {language === 'ne' ? 'विद्युत अवरोध विवरण फेला परेन।' : 'Outage record not found.'}
        </p>
      </div>
    );
  }

  const isSubscribed = subscribedOutageIds.includes(outage.id);

  const title = language === 'ne' ? outage.titleNe : outage.titleEn;
  const reason = language === 'ne' ? outage.reasonNe : outage.reasonEn;
  const feeder = language === 'ne' ? outage.feederNameNe : outage.feederNameEn;
  const substation = language === 'ne' ? outage.substationNe : outage.substationEn;
  const note = language === 'ne' ? outage.emergencyNoteNe : outage.emergencyNoteEn;

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (language === 'ne') {
        const monthsNe = ['जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन', 'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर'];
        return `${monthsNe[date.getMonth()]} ${toNepaliDigits(date.getDate())}, ${toNepaliDigits(date.getFullYear())}`;
      }
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return language === 'ne' ? toNepaliDigits(timeStr) : timeStr;
    } catch {
      return isoString;
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast({
      type: 'info',
      title: t.common.copyLink,
      message: t.common.linkCopied,
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fade-in">
      {/* Back Button */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-900 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.outageDetails.backLink}</span>
        </button>
      </div>

      {/* Hero Header Card with Large Status Indicator */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle accent bar */}
        <div
          className={`absolute top-0 left-0 right-0 h-2 shadow-sm ${
            outage.status === 'ACTIVE'
              ? 'bg-rose-500'
              : outage.status === 'RESTORATION'
              ? 'bg-blue-500'
              : outage.status === 'RESTORED'
              ? 'bg-emerald-500'
              : 'bg-amber-500'
          }`}
        />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pt-2">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={outage.status} size="lg" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t.statusSection.lastUpdated}: 10 {language === 'ne' ? 'मिनेट अगाडि' : 'minutes ago'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {title}
            </h1>

            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{outage.municipality} • {outage.district}</span>
              <span className="text-slate-400 dark:text-slate-600">|</span>
              <span>
                {outage.wards.map((w) => (language === 'ne' ? `वडा नं. ${toNepaliDigits(w)}` : `Ward ${w}`)).join(', ')}
              </span>
            </p>
          </div>

          {/* Quick Actions: Share & Notify */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
            <button
              type="button"
              onClick={handleShare}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-900 dark:hover:text-amber-400 transition-all duration-200 shadow-xs active:scale-95"
              title={t.common.copyLink}
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => toggleSubscribeOutage(outage.id)}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 shadow-md active:scale-95 ${
                isSubscribed
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {isSubscribed ? <CheckCircle2 className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              <span>
                {isSubscribed
                  ? t.outageDetails.alreadySubscribed
                  : t.outageDetails.notifyMeBtn}
              </span>
            </button>
          </div>
        </div>

        {/* Schedule & Timing Banner */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50/80 dark:bg-slate-850/80 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/80">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              📅 {t.outageDetails.startLabel}
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {formatDate(outage.startTime)}
            </span>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-1">
              {formatTime(outage.startTime)}
            </p>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-850/80 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/80">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              ⚡ {t.outageDetails.expectedRestoration}
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {formatDate(outage.expectedRestoration)}
            </span>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">
              {formatTime(outage.expectedRestoration)}
            </p>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-850/80 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/80">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              👥 {language === 'ne' ? 'अनुमानित प्रभावित उपभोक्ता' : 'Estimated Customers'}
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              ~{outage.affectedCustomersEstimate ? (language === 'ne' ? toNepaliDigits(outage.affectedCustomersEstimate) : outage.affectedCustomersEstimate) : '1,200'} Households
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {feeder}
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Details and Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Scope & Affected Areas */}
        <div className="lg:col-span-6 space-y-6">
          {/* Affected Locations Card */}
          <div className="rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-7 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-rose-500" />
              <span>{t.outageDetails.affectedWardsAndToles}</span>
            </h3>

            <div className="space-y-3">
              {outage.affectedLocations.map((loc) => (
                <div
                  key={loc.locationId}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs transition-colors hover:border-blue-300 dark:hover:border-slate-600"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ne' ? loc.nameNe : loc.nameEn}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 font-semibold border border-blue-200/60 dark:border-blue-800/60">
                    {language === 'ne' ? `वडा नं. ${toNepaliDigits(loc.wardNumber)}` : `Ward ${loc.wardNumber}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reason & Technical Scope */}
          <div className="rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-7 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>{t.outageDetails.reasonHeading}</span>
            </h3>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {reason}
            </p>

            {note && (
              <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{note}</p>
              </div>
            )}

            {/* Grid Infrastructure */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs space-y-2 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>{t.outageDetails.feeder}:</span>
                <strong className="text-slate-800 dark:text-slate-200">{feeder}</strong>
              </div>
              <div className="flex justify-between">
                <span>{t.outageDetails.substation}:</span>
                <strong className="text-slate-800 dark:text-slate-200">{substation}</strong>
              </div>
            </div>
          </div>

          {/* Emergency Helpline Box */}
          <div className="rounded-3xl bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 text-white p-6 sm:p-7 shadow-xl space-y-3 border border-blue-800/50 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <PhoneCall className="w-4 h-4" />
              <span>{t.outageDetails.emergencyHelpline}</span>
            </div>
            <p className="text-3xl font-black tracking-tight text-white">{t.outageDetails.emergencyPhone}</p>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t.outageDetails.officialNotice}
            </p>
          </div>
        </div>

        {/* Right Column: Interactive Map View */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-7 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-500" />
                <span>{t.outageDetails.interactiveMap}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t.outageDetails.mapSubtitle}
              </p>
            </div>

            {/* Embedded interactive map */}
            <BheemdattaMap
              highlightWards={outage.wards}
              highlightLocations={outage.affectedLocations.map((l) => l.locationId)}
              statusVariant={outage.status}
              interactive={true}
            />
          </div>

          {/* Subscription Card */}
          <div className="rounded-3xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border border-amber-300/80 dark:border-amber-700/60 p-6 sm:p-7 text-slate-900 dark:text-white space-y-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
                <Bell className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold">
                {t.outageDetails.subscribeTitle}
              </h4>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.outageDetails.subscribeSubtitle}
            </p>

            <button
              type="button"
              onClick={() => toggleSubscribeOutage(outage.id)}
              className="w-full py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all duration-200 shadow-md shadow-amber-500/20 active:scale-98"
            >
              {isSubscribed ? t.outageDetails.alreadySubscribed : t.outageDetails.notifyMeBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
