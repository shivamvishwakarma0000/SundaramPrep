# SUNDARAM PREP — PROJECT BRAIN (Long-Term Memory & Architectural Standard)

**Project Name:** SUNDARAM PREP  
**Tagline:** Practice. Focus. Improve.  
**Platform Classification:** Mobile-first, high-performance competitive exam preparation platform for UPSC CSE, SSC CGL, Banking (IBPS/SBI PO), Railway (RRB), State PSCs, and allied examinations.  
**Version:** 1.0.0-alpha  
**Last Updated:** September 2026  

---

## 1. PRODUCT VISION & PEDAGOGICAL PHILOSOPHY

Sundaram Prep is **not** a generic quiz application. It is an intelligent exam readiness operating system engineered to eliminate cognitive overload for aspirants preparing for India's toughest competitive exams.

### 1.1 The Core Learning Loop
The system operates strictly on a closed feedback loop:
```
PDF / Current Affairs
        ↓
  Question Bank (Structured, Verified Metadata)
        ↓
    Practice (Untimed, Instant Pedagogical Feedback)
        ↓
   Focus Test (Exam-Simulated, Negative Marking, Timed)
        ↓
     Results (Sectional Breakdown, Speed & Accuracy)
        ↓
    Analytics (Topic Mastery & Trend Lines)
        ↓
Weak Topic Detection (Algorithmic Identification of Blindspots)
        ↓
   AI Revision (Sundaram AI Micro-Drills & Memory Tricks)
        ↓
   Improvement (Measurable Score Delta in Target Exams)
```

### 1.2 UX Principles
- **Clarity Over Clutter:** The UI must feel calm, focused, and purposeful. No flashing banners, noisy badges, or overwhelming dashboards.
- **Mobile-First Ergonomics:** 80%+ of Indian aspirants practice on smartphones. Primary tap targets, navigation bars, bottom sheets, and timers are optimized for thumb-zone usability.
- **Instant Structured Feedback:** When a student attempts a question, explanations are structured into four distinct mental buckets:
  1. **Direct Answer:** The concise, definitive choice.
  2. **The "Why":** The core conceptual mechanism.
  3. **Quick Fact:** High-yield exam trivia directly linked to the question.
  4. **Memory Trick (Mnemonics):** High-retention mnemonics in Hindi/English/Hinglish.

---

## 2. DESIGN SYSTEM & VISUAL IDENTITY

### 2.1 Brand Color Palette
- **Primary:** Deep Indigo (`#1E1B4B`, `#312E81`, `#3730A3`) & Royal Blue (`#2563EB`, `#1D4ED8`)
- **Accent:** Soft Violet (`#7C3AED`, `#8B5CF6`)
- **Neutral Background:** Very Light Cool Gray (`#F8FAFC`, `#F1F5F9`)
- **Surface Cards:** Pure White (`#FFFFFF`) with subtle border lines (`#E2E8F0`) and soft ambient shadows (`0 4px 20px -2px rgba(30, 27, 75, 0.05)`).
- **Semantic Colors:**
  - **Correct / Mastery:** Emerald Green (`#16A34A` / `#DCFCE7`)
  - **Warning / Review:** Warm Amber (`#D97706` / `#FEF3C7`)
  - **Incorrect / Penalty:** Crimson Red (`#DC2626` / `#FEE2E2`)
  - **Sundaram AI Companion:** Soft Electric Violet (`#7C3AED` / `#EDE9FE`)

### 2.2 Typography
- Headings & Numbers: Outfit / Plus Jakarta Sans (Clean, modern geometry).
- Body & Questions: Inter (High legibility at 14px–16px across varied Indian scripts).
- Mathematical & Scientific Symbols: LaTeX compatible notation.

---

## 3. STRUCTURED QUESTION OBJECT SPECIFICATION

