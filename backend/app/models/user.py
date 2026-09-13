from datetime import datetime, date
from app.models.core import db, generate_uuid, TimestampMixin

class User(db.Model):
    __tablename__ = "users"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    
    target_exam = db.Column(db.String(50), default="UPSC_CSE", index=True)  # UPSC_CSE, SSC_CGL, BANK_PO, etc.
    language = db.Column(db.String(10), default="EN")  # EN, HI, BILINGUAL
    avatar = db.Column(db.String(500), nullable=True)
    daily_goal = db.Column(db.Integer, default=30)  # questions per day target
    personal_bests = db.Column(db.JSON, default=dict)  # {highest_score, highest_accuracy, longest_streak, most_solved_day}
    timezone = db.Column(db.String(50), default="Asia/Kolkata")
    
    status = db.Column(db.String(20), default="ACTIVE", index=True)  # ACTIVE, SUSPENDED, PENDING
    last_login_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    profile = db.relationship("UserProfile", backref="user", uselist=False, cascade="all, delete-orphan")
    daily_goals = db.relationship("DailyGoal", backref="user", lazy="dynamic", cascade="all, delete-orphan")
    streak = db.relationship("Streak", backref="user", uselist=False, cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "email_verified": self.email_verified,
            "target_exam": self.target_exam,
            "language": self.language,
            "avatar": self.avatar,
            "daily_goal": self.daily_goal,
            "streak_count": self.streak.current_streak if self.streak else 0,
            "personal_bests": self.personal_bests or {},
            "timezone": self.timezone,
            "status": self.status,
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class UserProfile(db.Model, TimestampMixin):
    __tablename__ = "user_profiles"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), unique=True, nullable=False, index=True)
    phone_number = db.Column(db.String(20), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    college_or_institute = db.Column(db.String(200), nullable=True)
    state = db.Column(db.String(100), nullable=True)
    preferred_exam_categories = db.Column(db.JSON, default=list)  # ["Civil Services", "State PSC"]
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "phone_number": self.phone_number,
            "bio": self.bio,
            "college_or_institute": self.college_or_institute,
            "state": self.state,
            "preferred_exam_categories": self.preferred_exam_categories or [],
        }

class DailyGoal(db.Model):
    __tablename__ = "daily_goals"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    target_questions = db.Column(db.Integer, default=30)
    target_study_minutes = db.Column(db.Integer, default=60)
    solved_today = db.Column(db.Integer, default=0)
    minutes_today = db.Column(db.Integer, default=0)
    date = db.Column(db.Date, default=date.today, nullable=False, index=True)
    is_achieved = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'date', name='uq_user_daily_goal_date'),
    )
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "target_questions": self.target_questions,
            "target_study_minutes": self.target_study_minutes,
            "solved_today": self.solved_today,
            "minutes_today": self.minutes_today,
            "date": self.date.isoformat() if self.date else None,
            "is_achieved": self.is_achieved,
            "progress_percentage": min(100, int((self.solved_today / max(1, self.target_questions)) * 100))
        }

class Streak(db.Model):
    __tablename__ = "streaks"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), unique=True, nullable=False, index=True)
    current_streak = db.Column(db.Integer, default=0)
    longest_streak = db.Column(db.Integer, default=0)
    last_active_date = db.Column(db.Date, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            "current_streak": self.current_streak,
            "longest_streak": self.longest_streak,
            "last_active_date": self.last_active_date.isoformat() if self.last_active_date else None,
        }

class EmailVerificationOTP(db.Model):
    __tablename__ = "email_verification_otps"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    otp_hash = db.Column(db.String(255), nullable=False)
    purpose = db.Column(db.String(50), nullable=False, default="REGISTRATION", index=True)  # REGISTRATION, FORGOT_PASSWORD, EMAIL_CHANGE
    metadata_json = db.Column(db.JSON, nullable=True)  # e.g., {'new_email': '...'}
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    attempt_count = db.Column(db.Integer, default=0, nullable=False)
    max_attempts = db.Column(db.Integer, default=5, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    ip_address = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    user = db.relationship("User", backref=db.backref("verification_otps", cascade="all, delete-orphan"))
    
    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at
        
    def is_used(self) -> bool:
        return self.used_at is not None
        
    def is_locked(self) -> bool:
        return self.attempt_count >= self.max_attempts
        
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "email": self.email,
            "purpose": self.purpose,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "attempt_count": self.attempt_count,
            "is_expired": self.is_expired(),
            "is_used": self.is_used(),
            "is_locked": self.is_locked(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

