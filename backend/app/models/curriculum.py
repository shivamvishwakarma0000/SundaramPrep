from datetime import datetime
from app.models.core import db, generate_uuid

class Exam(db.Model):
    __tablename__ = "exams"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)  # UPSC_CSE, SSC_CGL, BANK_PO, etc.
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), default="National", index=True)  # Civil Services, Banking, SSC, Defence, State
    icon_url = db.Column(db.String(500), nullable=True)
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "icon_url": self.icon_url,
            "is_active": self.is_active,
        }

class Subject(db.Model):
    __tablename__ = "subjects"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(100), unique=True, nullable=False, index=True)  # Indian Polity, Modern History, etc.
    code = db.Column(db.String(50), unique=True, nullable=True)
    description = db.Column(db.Text, nullable=True)
    icon_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    topics = db.relationship("Topic", backref="subject", lazy="dynamic", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "description": self.description,
            "icon_url": self.icon_url,
        }

class Topic(db.Model):
    __tablename__ = "topics"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    subject_id = db.Column(db.String(36), db.ForeignKey("subjects.id"), nullable=False, index=True)
    name = db.Column(db.String(150), nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    importance_weight = db.Column(db.Float, default=1.0)  # High-yield weighting
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    subtopics = db.relationship("Subtopic", backref="topic", lazy="dynamic", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "subject_id": self.subject_id,
            "name": self.name,
            "description": self.description,
            "importance_weight": self.importance_weight,
        }

class Subtopic(db.Model):
    __tablename__ = "subtopics"
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    topic_id = db.Column(db.String(36), db.ForeignKey("topics.id"), nullable=False, index=True)
    name = db.Column(db.String(150), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            "id": self.id,
            "topic_id": self.topic_id,
            "name": self.name,
        }
