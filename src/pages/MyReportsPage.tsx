import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useReports } from '../hooks/useReports';
import type { ReportStatus, ProblemReport } from '../types';
import { toNepaliDigits } from '../data/locationsData';
import { ElectricChargerLoader } from '../components/common/ElectricChargerLoader';
import {
  Clock,
  MapPin,
  Plus,
  ArrowRight,
  Camera,
  CheckCircle2,
} from 'lucide-react';


export const MyReportsPage: React.FC = () => {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { data: reports, loading, error } = useReports(user?.id);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'ALL'>('ALL');

  const filteredReports = reports.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  const getStatusBadge = (status: ReportStatus) => {
    const config = {
      SUBMITTED: { bg: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300', dot: 'bg-amber-500', label: t.reportProblem.statuses.SUBMITTED },
      UNDER_REVIEW: { bg: 'bg-blue-100 text-blue-900 dark:bg-blue-950/70 dark:text-blue-300', dot: 'bg-blue-500', label: t.reportProblem.statuses.UNDER_REVIEW },
      ASSIGNED: { bg: 'bg-orange-100 text-orange-900 dark:bg-orange-950/70 dark:text-orange-300', dot: 'bg-orange-500', label: t.reportProblem.statuses.ASSIGNED },
      IN_PROGRESS: { bg: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-300', dot: 'bg-indigo-500', label: t.reportProblem.statuses.IN_PROGRESS },
      RESOLVED: { bg: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300', dot: 'bg-emerald-500', label: t.reportProblem.statuses.RESOLVED },
      REJECTED: { bg: 'bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-300', dot: 'bg-rose-500', label: t.reportProblem.statuses.REJECTED },
    }[status];

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${config.bg}`}>
        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
        <span>{config.label}</span>
      </span>
    );
  };

  const getPriorityBadge = (priority: ProblemReport['priority']) => {
    if (priority === 'EMERGENCY' || priority === 'HIGH') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
          HIGH PRIORITY
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        STANDARD
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/90 text-blue-900 dark:bg-blue-950/90 dark:text-blue-300 text-xs font-semibold border border-blue-200/60 dark:border-blue-800/60 backdrop-blur-xs">
            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-amber-400" />
            <span>{language === 'ne' ? 'नागरिक रिपोर्ट इतिहास' : 'Verified Submissions'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t.reportProblem.myReports.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
            {t.reportProblem.myReports.subtitle}
          </p>
        </div>

        <Link
          to="/report"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all duration-200 shadow-md shadow-amber-500/20 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t.reportProblem.myReports.newReportBtn}</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200/80 dark:border-slate-800 text-xs scrollbar-none">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-blue-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
          }`}
        >
          All ({reports.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('UNDER_REVIEW')}
          className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
            statusFilter === 'UNDER_REVIEW'
              ? 'bg-blue-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
          }`}
        >
          {t.reportProblem.statuses.UNDER_REVIEW}
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-blue-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
          }`}
        >
          {t.reportProblem.statuses.IN_PROGRESS}
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('RESOLVED')}
          className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
            statusFilter === 'RESOLVED'
              ? 'bg-blue-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
          }`}
        >
          {t.reportProblem.statuses.RESOLVED}
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white/80 dark:border-slate-800/80 dark:bg-slate-900/80 backdrop-blur-md p-6 shadow-sm">
          <ElectricChargerLoader
            message={language === 'ne' ? 'रिपोर्टहरू लोड हुँदैछ...' : 'Loading verified reports...'}
            minHeight="min-h-[42vh]"
          />
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-12 text-center text-sm text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/30 dark:text-rose-300 shadow-sm">
          {error}
        </div>
      ) : filteredReports.length > 0 ? (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const categoryLabel = t.reportProblem.categories[report.problem_type as keyof typeof t.reportProblem.categories] || report.problem_type;

            return (
              <div
                key={report.id}
                className="card-interactive rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 p-5 sm:p-6 shadow-sm hover:shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
              >
                {/* Photo Thumbnail + Details */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-950 shrink-0 border border-slate-200 dark:border-slate-800 relative shadow-xs">
                    {report.photo_url ? (
                      <img src={report.photo_url} alt="Captured evidence thumbnail" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-500">No photo</div>
                    )}
                    <div className="absolute bottom-1 right-1 bg-black/85 text-amber-400 rounded-md px-1.5 py-0.5 text-[9px] font-mono flex items-center gap-1 font-bold shadow-xs">
                      <Camera className="w-2.5 h-2.5" />
                      <span>{report.photos && report.photos.length > 1 ? `${report.photos.length} PHOTOS` : 'LIVE'}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                        {report.report_number}
                      </span>
                      {getPriorityBadge(report.priority)}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {categoryLabel}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>
                        {language === 'ne' ? `वडा नं. ${toNepaliDigits(report.ward_id)}` : `Ward No. ${report.ward_id}`}, Bheemdatta Municipality
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 font-sans">
                      {report.description}
                    </p>
                  </div>
                </div>

                {/* Status + Actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  {getStatusBadge(report.status)}

                  <span className="text-[11px] text-slate-400 font-sans">
                    {new Date(report.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>

                  <Link
                    to={`/reports/${report.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-blue-900 hover:text-white dark:hover:bg-amber-500 dark:hover:text-slate-950 text-slate-800 dark:text-slate-200 transition-all duration-200 shadow-2xs group"
                  >
                    <span>{t.reportProblem.myReports.viewDetails}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t.reportProblem.myReports.empty}
          </h3>
          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all duration-200 shadow-md shadow-amber-500/20 active:scale-95"
          >
            <span>{t.reportProblem.myReports.newReportBtn}</span>
          </Link>
        </div>
      )}
    </div>
  );
};
