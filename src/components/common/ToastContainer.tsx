import React from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppData();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const icon = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
          warning: <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />,
          error: <XCircle className="w-5 h-5 text-rose-500 shrink-0" />,
          info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
        }[toast.type];

        const border = {
          success: 'border-emerald-200 dark:border-emerald-800/80',
          warning: 'border-amber-200 dark:border-amber-800/80',
          error: 'border-rose-200 dark:border-rose-800/80',
          info: 'border-blue-200 dark:border-blue-800/80',
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border ${border} shadow-xl shadow-slate-900/10 dark:shadow-black/60 text-slate-800 dark:text-slate-100 transition-all duration-200 animate-fade-in-up`}
          >
            <div className="shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{toast.title}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 active:scale-90 cursor-pointer"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
