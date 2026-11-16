import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/ContinueReading.css';

export default function ContinueReading({ books, progress }) {
    const byId = new Map(books.map((book) => [Number(book.id), book]));
    const entries = Object.values(progress)
        .filter((entry) => !entry.completed && entry.percent > 0 && entry.percent < 100 && byId.has(Number(entry.bookId)))
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
        .slice(0, 3);
    if (entries.length === 0) return null;

    return <section className="continue-reading" aria-labelledby="continue-title">
        <h2 id="continue-title">Continue reading</h2>
        <div className="continue-list">{entries.map((entry) => {
            const book = byId.get(Number(entry.bookId));
            return <Link to={`/book/${book.id}?resume=1`} key={book.id} className="continue-card">
                <strong>{book.title}</strong>
                <span>{Math.round(entry.percent)}% complete</span>
                <span className="progress-track"><span style={{ width: `${entry.percent}%` }} /></span>
            </Link>;
        })}</div>
    </section>;
}
