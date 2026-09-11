# SUNDARAM PREP — PROJECT STATUS & TRACKER

**Status Date:** September 2026  
**Phase:** Neon PostgreSQL Production Database Architecture & Student Portal  
**Status:** COMPLETED & PRODUCTION-VERIFIED

---

## 1. MILESTONE BREAKDOWN

### Phase 1: Foundation & Project Brain
- [x] Project Vision and Architectural Blueprint defined
- [x] `/docs/PROJECT_BRAIN.md` created (permanent long-term memory)
- [x] `/docs/PROJECT_STATUS.md` created (live execution status)
- [x] Tech stack: Flask + Neon PostgreSQL + OpenAI Responses API + React 19 + Vite + Tailwind CSS + PWA

### Phase 2: Neon PostgreSQL Production Architecture & Alembic Migrations
- [x] Integrated `Flask-Migrate` (Alembic) migration engine (`migrations/`)
- [x] Eliminated application startup table recreation in favor of formal migrations
- [x] Core 28+ Normalized Tables:
  - [x] `users`, `user_profiles`, `daily_goals`, `streaks`
  - [x] `exams`, `subjects`, `topics`, `subtopics`
  - [x] `questions`, `question_options`, `question_exams` (Many-to-Many), `question_sources`, `answer_verifications`, `question_sets`
  - [x] `test_sessions`, `test_questions`, `test_answers` (User Attempts logging)
  - [x] `mistakes` (**Section 6: Automated Mistake Engine** tracking first/last error, repeated count, accuracy without row duplication)
  - [x] `bookmarks`, `focus_events`, `user_topic_stats`
  - [x] `documents`, `document_processing_jobs`, `pdf_question_drafts`
  - [x] `notifications`, `achievements`, `reports`, `admin_actions`
  - [x] `ai_conversations`, `ai_messages`, `ai_usage_logs`
- [x] Composite indexes applied on critical access paths (`idx_questions_exam_subject_diff`, `idx_test_answers_user_correct`, `idx_mistakes_user_resolved`)
- [x] Normalized database seeded via `seed_data.py` (Curriculum, Exams, Subjects, Topics, Many-to-Many Questions, Demo Profile)

### Phase 3: Neon Data Transfer Protection & Optimized APIs
- [x] `GET /api/student/home`: Lightweight single-query summary (< 2KB payload: greeting, streak, daily goal, continue practice, quick 10, daily current affairs capsule, weak spot, weekly progress)
- [x] `GET /api/student/practice-hub`: Projected subject counts and mastery
- [x] `POST /api/student/quick-10`: Instant 10-question high-yield blitz
- [x] `GET /api/student/mistakes`: Paginated Mistake Engine review
- [x] `POST /api/student/bookmarks/toggle` & `GET /api/student/bookmarks`: Paginated bookmarks
- [x] `GET /api/student/profile` & `PATCH /api/student/profile`: Section 12 profile metrics and preferences
- [x] Automated backend tests (`test_api.py`) passing 100%

### Phase 4: Upgraded Student Portal & Single-Feature UI Principle
- [x] Navigation upgraded to 6 primary portal tabs: `HOME`, `PRACTICE`, `UPLOAD`, `PROGRESS`, `AI`, `PROFILE`
- [x] Mobile bottom navigation matching all 6 tabs
- [x] **Section 10 HomeView:** Shows only high-yield essentials without clutter
- [x] **Section 11 Single-Feature UI Principle:** Each section renders in isolation, fetching only required data
- [x] **Section 12 ProfileView:** Complete profile overview, statistics, and settings
- [x] Production build validation (`npm run build`) passing with zero TypeScript or lint errors (990ms build time)

### Phase 5: Production-Ready Authentication & Security Architecture
- [x] **Step 01 Account Creation:** Collects Full Name, Primary Email, Password, Target Exam. Creates user in `PENDING` state (`email_verified = False`).
- [x] **Step 02 Resend Email OTP:** Cryptographically secure 6-digit OTP dispatched via Resend. Configurable sender (`MAIL_FROM`).
- [x] **OTP Cryptographic Security:**
  - Zero raw OTP storage in DB. Hashed via SHA-256 with server-side salt (`email_verification_otps`).
  - 10-minute expiration window.
  - Single-use validation (immediate `used_at` timestamping, replay attack immunity).
  - Invalidation of previous unused codes on new dispatch.
  - Rate limiting: 30-second resend cooldown (`RESEND_COOLDOWN`), 10 dispatches/hour cap, 5-attempt brute-force lock.
