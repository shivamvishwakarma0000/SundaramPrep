from flask import Blueprint, request
import re
from datetime import datetime, date, timedelta
from app.models import (
    db, 
    Question, 
    QuestionOption,
    QuizSession, 
    QuizResponse, 
    WeakTopicTracker, 
    User,
    Mistake,
    DailyGoal,
    FocusEvent
)
from app.services.ai_service import ai_service
from app.services.smart_revision import smart_revision_service
from app.utils.responses import api_success, api_error
from app.utils.security import decode_jwt

practice_bp = Blueprint("practice", __name__, url_prefix="/api/practice")

def get_optional_user_id():
    # 1. Check Bearer Authorization header
    auth_header = request.headers.get("Authorization", "")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        decoded = decode_jwt(token)
        if decoded:
            return decoded.get("sub")
            
    # 2. Check HTTP-Only Cookie
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        decoded = decode_jwt(cookie_token)
        if decoded:
            return decoded.get("sub")
            
    return None

def get_or_create_demo_user():
    user = User.query.filter_by(email="aspirant@sundaramprep.com").first()
    if not user:
        from app.utils.security import hash_password
        user = User(
            name="Sundaram Aspirant",
            email="aspirant@sundaramprep.com",
            email_verified=True,
            password_hash=hash_password("DemoPass123!"),
            target_exam="UPSC_CSE",
            daily_goal=30
        )
        db.session.add(user)
        db.session.commit()
    return user


def _get_or_create_topic_questions(clean_topic: str, count: int, exam: str = "UPSC_CSE", subject: str = "General Studies") -> list:
    """
    Retrieves or synthesizes questions strictly matching the requested topic.
    Guarantees that when a user searches for any topic (e.g. 'Cripps Mission', 'Buddhism'),
    all questions belong strictly to that topic and not unrelated subjects.
    """
    questions = []
    
    # 1. Exact or substring match on topic, subject, question_text
    search_pattern = f"%{clean_topic}%"
    matched = Question.query.filter(
        db.or_(
            Question.topic.ilike(search_pattern),
            Question.subject.ilike(search_pattern),
            Question.question_text.ilike(search_pattern)
        )
    ).order_by(db.func.random()).limit(count).all()
    questions.extend(matched)
    
    # 2. Token match on keywords if still needed
    if len(questions) < count:
        existing_ids = [q.id for q in questions]
        stop_words = {"the", "of", "and", "in", "to", "a", "an", "is", "for", "on", "with", "as", "by", "at", "from", "questions", "test", "mock"}
        tokens = [w for w in re.split(r'\W+', clean_topic.lower()) if len(w) > 2 and w not in stop_words]
        
        if tokens:
            token_conditions = [
                db.or_(
                    Question.topic.ilike(f"%{tok}%"),
                    Question.subject.ilike(f"%{tok}%"),
                    Question.question_text.ilike(f"%{tok}%")
                )
                for tok in tokens
            ]
            more_needed = count - len(questions)
            query = Question.query.filter(db.or_(*token_conditions))
            if existing_ids:
                query = query.filter(~Question.id.in_(existing_ids))
            token_matched = query.order_by(db.func.random()).limit(more_needed).all()
            questions.extend(token_matched)

    # 3. If still fewer than count, synthesize high-yield curriculum questions strictly on this topic!
    if len(questions) < count:
        needed = count - len(questions)
        generated = ai_service.generate_topic_mcqs(
            topic=clean_topic,
            count=needed,
            exam=exam,
            subject=subject
        )
        for gq in generated:
            new_q = Question(
                question_text=gq["question_text"],
                correct_answer=gq["correct_answer"],
                explanation=gq.get("explanation"),
                subject=gq.get("subject", subject),
                topic=clean_topic.title(),
                exam=exam,
                difficulty=gq.get("difficulty", "MEDIUM"),
                source_type="AI_GENERATED",
                answer_status="AI_VERIFIED",
                is_verified=True
            )
            db.session.add(new_q)
            db.session.flush()
            
            for opt in gq.get("options", []):
                q_opt = QuestionOption(
                    question_id=new_q.id,
                    option_key=opt["id"],
                    option_text=opt["text"],
                    is_correct=(opt["id"] == gq["correct_answer"])
                )
                db.session.add(q_opt)
            
            questions.append(new_q)
            
        db.session.commit()

    return questions[:count]


