import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppData } from '../contexts/AppDataContext';
import { useAuth } from '../contexts/AuthContext';
import { reportService } from '../services/reportService';
import { storageService } from '../services/storageService';
import { LiveCameraCapture } from '../components/reports/LiveCameraCapture';
import { LocationVerifier } from '../components/reports/LocationVerifier';
import type { VerifiedLocationData } from '../components/reports/LocationVerifier';
import { DuplicateReportNotice } from '../components/reports/DuplicateReportNotice';
import type { ProblemCategory, ProblemReport, CapturedPhotoItem } from '../types';
import { MUNICIPALITY, toNepaliDigits } from '../data/locationsData';
import {
  AlertTriangle,
  Zap,
  Radio,
  CheckCircle2,
  ShieldAlert,
  Flame,
  Bomb,
  HelpCircle,
  Lightbulb,
  User,
  LogIn,
  Eye,
  Loader2,
  Camera,
  AlertCircle,
} from 'lucide-react';

export const ReportProblemPage: React.FC = () => {
  const { language, t } = useLanguage();

  const { checkDuplicateReport, addReport } = useAppData();
  const { user, role } = useAuth();
  const displayName = user?.user_metadata?.full_name ?? user?.email ?? 'Resident';
  const displayPhone = user?.user_metadata?.phone_number ?? 'Verified account';

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<ProblemCategory | null>(null);
  const [selectedWard, setSelectedWard] = useState<number>(3);
  const [locationData, setLocationData] = useState<VerifiedLocationData | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhotoItem[]>([]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submittedReport, setSubmittedReport] = useState<ProblemReport | null>(null);
  const [ignoreDuplicateWarning, setIgnoreDuplicateWarning] = useState(false);

  // Prevent duplicate submissions via rapid repeated clicks
  const isSubmittingRef = useRef(false);
  const capturedPhotosRef = useRef<CapturedPhotoItem[]>([]);

  useEffect(() => {
    capturedPhotosRef.current = capturedPhotos;
  }, [capturedPhotos]);

  // Revoke object URLs on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      capturedPhotosRef.current.forEach((p) => {
        if (p.previewUrl && p.previewUrl.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(p.previewUrl);
          } catch {}
        }
      });
    };
  }, []);

  const maxCharLimit = 500;
  const charsLeft = maxCharLimit - description.length;

  const categories: { id: ProblemCategory; icon: any; color: string; danger?: boolean }[] = [
    { id: 'NO_ELECTRICITY', icon: Zap, color: 'text-amber-500' },
    { id: 'DAMAGED_LINE', icon: AlertTriangle, color: 'text-rose-500', danger: true },
    { id: 'TRANSFORMER_PROBLEM', icon: Bomb, color: 'text-orange-500', danger: true },
    { id: 'DANGEROUS_WIRE', icon: ShieldAlert, color: 'text-rose-600', danger: true },
    { id: 'SPARKING_FIRE', icon: Flame, color: 'text-red-500', danger: true },
    { id: 'OTHER_ELECTRICITY', icon: Lightbulb, color: 'text-blue-500' },
    { id: 'OTHER', icon: HelpCircle, color: 'text-slate-500' },
  ];

  const isDangerousProblem = useMemo(() => {
    return (
      selectedCategory === 'DAMAGED_LINE' ||
      selectedCategory === 'DANGEROUS_WIRE' ||
      selectedCategory === 'SPARKING_FIRE' ||
      selectedCategory === 'TRANSFORMER_PROBLEM'
    );
  }, [selectedCategory]);

  // Duplicate report check
  const existingDuplicate = useMemo(() => {
    if (!selectedCategory || ignoreDuplicateWarning) return null;
    return checkDuplicateReport(selectedWard, selectedCategory);
  }, [selectedCategory, selectedWard, ignoreDuplicateWarning, checkDuplicateReport]);

  // Form Validation checks
  const isAuthValid = Boolean(user && role === 'resident');
  const isCategoryValid = Boolean(selectedCategory);
  const isLocationValid = Boolean(locationData && locationData.isVerified);
  const isPhotoValid = capturedPhotos.length >= 1 && capturedPhotos.length <= 5;
  const isDescValid = description.trim().length >= 15;

  const canSubmit =
    isAuthValid &&
    isCategoryValid &&
    isLocationValid &&
    isPhotoValid &&
    isDescValid &&
    !isSubmitting;

  const handlePhotoCaptured = (photo: CapturedPhotoItem) => {
    setCapturedPhotos((prev) => {
      if (prev.length >= 5) return prev;
      return [...prev, photo];
    });
    setUploadError(null);
  };

  const handlePhotoRemove = (id: string) => {
    setCapturedPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {
          // ignore revoke error
        }
      }
      return prev.filter((p) => p.id !== id);
    });
    setUploadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return;
    if (!canSubmit || !user || !selectedCategory || !locationData || capturedPhotos.length === 0) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setUploadError(null);

    // 1. Validate all captured photos before upload
    for (let i = 0; i < capturedPhotos.length; i++) {
      const p = capturedPhotos[i];
      const targetData = p.file || p.blob;
      if (!targetData || targetData.size === 0) {
        console.error('Photo validation error: empty or null photo at index', i);
        setUploadError(`Photo ${i + 1} is empty or unreadable. Please remove it and take a new photo.`);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        return;
      }
      if (targetData.size > 20 * 1024 * 1024) {
        setUploadError(`Photo ${i + 1} exceeds 20MB file size limit.`);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        return;
      }
    }

    const now = new Date().toISOString();
    const reportId = crypto.randomUUID();

    // 2. Upload photos to Supabase Storage: problem-photos/{user_id}/{report_id}/
    const uploadedPhotos: { path: string; capturedAt: string }[] = [];

    try {
      for (let i = 0; i < capturedPhotos.length; i++) {
        const photo = capturedPhotos[i];
        setUploadProgress({ current: i + 1, total: capturedPhotos.length });
        const fileName = `photo_${i + 1}_${photo.id || crypto.randomUUID()}.jpg`;
        const fileToUpload =
          photo.file ||
          new File([photo.blob], fileName, {
            type: photo.blob.type || 'image/jpeg',
            lastModified: Date.now(),
          });

        try {
          const storagePath = await storageService.uploadProblemPhoto(
            user.id,
            reportId,
            fileToUpload,
            fileName
          );
          uploadedPhotos.push({
            path: storagePath,
            capturedAt: photo.capturedAt,
          });
        } catch (uploadError: any) {
          console.error('Photo upload error:', uploadError);
          const rawMsg =
            uploadError?.message ||
            uploadError?.error_description ||
            'Storage upload failed';
          const cleanMsg = rawMsg.startsWith('Photo upload failed: ')
            ? rawMsg.replace('Photo upload failed: ', '')
            : rawMsg;
          setUploadError(`Photo ${i + 1} upload failed: ${cleanMsg}`);
          setIsSubmitting(false);
          setUploadProgress(null);
          isSubmittingRef.current = false;
          return;
        }
      }
    } catch (unexpectedErr: any) {
      console.error('Photo upload error:', unexpectedErr);
      setUploadError(`Photo upload failed: ${unexpectedErr?.message || 'Unexpected upload error'}`);
      setIsSubmitting(false);
      setUploadProgress(null);
      isSubmittingRef.current = false;
      return;
    }

    setUploadProgress(null);

    // 3. Prepare report input
    const reportInput = {
      id: reportId,
      user_id: user.id,
      municipality_id: null,
      ward_id: null,
      ward_number: locationData.wardNumber,
      problem_type: selectedCategory,
      description: description.trim(),
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      location_accuracy: locationData.accuracy,
      priority: isDangerousProblem ? 'high' : 'medium',
    };

    // 4. Create report with all uploaded photos in Supabase database
    let result;
    try {
      result = await reportService.createReport(reportInput, uploadedPhotos);
    } catch (dbErr: any) {
      console.error('Report submission error:', dbErr);
      setUploadError(`Report submission failed: ${dbErr?.message || 'Database connection error'}`);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }

    if (result.error || !result.data) {
      console.error('Report submission error:', result.error);
      const dbErrorMsg =
        result.error?.message ||
        result.error?.details ||
        'Database rejected report submission';
      setUploadError(`Report submission failed: ${dbErrorMsg}`);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }

    setIsSubmitting(false);
    isSubmittingRef.current = false;

    // Primary photo for preview
    const primaryPreview =
      capturedPhotos[0]?.previewUrl ||
      capturedPhotos[0]?.dataUrl ||
      (uploadedPhotos[0] ? (await storageService.resolvePhotoUrl(uploadedPhotos[0].path)) || '' : '');

    const photosWithUrls = await Promise.all(
      capturedPhotos.map(async (p, idx) => ({
        id: p.id,
        url: p.previewUrl || p.dataUrl || (uploadedPhotos[idx] ? (await storageService.resolvePhotoUrl(uploadedPhotos[idx].path)) || '' : ''),
        captured_at: p.capturedAt,
        photo_path: uploadedPhotos[idx]?.path,
      }))
    );

    const createdReport: ProblemReport = {
      ...reportInput,
      ...result.data,
      report_number: result.data.report_number,
      user_name: displayName,
      user_phone: displayPhone,
      municipality_name: MUNICIPALITY.nameEn,
      ward_id: locationData.wardNumber,
      location_name: `Ward ${locationData.wardNumber} Area`,
      photo_url: primaryPreview,
      photo_captured_at: capturedPhotos[0].capturedAt,
      photos: photosWithUrls,
      priority: isDangerousProblem ? 'HIGH' : 'MEDIUM',
      status: 'SUBMITTED',
      timeline: [],
      created_at: result.data.created_at ?? now,
      updated_at: result.data.updated_at ?? now,
    };

    addReport(createdReport);
    setSubmittedReport(createdReport);
  };

  // If submitted successfully, show the Submission Success Page
  if (submittedReport) {
    const reportPhotoList =
      submittedReport.photos && submittedReport.photos.length > 0
        ? submittedReport.photos
        : [{ url: submittedReport.photo_url, captured_at: submittedReport.photo_captured_at }];

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-6 animate-fade-in">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-10 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {language === 'ne' ? 'प्रमाणीकरण सम्पन्न' : 'Verified Submission'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {t.reportProblem.success.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {t.reportProblem.success.note}
            </p>
          </div>

          {/* Report ID & Status Banner */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-semibold">
                {t.reportProblem.success.reportNumber}:
              </span>
              <span className="font-mono font-extrabold text-base text-blue-900 dark:text-amber-400">
                {submittedReport.report_number}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">
                {t.reportProblem.success.status}:
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300">
                <span>🟡</span>
                <span>{t.reportProblem.statuses.SUBMITTED}</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>{t.locationsPage.wardLabel}:</span>
              <span className="font-semibold">
                {language === 'ne' ? `वडा नं. ${toNepaliDigits(submittedReport.ward_id)}` : `Ward No. ${submittedReport.ward_id}`}
              </span>
            </div>
          </div>

          {/* Attached Evidence Photos Preview */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3 text-left">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {language === 'ne'
                    ? `संलग्न प्रत्यक्ष फोटोहरू (${reportPhotoList.length})`
                    : `Attached Evidence Photos (${reportPhotoList.length})`}
                </span>
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ VERIFIED
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {reportPhotoList.map((photo, i) => (
                <div
                  key={i}
                  className="group relative rounded-xl overflow-hidden bg-black border border-slate-300 dark:border-slate-700 aspect-4/3 shadow-xs"
                >
                  <img
                    src={photo.url}
                    alt={`Submitted photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-amber-400 text-[9px] font-mono font-bold">
                    #{i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to={`/reports/${submittedReport.id}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-blue-900 text-white dark:bg-amber-500 dark:text-slate-950 hover:bg-blue-800 dark:hover:bg-amber-400 transition-colors shadow-md"
            >
              <Eye className="w-4 h-4" />
              <span>{t.reportProblem.success.viewReportBtn}</span>
            </Link>

            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
            >
              <span>{t.reportProblem.success.returnHomeBtn}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-100/90 text-rose-900 dark:bg-rose-950/90 dark:text-rose-300 text-xs font-semibold border border-rose-200/80 dark:border-rose-900/60 backdrop-blur-xs">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>{language === 'ne' ? 'नागरिक समस्या रिपोर्ट' : 'Citizen Problem Dispatch'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t.reportProblem.pageTitle}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl font-sans leading-relaxed">
          {t.reportProblem.pageSubtitle}
        </p>
      </div>

      {/* User Authentication Bar / Prompt */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-slate-800 text-blue-900 dark:text-amber-400 flex items-center justify-center font-bold shadow-xs">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">
              {language === 'ne' ? 'रिपोर्टकर्ता नगरवासी' : 'Reporting Resident'}:
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {displayName} ({displayPhone})
            </span>
          </div>
        </div>

        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-xs"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>{language === 'ne' ? 'खाता परिवर्तन' : 'Change User'}</span>
        </Link>
      </div>

      {/* Main Multi-Step Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* STEP 1: Select Problem Type */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold text-blue-900 dark:text-amber-400 uppercase tracking-wider">
                1. {language === 'ne' ? 'चरण १' : 'Step 1'}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {t.reportProblem.step1Title}
              </h2>
            </div>
            {isCategoryValid && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> {language === 'ne' ? 'छानियो' : 'Selected'}
              </span>
            )}
          </div>

          {/* Problem Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const Icon = cat.icon;
              const label = t.reportProblem.categories[cat.id];
              const desc = t.reportProblem.categoryDesc[cat.id];

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setIgnoreDuplicateWarning(false);
                  }}
                  className={`flex flex-col text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-900 text-white dark:bg-amber-500 dark:text-slate-950 border-blue-900 dark:border-amber-400 shadow-md ring-2 ring-blue-500/20 dark:ring-amber-400/30 scale-[1.01]'
                      : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-750 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-650'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-white dark:text-slate-950' : cat.color}`} />
                    {isSelected && <CheckCircle2 className="w-4 h-4" />}
                  </div>

                  <span className="text-xs sm:text-sm font-bold leading-snug">
                    {label}
                  </span>

                  <p
                    className={`text-[11px] mt-1 line-clamp-2 leading-relaxed font-sans ${
                      isSelected ? 'opacity-85' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {desc}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Safety Warning (Shows prominently when dangerous category selected) */}
        {isDangerousProblem && (
          <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 space-y-2 animate-fade-in shadow-md">
            <div className="flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider text-rose-700 dark:text-rose-300">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>{t.reportProblem.safety.title}</span>
            </div>
            <p className="text-xs sm:text-sm font-bold leading-relaxed font-sans">
              {t.reportProblem.safety.text}
            </p>
            <p className="text-xs text-rose-800 dark:text-rose-300/90 italic pt-1 border-t border-rose-200/80 dark:border-rose-900/60">
              {t.reportProblem.safety.disclaimer}
            </p>
          </div>
        )}

        {/* Possible Duplicate Report Notice (Anti-Spam Preparation) */}
        {existingDuplicate && (
          <DuplicateReportNotice
            existingReport={existingDuplicate}
            onContinueNew={() => setIgnoreDuplicateWarning(true)}
          />
        )}

        {/* STEP 2: Verify Current Location */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold text-blue-900 dark:text-amber-400 uppercase tracking-wider">
                2. {language === 'ne' ? 'चरण २' : 'Step 2'}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {t.reportProblem.step2Title}
              </h2>
            </div>
            {isLocationValid && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> {language === 'ne' ? 'प्रमाणित' : 'Verified'}
              </span>
            )}
          </div>

          <LocationVerifier
            locationData={locationData}
            onLocationVerified={setLocationData}
            wardNumber={selectedWard}
            onWardChange={setSelectedWard}
          />
        </section>

        {/* STEP 3: Mandatory Live Camera Photo */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold text-blue-900 dark:text-amber-400 uppercase tracking-wider">
                3. {language === 'ne' ? 'चरण ३' : 'Step 3'}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {t.reportProblem.step3Title}
              </h2>
            </div>
            {isPhotoValid && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> {language === 'ne' ? 'खिचियो' : 'Captured'}
              </span>
            )}
          </div>

          <LiveCameraCapture
            photos={capturedPhotos}
            onPhotoCaptured={handlePhotoCaptured}
            onPhotoRemove={handlePhotoRemove}
            wardNumber={selectedWard}
            maxPhotos={5}
            autoStart={false}
          />
        </section>

        {/* STEP 4: Problem Description */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold text-blue-900 dark:text-amber-400 uppercase tracking-wider">
                4. {language === 'ne' ? 'चरण ४' : 'Step 4'}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {t.reportProblem.step4Title}
              </h2>
            </div>
            {isDescValid && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> {language === 'ne' ? 'पूर्ण' : 'Completed'}
              </span>
            )}
          </div>

          <div>
            <textarea
              rows={4}
              maxLength={maxCharLimit}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.reportProblem.description.placeholder}
              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/40 leading-relaxed font-sans"
            />
            <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{t.reportProblem.description.minNotice}</span>
              <span className={charsLeft < 40 ? 'text-amber-500 font-bold' : ''}>
                {charsLeft} {t.reportProblem.description.charCounter}
              </span>
            </div>
          </div>
        </section>

        {/* Verification Checklist & Final Submit Trigger */}
        <section className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 space-y-6 shadow-xl border border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-amber-400" />
              <span>{t.reportProblem.validation.title}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              All 4 verification checks must pass to submit a fraud-resistant report.
            </p>
          </div>

          {/* Checklist items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${isAuthValid ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
              <CheckCircle2 className={`w-4 h-4 ${isAuthValid ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>{t.reportProblem.validation.userAuth}</span>
            </div>

            <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${isCategoryValid ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
              <CheckCircle2 className={`w-4 h-4 ${isCategoryValid ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>{t.reportProblem.validation.problemType}</span>
            </div>

            <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${isLocationValid ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
              <CheckCircle2 className={`w-4 h-4 ${isLocationValid ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>{t.reportProblem.validation.location}</span>
            </div>

            <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${isPhotoValid ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
              <CheckCircle2 className={`w-4 h-4 ${isPhotoValid ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>
                {t.reportProblem.validation.photo} ({capturedPhotos.length}/5)
              </span>
            </div>
          </div>

          {/* Upload Progress & Error notices */}
          {uploadProgress && (
            <div className="p-3.5 rounded-2xl bg-blue-950/60 border border-blue-700 text-blue-200 text-xs flex items-center gap-3 animate-fade-in">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
              <span>
                {language === 'ne'
                  ? `फोटोहरू सुरक्षित गरिँदैछ (${uploadProgress.current}/${uploadProgress.total})...`
                  : `Uploading verified photos (${uploadProgress.current} of ${uploadProgress.total})...`}
              </span>
            </div>
          )}

          {uploadError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-700 text-rose-200 text-xs flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-[11px] font-bold text-rose-300 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className={`w-full py-4 rounded-2xl text-sm sm:text-base font-extrabold flex items-center justify-center gap-3 transition-all ${
              canSubmit && !isSubmitting
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xl shadow-amber-500/20 active:scale-95 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/80'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                <span>
                  {uploadProgress
                    ? `Uploading photos (${uploadProgress.current}/${uploadProgress.total})...`
                    : t.reportProblem.validation.submitting}
                </span>
              </>
            ) : (
              <>
                <Radio className={`w-5 h-5 ${canSubmit ? 'animate-pulse text-slate-950' : ''}`} />
                <span>{t.reportProblem.validation.submitBtn}</span>
              </>
            )}
          </button>
        </section>
      </form>
    </div>
  );
};
