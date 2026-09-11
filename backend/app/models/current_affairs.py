from datetime import datetime, date
from app.models.core import db, generate_uuid, TimestampMixin

class DailyCurrentAffair(db.Model, TimestampMixin):
    """
    Daily Current Affairs capsules verified against authoritative sources
    (The Hindu, Indian Express, PIB, Economic Survey, etc.)
    """
    __tablename__ = "daily_current_affairs"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    date = db.Column(db.Date, default=date.today, nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    summary = db.Column(db.Text, nullable=False)
    topic = db.Column(db.String(150), nullable=False, default="General Studies", index=True)
    source = db.Column(db.String(100), nullable=False, default="PIB / Press Information Bureau")
    source_reference = db.Column(db.String(255), nullable=True)  # e.g., "PIB Release ID 205612"
    exam_relevance = db.Column(db.String(100), default="UPSC GS-II / GS-III", index=True)
    key_takeaways = db.Column(db.JSON, default=list)  # List of string bullet points
    question_ids = db.Column(db.JSON, default=list)   # List of linked question UUIDs
    
    __table_args__ = (
        db.Index('idx_current_affairs_date_topic', 'date', 'topic'),
    )
    
    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date.isoformat() if self.date else None,
            "title": self.title,
            "summary": self.summary,
            "topic": self.topic,
            "source": self.source,
            "source_reference": self.source_reference,
            "exam_relevance": self.exam_relevance,
            "key_takeaways": self.key_takeaways or [],
            "question_ids": self.question_ids or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
