import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLibrary } from '../LibraryContext';
import '../styles/Navbar.css';

export default function Navbar() {
    const { user, logout } = useLibrary();
    const [error, setError] = useState('');
    return (
        <header className="navbar">
            <a className="skip-link" href="#main-content">Skip to content</a>
            <div className="navbar-inner">
                <Link to="/" className="navbar-brand">Book Reader</Link>
                <nav aria-label="Main navigation" className="navbar-links">
                    <Link to="/" className="navbar-home">Library</Link>
                    {user ? <><span className="navbar-user">{user.name}</span><button type="button" onClick={() => logout().catch(() => setError('Could not sign out. Try again.'))}>Sign out</button></> : <Link to="/login" className="navbar-home">Sign in</Link>}
                </nav>
            </div>
            {error && <p role="alert" className="navbar-error">{error}</p>}
        </header>
    );
}
