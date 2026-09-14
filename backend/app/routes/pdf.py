import os
import threading
from flask import Blueprint, request, send_from_directory
from werkzeug.utils import secure_filename

from app.config import config
from app.models import db, PDFDocument, PDFQuestionDraft, Question, QuestionOption, QuestionExam
from app.services.pdf_engine.pipeline import pdf_pipeline
from app.utils.responses import api_success, api_error
from app.utils.security import decode_jwt

pdf_bp = Blueprint("pdf", __name__, url_prefix="/api/pdf")

def get_optional_user_id():
    auth_header = request.headers.get("Authorization", "")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        decoded = decode_jwt(token)
        if decoded:
            return decoded.get("sub")
            
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        decoded = decode_jwt(cookie_token)
        if decoded:
            return decoded.get("sub")
            
    return None

@pdf_bp.route("/upload", methods=["POST"])
def upload_pdf():
    """
    Section 1: Safe Multi-Format Ingestion.
    Supports English, Hindi, bilingual, text, scanned, and diagram PDFs.
    Computes file SHA-256 hash for AI cost control and duplicate file caching.
    """
    os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)
    
    file = request.files.get("file")
    if not file or not file.filename:
        return api_error("No file provided", status_code=400)
        
    filename = secure_filename(file.filename)
    if not (filename.lower().endswith(".pdf") or filename.lower().endswith(".txt")):
        return api_error("Only PDF or text test papers are supported (.pdf, .txt)", status_code=400)
        
    save_path = os.path.join(config.UPLOAD_FOLDER, filename)
    file.save(save_path)
    file_size = os.path.getsize(save_path)
    
    # Enforce file size limit (16MB max)
    if file_size > config.MAX_CONTENT_LENGTH:
        os.remove(save_path)
        return api_error("File size exceeds 16MB limit.", status_code=413)

    user_id = get_optional_user_id()
    from app.models.user import User
    user = User.query.get(user_id) if user_id else None
    if not user or user.role != "ADMIN":
        return api_error("Access restricted: Only Sundaram (Admin) can upload new test papers. Students can practice all available materials.", code="FORBIDDEN", status_code=403)
    
    # Section 11: AI Cost Control & Duplicate File Hashing
    file_hash = pdf_pipeline.calculate_file_hash(save_path)
    cached_doc = pdf_pipeline.check_cached_document(user_id=user_id, file_hash=file_hash)
    if cached_doc:
        os.remove(save_path)
        return api_success({
            "document": cached_doc.to_dict(),
            "message": "File was previously processed. Loaded cached questions.",
            "cached": True
        }, status_code=200)
        
    doc = PDFDocument(
        user_id=user_id,
        file_name=filename,
        file_path=save_path,
        file_size=file_size,
        file_hash=file_hash,
        status="PROCESSING",
        processing_stage="PARSING"
    )
    db.session.add(doc)
    db.session.commit()
    
    # Non-blocking async background processing
    worker = threading.Thread(
        target=pdf_pipeline.process_document_async,
        args=(doc.id,),
        daemon=True
    )
    worker.start()
    
    return api_success({
        "document": doc.to_dict(),
        "message": "Document uploaded and background AI extraction started."
    }, status_code=202)

@pdf_bp.route("/documents", methods=["GET"])
def list_documents():
    """
    Section 5: Document list endpoint.
    All students can access and practice test papers uploaded by Sundaram.
    """
    from app.models.user import User
    user_id = get_optional_user_id()
    page = int(request.args.get("page", 1))
    limit = min(int(request.args.get("limit", 10)), 50)
    offset = (page - 1) * limit
    
    query = PDFDocument.query.filter(~PDFDocument.file_name.ilike('%sample_polity_test%'))
    total = query.count()
    docs = query.order_by(PDFDocument.created_at.desc()).offset(offset).limit(limit).all()
    
    return api_success({
        "total": total,
        "page": page,
        "limit": limit,
        "documents": [d.to_dict() for d in docs]
    })

@pdf_bp.route("/documents/<doc_id>/status", methods=["GET"])
def get_document_status(doc_id):
    """Section 10: Non-blocking Processing Stage Polling."""
    doc = PDFDocument.query.get(doc_id)
    if not doc:
        return api_error("Document not found", status_code=404)
        
    return api_success({
        "id": doc.id,
        "status": doc.status,
        "processing_stage": doc.processing_stage,
        "extracted_questions_count": doc.extracted_questions_count,
        "ready_count": doc.ready_count,
        "needs_review_count": doc.needs_review_count,
        "duplicate_count": doc.duplicate_count
    })

