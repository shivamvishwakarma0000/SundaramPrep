import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Flame, 
  ArrowRight, 
  Lock, 
  Phone, 
  User as UserIcon, 
  X, 
  BrainCircuit,
  Compass
} from 'lucide-react';
import { api } from '../../api/client';
import type { User, ExamType } from '../../types';

interface LandingPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
  // Modal states
  const [modalMode, setModalMode] = useState<'LOGIN' | 'REGISTER' | null>(null);

  // Form states
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('sundaram');
  const [fullName, setFullName] = useState('');
  const [targetExam, setTargetExam] = useState<ExamType>('UPSC_CSE');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenLogin = (prefillPhone?: string) => {
    setErrorMsg(null);
    if (prefillPhone) {
      setPhone(prefillPhone);
      setPassword('sundaram');
    }
    setModalMode('LOGIN');
  };

  const handleOpenRegister = () => {
    setErrorMsg(null);
    setModalMode('REGISTER');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setErrorMsg('Please enter your phone number.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.phoneLogin(phone.trim(), password.trim() || 'sundaram');
      if (res?.user && res?.token) {
        localStorage.setItem('sundaram_token', res.token);
        localStorage.setItem('sundaram_user_cache', JSON.stringify(res.user));
        onLoginSuccess(res.user);
      } else {
        throw new Error('Login failed. Please verify credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login failed. Please check your phone number and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setErrorMsg('Please enter a valid 10-digit phone number.');
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
        password: password.trim() || 'sundaram',
        target_exam: targetExam,
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

  return (
    <div className="min-h-screen bg-[#071426] text-white flex flex-col selection:bg-brand-500 selection:text-white relative overflow-hidden">
      {/* Ambient background lighting glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-brand-600/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 -left-32 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#071426]/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 p-0.5 shadow-lg shadow-brand-500/20">
              <div className="w-full h-full bg-[#071426] rounded-[14px] flex items-center justify-center font-display font-black text-xl text-sky-400">
                S
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-black text-lg tracking-tight text-white">SUNDARAM</span>
                <span className="font-display font-black text-lg tracking-tight text-sky-400">PREP</span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">UPSC & Competitive Exams Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOpenLogin()}
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-700"
            >
              Sign In
            </button>
            <button
              onClick={handleOpenRegister}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-600/30 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Join as Aspirant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 flex flex-col items-center text-center relative z-10">
        {/* Top Pulsing Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-950/80 border border-brand-700/60 text-sky-300 text-xs font-bold mb-6 shadow-xs animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Civil Services & State PSC Prelims 2026</span>
          <span className="text-[10px] text-brand-300 px-1.5 py-0.5 rounded-md bg-brand-900/60 font-semibold">AI Powered</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-white max-w-4xl leading-[1.15] mb-6">
          Smart Practice, AI Verification & <span className="bg-gradient-to-r from-sky-400 via-brand-300 to-amber-300 bg-clip-text text-transparent">Exam Consistency</span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed mb-8">
          Practice authentic UPSC questions, attempt tests from PDFs curated by Sundaram Vishwakarma, understand conceptual traps with AI explanations, and build a lasting daily study streak.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full max-w-md justify-center mb-14">
          <button
            onClick={handleOpenRegister}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-sky-400 to-brand-500 hover:from-sky-300 hover:to-brand-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-sky-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <span>Register in 5 Seconds</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => handleOpenLogin('9794529611')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-sm rounded-2xl border border-slate-700/80 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Login as Sundaram (Admin)</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 w-full max-w-3xl mb-16">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur">
            <div className="font-display font-black text-2xl text-sky-400">100+</div>
            <div className="text-xs text-slate-400 font-semibold mt-0.5">Verified GS MCQs</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur">
            <div className="font-display font-black text-2xl text-emerald-400">0ms</div>
            <div className="text-xs text-slate-400 font-semibold mt-0.5">Instant UI Cache</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur">
            <div className="font-display font-black text-2xl text-amber-400">Deep AI</div>
            <div className="text-xs text-slate-400 font-semibold mt-0.5">Why & Memory Tricks</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur">
            <div className="font-display font-black text-2xl text-indigo-400">100%</div>
            <div className="text-xs text-slate-400 font-semibold mt-0.5">Student Data Isolation</div>
          </div>
        </div>

        {/* 3. 4 Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-4xl text-left">
          {/* Feature 1 */}
          <div className="relative overflow-hidden p-6 rounded-3xl bg-slate-900/50 border border-slate-800/80 backdrop-blur hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-display font-black text-lg text-white mb-2">Curated PDF Test Papers</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Attempt interactive mock tests extracted directly from authentic UPSC PDFs. Features countdown timers, negative marking, and complete answer keys.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="relative overflow-hidden p-6 rounded-3xl bg-slate-900/50 border border-slate-800/80 backdrop-blur hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="font-display font-black text-lg text-white mb-2">Sundaram AI Tutor</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Never get stuck on ambiguous options. Our factual AI explains why an answer is correct, highlights the conceptual trap, and provides high-retention mnemonics.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="relative overflow-hidden p-6 rounded-3xl bg-slate-900/50 border border-slate-800/80 backdrop-blur hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="font-display font-black text-lg text-white mb-2">Day-Wise Streak & Goals</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every new student starts with a clean slate: 0 streak, 0 questions solved. Build consistency step-by-step with real-time daily targets and streak celebrations.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="relative overflow-hidden p-6 rounded-3xl bg-slate-900/50 border border-slate-800/80 backdrop-blur hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="font-display font-black text-lg text-white mb-2">Daily Current Affairs News</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              High-yield daily news summaries aligned with GS-II and GS-III prelims and mains questions. Stay ahead with concise legal and policy takeaways.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        <p>© 2026 Sundaram Prep. Curated with dedication by Sundaram Vishwakarma.</p>
      </footer>

      {/* 4. Login Modal */}
      {modalMode === 'LOGIN' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0B1E36] border border-slate-700/80 w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl relative text-left">
            <button
              onClick={() => setModalMode(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-sky-400 flex items-center justify-center font-bold">
                <Lock className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-display font-black text-white">Sign In to Portal</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Enter your mobile number and password to access your dashboard.
            </p>

            {/* Quick Demo Admin Button */}
            <div className="mb-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Sundaram Admin Account</span>
                </div>
                <div className="text-[10px] text-slate-400">9794529611 · Pass: sundaram</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPhone('9794529611');
                  setPassword('sundaram');
                }}
                className="text-[11px] font-bold px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30 transition-colors cursor-pointer"
              >
                Auto-fill
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl text-xs font-bold bg-red-950/60 border border-red-800 text-red-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Mobile Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="Enter 10-digit phone (e.g. 9794529611)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">Password</label>
                  <span className="text-[10px] text-slate-400">Default: sundaram</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 bg-gradient-to-r from-sky-400 to-brand-500 hover:from-sky-300 hover:to-brand-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Sign In Now'}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
              New student?{' '}
              <button
                type="button"
                onClick={() => setModalMode('REGISTER')}
                className="text-sky-400 font-bold hover:underline cursor-pointer"
              >
                Register an account in 5s
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Register Modal */}
      {modalMode === 'REGISTER' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0B1E36] border border-slate-700/80 w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl relative text-left">
            <button
              onClick={() => setModalMode(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <UserIcon className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-display font-black text-white">Create Aspirant Account</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Start with 0 streak and build your consistency with full access to study materials.
            </p>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl text-xs font-bold bg-red-950/60 border border-red-800 text-red-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your name (e.g. Ramesh Kumar)"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Mobile Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">Password</label>
                  <span className="text-[10px] text-slate-400">Default: sundaram</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Create a password (or keep sundaram)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Target Exam</label>
                <select
                  value={targetExam}
                  onChange={(e) => setTargetExam(e.target.value as ExamType)}
                  className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                >
                  <option value="UPSC_CSE">UPSC Civil Services Examination (CSE)</option>
                  <option value="STATE_PSC">State PSC Prelims</option>
                  <option value="SSC_CGL">SSC CGL</option>
                  <option value="BANK_PO">Bank PO</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                {loading ? 'Creating Account...' : 'Complete Free Registration'}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setModalMode('LOGIN')}
                className="text-sky-400 font-bold hover:underline cursor-pointer"
              >
                Sign in directly
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
