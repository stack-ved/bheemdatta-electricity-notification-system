import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  Outage,
  NotificationItem,
  NotificationPreferences,
  SavedLocation,
  ProblemReport,
  ProblemCategory,
  UserProfile,
} from '../types';

import { SAMPLE_REPORTS } from '../data/sampleReports';
import { useAuth } from './AuthContext';
import { notificationService, type DbNotification } from '../services/notificationService';
import { outageService, BHEEMDATTA_MUNICIPALITY_ID, type DbOutageRow } from '../services/outageService';
import { supabase } from '../lib/supabase';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface AppDataContextType {
  outages: Outage[];
  outagesLoading: boolean;
  refreshOutages: () => Promise<void>;
  addOutage: (outage: Outage) => void;
  savedLocations: SavedLocation[];
  addSavedLocation: (loc: SavedLocation) => void;
  removeSavedLocation: (id: string) => void;
  setPrimaryLocation: (id: string) => void;
  preferences: NotificationPreferences;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  subscribedOutageIds: string[];
  toggleSubscribeOutage: (outageId: string) => boolean;
  notifications: NotificationItem[];
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  triggerTestNotification: () => void;
  enableBrowserNotifications: () => Promise<boolean>;
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  // Problem Reports State
  reports: ProblemReport[];
  addReport: (report: ProblemReport) => void;
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  checkDuplicateReport: (wardId: number, problemType: ProblemCategory) => ProblemReport | null;
}

const DEFAULT_SAVED_LOCATIONS: SavedLocation[] = [
  {
    id: 'loc-03-01',
    nameEn: 'Naulakhet',
    nameNe: 'नौलाखेत',
    wardNumber: 3,
    isPrimary: true,
  },
  {
    id: 'loc-04-01',
    nameEn: 'Mahendranagar Bazaar',
    nameNe: 'महेन्द्रनगर बजार',
    wardNumber: 4,
    isPrimary: false,
  },
];

