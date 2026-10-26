export type DbMunicipality = {
  id: string;
  name_en: string | null;
  name_np: string | null;
  district: string | null;
  province: string | null;
  created_at: string | null;
};

export type DbWard = {
  id: string;
  municipality_id: string;
  ward_number: number;
  created_at: string | null;
};

export type DbLocation = {
  id: string;
  municipality_id: string | null;
  ward_id: string | null;
  name_en: string | null;
  name_np: string | null;
  location_type: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DbOutage = {
  id: string;
  municipality_id: string | null;
  title_en: string | null;
  title_np: string | null;
  reason_en: string | null;
  reason_np: string | null;
  start_time: string | null;
  expected_end_time: string | null;
  actual_end_time: string | null;
  status: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DbProblemReport = {
  id: string;
  report_number: string;
  user_id: string;
  municipality_id: string | null;
  ward_id: string | null;
  location_id: string | null;
  problem_type: string;
  description: string;
  latitude: number;
  longitude: number;
  location_accuracy: number | null;
  priority: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DbReportPhoto = {
  id: string;
  report_id: string;
  photo_path: string;
  photo_captured_at: string;
  created_at: string | null;
};

export type DbReportStatusHistory = {
  id: string;
  report_id: string;
  status: string;
  note: string | null;
  changed_by: string | null;
  changed_by_name: string | null;
  created_at: string | null;
};
