import type { 
  StudentHomeSummary, 
  MistakeItem, 
  BookmarkItem, 
  StudentProfileData 
} from "../types";

const RAW_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";
// Normalize base URL: strip trailing slash and trailing /api if provided so ${BASE_URL}/api/... is always clean
const BASE_URL = RAW_URL.replace(/\/+$/, "").replace(/\/api$/, "");

const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 25_000; // 25 seconds fast cache window

export function invalidateApiCache(pattern?: string) {
  if (!pattern) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.includes(pattern)) {
      apiCache.delete(key);
    }
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  useCache: boolean = false
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  
  if (method === "GET" && useCache) {
    const cached = apiCache.get(endpoint);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as T;
    }
  }

  const token = localStorage.getItem("sundaram_token");
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include", // Automatically send and receive secure HTTP-only cookies
    headers,
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    const errorMsg = json?.error?.message || "An unexpected error occurred.";
    const err: any = new Error(errorMsg);
    err.code = json?.error?.code;
    err.details = json?.error?.details;
    throw err;
  }

  if (method === "GET" && useCache) {
    apiCache.set(endpoint, { data: json.data, timestamp: Date.now() });
  } else if (method !== "GET") {
    // Invalidate relevant cache keys on data modification
    if (endpoint.includes("/profile") || endpoint.includes("/daily-goal")) {
      invalidateApiCache("/student/profile");
      invalidateApiCache("/student/home");
    } else if (endpoint.includes("/practice/") || endpoint.includes("/submit") || endpoint.includes("/complete")) {
      invalidateApiCache("/student/home");
      invalidateApiCache("/student/analytics");
      invalidateApiCache("/student/mistakes");
    }
  }

  return json.data as T;
}

export interface StreamChatParams {
  query: string;
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: any;
  language_mode?: string;
}