- [x] **Step 03 Personalization Wizard:** Sets daily MCQ goals (15, 30, 50), prep language (`EN` / `HI`), and optional profile metadata.
- [x] **Step 04 Dashboard:** Direct entry to personalized practice feed.
- [x] **Forgot Password Flow:** Email -> 6-digit OTP -> Salted SHA-256 verification -> New password reset without plaintext passwords.
- [x] **Email Change Guardrails:** Old email remains trusted and active until new email address completes OTP verification.
- [x] **Session Security:**
  - HTTP-Only secure cookies (`access_token`, `SameSite='Lax'`, `Secure` in production).
  - Bearer JWT fallback support for multi-client versatility.
- [x] **Student Protection & Isolation:** Queries strictly scoped by `user_id`; Student A cannot access Student B's PDFs, test sessions, answers, mistakes, bookmarks, or analytics.
- [x] **Automated Test Suite (`test_auth_flow.py`):** 100% pass on registration, OTP, login, invalid OTP, lock, expired OTP, resend limit, forgot password, email change, and student isolation.

### Phase 6: PDF Intelligence Engine & Question Studio
- [x] **Multi-Format & Multi-Language Ingestion:**
  - English, Hindi, and bilingual exam PDFs.
  - Devanagari numerals (`१.`, `२.`, `३.` / `प्रश्न १.`) and Hindi options (`क, ख, ग, घ` -> `A, B, C, D`).
  - Diagram, map, and visual chart extraction mapped to `question_image_url`.
  - Scanned PDF fallback via OCR pipeline.
  - File upload guardrails: max 16MB, safe storage, zero raw file bloat in PostgreSQL.
- [x] **Dual-Path Answer Resolution Engine:**
  - **Case A (Explicit Answer Key in PDF):** Extracts answer, sets `verification_source = 'PDF_KEY'`, `confidence = 1.0`, status `PDF_VERIFIED`.
  - **Case B (Unanswered / Question Papers):** AI reasoning model solves question, grounds in authoritative citations (Constitutional / Economic Survey / PIB / NCERT). Confidence >= 0.85 -> `AI_VERIFIED`; < 0.85 -> `NEEDS_REVIEW`.
  - Explanations strictly follow `Why`, `Quick Fact`, and `Memory Trick` (no 500-word fluff).
- [x] **Duplicate Question Detection Engine:**
  - Token set Jaccard similarity against canonical Question Bank.
  - Flags `is_duplicate = True` and excludes from one-click batch approvals.
- [x] **AI Cost Control & Deduplication:**
  - Document SHA-256 hashing (`file_hash`) skips redundant extraction on duplicate uploads.
- [x] **Question Generation:**
  - Synthesizes `SIMILAR` and `REVISION` questions with `source_type = 'AI_GENERATED'` (never `PYQ`).
- [x] **Draft Review Studio & My PDFs Library:**
  - Live stage indicator: `UPLOADING` -> `EXTRACTING` -> `ANALYZING` -> `VERIFYING` -> `READY`.
  - Metrics breakdown: `X Detected · Y Ready · Z Need Review · W Duplicate`.
  - In-place editing, single approval, single reject, and batch "Approve All Ready".
  - My PDFs library with pagination and launch into practice.
- [x] **Question Discrepancy Reporting:**
  - `POST /api/student/reports` endpoint for student error reports (`WRONG_ANSWER`, `WRONG_EXPLANATION`, `DUPLICATE`, etc.).
- [x] **Automated Test Suite (`test_pdf_engine.py`):** 100% passing across all 9 test scenarios.

---

## 2. VERIFIED FUNCTIONALITY
- **Neon Data Protection:** Zero unnecessary database calls; no table scans on home visits.
### Phase 7: Complete Student Learning Experience & Practice Engine
- [x] **5 Practice Modes:**
  - [x] `LEARN MODE`: Instant feedback on answer submission with Why / Quick Fact / Memory Trick, bookmarking, and in-question "Ask AI".
  - [x] `PRACTICE MODE`: Flexible practice with optional timer, full question navigator grid, skipping, bookmarking, submit, and pause/resume later.
  - [x] `FOCUS MODE`: High-stakes exam simulation (100 Qs / 100 min or configurable), proctored fullscreen environment, browser focus violation detector, 3-strike warning dialogs, auto-termination at 3/3, and distinct Focus Score (100 -> 80 -> 60 -> 40).
  - [x] `QUICK 10`: Rapid 10-question high-yield mixed blitz for micro-sessions.
  - [x] `MOCK TEST`: Standard exam simulation with negative marking, time constraints, and no mid-test answer reveals.
- [x] **Focus Violation & Proctoring Engine:**
  - [x] Strict terminology invariant: always titled **"FOCUS VIOLATIONS"**, never accusing students of cheating.
  - [x] Exam marks are NEVER deducted for focus violations; Focus Score is tracked independently as a discipline metric.
  - [x] 3-strike threshold: Warning 1 (80 pts), Warning 2 (60 pts), Warning 3 (40 pts & auto-termination).
