# SUNDARAM PREP

> **Practice. Focus. Improve.**

A premium, mobile-first competitive-exam preparation platform built specifically for aspirants preparing for **UPSC CSE, SSC CGL, Banking (PO/Clerk), Railway (RRB), State PSCs**, and other competitive examinations.

---

## The Core Learning Loop

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

---

## Architectural Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts, PWA ready.
- **Backend:** Python 3, Flask, SQLAlchemy, Neon PostgreSQL (with SQLite zero-config local fallback), PyJWT, bcrypt.
- **AI Engine:** OpenAI Responses API (`services/ai_service.py`), dual-tier architecture (Reasoning model for verification & fast model for student tutor chat), structured 4-bucket explanations (*Answer, Why, Quick Fact, Memory Trick*), bilingual and Hinglish modes.
- **PDF Intelligence:** Multi-format PDF ingestion pipeline with automated answer resolution and confidence scoring.
- **Email:** Resend integration (`services/email_service.py`).
- **Deployment:** Render-ready (`Procfile`, `backend/requirements.txt`, Vite static build).

---

## Project Structure

```
Sundaram Prep/
├── docs/
│   ├── PROJECT_BRAIN.md      # Permanent long-term architectural brain
│   └── PROJECT_STATUS.md     # Milestones and live implementation tracker
├── backend/
│   ├── app/
│   │   ├── models/           # SQLAlchemy models (User, Question, QuizSession, PDFDocument)
│   │   ├── routes/           # REST endpoints (health, auth, questions, practice, ai_assistant, pdf)
│   │   ├── services/         # Centralized AI, PDF, and Email services
│   │   ├── utils/            # Standard JSON envelopes, JWT security, logging
│   │   ├── config.py         # Environment variables & DB settings
│   │   └── __init__.py       # Flask factory
│   ├── requirements.txt      # Python dependencies
│   ├── run.py                # Local development server entrypoint
│   ├── test_api.py           # Automated backend test suite
│   ├── seed_data.py          # High-yield UPSC/SSC/Banking sample questions
│   ├── Procfile              # Render backend deployment instruction
│   └── .env.example          # Environment variable template
└── frontend/
    ├── src/
    │   ├── api/              # Typed REST client with automatic token handling
    │   ├── components/       # Header, BottomNav, LearningLoopBanner
    │   ├── features/
    │   │   ├── dashboard/    # Student dashboard with loop, metrics, and alerts
    │   │   ├── practice/     # Practice & Focus Test arena
    │   │   ├── assistant/    # Sundaram AI study companion drawer
    │   │   ├── pdf/          # PDF Intelligence studio & approval pipeline
    │   │   ├── analytics/    # Recharts mastery charts & weak spot lists
    │   │   └── auth/         # Login, registration, 1-click demo login
    │   ├── types/            # TypeScript schemas (Question, Session, etc.)
    │   ├── App.tsx           # Main application shell
    │   └── index.css         # Tailwind tokens & typography
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.ts
```

---

## Quickstart (Local Development)

### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed_data.py
python run.py
```
Backend API will start at: `http://localhost:5001`  
Run tests anytime: `python test_api.py`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend application will start at: `http://localhost:5173`

---

## Key Design Principles
- **Concise by default:** AI explanations strictly follow **Answer, Why, Quick Fact, Memory Trick**.
- **Source integrity:** AI-generated questions are NEVER tagged as PYQs.
- **Zero frontend secrets:** All external APIs (OpenAI, Resend, Neon) are strictly proxied through Flask.
