import type { ProblemReport } from '../types';

// High-fidelity SVG base64 representations for realistic live-captured demonstration photos
export const SAMPLE_CAPTURED_PHOTO_LINE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="%231e293b"/>
  <!-- Sky background -->
  <rect width="640" height="320" fill="%23334155"/>
  <!-- Utility Pole -->
  <rect x="290" y="80" width="30" height="400" fill="%2378350f"/>
  <rect x="210" y="110" width="190" height="14" fill="%2394a3b8"/>
  <rect x="240" y="150" width="130" height="12" fill="%2394a3b8"/>
  <!-- Insulators -->
  <circle cx="220" cy="117" r="8" fill="%23f8fafc"/>
  <circle cx="380" cy="117" r="8" fill="%23f8fafc"/>
  <circle cx="250" cy="156" r="7" fill="%23f8fafc"/>
  <circle cx="360" cy="156" r="7" fill="%23f8fafc"/>
  <!-- Damaged / Sagging Power Lines -->
  <path d="M 0 120 Q 220 117 305 117 T 640 180" fill="none" stroke="%23f59e0b" stroke-width="4"/>
  <path d="M 0 160 Q 180 260 305 156 Q 450 310 640 220" fill="none" stroke="%23ef4444" stroke-width="4" stroke-dasharray="8,4"/>
  <!-- Tree branch obstruction -->
  <path d="M 400 480 Q 420 300 460 220 Q 430 200 390 230" fill="none" stroke="%2315803d" stroke-width="16"/>
  <!-- Live Timestamp Overlay Watermark -->
  <rect x="20" y="420" width="320" height="40" rx="8" fill="%230f172a" fill-opacity="0.85"/>
  <text x="35" y="445" fill="%23f8fafc" font-family="monospace" font-size="14" font-weight="bold">📍 BHEEMDATTA W03 | 2026-09-06</text>
</svg>`;

export const SAMPLE_CAPTURED_PHOTO_TRANSFORMER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="%230f172a"/>
  <!-- Transformer Box -->
  <rect x="220" y="140" width="200" height="220" rx="10" fill="%23475569" stroke="%2394a3b8" stroke-width="4"/>
  <!-- Bushings -->
  <rect x="250" y="100" width="20" height="40" fill="%23cbd5e1"/>
  <rect x="310" y="100" width="20" height="40" fill="%23cbd5e1"/>
  <rect x="370" y="100" width="20" height="40" fill="%23cbd5e1"/>
  <!-- Cooling fins -->
  <line x1="200" y1="180" x2="220" y2="180" stroke="%2394a3b8" stroke-width="4"/>
  <line x1="200" y1="210" x2="220" y2="210" stroke="%2394a3b8" stroke-width="4"/>
  <line x1="200" y1="240" x2="220" y2="240" stroke="%2394a3b8" stroke-width="4"/>
  <line x1="420" y1="180" x2="440" y2="180" stroke="%2394a3b8" stroke-width="4"/>
  <line x1="420" y1="210" x2="440" y2="210" stroke="%2394a3b8" stroke-width="4"/>
  <line x1="420" y1="240" x2="440" y2="240" stroke="%2394a3b8" stroke-width="4"/>
  <!-- Spark Indicator -->
  <polygon points="320,70 330,95 315,95 325,120 300,95 315,95" fill="%23f59e0b"/>
  <!-- Watermark -->
  <rect x="20" y="420" width="320" height="40" rx="8" fill="%230f172a" fill-opacity="0.85"/>
  <text x="35" y="445" fill="%23f8fafc" font-family="monospace" font-size="14" font-weight="bold">📍 BHEEMDATTA W05 | 2026-09-05</text>
</svg>`;