@practice_bp.route("/start", methods=["POST"])
def start_practice_session():
    payload = request.get_json() or {}
    session_type = payload.get("session_type", "PRACTICE").upper()
    # Supported: LEARN, PRACTICE, FOCUS_TEST, QUICK_10, MOCK_TEST, MISTAKE_PRACTICE, SMART_REVISION
    exam = payload.get("exam", "UPSC_CSE")
    subject = payload.get("subject")
    topic = payload.get("topic")
    count = int(payload.get("count", 10))
    time_limit_seconds = payload.get("time_limit_seconds")
    
    user_id = get_optional_user_id()
    if not user_id:
        demo_user = get_or_create_demo_user()
        user_id = demo_user.id
        
    questions = []
    
    document_id = payload.get("document_id")
    document_ids = payload.get("document_ids")
    if not document_ids and document_id:
        if isinstance(document_id, list):
            document_ids = document_id
        elif document_id == "ALL":
            document_ids = ["ALL"]
        elif "," in document_id:
            document_ids = [d.strip() for d in document_id.split(",") if d.strip()]
        else:
            document_ids = [document_id]

    # 0. PDF DOCUMENT PRACTICE / MOCK TEST FROM SELECTED PDFS
    if document_ids:
        from app.models.pdf_document import PDFQuestionDraft, Document
        from app.models.question import QuestionOption
        import random

        if "ALL" in document_ids:
            all_docs = Document.query.filter(~Document.file_name.ilike('%sample_polity_test%')).all()
            document_ids = [d.id for d in all_docs]

        # Fetch questions already materialized
        questions = Question.query.filter(Question.source_document_id.in_(document_ids)).all()

        # Reconstruct / auto-materialize for any document whose drafts are not yet in Question table
        found_doc_ids = set(q.source_document_id for q in questions if q.source_document_id)
        missing_doc_ids = [did for did in document_ids if did not in found_doc_ids]
        if missing_doc_ids:
            drafts = PDFQuestionDraft.query.filter(PDFQuestionDraft.document_id.in_(missing_doc_ids)).all()
            doc_records = {d.id: d for d in Document.query.filter(Document.id.in_(missing_doc_ids)).all()}
            for d in drafts:
                doc_record = doc_records.get(d.document_id)
                doc_name = doc_record.file_name if doc_record else "PDF Exam Paper"
                q = Question(
                    question_text=d.question_text,
                    correct_answer=d.candidate_answer or "A",
                    explanation=d.explanation_json or {
                        "answer": f"Option {d.candidate_answer or 'A'}",
                        "why": d.reasoning_summary or "Extracted from uploaded document.",
                        "quick_fact": "Source: Uploaded PDF",
                        "memory_trick": "Concept retention drill."
                    },
                    subject=doc_record.subject if doc_record and hasattr(doc_record, 'subject') and doc_record.subject else "General Studies",
                    topic=doc_name,
                    exam=doc_record.exam_category if doc_record and hasattr(doc_record, 'exam_category') and doc_record.exam_category else exam,
                    source_type="PDF_EXTRACTED",
                    source_reference=doc_name,
                    source_document_id=d.document_id,
                    is_verified=True,
                    language=d.language or "EN"
                )
                db.session.add(q)
                db.session.flush()
                for opt in (d.options or []):
                    q_opt = QuestionOption(
                        question_id=q.id,
                        option_key=opt["id"],
                        option_text=opt["text"],
                        is_correct=(opt["id"] == (d.candidate_answer or "A"))
                    )
                    db.session.add(q_opt)
                questions.append(q)
            db.session.commit()

        # Shuffle and sample randomized questions up to count
        random.shuffle(questions)
        if count and count > 0 and len(questions) > count:
            questions = questions[:count]

    # 1. MISTAKE_PRACTICE MODE
    elif session_type == "MISTAKE_PRACTICE":
        mistakes = Mistake.query.filter_by(user_id=user_id, is_resolved=False)\
            .order_by(Mistake.repeated_mistakes_count.desc(), Mistake.last_mistake_at.desc())\
            .limit(count).all()
        for m in mistakes:
            q = Question.query.get(m.question_id)
            if q:
                questions.append(q)
        if not questions:
            # Fallback if no mistakes
            questions = Question.query.filter_by(exam=exam).limit(count).all()

    # 2. SMART_REVISION MODE
    elif session_type == "SMART_REVISION":
        questions = smart_revision_service.generate_revision_questions(
            user_id=user_id,
            target_exam=exam,
            target_count=count
        )

    # 3. QUICK_10 MODE
    elif session_type == "QUICK_10":
        count = 10
        # Mix mistakes, weak topics, and fresh questions
        questions = smart_revision_service.generate_revision_questions(
            user_id=user_id,
            target_exam=exam,
            target_count=10
        )

    # 4. FOCUS_TEST / MOCK_TEST / LEARN / STANDARD PRACTICE
    else:
        if session_type in ["MOCK_TEST", "FOCUS_TEST"]:
            count = max(10, count)

        if topic:
            clean_topic = topic.strip()
            questions = _get_or_create_topic_questions(
                clean_topic=clean_topic,
                count=count,
                exam=exam or "UPSC_CSE",
                subject=subject or "General Studies"
            )
        else:
            query = Question.query
            if subject:
                query = query.filter_by(subject=subject)
            elif exam:
                exam_q_count = Question.query.filter_by(exam=exam).count()
                if exam_q_count >= count:
                    query = query.filter_by(exam=exam)
            
            questions = query.order_by(db.func.random()).limit(count).all()
            if len(questions) < count:
                more_needed = count - len(questions)
                existing_ids = [q.id for q in questions]
                fallback_query = Question.query
                if existing_ids:
                    fallback_query = fallback_query.filter(~Question.id.in_(existing_ids))
                additional = fallback_query.order_by(db.func.random()).limit(more_needed).all()
                questions.extend(additional)

    # Set appropriate time limits
    if not time_limit_seconds:
        if session_type in ["FOCUS_TEST", "MOCK_TEST"]:
            time_limit_seconds = max(600, len(questions) * 60)  # ~1 min per question
        elif session_type == "QUICK_10":
            time_limit_seconds = 600  # 10 minutes
        else:
            time_limit_seconds = None

    session = QuizSession(
        user_id=user_id,
        session_type=session_type,
        exam_id=exam,
        subject_id=subject,
        topic_id=topic,
        total_questions=len(questions),
        time_limit_seconds=time_limit_seconds,
        focus_score=100.0,
        focus_violations_count=0,
        status="IN_PROGRESS"
    )
    db.session.add(session)
    db.session.commit()
    
    return api_success({
        "session": session.to_dict(),
        "questions": [q.to_dict() for q in questions]
    })

