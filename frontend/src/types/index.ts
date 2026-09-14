export type ExamType = 
  | "UPSC_CSE" 
  | "SSC_CGL" 
  | "BANK_PO" 
  | "RAILWAY_RRB" 
  | "STATE_PSC";

export type QuestionSourceType = 
  | "PYQ" 
  | "PDF_EXTRACTED" 
  | "AI_GENERATED" 
  | "CURRENT_AFFAIRS" 
  | "COMMUNITY";

export type AnswerStatus = 
  | "VERIFIED" 
  | "AI_VERIFIED" 
  | "SOURCE_VERIFIED" 
  | "NEEDS_REVIEW" 
  | "UNVERIFIED";

export type PortalTab = "home" | "news" | "practice" | "upload" | "progress" | "ai" | "profile";

export interface NewsArticleItem {
  id: string;
  title: string;
  original_url: string;
  source: string;
  source_logo?: string | null;
  image_url?: string | null;
  published_at: string;
  category: string;
  gs_paper: string;
  relevance_score: number;
  is_featured: boolean;
  read_time_minutes: number;
  short_summary: string;
  detailed_summary?: string;
  why_in_news?: string;
  what_happened?: string;
  background?: string;
  upsc_relevance?: string;
  key_facts?: string[];
  prelims_facts?: string[];
  mains_perspective?: {
    dimensions?: string[];
    challenges?: string[];
    way_forward?: string;
  };
  important_terms?: string[];
  possible_mains_questions?: string[];
  practice_mcqs?: Array<{
    question: string;
    options: Array<{ id: string; text: string }>;
    correct_answer: string;
    explanation: string;
  }>;
  simple_explanation?: string;
  hindi_explanation?: string;
  hinglish_explanation?: string;
  prelims_notes?: string;
  mains_notes?: string;
  views_count?: number;
  bookmarks_count?: number;
  is_bookmarked?: boolean;
  created_at?: string;
}

export interface NewsFeedResponse {
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
  articles: NewsArticleItem[];
  categories: string[];
  last_updated: string;
}

export interface NewsTodaysDigestResponse {
  date: string;
  formatted_date?: string;
  total_today: number;
  total_news_today?: number;
  top_5: NewsArticleItem[];
  top_stories?: NewsArticleItem[];
  summary_bullet_points?: string[];
  digest?: {
    date: string;
    summary: string;
    key_themes: string[];
  };
}

export interface PushNotificationPreferences {
  id?: string;
  user_id?: string;
  enabled: boolean;
  frequency: "HOURLY" | "EVERY_2_HOURS" | "THRICE_DAILY" | "DAILY_DIGEST" | "OFF";
  preferred_morning_time: string;
  preferred_afternoon_time: string;
  preferred_evening_time: string;
  categories_filter: string[];
  last_notified_at?: string;
}

export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type DifficultyLevel = Difficulty;

export interface QuestionOption {
  id: string; // "A", "B", "C", "D"
  text: string;
}

export interface StructuredExplanation {
  answer: string;
  why: string;
  quick_fact: string;
  memory_trick: string;
}