Every question in the database satisfies the following strict schema:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID / String | Unique question identifier |
| `question_text` | Text | Full question stem (bilingual supported) |
| `options` | JSON Array | Options list: `[{"id": "A", "text": "..."}, ...]` |
| `correct_answer` | String | Correct option key (`A`, `B`, `C`, `D`) |
| `explanation` | Text / JSON | Structured explanation (`answer`, `why`, `quick_fact`, `memory_trick`) |
| `subject` | String | High-level discipline (e.g., *Indian Polity*, *Modern History*, *Quantitative Aptitude*) |
| `topic` | String | Topic (e.g., *Fundamental Rights*, *Preamble*, *Percentages*) |
| `subtopic` | String | Subtopic (e.g., *Article 21 & Privacy*, *Writ Jurisdiction*) |
| `exam` | String | Target exam (`UPSC_CSE`, `SSC_CGL`, `BANK_PO`, `RAILWAY_RRB`, `STATE_PSC`) |
| `difficulty` | Enum | `EASY`, `MEDIUM`, `HARD` |
| `question_type` | Enum | `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `ASSERTION_REASON`, `MATCH_FOLLOWING` |
| `source_type` | Enum | `PYQ`, `PDF_EXTRACTED`, `AI_GENERATED`, `CURRENT_AFFAIRS`, `COMMUNITY` |
| `source_document_id` | UUID / Null | Link to parent PDF document if extracted |
| `source_reference` | String | Exact citation (e.g., *"UPSC CSE Prelims 2023 Paper I, Q.42"*) |
| `answer_status` | Enum | `VERIFIED`, `AI_VERIFIED`, `SOURCE_VERIFIED`, `NEEDS_REVIEW`, `UNVERIFIED` |
| `answer_confidence`| Float (0-1) | AI verification confidence metric |
| `is_verified` | Boolean | True if confirmed by official key or verified high-confidence AI reasoning |
| `language` | Enum | `EN`, `HI`, `BILINGUAL` |
| `image_url` | String / Null | Diagram, map, or formula image asset URL |
| `created_at` | Timestamp | Record creation timestamp |
| `updated_at` | Timestamp | Record update timestamp |

> [!IMPORTANT]
> **Source Type Integrity Rule:** Under no circumstances should AI-generated questions be tagged as `PYQ`. PyQ questions must reference an authoritative exam year and paper.

---

## 4. PDF INTELLIGENCE ENGINE & QUESTION STUDIO

The PDF Intelligence module converts unformatted, multi-column, bilingual exam papers into structured question banks with zero raw PDF bloat in the relational database.

### 4.1 Ingestion & Multi-Format Ingestion Specifications
1. **Multi-Format Support:**
   - Text PDFs (standard digital documents).
   - Scanned / rasterized PDFs: Automatically triggers OCR fallback (PyMuPDF image extraction / Tesseract OCR / vision parsing).
   - Multi-column exam layouts: Multi-column reading order reconstruction.
   - Image-heavy PDFs containing diagrams, maps, or charts: Visual bounding box extraction linking diagrams to `question_image_url`.
2. **Multi-Lingual Support:**
   - Pure English, Pure Hindi (हिंदी), and mixed bilingual layouts.
   - Devanagari numerals detection (`१.`, `२.`, `३.` / `प्रश्न १.`, `प्र. २`).
   - Hindi option key normalization:
     - `(क)` / `क.` -> `A`
     - `(ख)` / `ख.` -> `B`
     - `(ग)` / `ग.` -> `C`
     - `(घ)` / `घ.` -> `D`
3. **Safe Storage & Validation:**
   - Strict validation: Allowed file extensions (`.pdf`, `.txt`), file size cap (max 16 MB), page count limits.
   - **PostgreSQL Bloat Prevention:** Large binaries are **never** stored inside PostgreSQL. Files are stored on external object storage / filesystem; the `documents` table stores only the URL, file path, SHA-256 hash, and metadata.

### 4.2 End-to-End Processing Pipeline
```
UPLOAD
  ↓
VALIDATE (File type, size < 16MB, page limit, ownership)
  ↓
STORE (Object Storage / Local Disk, SHA-256 Hash computation)
  ↓
EXTRACT TEXT (Multi-column text layout reconstruction)
  ↓
OCR IF REQUIRED (Fallback on low-text or scanned pages)
  ↓
DETECT QUESTIONS (Regex & linguistic heuristics across EN & HI)
  ↓
DETECT OPTIONS (A/B/C/D & क/ख/ग/घ normalization)
  ↓
DETECT ANSWERS (Case A explicit answer key parser)
  ↓
CLASSIFY (Subject, topic, difficulty heuristics)
  ↓
VERIFY (Case B AI reasoning verification if unkeyed)
  ↓
STRUCTURE (Generate structured explanation: Why, Quick Fact, Memory Trick)
  ↓
DUPLICATE CHECK (Token set similarity against Question Bank)
  ↓
REVIEW (Draft Studio: Detected · Ready · Need Review · Duplicate)
  ↓
