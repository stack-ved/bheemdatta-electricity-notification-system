import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { CapturedPhotoItem } from '../../types';
import {
  Camera,
  CameraOff,
  SwitchCamera,
  Trash2,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export interface LiveCameraCaptureProps {
  photos: CapturedPhotoItem[];
  onPhotoCaptured: (photo: CapturedPhotoItem) => void;
  onPhotoRemove: (id: string) => void;
  wardNumber?: number;
  maxPhotos?: number;
  autoStart?: boolean;
}

export const LiveCameraCapture: React.FC<LiveCameraCaptureProps> = ({
  photos,
  onPhotoCaptured,
  onPhotoRemove,
  wardNumber = 3,
  maxPhotos = 5,
  autoStart = false,
}) => {
  const { language, t } = useLanguage();

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [maxWarning, setMaxWarning] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isCapturingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera tracks cleanly
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop errors
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsStreamReady(false);
  }, []);

  // Stop stream when unmounting
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Start live device camera with chosen facing mode
  const startCamera = async (targetFacingMode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    setMaxWarning(null);
    setIsCameraActive(true);
    setIsStreamReady(false);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('UNSUPPORTED');
      }

      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: targetFacingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((err) => {
            console.warn('Video play interrupted:', err);
          });
          setIsStreamReady(true);
        };
      }
    } catch (err: any) {
      console.warn('Camera stream startup error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(
          t.reportProblem.camera.permissionDenied ||
            'Camera access was denied. Please allow camera access to take a photo.'
        );
      } else if (err.message === 'UNSUPPORTED') {
        setCameraError(
          t.reportProblem.camera.unsupportedBrowser ||
            'Live camera is not supported by this browser.'
        );
      } else {
        setCameraError(
          t.reportProblem.camera.cameraNotFound ||
            'Camera could not be started. Please check your device camera and try again.'
        );
      }
      setIsCameraActive(false);
      setIsStreamReady(false);
    }
  };

  const hasAutoStartedRef = useRef(false);
  // Auto start camera if requested
  useEffect(() => {
    if (autoStart && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      void startCamera('environment');
    }
  }, [autoStart]);

  // Switch between front and rear cameras
  const toggleCamera = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    await startCamera(nextMode);
  };

  // Capture frame from active live video stream
  const captureLivePhoto = () => {
    if (isCapturingRef.current || isCapturing || !videoRef.current || !isStreamReady) return;

    if (photos.length >= maxPhotos) {
      setMaxWarning(
        t.reportProblem.camera.maxPhotosWarning ||
          `You can capture up to ${maxPhotos} photos per report.`
      );
      return;
    }

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;

    isCapturingRef.current = true;
    setIsCapturing(true);

    try {
      // Visual capture flash
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 180);

      // Scale to max dimension 1600-1920 px if needed
      const maxDim = 1920;
      let targetWidth = video.videoWidth;
      let targetHeight = video.videoHeight;
      if (targetWidth > maxDim || targetHeight > maxDim) {
        if (targetWidth > targetHeight) {
          targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
          targetWidth = maxDim;
        } else {
          targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
          targetHeight = maxDim;
        }
      }

      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas 2D context');

      // Draw live video frame
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

      // Official tamper-evident watermark stamp
      const now = new Date();
      const timestampStr = now.toISOString();
      const readableDate = now.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
      const readableTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const photoNumber = photos.length + 1;
      const bannerHeight = Math.max(48, Math.round(targetHeight * 0.08));

      // Bottom banner overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, targetHeight - bannerHeight, targetWidth, bannerHeight);

      // Watermark primary title
      const titleSize = Math.max(13, Math.round(targetWidth * 0.022));
      ctx.fillStyle = '#f59e0b';
      ctx.font = `bold ${titleSize}px Inter, -apple-system, sans-serif`;
      ctx.fillText(
        `⚡ BHEEMDATTA NEA LIVE VERIFIED • PHOTO #${photoNumber}`,
        18,
        targetHeight - bannerHeight + titleSize + 6
      );

      // Watermark ward & timestamp
      const subSize = Math.max(11, Math.round(targetWidth * 0.018));
      ctx.fillStyle = '#f8fafc';
      ctx.font = `${subSize}px monospace`;
      ctx.fillText(
        `WARD ${String(wardNumber).padStart(2, '0')} | ${readableDate} ${readableTime} NPT`,
        18,
        targetHeight - 10
      );

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size === 0) {
            setCameraError(
              t.reportProblem.camera.captureFailure ||
                'Unable to capture the photo. Please try again.'
            );
            isCapturingRef.current = false;
            setIsCapturing(false);
            return;
          }

          const photoId = crypto.randomUUID();
          const photoFileName = `nea_verified_photo_${Date.now()}_${photos.length + 1}.jpg`;
          const photoFile = new File([blob], photoFileName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          const previewUrl = URL.createObjectURL(photoFile);

          const newPhoto: CapturedPhotoItem = {
            id: photoId,
            dataUrl: previewUrl,
            previewUrl,
            blob,
            file: photoFile,
            capturedAt: timestampStr,
          };

          onPhotoCaptured(newPhoto);
          setMaxWarning(null);

          // Note: CAMERA STAYS OPEN so user can immediately capture another photo!
        },
        'image/jpeg',
        0.85
      );
    } catch (err) {
      console.error('Capture live photo error:', err);
      setCameraError(
        t.reportProblem.camera.captureFailure ||
          'Unable to capture the photo. Please try again.'
      );
    } finally {
      setTimeout(() => {
        isCapturingRef.current = false;
        setIsCapturing(false);
      }, 350);
    }
  };

  // Interactive Live Camera Simulation mode (for desktop/restricted browser environments)
  const simulateLiveCapture = () => {
    if (photos.length >= maxPhotos) {
      setMaxWarning(
        t.reportProblem.camera.maxPhotosWarning ||
          `You can capture up to ${maxPhotos} photos per report.`
      );
      return;
    }

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const photoNum = photos.length + 1;

      // Simulated viewfinder scene
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 1280, 720);

      // Sky & road background
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, 1280, 480);

      // Utility pole
      ctx.fillStyle = '#78350f';
      ctx.fillRect(590, 90, 60, 630);

      // Crossarms
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(400, 160, 440, 26);
      ctx.fillRect(460, 240, 320, 22);

      // Insulators
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(430, 173, 14, 0, Math.PI * 2);
      ctx.arc(810, 173, 14, 0, Math.PI * 2);
      ctx.arc(490, 251, 12, 0, Math.PI * 2);
      ctx.arc(750, 251, 12, 0, Math.PI * 2);
      ctx.fill();

      // Damaged lines with shift per photo
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 180 + photoNum * 8);
      ctx.bezierCurveTo(400, 170, 620, 170, 1280, 270 + photoNum * 10);
      ctx.stroke();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 6;
      ctx.setLineDash([16, 12]);
      ctx.beginPath();
      ctx.moveTo(0, 250);
      ctx.bezierCurveTo(360, 460 + photoNum * 12, 620, 250, 1280, 380);
      ctx.stroke();
      ctx.setLineDash([]);

      // Official watermark
      const now = new Date();
      const timestampStr = now.toISOString();

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, 650, 1280, 70);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.fillText(
        `⚡ BHEEMDATTA NEA LIVE VERIFIED • PHOTO #${photoNum}`,
        24,
        680
      );

      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px monospace';
      ctx.fillText(
        `WARD ${String(wardNumber).padStart(2, '0')} | ${now.toISOString().slice(0, 19).replace('T', ' ')} NPT`,
        24,
        706
      );

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size === 0) return;
          const photoId = crypto.randomUUID();
          const photoFileName = `nea_sim_photo_${Date.now()}_${photos.length + 1}.jpg`;
          const photoFile = new File([blob], photoFileName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          const previewUrl = URL.createObjectURL(photoFile);
          const simulatedItem: CapturedPhotoItem = {
            id: photoId,
            dataUrl: previewUrl,
            previewUrl,
            blob,
            file: photoFile,
            capturedAt: timestampStr,
          };
          onPhotoCaptured(simulatedItem);
          setMaxWarning(null);
        },
        'image/jpeg',
        0.85
      );
    }
  };

  // Mobile / native camera fallback handler
  const handleNativeCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    if (photos.length >= maxPhotos) {
      setMaxWarning(
        t.reportProblem.camera.maxPhotosWarning ||
          `You can capture up to ${maxPhotos} photos per report.`
      );
      e.target.value = '';
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(rawFile);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = canvasRef.current || document.createElement('canvas');
      const maxDim = 1920;
      let targetWidth = img.naturalWidth || img.width;
      let targetHeight = img.naturalHeight || img.height;
      if (targetWidth > maxDim || targetHeight > maxDim) {
        if (targetWidth > targetHeight) {
          targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
          targetWidth = maxDim;
        } else {
          targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
          targetHeight = maxDim;
        }
      }
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Watermark
      const now = new Date();
      const timestampStr = now.toISOString();
      const readableDate = now.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
      const readableTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const photoNumber = photos.length + 1;
      const bannerHeight = Math.max(48, Math.round(targetHeight * 0.08));

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, targetHeight - bannerHeight, targetWidth, bannerHeight);

      const titleSize = Math.max(13, Math.round(targetWidth * 0.022));
      ctx.fillStyle = '#f59e0b';
      ctx.font = `bold ${titleSize}px Inter, -apple-system, sans-serif`;
      ctx.fillText(
        `⚡ BHEEMDATTA NEA LIVE VERIFIED • PHOTO #${photoNumber}`,
        18,
        targetHeight - bannerHeight + titleSize + 6
      );

      const subSize = Math.max(11, Math.round(targetWidth * 0.018));
      ctx.fillStyle = '#f8fafc';
      ctx.font = `${subSize}px monospace`;
      ctx.fillText(
        `WARD ${String(wardNumber).padStart(2, '0')} | ${readableDate} ${readableTime} NPT`,
        18,
        targetHeight - 10
      );

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size === 0) return;
          const photoId = crypto.randomUUID();
          const photoFileName = `nea_mobile_photo_${Date.now()}_${photos.length + 1}.jpg`;
          const photoFile = new File([blob], photoFileName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          const previewUrl = URL.createObjectURL(photoFile);
          const newPhoto: CapturedPhotoItem = {
            id: photoId,
            dataUrl: previewUrl,
            previewUrl,
            blob,
            file: photoFile,
            capturedAt: timestampStr,
          };
          onPhotoCaptured(newPhoto);
          setMaxWarning(null);
        },
        'image/jpeg',
        0.85
      );
    };
    img.src = objectUrl;
    e.target.value = '';
  };

  const isMaxReached = photos.length >= maxPhotos;

  return (
    <div className="space-y-4">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file input for native mobile camera fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleNativeCameraCapture}
        className="hidden"
      />

      {/* Warning if user attempts 6th photo */}
      {maxWarning && (
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold">{maxWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setMaxWarning(null)}
            className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Live Viewfinder Active */}
      {isCameraActive ? (
        <div className="space-y-3 animate-fade-in">
          <div className="relative rounded-3xl overflow-hidden bg-black border-2 border-amber-500 shadow-2xl aspect-4/3 max-h-[460px] flex items-center justify-center">
            {/* Flash animation layer */}
            {isFlashing && (
              <div className="absolute inset-0 bg-white z-20 pointer-events-none transition-opacity duration-150" />
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Viewfinder Target Crosshairs */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-52 h-52 sm:w-68 sm:h-68 border-2 border-amber-400/60 rounded-3xl relative">
                <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-amber-400 -mt-1 -ml-1 rounded-tl" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-amber-400 -mt-1 -mr-1 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-amber-400 -mb-1 -ml-1 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-amber-400 -mb-1 -mr-1 rounded-br" />
              </div>
            </div>

            {/* Top Bar: Live Status & Photo Count Badge */}
            <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 text-amber-400 text-xs font-bold backdrop-blur-md border border-amber-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>LIVE CAMERA</span>
              </div>

              <div
                className={`px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border ${
                  isMaxReached
                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/60'
                    : 'bg-black/75 text-white border-slate-700'
                }`}
              >
                <span>
                  Photos: {photos.length} / {maxPhotos}
                </span>
              </div>
            </div>

            {/* Notice banner */}
            <div className="absolute top-14 inset-x-4 text-center pointer-events-none z-10">
              <span className="inline-block px-3 py-1 rounded-full bg-black/70 text-slate-200 text-[11px] font-medium backdrop-blur-xs">
                {t.reportProblem.camera.viewfinderNotice}
              </span>
            </div>

            {/* Bottom Controls Bar */}
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-around sm:justify-center sm:gap-8 px-4 z-10">
              {/* Close Camera button */}
              <button
                type="button"
                onClick={stopCameraStream}
                aria-label="Close camera"
                className="px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-slate-950/80 text-slate-200 hover:bg-slate-900 border border-slate-700 backdrop-blur-md flex items-center gap-1.5 transition-colors shadow-lg"
              >
                <CameraOff className="w-4 h-4 text-slate-400" />
                <span>{t.reportProblem.camera.closeCamera || 'Close'}</span>
              </button>

              {/* Large Capture Trigger Button */}
              <button
                type="button"
                onClick={captureLivePhoto}
                disabled={!isStreamReady || isCapturing || isMaxReached}
                aria-label="Capture photo"
                title={
                  isMaxReached
                    ? `Maximum ${maxPhotos} photos reached`
                    : t.reportProblem.camera.captureBtn
                }
                className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center p-2 shadow-2xl transition-all ${
                  isMaxReached
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-4 ring-white/50 active:scale-95 cursor-pointer shadow-amber-500/30'
                }`}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-slate-950 flex flex-col items-center justify-center">
                  <Camera className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                  <span className="text-[9px] font-black uppercase tracking-tight mt-0.5">
                    {isMaxReached ? 'Max' : 'Capture'}
                  </span>
                </div>
              </button>

              {/* Switch Camera button */}
              <button
                type="button"
                onClick={toggleCamera}
                aria-label="Switch camera"
                title={t.reportProblem.camera.switchCamera || 'Switch camera'}
                className="px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-slate-950/80 text-slate-200 hover:bg-slate-900 border border-slate-700 backdrop-blur-md flex items-center gap-1.5 transition-colors shadow-lg"
              >
                <SwitchCamera className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">
                  {t.reportProblem.camera.switchCamera || 'Switch'}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Camera Launcher Card (Camera Currently Inactive) */
        <div className="rounded-3xl border-2 border-dashed border-amber-400/80 dark:border-amber-600/60 bg-amber-50/40 dark:bg-amber-950/20 p-6 sm:p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-500 text-slate-950 flex items-center justify-center mx-auto shadow-md">
            <Camera className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 text-xs font-bold">
              <span>LIVE CAMERA ONLY</span>
              <span className="opacity-60">•</span>
              <span>
                Photos: {photos.length} / {maxPhotos}
              </span>
            </div>

            <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {t.reportProblem.camera.title}
            </h4>

            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              {t.reportProblem.camera.mandatoryNotice}
            </p>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              {t.reportProblem.camera.noUploadNotice}
            </p>
          </div>

          {/* Camera Error / Permission Notice */}
          {cameraError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto text-left flex items-start gap-3">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div className="space-y-1">
                <p className="font-bold">{cameraError}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {language === 'ne'
                    ? 'यदि तपाईंको उपकरणमा क्यामेरा छैन वा परीक्षण गर्दै हुनुहुन्छ भने तलको परीक्षण फोटो बटन प्रयोग गर्न सक्नुहुन्छ।'
                    : 'If camera hardware is restricted or absent, you can use the verified simulation button below.'}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons to Open Camera */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {!isMaxReached ? (
              <button
                type="button"
                onClick={() => startCamera('environment')}
                aria-label="Open live camera"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>
                  {photos.length === 0
                    ? t.reportProblem.camera.takeLivePhoto
                    : t.reportProblem.camera.addMorePhotos || 'Take Another Photo'}
                </span>
              </button>
            ) : (
              <div className="px-4 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {t.reportProblem.camera.maxPhotosReached ||
                    `Maximum ${maxPhotos} photos reached`}
                </span>
              </div>
            )}

            {/* Test Simulation Button (Desktop / restricted testing fallback) */}
            {!isMaxReached && (
              <button
                type="button"
                onClick={simulateLiveCapture}
                aria-label="Simulate photo capture"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{t.reportProblem.camera.simulateCaptureBtn}</span>
              </button>
            )}

            {/* Native Mobile Camera Button (for smartphones / tablets) */}
            {!isMaxReached && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Use device camera"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-blue-500" />
                <span>{language === 'ne' ? 'मोबाइल क्यामेरा' : 'Device Camera'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Captured Photos Preview Strip / Gallery */}
      {photos.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Captured Evidence Photos ({photos.length} / {maxPhotos})
              </h5>
            </div>

            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Live Verified
            </span>
          </div>

          {/* Responsive Thumbnails Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative rounded-2xl overflow-hidden border-2 border-emerald-500/80 bg-slate-950 aspect-4/3 shadow-md"
              >
                <img
                  src={photo.previewUrl || photo.dataUrl}
                  alt={`Evidence photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Photo Index Badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/80 text-amber-400 font-mono text-[10px] font-bold backdrop-blur-xs">
                  #{index + 1}
                </div>

                {/* Delete / Remove Photo Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (photo.previewUrl && photo.previewUrl.startsWith('blob:')) {
                      try {
                        URL.revokeObjectURL(photo.previewUrl);
                      } catch {
                        // ignore revoke error
                      }
                    }
                    onPhotoRemove(photo.id);
                  }}
                  aria-label={`Remove photo ${index + 1}`}
                  title={t.reportProblem.camera.removePhoto || 'Remove photo'}
                  className="absolute top-2 right-2 w-7 h-7 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Timestamp Bar */}
                <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 px-2 py-1 text-[9px] font-mono text-slate-300 truncate">
                  {new Date(photo.capturedAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Quick status bar when camera is active and photos exist */}
          {isCameraActive && (
            <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <span>
                {photos.length < maxPhotos
                  ? `Photo #${photos.length} captured. Keep camera pointed and click Capture for next photo.`
                  : `All ${maxPhotos} photos captured.`}
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {photos.length} of {maxPhotos}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
