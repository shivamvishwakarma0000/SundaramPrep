import logging
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from app.models.core import db
from app.models.question import Question
from app.models.quiz_session import Mistake, UserTopicStats, TestAnswer

logger = logging.getLogger(__name__)

class SmartRevisionService:
    """
    Automated Smart Revision Engine for Sundaram Prep.
    Synthesizes optimal revision sets balancing:
    1. Unresolved & Repeated Mistakes (high priority)
    2. Algorithmic Weak Topics (weakness_score >= 0.50)
    3. Daily Current Affairs MCQs
    4. Spaced repetition candidate questions
    """

    @staticmethod
    def get_revision_summary(user_id: str, target_exam: str = "UPSC_CSE") -> Dict[str, Any]:
        """Returns counts and breakdown of candidate questions for today's revision."""
        # 1. Mistakes count
        mistakes_count = Mistake.query.filter_by(user_id=user_id, is_resolved=False).count()
        repeated_mistakes = Mistake.query.filter_by(user_id=user_id, is_resolved=False)\
            .filter(Mistake.repeated_mistakes_count > 1).count()

        # 2. Weak topics count
        weak_topics_count = UserTopicStats.query.filter_by(user_id=user_id)\
            .filter(UserTopicStats.weakness_score >= 0.50).count()

        # 3. Current affairs available
        ca_count = Question.query.filter_by(source_type="CURRENT_AFFAIRS").count()

        total_recommended = min(25, max(10, mistakes_count + (weak_topics_count * 2) + min(5, ca_count)))

        return {
            "total_recommended": total_recommended,
            "mistakes_count": mistakes_count,
            "repeated_mistakes_count": repeated_mistakes,
            "weak_topics_count": weak_topics_count,
            "current_affairs_count": ca_count,
            "recommended_formula": f"{min(12, mistakes_count)} mistakes · {min(8, weak_topics_count * 3)} weak-topic · {min(5, ca_count)} current affairs"
        }

    @staticmethod
    def generate_revision_questions(user_id: str, target_exam: str = "UPSC_CSE", target_count: int = 25) -> List[Question]:
        """
        Assembles a prioritized list of Question objects for the revision session.
        """
        questions: List[Question] = []
        selected_ids = set()

        # 1. Unresolved Mistakes (up to 50% of quota)
        mistake_limit = max(5, target_count // 2)
        mistakes = Mistake.query.filter_by(user_id=user_id, is_resolved=False)\
            .order_by(Mistake.repeated_mistakes_count.desc(), Mistake.last_mistake_at.desc())\
            .limit(mistake_limit).all()

        for m in mistakes:
            q = Question.query.get(m.question_id)
            if q and q.id not in selected_ids:
                questions.append(q)
                selected_ids.add(q.id)

        # 2. Weak Topic Questions (up to 30% of quota)
        weak_topics = UserTopicStats.query.filter_by(user_id=user_id)\
            .order_by(UserTopicStats.weakness_score.desc())\
            .limit(3).all()

        for wt in weak_topics:
            if len(questions) >= target_count - 5:
                break
            topic_qs = Question.query.filter_by(exam=target_exam, topic=wt.topic_id)\
                .limit(4).all()
            for q in topic_qs:
                if q.id not in selected_ids:
                    questions.append(q)
                    selected_ids.add(q.id)
                    if len(questions) >= target_count - 5:
                        break

        # 3. Current Affairs Questions (up to 20% of quota)
        ca_qs = Question.query.filter_by(source_type="CURRENT_AFFAIRS")\
            .order_by(Question.created_at.desc())\
            .limit(5).all()

        for q in ca_qs:
            if len(questions) >= target_count:
                break
            if q.id not in selected_ids:
                questions.append(q)
                selected_ids.add(q.id)

        # 4. Fallback filler if pool is small
        if len(questions) < target_count:
            filler = Question.query.filter_by(exam=target_exam)\
                .limit(target_count - len(questions)).all()
            for q in filler:
                if q.id not in selected_ids:
                    questions.append(q)
                    selected_ids.add(q.id)

        if not questions:
            questions = Question.query.limit(target_count).all()

        return questions[:target_count]

smart_revision_service = SmartRevisionService()
