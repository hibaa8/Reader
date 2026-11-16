import React, { useState } from 'react';
import '../styles/BookCover.css';

const palette = ['stone', 'moss', 'clay', 'slate', 'sand'];

export default function BookCover({ book, large = false }) {
    const [failed, setFailed] = useState(false);
    const tone = palette[Number(book.id) % palette.length];
    const showImage = /^https:\/\/www\.gutenberg\.org\//.test(book.image_url || '') && !failed;

    return (
        <div className={`book-cover book-cover--${tone}${large ? ' book-cover--large' : ''}`}>
            {showImage ? (
                <img src={book.image_url} alt="" loading="lazy" onError={() => setFailed(true)} />
            ) : (
                <div className="book-cover-fallback" aria-hidden="true">
                    <span className="book-cover-label">BOOK READER</span>
                    <span className="book-cover-title">{book.title}</span>
                    <span className="book-cover-author">{book.author}</span>
                </div>
            )}
        </div>
    );
}
