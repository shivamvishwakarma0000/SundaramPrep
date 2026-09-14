from datetime import datetime, date
from app.models.core import db, generate_uuid, TimestampMixin

class DailyCurrentAffair(db.Model, TimestampMixin):
    """
    Daily Current Affairs capsules verified against authoritative sources
    (The Hindu, Indian Express, PIB, Economic Survey, etc.)
    Preserved for backward compatibility.
    """
    __tablename__ = "daily_current_affairs"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    date = db.Column(db.Date, default=date.today, nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    summary = db.Column(db.Text, nullable=False)
    topic = db.Column(db.String(150), nullable=False, default="General Studies", index=True)
    source = db.Column(db.String(100), nullable=False, default="PIB / Press Information Bureau")
    source_reference = db.Column(db.String(255), nullable=True)
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


class NewsArticle(db.Model, TimestampMixin):
    """
    Production-grade UPSC News & Current Affairs entity with AI-processed
    pedagogical dimensions, Prelims facts, Mains analysis, and practice MCQs.
    """
    __tablename__ = "news_articles"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    title = db.Column(db.String(350), nullable=False, index=True)
    original_url = db.Column(db.String(1000), nullable=False, default="#")
    source = db.Column(db.String(120), nullable=False, default="PIB", index=True)
    source_logo = db.Column(db.String(255), nullable=True)
    published_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    fetched_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Categorization & UPSC Syllabus Tagging
    category = db.Column(db.String(100), nullable=False, default="Polity & Governance", index=True)
    gs_paper = db.Column(db.String(50), nullable=False, default="GS-II", index=True)  # GS-I, GS-II, GS-III, GS-IV, Essay
    image_url = db.Column(db.String(1000), nullable=True)
    relevance_score = db.Column(db.Integer, default=85, index=True)  # 0 to 100
    is_featured = db.Column(db.Boolean, default=False, index=True)
    is_published = db.Column(db.Boolean, default=True, index=True)
    read_time_minutes = db.Column(db.Integer, default=3)
    
    # Deduplication & Clustering
    duplicate_cluster_id = db.Column(db.String(64), nullable=True, index=True)
    additional_sources = db.Column(db.JSON, default=list)  # [{"source": "The Hindu", "url": "..."}]
    
    # Structured Content
    short_summary = db.Column(db.Text, nullable=False)
    detailed_summary = db.Column(db.Text, nullable=True)
    why_in_news = db.Column(db.Text, nullable=True)
    what_happened = db.Column(db.Text, nullable=True)
    background = db.Column(db.Text, nullable=True)
    upsc_relevance = db.Column(db.Text, nullable=True)
    
    # JSON Structures for Pedagogical Depth
    key_facts = db.Column(db.JSON, default=list)            # ["Fact 1", "Fact 2"]
    prelims_facts = db.Column(db.JSON, default=list)        # ["Constitutional Art 21", "Statutory cite"]
    mains_perspective = db.Column(db.JSON, default=dict)    # {"dimensions": [], "challenges": [], "way_forward": ""}
    important_terms = db.Column(db.JSON, default=list)      # ["Proportionality", "Habeas Corpus"]
    possible_mains_questions = db.Column(db.JSON, default=list) # ["Q1 (150 words)..."]
    practice_mcqs = db.Column(db.JSON, default=list)        # [{"question": "...", "options": [...], "correct_answer": "A", "explanation": "..."}]
    
    # On-demand Cached AI Transformations
    simple_explanation = db.Column(db.Text, nullable=True)
    hindi_explanation = db.Column(db.Text, nullable=True)
    hinglish_explanation = db.Column(db.Text, nullable=True)
    prelims_notes = db.Column(db.Text, nullable=True)
    mains_notes = db.Column(db.Text, nullable=True)
    
    # View & Engagement Metrics
    views_count = db.Column(db.Integer, default=0)
    bookmarks_count = db.Column(db.Integer, default=0)

    __table_args__ = (
        db.Index('idx_news_pub_category', 'published_at', 'category'),
        db.Index('idx_news_relevance_pub', 'relevance_score', 'published_at'),
    )

    def to_dict(self, include_full_analysis: bool = True):
        data = {
            "id": self.id,
            "title": self.title,
            "original_url": self.original_url,
            "source": self.source,
            "source_logo": self.source_logo,
            "image_url": self.image_url,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "category": self.category,
            "gs_paper": self.gs_paper,
            "relevance_score": self.relevance_score,
            "is_featured": self.is_featured,
            "read_time_minutes": self.read_time_minutes,
            "short_summary": self.short_summary,
            "why_in_news": self.why_in_news,
            "upsc_relevance": self.upsc_relevance,
            "important_terms": self.important_terms or [],
            "additional_sources": self.additional_sources or [],
            "views_count": self.views_count or 0,
            "bookmarks_count": self.bookmarks_count or 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        
        if include_full_analysis:
            data.update({
                "detailed_summary": self.detailed_summary or self.short_summary,
                "what_happened": self.what_happened or self.short_summary,
                "background": self.background,
                "key_facts": self.key_facts or [],
                "prelims_facts": self.prelims_facts or [],
                "mains_perspective": self.mains_perspective or {},
                "possible_mains_questions": self.possible_mains_questions or [],
                "practice_mcqs": self.practice_mcqs or [],
                "simple_explanation": self.simple_explanation,
                "hindi_explanation": self.hindi_explanation,
                "hinglish_explanation": self.hinglish_explanation,
                "prelims_notes": self.prelims_notes,
                "mains_notes": self.mains_notes,
            })
            
        return data


class NewsBookmark(db.Model, TimestampMixin):
    """Stores student saved news articles for revision."""
    __tablename__ = "news_bookmarks"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    article_id = db.Column(db.String(36), db.ForeignKey("news_articles.id", ondelete="CASCADE"), nullable=False, index=True)
    notes = db.Column(db.Text, nullable=True)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'article_id', name='uq_user_news_bookmark'),
    )

    article = db.relationship("NewsArticle", backref=db.backref("bookmarks", cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "article_id": self.article_id,
            "notes": self.notes,
            "article": self.article.to_dict(include_full_analysis=False) if self.article else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PushSubscription(db.Model, TimestampMixin):
    """Stores Web Push API browser subscriptions."""
    __tablename__ = "push_subscriptions"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    endpoint = db.Column(db.String(1000), unique=True, nullable=False, index=True)
    p256dh_key = db.Column(db.String(255), nullable=False)
    auth_key = db.Column(db.String(255), nullable=False)
    user_agent = db.Column(db.String(300), nullable=True)
    is_active = db.Column(db.Boolean, default=True, index=True)
    last_sent_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "endpoint": self.endpoint,
            "is_active": self.is_active,
            "last_sent_at": self.last_sent_at.isoformat() if self.last_sent_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class NotificationPreference(db.Model, TimestampMixin):
    """Configures student push notification frequencies, quiet hours & category filters."""
    __tablename__ = "notification_preferences"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    enabled = db.Column(db.Boolean, default=True, index=True)
    frequency = db.Column(db.String(30), default="HOURLY") # HOURLY, EVERY_2_HOURS, THRICE_DAILY, DAILY_DIGEST, OFF
    preferred_morning_time = db.Column(db.String(10), default="08:00")
    preferred_afternoon_time = db.Column(db.String(10), default="13:00")
    preferred_evening_time = db.Column(db.String(10), default="19:00")
    categories_filter = db.Column(db.JSON, default=list) # e.g. ["Polity & Governance", "Economy"]
    last_notified_at = db.Column(db.DateTime, nullable=True)
    last_read_article_id = db.Column(db.String(36), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "enabled": self.enabled,
            "frequency": self.frequency,
            "preferred_morning_time": self.preferred_morning_time,
            "preferred_afternoon_time": self.preferred_afternoon_time,
            "preferred_evening_time": self.preferred_evening_time,
            "categories_filter": self.categories_filter or [],
            "last_notified_at": self.last_notified_at.isoformat() if self.last_notified_at else None,
        }