export interface Question {
  id: string;
  question_text: string;
  options: QuestionOption[];
  correct_answer: string;
  explanation: StructuredExplanation;
  subject: string;
  topic: string;
  subtopic?: string;
  exam: ExamType;
  difficulty: Difficulty;
  question_type: string;
  source_type: QuestionSourceType;
  source_document_id?: string | null;
  source_reference?: string;
  answer_status: AnswerStatus;
  answer_confidence: number;
  is_verified: boolean;
  language: string;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type PracticeMode = 
  | "LEARN" 
  | "PRACTICE" 
  | "FOCUS_TEST" 
  | "QUICK_10" 
  | "MOCK_TEST" 
  | "MISTAKE_PRACTICE" 
  | "SMART_REVISION";

export interface AICoachSummary {
  what_improved: string;
  biggest_weakness: string;
  what_to_practice_next: string;
  short_recommendation: string;
  strong_areas?: string[];
  weak_areas?: string[];
}

export interface QuizSession {
  id: string;
  user_id?: string;
  session_type: PracticeMode | string;
  exam_id?: string;
  subject_id?: string;
  topic_id?: string;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  unattempted_count: number;
  skipped_count?: number;
  score: number;
  accuracy: number;
  accuracy_percentage?: number;
  time_spent_seconds: number;
  time_limit_seconds?: number | null;
  focus_score?: number;
  focus_violations_count?: number;
  ai_coach_summary?: AICoachSummary | null;
  status?: string;
  is_completed?: boolean;
  created_at: string;
  completed_at?: string | null;
}

export interface DailyCurrentAffair {
  id: string;
  date: string;
  title: string;
  summary: string;
  topic: string;
  source: string;
  source_reference?: string;
  exam_relevance?: string;
  key_takeaways: string[];
  question_ids?: string[];
  created_at?: string;
}

export interface SmartRevisionSummary {
  total_recommended: number;
  mistakes_count: number;
  repeated_mistakes_count: number;
  weak_topics_count: number;
  current_affairs_count: number;
  recommended_formula: string;
}

export interface PersonalBests {
  highest_score?: number;
  highest_accuracy?: number;
  longest_streak?: number;
  most_questions_solved_day?: number;
}

export interface StudentAnalytics {
  metrics: {
    accuracy: number;
    speed_seconds: number;
    consistency_score: number;
    coverage_percentage: number;
    total_questions_solved: number;
    streak_days: number;
  };
  thresholds: {
    weak: number;
    strong: number;
  };
  subjects: {
    subject: string;
    accuracy: number;
    attempts: number;
    status: "STRONG" | "IMPROVING" | "WEAK";
  }[];
  topics: {
    topic: string;
    subject: string;
    attempts: number;
    accuracy: number;
    status: "STRONG" | "IMPROVING" | "WEAK";
  }[];
  weak_topics: any[];
  strong_topics: any[];
}

export interface WeakTopic {
  id?: string;
  subject: string;
  topic: string;
  attempts_count: number;
  errors_count: number;
  weakness_score: number;
  recommendation?: string;
}

export interface PDFDocument {
  id: string;
  user_id?: string;
  file_name: string;
  file_size_bytes: number;
  file_url?: string;
  file_hash?: string;
  status: "PENDING" | "PROCESSING" | "EXTRACTED" | "READY" | "FAILED";
  processing_stage: "UPLOADING" | "PROCESSING" | "EXTRACTING" | "ANALYZING" | "VERIFYING" | "READY" | "FAILED";
  page_count: number;
  extracted_questions_count: number;
  ready_count?: number;
  needs_review_count?: number;
  duplicate_count?: number;
  error_message?: string;
  created_at: string;
}

export interface PDFQuestionDraft {
  id: string;
  document_id: string;
  question_text: string;
  options: { id: string; text: string }[];
  question_image_url?: string;
  candidate_answer: string;
  has_explicit_answer: boolean;
  answer_status: "PDF_VERIFIED" | "SOURCE_VERIFIED" | "AI_VERIFIED" | "NEEDS_REVIEW" | "UNVERIFIED";
  confidence_score: number;
  source_reference?: string;
  verification_source?: string;
  verification_notes?: string;
  reasoning_summary?: string;
  explanation?: {
    answer?: string;
    why?: string;
    quick_fact?: string;
    memory_trick?: string;
  };
  is_duplicate?: boolean;
  duplicate_of_question_id?: string;
  language?: string;
  subject?: string;
  topic?: string;
  is_imported: boolean;
  created_at?: string;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  role?: 'ADMIN' | 'STUDENT' | string;
  is_admin?: boolean;
  full_name?: string;
  name?: string;
  target_exam: ExamType;
  preferred_language?: string;
  language?: string;
  streak_count?: number;
  questions_solved?: number;
  total_study_minutes?: number;
  daily_goal?: number;
}

export interface DailyGoalData {
  id: string;
  target_questions: number;
  target_study_minutes: number;
  solved_today: number;
  minutes_today: number;
  date: string;
  is_achieved: boolean;
  progress_percentage: number;
}

export interface StudentHomeSummary {
  greeting: string;
  target_exam: ExamType;
  streak: number;
  daily_goal: DailyGoalData;
  continue_practice: {
    session_id: string;
    session_type: string;
    exam_id: string;
    subject: string;
    progress: string;
  } | null;
  quick_10_ready: boolean;
  daily_current_affairs: {
    title: string;
    date: string;
    key_takeaway: string;
    exam_relevance: string;
  };
  weak_topic: {
    topic: string;
    subject: string;
    error_rate: number;
    recommendation: string;
  } | null;
  weekly_progress: {
    day: string;
    solved: number;
    accuracy: number;
  }[];
}

export interface MistakeItem {
  mistake_id: string;
  question: Question;
  topic: string;
  first_mistake_at: string;
  last_mistake_at: string;
  repeated_count: number;
  attempt_count: number;
  accuracy: number;
}

export interface BookmarkItem {
  bookmark_id: string;
  notes?: string;
  created_at: string;
  question: Question;
}

export interface StudentProfileData {
  user: {
    id: string;
    name: string;
    email: string;
    email_verified: boolean;
    target_exam: ExamType;
    language: string;
    avatar?: string;
    daily_goal: number;
    timezone: string;
    status: string;
    created_at?: string;
  };
  stats: {
    questions_solved: number;
    tests_taken: number;
    overall_accuracy: number;
    streak: number;
    daily_goal: number;
  };
  settings: {
    language: string;
    theme: string;
    notifications: boolean;
    timezone: string;
  };
}
