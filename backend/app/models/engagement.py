from datetime import datetime
from app.models.core import db, generate_uuid

class Notification(db.Model):
    __tablename__ = "notifications"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), default="INFO")  # STREAK_REMINDER, DAILY_GOAL, WEAK_TOPIC, EXAM_ALERT
    is_read = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class Achievement(db.Model):
    __tablename__ = "achievements"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    code = db.Column(db.String(50), nullable=False)  # "SEVEN_DAY_STREAK", "ACCURACY_MASTER"
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    icon_url = db.Column(db.String(500), nullable=True)
    unlocked_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'code', name='uq_user_achievement_code'),
    )
    
    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "title": self.title,
            "description": self.description,
            "icon_url": self.icon_url,
            "unlocked_at": self.unlocked_at.isoformat() if self.unlocked_at else None,
        }

class Report(db.Model):
    __tablename__ = "reports"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True, index=True)
    question_id = db.Column(db.String(36), db.ForeignKey("questions.id"), nullable=False, index=True)
    issue_type = db.Column(db.String(50), nullable=False)  # TYPO, WRONG_ANSWER, AMBIGUOUS_OPTIONS, OUTDATED
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default="PENDING", index=True)  # PENDING, RESOLVED, REJECTED
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            "id": self.id,
            "question_id": self.question_id,
            "issue_type": self.issue_type,
            "description": self.description,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class AdminAction(db.Model):
    __tablename__ = "admin_actions"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    admin_user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    action_name = db.Column(db.String(100), nullable=False)  # "VERIFY_QUESTION", "UPDATE_SYLLABUS"
    target_type = db.Column(db.String(50), nullable=False)  # "QUESTION", "USER", "EXAM"
    target_id = db.Column(db.String(36), nullable=False)
    details = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
