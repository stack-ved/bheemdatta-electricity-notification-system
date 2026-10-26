import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LogOut,
  ShieldCheck,
  BellRing,
  Phone,
  FilePlus2,
  Zap,
  ArrowRight,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { toNepaliDigits } from '../data/locationsData';
import { StatusBadge } from '../components/common/StatusBadge';

export const CitizenDashboardPage: React.FC = () => {
  const {
    user,
    fullName,
    phoneNumber,
    wardNumber,
    permanentAddress,
    hasPendingAddressCorrection,
    hasCompletePermanentAddress,
    profileLoading,
    signOut,
    requestAddressCorrection,
    updateResidentDetails,
  } = useAuth();
  const { outages, outagesLoading, notifications, showToast } = useAppData();
  const { language } = useLanguage();

  const [correctionWard, setCorrectionWard] = useState<number | ''>('');
  const [correctionAddress, setCorrectionAddress] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  const citizenWard = hasCompletePermanentAddress ? wardNumber : null;

  const handleCorrectionRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (correctionWard === '' || !correctionAddress.trim() || !correctionReason.trim()) {
      showToast({ type: 'error', title: 'Correction details required', message: 'Select the correct ward, enter your permanent address, and explain the correction.' });
      return;
    }

    setIsSubmittingCorrection(true);
    const result = await requestAddressCorrection(correctionWard, correctionAddress.trim(), correctionReason.trim());
    setIsSubmittingCorrection(false);
    if (result.error) {
      showToast({ type: 'error', title: 'Request not submitted', message: result.error });
      return;
    }

    setCorrectionAddress('');
    setCorrectionReason('');
    showToast({ type: 'success', title: 'Address correction requested', message: 'A municipality administrator must approve this change before it affects your ward notifications.' });
  };

  const handleProfileDetailsSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const details = new FormData(event.currentTarget);
    setIsSavingDetails(true);
    const result = await updateResidentDetails(
      String(details.get('full_name') ?? ''),
      String(details.get('phone') ?? ''),
    );
    setIsSavingDetails(false);
    if (result.error) {
      showToast({ type: 'error', title: 'Profile update failed', message: result.error });
      return;
    }
    showToast({ type: 'success', title: 'Profile updated', message: 'Your name and phone number have been saved.' });
  };

  // Ward specific outages: only show if municipality-wide OR matches citizen's specific ward
  const wardOutages = outages.filter((o) => {
    if (o.isMunicipalityWide || o.is_municipality_wide) return true;
    if (citizenWard !== null && citizenWard !== undefined) {
      if (o.ward_number != null) return o.ward_number === citizenWard;
      return Array.isArray(o.wards) && o.wards.includes(citizenWard);
    }
    return false;
  });

  // Ward specific notifications
  const wardNotifications = notifications.filter(
    (n) => n.wardNumber === 0 || (citizenWard !== null && n.wardNumber === citizenWard)
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-gradient-to-br from-white via-slate-50/90 to-amber-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20 backdrop-blur-md p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/90 text-amber-900 dark:bg-amber-950/90 dark:text-amber-300 text-xs font-semibold border border-amber-200/60 dark:border-amber-800/60 backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>
                {citizenWard != null
                  ? (language === 'ne'
                    ? `भीमदत्त नगरपालिका • वडा नं ${toNepaliDigits(citizenWard)} निवासी`
                    : `Bheemdatta Municipality • Registered Ward ${citizenWard} Resident`)
                  : (language === 'ne'
                    ? `भीमदत्त नगरपालिका निवासी`
                    : `Bheemdatta Municipality Resident`)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {language === 'ne' ? 'नागरिक ड्यासबोर्ड' : 'Citizen Dashboard'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {user?.email ?? 'Citizen Account'} • {citizenWard != null ? (language === 'ne' ? `वडा नं. ${toNepaliDigits(citizenWard)}` : `Ward No. ${citizenWard}`) : (language === 'ne' ? 'वडा तोकिएको छैन' : 'No Ward Assigned')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 self-start sm:self-auto cursor-pointer shadow-sm active:scale-95"
          >
            <LogOut className="h-4 w-4" />
            {language === 'ne' ? 'लगआउट' : 'Sign out'}
          </button>
        </div>

        <section className="mt-6 border-t border-slate-200/80 pt-5 dark:border-slate-800" aria-labelledby="resident-address-heading">
          <h2 id="resident-address-heading" className="text-sm font-bold text-slate-900 dark:text-white">Permanent residential address</h2>
          {!profileLoading && (
            <form onSubmit={handleProfileDetailsSave} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Name
                <input name="full_name" defaultValue={fullName} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-normal text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-amber-500/40" />
              </label>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Phone number
                <input name="phone" type="tel" defaultValue={phoneNumber} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-normal text-slate-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-amber-500/40" />
              </label>
              <button type="submit" disabled={isSavingDetails} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 transition-colors shadow-sm cursor-pointer">
                {isSavingDetails ? 'Saving...' : 'Save profile'}
              </button>
            </form>
          )}
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800"><dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Municipality</dt><dd className="mt-1 font-bold text-slate-800 dark:text-slate-200">Bheemdatta Municipality</dd></div>
            <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800"><dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Saved ward</dt><dd className="mt-1 font-bold text-blue-900 dark:text-amber-400">{wardNumber ? `Ward ${wardNumber}` : 'Not recorded'}</dd></div>
            <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800"><dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Saved address</dt><dd className="mt-1 break-words font-bold text-slate-800 dark:text-slate-200">{permanentAddress?.trim() || 'Not recorded'}</dd></div>
          </dl>
          <div className="mt-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 p-4 text-sm text-amber-950 dark:text-amber-100">
            <p className="font-semibold">
              {hasPendingAddressCorrection
                ? 'Your address correction is awaiting municipality administrator review.'
                : hasCompletePermanentAddress
                  ? 'This permanent address is locked after signup.'
                  : 'Your permanent address needs verification before ward-specific notifications are enabled.'}
            </p>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">If the saved address is incorrect, contact the authorized municipality administrator. You can submit a correction request below; only an administrator can approve it.</p>
            {hasPendingAddressCorrection ? null : (
              <form onSubmit={handleCorrectionRequest} className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold">Correct ward
                  <select value={correctionWard} onChange={(event) => setCorrectionWard(event.target.value ? Number(event.target.value) : '')} className="mt-1 w-full rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm font-normal text-slate-900 dark:text-white">
                    <option value="">Select ward</option>
                    {Array.from({ length: 19 }, (_, index) => index + 1).map((ward) => <option key={ward} value={ward}>Ward {ward}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold">Correct permanent address
                  <input value={correctionAddress} onChange={(event) => setCorrectionAddress(event.target.value)} className="mt-1 w-full rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm font-normal text-slate-900 dark:text-white" placeholder="Tole / street / locality" />
                </label>
                <label className="text-xs font-semibold sm:col-span-2">Reason for correction
                  <textarea value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm font-normal text-slate-900 dark:text-white" />
                </label>
                <button type="submit" disabled={isSubmittingCorrection} className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60 sm:col-span-2 sm:justify-self-start transition-colors shadow-sm cursor-pointer">
                  {isSubmittingCorrection ? 'Submitting request...' : 'Request address correction'}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Quick Action Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Link
            to="/submit-report"
            className="card-interactive group flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white/90 p-4 transition-all hover:border-amber-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-800/90"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <FilePlus2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
                {language === 'ne' ? 'समस्या दर्ता गर्नुहोस्' : 'Report an Outage'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {language === 'ne' ? 'प्रत्यक्ष फोटो र GPS सहित' : 'With live camera photo & GPS'}
              </p>
            </div>
          </Link>

          <Link
            to="/alerts"
            className="card-interactive group flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white/90 p-4 transition-all hover:border-amber-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-800/90"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <BellRing className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
                {language === 'ne' ? 'वडा सूचनाहरू हेर्नुहोस्' : 'Ward Alert Center'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {language === 'ne' ? `${toNepaliDigits(wardNotifications.length)} वटा सूचना` : `${wardNotifications.length} notices for your ward`}
              </p>
            </div>
          </Link>

          <Link
            to="/outages"
            className="card-interactive group flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white/90 p-4 transition-all hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-800/90"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <Zap className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {language === 'ne' ? 'विद्युत तालिका' : 'Power Schedules'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {language === 'ne' ? 'नगरपालिका र वडा तालिका' : 'Live status across 19 wards'}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Ward Electricity Status & Notices */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Outages affecting Resident's Ward ("Recent Outages") */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {citizenWard != null
                  ? (language === 'ne'
                    ? `हालका विद्युत अवरोधहरू (वडा नं. ${toNepaliDigits(citizenWard)})`
                    : `Recent Outages (Ward ${citizenWard})`)
                  : (language === 'ne'
                    ? 'हालका विद्युत अवरोधहरू (नगरपालिकाव्यापी)'
                    : 'Recent Outages (Municipality-wide)')}
              </h2>
            </div>
            <Link
              to="/outages"
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 inline-flex items-center gap-1"
            >
              {language === 'ne' ? 'सबै हेर्नुहोस्' : 'View all'}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {profileLoading || outagesLoading ? (
              <div className="py-8 flex flex-col items-center justify-center text-sm text-slate-400 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
                <span>{language === 'ne' ? 'लोड हुँदैछ...' : 'Loading outages for your ward...'}</span>
              </div>
            ) : wardOutages.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                {language === 'ne'
                  ? 'तपाईंको वडामा अहिले कुनै अवरोध छैन।'
                  : 'No active or scheduled power interruptions in your ward.'}
              </div>
            ) : (
              wardOutages.slice(0, 5).map((outage) => (
                <div
                  key={outage.id}
                  className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        {language === 'ne' ? outage.titleNe : outage.titleEn}
                      </span>
                      <StatusBadge status={outage.status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {language === 'ne' ? outage.reasonNe : outage.reasonEn}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(outage.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(outage.expectedRestoration).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {outage.isMunicipalityWide && (
                        <span className="text-purple-600 dark:text-purple-400 font-medium">
                          {language === 'ne' ? 'नगरपालिकाव्यापी' : 'Municipality-wide'}
                        </span>
                      )}
                      {!outage.isMunicipalityWide && outage.ward_number != null && (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {language === 'ne' ? `वडा नं. ${toNepaliDigits(outage.ward_number)}` : `Ward ${outage.ward_number}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Notifications for Resident */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BellRing className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'ne' ? 'हालका सूचनाहरू' : 'Recent Ward Notices'}
              </h2>
            </div>
            <Link
              to="/alerts"
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 inline-flex items-center gap-1"
            >
              {language === 'ne' ? 'सबै सूचना' : 'All alerts'}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {wardNotifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                {language === 'ne' ? 'कुनै सूचना छैन।' : 'No notifications received yet.'}
              </div>
            ) : (
              wardNotifications.slice(0, 5).map((notif) => (
                <div
                  key={notif.id}
                  className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      {language === 'ne' ? notif.titleNe : notif.titleEn}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(notif.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {language === 'ne' ? notif.messageNe : notif.messageEn}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Emergency Helpline Contact */}
      <div className="rounded-3xl border border-slate-200 bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 dark:border-slate-800">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-lg font-bold flex items-center justify-center sm:justify-start gap-2">
            <Phone className="w-5 h-5 text-orange-400" />
            {language === 'ne' ? 'विद्युत आकस्मिक सेवा तथा सोधपुछ' : 'NEA Emergency Helpline & Inquiries'}
          </h3>
          <p className="text-xs text-slate-300">
            {language === 'ne'
              ? 'भीमदत्त नगरपालिका २४/७ आकस्मिक विद्युत नियन्त्रण कक्ष'
              : 'Bheemdatta Municipality 24/7 Central Emergency Dispatch Center'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="tel:099521155"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold text-xs transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            099-521155 (NEA Office)
          </a>
          <a
            href="tel:1155"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors border border-slate-700"
          >
            1155 (Emergency Toll-Free)
          </a>
        </div>
      </div>
    </div>
  );
};
