import { popularCategories } from './constants.js';

const subjectsFor = (book) => (book.subject || '')
    .split(',').map((subject) => subject.trim().toLowerCase()).filter(Boolean);
const categories = popularCategories.map((category) => category.toLowerCase()).filter((value) => value !== 'other');

export function recommendBooks(books, progress, limit = 4) {
    const entries = Object.values(progress);
    const bookById = new Map(books.map((book) => [Number(book.id), book]));
    const sources = entries
        .filter((entry) => entry.completed || entry.percent >= 20)
        .map((entry) => ({ book: bookById.get(Number(entry.bookId)), weight: entry.completed ? 2 : 1 }))
        .filter((entry) => entry.book);
    if (sources.length === 0) return [];

    const subjectWeights = new Map();
    const categoryWeights = new Map();
    const authorWeights = new Map();
    for (const { book, weight } of sources) {
        const subjects = subjectsFor(book);
        for (const subject of subjects) subjectWeights.set(subject, (subjectWeights.get(subject) || 0) + weight);
        for (const category of categories) {
            if (subjects.some((subject) => subject.includes(category))) {
                categoryWeights.set(category, (categoryWeights.get(category) || 0) + weight);
            }
        }
        const author = book.author?.toLowerCase();
        if (author) authorWeights.set(author, (authorWeights.get(author) || 0) + weight);
    }

    const started = new Set(entries.filter((entry) => entry.completed || entry.percent > 0).map((entry) => Number(entry.bookId)));
    return books.filter((book) => !started.has(Number(book.id)))
        .map((book) => {
            const subjects = subjectsFor(book);
            const subjectScore = subjects.reduce((sum, subject) => sum + (subjectWeights.get(subject) || 0) * 3, 0);
            const matchingCategory = [...categoryWeights.entries()]
                .filter(([category]) => subjects.some((subject) => subject.includes(category)))
                .sort((a, b) => b[1] - a[1])[0];
            const categoryScore = matchingCategory ? matchingCategory[1] * 2 : 0;
            const authorScore = (authorWeights.get(book.author?.toLowerCase()) || 0) * 4;
            const score = subjectScore + categoryScore + authorScore;
            const reason = authorScore >= subjectScore && authorScore >= categoryScore && authorScore > 0
                ? 'By an author you read' : subjectScore > 0 ? 'Shares subjects you read'
                    : matchingCategory ? `More ${matchingCategory[0]}` : '';
            return { book, score, reason };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title))
        .slice(0, limit);
}