QUESTION BANK (Approved canonical Question records)
```

### 4.3 Dual-Path Answer Resolution Engine
- **Case A: Explicit Answer Key Present:**
  - Extracts answer from inline hints (e.g. `[Ans: B]`, `उत्तर: (ख)`) or trailing answer keys.
  - Normalizes to canonical `A`, `B`, `C`, `D`.
  - Sets `verification_source = "PDF_KEY"`, `answer_confidence = 1.0`, `answer_status = "PDF_VERIFIED"`.
- **Case B: No Answer Key Present:**
  - AI reasoning model analyzes stem and options.
  - Grounded in authoritative standard sources (Indian Constitution, Economic Survey, PIB, NCERT).
  - Confidence scoring (0.0 to 1.0):
    - **Confidence >= 0.85:** `answer_status = "AI_VERIFIED"`, `is_verified = True`.
    - **Confidence < 0.85:** `answer_status = "NEEDS_REVIEW"`, flagged with verification notes explaining ambiguity.
- **Pedagogical Explanation Constraint:**
  - Explanations are strictly structured into:
    - **Why:** 2–3 sentences detailing the constitutional or logical mechanism.
    - **Quick Fact:** 1 high-yield, exam-relevant nugget.
    - **Memory Trick:** Mnemonic or memory peg for instant recall.
  - Fluffy 500-word essays are strictly rejected.

### 4.4 Duplicate Question Detection Engine
- Normalizes question stems: converts to lowercase, removes punctuation, eliminates common question stems (e.g., *"consider the following statements"*, *"which of the following"*).
- Computes token set Jaccard similarity against existing questions in the Question Bank.
- If similarity score >= 0.82:
  - Sets `is_duplicate = True`.
  - Links `duplicate_of_question_id`.
  - Draft is excluded from one-click batch approval to prevent database pollution.

### 4.5 AI Cost Control & Deduplication
- Computes SHA-256 hash (`file_hash`) of every uploaded document.
- Before triggering heavy extraction and LLM calls, checks if the document hash was already processed for the student.
- Reuses existing drafts and metadata if an identical document is re-uploaded, reducing token waste and redundant compute.

### 4.6 AI Question Synthesis (Similar & Revision)
- Students can generate `SIMILAR` or `REVISION` practice questions directly from document concepts.
- **Integrity Rule:** Synthesized questions are strictly stamped with `source_type = "AI_GENERATED"`. Under no circumstances are they labeled as `PYQ`.

### 4.7 Question Error Reporting
- Students can report discrepancies via `POST /api/student/reports`.
- Categorized reasons: `WRONG_ANSWER`, `WRONG_EXPLANATION`, `DUPLICATE`, `INCOMPLETE`, `OUTDATED`, `FORMATTING_ISSUE`.
- Logs into `reports` table for administrative review and audit.

---

## 5. SUNDARAM AI ASSISTANT SPECIFICATION

**Name:** Sundaram AI  
**Role:** Dedicated, empathetic, high-rigor competitive exam tutor.

### 5.1 Persona & Response Framework
- **Concise by Default:** No unnecessary pleasantries or 500-word essays.
- **Structure:**
  - **Answer:** Direct, clear verdict.
  - **Why:** 2–3 sentences on the core mechanism.
  - **Quick Fact:** 1 high-yield takeaway.
  - **Memory Trick:** Mnemonic or memory peg.
- **Linguistic Adaptability:**
  - English
  - Pure Hindi (हिंदी)
  - Hinglish (Roman Hindi conversational explanation)
- **Current Affairs Grounding:**
  - For current affairs or evolving legal/economic facts (e.g., latest Supreme Court rulings, budget allocations, summits), queries route through a web-search/source retrieval layer.
  - Sources and reference links are preserved in response metadata.

### 5.2 Model Tiers
- **Reasoning Tier:** For complex reasoning, controversial UPSC Prelims questions, assertion-reason logic, and PDF verification.
- **Fast Tier:** For conversational doubts, Hinglish rephrasing, mnemonics, and quiz generation.

---

## 6. SYSTEM & DATABASE ARCHITECTURE (NEON POSTGRESQL)

```
┌────────────────────────────────────────────────────────┐
│                   React + Vite + PWA                   │
│             (Mobile-First Tailwind CSS)                │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / JWT
                            ▼
┌────────────────────────────────────────────────────────┐
│               Flask REST API + Alembic                 │
│            (Gunicorn / Render Deployment)              │
│                                                        │
│  ├── /api/student       (Home, Practice Hub, Mistakes)│
│  ├── /api/auth          (JWT Auth, Profile)           │
│  ├── /api/questions     (Question Bank, Filters)       │
│  ├── /api/practice      (Practice & Focus Tests)       │
│  ├── /api/ai/assistant  (Sundaram AI Tutor)            │
│  └── /api/pdf           (PDF Intelligence Pipeline)    │
└────────────┬──────────────┬──────────────┬─────────────┘
             │              │              │
             ▼              ▼              ▼
     Neon PostgreSQL      OpenAI         Resend
  (Alembic Migrations) Responses API    (Email API)
