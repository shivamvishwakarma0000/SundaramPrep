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

def get_category_default_image(category: str = "", gs_paper: str = "GS-II") -> str:
    """Returns high-resolution, contextual real news cover photography for UPSC subjects."""
    cat_lower = (category or "").lower()
    paper = (gs_paper or "").upper()
    
    if "polity" in cat_lower or "governance" in cat_lower or "constitution" in cat_lower or "law" in cat_lower:
        return "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80"
    elif "economy" in cat_lower or "finance" in cat_lower or "banking" in cat_lower or "trade" in cat_lower:
        return "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80"
    elif "environment" in cat_lower or "ecology" in cat_lower or "wetland" in cat_lower or "climate" in cat_lower:
        return "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80"
    elif "science" in cat_lower or "space" in cat_lower or "isro" in cat_lower or "tech" in cat_lower:
        return "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=80"
    elif "international" in cat_lower or "diplomacy" in cat_lower or "treaty" in cat_lower or "g20" in cat_lower:
        return "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&w=1200&q=80"
    elif "defence" in cat_lower or "security" in cat_lower or "military" in cat_lower or "missile" in cat_lower:
        return "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80"
    elif "geography" in cat_lower or "agriculture" in cat_lower or "farming" in cat_lower or "crops" in cat_lower:
        return "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80"
    elif "history" in cat_lower or "culture" in cat_lower or "heritage" in cat_lower or paper == "GS-I":
        return "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1200&q=80"
    elif "energy" in cat_lower or "hydrogen" in cat_lower or "solar" in cat_lower:
        return "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80"
    
    if paper == "GS-III":
        return "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80"
    elif paper == "GS-I":
        return "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1200&q=80"
    
    return "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80"


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
        source_logo: Optional[str] = None,
        image_url: Optional[str] = None
    ):
        self.title = title.strip()
        self.original_url = original_url.strip()
        self.source = source.strip()
        self.summary = summary.strip()
        self.published_at = published_at
        self.category = category
        self.source_logo = source_logo
        self.image_url = image_url or get_category_default_image(category)

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
                            
                            title = title_el.text if title_el is not None and title_el.text else ""
                            link = link_el.text if link_el is not None and link_el.text else "https://pib.gov.in"
                            desc = desc_el.text if desc_el is not None and desc_el.text else title
                            
                            # Clean HTML tags if present in description
                            clean_desc = re.sub(r'<[^>]+>', '', desc).strip()

                            # Extract media image enclosure if available
                            enclosure = item.find("enclosure")
                            img_url = enclosure.attrib.get("url") if enclosure is not None else None
                            
                            if title and len(title) > 10:
                                articles.append(NormalizedArticle(
                                    title=title,
                                    original_url=link,
                                    source="Press Information Bureau (PIB)",
                                    summary=clean_desc[:400],
                                    published_at=datetime.utcnow(),
                                    category="Government Schemes",
                                    source_logo="/assets/pib_logo.png",
                                    image_url=img_url or get_category_default_image("Government Schemes")
                                ))
            except Exception as e:
                logger.warning(f"PIB feed fetch notice: {e}")
        return articles


