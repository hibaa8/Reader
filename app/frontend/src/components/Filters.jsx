import React, { useRef, useState } from 'react';
import { popularCategories } from '../constants';
import '../styles/Filters.css';

export default function Filters({ onFilter }) {
    const [selected, setSelected] = useState([]);
    const listRef = useRef(null);

    const toggle = (category) => {
        const key = category.toLowerCase();
        const next = selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key];
        setSelected(next);
        onFilter(next);
    };

    const clear = () => {
        setSelected([]);
        onFilter([]);
        if (listRef.current) listRef.current.scrollLeft = 0;
    };

    return (
        <section className="filters" aria-labelledby="filters-title">
            <div className="filters-heading">
                <h2 id="filters-title">Subjects</h2>
                {selected.length > 0 && <button type="button" className="filters-clear" onClick={clear}>Clear filters</button>}
            </div>
            <div className="filter-list" ref={listRef}>
                {[...popularCategories].sort().map((category) => (
                    <button
                        type="button"
                        key={category}
                        className={`filter-chip${selected.includes(category.toLowerCase()) ? ' is-selected' : ''}`}
                        aria-pressed={selected.includes(category.toLowerCase())}
                        onClick={() => toggle(category)}
                    >
                        {category}
                    </button>
                ))}
            </div>
        </section>
    );
}
