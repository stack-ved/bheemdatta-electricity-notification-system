import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppData } from '../contexts/AppDataContext';
import { useAuth } from '../contexts/AuthContext';
import {
  PROVINCE,
  DISTRICT,
  MUNICIPALITY,
  WARDS,
  LOCATIONS,
  toNepaliDigits,
} from '../data/locationsData';
import { BheemdattaMap } from '../components/map/BheemdattaMap';
import type { LocationItem } from '../types';
import {
  MapPin,
  Compass,
  CheckCircle2,
  Plus,
  Layers,
  Sparkles,
  ShieldAlert,
  Lock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  requestDeviceLocation,
  findNearestBheemdattaLocation,
  type GeolocationErrorDetails,
} from '../utils/geolocation';

export const LocationsPage: React.FC = () => {
  const { language, t } = useLanguage();
  const { addSavedLocation, showToast } = useAppData();
  const {
    user,
    role,
    wardNumber,
    permanentAddress,
    hasCompletePermanentAddress,
  } = useAuth();

  const isResident = user && role === 'resident';

  const [selectedWard, setSelectedWard] = useState<number>(() => {
    if (isResident && wardNumber && wardNumber >= 1 && wardNumber <= 19) {
      return wardNumber;
    }
    return 3;
  });
  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    if (isResident && wardNumber && wardNumber >= 1 && wardNumber <= 19) {
      const first = LOCATIONS.find((l) => l.wardNumber === wardNumber);
      if (first) return first.id;
    }
    return 'loc-03-01';
  });
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsDetectedNotice, setGpsDetectedNotice] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<GeolocationErrorDetails | null>(null);

  useEffect(() => {
    if (isResident && wardNumber && wardNumber >= 1 && wardNumber <= 19) {
      setSelectedWard(wardNumber);
      const first = LOCATIONS.find((l) => l.wardNumber === wardNumber);
      if (first) setSelectedLocationId(first.id);
    }
  }, [isResident, wardNumber]);

  // Custom location addition state for future admin preparation
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customNameEn, setCustomNameEn] = useState('');
  const [customNameNe, setCustomNameNe] = useState('');
  const [customType, setCustomType] = useState('Tole / Settlement');

  const wardLocations = LOCATIONS.filter((loc) => loc.wardNumber === selectedWard);
  const activeLocation = LOCATIONS.find((l) => l.id === selectedLocationId);

  // Native Browser Geolocation
  const handleUseMyLocation = async () => {
    setIsDetectingGps(true);
    setGpsDetectedNotice(null);
    setGpsError(null);

    const { data, error } = await requestDeviceLocation();
    setIsDetectingGps(false);

    if (error) {
      setGpsError(error);
      showToast({
        type: 'error',
        title: language === 'ne' ? 'स्थान पहुँच समस्या' : 'Location Permission Error',
        message: language === 'ne' ? error.messageNe : error.messageEn,
      });
      return;
    }

    if (data) {
      const accuracyMeters = Math.round(data.accuracy);
      const { nearestLocation } = findNearestBheemdattaLocation(
        data.latitude,
        data.longitude
      );

      if (nearestLocation) {
        setSelectedWard(nearestLocation.wardNumber);
        setSelectedLocationId(nearestLocation.id);
      }

      const notice =
        language === 'ne'
          ? `स्थान पहिचान भयो — शुद्धता ±${toNepaliDigits(accuracyMeters)} मिटर (${toNepaliDigits(data.latitude.toFixed(5))}, ${toNepaliDigits(data.longitude.toFixed(5))})${
              nearestLocation
                ? ` • नजिकको क्षेत्र: ${nearestLocation.nameNe} (वडा ${toNepaliDigits(nearestLocation.wardNumber)})`
                : ''
            }${isResident && hasCompletePermanentAddress ? ` • स्थायी सूचना वडा: वडा नं. ${toNepaliDigits(wardNumber ?? 0)} सुरक्षित` : ''}`
          : `Location detected — accuracy ±${accuracyMeters} m (${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)})${
              nearestLocation
                ? ` • Nearest: ${nearestLocation.nameEn} (Ward ${nearestLocation.wardNumber})`
                : ''
            }${isResident && hasCompletePermanentAddress ? ` • Permanent alert ward: Ward ${wardNumber} locked` : ''}`;

      setGpsDetectedNotice(notice);
      showToast({
        type: 'success',
        title: language === 'ne' ? 'GPS स्थान प्राप्त भयो' : 'GPS Location Detected',
        message:
          language === 'ne'
            ? `स्थान पहिचान — शुद्धता ±${toNepaliDigits(accuracyMeters)} मिटर${isResident ? ' (स्थायी दर्ता यथावत)' : ''}`
            : `Location detected — accuracy ±${accuracyMeters} m${isResident ? ' (Permanent address locked)' : ''}`,
      });
    }
  };

  const handleSaveLocation = () => {
    if (isResident && hasCompletePermanentAddress) {
      showToast({
        type: 'info',
        title: language === 'ne' ? 'स्थायी ठेगाना सुरक्षित' : 'Permanent Address Locked',
        message: language === 'ne'
          ? `तपाईंको आधिकारिक विद्युत सूचनाहरू वडा नं. ${toNepaliDigits(wardNumber ?? 0)} मा सुरक्षित छन्।`
          : `Your official notifications are locked to Ward ${wardNumber}.`,
      });
      return;
    }
    if (!activeLocation) return;
    addSavedLocation({
      id: activeLocation.id,
      nameEn: activeLocation.nameEn,
      nameNe: activeLocation.nameNe,
      wardNumber: activeLocation.wardNumber,
      isPrimary: true,
    });
  };

  const handleCreateCustomLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNameEn.trim()) return;

    const newLoc: LocationItem = {
      id: `custom-${Date.now()}`,
      nameEn: customNameEn,
      nameNe: customNameNe || customNameEn,
      wardNumber: selectedWard,
      type: customType as any,
      coordinates: { lat: 28.96, lng: 80.18 },
    };

    LOCATIONS.push(newLoc);
    setSelectedLocationId(newLoc.id);
    setShowAddCustomModal(false);
    setCustomNameEn('');
    setCustomNameNe('');
    showToast({
      type: 'success',
      title: 'Location Added',
      message: `${newLoc.nameEn} registered to Ward ${selectedWard}.`,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/90 text-blue-900 dark:bg-blue-950/90 dark:text-blue-300 text-xs font-semibold border border-blue-200/60 dark:border-blue-800/60 backdrop-blur-xs">
          <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-amber-400" />
          <span>{language === 'ne' ? 'स्थान निर्धारण' : 'Location Targeting'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t.locationsPage.title}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
          {t.locationsPage.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Administrative Hierarchy Selector */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-900 dark:text-amber-400" />
                <span>{t.locationsPage.hierarchyTitle}</span>
              </h2>

              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={isDetectingGps}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all duration-200 shadow-sm shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                <Compass className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
                <span>{isDetectingGps ? t.locationsPage.detectingGps : t.locationsPage.useMyLocation}</span>
              </button>
            </div>

            {gpsError && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1.5 animate-fade-in">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold leading-relaxed">
                      {language === 'ne' ? gpsError.messageNe : gpsError.messageEn}
                    </p>
                    {(gpsError.helpEn || gpsError.helpNe) && (
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-normal">
                        {language === 'ne' ? gpsError.helpNe : gpsError.helpEn}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {gpsDetectedNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5 animate-fade-in">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{gpsDetectedNotice}</span>
              </div>
            )}

            {/* Level 1: Province */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                1. {t.locationsPage.provinceLabel}
              </label>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center">
                <span>{language === 'ne' ? PROVINCE.nameNe : PROVINCE.nameEn}</span>
                <span className="text-[10px] text-slate-400 font-normal">Pre-selected</span>
              </div>
            </div>

            {/* Level 2: District */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                2. {t.locationsPage.districtLabel}
              </label>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center">
                <span>{language === 'ne' ? DISTRICT.nameNe : DISTRICT.nameEn}</span>
                <span className="text-[10px] text-slate-400 font-normal">Pre-selected</span>
              </div>
            </div>

            {/* Level 3: Municipality */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                3. {t.locationsPage.municipalityLabel}
              </label>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center">
                <span>{language === 'ne' ? MUNICIPALITY.nameNe : MUNICIPALITY.nameEn}</span>
                <span className="text-[10px] text-slate-400 font-normal">19 Wards</span>
              </div>
            </div>

            {/* Level 4: Ward Selection */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                4. {t.locationsPage.wardLabel}
              </label>
              <select
                value={selectedWard}
                onChange={(e) => {
                  const w = Number(e.target.value);
                  setSelectedWard(w);
                  const first = LOCATIONS.find((l) => l.wardNumber === w);
                  if (first) setSelectedLocationId(first.id);
                }}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/40"
              >
                {WARDS.map((w) => (
                  <option key={w.number} value={w.number}>
                    {language === 'ne' ? w.nameNe : w.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Level 5: Location / Tole Selection */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  5. {t.locationsPage.locationLabel}
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(true)}
                  className="text-[11px] font-bold text-blue-900 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{language === 'ne' ? '+ नयाँ टोल थप्नुहोस्' : '+ Add New Tole'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-48 overflow-y-auto">
                {wardLocations.map((loc) => {
                  const isSelected = selectedLocationId === loc.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => setSelectedLocationId(loc.id)}
                      className={`flex items-start justify-between p-3 rounded-xl text-left text-xs transition-all ${
                        isSelected
                          ? 'bg-blue-900 text-white dark:bg-amber-500 dark:text-slate-950 font-bold ring-2 ring-blue-500/30 dark:ring-amber-400/30'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700/80'
                      }`}
                    >
                      <div>
                        <p>{language === 'ne' ? loc.nameNe : loc.nameEn}</p>
                        <span className={`text-[10px] font-normal ${isSelected ? 'opacity-80' : 'text-slate-400'}`}>
                          {loc.type}
                        </span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action CTA: Permanent Locked Status for Residents or Save for Guests */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              {isResident ? (
                hasCompletePermanentAddress ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30 space-y-3">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>
                            {language === 'ne'
                              ? `स्थायी दर्ता: वडा नं. ${toNepaliDigits(wardNumber ?? 0)} (${permanentAddress || 'भीमदत्त'})`
                              : `Permanent Registered Ward: Ward ${wardNumber} (${permanentAddress || 'Bheemdatta'})`}
                          </span>
                        </p>
                        <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                          {language === 'ne'
                            ? 'तपाईंको आधिकारिक विद्युत सूचनाहरू स्थायी दर्ता भएको वडामा सुरक्षित छन्। उपकरण GPS र नक्सा चयन केवल स्थानीय ग्रीड अन्वेषणका लागि मात्र प्रयोग हुन्छ।'
                            : 'Your official electricity notifications are permanently locked to your registered ward. Map browsing and device GPS are for exploration only.'}
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/citizen-dashboard"
                      className="inline-flex items-center justify-center w-full py-2.5 rounded-xl text-xs font-bold bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100 dark:bg-slate-900 dark:text-emerald-200 dark:border-emerald-800 transition-colors"
                    >
                      {language === 'ne' ? 'नागरिक ड्यासबोर्डमा ठेगाना संशोधन अनुरोध गर्नुहोस्' : 'Manage Address in Citizen Dashboard'}
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-900 dark:text-amber-200 font-semibold">
                        {language === 'ne' ? 'स्थायी ठेगाना पुष्टि हुन बाँकी छ' : 'Permanent Address Setup Required'}
                      </p>
                    </div>
                    <Link
                      to="/citizen-dashboard"
                      className="inline-flex items-center justify-center w-full py-2.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-500 transition-colors"
                    >
                      {language === 'ne' ? 'स्थायी ठेगाना पुष्टि गर्नुहोस्' : 'Complete Address in Citizen Dashboard'}
                    </Link>
                  </div>
                )
              ) : (
                <button
                  type="button"
                  onClick={handleSaveLocation}
                  className="w-full py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-900 text-white dark:bg-amber-500 dark:text-slate-950 hover:bg-blue-800 dark:hover:bg-amber-400 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.locationsPage.saveLocationBtn}</span>
                </button>
              )}
            </div>
          </div>

          {/* Admin Extensibility Notice */}
          <div className="rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {t.locationsPage.adminNotice}
            </p>
          </div>
        </div>

        {/* Right Column: Visual Map Section */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-500" />
                <span>{t.locationsPage.mapPreviewTitle}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === 'ne'
                  ? `चयन गरिएको वडा नं. ${toNepaliDigits(selectedWard)}: ${activeLocation ? (language === 'ne' ? activeLocation.nameNe : activeLocation.nameEn) : ''}`
                  : `Currently selected Ward ${selectedWard}: ${activeLocation ? activeLocation.nameEn : ''}`}
              </p>
            </div>

            <BheemdattaMap
              highlightWards={[selectedWard]}
              highlightLocations={activeLocation ? [activeLocation.id] : []}
              selectedLocationId={selectedLocationId}
              onSelectWard={(w) => {
                setSelectedWard(w);
                const first = LOCATIONS.find((l) => l.wardNumber === w);
                if (first) setSelectedLocationId(first.id);
              }}
              statusVariant="NORMAL"
              interactive={true}
            />

            {/* Selected Location Summary Box */}
            {activeLocation && (
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-slate-850 border border-blue-100 dark:border-slate-800 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {language === 'ne' ? 'स्थानको नाम:' : 'Selected Location:'}
                  </span>
                  <strong className="text-slate-900 dark:text-white text-sm">
                    {language === 'ne' ? activeLocation.nameNe : activeLocation.nameEn}
                  </strong>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {language === 'ne' ? 'प्रशासनिक वडा:' : 'Administrative Ward:'}
                  </span>
                  <strong className="text-blue-900 dark:text-amber-400 font-bold">
                    {language === 'ne' ? `वडा नं. ${toNepaliDigits(activeLocation.wardNumber)}` : `Ward No. ${activeLocation.wardNumber}`}
                  </strong>
                </div>

                {activeLocation.feeder && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      {language === 'ne' ? '११ केभी फिडर:' : '11kV Feeder:'}
                    </span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {activeLocation.feeder}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Custom Location Modal (Future Admin Preparation Prototype) */}
      {showAddCustomModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 text-slate-900 dark:text-white space-y-4">
            <h3 className="text-base font-bold">
              {language === 'ne' ? 'नयाँ टोल वा क्षेत्र दर्ता गर्नुहोस्' : 'Add New Tole or Area (Admin)'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'ne'
                ? `वडा नं. ${toNepaliDigits(selectedWard)} मा नयाँ टोल/बस्ती थप्नुहोस्`
                : `Register a new neighborhood to Ward ${selectedWard}`}
            </p>

            <form onSubmit={handleCreateCustomLocation} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Location Name (English)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Radhakrishna Tol"
                  value={customNameEn}
                  onChange={(e) => setCustomNameEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  स्थानको नाम (नेपाली)
                </label>
                <input
                  type="text"
                  placeholder="जस्तै: राधाकृष्ण टोल"
                  value={customNameNe}
                  onChange={(e) => setCustomNameNe(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-sans"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Location Type
                </label>
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Tole / Settlement">Tole / Settlement</option>
                  <option value="Area">Area</option>
                  <option value="Neighborhood">Neighborhood</option>
                  <option value="Transformer Area">Transformer Area</option>
                  <option value="Electricity Distribution Area">Electricity Distribution Area</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-900 text-white dark:bg-amber-500 dark:text-slate-950 font-bold"
                >
                  {t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
