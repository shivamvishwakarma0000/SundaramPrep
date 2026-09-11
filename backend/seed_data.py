from app.models.core import db
from app.models.curriculum import Exam, Subject, Topic, Subtopic
from app.models.question import Question, QuestionOption, QuestionExam, QuestionSourceType, QuestionAnswerStatus, QuestionDifficulty
from app.models.user import User, UserProfile, DailyGoal, Streak
from app.utils.security import hash_password

INITIAL_EXAMS = [
    {"code": "UPSC_CSE", "title": "UPSC Civil Services Examination", "category": "Civil Services"},
    {"code": "SSC_CGL", "title": "SSC Combined Graduate Level", "category": "Staff Selection"},
    {"code": "BANK_PO", "title": "Banking Probationary Officer (IBPS/SBI)", "category": "Banking"},
    {"code": "RAILWAY_RRB", "title": "Railway Recruitment Board (NTPC)", "category": "Railways"},
    {"code": "STATE_PSC", "title": "State Public Service Commission", "category": "State Civil Services"},
]

INITIAL_SUBJECTS = [
    {"name": "Indian Polity", "code": "POLITY", "description": "Constitution, Governance, Political System"},
    {"name": "Modern History", "code": "HISTORY", "description": "Indian National Movement 1857-1947"},
    {"name": "Economy", "code": "ECONOMY", "description": "Macroeconomics, Banking, Fiscal Policy"},
    {"name": "Geography", "code": "GEOGRAPHY", "description": "Physical, Indian and World Geography"},
    {"name": "Quantitative Aptitude", "code": "CSAT_QUANT", "description": "Basic Numeracy and Data Interpretation"},
]

