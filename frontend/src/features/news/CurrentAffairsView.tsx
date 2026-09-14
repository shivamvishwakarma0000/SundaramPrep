import React, { useState, useEffect, useCallback } from 'react';
import {
  Newspaper,
  RefreshCw,
  Search,
  Bell,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  ChevronRight,
  Clock,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Flame
} from 'lucide-react';
import { api } from '../../api/client';
import type { NewsArticleItem, NewsTodaysDigestResponse } from '../../types';
import { NewsDetailModal } from './NewsDetailModal';
import { NotificationSettingsModal } from './NotificationSettingsModal';

const CATEGORIES = [
  { id: 'all', label: 'All Updates' },
  { id: 'Polity & Governance', label: 'Polity & Governance' },
  { id: 'Economy', label: 'Economy' },
  { id: 'International Relations', label: 'International Relations' },
  { id: 'Environment & Ecology', label: 'Environment & Ecology' },
  { id: 'Science & Technology', label: 'Science & Tech' },
  { id: 'Defence & Security', label: 'Defence & Security' },
  { id: 'Social Issues', label: 'Social Issues' },
  { id: 'Government Schemes', label: 'Govt Schemes' },
  { id: 'Reports & Indices', label: 'Reports & Indices' },
  { id: 'Agriculture', label: 'Agriculture' },
  { id: 'History & Culture', label: 'History & Culture' },
  { id: 'Geography', label: 'Geography' },
  { id: 'Important Appointments', label: 'Appointments' },
  { id: 'Awards & Sports', label: 'Awards & Sports' },
  { id: 'Other Important News', label: 'Other News' },
];

const SOURCES = [
  { id: 'all', label: 'All Sources' },
  { id: 'India Today', label: '⚡ India Today' },
  { id: 'PIB', label: '🏛️ PIB Official' },
  { id: 'The Hindu', label: '📰 The Hindu' },
  { id: 'Indian Express', label: '🗞️ Indian Express' },
  { id: 'LiveMint', label: '📈 LiveMint' },
];

const formatISTTime = (dateInput?: Date | string): string => {
  try {
    const d = dateInput instanceof Date ? dateInput : (dateInput ? new Date(dateInput) : new Date());
    // Fallback if invalid date
    const validDate = isNaN(d.getTime()) ? new Date() : d;
    return validDate.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }) + ' IST';
  } catch {
    return new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST';
  }
};

