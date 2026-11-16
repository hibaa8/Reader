from flask import Flask, request, session
from .database import db
import os
import secrets
import hmac
from datetime import timedelta


def _secret_key(instance_dir):
    configured = os.environ.get('READER_SECRET_KEY')
    if configured:
        return configured
    path = os.path.join(instance_dir, '.secret_key')
    try:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as file:
            file.write(secrets.token_urlsafe(48))
    except FileExistsError:
        pass
    with open(path) as file:
        return file.read().strip()


def create_app(test_config=None):
    app = Flask(__name__)
    
    base_dir = os.path.abspath(os.path.dirname(__file__))
    instance_dir = os.path.join(base_dir, 'instance')
    os.makedirs(instance_dir, exist_ok=True)
    db_path = os.path.join(instance_dir, "summaries.db")
    users_path = os.path.join(instance_dir, 'users.db')
    
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"
    app.config['SQLALCHEMY_BINDS'] = {'users': f'sqlite:///{users_path}'}
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = _secret_key(instance_dir)
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = os.environ.get('READER_SECURE_COOKIES') == '1'
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=14)
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024
    if test_config:
        app.config.update(test_config)
    db.init_app(app)
    from .database import models  # Register all model tables before creating the private database.
    with app.app_context():
        db.create_all(bind_key='users')
    if os.path.exists(users_path):
        os.chmod(users_path, 0o600)

    @app.before_request
    def check_csrf():
        if request.path.startswith('/api/') and request.method in {'POST', 'PUT', 'PATCH', 'DELETE'}:
            token = session.get('csrf_token', '')
            provided = request.headers.get('X-CSRF-Token', '')
            if not token or not hmac.compare_digest(token, provided):
                return {'error': 'Invalid request token'}, 403

    from .routes import routes
    from .auth import auth
    app.register_blueprint(routes, url_prefix='/')
    app.register_blueprint(auth, url_prefix='/api')

    @app.after_request
    def security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['X-Frame-Options'] = 'DENY'
        if request.path.startswith('/api/auth/') or request.path.startswith('/api/progress'):
            response.headers['Cache-Control'] = 'no-store'
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; script-src 'self'; style-src 'self'; "
            "img-src 'self' https://www.gutenberg.org; connect-src 'self'; "
            "object-src 'none'; base-uri 'self'"
        )
        return response

    return app


if __name__ == "__main__":
    app = create_app()
    app.run()