```

### 6.1 Core Relational Schema (28+ Normalized Tables)
The database operates on **Neon PostgreSQL** managed via **Flask-Migrate (Alembic)**. Application startup never blindly recreates tables.

1. **Curriculum & Examinations:**
   - `exams`: Normalized exam definitions (`id`, `code`, `title`, `description`, `category`, `icon_url`, `is_active`).
   - `subjects`: Discipline taxonomy (`id`, `name`, `code`, `description`, `icon_url`).
   - `topics`: Syllabus topics (`id`, `subject_id`, `name`, `importance_weight`).
   - `subtopics`: Granular subtopics (`id`, `topic_id`, `name`).
2. **Users & Profiles:**
   - `users`: Core identity (`id`, `name`, `email`, `email_verified`, `password_hash`, `target_exam`, `language`, `avatar`, `daily_goal`, `timezone`, `status`, `last_login_at`).
   - `user_profiles`: Extended profile (`phone_number`, `bio`, `college_or_institute`, `state`, `preferred_exam_categories`).
   - `daily_goals`: Daily target progress tracking (`target_questions`, `target_study_minutes`, `solved_today`, `date`, `is_achieved`).
   - `streaks`: Continuous study habit engine (`current_streak`, `longest_streak`, `last_active_date`).
3. **Question Architecture:**
   - `questions`: Question stem, structured explanation, subject_id, topic_id, difficulty, verification status, confidence.
   - `question_options`: Normalized option choices (`question_id`, `option_key`, `option_text`, `is_correct`).
   - `question_exams`: **Many-to-Many relationship table** (`question_id`, `exam_id`, `is_primary`) allowing questions to belong to multiple exams (e.g. UPSC CSE and State PSC).
   - `question_sources`: Sourcing citations (`reference_citation`, `exam_year`, `paper_number`).
   - `answer_verifications`: Verification log (`verified_by_model`, `verification_status`, `confidence_score`, `reasoning_summary`).
   - `question_sets`: Bundled mock test series and full year papers.
4. **Sessions, Attempts & The Mistake Engine:**
   - `test_sessions`: Practice and focus test executions (`session_type`, `exam_id`, `score`, `accuracy`, `time_spent_seconds`, `status`).
   - `test_questions`: Question sequence inside a session (`session_id`, `question_id`, `order_index`).
   - `test_answers`: User attempts (`selected_option`, `correct`, `time_taken`, `confidence_level`).
   - `mistakes`: **Automated Mistake Engine**. Tracks `first_mistake_at`, `last_mistake_at`, `attempt_count`, `repeated_mistakes_count`, `accuracy`, `is_resolved` without duplicating question rows.
   - `bookmarks`: Saved high-yield items with custom aspirant notes.
   - `focus_events`: Proctored integrity tracking (`event_type`: TAB_BLUR, FULLSCREEN_EXIT, TIMEOUT).
   - `user_topic_stats`: Cached topic-level mastery index for instantaneous analytics without scanning attempt history.
5. **PDF Intelligence & Documents:**
   - `documents`: Uploaded exam papers (`file_name`, `file_path`, `status`, `page_count`).
   - `document_processing_jobs`: Background ingestion job records (`extracted_count`, `error_log`).
   - `pdf_question_drafts`: Extracted drafts awaiting candidate approval or automated AI key resolution.
6. **Engagement & AI:**
   - `notifications`: Push/in-app notices (`title`, `message`, `type`, `is_read`).
   - `achievements`: Gamified milestone badges.
   - `reports`: Question error reports submitted by students.
   - `admin_actions`: Audit trail for content and syllabus modifications.
   - `ai_conversations` & `ai_messages`: Persisted Sundaram AI tutor interactions.
   - `ai_usage_logs`: Token consumption and tier tracking.

### 6.2 Indexing Strategy for Frequent Queries
- `idx_questions_exam_subject_diff`: Fast compound filtering on `(exam, subject, difficulty)`.
- `idx_questions_topic_verified`: Rapid retrieval for topic-wise practice `(topic_id, is_verified)`.
- `idx_test_answers_user_correct`: Real-time user accuracy aggregation `(user_id, correct)`.
- `idx_mistakes_user_resolved`: Instant mistake notebook loading `(user_id, is_resolved)`.
- `uq_user_daily_goal_date`: Unique constraint ensuring single daily goal record per user per calendar day.

### 6.3 Neon Data Transfer Protection Rules (Section 8)
To maintain peak latency and prevent wasteful bandwidth consumption:
1. **Never load full question banks on dashboards:** The Home screen calls `/api/student/home`, transferring < 2KB of aggregated data.
2. **Strict Pagination:** Question feeds, mistakes, and bookmarks default to `limit=10` or `limit=20` with offset/page parameters.
3. **Selective Projection:** Endpoints request only required columns rather than `SELECT *`.
4. **Single-Feature UI Principle:** When the student opens a feature (e.g., Mistakes Notebook or Geography Practice), the UI loads and displays ONLY that feature, eliminating simultaneous dashboard or analytics queries.

### 6.1 Security Invariants
- **Zero Frontend Secrets:** No API keys (`OPENAI_API_KEY`, `DATABASE_URL`, `RESEND_API_KEY`, `JWT_SECRET_KEY`) ever touch client bundles.
- **Database Connection:** Neon PostgreSQL connected via SSL (`sslmode=require`).
- **Standard Envelope:**
  ```json
  {
    "success": true,
    "data": { ... },
    "error": null,
    "meta": { "timestamp": "...", "version": "1.0.0" }
  }
  ```

---

## 7. PRODUCTION AUTHENTICATION & SECURITY ARCHITECTURE

### 7.1 Multi-Step Aspirant Onboarding Flow
Registration avoids long, overwhelming forms by adhering to a 4-step progressive onboarding model:
1. **01 Account:** Collects Full Name, Primary Email, Password (min. 6 characters), and Target Exam (`UPSC_CSE`, `SSC_CGL`, `BANK_PO`, `RAILWAY_RRB`, `STATE_PSC`). Creates user record in `PENDING` state with `email_verified = False`.
2. **02 Verify Email:** Collects 6-digit verification code dispatched via Resend. Checks cryptographic salted hash, validates within 10-minute expiry window, enforces max 5 failed attempt limits. Upon success, marks `email_verified = True`, sets status to `ACTIVE`, and establishes authenticated session.
3. **03 Personalize:** Sets daily question goals (15, 30, 50 MCQs), study language (`EN` / `HI`), and optional state/college profile metadata.
4. **04 Dashboard:** Directs student into personalized learning loop.

### 7.2 OTP Engine & Security Specifications
- **Generation:** Cryptographically secure 6-digit random generation using Python `secrets`.
- **Zero Raw Storage:** Plaintext OTPs are **never** stored in the database. Only salted SHA-256 hashes (`SHA256(SECRET_KEY:email:otp:PURPOSE)`) are persisted in `email_verification_otps`.
- **Single-Use Enforcement:** Successful verification stamps `used_at = datetime.utcnow()`. Replay attempts fail immediately.
- **Previous OTP Invalidation:** Generating a new OTP marks all previous unused codes for that email and purpose as expired.
- **Expiration Window:** Hard expiration at 10 minutes (`expires_at = created_at + 10m`).
- **30-Second Spam Cooldown:** Requests within 30 seconds of issuance are rejected with HTTP 429 (`RESEND_COOLDOWN`).
- **Brute-Force Lockout:** Tracks `attempt_count`. Locks the verification record after 5 failed attempts, preventing automated guessing.
- **Hourly Rate Limiting:** Enforces a maximum of 10 OTP dispatches per hour per email/IP.

### 7.3 Email Change & Password Recovery Guardrails
- **Email Change Security:** If an active student updates their email address, their **old email remains trusted and active** until the new email address receives and successfully confirms an OTP.
- **Forgot Password Flow:** Dispatches 6-digit OTP to the registered email without leaking account existence. The password is only updated after cryptographic OTP verification. Plaintext passwords are never accepted or transmitted in cleartext.

### 7.4 Session Security & HTTP-Only Cookies
- Primary session token is stored in a secure **HTTP-Only cookie** (`access_token`):
  - `httponly=True` (impenetrable to XSS script access)
  - `samesite='Lax'` (mitigates CSRF vulnerabilities)
  - `secure=True` in production environments
  - `max_age=7 days`
- Authorization middleware (`token_required`) seamlessly verifies sessions from either the HTTP-Only cookie or the `Authorization: Bearer <token>` header for cross-platform versatility.

### 7.5 Multi-Tenant Student Data Isolation
Strict resource ownership enforcement ensures Student A can never access Student B's:
- Uploaded PDFs or extracted drafts (`/api/pdf/documents/<id>/drafts`)
- Test sessions, answers, or scores (`/api/student/quick-10`, `/api/student/home`)
- Mistakes Notebook items (`/api/student/mistakes`)
- Bookmarks and personal study notes (`/api/student/bookmarks`)
- Topic stats, weakness scores, or AI study conversations

---

## 8. ENVIRONMENT & SENDER CONFIGURATION

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Backend Only | Neon PostgreSQL connection string (`postgresql://...`) |
| `SECRET_KEY` | Backend Only | Application secret key for CSRF and cryptographic salts |
| `JWT_SECRET_KEY` | Backend Only | Secret key for HS256 JWT signing |
| `RESEND_API_KEY` | Backend Only | Resend API key for verified transactional email dispatch |
| `MAIL_FROM` | Backend Only | Verified sender address (e.g. `Sundaram Prep <no-reply@sundaramprep.com>`) |
| `COOKIE_SECURE` | Backend Only | Set to `true` in production to enforce HTTPS-only cookies |
| `OPENAI_API_KEY` | Backend Only | OpenAI API Key for reasoning models |
| `FRONTEND_URL` | Backend Only | Allowed CORS origin (e.g. `https://sundaram-prep.onrender.com`) |

