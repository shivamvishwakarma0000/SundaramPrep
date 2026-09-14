import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import type { PortalTab } from './types';
import { HomeView } from './features/home/HomeView';
import { PracticeHub } from './features/practice/PracticeHub';
import { AIFloatingTrigger } from './components/assistant/AIFloatingTrigger';
import { AuthModal } from './features/auth/AuthModal';
import { PWAInstallModal } from './components/common/PWAInstallModal';
import { PDFUploadModal } from './components/pdf/PDFUploadModal';
import { api } from './api/client';
import type { User, ExamType, Question, PracticeMode } from './types';
import { LandingPage } from './features/landing/LandingPage';
import { ThemeProvider } from './context/ThemeContext';

// Dynamic lazy imports to minimize initial JavaScript bundle size and load 3x faster
const PracticeArena = lazy(() => import('./features/practice/PracticeArena').then(m => ({ default: m.PracticeArena })));
const PDFStudio = lazy(() => import('./features/pdf/PDFStudio').then(m => ({ default: m.PDFStudio })));
const AnalyticsView = lazy(() => import('./features/analytics/AnalyticsView').then(m => ({ default: m.AnalyticsView })));
const ProfileView = lazy(() => import('./features/profile/ProfileView').then(m => ({ default: m.ProfileView })));
const SundaramAIAssistant = lazy(() => import('./features/assistant/SundaramAIAssistant').then(m => ({ default: m.SundaramAIAssistant })));
const CurrentAffairsView = lazy(() => import('./features/news/CurrentAffairsView').then(m => ({ default: m.CurrentAffairsView })));

const TabSuspenseFallback = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-3">
    <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
    <span className="text-xs text-slate-500 font-medium">Loading workspace module...</span>
  </div>
);

