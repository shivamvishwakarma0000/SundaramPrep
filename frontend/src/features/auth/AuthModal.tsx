import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User as UserIcon, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, KeyRound, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import type { User, ExamType } from '../../types';
import { SundaramLogo } from '../../components/common/SundaramLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

type AuthViewMode =
  | 'login'
  | 'register_01_account'
  | 'register_02_verify'
  | 'register_03_personalize'
  | 'forgot_01_email'
  | 'forgot_02_reset';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthViewMode>('login');
  
  // Registration / Credentials State
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('sundaram');
  const [targetExam, setTargetExam] = useState<ExamType>('UPSC_CSE');
  
  // OTP Verification State
  const [otp, setOtp] = useState<string>('');
  const [resendSeconds, setResendSeconds] = useState<number>(0);
  const [otpPurpose, setOtpPurpose] = useState<'REGISTRATION' | 'FORGOT_PASSWORD'>('REGISTRATION');
  
  // Forgot Password
  const [newPassword, setNewPassword] = useState<string>('');
  
  // Step 03 Personalization
  const [dailyGoal, setDailyGoal] = useState<number>(30);
  const [prepLanguage, setPrepLanguage] = useState<string>('EN');
  
  // Transient state
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Resend OTP countdown timer
  useEffect(() => {
    let timer: any = null;
    if (resendSeconds > 0) {
      timer = setInterval(() => {
        setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendSeconds]);

  if (!isOpen) return null;

  // 1-Click Instant Reviewer / Aspirant Demo Login
  const handleDemoLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.demoLogin();
      localStorage.setItem('sundaram_token', res.token);
      onLoginSuccess(res.user);
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 01: Account Creation (Instant Activation - No OTP required)
  const handleRegisterAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.register({
        full_name: fullName,
        email: email.trim(),
        password: password.trim() || 'sundaram',
        target_exam: targetExam,
      });

      if (res.token) {
        localStorage.setItem('sundaram_token', res.token);
      }
      if (res.user) {
        onLoginSuccess(res.user);
      }
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 02: OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setErrorMsg('Please enter all 6 digits of your verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.verifyOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        purpose: otpPurpose,
      });

      if (res.token) {
        localStorage.setItem('sundaram_token', res.token);
      }

      if (otpPurpose === 'REGISTRATION') {
        if (res.user) setAuthenticatedUser(res.user);
        setMode('register_03_personalize');
      } else {
        // Forgot password verified
        setSuccessMsg('Code verified. Set your new password.');
        setMode('forgot_02_reset');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendSeconds > 0) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.resendOtp({
        email: email.trim().toLowerCase(),
        purpose: otpPurpose,
      });
      setResendSeconds(res.resend_cooldown_seconds || 30);
      setSuccessMsg(`Fresh verification code sent to ${email}.`);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 03: Personalization & Finish
  const handlePersonalizeComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.personalize({
        target_exam: targetExam,
        daily_goal: dailyGoal,
        language: prepLanguage,
      });

      const finalUser = res.user || authenticatedUser;
      if (finalUser) {
        onLoginSuccess(finalUser);
      }
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Standard Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.login({
        email: email.trim(),
        password: password.trim() || 'sundaram',
        target_exam: targetExam,
      });

      localStorage.setItem('sundaram_token', res.token);
      onLoginSuccess(res.user);
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Request
  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      await api.forgotPasswordRequest(email.trim().toLowerCase());
      setOtpPurpose('FORGOT_PASSWORD');
      setResendSeconds(30);
      setSuccessMsg(`If an account exists for ${email}, a verification code was sent.`);
      setMode('register_02_verify');
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Reset
  const handleForgotPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.forgotPasswordReset({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        new_password: newPassword,
      });
      setSuccessMsg(res.message);
      setMode('login');
      setPassword('');
      setNewPassword('');
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Multi-step Registration Stepper Navigation Header
  const isRegisterWizard = mode.startsWith('register_');
  const getStepNumber = () => {
    if (mode === 'register_01_account') return 1;
    if (mode === 'register_02_verify') return 2;
    if (mode === 'register_03_personalize') return 3;
    return 1;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-card rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-cool-200 dark:border-dark-border relative overflow-y-auto max-h-[92dvh] sm:max-h-[90vh] pb-safe text-slate-900 dark:text-white">
        {/* Top Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-950 via-brand-600 to-indigo-500" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-dark-muted dark:hover:text-white hover:bg-cool-100 dark:hover:bg-dark-surface transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Wizard Stepper Header if registering */}
        {isRegisterWizard ? (
          <div className="mb-6 pt-1">
            <div className="flex items-center justify-between mb-3 text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-dark-muted">
              <span className={getStepNumber() >= 1 ? 'text-royal-600 dark:text-royal-400 font-extrabold' : ''}>01 Account</span>
              <span>→</span>
              <span className={getStepNumber() >= 2 ? 'text-royal-600 dark:text-royal-400 font-extrabold' : ''}>02 Verify Email</span>
              <span>→</span>
              <span className={getStepNumber() >= 3 ? 'text-royal-600 dark:text-royal-400 font-extrabold' : ''}>03 Personalize</span>
              <span>→</span>
              <span>04 Dashboard</span>
            </div>
            <div className="w-full bg-cool-100 dark:bg-dark-surface h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-royal-600 dark:bg-royal-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${(getStepNumber() / 4) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-center mb-6 pt-1 flex flex-col items-center">
            <SundaramLogo size="xl" className="w-14 h-14 mb-2" />
            <span className="text-[11px] font-extrabold tracking-widest text-royal-600 dark:text-royal-400 uppercase font-display">
              Sundaram Prep
            </span>
            <h3 className="text-xl font-bold font-display text-slate-900 dark:text-white mt-1">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'forgot_01_email' && 'Reset Password'}
              {mode === 'forgot_02_reset' && 'Create New Password'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-1">
              {mode === 'login' && 'Practice. Focus. Improve.'}
              {mode === 'forgot_01_email' && 'Enter your primary email to receive a 6-digit recovery code.'}
              {mode === 'forgot_02_reset' && 'Choose a strong password for your account.'}
            </p>
          </div>
        )}

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mb-4 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-3 rounded-xl animate-in fade-in">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 p-3 rounded-xl flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: LOGIN */}
        {/* ------------------------------------------------------------- */}
        {mode === 'login' && (
          <div>
            {/* 1-Click Demo Aspirant Login */}
            <div className="mb-4">
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-950 to-royal-700 hover:from-brand-900 hover:to-royal-600 text-white text-xs font-bold shadow-sm transition-all active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-violet-300" />
                <span>Instant Demo Aspirant Login</span>
              </button>
              <div className="flex items-center my-3.5">
                <div className="flex-1 border-t border-cool-200 dark:border-dark-border" />
                <span className="px-3 text-[10px] text-slate-400 dark:text-dark-muted uppercase font-semibold">
                  Or with email & password
                </span>
                <div className="flex-1 border-t border-cool-200 dark:border-dark-border" />
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number or Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. 9876543210 or your email"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-cool-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-royal-500 focus:border-royal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Exam
                </label>
                <select
                  value={targetExam}
                  onChange={(e) => setTargetExam(e.target.value as ExamType)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-cool-200 dark:border-dark-border bg-white dark:bg-dark-surface focus:ring-2 focus:ring-royal-500 focus:border-royal-500 outline-none font-medium text-slate-800 dark:text-slate-200"
                >
                  <option value="UPSC_CSE">UPSC Civil Services (CSE)</option>
                  <option value="SSC_CGL">SSC CGL</option>
                  <option value="BANK_PO">Banking PO / Clerk</option>
                  <option value="RAILWAY_RRB">Railway RRB</option>
                  <option value="STATE_PSC">State PSC</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                    Default: sundaram
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="sundaram"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-cool-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-royal-500 focus:border-royal-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 bg-royal-600 hover:bg-royal-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Entering Portal...' : 'Enter Portal / Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="mt-5 text-center pt-3 border-t border-cool-100 dark:border-dark-border">
              <p className="text-[11px] text-slate-500 dark:text-dark-muted">
                Any mobile number works! New users are registered automatically.
              </p>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 01: CREATE ACCOUNT */}
        {/* ------------------------------------------------------------- */}
        {mode === 'register_01_account' && (
          <div>
            <div className="mb-4 text-center">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white font-display">Create Aspirant Account</h4>
              <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">
                Join Sundaram Prep to practice verified high-yield MCQs.
              </p>
            </div>

            <form onSubmit={handleRegisterAccount} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sundaram Sharma"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-cool-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-royal-500 focus:border-royal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aspirant@gmail.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-cool-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-royal-500 focus:border-royal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password (min. 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-cool-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-royal-500 focus:border-royal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Exam
                </label>
                <select
                  value={targetExam}
                  onChange={(e) => setTargetExam(e.target.value as ExamType)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-cool-200 dark:border-dark-border bg-white dark:bg-dark-surface focus:ring-2 focus:ring-royal-500 focus:border-royal-500 outline-none font-medium text-slate-800 dark:text-slate-200"
                >
                  <option value="UPSC_CSE">UPSC Civil Services (CSE)</option>
                  <option value="SSC_CGL">SSC CGL</option>
                  <option value="BANK_PO">Banking PO / Clerk</option>
                  <option value="RAILWAY_RRB">Railway RRB</option>
                  <option value="STATE_PSC">State PSC</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 bg-royal-600 hover:bg-royal-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Creating Account...' : 'Continue to Verification'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="mt-5 text-center pt-3 border-t border-cool-100 dark:border-dark-border">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setSuccessMsg(null);
                  setMode('login');
                }}
                className="text-xs text-royal-600 dark:text-royal-400 hover:text-royal-800 dark:hover:text-royal-300 font-semibold"
              >
                Already have an account? Sign in
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 02: VERIFY EMAIL OTP */}
        {/* ------------------------------------------------------------- */}
        {mode === 'register_02_verify' && (
          <div>
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-royal-600 dark:text-royal-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white font-display">Verify your email</h4>
              <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 max-w-xs mx-auto">
                We sent a 6-digit verification code to <span className="font-semibold text-slate-800 dark:text-slate-200">{email}</span>.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-center text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Enter 6-Digit Code
                </label>
                <div className="flex justify-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="482913"
                    className="w-48 text-center text-2xl font-mono tracking-widest font-extrabold py-2.5 px-3 rounded-xl border border-cool-300 dark:border-dark-border focus:ring-2 focus:ring-royal-500 outline-none text-slate-900 dark:text-white bg-slate-50 dark:bg-dark-surface"
                  />
                </div>
                <p className="text-[11px] text-center text-slate-400 dark:text-dark-muted mt-2">
                  ⏱ This code expires in 10 minutes.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full py-3 bg-royal-600 hover:bg-royal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Verifying...' : 'Verify & Continue'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Resend OTP with 30s countdown */}
              <div className="text-center pt-2">
                {resendSeconds > 0 ? (
                  <p className="text-xs text-slate-500 dark:text-dark-muted font-medium">
                    Resend available in <span className="font-bold text-royal-600 dark:text-royal-400">{resendSeconds}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-xs text-royal-600 dark:text-royal-400 hover:text-royal-800 dark:hover:text-royal-300 font-semibold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resend OTP</span>
                  </button>
                )}
              </div>
            </form>

            <div className="mt-5 text-center pt-3 border-t border-cool-100 dark:border-dark-border">
              <button
                type="button"
                onClick={() => setMode('register_01_account')}
                className="text-xs text-slate-500 dark:text-dark-muted hover:text-slate-700 dark:hover:text-slate-200"
              >
                Wrong email address? Edit
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 03: PERSONALIZE */}
        {/* ------------------------------------------------------------- */}
        {mode === 'register_03_personalize' && (
          <div>
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white font-display">Personalize Your Preparation</h4>
              <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">
                Tailor your daily learning loop for maximum score improvements.
              </p>
            </div>

            <form onSubmit={handlePersonalizeComplete} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Daily MCQ Practice Target
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 50].map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => setDailyGoal(goal)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        dailyGoal === goal
                          ? 'border-royal-600 dark:border-royal-500 bg-royal-50 dark:bg-royal-950/40 text-royal-700 dark:text-royal-300 shadow-xs'
                          : 'border-cool-200 dark:border-dark-border text-slate-600 dark:text-slate-300 hover:border-cool-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {goal} MCQs
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Study Language
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'EN', label: 'English' },
                    { id: 'HI', label: 'Hindi (हिंदी)' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setPrepLanguage(lang.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        prepLanguage === lang.id
                          ? 'border-royal-600 dark:border-royal-500 bg-royal-50 dark:bg-royal-950/40 text-royal-700 dark:text-royal-300 shadow-xs'
                          : 'border-cool-200 dark:border-dark-border text-slate-600 dark:text-slate-300 hover:border-cool-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-3 bg-royal-600 hover:bg-royal-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <span>Enter Aspirant Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* FORGOT PASSWORD: REQUEST OTP */}
        {/* ------------------------------------------------------------- */}
        {mode === 'forgot_01_email' && (
          <div>
            <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aspirant@sundaramprep.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-cool-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-royal-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-royal-600 hover:bg-royal-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Sending Code...' : 'Send Recovery Code'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="mt-5 text-center pt-3 border-t border-cool-100 dark:border-dark-border">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-royal-600 dark:text-royal-400 hover:text-royal-800 dark:hover:text-royal-300 font-semibold"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* FORGOT PASSWORD: RESET PASSWORD */}
        {/* ------------------------------------------------------------- */}
        {mode === 'forgot_02_reset' && (
          <div>
            <form onSubmit={handleForgotPasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password (min. 6 characters)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-cool-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-royal-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-royal-600 hover:bg-royal-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Updating...' : 'Set New Password & Login'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="mt-5 text-center pt-3 border-t border-cool-100 dark:border-dark-border">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-royal-600 dark:text-royal-400 hover:text-royal-800 dark:hover:text-royal-300 font-semibold"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
