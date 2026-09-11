from app.routes.health import health_bp
from app.routes.auth import auth_bp
from app.routes.questions import questions_bp
from app.routes.practice import practice_bp
from app.routes.ai_assistant import ai_bp
from app.routes.pdf import pdf_bp
from app.routes.student import student_bp

__all__ = [
    "health_bp",
    "auth_bp",
    "questions_bp",
    "practice_bp",
    "ai_bp",
    "pdf_bp",
    "student_bp"
]
