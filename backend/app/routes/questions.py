from flask import Blueprint, request
from app.models import db, Question, QuestionSourceType, QuestionAnswerStatus
from app.utils.responses import api_success, api_error
from app.utils.security import token_required

questions_bp = Blueprint("questions", __name__, url_prefix="/api/questions")

@questions_bp.route("", methods=["GET"])
def get_questions():
    exam = request.args.get("exam")
    subject = request.args.get("subject")
    topic = request.args.get("topic")
    difficulty = request.args.get("difficulty")
    source_type = request.args.get("source_type")
    answer_status = request.args.get("answer_status")
    limit = min(int(request.args.get("limit", 20)), 100)
    offset = int(request.args.get("offset", 0))
    
    query = Question.query
    
    if exam:
        query = query.filter_by(exam=exam)
    if subject:
        query = query.filter_by(subject=subject)
    if topic:
        query = query.filter_by(topic=topic)
    if difficulty:
        query = query.filter_by(difficulty=difficulty)
    if source_type:
        query = query.filter_by(source_type=source_type)
    if answer_status:
        query = query.filter_by(answer_status=answer_status)
        
    total_count = query.count()
    questions = query.order_by(Question.created_at.desc()).offset(offset).limit(limit).all()
    
    return api_success({
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "questions": [q.to_dict() for q in questions]
    })

@questions_bp.route("/<question_id>", methods=["GET"])
def get_question_by_id(question_id):
    question = Question.query.get(question_id)
    if not question:
        return api_error("Question not found", code="NOT_FOUND", status_code=404)
    return api_success({"question": question.to_dict()})

@questions_bp.route("/filters", methods=["GET"])
def get_available_filters():
    # Return distinct exams, subjects, and topics available
    exams = [r[0] for r in db.session.query(Question.exam).distinct().all() if r[0]]
    subjects = [r[0] for r in db.session.query(Question.subject).distinct().all() if r[0]]
    topics = [r[0] for r in db.session.query(Question.topic).distinct().all() if r[0]]
    source_types = [s.value for s in QuestionSourceType]
    answer_statuses = [a.value for a in QuestionAnswerStatus]
    
    return api_success({
        "exams": exams or ["UPSC_CSE", "SSC_CGL", "BANK_PO", "RAILWAY_RRB", "STATE_PSC"],
        "subjects": subjects or ["Indian Polity", "Modern History", "Economy", "Geography", "Quantitative Aptitude"],
        "topics": topics or ["Fundamental Rights", "Preamble", "Judiciary", "Inflation & Monetary Policy"],
        "source_types": source_types,
        "answer_statuses": answer_statuses
    })

@questions_bp.route("", methods=["POST"])
def create_question():
    payload = request.get_json() or {}
    required_fields = ["question_text", "options", "correct_answer", "subject", "topic", "exam"]
    for f in required_fields:
        if not payload.get(f):
            return api_error(f"Field '{f}' is required.", status_code=400)
            
    q = Question(
        question_text=payload["question_text"],
        options=payload["options"],
        correct_answer=payload["correct_answer"],
        explanation=payload.get("explanation"),
        subject=payload["subject"],
        topic=payload["topic"],
        subtopic=payload.get("subtopic"),
        exam=payload["exam"],
        difficulty=payload.get("difficulty", "MEDIUM"),
        question_type=payload.get("question_type", "SINGLE_CHOICE"),
        source_type=payload.get("source_type", "PYQ"),
        source_reference=payload.get("source_reference"),
        answer_status=payload.get("answer_status", "VERIFIED"),
        answer_confidence=float(payload.get("answer_confidence", 1.0)),
        is_verified=payload.get("is_verified", True),
        language=payload.get("language", "EN"),
        image_url=payload.get("image_url")
    )
    db.session.add(q)
    db.session.commit()
    return api_success({"question": q.to_dict()}, status_code=201)
