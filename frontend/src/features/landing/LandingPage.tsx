import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  Phone, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  BookOpen, 
  Target, 
  Award, 
  FileText, 
  BrainCircuit, 
  TrendingUp, 
  Sun, 
  Moon, 
  Edit3, 
  Sparkles,
  Users,
  Compass
} from 'lucide-react';
import { api } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import type { User } from '../../types';

interface LandingPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
  const { theme, setTheme } = useTheme();

  // Active form mode: 'SIGN_IN' or 'REGISTER'
  const [formMode, setFormMode] = useState<'SIGN_IN' | 'REGISTER'>('SIGN_IN');

  // Input states
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setErrorMsg('Please enter your mobile phone number.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.phoneLogin(phone.trim(), password.trim());
      if (res?.user && res?.token) {
        localStorage.setItem('sundaram_token', res.token);
        localStorage.setItem('sundaram_user_cache', JSON.stringify(res.user));
        onLoginSuccess(res.user);
      } else {
        throw new Error('Login failed. Please check credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid credentials. Please verify your phone number and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile phone number.');
      return;
    }
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.registerStudent({
        name: fullName.trim(),
        phone: digits,
        password: 'sundaram',
        target_exam: 'UPSC_CSE',
      });
      if (res?.user && res?.token) {
        localStorage.setItem('sundaram_token', res.token);
        localStorage.setItem('sundaram_user_cache', JSON.stringify(res.user));
        onLoginSuccess(res.user);
      } else {
        throw new Error('Registration failed.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotMsg('If an account exists with this email, reset instructions have been sent.');
  };

  const scrollToForm = (mode: 'SIGN_IN' | 'REGISTER') => {
    setFormMode(mode);
    setErrorMsg(null);
    const element = document.getElementById('auth-card');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#071426] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white transition-colors">
      {/* Subtle Ambient Background Gradient */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-sky-200/40 dark:bg-brand-900/20 rounded-full blur-3xl" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-blue-100/50 dark:bg-sky-950/20 rounded-full blur-3xl" />
      </div>

      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#071426]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Official Logo Section */}
          <div className="flex items-center gap-3">
            <img
              src="/sundaram-logo.png"
              alt="Sundaram Prep Official Logo"
              className="w-11 h-11 sm:w-12 sm:h-12 object-contain rounded-2xl shadow-sm shrink-0 transition-transform hover:scale-105"
            />
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white leading-none">
                  SUNDARAM PREP
                </span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 leading-none">
                  PRO
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-1.5 leading-none">
                Practice. Focus. Improve.
              </p>
            </div>
          </div>

          {/* Right Controls: Theme Toggle, Sign In, Join as Aspirant */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Switcher Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Sign In Header Button */}
            <button
              onClick={() => scrollToForm('SIGN_IN')}
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs transition-all cursor-pointer"
            >
              Sign In
            </button>

            {/* Join as Aspirant Header Button */}
            <button
              onClick={() => scrollToForm('REGISTER')}
              className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-[#1D63FF] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Join as Aspirant</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section (Responsive Ordering: Phone [Image Top -> Copy -> Auth Card], Tablet [Copy & Image -> Auth Card], Desktop [3 Columns]) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14 overflow-x-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
          
          {/* ARTWORK IMAGE:
              Phone (< md): order-1 (IMAGE ON TOP!)
              Tablet (md to lg): order-2 md:col-span-1 (Right side)
              Desktop (>= lg): order-2 lg:col-span-4 (Center)
          */}
          <div className="order-1 md:order-2 lg:order-2 lg:col-span-4 flex flex-col items-center justify-center relative w-full min-w-0 px-2 sm:px-0">
            {/* Soft Radial Backlight */}
            <div className="absolute inset-0 bg-gradient-to-tr from-sky-200/40 via-blue-100/30 to-purple-100/20 dark:from-sky-900/20 dark:to-purple-900/10 rounded-full blur-2xl -z-10 transform scale-95 pointer-events-none" />

            {/* Floating Cursive Note on Top */}
            <div className="self-end mr-3 sm:mr-6 mb-1 sm:mb-2 rotate-6 text-sky-600 dark:text-sky-300 font-serif italic text-xs tracking-wider font-bold">
              Better Preparation<br />Brighter Future
            </div>

            {/* Image Container with Floating Badge */}
            <div className="relative w-full max-w-[260px] sm:max-w-xs md:max-w-sm mx-auto">
              <img
                src="/hero-student-upsc.png"
                alt="Sundaram Prep UPSC CSE Aspirant"
                className="w-full h-auto object-contain drop-shadow-2xl rounded-2xl sm:rounded-3xl"
              />

              {/* Floating Pill: UPSC CSE & More (Safe positioning inside bounds) */}
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-[10px] sm:text-xs font-bold shadow-md">
                <Target className="w-3.5 h-3.5 text-[#1D63FF]" />
                <span>UPSC CSE & More</span>
              </div>
            </div>
          </div>

          {/* HERO COPY & PILLS:
              Phone (< md): order-2 (JUST BELOW IMAGE!)
              Tablet (md to lg): order-1 md:col-span-1 (Left side)
              Desktop (>= lg): order-1 lg:col-span-4 (Left column)
          */}
          <div className="order-2 md:order-1 lg:order-1 md:col-span-1 lg:col-span-4 space-y-5 sm:space-y-6 text-left w-full min-w-0">
            {/* Top Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-bold shadow-2xs">
              <Compass className="w-3.5 h-3.5 text-[#1D63FF]" />
              <span>Your Dream | Our Mission</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-2xl sm:text-3xl lg:text-[38px] xl:text-[42px] font-black font-display tracking-tight text-slate-900 dark:text-white leading-[1.15] break-words">
              Crack Your Dreams with{' '}
              <span className="text-[#1D63FF]">Sundaram</span>{' '}
              <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent">
                Prep
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-words">
              AI-powered learning platform for UPSC CSE and other competitive exams. Practice smart, learn faster, and achieve your goals with expert guidance and personalized support.
            </p>

            {/* 4 Feature Icons Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 w-full min-w-0">
              <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-center shadow-2xs min-w-0">
                <Target className="w-4 h-4 text-sky-500 mx-auto mb-1 shrink-0" />
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight truncate">Expert Content</div>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-center shadow-2xs min-w-0">
                <BrainCircuit className="w-4 h-4 text-purple-500 mx-auto mb-1 shrink-0" />
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight truncate">AI Learning</div>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-center shadow-2xs min-w-0">
                <TrendingUp className="w-4 h-4 text-amber-500 mx-auto mb-1 shrink-0" />
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight truncate">Track Progress</div>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-center shadow-2xs min-w-0">
                <Award className="w-4 h-4 text-emerald-500 mx-auto mb-1 shrink-0" />
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight truncate">Build Success</div>
              </div>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-2">
              <ShieldCheck className="w-4 h-4 text-[#1D63FF] shrink-0" />
              <span>Trusted by 10,000+ aspirants across India</span>
            </div>
          </div>

          {/* AUTH CARD:
              Phone (< md): order-3 (BELOW COPY)
              Tablet (md to lg): order-3 md:col-span-2 max-w-md mx-auto w-full (Cleanly centered below)
              Desktop (>= lg): order-3 lg:col-span-4 w-full (Right column)
          */}
          <div className="order-3 md:order-3 lg:order-3 md:col-span-2 lg:col-span-4 w-full max-w-md mx-auto min-w-0" id="auth-card">
            <div className="bg-white dark:bg-[#0B1E36] border border-slate-200/90 dark:border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-xl transition-all relative">
              {/* Card Header */}
              <div className="mb-5 text-left">
                <h2 className="text-xl font-black font-display text-slate-900 dark:text-white">
                  {formMode === 'SIGN_IN' ? 'Welcome Back' : 'Join as Aspirant'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {formMode === 'SIGN_IN'
                    ? 'Sign in to continue your learning journey'
                    : 'Create your account to access curated tests & AI tutor'}
                </p>
              </div>

              {/* Segmented Mode Switcher */}
              <div className="flex p-1 bg-slate-100 dark:bg-slate-900/70 rounded-2xl mb-5 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setFormMode('SIGN_IN');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    formMode === 'SIGN_IN'
                      ? 'bg-[#1D63FF] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormMode('REGISTER');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    formMode === 'REGISTER'
                      ? 'bg-[#1D63FF] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Join as Aspirant
                </button>
              </div>

              {/* Error Message Display */}
              {errorMsg && (
                <div className="p-3 mb-4 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
                  {errorMsg}
                </div>
              )}

              {/* Form 1: SIGN IN */}
              {formMode === 'SIGN_IN' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Number or Email
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Enter mobile number (e.g. 9794529611)"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#1D63FF]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Password
                      </label>
                      <span className="text-[10px] text-[#1D63FF] dark:text-sky-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                        Default: sundaram
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter password (default: sundaram)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#1D63FF]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember me & Forgot password */}
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded text-[#1D63FF] focus:ring-[#1D63FF]"
                      />
                      <span>Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(true)}
                      className="text-xs text-[#1D63FF] hover:underline font-semibold cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#1D63FF] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>

                  {/* Switch to Register link */}
                  <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setFormMode('REGISTER')}
                      className="text-[#1D63FF] font-bold hover:underline cursor-pointer"
                    >
                      Join as Aspirant
                    </button>
                  </div>
                </form>
              ) : (
                /* Form 2: JOIN AS ASPIRANT (REGISTER - ONLY NAME & PHONE AS REQUESTED) */
                <form onSubmit={handleRegisterSubmit} className="space-y-4 text-left">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#1D63FF]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        placeholder="10-digit mobile number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#1D63FF]"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Your phone number will be your unique student ID.
                    </p>
                  </div>

                  {/* Clear Default Password Notice */}
                  <div className="p-3 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#1D63FF]" />
                        Default Password:
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/80 text-[#1D63FF] dark:text-sky-300 font-mono text-xs font-black">
                        sundaram
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                      Your separate student account will be created with default password <span className="font-bold text-slate-800 dark:text-slate-200">sundaram</span>. You can change your password anytime inside your Profile settings.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#1D63FF] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                  >
                    {loading ? 'Creating Account...' : 'Join as Aspirant'}
                  </button>

                  {/* Switch to Sign in link */}
                  <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setFormMode('SIGN_IN')}
                      className="text-[#1D63FF] font-bold hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* 3. Bottom Feature Cards Section ("Everything You Need to Succeed") */}
        <div className="mt-16 sm:mt-24 pt-10 border-t border-slate-200/80 dark:border-slate-800/80 text-center">
          <h2 className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white mb-2">
            Everything You Need to Succeed
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto mb-10">
            Comprehensive tools and resources to help you prepare better, practice smarter and stay ahead.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: MCQs Practice */}
            <div 
              onClick={() => scrollToForm('SIGN_IN')}
              className="p-5 rounded-3xl bg-white dark:bg-[#0B1E36] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all text-left flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-[#1D63FF] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="font-display font-black text-sm text-slate-900 dark:text-white mb-1">
                  MCQs Practice
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  High-quality questions with instant feedback.
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:bg-[#1D63FF] group-hover:text-white transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Card 2: Answer Writing */}
            <div 
              onClick={() => scrollToForm('SIGN_IN')}
              className="p-5 rounded-3xl bg-white dark:bg-[#0B1E36] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all text-left flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Edit3 className="w-5 h-5" />
                </div>
                <h3 className="font-display font-black text-sm text-slate-900 dark:text-white mb-1">
                  Answer Writing
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Improve your writing skills with expert evaluation.
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Card 3: PDF Upload */}
            <div 
              onClick={() => scrollToForm('SIGN_IN')}
              className="p-5 rounded-3xl bg-white dark:bg-[#0B1E36] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all text-left flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-display font-black text-sm text-slate-900 dark:text-white mb-1">
                  PDF Upload
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Convert test PDFs into interactive MCQs.
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Card 4: Progress Tracking */}
            <div 
              onClick={() => scrollToForm('SIGN_IN')}
              className="p-5 rounded-3xl bg-white dark:bg-[#0B1E36] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all text-left flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-display font-black text-sm text-slate-900 dark:text-white mb-1">
                  Progress Tracking
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Monitor your performance and identify weak areas.
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Card 5: AI Tutor */}
            <div 
              onClick={() => scrollToForm('SIGN_IN')}
              className="p-5 rounded-3xl bg-white dark:bg-[#0B1E36] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-left flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-display font-black text-sm text-slate-900 dark:text-white mb-1">
                  AI Tutor
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Get instant help, clear concepts and personalized guidance.
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Footer Dark Navy Ribbon */}
      <footer className="mt-auto bg-[#071A35] text-white py-6 sm:py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* 4 Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 text-left">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-sky-400 shrink-0" />
              <div>
                <div className="font-black text-sm sm:text-base text-white">10,000+</div>
                <div className="text-[10px] text-slate-400 font-semibold">Happy Aspirants</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="font-black text-sm sm:text-base text-white">95%</div>
                <div className="text-[10px] text-slate-400 font-semibold">Success Rate</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="font-black text-sm sm:text-base text-white">50+</div>
                <div className="text-[10px] text-slate-400 font-semibold">Subjects & Topics</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <BrainCircuit className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <div className="font-black text-sm sm:text-base text-white">24/7</div>
                <div className="text-[10px] text-slate-400 font-semibold">AI Support</div>
              </div>
            </div>
          </div>

          {/* Right Cursive Callout */}
          <div className="text-right">
            <span className="font-serif italic text-sm sm:text-base text-sky-300 tracking-wider font-bold">
              Learn Today Lead Tomorrow
            </span>
          </div>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-left">
            <h3 className="font-display font-black text-base text-slate-900 dark:text-white mb-1">
              Reset Password
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter your registered mobile or email to recover access.
            </p>
            {forgotMsg ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold mb-4">
                {forgotMsg}
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Mobile number or email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1D63FF]"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#1D63FF] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Send Reset Link
                </button>
              </form>
            )}
            <div className="mt-3 text-right">
              <button
                type="button"
                onClick={() => {
                  setIsForgotModalOpen(false);
                  setForgotMsg(null);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