---

## 9. RENDER DEPLOYMENT SPECIFICATION

- **Backend:** Python 3 Web Service (`gunicorn "app:create_app()" -b 0.0.0.0:$PORT`)
- **Frontend:** Static Site (`npm run build` -> output dir `dist`)

---

## 10. COMPLETE STUDENT LEARNING EXPERIENCE & PRACTICE ENGINE

### 10.1 The 5 Pedagogical Practice Modes
1. **Learn Mode (Intuition & Concept Building):**
   - Untimed, zero penalty, instant feedback on tap.
   - Expanding card shows Correct/Incorrect, Correct key, The "Why", Quick Fact, and Memory Trick.
   - Direct in-question buttons: `[Ask AI]`, `[Bookmark]`, `[Next]`.
2. **Practice Mode (Structured Syllabus Drills):**
   - Optional timer toggle, question navigator drawer/grid, skips, bookmarking, and pause/resume capability.
   - Saves meaningful progress events on answer submission (not on every UI repaint).
3. **Focus Mode (Proctored Simulation & Discipline Index):**
   - 100 questions / 100 minutes (or configurable).
   - Requires fullscreen mode. One question at a time. Answers locked once submitted.
   - **No mid-test explanations** to preserve true exam conditions.
   - **Focus Violation Engine:** Browser listeners monitor `visibilitychange` (tab switches/minimized), `fullscreenchange` (exiting fullscreen), and `blur` (window focus loss).
   - **3-Strike Warning System:**
     - 1st Violation: Warning 1/3
     - 2nd Violation: Warning 2/3
     - 3rd Violation: Immediate auto-termination and submission (`TERMINATED_VIOLATION`).
   - **Focus Score (Discipline Index):** Starts at 100.0, reduces by 20 points per violation down to 0.0. **Focus violations NEVER deduct exam marks** — the Focus Score is tracked and evaluated as a distinct discipline metric.
   - **Terminology Invariant:** Strictly titled **"FOCUS VIOLATIONS"**. Never claim that browser monitoring proves cheating.
