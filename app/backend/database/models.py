from . import db
from datetime import datetime, timezone

class Book(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False, index=True, unique=True)
    author = db.Column(db.String(255), nullable=False, index=True)
    language = db.Column(db.String(100), nullable=False, index=True)
    subject = db.Column(db.Text, nullable=True) 
    image_url = db.Column(db.String(255), nullable=True)
    amazon_url = db.Column(db.String(255), nullable=True, unique=True)
    summary = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f"<Book {self.title}>"


class User(db.Model):
    __bind_key__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(80), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ReadingProgress(db.Model):
    __bind_key__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    book_id = db.Column(db.Integer, nullable=False)
    percent = db.Column(db.Float, nullable=False, default=0)
    completed = db.Column(db.Boolean, nullable=False, default=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    __table_args__ = (db.UniqueConstraint('user_id', 'book_id', name='unique_user_book_progress'),)


class AuthThrottle(db.Model):
    __bind_key__ = 'users'
    key = db.Column(db.String(64), primary_key=True)
    attempts = db.Column(db.Integer, nullable=False, default=0)
    window_started = db.Column(db.DateTime(timezone=True), nullable=False)

