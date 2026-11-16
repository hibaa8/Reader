import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Filters from './components/Filters';
import BooksGrid from './components/BooksGrid';
import SearchBar from './components/SearchBar';
import Recommendations from './components/Recommendations';
import ContinueReading from './components/ContinueReading';
import GuidesShelf from './components/GuidesShelf';
import { useFilteredBooks } from './hooks/useFilteredBooks';
import { useSearchBooks } from './hooks/useSearchBooks';
import { useLibrary } from './LibraryContext';
import { popularCategories } from './constants';
import './styles/Home.css';

export default function Home() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const { progress } = useLibrary();
    const { filteredBooks, handleFilter } = useFilteredBooks(books, popularCategories);
    const { searchQuery, searchResults, handleSearch } = useSearchBooks(filteredBooks);

    useEffect(() => {
        const controller = new AbortController();
        fetch('/api/books', { signal: controller.signal })
            .then((response) => {
                if (!response.ok) throw new Error('Books could not be loaded');
                return response.json();
            })
            .then(setBooks)
            .catch((failure) => { if (failure.name !== 'AbortError') setError(true); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, []);

    return (
        <>
            <Navbar />
            <main className="home-page" id="main-content">
                <section className="library-intro">
                    <span className="eyebrow">THE LIBRARY</span>
                    <h1>A good book, in a little time.</h1>
                    <p>Explore source-checked reading guides, listen along, and find what to open next.</p>
                    <SearchBar query={searchQuery} onSearch={handleSearch} />
                </section>
                {!error && !loading && <ContinueReading books={books} progress={progress} />}
                {!error && !loading && <GuidesShelf books={books} />}
                {!error && !loading && <Recommendations books={books} progress={progress} />}
                <section className="catalog" aria-labelledby="catalog-title">
                    <div className="catalog-heading">
                        <h2 id="catalog-title">Explore books</h2>
                        {!loading && !error && <p aria-live="polite">{searchResults.length} book{searchResults.length === 1 ? '' : 's'}</p>}
                    </div>
                    <Filters onFilter={handleFilter} />
                    {loading ? <p className="status-message">Loading books…</p> :
                        error ? <p className="status-message">Books could not be loaded. Please try again later.</p> :
                        <BooksGrid books={searchResults} />}
                </section>
            </main>
        </>
    );
}
