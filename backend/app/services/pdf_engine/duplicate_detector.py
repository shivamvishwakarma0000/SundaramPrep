import re
import string
from typing import List, Tuple, Optional, Dict, Any
from app.models.question import Question

class DuplicateDetector:
    """
    Intelligent Duplicate Question Detection.
    Normalizes whitespace, punctuation, case, and numbering prefixes to compute
    Jaccard token similarity against existing Question Bank items.
    Prevents redundant question clutter while capturing multi-exam citations.
    """

    @staticmethod
    def normalize_text(text: str) -> str:
        if not text:
            return ""
        # Lowercase
        normalized = text.lower()
        # Remove question numbering prefixes e.g. "q.1", "1.", "question 1:"
        normalized = re.sub(r'^(?:q(?:uestion)?\.?\s*\d+|\d+\.|\d+\)|\([0-9]+\))\s*', '', normalized)
        # Strip punctuation
        normalized = normalized.translate(str.maketrans('', '', string.punctuation))
        # Collapse whitespace
        normalized = ' '.join(normalized.split())
        return normalized

    @classmethod
    def get_tokens(cls, text: str) -> set:
        normalized = cls.normalize_text(text)
        return set(normalized.split())

    @classmethod
    def compute_similarity(cls, text1: str, text2: str) -> float:
        tokens1 = cls.get_tokens(text1)
        tokens2 = cls.get_tokens(text2)
        if not tokens1 or not tokens2:
            return 0.0
        intersection = len(tokens1.intersection(tokens2))
        union = len(tokens1.union(tokens2))
        return float(intersection / union) if union > 0 else 0.0

    def check_duplicate(
        self,
        question_text: str,
        threshold: float = 0.82
    ) -> Tuple[bool, Optional[str], float]:
        """
        Scans existing Question Bank for duplicate question stems.
        Returns: (is_duplicate, duplicate_question_id, similarity_score)
        """
        if not question_text or len(question_text.strip()) < 15:
            return False, None, 0.0

        # Query existing questions in Question Bank
        existing_questions = Question.query.all()
        target_tokens = self.get_tokens(question_text)
        if not target_tokens:
            return False, None, 0.0

        best_match_id = None
        best_similarity = 0.0

        for q in existing_questions:
            q_tokens = self.get_tokens(q.question_text)
            if not q_tokens:
                continue
            
            # Quick length heuristic filter
            len_ratio = len(target_tokens) / max(1, len(q_tokens))
            if len_ratio < 0.6 or len_ratio > 1.6:
                continue

            intersection = len(target_tokens.intersection(q_tokens))
            union = len(target_tokens.union(q_tokens))
            sim = float(intersection / union) if union > 0 else 0.0

            if sim > best_similarity:
                best_similarity = sim
                best_match_id = q.id

            if best_similarity >= threshold:
                return True, best_match_id, round(best_similarity, 3)

        if best_similarity >= threshold:
            return True, best_match_id, round(best_similarity, 3)

        return False, None, round(best_similarity, 3)

duplicate_detector = DuplicateDetector()
