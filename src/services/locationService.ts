import { supabase } from '../lib/supabase';

export const locationService = {
  async getLocationsByMunicipality(municipalityId?: string) {
    let query = supabase.from('locations').select('*').order('name_en');
    if (municipalityId) {
      query = query.eq('municipality_id', municipalityId);
    }
    return query;
  },

  async getLocationsByWard(wardId?: string) {
    if (!wardId) return { data: [], error: null };
    return supabase.from('locations').select('*').eq('ward_id', wardId).order('name_en');
  },
};
