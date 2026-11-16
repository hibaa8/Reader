import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import BookCover from './BookCover';
import Navbar from './Navbar';
import AudioPlayer from './AudioPlayer';
import ReadingGuide from './ReadingGuide';
import { useReadingHistory } from '../hooks/useReadingHistory';
import { useSummarySpeech } from '../hooks/useSummarySpeech';
import { useLibrary } from '../LibraryContext';
import { structureSummary } from '../summaryStructure';
import '../styles/BookDetails.css';

export default function BookDetails() {
    const { id } = useParams();
    const location = useLocation();
    const [book, setBook] = useState(null);
    const [error, setError] = useState(false);
    const [progressError, setProgressError] = useState('');
    const { readIds, toggleRead } = useReadingHistory();
    const { progress, saveProgress, sessionReady } = useLibrary();
    const structured = useMemo(() => {
        if (!book) return { html: '', sections: [] };
        if (!book.guide) return structureSummary(book.summary);
        const guide = book.guide;
        return { html: '', sections: [
            { id: 'guide-overview', title: 'Quick take', text: `${guide.deck} ${guide.overview.join(' ')}` },
            ...guide.sections.map((section, index) => ({ id: `guide-section-${index}`, title: section.label,
                text: `${section.label}. ${section.title}. ${section.summary}` })),
            { id: 'guide-takeaways', title: 'Key ideas', text: guide.takeaways.join(' ') },
        ] };
    }, [book]);
    const speech = useSummarySpeech(id, structured.sections);
    const summaryRef = useRef(null);
    const saveRef = useRef(saveProgress);
    const progressRef = useRef(progress);
    const resumedRef = useRef('');
    const [currentPercent, setCurrentPercent] = useState(0);
    saveRef.current = saveProgress;
    progressRef.current = progress;
    const entry = book ? progress[book.id] : null;

    useEffect(() => {
        const controller = new AbortController();
        setBook(null);
        setError(false);
        setCurrentPercent(0);
        fetch(`/api/books/${encodeURIComponent(id)}`, { signal: controller.signal })
            .then((response) => {
                if (!response.ok) throw new Error('Book not found');
                return response.json();
            })
            .then(setBook)
            .catch((failure) => { if (failure.name !== 'AbortError') setError(true); });
        return () => controller.abort();
    }, [id]);

    useEffect(() => {
        if (!book || !sessionReady || !summaryRef.current) return undefined;
        const summary = summaryRef.current;
        let timer;
        let pending;
        let lastSaved = progressRef.current[book.id]?.percent || 0;
        const track = () => {
            if (progressRef.current[book.id]?.completed) return;
            const top = summary.getBoundingClientRect().top + window.scrollY;
            if (window.scrollY < top - 10) return;
            const distance = Math.max(1, summary.scrollHeight - window.innerHeight * .6);
            const percent = Math.min(99, Math.max(1, Math.round((window.scrollY - top) / distance * 100)));
            setCurrentPercent(percent);
            if (Math.abs(percent - lastSaved) < 2) return;
            pending = percent;
            clearTimeout(timer);
            timer = setTimeout(() => {
                lastSaved = pending;
                saveRef.current(book.id, pending, false).catch(() => setProgressError('Progress could not be saved.'));
                pending = undefined;
            }, 800);
        };
        window.addEventListener('scroll', track, { passive: true });
        return () => {
            window.removeEventListener('scroll', track);
            clearTimeout(timer);
            if (pending !== undefined) saveRef.current(book.id, pending, false).catch(() => {});
        };
    }, [book, sessionReady]);

    const scrollToSaved = (percent) => {
        if (!summaryRef.current) return;
        const summary = summaryRef.current;
        const top = summary.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + Math.max(0, percent / 100 * (summary.scrollHeight - window.innerHeight * .6)), behavior: 'smooth' });
    };

    useEffect(() => {
        if (!book || !sessionReady || !entry || !location.search.includes('resume=1')) return;
        if (resumedRef.current === id) return;
        resumedRef.current = id;
        requestAnimationFrame(() => scrollToSaved(entry.percent));
    }, [book, sessionReady, entry, id, location.search]);

    const amazonUrl = book && /^https:\/\/www\.amazon\.com\//.test(book.amazon_url || '') ? book.amazon_url : null;
    const sourceUrl = book && /^https:\/\/www\.gutenberg\.org\/ebooks\/\d+$/.test(book.source_url || '') ? book.source_url : null;

    return <>
        <Navbar />
        <main className="detail-page" id="main-content">
            <Link to="/" className="detail-back">← Back to library</Link>
            {error ? <p className="detail-status">Book not found.</p> : !book ? <p className="detail-status">Loading book…</p> : <>
                <section className="detail-hero" aria-labelledby="book-title">
                    <BookCover key={book.id} book={book} large />
                    <div className="detail-overview">
                        <span className="eyebrow">{book.guide ? 'READING GUIDE' : 'BOOK SUMMARY'}</span>
                        <h1 id="book-title">{book.title}</h1>
                        <p className="detail-author">by {book.author}</p>
                        <p className="detail-meta"><strong>Language</strong> {book.language}</p>
                        <p className="detail-meta"><strong>Subjects</strong> {book.subject || 'Not listed'}</p>
                        <div className="reading-actions">
                            <button type="button" className="read-button" aria-pressed={readIds.includes(book.id)} onClick={() => toggleRead(book.id).catch(() => setProgressError('Progress could not be saved.'))}>
                                {readIds.includes(book.id) ? '✓ Finished' : 'Mark as finished'}
                            </button>
                            {entry?.percent > 0 && !entry.completed && <button type="button" onClick={() => scrollToSaved(entry.percent)}>Continue at {Math.round(entry.percent)}%</button>}
                        </div>
                        {progressError && <p role="alert" className="progress-error">{progressError}</p>}
                        <AudioPlayer speech={speech} sections={structured.sections} guide={Boolean(book.guide)} />
                        <div className="source-links">
                            {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer">Read the original on Gutenberg ↗</a>}
                            {amazonUrl && <a href={amazonUrl} target="_blank" rel="noopener noreferrer">Find a copy on Amazon ↗</a>}
                        </div>
                    </div>
                </section>
                <article className={`detail-summary${book.guide ? ' guide-mode' : ''}`} aria-labelledby="summary-title">
                    <div className="summary-heading"><h2 id="summary-title">{book.guide ? 'The reading guide' : 'Archive summary'}</h2><span>{entry?.completed ? 'Finished' : `${Math.round(Math.max(currentPercent, entry?.percent || 0))}% read`}</span></div>
                    {!book.guide && structured.sections.length > 1 && <nav className="summary-outline" aria-label="Summary sections">
                        <h3>In this summary</h3>
                        <ol>{structured.sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol>
                    </nav>}
                    <p className="summary-note">{book.guide
                        ? `${book.guide.sections.length} source-aligned ${book.guide.sections[0]?.label.startsWith('Act') ? 'acts' : book.guide.sections[0]?.label.startsWith('Stave') ? 'staves' : 'chapters'} · Original text linked above · Editorial summary, not the full book`
                        : 'This older summary has not yet been rechecked against the source. Its sections may combine original chapters.'}</p>
                    {book.guide ? <div ref={summaryRef}><ReadingGuide guide={book.guide} /></div> : structured.html
                        ? <div className="book-summary" ref={summaryRef} dangerouslySetInnerHTML={{ __html: structured.html }} />
                        : <p>No summary is available for this book yet.</p>}
                </article>
            </>}
        </main>
    </>;
}
