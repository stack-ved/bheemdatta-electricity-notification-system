import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Building2,
  Check,
  CheckCircle,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MapPinned,
  Maximize2,
  Menu,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { outageService, BHEEMDATTA_MUNICIPALITY_ID, type CreateOutageInput } from '../services/outageService';
import { notificationService, summarizePublishAndDispatch, summarizeDelivery } from '../services/notificationService';
import { AddressCorrectionQueue } from '../components/admin/AddressCorrectionQueue';
import { AdminElectricityNoticeForm } from '../components/admin/AdminElectricityNoticeForm';
import { reportService } from '../services/reportService';
import { WARDS } from '../data/locationsData';
import type { NotificationDeliveryLog, ProblemReport, ReportStatus } from '../types';
import {
  toLocalDatetimeInputString,
  getMinimumEndDatetime,
  validateOutageDates,
} from '../utils/datetimeValidation';

type Section = 'dashboard' | 'reports' | 'outages' | 'wards' | 'deliveries' | 'address_corrections' | 'settings';

interface OutageRecord {
  id: string;
  title_en: string | null;
  title_np: string | null;
  reason_en: string | null;
  reason_np: string | null;
  affected_area: string | null;
  start_time: string | null;
  expected_end_time: string | null;
  actual_end_time?: string | null;
  status: string | null;
  priority: string | null;
  is_municipality_wide: boolean | null;
  ward_number: number | null;
  created_at: string;
  outage_wards?: { ward_number: number }[];
}