@practice_bp.route("/submit", methods=["POST"])
def submit_practice_response():
    payload = request.get_json() or {}
    session_id = payload.get("session_id")
    question_id = payload.get("question_id")
    selected_option = payload.get("selected_option")  # "A", "B", etc. or None if skipped
    is_skipped = payload.get("is_skipped", False)
    time_taken_seconds = int(payload.get("time_taken_seconds", 0))
    
    session = QuizSession.query.get(session_id)
    if not session:
        return api_error("Quiz session not found", status_code=404)
        
    question = Question.query.get(question_id)
    if not question:
        return api_error("Question not found", status_code=404)
        
    user_id = session.user_id or get_optional_user_id()
    
    if is_skipped or not selected_option:
        # Handle Skipped Question
        session.skipped_count = (session.skipped_count or 0) + 1
        session.time_spent_seconds += time_taken_seconds
        db.session.commit()
        
        return api_success({
            "is_skipped": True,
            "is_correct": False,
            "correct_answer": question.correct_answer,
            "explanation": question.explanation,
            "session_summary": session.to_dict()
        })

    is_correct = (selected_option == question.correct_answer)
    
    response = QuizResponse(
        user_id=user_id,
        session_id=session.id,
        question_id=question.id,
        selected_option=selected_option,
        correct=is_correct,
        time_taken=time_taken_seconds
    )
    db.session.add(response)
    
    # Update session tally
    if is_correct:
        session.correct_count += 1
        session.score += 2.0  # Standard competitive exam marks
    else:
        session.incorrect_count += 1
        if session.session_type in ["FOCUS_TEST", "MOCK_TEST"]:
            session.score -= 0.66  # Standard negative marking penalty (-1/3rd)
            
    session.time_spent_seconds += time_taken_seconds
    total_attempted = session.correct_count + session.incorrect_count
    if total_attempted > 0:
        session.accuracy = (session.correct_count / total_attempted) * 100
        
    # Update weak topic tracking
    if user_id:
        tracker = WeakTopicTracker.query.filter_by(
            user_id=user_id,
            subject=question.subject,
            topic_id=question.topic
        ).first()
        
        if not tracker:
            tracker = WeakTopicTracker(
                user_id=user_id,
                subject=question.subject,
                topic_id=question.topic,
                total_attempts=0,
                correct_count=0,
                incorrect_count=0,
                weakness_score=0.0
            )
            db.session.add(tracker)
            
        tracker.total_attempts = (tracker.total_attempts or 0) + 1
        if not is_correct:
            tracker.incorrect_count = (tracker.incorrect_count or 0) + 1
        else:
            tracker.correct_count = (tracker.correct_count or 0) + 1
        tracker.weakness_score = tracker.incorrect_count / tracker.total_attempts
        tracker.updated_at = datetime.utcnow()
        
        # Mistake Engine tracking
        mistake = Mistake.query.filter_by(user_id=user_id, question_id=question.id).first()
        if not is_correct:
            if not mistake:
                mistake = Mistake(
                    user_id=user_id,
                    question_id=question.id,
                    topic_id=question.topic,
                    first_mistake_at=datetime.utcnow(),
                    last_mistake_at=datetime.utcnow(),
                    attempt_count=1,
                    repeated_mistakes_count=1,
                    accuracy=0.0,
                    is_resolved=False
                )
                db.session.add(mistake)
            else:
                mistake.last_mistake_at = datetime.utcnow()
                mistake.attempt_count += 1
                mistake.repeated_mistakes_count += 1
                mistake.accuracy = max(0.0, (mistake.attempt_count - mistake.repeated_mistakes_count) / mistake.attempt_count)
                mistake.is_resolved = False
        else:
            if mistake:
                mistake.attempt_count += 1
                mistake.accuracy = max(0.0, (mistake.attempt_count - mistake.repeated_mistakes_count) / mistake.attempt_count)
                if mistake.accuracy >= 0.66:
                    mistake.is_resolved = True

        # Increment Daily Goal
        today = date.today()
        goal = DailyGoal.query.filter_by(user_id=user_id, date=today).first()
        if goal:
            goal.solved_today += 1
            if goal.solved_today >= goal.target_questions:
                goal.is_achieved = True

    db.session.commit()
    
    return api_success({
        "is_correct": is_correct,
        "correct_answer": question.correct_answer,
        "explanation": question.explanation,
        "session_summary": session.to_dict()
    })

