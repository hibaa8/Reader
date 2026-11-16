import React from 'react';
import { Link } from 'react-router-dom';
import BookCover from './BookCover';
import '../styles/BooksGrid.css';

export default function BooksGrid({ books }) {
    if (books.length === 0) {
        return <p className="empty-state">No books match these filters. Try another search or subject.</p>;
    }

    return (
        <div className="book-grid">
            {books.map((book) => (
                <Link to={`/book/${book.id}`} key={book.id} className="book-card-link">
                    <BookCover book={book} />
                    <div className="book-card-copy">
                        {book.has_guide && <span className="book-guide-badge">NEW GUIDE</span>}
                        <h3>{book.title}</h3>
                        <p>{book.author}</p>
                    </div>
                </Link>
            ))}
        </div>
    );
}
