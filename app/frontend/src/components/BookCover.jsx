import React, { useState } from 'react';
import '../styles/BookCover.css';
import { coverGenre } from '../coverGenre.mjs';

export default function BookCover({ book, large = false }) {
    const [failed, setFailed] = useState(false);
    const genre = coverGenre(book);
    const tone = genre.toLowerCase().replace(/\s+/g, '-');
    const showImage = large && /^https:\/\/www\.gutenberg\.org\//.test(book.image_url || '') && !failed;

    return (
        <div className={`book-cover book-cover--${tone}${large ? ' book-cover--large' : ''}`}>
            {showImage ? (
                <img src={book.image_url} alt="" loading="lazy" onError={() => setFailed(true)} />
            ) : (
                <div className="book-cover-fallback" aria-hidden="true">
                    <span className="book-cover-label">{genre}</span>
                    <span className="book-cover-title">{book.title}</span>
                    <span className="book-cover-author">{book.author}</span>
                </div>
            )}
        </div>
    );
}
