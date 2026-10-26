import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User, CheckCircle2, ArrowLeft, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { WARDS } from '../data/locationsData';

const gmailRegex = /^[^\s@]+@gmail\.com$/i;

const passwordRules = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
];

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { showToast } = useAppData();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [wardNumber, setWardNumber] = useState<number | ''>('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordChecks = useMemo(
    () => passwordRules.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password]
  );

  const passwordScore = passwordChecks.filter((rule) => rule.passed).length;

  const validateForm = () => {
    if (!fullName.trim()) {
      showToast({ type: 'error', title: 'Missing details', message: 'Please enter your full name.' });
      return false;
    }

    if (!email.trim()) {
      showToast({ type: 'error', title: 'Email required', message: 'Please enter your Gmail address.' });
      return false;
    }

    if (!gmailRegex.test(email.trim())) {
      showToast({
        type: 'error',
        title: 'Invalid Gmail address',
        message: 'Please use a valid Gmail address (@gmail.com).',
      });
      return false;
    }

    if (wardNumber === '' || wardNumber < 1 || wardNumber > 19) {
      showToast({ type: 'error', title: 'Ward required', message: 'Please select your municipality ward (1-19).' });
      return false;
    }

    if (!permanentAddress.trim()) {
      showToast({ type: 'error', title: 'Permanent address required', message: 'Please enter your permanent residential address and ward location.' });
      return false;
    }

    if (!addressConfirmed) {
      showToast({ type: 'error', title: 'Address confirmation required', message: 'Please confirm that this is your actual permanent residential address.' });
      return false;
    }

    if (!password) {
      showToast({ type: 'error', title: 'Password required', message: 'Please create a password.' });
      return false;
    }

    if (passwordScore < 4) {
      showToast({ type: 'error', title: 'Weak password', message: 'Your password must meet all strength requirements.' });
      return false;
    }

    if (password !== confirmPassword) {
      showToast({ type: 'error', title: 'Password mismatch', message: 'Passwords do not match.' });
      return false;
    }

    if (!termsAccepted) {
      showToast({ type: 'error', title: 'Terms required', message: 'You must accept the Terms of Service and Privacy Policy.' });
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const result = await signUp(
      email.trim(),
      password,
      fullName.trim(),
      phoneNumber.trim() || undefined,
      wardNumber as number,
      permanentAddress.trim(),
      undefined,
      addressConfirmed
    );
    setIsSubmitting(false);

    if (result.error) {
      showToast({
        type: 'error',
        title: 'Registration failed',
        message: result.error,
      });
      return;
    }

    setSuccess(true);
    showToast({
      type: 'success',
      title: 'Account created successfully!',
      message: 'Please check your Gmail inbox and verify your email address before logging in.',
    });
  };

  if (success) {
    return (
      <div className="relative flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/8 dark:bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />

        <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200/90 bg-white/95 p-8 text-center shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 ring-1 ring-black/5 dark:ring-white/10 animate-fade-in-up">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-600 shadow-lg shadow-emerald-500/20 dark:from-emerald-950/60 dark:to-emerald-900/40 dark:text-emerald-300">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h1 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Account created successfully!</h1>
          <p className="mt-3 text-center text-sm text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
            Registered for <strong>Bheemdatta Ward {wardNumber}</strong>. Please check your Gmail inbox and verify your email address before logging in.
          </p>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-8 w-full rounded-xl bg-gradient-to-r from-blue-900 to-blue-950 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition-all duration-150 hover:from-blue-800 hover:to-blue-900 active:scale-95 dark:from-amber-400 dark:to-amber-500 dark:text-slate-950 dark:shadow-amber-500/20 cursor-pointer"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-600/8 dark:bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-xl rounded-3xl border border-slate-200/90 bg-white/95 p-6 sm:p-9 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 ring-1 ring-black/5 dark:ring-white/10 animate-fade-in-up">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/login" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>

        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 to-blue-950 text-amber-400 shadow-lg shadow-blue-950/25 ring-1 ring-blue-700/30 dark:from-amber-400 dark:to-amber-500 dark:text-slate-950 dark:shadow-amber-500/20">
            <User className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Create Your Citizen Account</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 font-sans">Register with your permanent residential ward and address in Bheemdatta Municipality.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Full Name</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Gmail Address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Municipality</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  readOnly
                  value="Bheemdatta Municipality"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Residential Ward</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <select
                value={wardNumber}
                onChange={(event) => setWardNumber(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="" disabled>Select ward (1-19)</option>
                {WARDS.map((w) => (
                  <option key={w.number} value={w.number}>
                    Ward {w.number} ({w.nameEn})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Permanent Residential Address</label>
            <textarea
              value={permanentAddress}
              onChange={(event) => setPermanentAddress(event.target.value)}
              rows={3}
              placeholder="Tole / street / locality / house number"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/60 dark:bg-orange-950/20">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Confirm your permanent address</p>
            <dl className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-200">
              <div className="flex gap-2"><dt className="font-medium">Municipality:</dt><dd>Bheemdatta Municipality</dd></div>
              <div className="flex gap-2"><dt className="font-medium">Ward:</dt><dd>{wardNumber === '' ? 'Select a ward' : `Ward ${wardNumber}`}</dd></div>
              <div className="flex gap-2"><dt className="font-medium">Address:</dt><dd className="break-words">{permanentAddress.trim() || 'Enter your locality, tole, or street'}</dd></div>
            </dl>
            <label className="mt-4 flex items-start gap-3 border-t border-orange-200 pt-4 text-sm text-slate-800 dark:border-orange-900/60 dark:text-slate-100">
              <input
                type="checkbox"
                checked={addressConfirmed}
                onChange={(event) => setAddressConfirmed(event.target.checked)}
                className="mt-1 h-4 w-4 accent-orange-600"
              />
              <span>I confirm that this is my actual permanent residential address.</span>
            </label>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="98XXXXXXXX (Optional)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a secure password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                aria-label="Toggle password visibility"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-3.5 text-slate-500 transition hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 dark:text-slate-200">Password strength</span>
                <span className="font-semibold text-orange-600 dark:text-orange-300">{passwordScore}/4</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all"
                  style={{ width: `${(passwordScore / 4) * 100}%` }}
                />
              </div>
              <ul className="mt-1 space-y-1 text-slate-600 dark:text-slate-300">
                {passwordChecks.map((rule) => (
                  <li key={rule.label} className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${rule.passed ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <span>{rule.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Confirm Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm your password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                aria-label="Toggle confirm password visibility"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute right-3 top-3.5 text-slate-500 transition hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 accent-orange-500"
            />
            <span>I agree to the Terms of Service and Privacy Policy for Bheemdatta Municipal Services</span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-blue-900 to-blue-800 px-4 py-3 text-base font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70 dark:from-orange-500 dark:to-orange-400 dark:text-slate-950"
          >
            {isSubmitting ? 'Creating Citizen Account...' : 'Create Citizen Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-orange-600 hover:underline dark:text-orange-300">Log in</Link>
        </p>
      </div>
    </div>
  );
};
