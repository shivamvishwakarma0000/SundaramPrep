from datetime import datetime
from app.models.core import db, generate_uuid, TimestampMixin

class Document(db.Model, TimestampMixin):
    __tablename__ = "documents"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True, index=True)
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_url = db.Column(db.String(500), nullable=True)  # External object storage or static endpoint URL
    file_hash = db.Column(db.String(64), nullable=True, index=True)  # SHA-256 for caching & duplicate detection
    file_size_bytes = db.Column(db.Integer, default=0)
    mime_type = db.Column(db.String(50), default="application/pdf")
    
    status = db.Column(db.String(30), default="PENDING", index=True)  # PENDING, PROCESSING, EXTRACTED, READY, FAILED
    processing_stage = db.Column(db.String(50), default="READY", index=True)  # UPLOADING, PROCESSING, EXTRACTING, ANALYZING, VERIFYING, READY, FAILED
    page_count = db.Column(db.Integer, default=0)
    extracted_questions_count = db.Column(db.Integer, default=0)
    
    # Review Metrics Breakdown
    ready_count = db.Column(db.Integer, default=0)
    needs_review_count = db.Column(db.Integer, default=0)
    duplicate_count = db.Column(db.Integer, default=0)
    
    error_message = db.Column(db.Text, nullable=True)
    
    jobs = db.relationship("DocumentProcessingJob", backref="document", lazy="dynamic", cascade="all, delete-orphan")
    drafts = db.relationship("PDFQuestionDraft", backref="document", lazy="dynamic", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "file_name": self.file_name,
            "file_path": self.file_path,
            "file_url": self.file_url,
            "file_hash": self.file_hash,
            "file_size_bytes": self.file_size_bytes,
            "status": self.status,
            "processing_stage": self.processing_stage,
            "page_count": self.page_count,
            "extracted_questions_count": self.extracted_questions_count,
            "ready_count": self.ready_count,
            "needs_review_count": self.needs_review_count,
            "duplicate_count": self.duplicate_count,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class DocumentProcessingJob(db.Model):
    __tablename__ = "document_processing_jobs"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    document_id = db.Column(db.String(36), db.ForeignKey("documents.id"), nullable=False, index=True)
    status = db.Column(db.String(30), default="PENDING", index=True)  # PENDING, RUNNING, COMPLETED, FAILED
    extracted_count = db.Column(db.Integer, default=0)
    error_log = db.Column(db.Text, nullable=True)
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)

class PDFQuestionDraft(db.Model):
    __tablename__ = "pdf_question_drafts"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    document_id = db.Column(db.String(36), db.ForeignKey("documents.id"), nullable=False, index=True)
    
    raw_text = db.Column(db.Text, nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    options = db.Column(db.JSON, nullable=False)
    
    # Visual Question Support (Diagrams, Maps, Charts)
    question_image_url = db.Column(db.String(500), nullable=True)
    
    candidate_answer = db.Column(db.String(10), nullable=True)
    has_explicit_answer = db.Column(db.Boolean, default=False)
    answer_status = db.Column(db.String(30), default="UNVERIFIED", index=True)  # PDF_VERIFIED, SOURCE_VERIFIED, AI_VERIFIED, NEEDS_REVIEW, UNVERIFIED
    confidence_score = db.Column(db.Float, default=0.0)
    
    # Verification & Citations
    verification_source = db.Column(db.String(100), nullable=True)
    source_reference = db.Column(db.String(255), nullable=True)
    verification_notes = db.Column(db.Text, nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    verified_by = db.Column(db.String(100), nullable=True)
    
    # Structured Pedagogical Explanation (Why, Quick Fact, Memory Trick)
    reasoning_summary = db.Column(db.Text, nullable=True)
    explanation_json = db.Column(db.JSON, nullable=True)
    
    # Duplicate Detection
    is_duplicate = db.Column(db.Boolean, default=False, index=True)
    duplicate_of_question_id = db.Column(db.String(36), nullable=True)
    
    # Classification Metadata
    language = db.Column(db.String(10), default="EN")  # EN, HI, BILINGUAL
    subject = db.Column(db.String(100), nullable=True)
    topic = db.Column(db.String(100), nullable=True)
    
    is_imported = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            "id": self.id,
            "document_id": self.document_id,
            "question_text": self.question_text,
            "options": self.options,
            "question_image_url": self.question_image_url,
            "candidate_answer": self.candidate_answer,
            "has_explicit_answer": self.has_explicit_answer,
            "answer_status": self.answer_status,
            "confidence_score": round(self.confidence_score, 2),
            "source_reference": self.source_reference,
            "verification_source": self.verification_source,
            "verification_notes": self.verification_notes,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "verified_by": self.verified_by,
            "reasoning_summary": self.reasoning_summary,
            "explanation": self.explanation_json or {
                "answer": f"Option {self.candidate_answer}",
                "why": self.reasoning_summary or "",
                "quick_fact": self.source_reference or "",
                "memory_trick": ""
            },
            "is_duplicate": self.is_duplicate,
            "duplicate_of_question_id": self.duplicate_of_question_id,
            "language": self.language,
            "subject": self.subject,
            "topic": self.topic,
            "is_imported": self.is_imported,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# Alias for backwards compatibility
PDFDocument = Document
