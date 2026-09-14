import re
import json
import logging
import hashlib
import xml.etree.ElementTree as ET
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
import requests
from app.models.core import db
from app.models.current_affairs import NewsArticle, DailyCurrentAffair
from app.services.ai_service import ai_service
from app.config import config

logger = logging.getLogger(__name__)

# Standard UPSC Syllabus Categories
UPSC_CATEGORIES = [
    "All",
    "Polity & Governance",
    "Economy & Development",
    "International Relations",
    "Environment & Ecology",
    "Science & Technology",
    "Defence & Security",
    "Social Issues & Welfare",
    "Geography & Agriculture",
    "History & Culture",
    "Government Schemes",
    "Reports & Indices",
    "Important Appointments & Awards",
    "Other Important News"
]

class NormalizedArticle:
    """Standardized news article format across all sources."""
    def __init__(
        self,
        title: str,
        original_url: str,
        source: str,
        summary: str,
        published_at: datetime,
        category: str = "General Studies",
        source_logo: Optional[str] = None
    ):
        self.title = title.strip()
        self.original_url = original_url.strip()
        self.source = source.strip()
        self.summary = summary.strip()
        self.published_at = published_at
        self.category = category
        self.source_logo = source_logo

    @property
    def hash_id(self) -> str:
        content = f"{self.title.lower()}_{self.source.lower()}"
        return hashlib.md5(content.encode("utf-8")).hexdigest()


class NewsProvider:
    """Base class for all legitimate news feeds and providers."""
    def fetch_articles(self, limit: int = 15) -> List[NormalizedArticle]:
        raise NotImplementedError


class PIBProvider(NewsProvider):
    """
    Fetches official Government of India press releases from PIB.
    Zero scraping violation, official public RSS feed.
    """
    FEED_URLS = [
        ("PIB India", "https://pib.gov.in/RssMain.aspx?ModId=6&LangId=1")
    ]

    def fetch_articles(self, limit: int = 15) -> List[NormalizedArticle]:
        articles = []
        headers = {"User-Agent": "SundaramPrep-NewsBot/2.0 (prep@sundaram.edu)"}
        for source_name, url in self.FEED_URLS:
            try:
                res = requests.get(url, headers=headers, timeout=6)
                if res.status_code == 200:
                    root = ET.fromstring(res.content)
                    channel = root.find("channel")
                    if channel is not None:
                        for item in channel.findall("item")[:limit]:
                            title_el = item.find("title")
                            link_el = item.find("link")
                            desc_el = item.find("description")
                            pub_el = item.find("pubDate")
                            
                            title = title_el.text if title_el is not None and title_el.text else ""
                            link = link_el.text if link_el is not None and link_el.text else "https://pib.gov.in"
                            desc = desc_el.text if desc_el is not None and desc_el.text else title
                            
                            # Clean HTML tags if present in description
                            clean_desc = re.sub(r'<[^>]+>', '', desc).strip()
                            
                            if title and len(title) > 10:
                                articles.append(NormalizedArticle(
                                    title=title,
                                    original_url=link,
                                    source="Press Information Bureau (PIB)",
                                    summary=clean_desc[:400],
                                    published_at=datetime.utcnow(),
                                    category="Government Schemes",
                                    source_logo="/assets/pib_logo.png"
                                ))
            except Exception as e:
                logger.warning(f"PIB feed fetch notice: {e}")
        return articles


class NationalNewsRSSProvider(NewsProvider):
    """
    Fetches headlines from reliable Indian public editorial RSS feeds
    (The Hindu, Indian Express, LiveMint, Sansad TV / DD News).
    """
    RSS_FEEDS = [
        ("The Hindu", "https://www.thehindu.com/news/national/feeder/default.rss", "Polity & Governance"),
        ("Indian Express", "https://indianexpress.com/section/india/feed/", "Polity & Governance"),
        ("LiveMint", "https://www.livemint.com/rss/economy", "Economy & Development"),
    ]

    def fetch_articles(self, limit: int = 10) -> List[NormalizedArticle]:
        articles = []
        headers = {"User-Agent": "Mozilla/5.0 (compatible; SundaramPrepBot/2.0)"}
        for source_name, feed_url, default_cat in self.RSS_FEEDS:
            try:
                res = requests.get(feed_url, headers=headers, timeout=5)
                if res.status_code == 200:
                    root = ET.fromstring(res.content)
                    items = root.findall(".//item")
                    for item in items[:limit]:
                        title = item.findtext("title", "").strip()
                        link = item.findtext("link", "").strip()
                        desc = item.findtext("description", "").strip()
                        clean_desc = re.sub(r'<[^>]+>', '', desc).strip()
                        
                        if title and len(title) > 15:
                            articles.append(NormalizedArticle(
                                title=title,
                                original_url=link or "#",
                                source=source_name,
                                summary=clean_desc[:350] or title,
                                published_at=datetime.utcnow(),
                                category=default_cat
                            ))
            except Exception as e:
                logger.warning(f"RSS feed fetch notice for {source_name}: {e}")
        return articles


