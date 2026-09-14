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
  AlertCircle
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

export const CurrentAffairsView: React.FC = () => {
  // Navigation subtabs: 'feed' | 'digest' | 'saved'
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'digest' | 'saved'>('feed');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Articles state
  const [articles, setArticles] = useState<NewsArticleItem[]>([]);
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
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  // Modals
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);

  // Fetch articles from backend
  const fetchNews = useCallback(async (pageNum: number, category: string, search: string = '', append = false) => {
    try {
      if (!append) setLoading(true);
      const catParam = category === 'all' ? undefined : category;
      const searchParam = search.trim() ? search.trim() : undefined;
      const res = await api.getNewsFeed({ page: pageNum, limit: 12, category: catParam, search: searchParam });
      
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
        if (res.last_updated) {
          try {
            const dateObj = new Date(res.last_updated);
            setLastUpdatedTime(dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          } catch {}
        }
      }
    } catch (err) {
      console.error('Failed to fetch news feed:', err);
    } finally {
      setLoading(false);
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

  // Live search and category change listener with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchNews(1, selectedCategory, searchQuery, false);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchNews, selectedCategory, searchQuery]);

  // Initial load for digest and bookmarks
  useEffect(() => {
    fetchTodayDigest();
    fetchSavedNews();
  }, [fetchTodayDigest, fetchSavedNews]);

  // Handle Load More
  const handleLoadMore = () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNews(nextPage, selectedCategory, searchQuery, true);
  };

  // Handle Refresh
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshMessage(null);
    try {
      const res = await api.refreshNews();
      setRefreshMessage(res.message || `Fetched ${res.new_articles_count} new articles.`);
      setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setPage(1);
      await fetchNews(1, selectedCategory, searchQuery, false);
      await fetchTodayDigest();
    } catch (err) {
      console.error('Failed to refresh news:', err);
      setRefreshMessage('News update temporarily unavailable. Showing cached articles.');
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
      if (res.is_bookmarked) {
        setBookmarkedIds(prev => new Set([...prev, articleId]));
      } else {
        setBookmarkedIds(prev => {
          const next = new Set(prev);
          next.delete(articleId);
          return next;
        });
      }
      fetchSavedNews();
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

  // Formatted today date string
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const topNewsList: NewsArticleItem[] = digestData?.top_5 || digestData?.top_stories || [];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* 1. HEADER SECTION */}
      <section className="bg-gradient-to-br from-[#0B2545] via-[#133E68] to-[#1E4E79] text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden">
        {/* Background decorative shapes */}
        <div className="absolute right-0 top-0 bottom-0 w-80 pointer-events-none opacity-10 select-none">
          <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" stroke="currentColor">
            <circle cx="150" cy="100" r="80" strokeWidth="4" strokeDasharray="8 8" />
            <circle cx="150" cy="100" r="50" strokeWidth="3" />
            <circle cx="150" cy="100" r="20" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
          </svg>
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
              PIB, The Hindu & Indian Express news structured with Gemini AI into Prelims facts, Mains frameworks, and practice MCQs.
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
        {/* Navigation Mode: Feed / Digest / Saved */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveSubTab('feed')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
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
            onClick={() => setActiveSubTab('digest')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
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

        {/* Search Bar */}
        <div className="relative flex-1 md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search news, topics, keywords (e.g. Supreme Court, AI, G20)..."
            className="w-full pl-9.5 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 3. CATEGORY CHIPS (Visible in 'feed' tab) */}
      {activeSubTab === 'feed' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5 shrink-0 pr-2 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
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
      )}

      {/* 4. TODAY'S DIGEST VIEW (When activeSubTab === 'digest') */}
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
              className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
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
