import os
import sys
import tempfile
from datetime import datetime

# Ensure backend root is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models.core import db
from app.models.user import User
from app.models.pdf_document import PDFDocument, PDFQuestionDraft
from app.models.question import Question, QuestionOption
from app.models.engagement import Report
from app.services.pdf_engine.extractor import pdf_extractor
from app.services.pdf_engine.answer_resolver import answer_resolver
from app.services.pdf_engine.duplicate_detector import duplicate_detector
from app.services.pdf_engine.pipeline import pdf_pipeline

def run_tests():
    app = create_app()
    client = app.test_client()

    with app.app_context():
        print("🚀 STARTING SUNDARAM PREP PDF INTELLIGENCE TEST SUITE...\n")

        # Setup test demo user
        test_email = "pdf.aspirant@sundaramprep.com"
        user = User.query.filter_by(email=test_email).first()
        if not user:
            from app.utils.security import hash_password
            user = User(
                name="PDF Aspirant",
                email=test_email,
                email_verified=True,
                password_hash=hash_password("Pass123!"),
                status="ACTIVE"
            )
            db.session.add(user)
            db.session.commit()

        # =================================================================
        # TEST 1: CASE A — PDF WITH EXPLICIT ANSWERS
        # =================================================================
        print("1. Testing Case A: PDF With Explicit Answers...")
        sample_with_answers = """
Q.1 Which Article of the Indian Constitution empowers the President to promulgate Ordinances during recess of Parliament?
(A) Article 123
(B) Article 213
(C) Article 143
(D) Article 72
Ans: (A)

Q.2 The Tropic of Cancer passes through how many Indian States?
(A) 6
(B) 7
(C) 8
(D) 9
Answer: C
        """
        extracted = pdf_extractor.parse_questions(sample_with_answers)
        assert len(extracted) == 2, f"Expected 2 questions, got {len(extracted)}"
        assert extracted[0]["explicit_answer"] == "A"
        assert extracted[1]["explicit_answer"] == "C"

        res_a = answer_resolver.resolve_answer(
            question_text=extracted[0]["question_text"],
            options=extracted[0]["options"],
            explicit_answer=extracted[0]["explicit_answer"],
            source_name="UPSC Prelims Mock"
        )
        assert res_a["answer_status"] == "PDF_VERIFIED", f"Expected PDF_VERIFIED, got {res_a['answer_status']}"
        assert res_a["confidence_score"] == 1.0
        assert res_a["candidate_answer"] == "A"
        assert res_a["verified_by"] == "PDF_KEY_EXTRACTOR"
        print("✓ Case A Passed: Explicit answers normalized and marked as PDF_VERIFIED (confidence=1.0).\n")

        # =================================================================
        # TEST 2: CASE B — PDF WITHOUT ANSWERS (AI REASONING RESOLUTION)
        # =================================================================
        print("2. Testing Case B: PDF Without Answers (AI Reasoning Resolution)...")
        sample_without_answers = """
Q.1 Consider the following statements regarding the Monetary Policy Committee (MPC):
(A) It is headed by the Union Finance Minister.
(B) It consists of 6 members.
(C) Decisions are taken by consensus without voting.
(D) It meets once every year.
        """
        extracted_b = pdf_extractor.parse_questions(sample_without_answers)
        assert len(extracted_b) == 1
        assert extracted_b[0]["explicit_answer"] is None

        res_b = answer_resolver.resolve_answer(
            question_text=extracted_b[0]["question_text"],
            options=extracted_b[0]["options"],
            explicit_answer=None,
            source_name="Test Series Paper"
        )
        assert res_b["has_explicit_answer"] is False
        assert res_b["answer_status"] in ["AI_VERIFIED", "NEEDS_REVIEW"]
        assert 0.0 < res_b["confidence_score"] <= 1.0
        assert res_b["candidate_answer"] in ["A", "B", "C", "D"]
        assert "why" in res_b["explanation_json"]
        assert "quick_fact" in res_b["explanation_json"]
        assert "memory_trick" in res_b["explanation_json"]
        assert res_b["verification_source"] is not None
        print(f"✓ Case B Passed: AI solved question, status={res_b['answer_status']}, confidence={res_b['confidence_score']}.\n")

        # =================================================================
        # TEST 3: HINDI & BILINGUAL EXTRACTION
        # =================================================================
        print("3. Testing Hindi & Bilingual Parsing...")
        hindi_sample = """
प्रश्न 1. भारतीय संविधान की किस अनुसूची में दलबदल विरोधी कानून (Anti-Defection Law) से संबंधित प्रावधान शामिल हैं?
(क) आठवीं अनुसूची
(ख) नौवीं अनुसूची
(ग) दसवीं अनुसूची
(घ) ग्यारहवीं अनुसूची
उत्तर: (ग)
        """
        hindi_extracted = pdf_extractor.parse_questions(hindi_sample)
        assert len(hindi_extracted) == 1
        assert hindi_extracted[0]["language"] == "HI"
        assert hindi_extracted[0]["explicit_answer"] == "C"  # (ग) -> C
        assert hindi_extracted[0]["options"][2]["id"] == "C"
        print("✓ Hindi & Bilingual Test Passed: Devanagari numerals and option keys mapped to standard A/B/C/D.\n")

        # =================================================================
        # TEST 4: DIAGRAM & MAP DETECTION
        # =================================================================
        print("4. Testing Diagram, Map & Visual Asset Detection...")
        diagram_sample = """
Q.1 Refer to the attached Map Diagram regarding the major tiger reserves of Central India. Which sanctuary is located in Madhya Pradesh?
(A) Kanha National Park
(B) Jim Corbett
(C) Kaziranga
(D) Periyar
Ans: A
        """
        diag_extracted = pdf_extractor.parse_questions(diagram_sample)
        assert len(diag_extracted) == 1
        assert diag_extracted[0]["question_image_url"] is not None
        print(f"✓ Visual Content Test Passed: Map reference detected, image attached: {diag_extracted[0]['question_image_url']}.\n")

        # =================================================================
        # TEST 5: DUPLICATE DETECTION AGAINST QUESTION BANK
        # =================================================================
        print("5. Testing Duplicate Question Detection...")
        # Create a reference question in Question Bank
        ref_q = Question.query.filter(Question.question_text.like("%President to promulgate Ordinances%")).first()
        if not ref_q:
            ref_q = Question(
                question_text="Which Article of the Indian Constitution empowers the President to promulgate Ordinances during recess of Parliament?",
                correct_answer="A",
                subject="Indian Polity",
                topic="President",
                exam="UPSC_CSE"
            )
            db.session.add(ref_q)
            db.session.add(QuestionOption(question=ref_q, option_key="A", option_text="Article 123", is_correct=True))
            db.session.add(QuestionOption(question=ref_q, option_key="B", option_text="Article 213", is_correct=False))
            db.session.commit()

        # Check nearly identical stem with minor whitespace/case variation
        duplicate_candidate = "which article of the indian constitution empowers the president to promulgate ordinances during recess of parliament?"
        is_dup, match_id, score = duplicate_detector.check_duplicate(duplicate_candidate)
        assert is_dup is True, f"Expected duplicate detection, got {is_dup} (score: {score})"
        assert match_id == ref_q.id

        # Check distinctly different question
        unique_candidate = "What is the capital of Australia?"
        is_dup_unique, _, _ = duplicate_detector.check_duplicate(unique_candidate)
        assert is_dup_unique is False, "Unique question should not be marked duplicate"
        print("✓ Duplicate Detection Test Passed: Normalized token similarity successfully identified duplicate stem.\n")

        # =================================================================
        # TEST 6: FILE HASHING & AI COST CONTROL (DUPLICATE FILE REUSE)
        # =================================================================
        print("6. Testing Document SHA-256 Hashing & Processing Reuse...")
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tf:
            tf.write(sample_with_answers.encode("utf-8"))
            temp_path = tf.name

        file_hash = pdf_pipeline.calculate_file_hash(temp_path)
        assert len(file_hash) == 64, "SHA-256 hash must be 64 hexadecimal characters"

        from app.utils.security import generate_jwt
        auth_token = generate_jwt(user.id, user.email)
        auth_headers = {"Authorization": f"Bearer {auth_token}"}

        # Ingest first time via API
        with open(temp_path, "rb") as f:
            res_upload1 = client.post(
                "/api/pdf/upload",
                data={"file": (f, "test_exam_paper.txt")},
                content_type="multipart/form-data",
                headers=auth_headers
            )
        assert res_upload1.status_code == 201, f"Upload 1 failed: {res_upload1.data}"
        doc1_id = res_upload1.get_json()["data"]["document"]["id"]

        # Re-upload exact same file
        with open(temp_path, "rb") as f:
            res_upload2 = client.post(
                "/api/pdf/upload",
                data={"file": (f, "test_exam_paper.txt")},
                content_type="multipart/form-data",
                headers=auth_headers
            )
        assert res_upload2.status_code == 200, f"Upload 2 failed: {res_upload2.data}"
        upload2_data = res_upload2.get_json()["data"]
        assert upload2_data["cached"] is True
        assert upload2_data["document"]["id"] == doc1_id
        print("✓ File Caching Test Passed: Duplicate file detected via SHA-256, redundant AI processing avoided.\n")

        # =================================================================
        # TEST 7: DRAFTS REVIEW UI & BATCH APPROVAL
        # =================================================================
        print("7. Testing Drafts Review UI & Approval Pipeline...")
        drafts_res = client.get(f"/api/pdf/documents/{doc1_id}/drafts", headers=auth_headers)
        assert drafts_res.status_code == 200, f"Drafts failed: {drafts_res.data}"
        drafts_json = drafts_res.get_json()["data"]
        summary = drafts_json["summary"]
        assert summary["total_detected"] >= 2
        assert "ready_count" in summary
        assert "needs_review_count" in summary
        assert "duplicate_count" in summary

        # Approve a draft into Question Bank
        first_draft = drafts_json["drafts"][0]
        draft_id = first_draft["id"]

        approve_res = client.post(f"/api/pdf/drafts/{draft_id}/approve", headers=auth_headers, json={
            "subject": "Indian Polity",
            "topic": "Presidential Powers",
            "exam": "UPSC_CSE"
        })
        assert approve_res.status_code == 200
        q_data = approve_res.get_json()["data"]["question"]
        assert q_data["source_type"] == "PDF_EXTRACTED"
        assert q_data["is_verified"] is True
        assert "why" in q_data["explanation"]
        print("✓ Draft Approval Test Passed: Draft converted to canonical verified Question.\n")

        # =================================================================
        # TEST 8: AI QUESTION SYNTHESIS (SIMILAR & REVISION)
        # =================================================================
        print("8. Testing AI Question Synthesis (source_type = AI_GENERATED)...")
        gen_res = client.post(f"/api/pdf/documents/{doc1_id}/generate-ai", headers=auth_headers, json={
            "mode": "SIMILAR",
            "count": 2
        })
        assert gen_res.status_code == 201
        gen_drafts = gen_res.get_json()["data"]["drafts"]
        assert len(gen_drafts) == 2
        for gd in gen_drafts:
            assert gd["verification_source"] == "AI_GENERATED"
            assert gd["answer_status"] == "AI_VERIFIED"
        print("✓ Question Generation Test Passed: AI questions tagged as AI_GENERATED (never PYQ).\n")

        # =================================================================
        # TEST 9: QUESTION REPORTING SYSTEM
        # =================================================================
        print("9. Testing Student Question Reporting System...")
        rep_res = client.post("/api/student/reports", headers=auth_headers, json={
            "question_id": q_data["id"],
            "issue_type": "WRONG_ANSWER",
            "description": "Please review sub-clause 2 of Article 123."
        })
        assert rep_res.status_code == 201
        report_id = rep_res.get_json()["data"]["report_id"]
        report_record = Report.query.get(report_id)
        assert report_record is not None
        assert report_record.issue_type == "WRONG_ANSWER"
        print("✓ Question Reporting Test Passed: Student error report persisted to database.\n")

        # Cleanup
        os.remove(temp_path)
        client.delete(f"/api/pdf/documents/{doc1_id}", headers=auth_headers)
        db.session.delete(ref_q)
        db.session.delete(user)
        db.session.commit()

        print("🎉 ALL PDF INTELLIGENCE ENGINE TESTS PASSED 100%!")

if __name__ == "__main__":
    run_tests()