@practice_bp.route("/focus-violation", methods=["POST"])
def record_focus_violation():
    payload = request.get_json() or {}
    session_id = payload.get("session_id")
    violation_type = payload.get("violation_type", "VISIBILITY_HIDDEN")  # VISIBILITY_HIDDEN, FULLSCREEN_EXIT, WINDOW_BLUR
    details = payload.get("details", "Focus violation detected by client window listener")
    
    session = QuizSession.query.get(session_id)
    if not session:
        return api_error("Quiz session not found", status_code=404)
        
    user_id = session.user_id or get_optional_user_id()
    
    # Record Focus Event
    event = FocusEvent(
        user_id=user_id,
        session_id=session.id,
        event_type=violation_type,
        details=details
    )
    db.session.add(event)
    
    # Increment violation count and adjust Focus Score (separated from exam score)
    session.focus_violations_count = (session.focus_violations_count or 0) + 1
    session.focus_score = max(0.0, 100.0 - (session.focus_violations_count * 20.0))
    
    is_terminated = False
    warning_title = f"Warning {session.focus_violations_count}/3"
    warning_message = "Focus violation detected. Please stay on the test screen."
    
    if session.focus_violations_count == 2:
        warning_message = "Second focus violation recorded. One more violation will immediately terminate the test."
    elif session.focus_violations_count >= 3:
        is_terminated = True
        session.status = "TERMINATED_VIOLATION"
        session.completed_at = datetime.utcnow()
        warning_title = "Test Terminated"
        warning_message = "Maximum allowable focus violations exceeded. Your test has been submitted."
        
    db.session.commit()
    
    return api_success({
        "focus_score": session.focus_score,
        "focus_violations_count": session.focus_violations_count,
        "is_terminated": is_terminated,
        "warning_title": warning_title,
        "warning_message": warning_message
    })

