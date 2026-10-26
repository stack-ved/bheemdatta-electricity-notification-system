import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppData } from '../../contexts/AppDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { WARDS, LOCATIONS, MUNICIPALITY, DISTRICT, PROVINCE } from '../../data/locationsData';
import type { Outage, OutageStatus } from '../../types';
import { outageService, BHEEMDATTA_MUNICIPALITY_ID } from '../../services/outageService';
import { notificationService, summarizePublishAndDispatch } from '../../services/notificationService';

import { X, Plus, Check, ShieldAlert } from 'lucide-react';
import {
  toLocalDatetimeInputString,
  getMinimumEndDatetime,
  validateOutageDates,
} from '../../utils/datetimeValidation';

interface AdminOutageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminOutageModal: React.FC<AdminOutageModalProps> = ({ isOpen, onClose }) => {
  const { language, t } = useLanguage();
  const { addOutage, refreshOutages, showToast } = useAppData();
  const { user, municipalityId } = useAuth();

  const [selectedWard, setSelectedWard] = useState<number>(3);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>(['loc-03-01', 'loc-03-02']);
  const [titleEn, setTitleEn] = useState('Emergency Feeder Repair');
  const [titleNe, setTitleNe] = useState('आकस्मिक फिडर मर्मत कार्य');
  const [status, setStatus] = useState<OutageStatus>('SCHEDULED');
  const [startTime, setStartTime] = useState(() => toLocalDatetimeInputString(new Date()));
  const [expectedRestoration, setExpectedRestoration] = useState(() =>
    toLocalDatetimeInputString(new Date(Date.now() + 2 * 60 * 60 * 1000))
  );
  const [dateError, setDateError] = useState<string | null>(null);
  const [reasonEn, setReasonEn] = useState('Replacement of burnt distribution fuse and conductor clearing');
  const [reasonNe, setReasonNe] = useState('जलेको वितरण फ्युज फेर्ने तथा कन्डक्टर लाइन मर्मत');
  const [feederName, setFeederName] = useState('Bheemdatta Urban Feeder');
  const [isSaving, setIsSaving] = useState(false);
  const [pendingOutageId, setPendingOutageId] = useState<string | null>(null);

  if (!isOpen) return null;

  const wardLocations = LOCATIONS.filter((loc) => loc.wardNumber === selectedWard);