- [x] **Comprehensive Results Experience:**
  - [x] Real-time score, accuracy percentage, correct/wrong/skipped counts, time spent, and Focus Score display.
  - [x] Subject & Topic mastery breakdowns: Strong (>70%), Improving (50–70%), Weak (<50%).
  - [x] Personal Best celebrations with highlighted banner badges.
- [x] **Automated Mistake Notebook:**
  - [x] Immediate auto-logging of incorrect attempts into `mistakes` table with repeat count tracking.
  - [x] 1-click *"Practice My Mistakes"* custom session generator.
- [x] **Post-Test AI Coach:**
  - [x] Synthesizes actionable coaching summary (What improved, Biggest weakness, What to practice next, Recommendation).
  - [x] Strict Neon data efficiency: receives only condensed metrics (accuracy delta, pace, sectional mastery), never raw DB dumps.
- [x] **In-Question AI Tutor ("Ask AI"):**
  - [x] 7 contextual actions: `EXPLAIN_SIMPLY`, `WHY_WRONG`, `EXPLAIN_HINDI`, `EXPLAIN_HINGLISH`, `MEMORY_TRICK`, `SIMILAR_QUESTION`, `DETAILED_EXPLANATION`.
- [x] **Daily Current Affairs & Smart Revision:**
  - [x] `daily_current_affairs` table with date, authoritative sources (PIB/The Hindu), summary takeaways, and attached quiz questions.
  - [x] Smart Revision generator with balanced 50% mistakes / 30% weak topics / 20% current affairs ratio.
- [x] **Configurable Student Analytics:**
  - [x] 4 core pillars: Accuracy, Speed, Consistency, Coverage.
  - [x] Interactive user-adjustable benchmark sliders with dynamic percentile and grade feedback.
  - [x] Clean Subject Performance bar chart with zero chart overload.
- [x] **Daily Goals, Streaks & Personal Bests:**
  - [x] 20 / 50 / 100 questions per day goal selector pills.
  - [x] Personal bests tracking (Highest Score, Highest Accuracy, Longest Streak, Most Solved/Day).
- [x] **Automated Test Suite (`test_learning_experience.py`):**
  - [x] 7/7 tests passing (Learn Mode instant feedback, Practice Navigator/Skip/Resume, Focus Mode 3 strikes & auto-termination, Results & AI Coach, In-question AI Tutor, Smart Revision, Configurable Analytics).
  - [x] All 4 backend test suites passing 100% (36/36 tests total).
- [x] **Production Frontend Build:**
  - [x] `npm run build` passing with zero TypeScript or lint errors.

### Phase 8: Final Production Polish, Design System, Render & Observability
- [x] **Brand & Centralized Design Tokens:**
  - [x] Indigo primary (`#4F46E5`), Violet secondary (`#7C3AED`), Light Surface (`#FFFFFF`), Light BG (`#F8FAFC`), Dark BG (`#0B0F19`), Dark Surface (`#161E2E` / `#1E293B`), Dark Text (`#F8FAFC`), Dark Muted (`#94A3B8`).
  - [x] Consistent tokens configured in `tailwind.config.js` and `src/index.css`.
- [x] **Full Light / Dark / System Theme Architecture:**
  - [x] `ThemeContext.tsx` with `light`, `dark`, and `system` modes.
  - [x] Theme switch toggle in Header and interactive theme selector in Profile settings.
  - [x] Full dark mode support across ALL components (Home, Practice Hub, Practice Arena, Results, Analytics, PDF Studio, Sundaram AI Assistant, AI Tutor Modal, Auth Modal, Profile).
- [x] **Universal Responsiveness & 11–12" Tablet Optimization:**
  - [x] Tested and verified responsive layouts across 320px, 360px, 390px, 430px, 768px, 820px, 834px, 1024px, 1180px, 1280px, 1440px, 1920px.
  - [x] Dedicated 2-column dashboard for portrait and landscape tablets.
  - [x] Zero horizontal overflow, no cut-off buttons or hidden inputs.
- [x] **Perceived Performance & UX Polish:**
  - [x] Replaced all blank spinners with skeleton loaders (`SkeletonBox`, `CardSkeleton`, `QuestionSkeleton`, `ChartSkeleton`).
  - [x] Actionable empty states (`EmptyState`) with direct CTA buttons.
  - [x] Human-friendly error state (`ErrorState`) with retry capabilities.
  - [x] Single-Feature UI Principle enforced: opening one feature presents strictly that focused interface without background distraction.