4. **Quick 10 Blitz:**
   - 10-question high-energy sprint under 10 minutes.
   - Composes questions from recent mistakes, weak syllabus topics, and current affairs.
5. **Mock Test:**
   - Full simulated exam paper with sectional breakdown and standard negative marking ($-0.66$ penalty on $2$-mark items).

### 10.2 Post-Test AI Coach & Question-Level AI Tutor
- **AI Coach (Post-Test Cognitive Synthesis):**
  - Receives strictly **condensed metrics** (accuracy delta, time per question, strong/weak subjects, focus score) — never sends raw database rows or full question lists.
  - Generates:
    - *What Improved*
    - *Biggest Weakness*
    - *What to Practice Next*
    - *Daily Prescription* (e.g., *"Today's recommendation: 10 Geography, 10 previous mistakes, 5 Current Affairs"*).
- **AI Tutor (In-Question Assistance):**
  - Triggerable on any question with 7 contextual actions:
    1. `EXPLAIN_SIMPLY`: 2 plain sentences for intuitive understanding.
    2. `WHY_WRONG`: Diagnostic feedback explaining the specific distractor trap vs correct option.
    3. `EXPLAIN_HINDI`: Pure Devanagari Hindi explanation.
    4. `EXPLAIN_HINGLISH`: Conversational Roman Hindi explanation.
    5. `MEMORY_TRICK`: High-retention mnemonic or memory peg.
    6. `SIMILAR_QUESTION`: Synthesizes a parallel question on the identical concept.
    7. `DETAILED_EXPLANATION`: Comprehensive statutory/constitutional grounding.

### 10.3 Mistake Notebook & Smart Revision Engine
- **Mistake Engine:**
  - Automatically records incorrect responses in `mistakes` table.
  - Tracks `first_mistake_at`, `last_mistake_at`, `attempt_count`, `repeated_mistakes_count`, and historical accuracy.
  - Questions are automatically resolved (`is_resolved = True`) once mastered across 2 successive sessions.
  - 1-Click *"Practice My Mistakes"* session generator.
