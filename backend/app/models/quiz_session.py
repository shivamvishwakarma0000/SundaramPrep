from datetime import datetime
from app.models.core import db, generate_uuid

class TestSession(db.Model):
    __tablename__ = "test_sessions"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True, index=True)
    session_type = db.Column(db.String(30), default="PRACTICE", index=True)  # PRACTICE, FOCUS_TEST, QUICK_10, WEAK_REVISION
    
    exam_id = db.Column(db.String(50), nullable=False, default="UPSC_CSE", index=True)
    subject_id = db.Column(db.String(36), nullable=True)
    topic_id = db.Column(db.String(36), nullable=True)
    
    total_questions = db.Column(db.Integer, default=0)
    correct_count = db.Column(db.Integer, default=0)
    incorrect_count = db.Column(db.Integer, default=0)
    unattempted_count = db.Column(db.Integer, default=0)
    
    score = db.Column(db.Float, default=0.0)
    accuracy = db.Column(db.Float, default=0.0)
    time_spent_seconds = db.Column(db.Integer, default=0)
    time_limit_seconds = db.Column(db.Integer, nullable=True)  # e.g., 6000 for 100 mins
    skipped_count = db.Column(db.Integer, default=0)
    focus_score = db.Column(db.Float, default=100.0)  # Distinct from marks; tracks focus adherence
    focus_violations_count = db.Column(db.Integer, default=0)  # 0, 1, 2, 3
    ai_coach_summary = db.Column(db.JSON, nullable=True)  # {what_improved, biggest_weakness, what_to_practice_next, recommendation}
    status = db.Column(db.String(30), default="IN_PROGRESS", index=True)  # IN_PROGRESS, COMPLETED, ABANDONED, TERMINATED_VIOLATION
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    answers = db.relationship("TestAnswer", backref="session", lazy="dynamic", cascade="all, delete-orphan")
    session_questions = db.relationship("TestQuestion", backref="session", lazy="dynamic", cascade="all, delete-orphan")
    focus_events = db.relationship("FocusEvent", backref="session", lazy="dynamic", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "session_type": self.session_type,
            "exam_id": self.exam_id,
            "subject_id": self.subject_id,
            "topic_id": self.topic_id,
            "total_questions": self.total_questions,
            "correct_count": self.correct_count,
            "incorrect_count": self.incorrect_count,
            "unattempted_count": self.unattempted_count,
            "skipped_count": self.skipped_count,
            "score": round(self.score, 2),
            "accuracy": round(self.accuracy, 1),
            "time_spent_seconds": self.time_spent_seconds,
            "time_limit_seconds": self.time_limit_seconds,
            "focus_score": round(self.focus_score, 1),
            "focus_violations_count": self.focus_violations_count,
            "ai_coach_summary": self.ai_coach_summary,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }

class TestQuestion(db.Model):
    __tablename__ = "test_questions"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    session_id = db.Column(db.String(36), db.ForeignKey("test_sessions.id"), nullable=False, index=True)
    question_id = db.Column(db.String(36), db.ForeignKey("questions.id"), nullable=False, index=True)
    order_index = db.Column(db.Integer, default=0)
    
    __table_args__ = (
        db.Index('idx_test_question_session_order', 'session_id', 'order_index'),
    )