SAMPLE_QUESTIONS = [
    {
        "question_text": "With reference to the Constitution of India, consider the following statements:\n1. No High Court shall have the jurisdiction to declare any central law to be constitutionally invalid.\n2. An amendment to the Constitution of India cannot be called into question by the Supreme Court of India.\nWhich of the statements given above is/are correct?",
        "options": [
            {"id": "A", "text": "1 only"},
            {"id": "B", "text": "2 only"},
            {"id": "C", "text": "Both 1 and 2"},
            {"id": "D", "text": "Neither 1 nor 2"}
        ],
        "correct_answer": "D",
        "explanation": {
            "answer": "Neither 1 nor 2 is correct (Option D).",
            "why": "High Courts possess judicial review under Article 226 and can invalidate Central laws within their territorial jurisdiction (L. Chandra Kumar case). Constitutional amendments can also be challenged if they violate the Basic Structure (Kesavananda Bharati, 1973).",
            "quick_fact": "The 42nd Amendment temporarily barred High Courts from reviewing central laws, but the 43rd Amendment (1977) restored full jurisdiction.",
            "memory_trick": "Remember 'HC + SC = Dual Shields': Both have Judicial Review power over ALL laws!"
        },
        "subject_name": "Indian Polity",
        "topic_name": "Judiciary & Judicial Review",
        "subtopic_name": "High Court Jurisdiction & Basic Structure",
        "primary_exam": "UPSC_CSE",
        "also_applicable_exams": ["STATE_PSC"],
        "difficulty": QuestionDifficulty.MEDIUM,
        "source_type": QuestionSourceType.PYQ,
        "source_reference": "UPSC CSE Prelims 2019 Paper I, Q.12",
        "answer_status": QuestionAnswerStatus.VERIFIED,
        "answer_confidence": 1.0,
        "is_verified": True,
        "language": "EN"
    },
    {
        "question_text": "Which of the following bodies is responsible for calculating the National Income and Gross Domestic Product (GDP) in India?",
        "options": [
            {"id": "A", "text": "Reserve Bank of India (RBI)"},
            {"id": "B", "text": "National Statistical Office (NSO)"},
            {"id": "C", "text": "NITI Aayog"},
            {"id": "D", "text": "Department of Economic Affairs (DEA)"}
        ],
        "correct_answer": "B",
        "explanation": {
            "answer": "National Statistical Office (NSO) under MoSPI (Option B).",
            "why": "In May 2019, the Government merged the Central Statistics Office (CSO) and the National Sample Survey Office (NSSO) to form the National Statistical Office (NSO).",
            "quick_fact": "The current base year for India's GDP calculation series is 2011-12.",
            "memory_trick": "Remember 'NSO = National Stat Output' -> Measures National Income!"
        },
        "subject_name": "Economy",
        "topic_name": "National Income Accounting",
        "subtopic_name": "GDP & Statistical Agencies",
        "primary_exam": "SSC_CGL",
        "also_applicable_exams": ["RAILWAY_RRB", "UPSC_CSE"],
        "difficulty": QuestionDifficulty.EASY,
        "source_type": QuestionSourceType.PYQ,
        "source_reference": "SSC CGL Tier-1 2022 General Awareness",
        "answer_status": QuestionAnswerStatus.VERIFIED,
        "answer_confidence": 1.0,
        "is_verified": True,
        "language": "EN"
    },
    {
        "question_text": "In the context of the Indian Economy, which of the following is/are the core component(s) of 'Priority Sector Lending' (PSL) mandated by the Reserve Bank of India?\n1. Agriculture\n2. Micro, Small and Medium Enterprises (MSMEs)\n3. Export Credit\n4. Renewable Energy\nSelect the correct answer using the code given below:",
        "options": [
            {"id": "A", "text": "1 and 2 only"},
            {"id": "B", "text": "1, 2 and 3 only"},
            {"id": "C", "text": "2 and 4 only"},
            {"id": "D", "text": "1, 2, 3 and 4"}
        ],
        "correct_answer": "D",
        "explanation": {
            "answer": "All 1, 2, 3 and 4 are categories under PSL (Option D).",
            "why": "RBI's revised PSL guidelines comprise 8 categories: Agriculture, MSME, Export Credit, Education, Housing, Social Infrastructure, Renewable Energy, and Others.",
            "quick_fact": "Domestic commercial banks and foreign banks with 20+ branches must allocate 40% of Adjusted Net Bank Credit (ANBC) to PSL.",
            "memory_trick": "PSL = 'FARM + FACTORY + GREEN' (Food, MSME, Export, Renewables, Housing) all protected!"
        },
        "subject_name": "Economy",
        "topic_name": "Monetary & Credit Policy",
        "subtopic_name": "Priority Sector Lending Norms",
        "primary_exam": "BANK_PO",
        "also_applicable_exams": ["UPSC_CSE"],
        "difficulty": QuestionDifficulty.HARD,
        "source_type": QuestionSourceType.PYQ,
        "source_reference": "IBPS PO Mains 2021 Financial Awareness",
        "answer_status": QuestionAnswerStatus.VERIFIED,
        "answer_confidence": 1.0,
        "is_verified": True,
        "language": "EN"
    },
    {
        "question_text": "Which Article of the Constitution of India safeguards one's right to marry the person of one's choice?",
        "options": [
            {"id": "A", "text": "Article 19"},
            {"id": "B", "text": "Article 21"},
            {"id": "C", "text": "Article 25"},
            {"id": "D", "text": "Article 29"}
        ],
        "correct_answer": "B",
        "explanation": {
            "answer": "Article 21 - Right to Life and Personal Liberty (Option B).",
            "why": "In the landmark Shafin Jahan v. Asokan K.M. (Hadiya case, 2018), the Supreme Court affirmed that the right to marry a person of one's choice is an integral facet of Article 21.",
            "quick_fact": "Navtej Singh Johar (2018) and K.S. Puttaswamy (2017) also anchored personal autonomy firmly inside Article 21.",
            "memory_trick": "Article 21 = 'Life + Choice + Dignity'!"
        },
        "subject_name": "Indian Polity",
        "topic_name": "Fundamental Rights",
        "subtopic_name": "Article 21 & Personal Autonomy",
        "primary_exam": "UPSC_CSE",
        "also_applicable_exams": ["STATE_PSC", "SSC_CGL"],
        "difficulty": QuestionDifficulty.MEDIUM,
        "source_type": QuestionSourceType.PYQ,
        "source_reference": "UPSC CSE Prelims 2019 Paper I, Q.24",
        "answer_status": QuestionAnswerStatus.VERIFIED,
        "answer_confidence": 1.0,
        "is_verified": True,
        "language": "EN"
    },
    {
        "question_text": "The Rowlatt Act was passed in 1919 during the viceroyalty of which of the following British Viceroys?",
        "options": [
            {"id": "A", "text": "Lord Curzon"},
            {"id": "B", "text": "Lord Chelmsford"},
            {"id": "C", "text": "Lord Hardinge II"},
            {"id": "D", "text": "Lord Irwin"}
        ],
        "correct_answer": "B",
        "explanation": {
            "answer": "Lord Chelmsford (Option B).",
            "why": "Lord Chelmsford was Viceroy from 1916 to 1921. During his tenure, the Montagu-Chelmsford Reforms (1919), Rowlatt Act (1919), and Jallianwala Bagh massacre (1919) occurred.",
            "quick_fact": "The Rowlatt Act permitted detention of suspects without trial for up to 2 years, popularly known as 'No Dalil, No Vakil, No Appeal'.",
            "memory_trick": "Chelmsford presided over 1919 = 'Rowlatt, Reforms & Tragedy'."
        },
        "subject_name": "Modern History",
        "topic_name": "National Freedom Movement (1919-1947)",
        "subtopic_name": "Rowlatt Satyagraha & Jallianwala Bagh",
        "primary_exam": "SSC_CGL",
        "also_applicable_exams": ["RAILWAY_RRB", "STATE_PSC"],
        "difficulty": QuestionDifficulty.MEDIUM,
        "source_type": QuestionSourceType.PYQ,
        "source_reference": "SSC CGL 2021 History Section",
        "answer_status": QuestionAnswerStatus.VERIFIED,
        "answer_confidence": 1.0,
        "is_verified": True,
        "language": "EN"
    }
]

