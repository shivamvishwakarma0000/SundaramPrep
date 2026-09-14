import logging
from flask import Blueprint, request, jsonify
from app.services.news_service import news_service
from app.services.push_notification_service import push_service
from app.models.core import db
from app.models.current_affairs import NewsArticle, NewsBookmark, PushSubscription, NotificationPreference
from app.models.user import User
from app.utils.responses import api_success, api_error
from app.utils.security import decode_jwt

logger = logging.getLogger(__name__)

news_bp = Blueprint("current_affairs", __name__, url_prefix="/api")

def get_current_user_id():
    auth_header = request.headers.get("Authorization", "")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        decoded = decode_jwt(token)
        if decoded:
            return decoded.get("sub")
            
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        decoded = decode_jwt(cookie_token)
        if decoded:
            return decoded.get("sub")
            
    return None

# =========================================================================
# 1. NEWS FEED & BROWSING
# =========================================================================
@news_bp.route("/news", methods=["GET"])
def get_news_feed():
    category = request.args.get("category")
    search_query = request.args.get("search")
    date_filter = request.args.get("date")
    gs_paper = request.args.get("gs_paper")
    source = request.args.get("source")
    page = int(request.args.get("page", 1))
    limit = min(int(request.args.get("limit", 12)), 30)
    only_featured = request.args.get("featured", "").lower() in ("true", "1")

    data = news_service.get_articles(
        category=category,
        search_query=search_query,
        date_filter=date_filter,
        gs_paper=gs_paper,
        source=source,
        page=page,
        limit=limit,
        only_featured=only_featured
    )
    return api_success(data)


@news_bp.route("/news/today", methods=["GET"])
def get_todays_news():
    data = news_service.get_todays_digest()
    return api_success(data)


@news_bp.route("/news/<article_id>", methods=["GET"])
def get_news_detail(article_id):
    user_id = get_current_user_id()
    data = news_service.get_article_detail(article_id)
    if not data:
        return api_error("News article not found", status_code=404)

    # Track as read to avoid spamming notification
    push_service.mark_article_read(user_id, article_id)

    # Check if student has bookmarked this article
    is_bookmarked = False
    if user_id:
        bm = NewsBookmark.query.filter_by(user_id=user_id, article_id=article_id).first()
        is_bookmarked = bool(bm)

    data["is_bookmarked"] = is_bookmarked
    return api_success(data)


# =========================================================================
# 2. AI TRANSFORMATIONS & CONTEXTUAL CHAT
# =========================================================================
@news_bp.route("/news/<article_id>/ai-action", methods=["POST"])
def execute_news_ai_action(article_id):
    payload = request.get_json() or {}
    action_type = payload.get("action_type", "EXPLAIN_SIMPLY")

    res = news_service.execute_ai_action(article_id, action_type)
    if "error" in res:
        return api_error(res["error"], status_code=404)
    return api_success(res)


@news_bp.route("/news/<article_id>/ai-chat", methods=["POST"])
def chat_about_news(article_id):
    payload = request.get_json() or {}
    query = payload.get("query", "").strip()
    history = payload.get("conversation_history", [])

    if not query:
        return api_error("Query cannot be empty", status_code=400)

    res = news_service.chat_about_article(article_id, query, history)
    return api_success(res)


@news_bp.route("/news/refresh", methods=["POST"])
def refresh_news_feed():
    user_id = get_current_user_id()
    # Allow refresh freely or check role
    res = news_service.refresh_news(force_fetch=True)
    return api_success(res)


# =========================================================================
# 3. BOOKMARKS & SAVED CURRENT AFFAIRS
# =========================================================================
@news_bp.route("/news/<article_id>/bookmark", methods=["POST", "DELETE"])
def toggle_news_bookmark(article_id):
    user_id = get_current_user_id()
    if not user_id:
        return api_error("Authentication required to save articles", status_code=401)

    article = NewsArticle.query.get(article_id)
    if not article:
        return api_error("Article not found", status_code=404)

    existing = NewsBookmark.query.filter_by(user_id=user_id, article_id=article_id).first()

    if request.method == "DELETE" or (request.method == "POST" and existing):
        if existing:
            db.session.delete(existing)
            article.bookmarks_count = max(0, (article.bookmarks_count or 1) - 1)
            db.session.commit()
        return api_success({"is_bookmarked": False, "message": "Article removed from saved list."})

    # Save bookmark
    new_bm = NewsBookmark(user_id=user_id, article_id=article_id)
    db.session.add(new_bm)
    article.bookmarks_count = (article.bookmarks_count or 0) + 1
    db.session.commit()
    return api_success({"is_bookmarked": True, "message": "Article saved for revision."})