class TestAnswer(db.Model):
    """Stores every user question attempt for analytics (Section 5)"""
    __tablename__ = "test_answers"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True, index=True)
    session_id = db.Column(db.String(36), db.ForeignKey("test_sessions.id"), nullable=False, index=True)
    question_id = db.Column(db.String(36), db.ForeignKey("questions.id"), nullable=False, index=True)
    
    selected_option = db.Column(db.String(10), nullable=True)  # "A", "B", etc.
    correct = db.Column(db.Boolean, default=False, nullable=False, index=True)
    time_taken = db.Column(db.Integer, default=0)  # seconds taken on this question
    confidence_level = db.Column(db.String(20), default="MEDIUM")  # HIGH, MEDIUM, LOW, GUESS
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    __table_args__ = (
        db.Index('idx_test_answers_user_correct', 'user_id', 'correct'),
        db.Index('idx_test_answers_user_created', 'user_id', 'created_at'),
    )
    
    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "question_id": self.question_id,
            "selected_option": self.selected_option,
            "correct": self.correct,
            "time_taken": self.time_taken,
            "confidence_level": self.confidence_level,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class Mistake(db.Model):
    """Section 6: Mistake Engine automatically recording and analyzing incorrect answers"""
    __tablename__ = "mistakes"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    question_id = db.Column(db.String(36), db.ForeignKey("questions.id"), nullable=False, index=True)
    topic_id = db.Column(db.String(100), nullable=True, index=True)
    
    first_mistake_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_mistake_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    attempt_count = db.Column(db.Integer, default=1)
    repeated_mistakes_count = db.Column(db.Integer, default=1)
    accuracy = db.Column(db.Float, default=0.0)  # historical accuracy on this question
    is_resolved = db.Column(db.Boolean, default=False, index=True)  # True once answered correctly in 2 successive sessions
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'question_id', name='uq_user_question_mistake'),
        db.Index('idx_mistakes_user_resolved', 'user_id', 'is_resolved'),
    )
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "question_id": self.question_id,
            "topic_id": self.topic_id,
            "first_mistake_at": self.first_mistake_at.isoformat() if self.first_mistake_at else None,
            "last_mistake_at": self.last_mistake_at.isoformat() if self.last_mistake_at else None,
            "attempt_count": self.attempt_count,
            "repeated_mistakes_count": self.repeated_mistakes_count,
            "accuracy": round(self.accuracy, 2),
            "is_resolved": self.is_resolved,
        }

class Bookmark(db.Model):
    __tablename__ = "bookmarks"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    question_id = db.Column(db.String(36), db.ForeignKey("questions.id"), nullable=False, index=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'question_id', name='uq_user_question_bookmark'),
    )
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "question_id": self.question_id,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class FocusEvent(db.Model):
    """Tracks test integrity & focus deviations (e.g. window blur, exit fullscreen)"""
    __tablename__ = "focus_events"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True, index=True)
    session_id = db.Column(db.String(36), db.ForeignKey("test_sessions.id"), nullable=False, index=True)
    event_type = db.Column(db.String(50), nullable=False)  # TAB_BLUR, FULLSCREEN_EXIT, TIMEOUT
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

class UserTopicStats(db.Model):
    """Aggregated topic mastery cache for ultra-fast Neon queries"""
    __tablename__ = "user_topic_stats"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    topic_id = db.Column(db.String(150), nullable=False, index=True)
    subject = db.Column(db.String(100), nullable=False, default="General Studies")
    
    total_attempts = db.Column(db.Integer, default=0)
    correct_count = db.Column(db.Integer, default=0)
    incorrect_count = db.Column(db.Integer, default=0)
    accuracy = db.Column(db.Float, default=0.0)
    avg_time_seconds = db.Column(db.Float, default=0.0)
    weakness_score = db.Column(db.Float, default=0.0, index=True)  # error rate 0.0 - 1.0
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'topic_id', name='uq_user_topic_stats'),
        db.Index('idx_topic_stats_weakness', 'user_id', 'weakness_score'),
    )
    
    def to_dict(self):
        return {
            "topic_id": self.topic_id,
            "topic": self.topic_id,
            "subject": self.subject,
            "total_attempts": self.total_attempts,
            "attempts_count": self.total_attempts,
            "correct_count": self.correct_count,
            "incorrect_count": self.incorrect_count,
            "errors_count": self.incorrect_count,
            "accuracy": round(self.accuracy, 2),
            "weakness_score": round(self.weakness_score, 2),
            "avg_time_seconds": round(self.avg_time_seconds, 1),
        }

    @property
    def topic(self):
        return self.topic_id
    
    @topic.setter
    def topic(self, val):
        self.topic_id = val

    @property
    def attempts_count(self):
        return self.total_attempts

    @attempts_count.setter
    def attempts_count(self, val):
        self.total_attempts = val

    @property
    def errors_count(self):
        return self.incorrect_count

    @errors_count.setter
    def errors_count(self, val):
        self.incorrect_count = val

# Aliases for backward compatibility
QuizSession = TestSession
QuizResponse = TestAnswer
WeakTopicTracker = UserTopicStats