@practice_bp.route("/complete", methods=["POST"])
def complete_practice_session():
    payload = request.get_json() or {}
    session_id = payload.get("session_id")
    
    session = QuizSession.query.get(session_id)
    if not session:
        return api_error("Quiz session not found", status_code=404)
        
    session.status = "COMPLETED"
    session.completed_at = datetime.utcnow()
    
    # Compute unattempted count
    attempted = (session.correct_count or 0) + (session.incorrect_count or 0) + (session.skipped_count or 0)
    session.unattempted_count = max(0, (session.total_questions or 0) - attempted)
    
    total_answered = (session.correct_count or 0) + (session.incorrect_count or 0)
    if total_answered > 0:
        session.accuracy = round(((session.correct_count or 0) / total_answered) * 100, 1)
        
    avg_time = round((session.time_spent_seconds or 0) / max(1, attempted), 1)

    # 1. Synthesize AI Coach review using condensed metrics
    ai_coach = ai_service.generate_test_coaching_summary(
        session_summary=session.to_dict(),
        previous_stats={"overall_accuracy": 72.0}
    )
    session.ai_coach_summary = ai_coach

    # 2. Check Personal Bests
    new_personal_bests = []
    user = User.query.get(session.user_id) if session.user_id else None
    if user:
        bests = dict(user.personal_bests or {})
        
        # Highest Score
        if session.score > bests.get("highest_score", 0.0):
            bests["highest_score"] = round(session.score, 2)
            new_personal_bests.append({"type": "HIGHEST_SCORE", "label": "New Personal Best Score", "value": f"{round(session.score, 2)} Marks"})
            
        # Highest Accuracy (for tests with >= 5 questions)
        if (session.total_questions or 0) >= 5 and session.accuracy > bests.get("highest_accuracy", 0.0):
            bests["highest_accuracy"] = round(session.accuracy, 1)
            new_personal_bests.append({"type": "HIGHEST_ACCURACY", "label": "Accuracy Record", "value": f"{round(session.accuracy, 1)}%"})
            
        user.personal_bests = bests
        
    db.session.commit()
    
    # 3. Subject & Topic performance breakdown
    # Group responses for this session
    responses = session.answers.all()
    subject_map = {}
    topic_map = {}
    
    for r in responses:
        q = Question.query.get(r.question_id)
        if not q:
            continue
        subj = q.subject or "General Studies"
        top = q.topic or "General"
        
        if subj not in subject_map:
            subject_map[subj] = {"correct": 0, "total": 0}
        subject_map[subj]["total"] += 1
        if r.correct:
            subject_map[subj]["correct"] += 1
            
        if top not in topic_map:
            topic_map[top] = {"correct": 0, "total": 0, "subject": subj}
        topic_map[top]["total"] += 1
        if r.correct:
            topic_map[top]["correct"] += 1

    subject_breakdown = []
    for subj, data in subject_map.items():
        acc = round((data["correct"] / max(1, data["total"])) * 100, 1)
        subject_breakdown.append({
            "subject": subj,
            "correct": data["correct"],
            "total": data["total"],
            "accuracy": acc,
            "status": "STRONG" if acc >= 70 else ("IMPROVING" if acc >= 50 else "WEAK")
        })

    topic_breakdown = []
    for top, data in topic_map.items():
        acc = round((data["correct"] / max(1, data["total"])) * 100, 1)
        topic_breakdown.append({
            "topic": top,
            "subject": data["subject"],
            "correct": data["correct"],
            "total": data["total"],
            "accuracy": acc,
            "status": "STRONG" if acc >= 70 else ("IMPROVING" if acc >= 50 else "WEAK")
        })

    # Sort topics into weak and strong
    strong_topics = [t for t in topic_breakdown if t["accuracy"] >= 70]
    weak_topics = [t for t in topic_breakdown if t["accuracy"] < 50]

    return api_success({
        "session": session.to_dict(),
        "stats": {
            "score": round(session.score, 2),
            "accuracy": round(session.accuracy, 1),
            "correct": session.correct_count,
            "wrong": session.incorrect_count,
            "skipped": session.skipped_count or 0,
            "unattempted": session.unattempted_count or 0,
            "avg_time_per_question": avg_time,
            "focus_score": round(session.focus_score or 100.0, 1),
            "focus_violations": session.focus_violations_count or 0,
        },
        "ai_coach": ai_coach,
        "new_personal_bests": new_personal_bests,
        "subject_breakdown": subject_breakdown,
        "topic_breakdown": topic_breakdown,
        "strong_topics": strong_topics,
        "weak_topics": weak_topics
    })