const REPORT_STATUSES: { value: ReportStatus; label: string }[] = [
  { value: 'SUBMITTED', label: 'Submitted / Pending Review' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ASSIGNED', label: 'Assigned to Field Crew' },
  { value: 'IN_PROGRESS', label: 'In Progress (Repair Ongoing)' },
  { value: 'RESOLVED', label: 'Resolved (Power Restored / Fixed)' },
  { value: 'REJECTED', label: 'Rejected / Invalid Report' },
];

const OUTAGE_STATUSES = [
  { value: 'scheduled', label: 'Scheduled Maintenance' },
  { value: 'active', label: 'Active Interruption' },
  { value: 'restoration', label: 'Restoration in Progress' },
  { value: 'restored', label: 'Restored / Normal' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'high', label: 'High Priority' },
  { value: 'emergency', label: 'Emergency Priority' },
];

const formatStatus = (value: string | null | undefined) => {
  if (!value) return 'Pending';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getStatusBadgeClass = (value: string | null | undefined) => {
  const status = (value ?? '').toLowerCase();
  if (['resolved', 'restored'].includes(status)) {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  }
  if (['in_progress', 'active', 'emergency', 'high'].includes(status)) {
    return 'bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800';
  }
  if (['submitted', 'scheduled'].includes(status)) {
    return 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  }
  if (['rejected', 'cancelled'].includes(status)) {
    return 'bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
  }
  return 'bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800';
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Not specified';
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return value;
  }
};

export const AdminDashboardPage: React.FC = () => {
  const { user, municipalityId, signOut } = useAuth();
  const { showToast } = useAppData();

  const [section, setSection] = useState<Section>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Data states
  const [reports, setReports] = useState<ProblemReport[]>([]);
  const [outages, setOutages] = useState<OutageRecord[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<NotificationDeliveryLog[]>([]);
  const [residentProfiles, setResidentProfiles] = useState<{ id: string; ward_number: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingOutagePublicationId, setPendingOutagePublicationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Report filter states
  const [reportSearch, setReportSearch] = useState('');
  const [reportWardFilter, setReportWardFilter] = useState<string>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('all');
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('all');

  // Report modal state
  const [selectedReport, setSelectedReport] = useState<ProblemReport | null>(null);
  const [statusUpdateVal, setStatusUpdateVal] = useState<ReportStatus>('UNDER_REVIEW');
  const [adminNoteVal, setAdminNoteVal] = useState('');
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
  }, [selectedReport?.id, selectedReport?.photo_url]);

  // Outage form states
  const [outageForm, setOutageForm] = useState({
    title_en: '',
    title_np: '',
    reason_en: '',
    reason_np: '',
    affected_area: '',
    start_time: '',
    expected_end_time: '',
    priority: 'medium',
    status: 'scheduled',
    is_municipality_wide: false,
    selectedWards: [3] as number[],
  });
  const [outageDateError, setOutageDateError] = useState<string | null>(null);

  // Outage list filter
  const [outageWardFilter, setOutageWardFilter] = useState<string>('all');
  const [outageStatusFilter, setOutageStatusFilter] = useState<string>('all');

  // Pre-Publish Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [estimatedRecipientCount, setEstimatedRecipientCount] = useState<number>(0);
  const [isCalculatingRecipients, setIsCalculatingRecipients] = useState(false);

  // Settings
  const [resetSentMessage, setResetSentMessage] = useState<string | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const targetMunicipalityId = municipalityId || BHEEMDATTA_MUNICIPALITY_ID;
      const [reportsRes, outagesRes, deliveriesRes, residentsRes] = await Promise.all([
        reportService.getAllReports(),
        outageService.getOutagesForAdmin(targetMunicipalityId),
        notificationService.getDeliveryLogs(),
        supabase.from('profiles').select('id, ward_number').eq('role', 'resident').eq('is_active', true),
      ]);

      if (reportsRes.error) console.error('Reports load error:', reportsRes.error);
      if (outagesRes.error) console.error('Outages load error:', outagesRes.error);

      setReports(reportsRes.data ?? []);
      setOutages((outagesRes.data ?? []) as OutageRecord[]);
      setDeliveryLogs(deliveriesRes.data ?? []);
      setResidentProfiles(residentsRes.data ?? []);
    } catch (err: unknown) {
      console.error('Data load exception:', err);
      setError(err instanceof Error ? err.message : 'Failed to load municipality records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAllData();
  }, [municipalityId]);

  // Realtime subscription for admin outages
  useEffect(() => {
    const channel = outageService.subscribeToOutages((payload) => {
      console.log('[Admin Outages Realtime] Event:', payload.eventType);
      void loadAllData();
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [municipalityId]);

  // Compute stats across municipality
  const stats = useMemo(() => {
    const totalReports = reports.length;
    const pendingReports = reports.filter((r) => String(r.status ?? '').toUpperCase() === 'SUBMITTED').length;
    const inProgressReports = reports.filter((r) => ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS'].includes(String(r.status ?? '').toUpperCase())).length;
    const resolvedReports = reports.filter((r) => String(r.status ?? '').toUpperCase() === 'RESOLVED').length;
    const activeOutages = outages.filter((o) => (o.status ?? '').toLowerCase() === 'active').length;
    const scheduledOutages = outages.filter((o) => (o.status ?? '').toLowerCase() === 'scheduled').length;
    const totalResidents = residentProfiles.length;

    return {
      totalReports,
      pendingReports,
      inProgressReports,
      resolvedReports,
      activeOutages,
      scheduledOutages,
      totalResidents,
    };
  }, [reports, outages, residentProfiles]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();

    return reports.filter((report) => {
      const wardMatch =
        reportWardFilter === 'all' || String(report.ward_id ?? '') === reportWardFilter;
      const statusMatch =
        reportStatusFilter === 'all' ||
        String(report.status ?? '').toLowerCase() === reportStatusFilter.toLowerCase();
      const typeMatch =
        reportTypeFilter === 'all' ||
        String(report.problem_type ?? '').toLowerCase() === reportTypeFilter.toLowerCase();

      const searchContent = [
        report.report_number,
        report.problem_type,
        report.description,
        report.location_name ?? '',
        report.user_name ?? '',
        report.user_phone ?? '',
      ]
        .join(' ')
        .toLowerCase();

      const searchMatch = query.length === 0 || searchContent.includes(query);
      return wardMatch && statusMatch && typeMatch && searchMatch;
    });
  }, [reports, reportSearch, reportWardFilter, reportStatusFilter, reportTypeFilter]);

  // Filtered outages
  const filteredOutages = useMemo(() => {
    return outages.filter((outage) => {
      const statusMatch =
        outageStatusFilter === 'all' ||
        (outage.status ?? '').toLowerCase() === outageStatusFilter.toLowerCase();

      if (outageWardFilter === 'all') return statusMatch;

      const wardNum = Number(outageWardFilter);
      if (outage.is_municipality_wide) return statusMatch;

      const affectedWards = (outage.outage_wards ?? []).map((w) => w.ward_number);
      if (outage.ward_number) affectedWards.push(outage.ward_number);

      const wardMatch = affectedWards.includes(wardNum);
      return statusMatch && wardMatch;
    });
  }, [outages, outageWardFilter, outageStatusFilter]);

  // Ward analytics overview
  const wardSummaries = useMemo(() => {
    return WARDS.map((ward) => {
      const wardReports = reports.filter((r) => Number(r.ward_id) === ward.number);
      const total = wardReports.length;
      const pending = wardReports.filter((r) => String(r.status ?? '').toUpperCase() === 'SUBMITTED').length;
      const inProgress = wardReports.filter((r) => ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS'].includes(String(r.status ?? '').toUpperCase())).length;
      const resolved = wardReports.filter((r) => String(r.status ?? '').toUpperCase() === 'RESOLVED').length;
      const activeOutageCount = outages.filter((o) => {
        if ((o.status ?? '').toLowerCase() !== 'active') return false;
        if (o.is_municipality_wide) return true;
        const wards = (o.outage_wards ?? []).map((w) => w.ward_number);
        if (o.ward_number) wards.push(o.ward_number);
        return wards.includes(ward.number);
      }).length;
      const residentCount = residentProfiles.filter((p) => p.ward_number === ward.number).length;
      const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;

      return {
        wardNumber: ward.number,
        nameEn: ward.nameEn,
        nameNe: ward.nameNe,
        total,
        pending,
        inProgress,
        resolved,
        activeOutages: activeOutageCount,
        residentCount,
        resolutionRate,
      };
    });
  }, [reports, outages, residentProfiles]);

  // Handle Ward selection toggles
  const handleToggleWard = (wardNum: number) => {
    setOutageForm((prev) => {
      const current = prev.selectedWards;
      if (current.includes(wardNum)) {
        if (current.length === 1) return prev; // Keep at least one
        return { ...prev, selectedWards: current.filter((w) => w !== wardNum), is_municipality_wide: false };
      } else {
        const next = [...current, wardNum].sort((a, b) => a - b);
        return { ...prev, selectedWards: next };
      }
    });
  };

  const handleToggleMunicipalityWide = (checked: boolean) => {
    setOutageForm((prev) => ({
      ...prev,
      is_municipality_wide: checked,
      selectedWards: checked ? WARDS.map((w) => w.number) : [3],
    }));
  };

  // Open confirmation modal with estimated recipient count
  const handleInitiatePublish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!outageForm.title_en.trim() || !outageForm.reason_en.trim()) {
      showToast({
        type: 'error',
        title: 'Incomplete Notice',
        message: 'Please complete the English title and description before publishing.',
      });
      return;
    }

    const validation = validateOutageDates(
      outageForm.start_time,
      outageForm.expected_end_time,
      null,
      { isEdit: false, requireExpectedEndTime: true }
    );

    if (!validation.isValid) {
      setOutageDateError(validation.error);
      showToast({
        type: 'error',
        title: 'Invalid Date / Time',
        message: validation.error || 'Please correct the outage dates.',
      });
      return;
    }
    setOutageDateError(null);

    setIsCalculatingRecipients(true);
    setShowConfirmModal(true);

    try {
      const { count } = await notificationService.getEligibleRecipientCount(
        outageForm.selectedWards,
        outageForm.is_municipality_wide,
        municipalityId || BHEEMDATTA_MUNICIPALITY_ID
      );
      setEstimatedRecipientCount(count);
    } catch {
      setEstimatedRecipientCount(0);
    } finally {
      setIsCalculatingRecipients(false);
    }
  };

  // Final confirmation to publish outage notice
  const handleConfirmPublish = async () => {
    const validation = validateOutageDates(
      outageForm.start_time,
      outageForm.expected_end_time,
      null,
      { isEdit: false, requireExpectedEndTime: true }
    );

    if (!validation.isValid) {
      setOutageDateError(validation.error);
      showToast({
        type: 'error',
        title: 'Invalid Date / Time',
        message: validation.error || 'Please correct the outage dates.',
      });
      setShowConfirmModal(false);
      return;
    }

    setSaving(true);
    setShowConfirmModal(false);

    try {
      const input: CreateOutageInput = {
        title_en: outageForm.title_en.trim(),
        title_np: outageForm.title_np.trim() || undefined,
        reason_en: outageForm.reason_en.trim(),
        reason_np: outageForm.reason_np.trim() || undefined,
        affected_area: outageForm.affected_area.trim() || undefined,
        start_time: outageForm.start_time,
        expected_end_time: outageForm.expected_end_time || undefined,
        priority: outageForm.priority,
        status: outageForm.status,
        is_municipality_wide: outageForm.is_municipality_wide,
        ward_numbers: outageForm.is_municipality_wide ? [] : outageForm.selectedWards,
        municipality_id: municipalityId || BHEEMDATTA_MUNICIPALITY_ID,
        created_by: user?.id,
      };

      const { data: outage, error: createError } = await outageService.createOutage(input);

      if (createError || !outage) {
        throw new Error(createError?.message || 'Failed to save electricity outage notice');
      }

      const dispatchResult = await notificationService.publishAndDispatch(outage.id, 'outage');
      const dispatchSummary = summarizePublishAndDispatch(dispatchResult);
      showToast({
        type: dispatchResult.published ? dispatchSummary.type : 'warning',
        title: dispatchResult.published ? 'Outage published' : 'Outage saved but not published',
        message: dispatchResult.published
          ? dispatchSummary.message
          : `Reference ${outage.id}. ${dispatchSummary.message}`,
      });
      setPendingOutagePublicationId(dispatchResult.published ? null : outage.id);

      // Reset form
      setOutageForm({
        title_en: '',
        title_np: '',
        reason_en: '',
        reason_np: '',
        affected_area: '',
        start_time: '',
        expected_end_time: '',
        priority: 'medium',
        status: 'scheduled',
        is_municipality_wide: false,
        selectedWards: [3],
      });
      setOutageDateError(null);

      await loadAllData();
    } catch (err: unknown) {
      console.error('Publish error:', err);
      showToast({
        type: 'error',
        title: 'Publishing Error',
        message: err instanceof Error ? err.message : 'Unable to dispatch notice.',
      });
    } finally {
      setSaving(false);
    }
  };

  const retryOutagePublication = async (outageId: string) => {
    if (saving) return;
    setSaving(true);
    const result = await notificationService.publishAndDispatch(outageId, 'outage');
    const summary = summarizePublishAndDispatch(result);
    showToast({
      type: result.published ? summary.type : 'warning',
      title: result.published ? 'Outage publication checked' : 'Outage still unpublished',
      message: result.published ? summary.message : `Reference ${outageId}. ${summary.message}`,
    });
    if (result.published) setPendingOutagePublicationId(null);
    await loadAllData();
    setSaving(false);
  };

  const handleRetryDelivery = async (outageId: string) => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await notificationService.dispatchDelivery(outageId, 'outage');
      const summary = summarizeDelivery(result);
      showToast({
        type: summary.type,
        title: 'Delivery Dispatched',
        message: summary.message,
      });
      await loadAllData();
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: 'Delivery Dispatch Failed',
        message: err instanceof Error ? err.message : 'Unable to dispatch delivery.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Update Outage Status
  const handleUpdateOutageStatus = async (outageId: string, nextStatus: string) => {
    try {
      const targetOutage = outages.find((o) => o.id === outageId);
      const isRestoring = ['restored', 'resolved'].includes(nextStatus.toLowerCase());
      const effectiveActualEndTime = isRestoring ? new Date().toISOString() : undefined;

      const { error: updateError } = await outageService.updateOutageStatus(
        outageId,
        nextStatus,
        effectiveActualEndTime,
        targetOutage?.start_time
      );
      if (updateError) throw updateError;

      showToast({
        type: 'success',
        title: 'Status Updated',
        message: `Outage notice status marked as ${formatStatus(nextStatus)}.`,
      });
      await loadAllData();
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: err instanceof Error ? err.message : 'Could not update status.',
      });
    }
  };

  // Delete Outage
  const handleDeleteOutage = async (outageId: string) => {
    if (!window.confirm('Are you sure you want to delete this electricity outage notice?')) return;

    try {
      const { error: delError } = await outageService.deleteOutage(outageId);
      if (delError) throw delError;

      showToast({
        type: 'info',
        title: 'Notice Deleted',
        message: 'The outage notice has been removed.',
      });
      await loadAllData();
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err instanceof Error ? err.message : 'Could not delete notice.',
      });
    }
  };

  // Update Problem Report
  const handleSaveReportUpdate = async () => {
    if (!selectedReport) return;
    setSaving(true);

    try {
      const officerName = user?.email?.split('@')[0] || 'Municipality Administrator';
      const updated = await reportService.updateReportStatus(
        selectedReport.id,
        statusUpdateVal,
        adminNoteVal,
        officerName
      );

      if (updated.error) throw updated.error;

      showToast({
        type: 'success',
        title: 'Report Updated',
        message: `Problem report ${selectedReport.report_number} marked as ${statusUpdateVal}.`,
      });

      setSelectedReport(null);
      await loadAllData();
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: err instanceof Error ? err.message : 'Could not save report update.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Password reset for admin
  const handleAdminPasswordReset = async () => {
    if (!user?.email) return;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (resetError) {
      showToast({ type: 'error', title: 'Reset Error', message: resetError.message });
    } else {
      setResetSentMessage(`Password reset link dispatched to ${user.email}`);
      showToast({ type: 'success', title: 'Reset Email Sent', message: 'Check your inbox.' });
    }
  };

  const navItems = [
    { id: 'dashboard' as Section, label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'reports' as Section, label: 'Manage Citizen Reports', icon: FileText, badge: stats.pendingReports },
    { id: 'outages' as Section, label: 'Outages & Notices', icon: Zap },
    { id: 'wards' as Section, label: '19 Wards Analytics', icon: Building2 },
    { id: 'deliveries' as Section, label: 'Delivery Tracking', icon: Send },
    { id: 'address_corrections' as Section, label: 'Address Corrections', icon: MapPinned },
    { id: 'settings' as Section, label: 'Admin Settings', icon: KeyRound },
  ];

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50/70 text-slate-800 dark:bg-slate-950 dark:text-slate-100 animate-fade-in">
      <div className="mx-auto flex max-w-[1580px] gap-6 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Sidebar Navigation */}
        <aside
          className={`${
            mobileMenuOpen ? 'fixed inset-4 z-40 block' : 'hidden'
          } w-72 shrink-0 rounded-3xl border border-slate-800/80 bg-slate-900/95 backdrop-blur-xl p-5 text-white shadow-2xl lg:sticky lg:top-6 lg:block lg:h-[calc(100vh-3.5rem)]`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-amber-400">
                <ShieldAlert className="h-3.5 w-3.5" />
                CENTRAL CONSOLE
              </div>
              <h2 className="mt-2 text-xl font-extrabold text-white tracking-tight">Bheemdatta Municipality</h2>
              <p className="text-xs text-slate-400">Central Electricity Administration</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 text-slate-400 hover:text-white lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-7 space-y-1.5 text-sm">
            {navItems.map(({ id, label: itemLabel, icon: Icon, badge: itemBadge }) => {
              const active = section === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSection(id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-semibold transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{itemLabel}</span>
                  </div>
                  {Boolean(itemBadge) && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        active ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      {itemBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto hidden border-t border-slate-800 pt-5 lg:block">
            <div className="rounded-2xl bg-slate-800/80 p-3 text-xs">
              <p className="font-semibold text-slate-300">Signed In As</p>
              <p className="truncate font-mono text-white">{user?.email}</p>
              <p className="mt-1 text-[11px] text-orange-400">Authority: All 19 Wards</p>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-rose-900/80 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 space-y-6">
          {/* Top Bar */}
          <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-orange-500">
                  Municipality Admin Portal
                </p>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
                  {section === 'dashboard' && 'Executive Oversight'}
                  {section === 'reports' && 'Citizen Problem Reports'}
                  {section === 'outages' && 'Electricity Outages & Notices'}
                  {section === 'wards' && '19 Wards Analytics & Coverage'}
                  {section === 'deliveries' && 'Notification Delivery Audit'}
                  {section === 'address_corrections' && 'Resident Address Corrections'}
                  {section === 'settings' && 'Administrator Settings'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => void loadAllData()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
                <span>Refresh Data</span>
              </button>

              <button
                type="button"
                onClick={() => setSection('outages')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-orange-400"
              >
                <Plus className="h-4 w-4" />
                <span>Create Outage Notice</span>
              </button>
            </div>
          </header>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {section === 'address_corrections' && <AddressCorrectionQueue />}

          {/* SECTION 1: DASHBOARD OVERVIEW */}
          {section === 'dashboard' && (
            <div className="space-y-6">
              {/* Metric Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Total Problem Reports', value: stats.totalReports, icon: FileText, color: 'text-blue-500', action: () => setSection('reports') },
                  { label: 'Pending Review', value: stats.pendingReports, icon: Clock3, color: 'text-amber-500', alert: stats.pendingReports > 0, action: () => { setReportStatusFilter('submitted'); setSection('reports'); } },
                  { label: 'Active Power Outages', value: stats.activeOutages, icon: Zap, color: 'text-rose-500', alert: stats.activeOutages > 0, action: () => { setOutageStatusFilter('active'); setSection('outages'); } },
                  { label: 'Registered Citizens', value: stats.totalResidents, icon: Users, color: 'text-emerald-500', action: () => setSection('wards') },
                ].map(({ label, value, icon: Icon, color, alert, action }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={action}
                    className="card-interactive rounded-3xl border border-slate-200/90 bg-white/90 p-5 text-left shadow-sm transition-all hover:shadow-lg dark:border-slate-800/90 dark:bg-slate-900/90 backdrop-blur-md cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className={`rounded-2xl bg-slate-100 p-3 dark:bg-slate-800 ${color} shadow-xs`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      {alert && (
                        <span className="animate-pulse rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-500">
                          ATTENTION
                        </span>
                      )}
                    </div>
                    <p className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                  </button>
                ))}
              </div>

              {/* Secondary Metrics Bar */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">In Progress Repairs</span>
                    <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-300">{stats.inProgressReports}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Reports currently assigned to technical crews.</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Resolved Issues</span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{stats.resolvedReports}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Successfully completed and verified problem reports.</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Scheduled Cutoffs</span>
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">{stats.scheduledOutages}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Upcoming planned grid maintenance interruptions.</p>
                </div>
              </div>

              {/* Two Column Section: Recent Reports & Active Outages */}
              <div className="grid gap-6 xl:grid-cols-2">
                {/* Recent Reports Table */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Problem Reports</h2>
                      <p className="text-xs text-slate-500">Live submissions from across all 19 wards</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSection('reports')}
                      className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline dark:text-orange-400"
                    >
                      View all ({reports.length})
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {reports.slice(0, 5).map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 transition hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-500">{report.report_number}</span>
                            <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                              Ward {report.ward_id}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {formatStatus(report.problem_type)}
                          </p>
                          <p className="truncate text-xs text-slate-500">{report.description}</p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${getStatusBadgeClass(report.status)}`}>
                            {formatStatus(report.status)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReport(report);
                              setStatusUpdateVal(report.status);
                              setAdminNoteVal(report.admin_notes ?? '');
                            }}
                            className="rounded-lg bg-slate-900 p-1.5 text-white transition hover:bg-orange-500 hover:text-slate-950 dark:bg-slate-700"
                            title="Manage Report"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {reports.length === 0 && (
                      <p className="py-8 text-center text-xs text-slate-500">No citizen problem reports registered yet.</p>
                    )}
                  </div>
                </div>

                {/* Published Outages Card */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Electricity Outage Notices</h2>
                      <p className="text-xs text-slate-500">Active and scheduled grid updates</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSection('outages')}
                      className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline dark:text-orange-400"
                    >
                      Manage notices
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {outages.slice(0, 5).map((outage) => {
                      const wardBadges = outage.is_municipality_wide
                        ? 'All 19 Wards (Municipality-wide)'
                        : (outage.outage_wards && outage.outage_wards.length > 0)
                        ? `Wards: ${outage.outage_wards.map((w) => w.ward_number).join(', ')}`
                        : `Ward: ${outage.ward_number ?? 'General'}`;

                      return (
                        <div
                          key={outage.id}
                          className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-900 dark:bg-orange-950 dark:text-orange-300">
                                {wardBadges}
                              </span>
                              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{outage.title_en}</h3>
                            </div>
                            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${getStatusBadgeClass(outage.status)}`}>
                              {formatStatus(outage.status)}
                            </span>
                          </div>

                          <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{outage.reason_en}</p>
                          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Start: {formatDate(outage.start_time)}</span>
                            <span>Est. Restoration: {formatDate(outage.expected_end_time)}</span>
                          </div>
                        </div>
                      );
                    })}

                    {outages.length === 0 && (
                      <p className="py-8 text-center text-xs text-slate-500">No outage notices currently published.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: MANAGE CITIZEN PROBLEM REPORTS */}
          {section === 'reports' && (
            <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Municipality Problem Reports</h2>
                <p className="text-xs text-slate-500">Filter, inspect, and update reports for all 19 wards of Bheemdatta Municipality.</p>
              </div>

              {/* Filters Bar */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    placeholder="Search by ID, name, phone..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-xs outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <select
                  value={reportWardFilter}
                  onChange={(e) => setReportWardFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="all">All Wards (1–19)</option>
                  {WARDS.map((w) => (
                    <option key={w.number} value={String(w.number)}>
                      Ward {w.number} ({w.nameEn})
                    </option>
                  ))}
                </select>

                <select
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="all">All Statuses</option>
                  {REPORT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>

                <select
                  value={reportTypeFilter}
                  onChange={(e) => setReportTypeFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="all">All Problem Types</option>
                  <option value="NO_ELECTRICITY">No Electricity / Total Outage</option>
                  <option value="DAMAGED_LINE">Damaged / Broken Line</option>
                  <option value="TRANSFORMER_PROBLEM">Transformer Problem</option>
                  <option value="DANGEROUS_WIRE">Dangerous Hanging Wire</option>
                  <option value="SPARKING_FIRE">Sparking / Pole Fire</option>
                  <option value="OTHER_ELECTRICITY">Other Electrical Fault</option>
                </select>
              </div>

              {/* Reports Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Report ID</th>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Problem</th>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Ward</th>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Citizen Details</th>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Location</th>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Status</th>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                    {filteredReports.map((report) => (
                      <tr key={report.id} className="align-top hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-mono font-bold text-slate-600 dark:text-slate-300">
                          {report.report_number}
                          <p className="mt-0.5 text-[10px] font-normal text-slate-400">
                            {formatDate(report.created_at)}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {formatStatus(report.problem_type)}
                          </p>
                          <p className="mt-1 max-w-xs text-slate-600 dark:text-slate-300">{report.description}</p>
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded-md bg-blue-100 px-2 py-0.5 font-bold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                            Ward {report.ward_id}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          <p className="font-semibold text-slate-900 dark:text-white">{report.user_name || 'Resident'}</p>
                          <p className="text-[11px] text-slate-500">{report.user_phone || 'No phone'}</p>
                        </td>

                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          <p className="font-medium">{report.location_name || 'GPS Point'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {Number(report.latitude).toFixed(4)}, {Number(report.longitude).toFixed(4)} (±{report.location_accuracy ?? 10}m)
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getStatusBadgeClass(report.status)}`}>
                            {formatStatus(report.status)}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReport(report);
                              setStatusUpdateVal(report.status);
                              setAdminNoteVal(report.admin_notes ?? '');
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-500 hover:text-slate-950 dark:bg-orange-500 dark:text-slate-950 dark:hover:bg-orange-400"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredReports.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                          No problem reports match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 3: ELECTRICITY OUTAGES & NOTICES */}
          {section === 'outages' && (
            <div className="space-y-6">
              {user?.id && (
                <AdminElectricityNoticeForm
                  municipalityId={municipalityId || BHEEMDATTA_MUNICIPALITY_ID}
                  createdBy={user.id}
                />
              )}
              {/* Outage Notice Creation Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    <Zap className="h-3.5 w-3.5" />
                    DISPATCH CONSOLE
                  </div>
                  <h2 className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">
                    Publish Electricity Outage Notice
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select target wards to dispatch Push and Email notifications to matching registered citizens.
                  </p>
                </div>

                <form onSubmit={handleInitiatePublish} className="mt-6 space-y-5">
                  {/* English & Nepali Titles */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-200">
                        Notice Title (English) *
                      </label>
                      <input
                        type="text"
                        required
                        value={outageForm.title_en}
                        onChange={(e) => setOutageForm({ ...outageForm, title_en: e.target.value })}
                        placeholder="e.g. Scheduled 11kV Feeder Line Maintenance"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-200">
                        Notice Title (Nepali)
                      </label>
                      <input
                        type="text"
                        value={outageForm.title_np}
                        onChange={(e) => setOutageForm({ ...outageForm, title_np: e.target.value })}
                        placeholder="उदा: ११ केभी फिडर लाइन मर्मत कार्य"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-sans"
                      />
                    </div>
                  </div>

                  {/* English & Nepali Reasons */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-200">
                        Reason & Description (English) *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={outageForm.reason_en}
                        onChange={(e) => setOutageForm({ ...outageForm, reason_en: e.target.value })}
                        placeholder="Provide details on the cause, repair activities, and affected equipment..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-200">
                        Reason & Description (Nepali)
                      </label>
                      <textarea
                        rows={3}
                        value={outageForm.reason_np}
                        onChange={(e) => setOutageForm({ ...outageForm, reason_np: e.target.value })}
                        placeholder="विद्युत अवरोधको कारण तथा मर्मत विवरण..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-sans"
                      />
                    </div>
                  </div>

                  {/* Dates & Affected Area */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-200">
                        Specific Affected Area / Toles
                      </label>
                      <input
                        type="text"
                        value={outageForm.affected_area}
                        onChange={(e) => setOutageForm({ ...outageForm, affected_area: e.target.value })}
                        placeholder="e.g. Naulakhet, Buspark, Bazaar Area"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-200">
                        Start Date / Time *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        min={toLocalDatetimeInputString(new Date())}
                        value={outageForm.start_time}
                        onChange={(e) => {
                          setOutageForm({ ...outageForm, start_time: e.target.value });
                          setOutageDateError(null);
                        }}
                        className={`w-full rounded-xl border bg-slate-50 px-3 py-2 text-xs outline-none focus:border-orange-400 dark:bg-slate-800 dark:text-white ${
                          outageDateError ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-200">
                        Expected Restoration Time *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        min={getMinimumEndDatetime(outageForm.start_time)}
                        value={outageForm.expected_end_time}
                        onChange={(e) => {
                          setOutageForm({ ...outageForm, expected_end_time: e.target.value });
                          setOutageDateError(null);
                        }}
                        className={`w-full rounded-xl border bg-slate-50 px-3 py-2 text-xs outline-none focus:border-orange-400 dark:bg-slate-800 dark:text-white ${
                          outageDateError ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                  </div>

                  {outageDateError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span>{outageDateError}</span>
                    </div>
                  )}

                  {/* Priority & Status */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-200">
                        Priority Level
                      </label>
                      <select
                        value={outageForm.priority}
                        onChange={(e) => setOutageForm({ ...outageForm, priority: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-200">
                        Initial Notice Status
                      </label>
                      <select
                        value={outageForm.status}
                        onChange={(e) => setOutageForm({ ...outageForm, status: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {OUTAGE_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* CRITICAL: AFFECTED WARD(S) SELECTION */}
                  <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-5 dark:border-orange-950 dark:bg-orange-950/20">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-orange-950 dark:text-orange-200">
                          Target Affected Wards (Strict Notification Targeting)
                        </h3>
                        <p className="text-xs text-orange-900/80 dark:text-orange-300/80">
                          Only residents associated with the selected wards will receive Push and Email alerts.
                        </p>
                      </div>

                      <label className="inline-flex items-center gap-2 rounded-xl border border-orange-300 bg-white px-3 py-2 text-xs font-bold text-orange-950 dark:border-orange-800 dark:bg-slate-900 dark:text-orange-200">
                        <input
                          type="checkbox"
                          checked={outageForm.is_municipality_wide}
                          onChange={(e) => handleToggleMunicipalityWide(e.target.checked)}
                          className="h-4 w-4 rounded accent-orange-500"
                        />
                        <span>All 19 Wards / Municipality-wide</span>
                      </label>
                    </div>

                    {/* 19 Ward Checkboxes Grid */}
                    <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10">
                      {WARDS.map((ward) => {
                        const isSelected = outageForm.is_municipality_wide || outageForm.selectedWards.includes(ward.number);
                        return (
                          <button
                            key={ward.number}
                            type="button"
                            onClick={() => handleToggleWard(ward.number)}
                            disabled={outageForm.is_municipality_wide}
                            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                              isSelected
                                ? 'border-orange-500 bg-orange-500 text-slate-950 shadow-xs'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            } ${outageForm.is_municipality_wide ? 'opacity-90' : ''}`}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                            <span>Ward {ward.number}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected Summary Notice */}
                    <div className="mt-4 flex items-center justify-between rounded-xl bg-white/80 p-3 text-xs dark:bg-slate-900/80">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {outageForm.is_municipality_wide
                            ? 'Target: All residents across Bheemdatta Municipality (Wards 1–19)'
                            : `Target: Residents of Ward ${outageForm.selectedWards.join(', ')}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-50 dark:from-orange-500 dark:to-orange-400 dark:text-slate-950"
                    >
                      <Send className="h-4 w-4" />
                      <span>Review & Publish Notice</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Previously Published Outages Management List */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Previously Published Outage Notices
                    </h2>
                    <p className="text-xs text-slate-500">Manage, update statuses, or cancel notices across all wards.</p>
                  </div>

                  <div className="flex gap-2.5">
                    <select
                      value={outageWardFilter}
                      onChange={(e) => setOutageWardFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="all">All Wards</option>
                      {WARDS.map((w) => (
                        <option key={w.number} value={String(w.number)}>Ward {w.number}</option>
                      ))}
                    </select>

                    <select
                      value={outageStatusFilter}
                      onChange={(e) => setOutageStatusFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="all">All Statuses</option>
                      {OUTAGE_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {filteredOutages.map((outage) => {
                    const wardScope = outage.is_municipality_wide
                      ? 'Municipality-wide (All 19 Wards)'
                      : (outage.outage_wards && outage.outage_wards.length > 0)
                      ? `Ward(s): ${outage.outage_wards.map((w) => w.ward_number).join(', ')}`
                      : `Ward ${outage.ward_number ?? 'General'}`;

                    return (
                      <div
                        key={outage.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/40"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                                {wardScope}
                              </span>
                              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${getStatusBadgeClass(outage.status)}`}>
                                {formatStatus(outage.status)}
                              </span>
                              <span className="text-xs text-slate-500">
                                Priority: {formatStatus(outage.priority)}
                              </span>
                            </div>

                            <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                              {outage.title_en}
                            </h3>
                            {outage.title_np && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 font-sans">{outage.title_np}</p>
                            )}

                            <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 max-w-3xl">
                              {outage.reason_en}
                            </p>
                            {outage.affected_area && (
                              <p className="mt-1 text-xs text-slate-500">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Specific Areas:</span> {outage.affected_area}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {pendingOutagePublicationId === outage.id && (
                              <button
                                type="button"
                                onClick={() => void retryOutagePublication(outage.id)}
                                disabled={saving}
                                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50"
                              >
                                Retry publication
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void handleRetryDelivery(outage.id)}
                              disabled={saving}
                              title="Retry email and web push delivery for this outage without republishing or duplicating in-app alerts"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                              <Send className="h-3 w-3 text-sky-500" />
                              <span>Retry Delivery</span>
                            </button>
                            <select
                              value={outage.status ?? 'scheduled'}
                              onChange={(e) => handleUpdateOutageStatus(outage.id, e.target.value)}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              {OUTAGE_STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => handleDeleteOutage(outage.id)}
                              className="rounded-lg border border-rose-200 p-1.5 text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40"
                              title="Delete Outage Notice"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-200/80 pt-3 text-xs text-slate-500 dark:border-slate-700/80">
                          <div>
                            <span>Start: <strong>{formatDate(outage.start_time)}</strong></span>
                            <span className="mx-2">|</span>
                            <span>Restoration: <strong>{formatDate(outage.expected_end_time)}</strong></span>
                          </div>
                          <span>Created {formatDate(outage.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}

                  {filteredOutages.length === 0 && (
                    <p className="py-12 text-center text-sm text-slate-500">No electricity outage notices match the filters.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: 19 WARDS ANALYTICS */}
          {section === 'wards' && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Bheemdatta Municipality — 19 Wards Operational Overview
                </h2>
                <p className="text-xs text-slate-500">
                  Comprehensive breakdown of problem reports, active grid outages, and citizen participation per ward.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {wardSummaries.map((w) => (
                    <div
                      key={w.wardNumber}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/60"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-orange-500 px-2.5 py-0.5 text-xs font-extrabold text-slate-950">
                          Ward {w.wardNumber}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {w.nameEn}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-white p-2.5 dark:bg-slate-900">
                          <p className="text-[11px] text-slate-500">Total Reports</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">{w.total}</p>
                        </div>
                        <div className="rounded-xl bg-white p-2.5 dark:bg-slate-900">
                          <p className="text-[11px] text-slate-500">Registered</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">{w.residentCount}</p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span>Pending:</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">{w.pending}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>In Progress:</span>
                          <span className="font-bold text-sky-600 dark:text-sky-400">{w.inProgress}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Resolved:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{w.resolved}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Active Outages:</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">{w.activeOutages}</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                          <span>Resolution Rate</span>
                          <span>{w.resolutionRate}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-emerald-500"
                            style={{ width: `${w.resolutionRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: NOTIFICATION DELIVERY AUDIT */}
          {section === 'deliveries' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Notification Delivery Tracking Log
                  </h2>
                  <p className="text-xs text-slate-500">
                    Audit log of In-App, Push, and Email alerts dispatched to ward residents.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadAllData()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh Logs
                </button>
              </div>

              <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Delivery ID</th>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Channel</th>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">User ID</th>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Outage / Notice ID</th>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Status</th>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Timestamp</th>
                      <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Notes / Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                    {deliveryLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{log.id.slice(0, 8)}...</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-bold uppercase text-slate-800 dark:bg-slate-800 dark:text-slate-200 text-[10px]">
                            {log.channel === 'push' && <Radio className="h-3 w-3 text-orange-500" />}
                            {log.channel === 'email' && <Mail className="h-3 w-3 text-sky-500" />}
                            {log.channel === 'in_app' && <Bell className="h-3 w-3 text-emerald-500" />}
                            {log.channel}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">{log.user_id.slice(0, 12)}...</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">{log.outage_id?.slice(0, 12) ?? log.notice_id?.slice(0, 12) ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${log.status === 'sent' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : log.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : log.status === 'skipped' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                            {log.status === 'sent'
                              ? log.channel === 'email' ? 'PROVIDER ACCEPTED' : log.channel === 'push' ? 'PUSH SERVICE ACCEPTED' : 'CREATED'
                              : log.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(log.sent_at)}</td>
                        <td className="px-4 py-3 text-slate-500">{log.error_message || 'Delivered successfully'}</td>
                      </tr>
                    ))}

                    {deliveryLogs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                          No notification deliveries recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 6: SETTINGS */}
          {section === 'settings' && (
            <div className="max-w-xl space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Administrator Account Settings
                </h2>
                <p className="text-xs text-slate-500">Manage security credentials for the Municipality Administrator account.</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                <p className="text-xs text-slate-500">Authenticated Email</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{user?.email}</p>
                <p className="mt-1 text-xs text-orange-500 font-semibold">Role: Municipality Administrator (All 19 Wards)</p>
              </div>

              {resetSentMessage && (
                <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {resetSentMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleAdminPasswordReset}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-orange-400"
              >
                <KeyRound className="h-4 w-4" />
                <span>Send Password Reset Email</span>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* REQUIREMENT 6: PRE-PUBLISH CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-slate-950">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Electricity Notice</h3>
                <p className="text-xs text-slate-500">Review recipient targeting before publishing</p>
              </div>
            </div>

            <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs dark:border-slate-800 dark:bg-slate-800/60">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Title</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{outageForm.title_en}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Start Time</p>
                  <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{formatDate(outageForm.start_time)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Expected Restoration</p>
                  <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{formatDate(outageForm.expected_end_time)}</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Affected Wards</p>
                <p className="mt-1 font-bold text-orange-600 dark:text-orange-400">
                  {outageForm.is_municipality_wide
                    ? 'Municipality-wide — All 19 Wards'
                    : `Ward ${outageForm.selectedWards.join(', ')}`}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Notifications</p>
                <div className="mt-1.5 flex gap-3 font-semibold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Push Notification
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Email Notification
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Recipients</p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">
                  {outageForm.is_municipality_wide
                    ? 'All eligible registered residents across Bheemdatta Municipality'
                    : `Residents registered in Ward ${outageForm.selectedWards.join(' and ')}`}
                </p>
                <p className="mt-1 text-slate-500">
                  Estimated eligible recipients: {isCalculatingRecipients ? 'Calculating...' : estimatedRecipientCount}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md transition hover:bg-orange-400 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{saving ? 'Publishing & Sending...' : 'Publish Notice'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT DETAIL & STATUS UPDATE MODAL */}
      {selectedReport && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="my-8 w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500">{selectedReport.report_number}</span>
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                    Ward {selectedReport.ward_id}
                  </span>
                </div>
                <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {formatStatus(selectedReport.problem_type)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedReport(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Citizen Name</p>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedReport.user_name || 'Resident'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Phone</p>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedReport.user_phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Location</p>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedReport.location_name || 'GPS Point'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Coordinates</p>
                  <p className="font-mono text-slate-700 dark:text-slate-300">
                    {Number(selectedReport.latitude).toFixed(5)}, {Number(selectedReport.longitude).toFixed(5)}
                  </p>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300">Citizen Problem Description:</p>
                <p className="mt-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
                  {selectedReport.description}
                </p>
              </div>

              {(selectedReport.photo_url || (selectedReport.photos && selectedReport.photos.length > 0)) && (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-700 dark:text-slate-300">
                      Live Camera Evidence Photos ({selectedReport.photos?.length || 1}):
                    </p>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                      ✓ LIVE VERIFIED
                    </span>
                  </div>

                  {/* Main Selected Photo with Loading & Fallback */}
                  <div
                    onClick={() => {
                      if (!imageError && !imageLoading && selectedReport.photo_url) {
                        setPhotoPreviewUrl(selectedReport.photo_url);
                      }
                    }}
                    className={`relative mt-2 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 min-h-[140px] max-h-56 flex items-center justify-center bg-slate-950 ${
                      !imageError && !imageLoading && selectedReport.photo_url ? 'cursor-pointer group' : ''
                    }`}
                    title={!imageError && selectedReport.photo_url ? 'Click to view larger' : undefined}
                  >
                    {imageLoading && !imageError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-xs z-10">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
                        <span className="mt-1.5 text-[10px] text-slate-400 font-mono">Loading secure evidence...</span>
                      </div>
                    )}

                    {imageError || !selectedReport.photo_url ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                        <AlertTriangle className="h-7 w-7 text-amber-500 mb-2 stroke-[1.5]" />
                        <p className="text-xs font-semibold text-slate-300">Evidence photo unavailable</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Could not load private storage object</p>
                      </div>
                    ) : (
                      <>
                        <img
                          src={selectedReport.photo_url}
                          alt="Problem Site"
                          className={`max-h-56 w-auto object-contain transition-opacity duration-200 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                          onLoad={() => setImageLoading(false)}
                          onError={() => {
                            setImageLoading(false);
                            setImageError(true);
                          }}
                        />
                        {!imageError && !imageLoading && (
                          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/80 px-2 py-1 text-[10px] font-mono text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-sm pointer-events-none">
                            <Maximize2 className="h-3 w-3 text-orange-400" /> Click to enlarge
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Multiple Photos Thumbnails Selector */}
                  {selectedReport.photos && selectedReport.photos.length > 1 && (
                    <div className="mt-2 grid grid-cols-5 gap-2">
                      {selectedReport.photos.map((p, idx) => {
                        const isSelected = selectedReport.photo_url === p.url;
                        return (
                          <button
                            key={p.id || idx}
                            type="button"
                            onClick={() => {
                              setSelectedReport((prev) => (prev ? { ...prev, photo_url: p.url } : null));
                              setImageLoading(true);
                              setImageError(false);
                            }}
                            className={`relative aspect-4/3 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-amber-500 ring-2 ring-amber-400/40 scale-102'
                                : 'border-slate-300 dark:border-slate-700 opacity-70 hover:opacity-100'
                            }`}
                            title={`Evidence photo #${idx + 1}`}
                          >
                            {p.url ? (
                              <img
                                src={p.url}
                                alt={`Evidence ${idx + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.parentElement?.querySelector('.thumb-fallback');
                                  if (fallback) fallback.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`thumb-fallback ${p.url ? 'hidden' : ''} flex h-full w-full flex-col items-center justify-center bg-slate-800 text-[8px] text-slate-400 p-1 text-center`}>
                              <AlertTriangle className="h-3 w-3 text-amber-500 mb-0.5" />
                              <span>Unavailable</span>
                            </div>
                            <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white rounded px-1 text-[8px] font-mono">
                              #{idx + 1}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Status History Timeline */}
              {selectedReport.timeline && selectedReport.timeline.length > 0 && (
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-300">Audit History Timeline:</p>
                  <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40 max-h-36 overflow-y-auto">
                    {selectedReport.timeline.map((event) => (
                      <div key={event.id} className="text-[11px] border-b border-slate-200 pb-1.5 last:border-0 dark:border-slate-700">
                        <div className="flex justify-between font-semibold">
                          <span className="text-orange-600 dark:text-orange-400">{event.titleEn}</span>
                          <span className="text-slate-400">{formatDate(event.timestamp)}</span>
                        </div>
                        {event.noteEn && <p className="text-slate-600 dark:text-slate-300 mt-0.5">{event.noteEn}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Update Form */}
              <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900/60 dark:bg-orange-950/20">
                <h4 className="font-bold text-orange-950 dark:text-orange-200">Update Report Status & Resolution</h4>

                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Next Status</label>
                    <select
                      value={statusUpdateVal}
                      onChange={(e) => setStatusUpdateVal(e.target.value as ReportStatus)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {REPORT_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                      Official Resolution Note / Crew Instructions
                    </label>
                    <textarea
                      rows={3}
                      value={adminNoteVal}
                      onChange={(e) => setAdminNoteVal(e.target.value)}
                      placeholder="e.g. Field crew dispatched to transformer site. Fuse replaced and line re-energized."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSelectedReport(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleSaveReportUpdate}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-orange-400 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Report Update'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Resolution Evidence Photo Lightbox Modal */}
      {photoPreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setPhotoPreviewUrl(null)}
        >
          <div
            className="relative max-h-[92vh] max-w-[92vw] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Verified Live Evidence Photo
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={photoPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="Open full resolution in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPhotoPreviewUrl(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  title="Close preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center p-2 bg-black overflow-hidden">
              <img
                src={photoPreviewUrl}
                alt="Evidence high resolution"
                className="max-h-[82vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
