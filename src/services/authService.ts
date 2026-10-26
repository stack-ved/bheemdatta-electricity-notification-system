import { supabase } from '../lib/supabase';

export const authService = {
  async signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },

  async signUp(email: string, password: string, fullName: string) {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
  },

  async signOut() {
    return supabase.auth.signOut();
  },

  async getSession() {
    return supabase.auth.getSession();
  },

  async getUser() {
    return supabase.auth.getUser();
  },
};
