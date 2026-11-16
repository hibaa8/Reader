import { useMemo, useState } from 'react';

export const useFilteredBooks = (books, popularCategories) => {
    const [selectedFilters, setSelectedFilters] = useState([]);
    const knownCategories = useMemo(() => popularCategories
        .map((category) => category.toLowerCase())
        .filter((category) => category !== 'other'), [popularCategories]);

    const filteredBooks = useMemo(() => {
        if (selectedFilters.length === 0) return books;
        return books.filter((book) => {
            const subjects = (book.subject || '').toLowerCase().split(',').map((subject) => subject.trim());
            const matchesSelected = selectedFilters.some((filter) =>
                filter !== 'other' && subjects.some((subject) => subject.includes(filter)));
            const matchesOther = selectedFilters.includes('other') &&
                !subjects.some((subject) => knownCategories.some((category) => subject.includes(category)));
            return matchesSelected || matchesOther;
        });
    }, [books, selectedFilters, knownCategories]);

    return { filteredBooks, handleFilter: setSelectedFilters };
};