export function AppContent() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('sundaram_user_cache');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [currentExam, setCurrentExam] = useState<ExamType>(() => {
    try {
      const cached = localStorage.getItem('sundaram_user_cache');
      if (cached) {
        const u = JSON.parse(cached);
        if (u.target_exam) return u.target_exam;
      }
    } catch {}
    return 'UPSC_CSE';
  });
  const [activeTab, setActiveTab] = useState<PortalTab>('home');

  // Active Practice Session state (for Single-Feature Practice flow)
  const [activePracticeMode, setActivePracticeMode] = useState<PracticeMode | null>(null);
  const [activePracticeSubject, setActivePracticeSubject] = useState<string | undefined>(undefined);
  const [activePracticeTopic, setActivePracticeTopic] = useState<string | undefined>(undefined);
  const [activePDFDoc, setActivePDFDoc] = useState<{ id?: string; ids?: string[]; title: string } | null>(null);

  // PDF Upload Modal State
  const [isPDFUploadOpen, setIsPDFUploadOpen] = useState<boolean>(false);

  // Sundaram AI state
  const [isAIOpen, setIsAIOpen] = useState<boolean>(false);
  const [aiQuestionContext, setAiQuestionContext] = useState<Question | null>(null);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | null>(null);

  // Auth modal state
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  // Synced real-time streak state (defaults to 1 for today)
  const [syncedStreak, setSyncedStreak] = useState<number>(() => {
    try {
      const cached = localStorage.getItem("sundaram_home_summary_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (typeof parsed?.streak === 'number' && parsed.streak > 0) return parsed.streak;
      }
    } catch {}
    return 1;
  });

  // Check auth token and hydrate data on mount in parallel for instantaneous load
  useEffect(() => {
    async function initApp() {
      try {
        const token = localStorage.getItem('sundaram_token');
        const promises: [Promise<any>, Promise<any>?] = [
          api.getHomeSummary().catch(() => null)
        ];
        
        if (token) {
          promises.push(
            api.getMe().catch((err) => {
              if (err?.code === 'UNAUTHORIZED' || err?.message?.includes('token')) {
                localStorage.removeItem('sundaram_token');
                localStorage.removeItem('sundaram_user_cache');
              }
              return null;
            })
          );
        }

        const results = await Promise.allSettled(promises);
        
        const homeRes = results[0].status === 'fulfilled' ? results[0].value : null;
        if (homeRes?.streak) {
          setSyncedStreak(homeRes.streak);
        }

        if (token && results[1] && results[1].status === 'fulfilled') {
          const userRes = results[1].value;
          if (userRes?.user) {
            setUser(userRes.user);
            localStorage.setItem('sundaram_user_cache', JSON.stringify(userRes.user));
            if (userRes.user.streak_count) {
              setSyncedStreak(userRes.user.streak_count);
            }
            if (userRes.user.target_exam) {
              setCurrentExam(userRes.user.target_exam);
            }
          }
        }
      } catch (e) {
        // Safe fallback
      }
    }
    initApp();
  }, []);

  const handleExamChange = (newExam: ExamType) => {
    setCurrentExam(newExam);
    if (user) {
      api.updatePreferences({ target_exam: newExam }).catch(console.error);
    }
  };

  const openAIWithPrompt = (prompt: string) => {
    setAiQuestionContext(null);
    setAiInitialPrompt(prompt);
    setIsAIOpen(true);
  };

  const openAIWithQuestion = (
    q: Question,
    actionType: 'HINGLISH' | 'WHY_WRONG' | 'MEMORY_TRICK'
  ) => {
    setAiQuestionContext(q);
    let prompt = '';
    if (actionType === 'HINGLISH') {
      prompt = `Explain this question in Hinglish: "${q.question_text}"`;
    } else if (actionType === 'WHY_WRONG') {
      prompt = `Why is option A wrong and what was the conceptual trap in: "${q.question_text}"?`;
    } else {
      prompt = `Give me a high-retention memory trick for "${q.topic}" in ${q.subject}.`;
    }
    setAiInitialPrompt(prompt);
    setIsAIOpen(true);
  };

  const isPoppingRef = useRef(false);

  // Handle Back Navigation (for phone hardware back button & UI button)
  const handleGoBack = () => {
    if (isPDFUploadOpen) {
      setIsPDFUploadOpen(false);
      return;
    }
    if (isAIOpen) {
      setIsAIOpen(false);
      return;
    }
    if (isAuthOpen) {
      setIsAuthOpen(false);
      return;
    }
    if (activePracticeMode) {
      setActivePracticeMode(null);
      setActivePracticeSubject(undefined);
      setActivePracticeTopic(undefined);
      setActivePDFDoc(null);
      return;
    }
    if (activeTab !== 'home') {
      setActiveTab('home');
      return;
    }
  };

  // Sync browser history state so mobile phone back button returns gracefully
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      isPoppingRef.current = true;
      handleGoBack();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isPDFUploadOpen, isAIOpen, isAuthOpen, activePracticeMode, activeTab]);

  // Push history state on sub-mode navigation so hardware phone back button pops state
  useEffect(() => {
    if (isPoppingRef.current) {
      isPoppingRef.current = false;
      return;
    }
    if (activeTab !== 'home' || activePracticeMode || isPDFUploadOpen || isAIOpen || isAuthOpen) {
      window.history.pushState({ tab: activeTab, mode: activePracticeMode }, '');
    }
  }, [activeTab, activePracticeMode, isPDFUploadOpen, isAIOpen, isAuthOpen]);

  const handleTabSelect = (tab: PortalTab) => {
    if (tab === 'ai') {
      setAiQuestionContext(null);
      setAiInitialPrompt(null);
      setIsAIOpen(true);
      return;
    }
    // If switching main sections, reset active drill to ensure Single-Feature UI Principle
    setActivePracticeMode(null);
    setActivePracticeSubject(undefined);
    setActivePracticeTopic(undefined);
    setActivePDFDoc(null);
    setActiveTab(tab);
  };

  const handleStartPDFPractice = (docId: string, title: string) => {
    setActivePDFDoc({ id: docId, title });
    setActivePracticeMode('PDF_PRACTICE' as any);
    setActiveTab('practice');
  };

  const handleLogout = () => {
    localStorage.removeItem('sundaram_token');
    localStorage.removeItem('sundaram_user_cache');
    localStorage.removeItem('sundaram_profile_cache');
    localStorage.removeItem('sundaram_home_summary_cache');
    setUser(null);
    setActiveTab('home');
  };

  if (!user) {
    return (
      <LandingPage
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          if (loggedInUser.target_exam) {
            setCurrentExam(loggedInUser.target_exam);
          }
          if (loggedInUser.streak_count !== undefined) {
            setSyncedStreak(loggedInUser.streak_count);
          }
          setActiveTab('home');
        }}
      />
    );
  }

  const isFocusTest = activePracticeMode === 'FOCUS_TEST';
  const canGoBack = activeTab !== 'home' || Boolean(activePracticeMode) || isPDFUploadOpen || isAIOpen;

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-dark-text flex flex-col antialiased transition-colors">
      {/* Top Header - Hidden in Focus Mode for absolute distraction-free proctoring */}
      {!isFocusTest && (
        <Header
          user={user}
          currentExam={currentExam}
          onExamChange={handleExamChange}
          canGoBack={canGoBack}
          onGoBack={handleGoBack}
          streakCount={syncedStreak}
          activeTab={activeTab}
          onTabSelect={handleTabSelect}
          onOpenAI={() => {
            setAiQuestionContext(null);
            setAiInitialPrompt(null);
            setIsAIOpen(true);
          }}
          onOpenAuth={() => {
            if (user) {
              handleTabSelect('profile');
            } else {
              setIsAuthOpen(true);
            }
          }}
        />
      )}

      {/* Secondary Navigation Bar on Tablets (hidden on lg+ screens where Header has integrated center tabs) */}
      {!isFocusTest && (
        <div className="hidden md:block lg:hidden bg-white/90 dark:bg-dark-surface/90 backdrop-blur border-b border-slate-200 dark:border-dark-border py-2 px-4 shadow-2xs transition-colors">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'home', label: 'HOME' },
                { id: 'practice', label: 'PRACTICE' },
                { id: 'upload', label: 'UPLOAD PDF' },
                { id: 'progress', label: 'PROGRESS' },
                { id: 'profile', label: 'PROFILE' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTabSelect(item.id as PortalTab)}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === item.id
                      ? 'bg-brand-600 dark:bg-brand-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-dark-muted hover:text-slate-900 dark:hover:text-dark-text hover:bg-slate-100 dark:hover:bg-dark-card'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-500 dark:text-dark-muted font-medium">
              Active Target: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{currentExam.replace('_', ' ')}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Main Single-Feature View Area (Section 11 Compliance: SHOW ONLY THAT FEATURE) */}
      <main className={`flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 ${isFocusTest ? 'pb-6' : 'pb-28 md:pb-8'} space-y-6`}>
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <HomeView
            onNavigate={(tab) => handleTabSelect(tab)}
            currentExam={currentExam}
            onLaunchQuick10={() => {
              setActivePracticeMode('QUICK_10');
              setActiveTab('practice');
            }}
            onLaunchFocusTest={() => {
              setActivePracticeMode('FOCUS_TEST');
              setActiveTab('practice');
            }}
            onOpenAIWithPrompt={openAIWithPrompt}
            onOpenUploadModal={() => {
              if (user?.role === 'ADMIN') {
                setIsPDFUploadOpen(true);
              } else {
                setActiveTab('upload');
              }
            }}
          />
        )}

        {/* TAB 2: CURRENT AFFAIRS (Daily UPSC News & Gemini Analysis) */}
        {activeTab === 'news' && (
          <Suspense fallback={<TabSuspenseFallback />}>
            <CurrentAffairsView />
          </Suspense>
        )}

        {/* TAB 3: PRACTICE */}
        {activeTab === 'practice' && (
          activePracticeMode ? (
            <Suspense fallback={<TabSuspenseFallback />}>
              <PracticeArena
                mode={activePracticeMode}
                currentExam={currentExam}
                subject={activePracticeSubject}
                topic={activePracticeTopic}
                documentId={activePDFDoc?.id}
                documentIds={activePDFDoc?.ids}
                documentTitle={activePDFDoc?.title}
                onOpenAIWithQuestion={openAIWithQuestion}
                onExit={() => {
                  setActivePracticeMode(null);
                  setActivePracticeSubject(undefined);
                  setActivePracticeTopic(undefined);
                  setActivePDFDoc(null);
                }}
                onRestartWithTopic={(topicName) => {
                  setActivePracticeTopic(topicName);
                  setActivePracticeMode('MOCK_TEST');
                }}
              />
            </Suspense>
          ) : (
            <PracticeHub
              currentExam={currentExam}
              onStartMode={(m, subject, topic) => {
                setActivePracticeMode(m);
                setActivePracticeSubject(subject);
                setActivePracticeTopic(topic);
              }}
              onStartPDFMockTest={(documentIds, title) => {
                setActivePracticeMode('MOCK_TEST');
                setActivePDFDoc({
                  id: documentIds.length === 1 ? documentIds[0] : undefined,
                  ids: documentIds,
                  title: title
                });
              }}
              onNavigateToUpload={() => setActiveTab('upload')}
              onOpenAIWithQuestion={openAIWithQuestion}
            />
          )
        )}

        {/* TAB 3: UPLOAD (PDF Intelligence Studio) */}
        {activeTab === 'upload' && (
          <Suspense fallback={<TabSuspenseFallback />}>
            <PDFStudio
              user={user}
              onStartPractice={(docId, title) => handleStartPDFPractice(docId, title)}
            />
          </Suspense>
        )}

        {/* TAB 4: PROGRESS (Analytics & Mastery) */}
        {activeTab === 'progress' && (
          <Suspense fallback={<TabSuspenseFallback />}>
            <AnalyticsView onOpenAIWithPrompt={openAIWithPrompt} />
          </Suspense>
        )}

        {/* TAB 6: PROFILE & SETTINGS (Section 12) */}
        {activeTab === 'profile' && (
          <Suspense fallback={<TabSuspenseFallback />}>
            <ProfileView
              currentExam={currentExam}
              onExamChange={handleExamChange}
              onLogout={handleLogout}
            />
          </Suspense>
        )}
      </main>

      {/* PDF Upload Modal with Animated Percentage Progress Bar */}
      <PDFUploadModal
        isOpen={isPDFUploadOpen}
        onClose={() => setIsPDFUploadOpen(false)}
        onStartPracticeWithDoc={handleStartPDFPractice}
        onNavigateToStudio={() => {
          handleTabSelect('upload');
        }}
      />

      {/* Mobile Bottom Navigation (6 Portal Tabs) - Suppressed in Focus Mode */}
      {!isFocusTest && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabSelect}
        />
      )}

      {/* Floating 3D AI Assistant Trigger Button (Suppressed in Focus Mode or when AI panel is open) */}
      {!isFocusTest && (
        <AIFloatingTrigger
          isOpen={isAIOpen}
          onClick={() => setIsAIOpen(true)}
        />
      )}

      {/* Sundaram AI Assistant Drawer (Available on demand) */}
      <Suspense fallback={null}>
        <SundaramAIAssistant
          isOpen={isAIOpen}
          onClose={() => setIsAIOpen(false)}
          activeQuestionContext={aiQuestionContext}
          initialPrompt={aiInitialPrompt}
        />
      </Suspense>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(loggedUser) => setUser(loggedUser)}
      />

      {/* PWA Download / Install App Modal */}
      <PWAInstallModal />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;

