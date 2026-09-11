import logging
import sys

def setup_logging(app):
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    )
    handler.setFormatter(formatter)
    handler.setLevel(logging.INFO)
    
    app.logger.setLevel(logging.INFO)
    if not app.logger.handlers:
        app.logger.addHandler(handler)
        
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
