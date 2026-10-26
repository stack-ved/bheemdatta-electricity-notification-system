import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { reportService } from '../services/reportService';
import type { ProblemReport } from '../types';
import { ReportTimeline } from '../components/reports/ReportTimeline';
import { BheemdattaMap } from '../components/map/BheemdattaMap';
import { toNepaliDigits } from '../data/locationsData';
import { ElectricChargerLoader } from '../components/common/ElectricChargerLoader';
import {
  AlertTriangle,
  ArrowLeft,
  MapPin,
  Camera,
  ShieldCheck,
  Lock,
  Phone,
  MessageSquare,
} from 'lucide-react';


export const ReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const [report, setReport] = useState<ProblemReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    setPhotoError(false);
  }, [selectedPhotoIndex, report?.id]);

  useEffect(() => {
    let active = true;
    if (!id) {
      setLoading(false);
      return () => { active = false; };
    }
    if (!user) {
      return () => { active = false; };
    }
    setLoading(true);
    reportService.getReportById(id).then(({ data }) => {
      if (!active) return;
      setReport(data && data.user_id === user.id ? data : null);
      setLoading(false);
    });
    return () => { active = false; };
  }, [id, user]);

  if (loading) {
    return (
      <ElectricChargerLoader
        message={language === 'ne' ? 'रिपोर्ट विवरण लोड हुँदैछ...' : 'Loading problem report...'}
        minHeight="min-h-[65vh]"
      />
    );
  }

  if (!report) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold">Report not found</h2>
        <Link to="/reports" className="text-blue-600 underline">
          Back to My Reports
        </Link>
      </div>
    );
  }

  const categoryLabel = t.reportProblem.categories[report.problem_type] || report.problem_type;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fade-in">
      {/* Back Button */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/reports')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-900 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.reportProblem.reportDetail.backBtn}</span>
        </button>
      </div>

      {/* Header Card */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-8 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                {report.report_number}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Tamper-Proof Verified
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {categoryLabel}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                {language === 'ne' ? `वडा नं. ${toNepaliDigits(report.ward_id)}` : `Ward No. ${report.ward_id}`}, {report.municipality_name}
              </span>
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="text-[11px] text-slate-400 block font-medium">
              {language === 'ne' ? 'दर्ता गरिएको मिति' : 'Submitted At'}:
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {new Date(report.created_at).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>
        </div>

        {/* Visual Progress Stepper */}
        <div className="pt-2">
          <ReportTimeline
            currentStatus={report.status}
            timelineEvents={report.timeline}
          />
        </div>
      </div>

      {/* Two Column Section: Live Captured Photo vs Verified Map & Description */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Live Captured Photo */}
        <div className="lg:col-span-6 space-y-6">
          {(() => {
            const photosList =
              report.photos && report.photos.length > 0
                ? report.photos
                : [{ url: report.photo_url, captured_at: report.photo_captured_at }];
            const currentPhoto = photosList[selectedPhotoIndex] || photosList[0];

            return (
              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Camera className="w-5 h-5 text-amber-500" />
                    <span>
                      {t.reportProblem.reportDetail.capturedPhoto}{' '}
                      {photosList.length > 1 && `(${selectedPhotoIndex + 1}/${photosList.length})`}
                    </span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                    LIVE CAMERA
                  </span>
                </div>

                {/* Photo Container */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black aspect-4/3 relative shadow-inner flex items-center justify-center">
                  {photoError || !(currentPhoto?.url || report.photo_url) ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                      <AlertTriangle className="h-8 w-8 text-amber-500 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-semibold text-slate-300">Evidence photo unavailable</p>
                      <p className="text-[10px] text-slate-500 mt-1">Unable to load private storage object</p>
                    </div>
                  ) : (
                    <>
                      <img
                        src={currentPhoto?.url || report.photo_url}
                        alt={`Captured live evidence ${selectedPhotoIndex + 1}`}
                        className="w-full h-full object-cover"
                        onError={() => setPhotoError(true)}
                      />
                      <div className="absolute top-3 left-3 bg-slate-950/85 text-white backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {new Date(currentPhoto?.captured_at || report.photo_captured_at).toLocaleTimeString('en-US')} NPT
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Multiple Photos Thumbnails Selector */}
                {photosList.length > 1 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      All Evidence Photos ({photosList.length}):
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {photosList.map((p, idx) => (
                        <button
                          key={p.id || idx}
                          type="button"
                          onClick={() => {
                            setSelectedPhotoIndex(idx);
                            setPhotoError(false);
                          }}
                          className={`relative aspect-4/3 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                            selectedPhotoIndex === idx
                              ? 'border-amber-500 ring-2 ring-amber-400/40 scale-105'
                              : 'border-slate-300 dark:border-slate-700 opacity-70 hover:opacity-100'
                          }`}
                        >
                          {p.url ? (
                            <img
                              src={p.url}
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.parentElement?.querySelector('.thumb-fallback');
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`thumb-fallback ${p.url ? 'hidden' : ''} flex h-full w-full flex-col items-center justify-center bg-slate-800 text-[8px] text-slate-400 p-1 text-center`}>
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mb-0.5" />
                            <span>Unavailable</span>
                          </div>
                          <span className="absolute bottom-1 right-1 bg-black/80 text-white rounded px-1 text-[9px] font-mono">
                            #{idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  {t.reportProblem.reportDetail.protectedNotice}
                </p>
              </div>
            );
          })()}

          {/* Description Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t.reportProblem.description.label}
            </h3>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
              {report.description}
            </div>
          </div>
        </div>

        {/* Right Column: Verified Location & Map */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-500" />
                <span>{t.reportProblem.reportDetail.capturedLocation}</span>
              </h3>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                GPS ±{report.location_accuracy}m
              </span>
            </div>

            {/* Coordinates metadata strip */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-850/80 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">LATITUDE</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{report.latitude}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-850/80 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">LONGITUDE</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{report.longitude}</span>
              </div>
            </div>

            {/* Map Preview */}
            <BheemdattaMap
              highlightWards={[report.ward_id]}
              selectedLocationId={report.location_id || 'loc-03-01'}
              statusVariant="ACTIVE"
              interactive={false}
            />
          </div>

          {/* Official NEA Admin Updates */}
          <div className="rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-7 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600 dark:text-amber-400" />
              <span>{t.reportProblem.reportDetail.adminUpdates}</span>
            </h3>

            {report.admin_notes ? (
              <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/80 text-xs text-blue-950 dark:text-blue-200 leading-relaxed font-sans shadow-xs">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-amber-400 mb-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Bheemdatta Substation Control Desk</span>
                </div>
                {report.admin_notes}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                {t.reportProblem.reportDetail.noUpdatesYet}
              </p>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 font-medium">
              <Phone className="w-3.5 h-3.5 text-amber-500" />
              <span>NEA Emergency Hotline: 1153 / 099-521153</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