export const CurrentAffairsView: React.FC = () => {
  // Navigation subtabs: 'feed' | 'viral' | 'digest' | 'saved'
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'viral' | 'digest' | 'saved'>('feed');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Articles state
  const [articles, setArticles] = useState<NewsArticleItem[]>([]);
  const [viralArticles, setViralArticles] = useState<NewsArticleItem[]>([]);
  const [savedArticles, setSavedArticles] = useState<NewsArticleItem[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [digestData, setDigestData] = useState<NewsTodaysDigestResponse | null>(null);
  
  // Pagination & Loading
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(() => formatISTTime());

  // Modals
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);

  // Fetch articles from backend
  const fetchNews = useCallback(async (pageNum: number, category: string, search: string = '', source: string = 'all', append = false) => {
    try {
      if (!append) setLoading(true);
      const catParam = category === 'all' ? undefined : category;
      const srcParam = source === 'all' ? undefined : source;
      const searchParam = search.trim() ? search.trim() : undefined;
      const res = await api.getNewsFeed({ page: pageNum, limit: 12, category: catParam, source: srcParam, search: searchParam });
      
      if (res && res.articles) {
        if (append) {
          setArticles((prev: NewsArticleItem[]) => {
            const existingIds = new Set(prev.map(a => a.id));
            const newItems = (res.articles as NewsArticleItem[]).filter(a => !existingIds.has(a.id));
            return [...prev, ...newItems];
          });
        } else {
          setArticles(res.articles);
        }
        setHasMore(Boolean(res.has_more));
        setTotalCount(res.total || 0);
        setLastUpdatedTime(formatISTTime(new Date()));
      }
    } catch (err) {
      console.error('Failed to fetch news feed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch viral news
  const fetchViralNews = useCallback(async () => {
    try {
      const res = await api.getViralNews();
      if (res && res.articles) {
        setViralArticles(res.articles as NewsArticleItem[]);
      }
    } catch (err) {
      console.error('Failed to fetch viral news:', err);
    }
  }, []);

  // Fetch today's digest
  const fetchTodayDigest = useCallback(async () => {
    try {
      const res = await api.getTodaysDigest();
      if (res) {
        setDigestData(res);
      }
    } catch (err) {
      console.error('Failed to fetch today digest:', err);
    }
  }, []);

  // Fetch saved articles
  const fetchSavedNews = useCallback(async () => {
    try {
      const res = await api.getSavedNews();
      if (res && res.articles) {
        setSavedArticles(res.articles as NewsArticleItem[]);
        setBookmarkedIds(new Set((res.articles as NewsArticleItem[]).map((a: NewsArticleItem) => a.id)));
      }
    } catch (err) {
      console.error('Failed to fetch saved news:', err);
    }
  }, []);

  // Live search, source and category change listener with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchNews(1, selectedCategory, searchQuery, selectedSource, false);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchNews, selectedCategory, searchQuery, selectedSource]);

  // Initial load for viral, digest and bookmarks
  useEffect(() => {
    fetchViralNews();
    fetchTodayDigest();
    fetchSavedNews();
  }, [fetchViralNews, fetchTodayDigest, fetchSavedNews]);

  // Handle Load More
  const handleLoadMore = () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNews(nextPage, selectedCategory, searchQuery, selectedSource, true);
  };

  // Handle Refresh
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshMessage(null);
    try {
      const res = await api.refreshNews();
      setRefreshMessage(res.message || `Fetched ${res.new_articles_count} new articles.`);
      setLastUpdatedTime(formatISTTime(new Date()));
      setPage(1);
      await Promise.allSettled([
        fetchNews(1, selectedCategory, searchQuery, selectedSource, false),
        fetchViralNews(),
        fetchTodayDigest()
      ]);
    } catch (err) {
      console.error('Failed to refresh news:', err);
      setRefreshMessage('News update refreshed from cache.');
      setLastUpdatedTime(formatISTTime(new Date()));
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMessage(null), 4000);
    }
  };

  // Handle Bookmark Toggle
  const handleToggleBookmark = async (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation();
    try {
      const isCurrentlyBookmarked = bookmarkedIds.has(articleId);
      const res = await api.toggleNewsBookmark(articleId, isCurrentlyBookmarked ? 'DELETE' : 'POST');
      if (res && res.is_bookmarked !== undefined) {
        setBookmarkedIds(prev => {
          const next = new Set(prev);
          if (res.is_bookmarked) {
            next.add(articleId);
          } else {
            next.delete(articleId);
          }
          return next;
        });
        fetchSavedNews();
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  // Filtered articles based on search query
  const filteredArticles = (activeSubTab === 'saved' ? savedArticles : articles).filter(art => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      art.title.toLowerCase().includes(q) ||
      (art.short_summary && art.short_summary.toLowerCase().includes(q)) ||
      (art.category && art.category.toLowerCase().includes(q)) ||
      (art.gs_paper && art.gs_paper.toLowerCase().includes(q)) ||
      (art.key_facts && art.key_facts.some(f => f.toLowerCase().includes(q))) ||
      (art.important_terms && art.important_terms.some(t => t.toLowerCase().includes(q)))
    );
  });

  // Today Date formatted in IST
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Top news from digest if available
  const topNewsList = digestData?.top_5 || digestData?.top_stories || [];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. HERO BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0B2545] bg-gradient-to-br from-[#0B2545] via-[#133E68] to-[#1E4E79] p-6 sm:p-8 text-white shadow-xl border border-blue-800/40">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Pulse ring decoration */}
        <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-48 h-48 rounded-full border border-sky-300 animate-ping" />
          <div className="w-32 h-32 rounded-full border border-blue-400 absolute" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-black uppercase tracking-wider backdrop-blur-md">
                <Newspaper className="w-3.5 h-3.5 text-blue-300" />
                UPSC Current Affairs
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-300 bg-white/10 px-2.5 py-1 rounded-full font-bold">
                <Calendar className="w-3 h-3 text-sky-300" />
                {todayFormatted}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-sky-200 bg-sky-950/40 border border-sky-400/20 px-2.5 py-1 rounded-full font-medium">
                <Clock className="w-3 h-3" />
                Updated: {lastUpdatedTime}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display tracking-tight text-white">
              Daily UPSC News & Analysis
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 font-medium mt-1 max-w-2xl leading-relaxed">
              PIB, India Today, The Hindu & Indian Express news structured with Gemini AI into Prelims facts, Mains frameworks, and practice MCQs.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl border border-white/20 backdrop-blur-md transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-sky-300 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Fetching...' : 'Refresh News'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNotificationModal(true)}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Bell className="w-4 h-4 text-slate-950 fill-slate-950" />
              <span>Push Alerts</span>
            </button>
          </div>
        </div>

        {/* Refresh feedback alert */}
        {refreshMessage && (
          <div className="relative z-10 mt-3 p-2.5 bg-sky-900/80 border border-sky-400/40 rounded-xl text-xs font-bold text-sky-100 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{refreshMessage}</span>
          </div>
        )}
      </section>

      {/* 2. SUB-NAVIGATION TABS & SEARCH */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-dark-card p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        {/* Navigation Mode: Feed / Viral / Digest / Saved */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSubTab('feed')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'feed'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>News Feed</span>
            <span className="text-[10px] bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 px-1.5 py-0.2 rounded-full font-bold">
              {totalCount || articles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('viral')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'viral'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${activeSubTab === 'viral' ? 'fill-amber-200 text-amber-200' : 'text-amber-500 fill-amber-500'}`} />
            <span>Viral News</span>
            {viralArticles.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeSubTab === 'viral'
                  ? 'bg-white/20 text-white'
                  : 'bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300'
              }`}>
                {viralArticles.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('digest')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'digest'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>Today's Digest</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('saved')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'saved'
                ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Saved</span>
            {savedArticles.length > 0 && (
              <span className="text-[10px] bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 px-1.5 py-0.2 rounded-full font-bold">
                {savedArticles.length}
              </span>
            )}
          </button>
        </div>

        {/* Modern Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            fetchNews(1, selectedCategory, searchQuery, selectedSource, false);
          }}
          className="relative flex-1 md:max-w-md flex items-center"
        >
          <div className="relative w-full flex items-center">
            <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute left-3 pointer-events-none shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news, topics, keywords (e.g. BRICS, Supreme Court)..."
              className="w-full pl-9 pr-24 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                  fetchNews(1, selectedCategory, '', selectedSource, false);
                }}
                className="absolute right-16 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-0.5 rounded cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* 3. SOURCE & CATEGORY CHIPS (Visible in 'feed' tab) */}
      {activeSubTab === 'feed' && (
        <div className="space-y-2">
          {/* Source filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex items-center gap-1.5 shrink-0 pr-1 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Newspaper className="w-3.5 h-3.5 text-red-500" />
              <span>Source:</span>
            </div>
            {SOURCES.map(src => {
              const isSelected = selectedSource === src.id;
              return (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => {
                    setSelectedSource(src.id);
                    setPage(1);
                  }}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                    isSelected
                      ? src.id === 'India Today'
                        ? 'bg-red-600 text-white shadow-xs scale-105 ring-2 ring-red-400/40'
                        : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs scale-105'
                      : 'bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {src.label}
                </button>
              );
            })}
          </div>

          {/* Category filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex items-center gap-1.5 shrink-0 pr-1 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5" />
              <span>Category:</span>
            </div>
            {CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setPage(1);
                  }}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs scale-105'
                      : 'bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. VIRAL & TRENDING NEWS VIEW (When activeSubTab === 'viral') */}
      {activeSubTab === 'viral' && (
        <section className="space-y-6 animate-in fade-in">
          {/* Viral Banner Header */}
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 rounded-3xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black uppercase tracking-wider mb-2 shadow-2xs">
                  <Flame className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>UPSC Viral & High-Yield Current Affairs</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
                  Most Discussed & Critical Real News
                </h2>
                <p className="text-xs sm:text-sm text-amber-100 font-medium mt-1 max-w-xl">
                  Curated breaking stories with highest weightage in upcoming UPSC Prelims and Mains examinations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('feed')}
                className="inline-flex items-center gap-1.5 bg-white text-slate-900 hover:bg-amber-50 font-black text-xs px-4 py-2 rounded-xl shadow-md cursor-pointer transition-all self-start sm:self-auto"
              >
                <span>Browse All Feed</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Viral Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {(viralArticles.length > 0 ? viralArticles : articles.slice(0, 6)).map((art, idx) => {
              const isBookmarked = bookmarkedIds.has(art.id);
              return (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticleId(art.id)}
                  className="bg-gradient-to-br from-orange-50/50 via-white to-amber-50/30 dark:from-orange-950/20 dark:via-dark-card dark:to-slate-900 border-2 border-orange-200/90 dark:border-orange-900/50 hover:border-orange-500 dark:hover:border-orange-400 rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
                >
                  <div>
                    {/* Top Real News Cover Image */}
                    <div className="relative w-full h-44 rounded-2xl overflow-hidden mb-3.5 bg-slate-100 dark:bg-slate-800">
                      <img
                        src={art.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80'}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                      {/* Trending # Ranking Badge */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md border border-white/20 flex items-center gap-1">
                          <Flame className="w-3 h-3 fill-white" />
                          #{idx + 1} Viral
                        </span>
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-black/60 text-white border border-white/10 backdrop-blur-md">
                          {art.gs_paper || 'GS-II'}
                        </span>
                      </div>

                      {/* Bookmark Toggle */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleBookmark(e, art.id)}
                        title={isBookmarked ? 'Remove Bookmark' : 'Save Article'}
                        className={`absolute top-2.5 right-2.5 p-2 rounded-xl backdrop-blur-md transition-all cursor-pointer ${
                          isBookmarked
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-black/50 text-white hover:bg-black/80 hover:scale-105'
                        }`}
                      >
                        {isBookmarked ? <BookmarkCheck className="w-4 h-4 fill-white" /> : <Bookmark className="w-4 h-4" />}
                      </button>

                      {/* Bottom Image Strip */}
                      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-white/95 font-medium">
                        <span className="truncate max-w-[170px] font-bold drop-shadow-xs">{art.source}</span>
                        <span className="bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs text-[10px] font-black text-amber-300">
                          {art.read_time_minutes ? `${art.read_time_minutes} min read` : '3 min read'}
                        </span>
                      </div>
                    </div>

                    {/* Headline */}
                    <h3 className="text-sm sm:text-base font-black font-display text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors leading-snug line-clamp-2">
                      {art.title}
                    </h3>

                    {/* Short Summary */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-2 leading-relaxed line-clamp-2">
                      {art.short_summary || art.detailed_summary || 'Click to view high-yield UPSC analysis, Prelims facts and Mains perspective.'}
                    </p>

                    {/* UPSC Relevance */}
                    {art.upsc_relevance && (
                      <div className="mt-2.5 p-2 rounded-xl bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/60 dark:border-orange-900/40 text-[11px] font-bold text-orange-950 dark:text-orange-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span className="truncate">{art.upsc_relevance}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-3.5 pt-2.5 border-t border-orange-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-extrabold text-orange-700 dark:text-orange-400">
                      High-Yield Topic
                    </span>

                    <div className="flex items-center gap-1 text-xs font-black text-orange-600 dark:text-orange-400 group-hover:translate-x-0.5 transition-transform">
                      <span>Full Analysis</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. TODAY'S DIGEST VIEW (When activeSubTab === 'digest') */}
      {activeSubTab === 'digest' && digestData && (
        <section className="bg-white dark:bg-dark-card border border-amber-200/80 dark:border-amber-900/50 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-amber-100 dark:border-amber-950/60 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400 font-black">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black font-display text-slate-900 dark:text-white">
                  Today's UPSC Digest
                </h2>
                <p className="text-xs text-slate-500 dark:text-dark-muted font-medium">
                  {digestData.date} • {digestData.total_today || digestData.total_news_today || topNewsList.length} high-yield topics curated for UPSC
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('feed')}
              className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Feed</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Digest Highlights */}
          {digestData.digest && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
              <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-600" />
                Executive Summary
              </h3>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {digestData.digest.summary}
              </p>
            </div>
          )}

          {/* Top 5 Important News of the Day */}
          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
              🔥 Top High-Yield Headlines
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {topNewsList.map((item: NewsArticleItem, idx: number) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedArticleId(item.id)}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex gap-3 items-start">
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800 relative">
                      <img
                        src={item.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=400&q=80'}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-black px-1.5 py-0.5 rounded backdrop-blur-xs">
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                          {item.gs_paper || 'GS-II'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                          {item.category}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h4>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-black text-blue-600 dark:text-sky-400 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-slate-400 font-medium text-[10px]">{item.source}</span>
                    <span className="flex items-center gap-1">Read Analysis <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. NEWS ARTICLES GRID */}
      {loading && page === 1 ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold">Loading UPSC Current Affairs...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="py-16 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-3xl text-center p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            {activeSubTab === 'saved' ? <Bookmark className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {activeSubTab === 'saved' 
              ? "You haven't saved any current affairs yet" 
              : searchQuery 
                ? "No news found for your search" 
                : "No news articles found for this category"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeSubTab === 'saved'
              ? 'Click the bookmark icon on any news card to save it for quick revision before exams.'
              : 'Try selecting "All Updates" or searching with different keywords.'}
          </p>
          {activeSubTab !== 'feed' && (
            <button
              onClick={() => {
                setActiveSubTab('feed');
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-900"
            >
              Browse All Current Affairs
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 2 Viral / Breaking High-Yield Headline Cards (shown on Main Feed) */}
          {activeSubTab === 'feed' && !searchQuery && page === 1 && selectedCategory === 'all' && selectedSource === 'all' && (viralArticles.length > 0 || articles.length > 0) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-950/70 border border-orange-300 dark:border-orange-800 flex items-center justify-center text-orange-600 dark:text-orange-400">
                    <Flame className="w-3.5 h-3.5 fill-orange-500" />
                  </div>
                  <h3 className="text-sm font-black font-display uppercase tracking-wide text-slate-900 dark:text-white">
                    Today's Top Viral UPSC Headlines
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('viral')}
                  className="text-xs font-black text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Viral ({viralArticles.length || 6})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(viralArticles.slice(0, 2).length > 0 ? viralArticles.slice(0, 2) : articles.slice(0, 2)).map((art, idx) => (
                    <div
                      key={`viral-top-${art.id}`}
                      onClick={() => setSelectedArticleId(art.id)}
                      className="bg-gradient-to-br from-orange-500/[0.12] via-amber-500/[0.04] to-white dark:from-orange-950/40 dark:via-dark-card dark:to-slate-900 border-2 border-orange-200/90 dark:border-orange-800/60 hover:border-orange-400 dark:hover:border-orange-500 rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row gap-4 justify-between relative overflow-hidden"
                    >
                      <div className="w-full sm:w-44 h-36 sm:h-auto rounded-2xl overflow-hidden shrink-0 relative bg-slate-100 dark:bg-slate-800">
                        <img
                          src={art.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=600&q=80'}
                          alt={art.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-xs">
                            🔥 #{idx + 1} Viral
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                              {art.gs_paper || 'GS-II'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                              {art.category}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">• {art.source}</span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2 leading-snug">
                            {art.title}
                          </h4>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-1 line-clamp-2 leading-relaxed">
                            {art.short_summary || art.detailed_summary}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-xs font-black text-orange-600 dark:text-orange-400 mt-2.5 pt-2 border-t border-orange-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 font-normal">
                            {art.read_time_minutes ? `${art.read_time_minutes} min read` : '3 min read'}
                          </span>
                          <span className="flex items-center gap-1">
                            Deep AI Analysis <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular News Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredArticles.map((art) => {
              const isBookmarked = bookmarkedIds.has(art.id);

              return (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticleId(art.id)}
                  className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between overflow-hidden"
                >
                <div>
                  {/* Top Real News Cover Image */}
                  <div className="relative w-full h-44 rounded-2xl overflow-hidden mb-3.5 bg-slate-100 dark:bg-slate-800">
                    <img
                      src={art.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80'}
                      alt={art.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    {/* Subtle bottom gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

                    {/* GS Paper Badge on top-left of image */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs border border-white/20 backdrop-blur-md">
                        {art.gs_paper || 'GS-II'}
                      </span>
                      <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-black/60 text-white border border-white/10 backdrop-blur-md">
                        {art.category || 'Polity'}
                      </span>
                    </div>

                    {/* Bookmark Toggle on top-right of image */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleBookmark(e, art.id)}
                      title={isBookmarked ? 'Remove Bookmark' : 'Save Article'}
                      className={`absolute top-2.5 right-2.5 p-2 rounded-xl backdrop-blur-md transition-all cursor-pointer ${
                        isBookmarked
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-black/50 text-white hover:bg-black/80 hover:scale-105'
                      }`}
                    >
                      {isBookmarked ? <BookmarkCheck className="w-4 h-4 fill-white" /> : <Bookmark className="w-4 h-4" />}
                    </button>

                    {/* Bottom strip of the image */}
                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-white/95 font-medium">
                      <span className="truncate max-w-[170px] font-bold drop-shadow-xs">{art.source}</span>
                      <span className="bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs text-[10px] font-bold">
                        {art.read_time_minutes ? `${art.read_time_minutes} min read` : '3 min read'}
                      </span>
                    </div>
                  </div>

                  {/* Headline */}
                  <h3 className="text-sm sm:text-base font-black font-display text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
                    {art.title}
                  </h3>

                  {/* Short Summary */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-2 leading-relaxed line-clamp-2">
                    {art.short_summary || art.detailed_summary || 'Click to view structured UPSC analysis, prelims facts and mains perspective.'}
                  </p>

                  {/* UPSC Relevance Pill */}
                  {art.upsc_relevance && (
                    <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{art.upsc_relevance}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Card Footer */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-slate-400">
                    {new Date(art.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>

                  <div className="flex items-center gap-1 text-xs font-black text-blue-600 dark:text-sky-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Full Analysis</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* 6. PAGINATION / LOAD MORE */}
      {activeSubTab === 'feed' && hasMore && (
        <div className="text-center pt-3 pb-6">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white dark:bg-dark-card hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 font-black text-xs sm:text-sm text-slate-800 dark:text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading more articles...</span>
              </>
            ) : (
              <>
                <span>Load More News ({totalCount - articles.length} remaining)</span>
                <ChevronRight className="w-4 h-4 text-blue-600" />
              </>
            )}
          </button>
        </div>
      )}

      {/* 7. ARTICLE DETAIL MODAL */}
      {selectedArticleId && (
        <NewsDetailModal
          articleId={selectedArticleId}
          onClose={() => setSelectedArticleId(null)}
          onBookmarkToggle={() => {
            fetchSavedNews();
          }}
        />
      )}

      {/* 8. PUSH NOTIFICATION SETTINGS MODAL */}
      {showNotificationModal && (
        <NotificationSettingsModal
          onClose={() => setShowNotificationModal(false)}
        />
      )}
    </div>
  );
};
