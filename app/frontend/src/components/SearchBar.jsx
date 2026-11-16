import React from 'react';
import '../styles/SearchBar.css';

export default function SearchBar({ query, onSearch }) {
    return (
        <div className="search-bar">
            <label htmlFor="book-search">Search the library</label>
            <div className="search-field">
                <input
                    id="book-search"
                    type="search"
                    placeholder="Title, author, language, or subject"
                    value={query}
                    onChange={(event) => onSearch(event.target.value)}
                />
                {query && <button type="button" onClick={() => onSearch('')} aria-label="Clear search">Clear</button>}
            </div>
        </div>
    );
}