const DEFAULT_PREFERENCES: NotificationPreferences = {
  websiteNotifications: true,
  browserNotifications: true,
  emailNotifications: false,
  scheduledOutages: true,
  activeOutages: true,
  electricityRestored: true,
  importantAnnouncements: true,
  soundAlerts: true,
};

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    outageId: 'outage-2026-001',
    titleEn: 'Scheduled Outage Reminder for Tomorrow',
    titleNe: 'भोलिको निर्धारित विद्युत अवरोधको पूर्व सूचना',
    messageEn: 'Power interruption scheduled for Naulakhet, Ward 03 tomorrow from 10:00 AM to 2:00 PM for feeder upgrade.',
    messageNe: 'वडा नं ०३ नौलाखेत क्षेत्रमा भोलि बिहान १०:०० बजेदेखि दिउँसो २:०० बजेसम्म फिडर मर्मतका लागि बत्ती जानेछ।',
    type: 'SCHEDULED',
    timestamp: '2026-09-06T16:45:00+05:45',
    read: false,
    wardNumber: 3,
  },
  {
    id: 'notif-2',
    outageId: 'outage-2026-002',
    titleEn: 'Emergency Outage Alert: Ward 02 Katan',
    titleNe: 'आकस्मिक विद्युत अवरोध: वडा नं २ कटान',
    messageEn: 'Conductor line tripping reported at Ward 02. NEA repair crew is on-site. Estimated restoration by 6:45 PM.',
    messageNe: 'वडा नं ०२ मा हावाहुरीले तार चुँडिएर बत्ती गएको छ। मर्मत टोली खटिएको र ६:४५ बजेसम्म बिजुली आउने अनुमान छ।',
    type: 'ACTIVE',
    timestamp: '2026-09-06T15:35:00+05:45',
    read: true,
    wardNumber: 2,
  },
  {
    id: 'notif-3',
    outageId: 'outage-2026-004',
    titleEn: 'Power Restored: Ward 05 Gobariya',
    titleNe: 'विद्युत सुचारु भयो: वडा नं ५ गोबरिया',
    messageEn: 'Maintenance completed safely. Power supply to Gobariya & Aithpur has been fully restored.',
    messageNe: 'मर्मत कार्य सम्पन्न भई गोबरिया तथा ऐठपुर क्षेत्रमा विद्युत आपूर्ति पूर्ण रूपमा सुचारु भएको छ।',
    type: 'RESTORED',
    timestamp: '2026-09-06T11:42:00+05:45',
    read: true,
    wardNumber: 5,
  },
];

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, wardNumber, municipalityId, permanentAddress, profileLoading, hasCompletePermanentAddress } = useAuth();

  // Outages live database state
  const [outages, setOutages] = useState<Outage[]>([]);
  const [outagesLoading, setOutagesLoading] = useState<boolean>(true);

  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(() => {
    try {
      const saved = localStorage.getItem('bheemdatta_locations');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_SAVED_LOCATIONS;
  });

  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    try {
      const saved = localStorage.getItem('bheemdatta_preferences');
      if (saved) return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_PREFERENCES;
  });

  const [subscribedOutageIds, setSubscribedOutageIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bheemdatta_subscribed_outages');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem('bheemdatta_notifs');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_NOTIFICATIONS;
  });

  const [reports, setReports] = useState<ProblemReport[]>(() => {
    try {
      const saved = localStorage.getItem('bheemdatta_reports');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return SAMPLE_REPORTS;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('bheemdatta_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      id: 'user_resident_01',
      name: 'Resident',
      phone: '9848712345',
      email: 'resident@bheemdatta.np',
      wardNumber: 3,
      role: 'resident',
      isLoggedIn: true,
    };
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Purge any stale mock data in localStorage on initial startup
  useEffect(() => {
    try {
      const cached = localStorage.getItem('bheemdatta_outages');
      if (cached && (cached.includes('outage-2026-001') || cached.includes('SAMPLE_OUTAGES'))) {
        localStorage.removeItem('bheemdatta_outages');
      }
    } catch {
      // ignore
    }
  }, []);

  const mapDatabaseNotification = (notification: DbNotification): NotificationItem => ({
    id: notification.id,
    noticeId: notification.related_notice_id ?? undefined,
    outageId: notification.related_outage_id ?? undefined,
    titleEn: notification.title,
    titleNe: notification.title,
    messageEn: notification.message,
    messageNe: notification.message,
    type: notification.notification_type.toUpperCase() as NotificationItem['type'],
    timestamp: notification.created_at,
    read: notification.is_read,
    wardNumber: notification.ward_number,
  });

  /**
   * Fetch outages with targeting based on user role and resident ward
   */
  const fetchOutages = useCallback(async () => {
    // Avoid race condition: do not run query before resident profile finishes loading
    if (user && role === 'resident' && profileLoading) {
      return;
    }

    setOutagesLoading(true);
    const targetMunicipalityId = municipalityId || BHEEMDATTA_MUNICIPALITY_ID;
    const targetWardNumber = hasCompletePermanentAddress ? wardNumber : null;

    // Development logging as requested in requirement 9
    console.log('[Outages] Current Auth & Targeting State:', {
      userId: user?.id,
      role,
      municipalityId: targetMunicipalityId,
      wardNumber: targetWardNumber,
      profileLoading,
    });

    try {
      let res;
      if (user && role === 'resident') {
        // Strict resident targeting: municipality_id = resident.municipality_id AND (is_municipality_wide = true OR ward_number = resident.ward_number)
        res = await outageService.getOutagesForResident(targetMunicipalityId, targetWardNumber);
      } else if (user && role === 'municipality_admin') {
        // Admin sees all outages in municipality across all 19 wards
        res = await outageService.getOutagesForAdmin(targetMunicipalityId);
      } else {
        // Unauthenticated visitor
        res = await outageService.getOutages(targetMunicipalityId);
      }

      if (res.error) {
        console.error('[Outages] Query error:', res.error);
        return;
      }

      const rows = (res.data ?? []) as DbOutageRow[];
      const mapped = rows.map(outageService.mapDbOutageToAppOutage);

      console.log('[Outages] Query result count:', mapped.length);
      setOutages(mapped);
    } catch (err) {
      console.error('[Outages] Unexpected query failure:', err);
    } finally {
      setOutagesLoading(false);
    }
  }, [user, role, wardNumber, municipalityId, profileLoading, hasCompletePermanentAddress]);

  // Fetch outages when user, role, wardNumber, or profileLoading updates
  useEffect(() => {
    void fetchOutages();
  }, [fetchOutages]);

  // Supabase Realtime Subscription for public.outages
  useEffect(() => {
    console.log('[Outages] Setting up realtime subscription for public.outages...');
    const channel = supabase
      .channel('public:outages-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'outages' },
        (payload) => {
          console.log('[Outages] Realtime event received:', payload.eventType, {
            newRecord: payload.new,
            oldRecord: payload.old,
          });
          // Re-fetch through resident/admin targeting logic so records are strictly filtered
          void fetchOutages();
        }
      )
      .subscribe((status) => {
        console.log('[Outages] Realtime subscription status:', status);
      });

    return () => {
      console.log('[Outages] Cleaning up realtime subscription');
      void supabase.removeChannel(channel);
    };
  }, [fetchOutages]);

  // Notifications subscription for resident
  useEffect(() => {
    if (!user || role !== 'resident' || profileLoading) return;
    if (!preferences.websiteNotifications) {
      setNotifications([]);
      return;
    }

    let active = true;
    const channel = notificationService.subscribe(user.id, (notification) => {
      if (!active) return;
      const item = mapDatabaseNotification(notification);
      if (item.wardNumber !== 0 && (!hasCompletePermanentAddress || item.wardNumber !== wardNumber)) return;
      setNotifications((current) => [item, ...current.filter((existing) => existing.id !== item.id)]);

      if (preferences.browserNotifications && 'Notification' in window && Notification.permission === 'granted') {
        const browserNotification = new Notification(`⚡ ${item.titleEn}`, {
          body: `${item.messageEn} (${item.wardNumber === 0 ? 'Municipality-wide' : `Ward ${item.wardNumber}`})`,
          tag: item.id,
        });
        browserNotification.onclick = () => {
          window.focus();
          window.location.assign(item.noticeId ? '/alerts' : item.outageId ? `/outages/${item.outageId}` : '/alerts');
        };
      }
    });

    void notificationService.listForUser(user.id).then(({ data, error }) => {
      if (active && !error && data) {
        setNotifications(data
          .map(mapDatabaseNotification)
          .filter((item) => item.wardNumber === 0 || (hasCompletePermanentAddress && item.wardNumber === wardNumber)));
      }
    });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user, role, profileLoading, hasCompletePermanentAddress, wardNumber, preferences.websiteNotifications, preferences.browserNotifications]);

  // Local storage persistence for user data and preferences
  useEffect(() => {
    localStorage.setItem('bheemdatta_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem('bheemdatta_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('bheemdatta_locations', JSON.stringify(savedLocations));
  }, [savedLocations]);

  useEffect(() => {
    localStorage.setItem('bheemdatta_preferences', JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    localStorage.setItem('bheemdatta_subscribed_outages', JSON.stringify(subscribedOutageIds));
  }, [subscribedOutageIds]);

  useEffect(() => {
    localStorage.setItem('bheemdatta_notifs', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (!user || role !== 'resident') return;
    void notificationService.getPreferences(user.id).then(({ data }) => {
      if (!data) return;
      setPreferences((current) => ({
        ...current,
        websiteNotifications: data.website_notifications,
        browserNotifications: data.browser_notifications,
        emailNotifications: data.email_notifications,
      }));
    });
  }, [user, role]);

  const showToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const enableBrowserNotifications = async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const enabled = (await Notification.requestPermission()) === 'granted';
    if (enabled && user && role === 'resident') {
      setPreferences((current) => ({ ...current, browserNotifications: true }));
      void notificationService.savePreferences(user.id, { browser_notifications: true });
      if (hasCompletePermanentAddress && wardNumber) void notificationService.enableWebPush(user.id, wardNumber);
    }
    return enabled;
  };

  useEffect(() => {
    if (!user || role !== 'resident' || !hasCompletePermanentAddress || !wardNumber || !preferences.browserNotifications) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      void notificationService.enableWebPush(user.id, wardNumber);
    }
  }, [user, role, wardNumber, hasCompletePermanentAddress, preferences.browserNotifications]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addOutage = (outage: Outage) => {
    setOutages((prev) => [outage, ...prev]);
    // Also create an automatic notification
    const newNotif: NotificationItem = {
      id: `notif-auto-${Date.now()}`,
      outageId: outage.id,
      titleEn: `New Notice: ${outage.titleEn}`,
      titleNe: `नयाँ सूचना: ${outage.titleNe}`,
      messageEn: `Affecting Ward ${outage.wards.join(', ')} (${outage.affectedLocations.map((l) => l.nameEn).join(', ')}). ${outage.reasonEn}`,
      messageNe: `प्रभावित वडा: ${outage.wards.join(', ')} (${outage.affectedLocations.map((l) => l.nameNe).join(', ')}). ${outage.reasonNe}`,
      type: outage.status,
      timestamp: new Date().toISOString(),
      read: false,
      wardNumber: outage.wards[0],
    };
    setNotifications((prev) => [newNotif, ...prev]);
    if (
      'Notification' in window &&
      Notification.permission === 'granted' &&
      savedLocations.some((location) => outage.wards.includes(location.wardNumber))
    ) {
      new Notification(newNotif.titleEn, { body: newNotif.messageEn, tag: newNotif.id });
    }
    showToast({
      type: 'success',
      title: 'New Outage Notice Published',
      message: `${outage.titleEn} dispatched to Ward ${outage.wards.join(', ')}.`,
    });
  };

  // Synchronize resident savedLocations with verified permanent address
  useEffect(() => {
    if (!user || role !== 'resident' || !hasCompletePermanentAddress || !wardNumber) return;

    setSavedLocations((current) => {
      const permanentLocationId = `perm-ward-${wardNumber}`;
      const existing = current.find((l) => l.id === permanentLocationId);
      if (existing && existing.isPrimary && current.length === 1) return current;

      const permanentItem: SavedLocation = {
        id: permanentLocationId,
        nameEn: `Ward ${wardNumber} (${permanentAddress || 'Registered Location'})`,
        nameNe: `वडा नं. ${wardNumber} (${permanentAddress || 'दर्ता भएको स्थान'})`,
        wardNumber,
        isPrimary: true,
      };

      return [permanentItem];
    });
  }, [user, role, hasCompletePermanentAddress, wardNumber, permanentAddress]);

  const addSavedLocation = (loc: SavedLocation) => {
    if (user && role === 'resident' && hasCompletePermanentAddress) {
      showToast({
        type: 'info',
        title: 'Permanent Address Locked',
        message: `Your notifications are permanently locked to Ward ${wardNumber}. Request an address correction from your dashboard to change it.`,
      });
      return;
    }
    setSavedLocations((prev) => {
      const exists = prev.some((item) => item.id === loc.id);
      if (exists) return prev;
      return [...prev, loc];
    });
    showToast({
      type: 'success',
      title: 'Location Added',
      message: `${loc.nameEn} (Ward ${loc.wardNumber}) added to your alert locations.`,
    });
  };

  const removeSavedLocation = (id: string) => {
    if (user && role === 'resident' && hasCompletePermanentAddress) {
      showToast({
        type: 'warning',
        title: 'Cannot Remove Address',
        message: `Your permanent registered ward (Ward ${wardNumber}) cannot be removed.`,
      });
      return;
    }
    setSavedLocations((prev) => {
      if (prev.length <= 1) return prev; // Keep at least one
      return prev.filter((loc) => loc.id !== id);
    });
  };

  const setPrimaryLocation = (id: string) => {
    if (user && role === 'resident' && hasCompletePermanentAddress) {
      showToast({
        type: 'warning',
        title: 'Cannot Change Primary Ward',
        message: `Your primary notification location is locked to your permanent registered ward (Ward ${wardNumber}).`,
      });
      return;
    }
    setSavedLocations((prev) =>
      prev.map((loc) => ({
        ...loc,
        isPrimary: loc.id === id,
      }))
    );
  };

  const updatePreferences = (newPrefs: Partial<NotificationPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...newPrefs }));
    if (user && role === 'resident') {
      void notificationService.savePreferences(user.id, {
        website_notifications: newPrefs.websiteNotifications,
        browser_notifications: newPrefs.browserNotifications,
        email_notifications: newPrefs.emailNotifications,
      });
    }
    showToast({
      type: 'info',
      title: 'Preferences Updated',
      message: 'Your alert delivery preferences were saved.',
    });
  };

  const toggleSubscribeOutage = (outageId: string): boolean => {
    const isSubscribed = subscribedOutageIds.includes(outageId);
    if (isSubscribed) {
      setSubscribedOutageIds((prev) => prev.filter((id) => id !== outageId));
      showToast({
        type: 'info',
        title: 'Unsubscribed',
        message: 'You will no longer receive direct alerts for this outage.',
      });
      return false;
    } else {
      setSubscribedOutageIds((prev) => [...prev, outageId]);
      showToast({
        type: 'success',
        title: 'Subscribed to Outage Updates',
        message: 'You will receive instant notifications when this outage status changes or power is restored.',
      });
      return true;
    }
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) => prev.map((notification) => notification.id === notificationId ? { ...notification, read: true } : notification));
    if (user && role === 'resident') void notificationService.markRead(user.id, notificationId);
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (user && role === 'resident') void notificationService.markAllRead(user.id);
  };

  const triggerTestNotification = () => {
    const testItem: NotificationItem = {
      id: `test-${Date.now()}`,
      titleEn: '⚡ Electricity Restored Alert (Simulated)',
      titleNe: '⚡ विद्युत सुचारु भयो (परीक्षण सूचना)',
      messageEn: 'Power supply has been successfully re-energized in Naulakhet, Ward No. 03. All 11kV lines are normal.',
      messageNe: 'वडा नं ०३ नौलाखेत क्षेत्रमा विद्युत आपूर्ति पूर्ण रूपमा सुचारु भएको छ। ११ केभी लाइन सामान्य छ।',
      type: 'RESTORED',
      timestamp: new Date().toISOString(),
      read: false,
      wardNumber: 3,
    };
    setNotifications((prev) => [testItem, ...prev]);
    showToast({
      type: 'success',
      title: 'Simulated Push Alert Received',
      message: testItem.messageEn,
    });
  };

  const addReport = (report: ProblemReport) => {
    setReports((prev) => [report, ...prev]);

    // Also push a notification into resident's notification history
    const reportNotif: NotificationItem = {
      id: `notif-rep-${Date.now()}`,
      titleEn: `Report ${report.report_number} Received`,
      titleNe: `रिपोर्ट ${report.report_number} दर्ता भयो`,
      messageEn: `Your report for ${report.problem_type.replace('_', ' ')} at Ward ${report.ward_id} is under review by NEA technical dispatch.`,
      messageNe: `वडा नं ${report.ward_id} मा दर्ता गरिएको समस्या प्राधिकरण प्राविधिक टोलीको समीक्षामा छ।`,
      type: 'ANNOUNCEMENT',
      timestamp: new Date().toISOString(),
      read: false,
      wardNumber: report.ward_id,
    };
    setNotifications((prev) => [reportNotif, ...prev]);

    showToast({
      type: 'success',
      title: 'Report Submitted',
      message: `Report ${report.report_number} recorded with live photo and verified GPS.`,
    });
  };

  const checkDuplicateReport = (wardId: number, problemType: ProblemCategory): ProblemReport | null => {
    return reports.find(
      (r) =>
        r.ward_id === wardId &&
        r.problem_type === problemType &&
        r.status !== 'RESOLVED' &&
        r.status !== 'REJECTED'
    ) || null;
  };

  return (
    <AppDataContext.Provider
      value={{
        outages,
        outagesLoading,
        refreshOutages: fetchOutages,
        addOutage,
        savedLocations,
        addSavedLocation,
        removeSavedLocation,
        setPrimaryLocation,
        preferences,
        updatePreferences,
        subscribedOutageIds,
        toggleSubscribeOutage,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        triggerTestNotification,
        enableBrowserNotifications,
        toasts,
        showToast,
        removeToast,
        reports,
        addReport,
        currentUser,
        setCurrentUser,
        checkDuplicateReport,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = (): AppDataContextType => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
