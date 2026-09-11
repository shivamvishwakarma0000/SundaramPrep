from datetime import datetime
from app.models.core import db, generate_uuid, TimestampMixin

class QuestionSourceType:
    PYQ = "PYQ"
    PDF_EXTRACTED = "PDF_EXTRACTED"
    AI_GENERATED = "AI_GENERATED"
    CURRENT_AFFAIRS = "CURRENT_AFFAIRS"
    COMMUNITY = "COMMUNITY"

class QuestionAnswerStatus:
    VERIFIED = "VERIFIED"
    AI_VERIFIED = "AI_VERIFIED"
    SOURCE_VERIFIED = "SOURCE_VERIFIED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    UNVERIFIED = "UNVERIFIED"

class QuestionDifficulty:
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"

class Question(db.Model, TimestampMixin):
    __tablename__ = "questions"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    question_text = db.Column(db.Text, nullable=False)
    correct_answer = db.Column(db.String(10), nullable=False)  # "A", "B", "C", "D"
    explanation = db.Column(db.JSON, nullable=True)  # { "answer": "", "why": "", "quick_fact": "", "memory_trick": "" }
    
    # Curriculum Links
    subject_id = db.Column(db.String(36), db.ForeignKey("subjects.id"), nullable=True, index=True)
    topic_id = db.Column(db.String(36), db.ForeignKey("topics.id"), nullable=True, index=True)
    subtopic_id = db.Column(db.String(36), db.ForeignKey("subtopics.id"), nullable=True, index=True)
    
    # Human-readable string fallbacks for display speed and indexing
    subject = db.Column(db.String(100), nullable=False, default="General Studies", index=True)
    topic = db.Column(db.String(150), nullable=False, default="General", index=True)
    subtopic = db.Column(db.String(150), nullable=True)
    
    # Legacy primary exam code for instant index filtering (while full Many-to-Many is in question_exams)
    exam = db.Column(db.String(50), nullable=False, default="UPSC_CSE", index=True)
    
    difficulty = db.Column(db.String(20), default=QuestionDifficulty.MEDIUM, index=True)
    question_type = db.Column(db.String(30), default="SINGLE_CHOICE", index=True)
    language = db.Column(db.String(20), default="EN", index=True)
    image_url = db.Column(db.String(500), nullable=True)
    
    is_verified = db.Column(db.Boolean, default=True, index=True)
    answer_status = db.Column(db.String(30), default=QuestionAnswerStatus.VERIFIED, index=True)
    answer_confidence = db.Column(db.Float, default=1.0)
    
    source_type = db.Column(db.String(30), nullable=False, default=QuestionSourceType.PYQ, index=True)
    source_reference = db.Column(db.String(255), nullable=True)
    source_document_id = db.Column(db.String(36), nullable=True, index=True)
    
    # Relationships
    options = db.relationship("QuestionOption", backref="question", lazy="selectin", cascade="all, delete-orphan")
    question_exams = db.relationship("QuestionExam", backref="question", lazy="dynamic", cascade="all, delete-orphan")
    sources = db.relationship("QuestionSource", backref="question", lazy="dynamic", cascade="all, delete-orphan")
    verifications = db.relationship("AnswerVerification", backref="question", lazy="dynamic", cascade="all, delete-orphan")
    
    __table_args__ = (
        db.Index('idx_questions_exam_subject_diff', 'exam', 'subject', 'difficulty'),
        db.Index('idx_questions_topic_verified', 'topic_id', 'is_verified'),
    )

    def to_dict(self):
        # Format options as list of dicts: [{"id": "A", "text": "..."}]
        opts = [{"id": o.option_key, "text": o.option_text} for o in self.options]
        if not opts:
            # Fallback if raw JSON or legacy format
            opts = [
                {"id": "A", "text": "Statement 1 is correct"},
                {"id": "B", "text": "Statement 2 is correct"},
                {"id": "C", "text": "Both 1 and 2"},
                {"id": "D", "text": "Neither 1 nor 2"}
            ]

        expl = self.explanation
        if not isinstance(expl, dict):
            expl = {
                "answer": self.correct_answer,
                "why": str(expl or ""),
                "quick_fact": "",
                "memory_trick": ""
            }

        return {
            "id": self.id,
            "question_text": self.question_text,
            "options": opts,
            "correct_answer": self.correct_answer,
            "explanation": expl,
            "subject": self.subject,
            "topic": self.topic,
            "subtopic": self.subtopic,
            "subject_id": self.subject_id,
            "topic_id": self.topic_id,
            "exam": self.exam,
            "difficulty": self.difficulty,
            "question_type": self.question_type,
            "source_type": self.source_type,
            "source_reference": self.source_reference,
            "source_document_id": self.source_document_id,
            "answer_status": self.answer_status,
            "answer_confidence": self.answer_confidence,
            "is_verified": self.is_verified,
            "language": self.language,
            "image_url": self.image_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class QuestionOption(db.Model):
    __tablename__ = "question_options"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    question_id = db.Column(db.String(36), db.ForeignKey("questions.id"), nullable=False, index=True)
    option_key = db.Column(db.String(10), nullable=False)  # "A", "B", "C", "D"
    option_text = db.Column(db.Text, nullable=False)
    is_correct = db.Column(db.Boolean, default=False, nullable=False)
    
    __table_args__ = (
        db.Index('idx_qopt_question_key', 'question_id', 'option_key'),
    )

class QuestionExam(db.Model):
    """Many-to-Many mapping table between Questions and Exams"""
    __tablename__ = "question_exams"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    question_id = db.Column(db.String(36), db.ForeignKey("questions.id"), nullable=False, index=True)
    exam_id = db.Column(db.String(36), db.ForeignKey("exams.id"), nullable=False, index=True)
    is_primary = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        db.UniqueConstraint('question_id', 'exam_id', name='uq_question_exam'),
    )

class QuestionSource(db.Model):
    __tablename__ = "question_sources"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    question_id = db.Column(db.String(36), db.ForeignKey("questions.id"), nullable=False, index=True)
    source_type = db.Column(db.String(50), nullable=False)  # PYQ, PDF_EXTRACTED, etc.
    reference_citation = db.Column(db.String(255), nullable=True)  # "UPSC CSE 2023 GS-I Q14"
    exam_year = db.Column(db.Integer, nullable=True)
    paper_number = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

class AnswerVerification(db.Model):
    __tablename__ = "answer_verifications"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    question_id = db.Column(db.String(36), db.ForeignKey("questions.id"), nullable=False, index=True)
    verified_by_model = db.Column(db.String(100), nullable=False)  # "o3-mini", "official_key", etc.
    verification_status = db.Column(db.String(50), nullable=False)  # "VERIFIED", "AI_VERIFIED", "NEEDS_REVIEW"
    confidence_score = db.Column(db.Float, default=1.0)
    reasoning_summary = db.Column(db.Text, nullable=True)
    source_citations = db.Column(db.JSON, default=list)
    verified_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

class QuestionSet(db.Model):
    __tablename__ = "question_sets"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    exam_id = db.Column(db.String(36), db.ForeignKey("exams.id"), nullable=True, index=True)
    year = db.Column(db.Integer, nullable=True)
    set_code = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
