export type OutageStatus = 'SCHEDULED' | 'ACTIVE' | 'RESTORATION' | 'RESTORED';

export type LocationType =
  | 'Tole / Settlement'
  | 'Area'
  | 'Neighborhood'
  | 'Transformer Area'
  | 'Electricity Distribution Area'
  | 'Substation'
  | 'Road / Specific Area'
  | 'Custom Location';

export interface LocationItem {
  id: string;
  nameEn: string;
  nameNe: string;
  wardNumber: number; // 1-19
  type: LocationType;
  coordinates: {
    lat: number;
    lng: number;
  };
  substation?: string;
  feeder?: string;
}

export interface AffectedLocation {
  locationId: string;
  nameEn: string;
  nameNe: string;
  wardNumber: number;
}

export interface OutageWardRelation {
  id?: string;
  outage_id: string;
  ward_number: number;
  created_at?: string;
}

export interface Outage {
  id: string;
  titleEn: string;
  titleNe: string;
  status: OutageStatus;
  municipality: string;
  district: string;
  province: string;
  wards: number[];
  isMunicipalityWide?: boolean;
  affectedLocations: AffectedLocation[];
  startTime: string; // ISO string
  expectedRestoration: string; // ISO string
  actualRestoration?: string;
  reasonEn: string;
  reasonNe: string;
  feederNameEn: string;
  feederNameNe: string;
  substationEn: string;
  substationNe: string;
  lastUpdated: string;
  affectedCustomersEstimate?: number;
  contactNumber?: string;
  emergencyNoteEn?: string;
  emergencyNoteNe?: string;
  outage_wards?: OutageWardRelation[];
  municipality_id?: string;
  ward_number?: number | null;
  is_municipality_wide?: boolean;
}

export interface NotificationDeliveryLog {
  id: string;
  outage_id?: string;
  notice_id?: string;
  user_id: string;
  ward_number?: number;
  channel: 'push' | 'email' | 'in_app';
  status: 'sent' | 'failed' | 'pending' | 'skipped';
  error_message?: string;
  sent_at: string;
  profile?: {
    email?: string;
    full_name?: string;
    ward_number?: number;
  };
}

export interface NotificationItem {
  id: string;
  noticeId?: string;
  outageId?: string;
  titleEn: string;
  titleNe: string;
  messageEn: string;
  messageNe: string;
  type: 'SCHEDULED' | 'ACTIVE' | 'RESTORATION' | 'RESTORED' | 'ANNOUNCEMENT';
  timestamp: string;
  read: boolean;
  locationId?: string;
  wardNumber?: number;
}

export interface NotificationPreferences {
  websiteNotifications: boolean;
  browserNotifications: boolean;
  emailNotifications: boolean;
  scheduledOutages: boolean;
  activeOutages: boolean;
  electricityRestored: boolean;
  importantAnnouncements: boolean;
  soundAlerts: boolean;
}

export interface SavedLocation {
  id: string;
  nameEn: string;
  nameNe: string;
  wardNumber: number;
  isPrimary?: boolean;
}

export type UserRole = 'resident' | 'municipality_admin';

export type ProblemCategory =
  | 'NO_ELECTRICITY'
  | 'DAMAGED_LINE'
  | 'TRANSFORMER_PROBLEM'
  | 'DANGEROUS_WIRE'
  | 'SPARKING_FIRE'
  | 'OTHER_ELECTRICITY'
  | 'OTHER';

export type ReportStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

export type ReportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export interface ReportTimelineEvent {
  id: string;
  status: ReportStatus;
  titleEn: string;
  titleNe: string;
  noteEn?: string;
  noteNe?: string;
  timestamp: string;
  actor?: string;
}

export interface ProblemReportPhoto {
  id?: string;
  url: string; // Storage URL or base64 dataUrl
  captured_at: string; // ISO string
  photo_path?: string;
}

export interface CapturedPhotoItem {
  id: string;
  dataUrl: string; // Base64 data URL or Object URL with watermark
  previewUrl?: string; // High-performance Object URL for preview
  blob: Blob; // Compressed JPEG blob for upload
  file?: File; // Standard File object for Supabase Storage upload
  capturedAt: string; // ISO string
}

export interface ProblemReport {
  id: string;
  report_number: string; // e.g. BEA-2026-001245
  user_id: string;
  user_name: string;
  user_phone: string;
  municipality_id: string;
  municipality_name: string;
  ward_id: number;
  location_id?: string;
  location_name?: string;
  problem_type: ProblemCategory;
  description: string;
  latitude: number;
  longitude: number;
  location_accuracy: number; // in meters (e.g. 8)
  photo_url: string; // primary photo (or first live camera capture)
  photo_captured_at: string; // ISO string
  photos?: ProblemReportPhoto[]; // multiple photos support
  priority: ReportPriority;
  status: ReportStatus;
  admin_notes?: string;
  timeline: ReportTimelineEvent[];
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  wardNumber: number;
  role: UserRole;
  isLoggedIn: boolean;
}

