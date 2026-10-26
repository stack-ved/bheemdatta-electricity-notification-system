import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppData } from '../contexts/AppDataContext';
import { OutageFilterPanel } from '../components/outages/OutageFilterPanel';
import { OutageCard } from '../components/outages/OutageCard';
import { ElectricChargerLoader } from '../components/common/ElectricChargerLoader';
import type { OutageStatus } from '../types';
import { Zap, AlertTriangle } from 'lucide-react';


interface OutageFilterState {
  searchQuery: string;
  selectedWard: number | 'all';
  selectedLocation: string | 'all';
  selectedStatus: OutageStatus | 'all';
  selectedDate: 'all' | 'today' | 'tomorrow' | 'thisWeek';
}

const INITIAL_FILTERS: OutageFilterState = {
  searchQuery: '',
  selectedWard: 'all',
  selectedLocation: 'all',
  selectedStatus: 'all',
  selectedDate: 'all',
};

export const OutagesPage: React.FC = () => {
  const { language, t } = useLanguage();
  const { outages, outagesLoading } = useAppData();
  const [filters, setFilters] = useState<OutageFilterState>(INITIAL_FILTERS);

  // Filter computation
  const filteredOutages = useMemo(() => {
    return outages.filter((outage) => {
      // Search query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchTitle =
          outage.titleEn.toLowerCase().includes(query) ||
          outage.titleNe.toLowerCase().includes(query);
        const matchReason =
          outage.reasonEn.toLowerCase().includes(query) ||
          outage.reasonNe.toLowerCase().includes(query);
        const matchFeeder =
          outage.feederNameEn.toLowerCase().includes(query) ||
          outage.feederNameNe.toLowerCase().includes(query);
        const matchLocation = outage.affectedLocations.some(
          (loc) =>
            loc.nameEn.toLowerCase().includes(query) ||
            loc.nameNe.toLowerCase().includes(query)
        );
        const matchWard = outage.wards.some((w) =>
          `ward ${w}`.includes(query) || `वडा ${w}`.includes(query)
        );

        if (!matchTitle && !matchReason && !matchFeeder && !matchLocation && !matchWard) {
          return false;
        }
      }

      // Ward filter
      if (filters.selectedWard !== 'all') {
        const matchesWard =
          Boolean(outage.isMunicipalityWide) ||
          (outage.ward_number != null && outage.ward_number === filters.selectedWard) ||
          outage.wards.includes(filters.selectedWard);
        if (!matchesWard) {
          return false;
        }
      }

      // Location filter
      if (filters.selectedLocation !== 'all') {
        const hasLocation = outage.affectedLocations.some(
          (loc) => loc.locationId === filters.selectedLocation
        );
        if (!hasLocation) {
          return false;
        }
      }

      // Status filter
      if (filters.selectedStatus !== 'all') {
        if (outage.status !== filters.selectedStatus) {
          return false;
        }
      }

      // Date filter
      if (filters.selectedDate !== 'all') {
        const outDate = new Date(outage.startTime);
        const now = new Date('2026-09-06T17:20:00+05:45'); // Anchor to current date

        if (filters.selectedDate === 'today') {
          if (
            outDate.getDate() !== now.getDate() ||
            outDate.getMonth() !== now.getMonth()
          ) {
            return false;
          }
        } else if (filters.selectedDate === 'tomorrow') {
          const tomorrow = new Date(now);
          tomorrow.setDate(now.getDate() + 1);
          if (
            outDate.getDate() !== tomorrow.getDate() ||
            outDate.getMonth() !== tomorrow.getMonth()
          ) {
            return false;
          }
        } else if (filters.selectedDate === 'thisWeek') {
          const diffDays = (outDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
          if (diffDays < 0 || diffDays > 7) {
            return false;
          }
        }
      }

      return true;
    });
  }, [outages, filters]);

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300 text-xs font-semibold border border-blue-200/60 dark:border-blue-800/60 backdrop-blur-xs">
          <Zap className="w-3.5 h-3.5 fill-current text-blue-600 dark:text-amber-400" />
          <span>{language === 'ne' ? 'भीमदत्त नगरपालिका • कञ्चनपुर' : 'Bheemdatta Municipality • Kanchanpur'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t.outagesPage.title}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          {t.outagesPage.subtitle}
        </p>
      </div>

      {/* Filter Panel */}
      <OutageFilterPanel
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
        totalCount={outages.length}
        filteredCount={filteredOutages.length}
      />

      {/* Outage Cards Grid */}
      {outagesLoading ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white/80 dark:border-slate-800/80 dark:bg-slate-900/80 backdrop-blur-md p-8 shadow-sm">
          <ElectricChargerLoader
            message={language === 'ne' ? 'विद्युत अवरोध विवरण लोड हुँदैछ...' : 'Loading electricity outages...'}
            minHeight="min-h-[45vh]"
          />
        </div>
      ) : filteredOutages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOutages.map((outage) => (
            <OutageCard key={outage.id} outage={outage} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {t.upcoming.noOutages}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {language === 'ne'
              ? 'कृपया फरक वडा, टोल वा मिति चयन गरी पुन: प्रयास गर्नुहोस् वा फिल्टर हटाउनुहोस्।'
              : 'Try changing your search terms, selecting a different ward, or resetting filters.'}
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-900 text-white hover:bg-blue-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 transition-all duration-200 shadow-sm active:scale-95"
          >
            {t.outagesPage.resetFilters}
          </button>
        </div>
      )}
    </div>
  );
};