@pdf_bp.route("/documents/<doc_id>/drafts", methods=["GET"])
def get_document_drafts(doc_id):
    """
    Section 5: Review UI endpoint.
    Returns detected questions categorized as Ready, Need Review, or Duplicate.
    """
    doc = PDFDocument.query.get(doc_id)
    if not doc:
        return api_error("Document not found", status_code=404)
        
    user_id = get_optional_user_id()
    if user_id and doc.user_id and doc.user_id != user_id:
        return api_error("Access denied. You do not own this document.", code="FORBIDDEN", status_code=403)
        
    drafts = PDFQuestionDraft.query.filter_by(document_id=doc_id).order_by(PDFQuestionDraft.created_at.asc()).all()
    
    ready_items = [d.to_dict() for d in drafts if not d.is_duplicate and d.answer_status in ["PDF_VERIFIED", "SOURCE_VERIFIED", "AI_VERIFIED"]]
    review_items = [d.to_dict() for d in drafts if not d.is_duplicate and d.answer_status in ["NEEDS_REVIEW", "UNVERIFIED"]]
    duplicate_items = [d.to_dict() for d in drafts if d.is_duplicate]
    
    return api_success({
        "document": doc.to_dict(),
        "summary": {
            "total_detected": len(drafts),
            "ready_count": len(ready_items),
            "needs_review_count": len(review_items),
            "duplicate_count": len(duplicate_items)
        },
        "drafts": [d.to_dict() for d in drafts]
    })

@pdf_bp.route("/drafts/<draft_id>/approve", methods=["POST"])
def approve_draft_question(draft_id):
    """
    Section 5: Approves a detected draft and imports into official Question Bank.
    """
    draft = PDFQuestionDraft.query.get(draft_id)
    if not draft:
        return api_error("Draft question not found", status_code=404)
        
    payload = request.get_json() or {}
    subject = payload.get("subject") or draft.subject or "Indian Polity"
    topic = payload.get("topic") or draft.topic or "Constitutional Bodies"
    exam = payload.get("exam", "UPSC_CSE")
    
    explanation_data = draft.explanation_json or {
        "answer": f"Option {draft.candidate_answer}",
        "why": draft.reasoning_summary or "Extracted via PDF Intelligence",
        "quick_fact": draft.source_reference or "",
        "memory_trick": ""
    }
    
    # Create canonical Question
    question = Question(
        question_text=draft.question_text,
        correct_answer=draft.candidate_answer or "A",
        explanation=explanation_data,
        subject=subject,
        topic=topic,
        exam=exam,
        difficulty="MEDIUM",
        question_type="SINGLE_CHOICE",
        source_type="PDF_EXTRACTED",
        source_document_id=draft.document_id,
        source_reference=draft.source_reference,
        answer_status=draft.answer_status,
        answer_confidence=draft.confidence_score,
        is_verified=(draft.answer_status in ["PDF_VERIFIED", "SOURCE_VERIFIED", "AI_VERIFIED"]),
        language=draft.language or "EN",
        image_url=draft.question_image_url
    )
    db.session.add(question)
    
    for opt in (draft.options or []):
        opt_key = opt.get("id") or opt.get("key") or "A"
        opt_text = opt.get("text") or ""
        q_opt = QuestionOption(
            question=question,
            option_key=opt_key,
            option_text=opt_text,
            is_correct=(opt_key == draft.candidate_answer)
        )
        db.session.add(q_opt)

    draft.is_imported = True
    db.session.commit()
    
    return api_success({
        "message": "Question successfully approved and imported into Question Bank",
        "question": question.to_dict()
    })

