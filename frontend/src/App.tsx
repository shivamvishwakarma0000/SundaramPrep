import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import type { PortalTab } from './types';
import { HomeView } from './features/home/HomeView';
import { PracticeHub } from './features/practice/PracticeHub';
import { PracticeArena } from './features/practice/PracticeArena';
import { PDFStudio } from './features/pdf/PDFStudio';
import { AnalyticsView } from './features/analytics/AnalyticsView';
import { ProfileView } from './features/profile/ProfileView';
import { SundaramAIAssistant } from './features/assistant/SundaramAIAssistant';
import { AIFloatingTrigger } from './components/assistant/AIFloatingTrigger';
import { AuthModal } from './features/auth/AuthModal';
import { PWAInstallModal } from './components/common/PWAInstallModal';
import { PDFUploadModal } from './components/pdf/PDFUploadModal';
import { api } from './api/client';
import type { User, ExamType, Question, PracticeMode } from './types';
import { ThemeProvider } from './context/ThemeContext';

export function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [currentExam, setCurrentExam] = useState<ExamType>('UPSC_CSE');
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

  // Check auth token on mount
  useEffect(() => {
    async function initApp() {
      try {
        const token = localStorage.getItem('sundaram_token');
        if (token) {
          const res = await api.getMe();
          if (res.user) {
            setUser(res.user);
            if (res.user.streak_count) {
              setSyncedStreak(res.user.streak_count);
            }
            if (res.user.target_exam) {
              setCurrentExam(res.user.target_exam);
            }
          }
        }
        // Sync streak from live student home endpoint
        try {
          const homeRes = await api.getHomeSummary();
          if (homeRes?.streak) {
            setSyncedStreak(homeRes.streak);
          }
        } catch {}
      } catch (e) {
        localStorage.removeItem('sundaram_token');
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
                { id: 'ai', label: 'AI TUTOR' },
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
        {/* TAB 1: HOME (Section 10) */}
        {activeTab === 'home' && (
          <HomeView
            onNavigate={handleTabSelect}
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
            onOpenUploadModal={() => setIsPDFUploadOpen(true)}
          />
        )}

        {/* TAB 2: PRACTICE */}
        {activeTab === 'practice' && (
          activePracticeMode ? (
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
          <PDFStudio
            onStartPractice={(docId, title) => handleStartPDFPractice(docId, title)}
          />
        )}

        {/* TAB 4: PROGRESS (Analytics & Mastery) */}
        {activeTab === 'progress' && (
          <AnalyticsView onOpenAIWithPrompt={openAIWithPrompt} />
        )}

        {/* TAB 6: PROFILE & SETTINGS (Section 12) */}
        {activeTab === 'profile' && (
          <ProfileView
            currentExam={currentExam}
            onExamChange={handleExamChange}
          />
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
      <SundaramAIAssistant
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        activeQuestionContext={aiQuestionContext}
        initialPrompt={aiInitialPrompt}
      />

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

