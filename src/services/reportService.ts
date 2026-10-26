import { supabase } from '../lib/supabase';
import { REPORT_PHOTOS_BUCKET, resolvePhotoUrl } from './storageService';
import type { ProblemReport, ReportStatus, ProblemReportPhoto } from '../types';

export { resolvePhotoUrl, REPORT_PHOTOS_BUCKET };

const toReportStatus = (status: string | null): ReportStatus => (status ?? 'submitted').toUpperCase() as ReportStatus;

const toReport = async (report: any): Promise<ProblemReport> => {
  const rawPhotos = report.report_photos ?? [];
  const photos: ProblemReportPhoto[] = await Promise.all(
    rawPhotos.map(async (p: any) => ({
      id: p.id,
      url: (await resolvePhotoUrl(p.photo_path)) || '',
      captured_at: p.photo_captured_at ?? report.created_at,
      photo_path: p.photo_path,
    }))
  );
  const primaryUrl = photos[0]?.url || (await resolvePhotoUrl(report.photo_url)) || '';
  const primaryCapturedAt = photos[0]?.captured_at || report.photo_captured_at || report.created_at;

  return {
    ...report,
    user_name: report.user_name ?? '',
    user_phone: report.user_phone ?? '',
    municipality_name: report.municipality_name ?? 'Bheemdatta Municipality',
    ward_id: Number(report.ward_number ?? report.ward_id ?? 0),
    problem_type: report.problem_type,
    priority: (report.priority ?? 'medium').toUpperCase(),
    status: toReportStatus(report.status),
    photo_url: primaryUrl,
    photo_captured_at: primaryCapturedAt,
    photos,
    timeline: (report.report_status_history ?? []).map((event: any) => ({
      id: event.id,
      status: toReportStatus(event.status),
      titleEn: `Report ${toReportStatus(event.status).replace('_', ' ').toLowerCase()}`,
      titleNe: `रिपोर्ट ${toReportStatus(event.status)}`,
      noteEn: event.note ?? undefined,
      noteNe: event.note ?? undefined,
      timestamp: event.created_at,
      actor: event.changed_by_name ?? undefined,
    })),
  };
};

const reportSelect = `*, report_photos(*), report_status_history(*)`;

export const reportService = {
  async getReportsForUser(userId: string) {
    const result = await supabase
      .from('problem_reports')
      .select(reportSelect)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (result.error || !result.data) {
      return { ...result, data: null };
    }
    const reports = await Promise.all(result.data.map(toReport));
    return { ...result, data: reports };
  },

  async getAllReports() {
    const result = await supabase
      .from('problem_reports')
      .select(reportSelect)
      .order('created_at', { ascending: false });
    if (result.error || !result.data) {
      return { ...result, data: null };
    }
    const reports = await Promise.all(result.data.map(toReport));
    return { ...result, data: reports };
  },

  async getReportById(id: string) {
    const result = await supabase
      .from('problem_reports')
      .select(reportSelect)
      .or(`id.eq.${id},report_number.eq.${id}`)
      .single();
    if (result.error || !result.data) {
      return { ...result, data: null };
    }
    const report = await toReport(result.data);
    return { ...result, data: report };
  },

  async createReport(
    report: Record<string, unknown>,
    photos?: { path: string; capturedAt: string }[] | { path: string; capturedAt: string }
  ) {
    const result = await supabase.from('problem_reports').insert(report).select().single();
    if (result.error || !result.data) {
      console.error('Report submission error (problem_reports insert):', result.error);
      return result;
    }

    if (photos) {
      const photoList = Array.isArray(photos) ? photos : [photos];
      if (photoList.length > 0) {
        const photoRows = photoList.map((p) => ({
          report_id: result.data.id,
          photo_path: p.path,
          photo_captured_at: p.capturedAt,
        }));
        const photoResult = await supabase.from('report_photos').insert(photoRows);
        if (photoResult.error) {
          console.error('Report submission error (report_photos insert):', photoResult.error);
          return { data: null, error: photoResult.error };
        }
      }
    }

    return result;
  },

  async createReportStatusHistory(entries: Record<string, unknown>[]) {
    return supabase.from('report_status_history').insert(entries).select();
  },

  async getReportPhotos(reportId: string) {
    const result = await supabase
      .from('report_photos')
      .select('*')
      .eq('report_id', reportId)
      .order('photo_captured_at', { ascending: true });

    if (result.error || !result.data) {
      return result;
    }

    const photosWithUrls = await Promise.all(
      result.data.map(async (photo) => ({
        ...photo,
        url: (await resolvePhotoUrl(photo.photo_path)) || '',
      }))
    );

    return { ...result, data: photosWithUrls };
  },

  async getReportHistory(reportId: string) {
    return supabase.from('report_status_history').select('*').eq('report_id', reportId).order('created_at', { ascending: true });
  },

  async updateReportStatus(reportId: string, status: ReportStatus, note: string, officerName: string) {
    const dbStatus = status.toLowerCase();
    const updated = await supabase
      .from('problem_reports')
      .update({ status: dbStatus, updated_at: new Date().toISOString() })
      .eq('id', reportId)
      .select()
      .single();
    if (updated.error) return updated;

    const history = await supabase.from('report_status_history').insert({
      report_id: reportId,
      status: dbStatus,
      note: note.trim() || null,
      changed_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      changed_by_name: officerName,
    });
    if (history.error) return { data: null, error: history.error };
    return updated;
  },
};
