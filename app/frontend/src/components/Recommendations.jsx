import React from 'react';
import { Link } from 'react-router-dom';
import { recommendBooks } from '../recommendations.mjs';
import '../styles/Recommendations.css';

export default function Recommendations({ books, progress }) {
    const recommendations = recommendBooks(books, progress);
    const readCount = Object.values(progress).filter((entry) => entry.completed).length;
    if (books.length === 0) return null;
    if (readCount === 0 && !Object.values(progress).some((entry) => entry.percent >= 20)) {
        return <p className="recommendations-empty">Read a summary or mark a book as finished to unlock recommendations.</p>;
    }

    return (
        <section className="recommendations" aria-labelledby="recommendations-title">
            <div className="recommendations-heading">
                <h2 id="recommendations-title">Recommended for you</h2>
                <p>Based on your reading history</p>
            </div>
            {recommendations.length === 0 ? (
                <p>No close matches yet. Try marking another book as read.</p>
            ) : (
                <div className="recommendations-list">
                    {recommendations.map(({ book, reason }) => (
                        <Link key={book.id} to={`/book/${book.id}`} className="recommendation-card">
                            <strong>{book.title}</strong>
                            <span>{book.author}</span>
                            <small>{reason}</small>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}
