import { useMemo, useState } from 'react';

export const useSearchBooks = (books) => {
    const [searchQuery, setSearchQuery] = useState('');
    const searchResults = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return books;
        const words = query.split(/\s+/);
        return books.filter((book) => {
            const searchable = [book.title, book.author, book.language, book.subject]
                .filter(Boolean).join(' ').toLowerCase();
            return words.every((word) => searchable.includes(word));
        });
    }, [books, searchQuery]);

    return { searchQuery, searchResults, handleSearch: setSearchQuery };
};