- **Smart Revision Engine:**
  - Synthesizes balanced daily revision sets:
    - 50% Unresolved/Repeated Mistakes
    - 30% Weak Syllabus Topics ($\text{weakness score} \ge 0.50$)
    - 20% Daily Current Affairs MCQs

### 10.4 Daily Current Affairs Engine
- Stored in `daily_current_affairs` table: `date`, `title`, `summary`, `topic`, `source`, `source_reference`, `exam_relevance`, `key_takeaways`, `question_ids`.
- Sourced and verified from authoritative bodies: The Hindu, Indian Express, PIB, Economic Survey, Union Budget. Never relies solely on LLM pre-training memory.

### 10.5 4-Metric Diagnostic Analytics & Thresholds
- **4 Core Metrics:**
  1. **Accuracy (%):** Overall test accuracy with negative marking factor.
  2. **Speed (s/Q):** Average response time compared against ideal Prelims pacing.
  3. **Consistency (%):** Active study ratio across 14-day rolling window.
  4. **Coverage (%):** Proportion of syllabus modules attempted.
- **Configurable Mastery Thresholds:**
  - Weak: $<50\%$
  - Improving: $50$–$70\%$
  - Strong: $>70\%$
  - Aspirants can adjust thresholds dynamically in the UI to match personal target rigor.
- **Performance Rule (Section 18):** Charts are used sparingly (only subject performance bar chart and weekly activity sparklines) to avoid visual noise and cognitive overload.

### 10.6 Daily Goals, Streaks & Personal Bests
- **Daily Goals:** Quick selector for $20$, $50$, or $100$ questions/day with a subtle circular progress gauge.
- **Streaks:** Daily habit engine displaying 🔥 *X Day Streak*.
- **Personal Bests:** Detects and celebrates all-time records for:
  - Highest Score
  - Highest Accuracy
  - Longest Streak
  - Most Questions Solved in a Day

---

## 11. PRODUCTION POLISH, DEPLOYMENT & OBSERVABILITY

### 11.1 Brand & Visual Identity
- **Product Name:** SUNDARAM PREP
- **Tagline:** *Practice. Focus. Improve.*
- **Classification:** Premium competitive-exam preparation platform for UPSC, SSC, Banking, Railway, and State PSC aspirants.
- **Centralized Design Tokens:**
  - `primary`: Indigo family (`#4F46E5` / `var(--brand-primary)`)
  - `secondary`: Violet family (`#7C3AED` / `var(--brand-secondary)`)
  - `background`: `#F8FAFC` (Light) / `#0B0F19` (Dark)
  - `surface`: `#FFFFFF` (Light) / `#161E2E` & `#1E293B` (Dark)
  - `text`: `#172033` (Light) / `#F8FAFC` (Dark)
  - `muted`: `#64748B` (Light) / `#94A3B8` (Dark)
  - `semantic`: Success (`#16A34A`), Warning (`#F59E0B`), Error (`#DC2626`), AI (Indigo-to-Violet gradient).

### 11.2 Theme System (Light, Dark, System)
- Supported modes: `light`, `dark`, and `system` (matches OS `prefers-color-scheme`).
- Stored in `localStorage` under `sundaram_theme`.
- Theme context provides live switching across the entire component tree.
- Dark mode provides purpose-built dark theme tokens (no naive color inversion).
- All components adapt: cards, text, icons, inputs, modals, charts, skeletons, and progress gauges.

### 11.3 Universal Responsive Architecture & Tablet Optimization
- **Mobile-First Core:** Tap targets $\ge 44\text{px}$, bottom navigation bar with iOS safe area padding (`pb-safe`), thumb-friendly action buttons.
- **11–12" Tablet Optimization (Portrait & Landscape):**
  - UPSC aspirants frequently study on iPad / Galaxy Tab devices.
  - Tablet layouts feature 2-column balanced dashboards, side-by-side metrics, enlarged question stems, and comfortable drawer navigators.
  - Layouts tested and verified from 320px to 1920px without horizontal overflow.
- **Single-Focused Experience Rule:** When a student opens one feature (e.g. Focus Mode, Practice Arena, PDF Studio, AI Tutor), the screen presents strictly that focused interface without background clutter.

### 11.4 Empty, Loading, and Error State Philosophy
- **Loading:** Never use blank spinners. Reusable `SkeletonBox`, `CardSkeleton`, `QuestionSkeleton`, and `ChartSkeleton` ensure perceived performance.
- **Empty States:** Clear, positive, and actionable (e.g., *"No mistakes yet 🎉 Keep practicing. Your mistakes will appear here automatically"* with a direct *"Start Practice"* button).
- **Error States:** Human-friendly error messaging (`ErrorState`) with retry capabilities. Technical stack traces are logged exclusively to backend logs.

