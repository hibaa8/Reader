import React, { createContext, useContext, useEffect, useState } from 'react';

const LibraryContext = createContext(null);
const PROGRESS_KEY = 'book-reader:progress:v1';
const LEGACY_READ_KEY = 'book-reader:read-ids:v1';

function loadLocalProgress() {
    try {
        const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
        const result = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
        const legacy = JSON.parse(localStorage.getItem(LEGACY_READ_KEY) || '[]');
        if (Array.isArray(legacy)) {
            legacy.filter((id) => Number.isInteger(id) && id > 0).forEach((id) => {
                if (!result[id]) result[id] = { bookId: id, percent: 100, completed: true, updatedAt: new Date().toISOString() };
            });
        }
        return result;
    } catch { return {}; }
}

function storeLocalProgress(progress) {
    try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
        localStorage.removeItem(LEGACY_READ_KEY);
    } catch { /* Private browsing may deny storage. */ }
}

function rowsToMap(rows) {
    return Object.fromEntries(rows.map((row) => [row.bookId, row]));
}

export function LibraryProvider({ children }) {
    const [user, setUser] = useState(null);
    const [csrfToken, setCsrfToken] = useState('');
    const [sessionReady, setSessionReady] = useState(false);
    const [progress, setProgress] = useState(loadLocalProgress);

    useEffect(() => {
        let active = true;
        fetch('/api/auth/me')
            .then((response) => response.json())
            .then(async (session) => {
                if (!active) return;
                setCsrfToken(session.csrfToken);
                setUser(session.user);
                if (session.user) {
                    const response = await fetch('/api/progress');
                    if (!response.ok) throw new Error('Progress could not be loaded');
                    if (active) setProgress(rowsToMap(await response.json()));
                }
            })
            .catch(() => { /* Anonymous local reading remains available. */ })
            .finally(() => { if (active) setSessionReady(true); });
        return () => { active = false; };
    }, []);

    const tokenForRequest = async () => {
        if (csrfToken) return csrfToken;
        const response = await fetch('/api/auth/me');
        if (!response.ok) throw new Error('Account service unavailable');
        const session = await response.json();
        setCsrfToken(session.csrfToken);
        return session.csrfToken;
    };

    const accountAction = async (kind, fields) => {
        const token = await tokenForRequest();
        const response = await fetch(`/api/auth/${kind}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
            body: JSON.stringify(fields),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Account request failed');
        setUser(data.user);
        setCsrfToken(data.csrfToken);
        const local = loadLocalProgress();
        const entries = Object.values(local).map((item) => ({
            bookId: Number(item.bookId), percent: item.percent || 0, completed: Boolean(item.completed),
        })).filter((item) => Number.isInteger(item.bookId) && item.bookId > 0);
        let rows;
        if (entries.length) {
            const imported = await fetch('/api/progress/import', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': data.csrfToken },
                body: JSON.stringify(entries),
            });
            if (!imported.ok) throw new Error('Signed in, but local reading history could not be imported');
            rows = await imported.json();
            try { localStorage.removeItem(PROGRESS_KEY); localStorage.removeItem(LEGACY_READ_KEY); } catch { /* Ignore. */ }
        } else {
            const loaded = await fetch('/api/progress');
            if (!loaded.ok) throw new Error('Signed in, but progress could not be loaded');
            rows = await loaded.json();
        }
        setProgress(rowsToMap(rows));
    };

    const logout = async () => {
        const token = await tokenForRequest();
        const response = await fetch('/api/auth/logout', {
            method: 'POST', headers: { 'X-CSRF-Token': token },
        });
        if (!response.ok) throw new Error('Could not sign out');
        const data = await response.json();
        setUser(null);
        setCsrfToken(data.csrfToken);
        setProgress(loadLocalProgress());
    };

    const saveProgress = async (bookId, percent, completed = false) => {
        const id = Number(bookId);
        if (!Number.isInteger(id) || id <= 0) return;
        const value = { bookId: id, percent: completed ? 100 : Math.max(0, Math.min(100, percent)),
            completed, updatedAt: new Date().toISOString() };
        setProgress((current) => {
            const next = { ...current, [id]: value };
            if (!user) storeLocalProgress(next);
            return next;
        });
        if (user) {
            const token = await tokenForRequest();
            const response = await fetch(`/api/progress/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
                body: JSON.stringify({ percent: value.percent, completed }),
                keepalive: true,
            });
            if (!response.ok) throw new Error('Reading progress could not be saved');
        }
    };

    return <LibraryContext.Provider value={{ user, sessionReady, progress, accountAction, logout, saveProgress }}>
        {children}
    </LibraryContext.Provider>;
}

export function useLibrary() {
    const value = useContext(LibraryContext);
    if (!value) throw new Error('LibraryProvider is missing');
    return value;
}
