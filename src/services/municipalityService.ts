import { supabase } from '../lib/supabase';

export const municipalityService = {
  async getMunicipalities() {
    return supabase.from('municipalities').select('*').order('name_en');
  },

  async getMunicipalityById(id: string) {
    return supabase.from('municipalities').select('*').eq('id', id).single();
  },
};
