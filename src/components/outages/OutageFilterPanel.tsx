import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { WARDS, LOCATIONS, MUNICIPALITY } from '../../data/locationsData';
import type { OutageStatus } from '../../types';

import { Search, Filter, RotateCcw } from 'lucide-react';

interface OutageFilterState {
  searchQuery: string;
  selectedWard: number | 'all';
  selectedLocation: string | 'all';
  selectedStatus: OutageStatus | 'all';
  selectedDate: 'all' | 'today' | 'tomorrow' | 'thisWeek';
}

interface OutageFilterPanelProps {
  filters: OutageFilterState;
  onChange: (filters: OutageFilterState) => void;
  onReset: () => void;
  totalCount: number;
  filteredCount: number;
}

export const OutageFilterPanel: React.FC<OutageFilterPanelProps> = ({
  filters,
  onChange,
  onReset,
  filteredCount,
}) => {
  const { language, t } = useLanguage();

  const statuses: { id: OutageStatus | 'all'; labelEn: string; labelNe: string; color: string }[] = [
    { id: 'all', labelEn: 'All Statuses', labelNe: 'सबै स्थितिहरू', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    { id: 'SCHEDULED', labelEn: 'Scheduled 🟡', labelNe: 'निर्धारित 🟡', color: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300' },
    { id: 'ACTIVE', labelEn: 'Active Outage 🔴', labelNe: 'सक्रिय अवरोध 🔴', color: 'bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300' },
    { id: 'RESTORATION', labelEn: 'Restoration 🔵', labelNe: 'पुनर्बहाली 🔵', color: 'bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300' },
    { id: 'RESTORED', labelEn: 'Restored 🟢', labelNe: 'सुचारु भएको 🟢', color: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300' },
  ];

  const filteredLocations = filters.selectedWard === 'all'
    ? LOCATIONS
    : LOCATIONS.filter((loc) => loc.wardNumber === filters.selectedWard);

  return (
    <div className="rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-7 shadow-xs transition-colors duration-200">
      {/* Search and Top Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            placeholder={t.outagesPage.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all duration-150"
          />
        </div>

        {/* Quick Reset */}
        <div className="flex items-center gap-3 justify-between md:justify-end">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {t.outagesPage.showingResults}: <strong className="text-slate-900 dark:text-white font-bold">{filteredCount}</strong> {t.outagesPage.outagesCount}
          </span>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs transition-all duration-150 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.outagesPage.resetFilters}</span>
          </button>
        </div>
      </div>

      {/* Filter Dropdowns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5 pt-4.5 border-t border-slate-100 dark:border-slate-800/80">
        {/* Municipality (Fixed / Preselected) */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
            {t.locationsPage.municipalityLabel}
          </label>
          <div className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700/90 bg-slate-100/90 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 font-semibold shadow-2xs">
            {language === 'ne' ? MUNICIPALITY.nameNe : MUNICIPALITY.nameEn}
          </div>
        </div>

        {/* Ward Filter */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
            {t.outagesPage.filterByWard}
          </label>
          <select
            value={filters.selectedWard}
            onChange={(e) => {
              const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
              onChange({ ...filters, selectedWard: val, selectedLocation: 'all' });
            }}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700/90 bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 shadow-2xs cursor-pointer transition-all duration-150"
          >
            <option value="all">{t.outagesPage.allWards}</option>
            {WARDS.map((w) => (
              <option key={w.number} value={w.number}>
                {language === 'ne' ? w.nameNe : w.nameEn}
              </option>
            ))}
          </select>
        </div>

        {/* Location Filter */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
            {t.locationsPage.locationLabel}
          </label>
          <select
            value={filters.selectedLocation}
            onChange={(e) => onChange({ ...filters, selectedLocation: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700/90 bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 shadow-2xs cursor-pointer transition-all duration-150"
          >
            <option value="all">
              {language === 'ne' ? 'सबै टोल तथा बस्तीहरू' : 'All Toles & Areas'}
            </option>
            {filteredLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {language === 'ne' ? loc.nameNe : loc.nameEn} (W{loc.wardNumber})
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
            {t.outagesPage.filterByDate}
          </label>
          <select
            value={filters.selectedDate}
            onChange={(e) =>
              onChange({
                ...filters,
                selectedDate: e.target.value as OutageFilterState['selectedDate'],
              })
            }
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700/90 bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 shadow-2xs cursor-pointer transition-all duration-150"
          >
            <option value="all">{t.outagesPage.allDates}</option>
            <option value="today">{t.outagesPage.today}</option>
            <option value="tomorrow">{t.outagesPage.tomorrow}</option>
            <option value="thisWeek">{t.outagesPage.thisWeek}</option>
          </select>
        </div>
      </div>

      {/* Status Filter Chips */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1.5">
          <Filter className="w-3.5 h-3.5 text-blue-500" />
          <span>{t.outagesPage.filterByStatus}:</span>
        </span>
        {statuses.map((s) => {
          const isActive = filters.selectedStatus === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange({ ...filters, selectedStatus: s.id })}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
                isActive
                  ? 'bg-blue-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-xs'
                  : 'bg-slate-100/90 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/90 dark:hover:bg-slate-700'
              }`}
            >
              {language === 'ne' ? s.labelNe : s.labelEn}
            </button>
          );
        })}
      </div>
    </div>
  );
};
