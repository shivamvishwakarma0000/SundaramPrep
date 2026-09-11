from datetime import datetime
from app.models.core import db, generate_uuid, TimestampMixin

class AIConversation(db.Model, TimestampMixin):
    __tablename__ = "ai_conversations"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True, index=True)
    title = db.Column(db.String(150), nullable=False, default="Study Session")
    context_type = db.Column(db.String(50), nullable=True)  # "QUESTION", "TOPIC", "GENERAL"
    context_id = db.Column(db.String(36), nullable=True)
    
    messages = db.relationship("AIMessage", backref="conversation", lazy="dynamic", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "context_type": self.context_type,
            "context_id": self.context_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class AIMessage(db.Model):
    __tablename__ = "ai_messages"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    conversation_id = db.Column(db.String(36), db.ForeignKey("ai_conversations.id"), nullable=False, index=True)
    sender = db.Column(db.String(20), nullable=False)  # "user" | "assistant"
    content = db.Column(db.Text, nullable=False)
    structured_sections = db.Column(db.JSON, nullable=True)  # { answer, why, quick_fact, memory_trick }
    sources = db.Column(db.JSON, default=list)
    model_used = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "sender": self.sender,
            "content": self.content,
            "structured_sections": self.structured_sections,
            "sources": self.sources or [],
            "model_used": self.model_used,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class AIUsageLog(db.Model):
    __tablename__ = "ai_usage_logs"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True, index=True)
    action_type = db.Column(db.String(50), nullable=False)  # "TUTOR_CHAT", "VERIFY_ANSWER", "GENERATE_DRILL"
    tokens_used = db.Column(db.Integer, default=0)
    model_tier = db.Column(db.String(50), default="FAST")  # "FAST" (gpt-4o-mini) | "REASONING" (o3-mini)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
