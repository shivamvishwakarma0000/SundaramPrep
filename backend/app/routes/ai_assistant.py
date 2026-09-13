import json
import logging
from flask import Blueprint, request, Response, stream_with_context
from app.services.ai_service import ai_service
from app.models import Question
from app.utils.responses import api_success, api_error

logger = logging.getLogger(__name__)

ai_bp = Blueprint("ai_assistant", __name__, url_prefix="/api/ai")

@ai_bp.route("/chat", methods=["POST"])
def assistant_chat():
    payload = request.get_json() or {}
    query = payload.get("query", "").strip()
    context = payload.get("context")  # Optional question details
    language_mode = payload.get("language_mode", "EN")  # EN, HI, HINGLISH
    
    if not query:
        return api_error("Query cannot be empty", status_code=400)
        
    response = ai_service.ask_assistant(
        query=query,
        context=context,
        language_mode=language_mode
    )
    
    return api_success(response)

@ai_bp.route("/chat/stream", methods=["POST"])
def assistant_chat_stream():
    """
    Streaming AI chat endpoint with real-time SSE tokens,
    conversation history context, and question context injection.
    """
    payload = request.get_json() or {}
    query = payload.get("query", "").strip()
    conversation_history = payload.get("conversation_history", [])
    context = payload.get("context")
    language_mode = payload.get("language_mode", "EN")
    
    if not query:
        return api_error("Query cannot be empty", status_code=400)

    def generate():
        try:
            for event in ai_service.ask_assistant_stream(
                query=query,
                conversation_history=conversation_history,
                context=context,
                language_mode=language_mode
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            logger.error(f"Error in chat stream generator: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'AI service encountered a temporary interruption. Please try again.'})}\n\n"

    response = Response(stream_with_context(generate()), mimetype="text/event-stream")
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
    return response

@ai_bp.route("/tutor-action", methods=["POST"])
def tutor_question_action():
    """
    Contextual AI Tutor Action endpoint for in-question assistance.
    Supports:
    - EXPLAIN_SIMPLY
    - WHY_WRONG
    - EXPLAIN_HINDI
    - EXPLAIN_HINGLISH
    - MEMORY_TRICK
    - SIMILAR_QUESTION
    - DETAILED_EXPLANATION
    """
    payload = request.get_json() or {}
    action_type = payload.get("action_type", "EXPLAIN_SIMPLY")
    question_id = payload.get("question_id")
    user_selected = payload.get("user_selected")
    language_mode = payload.get("language_mode", "EN")
    
    question_data = {}
    if question_id:
        q = Question.query.get(question_id)
        if q:
            question_data = q.to_dict()
    if not question_data and "question" in payload:
        question_data = payload["question"]
        
    if not question_data:
        return api_error("Question data or valid question_id is required", status_code=400)
        
    response = ai_service.tutor_question_action(
        question=question_data,
        action_type=action_type,
        user_selected=user_selected,
        language_mode=language_mode
    )
    
    return api_success(response)

@ai_bp.route("/explain-question", methods=["POST"])
def explain_question():
    payload = request.get_json() or {}
    question_id = payload.get("question_id")
    mode = payload.get("mode", "STANDARD")  # STANDARD, HINGLISH, WHY_WRONG, MEMORY_TRICK
    user_selected = payload.get("user_selected")
    
    question = Question.query.get(question_id) if question_id else None
    
    context = {
        "question_text": question.question_text if question else payload.get("question_text", ""),
        "options": question.to_dict()["options"] if question else payload.get("options", []),
        "correct_answer": question.correct_answer if question else payload.get("correct_answer", ""),
        "subject": question.subject if question else payload.get("subject", "General")
    }
    
    if mode == "HINGLISH":
        query = "Explain this question and why the correct answer is right in simple Hinglish."
        lang = "HINGLISH"
    elif mode == "WHY_WRONG":
        query = f"I chose option {user_selected}, but the correct option was {context['correct_answer']}. Why is my chosen option wrong and what was the conceptual trap?"
        lang = "EN"
    elif mode == "MEMORY_TRICK":
        query = "Give me a high-retention memory trick or mnemonic to remember this specific fact forever."
        lang = "EN"
    else:
        query = "Provide a high-yield exam explanation: Answer, Why, Quick Fact, Memory Trick."
        lang = "EN"
        
    response = ai_service.ask_assistant(query=query, context=context, language_mode=lang)
    return api_success(response)
