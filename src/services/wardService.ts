import { supabase } from '../lib/supabase';

export const wardService = {
  async getWards(municipalityId?: string) {
    let query = supabase.from('wards').select('*').order('ward_number', { ascending: true });
    if (municipalityId) {
      query = query.eq('municipality_id', municipalityId);
    }
    return query;
  },
};