export const SAMPLE_REPORTS: ProblemReport[] = [
  {
    id: 'report-2026-001',
    report_number: 'BEA-2026-001245',
    user_id: 'user_resident_01',
    user_name: 'Bipin Sharma',
    user_phone: '9848712345',
    municipality_id: 'bheemdatta',
    municipality_name: 'Bheemdatta Municipality',
    ward_id: 3,
    location_id: 'loc-03-01',
    location_name: 'Naulakhet',
    problem_type: 'DAMAGED_LINE',
    description: 'Overhead 11kV secondary distribution line sagging dangerously low near Naulakhet chowk due to sudden tree limb impact. Sparks visible in wind gusts.',
    latitude: 28.9688,
    longitude: 80.1834,
    location_accuracy: 8.5,
    photo_url: SAMPLE_CAPTURED_PHOTO_LINE,
    photo_captured_at: '2026-09-06T15:35:12+05:45',
    priority: 'HIGH',
    status: 'UNDER_REVIEW',
    admin_notes: 'Verified by Bheemdatta Substation Duty Desk. Field technician team dispatched with bucket truck.',
    timeline: [
      {
        id: 't-1',
        status: 'SUBMITTED',
        titleEn: 'Report Received with Live Photo & GPS',
        titleNe: 'प्रत्यक्ष फोटो र GPS सहित रिपोर्ट दर्ता भयो',
        noteEn: 'Report created by resident with live camera proof and ±8.5m GPS accuracy.',
        noteNe: 'नागरिकद्वारा प्रत्यक्ष फोटो र ±८.५ मिटर GPS शुद्धतासहित रिपोर्ट पेश गरियो।',
        timestamp: '2026-09-06T15:35:12+05:45',
        actor: 'Citizen Resident',
      },
      {
        id: 't-2',
        status: 'UNDER_REVIEW',
        titleEn: 'Under Technical Review',
        titleNe: 'प्राविधिक समीक्षामा',
        noteEn: 'Bheemdatta 33/11kV control room confirmed location on Naulakhet feeder circuit.',
        noteNe: 'भीमदत्त सबस्टेशन नियन्त्रण कक्षले नौलाखेत फिडर सर्किट अन्तर्गत स्थान प्रमाणीकरण गर्यो।',
        timestamp: '2026-09-06T16:10:00+05:45',
        actor: 'NEA Duty Engineer',
      },
    ],
    created_at: '2026-09-06T15:35:12+05:45',
    updated_at: '2026-09-06T16:10:00+05:45',
  },
  {
    id: 'report-2026-002',
    report_number: 'BEA-2026-000982',
    user_id: 'user_resident_01',
    user_name: 'Bipin Sharma',
    user_phone: '9848712345',
    municipality_id: 'bheemdatta',
    municipality_name: 'Bheemdatta Municipality',
    ward_id: 5,
    location_id: 'loc-05-01',
    location_name: 'Gobariya',
    problem_type: 'TRANSFORMER_PROBLEM',
    description: 'Transformer blew out with a loud bang near Gobariya health post. Power cuts in all surrounding 50 houses.',
    latitude: 28.9542,
    longitude: 80.2014,
    location_accuracy: 12.0,
    photo_url: SAMPLE_CAPTURED_PHOTO_TRANSFORMER,
    photo_captured_at: '2026-09-05T11:20:00+05:45',
    priority: 'EMERGENCY',
    status: 'RESOLVED',
    admin_notes: '100kVA Distribution transformer replaced and energized. Power restored to Gobariya.',
    timeline: [
      {
        id: 't-201',
        status: 'SUBMITTED',
        titleEn: 'Report Received',
        titleNe: 'रिपोर्ट प्राप्त भयो',
        timestamp: '2026-09-05T11:20:00+05:45',
      },
      {
        id: 't-202',
        status: 'ASSIGNED',
        titleEn: 'Assigned to Rapid Response Crew',
        titleNe: 'मर्मत टोलीलाई जिम्मा दिइयो',
        noteEn: 'Crew #3 dispatched with replacement transformer.',
        noteNe: 'नयाँ ट्रान्सफर्मर सहित टोली नं ३ खटाइयो।',
        timestamp: '2026-09-05T11:50:00+05:45',
      },
      {
        id: 't-203',
        status: 'IN_PROGRESS',
        titleEn: 'Transformer Installation in Progress',
        titleNe: 'ट्रान्सफर्मर जडान कार्य भइरहेको',
        timestamp: '2026-09-05T13:30:00+05:45',
      },
      {
        id: 't-204',
        status: 'RESOLVED',
        titleEn: 'Work Completed & Power Restored',
        titleNe: 'कार्य सम्पन्न भई विद्युत सुचारु',
        noteEn: 'Load test successful. All phases energized.',
        noteNe: 'लोड परीक्षण सफल भई सबै फेजहरू सुचारु गरियो।',
        timestamp: '2026-09-05T16:15:00+05:45',
      },
    ],
    created_at: '2026-09-05T11:20:00+05:45',
    updated_at: '2026-09-05T16:15:00+05:45',
  },
];
