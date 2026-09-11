import os
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from app.config import config
from app.models.core import db
from app.utils.logging import setup_logging
from app.utils.responses import api_error

migrate = Migrate()

def create_app(config_class=config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Configure structured logging
    setup_logging(app)
    
    # Enable CORS for frontend integration
    cors_origins = [o.strip() for o in config.CORS_ORIGINS.split(",") if o.strip()] if config.CORS_ORIGINS != "*" else "*"
    CORS(app, resources={r"/api/*": {"origins": cors_origins}}, supports_credentials=True)
    
    # Initialize DB & Migration Engine
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Register blueprints
    from app.routes import health_bp, auth_bp, questions_bp, practice_bp, ai_bp, pdf_bp, student_bp
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(questions_bp)
    app.register_blueprint(practice_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(pdf_bp)
    app.register_blueprint(student_bp)

    # Automatically ensure questions are seeded on startup
    with app.app_context():
        try:
            db.create_all()
            from seed_data import seed_normalized_database
            seed_normalized_database()
        except Exception as e:
            app.logger.warning(f"Auto-seed check: {e}")
    
    # Root status endpoint
    @app.route("/")
    def index():
        return {
            "service": "Sundaram Prep Backend API",
            "tagline": "Practice. Focus. Improve.",
            "status": "online",
            "version": "1.0.0",
            "health": "/api/health",
            "frontend": config.FRONTEND_URL
        }, 200

    # Global error handlers
    @app.errorhandler(404)
    def handle_404(e):
        return api_error("The requested endpoint was not found.", code="NOT_FOUND", status_code=404)

    @app.errorhandler(500)
    def handle_500(e):
        app.logger.error(f"Internal server error: {e}")
        return api_error("An unexpected internal server error occurred.", code="INTERNAL_SERVER_ERROR", status_code=500)
            
    return app
