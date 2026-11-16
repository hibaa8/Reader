import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/GuidesShelf.css';

export default function GuidesShelf({ books }) {
    const guides = books.filter((book) => book.has_guide);
    if (!guides.length) return null;
    return <section className="guides-shelf" aria-labelledby="guides-shelf-title">
        <div className="guides-shelf-heading"><div><span className="eyebrow">START HERE</span><h2 id="guides-shelf-title">New reading guides</h2></div><p>Original text checked. Clear chapters. A little more to think about.</p></div>
        <div className="guides-shelf-grid">{guides.map((book, index) => <Link to={`/book/${book.id}`} key={book.id} className="guide-shelf-card">
            <span className="guide-shelf-number">{String(index + 1).padStart(2, '0')}</span>
            <div><h3>{book.title}</h3><p>{book.author}</p></div>
            <span className="guide-shelf-link">Read the guide <span aria-hidden="true">↗</span></span>
        </Link>)}</div>
    </section>;
}
