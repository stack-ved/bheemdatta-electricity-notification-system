import React, { useState, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { BheemdattaMap } from '../map/BheemdattaMap';
import { MUNICIPALITY, toNepaliDigits } from '../../data/locationsData';
import {
  requestDeviceLocation,
  findNearestBheemdattaLocation,
  type GeolocationErrorDetails,
} from '../../utils/geolocation';
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RotateCcw,
  MapPin,
} from 'lucide-react';

export interface VerifiedLocationData {
  municipality: string;
  wardNumber: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  isVerified: boolean;
}

interface LocationVerifierProps {
  locationData: VerifiedLocationData | null;
  onLocationVerified: (data: VerifiedLocationData | null) => void;
  wardNumber: number;
  onWardChange?: (ward: number) => void;
}

export const LocationVerifier: React.FC<LocationVerifierProps> = ({
  locationData,
  onLocationVerified,
  wardNumber,
  onWardChange,
}) => {
  const { language, t } = useLanguage();
  const [isDetecting, setIsDetecting] = useState(false);
  const [gpsError, setGpsError] = useState<GeolocationErrorDetails | null>(null);
  const requestTokenRef = useRef(0);

  const detectLocation = async () => {
    const currentRequestId = ++requestTokenRef.current;
    setIsDetecting(true);
    setGpsError(null);
    onLocationVerified(null);

    const { data, error } = await requestDeviceLocation();

    if (currentRequestId !== requestTokenRef.current) {
      return;
    }

    setIsDetecting(false);

    if (error) {
      setGpsError(error);
      onLocationVerified(null);
      return;
    }

    if (!data) {
      setGpsError({
        code: 'UNKNOWN',
        messageEn: 'Location detection failed. Please try again.',
        messageNe: 'स्थान पहिचान सफल हुन सकेन। कृपया पुन: प्रयास गर्नुहोस्।',
      });
      onLocationVerified(null);
      return;
    }

    const lat = Number(data.latitude);
    const lng = Number(data.longitude);
    const accuracy = Math.max(0, Math.round(data.accuracy));

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      const invalidLocationError: GeolocationErrorDetails = {
        code: 'POSITION_UNAVAILABLE',
        messageEn: 'The browser returned an invalid GPS fix. Please retry to get a fresh location.',
        messageNe: 'ब्राउजरले अमान्य GPS फिक्स फिर्ता गरेको छ। फरक स्थानको लागि पुन: प्रयास गर्नुहोस्।',
        helpEn: 'Make sure your device GPS is enabled and try again.',
        helpNe: 'आफ्नो उपकरणको GPS सक्रिय भएको जाँच गरी पुन: प्रयास गर्नुहोस्।',
      };
      setGpsError(invalidLocationError);
      onLocationVerified(null);
      return;
    }

    const { nearestLocation } = findNearestBheemdattaLocation(lat, lng);
    const targetWard = nearestLocation?.wardNumber || wardNumber || 3;

    if (onWardChange && nearestLocation?.wardNumber) {
      onWardChange(nearestLocation.wardNumber);
    }

    onLocationVerified({
      municipality: MUNICIPALITY.nameEn,
      wardNumber: targetWard,
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      accuracy: accuracy > 0 ? accuracy : 1,
      isVerified: true,
    });
  };

  return (
    <div className="space-y-4">
      {isDetecting ? (
        /* Detecting state */
        <div className="p-6 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-center space-y-3 animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto animate-spin">
            <Compass className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            {language === 'ne' ? '📍 तपाईंको स्थान पहिचान गरिँदैछ...' : '📍 Detecting your location...'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {language === 'ne'
              ? 'कृपया ब्राउजरमा देखिने "Allow" (अनुमति दिनुहोस्) बटन थिच्नुहोस्...'
              : 'Please click "Allow" on your browser permission prompt to share your device GPS location.'}
          </p>
        </div>
      ) : locationData && locationData.isVerified ? (
        /* Location Verified View */
        <div className="space-y-4">
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            {language === 'ne'
              ? `स्थान प्रमाणित भयो — शुद्धता लगभग ${toNepaliDigits(locationData.accuracy)} मिटर`
              : `Location detected — accuracy approximately ${locationData.accuracy} meters`}
          </div>

          <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border-2 border-emerald-500/70 dark:border-emerald-800 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">
                    {t.reportProblem.location.verified}
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    {language === 'ne' ? MUNICIPALITY.nameNe : MUNICIPALITY.nameEn} •{' '}
                    {language === 'ne'
                      ? `वडा नं. ${toNepaliDigits(locationData.wardNumber)}`
                      : `Ward No. ${locationData.wardNumber}`}
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shrink-0">
                ±{locationData.accuracy} {t.reportProblem.location.meters}
              </span>
            </div>

            {/* Read-only GPS coordinates badge */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200/80 dark:border-emerald-900/60 text-xs text-slate-700 dark:text-slate-300">
              <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                <span className="text-[10px] text-slate-400 block font-semibold">LATITUDE</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {locationData.latitude}
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                <span className="text-[10px] text-slate-400 block font-semibold">LONGITUDE</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {locationData.longitude}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">ACCURACY</span>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> ±{locationData.accuracy}m
                  </span>
                </div>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={isDetecting}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title={t.reportProblem.location.retryBtn}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              {t.reportProblem.location.cantChangeNotice}
            </p>
          </div>

          {/* Mini Interactive Map */}
          <div className="space-y-2">
            <BheemdattaMap
              highlightWards={[locationData.wardNumber]}
              onSelectWard={(w) => onWardChange && onWardChange(w)}
              statusVariant="ACTIVE"
              interactive={true}
            />
          </div>
        </div>
      ) : gpsError ? (
        /* Error or denied state */
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-3 animate-fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold">
                {language === 'ne' ? 'स्थान पहुँच समस्या' : 'Location Access Required'}
              </h4>
              <p className="leading-relaxed">
                {language === 'ne' ? gpsError.messageNe : gpsError.messageEn}
              </p>
              {(gpsError.helpEn || gpsError.helpNe) && (
                <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium pt-1">
                  💡 {language === 'ne' ? gpsError.helpNe : gpsError.helpEn}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={detectLocation}
            disabled={isDetecting}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-2xs inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.reportProblem.location.retryBtn}</span>
          </button>
        </div>
      ) : (
        /* Initial Ready State: User must click to request permission */
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-center space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center mx-auto">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {language === 'ne'
                ? 'उपकरणको GPS स्थान प्रमाणित गर्नुहोस्'
                : 'Verify Device GPS Location'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {language === 'ne'
                ? 'विद्युत मर्मत टोलीलाई ठ्याक्कै घटनास्थलमा पुग्नको लागि आफ्नो उपकरणको वास्तविक GPS स्थान प्रदान गर्नुहोस्।'
                : 'Provide your genuine device GPS location so NEA technical response teams can accurately navigate to the problem site.'}
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={detectLocation}
              disabled={isDetecting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-900 text-white hover:bg-blue-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 transition-colors shadow-xs"
            >
              <Compass className="w-4 h-4" />
              <span>{language === 'ne' ? 'आफ्नो स्थान प्रयोग गर्नुहोस्' : 'Use My Location'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
