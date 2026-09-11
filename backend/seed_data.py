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
    },
    {
        "question_text": "A Parliamentary System of Government is one in which:",
        "options": [
            {"id": "A", "text": "All political parties in the Parliament are represented in the Government"},
            {"id": "B", "text": "The Government is responsible to the Parliament and can be removed by it"},
            {"id": "C", "text": "The Government is elected by the people and cannot be removed by the Parliament"},
            {"id": "D", "text": "The Government is chosen by the Parliament but cannot be removed before a fixed term"}
        ],
        "correct_answer": "B",
        "explanation": {
            "answer": "Option B is correct.",
            "why": "In a Parliamentary system, the Executive (Council of Ministers) is collectively responsible to the Legislature (Lok Sabha in India, Article 75(3)) and stays in power only as long as it enjoys the confidence of the House.",
            "quick_fact": "Collective responsibility is the bedrock principle of Parliamentary democracy.",
            "memory_trick": "Parliamentary = Executive answers to Parliament!"
        },
        "subject_name": "Indian Polity",
        "topic_name": "Parliamentary System & Government",
        "subtopic_name": "Executive Accountability & Collective Responsibility",
        "primary_exam": "UPSC_CSE",
        "also_applicable_exams": ["STATE_PSC", "SSC_CGL"],
        "difficulty": QuestionDifficulty.EASY,
        "source_type": QuestionSourceType.PYQ,
        "source_reference": "UPSC CSE Prelims 2020 Paper I",
        "answer_status": QuestionAnswerStatus.VERIFIED,
        "answer_confidence": 1.0,
        "is_verified": True,
        "language": "EN"
    },
    {
        "question_text": "Which one of the following suggested that the Governor should be an eminent person from outside the State and should be a detached figure without intense political links?",
        "options": [
            {"id": "A", "text": "First Administrative Reforms Commission (1966)"},
            {"id": "B", "text": "Rajamannar Committee (1969)"},
            {"id": "C", "text": "Sarkaria Commission (1983)"},
            {"id": "D", "text": "National Commission to Review the Working of the Constitution (2000)"}
        ],
        "correct_answer": "C",
        "explanation": {
            "answer": "Sarkaria Commission (Option C).",
            "why": "The Sarkaria Commission on Centre-State Relations (1988) recommended that the Governor should be an eminent person, an outsider not involved in local state politics, and not in active politics recently.",
            "quick_fact": "Punchhi Commission (2007) also reaffirmed Sarkaria's recommendations on Governors.",
            "memory_trick": "Sarkaria = Stable State-Center relations & detached Governors!"
        },
        "subject_name": "Indian Polity",
        "topic_name": "Federalism & Centre-State Relations",
        "subtopic_name": "Office of the Governor",
        "primary_exam": "UPSC_CSE",
        "also_applicable_exams": ["STATE_PSC"],
        "difficulty": QuestionDifficulty.MEDIUM,
        "source_type": QuestionSourceType.PYQ,
        "source_reference": "UPSC CSE Prelims 2019 Paper I",
        "answer_status": QuestionAnswerStatus.VERIFIED,
        "answer_confidence": 1.0,
        "is_verified": True,
        "language": "EN"
    },
    {
        "question_text": "What is the term 'Blue Carbon' used to refer to?",
        "options": [
            {"id": "A", "text": "Carbon captured by oceans and coastal ecosystems"},
            {"id": "B", "text": "Carbon sequestered in forest biomass and agricultural soils"},
            {"id": "C", "text": "Carbon contained in petroleum and natural gas reserves"},
            {"id": "D", "text": "Carbon emissions released during industrial deep-sea mining"}
        ],
        "correct_answer": "A",
        "explanation": {
            "answer": "Option A is correct.",
            "why": "Blue Carbon is the carbon captured by the world's ocean and coastal ecosystems, particularly mangroves, tidal marshes, and seagrass meadows, which store up to 10 times more carbon per hectare than terrestrial forests.",
            "quick_fact": "India's Sundarbans mangrove forest is one of the world's largest Blue Carbon sinks.",
            "memory_trick": "Blue = Ocean / Coast Carbon capture!"
        },
        "subject_name": "Geography",
        "topic_name": "Ecology & Climate Change",
        "subtopic_name": "Carbon Sinks & Coastal Ecosystems",
        "primary_exam": "UPSC_CSE",
        "also_applicable_exams": ["STATE_PSC", "SSC_CGL"],
        "difficulty": QuestionDifficulty.EASY,
        "source_type": QuestionSourceType.PYQ,
        "source_reference": "UPSC CSE Prelims 2021 Paper I",
        "answer_status": QuestionAnswerStatus.VERIFIED,
        "answer_confidence": 1.0,
        "is_verified": True,
        "language": "EN"
    },
    {
        "question_text": "With reference to the Indus river system, of the following four rivers, three of them pour into one of them which joins the Indus direct. Which one is such river that joins the Indus direct?",
        "options": [
            {"id": "A", "text": "Chenab"},
            {"id": "B", "text": "Jhelum"},
            {"id": "C", "text": "Ravi"},
            {"id": "D", "text": "Sutlej"}
        ],
        "correct_answer": "D",
        "explanation": {
            "answer": "Sutlej (Option D) / Chenab system joins at Mithankot.",
            "why": "The Jhelum and Ravi join Chenab; Chenab then meets Sutlej at Panjnad. Sutlej brings the combined waters of all five Punjab rivers and pours directly into the Indus a few miles north of Mithankot.",
            "quick_fact": "Under the Indus Water Treaty 1960, India has unrestricted rights over the three Eastern rivers: Ravi, Beas, and Sutlej.",
            "memory_trick": "Sutlej collects the Panjnad confluence into the mighty Indus!"
        },
        "subject_name": "Geography",
        "topic_name": "Indian Drainage System",
        "subtopic_name": "Indus River Basin & Tributaries",
        "primary_exam": "UPSC_CSE",
        "also_applicable_exams": ["STATE_PSC", "RAILWAY_RRB"],
        "difficulty": QuestionDifficulty.HARD,
        "source_type": QuestionSourceType.PYQ,
        "source_reference": "UPSC CSE Prelims 2021 Paper I",
        "answer_status": QuestionAnswerStatus.VERIFIED,
        "answer_confidence": 1.0,
        "is_verified": True,
        "language": "EN"
    },
    {
        "question_text": "Which of the following is/are the indicators of the 'Money Multiplier' in an economy?",
        "options": [
            {"id": "A", "text": "Increase in the Cash Reserve Ratio (CRR)"},
            {"id": "B", "text": "Increase in the banking habit of the population"},
            {"id": "C", "text": "Increase in the Statutory Liquidity Ratio (SLR)"},
            {"id": "D", "text": "Increase in the population of the country"}
        ],
        "correct_answer": "B",
        "explanation": {
            "answer": "Option B is correct.",
            "why": "Money Multiplier (m = 1/reserve ratio) increases when people deposit more money in banks rather than holding cash in hand, because commercial banks can create more credit from deposits.",
            "quick_fact": "Higher CRR or SLR decreases the money multiplier because banks must lock away more reserves.",
            "memory_trick": "More Banking Habit = Higher Deposits = Greater Credit Creation!"
        },
        "subject_name": "Economy",
        "topic_name": "Banking & Monetary Policy",
        "subtopic_name": "Money Multiplier & Credit Creation",
        "primary_exam": "UPSC_CSE",
        "also_applicable_exams": ["BANK_PO", "SSC_CGL"],
        "difficulty": QuestionDifficulty.MEDIUM,
        "source_type": QuestionSourceType.PYQ,
        "source_reference": "UPSC CSE Prelims 2019 Paper I",
        "answer_status": QuestionAnswerStatus.VERIFIED,
        "answer_confidence": 1.0,
        "is_verified": True,
        "language": "EN"
    },
    {
        "question_text": "Consider the following statements regarding the Preamble of the Constitution of India:\n1. The Preamble is a part of the Constitution.\n2. It has an independent legal effect apart from other provisions.\nWhich of the statements given above is/are correct?",
        "options": [
            {"id": "A", "text": "1 only"},
            {"id": "B", "text": "2 only"},
            {"id": "C", "text": "Both 1 and 2"},
            {"id": "D", "text": "Neither 1 nor 2"}
        ],
        "correct_answer": "A",
        "explanation": {
            "answer": "Option A (1 only) is correct.",
            "why": "In Kesavananda Bharati (1973), the Supreme Court ruled that Preamble is an integral part of the Constitution. However, it is non-justiciable and has no independent legal effect without the substantive provisions.",
            "quick_fact": "The 42nd Amendment added the words 'Socialist, Secular, and Integrity' to the Preamble in 1976.",
            "memory_trick": "Preamble = Part of Constitution, but NOT self-enforcing alone!"
        },
        "subject_name": "Indian Polity",
        "topic_name": "Constitutional Framework",
        "subtopic_name": "Preamble & Basic Structure",
        "primary_exam": "UPSC_CSE",
        "also_applicable_exams": ["STATE_PSC", "SSC_CGL"],
        "difficulty": QuestionDifficulty.MEDIUM,
        "source_type": QuestionSourceType.PYQ,
        "source_reference": "UPSC CSE Prelims 2020 Paper I",
        "answer_status": QuestionAnswerStatus.VERIFIED,
        "answer_confidence": 1.0,
        "is_verified": True,
        "language": "EN"
    },
    {
        "question_text": "In India, which one of the following is responsible for maintaining price stability by controlling inflation?",
        "options": [
            {"id": "A", "text": "Department of Consumer Affairs"},
            {"id": "B", "text": "Expenditure Management Commission"},
            {"id": "C", "text": "Financial Stability and Development Council"},
            {"id": "D", "text": "Reserve Bank of India (RBI)"}
        ],
        "correct_answer": "D",
        "explanation": {
            "answer": "Reserve Bank of India (Option D).",
            "why": "Under the amended RBI Act 1934 (2016), the primary objective of monetary policy is to maintain price stability with a target of 4% (+/- 2%) Consumer Price Index (CPI) inflation while keeping in mind the objective of growth.",
            "quick_fact": "The Monetary Policy Committee (MPC) has 6 members and meets at least 4 times a year.",
            "memory_trick": "Price Stability & Inflation Targeting = RBI Mandate!"
        },
        "subject_name": "Economy",
        "topic_name": "Monetary Policy",
        "subtopic_name": "Inflation Targeting & RBI MPC",
        "primary_exam": "UPSC_CSE",
        "also_applicable_exams": ["BANK_PO", "SSC_CGL"],
        "difficulty": QuestionDifficulty.EASY,
        "source_type": QuestionSourceType.PYQ,
        "source_reference": "UPSC CSE Prelims 2022 Paper I",
        "answer_status": QuestionAnswerStatus.VERIFIED,
        "answer_confidence": 1.0,
        "is_verified": True,
        "language": "EN"
    },
    {
        "question_text": "The Gandhi-Irwin Pact of 1931 included which of the following?\n1. Invitation to Congress to participate in the Round Table Conference\n2. Withdrawal of ordinances promulgated in connection with the Civil Disobedience Movement\n3. Acceptance of Gandhiji's suggestion for an inquiry into police excesses\n4. Release of those prisoners who were not charged with violence\nSelect the correct answer using the code below:",
        "options": [
            {"id": "A", "text": "1, 2 and 4 only"},
            {"id": "B", "text": "1, 2 and 3 only"},
            {"id": "C", "text": "2, 3 and 4 only"},
            {"id": "D", "text": "1, 2, 3 and 4"}
        ],
        "correct_answer": "A",
        "explanation": {
            "answer": "Option A (1, 2 and 4 only) is correct.",
            "why": "Lord Irwin accepted the release of non-violent political prisoners, withdrawal of emergency ordinances, and Congress agreed to join the Second Round Table Conference. However, Irwin categorically rejected a public inquiry into police excesses.",
            "quick_fact": "The pact was signed on March 5, 1931, paving the way for the Karachi Session of Congress.",
            "memory_trick": "Gandhi-Irwin: NO police inquiry, but YES to RTC and releasing peaceful prisoners!"
        },
        "subject_name": "Modern History",
        "topic_name": "National Movement 1919-1947",
        "subtopic_name": "Civil Disobedience Movement & Round Table Conferences",
        "primary_exam": "UPSC_CSE",
        "also_applicable_exams": ["STATE_PSC", "SSC_CGL"],
        "difficulty": QuestionDifficulty.HARD,
        "source_type": QuestionSourceType.PYQ,
        "source_reference": "UPSC CSE Prelims 2020 Paper I",
        "answer_status": QuestionAnswerStatus.VERIFIED,
        "answer_confidence": 1.0,
        "is_verified": True,
        "language": "EN"
    },
    {
        "question_text": "Which of the following National Parks is unique in being a swamp with floating vegetation that supports a rich biodiversity?",
        "options": [
            {"id": "A", "text": "Bhitarkanika National Park"},
            {"id": "B", "text": "Keibul Lamjao National Park"},
            {"id": "C", "text": "Keoladeo Ghana National Park"},
            {"id": "D", "text": "Sultanpur National Park"}
        ],
        "correct_answer": "B",
        "explanation": {
            "answer": "Keibul Lamjao National Park (Option B).",
            "why": "Keibul Lamjao National Park in Manipur is the world's only floating national park, located on Loktak Lake. It is renowned for its floating decomposed plant biomass known as 'phumdis' and is the last natural habitat of the endangered Sangai brow-antlered deer.",
            "quick_fact": "Loktak Lake is also a designated Ramsar Wetland of International Importance.",
            "memory_trick": "Keibul Lamjao = Only Floating Park on Loktak Phumdis!"
        },
        "subject_name": "Geography",
        "topic_name": "Protected Areas & Biodiversity",
        "subtopic_name": "National Parks & Ramsar Sites",
        "primary_exam": "UPSC_CSE",
        "also_applicable_exams": ["STATE_PSC", "SSC_CGL"],
        "difficulty": QuestionDifficulty.EASY,
        "source_type": QuestionSourceType.PYQ,
        "source_reference": "UPSC CSE Prelims 2015 Paper I",
        "answer_status": QuestionAnswerStatus.VERIFIED,
        "answer_confidence": 1.0,
        "is_verified": True,
        "language": "EN"
    },
    {
        "question_text": "Who among the following was the founder of the 'Satya Shodhak Samaj' in Maharashtra in 1873?",
        "options": [
            {"id": "A", "text": "Gopal Hari Deshmukh"},
            {"id": "B", "text": "Jyotirao Phule"},
            {"id": "C", "text": "B.R. Ambedkar"},
            {"id": "D", "text": "Mahadev Govind Ranade"}
        ],
        "correct_answer": "B",
        "explanation": {
            "answer": "Mahatma Jyotirao Phule (Option B).",
            "why": "Jyotirao Govindrao Phule established the Satya Shodhak Samaj (Society of Seekers of Truth) in Pune in 1873 to liberate Shudras and Ati-Shudras from caste oppression and promote female education.",
            "quick_fact": "Phule authored the celebrated book 'Gulamgiri' (Slavery) in 1873, dedicating it to the American abolitionist movement.",
            "memory_trick": "Phule = Satya Shodhak Samaj + Gulamgiri + Women's Education!"
        },
        "subject_name": "Modern History",
        "topic_name": "Socio-Religious Reform Movements",
        "subtopic_name": "Anti-Caste & Social Justice Movements",
        "primary_exam": "SSC_CGL",
        "also_applicable_exams": ["UPSC_CSE", "STATE_PSC"],
        "difficulty": QuestionDifficulty.EASY,
        "source_type": QuestionSourceType.PYQ,
        "source_reference": "SSC CGL 2022 Tier-1 General Awareness",
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

        # Check if question already exists to prevent duplicates
        existing = Question.query.filter_by(question_text=q_data["question_text"]).first()
        if existing:
            continue

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
