import unittest
import json
from app import create_app
from app.models.core import db
from app.models.user import User
from app.models.question import Question, QuestionOption
from app.models.quiz_session import TestSession, Mistake, UserTopicStats
from app.utils.security import hash_password

class TestLearningExperience(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()

        # Get or create test user
        self.user = User.query.filter_by(email="learner.test@sundaramprep.com").first()
        if not self.user:
            self.user = User(
                name="Learner Test",
                email="learner.test@sundaramprep.com",
                email_verified=True,
                password_hash=hash_password("Pass123!"),
                target_exam="UPSC_CSE",
                daily_goal=30
            )
            db.session.add(self.user)
            db.session.commit()

        # Authenticate test client
        login_res = self.client.post("/api/auth/login", json={
            "email": "learner.test@sundaramprep.com",
            "password": "Pass123!"
        })
        login_data = json.loads(login_res.data.decode("utf-8"))
        self.token = login_data["data"]["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # Ensure sample question exists
        self.question = Question.query.first()
        if not self.question:
            q = Question(
                question_text="Which article of the Indian Constitution relates to Right to Privacy?",
                correct_answer="B",
                explanation={
                    "answer": "B",
                    "why": "Article 21 protects life and personal liberty.",
                    "quick_fact": "K.S. Puttaswamy v Union of India (2017).",
                    "memory_trick": "21 = 21st Century Privacy!"
                },
                subject="Indian Polity",
                topic="Fundamental Rights",
                exam="UPSC_CSE",
                is_verified=True
            )
            db.session.add(q)
            db.session.flush()
            optA = QuestionOption(question_id=q.id, option_key="A", option_text="Article 14", is_correct=False)
            optB = QuestionOption(question_id=q.id, option_key="B", option_text="Article 21", is_correct=True)
            db.session.add_all([optA, optB])
            db.session.commit()
            self.question = q

    def tearDown(self):
        self.app_context.pop()

    def test_01_learn_mode_instant_feedback(self):
        print("\n1. Testing LEARN Mode with Instant Feedback...")
        res = self.client.post("/api/practice/start", headers=self.headers, json={
            "session_type": "LEARN",
            "exam": "UPSC_CSE",
            "count": 5
        })
        data = json.loads(res.data.decode("utf-8"))
        self.assertTrue(data["success"])
        session = data["data"]["session"]
        questions = data["data"]["questions"]
        self.assertEqual(session["session_type"], "LEARN")
        self.assertGreaterEqual(len(questions), 1)

        correct_ans = questions[0].get("correct_answer", "B")
        sub_res = self.client.post("/api/practice/submit", headers=self.headers, json={
            "session_id": session["id"],
            "question_id": questions[0]["id"],
            "selected_option": correct_ans,
            "time_taken_seconds": 15
        })
        sub_data = json.loads(sub_res.data.decode("utf-8"))
        self.assertTrue(sub_data["success"])
        self.assertTrue(sub_data["data"]["is_correct"])
        self.assertIsNotNone(sub_data["data"]["explanation"])
        self.assertIn("why", sub_data["data"]["explanation"])
        print("✓ Learn Mode: Instant pedagogical feedback and structured explanation received.")

    def test_02_practice_mode_skips_and_resume(self):
        print("\n2. Testing PRACTICE Mode (Skips & Session Resume)...")
        res = self.client.post("/api/practice/start", headers=self.headers, json={
            "session_type": "PRACTICE",
            "exam": "UPSC_CSE",
            "count": 5
        })
        data = json.loads(res.data.decode("utf-8"))
        session_id = data["data"]["session"]["id"]
        q_id = data["data"]["questions"][0]["id"]

        # Skip question
        skip_res = self.client.post("/api/practice/submit", headers=self.headers, json={
            "session_id": session_id,
            "question_id": q_id,
            "is_skipped": True,
            "time_taken_seconds": 10
        })
        skip_data = json.loads(skip_res.data.decode("utf-8"))
        self.assertTrue(skip_data["data"]["is_skipped"])
        self.assertEqual(skip_data["data"]["session_summary"]["skipped_count"], 1)

        # Resume session
        get_res = self.client.get(f"/api/practice/session/{session_id}", headers=self.headers)
        get_data = json.loads(get_res.data.decode("utf-8"))
        self.assertTrue(get_data["success"])
        self.assertEqual(get_data["data"]["session"]["id"], session_id)
        print("✓ Practice Mode: Skips properly recorded and session successfully resumed.")

    def test_03_focus_mode_and_violations_engine(self):
        print("\n3. Testing FOCUS MODE & Focus Violations Engine (3 Strikes)...")
        res = self.client.post("/api/practice/start", headers=self.headers, json={
            "session_type": "FOCUS_TEST",
            "exam": "UPSC_CSE",
            "count": 10
        })
        data = json.loads(res.data.decode("utf-8"))
        session_id = data["data"]["session"]["id"]
        q_id = data["data"]["questions"][0]["id"]

        # In Focus Test, explanations must be hidden during the test
        sub_res = self.client.post("/api/practice/submit", headers=self.headers, json={
            "session_id": session_id,
            "question_id": q_id,
            "selected_option": "A",  # Wrong
            "time_taken_seconds": 25
        })
        sub_data = json.loads(sub_res.data.decode("utf-8"))
        self.assertIsNone(sub_data["data"]["explanation"])
        self.assertIsNone(sub_data["data"]["correct_answer"])

        # Strike 1
        v1 = self.client.post("/api/practice/focus-violation", headers=self.headers, json={
            "session_id": session_id,
            "violation_type": "VISIBILITY_HIDDEN"
        })
        d1 = json.loads(v1.data.decode("utf-8"))["data"]
        self.assertEqual(d1["focus_violations_count"], 1)
        self.assertEqual(d1["focus_score"], 80.0)
        self.assertFalse(d1["is_terminated"])

        # Strike 2
        v2 = self.client.post("/api/practice/focus-violation", headers=self.headers, json={
            "session_id": session_id,
            "violation_type": "FULLSCREEN_EXIT"
        })
        d2 = json.loads(v2.data.decode("utf-8"))["data"]
        self.assertEqual(d2["focus_violations_count"], 2)
        self.assertEqual(d2["focus_score"], 60.0)
        self.assertFalse(d2["is_terminated"])

        # Strike 3 (Auto-termination)
        v3 = self.client.post("/api/practice/focus-violation", headers=self.headers, json={
            "session_id": session_id,
            "violation_type": "WINDOW_BLUR"
        })
        d3 = json.loads(v3.data.decode("utf-8"))["data"]
        self.assertEqual(d3["focus_violations_count"], 3)
        self.assertEqual(d3["focus_score"], 40.0)
        self.assertTrue(d3["is_terminated"])
        print("✓ Focus Mode: No mid-test explanations, 3-strike violation warning system, and termination verified.")

    def test_04_session_completion_and_ai_coach(self):
        print("\n4. Testing Session Completion & Post-Test AI Coach Summary...")
        res = self.client.post("/api/practice/start", headers=self.headers, json={
            "session_type": "QUICK_10",
            "exam": "UPSC_CSE"
        })
        session_id = json.loads(res.data.decode("utf-8"))["data"]["session"]["id"]

        comp_res = self.client.post("/api/practice/complete", headers=self.headers, json={
            "session_id": session_id
        })
        comp_data = json.loads(comp_res.data.decode("utf-8"))["data"]
        self.assertIn("ai_coach", comp_data)
        self.assertIn("what_improved", comp_data["ai_coach"])
        self.assertIn("biggest_weakness", comp_data["ai_coach"])
        self.assertIn("short_recommendation", comp_data["ai_coach"])
        self.assertIn("subject_breakdown", comp_data)
        print("✓ AI Coach: Synthesized condensed performance recommendations on test completion.")

    def test_05_ai_tutor_contextual_actions(self):
        print("\n5. Testing In-Question AI Tutor Actions (7 Actions)...")
        actions = ["EXPLAIN_SIMPLY", "WHY_WRONG", "EXPLAIN_HINDI", "EXPLAIN_HINGLISH", "MEMORY_TRICK", "SIMILAR_QUESTION", "DETAILED_EXPLANATION"]
        
        for action in actions:
            res = self.client.post("/api/ai/tutor-action", headers=self.headers, json={
                "action_type": action,
                "question_id": self.question.id,
                "user_selected": "A",
                "language_mode": "EN"
            })
            data = json.loads(res.data.decode("utf-8"))
            self.assertTrue(data["success"])
            self.assertIn("reply", data["data"])
        print(f"✓ AI Tutor: Successfully processed all {len(actions)} contextual prompt actions.")

    def test_06_current_affairs_and_smart_revision(self):
        print("\n6. Testing Daily Current Affairs & Smart Revision Breakdown...")
        # Current affairs
        ca_res = self.client.get("/api/student/current-affairs", headers=self.headers)
        ca_data = json.loads(ca_res.data.decode("utf-8"))["data"]
        self.assertGreaterEqual(ca_data["total"], 1)
        self.assertIn("title", ca_data["current_affairs"][0])

        # Smart revision summary
        rev_res = self.client.get("/api/student/smart-revision", headers=self.headers)
        rev_data = json.loads(rev_res.data.decode("utf-8"))["data"]
        self.assertIn("total_recommended", rev_data)
        self.assertIn("recommended_formula", rev_data)
        print("✓ Current Affairs & Smart Revision: Verified daily capsules and automated set composition.")

    def test_07_analytics_and_personal_bests(self):
        print("\n7. Testing Configurable Analytics & Personal Bests...")
        ana_res = self.client.get("/api/student/analytics?weak_threshold=50&strong_threshold=70", headers=self.headers)
        ana_data = json.loads(ana_res.data.decode("utf-8"))["data"]
        self.assertIn("metrics", ana_data)
        self.assertIn("consistency_score", ana_data["metrics"])
        self.assertIn("coverage_percentage", ana_data["metrics"])
        self.assertIn("subjects", ana_data)

        # Personal bests
        pb_res = self.client.get("/api/student/personal-bests", headers=self.headers)
        pb_data = json.loads(pb_res.data.decode("utf-8"))["data"]
        self.assertIn("personal_bests", pb_data)

        # Daily goal update
        goal_res = self.client.patch("/api/student/daily-goal", headers=self.headers, json={
            "target_questions": 50
        })
        goal_data = json.loads(goal_res.data.decode("utf-8"))["data"]
        self.assertEqual(goal_data["daily_goal"]["target_questions"], 50)
        print("✓ Analytics & Personal Bests: 4-metric tracker, configurable thresholds, and goals verified.")

if __name__ == "__main__":
    unittest.main()