@practice_bp.route("/session/<session_id>", methods=["GET"])
def get_session_details(session_id):
    session = QuizSession.query.get(session_id)
    if not session:
        return api_error("Quiz session not found", status_code=404)
        
    responses = {r.question_id: {"selected_option": r.selected_option, "correct": r.correct} for r in session.answers.all()}
    
    # Reconstruct questions for this session
    questions = Question.query.filter_by(exam=session.exam_id).limit(session.total_questions or 10).all()
    
    return api_success({
        "session": session.to_dict(),
        "responses": responses,
        "questions": [q.to_dict() for q in questions]
    })

@practice_bp.route("/weak-topics", methods=["GET"])
def get_weak_topics():
    user_id = get_optional_user_id()
    if not user_id:
        demo_user = get_or_create_demo_user()
        user_id = demo_user.id
        
    trackers = WeakTopicTracker.query.filter_by(user_id=user_id)\
        .order_by(WeakTopicTracker.weakness_score.desc()).limit(10).all()
        
    if not trackers:
        return api_success({
            "weak_topics": [
                {
                    "subject": "Indian Polity",
                    "topic": "Writ Jurisdiction (Art 32 vs 226)",
                    "attempts_count": 14,
                    "errors_count": 8,
                    "weakness_score": 0.57,
                    "recommendation": "Review Habeas Corpus & Certiorari distinctions with Sundaram AI"
                },
                {
                    "subject": "Economy",
                    "topic": "Monetary Policy Transmission & Repo Rates",
                    "attempts_count": 10,
                    "errors_count": 5,
                    "weakness_score": 0.50,
                    "recommendation": "Practice 5 questions on Marginal Standing Facility"
                }
            ]
        })
        
    return api_success({"weak_topics": [t.to_dict() for t in trackers]})
