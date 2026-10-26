import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { BHEEMDATTA_MUNICIPALITY_ID } from '../services/outageService';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  profileLoading: boolean;
  role: UserRole | null;
  fullName: string;
  phoneNumber: string;
  wardNumber: number | null;
  municipalityId: string | null;
  permanentAddress: string | null;
  permanentAddressStatus: 'verified' | 'verification_required';
  hasPendingAddressCorrection: boolean;
  hasCompletePermanentAddress: boolean;
  otpVerified: boolean;
  isAuthenticated: boolean;
  isResident: boolean;
  isMunicipalityAdmin: boolean;
  isPrivilegedUser: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; role?: UserRole | null }>;
  signUp: (email: string, password: string, fullName: string, phoneNumber: string | undefined, wardNumber: number, permanentAddress: string, municipalityId: string | undefined, addressConfirmed: boolean) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  requestAddressCorrection: (wardNumber: number, permanentAddress: string, reason: string) => Promise<{ error: string | null }>;
  updateResidentDetails: (fullName: string, phoneNumber: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  sendOtp: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, code: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PRIVILEGED_ROLES: UserRole[] = [
  'municipality_admin',
];

const PENDING_VERIFICATION_EMAIL_KEY = 'nea_pending_verification_email';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const resolveProfileWard = async (profile: {
  ward_id?: string | null;
  ward_number?: number | null;
  municipality_id?: string | null;
}) => {
  if (!profile.municipality_id || (!profile.ward_id && profile.ward_number == null)) return null;

  let query = supabase
    .from('wards')
    .select('ward_number')
    .eq('municipality_id', profile.municipality_id);
  query = profile.ward_id
    ? query.eq('id', profile.ward_id)
    : query.eq('ward_number', profile.ward_number as number);

  const { data } = await query.maybeSingle();
  const mappedWard = data?.ward_number ?? null;
  if (mappedWard === null || mappedWard < 1 || mappedWard > 19) return null;
  if (profile.ward_number != null && profile.ward_number !== mappedWard) return null;
  return mappedWard;
};

const normalizeRole = (value: string | null | undefined): UserRole | null => {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'resident') return 'resident';
  if (normalized === 'municipality_admin') return 'municipality_admin';

  return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [wardNumber, setWardNumber] = useState<number | null>(null);
  const [municipalityId, setMunicipalityId] = useState<string | null>(null);
  const [permanentAddress, setPermanentAddress] = useState<string | null>(null);
  const [permanentAddressStatus, setPermanentAddressStatus] = useState<'verified' | 'verification_required'>('verification_required');
  const [hasPendingAddressCorrection, setHasPendingAddressCorrection] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const hasCompletePermanentAddress = permanentAddressStatus === 'verified'
    && !hasPendingAddressCorrection
    && Boolean((permanentAddress ?? '').trim())
    && wardNumber !== null
    && wardNumber >= 1
    && wardNumber <= 19;

  const resolveUserRole = async (userId: string): Promise<UserRole | null> => {
    setProfileLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, full_name, phone, ward_id, ward_number, municipality_id, permanent_address, permanent_address_status, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[Auth] Error loading user profile:', error);
      setProfileLoading(false);
      return null;
    }

    if (!data) {
      console.warn('[Auth] No profile found for user:', userId);
      setWardNumber(null);
      setFullName('');
      setPhoneNumber('');
      setMunicipalityId(null);
      setPermanentAddress(null);
      setPermanentAddressStatus('verification_required');
      setHasPendingAddressCorrection(false);
      setProfileLoading(false);
      return null;
    }

    if (data.is_active === false) {
      console.warn('[Auth] Inactive user profile detected for:', userId);
      setProfileLoading(false);
      return null;
    }

    const nextRole = normalizeRole(data.role);
    if (!nextRole) {
      console.warn('[Auth] Role is not a permitted application role:', data.role);
      setProfileLoading(false);
      return null;
    }

    setRole(nextRole);
    setFullName(data.full_name ?? '');
    setPhoneNumber(data.phone ?? '');
    setWardNumber(await resolveProfileWard(data));
    // Explicitly associate canonical Bheemdatta Municipality if not set
    setMunicipalityId(data.municipality_id || BHEEMDATTA_MUNICIPALITY_ID);
    setPermanentAddress(data.permanent_address ?? null);
    setPermanentAddressStatus(data.permanent_address_status === 'verified' ? 'verified' : 'verification_required');
    try {
      const { data: pendingRequest } = await supabase
        .from('address_correction_requests')
        .select('id')
        .eq('resident_id', userId)
        .eq('status', 'pending')
        .maybeSingle();
      setHasPendingAddressCorrection(Boolean(pendingRequest));
    } catch {
      setHasPendingAddressCorrection(false);
    }
    setProfileLoading(false);
    return nextRole;
  };

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (!error) {
        const currentUser = data.session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const currentRole = await resolveUserRole(currentUser.id);
          if (!isMounted) return;
          if (!currentRole) {
            setRole(null);
            setFullName('');
            setPhoneNumber('');
            setWardNumber(null);
            setMunicipalityId(null);
            setPermanentAddress(null);
          }
        } else {
          setRole(null);
          setFullName('');
          setPhoneNumber('');
          setWardNumber(null);
          setMunicipalityId(null);
          setPermanentAddress(null);
          setPermanentAddressStatus('verification_required');
          setHasPendingAddressCorrection(false);
          setProfileLoading(false);
        }
      } else {
        setProfileLoading(false);
      }
      setLoading(false);
    };

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setOtpVerified(false);

      if (currentUser) {
        const currentRole = await resolveUserRole(currentUser.id);
        if (!isMounted) return;
        if (!currentRole) {
          setRole(null);
          setFullName('');
          setPhoneNumber('');
          setWardNumber(null);
          setMunicipalityId(null);
          setPermanentAddress(null);
          setPermanentAddressStatus('verification_required');
          setHasPendingAddressCorrection(false);
        }
      } else {
        setRole(null);
        setWardNumber(null);
        setMunicipalityId(null);
        setPermanentAddress(null);
        setPermanentAddressStatus('verification_required');
        setHasPendingAddressCorrection(false);
        setProfileLoading(false);
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    const pendingVerificationEmail = window.sessionStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY);
    if (pendingVerificationEmail && normalizeEmail(pendingVerificationEmail) !== normalizedEmail) {
      return { error: 'Please verify the email address you used during signup before logging in.' };
    }

    // 1. Sign in using the existing Supabase Auth configuration
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError) {
      return { error: authError.message || 'Unable to sign in. Please check your credentials and try again.' };
    }

    // 2. Verify that a valid authenticated user exists
    const currentUser = authData?.user;
    if (!currentUser) {
      return { error: 'Unable to verify your account session. Please try again.' };
    }

    if (normalizeEmail(currentUser.email ?? '') !== normalizedEmail) {
      await supabase.auth.signOut();
      return { error: 'The login email does not match the account email.' };
    }

    if (!currentUser.email_confirmed_at) {
      await supabase.auth.signOut();
      return { error: 'Please confirm your email address before signing in.' };
    }

    window.sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);

    // 3. Retrieve only that user's profile with a query equivalent to:
    // supabase.from('profiles').select('id, role, is_active').eq('id', user.id).maybeSingle()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', currentUser.id)
      .maybeSingle();

    // 4. Handle the query's error separately from a missing profile
    if (profileError) {
      console.error('[Auth] Profile verification query failed:', profileError);
      await supabase.auth.signOut();
      return {
        error: `Database error while verifying your role: ${profileError.message || 'Server timeout or connection failure'}. Please try again.`
      };
    }

    if (!profile) {
      console.warn('[Auth] No profile found for user:', currentUser.id);
      await supabase.auth.signOut();
      return {
        error: 'Your user profile could not be found. Please contact Bheemdatta Municipality Administration.'
      };
    }

    // 6. Respect the existing is_active account status
    if (profile.is_active === false) {
      console.warn('[Auth] Inactive account attempt:', currentUser.id);
      await supabase.auth.signOut();
      return {
        error: 'Your account has been deactivated. Please contact Bheemdatta Municipality Administration.'
      };
    }

    // 5. Validate that role is exactly resident or municipality_admin
    const rawRole = (profile.role ?? '').trim().toLowerCase();
    if (rawRole !== 'resident' && rawRole !== 'municipality_admin') {
      console.warn('[Auth] Invalid user role in profile:', profile.role);
      await supabase.auth.signOut();
      return {
        error: `Invalid account role: "${profile.role || 'none'}". Permitted roles are resident or municipality_admin.`
      };
    }
    const validatedRole = rawRole as UserRole;

    // Immediately establish synchronous user and role in state to prevent premature redirects
    setUser(currentUser);
    setRole(validatedRole);
    setLoading(false);
    setOtpVerified(false);

    // 8. Load auxiliary profile details without blocking role verification
    try {
      const { data: fullProfile } = await supabase
        .from('profiles')
        .select('full_name, phone, ward_id, ward_number, municipality_id, permanent_address, permanent_address_status')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (fullProfile) {
        setFullName(fullProfile.full_name ?? '');
        setPhoneNumber(fullProfile.phone ?? '');
        setWardNumber(await resolveProfileWard(fullProfile));
        setMunicipalityId(fullProfile.municipality_id || BHEEMDATTA_MUNICIPALITY_ID);
        setPermanentAddress(fullProfile.permanent_address ?? null);
        setPermanentAddressStatus(fullProfile.permanent_address_status === 'verified' ? 'verified' : 'verification_required');
      }

      const { data: pendingRequest } = await supabase
        .from('address_correction_requests')
        .select('id')
        .eq('resident_id', currentUser.id)
        .eq('status', 'pending')
        .maybeSingle();

      setHasPendingAddressCorrection(Boolean(pendingRequest));
    } catch (err) {
      console.warn('[Auth] Non-fatal error loading auxiliary profile details:', err);
    } finally {
      setProfileLoading(false);
    }

    return { error: null, role: validatedRole };
  };

  const requestAddressCorrection = useCallback(async (wardNumber: number, permanentAddress: string, reason: string) => {
    if (!user?.id) {
      return { error: 'You must be signed in to request an address correction.' };
    }

    if (!Number.isInteger(wardNumber) || wardNumber < 1 || wardNumber > 19) {
      return { error: 'Please select a valid ward number between 1 and 19.' };
    }

    if (!permanentAddress.trim() || !reason.trim()) {
      return { error: 'Please provide the corrected address and explain why it needs correction.' };
    }

    const { error } = await supabase.rpc('request_address_correction', {
      p_new_ward: wardNumber,
      p_new_address: permanentAddress.trim(),
      p_reason: reason.trim(),
    });

    if (error) {
      return { error: error.message || 'Unable to submit your address correction request.' };
    }

    setHasPendingAddressCorrection(true);
    return { error: null };
  }, [user]);

  const updateResidentDetails = useCallback(async (nextFullName: string, nextPhoneNumber: string) => {
    if (!user?.id) return { error: 'You must be signed in to update your profile.' };
    const trimmedName = nextFullName.trim();
    const trimmedPhone = nextPhoneNumber.trim();
    if (!trimmedName) return { error: 'Please enter your full name.' };

    const { error } = await supabase.from('profiles').update({
      full_name: trimmedName,
      phone: trimmedPhone || null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    if (error) return { error: error.message || 'Unable to update your profile.' };

    setFullName(trimmedName);
    setPhoneNumber(trimmedPhone);
    return { error: null };
  }, [user]);

  const signUp = async (email: string, password: string, fullName: string, phoneNumber: string | undefined, wardNumber: number, permanentAddress: string, municipalityId: string | undefined, addressConfirmed: boolean) => {
    const normalizedEmail = normalizeEmail(email);
    const numericWard = Number(wardNumber);
    const trimmedAddress = permanentAddress.trim();

    if (!addressConfirmed) {
      return { error: 'Please confirm that this is your actual permanent residential address.' };
    }

    if (!trimmedAddress) {
      return { error: 'Please enter your permanent residential address before creating your account.' };
    }

    if (!Number.isInteger(numericWard) || numericWard < 1 || numericWard > 19) {
      return { error: 'Please select a valid ward number between 1 and 19.' };
    }

    const { data: municipality, error: municipalityError } = await supabase
      .from('municipalities')
      .select('id')
      .eq('name_en', 'Bheemdatta Municipality')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (municipalityError || !municipality?.id) {
      return { error: 'Bheemdatta Municipality could not be verified. Please contact the municipality administrator.' };
    }
    if (municipalityId && municipalityId !== municipality.id) {
      return { error: 'The selected municipality does not match Bheemdatta Municipality.' };
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          phone_number: phoneNumber || '',
          ward_number: numericWard,
          municipality_id: municipality.id,
          permanent_address: trimmedAddress,
          permanent_address_confirmed: true,
          role: 'resident',
        },
      },
    });

    if (error) {
      return { error: error.message || 'Unable to create your account.' };
    }

    window.sessionStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, normalizedEmail);

    if (data?.user && !data.session) {
      return { error: null, needsEmailConfirmation: true };
    }

    return { error: null };
  };

  const sendOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizeEmail(email),
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      return { error: error.message || 'Unable to send verification code.' };
    }

    return { error: null };
  };

  const verifyOtp = useCallback(async (email: string, code: string) => {
    const normalizedEmail = normalizeEmail(email);
    const pendingVerificationEmail = window.sessionStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY);
    if (pendingVerificationEmail && normalizeEmail(pendingVerificationEmail) !== normalizedEmail) {
      return { error: 'The verification email must match the email used during signup.' };
    }

    if (user?.email && normalizeEmail(user.email) !== normalizedEmail) {
      return { error: 'The verification email does not match the signed-in account.' };
    }

    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: code,
      type: 'email',
    });

    if (error) {
      return { error: error.message || 'Invalid or expired verification code.' };
    }

    window.sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
    setOtpVerified(true);
    return { error: null };
  }, [user]);

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (error) {
      return { error: error.message || 'Unable to send password reset email.' };
    }

    return { error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    setRole(null);
    setFullName('');
    setPhoneNumber('');
    setWardNumber(null);
    setMunicipalityId(null);
    setPermanentAddress(null);
    setPermanentAddressStatus('verification_required');
    setHasPendingAddressCorrection(false);
    setProfileLoading(false);
    setOtpVerified(false);
    if (error) {
      console.error('Sign out error:', error.message);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      profileLoading,
      role,
      fullName,
      phoneNumber,
      wardNumber,
      municipalityId,
      permanentAddress,
      permanentAddressStatus,
      hasPendingAddressCorrection,
      hasCompletePermanentAddress,
      otpVerified,
      isAuthenticated: Boolean(user),
      isResident: role === 'resident',
      isMunicipalityAdmin: role === 'municipality_admin',
      isPrivilegedUser: Boolean(role && PRIVILEGED_ROLES.includes(role)),
      signIn,
      signUp,
      requestAddressCorrection,
      updateResidentDetails,
      signOut,
      sendOtp,
      verifyOtp,
      resetPassword,
    }),
    [user, loading, profileLoading, role, fullName, phoneNumber, wardNumber, municipalityId, permanentAddress, permanentAddressStatus, hasPendingAddressCorrection, hasCompletePermanentAddress, otpVerified, requestAddressCorrection, updateResidentDetails, verifyOtp]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
