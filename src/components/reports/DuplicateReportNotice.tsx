import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import type { ProblemReport } from '../../types';
import { AlertCircle, Eye, ArrowRight } from 'lucide-react';

interface DuplicateReportNoticeProps {
  existingReport: ProblemReport;
  onContinueNew: () => void;
}

export const DuplicateReportNotice: React.FC<DuplicateReportNoticeProps> = ({
  existingReport,
  onContinueNew,
}) => {
  const { t } = useLanguage();


  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-100 space-y-3 animate-fade-in shadow-xs">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold">
            {t.reportProblem.duplicateNotice.title}
          </h4>
          <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-sans">
            {t.reportProblem.duplicateNotice.text} (
            <strong>{existingReport.report_number}</strong> — {existingReport.location_name || `Ward ${existingReport.ward_id}`})
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
        <Link
          to={`/reports/${existingReport.id}`}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{t.reportProblem.duplicateNotice.viewExisting}</span>
        </Link>

        <button
          type="button"
          onClick={onContinueNew}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 transition-colors"
        >
          <span>{t.reportProblem.duplicateNotice.continueNew}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