@pdf_bp.route("/documents/<doc_id>/approve-all", methods=["POST"])
def approve_all_ready(doc_id):
    """Batch approve all non-duplicate ready questions."""
    doc = PDFDocument.query.get(doc_id)
    if not doc:
        return api_error("Document not found", status_code=404)

    payload = request.get_json() or {}
    exam = payload.get("exam", "UPSC_CSE")
    subject = payload.get("subject", "Indian Polity & Governance")
    topic = payload.get("topic", "General Questions")

    ready_drafts = PDFQuestionDraft.query.filter_by(
        document_id=doc_id,
        is_imported=False,
        is_duplicate=False
    ).all()

    imported_count = 0
    for draft in ready_drafts:
        q = Question(
            question_text=draft.question_text,
            correct_answer=draft.candidate_answer or "A",
            explanation=draft.explanation_json or {
                "answer": f"Option {draft.candidate_answer}",
                "why": draft.reasoning_summary or "",
                "quick_fact": draft.source_reference or "",
                "memory_trick": ""
            },
            subject=draft.subject or subject,
            topic=draft.topic or topic,
            exam=exam,
            difficulty="MEDIUM",
            source_type="PDF_EXTRACTED",
            source_document_id=doc.id,
            source_reference=draft.source_reference,
            answer_status=draft.answer_status,
            answer_confidence=draft.confidence_score,
            is_verified=True,
            language=draft.language or "EN",
            image_url=draft.question_image_url
        )
        db.session.add(q)
        for opt in (draft.options or []):
            opt_key = opt.get("id") or opt.get("key") or "A"
            opt_text = opt.get("text") or ""
            q_opt = QuestionOption(
                question=q,
                option_key=opt_key,
                option_text=opt_text,
                is_correct=(opt_key == draft.candidate_answer)
            )
            db.session.add(q_opt)

        draft.is_imported = True
        imported_count += 1

    db.session.commit()
    return api_success({
        "imported_count": imported_count,
        "message": f"Successfully approved and imported {imported_count} questions."
    })

@pdf_bp.route("/drafts/<draft_id>", methods=["PATCH"])
def edit_draft_question(draft_id):
    """Section 5: Edit draft stem, options, candidate answer, or explanation."""
    draft = PDFQuestionDraft.query.get(draft_id)
    if not draft:
        return api_error("Draft question not found", status_code=404)
        
    payload = request.get_json() or {}
    if "question_text" in payload:
        draft.question_text = payload["question_text"]
    if "options" in payload:
        draft.options = payload["options"]
    if "candidate_answer" in payload:
        draft.candidate_answer = payload["candidate_answer"].upper()
    if "subject" in payload:
        draft.subject = payload["subject"]
    if "topic" in payload:
        draft.topic = payload["topic"]
    if "reasoning_summary" in payload:
        draft.reasoning_summary = payload["reasoning_summary"]
    if "explanation" in payload:
        draft.explanation_json = payload["explanation"]
        
    db.session.commit()
    return api_success({
        "draft": draft.to_dict(),
        "message": "Draft updated successfully."
    })

@pdf_bp.route("/drafts/<draft_id>", methods=["DELETE"])
def reject_draft_question(draft_id):
    """Section 5: Discard/reject a draft question."""
    draft = PDFQuestionDraft.query.get(draft_id)
    if not draft:
        return api_error("Draft question not found", status_code=404)
        
    doc = PDFDocument.query.get(draft.document_id)
    db.session.delete(draft)
    if doc and doc.extracted_questions_count > 0:
        doc.extracted_questions_count -= 1
    db.session.commit()
    
    return api_success({"message": "Draft rejected and removed."})

@pdf_bp.route("/documents/<doc_id>/generate-ai", methods=["POST"])
def generate_ai_questions(doc_id):
    """
    Section 12: Generate Similar or Revision Questions from PDF content.
    source_type is strictly marked as AI_GENERATED (never PYQ).
    """
    payload = request.get_json() or {}
    mode = payload.get("mode", "SIMILAR").upper()  # SIMILAR or REVISION
    count = min(int(payload.get("count", 3)), 10)
    
    try:
        new_drafts = pdf_pipeline.generate_ai_practice_questions(doc_id, mode=mode, count=count)
        return api_success({
            "generated_count": len(new_drafts),
            "mode": mode,
            "drafts": [d.to_dict() for d in new_drafts],
            "message": f"Successfully synthesized {len(new_drafts)} {mode.lower()} questions (Tagged as AI_GENERATED)."
        }, status_code=201)
    except Exception as e:
        return api_error(str(e), status_code=400)

@pdf_bp.route("/documents/<doc_id>", methods=["DELETE"])
def delete_document(doc_id):
    """Section 9: Delete PDF document and associated drafts."""
    doc = PDFDocument.query.get(doc_id)
    if not doc:
        return api_error("Document not found", status_code=404)
        
    user_id = get_optional_user_id()
    from app.models.user import User
    user = User.query.get(user_id) if user_id else None
    if not user or user.role != "ADMIN":
        return api_error("Access restricted: Only Sundaram (Admin) can delete documents.", code="FORBIDDEN", status_code=403)
        
    # Remove file from disk if present
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except OSError:
            pass
            
    db.session.delete(doc)
    db.session.commit()
    return api_success({"message": "Document and all associated drafts deleted successfully."})

@pdf_bp.route("/files/<filename>", methods=["GET"])
def serve_pdf_file(filename):
    """Serve uploaded PDF for review."""
    return send_from_directory(config.UPLOAD_FOLDER, secure_filename(filename))
