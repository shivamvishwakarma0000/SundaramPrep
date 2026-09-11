import logging
from typing import List, Dict, Any, Tuple
from app.services.pdf_engine.pipeline import pdf_pipeline
from app.services.pdf_engine.extractor import pdf_extractor
from app.models import PDFDocument

logger = logging.getLogger(__name__)

class PDFService:
    """
    Facade for the PDF Intelligence Engine.
    Provides backward-compatible interface while routing through the production
    PDF pipeline, extractor, duplicate detector, and answer resolver.
    """

    def extract_text_from_pdf(self, file_path: str) -> Tuple[str, int]:
        text, pages, _ = pdf_extractor.extract_text(file_path)
        return text, pages

    def parse_questions_from_text(self, text: str) -> List[Dict[str, Any]]:
        return pdf_extractor.parse_questions(text)

    def process_document(self, document_id: str):
        return pdf_pipeline.process_document(document_id)

    def generate_ai_practice_questions(self, document_id: str, mode: str = "SIMILAR", count: int = 3):
        return pdf_pipeline.generate_ai_practice_questions(document_id, mode=mode, count=count)

pdf_service = PDFService()