export async function streamAssistantChat(
  params: StreamChatParams,
  onToken: (token: string) => void,
  onDone: (data: { model_used?: string; sources?: string[] }) => void,
  onError: (err: Error) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = localStorage.getItem("sundaram_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/ai/chat/stream`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(params),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Chat stream failed: HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body available for streaming");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const block of lines) {
        const trimmed = block.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === "token" && data.content) {
              onToken(data.content);
            } else if (data.type === "done") {
              onDone({ model_used: data.model_used, sources: data.sources });
            } else if (data.type === "error") {
              onError(new Error(data.message || "Streaming error"));
            }
          } catch {
            // Ignore parse errors on partial chunks
          }
        }
      }
    }

    // Process leftover buffer if any
    if (buffer.trim().startsWith("data: ")) {
      try {
        const data = JSON.parse(buffer.trim().slice(6));
        if (data.type === "token" && data.content) {
          onToken(data.content);
        } else if (data.type === "done") {
          onDone({ model_used: data.model_used, sources: data.sources });
        }
      } catch {}
    }
  } catch (err: any) {
    if (err.name === "AbortError") {
      return;
    }
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

export const api = {
  // Production Auth & Quick Login
  register: (data: { full_name?: string; email?: string; phone?: string; password?: string; target_exam?: string }) =>
    apiRequest<{ user?: any; token?: string; email?: string; name?: string; requires_otp?: boolean; status?: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  verifyOtp: (data: { email: string; otp: string; purpose?: string }) =>
    apiRequest<{ verified: boolean; user?: any; token?: string; next_step?: string }>("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  resendOtp: (data: { email: string; purpose?: string }) =>
    apiRequest<{ message?: string; expires_in_minutes?: number; resend_cooldown_seconds?: number }>("/api/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email?: string; phone?: string; password?: string; target_exam?: string }) =>
    apiRequest<{ user: any; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  forgotPasswordRequest: (email: string) =>
    apiRequest<{ message: string }>("/api/auth/forgot-password/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  forgotPasswordReset: (data: { email: string; otp: string; new_password: string }) =>
    apiRequest<{ message: string }>("/api/auth/forgot-password/reset", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  personalize: (data: { target_exam?: string; daily_goal?: number; language?: string; state?: string }) =>
    apiRequest<{ user: any; profile: any; next_step: string }>("/api/auth/personalize", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  changeEmailRequest: (new_email: string) =>
    apiRequest<{ message: string; new_email: string }>("/api/auth/change-email/request", {
      method: "POST",
      body: JSON.stringify({ new_email }),
    }),
  logout: () =>
    apiRequest<{ message: string }>("/api/auth/logout", { method: "POST" }),
  demoLogin: () => apiRequest<{ user: any; token: string }>("/api/auth/demo-login", { method: "POST" }),
  getMe: () => apiRequest<{ user: any }>("/api/auth/me"),
  updatePreferences: (prefs: { target_exam?: string; preferred_language?: string }) =>
    apiRequest<{ user: any }>("/api/auth/preferences", {
      method: "PATCH",
      body: JSON.stringify(prefs),
    }),

  // Student Portal Optimized Endpoints (Neon Data Transfer Protection & Fast UI Caching)
  getHomeSummary: () => apiRequest<StudentHomeSummary>("/api/student/home", {}, true),
  getPracticeHub: (exam?: string) => apiRequest<{ exam: string; subjects: any[]; total_questions_available: number }>(`/api/student/practice-hub?exam=${exam || 'UPSC_CSE'}`, {}, true),
  startQuick10: (exam?: string) => apiRequest<{ session: any; questions: any[] }>("/api/student/quick-10", {
    method: "POST",
    body: JSON.stringify({ exam: exam || "UPSC_CSE" })
  }),
  getMistakes: (page: number = 1, limit: number = 10) =>
    apiRequest<{ total: number; page: number; limit: number; mistakes: MistakeItem[] }>(`/api/student/mistakes?page=${page}&limit=${limit}`, {}, true),
  getBookmarks: (page: number = 1, limit: number = 10) =>
    apiRequest<{ total: number; page: number; limit: number; bookmarks: BookmarkItem[] }>(`/api/student/bookmarks?page=${page}&limit=${limit}`, {}, true),
  toggleBookmark: (question_id: string, notes?: string) =>
    apiRequest<{ bookmarked: boolean; bookmark?: any }>("/api/student/bookmarks/toggle", {
      method: "POST",
      body: JSON.stringify({ question_id, notes })
    }),
  getProfile: () => apiRequest<StudentProfileData>("/api/student/profile", {}, true),
  updateProfile: (data: Partial<{ name: string; target_exam: string; language: string; daily_goal: number }>) =>
    apiRequest<{ user: any; message: string }>("/api/student/profile", {
      method: "PATCH",
      body: JSON.stringify(data)
    }),

  // Questions
  getQuestions: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest<{ total: number; questions: any[] }>(`/api/questions?${query}`, {}, true);
  },
  getFilters: () => apiRequest<{ exams: string[]; subjects: string[]; topics: string[]; source_types: string[]; answer_statuses: string[] }>("/api/questions/filters", {}, true),

  // Practice & Focus Tests
  startPractice: (body: { exam: string; session_type?: string; subject?: string; topic?: string; count?: number; time_limit_seconds?: number; document_id?: string; document_ids?: string[] }) =>
    apiRequest<{ session: any; questions: any[] }>("/api/practice/start", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  submitResponse: (body: { session_id: string; question_id: string; selected_option?: string; is_skipped?: boolean; time_taken_seconds: number }) =>
    apiRequest<{ is_correct?: boolean; is_skipped?: boolean; correct_answer?: string | null; explanation?: any; session_summary: any }>("/api/practice/submit", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  recordFocusViolation: (body: { session_id: string; violation_type: string; details?: string }) =>
    apiRequest<{ focus_score: number; focus_violations_count: number; is_terminated: boolean; warning_title: string; warning_message: string }>("/api/practice/focus-violation", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  completeSession: (session_id: string) =>
    apiRequest<{ session: any; stats: any; ai_coach?: any; new_personal_bests?: any[]; subject_breakdown?: any[]; topic_breakdown?: any[]; strong_topics?: any[]; weak_topics?: any[] }>("/api/practice/complete", {
      method: "POST",
      body: JSON.stringify({ session_id }),
    }),
  getSessionDetails: (session_id: string) =>
    apiRequest<{ session: any; responses: Record<string, any>; questions: any[] }>(`/api/practice/session/${session_id}`),
  getWeakTopics: () => apiRequest<{ weak_topics: any[] }>("/api/practice/weak-topics", {}, true),

  // Current Affairs & Smart Revision & Analytics
  getDailyCurrentAffairs: (page: number = 1, limit: number = 10) =>
    apiRequest<{ total: number; page: number; limit: number; current_affairs: any[] }>(`/api/student/current-affairs?page=${page}&limit=${limit}`, {}, true),
  getSmartRevisionSummary: () =>
    apiRequest<{ total_recommended: number; mistakes_count: number; repeated_mistakes_count: number; weak_topics_count: number; current_affairs_count: number; recommended_formula: string }>("/api/student/smart-revision", {}, true),
  getStudentAnalytics: (weak_threshold: number = 50, strong_threshold: number = 70) =>
    apiRequest<any>(`/api/student/analytics?weak_threshold=${weak_threshold}&strong_threshold=${strong_threshold}`, {}, true),
  getPersonalBests: () =>
    apiRequest<{ personal_bests: any }>("/api/student/personal-bests", {}, true),
  updateDailyGoal: (target_questions: number) =>
    apiRequest<{ daily_goal: any; message: string }>("/api/student/daily-goal", {
      method: "PATCH",
      body: JSON.stringify({ target_questions }),
    }),

  // Sundaram AI Assistant & In-Question Tutor
  askAssistant: (query: string, context?: any, language_mode: string = "EN") =>
    apiRequest<{ reply: string; model_used: string; sources: string[]; notice?: string }>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ query, context, language_mode }),
    }),
  streamAssistantChat: (
    params: { query: string; conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>; context?: any; language_mode?: string },
    onToken: (token: string) => void,
    onDone: (data: { model_used?: string; sources?: string[] }) => void,
    onError: (err: Error) => void,
    signal?: AbortSignal
  ) => streamAssistantChat(params, onToken, onDone, onError, signal),
  tutorQuestionAction: (body: { action_type: string; question_id?: string; question?: any; user_selected?: string; language_mode?: string }) =>
    apiRequest<{ reply: string; model_used: string; sources?: string[]; notice?: string }>("/api/ai/tutor-action", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  explainQuestion: (question_id: string, mode: "STANDARD" | "HINGLISH" | "WHY_WRONG" | "MEMORY_TRICK", user_selected?: string) =>
    apiRequest<{ reply: string; model_used: string; sources: string[]; notice?: string }>("/api/ai/explain-question", {
      method: "POST",
      body: JSON.stringify({ question_id, mode, user_selected }),
    }),

  // PDF Intelligence & Studio
  uploadPDF: (formData: FormData) =>
    apiRequest<{ document: any; message: string; cached?: boolean }>("/api/pdf/upload", {
      method: "POST",
      body: formData,
    }),
  listPDFDocuments: (page: number = 1, limit: number = 10) =>
    apiRequest<{ total: number; page: number; limit: number; documents: any[] }>(`/api/pdf/documents?page=${page}&limit=${limit}`),
  getPDFStatus: (docId: string) =>
    apiRequest<{ id: string; status: string; processing_stage: string; extracted_questions_count: number; ready_count: number; needs_review_count: number; duplicate_count: number }>(`/api/pdf/documents/${docId}/status`),
  getPDFDrafts: (docId: string) =>
    apiRequest<{ document: any; summary: { total_detected: number; ready_count: number; needs_review_count: number; duplicate_count: number }; drafts: any[] }>(`/api/pdf/documents/${docId}/drafts`),
  approvePDFDraft: (draftId: string, details?: any) =>
    apiRequest<{ question: any; message: string }>(`/api/pdf/drafts/${draftId}/approve`, {
      method: "POST",
      body: JSON.stringify(details || {}),
    }),
  approveAllReadyDrafts: (docId: string, details?: any) =>
    apiRequest<{ imported_count: number; message: string }>(`/api/pdf/documents/${docId}/approve-all`, {
      method: "POST",
      body: JSON.stringify(details || {}),
    }),
  editPDFDraft: (draftId: string, data: any) =>
    apiRequest<{ draft: any; message: string }>(`/api/pdf/drafts/${draftId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  rejectPDFDraft: (draftId: string) =>
    apiRequest<{ message: string }>(`/api/pdf/drafts/${draftId}`, {
      method: "DELETE",
    }),
  generateAIQuestions: (docId: string, mode: "SIMILAR" | "REVISION" = "SIMILAR", count: number = 3) =>
    apiRequest<{ generated_count: number; mode: string; drafts: any[]; message: string }>(`/api/pdf/documents/${docId}/generate-ai`, {
      method: "POST",
      body: JSON.stringify({ mode, count }),
    }),
  deletePDFDocument: (docId: string) =>
    apiRequest<{ message: string }>(`/api/pdf/documents/${docId}`, {
      method: "DELETE",
    }),

  // Question Reporting (Section 13)
  submitReport: (body: { question_id: string; issue_type: string; description?: string }) =>
    apiRequest<{ report_id: string; message: string }>("/api/student/reports", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