@news_bp.route("/news/saved", methods=["GET"])
def get_saved_news():
    user_id = get_current_user_id()
    if not user_id:
        return api_error("Authentication required to view saved articles", status_code=401)

    page = int(request.args.get("page", 1))
    limit = min(int(request.args.get("limit", 15)), 30)
    offset = (page - 1) * limit

    query = NewsBookmark.query.filter_by(user_id=user_id).order_by(NewsBookmark.created_at.desc())
    total = query.count()
    bookmarks = query.offset(offset).limit(limit).all()

    return api_success({
        "total": total,
        "page": page,
        "limit": limit,
        "saved_articles": [bm.to_dict() for bm in bookmarks if bm.article is not None]
    })


# =========================================================================
# 4. WEB PUSH NOTIFICATIONS & PREFERENCES
# =========================================================================
@news_bp.route("/push/vapid-key", methods=["GET"])
def get_vapid_key():
    return api_success({"public_key": push_service.get_public_key()})


@news_bp.route("/push/subscribe", methods=["POST"])
def subscribe_push():
    user_id = get_current_user_id()
    payload = request.get_json() or {}
    endpoint = payload.get("endpoint")
    keys = payload.get("keys", {})
    p256dh = keys.get("p256dh") or payload.get("p256dh_key")
    auth = keys.get("auth") or payload.get("auth_key")
    user_agent = request.headers.get("User-Agent")

    res = push_service.register_subscription(
        endpoint=endpoint,
        p256dh_key=p256dh,
        auth_key=auth,
        user_id=user_id,
        user_agent=user_agent
    )

    if not res.get("success"):
        return api_error(res.get("error", "Failed to subscribe"), status_code=400)
    return api_success(res)


@news_bp.route("/push/unsubscribe", methods=["POST"])
def unsubscribe_push():
    payload = request.get_json() or {}
    endpoint = payload.get("endpoint")
    if not endpoint:
        return api_error("Endpoint is required", status_code=400)
    res = push_service.unsubscribe(endpoint)
    return api_success(res)


@news_bp.route("/push/preferences", methods=["GET", "PUT"])
def handle_push_preferences():
    user_id = get_current_user_id()

    if request.method == "GET":
        pref = push_service.get_user_preferences(user_id)
        return api_success(pref)

    if not user_id:
        return api_error("Authentication required to save custom notification preferences", status_code=401)

    payload = request.get_json() or {}
    updated = push_service.update_user_preferences(user_id, payload)
    return api_success(updated)


@news_bp.route("/push/test", methods=["POST"])
def send_test_push():
    payload = request.get_json() or {}
    endpoint = payload.get("endpoint")
    if not endpoint:
        return api_error("Endpoint is required", status_code=400)
    res = push_service.send_test_notification(endpoint)
    return api_success(res)


# =========================================================================
# 5. ADMIN EDITORIAL & AUTOMATED CRON DISPATCHER
# =========================================================================
@news_bp.route("/admin/news/trigger-hourly-push", methods=["POST"])
def trigger_hourly_push():
    """Triggered by internal scheduler or Render cron job every hour."""
    res = push_service.send_hourly_current_affairs_reminders()
    return api_success(res)


@news_bp.route("/admin/news/stats", methods=["GET"])
def admin_news_stats():
    total_articles = NewsArticle.query.count()
    published = NewsArticle.query.filter_by(is_published=True).count()
    featured = NewsArticle.query.filter_by(is_featured=True).count()
    total_subscriptions = PushSubscription.query.filter_by(is_active=True).count()
    return api_success({
        "total_articles": total_articles,
        "published_articles": published,
        "featured_articles": featured,
        "active_push_subscribers": total_subscriptions
    })


@news_bp.route("/admin/news/fetch", methods=["POST"])
def admin_fetch_news():
    user_id = get_current_user_id()
    user = User.query.get(user_id) if user_id else None
    if user and user.role != "ADMIN":
        return api_error("Admin privileges required", status_code=403)
        
    res = news_service.refresh_news(force_fetch=True)
    return api_success(res)


@news_bp.route("/admin/news/<article_id>", methods=["PUT", "DELETE"])
def admin_manage_article(article_id):
    user_id = get_current_user_id()
    user = User.query.get(user_id) if user_id else None
    if user and user.role != "ADMIN":
        return api_error("Admin privileges required", status_code=403)

    article = NewsArticle.query.get(article_id)
    if not article:
        return api_error("Article not found", status_code=404)

    if request.method == "DELETE":
        db.session.delete(article)
        db.session.commit()
        return api_success({"message": "Article deleted successfully"})

    payload = request.get_json() or {}
    if "title" in payload:
        article.title = payload["title"]
    if "category" in payload:
        article.category = payload["category"]
    if "gs_paper" in payload:
        article.gs_paper = payload["gs_paper"]
    if "relevance_score" in payload:
        article.relevance_score = int(payload["relevance_score"])
    if "is_featured" in payload:
        article.is_featured = bool(payload["is_featured"])
    if "is_published" in payload:
        article.is_published = bool(payload["is_published"])
    if "short_summary" in payload:
        article.short_summary = payload["short_summary"]

    db.session.commit()
    return api_success({"message": "Article updated", "article": article.to_dict()})