  const toggleLocation = (id: string) => {
    if (selectedLocationIds.includes(id)) {
      if (selectedLocationIds.length > 1) {
        setSelectedLocationIds(selectedLocationIds.filter((locId) => locId !== id));
      }
    } else {
      setSelectedLocationIds([...selectedLocationIds, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const validation = validateOutageDates(startTime, expectedRestoration);
    if (!validation.isValid) {
      setDateError(validation.error);
      return;
    }
    setDateError(null);

    const targetMunicipalityId = municipalityId || BHEEMDATTA_MUNICIPALITY_ID;
    setIsSaving(true);
    try {
      let outageId = pendingOutageId;
      if (!outageId) {
        const affected = LOCATIONS.filter((location) => selectedLocationIds.includes(location.id)).map((location) => ({
          locationId: location.id,
          nameEn: location.nameEn,
          nameNe: location.nameNe,
          wardNumber: location.wardNumber,
        }));
        const { data: created, error } = await outageService.createOutage({
          title_en: titleEn,
          title_np: titleNe,
          reason_en: reasonEn,
          reason_np: reasonNe,
          affected_area: affected.map((location) => location.nameEn).join(', ') || `Ward ${selectedWard} Area`,
          start_time: new Date(startTime).toISOString(),
          expected_end_time: new Date(expectedRestoration).toISOString(),
          priority: 'medium',
          status: status.toLowerCase(),
          is_municipality_wide: false,
          ward_number: selectedWard,
          ward_numbers: [selectedWard],
          municipality_id: targetMunicipalityId,
          created_by: user?.id,
        });

        if (error || !created) {
          showToast({ type: 'error', title: 'Outage not saved', message: error?.message ?? 'The outage record was not created.' });
          return;
        }

        outageId = created.id;
        setPendingOutageId(outageId);
        const newOutage: Outage = {
          id: created.id,
          titleEn,
          titleNe,
          status,
          municipality: MUNICIPALITY.nameEn,
          district: DISTRICT.nameEn,
          province: PROVINCE.nameEn,
          wards: [selectedWard],
          affectedLocations: affected.length > 0 ? affected : [{
            locationId: 'loc-custom',
            nameEn: `Ward ${selectedWard} Area`,
            nameNe: `वडा नं ${selectedWard} क्षेत्र`,
            wardNumber: selectedWard,
          }],
          startTime: new Date(startTime).toISOString(),
          expectedRestoration: new Date(expectedRestoration).toISOString(),
          reasonEn,
          reasonNe,
          feederNameEn: feederName,
          feederNameNe: feederName,
          substationEn: 'Bheemdatta 33/11 kV Substation',
          substationNe: 'भीमदत्त 33/11 केभी सबस्टेशन',
          lastUpdated: new Date().toISOString(),
          affectedCustomersEstimate: 950,
          contactNumber: '099-521153',
          municipality_id: targetMunicipalityId,
          ward_number: selectedWard,
          is_municipality_wide: false,
        };
        addOutage(newOutage);
      }

      if (!outageId) throw new Error('The saved outage reference is unavailable.');
      const result = await notificationService.publishAndDispatch(outageId, 'outage');
      const summary = summarizePublishAndDispatch(result);
      showToast({
        type: result.published ? summary.type : 'warning',
        title: result.published ? 'Outage published' : 'Outage saved but not published',
        message: result.published ? summary.message : `Reference ${outageId}. ${summary.message}`,
      });
      if (result.published) {
        setPendingOutageId(null);
        onClose();
      }
      await refreshOutages();
    } catch (error: unknown) {
      showToast({ type: 'error', title: 'Outage workflow failed', message: error instanceof Error ? error.message : 'Unable to save or publish the outage.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 my-8 text-slate-900 dark:text-white">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 text-xs font-bold mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>NEA & Municipal Admin Console</span>
            </div>
            <h3 className="text-xl font-bold">
              {t.adminModal.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.adminModal.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Titles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                {t.adminModal.outageTitleEn}
              </label>
              <input
                type="text"
                required
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                {t.adminModal.outageTitleNe}
              </label>
              <input
                type="text"
                required
                value={titleNe}
                onChange={(e) => setTitleNe(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-sans"
              />
            </div>
          </div>

          {/* Municipality & Ward Hierarchy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                {t.locationsPage.municipalityLabel}
              </label>
              <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-300">
                {MUNICIPALITY.nameEn} ({DISTRICT.nameEn})
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                {t.adminModal.selectWard}
              </label>
              <select
                value={selectedWard}
                onChange={(e) => {
                  const w = Number(e.target.value);
                  setSelectedWard(w);
                  const firstInWard = LOCATIONS.find((l) => l.wardNumber === w);
                  if (firstInWard) setSelectedLocationIds([firstInWard.id]);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {WARDS.map((w) => (
                  <option key={w.number} value={w.number}>
                    {language === 'ne' ? w.nameNe : w.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Multiple Affected Locations Checklist */}
          <div>
            <label className="block font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
              {t.adminModal.selectLocations} ({selectedLocationIds.length} selected)
            </label>
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {wardLocations.map((loc) => {
                const isSelected = selectedLocationIds.includes(loc.id);
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => toggleLocation(loc.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-900 text-white dark:bg-amber-500 dark:text-slate-950 font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{language === 'ne' ? loc.nameNe : loc.nameEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status & Feeder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                {t.adminModal.statusLabel}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OutageStatus)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="SCHEDULED">🟡 Scheduled Outage</option>
                <option value="ACTIVE">🔴 Active Emergency Outage</option>
                <option value="RESTORATION">🔵 Restoration in Progress</option>
                <option value="RESTORED">🟢 Restored</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                {t.adminModal.feederName}
              </label>
              <input
                type="text"
                value={feederName}
                onChange={(e) => setFeederName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Start & Restoration Times */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {t.adminModal.startTime}
                </label>
                <input
                  type="datetime-local"
                  required
                  min={toLocalDatetimeInputString(new Date())}
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setDateError(null);
                  }}
                  className={`w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 ${
                    dateError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {t.adminModal.restorationTime}
                </label>
                <input
                  type="datetime-local"
                  required
                  min={getMinimumEndDatetime(startTime)}
                  value={expectedRestoration}
                  onChange={(e) => {
                    setExpectedRestoration(e.target.value);
                    setDateError(null);
                  }}
                  className={`w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 ${
                    dateError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
              </div>
            </div>
            {dateError && (
              <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />
                {dateError}
              </p>
            )}
          </div>

          {/* Reasons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                {t.adminModal.reasonEn}
              </label>
              <textarea
                rows={2}
                value={reasonEn}
                onChange={(e) => setReasonEn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                {t.adminModal.reasonNe}
              </label>
              <textarea
                rows={2}
                value={reasonNe}
                onChange={(e) => setReasonNe(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-sans"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t.adminModal.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-900 text-white dark:bg-amber-500 dark:text-slate-950 font-bold hover:bg-blue-800 dark:hover:bg-amber-600 transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              <span>{isSaving ? 'Publishing...' : pendingOutageId ? 'Retry publication' : t.adminModal.publishBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
