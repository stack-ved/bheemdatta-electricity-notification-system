import React from 'react';
import type { OutageStatus } from '../../types';

import { useLanguage } from '../../contexts/LanguageContext';

interface StatusBadgeProps {
  status: OutageStatus | 'NORMAL';
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showPulse = true,
}) => {
  const { language, t } = useLanguage();

  const config = {
    NORMAL: {
      label: t.statusSection.statusNormal,
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      border: 'border-emerald-200 dark:border-emerald-800/60',
      text: 'text-emerald-700 dark:text-emerald-300',
      dot: 'bg-emerald-500',
      pulse: 'bg-emerald-400',
      symbol: '🟢',
    },
    SCHEDULED: {
      label: language === 'ne' ? 'निर्धारित' : 'Scheduled',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      border: 'border-amber-200 dark:border-amber-800/60',
      text: 'text-amber-800 dark:text-amber-300',
      dot: 'bg-amber-500',
      pulse: 'bg-amber-400',
      symbol: '🟡',
    },
    ACTIVE: {
      label: language === 'ne' ? 'विद्युत अवरोध' : 'Active Outage',
      bg: 'bg-rose-50 dark:bg-rose-950/50',
      border: 'border-rose-200 dark:border-rose-800/60',
      text: 'text-rose-700 dark:text-rose-300',
      dot: 'bg-rose-600',
      pulse: 'bg-rose-500',
      symbol: '🔴',
    },
    RESTORATION: {
      label: language === 'ne' ? 'पुनर्बहाली हुँदै' : 'Restoration',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
      border: 'border-blue-200 dark:border-blue-800/60',
      text: 'text-blue-700 dark:text-blue-300',
      dot: 'bg-blue-600',
      pulse: 'bg-blue-400',
      symbol: '🔵',
    },
    RESTORED: {
      label: language === 'ne' ? 'सुचारु भएको' : 'Restored',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      border: 'border-emerald-200 dark:border-emerald-800/60',
      text: 'text-emerald-700 dark:text-emerald-300',
      dot: 'bg-emerald-500',
      pulse: 'bg-emerald-400',
      symbol: '🟢',
    },
  }[status];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs md:text-sm px-2.5 py-1 gap-2',
    lg: 'text-sm md:text-base px-3.5 py-1.5 gap-2.5 font-medium',
  }[size];

  const dotSize = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold tracking-tight shadow-2xs backdrop-blur-xs ${config.bg} ${config.border} ${config.text} ${sizeClasses} transition-all duration-200`}
    >
      <span className="relative flex items-center justify-center shrink-0">
        {showPulse && (status === 'ACTIVE' || status === 'RESTORATION') && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${config.pulse}`}
          />
        )}
        <span className={`relative inline-block rounded-full ${config.dot} ${dotSize} shadow-xs`} />
      </span>
      <span className="leading-none">{config.label}</span>
    </span>
  );
};
