import os

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from database.models import db


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    CORS(app, supports_credentials=True, origins=os.environ.get('CORS_ORIGINS', 'http://localhost:5173').split(','))
    JWTManager(app)

    from routes.auth import auth_bp
    from routes.tickets import tickets_bp
    from routes.admin import admin_bp
    from routes.leaderboard import leaderboard_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(tickets_bp, url_prefix='/api/tickets')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(leaderboard_bp, url_prefix='/api/leaderboard')

    with app.app_context():
        db.create_all()
        _seed_defaults()

    @app.get('/health')
    def health():
        return {'status': 'healthy'}

    return app


def _seed_defaults():
    """Create default accounts if the users table is empty."""
    from database.models import User, Role
    import bcrypt

    if User.query.first() is not None:
        return

    defaults = [
        ('White Cell Admin', 'white@cyberx.local', 'admin123', Role.WHITE),
        ('Red Cell', 'red@cyberx.local', 'red123', Role.RED),
        ('Blue Team', 'blue@cyberx.local', 'blue123', Role.BLUE),
    ]

    for name, email, password, role in defaults:
        pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        db.session.add(User(name=name, email=email, password_hash=pw_hash, role=role))

    db.session.commit()
    print('[SEED] Default accounts created: white@cyberx.local, red@cyberx.local, blue@cyberx.local')


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
