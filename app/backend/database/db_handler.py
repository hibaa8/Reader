from . import db
from .models import Book
from flask import jsonify
import re
import json
from pathlib import Path
from .legacy_guides import legacy_guide


READING_GUIDES = json.loads(
    (Path(__file__).resolve().parents[1] / 'data' / 'reading_guides.json').read_text(encoding='utf-8')
)
ADDED_BOOKS = json.loads(
    (Path(__file__).resolve().parents[1] / 'data' / 'added_books.json').read_text(encoding='utf-8')
)


def gutenberg_url(image_url):
    match = re.search(r'^https://www\.gutenberg\.org/cache/epub/(\d+)/', image_url or '')
    return f'https://www.gutenberg.org/ebooks/{match.group(1)}' if match else None

class DatabaseHandler:
    def add_book(self, book):   
        try:
            existing_book = Book.query.filter_by(title=book["title"]).first()
            if existing_book:
                print(f"Book already exists in the database: {book['title']}")
                return
            book_record = Book(
                title=book["title"],
                author=book["author"],
                language=book["language"],
                subject=book["subject"],
                image_url=book["image_url"],
                amazon_url=book["amazon_url"],
                summary=book["summary"],
            )
            db.session.add(book_record)
            db.session.commit()

        except Exception as e:
            db.session.rollback() 
            print(f"Error while adding books to database: {e}")

    def get_all_books(self, subject):
        query = Book.query
        if subject:
            query = query.filter(Book.subject.contains(subject))
        books = query.all()
        books_data = [
                {
                    "id": book.id,
                    "title": book.title,
                    "author": book.author,
                    "language": book.language,
                    "subject": book.subject,
                    "image_url": book.image_url,
                    "amazon_url": book.amazon_url,
                    "has_guide": str(book.id) in READING_GUIDES,
                }
                for book in books
        ]
        books_data.extend({
            **{key: value for key, value in book.items() if key != 'gutenberg_id'},
            'has_guide': str(book['id']) in READING_GUIDES,
        } for book in ADDED_BOOKS.values() if not subject or subject.lower() in book['subject'].lower())
        return jsonify(books_data)

    def get_book_by_id(self, book_id):
        book = db.session.get(Book, book_id)
        added = ADDED_BOOKS.get(str(book_id))
        if book is None and added is None:
            return jsonify({"error": "Book not found"}), 404
        data = ({'id': book.id, 'title': book.title, 'author': book.author,
                 'language': book.language, 'subject': book.subject,
                 'image_url': book.image_url, 'amazon_url': book.amazon_url}
                if book else {key: value for key, value in added.items() if key != 'gutenberg_id'})
        reviewed = READING_GUIDES.get(str(book_id))
        guide = dict(reviewed, reviewed=True) if reviewed else legacy_guide(
            book.title, book.summary, gutenberg_url(book.image_url)) if book else None
        source_url = (guide['source'] if guide else
                      gutenberg_url(book.image_url) if book else
                      f"https://www.gutenberg.org/ebooks/{added['gutenberg_id']}")
        return jsonify({
            **data,
            "source_url": source_url,
            "summary": None,
            "guide": guide,
            "summary_reviewed": bool(reviewed),
        })
