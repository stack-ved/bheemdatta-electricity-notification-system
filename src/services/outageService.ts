import { supabase } from '../lib/supabase';
import type { Outage, OutageStatus } from '../types';
import { validateOutageDates } from '../utils/datetimeValidation';

export const BHEEMDATTA_MUNICIPALITY_ID = '2ecd008c-bd28-49c5-8fc8-bbdcf212b12f';

export interface CreateOutageInput {
  title_en: string;
  title_np?: string;
  reason_en: string;
  reason_np?: string;
  affected_area?: string;
  start_time: string;
  expected_end_time?: string;
  actual_end_time?: string;
  priority?: string;
  status?: string;
  is_municipality_wide?: boolean;
  ward_numbers?: number[];
  ward_number?: number | null;
  municipality_id?: string;
  created_by?: string;
}

export interface DbOutageRow {
  id: string;
  municipality_id: string | null;
  ward_number: number | null;
  is_municipality_wide: boolean | null;
  title_en: string | null;
  title_np: string | null;
  reason_en: string | null;
  reason_np: string | null;
  start_time: string | null;
  expected_end_time: string | null;
  actual_end_time: string | null;
  status: string | null;
  priority: string | null;
  affected_area: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const mapDbOutageToAppOutage = (row: DbOutageRow): Outage => {
  const isMunicipalityWide = Boolean(row.is_municipality_wide);
  const wardNumber = row.ward_number ?? null;

  // If municipality-wide, affects all 19 wards; otherwise specific ward
  const wards = isMunicipalityWide
    ? Array.from({ length: 19 }, (_, i) => i + 1)
    : wardNumber !== null
    ? [wardNumber]
    : [];

  const rawStatus = (row.status || 'scheduled').toUpperCase();
  let normalizedStatus: OutageStatus = 'SCHEDULED';
  if (rawStatus === 'ACTIVE') normalizedStatus = 'ACTIVE';
  else if (rawStatus === 'RESTORATION') normalizedStatus = 'RESTORATION';
  else if (rawStatus === 'RESTORED') normalizedStatus = 'RESTORED';
  else normalizedStatus = 'SCHEDULED';

  const defaultAreaEn = isMunicipalityWide
    ? 'All Wards / Municipality-wide'
    : wardNumber !== null
    ? `Ward ${wardNumber} Area`
    : 'Bheemdatta Municipality';
  const defaultAreaNe = isMunicipalityWide
    ? 'सबै १९ वडाहरू / नगरपालिकाव्यापी'
    : wardNumber !== null
    ? `वडा नं. ${wardNumber} क्षेत्र`
    : 'भीमदत्त नगरपालिका';

  const areaEn = row.affected_area || defaultAreaEn;
  const areaNe = row.affected_area || defaultAreaNe;

  return {
    id: row.id,
    titleEn: row.title_en || 'Electricity Interruption',
    titleNe: row.title_np || row.title_en || 'विद्युत अवरोध',
    status: normalizedStatus,
    municipality: 'Bheemdatta Municipality',
    district: 'Kanchanpur',
    province: 'Sudurpashchim Province',
    wards,
    isMunicipalityWide,
    affectedLocations: [
      {
        locationId: `loc-${row.id}`,
        nameEn: areaEn,
        nameNe: areaNe,
        wardNumber: wardNumber ?? (isMunicipalityWide ? 1 : 3),
      },
    ],
    startTime: row.start_time || new Date().toISOString(),
    expectedRestoration: row.expected_end_time || row.start_time || new Date().toISOString(),
    actualRestoration: row.actual_end_time || undefined,
    reasonEn: row.reason_en || 'Scheduled electrical maintenance or power interruption',
    reasonNe: row.reason_np || row.reason_en || 'विद्युत मर्मत वा प्रसारण अवरोध',
    feederNameEn: 'Bheemdatta Urban Feeder',
    feederNameNe: 'भीमदत्त सहरी फिडर',
    substationEn: 'Bheemdatta 33/11 kV Substation',
    substationNe: 'भीमदत्त ३३/११ केभी सबस्टेशन',
    lastUpdated: row.updated_at || row.created_at || new Date().toISOString(),
    affectedCustomersEstimate: isMunicipalityWide ? 25000 : 1200,
    contactNumber: '099-521155',
    outage_wards: wardNumber !== null ? [{ outage_id: row.id, ward_number: wardNumber }] : [],
    municipality_id: row.municipality_id ?? undefined,
    ward_number: wardNumber,
    is_municipality_wide: isMunicipalityWide,
  };
};

export const outageService = {
  mapDbOutageToAppOutage,

  /**
   * Retrieves public outage records for Bheemdatta Municipality.
   * Exposes ONLY public fields necessary for displaying outage information.
   * Does NOT expose resident profiles, phone numbers, notifications, or internal metadata.
   * Sorts latest/updated outages first.
   */
  async getPublicOutages(municipalityId: string = BHEEMDATTA_MUNICIPALITY_ID) {
    return supabase
      .from('outages')
      .select(
        'id, municipality_id, ward_number, is_municipality_wide, title_en, title_np, reason_en, reason_np, start_time, expected_end_time, actual_end_time, status, priority, affected_area, created_at, updated_at'
      )
      .eq('municipality_id', municipalityId)
      .order('updated_at', { ascending: false });
  },

  /**
   * General / Public outage list for Bheemdatta Municipality
   */
  async getOutages(municipalityId: string = BHEEMDATTA_MUNICIPALITY_ID) {
    return this.getPublicOutages(municipalityId);
  },

  /**
   * Municipality Admin outage list - must see all outages in their municipality across all wards
   */
  async getOutagesForAdmin(municipalityId?: string | null) {
    const targetMunicipalityId = municipalityId || BHEEMDATTA_MUNICIPALITY_ID;
    return supabase
      .from('outages')
      .select('*')
      .eq('municipality_id', targetMunicipalityId)
      .order('start_time', { ascending: false });
  },

  /**
   * Resident outage list - must only see outages targeted to resident's municipality and ward
   * Effectively: municipality_id = resident.municipality_id AND (is_municipality_wide = true OR ward_number = resident.ward_number)
   */
  async getOutagesForResident(municipalityId?: string | null, wardNumber?: number | null) {
    const targetMunicipalityId = municipalityId || BHEEMDATTA_MUNICIPALITY_ID;
    const targetWard = wardNumber != null ? Number(wardNumber) : null;

    let query = supabase
      .from('outages')
      .select('*')
      .eq('municipality_id', targetMunicipalityId)
      .order('start_time', { ascending: false });

    if (targetWard !== null) {
      query = query.or(`is_municipality_wide.eq.true,ward_number.eq.${targetWard}`);
    } else {
      query = query.eq('is_municipality_wide', true);
    }

    const result = await query;

    // Strict in-memory verification to guarantee zero leakage between wards
    if (result.data) {
      const filtered = result.data.filter((row: DbOutageRow) => {
        // Must match municipality
        if (row.municipality_id && row.municipality_id !== targetMunicipalityId) {
          return false;
        }
        // Municipality wide is visible to all
        if (row.is_municipality_wide) {
          return true;
        }
        // Ward specific must match the resident's ward
        return targetWard !== null && row.ward_number === targetWard;
      });

      return {
        data: filtered,
        error: result.error,
      };
    }

    return result;
  },

  async getOutageById(id: string) {
    return supabase
      .from('outages')
      .select('*')
      .eq('id', id)
      .single();
  },

  async getOutageLocations(outageId: string) {
    return supabase
      .from('outage_locations')
      .select('location_id, locations(*)')
      .eq('outage_id', outageId);
  },

  /**
   * Admin creates an outage notice
   * Supports:
   * 1. Single ward: ward_number = X, is_municipality_wide = false
   * 2. Municipality-wide: ward_number = null, is_municipality_wide = true
   */
  async createOutage(input: CreateOutageInput) {
    const isMunicipalityWide = Boolean(input.is_municipality_wide);
    const wardNumbers = [...new Set(
      (input.ward_numbers ?? [])
        .concat(input.ward_number !== undefined && input.ward_number !== null ? [input.ward_number] : [])
        .filter((ward): ward is number => Number.isInteger(ward) && ward >= 1 && ward <= 19)
    )].sort((a, b) => a - b);
    const targetWard = isMunicipalityWide ? null : wardNumbers[0] ?? null;

    const municipalityId = input.municipality_id || BHEEMDATTA_MUNICIPALITY_ID;

    // Service-level datetime validation to prevent invalid date injection
    const validation = validateOutageDates(
      input.start_time,
      input.expected_end_time,
      input.actual_end_time,
      { isEdit: false, requireExpectedEndTime: false }
    );
    if (!validation.isValid) {
      return {
        data: null,
        error: new Error(validation.error || 'Invalid outage date/time parameters') as any,
      };
    }

    const { data: outage, error: outageError } = await supabase
      .from('outages')
      .insert({
        municipality_id: municipalityId,
        ward_number: targetWard,
        is_municipality_wide: isMunicipalityWide,
        title_en: input.title_en,
        title_np: input.title_np || null,
        reason_en: input.reason_en,
        reason_np: input.reason_np || null,
        affected_area: input.affected_area || null,
        start_time: input.start_time,
        expected_end_time: input.expected_end_time || null,
        actual_end_time: input.actual_end_time || null,
        priority: input.priority || 'medium',
        status: (input.status || 'scheduled').toLowerCase(),
        created_by: input.created_by || null,
      })
      .select('*')
      .single();

    if (outageError || !outage) {
      console.error('Error creating outage:', outageError);
      return {
        data: null,
        error: outageError,
      };
    }

    // Persist every affected ward explicitly so ward-targeted in-app and email delivery
    // uses the exact targeting set rather than only the first selected ward.
    if (!isMunicipalityWide && wardNumbers.length > 0) {
      try {
        const outageWardRows = wardNumbers.map((wardNumber) => ({
          outage_id: outage.id,
          ward_number: wardNumber,
        }));

        const { error: outageWardError } = await supabase
          .from('outage_wards')
          .upsert(outageWardRows, { onConflict: 'outage_id,ward_number' });

        if (outageWardError) {
          console.warn('Notice: outage_wards relation upsert warning:', outageWardError);
        }
      } catch (owErr) {
        console.warn('Notice: outage_wards relation insert non-critical note:', owErr);
      }
    }

    return {
      data: outage,
      error: null,
    };
  },

  /**
   * Edit existing outage notice while preserving historical data and validating new ranges
   */
  async updateOutage(id: string, updates: Partial<CreateOutageInput>) {
    if (updates.start_time || updates.expected_end_time || updates.actual_end_time) {
      let startTime = updates.start_time;
      let expectedEndTime = updates.expected_end_time;
      let actualEndTime = updates.actual_end_time;

      if (!startTime || updates.expected_end_time === undefined) {
        const { data: current } = await supabase
          .from('outages')
          .select('start_time, expected_end_time, actual_end_time')
          .eq('id', id)
          .single();
        if (current) {
          startTime = startTime || current.start_time;
          expectedEndTime = expectedEndTime !== undefined ? expectedEndTime : current.expected_end_time;
          actualEndTime = actualEndTime !== undefined ? actualEndTime : current.actual_end_time;
        }
      }

      const validation = validateOutageDates(
        startTime,
        expectedEndTime,
        actualEndTime,
        { isEdit: true, requireExpectedEndTime: false }
      );
      if (!validation.isValid) {
        return {
          data: null,
          error: new Error(validation.error || 'Invalid outage date/time parameters') as any,
        };
      }
    }

    return supabase
      .from('outages')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
  },

  async updateOutageStatus(
    id: string,
    status: OutageStatus | string,
    actualEndTime?: string | null,
    knownStartTime?: string | null
  ) {
    const normalizedStatus = status.toLowerCase();
    let effectiveActualEndTime = actualEndTime;

    if (['restored', 'resolved'].includes(normalizedStatus) && !effectiveActualEndTime) {
      effectiveActualEndTime = new Date().toISOString();
    }

    if (effectiveActualEndTime) {
      let startTime = knownStartTime;
      if (!startTime) {
        const { data: current } = await supabase
          .from('outages')
          .select('start_time')
          .eq('id', id)
          .single();
        startTime = current?.start_time;
      }

      if (startTime) {
        const validation = validateOutageDates(
          startTime,
          null,
          effectiveActualEndTime,
          { isEdit: true, requireExpectedEndTime: false }
        );
        if (!validation.isValid) {
          return {
            data: null,
            error: new Error(validation.error || 'Invalid actual solve time') as any,
          };
        }
      }
    }

    const updatePayload: Record<string, any> = {
      status: normalizedStatus,
      updated_at: new Date().toISOString(),
    };

    if (['restored', 'resolved'].includes(normalizedStatus)) {
      updatePayload.actual_end_time = effectiveActualEndTime;
    }

    return supabase
      .from('outages')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();
  },

  async deleteOutage(id: string) {
    return supabase
      .from('outages')
      .delete()
      .eq('id', id);
  },

  /**
   * Realtime subscription helper for public.outages
   */
  subscribeToOutages(callback: (payload: any) => void) {
    return supabase
      .channel('public:outages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'outages' },
        (payload) => callback(payload)
      )
      .subscribe();
  },
};