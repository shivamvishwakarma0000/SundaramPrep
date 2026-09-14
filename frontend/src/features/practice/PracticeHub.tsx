import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Target, 
  RotateCcw, 
  Bookmark as BookmarkIcon, 
  ArrowRight, 
  BookOpen, 
  ChevronRight, 
  ChevronDown,
  Trash2,
  Lightbulb,
  FileCheck2,
  Brain,
  Search,
  CheckSquare,
  Square,
  UploadCloud,
  Newspaper,
  RotateCw,
  Bell,
  X
} from 'lucide-react';
import { api } from '../../api/client';
import type { MistakeItem, BookmarkItem, ExamType, Question, PracticeMode } from '../../types';
import { CardSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';

interface PracticeHubProps {
  currentExam: ExamType;
  onStartMode: (mode: PracticeMode, subject?: string, topic?: string) => void;
  onStartPDFMockTest?: (documentIds: string[], title: string) => void;
  onNavigateToUpload?: () => void;
  onOpenAIWithQuestion: (question: Question, actionType: 'HINGLISH' | 'WHY_WRONG' | 'MEMORY_TRICK') => void;
}

type PracticeSubView = 'hub' | 'mistakes' | 'bookmarks';

export const PracticeHub: React.FC<PracticeHubProps> = ({
  currentExam,
  onStartMode,
  onStartPDFMockTest,
  onNavigateToUpload,
  onOpenAIWithQuestion,
}) => {
  const [subView, setSubView] = useState<PracticeSubView>('hub');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTopic, setSearchTopic] = useState<string>('');
  const [isMistakesBookmarksOpen, setIsMistakesBookmarksOpen] = useState<boolean>(false);
  const [isModulesOpen, setIsModulesOpen] = useState<boolean>(false);

  // PDF Mock Test States
  const [uploadedPDFs, setUploadedPDFs] = useState<any[]>([]);
  const [selectedPDFIds, setSelectedPDFIds] = useState<string[]>([]);
  const [loadingPDFs, setLoadingPDFs] = useState<boolean>(false);

  // Daily Exam News & Current Affairs States
  const [showNewsModal, setShowNewsModal] = useState<boolean>(false);
  const [isRefreshingNews, setIsRefreshingNews] = useState<boolean>(false);
  const [newsPoolIndex, setNewsPoolIndex] = useState<number>(() => {
    // Determine daily starting pool based on day of month
    const day = new Date().getDate();
    return day % 3;
  });
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  const DAILY_NEWS_POOLS = [
    [
      {
        id: 'news-1',
        category: 'Polity & Governance',
        paper: 'GS Paper II',
        title: "Supreme Court Clarifies Constitutional Timelines for Governor's Assent under Article 200",
        summary: "The apex court reiterated that Governors cannot sit indefinitely on bills passed by state legislatures and must return bills 'as soon as possible' if withholding assent under Article 200.",
        keyFacts: ["Article 200 governs Governor's assent, reservation for President under Art 201", "Article 361 provides immunity but actions are subject to judicial review", "Sarkaria & Punchhi Commissions both recommended fixed 6-month timeline"],
        practiceTopic: "Governor Powers Article 200",
        probability: "High Prelims & Mains Yield",
        readTime: "2 min read"
      },
      {
        id: 'news-2',
        category: 'Economy & Development',
        paper: 'GS Paper III',
        title: "RBI Monetary Policy Committee Maintains Repo Rate at 6.5% Focusing on Inflation Alignment",
        summary: "The MPC retained the repo rate while keeping inflation target firmly anchored at 4% with a +/- 2% tolerance band under the Flexible Inflation Targeting (FIT) framework.",
        keyFacts: ["Monetary Policy Committee constituted under Section 45ZB of RBI Act, 1934", "6-member committee: 3 from RBI, 3 appointed by Central Govt", "Headline inflation vs Core inflation distinction"],
        practiceTopic: "Monetary Policy Committee RBI",
        probability: "Direct Prelims Question Topic",
        readTime: "3 min read"
      },
      {
        id: 'news-3',
        category: 'Environment & Ecology',
        paper: 'GS Paper III',
        title: "Supreme Court Recognizes Right to be Free from Adverse Impacts of Climate Change under Article 21",
        summary: "In a landmark conservation judgment concerning the Great Indian Bustard (GIB), the Court linked climate justice directly to the Fundamental Right to Life and Equality.",
        keyFacts: ["Articles 21 (Life) & 14 (Equality) expanded to include climate rights", "Great Indian Bustard: IUCN Critically Endangered, Schedule I of WPA 1972", "Major habitat in Desert National Park (Rajasthan) and Gujarat"],
        practiceTopic: "Great Indian Bustard Climate Rights",
        probability: "High Mains Essay & GS-III Relevance",
        readTime: "2 min read"
      },
      {
        id: 'news-4',
        category: 'Science & Technology',
        paper: 'GS Paper III',
        title: "ISRO Gaganyaan CE20 Cryogenic Engine Human-Rating Qualification Successfully Concluded",
        summary: "ISRO completed human-rating certification tests for the CE20 cryogenic upper stage engine that will propel the L110-C25 stages of the LVM3 launch vehicle for human spaceflight.",
        keyFacts: ["LVM3 (Geosynchronous Satellite Launch Vehicle Mk III) is human-rated", "Orbit: 400 km Low Earth Orbit (LEO) for 3 days with 3 crew members", "Vyommitra: ISRO's humanoid robot for pre-mission tests"],
        practiceTopic: "Gaganyaan Mission ISRO",
        probability: "Science & Tech Prelims Favorite",
        readTime: "2 min read"
      }
    ],
    [
      {
        id: 'news-5',
        category: 'Polity & Elections',
        paper: 'GS Paper II',
        title: "Election Commission of India Issues Norms on AI-Generated Misinformation and Deepfakes",
        summary: "ECI mandated strict compliance with the Model Code of Conduct (MCC) prohibiting the spread of unverified synthetic media and synthetic audio-visual content during election periods.",
        keyFacts: ["Article 324 vests superintendence, direction, and control of elections in ECI", "Model Code of Conduct is non-statutory but backed by judicial recognition", "IT Rules 2021 & Section 66D of Information Technology Act"],
        practiceTopic: "Election Commission of India MCC",
        probability: "High Prelims & GS-II Relevance",
        readTime: "2 min read"
      },
      {
        id: 'news-6',
        category: 'Infrastructure & Economy',
        paper: 'GS Paper III',
        title: "National Logistics Policy: India Advances on World Bank's Logistics Performance Index",
        summary: "Dedicated Freight Corridors (DFCs) and PM GatiShakti National Master Plan reduce logistics costs towards single-digit GDP percentages, boosting manufacturing export competitiveness.",
        keyFacts: ["PM GatiShakti combines 16 ministries under unified GIS-based portal", "Western DFC (Dadri to JNPT) and Eastern DFC (Ludhiana to Dankuni)", "Unified Logistics Interface Platform (ULIP) provides single-window data exchange"],
        practiceTopic: "National Logistics Policy PM GatiShakti",
        probability: "GS-III Infrastructure Favorite",
        readTime: "3 min read"
      },
      {
        id: 'news-7',
        category: 'Ecology & Biodiversity',
        paper: 'GS Paper III',
        title: "India Updates National Biodiversity Strategy and Action Plan (NBSAP) Aligned with Kunming-Montreal Framework",
        summary: "The updated NBSAP sets target metrics for 30x30 protection of degraded terrestrial, inland water, and coastal marine ecosystems by 2030.",
        keyFacts: ["CBD (Convention on Biological Diversity) 1992 COP15 Kunming-Montreal Pact", "Biological Diversity Act 2002 (amended 2023) and National Biodiversity Authority (Chennai)", "Target 3: Protect 30% of degraded lands and waters by 2030"],
        practiceTopic: "Biodiversity Conservation Kunming Montreal",
        probability: "Environment Prelims Direct Topic",
        readTime: "2 min read"
      },
      {
        id: 'news-8',
        category: 'International Relations',
        paper: 'GS Paper II',
        title: "India-Middle East-Europe Economic Corridor (IMEC) Strategic Working Groups Convene",
        summary: "Multi-modal connectivity corridor involving ship-to-rail transit networks progresses to strengthen trade resilience between India, Arabian Gulf, and European continent.",
        keyFacts: ["Unveiled during New Delhi G20 Summit 2023", "Consists of Eastern Corridor (India to Gulf) and Northern Corridor (Gulf to Europe)", "Complements International North-South Transport Corridor (INSTC)"],
        practiceTopic: "IMEC Connectivity Corridor",
        probability: "GS-II International Relations Key",
        readTime: "2 min read"
      }
    ],
    [
      {
        id: 'news-9',
        category: 'Constitutional Law',
        paper: 'GS Paper II',
        title: "106th Constitutional Amendment Act: 33% Women's Reservation in Lok Sabha & Assemblies",
        summary: "Nari Shakti Vandan Adhiniyam introduces Article 330A, 332A, and 334A to guarantee 33% seats for women, with implementation linked to the post-2026 census delimitation process.",
        keyFacts: ["106th Amendment Act received Presidential assent in 2023", "Inserts Article 330A (Lok Sabha) and Article 332A (State Assemblies)", "Sun-set clause: Effective for 15 years initially with rotational seat allocation"],
        practiceTopic: "106th Constitutional Amendment Act",
        probability: "High Probability Prelims Question",
        readTime: "3 min read"
      },
      {
        id: 'news-10',
        category: 'Economy & Banking',
        paper: 'GS Paper III',
        title: "Insolvency and Bankruptcy Code (IBC) Completes Pre-Pack Framework Expansion for MSMEs",
        summary: "Pre-packaged insolvency resolution process (PIRP) offers quicker debt turnaround within 120 days, avoiding prolonged liquidation delays for stressed micro and small enterprises.",
        keyFacts: ["IBC enacted in 2016; Insolvency and Bankruptcy Board of India (IBBI) is regulator", "PIRP under Chapter III-A allows debtor-in-possession model", "Resolution timeline: 120 days maximum vs 330 days under regular CIRP"],
        practiceTopic: "Insolvency and Bankruptcy Code IBC",
        probability: "GS-III Economy Crucial Concept",
        readTime: "2 min read"
      },
      {
        id: 'news-11',
        category: 'Environment & Wetlands',
        paper: 'GS Paper III',
        title: "India Expands Ramsar Wetlands Network: Eco-sensitive Zones Management Reinforced",
        summary: "New wetland additions elevate India's total designated Ramsar sites to leading standing in South Asia, protecting migratory flyways across Central Asian Flyway (CAF).",
        keyFacts: ["Ramsar Convention signed in 1971 in Ramsar, Iran; in force since 1975", "Montreux Record: Register of Ramsar sites where changes in ecological character have occurred", "Keoladeo National Park (Rajasthan) and Loktak Lake (Manipur) currently on Montreux Record"],
        practiceTopic: "Ramsar Sites Wetlands Conservation",
        probability: "Prelims Guaranteed Match-the-Following",
        readTime: "2 min read"
      },
      {
        id: 'news-12',
        category: 'Science & Genetics',
        paper: 'GS Paper III',
        title: "Genome India Project Completes 10,000 Human Genomes Sequencing Milestone",
        summary: "Department of Biotechnology (DBT) spearheaded reference Indian genome database, creating vital genetic blueprints for precision medicine and population health studies.",
        keyFacts: ["Led by Centre for Brain Research (CBR) at IISc Bangalore and 20 institutions", "Represents genetic diversity across 99 distinct ethnic and linguistic Indian communities", "Aids in targeted diagnosis of rare monogenic disorders and genetic disease mapping"],
        practiceTopic: "Genome India Project DBT",
        probability: "Science & Tech Prelims Yield",
        readTime: "2 min read"
      }
    ]
  ];

  const currentNewsList = DAILY_NEWS_POOLS[newsPoolIndex % DAILY_NEWS_POOLS.length];

  const handleRefreshNews = () => {
    setIsRefreshingNews(true);
    setTimeout(() => {
      setNewsPoolIndex((prev) => prev + 1);
      setIsRefreshingNews(false);
    }, 450);
  };

  const handleTriggerDailyNewsNotification = (headline?: string) => {
    const defaultHeadline = headline || currentNewsList[0]?.title || "Supreme Court Clarifies Article 200 Assent Timelines";
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`Sundaram Prep: Today's Daily News Alert`, {
          body: defaultHeadline,
          icon: '/favicon.ico',
        });
        setNotificationStatus('Alert sent to your phone/device!');
        setTimeout(() => setNotificationStatus(null), 4000);
      } else {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            new Notification(`Sundaram Prep: Today's Daily News Alert`, {
              body: defaultHeadline,
              icon: '/favicon.ico',
            });
            setNotificationStatus('Notification permission granted & alert sent!');
            setTimeout(() => setNotificationStatus(null), 4000);
          } else {
            setNotificationStatus('Notification permission was blocked in browser settings.');
            setTimeout(() => setNotificationStatus(null), 4000);
          }
        });
      }
    } else {
      setNotificationStatus('Device notifications are not supported in this browser.');
      setTimeout(() => setNotificationStatus(null), 4000);
    }
  };

  useEffect(() => {
    async function loadHubData() {
      try {
        const hubRes = await api.getPracticeHub(currentExam);
        setSubjects(hubRes.subjects || []);
      } catch (e) {
        console.error('Failed to load practice hub:', e);
      }
    }
    loadHubData();
  }, [currentExam]);

  // Load uploaded PDF documents for custom mock tests
  useEffect(() => {
    async function loadPDFs() {
      setLoadingPDFs(true);
      try {
        const res = await api.listPDFDocuments(1, 50);
        if (res && res.documents) {
          setUploadedPDFs(res.documents);
          // By default, auto-select all uploaded PDFs
          if (res.documents.length > 0) {
            setSelectedPDFIds(res.documents.map((d: any) => d.id));
          }
        }
      } catch (e) {
        console.warn('Failed to load PDF documents for mock test:', e);
      } finally {
        setLoadingPDFs(false);
      }
    }
    loadPDFs();
  }, []);

  const toggleSelectAllPDFs = () => {
    if (selectedPDFIds.length === uploadedPDFs.length) {
      setSelectedPDFIds([]);
    } else {
      setSelectedPDFIds(uploadedPDFs.map((d) => d.id));
    }
  };

  const togglePDFSelection = (id: string) => {
    setSelectedPDFIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleStartPDFMockTest = () => {
    if (selectedPDFIds.length === 0) return;
    const isAll = selectedPDFIds.length === uploadedPDFs.length && uploadedPDFs.length > 0;
    const title = isAll 
      ? "All Uploaded Papers (10-Q Mock)" 
      : (selectedPDFIds.length === 1 
          ? (uploadedPDFs.find(p => p.id === selectedPDFIds[0])?.file_name || "Uploaded PDF Mock") 
          : `${selectedPDFIds.length} Selected Papers (10-Q Mock)`);

    if (onStartPDFMockTest) {
      onStartPDFMockTest(selectedPDFIds, title);
    } else {
      onStartMode('MOCK_TEST', undefined, title);
    }
  };

  const totalQuestionsInSelection = uploadedPDFs
    .filter((d) => selectedPDFIds.includes(d.id))
    .reduce((sum, d) => sum + (d.extracted_questions_count || d.ready_count || 0), 0);

  const loadMistakes = async () => {
    setSubView('mistakes');
    setLoading(true);
    try {
      const res = await api.getMistakes(1, 20);
      setMistakes(res.mistakes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async () => {
    setSubView('bookmarks');
    setLoading(true);
    try {
      const res = await api.getBookmarks(1, 20);
      setBookmarks(res.bookmarks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async (questionId: string) => {
    try {
      await api.toggleBookmark(questionId);
      setBookmarks((prev) => prev.filter((b) => b.question.id !== questionId));
    } catch (e) {
      console.error(e);
    }
  };

  // Section 11: Single-Feature UI - Mistakes Notebook
  if (subView === 'mistakes') {
    return (
      <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border-2 border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubView('hub')}
                className="text-xs font-black text-brand-600 hover:underline cursor-pointer"
              >
                ← Back to Practice
              </button>
              <span className="text-slate-300">•</span>
              <h2 className="text-base sm:text-lg font-black font-display text-slate-900">
                Mistake Engine Notebook
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onStartMode('MISTAKE_PRACTICE')}
              disabled={mistakes.length === 0}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Practice My Mistakes</span>
            </button>
            <span className="text-xs font-black bg-rose-50 text-rose-700 px-2.5 py-1.5 rounded-xl border border-rose-200">
              {mistakes.length} Active
            </span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <CardSkeleton rows={2} />
            <CardSkeleton rows={2} />
          </div>
        ) : mistakes.length === 0 ? (
          <EmptyState
            emoji="🎉"
            title="No mistakes yet 🎉"
            description="Keep practicing. Your mistakes will appear here automatically."
            actionLabel="Start Practice"
            onAction={() => onStartMode('PRACTICE')}
          />
        ) : (
          <div className="space-y-3">
            {mistakes.map((m, idx) => (
              <div
                key={m.mistake_id || idx}
                className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-slate-900">{m.question.subject}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600">{m.topic}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                      Failed {m.repeated_count}x
                    </span>
                  </div>
                </div>

                <div className="text-xs sm:text-sm font-black text-slate-900 leading-relaxed whitespace-pre-line">
                  {m.question.question_text}
                </div>

                {/* Correct Answer & Explanation */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="font-black text-emerald-700">
                    Correct Option: {m.question.correct_answer}
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed">
                    {m.question.explanation?.why}
                  </p>
                </div>

                {/* AI Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {m.question.source_reference || 'Official Reference'}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onOpenAIWithQuestion(m.question, 'WHY_WRONG')}
                      className="text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 cursor-pointer"
                    >
                      Why is this trap?
                    </button>
                    <button
                      onClick={() => onOpenAIWithQuestion(m.question, 'MEMORY_TRICK')}
                      className="text-xs font-black text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl border border-violet-200 cursor-pointer"
                    >
                      Memory Trick
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Section 11: Single-Feature UI - Bookmarked Questions
  if (subView === 'bookmarks') {
    return (
      <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in transition-colors">
        <div className="flex items-center justify-between bg-white border-2 border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubView('hub')}
                className="text-xs font-black text-brand-600 hover:underline cursor-pointer"
              >
                ← Back to Practice
              </button>
              <span className="text-slate-300">•</span>
              <h2 className="text-base sm:text-lg font-black font-display text-slate-900">
                Bookmarked Questions
              </h2>
            </div>
          </div>
          <span className="text-xs font-black bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200">
            {bookmarks.length} Saved
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <CardSkeleton rows={2} />
            <CardSkeleton rows={2} />
          </div>
        ) : bookmarks.length === 0 ? (
          <EmptyState
            emoji="🔖"
            title="No Bookmarks Saved Yet"
            description="Tap the bookmark icon while solving questions to collect high-yield items here."
            actionLabel="Start Practice"
            onAction={() => onStartMode('PRACTICE')}
          />
        ) : (
          <div className="space-y-3">
            {bookmarks.map((b) => (
              <div
                key={b.bookmark_id}
                className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-slate-900">{b.question.subject}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600">{b.question.topic}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveBookmark(b.question.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    title="Remove Bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-xs sm:text-sm font-black text-slate-900 leading-relaxed whitespace-pre-line">
                  {b.question.question_text}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="font-black text-slate-900">
                    Correct Option: {b.question.correct_answer}
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed">
                    {b.question.explanation?.why}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Primary Practice Hub View - Pure White Boxes, No Shadows, No Verbose Text
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in pb-12 transition-colors">
      {/* 1. INSTANT 10-QUESTION TOPIC SEARCH MOCK GENERATOR (Rounded-3xl SaaS card) */}
      <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-3.5 relative overflow-hidden transition-colors">
        {/* Subtle Watermark: Globe / Topic Search */}
        <div className="absolute right-4 -bottom-6 w-36 h-36 pointer-events-none opacity-[0.035] dark:opacity-[0.025] select-none text-brand-900 dark:text-brand-100">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-700 dark:text-sky-400 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900/60 px-2.5 py-0.5 rounded-full">
              TOPIC-WISE 10-QUESTION MOCK TEST
            </span>
            <h2 className="text-lg sm:text-xl font-black font-display text-slate-900 dark:text-white mt-1.5 tracking-tight">
              Search Any Topic & Start Instant 10-Question Test
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-dark-muted mt-0.5">
              Type any syllabus topic to practice 10 questions. After completion, take 10 more or search another topic.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowNewsModal(true)}
            className="self-start sm:self-center shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 text-amber-900 dark:text-amber-200 border border-amber-300/70 dark:border-amber-700/60 hover:border-amber-500 hover:shadow-xs transition-all font-bold text-xs cursor-pointer group"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <Newspaper className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:rotate-6 transition-transform" />
            <span className="font-black">Daily Exam News</span>
            <span className="text-[10px] bg-amber-200/80 dark:bg-amber-800/80 text-amber-950 dark:text-amber-100 px-1.5 py-0.5 rounded font-black tracking-wider">
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchTopic.trim()) {
              onStartMode('MOCK_TEST', undefined, searchTopic.trim());
            }
          }}
          className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTopic}
              onChange={(e) => setSearchTopic(e.target.value)}
              placeholder="Search topic (e.g. Dandi March, Fundamental Rights, Monetary Policy, 1857 Revolt)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-600 focus:bg-white dark:focus:bg-dark-card transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!searchTopic.trim()}
            className="px-5 py-2.5 bg-[#0B2545] hover:bg-[#133A6B] disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Start 10-Q Mock Test</span>
          </button>
        </form>

        {/* Quick Topic Chips */}
        <div className="relative z-10 flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] font-bold text-slate-400">Popular:</span>
          {['Dandi March', 'Fundamental Rights', 'Monetary Policy', 'Revolt of 1857', 'National Parks', 'Judiciary'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setSearchTopic(t);
                onStartMode('MOCK_TEST', undefined, t);
              }}
              className="text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-brand-700 dark:hover:text-brand-300 bg-slate-100 dark:bg-dark-surface hover:bg-brand-50 dark:hover:bg-slate-800 hover:border-brand-300 border border-slate-200 dark:border-dark-border px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 2. INSTANT 10-QUESTION MOCK TEST FROM YOUR UPLOADED PDF PAPERS */}
      <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4 relative overflow-hidden transition-all">
        {/* Subtle Watermark: PDF Paper */}
        <div className="absolute right-4 -bottom-6 w-36 h-36 pointer-events-none opacity-[0.035] dark:opacity-[0.025] select-none text-emerald-900 dark:text-emerald-100">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <FileCheck2 className="w-3 h-3" />
                <span>PDF QUESTION BANK MOCK TEST</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-dark-muted">
                {uploadedPDFs.length} Papers in Database
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black font-display text-slate-900 dark:text-white mt-1.5 tracking-tight">
              Take Mock Test from Your Uploaded PDFs
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-dark-muted mt-0.5">
              Select any single PDF, multiple PDFs, or all uploaded papers. The AI will generate a randomized 10-question mock test exclusively from your selected documents.
            </p>
          </div>

          {uploadedPDFs.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleSelectAllPDFs}
                className="px-3.5 py-2 bg-slate-100 dark:bg-dark-surface hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-dark-text text-xs font-black rounded-xl border border-slate-200 dark:border-dark-border transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {selectedPDFIds.length === uploadedPDFs.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>Select All PDFs ({uploadedPDFs.length})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* PDF Documents Selector Grid */}
        {loadingPDFs ? (
          <div className="p-6 text-center text-xs font-bold text-slate-400">
            Loading your uploaded question papers...
          </div>
        ) : uploadedPDFs.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-dark-border text-center space-y-2 bg-slate-50/50 dark:bg-dark-surface/40">
            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700 dark:text-dark-text">
              No Question Papers Uploaded Yet
            </p>
            <p className="text-[11px] text-slate-500 dark:text-dark-muted max-w-md mx-auto">
              Upload any previous year question paper or coaching test in PDF Studio to take customized mock tests from your papers.
            </p>
            {onNavigateToUpload && (
              <button
                type="button"
                onClick={onNavigateToUpload}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer mt-2"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Go to PDF Studio</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {uploadedPDFs.map((doc) => {
                const isSelected = selectedPDFIds.includes(doc.id);
                const qCount = doc.extracted_questions_count || doc.ready_count || 0;
                return (
                  <div
                    key={doc.id}
                    onClick={() => togglePDFSelection(doc.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${
                      isSelected
                        ? 'border-brand-600 dark:border-brand-500 bg-brand-50/70 dark:bg-brand-950/40 text-brand-950 dark:text-brand-100 shadow-xs ring-1 ring-brand-500/20'
                        : 'border-slate-200/80 dark:border-dark-border hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-dark-surface/60 text-slate-800 dark:text-dark-text'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="shrink-0 text-brand-600 dark:text-brand-400">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 fill-brand-600/10" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-extrabold truncate" title={doc.file_name}>
                          {doc.file_name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-dark-muted flex items-center gap-1.5 mt-0.5">
                          <span>{doc.subject || 'General Studies'}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                      isSelected 
                        ? 'bg-brand-200/80 dark:bg-brand-900/60 text-brand-900 dark:text-brand-200' 
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-dark-muted'
                    }`}>
                      {qCount} Qs
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Selection Summary & Start Mock Test Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-dark-border">
              <div className="text-xs text-slate-600 dark:text-dark-muted flex items-center gap-2">
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {selectedPDFIds.length} PDF{selectedPDFIds.length === 1 ? '' : 's'} Selected
                </span>
                <span>·</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                  {totalQuestionsInSelection} Questions Pool Available
                </span>
              </div>

              <button
                type="button"
                onClick={handleStartPDFMockTest}
                disabled={selectedPDFIds.length === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Start 10-Q Mock Test from Selected PDF{selectedPDFIds.length === 1 ? '' : 's'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top Banner (Practice Hub Header) */}
      <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-brand-700 dark:text-sky-400">
            PRACTICE HUB
          </span>
          <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white mt-1 tracking-tight">
            Curriculum Practice Modes
          </h2>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onStartMode('QUICK_10')}
            className="flex items-center gap-1.5 bg-[#0B2545] hover:bg-[#133A6B] text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Quick 10 Blitz</span>
          </button>
          <button
            onClick={() => onStartMode('FOCUS_TEST')}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer border border-slate-700"
          >
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Focus Test</span>
          </button>
        </div>
      </div>

      {/* 6 Distinct Practice Modes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Mode 1: LEARN MODE */}
        <div
          onClick={() => onStartMode('LEARN')}
          className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/80 p-5 sm:p-6 rounded-3xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden"
        >
          {/* Subtle Watermark: Lightbulb */}
          <div className="absolute right-2 -bottom-4 w-28 h-28 pointer-events-none opacity-[0.035] dark:opacity-[0.025] select-none text-amber-600">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C7.03 2 3 6.03 3 11c0 2.76 1.25 5.23 3.22 6.88.54.45.88 1.11.88 1.82V20c0 .55.45 1 1 1h7.8c.55 0 1-.45 1-1v-.3c0-.71.34-1.37.88-1.82C19.75 16.23 21 13.76 21 11c0-4.97-4.03-9-9-9z"/>
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Lightbulb className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2.5 py-0.5 rounded-full">
                Instant Feedback
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
              Learn Mode
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 leading-relaxed">
              Immediate answer breakdown, conceptual insights and high-yield key takeaways.
            </p>
          </div>
          <div className="relative z-10 mt-5 pt-3 border-t border-slate-100 dark:border-dark-border flex items-center justify-between text-xs font-black text-amber-700 dark:text-amber-400">
            <span>Start Learn Mode</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 2: STANDARD PRACTICE */}
        <div
          onClick={() => onStartMode('PRACTICE')}
          className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500/80 p-5 sm:p-6 rounded-3xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden"
        >
          {/* Subtle Watermark: Book */}
          <div className="absolute right-2 -bottom-4 w-28 h-28 pointer-events-none opacity-[0.035] dark:opacity-[0.025] select-none text-blue-900">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-brand-700 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-800 dark:text-sky-300 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800/60 px-2.5 py-0.5 rounded-full">
                Nav & Skips
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-brand-700 dark:group-hover:text-sky-400 transition-colors">
              Standard Practice
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 leading-relaxed">
              Full navigation, review marking, question skipping and comprehensive test summary.
            </p>
          </div>
          <div className="relative z-10 mt-5 pt-3 border-t border-slate-100 dark:border-dark-border flex items-center justify-between text-xs font-black text-brand-700 dark:text-sky-400">
            <span>Start Practice</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 3: FOCUS MODE */}
        <div
          onClick={() => onStartMode('FOCUS_TEST')}
          className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500/80 p-5 sm:p-6 rounded-3xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden"
        >
          {/* Subtle Watermark: Target / Timer */}
          <div className="absolute right-2 -bottom-4 w-28 h-28 pointer-events-none opacity-[0.035] dark:opacity-[0.025] select-none text-emerald-900">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3-8c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z"/>
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                Proctor Sim
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              Focus Mode
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 leading-relaxed">
              Real exam pressure simulation with strict timing, negative marking, and proctoring.
            </p>
          </div>
          <div className="relative z-10 mt-5 pt-3 border-t border-slate-100 dark:border-dark-border flex items-center justify-between text-xs font-black text-emerald-700 dark:text-emerald-400">
            <span>Enter Focus Test</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 4: QUICK 10 BLITZ */}
        <div
          onClick={() => onStartMode('QUICK_10')}
          className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/80 p-5 sm:p-6 rounded-3xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden"
        >
          {/* Subtle Watermark: Zap */}
          <div className="absolute right-2 -bottom-4 w-28 h-28 pointer-events-none opacity-[0.035] dark:opacity-[0.025] select-none text-amber-600">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2.5 py-0.5 rounded-full">
                10 Rapid Qs
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
              Quick 10 Blitz
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 leading-relaxed">
              Fast-paced rapid fire session designed for daily consistency and retention drills.
            </p>
          </div>
          <div className="relative z-10 mt-5 pt-3 border-t border-slate-100 dark:border-dark-border flex items-center justify-between text-xs font-black text-amber-700 dark:text-amber-400">
            <span>Launch Quick 10</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 5: MOCK TEST (10 Real Randomized Questions) */}
        <div
          onClick={() => onStartMode('MOCK_TEST')}
          className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500/80 p-5 sm:p-6 rounded-3xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden"
        >
          {/* Subtle Watermark: Document */}
          <div className="absolute right-2 -bottom-4 w-28 h-28 pointer-events-none opacity-[0.035] dark:opacity-[0.025] select-none text-emerald-900">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                10 Qs Random
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              Mock Test
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 leading-relaxed">
              Randomized multi-subject paper testing overall syllabus readiness and speed.
            </p>
          </div>
          <div className="relative z-10 mt-5 pt-3 border-t border-slate-100 dark:border-dark-border flex items-center justify-between text-xs font-black text-emerald-700 dark:text-emerald-400">
            <span>Start Mock Test</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 6: SMART REVISION */}
        <div
          onClick={() => onStartMode('SMART_REVISION')}
          className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 hover:border-violet-500 dark:hover:border-violet-500/80 p-5 sm:p-6 rounded-3xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden"
        >
          {/* Subtle Watermark: Brain */}
          <div className="absolute right-2 -bottom-4 w-28 h-28 pointer-events-none opacity-[0.035] dark:opacity-[0.025] select-none text-violet-900">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.28 19.57 10.59 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9z"/>
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/60 text-violet-700 dark:text-violet-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Brain className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-violet-800 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/60 px-2.5 py-0.5 rounded-full">
                Cognitive Set
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
              Smart Revision
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 leading-relaxed">
              Targeted spaced repetition covering weak areas, bookmark tags, and tricky traps.
            </p>
          </div>
          <div className="relative z-10 mt-5 pt-3 border-t border-slate-100 dark:border-dark-border flex items-center justify-between text-xs font-black text-violet-700 dark:text-violet-400">
            <span>Launch Revision Set</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* COLLAPSIBLE SECTION 1: Mistakes Notebook & Saved Bookmarks (Hidden by default, expands on click) */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
        <button
          type="button"
          onClick={() => setIsMistakesBookmarksOpen(prev => !prev)}
          className="w-full flex items-center justify-between cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-black shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black font-display text-slate-900">
                Mistake Engine & Saved Bookmarks
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Practice failed questions and review bookmarked high-yield problems
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">
              {isMistakesBookmarksOpen ? 'Hide' : 'Click to Open'}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isMistakesBookmarksOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isMistakesBookmarksOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 mt-4 border-t border-slate-100 animate-in fade-in duration-200">
            {/* Mistakes Notebook Launcher */}
            <div
              onClick={loadMistakes}
              className="bg-slate-50 border-2 border-slate-200 hover:border-rose-500 p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-rose-700 bg-white border border-rose-200 px-2.5 py-0.5 rounded-full">
                    Mistake Engine
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-rose-700 transition-colors">
                  Mistakes Notebook
                </h3>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-black text-rose-700">
                <span>Open Mistakes</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Saved Bookmarks Launcher */}
            <div
              onClick={loadBookmarks}
              className="bg-slate-50 border-2 border-slate-200 hover:border-amber-500 p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BookmarkIcon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-amber-800 bg-white border border-amber-200 px-2.5 py-0.5 rounded-full">
                    High-Yield
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-amber-800 transition-colors">
                  Saved Bookmarks
                </h3>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-black text-amber-800">
                <span>Open Bookmarks</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* COLLAPSIBLE SECTION 2: Subject & Module Practice (Hidden by default, expands on click) */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
        <button
          type="button"
          onClick={() => setIsModulesOpen(prev => !prev)}
          className="w-full flex items-center justify-between cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center font-black shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black font-display text-slate-900">
                Subject & Module Practice
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Real official syllabus modules (Polity, History, Economy, Geography, Ecology, CSAT)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1 rounded-lg">
              {isModulesOpen ? 'Hide Modules' : 'Click to Expand (6 Modules)'}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isModulesOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isModulesOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 mt-4 border-t border-slate-100 animate-in fade-in duration-200">
            {(subjects.length > 0 ? subjects : [
              { id: "polity", name: "Indian Polity & Governance" },
              { id: "history", name: "Modern Indian History" },
              { id: "economy", name: "Indian Economy & Fiscal Policy" },
              { id: "geography", name: "Physical & Indian Geography" },
              { id: "environment", name: "Ecology, Biodiversity & Climate" },
              { id: "aptitude", name: "CSAT / Quantitative Aptitude" },
            ]).map((s, idx) => (
              <div
                key={idx}
                onClick={() => onStartMode('PRACTICE', s.name)}
                className="p-4 rounded-xl border-2 border-slate-200 hover:border-brand-600 bg-white hover:bg-slate-50 cursor-pointer transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center font-bold text-xs">
                      <BookOpen className="w-4 h-4 text-brand-600" />
                    </div>
                    <span className="text-[10px] font-black uppercase text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                      Syllabus Module
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-brand-600 transition-colors">
                    {s.name}
                  </h4>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-black text-brand-600">
                  <span>Start Practice</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Daily News Action Button */}
      <button
        type="button"
        onClick={() => setShowNewsModal(true)}
        aria-label="Daily Exam News and Current Affairs"
        className="fixed right-4 sm:right-6 bottom-20 sm:bottom-7 z-30 flex items-center gap-2.5 px-4 py-3 bg-[#0B2545] hover:bg-[#133A6B] text-white rounded-full shadow-xl border border-sky-400/30 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer group"
      >
        <div className="relative">
          <Newspaper className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0B2545] animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0B2545]" />
        </div>
        <div className="flex flex-col items-start pr-1 text-left">
          <span className="text-xs font-black tracking-tight leading-none text-white">Daily News</span>
          <span className="text-[9px] font-bold text-sky-200/90 leading-tight">Today's Affairs</span>
        </div>
      </button>

      {/* Daily Exam News & Current Affairs Modal */}
      {showNewsModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowNewsModal(false)}
        >
          <div 
            className="relative w-full max-w-2xl max-h-[88vh] bg-white dark:bg-dark-card rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#0B2545] to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
                  <Newspaper className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                      Daily Exam News & Affairs
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/30">
                      Live Briefing
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-sky-200/80 font-medium">
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Refresh News Button */}
                <button
                  type="button"
                  onClick={handleRefreshNews}
                  title="Refresh and get new daily updates"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-amber-300 ${isRefreshingNews ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setShowNewsModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notification Feedback Banner if present */}
            {notificationStatus && (
              <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                <span>{notificationStatus}</span>
              </div>
            )}

            {/* App Download Notification Notice */}
            <div className="p-3.5 sm:p-4 bg-sky-50/80 dark:bg-sky-950/30 border-b border-sky-100 dark:border-sky-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    Get Daily News Alerts on Phone & Lock Screen
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    When you install or add Sundaram Prep to your phone home screen, daily 8:00 AM alerts keep your preparation consistent.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleTriggerDailyNewsNotification()}
                className="shrink-0 px-3 py-1.5 bg-[#0B2545] hover:bg-[#133A6B] text-white text-[11px] font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3 h-3 text-amber-300" />
                <span>Notify on Phone</span>
              </button>
            </div>

            {/* News Items List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              {currentNewsList.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-4 rounded-2xl bg-slate-50/80 dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border hover:border-slate-300 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-sky-400 border border-brand-200 dark:border-brand-900/50">
                        {item.category}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                        {item.paper}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      {item.probability}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                    {item.title}
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {item.summary}
                  </p>

                  {/* Key Prelims / Mains Facts */}
                  <div className="bg-white dark:bg-dark-card p-2.5 rounded-xl border border-slate-200/70 dark:border-dark-border/80 space-y-1">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      High-Yield Prelims Exam Pointers:
                    </span>
                    <ul className="space-y-0.5">
                      {item.keyFacts.map((fact, fIdx) => (
                        <li key={fIdx} className="text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                          <span className="text-brand-600 dark:text-sky-400 font-bold">•</span>
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions for this news */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewsModal(false);
                        onStartMode('MOCK_TEST', undefined, item.practiceTopic);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-black text-brand-700 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Practice 10-Q Test on this Topic</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTriggerDailyNewsNotification(item.title)}
                      title="Send this news as notification"
                      className="p-1 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-dark-surface border-t border-slate-200 dark:border-dark-border flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-bold">
                Set {(newsPoolIndex % DAILY_NEWS_POOLS.length) + 1} of {DAILY_NEWS_POOLS.length} • Updated Daily for UPSC & PSC
              </span>
              <button
                type="button"
                onClick={() => setShowNewsModal(false)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
