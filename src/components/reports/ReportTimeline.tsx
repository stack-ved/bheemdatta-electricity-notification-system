import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { ReportStatus, ReportTimelineEvent } from '../../types';
import { Check, Clock } from 'lucide-react';

interface ReportTimelineProps {
  currentStatus: ReportStatus;
  timelineEvents?: ReportTimelineEvent[];
}

export const ReportTimeline: React.FC<ReportTimelineProps> = ({
  currentStatus,
  timelineEvents = [],
}) => {
  const { language, t } = useLanguage();

  const statusOrder: { key: ReportStatus; label: string; symbol: string; color: string }[] = [
    { key: 'SUBMITTED', label: t.reportProblem.statuses.SUBMITTED, symbol: '🟡', color: 'amber' },
    { key: 'UNDER_REVIEW', label: t.reportProblem.statuses.UNDER_REVIEW, symbol: '🔵', color: 'blue' },
    { key: 'ASSIGNED', label: t.reportProblem.statuses.ASSIGNED, symbol: '🟠', color: 'orange' },
    { key: 'IN_PROGRESS', label: t.reportProblem.statuses.IN_PROGRESS, symbol: '🛠️', color: 'indigo' },
    { key: 'RESOLVED', label: t.reportProblem.statuses.RESOLVED, symbol: '🟢', color: 'emerald' },
  ];

  const getStepIndex = (status: ReportStatus): number => {
    if (status === 'REJECTED') return -1;
    return statusOrder.findIndex((s) => s.key === status);
  };

  const currentIndex = getStepIndex(currentStatus);

  if (currentStatus === 'REJECTED') {
    return (
      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-3">
        <span className="text-xl">🔴</span>
        <div>
          <h4 className="text-sm font-bold">{t.reportProblem.statuses.REJECTED}</h4>
          <p className="text-xs mt-0.5 text-rose-700 dark:text-rose-300">
            {language === 'ne'
              ? 'यो रिपोर्ट प्रमाणीकरण मापदण्ड पुरा नगरेको वा अमान्य भएकाले खारेज गरिएको छ।'
              : 'This report was closed as invalid or not meeting verified safety criteria.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Visual Stepper Progression Bar */}
      <div className="relative">
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {statusOrder.map((step, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;

            return (
              <div key={step.key} className="flex flex-col items-center text-center">

                {/* Step Circle */}
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isCurrent
                      ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-400/30 scale-105 shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                  ) : (
                    <span>{step.symbol}</span>
                  )}
                </div>

                {/* Step Label */}
                <span
                  className={`text-[10px] sm:text-xs mt-2 font-medium leading-tight line-clamp-2 ${
                    isCurrent
                      ? 'text-amber-600 dark:text-amber-400 font-bold'
                      : isCompleted
                      ? 'text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Event Log */}
      {timelineEvents.length > 0 && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {language === 'ne' ? 'प्रगति इतिहास' : 'Status Progression Log'}
          </h4>

          <div className="space-y-2.5">
            {timelineEvents.map((event) => {
              const eventTitle = language === 'ne' ? event.titleNe : event.titleEn;
              const eventNote = language === 'ne' ? event.noteNe : event.noteEn;

              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 text-xs"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {eventTitle}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(event.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {eventNote && (
                      <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {eventNote}
                      </p>
                    )}

                    {event.actor && (
                      <span className="inline-block mt-1 text-[10px] font-medium text-blue-600 dark:text-amber-400">
                        By: {event.actor}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