class NationalNewsRSSProvider(NewsProvider):
    """
    Fetches headlines from reliable Indian public editorial RSS feeds
    (India Today, The Hindu, Indian Express, LiveMint, Sansad TV / DD News).
    """
    RSS_FEEDS = [
        ("India Today", "https://www.indiatoday.in/rss/1206584", "Polity & Governance"),
        ("India Today", "https://www.indiatoday.in/rss/1206578", "Other Important News"),
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

                        # Extract media image tag if present (including media:content & media:thumbnail)
                        img_url = None
                        enclosure = item.find("enclosure")
                        if enclosure is not None and "url" in enclosure.attrib:
                            img_url = enclosure.attrib.get("url")
                        
                        if not img_url:
                            for elem in item.iter():
                                if elem.tag.endswith("content") or elem.tag.endswith("thumbnail"):
                                    if "url" in elem.attrib:
                                        img_url = elem.attrib["url"]
                                        break

                        if not img_url:
                            img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', desc)
                            if img_match:
                                img_url = img_match.group(1)
                        
                        if title and len(title) > 15:
                            articles.append(NormalizedArticle(
                                title=title,
                                original_url=link or "#",
                                source=source_name,
                                summary=clean_desc[:350] or title,
                                published_at=datetime.utcnow(),
                                category=default_cat,
                                image_url=img_url or get_category_default_image(default_cat)
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
        self._seed_synced: bool = False

    def get_articles(
        self,
        category: Optional[str] = None,
        search_query: Optional[str] = None,
        date_filter: Optional[str] = None,
        gs_paper: Optional[str] = None,
        source: Optional[str] = None,
        page: int = 1,
        limit: int = 15,
        only_featured: bool = False
    ) -> Dict[str, Any]:
        """
        Retrieves paginated, filtered UPSC news articles from the database.
        Ensures seed data is automatically created on fresh environments.
        """
        self._ensure_seed_articles_exist()
        
        # Auto-backfill missing image_urls on existing records
        try:
            null_images = NewsArticle.query.filter(
                db.or_(NewsArticle.image_url == None, NewsArticle.image_url == '')
            ).all()
            if null_images:
                for art in null_images:
                    art.image_url = get_category_default_image(art.category, art.gs_paper)
                db.session.commit()
        except Exception as e:
            logger.debug(f"Image backfill note: {e}")

        query = NewsArticle.query.filter(NewsArticle.is_published == True)

        if category and category.strip().lower() not in ["all", "all updates", "all category", ""]:
            cat_clean = category.strip().lower()
            query = query.filter(
                db.or_(
                    NewsArticle.category.ilike(f"%{cat_clean}%"),
                    NewsArticle.category == category
                )
            )

        if source and source.strip().lower() not in ["all", "all sources", ""]:
            src_clean = source.strip().lower()
            query = query.filter(NewsArticle.source.ilike(f"%{src_clean}%"))

        if gs_paper and gs_paper.strip().lower() not in ["all", ""]:
            query = query.filter(NewsArticle.gs_paper.ilike(f"%{gs_paper.strip()}%"))

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
                    NewsArticle.detailed_summary.ilike(sq),
                    NewsArticle.category.ilike(sq),
                    NewsArticle.gs_paper.ilike(sq),
                    NewsArticle.why_in_news.ilike(sq),
                    NewsArticle.what_happened.ilike(sq),
                    NewsArticle.background.ilike(sq),
                    NewsArticle.upsc_relevance.ilike(sq)
                )
            )

        if only_featured:
            query = query.filter(NewsArticle.is_featured == True)

        total_count = query.count()
        offset = (page - 1) * limit
        articles = query.order_by(
            NewsArticle.published_at.desc(),
            NewsArticle.is_featured.desc(),
            NewsArticle.relevance_score.desc()
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
            
        # Backfill image if missing
        if not article.image_url:
            article.image_url = get_category_default_image(article.category, article.gs_paper)

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
            NewsArticle.published_at.desc(),
            NewsArticle.relevance_score.desc()
        ).limit(6).all()

        top_stories = [a.to_dict(include_full_analysis=False) for a in articles]
        
        summary_text = " ".join([
            f"{a.get('category', 'UPSC')}: {a.get('short_summary', a.get('title', ''))}"
            for a in top_stories[:3]
        ])
        if not summary_text:
            summary_text = "Today's high-yield UPSC topics span BRICS multilateral financial architecture, G20 Global Biofuels & IMEEC, Constitutional jurisprudence, macroeconomic stability, and indigenous defense technology."

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

    def get_viral_articles(self, limit: int = 10) -> Dict[str, Any]:
        """Returns top trending, viral, and high-impact UPSC news stories."""
        self._ensure_seed_articles_exist()
        articles = NewsArticle.query.filter(
            NewsArticle.is_published == True
        ).order_by(
            NewsArticle.is_featured.desc(),
            NewsArticle.relevance_score.desc(),
            NewsArticle.views_count.desc(),
            NewsArticle.published_at.desc()
        ).limit(limit).all()

        return {
            "articles": [a.to_dict(include_full_analysis=False) for a in articles],
            "total": len(articles),
            "last_updated": datetime.utcnow().isoformat()
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
                    cat = processed.get("category", item.category)
                    paper = processed.get("gs_paper", "GS-II")
                    article_obj = NewsArticle(
                        title=processed.get("title", item.title),
                        original_url=item.original_url,
                        source=item.source,
                        source_logo=item.source_logo,
                        image_url=item.image_url or get_category_default_image(cat, paper),
                        published_at=item.published_at,
                        category=cat,
                        gs_paper=paper,
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
        """Populates rich, high-yield UPSC current affairs articles across all core syllabus categories."""
        if self._seed_synced:
            return
        try:
            today = datetime.utcnow()
            seed_data = [
                {
                    "title": "BRICS Summit & Expansion: 10-Member Geopolitical Bloc, Cross-Border BRICS Pay Network & De-Dollarization Architecture",
                    "original_url": "https://www.mea.gov.in/bilateral-documents.htm?dtl/38450/Kazan_Declaration",
                    "source": "Ministry of External Affairs / India Today",
                    "category": "International Relations",
                    "gs_paper": "GS-II",
                    "image_url": "https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=1200&q=80",
                    "relevance_score": 100,
                    "is_featured": True,
                    "read_time_minutes": 4,
                    "published_at": today,
                    "short_summary": "The expanded BRICS bloc (now comprising 10 member nations) consolidated its strategic vision around reforming global financial institutions, establishing local currency trade settlement mechanisms (BRICS Pay / BRICS Bridge), and strengthening Global South multilateralism.",
                    "detailed_summary": "With the formal admission of Saudi Arabia, Egypt, UAE, Iran, and Ethiopia, BRICS now represents over 45% of the world's population and ~37% of global purchasing power parity (PPP) GDP. The Kazan Declaration outlined actionable steps toward reducing dependency on western payment gateways (SWIFT alternatives), bolstering the New Development Bank (NDB), and institutionalizing the BRICS Contingent Reserve Arrangement (CRA).",
                    "why_in_news": "High-stakes diplomatic summit addressing unilateral sanctions, trade imbalances, and non-Western financial interoperability.",
                    "what_happened": "Adoption of the comprehensive Kazan Summit Declaration focusing on multipolarity, digital currencies for trade settlement, and partner country status.",
                    "background": "Coined in 2001 by Jim O'Neill (BRIC), South Africa joined in 2010. The 15th Johannesburg Summit (2023) and subsequent Kazan Summit formalized the most extensive expansion in the bloc's history.",
                    "upsc_relevance": "Directly tested in UPSC CSE GS-II (Important International Institutions, Regional & Global Groupings, Effect of Policies of Developed & Developing Nations).",
                    "key_facts": [
                        "Original 5 members: Brazil, Russia, India, China, South Africa.",
                        "5 New Permanent Members: Egypt, Ethiopia, Iran, Saudi Arabia, and United Arab Emirates (UAE).",
                        "New Development Bank (NDB) headquarters located in Shanghai, China.",
                        "BRICS accounts for ~43% of global crude oil production and over 35% of global food grain output."
                    ],
                    "prelims_facts": [
                        "Fortaleza Declaration (2014) established the New Development Bank and Contingent Reserve Arrangement.",
                        "Unlike the IMF/World Bank, voting power in the NDB is not monopolized by Western veto powers; all founding members have equal initial capital shares."
                    ],
                    "mains_perspective": {
                        "dimensions": ["Multipolar Global Order", "Alternative Financial Architecture (Local Currency Settlements)", "India's Strategic Autonomy between Quad and BRICS"],
                        "challenges": ["Divergent geopolitical alignments among members (e.g., India-China border tensions)", "Balancing Western economic partnerships with Global South solidarity"],
                        "way_forward": "Promote consensus-based decision making, leverage the NDB for sustainable infrastructure financing, and expand UPI cross-border interoperability within BRICS partners."
                    },
                    "important_terms": ["BRICS Pay", "Kazan Declaration", "Fortaleza Declaration", "New Development Bank (NDB)", "Contingent Reserve Arrangement", "De-Dollarization", "Strategic Autonomy"],
                    "possible_mains_questions": [
                        "'The expansion of BRICS reflects a fundamental structural shift in 21st-century global governance, yet internal ideological heterogeneity poses distinct challenges for India.' Critically analyze. (250 words / 15 Marks)"
                    ],
                    "practice_mcqs": [
                        {
                            "question": "Regarding the BRICS grouping and its financial institutions, consider the following statements:\n1. The New Development Bank (NDB) was formally established by the Fortaleza Declaration in 2014.\n2. In the New Development Bank (NDB), each founding member has equal voting rights, with no single country possessing veto power.\n3. Egypt, Ethiopia, Iran, Saudi Arabia, and the UAE are now permanent members of the expanded BRICS bloc.\nWhich of the statements given above are correct?",
                            "options": [
                                {"id": "A", "text": "1 and 2 only"},
                                {"id": "B", "text": "2 and 3 only"},
                                {"id": "C", "text": "1, 2 and 3"},
                                {"id": "D", "text": "1 and 3 only"}
                            ],
                            "correct_answer": "C",
                            "explanation": "All three statements are correct. The NDB was established under the 2014 Fortaleza Declaration with equal voting rights among founding members, and BRICS has expanded to include Egypt, Ethiopia, Iran, Saudi Arabia, and UAE."
                        }
                    ]
                },
                {
                    "title": "G20 New Delhi Leaders' Declaration: African Union Permanent Induction, Global Biofuels Alliance & IMEEC Corridor",
                    "original_url": "https://www.mea.gov.in/Images/CPV/G20-New-Delhi-Leaders-Declaration.pdf",
                    "source": "Ministry of External Affairs / G20 India",
                    "category": "International Relations",
                    "gs_paper": "GS-II",
                    "image_url": "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&w=1200&q=80",
                    "relevance_score": 99,
                    "is_featured": True,
                    "read_time_minutes": 4,
                    "short_summary": "The G20 Leaders' Summit under India's presidency achieved 100% consensus, formally admitting the African Union (AU) as a permanent member and launching the India-Middle East-Europe Economic Corridor (IMEEC) and Global Biofuels Alliance (GBA).",
                    "detailed_summary": "Under the theme 'Vasudhaiva Kutumbakam' (One Earth, One Family, One Future), India's G20 Presidency positioned the Global South at the center of international diplomacy. Key milestones include tripling global renewable energy capacity by 2030, the G20 High-Level Principles on Lifestyles for Sustainable Development (LiFE), and strengthening Multilateral Development Banks (MDBs).",
                    "why_in_news": "Landmark multilateral outcome establishing new strategic connectivity corridors and representing developing nations in global governance.",
                    "what_happened": "Unanimous adoption of the 83-paragraph New Delhi Declaration without dissenting footnotes.",
                    "background": "G20 founded in 1999 brings together the world's major developed and emerging economies, accounting for ~85% of global GDP, 75% of global trade, and two-thirds of world population.",
                    "upsc_relevance": "Top-tier UPSC CSE GS-II topic (Bilateral & Regional Groupings, Effect of Policies of Developed & Developing Nations on India's Interests).",
                    "key_facts": [
                        "African Union (55 member states) became the 21st permanent member of G20.",
                        "India-Middle East-Europe Economic Corridor (IMEEC) comprises Eastern Corridor (India to Arabian Gulf) and Northern Corridor (Gulf to Europe).",
                        "Global Biofuels Alliance (GBA) launched with 19 countries and 12 international organizations.",
                        "G20 Green Development Pact commits to tripling global renewable energy capacity by 2030."
                    ],
                    "prelims_facts": [
                        "Troika: India, Brazil, South Africa.",
                        "G20 has no permanent secretariat; host nation leads the agenda with the Troika."
                    ],
                    "mains_perspective": {
                        "dimensions": ["Global South Leadership", "Counter to China's BRI via IMEEC", "Multilateral MDB Reform"],
                        "challenges": ["Geopolitical instability in the Middle East affecting IMEEC transit", "Funding concessional climate finance for developing nations"],
                        "way_forward": "Fast-track port-rail interoperability standards and mobilize blended finance for green corridors."
                    },
                    "important_terms": ["IMEEC", "Global Biofuels Alliance", "Global South", "Vasudhaiva Kutumbakam", "MDB Reforms", "Troika"],
                    "possible_mains_questions": [
                        "'India's G20 Presidency marked a paradigm shift by democratizing multilateral diplomacy and institutionalizing the voice of the Global South.' Critically evaluate with special reference to the African Union's induction and the IMEEC corridor. (250 words / 15 Marks)"
                    ],
                    "practice_mcqs": [
                        {
                            "question": "Regarding the India-Middle East-Europe Economic Corridor (IMEEC) launched at the G20 New Delhi Summit, consider the following statements:\n1. It comprises two distinct corridors: the East Corridor connecting India to the Arabian Gulf and the Northern Corridor connecting the Arabian Gulf to Europe.\n2. It includes a railway network, ship-to-rail transit network, and clean hydrogen export pipelines.\nWhich of the statements given above is/are correct?",
                            "options": [
                                {"id": "A", "text": "1 only"},
                                {"id": "B", "text": "2 only"},
                                {"id": "C", "text": "Both 1 and 2"},
                                {"id": "D", "text": "Neither 1 nor 2"}
                            ],
                            "correct_answer": "C",
                            "explanation": "Both statements are correct. IMEEC consists of the Eastern and Northern corridors, incorporating rail, shipping, electricity cables, digital connectivity, and clean hydrogen pipelines."
                        }
                    ]
                },
                {
                    "title": "Supreme Court 9-Judge Bench Reaffirms Article 21 Privacy Proportionality Limits",
                    "original_url": "https://main.sci.gov.in/supremecourt/2012/35071/35071_2012_Judgement_24-Aug-2017.pdf",
                    "source": "Supreme Court Landmark Rulings",
                    "category": "Polity & Governance",
                    "gs_paper": "GS-II",
                    "image_url": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
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
                    "title": "106th Constitutional Amendment Act: Nari Shakti Vandan Adhiniyam Mandates 33% Reservation for Women in Lok Sabha and State Assemblies",
                    "original_url": "https://pib.gov.in/PressReleasePage.aspx?PRID=1958983",
                    "source": "Ministry of Law & Justice / PIB",
                    "category": "Polity & Governance",
                    "gs_paper": "GS-II",
                    "image_url": "https://images.unsplash.com/photo-1575517111478-7f6afd0973db?auto=format&fit=crop&w=1200&q=80",
                    "relevance_score": 97,
                    "is_featured": True,
                    "read_time_minutes": 4,
                    "short_summary": "Parliament enacted the Constitution (One Hundred and Sixth Amendment) Act, inserting Articles 330A, 332A, and 334A to reserve one-third of seats for women in the Lok Sabha, State Legislative Assemblies, and Legislative Assembly of NCT of Delhi.",
                    "detailed_summary": "The historic legislation provides horizontal reservation for women including SC/ST categories for a period of 15 years from commencement, with implementation tied to the subsequent delimitation exercise based on relevant census figures.",
                    "why_in_news": "Enactment of the historic women's political representation act in the Special Session of Parliament.",
                    "what_happened": "Passed with near-unanimous support across both houses of Parliament and ratified by State Legislatures.",
                    "background": "73rd and 74th Amendments (1992) had previously provided 33% reservation for women in Panchayati Raj Institutions and Urban Local Bodies.",
                    "upsc_relevance": "GS-II (Indian Constitution, Representation of People's Act, Role of Women in Democracy) & Essay.",
                    "key_facts": [
                        "Articles inserted: Article 330A (Lok Sabha), Article 332A (State Assemblies), Article 334A (Sunset & Delimitation clause).",
                        "Sub-reservation: One-third of seats reserved for SCs and STs shall be reserved for women of those communities.",
                        "Duration: 15 years with provision for extension by parliamentary statute."
                    ],
                    "prelims_facts": [
                        "Article 239AA amended to provide 33% women's reservation in Delhi Legislative Assembly.",
                        "Requires delimitation exercise post-census for constituency demarcation."
                    ],
                    "mains_perspective": {
                        "dimensions": ["Gender-Inclusive Governance", "Policy Prioritization for Care Economy", "Electoral Reforms"],
                        "challenges": ["Proxy representation (Sarpanch Pati phenomenon risk)", "Delay pending census and delimitation"],
                        "way_forward": "Strengthen internal political party ticket quotas and institutional capacity-building for elected women representatives."
                    },
                    "important_terms": ["Article 330A", "Article 332A", "Horizontal Reservation", "Delimitation", "Sunset Clause"],
                    "possible_mains_questions": [
                        "Evaluate how the 106th Constitutional Amendment Act (Nari Shakti Vandan Adhiniyam) can transform substantive gender representation in India's legislative institutions. (250 words / 15 Marks)"
                    ],
                    "practice_mcqs": [
                        {
                            "question": "Which new articles were inserted into the Constitution of India by the 106th Constitutional Amendment Act (Nari Shakti Vandan Adhiniyam)?",
                            "options": [
                                {"id": "A", "text": "Articles 330A, 332A, and 334A"},
                                {"id": "B", "text": "Articles 243D, 243T, and 243Z"},
                                {"id": "C", "text": "Articles 338A, 338B, and 340"},
                                {"id": "D", "text": "Articles 371A, 371B, and 371J"}
                            ],
                            "correct_answer": "A",
                            "explanation": "The 106th Amendment inserted Articles 330A (Lok Sabha), 332A (State Assemblies), and 334A (commencement/sunset) to reserve 33% seats for women."
                        }
                    ]
                },
                {
                    "title": "RBI Monetary Policy Committee Maintains Repo Rate at 6.5%, Focuses on Disinflation Glide Path",
                    "original_url": "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=57271",
                    "source": "Reserve Bank of India / Ministry of Finance",
                    "category": "Economy & Development",
                    "gs_paper": "GS-III",
                    "image_url": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
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
                    "title": "DRDO Successfully Flight-Tests Agni-5 Ballistic Missile with MIRV Technology under Mission Divyastra",
                    "original_url": "https://pib.gov.in/PressReleasePage.aspx?PRID=2013589",
                    "source": "DRDO / Ministry of Defence",
                    "category": "Defence & Security",
                    "gs_paper": "GS-III",
                    "image_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
                    "relevance_score": 96,
                    "is_featured": True,
                    "read_time_minutes": 3,
                    "short_summary": "DRDO conducted the maiden flight test of the indigenously developed Agni-5 missile equipped with Multiple Independently Targetable Re-entry Vehicle (MIRV) technology from Dr APJ Abdul Kalam Island, Odisha.",
                    "detailed_summary": "Mission Divyastra propelled India into an elite group of nations possessing MIRV capability. MIRV allows a single intercontinental ballistic missile (ICBM) to deliver multiple warheads to distinct geographic targets hundreds of kilometers apart, overcoming anti-ballistic missile defence shields.",
                    "why_in_news": "Successful maiden demonstration of indigenous MIRV capability by Defence Research and Development Organisation (DRDO).",
                    "what_happened": "Telemetry and radar stations confirmed the re-entry vehicles hit separate designated points with high precision.",
                    "background": "Agni-5 is a three-stage solid-fuelled missile with a strike range exceeding 5,000 km, strengthening India's Credible Minimum Deterrence nuclear doctrine.",
                    "upsc_relevance": "GS-III (Security Challenges, Defence Indigenization, Strategic Nuclear Posture) & GS-II (Geopolitics).",
                    "key_facts": [
                        "MIRV: Multiple Independently Targetable Re-entry Vehicle.",
                        "Range: 5,000+ km (Intercontinental category).",
                        "Propulsion: Three-stage composite rocket motor using solid propellant.",
                        "Nuclear Doctrine: No First Use (NFU) and Massive Retaliation."
                    ],
                    "prelims_facts": [
                        "Launch site: Dr APJ Abdul Kalam Island (formerly Wheeler Island), off Odisha coast.",
                        "Other nations with MIRV: USA, Russia, China, France, UK."
                    ],
                    "mains_perspective": {
                        "dimensions": ["Second-Strike Capability", "Strategic Stability in Indo-Pacific", "Technological Autonomy"],
                        "challenges": ["Regional nuclear arms race dynamics", "BMD counter-proliferation treaties"],
                        "way_forward": "Integrate advanced satellite reconnaissance with canisterized mobile road-rail launch platforms."
                    },
                    "important_terms": ["MIRV", "Mission Divyastra", "Credible Minimum Deterrence", "No First Use (NFU)", "Solid Propellant"],
                    "possible_mains_questions": [
                        "How does the operationalization of MIRV (Multiple Independently Targetable Re-entry Vehicle) technology on the Agni-5 missile enhance India's strategic nuclear deterrence and second-strike capability? (150 words / 10 Marks)"
                    ],
                    "practice_mcqs": [
                        {
                            "question": "What is the primary technological significance of Multiple Independently Targetable Re-entry Vehicle (MIRV) technology tested under Mission Divyastra?",
                            "options": [
                                {"id": "A", "text": "It enables a single missile to carry multiple nuclear or conventional warheads assigned to different targets."},
                                {"id": "B", "text": "It transforms a ballistic missile into a low-flying supersonic cruise missile."},
                                {"id": "C", "text": "It uses liquid oxygen for atmospheric re-entry propulsion."},
                                {"id": "D", "text": "It eliminates the need for radar guidance during terminal phase."}
                            ],
                            "correct_answer": "A",
                            "explanation": "Option A is correct. MIRV enables a single ballistic missile to deploy multiple warheads, each capable of independently striking distinct targets at separate locations."
                        }
                    ]
                },
                {
                    "title": "India Adds 5 New Wetlands to Ramsar List, Total Tally Reaches Milestone 85",
                    "original_url": "https://pib.gov.in/PressReleasePage.aspx?PRID=2001150",
                    "source": "Ministry of Environment, Forest and Climate Change (MoEFCC)",
                    "category": "Environment & Ecology",
                    "gs_paper": "GS-III",
                    "image_url": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
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
                        "India has the largest network of Ramsar sites in South Asia (85 sites).",
                        "Sundarbans in West Bengal is the largest Ramsar site in India.",
                        "Renuka Wetland in Himachal Pradesh is the smallest Ramsar site in India."
                    ],
                    "prelims_facts": [
                        "Montreux Record is a register of wetland sites on the List of Wetlands of International Importance where ecological character changes have occurred.",
                        "Keoladeo National Park (Rajasthan) and Loktak Lake (Manipur) are currently in the Montreux Record."
                    ],
                    "mains_perspective": {
                        "dimensions": ["Ecosystem Services", "Flood Mitigation", "Ecotourism & Livelihoods"],
                        "challenges": ["Encroachment and urban runoff discharge", "Invasive alien weed proliferation"],
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
                            "explanation": "Loktak Lake (Manipur) and Keoladeo National Park (Rajasthan) are currently on the Montreux Record."
                        }
                    ]
                },
                {
                    "title": "ISRO Successfully Launches INSAT-3DS Meteorological Satellite via GSLV-F14",
                    "original_url": "https://www.isro.gov.in/GSLV-F14_INSAT-3DS_Mission.html",
                    "source": "ISRO / Department of Space",
                    "category": "Science & Technology",
                    "gs_paper": "GS-III",
                    "image_url": "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=80",
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
                            "explanation": "Cryogenic rocket engines use Liquid Hydrogen (LH2) at -253°C as fuel and Liquid Oxygen (LOX) at -183°C as oxidizer."
                        }
                    ]
                },
                {
                    "title": "National Green Hydrogen Mission: SIGHT Program Allocates Electrolyser Manufacturing Incentives",
                    "original_url": "https://pib.gov.in/PressReleasePage.aspx?PRID=1888547",
                    "source": "Ministry of New and Renewable Energy (MNRE)",
                    "category": "Science & Technology",
                    "gs_paper": "GS-III",
                    "image_url": "https://images.unsplash.com/photo-1497440001374-f26997328c1b?auto=format&fit=crop&w=1200&q=80",
                    "relevance_score": 93,
                    "is_featured": True,
                    "read_time_minutes": 3,
                    "short_summary": "Under the Strategic Interventions for Green Hydrogen Transition (SIGHT) scheme, financial tranches were awarded to scale domestic electrolyser manufacturing capacity to 1,500 MW per annum.",
                    "detailed_summary": "The initiative aims to build India as a global exporter of Green Hydrogen and Green Ammonia, decarbonizing heavy industries including steel, fertilizers, and refineries in alignment with Panchamrit COP26 net-zero 2070 targets.",
                    "why_in_news": "Notification of financial bid winners by Solar Energy Corporation of India (SECI).",
                    "what_happened": "SECI issued Letters of Award for 1.5 GW domestic electrolyser manufacturing capacity under Component I of SIGHT.",
                    "background": "The National Green Hydrogen Mission was approved in 2023 with an outlay of Rs 19,744 crore to produce 5 MMT of green hydrogen annually by 2030.",
                    "upsc_relevance": "Key topic in UPSC GS-III (Renewable Energy, Industrial Policy, Climate Mitigation) and Prelims.",
                    "key_facts": [
                        "Target: 5 MMT Green Hydrogen per annum by 2030 with 125 GW associated renewable capacity.",
                        "SIGHT Program: Component I (Electrolysers) and Component II (Green Hydrogen production).",
                        "Nodal Agency: Solar Energy Corporation of India (SECI)."
                    ],
                    "prelims_facts": [
                        "Green Hydrogen is produced through water electrolysis powered entirely by renewable energy (zero carbon emissions).",
                        "India aims for net-zero carbon emissions by 2070 (Panchamrit pledge)."
                    ],
                    "mains_perspective": {
                        "dimensions": ["Energy Security & Import Substitution", "Decarbonization of Hard-to-Abate Sectors", "Export Competitiveness"],
                        "challenges": ["High capital expenditure of electrolysers", "Water intensity in arid regions"],
                        "way_forward": "Incentivize captive renewable energy wheeling and promote desalination-based green hydrogen hubs along coastlines."
                    },
                    "important_terms": ["Electrolyser", "SIGHT Scheme", "Green Ammonia", "Net-Zero 2070", "Hard-to-Abate Sectors"],
                    "possible_mains_questions": [
                        "Explain how the National Green Hydrogen Mission can catalyze India's transition towards energy independence while meeting its COP26 climate commitments. (150 words / 10 Marks)"
                    ],
                    "practice_mcqs": [
                        {
                            "question": "Under India's National Green Hydrogen Mission, what is the targeted annual green hydrogen production capacity by 2030?",
                            "options": [
                                {"id": "A", "text": "5 Million Metric Tonnes (MMT)"},
                                {"id": "B", "text": "1 Million Metric Tonne (MMT)"},
                                {"id": "C", "text": "10 Million Metric Tonnes (MMT)"},
                                {"id": "D", "text": "25 Million Metric Tonnes (MMT)"}
                            ],
                            "correct_answer": "A",
                            "explanation": "The National Green Hydrogen Mission targets producing at least 5 MMT of green hydrogen per annum by 2030."
                        }
                    ]
                },
                {
                    "title": "PM Surya Ghar Muft Bijli Yojana: Cabinet Approves ₹75,000 Crore Rooftop Solar Scheme for 1 Crore Households",
                    "original_url": "https://pib.gov.in/PressReleasePage.aspx?PRID=2009088",
                    "source": "Ministry of New and Renewable Energy / PIB",
                    "category": "Government Schemes",
                    "gs_paper": "GS-II",
                    "image_url": "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80",
                    "relevance_score": 95,
                    "is_featured": True,
                    "read_time_minutes": 3,
                    "short_summary": "The Union Cabinet approved PM-Surya Ghar: Muft Bijli Yojana with an outlay of ₹75,021 crore to provide up to 300 units of free electricity monthly to 1 crore households through rooftop solar installations.",
                    "detailed_summary": "The scheme provides direct Central Financial Assistance (CFA) up to 60% for 2 kW systems and 40% for additional capacity up to 3 kW. It integrates collateral-free low-interest loans (around 7%) through national portal applications.",
                    "why_in_news": "Cabinet approval and nationwide operationalization of the PM Surya Ghar Portal.",
                    "what_happened": "Comprehensive scheme rollout targeting 30 GW rooftop solar capacity additions in the residential sector.",
                    "background": "India achieved over 70 GW of total solar capacity by 2024 as part of its Nationally Determined Contributions (NDC) to reach 500 GW non-fossil energy by 2030.",
                    "upsc_relevance": "GS-II (Govt Schemes, Welfare Policies) & GS-III (Renewable Energy, DISCOM Health).",
                    "key_facts": [
                        "Subsidies: ₹30,000 per kW up to 2 kW; ₹18,000 for 3rd kW.",
                        "Target: 1 crore households generating ~1000 BUs of clean electricity and cutting 720 million tonnes of CO2 emissions.",
                        "DISCOM incentives: Direct financial grants for distribution infrastructure upgrades."
                    ],
                    "prelims_facts": [
                        "Nodal agency: National Portal for Rooftop Solar (REC Limited as implementing lead).",
                        "India's NDC target: 50% cumulative electric power installed capacity from non-fossil fuel-based energy resources by 2030."
                    ],
                    "mains_perspective": {
                        "dimensions": ["Decentralized Renewable Generation", "Relief to State DISCOM Finances", "Green Job Creation"],
                        "challenges": ["Net metering policy variations across States", "Roof structural integrity in semi-urban areas"],
                        "way_forward": "Standardize grid-tie inverter inspections and establish district solar service centers (Surya Mitras)."
                    },
                    "important_terms": ["PM Surya Ghar", "DISCOM", "Net Metering", "NDC Targets", "Surya Mitra"],
                    "possible_mains_questions": [
                        "How does the PM Surya Ghar Muft Bijli Yojana address the twin challenges of household energy security and state power distribution company (DISCOM) financial viability? (150 words / 10 Marks)"
                    ],
                    "practice_mcqs": [
                        {
                            "question": "What is the key target of the PM-Surya Ghar: Muft Bijli Yojana approved by the Union Cabinet?",
                            "options": [
                                {"id": "A", "text": "Provide rooftop solar installations and up to 300 units free monthly power to 1 crore households."},
                                {"id": "B", "text": "Replace all diesel agricultural pumps with off-grid micro-hydro units."},
                                {"id": "C", "text": "Mandate 100% solar power for all commercial shopping malls by 2025."},
                                {"id": "D", "text": "Export green solar power to Southeast Asian nations through undersea cables."}
                            ],
                            "correct_answer": "A",
                            "explanation": "Option A is correct. PM-Surya Ghar aims to install rooftop solar in 1 crore households, providing up to 300 units of free electricity every month."
                        }
                    ]
                },
                {
                    "title": "Minimum Support Price (MSP) and CACP Formula: Swaminathan Commission 50% Profit Margin Principles Explained",
                    "original_url": "https://cacp.dacnet.nic.in/ViewContent.aspx?Itemid=1073",
                    "source": "Commission for Agricultural Costs and Prices (CACP) / Ministry of Agriculture",
                    "category": "Geography & Agriculture",
                    "gs_paper": "GS-III",
                    "image_url": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80",
                    "relevance_score": 95,
                    "is_featured": False,
                    "read_time_minutes": 4,
                    "short_summary": "Agricultural pricing dynamics and the statutory debate surrounding Minimum Support Price (MSP) calculation methodologies (A2, A2+FL, and C2) recommended by the National Commission on Farmers headed by Prof. M.S. Swaminathan.",
                    "detailed_summary": "The Commission for Agricultural Costs and Prices (CACP) recommends MSP for 22 mandated crops and Fair and Remunerative Price (FRP) for sugarcane. Government sets MSP at a minimum of 1.5 times the all-India weighted average cost of production (A2+FL).",
                    "why_in_news": "Debate on legal guarantee for MSP and implementation of Swaminathan Commission recommendations.",
                    "what_happened": "Cabinet notified revised MSP for Kharif and Rabi marketing seasons ensuring guaranteed 50% return over cost A2+FL.",
                    "background": "The National Commission on Farmers (2004-2006) submitted five reports recommending comprehensive agricultural reforms, including MSP at C2+50%.",
                    "upsc_relevance": "Core topic for UPSC CSE Prelims & GS-III (Agricultural Economics, Farm Subsidies, Food Security).",
                    "key_facts": [
                        "Mandated crops: 7 cereals, 5 pulses, 7 oilseeds, and 3 commercial crops (cotton, raw jute, copra).",
                        "A2 Cost: Paid-out costs on seeds, fertilizers, pesticides, hired labor, fuel, and irrigation.",
                        "A2+FL Cost: A2 cost plus imputed value of unpaid family labor.",
                        "C2 Cost: Comprehensive cost including A2+FL plus rentals/interest on owned land and fixed capital."
                    ],
                    "prelims_facts": [
                        "CACP is an attached office of the Ministry of Agriculture and Farmers Welfare.",
                        "Cabinet Committee on Economic Affairs (CCEA) chaired by the Prime Minister takes the final decision on MSP levels."
                    ],
                    "mains_perspective": {
                        "dimensions": ["Income Security for Farmers", "Crop Diversification away from Water-Intensive Paddy", "Inflationary & Fiscal Impacts"],
                        "challenges": ["Procurement concentration in select States (Punjab, Haryana, MP)", "WTO Agreement on Agriculture Aggregate Measurement of Support (AMS) limits"],
                        "way_forward": "Promote Price Deficiency Payment schemes (like Bhavantar Bhugtan Yojana) and decentralized procurement of millets (Shree Anna) and pulses."
                    },
                    "important_terms": ["MSP", "CACP", "CCEA", "A2+FL", "C2 Formula", "Swaminathan Commission", "FRP Sugarcane"],
                    "possible_mains_questions": [
                        "Distinguish between A2+FL and C2 cost metrics in the determination of Minimum Support Price (MSP). What are the fiscal, economic, and crop diversification implications of providing a statutory guarantee for MSP in India? (250 words / 15 Marks)"
                    ],
                    "practice_mcqs": [
                        {
                            "question": "Which authority takes the final decision on the Minimum Support Prices (MSP) recommended by the Commission for Agricultural Costs and Prices (CACP)?",
                            "options": [
                                {"id": "A", "text": "Cabinet Committee on Economic Affairs (CCEA)"},
                                {"id": "B", "text": "NITI Aayog Governing Council"},
                                {"id": "C", "text": "Reserve Bank of India Monetary Policy Committee"},
                                {"id": "D", "text": "Parliamentary Standing Committee on Agriculture"}
                            ],
                            "correct_answer": "A",
                            "explanation": "The final decision on MSP is taken by the Cabinet Committee on Economic Affairs (CCEA) chaired by the Prime Minister."
                        }
                    ]
                },
                {
                    "title": "Defence Acquisition Council Clears ₹84,560 Crore Indigenous Military Procurement under Make in India",
                    "original_url": "https://www.indiatoday.in/india/story/defence-acquisition-council-nod-for-procurement-of-weapons-military-equipment-2502184-2024-02-16",
                    "source": "India Today / Defence News",
                    "category": "Defence & Security",
                    "gs_paper": "GS-III",
                    "image_url": "https://images.unsplash.com/photo-1579975096649-e773152b04cb?auto=format&fit=crop&w=1200&q=80",
                    "relevance_score": 96,
                    "is_featured": True,
                    "read_time_minutes": 4,
                    "short_summary": "The Defence Acquisition Council (DAC) chaired by Defence Minister Rajnath Singh accorded Acceptance of Necessity (AoN) for capital acquisition proposals worth ₹84,560 crore for the Armed Forces.",
                    "detailed_summary": "The cleared procurements emphasize 'Buy (Indian-Indigenously Designed, Developed and Manufactured - IDDM)' category, including new generation anti-tank mines, flight refueler aircraft (FRA), heavy heavyweight torpedoes, and medium-range maritime reconnaissance platforms.",
                    "why_in_news": "Strategic DAC clearance boosting indigenous defence manufacturing and self-reliance (Aatmanirbhar Bharat).",
                    "what_happened": "Acceptance of Necessity granted for 100% indigenous procurement to strengthen tri-services combat readiness.",
                    "background": "The DAC is the highest decision-making body of the Ministry of Defence for capital procurement, established post-Kargil War (2001) recommendations.",
                    "upsc_relevance": "Directly relevant for UPSC GS-III (Defence Indigenization, Security Challenges, Defence Procurement Procedure DPP/DAP 2020).",
                    "key_facts": [
                        "DAC Chairperson: Union Defence Minister.",
                        "Category: Buy (Indian-IDDM) accorded highest procurement priority under DAP 2020.",
                        "Defence indigenization target: Over 70% domestic defence procurement by 2025-26."
                    ],
                    "prelims_facts": [
                        "Defence Acquisition Procedure (DAP) 2020 mandates 50% indigenous content in Buy (Indian-IDDM).",
                        "Strategic Partnership (SP) model enables private Indian firms to tie up with global OEMs."
                    ],
                    "mains_perspective": {
                        "dimensions": ["Military Modernization", "Indigenous R&D and Defence Exports", "Fiscal Capital Outlay"],
                        "challenges": ["Transfer of technology absorption delays", "Component supply chain dependencies"],
                        "way_forward": "Incentivize defence MSMEs and streamline Innovations for Defence Excellence (iDEX) funding."
                    },
                    "important_terms": ["DAC", "Acceptance of Necessity (AoN)", "Buy (Indian-IDDM)", "DAP 2020", "iDEX"],
                    "possible_mains_questions": [
                        "Assess how the Defence Acquisition Procedure (DAP) 2020 has catalyzed India's transition from the world's largest arms importer towards a net defence exporter. (150 words / 10 Marks)"
                    ],
                    "practice_mcqs": [
                        {
                            "question": "Who serves as the Chairperson of the Defence Acquisition Council (DAC) in India?",
                            "options": [
                                {"id": "A", "text": "Union Minister of Defence"},
                                {"id": "B", "text": "Prime Minister of India"},
                                {"id": "C", "text": "Chief of Defence Staff (CDS)"},
                                {"id": "D", "text": "National Security Advisor (NSA)"}
                            ],
                            "correct_answer": "A",
                            "explanation": "The Defence Acquisition Council (DAC) is chaired by the Union Minister of Defence."
                        }
                    ]
                },
                {
                    "title": "India Semiconductor Mission: Tata & Powerchip Break Ground on First Commercial 28nm Semiconductor Fab in Dholera",
                    "original_url": "https://www.indiatoday.in/technology/news/story/tata-groups-semiconductor-plant-in-gujarat-begins-construction-details-here-2514332-2024-03-13",
                    "source": "India Today / Science & Tech",
                    "category": "Science & Technology",
                    "gs_paper": "GS-III",
                    "image_url": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
                    "relevance_score": 97,
                    "is_featured": True,
                    "read_time_minutes": 4,
                    "short_summary": "Construction commenced on India's first commercial semiconductor fabrication facility in Dholera, Gujarat, with a ₹91,000 crore investment to produce 50,000 silicon wafers monthly.",
                    "detailed_summary": "The fab is a joint venture between Tata Electronics and Taiwan's Powerchip Semiconductor Manufacturing Corporation (PSMC), establishing domestic production of 28nm and 90nm chips for power management, electric vehicles, AI hardware, and consumer electronics.",
                    "why_in_news": "Milestone transition from chip design to domestic silicon wafer fabrication under the India Semiconductor Mission (ISM).",
                    "what_happened": "Groundbreaking ceremony at Dholera Special Investment Region (DSIR), Gujarat.",
                    "background": "The ₹76,000 crore India Semiconductor Mission (ISM) approved by the Union Cabinet provides 50% fiscal support for setting up silicon fabs and display fabs.",
                    "upsc_relevance": "Core topic under GS-III (Science & Technology, Industrial Policy, Critical & Emerging Technologies, Supply Chain Resilience).",
                    "key_facts": [
                        "Fab Capacity: 50,000 wafer starts per month (WSPM).",
                        "Node Technologies: 28nm, 40nm, 90nm (mature high-volume automotive and IoT nodes).",
                        "Location: Dholera Special Investment Region (Gujarat)."
                    ],
                    "prelims_facts": [
                        "Silicon is the primary semiconductor element due to its wide bandgap and abundance in Earth's crust (silica sand).",
                        "India Semiconductor Mission is an independent business division within Digital India Corporation under MeitY."
                    ],
                    "mains_perspective": {
                        "dimensions": ["Geopolitical Supply Chain Resilience", "Electronics Manufacturing Ecosystem", "Deep-Tech Employment"],
                        "challenges": ["Ultra-pure water and uninterrupted power requirements", "Global talent pool competition"],
                        "way_forward": "Scale domestic chemical and specialty gas ecosystems and foster university chip-design curricula under the Chips2Startup program."
                    },
                    "important_terms": ["Semiconductor Fab", "India Semiconductor Mission", "28nm Node", "Dholera DSIR", "Silicon Wafer"],
                    "possible_mains_questions": [
                        "Examine the strategic and economic significance of establishing domestic semiconductor wafer fabrication facilities in India. How does the India Semiconductor Mission address vulnerabilities in critical technology supply chains? (250 words / 15 Marks)"
                    ],
                    "practice_mcqs": [
                        {
                            "question": "Under the modified India Semiconductor Mission (ISM), what percentage of fiscal support on a pari-passu basis is provided by the Central Government for setting up Silicon Semiconductor Fabs in India?",
                            "options": [
                                {"id": "A", "text": "50% of the Capital Expenditure"},
                                {"id": "B", "text": "25% of the Capital Expenditure"},
                                {"id": "C", "text": "75% of the Capital Expenditure"},
                                {"id": "D", "text": "10% of the Capital Expenditure"}
                            ],
                            "correct_answer": "A",
                            "explanation": "The Government of India provides fiscal support of 50% of Capital Expenditure (CapEx) on a pari-passu basis for setting up Silicon Semiconductor Fabs across all technology nodes."
                        }
                    ]
                }
            ]

            # Upsert each seed article and always synchronize authentic URLs & verified images
            for s in seed_data:
                existing = NewsArticle.query.filter(NewsArticle.title == s["title"]).first()
                if not existing:
                    art = NewsArticle(
                        title=s["title"],
                        original_url=s["original_url"],
                        source=s["source"],
                        published_at=today,
                        category=s["category"],
                        gs_paper=s["gs_paper"],
                        image_url=s.get("image_url") or get_category_default_image(s["category"], s["gs_paper"]),
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
                else:
                    # Synchronize updated verified URLs, curated images, and details
                    existing.original_url = s["original_url"]
                    existing.image_url = s.get("image_url") or get_category_default_image(s["category"], s["gs_paper"])
                    existing.source = s["source"]
                    existing.short_summary = s["short_summary"]
                    existing.detailed_summary = s["detailed_summary"]
                    existing.why_in_news = s["why_in_news"]
                    existing.what_happened = s["what_happened"]
                    existing.background = s["background"]
                    existing.key_facts = s["key_facts"]
                    existing.prelims_facts = s["prelims_facts"]
                    existing.mains_perspective = s["mains_perspective"]
                    existing.important_terms = s["important_terms"]
                    existing.possible_mains_questions = s["possible_mains_questions"]
                    existing.practice_mcqs = s["practice_mcqs"]
            
            # Clean any legacy generic pib links in the database
            generic_pib_articles = NewsArticle.query.filter(NewsArticle.original_url == "https://pib.gov.in").all()
            for pib_art in generic_pib_articles:
                pib_art.original_url = "https://pib.gov.in/allRel.aspx"

            db.session.commit()
            self._seed_synced = True
            logger.info("Successfully verified, synchronized and seeded high-yield UPSC Current Affairs articles.")
        except Exception as e:
            logger.warning(f"Seed articles check error: {e}")
            try:
                db.session.rollback()
            except Exception:
                pass

news_service = NewsService()
