import React, { useEffect, useState } from 'react';
import { BellRing, ShieldCheck } from 'lucide-react';
import { useAppData } from '../../contexts/AppDataContext';
import { useAuth } from '../../contexts/AuthContext';

const REMINDER_INTERVAL_MS = 60_000;

export const NotificationPermissionGate: React.FC = () => {
  const { enableBrowserNotifications } = useAppData();
  const { role } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isOpen, setIsOpen] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !window.isSecureContext) {
      setPermission('unsupported');
      setIsOpen(true);
      return;
    }

    const currentPermission = Notification.permission;
    setPermission(currentPermission);
    setIsOpen(currentPermission !== 'granted');
  }, []);

  useEffect(() => {
    const reminder = window.setInterval(() => {
      if ('Notification' in window && window.isSecureContext) {
        const currentPermission = Notification.permission;
        setPermission(currentPermission);
        setIsOpen(currentPermission !== 'granted');
      } else {
        setPermission('unsupported');
        setIsOpen(true);
      }
    }, REMINDER_INTERVAL_MS);

    return () => window.clearInterval(reminder);
  }, []);

  const handleEnable = async () => {
    if (!('Notification' in window) || !window.isSecureContext) {
      setPermission('unsupported');
      return;
    }

    setIsRequesting(true);
    const enabled = await enableBrowserNotifications();
    setPermission('Notification' in window ? Notification.permission : 'unsupported');
    setIsOpen(!enabled);
    setIsRequesting(false);
  };

  if (role && role !== 'resident') return null;

  if (!isOpen || permission === 'granted') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-md animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-gate-title"
        className="w-full max-w-md rounded-3xl border border-slate-200/90 bg-white/95 p-7 text-center shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 ring-1 ring-black/5 dark:ring-white/10 animate-fade-in-up"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600 shadow-md shadow-amber-500/15 dark:from-amber-500/20 dark:to-amber-500/10 dark:text-amber-300 dark:shadow-none">
          <BellRing className="h-8 w-8" />
        </div>
        <h1 id="notification-gate-title" className="mt-5 text-2xl font-extrabold text-slate-900 tracking-tight dark:text-white">
          Enable electricity notifications
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 font-sans">
          Please allow browser notifications to continue. We use them for outage, restoration, and emergency electricity updates for your selected location.
        </p>
        {permission === 'denied' && (
          <p className="mt-4 rounded-2xl bg-amber-50 border border-amber-200/80 px-3.5 py-2.5 text-xs leading-5 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800/80 dark:text-amber-200">
            Notifications are blocked in your browser. Enable them in this site&apos;s browser settings, then return here and try again. This reminder will appear again in one minute.
          </p>
        )}
        {permission === 'unsupported' && (
          <p className="mt-4 rounded-2xl bg-rose-50 border border-rose-200/80 px-3.5 py-2.5 text-xs leading-5 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800/80 dark:text-rose-200">
            Browser notifications require a secure connection. Open <strong>http://localhost:5173</strong> on this computer, or deploy this site with HTTPS.
          </p>
        )}
        <button
          type="button"
          onClick={handleEnable}
          disabled={isRequesting || permission === 'unsupported'}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-4 py-3.5 font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          <ShieldCheck className="h-5 w-5" />
          {isRequesting ? 'Checking permission...' : 'Allow notifications to continue'}
        </button>
      </div>
    </div>
  );
};
