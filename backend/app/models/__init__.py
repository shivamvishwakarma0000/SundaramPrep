from app.models.core import db, generate_uuid, TimestampMixin

# Curriculum
from app.models.curriculum import Exam, Subject, Topic, Subtopic

# Users
from app.models.user import User, UserProfile, DailyGoal, Streak, EmailVerificationOTP

# Questions
from app.models.question import (
    Question, 
    QuestionOption, 
    QuestionExam, 
    QuestionSource, 
    AnswerVerification, 
    QuestionSet,
    QuestionSourceType, 
    QuestionAnswerStatus, 
    QuestionDifficulty
)

# Test Sessions & Mistakes
from app.models.quiz_session import (
    TestSession, 
    TestQuestion, 
    TestAnswer, 
    Mistake, 
    Bookmark, 
    FocusEvent, 
    UserTopicStats,
    QuizSession,
    QuizResponse,
    WeakTopicTracker
)

# Documents
from app.models.pdf_document import (
    Document, 
    DocumentProcessingJob, 
    PDFQuestionDraft, 
    PDFDocument
)

# Engagement
from app.models.engagement import (
    Notification, 
    Achievement, 
    Report, 
    AdminAction
)

# Current Affairs
from app.models.current_affairs import DailyCurrentAffair

# AI
from app.models.ai import (
    AIConversation, 
    AIMessage, 
    AIUsageLog
)

__all__ = [
    "db",
    "generate_uuid",
    "TimestampMixin",
    "Exam",
    "Subject",
    "Topic",
    "Subtopic",
    "User",
    "UserProfile",
    "DailyGoal",
    "Streak",
    "EmailVerificationOTP",
    "Question",
    "QuestionOption",
    "QuestionExam",
    "QuestionSource",
    "AnswerVerification",
    "QuestionSet",
    "QuestionSourceType",
    "QuestionAnswerStatus",
    "QuestionDifficulty",
    "TestSession",
    "TestQuestion",
    "TestAnswer",
    "Mistake",
    "Bookmark",
    "FocusEvent",
    "UserTopicStats",
    "QuizSession",
    "QuizResponse",
    "WeakTopicTracker",
    "Document",
    "DocumentProcessingJob",
    "PDFQuestionDraft",
    "PDFDocument",
    "DailyCurrentAffair",
    "Notification",
    "Achievement",
    "Report",
    "AdminAction",
    "AIConversation",
    "AIMessage",
    "AIUsageLog",
]