### 11.5 Database & Neon PostgreSQL Optimization
- **Protection Against Unnecessary Neon Compute Wakeups:**
  - The health check endpoint `GET /api/health` is strictly decoupled from the database. It returns immediate JSON status (`online`, `service`, `provider`) without running `SELECT 1` queries.
  - Dashboard queries leverage selective columns, aggregated stats, and indexed lookups (`user_id`, `is_resolved`, `exam`, `status`).
  - Strict pagination (`page`, `limit`) on questions, documents, and attempts.
  - No continuous background polling.

### 11.6 Render Deployment Architecture
- **Web Service (Backend):**
  - Runtime: Python (Flask + Gunicorn).
  - Configured in `render.yaml` with build command `pip install -r requirements.txt && flask db upgrade || true`.
  - Start command: `gunicorn "app:create_app()" --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120`.
  - Health check path: `/api/health`.
- **Static Site (Frontend):**
  - Built with Vite and React 19.
  - Configured with `rollupOptions.manualChunks` for code splitting (`vendor-react`, `vendor-charts`, `vendor-icons`, and application core).
  - Total production JS bundle is split into cached chunks with application code at only ~179 kB (32 kB gzip).
  - SPA fallback route rewrites all `/*` paths to `/index.html`.

### 11.7 UptimeRobot Configuration Guidelines
- **Account Safety:**
  - Do **NOT** create a new UptimeRobot account. Use existing account.
  - Do **NOT** modify, overwrite, or delete any existing monitors.
- **Monitor Settings:**
  - **Monitor Type:** HTTP(s) Monitor or Keyword/JSON API Monitor.
  - **Friendly Name:** `Sundaram Prep API Health` (unique identifier).
  - **URL to Monitor:** `https://YOUR-RENDER-BACKEND.onrender.com/api/health`
  - **Monitoring Interval:** 5 minutes (standard free/standard plan).
  - **Keyword / Status Check:** Validate `"status": "online"`.
  - **Alert Contacts:** Existing account notification email/SMS.
- **Why `/api/health` only?**
  - Pinging AI endpoints, PDF pipelines, or DB-heavy routes wastes compute and quota. The health route is ultra-lightweight and returns in $<5\text{ms}$.

### 11.8 Environment Variables Reference
Documented in `.env.example`:
| Variable | Target | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | Backend | Neon PostgreSQL connection string (`?sslmode=require`) |
| `SECRET_KEY` | Backend | Flask session encryption secret |
| `JWT_SECRET_KEY` | Backend | PyJWT authentication token encryption |
| `OPENAI_API_KEY` | Backend | OpenAI reasoning (`o3-mini`, `gpt-4o-mini`) |
| `OPENAI_REASONING_MODEL` | Backend | High-level reasoning model (default: `o3-mini`) |
| `OPENAI_FAST_MODEL` | Backend | Fast extraction model (default: `gpt-4o-mini`) |
| `RESEND_API_KEY` | Backend | Resend transactional email API key |
| `MAIL_FROM` | Backend | Sender email address (e.g. `Sundaram Prep <no-reply@sundaramprep.com>`) |
| `COOKIE_SECURE` | Backend | Enforce HTTPS-only secure cookies (`true` in production) |
| `COOKIE_SAMESITE` | Backend | Cookie SameSite policy (default: `Lax`) |
| `FRONTEND_URL` | Backend | Production frontend URL |
| `CORS_ORIGINS` | Backend | Comma-separated allowed origins for CORS |
| `VITE_API_BASE_URL` | Frontend | Base URL pointing to backend API `/api` |

### 11.9 Security Audit Summary
- **API Keys & Secrets:** Kept exclusively on backend in environment variables. Zero leakage to frontend bundles.
- **Authentication & Sessions:** Cryptographically random 6-digit OTPs hashed with bcrypt (`$2b$12$`), 10-minute expiry, 30s resend cooldown, 5-attempt brute-force lockout.
- **Multi-Tenant Protection:** Every document, mistake, draft, and attempt query enforces `user_id` ownership verification.
- **SQL Injection Prevention:** 100% parameterized SQLAlchemy ORM queries. Zero raw string interpolation.
- **XSS & CSRF:** Content-type restrictions, sanitized PDF uploads, secure HTTP-only cookies, and restricted CORS origins.
- **Error Sanitization:** Raw database exceptions and tracebacks are logged internally; frontend receives clean, non-revealing error payloads.