class NewsDeduplicator:
    """Detects and clusters duplicate stories from multiple publications."""
    
    @staticmethod
    def _normalize_title(title: str) -> str:
        clean = re.sub(r'[^\w\s]', '', title.lower())
        tokens = [w for w in clean.split() if len(w) > 2 and w not in {'the', 'and', 'for', 'with', 'from', 'that', 'this'}]
        return " ".join(tokens)

    @classmethod
    def are_duplicates(cls, title1: str, title2: str) -> bool:
        t1 = set(cls._normalize_title(title1).split())
        t2 = set(cls._normalize_title(title2).split())
        if not t1 or not t2:
            return False
        intersection = len(t1 & t2)
        union = len(t1 | t2)
        jaccard = intersection / union if union > 0 else 0
        return jaccard >= 0.55

    @classmethod
    def cluster_articles(cls, articles: List[NormalizedArticle]) -> List[NormalizedArticle]:
        clustered = []
        for art in articles:
            matched = False
            for existing in clustered:
                if cls.are_duplicates(art.title, existing.title):
                    matched = True
                    break
            if not matched:
                clustered.append(art)
        return clustered


class NewsService:
    """
    Centralized UPSC Current Affairs & News Processing Engine:
    1. Multi-source collection
    2. Intelligent Deduplication
    3. Gemini AI UPSC Structured Reasoning
    4. Database Persistence & Instant Cache Serving
    """
    def __init__(self):
        self.providers: List[NewsProvider] = [
            PIBProvider(),
            NationalNewsRSSProvider()
        ]
        self.last_fetched_at: Optional[datetime] = None

    def get_articles(
        self,
        category: Optional[str] = None,
        search_query: Optional[str] = None,
        date_filter: Optional[str] = None,
        gs_paper: Optional[str] = None,
        page: int = 1,
        limit: int = 15,
        only_featured: bool = False
    ) -> Dict[str, Any]:
        """
        Retrieves paginated, filtered UPSC news articles from the database.
        Ensures seed data is automatically created on fresh environments.
        """
        self._ensure_seed_articles_exist()
        
        query = NewsArticle.query.filter(NewsArticle.is_published == True)

        if category and category != "All":
            query = query.filter(NewsArticle.category == category)

        if gs_paper and gs_paper != "All":
            query = query.filter(NewsArticle.gs_paper == gs_paper)

        if date_filter:
            try:
                target_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
                query = query.filter(db.func.date(NewsArticle.published_at) == target_date)
            except Exception:
                pass

        if search_query and search_query.strip():
            sq = f"%{search_query.strip().lower()}%"
            query = query.filter(
                db.or_(
                    NewsArticle.title.ilike(sq),
                    NewsArticle.short_summary.ilike(sq),
                    NewsArticle.category.ilike(sq),
                    NewsArticle.why_in_news.ilike(sq),
                    NewsArticle.upsc_relevance.ilike(sq)
                )
            )

        if only_featured:
            query = query.filter(NewsArticle.is_featured == True)

        total_count = query.count()
        offset = (page - 1) * limit
        articles = query.order_by(
            NewsArticle.is_featured.desc(),
            NewsArticle.relevance_score.desc(),
            NewsArticle.published_at.desc()
        ).offset(offset).limit(limit).all()

        return {
            "total": total_count,
            "page": page,
            "limit": limit,
            "has_more": (offset + len(articles)) < total_count,
            "articles": [a.to_dict(include_full_analysis=False) for a in articles],
            "categories": UPSC_CATEGORIES,
            "last_updated": self.last_fetched_at.isoformat() if self.last_fetched_at else datetime.utcnow().isoformat()
        }

    def get_article_detail(self, article_id: str) -> Optional[Dict[str, Any]]:
        """Fetches full UPSC pedagogical analysis, Prelims facts, Mains notes, and MCQs."""
        article = NewsArticle.query.get(article_id)
        if not article:
            return None
            
        # Increment views count
        article.views_count = (article.views_count or 0) + 1
        db.session.commit()
        
        return article.to_dict(include_full_analysis=True)

    def get_todays_digest(self) -> Dict[str, Any]:
        """Synthesizes Today's Executive UPSC Digest from top articles."""
        self._ensure_seed_articles_exist()
        today = date.today()
        
        articles = NewsArticle.query.filter(
            NewsArticle.is_published == True
        ).order_by(
            NewsArticle.relevance_score.desc(),
            NewsArticle.published_at.desc()
        ).limit(6).all()

        top_stories = [a.to_dict(include_full_analysis=False) for a in articles]
        
        summary_text = " ".join([
            f"{a.get('category', 'UPSC')}: {a.get('short_summary', a.get('title', ''))}"
            for a in top_stories[:3]
        ])
        if not summary_text:
            summary_text = "Today's high-yield UPSC topics span Constitutional jurisprudence, macroeconomic indicators, green hydrogen innovation, and multilateral diplomacy."

        return {
            "date": today.strftime("%d %B %Y"),
            "formatted_date": today.strftime("%d %B %Y"),
            "total_today": len(top_stories),
            "total_news_today": len(top_stories),
            "top_5": top_stories[:5],
            "top_stories": top_stories,
            "summary_bullet_points": [
                f"{a.get('category')}: {a.get('title')}" for a in top_stories[:5]
            ],
            "digest": {
                "date": today.strftime("%d %B %Y"),
                "summary": summary_text,
                "key_themes": list({a.get('category', 'General') for a in top_stories})
            }
        }

    def refresh_news(self, force_fetch: bool = False) -> Dict[str, Any]:
        """
        Centralized safe refresh mechanism:
        Fetches official feeds, deduplicates, runs Gemini UPSC evaluation,
        and saves new high-yield articles. Rate-limited to prevent abuse.
        """
        now = datetime.utcnow()
        if not force_fetch and self.last_fetched_at and (now - self.last_fetched_at).total_seconds() < 180:
            return {
                "status": "cached",
                "message": "News was updated recently. Showing latest available articles.",
                "new_articles_count": 0,
                "last_updated": self.last_fetched_at.isoformat()
            }

        new_count = 0
        raw_articles: List[NormalizedArticle] = []

        for provider in self.providers:
            try:
                raw_articles.extend(provider.fetch_articles(limit=10))
            except Exception as e:
                logger.warning(f"Error fetching from provider {provider.__class__.__name__}: {e}")

        # Deduplicate incoming articles against each other
        clustered = NewsDeduplicator.cluster_articles(raw_articles)

        for item in clustered:
            # Check if article already in DB
            exists = NewsArticle.query.filter(
                db.or_(
                    NewsArticle.title == item.title,
                    NewsArticle.original_url == item.original_url
                )
            ).first()

            if not exists:
                processed = self._process_article_with_gemini(item)
                if processed and processed.get("relevance_score", 0) >= 60:
                    article_obj = NewsArticle(
                        title=processed.get("title", item.title),
                        original_url=item.original_url,
                        source=item.source,
                        source_logo=item.source_logo,
                        published_at=item.published_at,
                        category=processed.get("category", item.category),
                        gs_paper=processed.get("gs_paper", "GS-II"),
                        relevance_score=int(processed.get("relevance_score", 85)),
                        is_featured=processed.get("is_featured", False),
                        read_time_minutes=int(processed.get("read_time_minutes", 3)),
                        short_summary=processed.get("short_summary", item.summary),
                        detailed_summary=processed.get("detailed_summary", item.summary),
                        why_in_news=processed.get("why_in_news", ""),
                        what_happened=processed.get("what_happened", ""),
                        background=processed.get("background", ""),
                        upsc_relevance=processed.get("upsc_relevance", ""),
                        key_facts=processed.get("key_facts", []),
                        prelims_facts=processed.get("prelims_facts", []),
                        mains_perspective=processed.get("mains_perspective", {}),
                        important_terms=processed.get("important_terms", []),
                        possible_mains_questions=processed.get("possible_mains_questions", []),
                        practice_mcqs=processed.get("practice_mcqs", [])
                    )
                    db.session.add(article_obj)
                    new_count += 1

        if new_count > 0:
            db.session.commit()

        self.last_fetched_at = datetime.utcnow()
        return {
            "status": "success",
            "message": f"Successfully updated news. {new_count} new UPSC articles processed.",
            "new_articles_count": new_count,
            "last_updated": self.last_fetched_at.isoformat()
        }

    def _process_article_with_gemini(self, article: NormalizedArticle) -> Optional[Dict[str, Any]]:
        """
        Uses Gemini 1.5 Flash to extract UPSC dimensions, Prelims facts, Mains questions, and MCQs.
        """
        system_instruction = (
            "You are the Chief UPSC Current Affairs Curriculum Director for Sundaram Prep. "
            "Analyze the news article and output strict JSON ONLY containing rigorous competitive exam value."
        )

        prompt = (
            f"Headline: {article.title}\n"
            f"Source: {article.source}\n"
            f"Summary: {article.summary}\n\n"
            "Format your output as valid JSON with these exact keys:\n"
            "{\n"
            '  "title": "Clear, informative headline",\n'
            '  "category": "Polity & Governance" | "Economy & Development" | "International Relations" | "Environment & Ecology" | "Science & Technology" | "Defence & Security" | "Social Issues & Welfare" | "Geography & Agriculture" | "Government Schemes" | "Reports & Indices",\n'
            '  "gs_paper": "GS-I" | "GS-II" | "GS-III" | "GS-IV" | "Essay",\n'
            '  "relevance_score": 85,\n'
            '  "is_featured": false,\n'
            '  "read_time_minutes": 3,\n'
            '  "short_summary": "Crisp 2-sentence executive summary",\n'
            '  "detailed_summary": "Comprehensive 2-paragraph analytical breakdown",\n'
            '  "why_in_news": "Why this specific event or announcement was made now",\n'
            '  "what_happened": "Clear factual explanation of the decision/event",\n'
            '  "background": "Historical, constitutional, or institutional context",\n'
            '  "upsc_relevance": "Why this matters for Prelims, Mains, and Interview",\n'
            '  "key_facts": ["High-yield bullet point 1", "High-yield bullet point 2"],\n'
            '  "prelims_facts": ["Specific statutory article or treaty for Prelims recall"],\n'
            '  "mains_perspective": {\n'
            '    "dimensions": ["Governance dimension", "Economic dimension"],\n'
            '    "challenges": ["Implementation challenge"],\n'
            '    "way_forward": "Actionable policy suggestion"\n'
            '  },\n'
            '  "important_terms": ["Keyword 1", "Keyword 2"],\n'
            '  "possible_mains_questions": ["UPSC Style Mains Question (150/250 words)"],\n'
            '  "practice_mcqs": [\n'
            '    {\n'
            '      "question": "High-quality UPSC Prelims style question stem",\n'
            '      "options": [\n'
            '        {"id": "A", "text": "Option A"},\n'
            '        {"id": "B", "text": "Option B"},\n'
            '        {"id": "C", "text": "Option C"},\n'
            '        {"id": "D", "text": "Option D"}\n'
            '      ],\n'
            '      "correct_answer": "A",\n'
            '      "explanation": "Detailed rationale"\n'
            '    }\n'
            '  ]\n'
            "}"
        )

        res = ai_service._call_gemini_json(prompt, system_instruction)
        if res and isinstance(res, dict) and res.get("title"):
            return res

        # Deterministic fallback structure if Gemini call fails
        return {
            "title": article.title,
            "category": article.category or "Polity & Governance",
            "gs_paper": "GS-II",
            "relevance_score": 80,
            "is_featured": False,
            "read_time_minutes": 3,
            "short_summary": article.summary[:200],
            "detailed_summary": article.summary,
            "why_in_news": "Recent national and administrative development.",
            "what_happened": article.summary,
            "background": f"Official notice reported by {article.source}.",
            "upsc_relevance": "Relevant for General Studies Prelims factual recall and Mains policy analysis.",
            "key_facts": [f"Source attribution: {article.source}", "Aligned with UPSC CSE General Studies curriculum."],
            "prelims_facts": ["Verify exact statutory mandate and responsible nodal Ministry."],
            "mains_perspective": {
                "dimensions": ["Policy Formulation", "Execution Efficiency"],
                "challenges": ["Inter-agency coordination"],
                "way_forward": "Standardized monitoring framework and stakeholder consultation."
            },
            "important_terms": [article.category],
            "possible_mains_questions": [f"Critically examine the implications of recent developments in {article.category} for India's governance. (150 words)"],
            "practice_mcqs": []
        }

    def execute_ai_action(self, article_id: str, action_type: str) -> Dict[str, Any]:
        """
        Executes and caches on-demand AI transformations:
        EXPLAIN_SIMPLY, SHORT_SUMMARY, DETAILED_EXPLANATION, PRELIMS_NOTES, MAINS_NOTES, HINDI, HINGLISH
        """
        article = NewsArticle.query.get(article_id)
        if not article:
            return {"error": "Article not found"}

        action = action_type.upper()
        
        # Check cached fields first
        if action == "EXPLAIN_SIMPLY" and article.simple_explanation:
            return {"result": article.simple_explanation, "cached": True}
        if action == "HINDI" and article.hindi_explanation:
            return {"result": article.hindi_explanation, "cached": True}
        if action == "HINGLISH" and article.hinglish_explanation:
            return {"result": article.hinglish_explanation, "cached": True}
        if action == "PRELIMS_NOTES" and article.prelims_notes:
            return {"result": article.prelims_notes, "cached": True}
        if action == "MAINS_NOTES" and article.mains_notes:
            return {"result": article.mains_notes, "cached": True}

        # Prompt generation based on action
        prompts = {
            "EXPLAIN_SIMPLY": f"Explain this news article simply in 2 plain sentences for a beginner aspirant without heavy jargon:\nTitle: {article.title}\nSummary: {article.short_summary}",
            "SHORT_SUMMARY": f"Provide a crisp 60-word executive takeaway for:\nTitle: {article.title}\nSummary: {article.detailed_summary or article.short_summary}",
            "DETAILED_EXPLANATION": f"Provide a rigorous, comprehensive 3-paragraph UPSC breakdown for:\nTitle: {article.title}\nContent: {article.detailed_summary or article.short_summary}",
            "PRELIMS_NOTES": f"Extract all high-yield Prelims facts (Articles, Constitutional Provisions, Treaties, Headquarters, Numbers) as bullet points for:\nTitle: {article.title}\nContent: {article.detailed_summary or article.short_summary}",
            "MAINS_NOTES": f"Provide structured Mains notes: (1) Key Dimensions (2) Challenges (3) Supreme Court / Expert Committee Cites (4) Balanced Way Forward for:\nTitle: {article.title}\nContent: {article.detailed_summary or article.short_summary}",
            "HINDI": f"इस समसामयिक विषय (Current Affairs) का संपूर्ण सार और UPSC परीक्षा उपयोगी बिंदु शुद्ध हिंदी (Devanagari) में स्पष्ट करें:\nशीर्षक: {article.title}\nविवरण: {article.short_summary}",
            "HINGLISH": f"Explain this current affairs topic and its UPSC relevance in conversational Hinglish:\nTitle: {article.title}\nSummary: {article.short_summary}"
        }

        user_prompt = prompts.get(action, prompts["EXPLAIN_SIMPLY"])
        reply = ai_service._call_gemini_text(user_prompt, "You are the Sundaram Prep AI Current Affairs Tutor.")
        
        if not reply:
            reply = article.short_summary

        # Cache the result to prevent redundant API calls
        if action == "EXPLAIN_SIMPLY":
            article.simple_explanation = reply
        elif action == "HINDI":
            article.hindi_explanation = reply
        elif action == "HINGLISH":
            article.hinglish_explanation = reply
        elif action == "PRELIMS_NOTES":
            article.prelims_notes = reply
        elif action == "MAINS_NOTES":
            article.mains_notes = reply
            
        db.session.commit()
        return {"result": reply, "cached": False}

    def chat_about_article(self, article_id: str, query: str, conversation_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """Interactive contextual AI chat strictly anchored to the specific news article."""
        article = NewsArticle.query.get(article_id)
        if not article:
            return {"error": "Article not found"}

        context = {
            "question_text": f"UPSC News Article: {article.title}",
            "options": [],
            "correct_answer": article.category,
            "subject": f"Current Affairs - {article.category} ({article.gs_paper})",
            "topic": article.category
        }

        extended_query = (
            f"[ARTICLE CONTEXT]\n"
            f"Title: {article.title}\n"
            f"Category: {article.category} | GS Paper: {article.gs_paper}\n"
            f"Source: {article.source}\n"
            f"Summary: {article.detailed_summary or article.short_summary}\n"
            f"Why in News: {article.why_in_news}\n"
            f"Prelims Facts: {json.dumps(article.prelims_facts or [])}\n"
            f"Mains Perspective: {json.dumps(article.mains_perspective or {})}\n"
            f"[END CONTEXT]\n\n"
            f"Student Question: {query}"
        )

        return ai_service.ask_assistant(extended_query, context=context)

    def _ensure_seed_articles_exist(self):
        """Populates rich, high-yield UPSC current affairs articles on fresh environments."""
        try:
            if NewsArticle.query.count() > 0:
                return

            today = datetime.utcnow()
            seed_data = [
                {
                    "title": "Supreme Court 9-Judge Bench Reaffirms Article 21 Privacy Proportionality Limits",
                    "original_url": "https://pib.gov.in",
                    "source": "PIB / Supreme Court Landmark Cases",
                    "category": "Polity & Governance",
                    "gs_paper": "GS-II",
                    "relevance_score": 98,
                    "is_featured": True,
                    "read_time_minutes": 4,
                    "short_summary": "A constitution bench has reiterated that state surveillance and data interception must satisfy the four-fold Puttaswamy test: Legitimate Goal, Suitability, Necessity, and Strict Proportionality.",
                    "detailed_summary": "The Supreme Court delivered an authoritative clarification on state surveillance parameters, holding that executive interception orders lacking judicial oversight infringe upon the core essence of Article 21. The ruling emphasizes that national security exceptions cannot be wielded as an unreviewable blanket.",
                    "why_in_news": "A series of constitutional petitions challenged administrative telecommunication interception procedures under Section 5(2) of the Indian Telegraph Act.",
                    "what_happened": "The Supreme Court reinforced that biometric and digital communication interception requires procedural fairness, time-bound retention limits, and independent review.",
                    "background": "The milestone K.S. Puttaswamy (2017) judgment established privacy as an intrinsic fundamental right under Part III of the Constitution.",
                    "upsc_relevance": "Directly tested in UPSC CSE GS-II (Fundamental Rights, Judicial Review, Separation of Powers) and GS-IV (Ethics in Surveillance).",
                    "key_facts": [
                        "Article 21: Right to Life and Personal Liberty.",
                        "Puttaswamy 4-fold test: Legality, Legitimate State Aim, Proportionality, Procedural Safeguards.",
                        "Telegraph Act 1885 vs Digital Personal Data Protection (DPDP) Act 2023 interface."
                    ],
                    "prelims_facts": [
                        "Article 32 & 226 writ jurisdiction for privacy enforcement.",
                        "Justice K.S. Puttaswamy (Retd.) v. Union of India (2017) 9-judge bench decision."
                    ],
                    "mains_perspective": {
                        "dimensions": ["Constitutional Sovereignty", "Individual Liberty vs State Security", "Technological Oversight"],
                        "challenges": ["Balancing anti-terror intelligence with civil liberties", "Delays in judicial interception warrants"],
                        "way_forward": "Establish an independent Judicial Warrant Magistrate for electronic surveillance authorizations."
                    },
                    "important_terms": ["Proportionality Standard", "Procedural Due Process", "Substantive Liberty", "Surveillance Oversight"],
                    "possible_mains_questions": [
                        "'The right to privacy is not absolute, yet state intrusion must cross the rigorous threshold of proportionality.' In light of recent judicial pronouncements, evaluate the adequacy of procedural safeguards in India's surveillance architecture. (250 words / 15 Marks)"
                    ],
                    "practice_mcqs": [
                        {
                            "question": "Which of the following constitutes an essential pillar of the 'Proportionality Standard' established in the K.S. Puttaswamy privacy judgment?",
                            "options": [
                                {"id": "A", "text": "The state action must have a legitimate statutory aim and use the least restrictive means."},
                                {"id": "B", "text": "Executive discretion is unreviewable when national security is invoked."},
                                {"id": "C", "text": "Fundamental rights under Article 21 can be permanently extinguished during financial emergency."},
                                {"id": "D", "text": "Prior sanction from Parliament is required for every individual criminal investigation."}
                            ],
                            "correct_answer": "A",
                            "explanation": "Option A is correct. The Puttaswamy proportionality test requires: (1) Legitimate aim, (2) Rational connection, (3) Least restrictive measure (necessity), and (4) Balance of rights."
                        }
                    ]
                },
                {
                    "title": "RBI Monetary Policy Committee Maintains Repo Rate at 6.5%, Focuses on Disinflation Glide Path",
                    "original_url": "https://pib.gov.in",
                    "source": "Reserve Bank of India / Ministry of Finance",
                    "category": "Economy & Development",
                    "gs_paper": "GS-III",
                    "relevance_score": 94,
                    "is_featured": True,
                    "read_time_minutes": 3,
                    "short_summary": "The Monetary Policy Committee (MPC) unanimously decided to keep the policy repo rate unchanged at 6.50% to align headline retail inflation with the 4.0% median target.",
                    "detailed_summary": "RBI Governor emphasized that while domestic economic growth remains resilient driven by capital expenditure and manufacturing, volatile food inflation necessitated continued vigilance on monetary stance.",
                    "why_in_news": "Bi-monthly Monetary Policy Review announced by the Reserve Bank of India.",
                    "what_happened": "The MPC kept policy repo rate at 6.50%, Standing Deposit Facility (SDF) rate at 6.25%, and Marginal Standing Facility (MSF) rate at 6.75%.",
                    "background": "The Flexible Inflation Targeting (FIT) framework was institutionalized in 2016 through amendments to the RBI Act, 1934, targeting 4% (+/- 2%) CPI inflation.",
                    "upsc_relevance": "High-frequency UPSC topic under GS-III (Monetary Policy, Macroeconomics, Growth vs Inflation Tradeoff).",
                    "key_facts": [
                        "MPC Composition: 6 members (3 from RBI including Governor, 3 external appointed by Central Government).",
                        "Target: 4% CPI inflation with +/- 2% tolerance band (2% to 6%).",
                        "Repo Rate: The rate at which commercial banks borrow short-term liquidity against government securities."
                    ],
                    "prelims_facts": [
                        "Section 45ZB of the Reserve Bank of India Act, 1934 governs MPC composition.",
                        "RBI Governor has a casting vote in case of a tie."
                    ],
                    "mains_perspective": {
                        "dimensions": ["Transmission Mechanism", "Food Price Shocks vs Core Inflation", "Fiscal-Monetary Synergy"],
                        "challenges": ["Supply-side food spikes limiting monetary efficacy", "Global commodity price volatility"],
                        "way_forward": "Strengthen agricultural supply-chain infrastructure to insulate headline inflation from perishable price shocks."
                    },
                    "important_terms": ["Repo Rate", "SDF (Standing Deposit Facility)", "Headline Inflation", "Core Inflation", "Taylor Rule"],
                    "possible_mains_questions": [
                        "Discuss the efficacy and limitations of the Flexible Inflation Targeting (FIT) framework in managing supply-driven food inflation in developing economies like India. (150 words / 10 Marks)"
                    ],
                    "practice_mcqs": [
                        {
                            "question": "With reference to the Monetary Policy Committee (MPC) in India, consider the following statements:\n1. It is a 6-member body constituted under the RBI Act, 1934.\n2. The Union Finance Minister serves as its ex-officio Chairperson.\nWhich of the statements given above is/are correct?",
                            "options": [
                                {"id": "A", "text": "1 only"},
                                {"id": "B", "text": "2 only"},
                                {"id": "C", "text": "Both 1 and 2"},
                                {"id": "D", "text": "Neither 1 nor 2"}
                            ],
                            "correct_answer": "A",
                            "explanation": "Statement 1 is correct (Section 45ZB, RBI Act). Statement 2 is incorrect because the Governor of the Reserve Bank of India is the ex-officio Chairperson of the MPC, not the Finance Minister."
                        }
                    ]
                },
                {
                    "title": "India Adds 5 New Wetlands to Ramsar List, Total Tally Reaches Milestone 85",
                    "original_url": "https://pib.gov.in",
                    "source": "Ministry of Environment, Forest and Climate Change (MoEFCC)",
                    "category": "Environment & Ecology",
                    "gs_paper": "GS-III",
                    "relevance_score": 92,
                    "is_featured": False,
                    "read_time_minutes": 3,
                    "short_summary": "India has expanded its Ramsar network with 5 new designated wetlands of international importance across Tamil Nadu, Karnataka, and Madhya Pradesh.",
                    "detailed_summary": "The designated wetlands enhance migratory bird flyway conservation along the Central Asian Flyway (CAF) and strengthen ecological resilience against flood hazards.",
                    "why_in_news": "MoEFCC official notification celebrating World Wetlands Day and Amrit Dharohar initiative.",
                    "what_happened": "5 high-biodiversity ecosystems officially recognized under the 1971 Ramsar Convention on Wetlands.",
                    "background": "The Ramsar Convention (signed in Ramsar, Iran in 1971) is an intergovernmental treaty that provides the framework for the conservation and wise use of wetlands.",
                    "upsc_relevance": "Crucial for UPSC CSE Prelims (Locations, Biodiversity, Ramsar Sites) and GS-III (Biodiversity, Climate Change).",
                    "key_facts": [
                        "India has the largest network of Ramsar sites in South Asia.",
                        "Sundarbans in West Bengal is the largest Ramsar site in India.",
                        "Renuka Wetland in Himachal Pradesh is the smallest Ramsar site in India."
                    ],
                    "prelims_facts": [
                        "Montreux Record is a register of wetland sites on the List of Wetlands of International Importance where ecological character changes have occurred.",
                        "Keoladeo National Park (Rajasthan) and Loktak Lake (Manipur) are currently in the Montreux Record."
                    ],
                    "mains_perspective": {
                        "dimensions": ["Ecosystem Services", "Flood Mitigation", "Ecotourism & Livelihoods"],
                        "challenges": ["Encroachment and urban runoff discharge", "Invasive alien weed proliferation (e.g. Water Hyacinth)"],
                        "way_forward": "Implement integrated wetland catchment management and community-led eco-tourism under the Amrit Dharohar scheme."
                    },
                    "important_terms": ["Ramsar Convention", "Montreux Record", "Wise Use Concept", "Central Asian Flyway", "Amrit Dharohar"],
                    "possible_mains_questions": [
                        "Examine the ecological and economic significance of wetlands in India. How does the 'Amrit Dharohar' initiative contribute to sustainable wetland conservation? (150 words / 10 Marks)"
                    ],
                    "practice_mcqs": [
                        {
                            "question": "Which of the following Indian wetlands is currently listed in the Montreux Record under the Ramsar Convention?",
                            "options": [
                                {"id": "A", "text": "Loktak Lake (Manipur)"},
                                {"id": "B", "text": "Chilika Lake (Odisha)"},
                                {"id": "C", "text": "Wular Lake (Jammu & Kashmir)"},
                                {"id": "D", "text": "Vembanad Lake (Kerala)"}
                            ],
                            "correct_answer": "A",
                            "explanation": "Loktak Lake (Manipur) and Keoladeo National Park (Rajasthan) are currently on the Montreux Record. Chilika Lake was removed from the Montreux Record following successful ecological restoration."
                        }
                    ]
                },
                {
                    "title": "ISRO Successfully Launches INSAT-3DS Meteorological Satellite via GSLV-F14",
                    "original_url": "https://pib.gov.in",
                    "source": "ISRO / Department of Space",
                    "category": "Science & Technology",
                    "gs_paper": "GS-III",
                    "relevance_score": 90,
                    "is_featured": False,
                    "read_time_minutes": 3,
                    "short_summary": "ISRO's Geosynchronous Satellite Launch Vehicle (GSLV-F14) deployed INSAT-3DS into Geostationary Transfer Orbit to boost climate and disaster warnings.",
                    "detailed_summary": "INSAT-3DS is a dedicated meteorological satellite funded by the Ministry of Earth Sciences. It features advanced 6-channel imager and 19-channel sounder payloads for enhanced ocean surface and atmospheric observation.",
                    "why_in_news": "Successful mission from Satish Dhawan Space Centre (SDSC-SHAR), Sriharikota.",
                    "what_happened": "GSLV-F14 successfully placed the 2,274 kg INSAT-3DS satellite into orbit.",
                    "background": "GSLV Mk-II is a 3-stage launch vehicle featuring an indigenous Cryogenic Upper Stage (CUS).",
                    "upsc_relevance": "Directly relevant for UPSC CSE Prelims (Orbits, Payloads, Launchers) and GS-III (Indigenization of Technology, Space Exploration).",
                    "key_facts": [
                        "Launch Vehicle: GSLV Mk-II (GSLV-F14).",
                        "Orbit: Geostationary Transfer Orbit (GTO) with final placement at 74 degrees East longitude.",
                        "Payloads: 6-Channel Imager, 19-Channel Sounder, Data Relay Transponder (DRT), Satellite Aided Search and Rescue (SAS&R)."
                    ],
                    "prelims_facts": [
                        "Cryogenic engines utilize Liquid Hydrogen (-253 C) as fuel and Liquid Oxygen (-183 C) as oxidizer.",
                        "INSAT series operates in geostationary orbit (~35,786 km above Earth's equator)."
                    ],
                    "mains_perspective": {
                        "dimensions": ["Disaster Warning (Cyclones, Flash Floods)", "Agricultural Agro-meteorology", "Space Tech Diplomacy"],
                        "challenges": ["Data processing latency in extreme weather events"],
                        "way_forward": "Integrate satellite meteorological telemetry with AI-based localized flood warning models."
                    },
                    "important_terms": ["Geostationary Orbit", "Cryogenic Upper Stage (CUS)", "Sounder Payload", "Doppler Weather Radar"],
                    "possible_mains_questions": [
                        "Discuss the role of space technology in disaster management in India with special reference to meteorological satellite systems. (150 words / 10 Marks)"
                    ],
                    "practice_mcqs": [
                        {
                            "question": "In a Cryogenic Rocket Engine, which combination of propellants is utilized?",
                            "options": [
                                {"id": "A", "text": "Liquid Hydrogen and Liquid Oxygen"},
                                {"id": "B", "text": "Solid Composite Propellant and Kerosene"},
                                {"id": "C", "text": "Hydrazine and Nitrogen Tetroxide"},
                                {"id": "D", "text": "Liquid Methane and Solid Aluminum Powder"}
                            ],
                            "correct_answer": "A",
                            "explanation": "Option A is correct. Cryogenic rocket engines use Liquid Hydrogen (LH2) at -253°C as fuel and Liquid Oxygen (LOX) at -183°C as oxidizer."
                        }
                    ]
                }
            ]

            for s in seed_data:
                art = NewsArticle(
                    title=s["title"],
                    original_url=s["original_url"],
                    source=s["source"],
                    published_at=today,
                    category=s["category"],
                    gs_paper=s["gs_paper"],
                    relevance_score=s["relevance_score"],
                    is_featured=s["is_featured"],
                    read_time_minutes=s["read_time_minutes"],
                    short_summary=s["short_summary"],
                    detailed_summary=s["detailed_summary"],
                    why_in_news=s["why_in_news"],
                    what_happened=s["what_happened"],
                    background=s["background"],
                    upsc_relevance=s["upsc_relevance"],
                    key_facts=s["key_facts"],
                    prelims_facts=s["prelims_facts"],
                    mains_perspective=s["mains_perspective"],
                    important_terms=s["important_terms"],
                    possible_mains_questions=s["possible_mains_questions"],
                    practice_mcqs=s["practice_mcqs"]
                )
                db.session.add(art)
            
            db.session.commit()
            logger.info("Successfully seeded verified UPSC Current Affairs articles.")
        except Exception as e:
            logger.warning(f"Seed articles check: {e}")

news_service = NewsService()