- [x] **Render Deployment Architecture:**
  - [x] `render.yaml` Blueprint created for Web Service (Flask + Gunicorn) and Static Site (Vite + React).
  - [x] `gunicorn==22.0.0` configured in `requirements.txt`.
  - [x] Root `.env.example` and `backend/.env.example` updated with complete configuration documentation.
- [x] **Ultra-Lightweight Health Check & UptimeRobot Safety:**
  - [x] `GET /api/health` decoupled from database; returns instant `{ "status": "online", "provider": "OpenAI", "service": "Sundaram Prep API" }` without database queries or AI calls.
  - [x] UptimeRobot monitor documented specifically as `Sundaram Prep API Health` to preserve other monitors on user's account.
- [x] **Production Build & Bundle Optimization:**
  - [x] `vite.config.ts` configured with `rollupOptions.manualChunks` code splitting (`vendor-react`, `vendor-charts`, `vendor-icons`, `vendor-core`).
  - [x] Application bundle size reduced to 179 kB (32 kB gzip).
  - [x] Zero TypeScript errors, zero lint warnings.
- [x] **Verification & Test Status:**
  - [x] All 4 test suites passing 100% (`test_api.py`, `test_auth_flow.py`, `test_pdf_engine.py`, `test_learning_experience.py`).

### Phase 8: Full Universal Responsive Architecture & UPSC Tablet Prioritization
- [x] **Mobile-First & 11–12" UPSC Tablet Prioritization:**
  - [x] Tested and verified fluid responsive layouts across 320px, 360px, 375px, 390px, 414px, 430px, 600px, 768px, 800px, 820px, 834px, 1024px, 1180px, 1280px, 1366px, 1440px, 1536px, 1920px+.
  - [x] 11–12" tablet portrait and landscape support: spacious reading width, 2-column cards, side-by-side metadata and question navigator drawer.
- [x] **Focus Mode Distraction-Free Isolation:**
  - [x] Strict suppression of Header, secondary desktop navigation, and bottom navigation during active `FOCUS_TEST` simulation.
  - [x] Dedicated obsidian proctor bar with timer, focus score, 3-strike violation tracker, and essential controls.
- [x] **Fluid Typography & CSS Tokens:**
  - [x] Dynamic `clamp()` tokens for headings (`text-fluid-h1`, `text-fluid-h2`), body text (`text-fluid-body`), and question stems (`text-fluid-q`).
  - [x] Safe area insets (`pb-safe`, `pt-safe`, `pl-safe`, `pr-safe`) for iPhone notches, dynamic islands, and home indicator bars.
  - [x] Accessible touch targets with min 44px–48px height across all navigation, buttons, and form inputs.
- [x] **Mobile Safe Modals:**
  - [x] Responsive bottom sheets for `AuthModal`, `AITutorModal`, and `PDFStudio` edit/report dialogs on mobile phones (<640px) with `max-h-[90dvh]` and safe keyboard handling.
- [x] **Root Anti-Overflow Guarantee:**
  - [x] Global `overflow-x: hidden; max-width: 100vw;` safeguards on `html, body`.
  - [x] Zero accidental page-level horizontal overflow. Browser zoom preserved (`viewport-fit=cover`).
- [x] **Production Build Validation:**
  - [x] Vite 8 production build compiles in ~1.09s with 0 errors and 0 warnings.

---

## 2. VERIFIED FUNCTIONALITY
- **Neon Data Protection:** Zero unnecessary database calls; no table scans on home visits; condensed payloads for AI coach; lightweight health check never wakes Neon compute.
- **Mistake Engine:** Automatic error logging, repeat counts, accuracy tracking, and 1-click mistake practice.
- **Many-to-Many Exam Model:** Questions map across multiple exams via `question_exams`.
- **Alembic Version Control:** Schema managed declaratively with clean upgrade pathways.
- **Production Authentication:** Cryptographic OTP via Resend, HTTP-only cookies, 4-step onboarding, and multi-tenant resource isolation.
- **PDF Intelligence Pipeline:** End-to-end extraction, Hindi/English parsing, diagram support, dual-path answer resolution, duplicate detection, draft approval, and AI cost control.
- **Student Learning Experience:** Complete 5-mode arena, proctored focus violation engine, results scorecard, post-test AI coach, in-question AI tutor, daily current affairs capsule, smart revision sets, and configurable 4-pillar analytics.
- **Production Polish:** Light/Dark/System theme system, universal tablet & mobile ergonomics, skeletons, empty states, human-friendly error states, Render deployment blueprint, and UptimeRobot configuration.
- **Responsive Multi-Device Engineering:** Fluid clamp typography, 11–12" UPSC tablet optimization (portrait and landscape), mobile bottom sheets, Focus Mode proctor isolation, safe area insets, and zero horizontal scroll.