def seed_normalized_database():
    print("Seeding normalized exams, subjects, topics, and many-to-many questions...")

    # 1. Seed Demo User
    demo_user = User.query.filter_by(email="aspirant@sundaramprep.com").first()
    if not demo_user:
        demo_user = User(
            name="Sundaram Aspirant",
            email="aspirant@sundaramprep.com",
            email_verified=True,
            password_hash=hash_password("DemoPass123!"),
            target_exam="UPSC_CSE",
            daily_goal=30
        )
        db.session.add(demo_user)
        db.session.flush()

        profile = UserProfile(
            user_id=demo_user.id,
            bio="Preparing for UPSC CSE & State PSC. Focus on Polity and Economy.",
            college_or_institute="IIT Delhi Alumni",
            state="Delhi",
            preferred_exam_categories=["Civil Services", "State PSC"]
        )
        streak = Streak(user_id=demo_user.id, current_streak=7, longest_streak=14)
        goal = DailyGoal(user_id=demo_user.id, target_questions=30, solved_today=18)
        db.session.add_all([profile, streak, goal])

    # 2. Seed Exams
    exam_map = {}
    for ex_data in INITIAL_EXAMS:
        exam = Exam.query.filter_by(code=ex_data["code"]).first()
        if not exam:
            exam = Exam(**ex_data)
            db.session.add(exam)
            db.session.flush()
        exam_map[ex_data["code"]] = exam

    # 3. Seed Subjects & Topics
    subj_map = {}
    for s_data in INITIAL_SUBJECTS:
        subj = Subject.query.filter_by(name=s_data["name"]).first()
        if not subj:
            subj = Subject(**s_data)
            db.session.add(subj)
            db.session.flush()
        subj_map[s_data["name"]] = subj

    # 4. Seed Questions with Options & Many-to-Many Exam links
    for q_data in SAMPLE_QUESTIONS:
        subj = subj_map.get(q_data["subject_name"])
        
        topic = None
        if subj:
            topic = Topic.query.filter_by(subject_id=subj.id, name=q_data["topic_name"]).first()
            if not topic:
                topic = Topic(subject_id=subj.id, name=q_data["topic_name"])
                db.session.add(topic)
                db.session.flush()

        subtopic = None
        if topic and q_data.get("subtopic_name"):
            subtopic = Subtopic.query.filter_by(topic_id=topic.id, name=q_data["subtopic_name"]).first()
            if not subtopic:
                subtopic = Subtopic(topic_id=topic.id, name=q_data["subtopic_name"])
                db.session.add(subtopic)
                db.session.flush()

        # Create Question
        q = Question(
            question_text=q_data["question_text"],
            correct_answer=q_data["correct_answer"],
            explanation=q_data["explanation"],
            subject_id=subj.id if subj else None,
            topic_id=topic.id if topic else None,
            subtopic_id=subtopic.id if subtopic else None,
            subject=q_data["subject_name"],
            topic=q_data["topic_name"],
            subtopic=q_data.get("subtopic_name"),
            exam=q_data["primary_exam"],
            difficulty=q_data["difficulty"],
            source_type=q_data["source_type"],
            source_reference=q_data["source_reference"],
            answer_status=q_data["answer_status"],
            answer_confidence=q_data["answer_confidence"],
            is_verified=q_data["is_verified"],
            language=q_data["language"]
        )
        db.session.add(q)
        db.session.flush()

        # Seed Normalized Options
        for opt in q_data["options"]:
            q_opt = QuestionOption(
                question_id=q.id,
                option_key=opt["id"],
                option_text=opt["text"],
                is_correct=(opt["id"] == q.correct_answer)
            )
            db.session.add(q_opt)

        # Seed Many-to-Many Exam links
        all_exams = [q_data["primary_exam"]] + q_data.get("also_applicable_exams", [])
        for ex_code in all_exams:
            if ex_code in exam_map:
                qe = QuestionExam(
                    question_id=q.id,
                    exam_id=exam_map[ex_code].id,
                    is_primary=(ex_code == q_data["primary_exam"])
                )
                db.session.add(qe)

    db.session.commit()
    print(f"Database seeded successfully with {len(SAMPLE_QUESTIONS)} questions, many-to-many exam links, and demo profile.")

if __name__ == "__main__":
    from app import create_app
    app = create_app()
    with app.app_context():
        seed_normalized_database()
