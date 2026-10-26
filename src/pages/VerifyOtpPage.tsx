import React, { useState } from 'react';
import { ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../contexts/AppDataContext';
import { useAuth } from '../contexts/AuthContext';

export const VerifyOtpPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAppData();
  const { user, role, verifyOtp, sendOtp, otpVerified } = useAuth();

  const [email, setEmail] = useState(() => window.sessionStorage.getItem('nea_pending_verification_email') ?? user?.email ?? '');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(45);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  if (otpVerified) {
    if (role === 'municipality_admin') {
      navigate('/admin-dashboard');
    } else {
      navigate('/citizen-dashboard');
    }
  }

  const updateOtpDigit = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, '').slice(0, 1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = sanitized;
    setOtpDigits(nextDigits);

    if (sanitized && index < 5) {
      const nextInput = document.getElementById(`verify-otp-${index + 1}`) as HTMLInputElement | null;
      nextInput?.focus();
    }
  };

  const handleVerify = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      showToast({ type: 'error', title: 'Email required', message: 'Please use the email address from signup.' });
      return;
    }

    const code = otpDigits.join('');
    if (code.length !== 6) {
      showToast({ type: 'error', title: 'Incomplete code', message: 'Please enter the full 6-digit verification code.' });
      return;
    }

    setIsVerifying(true);
    const result = await verifyOtp(normalizedEmail, code);
    setIsVerifying(false);

    if (result.error) {
      showToast({ type: 'error', title: 'Verification failed', message: result.error });
      return;
    }

    showToast({ type: 'success', title: 'Identity verified', message: 'Access granted to your secure dashboard.' });

    if (role === 'municipality_admin') {
      navigate('/admin-dashboard');
    } else {
      navigate('/citizen-dashboard');
    }
  };

  const handleResend = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (countdown > 0 || !normalizedEmail) return;

    const result = await sendOtp(normalizedEmail);
    if (result.error) {
      showToast({ type: 'error', title: 'Unable to resend code', message: result.error });
      return;
    }

    setOtpDigits(Array(6).fill(''));
    setCountdown(45);
    showToast({ type: 'success', title: 'Code sent', message: 'A new verification code has been sent.' });
  };

  return (
    <div className="relative flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/8 dark:bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200/90 bg-white/95 p-7 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:p-10 ring-1 ring-black/5 dark:ring-white/10 animate-fade-in-up">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600 shadow-lg shadow-amber-500/15 dark:from-amber-500/20 dark:to-amber-500/10 dark:text-amber-300">
          <ShieldCheck className="h-8 w-8" />
        </div>

        <h1 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Verify Your Identity</h1>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400 font-sans">We&apos;ve sent a verification code to your registered email address.</p>

        <label className="mt-6 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Signup email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-150 focus:border-amber-500/60 focus:bg-white focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </label>

        <div className="mt-8 flex items-center justify-center gap-2 sm:gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <input
              key={index}
              id={`verify-otp-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={otpDigits[index] ?? ''}
              onChange={(event) => updateOtpDigit(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
                  const previousInput = document.getElementById(`verify-otp-${index - 1}`) as HTMLInputElement | null;
                  previousInput?.focus();
                }
              }}
              onPaste={(event) => {
                event.preventDefault();
                const pastedText = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                if (!pastedText) return;
                const nextDigits = Array(6).fill('');
                for (let i = 0; i < pastedText.length; i += 1) nextDigits[i] = pastedText[i];
                setOtpDigits(nextDigits);
                const lastIndex = Math.min(pastedText.length, 5);
                const target = document.getElementById(`verify-otp-${lastIndex}`) as HTMLInputElement | null;
                target?.focus();
              }}
              className="h-14 w-11 sm:w-12 rounded-2xl border border-slate-200 bg-slate-50/80 text-center text-2xl font-black text-slate-900 outline-none transition-all duration-150 focus:border-amber-500/60 focus:bg-white focus:ring-4 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleVerify}
          disabled={isVerifying}
          className="mt-8 w-full rounded-xl bg-gradient-to-r from-blue-900 to-blue-950 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition-all duration-150 hover:from-blue-800 hover:to-blue-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 dark:from-amber-400 dark:to-amber-500 dark:text-slate-950 dark:shadow-amber-500/20 cursor-pointer"
        >
          {isVerifying ? 'Verifying...' : 'Verify Code'}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0}
          className="mt-3.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-700 transition-all duration-150 hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
        >
          {countdown > 0 ? `Resend code in 00:${String(countdown).padStart(2, '0')}` : 'Resend Code'}
        </button>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          Secure verification for privileged account access
        </div>
      </div>
    </div>
  );
};
