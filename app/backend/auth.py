"""Account and reading-progress API. Account data lives outside the public catalog DB."""

from datetime import datetime, timedelta, timezone
import hashlib
import math
import re
import secrets

from flask import Blueprint, jsonify, request, session
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from .database import db
from .database.models import AuthThrottle, Book, ReadingProgress, User
from .database.db_handler import ADDED_BOOKS


auth = Blueprint('auth', __name__)
EMAIL_RE = re.compile(r'^[^@\s]{1,64}@[^@\s]{1,190}$')


def now_utc():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def current_user():
    user_id = session.get('user_id')
    return db.session.get(User, user_id) if isinstance(user_id, int) else None


def user_json(user):
    return {'id': user.id, 'email': user.email, 'name': user.display_name} if user else None


def throttle_key(scope, identity):
    address = request.remote_addr or 'unknown'
    return hashlib.sha256(f'{scope}:{address}:{identity}'.encode()).hexdigest()


def blocked(key, limit, window):
    row = db.session.get(AuthThrottle, key)
    if not row:
        return False
    if now_utc() - row.window_started > window:
        db.session.delete(row)
        db.session.commit()
        return False
    return row.attempts >= limit


def count_attempt(key):
    row = db.session.get(AuthThrottle, key)
    if row is None:
        db.session.add(AuthThrottle(key=key, attempts=1, window_started=now_utc()))
    else:
        row.attempts += 1
    db.session.commit()


def authenticated():
    user = current_user()
    if user is None:
        return None, (jsonify({'error': 'Sign in to save progress'}), 401)
    return user, None


def progress_json(row):
    return {
        'bookId': row.book_id,
        'percent': round(row.percent, 1),
        'completed': row.completed,
        'updatedAt': row.updated_at.isoformat() + 'Z',
    }


def validated_progress(data):
    if not isinstance(data, dict) or type(data.get('completed')) is not bool:
        return None
    percent = data.get('percent')
    if type(percent) not in (int, float) or not math.isfinite(percent) or not 0 <= percent <= 100:
        return None
    return float(percent), data['completed']


@auth.get('/auth/me')
def me():
    if 'csrf_token' not in session:
        session['csrf_token'] = secrets.token_urlsafe(32)
    return jsonify({'user': user_json(current_user()), 'csrfToken': session['csrf_token']})


@auth.post('/auth/signup')
def signup():
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid request'}), 400
    name = data.get('name', '')
    email = data.get('email', '')
    password = data.get('password', '')
    if not all(isinstance(value, str) for value in (name, email, password)):
        return jsonify({'error': 'Invalid account details'}), 400
    name, email = name.strip(), email.strip().lower()
    if not 1 <= len(name) <= 80 or not EMAIL_RE.fullmatch(email) or not 12 <= len(password) <= 128:
        return jsonify({'error': 'Use a name, valid email, and password of 12–128 characters'}), 400
    key = throttle_key('signup', '')
    if blocked(key, 5, timedelta(hours=1)):
        return jsonify({'error': 'Too many signups. Try again later'}), 429
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'This email is already registered'}), 409
    user = User(email=email, display_name=name, password_hash=generate_password_hash(password))
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'This email is already registered'}), 409
    count_attempt(key)
    session.clear()
    session['user_id'] = user.id
    session['csrf_token'] = secrets.token_urlsafe(32)
    session.permanent = True
    return jsonify({'user': user_json(user), 'csrfToken': session['csrf_token']}), 201


@auth.post('/auth/login')
def login():
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid request'}), 400
    email = data.get('email', '')
    password = data.get('password', '')
    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify({'error': 'Invalid credentials'}), 401
    email = email.strip().lower()
    key = throttle_key('login', email)
    if blocked(key, 10, timedelta(minutes=15)):
        return jsonify({'error': 'Too many attempts. Try again later'}), 429
    user = User.query.filter_by(email=email).first()
    if user is None or not check_password_hash(user.password_hash, password):
        count_attempt(key)
        return jsonify({'error': 'Invalid credentials'}), 401
    row = db.session.get(AuthThrottle, key)
    if row:
        db.session.delete(row)
        db.session.commit()
    session.clear()
    session['user_id'] = user.id
    session['csrf_token'] = secrets.token_urlsafe(32)
    session.permanent = True
    return jsonify({'user': user_json(user), 'csrfToken': session['csrf_token']})


@auth.post('/auth/logout')
def logout():
    session.clear()
    session['csrf_token'] = secrets.token_urlsafe(32)
    return jsonify({'user': None, 'csrfToken': session['csrf_token']})


@auth.get('/progress')
def get_progress():
    user, error = authenticated()
    if error:
        return error
    rows = ReadingProgress.query.filter_by(user_id=user.id).order_by(ReadingProgress.updated_at.desc()).all()
    return jsonify([progress_json(row) for row in rows])


@auth.put('/progress/<int:book_id>')
def save_progress(book_id):
    user, error = authenticated()
    if error:
        return error
    if db.session.get(Book, book_id) is None and str(book_id) not in ADDED_BOOKS:
        return jsonify({'error': 'Book not found'}), 404
    value = validated_progress(request.get_json(silent=True))
    if value is None:
        return jsonify({'error': 'Invalid progress'}), 400
    percent, completed = value
    row = ReadingProgress.query.filter_by(user_id=user.id, book_id=book_id).first()
    if row is None:
        row = ReadingProgress(user_id=user.id, book_id=book_id)
        db.session.add(row)
    row.percent = 100.0 if completed else percent
    row.completed = completed
    row.updated_at = now_utc()
    db.session.commit()
    return jsonify(progress_json(row))


@auth.post('/progress/import')
def import_progress():
    user, error = authenticated()
    if error:
        return error
    data = request.get_json(silent=True)
    if not isinstance(data, list) or len(data) > 150:
        return jsonify({'error': 'Invalid progress list'}), 400
    valid_ids = {book.id for book in Book.query.with_entities(Book.id).all()} | {int(book_id) for book_id in ADDED_BOOKS}
    for item in data:
        if not isinstance(item, dict) or type(item.get('bookId')) is not int or item['bookId'] not in valid_ids:
            return jsonify({'error': 'Invalid progress list'}), 400
        if validated_progress(item) is None:
            return jsonify({'error': 'Invalid progress list'}), 400
    for item in data:
        percent, completed = validated_progress(item)
        row = ReadingProgress.query.filter_by(user_id=user.id, book_id=item['bookId']).first()
        if row is None:
            row = ReadingProgress(user_id=user.id, book_id=item['bookId'])
            db.session.add(row)
        row.completed = row.completed or completed
        row.percent = 100.0 if row.completed else max(row.percent or 0, percent)
        row.updated_at = now_utc()
    db.session.commit()
    return get_progress()
