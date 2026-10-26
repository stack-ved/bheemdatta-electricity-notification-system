import React from 'react';
import { Link } from 'react-router-dom';
import type { Outage } from '../../types';

import { useLanguage } from '../../contexts/LanguageContext';
import { StatusBadge } from '../common/StatusBadge';
import { toNepaliDigits } from '../../data/locationsData';
import { Zap, MapPin, Calendar, Clock, AlertCircle, ArrowRight } from 'lucide-react';

interface OutageCardProps {
  outage: Outage;
  featured?: boolean;
}

export const OutageCard: React.FC<OutageCardProps> = ({ outage, featured = false }) => {
  const { language, t } = useLanguage();

  // Format date helper
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (language === 'ne') {
        const monthsNe = ['जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन', 'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर'];
        return `${monthsNe[date.getMonth()]} ${toNepaliDigits(date.getDate())}, ${toNepaliDigits(date.getFullYear())}`;
      }
      return date.toLocaleDateString('en-US', {
        month: 'short',
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

  const title = language === 'ne' ? outage.titleNe : outage.titleEn;
  const reason = language === 'ne' ? outage.reasonNe : outage.reasonEn;
  const feeder = language === 'ne' ? outage.feederNameNe : outage.feederNameEn;

  const wardsDisplay = outage.isMunicipalityWide
    ? (language === 'ne' ? 'नगरपालिकाव्यापी (सबै १९ वडाहरू)' : 'Municipality-wide (All 19 Wards)')
    : (outage.ward_number != null
      ? (language === 'ne' ? `वडा नं. ${toNepaliDigits(outage.ward_number)}` : `Ward ${outage.ward_number}`)
      : (outage.wards && outage.wards.length > 0
        ? outage.wards
            .map((w) => (language === 'ne' ? `वडा नं. ${toNepaliDigits(w)}` : `Ward ${String(w).padStart(2, '0')}`))
            .join(', ')
        : (language === 'ne' ? 'भीमदत्त नगरपालिका' : 'Bheemdatta Municipality')));

  const locationsDisplay = outage.affectedLocations
    .map((loc) => (language === 'ne' ? loc.nameNe : loc.nameEn))
    .join(', ');

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900 border card-interactive ${
        featured
          ? 'border-amber-400/80 dark:border-amber-500/50 shadow-md shadow-amber-500/10 ring-1 ring-amber-400/30'
          : 'border-slate-200/90 dark:border-slate-800/90 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700'
      } p-5 sm:p-6`}
    >
      <div>
        {/* Top bar: Icon, Status Badge & Municipality Ward */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-200 group-hover:scale-105 ${
                outage.status === 'ACTIVE'
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400 ring-1 ring-rose-500/20'
                  : outage.status === 'RESTORATION'
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 ring-1 ring-blue-500/20'
                  : outage.status === 'RESTORED'
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400 ring-1 ring-amber-500/20'
              }`}
            >
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {language === 'ne' ? 'भीमदत्त नगरपालिका' : 'Bheemdatta Municipality'}
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {wardsDisplay}
              </p>
            </div>
          </div>
          <StatusBadge status={outage.status} size="sm" />
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug group-hover:text-blue-900 dark:group-hover:text-amber-300 transition-colors">
          {title}
        </h3>

        {/* Affected Locations */}
        <div className="flex items-start gap-2 mt-2.5 text-xs text-slate-600 dark:text-slate-300">
          <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {locationsDisplay}
          </span>
        </div>

        {/* Timing Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <span>{formatDate(outage.startTime)}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              {formatTime(outage.startTime)} – {formatTime(outage.expectedRestoration)}
            </span>
          </div>
        </div>

        {/* Reason */}
        <div className="mt-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl p-3 text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800/80">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
            <p className="line-clamp-2">
              <strong className="text-slate-800 dark:text-slate-200 font-semibold mr-1">
                {t.upcoming.reasonLabel}:
              </strong>
              {reason}
            </p>
          </div>
          {feeder && (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 pl-5">
              {t.outagesPage.cardFeeder}: {feeder}
            </p>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="mt-5 pt-3.5 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span>
            {language === 'ne' ? 'अपडेट:' : 'Updated:'} {formatTime(outage.lastUpdated)}
          </span>
        </div>

        <Link
          to={`/outages/${outage.id}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-blue-900 hover:text-white dark:hover:bg-amber-400 dark:hover:text-slate-950 transition-all duration-150 active:scale-95 shadow-2xs group/btn cursor-pointer"
        >
          <span>{t.upcoming.viewDetails}</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover/btn:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
};
