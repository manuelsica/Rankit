from flask import Flask
from .config import Settings
from .database import init_app as init_db
from .views import search_bp

def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Settings())
    init_db(app)
    app.register_blueprint(search_bp)
    return app
