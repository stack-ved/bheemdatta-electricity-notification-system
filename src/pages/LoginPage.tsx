import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAppData();
  const { signIn, resetPassword, isResident } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isSubmitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      showToast({ type: 'error', title: 'Missing details', message: 'Please enter both email and password.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn(trimmedEmail, password);

      if (result.error) {
        showToast({ type: 'error', title: 'Login failed', message: result.error });
        return;
      }

      if (result.role === 'municipality_admin') {
        showToast({
          type: 'success',
          title: 'Municipality Admin access granted',
          message: 'Welcome to the Bheemdatta Municipality Administration Console.'
        });
        navigate('/admin-dashboard', { replace: true });
      } else if (result.role === 'resident') {
        showToast({
          type: 'success',
          title: 'Welcome back',
          message: 'Resident account login successful.'
        });
        navigate('/citizen-dashboard', { replace: true });
      } else {
        showToast({
          type: 'error',
          title: 'Login failed',
          message: 'Unable to route to your dashboard because the account role is invalid.'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showToast({ type: 'error', title: 'Email required', message: 'Please enter your email address before resetting your password.' });
      return;
    }

    const result = await resetPassword(email.trim());
    if (result.error) {
      showToast({ type: 'error', title: 'Reset failed', message: result.error });
      return;
    }

    showToast({
      type: 'success',
      title: 'Password reset email sent',
      message: 'Check your inbox for the secure password reset link.',
    });
  };

  return (
    <div className="relative flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/8 dark:bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200/90 bg-white/95 p-7 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:p-9 ring-1 ring-black/5 dark:ring-white/10 animate-fade-in-up">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 to-blue-950 text-amber-400 shadow-lg shadow-blue-950/25 ring-1 ring-blue-700/30 dark:from-amber-400 dark:to-amber-500 dark:text-slate-950 dark:shadow-amber-500/20">
            {isResident ? <User className="h-7 w-7" /> : <Zap className="h-7 w-7" />}
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 font-sans">Secure access to municipal electricity services</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Email address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="example@gmail.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-3 pl-10.5 pr-3 text-sm text-slate-900 outline-none transition-all duration-150 focus:border-amber-500/60 focus:bg-white focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700/90 dark:bg-slate-800/70 dark:text-white dark:focus:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Password</label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-semibold text-amber-600 transition hover:text-amber-700 hover:underline dark:text-amber-400 dark:hover:text-amber-300 cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type={isPasswordVisible ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-3 pl-10.5 pr-10 text-sm text-slate-900 outline-none transition-all duration-150 focus:border-amber-500/60 focus:bg-white focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700/90 dark:bg-slate-800/70 dark:text-white dark:focus:bg-slate-800"
              />
              <button
                type="button"
                aria-label="Toggle password visibility"
                onClick={() => setIsPasswordVisible((value) => !value)}
                className="absolute right-3 top-3.5 text-slate-400 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              >
                {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(event) => setRememberDevice(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-amber-500 accent-amber-500 cursor-pointer"
            />
            <span className="font-medium text-xs text-slate-600 dark:text-slate-400">Remember this device</span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-blue-900 to-blue-950 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition-all duration-150 hover:from-blue-800 hover:to-blue-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 dark:from-amber-400 dark:to-amber-500 dark:text-slate-950 dark:shadow-amber-500/20 cursor-pointer"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-7 text-center text-xs text-slate-600 dark:text-slate-400">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-bold text-amber-600 hover:text-amber-700 hover:underline dark:text-amber-400 dark:hover:text-amber-300">Create Account</Link>
        </div>
      </div>
    </div>
  );
};
